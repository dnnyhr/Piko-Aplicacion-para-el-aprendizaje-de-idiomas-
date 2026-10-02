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
import { answerEvent, lessonDoneEvent } from '../../core/progress/events';
import { recompensaEntre, type Recompensa } from '../../core/progress/arbol';
import { PACK_MEZCLA } from '../../core/progress/niveles';
import { emptyState, project, type StudentState } from '../../core/progress/projection';
import type { Item } from '../../core/content/schema';
import { PACKS } from '../../../content';

/** De qué paquete viene cada ítem. El contenido va dentro de la app, así que
 * cualquier teléfono puede responderlo, también en el aula. */
const PACK_DE_ITEM = new Map<string, string>();
for (const pack of PACKS) for (const it of pack.items) PACK_DE_ITEM.set(it.id, pack.id);

/**
 * El paquete de una ronda, si todos sus ítems salieron del mismo. Es el que
 * cuenta para el camino de niveles; una ronda mezclada no supera ninguno.
 */
export function packDeRonda(items: readonly Item[]): string {
  let pack: string | null = null;
  for (const it of items) {
    const p = PACK_DE_ITEM.get(it.id);
    if (!p || (pack !== null && p !== pack)) return PACK_MEZCLA;
    pack = p;
  }
  return pack ?? PACK_MEZCLA;
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
        packId: packDeRonda(items),
        correct: correctas,
        total: items.length,
      }),
    );
    get().recomputar();
    return recompensaEntre(antes, get().estado.sacuanjoches);
  },

  recomputar() {
    const { log } = abrirBase();
    const { studentId, base } = get();
    const desde = base?.throughSeq ?? 0;
    const cola = [...log.since(studentId, desde), ...log.pending(studentId)];
    set({ estado: project(studentId, cola, base ?? undefined) });
  },
}));
