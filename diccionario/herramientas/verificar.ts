/**
 * Comprueba el diccionario de cada lengua.
 *
 *   cd app && npm run validate:diccionario
 *
 * La regla que cuida es una sola: todo lo que un estudiante ve en un
 * ejercicio se puede seguir hasta lo que escribió una persona.
 *
 *   corpus.csv        lo que escribió la gente, tal cual
 *     → lexico.json   cada entrada dice de qué fuente sale y cómo se escribió
 *       → ejercicios/ sólo formas del léxico que no están por revisar
 *
 * Además valida los ejercicios con el mismo contrato que la app
 * (`validatePack`), así pasarlos a `app/content/packs/` es copiarlos.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerPacks } from '../../app/tools/packs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..');

const CATEGORIAS = new Set([
  'sustantivo', 'verbo', 'adjetivo', 'adverbio', 'numeral', 'pronombre', 'interrogativo',
  'posposicion', 'interjeccion', 'particula', 'expresion', 'frase', 'forma_flexionada',
]);
const ESTADOS = new Set(['un_hablante', 'probable', 'confirmada']);
const TIPOS_CORPUS = new Set(['palabra', 'frase', 'aporte']);

interface Entrada {
  id: string;
  forma: string;
  registrado: string[];
  es: string;
  categoria: string;
  tema: string;
  de?: string;
  revisar?: string;
  reglas?: string[];
  fuentes: string[];
  estado: string;
}

/** Palabras de un texto, sin los signos pegados al principio o al final. */
function palabras(texto: string): string[] {
  return texto
    .split(/\s+/)
    .map((p) => p.replace(/^[¿¡"«(]+|[.,;:!?"»)]+$/g, ''))
    .filter(Boolean);
}

/** Clave para comparar: mismas palabras, sin mayúsculas ni signos. */
const clave = (texto: string) => palabras(texto).join(' ').toLocaleLowerCase('es');

/** ¿Aparece `parte` como palabras seguidas dentro de `todo`? */
function contiene(todo: string[], parte: string[]): boolean {
  for (let i = 0; i + parte.length <= todo.length; i++) {
    if (parte.every((p, j) => todo[i + j] === p)) return true;
  }
  return false;
}

/** CSV con comillas dobles, como lo exportan las planillas. */
function leerCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(campo); filas.push(fila); fila = []; campo = '';
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

async function leerJson<T>(archivo: string): Promise<T> {
  return JSON.parse(await fs.readFile(archivo, 'utf8')) as T;
}

async function existe(archivo: string): Promise<boolean> {
  return fs.access(archivo).then(() => true, () => false);
}

async function verificarLengua(dir: string, nombre: string): Promise<string[]> {
  const errores: string[] = [];

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
  const usables = lexico.entradas.filter((e) => !e.revisar);
  const formas = new Set(usables.map((e) => clave(e.forma)));
  const fichas = new Set(usables.flatMap((e) => palabras(e.forma).map((p) => p.toLocaleLowerCase('es'))));
  const porRevisar = new Map(
    lexico.entradas.filter((e) => e.revisar).map((e) => [clave(e.forma), e.id] as const),
  );
  const noAtestiguada = (texto: string) => {
    const r = porRevisar.get(clave(texto));
    return r ? `«${texto}» está por revisar en el léxico (${r})` : `«${texto}» no es una forma del léxico`;
  };

  const leidos = await leerPacks(path.join(dir, 'ejercicios'));
  const idsEjercicios = new Set<string>();
  let items = 0;
  for (const l of leidos) {
    const en = `ejercicios/${l.relativa}`;
    if (!l.pack) {
      for (const e of l.errores) errores.push(`${en}: ${e}`);
      continue;
    }
    if (l.pack.lang !== lexico.lengua) errores.push(`${en}: \`lang\` es ${l.pack.lang}, el léxico es ${lexico.lengua}`);
    for (const id of [l.pack.id, ...l.pack.items.map((it) => it.id)]) {
      if (idsEjercicios.has(id)) errores.push(`${en}: id repetido entre paquetes (${id})`);
      idsEjercicios.add(id);
    }
    for (const it of l.pack.items) {
      items++;
      if (it.type === 'build') {
        if (!formas.has(clave(it.target))) errores.push(`${en} ${it.id}: ${noAtestiguada(it.target)}`);
        for (const b of it.blocks) {
          if (!fichas.has(clave(b))) errores.push(`${en} ${it.id}: el bloque «${b}» no sale de ninguna forma usable del léxico`);
        }
      } else {
        for (const o of new Set([it.answer, ...it.options])) {
          if (!formas.has(clave(o))) errores.push(`${en} ${it.id}: ${noAtestiguada(o)}`);
        }
      }
    }
  }

  const revisar = lexico.entradas.length - usables.length;
  console.log(`  ${nombre} (${lexico.lengua})`);
  console.log(`    fuentes     ${String(fuentes.length).padStart(4)}`);
  console.log(`    corpus      ${String(corpus.length).padStart(4)} registros`);
  console.log(`    léxico      ${String(lexico.entradas.length).padStart(4)} entradas (${revisar} por revisar)`);
  console.log(`    ejercicios  ${String(leidos.length).padStart(4)} paquetes, ${items} ítems`);
  return errores;
}

async function main(): Promise<void> {
  console.log(`\n  Diccionario\n  ${'─'.repeat(56)}`);
  const lenguas = (await fs.readdir(RAIZ, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && d.name !== 'herramientas')
    .map((d) => d.name)
    .sort();

  let problemas = 0;
  for (const nombre of lenguas) {
    const errores = await verificarLengua(path.join(RAIZ, nombre), nombre);
    for (const e of errores) console.log(`    ✗ ${e}`);
    problemas += errores.length;
  }

  console.log(`  ${'─'.repeat(56)}`);
  if (problemas === 0) {
    console.log('  Todo en orden: cada ejercicio sale de lo que escribió una persona.\n');
  } else {
    console.log(`  ${problemas} problema(s).\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
