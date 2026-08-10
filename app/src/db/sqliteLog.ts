/**
 * El log de eventos y los snapshots, sobre SQLite.
 *
 * Implementa las mismas interfaces que `MemoryEventLog`, así que toda la
 * lógica de `core/sync/delta.ts` funciona sin enterarse de que ahora hay un
 * disco de por medio.
 */

import type { ProgressEvent, ProgressEventKind, SyncedEvent } from '../core/progress/events';
import type { StudentState } from '../core/progress/projection';
import type { EventLog, SnapshotRecord, SnapshotStore } from '../core/sync/log';
import { MIGRACIONES, SQL_INICIAL, VERSION_ESQUEMA } from './schema';
import type { SqlDriver } from './driver';

interface FilaEvento {
  student_id: string;
  id: string;
  seq: number | null;
  kind: string;
  payload: string;
  created_at: number;
  origin_device: string;
}

function aEvento(fila: FilaEvento): ProgressEvent {
  const ev: ProgressEvent = {
    id: fila.id,
    studentId: fila.student_id,
    kind: fila.kind as ProgressEventKind,
    payload: JSON.parse(fila.payload) as Record<string, unknown>,
    createdAt: fila.created_at,
    originDevice: fila.origin_device,
  };
  if (fila.seq !== null) ev.seq = fila.seq;
  return ev;
}

/** Crea las tablas y aplica las migraciones que falten. Idempotente. */
export function migrar(sql: SqlDriver): void {
  for (const pragma of SQL_INICIAL) sql.exec(pragma);

  const fila = sql.get<{ user_version: number }>('PRAGMA user_version');
  const actual = fila?.user_version ?? 0;
  if (actual >= VERSION_ESQUEMA) return;

  for (let v = actual; v < MIGRACIONES.length; v++) {
    for (const paso of MIGRACIONES[v] as string[]) sql.exec(paso);
  }
  // `PRAGMA` no admite parámetros; el valor es un entero nuestro, no de entrada.
  sql.exec(`PRAGMA user_version = ${VERSION_ESQUEMA}`);
}

export class SqliteEventLog implements EventLog {
  constructor(private sql: SqlDriver) {}

  headSeq(studentId: string): number {
    const fila = this.sql.get<{ maximo: number | null }>(
      'SELECT MAX(seq) AS maximo FROM progress_event WHERE student_id = ?',
      [studentId],
    );
    return fila?.maximo ?? 0;
  }

  hasId(studentId: string, id: string): boolean {
    const fila = this.sql.get<{ uno: number }>(
      'SELECT 1 AS uno FROM progress_event WHERE student_id = ? AND id = ?',
      [studentId, id],
    );
    return fila !== null;
  }

  private insertar(ev: ProgressEvent, seq: number | null): boolean {
    // `OR IGNORE` sobre la clave (student_id, id): reenviar es gratis, y las
    // filas afectadas dicen si el evento era nuevo sin tener que contar nada.
    return (
      this.sql.run(
        `INSERT OR IGNORE INTO progress_event
           (student_id, id, seq, kind, payload, created_at, origin_device)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ev.studentId,
          ev.id,
          seq,
          ev.kind,
          JSON.stringify(ev.payload),
          ev.createdAt,
          ev.originDevice,
        ],
      ) > 0
    );
  }

  appendSynced(ev: SyncedEvent): boolean {
    return this.insertar(ev, ev.seq);
  }

  appendLocal(ev: ProgressEvent): boolean {
    return this.insertar(ev, null);
  }

  since(studentId: string, desde: number, limite?: number): SyncedEvent[] {
    const filas = this.sql.all<FilaEvento>(
      `SELECT * FROM progress_event
        WHERE student_id = ? AND seq IS NOT NULL AND seq > ?
        ORDER BY seq ASC
        LIMIT ?`,
      [studentId, desde, limite ?? -1],
    );
    return filas.map((f) => aEvento(f) as SyncedEvent);
  }

  pending(studentId: string): ProgressEvent[] {
    const filas = this.sql.all<FilaEvento>(
      `SELECT * FROM progress_event
        WHERE student_id = ? AND seq IS NULL
        ORDER BY created_at ASC, id ASC`,
      [studentId],
    );
    return filas.map(aEvento);
  }

  markSynced(studentId: string, asignaciones: ReadonlyMap<string, number>): void {
    if (asignaciones.size === 0) return;
    this.sql.tx(() => {
      for (const [id, seq] of asignaciones) {
        this.sql.run('UPDATE progress_event SET seq = ? WHERE student_id = ? AND id = ?', [
          seq,
          studentId,
          id,
        ]);
      }
    });
  }

  all(studentId: string): ProgressEvent[] {
    const filas = this.sql.all<FilaEvento>(
      `SELECT * FROM progress_event
        WHERE student_id = ?
        ORDER BY (seq IS NULL) ASC, seq ASC, created_at ASC, id ASC`,
      [studentId],
    );
    return filas.map(aEvento);
  }

  /** Cuántos eventos hay en total. Para diagnóstico. */
  get size(): number {
    return this.sql.get<{ n: number }>('SELECT COUNT(*) AS n FROM progress_event')?.n ?? 0;
  }
}

export class SqliteSnapshotStore implements SnapshotStore {
  constructor(private sql: SqlDriver) {}

  get(studentId: string): SnapshotRecord | null {
    const fila = this.sql.get<{ through_seq: number; state: string }>(
      'SELECT through_seq, state FROM snapshot WHERE student_id = ?',
      [studentId],
    );
    if (!fila) return null;
    return {
      studentId,
      throughSeq: fila.through_seq,
      state: JSON.parse(fila.state) as StudentState,
    };
  }

  put(rec: SnapshotRecord): void {
    this.sql.run(
      `INSERT INTO snapshot (student_id, through_seq, state, actualizado)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(student_id) DO UPDATE SET
         through_seq = excluded.through_seq,
         state       = excluded.state,
         actualizado = excluded.actualizado`,
      [rec.studentId, rec.throughSeq, JSON.stringify(rec.state), Date.now()],
    );
  }
}

// ------------------------------------------------------- estado de sincronía

/** Hasta dónde conoce este teléfono a un estudiante. Es el `sinceSeq` del claim. */
export function leerLastSeq(sql: SqlDriver, studentId: string): number {
  return (
    sql.get<{ last_seq: number }>('SELECT last_seq FROM sync_state WHERE student_id = ?', [
      studentId,
    ])?.last_seq ?? 0
  );
}

export function guardarLastSeq(sql: SqlDriver, studentId: string, lastSeq: number): void {
  sql.run(
    `INSERT INTO sync_state (student_id, last_seq) VALUES (?, ?)
     ON CONFLICT(student_id) DO UPDATE SET last_seq = MAX(last_seq, excluded.last_seq)`,
    [studentId, lastSeq],
  );
}
