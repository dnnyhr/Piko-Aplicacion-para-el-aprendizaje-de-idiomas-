/**
 * Proyección: eventos → estado.
 *
 * Determinista por contrato. Dos dispositivos con el mismo conjunto de eventos
 * llegan al mismo `StudentState` bit a bit; de eso depende que el progreso
 * pueda viajar entre teléfonos sin que nadie sea la "fuente de verdad".
 *
 * Regla de diseño de Piko: el XP nunca baja. Equivocarse rinde menos, no resta.
 */

import { compareEvents, type AnswerPayload, type ProgressEvent } from './events';

export const XP_ACIERTO = 10;
export const XP_INTENTO = 2;
/** Peso del último intento en el promedio móvil de dominio. */
export const ALPHA_DOMINIO = 0.3;

export interface SkillState {
  seen: number;
  correct: number;
  /** Aciertos seguidos en esta habilidad. */
  streak: number;
  /** Promedio móvil exponencial de aciertos, en [0,1]. */
  mastery: number;
  lastAt: number;
}

export interface StudentState {
  studentId: string;
  xp: number;
  answered: number;
  correct: number;
  streak: number;
  bestStreak: number;
  skills: Record<string, SkillState>;
  /** Ids de paquetes terminados, ordenados para que el estado sea comparable. */
  packsDone: string[];
  lastActiveAt: number;
  /** Mayor `seq` aplicado. Los eventos locales sin sincronizar no lo mueven. */
  throughSeq: number;
}

export function emptyState(studentId: string): StudentState {
  return {
    studentId,
    xp: 0,
    answered: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    skills: {},
    packsDone: [],
    lastActiveAt: 0,
    throughSeq: 0,
  };
}

export function cloneState(s: StudentState): StudentState {
  const skills: Record<string, SkillState> = {};
  for (const k of Object.keys(s.skills)) skills[k] = { ...(s.skills[k] as SkillState) };
  return { ...s, skills, packsDone: s.packsDone.slice() };
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;

function emptySkill(): SkillState {
  return { seen: 0, correct: 0, streak: 0, mastery: 0, lastAt: 0 };
}

function readAnswer(payload: Record<string, unknown>): AnswerPayload | null {
  const { itemId, packId, skill, correct, ms } = payload;
  if (typeof itemId !== 'string' || typeof packId !== 'string' || typeof skill !== 'string') {
    return null;
  }
  if (typeof correct !== 'boolean') return null;
  return { itemId, packId, skill, correct, ms: typeof ms === 'number' ? ms : 0 };
}

/** Aplica un evento sobre el estado *in situ*. Uso interno de `project`. */
function step(state: StudentState, ev: ProgressEvent): void {
  if (typeof ev.seq === 'number' && ev.seq > state.throughSeq) state.throughSeq = ev.seq;
  if (ev.createdAt > state.lastActiveAt) state.lastActiveAt = ev.createdAt;

  switch (ev.kind) {
    case 'answer': {
      const a = readAnswer(ev.payload);
      if (!a) return;

      const skill = state.skills[a.skill] ?? emptySkill();
      skill.seen += 1;
      skill.lastAt = ev.createdAt;
      skill.mastery = round6(skill.mastery * (1 - ALPHA_DOMINIO) + (a.correct ? ALPHA_DOMINIO : 0));

      state.answered += 1;
      if (a.correct) {
        skill.correct += 1;
        skill.streak += 1;
        state.correct += 1;
        state.streak += 1;
        if (state.streak > state.bestStreak) state.bestStreak = state.streak;
        // Bonus por racha, con techo: premia sin volverse una carrera.
        state.xp += XP_ACIERTO + Math.min(state.streak, 5);
      } else {
        skill.streak = 0;
        state.streak = 0;
        state.xp += XP_INTENTO;
      }
      state.skills[a.skill] = skill;
      return;
    }

    case 'lessonDone': {
      const packId = ev.payload.packId;
      if (typeof packId !== 'string') return;
      if (!state.packsDone.includes(packId)) {
        state.packsDone.push(packId);
        state.packsDone.sort();
      }
      return;
    }

    case 'joinedSession':
      return;
  }
}

/**
 * Pliega eventos sobre un estado base. Los ordena primero, así que da igual
 * en qué orden hayan llegado por la red.
 */
export function project(
  studentId: string,
  events: readonly ProgressEvent[],
  base?: StudentState,
): StudentState {
  const state = base ? cloneState(base) : emptyState(studentId);
  const ordered = events
    .filter((ev) => ev.studentId === studentId)
    .slice()
    .sort(compareEvents);
  for (const ev of ordered) step(state, ev);
  return state;
}

/** Dominio general del estudiante: promedio de sus habilidades. 0 si no hay datos. */
export function overallMastery(state: StudentState): number {
  const keys = Object.keys(state.skills);
  if (keys.length === 0) return 0;
  let sum = 0;
  for (const k of keys) sum += (state.skills[k] as SkillState).mastery;
  return round6(sum / keys.length);
}

export function accuracy(state: StudentState): number {
  if (state.answered === 0) return 0;
  return round6(state.correct / state.answered);
}
