/**
 * Comprueba el diccionario de cada lengua.
 *
 *   cd app && npm run validate:diccionario
 *
 * La regla que cuida es una sola: todo lo que un estudiante ve en un
 * ejercicio se puede seguir hasta su fuente.
 *
 *   corpus.csv          lo que escribió la gente o la obra publicada, tal cual
 *     → lexico.json     cada entrada dice de qué fuente sale y cómo se escribió
 *       → ejercicios.json  recetas que apuntan a entradas del léxico por su id
 *         → app/content/packs/   los genera `npm run contenido`
 *
 * Además comprueba que `lenguas.json` diga lo mismo que la app (códigos,
 * nombres y voz) y valida los paquetes con el mismo contrato que la app.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { LANGS, LANG_NOMBRE, validatePack } from '../../app/src/core/content/schema';
import { armar, armarAlEspanol, leerCsv, leerDiccionario, leerLenguas, palabras, paraLaApp, RAIZ_DICCIONARIO, type Entrada, type Lengua } from './recetas';

const RAIZ = RAIZ_DICCIONARIO;

const CATEGORIAS = new Set([
  'sustantivo', 'verbo', 'adjetivo', 'adverbio', 'numeral', 'pronombre', 'interrogativo',
  'posposicion', 'interjeccion', 'particula', 'expresion', 'frase', 'forma_flexionada',
]);
const ESTADOS = new Set(['publicada', 'un_hablante', 'varios_hablantes', 'probable', 'confirmada']);
const TIPOS_CORPUS = new Set(['palabra', 'frase', 'aporte', 'publicacion', 'equipo']);

/** Clave para comparar: mismas palabras, sin mayúsculas ni signos. */
const clave = (texto: string) => palabras(texto).join(' ').toLocaleLowerCase('es');

/** ¿Aparece `parte` como palabras seguidas dentro de `todo`? */
function contiene(todo: string[], parte: string[]): boolean {
  for (let i = 0; i + parte.length <= todo.length; i++) {
    if (parte.every((p, j) => todo[i + j] === p)) return true;
  }
  return false;
}

async function leerJson<T>(archivo: string): Promise<T> {
  return JSON.parse(await fs.readFile(archivo, 'utf8')) as T;
}

async function existe(archivo: string): Promise<boolean> {
  return fs.access(archivo).then(() => true, () => false);
}

async function verificarLengua(lengua: Lengua): Promise<string[]> {
  const errores: string[] = [];
  const dir = path.join(RAIZ, lengua.carpeta as string);

  // ── Fuentes ───────────────────────────────────────────────────────────
  const { fuentes } = await leerJson<{ fuentes: { id: string }[] }>(path.join(dir, 'fuentes.json'));
  const idsFuentes = new Set<string>();
  for (const f of fuentes) {
    if (idsFuentes.has(f.id)) errores.push(`fuentes.json: fuente repetida (${f.id})`);
    idsFuentes.add(f.id);
  }

  // ── Corpus ────────────────────────────────────────────────────────────
  // La última columna lleva el código de la lengua (miq, sum, rma, cab…).
  const lexico = await leerJson<{ lengua: string; entradas: Entrada[] }>(path.join(dir, 'lexico.json'));
  const esperada = `fuente,tipo,item,es,${lexico.lengua}`;
  const [cabecera, ...filas] = leerCsv(await fs.readFile(path.join(dir, 'corpus.csv'), 'utf8'));
  if (cabecera?.join(',') !== esperada) errores.push(`corpus.csv: la cabecera tiene que ser ${esperada}`);
  const corpus: { fuente: string; palabras: string[] }[] = [];
  for (const [i, f] of filas.entries()) {
    const n = i + 2;
    if (f.length !== 5) {
      errores.push(`corpus.csv:${n}: tiene ${f.length} columnas, no 5`);
      continue;
    }
    const [fuente = '', tipo = '', , es = '', texto = ''] = f;
    if (!idsFuentes.has(fuente)) errores.push(`corpus.csv:${n}: fuente desconocida (${fuente})`);
    if (!TIPOS_CORPUS.has(tipo)) errores.push(`corpus.csv:${n}: tipo desconocido (${tipo})`);
    if (!es.trim() || !texto.trim()) errores.push(`corpus.csv:${n}: fila vacía`);
    corpus.push({ fuente, palabras: palabras(texto) });
  }

  // ── Reglas de gramatica.md ────────────────────────────────────────────
  const gramatica = path.join(dir, 'gramatica.md');
  const reglas = (await existe(gramatica))
    ? new Set([...(await fs.readFile(gramatica, 'utf8')).matchAll(/^#{2,4} ([A-Z]\d+) /gm)].map((m) => m[1]))
    : null;

  // ── Léxico ────────────────────────────────────────────────────────────
  const ids = new Set<string>();
  for (const e of lexico.entradas) {
    if (ids.has(e.id)) errores.push(`lexico.json: id repetido (${e.id})`);
    ids.add(e.id);
  }
  for (const e of lexico.entradas) {
    const en = `lexico.json «${e.id}»`;
    if (!e.forma?.trim() || e.forma !== e.forma.trim()) errores.push(`${en}: \`forma\` vacía o con espacios de más`);
    if (!e.es?.trim()) errores.push(`${en}: falta \`es\``);
    if (!CATEGORIAS.has(e.categoria)) errores.push(`${en}: categoría desconocida (${e.categoria})`);
    if (!ESTADOS.has(e.estado)) errores.push(`${en}: estado desconocido (${e.estado})`);
    if (e.de && !ids.has(e.de)) errores.push(`${en}: \`de\` apunta a una entrada que no existe (${e.de})`);
    if (!e.fuentes?.length) errores.push(`${en}: falta \`fuentes\``);
    for (const f of e.fuentes ?? []) {
      if (!idsFuentes.has(f)) errores.push(`${en}: fuente desconocida (${f})`);
    }
    if (!e.registrado?.length) errores.push(`${en}: falta \`registrado\``);
    for (const r of e.registrado ?? []) {
      const buscado = palabras(r);
      const esta = corpus.some((c) => e.fuentes.includes(c.fuente) && contiene(c.palabras, buscado));
      if (!esta) errores.push(`${en}: «${r}» no aparece así en el corpus de sus fuentes`);
    }
    for (const regla of e.reglas ?? []) {
      if (reglas && !reglas.has(regla)) errores.push(`${en}: la regla ${regla} no está en gramatica.md`);
    }
  }

  // ── Ejercicios ────────────────────────────────────────────────────────
  if (lexico.lengua !== lengua.codigo) errores.push(`lexico.json: \`lengua\` es ${lexico.lengua}, lenguas.json dice ${lengua.codigo}`);
  const d = leerDiccionario(lengua);
  const armados = d ? armar(d) : [];
  const fichas = new Set(lexico.entradas.flatMap((e) => palabras(e.forma).map((p) => p.toLocaleLowerCase('es'))));
  const idsEjercicios = new Set<string>();
  let items = 0;
  for (const a of armados) {
    const en = `ejercicios.json ${a.pack.id}`;
    errores.push(...a.errores.map((e) => `ejercicios.json ${e}`));
    const r = validatePack(a.pack);
    if (!r.ok) errores.push(...r.errors.map((e) => `${en}: ${e}`));
    if (idsEjercicios.has(a.pack.id)) errores.push(`${en}: hay dos paquetes con el mismo tema y nivel`);
    idsEjercicios.add(a.pack.id);
    for (const [k, u] of a.usa.entries()) {
      items++;
      for (const x of u.extra) {
        if (!fichas.has(x.toLocaleLowerCase('es'))) errores.push(`${en} ítem ${k + 1}: el bloque «${x}» no es palabra de ninguna entrada`);
      }
    }
  }
  const enApp = d ? paraLaApp(d, armados).reduce((n, a) => n + a.pack.items.length, 0) : 0;

  // Español desde esta lengua: las mismas recetas dadas vuelta.
  let alEspanol = 0;
  if (d && lengua.ensena?.includes('spa')) {
    for (const a of armarAlEspanol(d, 'es-US')) {
      const r = validatePack(a.pack);
      if (!r.ok) errores.push(...r.errors.map((e) => `español desde ${lengua.codigo}, ${a.pack.id}: ${e}`));
      alEspanol += a.pack.items.length;
    }
  }

  // ── Interfaz traducida: cada traducción conserva los {valores} del español.
  const interfaz = path.join(dir, 'interfaz.csv');
  if (await existe(interfaz)) {
    const [cab, ...filasInterfaz] = leerCsv(await fs.readFile(interfaz, 'utf8'));
    const c = cab?.indexOf(lengua.codigo) ?? -1;
    for (const f of filasInterfaz) {
      const [clave = '', es = ''] = f;
      const trad = (f[c] ?? '').trim();
      if (!trad) continue;
      const marcas = (t: string) => [...t.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort().join(' ');
      if (marcas(trad) !== marcas(es)) {
        errores.push(`interfaz.csv «${clave}»: la traducción tiene que llevar ${marcas(es) || 'ningún {valor}'}, igual que el español`);
      }
    }
  }

  const revisar = lexico.entradas.filter((e: Entrada) => e.revisar).length;
  console.log(`  ${lengua.nombre} (${lengua.codigo})`);
  console.log(`    fuentes     ${String(fuentes.length).padStart(4)}`);
  console.log(`    corpus      ${String(corpus.length).padStart(4)} registros`);
  console.log(`    léxico      ${String(lexico.entradas.length).padStart(4)} entradas (${revisar} por revisar)`);
  console.log(`    ejercicios  ${String(armados.length).padStart(4)} paquetes, ${items} ítems (${items - enApp} esperan revisión)`);
  if (alEspanol) console.log(`    al español  ${String(alEspanol).padStart(4)} ítems (las mismas recetas dadas vuelta)`);
  return errores;
}

/** `lenguas.json` y la app tienen que decir lo mismo. */
async function verificarLenguas(lenguas: Lengua[]): Promise<string[]> {
  const errores: string[] = [];
  const codigos = lenguas.map((l) => l.codigo);
  if (codigos.join() !== [...LANGS].join()) {
    errores.push(`lenguas.json: los códigos (${codigos.join(', ')}) no son los de la app (${LANGS.join(', ')})`);
  }
  for (const l of lenguas) {
    if (LANG_NOMBRE[l.codigo] !== l.nombre) errores.push(`lenguas.json ${l.codigo}: la app la llama «${LANG_NOMBRE[l.codigo]}», no «${l.nombre}»`);
    // La voz: se prueba con un ejercicio de escucha contra el validador de la app.
    const prueba = (ttsLang: string) =>
      validatePack({
        id: 'p', lang: l.codigo, theme: 't', difficulty: 1, title: 't',
        // El español se aprende siempre desde otra lengua.
        ...(l.codigo === 'spa' ? { desde: 'miq' } : {}),
        items: [{ id: 'i', type: 'listen', skill: 's', tts: 'a', ttsLang, answer: 'a', options: ['a', 'b'], gloss: 'g' }],
      }).ok;
    if (l.voz && !prueba(l.voz)) errores.push(`lenguas.json ${l.codigo}: la app no deja sonar con la voz ${l.voz}`);
    if (!l.voz && (prueba('es-US') || prueba('en-US'))) errores.push(`lenguas.json ${l.codigo}: dice que no tiene voz, pero la app la deja sonar`);
  }
  const carpetas = new Set(lenguas.map((l) => l.carpeta).filter(Boolean));
  for (const d of await fs.readdir(RAIZ, { withFileTypes: true })) {
    if (d.isDirectory() && d.name !== 'herramientas' && !carpetas.has(d.name)) {
      errores.push(`la carpeta diccionario/${d.name} no figura en lenguas.json`);
    }
  }
  return errores;
}

async function main(): Promise<void> {
  console.log(`\n  Diccionario\n  ${'─'.repeat(56)}`);
  const lenguas = leerLenguas();
  let problemas = 0;
  const avisar = (errores: string[]) => {
    for (const e of errores) console.log(`    ✗ ${e}`);
    problemas += errores.length;
  };
  avisar(await verificarLenguas(lenguas));
  for (const l of lenguas) if (l.carpeta) avisar(await verificarLengua(l));

  console.log(`  ${'─'.repeat(56)}`);
  if (problemas === 0) {
    console.log('  Todo en orden: cada ejercicio sale de una fuente.\n');
  } else {
    console.log(`  ${problemas} problema(s).\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
