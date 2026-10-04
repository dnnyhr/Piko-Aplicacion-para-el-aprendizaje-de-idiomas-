/**
 * Bolas chinas: las chibolas de siempre, para practicar vocabulario.
 *
 * En la rueda dibujada en la tierra hay una chibola por respuesta. Se apunta
 * y se lanza el tiro: si pega en la correcta, esa chibola cae en el hoyito;
 * si pega en otra, el tiro rebota, Piko da una pista y se vuelve a tirar. Lo
 * que cuenta para las flores es el primer tiro de cada pregunta, con la
 * regla común de los minijuegos (`sacuanjochesPorMinijuego`).
 *
 * Puro y sin React, para poder probarlo en Node.
 */

import type { Rng } from '../ids';
import type { StudentState } from '../progress/projection';
import { armarRetos, type FormaDeRetos, type Reto } from './retos';
import type { NivelMinijuego, Palabra } from './vocabulario';

export const ID_CHIBOLAS = 'chibolas';

/** Preguntas por partida. */
export const TIROS = 6;

/** Chibolas en la rueda, una por respuesta. */
export const CHIBOLAS: Record<NivelMinijuego, number> = { inicial: 3, intermedio: 4, avanzado: 4 };

const FORMA: FormaDeRetos = {
  cantidad: TIROS,
  opciones: CHIBOLAS,
  tipos: {
    inicial: ['imagen', 'traduccion', 'imagen', 'significado'],
    intermedio: ['traduccion', 'significado', 'audio', 'traduccion'],
    avanzado: ['audio', 'traduccion', 'audio', 'significado'],
  },
};

/** Las preguntas de una partida. Vacío si el nivel no tiene con qué llenarse. */
export function armarPartida(
  vocab: readonly Palabra[],
  nivel: NivelMinijuego,
  state: StudentState,
  rng: Rng,
  conDibujo: (es: string) => boolean = () => false,
): Reto[] {
  return armarRetos(vocab, nivel, state, rng, FORMA, conDibujo);
}

// -------------------------------------------------------------------- tiro

/** Hacia dónde está cada chibola desde el tiro, en grados (0 = derecho arriba). */
export interface Blanco {
  angulo: number;
}

/**
 * A qué chibola le pega un tiro lanzado en `angulo`: la más cercana a esa
 * dirección. Generoso a propósito: el chiste es responder, no la puntería, y
 * un tiro siempre pega en alguna (si no, no habría respuesta).
 */
export function chibolaAlcanzada(angulo: number, blancos: readonly Blanco[]): number {
  let mejor = 0;
  let menor = Infinity;
  blancos.forEach((b, i) => {
    let d = Math.abs(angulo - b.angulo) % 360;
    if (d > 180) d = 360 - d;
    if (d < menor) {
      menor = d;
      mejor = i;
    }
  });
  return mejor;
}
