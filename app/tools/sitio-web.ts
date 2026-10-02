/**
 * Prepara la app exportada para el sitio (web/probar/app/) y comprueba que esté
 * completa.
 *
 *   npm run web:sitio        exporta la app y la prepara (corre este archivo al final)
 *   npm run web:comprobar    sólo comprueba (CI)
 *
 * `expo export` guarda las tipografías y los íconos en `assets/node_modules/…`.
 * El .gitignore del repositorio ignora toda carpeta `node_modules`, así que
 * esos archivos nunca llegaban al sitio: la app esperaba las tipografías y se
 * quedaba en blanco. Acá se mueven a `assets/paquetes/` y se corrigen las
 * referencias.
 *
 * Además, para que arranque rápido: el index.html pide desde el principio,
 * en paralelo, las pantallas (expo-router las carga una tras otra: primero
 * _layout, que espera las tipografías, y recién después la portada) y las
 * tipografías; y muestra a Piko mientras tanto, en vez de una pantalla vacía. La comprobación mira que cada archivo que pide la app exista y
 * que git no lo ignore; en CI, con sólo lo subido al repositorio, es la misma
 * prueba que hace el sitio publicado.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SALIDA = path.resolve(AQUI, '..', '..', 'web', 'probar', 'app');
const BASE = '/probar/app/';
const comprobar = process.argv.includes('--comprobar');

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    return e.isDirectory() ? archivos(ruta) : [ruta];
  });
}

if (!fs.existsSync(path.join(SALIDA, 'index.html'))) {
  console.error(`No está la app exportada en ${SALIDA}. Correr: npm run web:sitio`);
  process.exit(1);
}

if (!comprobar) {
  const viejo = path.join(SALIDA, 'assets', 'node_modules');
  const nuevo = path.join(SALIDA, 'assets', 'paquetes');
  if (fs.existsSync(viejo)) {
    fs.rmSync(nuevo, { recursive: true, force: true });
    fs.renameSync(viejo, nuevo);
  }
  for (const archivo of archivos(SALIDA)) {
    if (!/\.(js|html|json|css|map)$/.test(archivo)) continue;
    const texto = fs.readFileSync(archivo, 'utf8');
    const corregido = texto.split('assets/node_modules/').join('assets/paquetes/');
    if (corregido !== texto) fs.writeFileSync(archivo, corregido);
  }
  prepararIndex();
}

/**
 * El archivo de una pantalla de expo-router, según el mapa que arma Metro en
 * entry-*.js: `"./index.tsx":{…(d[5],d.paths)}`, luego `"5":749` y
 * `"paths":{"749":"/probar/app/…/index-….js"}`. Null si el formato cambió.
 */
function archivoDeRuta(codigo: string, ruta: string): string | null {
  const m = new RegExp(`"${ruta.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}":\\{[^}]*?\\(d\\[(\\d+)\\],d\\.paths\\)`).exec(codigo);
  if (!m) return null;
  const resto = codigo.slice(m.index);
  const id = new RegExp(`"${m[1]}":(\\d+)`).exec(resto)?.[1];
  const paths = /"paths":\{([^}]*)\}/.exec(resto)?.[1];
  if (!id || !paths) return null;
  return new RegExp(`"${id}":"([^"]+)"`).exec(paths)?.[1] ?? null;
}

/** Precargas y pantalla de espera en el index.html exportado. */
function prepararIndex() {
  const ruta = path.join(SALIDA, 'index.html');
  let html = fs.readFileSync(ruta, 'utf8');
  if (html.includes('data-piko-precarga')) return;
  const url = (a: string) => BASE + path.relative(SALIDA, a).split(path.sep).join('/');
  const todos = archivos(SALIDA);
  const yaPedidos = new Set([...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]));
  // Sólo lo que hace falta para la primera pantalla: el esqueleto y la portada.
  const entrada = todos.find((a) => /[\\/]entry-[0-9a-f]+\.js$/.test(a));
  const codigo = entrada ? fs.readFileSync(entrada, 'utf8') : '';
  const delInicio = ['./_layout.tsx', './index.tsx'].map((r) => archivoDeRuta(codigo, r));
  const pantallas = (delInicio.every(Boolean)
    ? (delInicio as string[])
    : todos.filter((a) => /[\\/](_layout|index)-[0-9a-f]+\.js$/.test(a)).map(url)
  ).filter((u) => !yaPedidos.has(u));
  const fuentes = todos.filter((a) => /\.(ttf|otf|woff2?)$/.test(a)).map(url);
  const precargas = [
    ...pantallas.map((u) => `<link rel="preload" href="${u}" as="script" data-piko-precarga>`),
    ...fuentes.map((u) => `<link rel="preload" href="${u}" as="font" type="font/${u.split('.').pop()}" crossorigin data-piko-precarga>`),
  ].join('\n    ');
  const espera = `<div class="piko-espera" aria-label="Cargando Piko">
      <img src="/assets/img/piko.svg" alt="" width="96" height="158">
      <p>Cargando Piko…</p>
    </div>`;
  const estilo = `<style>
      .piko-espera{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#F7F0E4;font:600 17px system-ui,sans-serif;color:#0F5D3D}
      .piko-espera img{animation:piko-espera 1.6s ease-in-out infinite}
      @keyframes piko-espera{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @media (prefers-reduced-motion:reduce){.piko-espera img{animation:none}}
    </style>`;
  html = html
    .replace('<html lang="en">', '<html lang="es">')
    .replace('</head>', `    ${precargas}\n    ${estilo}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">\n    ${espera}\n    </div>`);
  fs.writeFileSync(ruta, html);
}

// Cada archivo que la app pide por su ruta tiene que existir y no estar ignorado.
const errores: string[] = [];
const pedidos = new Set<string>();
for (const archivo of archivos(SALIDA)) {
  if (!/\.(js|html)$/.test(archivo)) continue;
  for (const m of fs.readFileSync(archivo, 'utf8').matchAll(/["'](\/probar\/app\/[^"'?#\s]+)["']/g)) {
    pedidos.add(m[1]!);
  }
}
for (const url of pedidos) {
  const relativa = decodeURIComponent(url.slice(BASE.length));
  if (relativa === '' || relativa.endsWith('/')) continue;
  const ruta = path.join(SALIDA, relativa);
  if (!fs.existsSync(ruta)) errores.push(`falta ${url}`);
}
const enDisco = archivos(SALIDA).map((a) => path.relative(process.cwd(), a));
let ignorados: string[] = [];
try {
  ignorados = execFileSync('git', ['check-ignore', '--stdin'], { input: enDisco.join('\n'), encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch {
  // check-ignore sale con 1 cuando no hay ninguno ignorado
}
for (const r of ignorados) errores.push(`git lo ignora, no llegaría al sitio: ${r}`);
if (enDisco.some((a) => a.includes(`${path.sep}node_modules${path.sep}`))) errores.push('quedó una carpeta node_modules');

if (errores.length) {
  console.error(`\n  La app del sitio (web/probar/app) está incompleta:\n${errores.map((e) => `  ✗ ${e}`).join('\n')}\n`);
  process.exit(1);
}
console.log(`\n  ✓ web/probar/app: ${pedidos.size} archivos pedidos por la app, todos presentes y en el repositorio.\n`);
