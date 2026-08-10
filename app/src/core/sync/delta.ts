/**
 * Sincronización diferencial.
 *
 * El requisito es que viaje sólo lo que cambió, nunca el historial completo.
 * Se cumple en dos niveles:
 *
 *   1. Un dispositivo que ya conoce al estudiante pide `sinceSeq` y recibe
 *      únicamente la cola de eventos posteriores.
 *   2. Un dispositivo que nunca lo vio — el teléfono prestado de mañana — no
 *      recibe los miles de eventos históricos, sino un *snapshot* ya proyectado
 *      más la cola corta que quedó después de él.
 *
 * El host es la única autoridad sobre el orden: asigna un `seq` monotónico por
 * estudiante. Los clientes nunca inventan `seq`.
 */

import { dedupeById, type ProgressEvent, type SyncedEvent } from '../progress/events';
import { project, type StudentState } from '../progress/projection';
import type { EventLog, SnapshotStore } from './log';

/** Si al dispositivo le faltan más eventos que esto, sale más barato el snapshot. */
export const UMBRAL_COLA = 200;
/** Cada cuántos eventos nuevos se recalcula el snapshot de un estudiante. */
export const CADA_COMPACTAR = 50;
/** Tope de eventos por respuesta, para no ahogar un teléfono de gama baja. */
export const LOTE_MAXIMO = 250;

// ------------------------------------------------------------------ lado host

export interface ResultadoIngest {
  accepted: SyncedEvent[];
  /** Ids que ya estaban: el cliente puede dejar de reenviarlos igual. */
  duplicados: string[];
  headSeq: number;
}

/**
 * Recibe eventos de un cliente y les asigna orden.
 *
 * Idempotente por `id`: reenviar el mismo lote diez veces deja el log igual.
 * Es lo que permite que un cliente reintente sin miedo tras una desconexión.
 */
export function ingest(
  log: EventLog,
  studentId: string,
  entrantes: readonly ProgressEvent[],
): ResultadoIngest {
  const accepted: SyncedEvent[] = [];
  const duplicados: string[] = [];
  let head = log.headSeq(studentId);

  // Ordenar por reloj de origen antes de numerar: dentro de un mismo lote,
  // el orden en que el cliente los mandó es el orden en que ocurrieron.
  const lote = dedupeById(entrantes)
    .filter((ev) => ev.studentId === studentId)
    .sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));

  for (const ev of lote) {
    if (log.hasId(studentId, ev.id)) {
      duplicados.push(ev.id);
      continue;
    }
    head += 1;
    const numerado: SyncedEvent = { ...ev, seq: head };
    if (log.appendSynced(numerado)) accepted.push(numerado);
    else head -= 1; // carrera improbable: alguien lo insertó en el medio
  }

  return { accepted, duplicados, headSeq: log.headSeq(studentId) };
}

export type Bootstrap =
  | { mode: 'aldia'; headSeq: number }
  | { mode: 'delta'; events: SyncedEvent[]; headSeq: number }
  | { mode: 'snapshot'; snapshot: StudentState; throughSeq: number; headSeq: number };

/**
 * Qué mandarle a un dispositivo que pide sincronizar desde `sinceSeq`.
 *
 * `sinceSeq === 0` significa "nunca vi a este estudiante" — el caso del niño
 * que hoy juega en un teléfono prestado. Ahí el snapshot va **ya completo**,
 * con la cola plegada adentro: un solo mensaje de tamaño fijo, sin importar si
 * detrás hay veinte eventos o veinte mil. Mandarlo en dos partes obligaba al
 * receptor a mostrar un estado a medias mientras llegaba la segunda.
 */
export function bootstrap(
  log: EventLog,
  snapshots: SnapshotStore,
  studentId: string,
  sinceSeq: number,
): Bootstrap {
  const headSeq = log.headSeq(studentId);
  if (sinceSeq >= headSeq) return { mode: 'aldia', headSeq };

  const faltantes = headSeq - sinceSeq;
  if (sinceSeq > 0 && faltantes <= UMBRAL_COLA) {
    return { mode: 'delta', events: log.since(studentId, sinceSeq, LOTE_MAXIMO), headSeq };
  }

  // Se parte del último snapshot guardado y se le pliega lo que vino después.
  // Sin snapshot previo se calcula entero: es trabajo local del host, no red.
  const snap = snapshots.get(studentId);
  const state = project(studentId, log.since(studentId, snap?.throughSeq ?? 0), snap?.state);
  if (!snap) snapshots.put({ studentId, state, throughSeq: state.throughSeq });

  return { mode: 'snapshot', snapshot: state, throughSeq: state.throughSeq, headSeq };
}

/**
 * Recalcula el snapshot si la cola creció lo suficiente. Barato: parte del
 * snapshot anterior y le pliega sólo lo nuevo.
 */
export function maybeCompact(
  log: EventLog,
  snapshots: SnapshotStore,
  studentId: string,
  cada: number = CADA_COMPACTAR,
): boolean {
  const head = log.headSeq(studentId);
  const prev = snapshots.get(studentId);
  const base = prev?.throughSeq ?? 0;
  if (head - base < cada) return false;

  const cola = log.since(studentId, base);
  const state = project(studentId, cola, prev?.state);
  snapshots.put({ studentId, state, throughSeq: state.throughSeq });
  return true;
}

// --------------------------------------------------------------- lado cliente

/** Lo que el cliente todavía le debe al host. */
export function porEnviar(
  log: EventLog,
  studentId: string,
  max: number = LOTE_MAXIMO,
): ProgressEvent[] {
  return log.pending(studentId).slice(0, max);
}

/**
 * Aplica un `delta` recibido. Devuelve el nuevo `lastSeq` conocido.
 * Ignora lo que ya tenía, así que recibir el mismo delta dos veces no molesta.
 */
export function aplicarDelta(
  log: EventLog,
  events: readonly ProgressEvent[],
  lastSeq: number,
): number {
  let ultimo = lastSeq;
  for (const ev of events) {
    if (typeof ev.seq !== 'number') continue;
    log.appendSynced(ev as SyncedEvent);
    if (ev.seq > ultimo) ultimo = ev.seq;
  }
  return ultimo;
}

/**
 * Aplica el `ack` del host: los eventos locales que aceptó pasan a tener el
 * `seq` que les asignó, y dejan de estar pendientes.
 */
export function aplicarAck(
  log: EventLog,
  studentId: string,
  assigned: readonly { id: string; seq: number }[],
): void {
  const asignaciones = new Map<string, number>();
  for (const a of assigned) asignaciones.set(a.id, a.seq);
  log.markSynced(studentId, asignaciones);
}
