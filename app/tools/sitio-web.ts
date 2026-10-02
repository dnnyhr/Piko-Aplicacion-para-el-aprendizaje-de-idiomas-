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
 * referencias. La comprobación mira que cada archivo que pide la app exista y
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
