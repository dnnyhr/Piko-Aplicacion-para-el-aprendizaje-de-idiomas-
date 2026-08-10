/**
 * Convierte los SVG de `assets/vector/` en módulos TypeScript.
 *
 *   npm run gen:svg
 *
 * `react-native-svg` sabe pintar una cadena XML con `<SvgXml>`, pero Metro no
 * sabe importar un `.svg` sin un transformer extra. Generar el módulo evita
 * esa dependencia y deja el `.svg` como fuente editable: se cambia el dibujo,
 * se corre este script, y listo.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ORIGEN = path.resolve(AQUI, '..', 'assets', 'vector');
const DESTINO = path.resolve(AQUI, '..', 'src', 'ui', 'piko', 'vector.gen.ts');

const CONSTANTE: Record<string, string> = {
  piko: 'PIKO_SVG',
  marca: 'MARCA_SVG',
};

async function main(): Promise<void> {
  const archivos = (await fs.readdir(ORIGEN)).filter((f) => f.endsWith('.svg')).sort();
  const partes: string[] = [
    '/* eslint-disable */',
    '// Generado por `npm run gen:svg` desde assets/vector/. No editar a mano.',
    '',
  ];

  for (const archivo of archivos) {
    const nombre = path.basename(archivo, '.svg');
    const constante = CONSTANTE[nombre] ?? `${nombre.toUpperCase()}_SVG`;
    let xml = await fs.readFile(path.join(ORIGEN, archivo), 'utf8');

    // La cadena va dentro de un template literal: sólo hay que proteger los
    // caracteres que ahí significan algo.
    xml = xml.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

    partes.push(`export const ${constante} = \`${xml}\`;`, '');
    console.log(`  ${archivo} → ${constante} (${xml.length} caracteres)`);
  }

  await fs.writeFile(DESTINO, partes.join('\n'), 'utf8');
  console.log(`\n  Escrito ${path.relative(path.resolve(AQUI, '..'), DESTINO)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
