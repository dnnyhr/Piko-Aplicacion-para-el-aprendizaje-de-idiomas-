import { describe, expect, it } from 'vitest';
import { shuffle, mulberry32 } from '@core/ids';
import { sortEvents, dedupeById, type ProgressEvent } from '@core/progress/events';
import {
  XP_ACIERTO,
  XP_INTENTO,
  accuracy,
  emptyState,
  overallMastery,
  project,
} from '@core/progress/projection';
import { fabricaEventos } from './helpers';

/** Numera eventos como lo haría el host, para poder ordenarlos. */
function numerar(events: ProgressEvent[]): ProgressEvent[] {
  return events.map((ev, i) => ({ ...ev, seq: i + 1 }));
}

describe('proyección', () => {
  it('el estado vacío no tiene progreso', () => {
    const s = emptyState('ana');
    expect(s.xp).toBe(0);
    expect(overallMastery(s)).toBe(0);
    expect(accuracy(s)).toBe(0);
  });

  it('cuenta aciertos y fallos', () => {
    const f = fabricaEventos();
    const evs = numerar([
      f.respuesta('ana', { correct: true }),
      f.respuesta('ana', { correct: false }),
      f.respuesta('ana', { correct: true }),
    ]);
    const s = project('ana', evs);
    expect(s.answered).toBe(3);
    expect(s.correct).toBe(2);
    expect(s.throughSeq).toBe(3);
  });

  it('el XP nunca baja al equivocarse', () => {
    const f = fabricaEventos();
    const evs = numerar([
      f.respuesta('ana', { correct: false }),
      f.respuesta('ana', { correct: false }),
      f.respuesta('ana', { correct: false }),
    ]);
    const s = project('ana', evs);
    expect(s.xp).toBe(XP_INTENTO * 3);
    expect(s.xp).toBeGreaterThan(0);
  });

  it('premia la racha con techo', () => {
    const f = fabricaEventos();
    const evs = numerar(Array.from({ length: 8 }, () => f.respuesta('ana', { correct: true })));
    const s = project('ana', evs);
    // 8 aciertos: bonus 1,2,3,4,5,5,5,5
    const bonus = [1, 2, 3, 4, 5, 5, 5, 5].reduce((a, b) => a + b, 0);
    expect(s.xp).toBe(XP_ACIERTO * 8 + bonus);
    expect(s.bestStreak).toBe(8);
  });

  it('una respuesta incorrecta corta la racha pero conserva el récord', () => {
    const f = fabricaEventos();
    const evs = numerar([
      f.respuesta('ana', { correct: true }),
      f.respuesta('ana', { correct: true }),
      f.respuesta('ana', { correct: false }),
      f.respuesta('ana', { correct: true }),
    ]);
    const s = project('ana', evs);
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(2);
  });

  it('es determinista sin importar en qué orden lleguen los eventos', () => {
    const f = fabricaEventos(42);
    const evs = numerar([
      f.respuesta('ana', { correct: true, skill: 'eng.saludos' }),
      f.respuesta('ana', { correct: false, skill: 'eng.numeros' }),
      f.respuesta('ana', { correct: true, skill: 'eng.numeros' }),
      f.respuesta('ana', { correct: false, skill: 'eng.saludos' }),
      f.respuesta('ana', { correct: true, skill: 'eng.saludos' }),
    ]);

    const esperado = project('ana', evs);
    for (let semilla = 0; semilla < 20; semilla++) {
      const revuelto = shuffle(evs, mulberry32(semilla));
      expect(project('ana', revuelto)).toEqual(esperado);
    }
  });

  it('ignora eventos de otro estudiante', () => {
    const f = fabricaEventos();
    const evs = numerar([f.respuesta('ana'), f.respuesta('beto'), f.respuesta('ana')]);
    expect(project('ana', evs).answered).toBe(2);
    expect(project('beto', evs).answered).toBe(1);
  });

  it('plegar sobre un snapshot da lo mismo que plegar todo desde cero', () => {
    const f = fabricaEventos(7);
    const evs = numerar(
      Array.from({ length: 30 }, (_, i) => f.respuesta('ana', { correct: i % 3 !== 0 })),
    );

    const completo = project('ana', evs);
    const base = project('ana', evs.slice(0, 12));
    const incremental = project('ana', evs.slice(12), base);

    expect(incremental).toEqual(completo);
  });

  it('el dominio sube con aciertos y baja con fallos, sin salirse de [0,1]', () => {
    const f = fabricaEventos();
    const buenas = numerar(
      Array.from({ length: 15 }, () => f.respuesta('ana', { correct: true, skill: 's' })),
    );
    const m = overallMastery(project('ana', buenas));
    expect(m).toBeGreaterThan(0.9);
    expect(m).toBeLessThanOrEqual(1);

    const malas = numerar(
      Array.from({ length: 15 }, () => f.respuesta('beto', { correct: false, skill: 's' })),
    );
    expect(overallMastery(project('beto', malas))).toBe(0);
  });
});

describe('orden y deduplicación', () => {
  it('los eventos sincronizados van antes que los pendientes', () => {
    const f = fabricaEventos();
    const local = f.respuesta('ana');
    const sincronizado = { ...f.respuesta('ana'), seq: 5 };
    const orden = sortEvents([local, sincronizado]);
    expect(orden[0]?.id).toBe(sincronizado.id);
  });

  it('dedupeById conserva la versión que ya tiene seq', () => {
    const f = fabricaEventos();
    const local = f.respuesta('ana');
    const mismo = { ...local, seq: 9 };
    const out = dedupeById([local, mismo]);
    expect(out).toHaveLength(1);
    expect(out[0]?.seq).toBe(9);
  });
});
