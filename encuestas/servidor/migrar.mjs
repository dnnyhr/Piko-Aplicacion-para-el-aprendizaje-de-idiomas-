/**
 * Aplica migrations/*.sql que falten, en orden, y anota cada una en
 * _migraciones. Hace lo que `wrangler d1 migrations apply` en Cloudflare:
 * corre al arrancar el contenedor y no toca los datos que ya están.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const DIR = fileURLToPath(new URL('../migrations/', import.meta.url));

export async function migrar(cliente, log = console.log) {
  await cliente.execute(
    "CREATE TABLE IF NOT EXISTS _migraciones (nombre TEXT PRIMARY KEY, aplicada_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))",
  );
  const hechas = new Set((await cliente.execute('SELECT nombre FROM _migraciones')).rows.map((r) => r[0]));
  const nuevas = readdirSync(DIR)
    .filter((f) => f.endsWith('.sql') && !hechas.has(f))
    .sort();
  for (const f of nuevas) {
    await cliente.executeMultiple(readFileSync(join(DIR, f), 'utf8'));
    await cliente.execute({ sql: 'INSERT INTO _migraciones (nombre) VALUES (?)', args: [f] });
    log(`migración aplicada: ${f}`);
  }
  return nuevas;
}
