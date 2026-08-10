/**
 * La persistencia de verdad, no un doble.
 *
 * `node:sqlite` corre el mismo SQL que expo-sqlite en el teléfono, así que
 * estas pruebas ejercitan el esquema, los índices y las consultas reales —
 * incluida la clave compuesta que hace idempotente al log.
 */

import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { driverNode, type SqlDriver } from '@/db/driver';
import {
  SqliteEventLog,
  SqliteSnapshotStore,
  guardarLastSeq,
  leerLastSeq,
  migrar,
} from '@/db/sqliteLog';
import { VERSION_ESQUEMA } from '@/db/schema';
import { bootstrap, ingest, maybeCompact, porEnviar, aplicarAck } from '@core/sync/delta';
import { project } from '@core/progress/projection';
import { fabricaEventos } from './helpers';

let sql: SqlDriver;
let log: SqliteEventLog;
let snaps: SqliteSnapshotStore;

beforeEach(() => {
  const db = new DatabaseSync(':memory:');
  sql = driverNode(db);
  migrar(sql);
  log = new SqliteEventLog(sql);
  snaps = new SqliteSnapshotStore(sql);
});

describe('migraciones', () => {
  it('deja la base en la versión esperada', () => {
    expect(sql.get<{ user_version: number }>('PRAGMA user_version')?.user_version).toBe(
      VERSION_ESQUEMA,
    );
  });

  it('correr migrar dos veces no rompe nada', () => {
    migrar(sql);
    migrar(sql);
    expect(sql.all('SELECT name FROM sqlite_master WHERE type = ?', ['table']).length).toBeGreaterThan(
      4,
    );
  });
});

describe('log sobre SQLite', () => {
  it('guarda y devuelve eventos en orden', () => {
    const f = fabricaEventos();
    const r = ingest(log, 'ana', [f.respuesta('ana'), f.respuesta('ana'), f.respuesta('ana')]);
    expect(r.accepted.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(log.headSeq('ana')).toBe(3);
    expect(log.all('ana')).toHaveLength(3);
  });

  it('es idempotente al reinsertar', () => {
    const f = fabricaEventos();
    const lote = [f.respuesta('ana'), f.respuesta('ana')];
    ingest(log, 'ana', lote);
    const segunda = ingest(log, 'ana', lote);
    expect(segunda.accepted).toHaveLength(0);
    expect(segunda.duplicados).toHaveLength(2);
    expect(log.all('ana')).toHaveLength(2);
  });

  it('la clave es por estudiante: el mismo id en dos alumnos no se pisa', () => {
    const f = fabricaEventos();
    const base = f.respuesta('ana');
    ingest(log, 'ana', [base]);
    ingest(log, 'beto', [{ ...base, studentId: 'beto' }]);
    expect(log.all('ana')).toHaveLength(1);
    expect(log.all('beto')).toHaveLength(1);
  });

  it('separa lo pendiente de lo sincronizado', () => {
    const f = fabricaEventos();
    const local = f.respuesta('ana');
    log.appendLocal(local);
    expect(log.pending('ana')).toHaveLength(1);
    expect(log.since('ana', 0)).toHaveLength(0);

    aplicarAck(log, 'ana', [{ id: local.id, seq: 1 }]);
    expect(log.pending('ana')).toHaveLength(0);
    expect(log.since('ana', 0)).toHaveLength(1);
    expect(log.headSeq('ana')).toBe(1);
  });

  it('respeta el límite al pedir la cola', () => {
    const f = fabricaEventos();
    ingest(log, 'ana', Array.from({ length: 20 }, () => f.respuesta('ana')));
    expect(log.since('ana', 0, 5)).toHaveLength(5);
    expect(log.since('ana', 0)).toHaveLength(20);
  });

  it('el payload sobrevive la ida y vuelta por JSON', () => {
    const f = fabricaEventos();
    const ev = f.respuesta('ana', { correct: false, skill: 'eng.numeros' });
    ingest(log, 'ana', [ev]);
    const guardado = log.all('ana')[0];
    expect(guardado?.payload).toEqual(ev.payload);
    expect(guardado?.kind).toBe('answer');
  });
});

describe('snapshots sobre SQLite', () => {
  it('guarda, sobreescribe y devuelve el estado', () => {
    const f = fabricaEventos();
    ingest(log, 'ana', Array.from({ length: 60 }, () => f.respuesta('ana')));

    expect(maybeCompact(log, snaps, 'ana')).toBe(true);
    const guardado = snaps.get('ana');
    expect(guardado?.throughSeq).toBe(60);
    expect(guardado?.state).toEqual(project('ana', log.all('ana')));

    ingest(log, 'ana', Array.from({ length: 60 }, () => f.respuesta('ana')));
    expect(maybeCompact(log, snaps, 'ana')).toBe(true);
    expect(snaps.get('ana')?.throughSeq).toBe(120);
  });
});

describe('estado de sincronía', () => {
  it('arranca en cero y sólo avanza', () => {
    expect(leerLastSeq(sql, 'ana')).toBe(0);
    guardarLastSeq(sql, 'ana', 12);
    expect(leerLastSeq(sql, 'ana')).toBe(12);
    // Un mensaje viejo que llega tarde no debe hacer retroceder el marcador.
    guardarLastSeq(sql, 'ana', 5);
    expect(leerLastSeq(sql, 'ana')).toBe(12);
  });
});

describe('el escenario completo, ya persistido', () => {
  it('un teléfono nuevo recupera el progreso con un solo snapshot', () => {
    const f = fabricaEventos(9);

    // El teléfono de hoy juega y sincroniza.
    const dbA = new DatabaseSync(':memory:');
    const sqlA = driverNode(dbA);
    migrar(sqlA);
    const logA = new SqliteEventLog(sqlA);

    const creados = Array.from({ length: 30 }, (_, i) =>
      f.respuesta('ana', { correct: i % 4 !== 0, device: 'tel-A' }),
    );
    for (const ev of creados) logA.appendLocal(ev);

    const r = ingest(log, 'ana', porEnviar(logA, 'ana'));
    aplicarAck(logA, 'ana', r.accepted.map((e) => ({ id: e.id, seq: e.seq })));
    expect(porEnviar(logA, 'ana')).toHaveLength(0);

    // Mañana, otro teléfono que nunca vio a esta niña.
    const b = bootstrap(log, snaps, 'ana', 0);
    expect(b.mode).toBe('snapshot');
    if (b.mode === 'snapshot') {
      expect(b.snapshot).toEqual(project('ana', logA.all('ana')));
      expect(b.snapshot.answered).toBe(30);
    }
  });
});
