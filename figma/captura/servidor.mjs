/**
 * Servidor estático mínimo para la exportación web de la app, con caída a
 * `index.html` para las rutas de expo-router (como lo hace Netlify).
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
  '.m4a': 'audio/mp4',
};

/** `prefijo` es el `baseUrl` de app.json: la exportación pide todo bajo él. */
export function servir(raiz, prefijo = '', puerto = 0) {
  const servidor = createServer(async (req, res) => {
    let camino = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (prefijo && camino.startsWith(prefijo)) camino = camino.slice(prefijo.length) || '/';
    const ruta = normalize(camino).replace(/^(\.\.[/\\])+/, '');
    let archivo = join(raiz, ruta);
    try {
      const s = await stat(archivo);
      if (s.isDirectory()) archivo = join(archivo, 'index.html');
      await stat(archivo);
    } catch {
      archivo = join(raiz, 'index.html');
    }
    try {
      const datos = await readFile(archivo);
      res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
      res.end(datos);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((ok) => servidor.listen(puerto, '127.0.0.1', () => ok(servidor)));
}
