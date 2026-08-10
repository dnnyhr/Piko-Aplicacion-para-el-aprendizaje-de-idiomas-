import { describe, expect, it } from 'vitest';
import {
  CADA_COMPACTAR,
  UMBRAL_COLA,
  aplicarAck,
  aplicarDelta,
  bootstrap,
  ingest,
  maybeCompact,
  porEnviar,
} from '@core/sync/delta';
import { MemoryEventLog, MemorySnapshotStore } from '@core/sync/log';
import { project } from '@core/progress/projection';
import { fabricaEventos } from './helpers';

describe('ingest en el host', () => {
  it('asigna seq consecutivos por estudiante', () => {
    const log = new MemoryEventLog();
    const f = fabricaEventos();
    const r = ingest(log, 'ana', [f.respuesta('ana'), f.respuesta('ana'), f.respuesta('ana')]);
    expect(r.accepted.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(r.headSeq).toBe(3);
  });

  it('numera cada estudiante por separado', () => {
    const log = new MemoryEventLog();
    const f = fabricaEventos();
    ingest(log, 'ana', [f.respuesta('ana'), f.respuesta('ana')]);
    const r = ingest(log, 'beto', [f.respuesta('beto')]);
    expect(r.accepted[0]?.seq).toBe(1);
    expect(log.headSeq('ana')).toBe(2);
  });

  it('es idempotente: reenviar el mismo lote no duplica nada', () => {
    const log = new MemoryEventLog();
    const f = fabricaEventos();
    const lote = [f.respuesta('ana'), f.respuesta('ana')];

    const primera = ingest(log, 'ana', lote);
    const segunda = ingest(log, 'ana', lote);
    const tercera = ingest(log, 'ana', lote);

    expect(primera.accepted).toHaveLength(2);
    expect(segunda.accepted).toHaveLength(0);
    expect(segunda.duplicados).toHaveLength(2);
    expect(tercera.headSeq).toBe(2);
    expect(log.all('ana')).toHaveLength(2);
  });

  it('dos estudiantes con el mismo id de evento no se pisan', () => {
    // Regresión: la idempotencia se medía sólo por `id`, así que si dos
    // teléfonos generaban el mismo uuid, el progreso del segundo se
    // descartaba en silencio como si fuera un reenvío.
    const log = new MemoryEventLog();
    const f = fabricaEventos();
    const base = f.respuesta('ana');
    const gemelo = { ...base, studentId: 'beto' };

    expect(ingest(log, 'ana', [base]).accepted).toHaveLength(1);
    expect(ingest(log, 'beto', [gemelo]).accepted).toHaveLength(1);
    expect(log.all('ana')).toHaveLength(1);
    expect(log.all('beto')).toHaveLength(1);
  });

  it('descarta eventos que dicen ser de otro estudiante', () => {
    const log = new MemoryEventLog();
    const f = fabricaEventos();
    const r = ingest(log, 'ana', [f.respuesta('ana'), f.respuesta('beto')]);
    expect(r.accepted).toHaveLength(1);
    expect(log.headSeq('beto')).toBe(0);
  });
});

describe('bootstrap', () => {
  it('dice "al día" si el dispositivo ya tiene todo', () => {
    const log = new MemoryEventLog();
    const snaps = new MemorySnapshotStore();
    const f = fabricaEventos();
    ingest(log, 'ana', [f.respuesta('ana')]);
    expect(bootstrap(log, snaps, 'ana', 1).mode).toBe('aldia');
  });

  it('manda sólo la cola cuando el dispositivo va poco atrás', () => {
    const log = new MemoryEventLog();
    const snaps = new MemorySnapshotStore();
    const f = fabricaEventos();
    ingest(log, 'ana', Array.from({ length: 10 }, () => f.respuesta('ana')));

    const b = bootstrap(log, snaps, 'ana', 7);
    expect(b.mode).toBe('delta');
    if (b.mode === 'delta') {
      expect(b.events.map((e) => e.seq)).toEqual([8, 9, 10]);
    }
  });

  it('un teléfono que nunca vio al estudiante recibe snapshot, no el historial', () => {
    const log = new MemoryEventLog();
    const snaps = new MemorySnapshotStore();
    const f = fabricaEventos();
    const total = UMBRAL_COLA + 300;
    ingest(log, 'ana', Array.from({ length: total }, () => f.respuesta('ana')));
    maybeCompact(log, snaps, 'ana');

    const b = bootstrap(log, snaps, 'ana', 0);
    expect(b.mode).toBe('snapshot');
    if (b.mode === 'snapshot') {
      // Esta es la garantía del requisito: viaja un estado de tamaño fijo,
      // nunca los 500 eventos del historial.
      expect(b.throughSeq).toBe(b.headSeq);
      expect(b.snapshot).toEqual(project('ana', log.all('ana')));
      expect(JSON.stringify(b).length).toBeLessThan(2000);
    }
  });

  it('el snapshot llega completo aunque el guardado esté viejo', () => {
    const log = new MemoryEventLog();
    const snaps = new MemorySnapshotStore();
    const f = fabricaEventos(5);

    ingest(log, 'ana', Array.from({ length: CADA_COMPACTAR }, () => f.respuesta('ana')));
    maybeCompact(log, snaps, 'ana');
    expect(snaps.get('ana')?.throughSeq).toBe(CADA_COMPACTAR);

    // Llegan más eventos sin alcanzar el umbral para recompactar.
    ingest(log, 'ana', Array.from({ length: 7 }, () => f.respuesta('ana')));

    const b = bootstrap(log, snaps, 'ana', 0);
    expect(b.mode).toBe('snapshot');
    if (b.mode === 'snapshot') {
      expect(b.snapshot.answered).toBe(CADA_COMPACTAR + 7);
      expect(b.snapshot).toEqual(project('ana', log.all('ana')));
    }
  });

  it('construye un snapshot al vuelo si todavía no existe', () => {
    const log = new MemoryEventLog();
    const snaps = new MemorySnapshotStore();
    const f = fabricaEventos();
    ingest(log, 'ana', Array.from({ length: 5 }, () => f.respuesta('ana')));

    const b = bootstrap(log, snaps, 'ana', 0);
    expect(b.mode).toBe('snapshot');
    expect(snaps.get('ana')).not.toBeNull();
  });
});

describe('compactación', () => {
  it('no compacta antes del umbral', () => {
    const log = new MemoryEventLog();
    const snaps = new MemorySnapshotStore();
    const f = fabricaEventos();
    ingest(log, 'ana', Array.from({ length: CADA_COMPACTAR - 1 }, () => f.respuesta('ana')));
    expect(maybeCompact(log, snaps, 'ana')).toBe(false);
  });

  it('compacta incrementalmente y coincide con el cálculo completo', () => {
    const log = new MemoryEventLog();
    const snaps = new MemorySnapshotStore();
    const f = fabricaEventos(3);

    for (let ronda = 0; ronda < 4; ronda++) {
      ingest(
        log,
        'ana',
        Array.from({ length: CADA_COMPACTAR }, (_, i) => f.respuesta('ana', { correct: i % 4 !== 0 })),
      );
      expect(maybeCompact(log, snaps, 'ana')).toBe(true);
    }

    const snap = snaps.get('ana');
    expect(snap).not.toBeNull();
    expect(snap?.state).toEqual(project('ana', log.all('ana')));
  });
});

describe('lado cliente', () => {
  it('los eventos locales quedan pendientes hasta el ack', () => {
    const log = new MemoryEventLog();
    const f = fabricaEventos();
    const ev = f.respuesta('ana');
    log.appendLocal(ev);

    expect(porEnviar(log, 'ana')).toHaveLength(1);
    aplicarAck(log, 'ana', [{ id: ev.id, seq: 1 }]);
    expect(porEnviar(log, 'ana')).toHaveLength(0);
    expect(log.headSeq('ana')).toBe(1);
  });

  it('aplicar el mismo delta dos veces no cambia el resultado', () => {
    const log = new MemoryEventLog();
    const host = new MemoryEventLog();
    const f = fabricaEventos();
    const { accepted } = ingest(host, 'ana', [f.respuesta('ana'), f.respuesta('ana')]);

    const primero = aplicarDelta(log, accepted, 0);
    const segundo = aplicarDelta(log, accepted, primero);
    expect(primero).toBe(2);
    expect(segundo).toBe(2);
    expect(log.all('ana')).toHaveLength(2);
  });
});

describe('el progreso pertenece al estudiante, no al teléfono', () => {
  it('un niño cambia de dispositivo y conserva todo su avance', () => {
    const host = new MemoryEventLog();
    const snaps = new MemorySnapshotStore();
    const f = fabricaEventos(11);

    // Día 1: juega en el teléfono A.
    const telefonoA = new MemoryEventLog();
    const creados = Array.from({ length: 40 }, (_, i) =>
      f.respuesta('ana', { correct: i % 5 !== 0, device: 'tel-A' }),
    );
    for (const ev of creados) telefonoA.appendLocal(ev);

    // Sincroniza contra el host del maestro.
    const r = ingest(host, 'ana', porEnviar(telefonoA, 'ana'));
    aplicarAck(telefonoA, 'ana', r.accepted.map((e) => ({ id: e.id, seq: e.seq })));
    expect(porEnviar(telefonoA, 'ana')).toHaveLength(0);
    maybeCompact(host, snaps, 'ana');

    // Día 2: teléfono prestado, que nunca vio a esta niña.
    const telefonoB = new MemoryEventLog();
    const b = bootstrap(host, snaps, 'ana', 0);
    expect(b.mode).toBe('snapshot');

    const estadoB = b.mode === 'snapshot' ? b.snapshot : undefined;
    const estadoA = project('ana', telefonoA.all('ana'));
    expect(estadoB).toEqual(estadoA);
    expect(estadoA.answered).toBe(40);

    // Sigue jugando en B y devuelve sólo lo nuevo.
    const nuevos = Array.from({ length: 3 }, () =>
      f.respuesta('ana', { correct: true, device: 'tel-B' }),
    );
    for (const ev of nuevos) telefonoB.appendLocal(ev);

    const pendientes = porEnviar(telefonoB, 'ana');
    expect(pendientes).toHaveLength(3); // sólo lo nuevo viaja, no los 40 anteriores

    const r2 = ingest(host, 'ana', pendientes);
    expect(r2.accepted.map((e) => e.seq)).toEqual([41, 42, 43]);

    // Y el teléfono A se pone al día pidiendo su cola.
    const c = bootstrap(host, snaps, 'ana', 40);
    expect(c.mode).toBe('delta');
    if (c.mode === 'delta') {
      aplicarDelta(telefonoA, c.events, 40);
      expect(project('ana', telefonoA.all('ana'))).toEqual(project('ana', host.all('ana')));
    }
  });
});
