#!/usr/bin/env node
/**
 * Los códigos de las tarjetas de logros especiales (ver src/canjes.js).
 *
 *   npm run codigos -- crear --lote hackathon-2026 --logro piko-hackathon-2026 --evento HK26 --cantidad 300
 *       crea 300 códigos nuevos en la base y los guarda en codigos-hackathon-2026.csv,
 *       uno por línea, para mandar a imprimir las tarjetas
 *
 *   npm run codigos -- ver --lote hackathon-2026
 *       cuántos se canjearon, y codigos-hackathon-2026-estado.csv con cada
 *       código, su estado, quién lo canjeó y cuándo
 *
 * Usan las mismas variables que publicar.mjs:
 *   PIKO_ENCUESTAS_URL=https://encuestas.piko.mugiware.com
 *   PIKO_ENCUESTAS_TOKEN=...   (el ADMIN_TOKEN del Worker)
 *
 * Los CSV no se suben al repositorio (.gitignore): quien tenga un código
 * disponible puede canjearlo.
 */

import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    lote: { type: 'string' },
    logro: { type: 'string' },
    evento: { type: 'string' },
    cantidad: { type: 'string' },
  },
});
const [accion] = positionals;

const url = process.env.PIKO_ENCUESTAS_URL;
const token = process.env.PIKO_ENCUESTAS_TOKEN;
if (!url || !token) {
  console.error('Faltan PIKO_ENCUESTAS_URL y PIKO_ENCUESTAS_TOKEN.');
  process.exit(1);
}
const base = `${url.replace(/\/$/, '')}/api/admin/codigos`;
const cabeceras = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
const celda = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

if (accion === 'crear') {
  const { lote, logro, evento, cantidad } = values;
  if (!lote || !logro || !evento || !cantidad) {
    console.error('crear necesita --lote, --logro, --evento y --cantidad.');
    process.exit(1);
  }
  const res = await fetch(base, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify({ lote, logro, evento, cantidad: Number(cantidad) }),
  });
  const r = await res.json();
  if (!res.ok) {
    console.error(`✗ ${res.status}: ${r.error}`);
    process.exit(1);
  }
  const archivo = `codigos-${lote}.csv`;
  await writeFile(archivo, ['codigo', ...r.codigos].join('\n') + '\n');
  console.log(`✓ ${r.nuevos} códigos nuevos para «${logro}» → ${archivo}`);
} else if (accion === 'ver') {
  const lote = values.lote;
  const res = await fetch(lote ? `${base}?lote=${encodeURIComponent(lote)}` : base, { headers: cabeceras });
  const r = await res.json();
  if (!res.ok) {
    console.error(`✗ ${res.status}: ${r.error}`);
    process.exit(1);
  }
  console.log(`${r.total} códigos: ${r.utilizados} canjeados, ${r.disponibles} disponibles.`);
  const archivo = `codigos-${lote ?? 'todos'}-estado.csv`;
  const filas = r.codigos.map((c) => [c.codigo, c.estado, c.logro, c.lote, c.nombre, c.alumno, c.dispositivo, c.canjeadoEn].map(celda).join(','));
  await writeFile(archivo, ['codigo,estado,logro,lote,nombre,alumno,dispositivo,canjeado_en', ...filas].join('\n') + '\n');
  console.log(`→ ${archivo}`);
} else {
  console.error('Uso: npm run codigos -- crear|ver --lote <lote> [...]  (ver el comentario de herramientas/codigos.mjs)');
  process.exit(1);
}
