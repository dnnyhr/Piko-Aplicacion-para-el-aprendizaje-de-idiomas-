/**
 * La sesión de aula, como reductor puro.
 *
 * El host es el dueño de este estado; los clientes sólo reciben proyecciones
 * de él (`roundStart`, `tick`, `roundEnd`). Mantenerlo puro y serializable es
 * lo que permite que el host sobreviva a su propia caída: se guarda, se
 * recarga, y la sala sigue donde iba.
 */

export type FaseSesion = 'lobby' | 'ronda' | 'resultados' | 'terminada';

export interface MarcadorFila {
  studentId: string;
  correct: number;
  answered: number;
  xp: number;
}

export interface SesionState {
  sessionId: string;
  fase: FaseSesion;
  ronda: number;
  /** Ítems de la ronda en curso, en el orden en que se juegan. */
  itemIds: string[];
  /** Epoch ms del host en que termina la ronda. 0 fuera de ronda. */
  endsAt: number;
  /** Estudiantes que reclamaron identidad en esta sesión. */
  presentes: string[];
  marcador: Record<string, MarcadorFila>;
}

export type SesionAction =
  | { type: 'entra'; studentId: string }
  | { type: 'sale'; studentId: string }
  | { type: 'iniciarRonda'; itemIds: string[]; endsAt: number }
  | { type: 'responde'; studentId: string; itemId: string; correct: boolean }
  | { type: 'terminarRonda' }
  | { type: 'cerrar' };

export function nuevaSesion(sessionId: string): SesionState {
  return {
    sessionId,
    fase: 'lobby',
    ronda: 0,
    itemIds: [],
    endsAt: 0,
    presentes: [],
    marcador: {},
  };
}

const XP_ACIERTO = 10;
const XP_INTENTO = 2;

function filaDe(state: SesionState, studentId: string): MarcadorFila {
  return state.marcador[studentId] ?? { studentId, correct: 0, answered: 0, xp: 0 };
}

export function reduce(state: SesionState, action: SesionAction): SesionState {
  switch (action.type) {
    case 'entra': {
      if (state.fase === 'terminada') return state;
      if (state.presentes.includes(action.studentId)) return state;
      return {
        ...state,
        presentes: [...state.presentes, action.studentId].sort(),
        marcador: { ...state.marcador, [action.studentId]: filaDe(state, action.studentId) },
      };
    }

    case 'sale': {
      // El estudiante se va de la lista de conectados pero conserva su marcador:
      // si se le cortó el wifi a mitad de ronda, al volver no empieza de cero.
      if (!state.presentes.includes(action.studentId)) return state;
      return { ...state, presentes: state.presentes.filter((s) => s !== action.studentId) };
    }

    case 'iniciarRonda': {
      if (state.fase === 'terminada' || state.fase === 'ronda') return state;
      return {
        ...state,
        fase: 'ronda',
        ronda: state.ronda + 1,
        itemIds: action.itemIds.slice(),
        endsAt: action.endsAt,
      };
    }

    case 'responde': {
      if (state.fase !== 'ronda') return state;
      if (!state.itemIds.includes(action.itemId)) return state;

      const fila = filaDe(state, action.studentId);
      const actualizada: MarcadorFila = {
        studentId: action.studentId,
        answered: fila.answered + 1,
        correct: fila.correct + (action.correct ? 1 : 0),
        xp: fila.xp + (action.correct ? XP_ACIERTO : XP_INTENTO),
      };
      return { ...state, marcador: { ...state.marcador, [action.studentId]: actualizada } };
    }

    case 'terminarRonda': {
      if (state.fase !== 'ronda') return state;
      return { ...state, fase: 'resultados', endsAt: 0 };
    }

    case 'cerrar':
      return { ...state, fase: 'terminada', endsAt: 0 };
  }
}

/** Marcador ordenado: primero quien más acertó, desempate estable por id. */
export function tabla(state: SesionState): MarcadorFila[] {
  return Object.values(state.marcador).sort((a, b) => {
    if (a.correct !== b.correct) return b.correct - a.correct;
    if (a.xp !== b.xp) return b.xp - a.xp;
    return a.studentId < b.studentId ? -1 : a.studentId > b.studentId ? 1 : 0;
  });
}
