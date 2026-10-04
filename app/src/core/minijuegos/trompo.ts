/**
 * El Trompo de Piko: los retos y la fuerza del trompo.
 *
 * Se lanza el trompo y, mientras gira, van saliendo retos. Cada acierto le da
 * fuerza (gira más rápido y más derecho); cada fallo o cada reto que se pasa
 * de tiempo se la quita (se tambalea y frena). Con `META` aciertos se gana la
 * partida; si se queda sin fuerza, el trompo cae.
 *
 * Sin físicas: la fuerza es un número de 0 a 100, y la pantalla la traduce en
 * velocidad y bamboleo. Puro y sin React, para poder probarlo en Node.
 */

import type { Rng } from '../ids';
import type { StudentState } from '../progress/projection';
import { SACUANJOCHES_BASE } from '../progress/arbol';
import {
  elegirObjetivos,
  opcionesPara,
  palabrasDeNivel,
  type NivelMinijuego,
  type Palabra,
} from './vocabulario';

export const ID_TROMPO = 'trompo';

/** Respuestas por reto. */
export const OPCIONES: Record<NivelMinijuego, number> = { inicial: 3, intermedio: 4, avanzado: 4 };

/** Segundos para responder cada reto. Más nivel, menos tiempo. */
export const SEGUNDOS: Record<NivelMinijuego, number> = { inicial: 12, intermedio: 9, avanzado: 7 };

/** Aciertos que completan la partida. */
export const META = 6;
/** Retos que trae una partida. Con la fuerza que quitan los fallos, nunca hacen falta todos. */
export const MAX_RETOS = 12;

export const FUERZA_INICIAL = 70;
export const FUERZA_MAXIMA = 100;
/** Lo que da un acierto y lo que quita un fallo (o un reto que se pasó de tiempo). */
export const FUERZA_ACIERTO = 10;
export const FUERZA_FALLO = 25;

export const RACHA = 3;
export const GRAN_RACHA = 5;

/** Puntos por acierto, más un extra por racha con techo, como el XP. */
export const PUNTOS_ACIERTO = 10;

// --------------------------------------------------------------------- retos

/**
 * - `traduccion`: se muestra en español; se elige en la lengua meta.
 * - `significado`: se muestra en la lengua meta; se elige en español.
 * - `imagen`: se muestra un dibujo; se elige en la lengua meta.
 * - `audio`: Piko la dice sin mostrarla. En los primeros niveles se elige la
 *   palabra que se escuchó; en el avanzado, qué significa la frase.
 */
export type TipoReto = 'traduccion' | 'significado' | 'imagen' | 'audio';

export interface Reto {
  tipo: TipoReto;
  palabra: Palabra;
  /** Lo que se muestra: en español, en la lengua meta, o la palabra del dibujo. */
  foco: string;
  opciones: string[];
  correcta: number;
  /** Si las opciones están en la lengua meta. */
  opcionesEnMeta: boolean;
}

const TIPOS: Record<NivelMinijuego, readonly TipoReto[]> = {
  inicial: ['significado', 'imagen', 'traduccion', 'imagen'],
  intermedio: ['traduccion', 'significado', 'audio'],
  avanzado: ['audio', 'traduccion', 'audio', 'significado'],
};

function opcionesEnMeta(tipo: TipoReto, nivel: NivelMinijuego): boolean {
  if (tipo === 'significado') return false;
  if (tipo === 'audio') return nivel !== 'avanzado';
  return true;
}

/**
 * Los retos de una partida, del vocabulario aprendido. `conDibujo` dice qué
 * palabras (en español) tienen dibujo: las que no, salen como traducción.
 * Vacío si el nivel no tiene con qué llenarse.
 */
export function armarRetos(
  vocab: readonly Palabra[],
  nivel: NivelMinijuego,
  state: StudentState,
  rng: Rng,
  conDibujo: (es: string) => boolean = () => false,
): Reto[] {
  const pool = palabrasDeNivel(vocab, nivel);
  const retos: Reto[] = [];
  elegirObjetivos(pool, MAX_RETOS, state, rng).forEach((palabra, i) => {
    let tipo = TIPOS[nivel][i % TIPOS[nivel].length] as TipoReto;
    if (tipo === 'imagen' && !conDibujo(palabra.es)) tipo = 'traduccion';
    const enMeta = opcionesEnMeta(tipo, nivel);
    const armadas = opcionesPara(palabra, pool, vocab, enMeta, OPCIONES[nivel], rng);
    if (!armadas) return;
    retos.push({
      tipo,
      palabra,
      foco: tipo === 'significado' || tipo === 'audio' ? palabra.meta : palabra.es,
      opciones: armadas.opciones,
      correcta: armadas.correcta,
      opcionesEnMeta: enMeta,
    });
  });
  return retos.length === MAX_RETOS ? retos : [];
}

// ------------------------------------------------------------------- partida

export type FinTrompo = 'completado' | 'caido' | 'sin_retos';

export interface EstadoTrompo {
  /** De 0 a 100: qué tan rápido y derecho gira. */
  fuerza: number;
  aciertos: number;
  respondidas: number;
  racha: number;
  mejorRacha: number;
  puntos: number;
  /** El reto que toca. */
  reto: number;
  fin: FinTrompo | null;
}

export function partidaNueva(): EstadoTrompo {
  return { fuerza: FUERZA_INICIAL, aciertos: 0, respondidas: 0, racha: 0, mejorRacha: 0, puntos: 0, reto: 0, fin: null };
}

/** Aplica una respuesta: un acierto, o un fallo (también cuando se acaba el tiempo). */
export function responder(e: EstadoTrompo, acerto: boolean): EstadoTrompo {
  if (e.fin) return e;
  const racha = acerto ? e.racha + 1 : 0;
  const n: EstadoTrompo = {
    fuerza: acerto ? Math.min(FUERZA_MAXIMA, e.fuerza + FUERZA_ACIERTO) : Math.max(0, e.fuerza - FUERZA_FALLO),
    aciertos: e.aciertos + (acerto ? 1 : 0),
    respondidas: e.respondidas + 1,
    racha,
    mejorRacha: Math.max(e.mejorRacha, racha),
    puntos: e.puntos + (acerto ? PUNTOS_ACIERTO + 2 * Math.min(racha - 1, 5) : 0),
    reto: e.reto + 1,
    fin: null,
  };
  if (n.aciertos >= META) n.fin = 'completado';
  else if (n.fuerza <= 0) n.fin = 'caido';
  else if (n.reto >= MAX_RETOS) n.fin = 'sin_retos';
  return n;
}

/** Si esta respuesta llegó a una racha que se festeja. */
export function rachaFestejada(racha: number): 'racha' | 'gran' | null {
  if (racha === GRAN_RACHA) return 'gran';
  if (racha === RACHA) return 'racha';
  return null;
}

// ------------------------------------------------------------------- flores

/** Precisión que da una flor más: casi sin fallos. */
export const PRECISION_EXTRA = 0.8;

/**
 * Sacuanjoches de una partida de trompo. Sólo si se completó (el trompo
 * siguió girando hasta `META` aciertos): 3, una más si casi no hubo fallos y
 * otra si hubo una gran racha. Entre 3 y 5, como una lección.
 */
export function sacuanjochesPorTrompo(aciertos: number, respondidas: number, mejorRacha: number): number {
  if (!Number.isFinite(respondidas) || respondidas <= 0 || aciertos < META) return 0;
  let n = SACUANJOCHES_BASE;
  if (aciertos / respondidas >= PRECISION_EXTRA) n += 1;
  if (mejorRacha >= GRAN_RACHA) n += 1;
  return n;
}
