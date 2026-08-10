/**
 * La sala, desde el teléfono del maestro.
 *
 * Igual que el cliente, el host vive fuera de React: el maestro puede pasear
 * por las pantallas de presets o de lista sin que la sala se caiga.
 */

import { create } from 'zustand';
import { AulaHost, type AlumnoRoster, type HostEvento } from '../../net/host';
import { transporteDelDispositivo } from '../../net/transporte';
import { abrirBase } from '../../db';
import { PUERTO_AULA, type PresetSummary } from '../../core/protocol/messages';
import type { FilaSemaforo } from '../../core/progress/rezago';
import type { SesionState } from '../../core/session/machine';
import type { Pack } from '../../core/content/schema';
import { miIp } from '../../net/descubrir';

interface AulaAnfitrion {
  host: AulaHost | null;
  abierta: boolean;
  abriendo: boolean;
  error: string | null;
  roomCode: string | null;
  ip: string | null;
  conectados: number;
  sesion: SesionState | null;
  semaforo: FilaSemaforo[];

  abrir: (args: {
    packs: readonly Pack[];
    roster: readonly AlumnoRoster[];
    preset: PresetSummary | null;
  }) => Promise<void>;
  iniciarRonda: (opts?: { count?: number; duracionMs?: number }) => void;
  terminarRonda: () => void;
  cerrar: () => Promise<void>;
}

export const useAnfitrion = create<AulaAnfitrion>((set, get) => ({
  host: null,
  abierta: false,
  abriendo: false,
  error: null,
  roomCode: null,
  ip: null,
  conectados: 0,
  sesion: null,
  semaforo: [],

  async abrir({ packs, roster, preset }) {
    if (get().abierta || get().abriendo) return;
    set({ abriendo: true, error: null });

    const { log, snapshots } = abrirBase();

    let transporte;
    try {
      transporte = transporteDelDispositivo();
    } catch (err) {
      set({ abriendo: false, error: (err as Error).message });
      return;
    }

    const host = new AulaHost({ transporte, packs, roster, preset, log, snapshots });

    host.on((e: HostEvento) => {
      switch (e.tipo) {
        case 'conexion':
          set({ conectados: e.conexiones });
          break;
        case 'salida':
          set({ conectados: host.conexiones });
          break;
        case 'sesion':
          set({ sesion: e.sesion, semaforo: host.semaforo() });
          break;
        case 'respuesta':
          set({ semaforo: host.semaforo() });
          break;
        case 'aviso':
          set({ error: e.mensaje });
          break;
      }
    });

    try {
      await host.abrir(PUERTO_AULA);
    } catch (err) {
      set({
        abriendo: false,
        error:
          'No se pudo abrir la sala. Revisá que el hotspot esté encendido y que no haya otra clase abierta en este teléfono.',
      });
      return;
    }

    set({
      host,
      abierta: true,
      abriendo: false,
      roomCode: host.roomCode,
      sesion: host.sesion,
      ip: await miIp(),
    });
  },

  iniciarRonda(opts) {
    get().host?.iniciarRonda(opts ?? {});
  },

  terminarRonda() {
    get().host?.terminarRonda();
  },

  async cerrar() {
    await get().host?.cerrar();
    set({
      host: null,
      abierta: false,
      roomCode: null,
      ip: null,
      conectados: 0,
      sesion: null,
      semaforo: [],
      error: null,
    });
  },
}));
