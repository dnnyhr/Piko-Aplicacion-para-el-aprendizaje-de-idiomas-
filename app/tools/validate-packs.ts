/**
 * Valida todos los paquetes de `content/packs/`.
 *
 *   npm run validate:packs
 *
 * Además de revisar el formato, comprueba dos cosas que son fáciles de olvidar
 * y difíciles de notar: que cada archivo del disco esté registrado en
 * `content/index.ts`, y que los audios referenciados existan de verdad.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS, LANG_NOMBRE, type LangCode } from '../src/core/content/schema';
import { RAIZ_PACKS, leerPacks } from './packs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ_CONTENIDO = path.resolve(AQUI, '..', 'content');

async function main(): Promise<void> {
  const leidos = await leerPacks();
  const indice = await fs
    .readFile(path.join(RAIZ_CONTENIDO, 'index.ts'), 'utf8')
    .catch(() => '');

  let problemas = 0;

  console.log(`\n  Paquetes en content/packs\n  ${'─'.repeat(56)}`);

  for (const l of leidos) {
    if (l.pack) {
      const tipos = { choice: 0, listen: 0, build: 0 };
      for (const it of l.pack.items) tipos[it.type]++;
      console.log(
        `  ✓ ${l.relativa.padEnd(24)} ${String(l.pack.items.length).padStart(3)} ítems` +
          `   (${tipos.choice} elección, ${tipos.listen} escucha, ${tipos.build} bloques)`,
      );
    } else {
      problemas++;
      console.log(`  ✗ ${l.relativa}`);
      for (const e of l.errores) console.log(`      ${e}`);
    }

    // ¿Está registrado en el índice estático?
    if (l.pack && !indice.includes(`./packs/${l.relativa}`)) {
      problemas++;
      console.log(`      ⚠ no está importado en content/index.ts`);
    }
  }

  // ¿Existen los audios referenciados?
  const faltantes: string[] = [];
  for (const l of leidos) {
    for (const item of l.pack?.items ?? []) {
      if (item.type !== 'listen' || !item.audio) continue;
      const destino = path.join(RAIZ_CONTENIDO, 'audio', item.audio);
      const existe = await fs
        .access(destino)
        .then(() => true)
        .catch(() => false);
      if (!existe) faltantes.push(`${item.id} → content/audio/${item.audio}`);
    }
  }
  if (faltantes.length > 0) {
    problemas += faltantes.length;
    console.log(`\n  Audios que faltan\n  ${'─'.repeat(56)}`);
    for (const f of faltantes) console.log(`  ✗ ${f}`);
  }

  // Cobertura por lengua.
  console.log(`\n  Cobertura por lengua\n  ${'─'.repeat(56)}`);
  for (const lang of LANGS) {
    const suyos = leidos.filter((l) => l.pack?.lang === lang);
    const items = suyos.reduce((n, l) => n + (l.pack?.items.length ?? 0), 0);
    const marca = items > 0 ? '✓' : '⬜';
    const nota = items > 0 ? '' : '   pendiente de hablantes nativos';
    console.log(
      `  ${marca} ${LANG_NOMBRE[lang as LangCode].padEnd(10)} ${String(suyos.length).padStart(2)} paquete(s)` +
        `  ${String(items).padStart(3)} ítems${nota}`,
    );
  }

  console.log(`\n  ${'─'.repeat(56)}`);
  if (problemas === 0) {
    console.log(`  Todo en orden.\n`);
  } else {
    console.log(`  ${problemas} problema(s).\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
