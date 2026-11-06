/**
 * La sala, desde el teléfono del maestro.
 *
 * Igual que el cliente, el host vive fuera de React: el maestro puede pasear
 * por las pantallas de presets o de lista sin que la sala se caiga.
 */

import { create } from 'zustand';
import { AulaHost, type AlumnoRoster, type HostEvento } from '../../net/host';
import { redDelDispositivo, transporteDelDispositivo } from '../../net/transporte';
import { abrirBase } from '../../db';
import { PUERTO_AULA, PUERTO_FARO, type PresetSummary } from '../../core/protocol/messages';
import type { FilaSemaforo } from '../../core/progress/rezago';
import type { SesionState } from '../../core/session/machine';
import type { Pack } from '../../core/content/schema';
import { ipsDelAnfitrion, mensajeFaro } from '../../net/descubrir';
import type { RedLocal } from '../../net/transport';

/** Cada cuánto se vuelve a mirar la dirección: el hotspot se puede prender después. */
const REVISAR_IP_MS = 4000;
let relojIp: ReturnType<typeof setInterval> | null = null;

function leerIps(red: RedLocal | null): string[] {
  if (!red) return [];
  try {
    return ipsDelAnfitrion(red.info());
  } catch {
    return [];
  }
}

interface AulaAnfitrion {
  host: AulaHost | null;
  abierta: boolean;
  abriendo: boolean;
  error: string | null;
  roomCode: string | null;
  /** La dirección más probable del hotspot, para dictarla si hace falta. */
  ip: string | null;
  /** Todas las direcciones por las que se puede llegar a este teléfono. */
  ips: string[];
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
  ips: [],
  conectados: 0,
  sesion: null,
  semaforo: [],

  async abrir({ packs, roster, preset }) {
    if (get().abierta || get().abriendo) return;
    set({ abriendo: true, error: null });

    const { log, snapshots } = abrirBase();

    let transporte;
    let red: RedLocal | null = null;
    try {
      transporte = transporteDelDispositivo();
      red = redDelDispositivo();
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

    // El faro: cada segundo, "acá está la sala". Así el estudiante la
    // encuentra sin saber la dirección ni barrer la red.
    try {
      red?.iniciarFaro(PUERTO_FARO, mensajeFaro(host.roomCode, PUERTO_AULA));
    } catch {
      /* sin faro quedan la puerta de enlace y el barrido */
    }

    const ips = leerIps(red);
    set({
      host,
      abierta: true,
      abriendo: false,
      roomCode: host.roomCode,
      sesion: host.sesion,
      ip: ips[0] ?? null,
      ips,
    });

    if (relojIp) clearInterval(relojIp);
    relojIp = setInterval(() => {
      const nuevas = leerIps(red);
      if (nuevas.join() !== get().ips.join()) set({ ips: nuevas, ip: nuevas[0] ?? null });
    }, REVISAR_IP_MS);
  },

  iniciarRonda(opts) {
    get().host?.iniciarRonda(opts ?? {});
  },

  terminarRonda() {
    get().host?.terminarRonda();
  },

  async cerrar() {
    if (relojIp) clearInterval(relojIp);
    relojIp = null;
    try {
      redDelDispositivo().detenerFaro();
    } catch {
      /* no había faro */
    }
    await get().host?.cerrar();
    set({
      host: null,
      abierta: false,
      roomCode: null,
      ip: null,
      ips: [],
      conectados: 0,
      sesion: null,
      semaforo: [],
      error: null,
    });
  },
}));
