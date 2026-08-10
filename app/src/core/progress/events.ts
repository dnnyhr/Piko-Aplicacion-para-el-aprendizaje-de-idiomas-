/**
 * El registro de progreso es un log append-only. Nunca se edita ni se borra
 * un evento: es lo que permite que la sincronización sea diferencial y que
 * dos dispositivos converjan al mismo estado sin coordinarse.
 */

export type ProgressEventKind = 'answer' | 'lessonDone' | 'joinedSession';

export interface AnswerPayload {
  itemId: string;
  packId: string;
  /** Habilidad ejercitada (p. ej. `eng.saludos`). Es la unidad de dominio. */
  skill: string;
  correct: boolean;
  /** Milisegundos que tardó en responder. */
  ms: number;
}

export interface LessonDonePayload {
  packId: string;
  correct: number;
  total: number;
}

export interface JoinedSessionPayload {
  sessionId: string;
}

export type ProgressPayload =
  | ({ kind: 'answer' } & AnswerPayload)
  | ({ kind: 'lessonDone' } & LessonDonePayload)
  | ({ kind: 'joinedSession' } & JoinedSessionPayload);

export interface ProgressEvent {
  /** UUID. Es la clave de idempotencia: reenviar un evento nunca lo duplica. */
  id: string;
  studentId: string;
  kind: ProgressEventKind;
  payload: Record<string, unknown>;
  /** Reloj del dispositivo que lo originó. Sólo desempata; no ordena. */
  createdAt: number;
  originDevice: string;
  /**
   * Orden autoritativo, asignado por el host al recibirlo. Ausente mientras
   * el evento vive sólo en el dispositivo que lo creó.
   */
  seq?: number;
}

export type SyncedEvent = ProgressEvent & { seq: number };

export function isSynced(ev: ProgressEvent): ev is SyncedEvent {
  return typeof ev.seq === 'number';
}

/**
 * Orden total y determinista.
 *
 * Los eventos ya sincronizados van primero por `seq` (el host es la autoridad).
 * Los locales todavía sin `seq` van al final, desempatados por reloj y luego
 * por `id` — que es lo que garantiza que dos dispositivos con el mismo conjunto
 * de eventos produzcan exactamente el mismo estado.
 */
export function compareEvents(a: ProgressEvent, b: ProgressEvent): number {
  const as = a.seq ?? Number.MAX_SAFE_INTEGER;
  const bs = b.seq ?? Number.MAX_SAFE_INTEGER;
  if (as !== bs) return as - bs;
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortEvents(events: readonly ProgressEvent[]): ProgressEvent[] {
  return events.slice().sort(compareEvents);
}

/** Quita duplicados por `id`, conservando la versión que ya trae `seq`. */
export function dedupeById(events: readonly ProgressEvent[]): ProgressEvent[] {
  const byId = new Map<string, ProgressEvent>();
  for (const ev of events) {
    const prev = byId.get(ev.id);
    if (!prev || (prev.seq === undefined && ev.seq !== undefined)) byId.set(ev.id, ev);
  }
  return [...byId.values()];
}

// ---------------------------------------------------------------- constructores

export function answerEvent(args: {
  id: string;
  studentId: string;
  originDevice: string;
  createdAt: number;
  itemId: string;
  packId: string;
  skill: string;
  correct: boolean;
  ms: number;
}): ProgressEvent {
  const { id, studentId, originDevice, createdAt, ...rest } = args;
  return { id, studentId, originDevice, createdAt, kind: 'answer', payload: { ...rest } };
}

export function lessonDoneEvent(args: {
  id: string;
  studentId: string;
  originDevice: string;
  createdAt: number;
  packId: string;
  correct: number;
  total: number;
}): ProgressEvent {
  const { id, studentId, originDevice, createdAt, ...rest } = args;
  return { id, studentId, originDevice, createdAt, kind: 'lessonDone', payload: { ...rest } };
}

export function joinedSessionEvent(args: {
  id: string;
  studentId: string;
  originDevice: string;
  createdAt: number;
  sessionId: string;
}): ProgressEvent {
  const { id, studentId, originDevice, createdAt, sessionId } = args;
  return { id, studentId, originDevice, createdAt, kind: 'joinedSession', payload: { sessionId } };
}

// ------------------------------------------------------------------ validación

const KINDS: ReadonlySet<string> = new Set(['answer', 'lessonDone', 'joinedSession']);

/** Valida un evento que llegó por la red. Nunca confiar en el otro extremo. */
export function parseEvent(raw: unknown): ProgressEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id.length === 0 || o.id.length > 64) return null;
  if (typeof o.studentId !== 'string' || o.studentId.length === 0) return null;
  if (typeof o.kind !== 'string' || !KINDS.has(o.kind)) return null;
  if (typeof o.createdAt !== 'number' || !Number.isFinite(o.createdAt)) return null;
  if (typeof o.originDevice !== 'string' || o.originDevice.length === 0) return null;
  if (typeof o.payload !== 'object' || o.payload === null || Array.isArray(o.payload)) return null;
  if (o.seq !== undefined && (typeof o.seq !== 'number' || !Number.isInteger(o.seq) || o.seq < 1)) {
    return null;
  }

  const ev: ProgressEvent = {
    id: o.id,
    studentId: o.studentId,
    kind: o.kind as ProgressEventKind,
    payload: o.payload as Record<string, unknown>,
    createdAt: o.createdAt,
    originDevice: o.originDevice,
  };
  if (typeof o.seq === 'number') ev.seq = o.seq;
  return ev;
}
