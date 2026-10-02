import { describe, expect, it } from 'vitest';
import { lessonDoneEvent, type ProgressEvent } from '@core/progress/events';
import { cloneState, emptyState, project, type StudentState } from '@core/progress/projection';
import {
  ETAPAS,
  NIVELES,
  NIVEL_MAX,
  SACUANJOCHES_BASE,
  SACUANJOCHES_MAX,
  etapaDe,
  lugarDePiko,
  nivelDe,
  progresoEtapa,
  progresoNivel,
  recompensaEntre,
  sacuanjochesPorLeccion,
} from '@core/progress/arbol';
import { MemoryEventLog } from '@core/sync/log';
import { fabricaEventos } from './helpers';

function leccion(studentId: string, n: number, correct: number, total: number): ProgressEvent {
  return lessonDoneEvent({
    id: `leccion-${n}`,
    studentId,
    originDevice: 'dev-a',
    createdAt: 1_700_000_000_000 + n,
    packId: 'eng.saludos.1',
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
    expect(s.packsDone).toEqual(['eng.saludos.1']);
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
    const s = project('ana', [leccion('ana', 1, 6, 8)], viejo as StudentState);
    expect(s.xp).toBe(40);
    expect(s.sacuanjoches).toBe(4);
    expect(s.lessons).toBe(1);
    expect(cloneState(viejo as StudentState).sacuanjoches).toBe(0);
  });
});

describe('niveles y etapas', () => {
  it('los umbrales suben y cada etapa empieza en un nivel', () => {
    for (let i = 1; i < NIVELES.length; i++) {
      expect(NIVELES[i]).toBeGreaterThan(NIVELES[i - 1] as number);
    }
    for (const etapa of ETAPAS) expect(NIVELES).toContain(etapa.desde);
    expect(ETAPAS.map((e) => e.id)).toEqual([
      'semilla',
      'brote',
      'arbolito',
      'hojas',
      'flores',
      'florecido',
    ]);
  });

  it('arranca en semilla, nivel 1', () => {
    expect(nivelDe(0)).toBe(1);
    expect(etapaDe(0).id).toBe('semilla');
    expect(lugarDePiko(1)).toMatch(/semilla/);
  });

  it('las primeras sacuanjoches hacen brotar la semilla', () => {
    expect(etapaDe(3).id).toBe('semilla');
    expect(etapaDe(4).id).toBe('brote');
    expect(nivelDe(4)).toBe(2);
  });

  it('crece de a una etapa: nunca salta de semilla a árbol entero en una lección', () => {
    for (let total = 0; total <= 200; total++) {
      const r = recompensaEntre(total, total + SACUANJOCHES_MAX);
      expect(r.etapaDespues.indice - r.etapaAntes.indice).toBeLessThanOrEqual(1);
      expect(r.nivelDespues - r.nivelAntes).toBeLessThanOrEqual(1);
    }
  });

  it('el árbol cambia sólo cuando Piko sube de nivel', () => {
    for (let total = 0; total <= 200; total++) {
      const r = recompensaEntre(total, total + 1);
      if (r.crecioArbol) expect(r.subioNivel).toBe(true);
    }
  });

  it('progreso hacia el siguiente nivel y la siguiente etapa', () => {
    const n = progresoNivel(8);
    expect(n.nivel).toBe(2);
    expect(n.desde).toBe(4);
    expect(n.hasta).toBe(12);
    expect(n.fraccion).toBe(0.5);
    expect(n.faltan).toBe(4);

    const e = progresoEtapa(24);
    expect(e.etapa.id).toBe('arbolito');
    expect(e.siguiente?.id).toBe('hojas');
    expect(e.faltan).toBe(11);
  });

  it('en la cima no hay más que pedir', () => {
    const tope = 1000;
    expect(nivelDe(tope)).toBe(NIVEL_MAX);
    expect(progresoNivel(tope)).toMatchObject({ hasta: null, fraccion: 1, faltan: 0 });
    expect(progresoEtapa(tope)).toMatchObject({ siguiente: null, fraccion: 1, faltan: 0 });
    expect(etapaDe(tope).id).toBe('florecido');
  });

  it('la recompensa cuenta lo ganado y si subió', () => {
    const r = recompensaEntre(10, 14);
    expect(r).toMatchObject({ ganadas: 4, nivelAntes: 2, nivelDespues: 3, subioNivel: true, crecioArbol: true });
    expect(recompensaEntre(13, 16)).toMatchObject({ ganadas: 3, subioNivel: false, crecioArbol: false });
  });
});
