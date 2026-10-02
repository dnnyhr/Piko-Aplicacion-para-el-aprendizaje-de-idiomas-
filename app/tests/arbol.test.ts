import { describe, expect, it } from 'vitest';
import { lessonDoneEvent, type ProgressEvent } from '@core/progress/events';
import { cloneState, emptyState, project, type StudentState } from '@core/progress/projection';
import {
  ETAPAS,
  SACUANJOCHES_BASE,
  SACUANJOCHES_MAX,
  etapaDe,
  progresoEtapa,
  recompensaEntre,
  sacuanjochesPorLeccion,
} from '@core/progress/arbol';
import { MemoryEventLog } from '@core/sync/log';
import { fabricaEventos } from './helpers';

function leccion(studentId: string, n: number, correct: number, total: number, packId = 'eng.saludos.1'): ProgressEvent {
  return lessonDoneEvent({
    id: `leccion-${n}`,
    studentId,
    originDevice: 'dev-a',
    createdAt: 1_700_000_000_000 + n,
    packId,
    correct,
    total,
  });
}

describe('sacuanjoches por lección', () => {
  it('terminar siempre rinde, aunque no acierte ninguna', () => {
    expect(sacuanjochesPorLeccion(0, 8)).toBe(SACUANJOCHES_BASE);
  });

  it('una más si salió bien y otra si salió perfecta', () => {
    expect(sacuanjochesPorLeccion(5, 8)).toBe(3);
    expect(sacuanjochesPorLeccion(6, 8)).toBe(4);
    expect(sacuanjochesPorLeccion(8, 8)).toBe(SACUANJOCHES_MAX);
  });

  it('una lección vacía no da nada y los datos raros se acotan', () => {
    expect(sacuanjochesPorLeccion(0, 0)).toBe(0);
    expect(sacuanjochesPorLeccion(99, 8)).toBe(SACUANJOCHES_MAX);
    expect(sacuanjochesPorLeccion(-3, 8)).toBe(SACUANJOCHES_BASE);
  });
});

describe('proyección de lecciones', () => {
  it('cada lección terminada suma sacuanjoches al total', () => {
    const s = project('ana', [leccion('ana', 1, 8, 8), leccion('ana', 2, 2, 8)]);
    expect(s.lessons).toBe(2);
    expect(s.sacuanjoches).toBe(5 + 3);
  });

  it('las rondas mezcladas también dan sacuanjoches', () => {
    const s = project('ana', [leccion('ana', 1, 6, 8, 'mezcla')]);
    expect(s.sacuanjoches).toBe(4);
    expect(s.stars).toEqual({});
  });

  it('el total nunca baja, haga lo que haga después', () => {
    const f = fabricaEventos();
    const eventos: ProgressEvent[] = [];
    let anterior = 0;
    for (let i = 0; i < 20; i++) {
      eventos.push(f.respuesta('ana', { correct: i % 3 === 0 }));
      if (i % 4 === 3) eventos.push(leccion('ana', i, i % 2, 4));
      const s = project('ana', eventos);
      expect(s.sacuanjoches).toBeGreaterThanOrEqual(anterior);
      anterior = s.sacuanjoches;
    }
    expect(anterior).toBeGreaterThan(0);
  });

  it('no suma la misma lección dos veces si llega repetida por la red', () => {
    const log = new MemoryEventLog();
    const ev = leccion('ana', 1, 8, 8);
    expect(log.appendLocal(ev)).toBe(true);
    expect(log.appendLocal({ ...ev })).toBe(false);
    expect(project('ana', log.all('ana')).sacuanjoches).toBe(5);
  });

  it('un lessonDone viejo, sin conteos, no da sacuanjoches', () => {
    const viejo: ProgressEvent = {
      id: 'x',
      studentId: 'ana',
      kind: 'lessonDone',
      payload: { packId: 'eng.saludos.1' },
      createdAt: 1,
      originDevice: 'dev-a',
    };
    const s = project('ana', [viejo]);
    expect(s.sacuanjoches).toBe(0);
    expect(s.packsDone).toEqual(['eng.saludos.1']);
  });

  it('un snapshot de una versión anterior arranca el árbol en cero', () => {
    const viejo = { ...emptyState('ana'), xp: 40 } as Partial<StudentState>;
    delete viejo.sacuanjoches;
    delete viejo.lessons;
    delete viejo.stars;
    const s = project('ana', [leccion('ana', 1, 6, 8)], viejo as StudentState);
    expect(s.xp).toBe(40);
    expect(s.sacuanjoches).toBe(4);
    expect(s.lessons).toBe(1);
    expect(s.stars).toEqual({ 'eng.saludos.1': 2 });
    expect(cloneState(viejo as StudentState).sacuanjoches).toBe(0);
  });
});

describe('etapas del madroño', () => {
  it('seis etapas, en orden y con umbrales que suben', () => {
    expect(ETAPAS.map((e) => e.id)).toEqual(['semilla', 'brote', 'arbolito', 'hojas', 'flores', 'florecido']);
    for (let i = 1; i < ETAPAS.length; i++) {
      expect((ETAPAS[i] as { desde: number }).desde).toBeGreaterThan((ETAPAS[i - 1] as { desde: number }).desde);
    }
  });

  it('arranca en semilla y la primera lección la hace brotar', () => {
    expect(etapaDe(0).id).toBe('semilla');
    expect(etapaDe(sacuanjochesPorLeccion(0, 8)).id).toBe('brote');
  });

  it('crece de a una etapa: nunca salta de semilla a árbol entero en una lección', () => {
    for (let total = 0; total <= 200; total++) {
      const r = recompensaEntre(total, total + SACUANJOCHES_MAX);
      expect(r.etapaDespues.indice - r.etapaAntes.indice).toBeLessThanOrEqual(1);
    }
  });

  it('avance hacia la siguiente etapa', () => {
    const e = progresoEtapa(21);
    expect(e.etapa.id).toBe('arbolito');
    expect(e.siguiente?.id).toBe('hojas');
    expect(e.fraccion).toBe(0.5);
    expect(e.faltan).toBe(9);
  });

  it('en la última etapa no hay más que pedir', () => {
    expect(progresoEtapa(1000)).toMatchObject({ siguiente: null, fraccion: 1, faltan: 0 });
    expect(etapaDe(1000).id).toBe('florecido');
  });

  it('la recompensa cuenta lo ganado y si creció el árbol', () => {
    expect(recompensaEntre(10, 14)).toMatchObject({ ganadas: 4, crecioArbol: true });
    expect(recompensaEntre(13, 16)).toMatchObject({ ganadas: 3, crecioArbol: false });
  });
});
