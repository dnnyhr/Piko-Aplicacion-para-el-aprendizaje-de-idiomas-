/**
 * La voz de los minijuegos: la misma síntesis del sistema (`expo-speech`)
 * que usan los ejercicios de escucha, con la misma velocidad.
 *
 * Las palabras suenan en su lengua (inglés americano; el miskito con la voz
 * en español y el texto preparado). Las frases de Piko, con la voz en
 * español: si la app está en miskito, preparadas igual que una palabra.
 */

import * as Speech from 'expo-speech';
import { paraVozEspanola } from '../../core/content/voz';
import type { Voz } from '../../core/minijuegos/rayuela';
import type { IdiomaApp } from '../../ui/textos/traducir';

const VELOCIDAD = 0.85;

/** Cada `decir` nuevo invalida los avisos del anterior, que `stop` corta. */
let turno = 0;

/** Dice las voces una detrás de otra. `alTerminar` llega cuando calla. */
export function decir(voces: readonly Voz[], alTerminar?: () => void): void {
  const mio = ++turno;
  Speech.stop();
  const cola = voces.filter((v) => v.texto.trim().length > 0);
  const fin = () => {
    if (mio === turno) alTerminar?.();
  };
  const siguiente = (i: number) => {
    if (mio !== turno) return;
    const v = cola[i];
    if (!v) return fin();
    Speech.speak(v.texto, {
      language: v.lang,
      rate: VELOCIDAD,
      onDone: () => siguiente(i + 1),
      onError: () => siguiente(i + 1),
      onStopped: fin,
    });
  };
  siguiente(0);
}

export function callar(): void {
  turno++;
  Speech.stop();
}

/** Lo que dice Piko, en la lengua de la app. */
export function vozDePiko(frase: string, idioma: IdiomaApp): Voz {
  return idioma === 'miq' ? { texto: paraVozEspanola(frase), lang: 'es-US' } : { texto: frase, lang: 'es-US' };
}
