/**
 * El extremo del estudiante.
 *
 * Asume que la red se va a caer: el wifi de un hotspot en un aula rural no es
 * estable. Por eso todo lo que el estudiante hace se guarda primero en el log
 * local y recién después se empuja al host. Si se corta a mitad de ronda, el
 * niño sigue jugando y lo pendiente viaja cuando vuelve la señal.
 */

import { uuidv4, type Rng } from '../core/ids';
import { LineFramer, LineaDemasiadoLarga, decode, encode } from '../core/protocol/codec';
import {
  PROTOCOL_VERSION,
  PUERTO_AULA,
  type BoardRow,
  type ClientMessage,
  type DeniedCode,
  type PresetSummary,
  type RosterEntry,
} from '../core/protocol/messages';
import type { Item } from '../core/content/schema';
import { answerEvent } from '../core/progress/events';
import { emptyState, project, type StudentState } from '../core/progress/projection';
import { aplicarAck, aplicarDelta, porEnviar } from '../core/sync/delta';
import type { EventLog } from '../core/sync/log';
import type { Conexion, Transporte } from './transport';

export interface ClienteOpts {
  transporte: Transporte;
  deviceId: string;
  log: EventLog;
  appVersion?: string;
  ahora?: () => number;
  rng?: Rng;
  /** Reintentar solo tras una caída. Se apaga en las pruebas deterministas. */
  autoReconectar?: boolean;
}

export type ClienteEvento =
  | { tipo: 'conectado' }
  | { tipo: 'bienvenida'; roomCode: string; roster: RosterEntry[]; preset: PresetSummary | null }
  | { tipo: 'identidad'; studentId: string; estado: StudentState }
  | { tipo: 'rechazo'; code: DeniedCode; reason: string }
  | { tipo: 'ronda'; sessionId: string; items: Item[]; endsAt: number }
  | { tipo: 'marcador'; board: BoardRow[] }
  | { tipo: 'finRonda'; board: BoardRow[] }
  | { tipo: 'estado'; estado: StudentState }
  | { tipo: 'desconectado'; reintentaEnMs: number | null };

const PING_MS = 10_000;
const SIN_RESPUESTA_MS = 30_000;
/**
 * Se agrupan las respuestas antes de empujarlas. Corto, porque de este push
 * depende que el marcador del maestro se vea vivo.
 */
const PUSH_DEBOUNCE_MS = 800;
const ESPERAS = [500, 1000, 2000, 4000, 8000, 15_000];

export class EstudianteCliente {
  private conexion: Conexion | null = null;
  private framer = new LineFramer();
  private oyentes = new Set<(e: ClienteEvento) => void>();

  private studentId: string | null = null;
  private base: StudentState | null = null;
  private estadoActual: StudentState = emptyState('');
  private lastSeq = 0;
  private sessionId: string | null = null;

  private hostIp = '';
  private puerto = PUERTO_AULA;
  private intentos = 0;
  private cerradoAdrede = false;
  private ultimoPong = 0;

  private temporizadorPing: ReturnType<typeof setInterval> | null = null;
  private temporizadorPush: ReturnType<typeof setTimeout> | null = null;
  private temporizadorReintento: ReturnType<typeof setTimeout> | null = null;

  private readonly ahora: () => number;
  private readonly rng: Rng;

  constructor(private opts: ClienteOpts) {
    this.ahora = opts.ahora ?? Date.now;
    this.rng = opts.rng ?? Math.random;
  }

  // ---------------------------------------------------------------- lecturas

  get estado(): StudentState {
    return this.estadoActual;
  }

  get identidad(): string | null {
    return this.studentId;
  }

  get conectado(): boolean {
    return this.conexion !== null;
  }

  get pendientes(): number {
    return this.studentId ? this.opts.log.pending(this.studentId).length : 0;
  }

  on(cb: (e: ClienteEvento) => void): () => void {
    this.oyentes.add(cb);
    return () => this.oyentes.delete(cb);
  }

  // ------------------------------------------------------------------ ciclo

  async conectar(hostIp: string, puerto: number = PUERTO_AULA): Promise<void> {
    this.hostIp = hostIp;
    this.puerto = puerto;
    this.cerradoAdrede = false;
    await this.abrirSocket();
  }

  private async abrirSocket(): Promise<void> {
    const conexion = await this.opts.transporte.conectar(this.hostIp, this.puerto);
    this.conexion = conexion;
    this.framer.reset();
    this.intentos = 0;
    this.ultimoPong = this.ahora();

    conexion.onData((chunk) => this.recibir(chunk));
    conexion.onError(() => conexion.close());
    conexion.onClose(() => this.alCaerse());

    this.enviar({
      t: 'hello',
      v: PROTOCOL_VERSION,
      deviceId: this.opts.deviceId,
      appVersion: this.opts.appVersion ?? '0.1.0',
    });

    // Si ya teníamos identidad, la reclamamos sola: el niño no debería tener
    // que volver a buscar su nombre cada vez que parpadea el wifi.
    if (this.studentId) this.enviar({ t: 'claim', studentId: this.studentId, sinceSeq: this.lastSeq });

    this.temporizadorPing = setInterval(() => this.latir(), PING_MS);
    this.emitir({ tipo: 'conectado' });
  }

  desconectar(): void {
    this.cerradoAdrede = true;
    this.limpiarTemporizadores();
    this.conexion?.close();
    this.conexion = null;
  }

  private limpiarTemporizadores(): void {
    if (this.temporizadorPing) clearInterval(this.temporizadorPing);
    if (this.temporizadorPush) clearTimeout(this.temporizadorPush);
    if (this.temporizadorReintento) clearTimeout(this.temporizadorReintento);
    this.temporizadorPing = null;
    this.temporizadorPush = null;
    this.temporizadorReintento = null;
  }

  private latir(): void {
    if (!this.conexion) return;
    if (this.ahora() - this.ultimoPong > SIN_RESPUESTA_MS) {
      // El socket está vivo para el sistema operativo pero el host no contesta.
      this.conexion.close();
      return;
    }
    this.enviar({ t: 'ping', ts: this.ahora() });
  }

  private alCaerse(): void {
    this.conexion = null;
    if (this.temporizadorPing) clearInterval(this.temporizadorPing);
    this.temporizadorPing = null;

    if (this.cerradoAdrede || this.opts.autoReconectar === false) {
      this.emitir({ tipo: 'desconectado', reintentaEnMs: null });
      return;
    }

    const espera = ESPERAS[Math.min(this.intentos, ESPERAS.length - 1)] as number;
    this.intentos += 1;
    this.emitir({ tipo: 'desconectado', reintentaEnMs: espera });
    this.temporizadorReintento = setTimeout(() => {
      this.abrirSocket().catch(() => this.alCaerse());
    }, espera);
  }

  // ------------------------------------------------------------------ acciones

  /**
   * @param desdeSeq Hasta dónde conoce este teléfono al estudiante, leído de
   * la base local. Sin esto, tras reiniciar la app el cliente pediría todo el
   * historial de nuevo aunque ya lo tuviera guardado.
   */
  reclamar(studentId: string, desdeSeq = 0): void {
    this.studentId = studentId;
    if (desdeSeq > this.lastSeq) this.lastSeq = desdeSeq;
    this.recomputar();
    this.enviar({ t: 'claim', studentId, sinceSeq: this.lastSeq });
  }

  /** Hasta dónde está sincronizado. Se persiste para el próximo arranque. */
  get seq(): number {
    return this.lastSeq;
  }

  /**
   * Registra una respuesta. Escribe primero en local — es lo que hace que el
   * progreso no dependa de que la red esté viva en ese instante.
   */
  responder(args: {
    item: Item;
    packId: string;
    correct: boolean;
    ms: number;
  }): void {
    if (!this.studentId) return;

    const ev = answerEvent({
      id: uuidv4(this.rng),
      studentId: this.studentId,
      originDevice: this.opts.deviceId,
      createdAt: this.ahora(),
      itemId: args.item.id,
      packId: args.packId,
      skill: args.item.skill,
      correct: args.correct,
      ms: args.ms,
    });
    this.opts.log.appendLocal(ev);
    this.recomputar();
    this.programarPush();
  }

  /** Empuja lo pendiente y pide lo que falte. Idempotente: se puede llamar de más. */
  sincronizar(): void {
    if (!this.studentId || !this.conexion) return;
    const pendientes = porEnviar(this.opts.log, this.studentId);
    if (pendientes.length > 0) {
      this.enviar({ t: 'push', studentId: this.studentId, events: pendientes });
    }
    this.enviar({ t: 'pull', studentId: this.studentId, sinceSeq: this.lastSeq });
  }

  private programarPush(): void {
    if (this.temporizadorPush) return;
    this.temporizadorPush = setTimeout(() => {
      this.temporizadorPush = null;
      this.sincronizar();
    }, PUSH_DEBOUNCE_MS);
  }

  // ------------------------------------------------------------------ interno

  private emitir(e: ClienteEvento): void {
    for (const cb of this.oyentes) cb(e);
  }

  private enviar(msg: ClientMessage): void {
    if (!this.conexion) return;
    try {
      this.conexion.send(encode(msg));
    } catch {
      // Se reintenta en la próxima sincronización; nada se pierde.
    }
  }

  /**
   * Reconstruye el estado: snapshot recibido del host + todo lo que vino o se
   * creó después. Con eso, un evento que llega dos veces no cuenta doble.
   */
  private recomputar(): void {
    if (!this.studentId) return;
    const baseSeq = this.base?.throughSeq ?? 0;
    const cola = [
      ...this.opts.log.since(this.studentId, baseSeq),
      ...this.opts.log.pending(this.studentId),
    ];
    this.estadoActual = project(this.studentId, cola, this.base ?? undefined);
    this.emitir({ tipo: 'estado', estado: this.estadoActual });
  }

  private recibir(chunk: string): void {
    let lineas: string[];
    try {
      lineas = this.framer.push(chunk);
    } catch (err) {
      if (err instanceof LineaDemasiadoLarga) {
        this.conexion?.close();
        return;
      }
      throw err;
    }

    for (const linea of lineas) {
      const msg = decode(linea);
      if (!msg) continue;

      switch (msg.t) {
        case 'welcome':
          this.emitir({
            tipo: 'bienvenida',
            roomCode: msg.roomCode,
            roster: msg.roster,
            preset: msg.preset,
          });
          break;

        case 'claimed':
          this.studentId = msg.studentId;
          if (msg.snapshot) {
            this.base = msg.snapshot;
            this.lastSeq = Math.max(this.lastSeq, msg.throughSeq);
          } else {
            this.lastSeq = Math.max(this.lastSeq, msg.throughSeq);
          }
          this.recomputar();
          this.emitir({ tipo: 'identidad', studentId: msg.studentId, estado: this.estadoActual });
          // Al reconectar puede haber quedado algo sin empujar.
          this.sincronizar();
          break;

        case 'denied':
          this.emitir({ tipo: 'rechazo', code: msg.code, reason: msg.reason });
          break;

        case 'delta':
          this.lastSeq = aplicarDelta(this.opts.log, msg.events, this.lastSeq);
          if (msg.headSeq > this.lastSeq) {
            // El host tiene más de lo que nos cupo en este lote: seguimos pidiendo.
            this.enviar({ t: 'pull', studentId: msg.studentId, sinceSeq: this.lastSeq });
          }
          this.recomputar();
          break;

        case 'ack':
          aplicarAck(this.opts.log, msg.studentId, msg.assigned);
          this.lastSeq = Math.max(this.lastSeq, msg.headSeq);
          this.recomputar();
          break;

        case 'roundStart':
          this.sessionId = msg.sessionId;
          this.emitir({
            tipo: 'ronda',
            sessionId: msg.sessionId,
            items: msg.items,
            endsAt: msg.endsAt,
          });
          break;

        case 'tick':
          this.emitir({ tipo: 'marcador', board: msg.board });
          break;

        case 'roundEnd':
          this.emitir({ tipo: 'finRonda', board: msg.board });
          this.sincronizar();
          break;

        case 'pong':
          this.ultimoPong = this.ahora();
          break;

        default:
          break;
      }
    }
  }
}
