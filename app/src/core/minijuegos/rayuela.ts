/**
 * La Rayuela de Piko: las preguntas de cada salto.
 *
 * El vocabulario, los niveles, la voz y el día son los de todos los
 * minijuegos (`vocabulario.ts`); acá sólo está lo propio de la rayuela.
 *
 * Puro y sin React, para poder probarlo en Node.
 */

import type { Rng } from '../ids';
import { DESDE_POR_DEFECTO, type LangCode, type Pack } from '../content/schema';
import type { StudentState } from '../progress/projection';
import {
  elegirObjetivos,
  LENGUAS_MINIJUEGOS,
  NIVELES_MINIJUEGOS,
  nivelesDe as nivelesDeMinijuego,
  opcionesPara,
  palabrasDeNivel,
  type EstadoNivel,
  type LenguaMinijuego,
  type NivelMinijuego,
  type Palabra,
} from './vocabulario';

export {
  diaLocal,
  nivelSugerido,
  paquetesEstudiados,
  REQUISITOS,
  vocabularioAprendido,
  vozDe,
  vozDePalabra,
  type EstadoNivel,
  type Palabra,
  type Voz,
} from './vocabulario';

/** Saltos de una partida: de la casilla 1 al cielo. */
export const SALTOS = 6;

export const ID_RAYUELA = 'rayuela';

export const LENGUAS_RAYUELA = LENGUAS_MINIJUEGOS;
export type LenguaRayuela = LenguaMinijuego;

export const NIVELES_RAYUELA = NIVELES_MINIJUEGOS;
export type NivelRayuela = NivelMinijuego;

/** Casillas con respuestas por salto. Más nivel, más casillas. */
export const CASILLAS: Record<NivelRayuela, number> = { inicial: 3, intermedio: 4, avanzado: 5 };

/** Qué niveles de rayuela puede jugar en `lang`, según sus lecciones. */
export function nivelesDe(
  packs: readonly Pack[],
  state: StudentState,
  lang: LangCode,
  desde: LangCode = DESDE_POR_DEFECTO,
): EstadoNivel[] {
  return nivelesDeMinijuego(packs, state, lang, CASILLAS, desde);
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
  const pool = palabrasDeNivel(vocab, nivel);
  const preguntas: Pregunta[] = [];

  elegirObjetivos(pool, SALTOS, state, rng).forEach((palabra, i) => {
    const tipo = TIPOS[nivel][i % TIPOS[nivel].length] as TipoPregunta;
    const enMeta = tipo === 'inverso';
    const armadas = opcionesPara(palabra, pool, vocab, enMeta, CASILLAS[nivel], rng);
    if (!armadas) return;
    preguntas.push({
      tipo,
      palabra,
      foco: tipo === 'inverso' ? palabra.es : palabra.meta,
      opciones: armadas.opciones,
      correcta: armadas.correcta,
      opcionesEnMeta: enMeta,
    });
  });
  return preguntas.length === SALTOS ? preguntas : [];
}
