/**
 * Protocolo del aula.
 *
 * Un sobre plano con discriminante `t`, viajando como NDJSON sobre TCP crudo.
 * Los dos extremos son la misma app, así que no hace falta el handshake de
 * WebSocket ni el peso de HTTP: una línea de JSON por mensaje alcanza.
 *
 * Todo mensaje que llega de la red pasa por `parseMessage`. El otro extremo
 * puede ser una versión distinta de Piko, o basura.
 */

import type { ProgressEvent } from '../progress/events';
import { parseEvent } from '../progress/events';
import type { Item } from '../content/schema';
import type { StudentState } from '../progress/projection';

export const PROTOCOL_VERSION = 1;
export const PUERTO_AULA = 7331;

export interface RosterEntry {
  id: string;
  nombre: string;
  /** Índice del avatar; se resuelve a un dibujo en la UI. */
  avatar: number;
  /** Ya reclamado por algún teléfono en esta sesión. */
  tomado: boolean;
}

export interface PresetSummary {
  id: string;
  nombre: string;
  lang: string;
  themes: string[];
  difficulty: number;
  /** Ítems por ronda. */
  count: number;
}

export interface BoardRow {
  studentId: string;
  nombre: string;
  correct: number;
  answered: number;
  xp: number;
}

export type DeniedCode =
  | 'version'
  | 'yaTomado'
  | 'noEstaEnLista'
  | 'salaCerrada'
  | 'malformado';

// ------------------------------------------------------------ cliente → host

export interface Hello {
  t: 'hello';
  v: number;
  deviceId: string;
  appVersion: string;
}

export interface Claim {
  t: 'claim';
  studentId: string;
  /** Hasta dónde conoce este dispositivo al estudiante. 0 = no lo conoce. */
  sinceSeq: number;
}

export interface Pull {
  t: 'pull';
  studentId: string;
  sinceSeq: number;
}

export interface Push {
  t: 'push';
  studentId: string;
  events: ProgressEvent[];
}

export interface Ping {
  t: 'ping';
  ts: number;
}

/**
 * No existe un mensaje "respondí".
 *
 * El marcador vivo del maestro se alimenta de los mismos eventos de progreso
 * que viajan en `push`, y no de un aviso aparte. Tener dos caminos hacia el
 * mismo número significaba que un teléfono desconectado perdía el aviso —
 * seguía sumando progreso real pero aparecía atrasado en el semáforo, que es
 * justo el error que el maestro no puede permitirse.
 */
export type ClientMessage = Hello | Claim | Pull | Push | Ping;

// ------------------------------------------------------------ host → cliente

export interface Welcome {
  t: 'welcome';
  v: number;
  roomCode: string;
  roster: RosterEntry[];
  preset: PresetSummary | null;
}

export interface Claimed {
  t: 'claimed';
  studentId: string;
  /**
   * Estado ya proyectado. Llega sólo cuando el dispositivo no conocía al
   * estudiante — el teléfono prestado. Si ya lo conocía viaja `null` y el
   * progreso se pone al día con el `delta` que viene detrás.
   */
  snapshot: StudentState | null;
  throughSeq: number;
}

export interface Denied {
  t: 'denied';
  code: DeniedCode;
  reason: string;
}

export interface Delta {
  t: 'delta';
  studentId: string;
  events: ProgressEvent[];
  headSeq: number;
}

/** Un `seq` asignado por el host a un evento que había creado el cliente. */
export interface Asignacion {
  id: string;
  seq: number;
}

export interface Ack {
  t: 'ack';
  studentId: string;
  /** Explícito y no por posición: reordenar el lote no debe corromper nada. */
  assigned: Asignacion[];
  headSeq: number;
}

export interface RoundStart {
  t: 'roundStart';
  sessionId: string;
  items: Item[];
  /** Epoch ms del host. El cliente lo usa como cuenta regresiva relativa. */
  endsAt: number;
}

export interface Tick {
  t: 'tick';
  board: BoardRow[];
}

export interface RoundEnd {
  t: 'roundEnd';
  sessionId: string;
  board: BoardRow[];
}

export interface Pong {
  t: 'pong';
  ts: number;
}

export type HostMessage =
  | Welcome
  | Claimed
  | Denied
  | Delta
  | Ack
  | RoundStart
  | Tick
  | RoundEnd
  | Pong;

export type Message = ClientMessage | HostMessage;

// ------------------------------------------------------------------ validación

const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Límite defensivo: una sala son decenas de estudiantes, no miles. */
export const MAX_EVENTOS_POR_MENSAJE = 500;

function parseEvents(raw: unknown): ProgressEvent[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_EVENTOS_POR_MENSAJE) return null;
  const out: ProgressEvent[] = [];
  for (const r of raw) {
    const ev = parseEvent(r);
    if (!ev) return null;
    out.push(ev);
  }
  return out;
}

/**
 * Valida sólo lo que el receptor necesita para actuar sin romperse. Los
 * campos "de adorno" (roster, board, items) se dejan pasar tal cual: el host
 * es de confianza para ellos y validarlos en profundidad costaría CPU en
 * teléfonos que no la tienen de sobra.
 */
export function parseMessage(raw: unknown): Message | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!str(o.t)) return null;

  switch (o.t) {
    case 'hello':
      if (!num(o.v) || !str(o.deviceId) || !str(o.appVersion)) return null;
      return { t: 'hello', v: o.v, deviceId: o.deviceId, appVersion: o.appVersion };

    case 'claim':
      if (!str(o.studentId) || !num(o.sinceSeq) || o.sinceSeq < 0) return null;
      return { t: 'claim', studentId: o.studentId, sinceSeq: o.sinceSeq };

    case 'pull':
      if (!str(o.studentId) || !num(o.sinceSeq) || o.sinceSeq < 0) return null;
      return { t: 'pull', studentId: o.studentId, sinceSeq: o.sinceSeq };

    case 'push': {
      if (!str(o.studentId)) return null;
      const events = parseEvents(o.events);
      if (!events) return null;
      return { t: 'push', studentId: o.studentId, events };
    }

    case 'ping':
      if (!num(o.ts)) return null;
      return { t: 'ping', ts: o.ts };

    case 'welcome':
      if (!num(o.v) || !str(o.roomCode) || !Array.isArray(o.roster)) return null;
      return {
        t: 'welcome',
        v: o.v,
        roomCode: o.roomCode,
        roster: o.roster as RosterEntry[],
        preset: (o.preset ?? null) as PresetSummary | null,
      };

    case 'claimed': {
      if (!str(o.studentId) || !num(o.throughSeq)) return null;
      const snap = o.snapshot;
      if (snap !== null && snap !== undefined && typeof snap !== 'object') return null;
      return {
        t: 'claimed',
        studentId: o.studentId,
        snapshot: (snap ?? null) as StudentState | null,
        throughSeq: o.throughSeq,
      };
    }

    case 'denied':
      if (!str(o.code) || !str(o.reason)) return null;
      return { t: 'denied', code: o.code as DeniedCode, reason: o.reason };

    case 'delta': {
      if (!str(o.studentId) || !num(o.headSeq)) return null;
      const events = parseEvents(o.events);
      if (!events) return null;
      return { t: 'delta', studentId: o.studentId, events, headSeq: o.headSeq };
    }

    case 'ack': {
      if (!str(o.studentId) || !num(o.headSeq) || !Array.isArray(o.assigned)) return null;
      const assigned: Asignacion[] = [];
      for (const a of o.assigned) {
        if (typeof a !== 'object' || a === null) return null;
        const { id, seq } = a as Record<string, unknown>;
        if (!str(id) || !num(seq) || !Number.isInteger(seq) || seq < 1) return null;
        assigned.push({ id, seq });
      }
      return { t: 'ack', studentId: o.studentId, assigned, headSeq: o.headSeq };
    }

    case 'roundStart':
      if (!str(o.sessionId) || !Array.isArray(o.items) || !num(o.endsAt)) return null;
      return { t: 'roundStart', sessionId: o.sessionId, items: o.items as Item[], endsAt: o.endsAt };

    case 'tick':
      if (!Array.isArray(o.board)) return null;
      return { t: 'tick', board: o.board as BoardRow[] };

    case 'roundEnd':
      if (!str(o.sessionId) || !Array.isArray(o.board)) return null;
      return { t: 'roundEnd', sessionId: o.sessionId, board: o.board as BoardRow[] };

    case 'pong':
      if (!num(o.ts)) return null;
      return { t: 'pong', ts: o.ts };

    default:
      return null;
  }
}
