/**
 * El progreso del estudiante en este teléfono.
 *
 * Escribe siempre primero en el log local y recién después proyecta el estado.
 * Ese orden es el que hace que nada se pierda si la app se cierra a mitad de
 * ronda o si el wifi del aula desaparece.
 */

import { create } from 'zustand';
import { abrirBase } from '../../db';
import { uuidv4 } from '../../core/ids';
import {
  answerEvent,
  canjeEvent,
  gameDoneEvent,
  hitoEvent,
  lessonDoneEvent,
  type CanjePayload,
  type GameDonePayload,
} from '../../core/progress/events';
import { recompensaEntre, type Recompensa } from '../../core/progress/arbol';
import { emptyState, project, type StudentState } from '../../core/progress/projection';
import type { Item } from '../../core/content/schema';
import { PACKS } from '../../../content';

/** De qué paquete viene cada ítem. El contenido va dentro de la app, así que
 * cualquier teléfono puede responderlo, también en el aula. */
const PACK_DE_ITEM = new Map<string, string>();
for (const pack of PACKS) for (const it of pack.items) PACK_DE_ITEM.set(it.id, pack.id);

/**
 * El paquete del que salió la mayoría de los ítems de una ronda. Con eso se
 * anota la lección en `packsDone` aunque la ronda haya sido mezclada.
 * Empata por id, para que sea determinista.
 */
export function packPrincipal(items: readonly Item[]): string {
  const cuenta = new Map<string, number>();
  for (const it of items) {
    const pack = PACK_DE_ITEM.get(it.id);
    if (pack) cuenta.set(pack, (cuenta.get(pack) ?? 0) + 1);
  }
  let mejor = 'desconocido';
  let max = 0;
  for (const [pack, n] of [...cuenta].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    if (n > max) {
      mejor = pack;
      max = n;
    }
  }
  return mejor;
}

/** Identidad para la práctica en solitario, mientras no haya sala. */
export const ALUMNO_LOCAL = 'local';

interface ProgresoStore {
  studentId: string;
  estado: StudentState;
  /** Snapshot base recibido del maestro, si lo hubo. */
  base: StudentState | null;

  cargar: (studentId?: string) => void;
  /** Cambia de identidad (p. ej. al reclamar un nombre del roster). */
  usarIdentidad: (studentId: string, base?: StudentState | null) => void;
  registrar: (item: Item, packId: string, correct: boolean, ms: number) => void;
  /**
   * Cierra una lección terminada: queda en el log y suma sacuanjoches.
   * Devuelve lo que ganó, para la pantalla de recompensa.
   */
  terminarLeccion: (items: readonly Item[], correctas: number) => Recompensa;
  /**
   * Cierra una partida de minijuego: queda en el log y, si se jugó bien y es
   * la primera vez en el día, suma sacuanjoches (ver `projection.ts`).
   */
  terminarMinijuego: (partida: GameDonePayload) => Recompensa;
  /** Anota un hito para los logros (p. ej. saludar a Piko). Una sola vez por clave. */
  registrarHito: (clave: string) => void;
  /** Guarda un código canjeado: el logro especial queda en el perfil para siempre. */
  registrarCanje: (canje: CanjePayload) => void;
  recomputar: () => void;
}

export const useProgreso = create<ProgresoStore>((set, get) => ({
  studentId: ALUMNO_LOCAL,
  estado: emptyState(ALUMNO_LOCAL),
  base: null,

  cargar(studentId = ALUMNO_LOCAL) {
    set({ studentId });
    get().recomputar();
  },

  usarIdentidad(studentId, base = null) {
    set({ studentId, base });
    get().recomputar();
  },

  registrar(item, packId, correct, ms) {
    const { log, deviceId } = abrirBase();
    const { studentId } = get();

    log.appendLocal(
      answerEvent({
        id: uuidv4(),
        studentId,
        originDevice: deviceId,
        createdAt: Date.now(),
        itemId: item.id,
        packId,
        skill: item.skill,
        correct,
        ms,
      }),
    );
    get().recomputar();
  },

  terminarLeccion(items, correctas) {
    const { log, deviceId } = abrirBase();
    const { studentId } = get();
    const antes = get().estado.sacuanjoches;

    log.appendLocal(
      lessonDoneEvent({
        id: uuidv4(),
        studentId,
        originDevice: deviceId,
        createdAt: Date.now(),
        packId: packPrincipal(items),
        correct: correctas,
        total: items.length,
      }),
    );
    get().recomputar();
    return recompensaEntre(antes, get().estado.sacuanjoches);
  },

  terminarMinijuego(partida) {
    const { log, deviceId } = abrirBase();
    const { studentId } = get();
    const antes = get().estado.sacuanjoches;

    log.appendLocal(
      gameDoneEvent({
        id: uuidv4(),
        studentId,
        originDevice: deviceId,
        createdAt: Date.now(),
        ...partida,
      }),
    );
    get().recomputar();
    return recompensaEntre(antes, get().estado.sacuanjoches);
  },

  registrarHito(clave) {
    if (get().estado.hitos.includes(clave)) return;
    const { log, deviceId } = abrirBase();
    log.appendLocal(hitoEvent({ id: uuidv4(), studentId: get().studentId, originDevice: deviceId, createdAt: Date.now(), clave }));
    get().recomputar();
  },

  registrarCanje(canje) {
    if (get().estado.canjes[canje.logro] !== undefined) return;
    const { log, deviceId } = abrirBase();
    log.appendLocal(canjeEvent({ id: uuidv4(), studentId: get().studentId, originDevice: deviceId, createdAt: Date.now(), ...canje }));
    get().recomputar();
  },

  recomputar() {
    const { log } = abrirBase();
    const { studentId, base } = get();
    const desde = base?.throughSeq ?? 0;
    const cola = [...log.since(studentId, desde), ...log.pending(studentId)];
    set({ estado: project(studentId, cola, base ?? undefined) });
  },
}));
