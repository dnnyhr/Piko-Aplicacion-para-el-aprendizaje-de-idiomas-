/**
 * El cliente del aula, visto desde la interfaz.
 *
 * La conexión vive fuera del ciclo de vida de React a propósito: si el
 * estudiante navega entre pantallas o la vista se vuelve a montar, el socket
 * y el progreso pendiente siguen intactos.
 */

import { create } from 'zustand';
import { EstudianteCliente, type ClienteEvento } from '../../net/client';
import { transporteDelDispositivo } from '../../net/transporte';
import { abrirBase, recordarAlumno, recordarHost } from '../../db';
import { guardarLastSeq, leerLastSeq } from '../../db/sqliteLog';
import {
  PUERTO_AULA,
  type BoardRow,
  type PresetSummary,
  type RosterEntry,
} from '../../core/protocol/messages';
import type { Item } from '../../core/content/schema';
import { useProgreso } from '../progreso/store';

export type EstadoConexion = 'suelto' | 'conectando' | 'conectado' | 'caido';

interface AulaCliente {
  cliente: EstudianteCliente | null;
  conexion: EstadoConexion;
  hostIp: string | null;
  roomCode: string | null;
  roster: RosterEntry[];
  preset: PresetSummary | null;
  studentId: string | null;
  rechazo: string | null;

  sessionId: string | null;
  items: Item[] | null;
  terminaEn: number;
  board: BoardRow[];
  reintentaEnMs: number | null;

  conectar: (ip: string, puerto?: number) => Promise<void>;
  reclamar: (studentId: string) => void;
  responder: (item: Item, packId: string, acerto: boolean, ms: number) => void;
  limpiarRonda: () => void;
  salir: () => void;
}

export const useAulaCliente = create<AulaCliente>((set, get) => ({
  cliente: null,
  conexion: 'suelto',
  hostIp: null,
  roomCode: null,
  roster: [],
  preset: null,
  studentId: null,
  rechazo: null,
  sessionId: null,
  items: null,
  terminaEn: 0,
  board: [],
  reintentaEnMs: null,

  async conectar(ip, puerto = PUERTO_AULA) {
    const { sql, log, deviceId } = abrirBase();
    get().cliente?.desconectar();

    const cliente = new EstudianteCliente({
      transporte: transporteDelDispositivo(),
      deviceId,
      log,
      autoReconectar: true,
    });

    cliente.on((e: ClienteEvento) => {
      switch (e.tipo) {
        case 'conectado':
          set({ conexion: 'conectado', reintentaEnMs: null, rechazo: null });
          break;

        case 'bienvenida':
          set({ roomCode: e.roomCode, roster: e.roster, preset: e.preset });
          break;

        case 'identidad':
          set({ studentId: e.studentId, rechazo: null });
          recordarAlumno(sql, e.studentId);
          guardarLastSeq(sql, e.studentId, cliente.seq);
          // El progreso de la interfaz pasa a colgar del estado que mandó el
          // maestro: así es como el niño recupera lo suyo en otro teléfono.
          useProgreso.getState().usarIdentidad(e.studentId, e.estado);
          break;

        case 'rechazo':
          set({ rechazo: e.reason });
          break;

        case 'ronda':
          set({ sessionId: e.sessionId, items: e.items, terminaEn: e.endsAt });
          break;

        case 'marcador':
          set({ board: e.board });
          break;

        case 'finRonda':
          set({ board: e.board, items: null });
          break;

        case 'estado': {
          const sid = get().studentId;
          if (sid) guardarLastSeq(sql, sid, cliente.seq);
          useProgreso.getState().recomputar();
          break;
        }

        case 'desconectado':
          set({ conexion: 'caido', reintentaEnMs: e.reintentaEnMs });
          break;
      }
    });

    set({ cliente, conexion: 'conectando', hostIp: ip, rechazo: null });
    try {
      await cliente.conectar(ip, puerto);
      recordarHost(sql, ip);
    } catch (err) {
      set({ conexion: 'suelto' });
      throw err;
    }
  },

  reclamar(studentId) {
    const cliente = get().cliente;
    if (!cliente) return;
    const { sql } = abrirBase();
    useProgreso.getState().cargar(studentId);
    // Se manda hasta dónde conoce este teléfono al estudiante: si ya lo
    // conoce, el maestro devuelve nada más la diferencia.
    cliente.reclamar(studentId, leerLastSeq(sql, studentId));
  },

  responder(item, packId, acerto, ms) {
    const cliente = get().cliente;
    if (cliente) {
      // El cliente escribe primero en el log local y agrupa el empuje al
      // maestro unos cientos de milisegundos después.
      cliente.responder({ item, packId, correct: acerto, ms });
      useProgreso.getState().recomputar();
    } else {
      useProgreso.getState().registrar(item, packId, acerto, ms);
    }
  },

  limpiarRonda() {
    set({ items: null, sessionId: null, terminaEn: 0 });
  },

  salir() {
    const { cliente, studentId } = get();
    if (cliente && studentId) {
      const { sql } = abrirBase();
      guardarLastSeq(sql, studentId, cliente.seq);
    }
    cliente?.desconectar();
    set({
      cliente: null,
      conexion: 'suelto',
      roomCode: null,
      roster: [],
      preset: null,
      studentId: null,
      items: null,
      sessionId: null,
      board: [],
      rechazo: null,
    });
  },
}));
