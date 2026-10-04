/**
 * La Música de Piko: el formato de una canción y lo que se arma con ella.
 *
 * Una canción entra a la app sólo con su permiso: quién la canta o la
 * compuso, quién autoriza que Piko la use y cómo lo autorizó. Igual que el
 * diccionario, la letra se guarda tal como se canta y las traducciones son
 * las que validó una persona competente: Piko no traduce ni inventa nada.
 *
 * Puro y sin React, para poder probarlo en Node.
 */

import type { Rng } from '../ids';
import { shuffle } from '../ids';
import { normalizar } from '../content/verificar';
import type { NivelMinijuego } from '../minijuegos/vocabulario';
import { SACUANJOCHES_BASE } from '../progress/arbol';

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

/** Un verso: como se canta, con su traducción validada y cuándo suena. */
export interface Verso {
  /** Tal como se canta, en la lengua de la canción. */
  texto: string;
  /** Traducción validada al español. Obligatoria si la canción no está en español. */
  es?: string;
  /** Traducción validada al inglés, si la hay. */
  en?: string;
  /** Segundo de la grabación en que empieza y termina. */
  inicio: number;
  fin: number;
}

/** Una palabra clave: en la lengua de la canción, en español y en inglés. */
export interface PalabraClave {
  texto: string;
  es: string;
  en: string;
  /**
   * El id de la entrada del diccionario de Piko que la respalda, cuando la
   * canción está en una lengua que tiene diccionario (miskito). Así no entra
   * ninguna palabra sin validar.
   */
  lexico?: string;
  /** Dónde se escucha en la grabación, si se puede recortar. */
  inicio?: number;
  fin?: number;
}

/** Un hueco para «Completa la canción»: un verso con una palabra tapada. */
export interface Hueco {
  /** Índice del verso en `letra`. */
  verso: number;
  /** En cuál de las versiones del verso va el hueco. */
  en: 'texto' | 'es' | 'en';
  /** La palabra tapada, tal como aparece en esa versión. */
  oculta: string;
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
  fuente: FuenteCancion;
  /** «Conoce nuestra canción». */
  conoce: { origen: string; lengua: string; region: string; representa: string };
  letra: Verso[];
  /** Entre 3 y 5. */
  palabras: PalabraClave[];
  completar: Hueco[];
  /** «Canta con Piko»: los versos de `desde` a `hasta`, incluidos. */
  canta: { desde: number; hasta: number };
}

// --------------------------------------------------------------- validación

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const esSegundo = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * Lo que una canción tiene que cumplir para entrar a la app. `lexico` es el
 * diccionario de la lengua de la canción (ids que se pueden usar), si existe.
 * Devuelve la lista de errores; vacía si está bien.
 */
export function validarCancion(raw: unknown, lexico?: ReadonlySet<string>): string[] {
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
    if (!esSegundo(v.inicio) || !esSegundo(v.fin) || (v.fin as number) <= (v.inicio as number)) {
      e(`verso ${i}: \`inicio\` y \`fin\` tienen que ser segundos, con fin después de inicio`);
    }
  });

  const palabras = Array.isArray(c.palabras) ? (c.palabras as Record<string, unknown>[]) : [];
  if (palabras.length < 3 || palabras.length > 5) e('van entre 3 y 5 `palabras` clave');
  palabras.forEach((p, i) => {
    for (const x of ['texto', 'es', 'en'] as const) if (!esTexto(p[x])) e(`palabra ${i}: falta \`${x}\``);
    if (lexico && !(esTexto(p.lexico) && lexico.has(p.lexico))) {
      e(`palabra ${i} («${String(p.texto)}»): \`lexico\` tiene que ser una entrada validada del diccionario`);
    }
    if ((p.inicio !== undefined || p.fin !== undefined) && !(esSegundo(p.inicio) && esSegundo(p.fin) && p.fin > p.inicio)) {
      e(`palabra ${i}: \`inicio\` y \`fin\` mal puestos`);
    }
  });
  if (new Set(palabras.map((p) => normalizar(String(p.texto ?? '')))).size !== palabras.length) e('hay palabras clave repetidas');

  const huecos = Array.isArray(c.completar) ? (c.completar as Record<string, unknown>[]) : [];
  if (huecos.length === 0) e('falta al menos un hueco en `completar`');
  huecos.forEach((h, i) => {
    const v = typeof h.verso === 'number' ? letra[h.verso] : undefined;
    if (!v) return e(`hueco ${i}: \`verso\` no existe`);
    if (h.en !== 'texto' && h.en !== 'es' && h.en !== 'en') return e(`hueco ${i}: \`en\` tiene que ser texto, es o en`);
    const linea = v[h.en];
    if (!esTexto(linea) || !esTexto(h.oculta) || !palabrasDe(linea).includes(normalizar(h.oculta))) {
      e(`hueco ${i}: «${String(h.oculta)}» no está en ese verso`);
    }
  });

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

/** Las palabras de un verso, sin signos, para buscar la tapada. */
function palabrasDe(linea: string): string[] {
  return linea
    .split(/\s+/)
    .map((w) => normalizar(w.replace(/^[¿¡«"'(]+|[»"'),.;:!?]+$/g, '')))
    .filter(Boolean);
}

// -------------------------------------------------------------- desbloqueo

const ORDEN: Record<NivelMinijuego, number> = { inicial: 0, intermedio: 1, avanzado: 2 };

/**
 * Qué canciones están abiertas: las del nivel inicial siempre; las de un
 * nivel, cuando ya completó alguna del nivel anterior (o si no hay ninguna
 * de ese nivel para completar).
 */
export function cancionesAbiertas(catalogo: readonly Cancion[], completas: readonly string[]): Set<string> {
  const hechas = new Set(completas);
  const completoNivel = (n: number) => catalogo.some((c) => ORDEN[c.nivel] === n && hechas.has(c.id));
  const hayNivel = (n: number) => catalogo.some((c) => ORDEN[c.nivel] === n);
  const abiertas = new Set<string>();
  for (const c of catalogo) {
    const n = ORDEN[c.nivel];
    let ok = true;
    for (let previo = 0; previo < n; previo++) if (hayNivel(previo) && !completoNivel(previo)) ok = false;
    if (ok) abiertas.add(c.id);
  }
  return abiertas;
}

// ------------------------------------------------------------- actividades

/** Opciones por pregunta, por nivel de la canción. */
export const OPCIONES_CANCION: Record<NivelMinijuego, number> = { inicial: 3, intermedio: 4, avanzado: 4 };

export interface PreguntaCompletar {
  hueco: Hueco;
  /** El verso con «___» en lugar de la palabra. */
  conHueco: string;
  opciones: string[];
  correcta: number;
}

/** Tapa la palabra en el verso, respetando los signos de alrededor. */
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

/** El texto de una palabra clave en la versión del verso (`texto`, `es` o `en`). */
function enVersion(p: PalabraClave, version: Hueco['en']): string {
  return version === 'texto' ? p.texto : version === 'es' ? p.es : p.en;
}

/**
 * «Completa la canción»: un hueco por pregunta; las otras opciones son las
 * demás palabras clave de la canción, en la misma versión del verso.
 */
export function armarCompletar(c: Cancion, rng: Rng): PreguntaCompletar[] {
  const n = OPCIONES_CANCION[c.nivel];
  return c.completar.map((h) => {
    const verso = c.letra[h.verso] as Verso;
    const linea = verso[h.en] ?? verso.texto;
    const otras = c.palabras
      .map((p) => enVersion(p, h.en))
      .filter((t, i, todas) => normalizar(t) !== normalizar(h.oculta) && todas.findIndex((x) => normalizar(x) === normalizar(t)) === i);
    const opciones = shuffle([h.oculta, ...shuffle(otras, rng).slice(0, n - 1)], rng);
    return { hueco: h, conHueco: taparEnVerso(linea, h.oculta), opciones, correcta: opciones.indexOf(h.oculta) };
  });
}

export interface PreguntaEscucha {
  /** Lo que suena: una palabra clave o, en el avanzado, un verso. */
  palabra?: PalabraClave;
  verso?: Verso;
  opciones: string[];
  correcta: number;
}

/**
 * «Escucha y reconoce»: suena una palabra clave (o un verso, en el
 * avanzado) y se elige cuál fue, entre las de la canción.
 */
export function armarEscucha(c: Cancion, rng: Rng): PreguntaEscucha[] {
  const n = OPCIONES_CANCION[c.nivel];
  if (c.nivel === 'avanzado' && c.letra.length >= 2) {
    const versos = shuffle(c.letra, rng).slice(0, Math.min(3, c.letra.length));
    return versos.map((v) => {
      const otros = shuffle(c.letra.filter((x) => x !== v), rng).slice(0, n - 1).map((x) => x.texto);
      const opciones = shuffle([v.texto, ...otros], rng);
      return { verso: v, opciones, correcta: opciones.indexOf(v.texto) };
    });
  }
  return shuffle(c.palabras, rng)
    .slice(0, 3)
    .map((p) => {
      const otras = shuffle(c.palabras.filter((x) => x !== p), rng).slice(0, n - 1).map((x) => x.texto);
      const opciones = shuffle([p.texto, ...otras], rng);
      return { palabra: p, opciones, correcta: opciones.indexOf(p.texto) };
    });
}

// ------------------------------------------------------------------ flores

export const RACHA_CANCION = 3;

/**
 * Sacuanjoches de una canción: completarla da 3 si al menos la mitad de las
 * respuestas fue buena; una más con 80 % y otra con una racha de 3. Entre 3 y
 * 5, como una lección. Por debajo de la mitad, repasar: sin flores y la
 * canción no cuenta como completada.
 */
export function sacuanjochesPorCancion(correctas: number, total: number, mejorRacha: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const bien = Math.max(0, Math.min(correctas, total));
  if (bien * 2 < total) return 0;
  let n = SACUANJOCHES_BASE;
  if (bien / total >= 0.8) n += 1;
  if (mejorRacha >= RACHA_CANCION) n += 1;
  return n;
}
