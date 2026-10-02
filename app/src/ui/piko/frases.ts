/**
 * Lo que dice Piko.
 *
 * Las frases están en el catálogo de textos (`src/ui/textos/es.ts`, claves
 * `piko.*`), para que se puedan traducir. Regla de tono: cuando el estudiante
 * se equivoca, Piko **nunca** señala el error ni usa "mal", "incorrecto" ni
 * "no". Reconoce el intento y muestra la respuesta.
 */

import type { Rng } from '../../core/ids';

export function elegir(frases: readonly string[], rng: Rng = Math.random): string {
  return frases[Math.floor(rng() * frases.length)] ?? frases[0] ?? '';
}
