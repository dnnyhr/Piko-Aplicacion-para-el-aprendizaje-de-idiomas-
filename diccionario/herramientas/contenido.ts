/**
 * Genera el contenido de la app a partir del diccionario.
 *
 *   cd app && npm run contenido               escribe app/content/packs/ y content/index.ts
 *   cd app && npm run contenido:comprobar     sólo comprueba que estén al día (CI)
 *
 * El diccionario es la única fuente: `app/content/packs/` y `content/index.ts`
 * no se editan a mano. Llega a la app todo ejercicio cuyas palabras no estén
 * marcadas para revisar.
 *
 * De paso, deja cada `ejercicios.json` con una receta por línea.
 */

import fs from 'node:fs';
import path from 'node:path';
import { armar, leerDiccionario, leerLenguas, paraLaApp, RAIZ_DICCIONARIO, type Receta, type RecetaPaquete } from './recetas';

const CONTENIDO = path.resolve(RAIZ_DICCIONARIO, '..', 'app', 'content');
const comprobar = process.argv.includes('--comprobar');

/** Lo que tiene que haber en disco: ruta relativa a `app/content/` → texto. */
const esperado = new Map<string, string>();
const importaciones: { nombre: string; ruta: string }[] = [];
const resumen: string[] = [];

const camel = (t: string) => t.replace(/(^|[-_.\s])(\w)/g, (_, __, c: string) => c.toUpperCase());

for (const lengua of leerLenguas()) {
  const d = leerDiccionario(lengua);
  if (!d) {
    resumen.push(`  ⬜ ${lengua.nombre.padEnd(10)} sin diccionario todavía`);
    continue;
  }
  const armados = armar(d);
  const errores = armados.flatMap((a) => a.errores);
  if (errores.length > 0) {
    console.error(`\n  ${lengua.nombre}: hay recetas rotas; correr npm run validate:diccionario\n`);
    for (const e of errores) console.error(`    ✗ ${e}`);
    process.exit(1);
  }
  const listos = paraLaApp(d, armados);
  for (const a of listos) {
    const ruta = `packs/${lengua.codigo}/${a.archivo}`;
    esperado.set(ruta, JSON.stringify(a.pack, null, 2) + '\n');
    importaciones.push({ nombre: `${lengua.codigo}${camel(a.pack.theme)}${a.pack.difficulty}`, ruta: `./${ruta}` });
  }
  const total = armados.reduce((n, a) => n + a.pack.items.length, 0);
  const enApp = listos.reduce((n, a) => n + a.pack.items.length, 0);
  resumen.push(
    `  ✓ ${lengua.nombre.padEnd(10)} ${String(listos.length).padStart(2)} paquetes, ${String(enApp).padStart(3)} ítems en la app` +
      (enApp < total ? `   (${total - enApp} esperan revisión)` : ''),
  );

  if (!comprobar) formatearRecetas(path.join(d.dir, 'ejercicios.json'));
}

esperado.set(
  'index.ts',
  `/**
 * Registro estático de paquetes.
 *
 * GENERADO por \`npm run contenido\` a partir de \`diccionario/\`: no se edita a
 * mano. Para cambiar un ejercicio, se cambia su receta en
 * \`diccionario/<lengua>/ejercicios.json\` (ver diccionario/README.md).
 *
 * Metro no puede recorrer directorios en tiempo de ejecución, por eso cada
 * paquete se importa uno por uno.
 */

import type { Pack } from '../src/core/content/schema';

${importaciones.map((i) => `import ${i.nombre} from '${i.ruta}';`).join('\n')}

export const PACKS: Pack[] = [
${importaciones.map((i) => `  ${i.nombre},`).join('\n')}
] as Pack[];

export default PACKS;
`,
);

// Paquetes que están en disco y ya no se generan (una receta borrada, o una
// palabra que pasó a revisión): sobran.
const enDisco: string[] = [];
const packs = path.join(CONTENIDO, 'packs');
for (const lang of fs.readdirSync(packs)) {
  for (const f of fs.readdirSync(path.join(packs, lang))) {
    if (f.endsWith('.json')) enDisco.push(`packs/${lang}/${f}`);
  }
}
const sobran = enDisco.filter((r) => !esperado.has(r));
const distintos = [...esperado].filter(([ruta, texto]) => {
  const archivo = path.join(CONTENIDO, ruta);
  return !fs.existsSync(archivo) || fs.readFileSync(archivo, 'utf8') !== texto;
});

console.log(`\n  Contenido de la app\n  ${'─'.repeat(56)}`);
for (const r of resumen) console.log(r);
console.log(`  ${'─'.repeat(56)}`);

if (comprobar) {
  if (distintos.length === 0 && sobran.length === 0) {
    console.log('  app/content está al día con el diccionario.\n');
  } else {
    for (const [r] of distintos) console.log(`  ✗ desactualizado: content/${r}`);
    for (const r of sobran) console.log(`  ✗ sobra: content/${r}`);
    console.log('\n  Correr `npm run contenido` y subir el resultado.\n');
    process.exit(1);
  }
} else {
  for (const [ruta, texto] of distintos) {
    fs.mkdirSync(path.dirname(path.join(CONTENIDO, ruta)), { recursive: true });
    fs.writeFileSync(path.join(CONTENIDO, ruta), texto);
  }
  for (const r of sobran) fs.rmSync(path.join(CONTENIDO, r));
  console.log(`  ${distintos.length} archivo(s) escritos, ${sobran.length} borrados.\n`);
}

/** Una receta por línea: el archivo se lee como una lista de ejercicios. */
function formatearRecetas(archivo: string): void {
  if (!fs.existsSync(archivo)) return;
  const doc = JSON.parse(fs.readFileSync(archivo, 'utf8')) as { $comentario?: string; paquetes: RecetaPaquete[] };
  const j = (v: unknown): string => (Array.isArray(v) ? `[${v.map(j).join(', ')}]` : JSON.stringify(v));
  const receta = (r: Receta) => `{ ${Object.entries(r).map(([k, v]) => `${j(k)}: ${j(v)}`).join(', ')} }`;
  const lineas = ['{'];
  if (doc.$comentario) lineas.push(`  "$comentario": ${j(doc.$comentario)},`);
  lineas.push('  "paquetes": [');
  doc.paquetes.forEach((p, i) => {
    lineas.push('    {');
    for (const [k, v] of Object.entries(p)) if (k !== 'items') lineas.push(`      ${j(k)}: ${j(v)},`);
    lineas.push('      "items": [');
    p.items.forEach((r, k) => lineas.push(`        ${receta(r)}${k < p.items.length - 1 ? ',' : ''}`));
    lineas.push('      ]');
    lineas.push(`    }${i < doc.paquetes.length - 1 ? ',' : ''}`);
  });
  lineas.push('  ]', '}');
  fs.writeFileSync(archivo, lineas.join('\n') + '\n');
}
