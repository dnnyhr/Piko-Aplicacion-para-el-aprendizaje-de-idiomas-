/**
 * La Rayuela de Piko: de dónde salen las preguntas y qué niveles se abren.
 *
 * Todo sale del vocabulario de las lecciones que el estudiante ya hizo: los
 * mismos paquetes de `content/`, que a su vez salen del diccionario. Nada se
 * inventa acá: la palabra, su traducción y las casillas equivocadas son
 * siempre pares que ya están en un paquete.
 *
 * Puro y sin React, para poder probarlo en Node.
 */

import { shuffle, type Rng } from '../ids';
import { normalizar } from '../content/verificar';
import { paraVozEspanola } from '../content/voz';
import { desdeDe, DESDE_POR_DEFECTO, words, type Item, type LangCode, type Pack } from '../content/schema';
import type { StudentState } from '../progress/projection';

/** Saltos de una partida: de la casilla 1 al cielo. */
export const SALTOS = 6;

export const ID_RAYUELA = 'rayuela';

/** Las lenguas en que se puede jugar. Las dos tienen voz (ver `vozDe`). */
export const LENGUAS_RAYUELA = ['eng', 'miq'] as const;
export type LenguaRayuela = (typeof LENGUAS_RAYUELA)[number];

export const NIVELES_RAYUELA = ['inicial', 'intermedio', 'avanzado'] as const;
export type NivelRayuela = (typeof NIVELES_RAYUELA)[number];

/** Casillas con respuestas por salto. Más nivel, más casillas. */
export const CASILLAS: Record<NivelRayuela, number> = { inicial: 3, intermedio: 4, avanzado: 5 };

/**
 * Lo que pide cada nivel para abrirse: lecciones hechas en esa lengua y
 * palabras o frases distintas para llenar las casillas.
 */
export const REQUISITOS: Record<NivelRayuela, { lecciones: number; palabras: number; frases: number }> = {
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

/** Lo que entra en una casilla sin cortarse. Las oraciones más largas quedan para las lecciones. */
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

/** Las palabras que entran en cada nivel. */
function poolDe(vocab: readonly Palabra[], nivel: NivelRayuela): Palabra[] {
  if (nivel === 'inicial') return vocab.filter((p) => !p.frase && words(p.meta).length === 1);
  if (nivel === 'intermedio') return vocab.filter((p) => !p.frase);
  return vocab.filter((p) => p.frase);
}

/** Cuántos significados distintos hay: dos palabras con el mismo no pueden ir juntas. */
function distintos(pool: readonly Palabra[]): number {
  return new Set(pool.map((p) => normalizar(p.es))).size;
}

export interface EstadoNivel {
  nivel: NivelRayuela;
  abierto: boolean;
  /** Lecciones que faltan en esa lengua para abrirlo. 0 si ya está abierto por lecciones. */
  faltanLecciones: number;
}

/** Qué niveles puede jugar en `lang`, según sus lecciones. */
export function nivelesDe(
  packs: readonly Pack[],
  state: StudentState,
  lang: LangCode,
  desde: LangCode = DESDE_POR_DEFECTO,
): EstadoNivel[] {
  const lecciones = paquetesEstudiados(packs, state, lang, desde).length;
  const vocab = vocabularioAprendido(packs, state, lang, desde);
  return NIVELES_RAYUELA.map((nivel) => {
    const r = REQUISITOS[nivel];
    const pool = poolDe(vocab, nivel);
    const alcanza =
      nivel === 'avanzado'
        ? distintos(pool) >= r.frases && distintos(vocab) >= CASILLAS[nivel]
        : distintos(pool) >= Math.max(r.palabras, CASILLAS[nivel]);
    return {
      nivel,
      abierto: lecciones >= r.lecciones && alcanza,
      faltanLecciones: Math.max(0, r.lecciones - lecciones),
    };
  });
}

/** El nivel que le toca: el más alto que tiene abierto. Null si ninguno. */
export function nivelSugerido(niveles: readonly EstadoNivel[]): NivelRayuela | null {
  const abiertos = niveles.filter((n) => n.abierto);
  return abiertos.length > 0 ? (abiertos[abiertos.length - 1] as EstadoNivel).nivel : null;
}

// ---------------------------------------------------------------- preguntas

/**
 * - `directo`: se muestra la palabra en la lengua meta; las casillas, en español.
 * - `inverso`: se muestra en español; las casillas, en la lengua meta.
 * - `escucha`: Piko la dice sin mostrarla; las casillas, en español.
 */
export type TipoPregunta = 'directo' | 'inverso' | 'escucha';

export interface Pregunta {
  tipo: TipoPregunta;
  palabra: Palabra;
  /** Lo que se muestra arriba (en `escucha`, recién después de acertar). */
  foco: string;
  /** El texto de cada casilla, en orden. */
  opciones: string[];
  /** Índice de la casilla correcta. */
  correcta: number;
  /** Si las casillas están en la lengua meta (y entonces se pueden escuchar). */
  opcionesEnMeta: boolean;
}

const TIPOS: Record<NivelRayuela, readonly TipoPregunta[]> = {
  inicial: ['directo', 'inverso'],
  intermedio: ['inverso', 'directo'],
  avanzado: ['escucha', 'inverso', 'escucha'],
};

/** Peso para elegir qué practicar: lo menos dominado sale más. Igual que `pickAdaptive`. */
function peso(p: Palabra, state: StudentState): number {
  const skill = state.skills[p.item.skill];
  if (!skill || skill.seen === 0) return 3;
  return 1 + 2 * (1 - skill.mastery);
}

function elegirObjetivos(pool: readonly Palabra[], n: number, state: StudentState, rng: Rng): Palabra[] {
  const out: Palabra[] = [];
  while (out.length < n && pool.length > 0) {
    const restantes = pool.filter((p) => !out.includes(p));
    const fuente = restantes.length > 0 ? restantes : pool.filter((p) => p !== out[out.length - 1]);
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
 * Las casillas equivocadas: otros pares aprendidos, nunca uno que signifique
 * lo mismo que la respuesta ni que se escriba igual. Primero del mismo nivel.
 */
function distractores(
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
 * Una partida: `SALTOS` preguntas del vocabulario aprendido. Vacía si el
 * nivel no tiene con qué llenarse.
 */
export function armarPartida(
  vocab: readonly Palabra[],
  nivel: NivelRayuela,
  state: StudentState,
  rng: Rng,
): Pregunta[] {
  const pool = poolDe(vocab, nivel);
  const casillas = CASILLAS[nivel];
  // Las equivocadas salen primero del mismo nivel; si no alcanza, de todo lo aprendido.
  const resto = vocab.filter((p) => !pool.includes(p));
  const preguntas: Pregunta[] = [];

  elegirObjetivos(pool, SALTOS, state, rng).forEach((palabra, i) => {
    const tipo = TIPOS[nivel][i % TIPOS[nivel].length] as TipoPregunta;
    const enMeta = tipo === 'inverso';
    let otras = distractores(palabra, pool, enMeta, casillas - 1, rng);
    if (otras.length < casillas - 1) {
      otras = [...otras, ...distractores(palabra, resto, enMeta, casillas - 1, rng)]
        .filter((t, k, todas) => todas.findIndex((x) => normalizar(x) === normalizar(t)) === k)
        .slice(0, casillas - 1);
    }
    if (otras.length < casillas - 1) return;
    const correcta = enMeta ? palabra.meta : palabra.es;
    const opciones = shuffle([correcta, ...otras], rng);
    preguntas.push({
      tipo,
      palabra,
      foco: tipo === 'inverso' ? palabra.es : palabra.meta,
      opciones,
      correcta: opciones.indexOf(correcta),
      opcionesEnMeta: enMeta,
    });
  });
  return preguntas.length === SALTOS ? preguntas : [];
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
export function vozDe(lang: LenguaRayuela, texto: string, preparada?: Palabra['tts']): Voz {
  if (preparada) return { texto: preparada.texto, lang: preparada.lang };
  if (lang === 'miq') return { texto: paraVozEspanola(texto), lang: 'es-US' };
  return { texto, lang: 'en-US' };
}

/** Lo que dice Piko al leer una casilla o la palabra de la pregunta. */
export function vozDePalabra(lang: LenguaRayuela, p: Palabra): Voz {
  return vozDe(lang, p.meta, p.tts);
}

// ---------------------------------------------------------------------- día

/** El día local del teléfono, `AAAA-MM-DD`. Es la unidad del tope de flores. */
export function diaLocal(fecha: Date = new Date()): string {
  const d = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${d(fecha.getMonth() + 1)}-${d(fecha.getDate())}`;
}
