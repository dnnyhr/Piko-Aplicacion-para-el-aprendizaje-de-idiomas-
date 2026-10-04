/**
 * Lo que comparten todos los minijuegos: el vocabulario aprendido, los
 * niveles que se abren con las lecciones, la voz y el día.
 *
 * Todo sale de las lecciones que el estudiante ya hizo: los mismos paquetes
 * de `content/`, que a su vez salen del diccionario. Nada se inventa acá: la
 * palabra, su traducción y las respuestas equivocadas son siempre pares que
 * ya están en un paquete.
 *
 * Puro y sin React, para poder probarlo en Node.
 */

import { shuffle, type Rng } from '../ids';
import { normalizar } from '../content/verificar';
import { paraVozEspanola } from '../content/voz';
import { desdeDe, DESDE_POR_DEFECTO, words, type Item, type LangCode, type Pack } from '../content/schema';
import type { StudentState } from '../progress/projection';

/** Las lenguas en que se puede jugar. Las dos tienen voz (ver `vozDe`). */
export const LENGUAS_MINIJUEGOS = ['eng', 'miq'] as const;
export type LenguaMinijuego = (typeof LENGUAS_MINIJUEGOS)[number];

export const NIVELES_MINIJUEGOS = ['inicial', 'intermedio', 'avanzado'] as const;
export type NivelMinijuego = (typeof NIVELES_MINIJUEGOS)[number];

/**
 * Lo que pide cada nivel para abrirse: lecciones hechas en esa lengua y
 * palabras o frases distintas para llenar las opciones.
 */
export const REQUISITOS: Record<NivelMinijuego, { lecciones: number; palabras: number; frases: number }> = {
  inicial: { lecciones: 1, palabras: 3, frases: 0 },
  intermedio: { lecciones: 2, palabras: 4, frases: 0 },
  avanzado: { lecciones: 4, palabras: 0, frases: 3 },
};

/** Un par aprendido: cómo se dice en la lengua meta y qué significa. */
export interface Palabra {
  /** En la lengua que se practica. */
  meta: string;
  /** En la lengua de apoyo (español). */
  es: string;
  /** El ejercicio de donde sale: con él se anota la respuesta en el progreso. */
  item: Item;
  packId: string;
  /** Frase u oración, no una palabra suelta. */
  frase: boolean;
  /** Voz ya preparada por el paquete, si la trae. */
  tts?: { texto: string; lang: string };
}

/** Si el estudiante ya pasó por ese paquete: lo terminó o respondió algo de su tema. */
export function estudiado(pack: Pack, state: StudentState): boolean {
  if (state.packsDone.includes(pack.id)) return true;
  return pack.items.some((it) => (state.skills[it.skill]?.seen ?? 0) > 0);
}

/** Una frase dice algo en las dos lenguas: «matlalkahbi pura wal» es una sola palabra, «ocho». */
function esFrase(meta: string, es: string): boolean {
  if (/[.?!]$/.test(meta.trim())) return true;
  return words(meta).length >= 3 && words(es).length >= 2;
}

/** Lo que entra en un botón sin cortarse. Las oraciones más largas quedan para las lecciones. */
const LARGO_MAXIMO = 36;

/** Los paquetes de esa lengua que ya estudió. */
export function paquetesEstudiados(
  packs: readonly Pack[],
  state: StudentState,
  lang: LangCode,
  desde: LangCode = DESDE_POR_DEFECTO,
): Pack[] {
  return packs.filter((p) => p.lang === lang && desdeDe(p) === desde && estudiado(p, state));
}

/**
 * El vocabulario aprendido en `lang`, sin repetidos. Ordenado por id del
 * ejercicio, para que no dependa del orden en que se leyeron los paquetes.
 */
export function vocabularioAprendido(
  packs: readonly Pack[],
  state: StudentState,
  lang: LangCode,
  desde: LangCode = DESDE_POR_DEFECTO,
): Palabra[] {
  const porMeta = new Map<string, Palabra>();
  const todos: Palabra[] = [];
  for (const pack of paquetesEstudiados(packs, state, lang, desde)) {
    for (const item of pack.items) {
      let meta: string;
      let es: string;
      let tts: Palabra['tts'];
      if (item.type === 'choice') {
        meta = item.answer;
        es = item.prompt;
      } else if (item.type === 'listen') {
        meta = item.answer;
        es = item.gloss;
        if (item.tts && item.ttsLang) tts = { texto: item.tts, lang: item.ttsLang };
      } else {
        meta = item.target;
        es = item.gloss;
      }
      meta = meta.trim();
      es = es.trim();
      if (meta.length > LARGO_MAXIMO || es.length > LARGO_MAXIMO) continue;
      todos.push({ meta, es, item, packId: pack.id, frase: esFrase(meta, es), tts });
    }
  }
  todos.sort((a, b) => (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0));
  for (const p of todos) {
    const k = normalizar(p.meta);
    const previa = porMeta.get(k);
    if (!previa) porMeta.set(k, p);
    else if (!previa.tts && p.tts) porMeta.set(k, { ...previa, tts: p.tts });
  }
  return [...porMeta.values()];
}

/**
 * Las palabras que entran en cada nivel: en el inicial, palabras sueltas; en
 * el intermedio, también expresiones cortas; en el avanzado, frases.
 */
export function palabrasDeNivel(vocab: readonly Palabra[], nivel: NivelMinijuego): Palabra[] {
  if (nivel === 'inicial') return vocab.filter((p) => !p.frase && words(p.meta).length === 1);
  if (nivel === 'intermedio') return vocab.filter((p) => !p.frase);
  return vocab.filter((p) => p.frase);
}

/** Cuántos significados distintos hay: dos palabras con el mismo no pueden ir juntas. */
function distintos(pool: readonly Palabra[]): number {
  return new Set(pool.map((p) => normalizar(p.es))).size;
}

export interface EstadoNivel {
  nivel: NivelMinijuego;
  abierto: boolean;
  /** Lecciones que faltan en esa lengua para abrirlo. 0 si ya está abierto por lecciones. */
  faltanLecciones: number;
}

/**
 * Qué niveles puede jugar en `lang`, según sus lecciones. `opciones` dice
 * cuántas respuestas muestra el juego en cada nivel: hacen falta al menos
 * esas palabras distintas para llenarlas.
 */
export function nivelesDe(
  packs: readonly Pack[],
  state: StudentState,
  lang: LangCode,
  opciones: Record<NivelMinijuego, number>,
  desde: LangCode = DESDE_POR_DEFECTO,
): EstadoNivel[] {
  const lecciones = paquetesEstudiados(packs, state, lang, desde).length;
  const vocab = vocabularioAprendido(packs, state, lang, desde);
  return NIVELES_MINIJUEGOS.map((nivel) => {
    const r = REQUISITOS[nivel];
    const pool = palabrasDeNivel(vocab, nivel);
    const alcanza =
      nivel === 'avanzado'
        ? distintos(pool) >= r.frases && distintos(vocab) >= opciones[nivel]
        : distintos(pool) >= Math.max(r.palabras, opciones[nivel]);
    return {
      nivel,
      abierto: lecciones >= r.lecciones && alcanza,
      faltanLecciones: Math.max(0, r.lecciones - lecciones),
    };
  });
}

/** El nivel que le toca: el más alto que tiene abierto. Null si ninguno. */
export function nivelSugerido(niveles: readonly EstadoNivel[]): NivelMinijuego | null {
  const abiertos = niveles.filter((n) => n.abierto);
  return abiertos.length > 0 ? (abiertos[abiertos.length - 1] as EstadoNivel).nivel : null;
}

// ----------------------------------------------------------------- elegir

/** Peso para elegir qué practicar: lo menos dominado sale más. Igual que `pickAdaptive`. */
function peso(p: Palabra, state: StudentState): number {
  const skill = state.skills[p.item.skill];
  if (!skill || skill.seen === 0) return 3;
  return 1 + 2 * (1 - skill.mastery);
}

/**
 * `n` palabras para practicar, sin repetir mientras alcancen y nunca la
 * misma dos veces seguidas.
 */
export function elegirObjetivos(pool: readonly Palabra[], n: number, state: StudentState, rng: Rng): Palabra[] {
  const out: Palabra[] = [];
  while (out.length < n && pool.length > 0) {
    const restantes = pool.filter((p) => !out.includes(p));
    let fuente = restantes.length > 0 ? restantes : pool.filter((p) => p !== out[out.length - 1]);
    if (fuente.length === 0) fuente = [...pool];
    const pesos = fuente.map((p) => peso(p, state));
    let objetivo = rng() * pesos.reduce((a, b) => a + b, 0);
    let elegida = fuente[fuente.length - 1] as Palabra;
    for (let i = 0; i < fuente.length; i++) {
      objetivo -= pesos[i] as number;
      if (objetivo <= 0) {
        elegida = fuente[i] as Palabra;
        break;
      }
    }
    out.push(elegida);
  }
  return out;
}

/**
 * Las respuestas equivocadas: otros pares aprendidos, nunca uno que signifique
 * lo mismo que la respuesta ni que se escriba igual.
 */
export function distractores(
  objetivo: Palabra,
  candidatos: readonly Palabra[],
  enMeta: boolean,
  n: number,
  rng: Rng,
): string[] {
  const texto = (p: Palabra) => (enMeta ? p.meta : p.es);
  const usados = new Set([normalizar(objetivo.es), normalizar(objetivo.meta)]);
  const out: string[] = [];
  for (const p of shuffle(candidatos, rng)) {
    if (out.length >= n) break;
    const kes = normalizar(p.es);
    const kmeta = normalizar(p.meta);
    if (usados.has(kes) || usados.has(kmeta)) continue;
    usados.add(kes);
    usados.add(kmeta);
    out.push(texto(p));
  }
  return out;
}

/**
 * La respuesta correcta más `n - 1` equivocadas, barajadas: primero del mismo
 * nivel y, si no alcanza, de todo lo aprendido. Null si no hay con qué llenar.
 */
export function opcionesPara(
  palabra: Palabra,
  pool: readonly Palabra[],
  vocab: readonly Palabra[],
  enMeta: boolean,
  n: number,
  rng: Rng,
): { opciones: string[]; correcta: number } | null {
  let otras = distractores(palabra, pool, enMeta, n - 1, rng);
  if (otras.length < n - 1) {
    const resto = vocab.filter((p) => !pool.includes(p));
    otras = [...otras, ...distractores(palabra, resto, enMeta, n - 1, rng)]
      .filter((t, k, todas) => todas.findIndex((x) => normalizar(x) === normalizar(t)) === k)
      .slice(0, n - 1);
  }
  if (otras.length < n - 1) return null;
  const buena = enMeta ? palabra.meta : palabra.es;
  const opciones = shuffle([buena, ...otras], rng);
  return { opciones, correcta: opciones.indexOf(buena) };
}

// ---------------------------------------------------------------------- voz

export interface Voz {
  texto: string;
  /** BCP-47 de la voz del sistema. */
  lang: string;
}

/**
 * Con qué voz suena un texto en la lengua meta. Inglés americano, como el
 * resto de la app; el miskito, con la voz en español y el texto preparado
 * (decisión 16), hasta tener grabaciones de hablantes.
 */
export function vozDe(lang: LenguaMinijuego, texto: string, preparada?: Palabra['tts']): Voz {
  if (preparada) return { texto: preparada.texto, lang: preparada.lang };
  if (lang === 'miq') return { texto: paraVozEspanola(texto), lang: 'es-US' };
  return { texto, lang: 'en-US' };
}

/** Lo que dice Piko al leer una palabra en la lengua meta. */
export function vozDePalabra(lang: LenguaMinijuego, p: Palabra): Voz {
  return vozDe(lang, p.meta, p.tts);
}

// ---------------------------------------------------------------------- día

/** El día local del teléfono, `AAAA-MM-DD`. Es la unidad del tope de flores. */
export function diaLocal(fecha: Date = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${d(fecha.getMonth() + 1)}-${d(fecha.getDate())}`;
}
