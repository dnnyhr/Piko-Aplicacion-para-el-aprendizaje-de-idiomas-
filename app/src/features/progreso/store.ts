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
import { answerEvent } from '../../core/progress/events';
import { emptyState, project, type StudentState } from '../../core/progress/projection';
import type { Item } from '../../core/content/schema';

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

  recomputar() {
    const { log } = abrirBase();
    const { studentId, base } = get();
    const desde = base?.throughSeq ?? 0;
    const cola = [...log.since(studentId, desde), ...log.pending(studentId)];
    set({ estado: project(studentId, cola, base ?? undefined) });
  },
}));
