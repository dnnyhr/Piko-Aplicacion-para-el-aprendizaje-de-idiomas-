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

/** Lo mínimo que hay que estirar el tiro para lanzarlo, en puntos. Menos es un toque: no sale. */
export const ARRASTRE_MINIMO = 24;
/** Hasta dónde se estira el tiro: más allá, la chibola se queda en el borde. */
export const ARRASTRE_MAXIMO = 90;

export interface Arrastre {
  /** Hacia dónde sale el tiro, en grados (0 = derecho arriba). Sale para el lado contrario al arrastre. */
  angulo: number;
  /** Dónde se ve la chibola estirada, relativa a su lugar: el arrastre, recortado al máximo. */
  x: number;
  y: number;
  /** Qué tan estirado, de 0 a 1. */
  fuerza: number;
  /** Si alcanza para lanzar. */
  lanza: boolean;
}

/** Lo que dice un arrastre del dedo (`dx`, `dy` desde donde se agarró el tiro). */
export function leerArrastre(dx: number, dy: number): Arrastre {
  const largo = Math.hypot(dx, dy);
  const k = largo > ARRASTRE_MAXIMO ? ARRASTRE_MAXIMO / largo : 1;
  return {
    angulo: largo === 0 ? 0 : (Math.atan2(-dx, dy) * 180) / Math.PI,
    x: dx * k,
    y: dy * k,
    fuerza: Math.min(1, largo / ARRASTRE_MAXIMO),
    lanza: largo >= ARRASTRE_MINIMO,
  };
}

interface Punto {
  x: number;
  y: number;
}

/**
 * Dónde se detiene el tiro al pegarle a una chibola: justo al tocarla, del
 * lado de donde viene, sin atravesarla. `contacto` es la suma de los dos radios.
 */
export function puntoDeImpacto(desde: Punto, blanco: Punto, contacto: number): Punto {
  const dx = blanco.x - desde.x;
  const dy = blanco.y - desde.y;
  const largo = Math.hypot(dx, dy);
  if (largo <= contacto) return { x: desde.x, y: desde.y };
  return { x: blanco.x - (dx / largo) * contacto, y: blanco.y - (dy / largo) * contacto };
}
