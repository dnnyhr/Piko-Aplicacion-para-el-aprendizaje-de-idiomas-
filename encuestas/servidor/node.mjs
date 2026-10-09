/**
 * El Worker de las encuestas corriendo en Node, para el servidor de Azure.
 *
 * src/index.js no cambia: es el mismo `fetch(request, env, ctx)` que corre en
 * Cloudflare. Acá se le arma lo que Cloudflare le daba hecho:
 *
 *   env.DB      D1 sobre libSQL (servidor/d1-libsql.mjs)
 *   env.ASSETS  los archivos de public/, con index.html si la ruta no existe
 *   env.*       las variables y los secretos, de process.env (el .env del servidor)
 *
 * Siempre corre detrás de Nginx, en la red interna de Docker: nunca se expone
 * a internet. Por eso confía en X-Real-IP y X-Forwarded-Proto, que pone Nginx.
 *
 *   node servidor/node.mjs                     escucha en :8787
 *   DB_URL=file:encuestas.db node servidor/node.mjs   con un SQLite local
 */

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import worker from '../src/index.js';
import { d1Libsql } from './d1-libsql.mjs';
import { migrar } from './migrar.mjs';

const PUBLICO = fileURLToPath(new URL('../public/', import.meta.url));
const PUERTO = Number(process.env.PUERTO ?? 8787);
const CUERPO_MAX = 256 * 1024;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/** Lo que en Cloudflare hace public/_headers para el panel. */
const SIN_CACHE = new Set(['/admin', '/admin.html', '/js/admin.js']);

async function archivo(ruta) {
  try {
    const s = await stat(ruta);
    if (s.isDirectory()) return archivo(path.join(ruta, 'index.html'));
    return { ruta, cuerpo: await readFile(ruta) };
  } catch {
    return null;
  }
}

/** env.ASSETS: como `not_found_handling: single-page-application` de wrangler.jsonc. */
const ASSETS = {
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const pedido = path.normalize(path.join(PUBLICO, decodeURIComponent(pathname)));
    // Nada fuera de public/ (../../etc/passwd).
    const dentro = pedido.startsWith(PUBLICO) ? pedido : PUBLICO;
    const encontrado = (await archivo(dentro)) ?? (await archivo(path.join(PUBLICO, 'index.html')));
    const nombre = path.basename(pathname);
    const headers = {
      'content-type': TIPOS[path.extname(encontrado.ruta)] ?? 'application/octet-stream',
      'cache-control': SIN_CACHE.has(pathname) ? 'no-store' : nombre.endsWith('.html') || !nombre.includes('.') ? 'no-cache' : 'public, max-age=3600',
    };
    if (pathname.startsWith('/admin')) headers['x-robots-tag'] = 'noindex, nofollow';
    return new Response(request.method === 'HEAD' ? null : encontrado.cuerpo, { headers });
  },
};

const VARIABLES = ['ADMIN_TOKEN', 'RESEND_API_KEY', 'CORREO_REMITENTE', 'CORREO_RESPUESTA', 'CORREOS_POR_DIA', 'APP_DESCARGA_URL', 'ENCUESTA_PRINCIPAL', 'CORS_ORIGINS'];

const db = d1Libsql({ url: process.env.DB_URL ?? 'http://db:8080', authToken: process.env.DB_TOKEN });
const env = {
  ...Object.fromEntries(VARIABLES.filter((v) => process.env[v] !== undefined).map((v) => [v, process.env[v]])),
  DB: db,
  ASSETS,
};

/** node:http → Request. */
async function aRequest(req) {
  const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost';
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (k === 'cf-connecting-ip') continue; // nunca la que mande el cliente
    headers.set(k, Array.isArray(v) ? v.join(', ') : v);
  }
  // El Worker frena abusos por IP con esta cabecera; la llena Nginx.
  headers.set('cf-connecting-ip', req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? '');

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const partes = [];
    let largo = 0;
    for await (const c of req) {
      largo += c.length;
      if (largo > CUERPO_MAX) throw Object.assign(new Error('demasiado grande'), { status: 413 });
      partes.push(c);
    }
    body = Buffer.concat(partes);
  }
  return new Request(`${proto}://${host}${req.url}`, { method: req.method, headers, body });
}

const servidor = http.createServer(async (req, res) => {
  try {
    const respuesta = await worker.fetch(await aRequest(req), env, { waitUntil: (p) => p.catch(console.error) });
    const cabeceras = {};
    respuesta.headers.forEach((v, k) => (cabeceras[k] = v));
    res.writeHead(respuesta.status, cabeceras);
    res.end(req.method === 'HEAD' || !respuesta.body ? undefined : Buffer.from(await respuesta.arrayBuffer()));
  } catch (err) {
    if (!err.status) console.error(err);
    res.writeHead(err.status ?? 500, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.status === 413 ? 'Demasiado grande.' : 'Algo se rompió de nuestro lado.' }));
  }
});

// sqld puede tardar unos segundos en aceptar conexiones cuando arranca junto al contenedor.
for (let intento = 1; ; intento++) {
  try {
    await migrar(db.cliente);
    break;
  } catch (err) {
    if (intento >= 15) throw err;
    console.log(`la base todavía no responde (${err.code ?? err.message}), reintento ${intento}/15`);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

servidor.listen(PUERTO, () => console.log(`encuestas en :${PUERTO} (base: ${process.env.DB_URL ?? 'http://db:8080'})`));

for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => servidor.close(() => process.exit(0)));
