#!/usr/bin/env node
/**
 * Publica las encuestas de `definiciones/` en el Worker.
 *
 *   node herramientas/publicar.mjs --validar
 *       solo revisa que todos los JSON estén bien armados (lo corre CI)
 *
 *   PIKO_ENCUESTAS_URL=https://encuestas.piko.mugiware.com \
 *   PIKO_ENCUESTAS_TOKEN=... \
 *   node herramientas/publicar.mjs [slug ...]
 *       publica todas (o las nombradas). Si las preguntas no cambiaron, no se
 *       crea versión nueva; si solo cambió el estado, se actualiza el estado.
 *
 * Para local: `npm run dev` en otra terminal y PIKO_ENCUESTAS_URL=http://localhost:8787
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarDefinicion } from '../public/js/reglas.js';

const carpeta = fileURLToPath(new URL('../definiciones/', import.meta.url));
const args = process.argv.slice(2);
const soloValidar = args.includes('--validar');
const pedidas = args.filter((a) => !a.startsWith('--'));

const archivos = (await readdir(carpeta)).filter((f) => f.endsWith('.json')).sort();
let fallas = 0;
const defs = [];

for (const archivo of archivos) {
  const def = JSON.parse(await readFile(join(carpeta, archivo), 'utf8'));
  const problemas = validarDefinicion(def);
  if (def.slug && `${def.slug}.json` !== archivo) problemas.push(`el archivo debería llamarse ${def.slug}.json`);
  if (problemas.length) {
    fallas++;
    console.error(`✗ ${archivo}`);
    for (const p of problemas) console.error(`    ${p}`);
  } else {
    const n = def.secciones.reduce((a, s) => a + s.preguntas.length, 0);
    console.log(`✓ ${archivo} — ${def.secciones.length} secciones, ${n} preguntas`);
    defs.push(def);
  }
}

if (fallas) process.exit(1);
if (soloValidar) process.exit(0);

const url = process.env.PIKO_ENCUESTAS_URL;
const token = process.env.PIKO_ENCUESTAS_TOKEN;
if (!url || !token) {
  console.error('\nFaltan PIKO_ENCUESTAS_URL y PIKO_ENCUESTAS_TOKEN para publicar.');
  process.exit(1);
}

for (const def of defs) {
  if (pedidas.length && !pedidas.includes(def.slug)) continue;
  const res = await fetch(`${url.replace(/\/$/, '')}/api/admin/encuestas/${def.slug}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(def),
  });
  const r = await res.json().catch(() => ({}));
  if (!res.ok) {
    fallas++;
    console.error(`✗ ${def.slug}: ${r.error ?? res.status}`, r.problemas ?? '');
  } else {
    console.log(`↑ ${def.slug}: ${r.estado}, v${r.version}${r.versionNueva ? ' (versión nueva)' : ' (sin cambios en las preguntas)'}`);
  }
}
process.exit(fallas ? 1 : 0);
