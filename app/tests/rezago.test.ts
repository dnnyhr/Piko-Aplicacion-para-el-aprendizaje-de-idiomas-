import { describe, expect, it } from 'vitest';
import { classify, classroomSemaforo, median } from '@core/progress/rezago';
import { emptyState, type StudentState } from '@core/progress/projection';

function alumno(studentId: string, correct: number, answered = correct): StudentState {
  return { ...emptyState(studentId), correct, answered };
}

describe('median', () => {
  it('devuelve 0 sin datos', () => {
    expect(median([])).toBe(0);
  });

  it('funciona con cantidad impar y par', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe('semáforo', () => {
  it('nadie va atrasado si el grupo apenas arrancó', () => {
    expect(classify(alumno('ana', 0), 2)).toBe('verde');
  });

  it('verde en la mediana o cerca', () => {
    expect(classify(alumno('ana', 10), 10)).toBe('verde');
    expect(classify(alumno('ana', 9), 10)).toBe('verde');
  });

  it('ámbar entre 10% y 25% por debajo', () => {
    expect(classify(alumno('ana', 8), 10)).toBe('ambar');
    expect(classify(alumno('ana', 75), 100)).toBe('ambar');
  });

  it('rojo por debajo del 75%', () => {
    expect(classify(alumno('ana', 5), 10)).toBe('rojo');
  });

  it('responder rápido y mal empeora un nivel', () => {
    // Va en la mediana de aciertos, pero fallando más de la mitad.
    const apurado = alumno('ana', 10, 30);
    expect(classify(apurado, 10)).toBe('ambar');
  });

  it('la precisión sólo cuenta con muestra suficiente', () => {
    const pocos = alumno('ana', 2, 4);
    expect(classify(pocos, 10)).toBe('rojo'); // por avance, no por precisión
  });
});

describe('aula completa', () => {
  it('pone a los rezagados arriba', () => {
    const filas = classroomSemaforo([
      alumno('ana', 12),
      alumno('beto', 4),
      alumno('carla', 10),
      alumno('dario', 8),
    ]);
    expect(filas[0]?.studentId).toBe('beto');
    expect(filas[0]?.semaforo).toBe('rojo');
    expect(filas.at(-1)?.semaforo).toBe('verde');
  });

  it('un aula pareja está toda en verde', () => {
    const filas = classroomSemaforo([alumno('a', 10), alumno('b', 10), alumno('c', 10)]);
    expect(filas.every((f) => f.semaforo === 'verde')).toBe(true);
  });

  it('el orden es estable con empates', () => {
    const a = classroomSemaforo([alumno('zoe', 5), alumno('ana', 5), alumno('beto', 5)]);
    const b = classroomSemaforo([alumno('ana', 5), alumno('beto', 5), alumno('zoe', 5)]);
    expect(a.map((f) => f.studentId)).toEqual(b.map((f) => f.studentId));
  });
});
