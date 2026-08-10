/**
 * El anfitrión del aula: el teléfono del maestro.
 *
 * Es el único punto central de la topología. Manda el orden de los eventos
 * (`seq`), reparte las rondas y mantiene el marcador vivo. No sabe nada de
 * sockets concretos: recibe un `Transporte`, y por eso corre igual en el
 * teléfono que en el simulador de Node.
 */

import { hashSeed, roomCode as generarCodigo, uuidv4, type Rng } from '../core/ids';
import { LineFramer, LineaDemasiadoLarga, decode, encode } from '../core/protocol/codec';
import {
  PROTOCOL_VERSION,
  PUERTO_AULA,
  type BoardRow,
  type HostMessage,
  type PresetSummary,
  type RosterEntry,
} from '../core/protocol/messages';
import type { Pack } from '../core/content/schema';
import { pickRound } from '../core/content/selector';
import { emptyState, type StudentState } from '../core/progress/projection';
import { classroomSemaforo, type FilaSemaforo } from '../core/progress/rezago';
import { bootstrap, ingest, maybeCompact } from '../core/sync/delta';
import type { EventLog, SnapshotStore } from '../core/sync/log';
import { nuevaSesion, reduce, tabla, type SesionState } from '../core/session/machine';
import type { Conexion, Servidor, Transporte } from './transport';

export interface AlumnoRoster {
  id: string;
  nombre: string;
  avatar: number;
}

export interface HostOpts {
  transporte: Transporte;
  packs: readonly Pack[];
  roster: readonly AlumnoRoster[];
  preset: PresetSummary | null;
  log: EventLog;
  snapshots: SnapshotStore;
  sessionId?: string;
  ahora?: () => number;
  rng?: Rng;
}

export type HostEvento =
  | { tipo: 'conexion'; conexiones: number }
  | { tipo: 'reclamo'; studentId: string; nombre: string }
  | { tipo: 'salida'; studentId: string | null }
  | { tipo: 'respuesta'; studentId: string; correct: boolean }
  | { tipo: 'sesion'; sesion: SesionState }
  | { tipo: 'aviso'; mensaje: string };

/** Cada cuánto se difunde el marcador. Un tick por segundo alcanza y sobra. */
const TICK_MS = 1000;

interface Par {
  conexion: Conexion;
  framer: LineFramer;
  deviceId: string | null;
  studentId: string | null;
}

export class AulaHost {
  readonly roomCode: string;
  readonly sessionId: string;

  private servidor: Servidor | null = null;
  private pares = new Map<string, Par>();
  private estado: SesionState;
  private tickPendiente: ReturnType<typeof setTimeout> | null = null;
  private finRonda: ReturnType<typeof setTimeout> | null = null;
  private oyentes = new Set<(e: HostEvento) => void>();
  private readonly ahora: () => number;
  private readonly rng: Rng;

  constructor(private opts: HostOpts) {
    this.rng = opts.rng ?? Math.random;
    this.ahora = opts.ahora ?? Date.now;
    this.sessionId = opts.sessionId ?? uuidv4(this.rng);
    this.roomCode = generarCodigo(this.rng);
    this.estado = nuevaSesion(this.sessionId);
  }

  // ------------------------------------------------------------------ ciclo

  async abrir(puerto: number = PUERTO_AULA): Promise<void> {
    const servidor = this.opts.transporte.crearServidor();
    servidor.onConnection((c) => this.aceptar(c));
    await servidor.listen(puerto);
    this.servidor = servidor;
  }

  async cerrar(): Promise<void> {
    if (this.tickPendiente) clearTimeout(this.tickPendiente);
    if (this.finRonda) clearTimeout(this.finRonda);
    this.tickPendiente = null;
    this.finRonda = null;

    this.aplicar({ type: 'cerrar' });
    for (const par of this.pares.values()) par.conexion.close();
    this.pares.clear();
    await this.servidor?.close();
    this.servidor = null;
  }

  // ------------------------------------------------------------------ rondas

  /**
   * Arma una ronda y la reparte. Los ítems se eligen con una semilla derivada
   * de la sesión y el número de ronda: reproducible, y así el maestro puede
   * repetir exactamente la misma ronda si algo salió mal.
   */
  iniciarRonda(opts: { count?: number; duracionMs?: number } = {}): void {
    if (this.estado.fase === 'ronda' || this.estado.fase === 'terminada') return;

    const preset = this.opts.preset;
    const count = opts.count ?? preset?.count ?? 8;
    const duracionMs = opts.duracionMs ?? 120_000;
    const seed = hashSeed(`${this.sessionId}:${this.estado.ronda + 1}`);

    const elegidos = pickRound(this.opts.packs, {
      lang: (preset?.lang ?? 'eng') as Pack['lang'],
      themes: preset?.themes,
      difficulty: preset?.difficulty as Pack['difficulty'] | undefined,
      count,
      seed,
    });

    if (elegidos.length === 0) {
      this.emitir({ tipo: 'aviso', mensaje: 'No hay ítems para este preset' });
      return;
    }

    const endsAt = this.ahora() + duracionMs;
    this.aplicar({ type: 'iniciarRonda', itemIds: elegidos.map((x) => x.item.id), endsAt });

    this.difundir({
      t: 'roundStart',
      sessionId: this.sessionId,
      items: elegidos.map((x) => x.item),
      endsAt,
    });

    this.finRonda = setTimeout(() => this.terminarRonda(), duracionMs);
  }

  terminarRonda(): void {
    if (this.estado.fase !== 'ronda') return;
    if (this.finRonda) clearTimeout(this.finRonda);
    this.finRonda = null;
    this.aplicar({ type: 'terminarRonda' });
    this.difundir({ t: 'roundEnd', sessionId: this.sessionId, board: this.marcador() });
  }

  // ---------------------------------------------------------------- lecturas

  get sesion(): SesionState {
    return this.estado;
  }

  /** Puerto en escucha. 0 si la sala todavía no está abierta. */
  get puerto(): number {
    return this.servidor?.puerto ?? 0;
  }

  get conexiones(): number {
    return this.pares.size;
  }

  /** Semáforo de rezago del aula, con los atrasados arriba. */
  semaforo(): FilaSemaforo[] {
    const estados: StudentState[] = tabla(this.estado).map((fila) => ({
      ...emptyState(fila.studentId),
      correct: fila.correct,
      answered: fila.answered,
      xp: fila.xp,
    }));
    return classroomSemaforo(estados);
  }

  on(cb: (e: HostEvento) => void): () => void {
    this.oyentes.add(cb);
    return () => this.oyentes.delete(cb);
  }

  // ------------------------------------------------------------------ interno

  private emitir(e: HostEvento): void {
    for (const cb of this.oyentes) cb(e);
  }

  private aplicar(action: Parameters<typeof reduce>[1]): void {
    const siguiente = reduce(this.estado, action);
    if (siguiente !== this.estado) {
      this.estado = siguiente;
      this.emitir({ tipo: 'sesion', sesion: siguiente });
    }
  }

  private nombreDe(studentId: string): string {
    return this.opts.roster.find((a) => a.id === studentId)?.nombre ?? studentId;
  }

  private marcador(): BoardRow[] {
    return tabla(this.estado).map((f) => ({
      studentId: f.studentId,
      nombre: this.nombreDe(f.studentId),
      correct: f.correct,
      answered: f.answered,
      xp: f.xp,
    }));
  }

  private rosterPublico(): RosterEntry[] {
    const tomados = new Set(
      [...this.pares.values()].map((p) => p.studentId).filter((s): s is string => s !== null),
    );
    return this.opts.roster.map((a) => ({ ...a, tomado: tomados.has(a.id) }));
  }

  private enviar(par: Par, msg: HostMessage): void {
    try {
      par.conexion.send(encode(msg));
    } catch {
      // Un socket que ya murió no debe tumbar el bucle de la sala.
    }
  }

  private difundir(msg: HostMessage): void {
    const linea = encode(msg);
    for (const par of this.pares.values()) {
      if (par.studentId === null) continue;
      try {
        par.conexion.send(linea);
      } catch {
        /* idem */
      }
    }
  }

  /** Difunde el marcador como mucho una vez por `TICK_MS`. */
  private programarTick(): void {
    if (this.tickPendiente) return;
    this.tickPendiente = setTimeout(() => {
      this.tickPendiente = null;
      this.difundir({ t: 'tick', board: this.marcador() });
    }, TICK_MS);
  }

  private aceptar(conexion: Conexion): void {
    const par: Par = { conexion, framer: new LineFramer(), deviceId: null, studentId: null };
    this.pares.set(conexion.id, par);
    this.emitir({ tipo: 'conexion', conexiones: this.pares.size });

    conexion.onData((chunk) => {
      let lineas: string[];
      try {
        lineas = par.framer.push(chunk);
      } catch (err) {
        if (err instanceof LineaDemasiadoLarga) {
          this.emitir({ tipo: 'aviso', mensaje: `flujo corrupto de ${conexion.remoto}` });
          conexion.close();
          return;
        }
        throw err;
      }
      for (const linea of lineas) {
        const msg = decode(linea);
        // Una línea que no entendemos se descarta: puede venir de una versión
        // más nueva de Piko y no es razón para echar a nadie de la sala.
        if (msg) this.manejar(par, msg);
      }
    });

    conexion.onError(() => conexion.close());
    conexion.onClose(() => this.soltar(par));
  }

  private soltar(par: Par): void {
    if (!this.pares.has(par.conexion.id)) return;
    this.pares.delete(par.conexion.id);
    if (par.studentId) this.aplicar({ type: 'sale', studentId: par.studentId });
    this.emitir({ tipo: 'salida', studentId: par.studentId });
  }

  private manejar(par: Par, msg: ReturnType<typeof decode> & object): void {
    switch (msg.t) {
      case 'hello': {
        if (msg.v !== PROTOCOL_VERSION) {
          this.enviar(par, {
            t: 'denied',
            code: 'version',
            reason: `Esta sala habla la versión ${PROTOCOL_VERSION} y el teléfono la ${msg.v}. Hay que igualar la app.`,
          });
          par.conexion.close();
          return;
        }
        par.deviceId = msg.deviceId;
        this.enviar(par, {
          t: 'welcome',
          v: PROTOCOL_VERSION,
          roomCode: this.roomCode,
          roster: this.rosterPublico(),
          preset: this.opts.preset,
        });
        return;
      }

      case 'claim': {
        if (par.deviceId === null) {
          this.enviar(par, { t: 'denied', code: 'malformado', reason: 'Falta presentarse primero.' });
          return;
        }
        if (this.estado.fase === 'terminada') {
          this.enviar(par, { t: 'denied', code: 'salaCerrada', reason: 'La clase ya terminó.' });
          return;
        }

        const alumno = this.opts.roster.find((a) => a.id === msg.studentId);
        if (!alumno) {
          this.enviar(par, {
            t: 'denied',
            code: 'noEstaEnLista',
            reason: 'Ese nombre no está en la lista de la clase.',
          });
          return;
        }

        const otro = [...this.pares.values()].find(
          (p) => p !== par && p.studentId === msg.studentId,
        );
        if (otro) {
          this.enviar(par, {
            t: 'denied',
            code: 'yaTomado',
            reason: `${alumno.nombre} ya está jugando en otro teléfono.`,
          });
          return;
        }

        par.studentId = msg.studentId;
        this.aplicar({ type: 'entra', studentId: msg.studentId });

        const b = bootstrap(this.opts.log, this.opts.snapshots, msg.studentId, msg.sinceSeq);
        if (b.mode === 'aldia') {
          this.enviar(par, { t: 'claimed', studentId: msg.studentId, snapshot: null, throughSeq: b.headSeq });
        } else if (b.mode === 'delta') {
          this.enviar(par, { t: 'claimed', studentId: msg.studentId, snapshot: null, throughSeq: msg.sinceSeq });
          this.enviar(par, {
            t: 'delta',
            studentId: msg.studentId,
            events: b.events,
            headSeq: b.headSeq,
          });
        } else {
          // El snapshot ya viene completo: un solo mensaje, sin estado a medias.
          this.enviar(par, {
            t: 'claimed',
            studentId: msg.studentId,
            snapshot: b.snapshot,
            throughSeq: b.throughSeq,
          });
        }

        // Si entró tarde, que agarre la ronda en curso en vez de esperar.
        if (this.estado.fase === 'ronda') {
          const items = pickRound(this.opts.packs, {
            lang: (this.opts.preset?.lang ?? 'eng') as Pack['lang'],
            themes: this.opts.preset?.themes,
            difficulty: this.opts.preset?.difficulty as Pack['difficulty'] | undefined,
            count: this.estado.itemIds.length,
            seed: hashSeed(`${this.sessionId}:${this.estado.ronda}`),
          }).map((x) => x.item);
          this.enviar(par, {
            t: 'roundStart',
            sessionId: this.sessionId,
            items,
            endsAt: this.estado.endsAt,
          });
        }

        this.emitir({ tipo: 'reclamo', studentId: msg.studentId, nombre: alumno.nombre });
        return;
      }

      case 'push': {
        if (par.studentId !== msg.studentId) {
          this.enviar(par, {
            t: 'denied',
            code: 'malformado',
            reason: 'Ese progreso no es de este teléfono.',
          });
          return;
        }
        const r = ingest(this.opts.log, msg.studentId, msg.events);
        this.enviar(par, {
          t: 'ack',
          studentId: msg.studentId,
          assigned: r.accepted.map((e) => ({ id: e.id, seq: e.seq })),
          headSeq: r.headSeq,
        });

        // El marcador se alimenta de acá y de ningún otro lado. Como `ingest`
        // es idempotente, un evento reenviado tras una reconexión suma una
        // sola vez, y uno que se creó sin señal suma cuando la señal vuelve.
        let hubo = false;
        for (const ev of r.accepted) {
          if (ev.kind !== 'answer') continue;
          const itemId = ev.payload.itemId;
          const correct = ev.payload.correct;
          if (typeof itemId !== 'string' || typeof correct !== 'boolean') continue;
          this.aplicar({ type: 'responde', studentId: msg.studentId, itemId, correct });
          this.emitir({ tipo: 'respuesta', studentId: msg.studentId, correct });
          hubo = true;
        }
        if (hubo) this.programarTick();

        maybeCompact(this.opts.log, this.opts.snapshots, msg.studentId);
        return;
      }

      case 'pull': {
        if (par.studentId !== msg.studentId) return;
        const b = bootstrap(this.opts.log, this.opts.snapshots, msg.studentId, msg.sinceSeq);
        if (b.mode === 'aldia') {
          this.enviar(par, { t: 'delta', studentId: msg.studentId, events: [], headSeq: b.headSeq });
        } else if (b.mode === 'delta') {
          this.enviar(par, {
            t: 'delta',
            studentId: msg.studentId,
            events: b.events,
            headSeq: b.headSeq,
          });
        } else {
          this.enviar(par, {
            t: 'claimed',
            studentId: msg.studentId,
            snapshot: b.snapshot,
            throughSeq: b.throughSeq,
          });
        }
        return;
      }

      case 'ping':
        this.enviar(par, { t: 'pong', ts: msg.ts });
        return;

      default:
        // Mensajes de host llegando al host: alguien está confundido. Se ignora.
        return;
    }
  }
}
