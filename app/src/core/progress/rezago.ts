/**
 * El semáforo.
 *
 * El maestro no quiere un panel analítico: quiere mirar la lista y saber
 * dónde parar. Un solo punto de color por estudiante, comparado siempre
 * contra el propio grupo — no contra una meta abstracta, porque un aula
 * rural que avanza despacio no está "en rojo", simplemente va a su ritmo.
 */

import { accuracy, type StudentState } from './projection';

export type Semaforo = 'verde' | 'ambar' | 'rojo';

/** Debajo de esta mediana de avance el grupo apenas arrancó: nadie va atrasado. */
export const MIN_MUESTRA = 3;
export const UMBRAL_AMBAR = 0.9;
export const UMBRAL_ROJO = 0.75;
/** Responder rápido y mal tampoco es ir bien. */
export const PRECISION_MINIMA = 0.5;
export const MIN_RESPUESTAS_PRECISION = 5;

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const xs = values.slice().sort((a, b) => a - b);
  const mid = xs.length >> 1;
  if (xs.length % 2 === 1) return xs[mid] as number;
  return ((xs[mid - 1] as number) + (xs[mid] as number)) / 2;
}

const PEOR: Record<Semaforo, Semaforo> = { verde: 'ambar', ambar: 'rojo', rojo: 'rojo' };

/**
 * Clasifica a un estudiante contra la mediana de aciertos del aula.
 * `medianaAvance` viene de `classroomSemaforo`; se expone aparte para poder
 * probar los umbrales sin construir un aula entera.
 */
export function classify(state: StudentState, medianaAvance: number): Semaforo {
  if (medianaAvance < MIN_MUESTRA) return 'verde';

  const ratio = state.correct / medianaAvance;
  let nivel: Semaforo = ratio >= UMBRAL_AMBAR ? 'verde' : ratio >= UMBRAL_ROJO ? 'ambar' : 'rojo';

  if (state.answered >= MIN_RESPUESTAS_PRECISION && accuracy(state) < PRECISION_MINIMA) {
    nivel = PEOR[nivel];
  }
  return nivel;
}

export interface FilaSemaforo {
  studentId: string;
  semaforo: Semaforo;
  correct: number;
  answered: number;
}

/**
 * Semáforo de toda el aula. Devuelve las filas ordenadas con los rezagados
 * arriba, que es como el maestro necesita leer la pantalla.
 */
export function classroomSemaforo(states: readonly StudentState[]): FilaSemaforo[] {
  const medianaAvance = median(states.map((s) => s.correct));
  const orden: Record<Semaforo, number> = { rojo: 0, ambar: 1, verde: 2 };

  return states
    .map((s) => ({
      studentId: s.studentId,
      semaforo: classify(s, medianaAvance),
      correct: s.correct,
      answered: s.answered,
    }))
    .sort((a, b) => {
      if (orden[a.semaforo] !== orden[b.semaforo]) return orden[a.semaforo] - orden[b.semaforo];
      if (a.correct !== b.correct) return a.correct - b.correct;
      return a.studentId < b.studentId ? -1 : a.studentId > b.studentId ? 1 : 0;
    });
}
