/**
 * La Música de Piko: el formato de una canción y la lección que se arma con ella.
 *
 * La idea: aprender inglés con canciones de Nicaragua que ya conocemos.
 * Escucho mi canción → entiendo una frase → aprendo cómo decirla en inglés →
 * practico → canto → gano sacuanjoches.
 *
 * Una canción entra a la app sólo con su permiso: quién la canta o la
 * compuso, quién autoriza que Piko la use y cómo lo autorizó. La letra se
 * guarda tal como se canta. La traducción al español de una canción en otra
 * lengua (kriol, miskito…) es la que validó una persona competente: Piko no la
 * inventa. El inglés sale de ese significado; cuando no es literal, la línea
 * lo dice (`aproximado`) y explica por qué (`nota`).
 *
 * Puro y sin React, para poder probarlo en Node.
 */

import type { Rng } from '../ids';
import { shuffle } from '../ids';
import { normalizar } from '../content/verificar';
import type { NivelMinijuego } from '../minijuegos/vocabulario';

export const ID_MUSICA = 'musica';

/**
 * Las lenguas en que puede estar una canción. Además de las de la app, el
 * kriol de la Costa Caribe (ISO 639-3 `bzk`, «Nicaragua Creole English»).
 */
export const LENGUAS_CANCION = ['miq', 'sum', 'rma', 'cab', 'bzk', 'spa', 'eng'] as const;
export type LenguaCancion = (typeof LENGUAS_CANCION)[number];

export const NIVELES_CANCION = ['inicial', 'intermedio', 'avanzado'] as const satisfies readonly NivelMinijuego[];

/** Los dibujos de instrumentos para la tarjeta de cada canción. */
export const IMAGENES_CANCION = ['tambor', 'marimba', 'guitarra', 'quijada', 'maracas', 'concha'] as const;
export type ImagenCancion = (typeof IMAGENES_CANCION)[number];

/** Una línea de la letra: como se canta, qué significa, cómo se dice en inglés y cuándo suena. */
export interface Verso {
  /** Tal como se canta, en la lengua de la canción. */
  texto: string;
  /** Traducción validada al español. Obligatoria si la canción no está en español. */
  es?: string;
  /**
   * Cómo se dice en inglés (de Estados Unidos). Puede faltar sólo en lo que
   * no se traduce (un coro de sonidos, un nombre), y entonces va una `nota`
   * que lo explica.
   */
  en?: string;
  /** El inglés no es literal: dice la idea, no palabra por palabra. Se muestra «Significado aproximado». */
  aproximado?: boolean;
  /** Una explicación corta: una expresión propia, un nombre que no se traduce, el contexto. */
  nota?: string;
  /** Segundo de la grabación en que empieza y termina. */
  inicio: number;
  fin: number;
  /**
   * El segundo en que empieza cada palabra, si se sabe (las pistas que arma
   * Piko lo saben nota por nota). Sin esto, el tiempo del verso se reparte
   * entre las palabras.
   */
  tiempos?: number[];
}

/** Una palabra de la canción que está en el diccionario miskito de Piko (validada). */
export interface PalabraMiskito {
  en: string;
  es: string;
  /** Como se escribe en miskito: la `forma` de la entrada del diccionario. */
  miq: string;
  /** El id de la entrada del diccionario que la respalda. */
  lexico: string;
}

/**
 * Una frase de la canción convertida en lección de inglés. Se apoya en el
 * `en` de su verso y trae lo que hace falta para las cuatro actividades.
 */
export interface Leccion {
  /** Índice del verso en `letra`. */
  verso: number;
  /** «Completa la frase»: la palabra que se tapa en el inglés del verso y las opciones (ella incluida). */
  completar: { oculta: string; opciones: string[] };
  /** «Usa esta palabra»: la palabra nueva y una oración donde se usa, con su traducción. */
  palabra: { en: string; es: string; ejemplo: string; ejemploEs: string; opciones: string[] };
  /** «Ordena la frase»: una oración corta para armar palabra por palabra. */
  ordenar: string;
  /** «¿Qué escuchaste?»: otras oraciones que suenan parecido al inglés del verso. */
  escucha: string[];
}

export interface FuenteCancion {
  /** Quién la canta en la grabación. */
  interpreta: string;
  /** Quién la compuso, o «tradicional». */
  autoria: string;
  /** Quién autoriza que Piko la use. */
  autoriza: string;
  /** Cómo lo autorizó: por escrito, en la encuesta, en persona… */
  forma: string;
  fecha: string;
  /** Quién validó la letra y las traducciones. */
  validado_por: string;
  permiso: true;
}

export interface Cancion {
  id: string;
  titulo: string;
  lengua: LenguaCancion;
  region: string;
  comunidad: string;
  nivel: NivelMinijuego;
  imagen: ImagenCancion;
  /** Nombre del archivo de audio en `content/canciones/audio/`. */
  audio: string;
  /** El pulso de la grabación, para que Piko baile a tiempo: pulsos por minuto y el segundo de un pulso. */
  ritmo: { bpm: number; pulso: number };
  fuente: FuenteCancion;
  /** «Conoce nuestra canción». */
  conoce: { origen: string; lengua: string; region: string; representa: string };
  letra: Verso[];
  /** Los versos que son el coro (la primera vez que suenan). Cuando vuelven, se marca «Repite el coro». */
  coro?: number[];
  /** Entre 2 y 4 frases convertidas en lección. */
  lecciones: Leccion[];
  /**
   * Palabras de la canción que ya están validadas en el diccionario miskito.
   * Piko no traduce canciones al miskito: sólo muestra lo que una persona
   * competente ya validó.
   */
  miskito?: PalabraMiskito[];
  /** «Canta con Piko»: los versos de `desde` a `hasta`, incluidos. */
  canta: { desde: number; hasta: number };
}

// --------------------------------------------------------------- validación

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const esSegundo = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** Las palabras de una línea, sin signos, para buscar una palabra en ella. */
export function palabrasDe(linea: string): string[] {
  return linea
    .split(/\s+/)
    .map((w) => normalizar(w.replace(/^[¿¡«"'(]+|[»"'),.;:!?]+$/g, '')))
    .filter(Boolean);
}

const tiene = (linea: string, palabra: string) => palabrasDe(linea).includes(normalizar(palabra));

function opcionesBien(opciones: unknown, correcta: string): boolean {
  if (!Array.isArray(opciones) || opciones.length < 3 || opciones.length > 4 || !opciones.every(esTexto)) return false;
  const n = opciones.map((o) => normalizar(o));
  return new Set(n).size === n.length && n.includes(normalizar(correcta));
}

/**
 * Lo que una canción tiene que cumplir para entrar a la app. `lexico`, si se
 * pasa, son las formas validadas del diccionario miskito por id: las palabras
 * en miskito de la canción tienen que estar ahí, escritas igual.
 * Devuelve la lista de errores; vacía si está bien.
 */
export function validarCancion(raw: unknown, lexico?: ReadonlyMap<string, string>): string[] {
  const errores: string[] = [];
  if (typeof raw !== 'object' || raw === null) return ['la canción no es un objeto'];
  const c = raw as Record<string, unknown>;
  const id = esTexto(c.id) ? c.id : '(sin id)';
  const e = (m: string) => errores.push(`${id}: ${m}`);

  if (!esTexto(c.id) || !/^[a-z0-9-]+$/.test(c.id)) e('`id` en minúsculas, números y guiones');
  for (const k of ['titulo', 'region', 'comunidad', 'audio'] as const) if (!esTexto(c[k])) e(`falta \`${k}\``);
  if (!(LENGUAS_CANCION as readonly unknown[]).includes(c.lengua)) e(`\`lengua\` tiene que ser una de ${LENGUAS_CANCION.join(', ')}`);
  if (!(NIVELES_CANCION as readonly unknown[]).includes(c.nivel)) e('`nivel` tiene que ser inicial, intermedio o avanzado');
  if (!(IMAGENES_CANCION as readonly unknown[]).includes(c.imagen)) e(`\`imagen\` tiene que ser una de ${IMAGENES_CANCION.join(', ')}`);

  const ritmo = c.ritmo as Record<string, unknown> | undefined;
  if (!ritmo || typeof ritmo.bpm !== 'number' || ritmo.bpm < 40 || ritmo.bpm > 220 || !esSegundo(ritmo.pulso)) {
    e('`ritmo` lleva `bpm` (entre 40 y 220) y `pulso` (el segundo de un pulso)');
  }

  // El permiso, primero: sin permiso no hay canción.
  const f = c.fuente as Record<string, unknown> | undefined;
  if (!f || typeof f !== 'object') e('falta `fuente`: quién la canta, quién autoriza y cómo');
  else {
    for (const k of ['interpreta', 'autoria', 'autoriza', 'forma', 'fecha', 'validado_por'] as const) {
      if (!esTexto(f[k])) e(`falta \`fuente.${k}\``);
    }
    if (f.permiso !== true) e('`fuente.permiso` tiene que ser true: sin autorización la canción no entra');
  }

  const k = c.conoce as Record<string, unknown> | undefined;
  if (!k || typeof k !== 'object') e('falta `conoce` («Conoce nuestra canción»)');
  else for (const x of ['origen', 'lengua', 'region', 'representa'] as const) if (!esTexto(k[x])) e(`falta \`conoce.${x}\``);

  const letra = Array.isArray(c.letra) ? (c.letra as Record<string, unknown>[]) : [];
  if (letra.length === 0) e('falta `letra`');
  letra.forEach((v, i) => {
    if (!esTexto(v.texto)) e(`verso ${i}: falta \`texto\``);
    if (c.lengua !== 'spa' && !esTexto(v.es)) e(`verso ${i}: falta la traducción validada al español (\`es\`)`);
    if (!esTexto(v.en) && !esTexto(v.nota)) e(`verso ${i}: falta el inglés (\`en\`) o una \`nota\` que diga por qué no se traduce`);
    if (v.aproximado !== undefined && typeof v.aproximado !== 'boolean') e(`verso ${i}: \`aproximado\` es true o false`);
    if (v.aproximado === true && !esTexto(v.nota)) e(`verso ${i}: un inglés aproximado lleva una \`nota\` que explique la idea`);
    if (!esSegundo(v.inicio) || !esSegundo(v.fin) || (v.fin as number) <= (v.inicio as number)) {
      e(`verso ${i}: \`inicio\` y \`fin\` tienen que ser segundos, con fin después de inicio`);
    }
    if (v.tiempos !== undefined) {
      const ts = v.tiempos as unknown[];
      const n = esTexto(v.texto) ? palabrasDelVerso(v.texto).length : -1;
      const ok =
        Array.isArray(ts) &&
        ts.length === n &&
        ts.every((x, k) => esSegundo(x) && (x as number) >= (v.inicio as number) && (x as number) < (v.fin as number) && (k === 0 || (x as number) > (ts[k - 1] as number)));
      if (!ok) e(`verso ${i}: \`tiempos\` lleva un segundo por palabra, en orden, dentro del verso`);
    }
  });

  if (c.coro !== undefined) {
    if (!Array.isArray(c.coro) || !c.coro.every((n) => typeof n === 'number' && letra[n] !== undefined)) e('`coro` son índices de versos de la letra');
  }

  const lecciones = Array.isArray(c.lecciones) ? (c.lecciones as Record<string, unknown>[]) : [];
  if (lecciones.length < 2 || lecciones.length > 4) e('van entre 2 y 4 `lecciones`');
  lecciones.forEach((l, i) => {
    const v = typeof l.verso === 'number' ? letra[l.verso] : undefined;
    const en = v && esTexto(v.en) ? v.en : null;
    if (!en) return e(`lección ${i}: el verso no existe o no tiene inglés`);

    const comp = l.completar as Record<string, unknown> | undefined;
    if (!comp || !esTexto(comp.oculta) || !tiene(en, comp.oculta)) e(`lección ${i}: la palabra a completar no está en «${en}»`);
    else if (!opcionesBien(comp.opciones, comp.oculta)) e(`lección ${i}: \`completar.opciones\` son 3 o 4, distintas, con la correcta`);

    const p = l.palabra as Record<string, unknown> | undefined;
    if (!p || !esTexto(p.en) || !esTexto(p.es) || !esTexto(p.ejemplo) || !esTexto(p.ejemploEs)) {
      e(`lección ${i}: \`palabra\` lleva en, es, ejemplo y ejemploEs`);
    } else {
      if (!tiene(p.ejemplo, p.en)) e(`lección ${i}: «${p.en}» no está en el ejemplo «${p.ejemplo}»`);
      if (!opcionesBien(p.opciones, p.en)) e(`lección ${i}: \`palabra.opciones\` son 3 o 4, distintas, con la palabra`);
    }

    const fichas = esTexto(l.ordenar) ? fichasDe(l.ordenar) : [];
    if (fichas.length < 3 || fichas.length > 7) e(`lección ${i}: \`ordenar\` es una oración de 3 a 7 palabras`);

    const esc = l.escucha;
    if (!Array.isArray(esc) || esc.length < 2 || !esc.every(esTexto)) e(`lección ${i}: \`escucha\` lleva al menos 2 oraciones parecidas`);
    else if (esc.some((x) => normalizar(x) === normalizar(en))) e(`lección ${i}: \`escucha\` no puede repetir la oración del verso`);
  });

  if (c.miskito !== undefined) {
    if (!Array.isArray(c.miskito)) e('`miskito` es una lista de palabras');
    else
      (c.miskito as Record<string, unknown>[]).forEach((m, i) => {
        if (!esTexto(m.en) || !esTexto(m.es) || !esTexto(m.miq) || !esTexto(m.lexico)) return e(`miskito ${i}: lleva en, es, miq y lexico`);
        if (lexico && lexico.get(m.lexico) !== m.miq) e(`miskito ${i} («${m.miq}»): tiene que ser una entrada validada del diccionario, escrita igual`);
      });
  }

  const canta = c.canta as Record<string, unknown> | undefined;
  if (
    !canta ||
    typeof canta.desde !== 'number' ||
    typeof canta.hasta !== 'number' ||
    canta.desde < 0 ||
    canta.hasta < canta.desde ||
    canta.hasta >= letra.length
  ) {
    e('`canta` tiene que ir de un verso a otro de la letra');
  }
  return errores;
}

// -------------------------------------------------------------- desbloqueo

const ORDEN: Record<NivelMinijuego, number> = { inicial: 0, intermedio: 1, avanzado: 2 };

/**
 * Qué canciones están abiertas. La dificultad va con el nivel del estudiante:
 * se abren las canciones de su nivel (el que le dan sus lecciones, `nivel`) y
 * las de abajo. Además, completar una canción de un nivel abre las del
 * siguiente. Las del inicial están siempre abiertas.
 */
export function cancionesAbiertas(
  catalogo: readonly Cancion[],
  completas: readonly string[],
  nivel: NivelMinijuego | null = null,
): Set<string> {
  const tope = nivel ? ORDEN[nivel] : 0;
  const hechas = new Set(completas);
  const completoNivel = (n: number) => catalogo.some((c) => ORDEN[c.nivel] === n && hechas.has(c.id));
  const hayNivel = (n: number) => catalogo.some((c) => ORDEN[c.nivel] === n);
  const abiertas = new Set<string>();
  for (const c of catalogo) {
    const n = ORDEN[c.nivel];
    let ok = true;
    for (let previo = 0; previo < n; previo++) if (hayNivel(previo) && !completoNivel(previo)) ok = false;
    if (ok || n <= tope) abiertas.add(c.id);
  }
  return abiertas;
}

// ------------------------------------------------------------ la letra

/** Para cada verso: el índice de la primera vez que sonó igual, o -1 si es nuevo. */
export function repeticiones(letra: readonly Verso[]): number[] {
  const vistos = new Map<string, number>();
  return letra.map((v, i) => {
    const k = normalizar(v.texto);
    const antes = vistos.get(k);
    if (antes === undefined) {
      vistos.set(k, i);
      return -1;
    }
    return antes;
  });
}

export type MarcaRepeticion = 'coro' | 'repite' | null;

/**
 * Dónde mostrar «↻ Se repite» o «Repite el coro»: antes de cada tramo de
 * versos que ya sonaron. Un verso repetido dentro de un tramo repetido no
 * lleva otra marca: así se ve la forma de la canción, no un error de copia.
 */
export function marcasDeRepeticion(letra: readonly Verso[], coro: readonly number[] = []): MarcaRepeticion[] {
  const rep = repeticiones(letra);
  const deCoro = new Set(coro);
  return rep.map((r, i) => {
    if (r < 0) return null;
    if (i > 0 && (rep[i - 1] as number) >= 0) return null;
    return deCoro.has(r) ? 'coro' : 'repite';
  });
}

/** Las palabras de un verso tal como se ven (con sus signos), para cantarlas de a una. */
export function palabrasDelVerso(texto: string): string[] {
  return texto.trim().split(/\s+/).filter(Boolean);
}

/**
 * Qué palabra del verso se está cantando en el segundo `t`: el tiempo del
 * verso se reparte entre sus palabras según lo que dura decirlas (las largas
 * llevan más). -1 antes de que empiece; la última, después de que termina.
 */
export function palabraEn(v: Verso, t: number): number {
  const palabras = palabrasDelVerso(v.texto);
  if (palabras.length === 0 || t < v.inicio) return -1;
  // Si se sabe cuándo empieza cada palabra, eso manda.
  if (v.tiempos && v.tiempos.length === palabras.length) {
    let k = 0;
    while (k + 1 < v.tiempos.length && t >= (v.tiempos[k + 1] as number)) k++;
    return k;
  }
  // Cada palabra pesa sus letras y un poco más (el respiro entre palabras).
  const pesos = palabras.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2);
  const total = pesos.reduce((a, b) => a + b, 0);
  const avance = ((t - v.inicio) / Math.max(0.001, v.fin - v.inicio)) * total;
  let suma = 0;
  for (let i = 0; i < pesos.length; i++) {
    suma += pesos[i] as number;
    if (avance < suma) return i;
  }
  return palabras.length - 1;
}

/** El verso que suena en el segundo `t`, o -1. */
export function versoEn(letra: readonly Verso[], t: number): number {
  return letra.findIndex((v) => t >= v.inicio && t < v.fin);
}

// ------------------------------------------------------------- la lección

/** Las cuatro actividades de cada frase, en orden. */
export const ACTIVIDADES = ['completar', 'usa', 'ordenar', 'escucha'] as const;
export type Actividad = (typeof ACTIVIDADES)[number];

export interface Eleccion {
  /** La oración con «___» donde va la palabra, cuando corresponde. */
  conHueco?: string;
  opciones: string[];
  correcta: number;
}

export interface LeccionArmada {
  leccion: Leccion;
  verso: Verso;
  completar: Eleccion;
  usa: Eleccion;
  ordenar: { fichas: string[]; solucion: string[] };
  escucha: Eleccion & { frase: string };
}

/** Tapa la palabra en la oración, respetando los signos de alrededor. */
export function taparEnVerso(linea: string, oculta: string): string {
  const objetivo = normalizar(oculta);
  let hecho = false;
  return linea
    .split(/(\s+)/)
    .map((w) => {
      if (hecho || /^\s+$/.test(w)) return w;
      const m = /^([¿¡«"'(]*)(.*?)([»"'),.;:!?]*)$/.exec(w);
      if (m && normalizar(m[2] ?? '') === objetivo) {
        hecho = true;
        return `${m[1]}___${m[3]}`;
      }
      return w;
    })
    .join('');
}

/** La palabra tal como aparece en la oración (con su mayúscula), o la dada si no está. */
function comoAparece(linea: string, palabra: string): string {
  const w = linea.split(/\s+/).find((x) => normalizar(x.replace(/^[¿¡«"'(]+|[»"'),.;:!?]+$/g, '')) === normalizar(palabra));
  return w ? w.replace(/^[¿¡«"'(]+|[»"'),.;:!?]+$/g, '') : palabra;
}

/**
 * Las fichas de «Ordena la frase»: las palabras sin el punto final y con la
 * primera en minúscula (salvo «I»), para que la mayúscula no diga cuál va primero.
 */
export function fichasDe(frase: string): string[] {
  const palabras = frase
    .trim()
    .replace(/[.!?]+$/, '')
    .split(/\s+/)
    .filter(Boolean);
  return palabras.map((w, i) => (i === 0 && w !== 'I' && !w.startsWith("I'") ? w.charAt(0).toLocaleLowerCase('en') + w.slice(1) : w));
}

/** Si las fichas quedaron en el orden de la oración. */
export function ordenCorrecto(elegidas: readonly string[], solucion: readonly string[]): boolean {
  return elegidas.length === solucion.length && elegidas.every((w, i) => normalizar(w) === normalizar(solucion[i] as string));
}

/** Arma una oración con las fichas: mayúscula al principio y punto al final. */
export function armarOracion(fichas: readonly string[]): string {
  if (fichas.length === 0) return '';
  const t = fichas.join(' ');
  return `${t.charAt(0).toLocaleUpperCase('en')}${t.slice(1)}.`;
}

function eleccion(opciones: readonly string[], correcta: string, rng: Rng): { opciones: string[]; correcta: number } {
  const mezcladas = shuffle(opciones, rng);
  return { opciones: mezcladas, correcta: mezcladas.findIndex((o) => normalizar(o) === normalizar(correcta)) };
}

/** Las cuatro actividades de una frase, con las opciones mezcladas. */
export function armarLeccion(c: Cancion, l: Leccion, rng: Rng): LeccionArmada {
  const verso = c.letra[l.verso] as Verso;
  const en = verso.en as string;

  const oculta = comoAparece(en, l.completar.oculta);
  const completar = { conHueco: taparEnVerso(en, l.completar.oculta), ...eleccion(l.completar.opciones, oculta, rng) };

  const palabra = comoAparece(l.palabra.ejemplo, l.palabra.en);
  const usa = { conHueco: taparEnVerso(l.palabra.ejemplo, l.palabra.en), ...eleccion(l.palabra.opciones, palabra, rng) };

  const solucion = fichasDe(l.ordenar);
  let fichas = shuffle(solucion, rng);
  // Que no salgan ya ordenadas (con 3 fichas puede pasar).
  for (let i = 0; i < 6 && ordenCorrecto(fichas, solucion); i++) fichas = shuffle(solucion, rng);
  if (ordenCorrecto(fichas, solucion)) fichas = [...solucion.slice(1), solucion[0] as string];

  const escucha = { frase: en, ...eleccion([en, ...l.escucha.slice(0, 3)], en, rng) };
  return { leccion: l, verso, completar, usa, ordenar: { fichas, solucion }, escucha };
}

// ------------------------------------------------------------------ flores

/** Cada cuántas respuestas buenas florece una sacuanjoche. */
export const ACIERTOS_POR_FLOR = 3;
/** La racha que da una flor más. */
export const RACHA_CANCION = 6;
export const MAX_FLORES_CANCION = 5;

/**
 * Sacuanjoches de una canción: una cada 3 respuestas buenas (al primer
 * intento) y una más con una racha de 6, hasta 5. Hace falta al menos la
 * mitad bien: por debajo, repasar, sin flores, y la canción no cuenta como
 * completada. Con las respuestas que van hasta ahora da las que ya se
 * ganaron, así se ven crecer mientras se juega.
 */
export function sacuanjochesPorCancion(correctas: number, total: number, mejorRacha: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const bien = Math.max(0, Math.min(correctas, total));
  if (bien * 2 < total) return 0;
  let n = Math.floor(bien / ACIERTOS_POR_FLOR);
  if (mejorRacha >= RACHA_CANCION) n += 1;
  return Math.min(n, MAX_FLORES_CANCION);
}
