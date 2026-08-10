/**
 * Lo que dice Piko.
 *
 * Regla de tono: cuando el estudiante se equivoca, Piko **nunca** señala el
 * error ni usa "mal", "incorrecto" ni "no". Reconoce el intento y muestra la
 * respuesta. El niño que está aprendiendo la lengua de su comunidad no
 * necesita que una app le diga que la habla mal.
 */

import type { Rng } from '../../core/ids';

export const ACIERTO: readonly string[] = [
  '¡Esa es!',
  '¡Bien ahí!',
  '¡Correcto!',
  '¡Muy bien!',
  '¡Le atinaste!',
  '¡Así se hace!',
];

export const RACHA: readonly string[] = [
  '¡Vas volando!',
  '¡Qué racha!',
  '¡No te para nadie!',
  '¡Seguidas!',
];

/** Para cuando se equivoca. Sin "no", sin "mal", sin aspas rojas. */
export const INTENTO: readonly string[] = [
  'Casi. Mirá cómo es:',
  'Buen intento. Es así:',
  'Ya casi. Se dice:',
  'Tranquilo, mirá:',
  'La próxima sale. Es:',
];

export const BIENVENIDA: readonly string[] = [
  '¡Hola! Soy Piko.',
  '¿Jugamos un rato?',
  '¡Qué bueno verte!',
];

export const FIN_BIEN: readonly string[] = [
  '¡Terminaste! Estuviste muy bien.',
  '¡Qué ronda! Seguí así.',
  '¡Excelente trabajo!',
];

export const FIN_NORMAL: readonly string[] = [
  '¡Terminamos! Cada vez sale mejor.',
  'Buen trabajo. Practicando se aprende.',
  '¡Listo! Lo importante es seguir.',
];

export const ESPERANDO: readonly string[] = [
  'Esperando a la clase…',
  'Ya casi empezamos.',
  'El maestro está preparando la ronda.',
];

export function elegir(frases: readonly string[], rng: Rng = Math.random): string {
  return frases[Math.floor(rng() * frases.length)] ?? frases[0] ?? '';
}
