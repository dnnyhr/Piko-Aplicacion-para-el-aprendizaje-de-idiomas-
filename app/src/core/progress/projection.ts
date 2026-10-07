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
import { sacuanjochesPorLeccion } from './arbol';
import { floresDeMinijuego } from '../minijuegos/premios';
import { ID_MUSICA } from '../canciones/cancion';
import { LOGROS } from '../logros/catalogo';
import { cumple } from '../logros/evaluar';

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
  /** Lecciones (rondas) terminadas. */
  lessons: number;
  /**
   * Sacuanjoches acumuladas. Como el XP, nunca baja: hacer crecer el árbol no
   * las gasta. Ver `arbol.ts`.
   */
  sacuanjoches: number;
  /**
   * El último día en que cada minijuego dio flores, por `clavePremio`
   * (juego, lengua y nivel). Es lo que impide juntar sacuanjoches repitiendo
   * la misma partida: una vez por día, y después sólo práctica.
   */
  premiosJuegos: Record<string, string>;
  /**
   * Las canciones de «La Música de Piko» completadas (con al menos la mitad
   * de las respuestas buenas), por id, ordenadas. Para el perfil y para
   * abrir las canciones del nivel siguiente.
   */
  cancionesCompletas: string[];

  // --- Lo que cuentan los logros (ver `core/logros/`).

  /** El último día con alguna respuesta, lección o partida, en hora de Nicaragua (`AAAA-MM-DD`). */
  ultimoDia: string;
  /** Días seguidos con estudio hasta `ultimoDia`. */
  rachaDias: number;
  /** La racha más larga de días seguidos con estudio. */
  mejorRachaDias: number;
  /**
   * Por lengua, las palabras aprendidas (ítems acertados al menos una vez),
   * como huellas cortas de su id y sólo hasta lo que pide el logro más alto
   * de esa lengua: el snapshot que viaja por el wifi del aula tiene que
   * seguir siendo chico (ver `topePalabras`).
   */
  aprendidas: Record<string, string[]>;
  /** Las lenguas practicadas, ordenadas. */
  lenguas: string[];
  /** Partidas terminadas por minijuego (incluye la música, `musica`). */
  partidas: Record<string, number>;
  /** Veces que se unió a una clase en vivo. */
  clases: number;
  /** Las claves de los hitos hechos (p. ej. `piko`), ordenadas. */
  hitos: string[];
  /** Los logros que trajo un código canjeado: id → código. */
  canjes: Record<string, string>;
  /** Los logros desbloqueados: id → cuándo (el `createdAt` del evento que lo logró). */
  logros: Record<string, number>;

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
    lessons: 0,
    sacuanjoches: 0,
    premiosJuegos: {},
    cancionesCompletas: [],
    ultimoDia: '',
    rachaDias: 0,
    mejorRachaDias: 0,
    aprendidas: {},
    lenguas: [],
    partidas: {},
    clases: 0,
    hitos: [],
    canjes: {},
    logros: {},
    lastActiveAt: 0,
    throughSeq: 0,
  };
}

/**
 * El día de un instante en hora de Nicaragua (UTC−6 todo el año, sin horario
 * de verano). Fijo y no el del teléfono: así la racha da igual en todos los
 * teléfonos que tengan los mismos eventos.
 */
export function diaNicaragua(ms: number): string {
  return new Date(ms - 6 * 3_600_000).toISOString().slice(0, 10);
}

const numeroDeDia = (d: string): number => Date.parse(`${d}T00:00:00Z`) / 86_400_000;

/**
 * Cuántas palabras de cada lengua vale la pena recordar: las que pide el
 * logro de palabras más alto de esa lengua. Más allá no cambia ningún logro.
 */
const TOPE_PALABRAS: Record<string, number> = {};
for (const l of LOGROS) {
  if (l.condicion.tipo === 'palabras') {
    TOPE_PALABRAS[l.condicion.lengua] = Math.max(TOPE_PALABRAS[l.condicion.lengua] ?? 0, l.condicion.n);
  }
}

export function topePalabras(lengua: string): number {
  return TOPE_PALABRAS[lengua] ?? 0;
}

/** Huella corta y estable de un id (FNV-1a de 32 bits, en base 36). */
export function huella(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Agrega `v` a una lista ordenada sin repetidos. Devuelve si era nuevo. */
function sumar(lista: string[], v: string): boolean {
  if (lista.includes(v)) return false;
  lista.push(v);
  lista.sort();
  return true;
}

/** Con qué se identifica un minijuego para el tope diario de flores. */
export function clavePremio(game: string, lang: string, level: string): string {
  return `${game}:${lang}:${level}`;
}

/** Si ese minijuego ya dio flores el día `day`. */
export function yaPremiado(state: StudentState, clave: string, day: string): boolean {
  return state.premiosJuegos[clave] === day;
}

export function cloneState(s: StudentState): StudentState {
  const skills: Record<string, SkillState> = {};
  for (const k of Object.keys(s.skills)) skills[k] = { ...(s.skills[k] as SkillState) };
  // Un snapshot guardado por una versión anterior de la app no trae los campos
  // del árbol: arrancan en cero y los eventos posteriores los van sumando.
  return {
    ...s,
    skills,
    packsDone: s.packsDone.slice(),
    lessons: s.lessons ?? 0,
    sacuanjoches: s.sacuanjoches ?? 0,
    premiosJuegos: { ...(s.premiosJuegos ?? {}) },
    cancionesCompletas: (s.cancionesCompletas ?? []).slice(),
    ultimoDia: s.ultimoDia ?? '',
    rachaDias: s.rachaDias ?? 0,
    mejorRachaDias: s.mejorRachaDias ?? 0,
    aprendidas: Object.fromEntries(Object.entries(s.aprendidas ?? {}).map(([k, v]) => [k, v.slice()])),
    lenguas: (s.lenguas ?? []).slice(),
    partidas: { ...(s.partidas ?? {}) },
    clases: s.clases ?? 0,
    hitos: (s.hitos ?? []).slice(),
    canjes: { ...(s.canjes ?? {}) },
    logros: { ...(s.logros ?? {}) },
  };
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

/** Aplica un evento y anota los logros que ese evento desbloqueó, con su fecha. */
function step(state: StudentState, ev: ProgressEvent): void {
  aplicar(state, ev);
  for (const l of LOGROS) {
    if (state.logros[l.id] !== undefined) continue;
    if (cumple(l, state) || state.canjes[l.id] !== undefined) state.logros[l.id] = ev.createdAt;
  }
}

/**
 * Anota un día de estudio. Los eventos llegan en orden, así que alcanza con
 * mirar el último día: el mismo, nada; el siguiente, la racha sigue; más
 * adelante, empieza otra. Uno anterior (un evento viejo que llegó tarde por
 * la red) no la cambia.
 */
function estudio(state: StudentState, ev: ProgressEvent): void {
  const dia = diaNicaragua(ev.createdAt);
  if (state.ultimoDia && dia <= state.ultimoDia) return;
  const seguido = state.ultimoDia !== '' && numeroDeDia(dia) === numeroDeDia(state.ultimoDia) + 1;
  state.rachaDias = seguido ? state.rachaDias + 1 : 1;
  state.ultimoDia = dia;
  if (state.rachaDias > state.mejorRachaDias) state.mejorRachaDias = state.rachaDias;
}

/** Aplica un evento sobre el estado *in situ*. */
function aplicar(state: StudentState, ev: ProgressEvent): void {
  if (typeof ev.seq === 'number' && ev.seq > state.throughSeq) state.throughSeq = ev.seq;
  if (ev.createdAt > state.lastActiveAt) state.lastActiveAt = ev.createdAt;

  switch (ev.kind) {
    case 'answer': {
      const a = readAnswer(ev.payload);
      if (!a) return;
      estudio(state, ev);
      // La lengua es el comienzo de la habilidad: `eng.saludos` → `eng`.
      const lengua = a.skill.split('.')[0] as string;
      sumar(state.lenguas, lengua);
      const tope = topePalabras(lengua);
      if (a.correct && tope > 0) {
        const lista = (state.aprendidas[lengua] ??= []);
        if (lista.length < tope) sumar(lista, huella(a.itemId));
      }

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
      estudio(state, ev);
      if (!state.packsDone.includes(packId)) {
        state.packsDone.push(packId);
        state.packsDone.sort();
      }
      const { correct, total } = ev.payload;
      if (typeof correct === 'number' && typeof total === 'number') {
        state.lessons += 1;
        state.sacuanjoches += sacuanjochesPorLeccion(correct, total);
      }
      return;
    }

    case 'gameDone': {
      const { game, lang, level, correct, total, day, streak } = ev.payload;
      if (typeof game !== 'string' || typeof lang !== 'string' || typeof level !== 'string') return;
      if (typeof correct !== 'number' || typeof total !== 'number' || typeof day !== 'string') return;
      estudio(state, ev);
      state.partidas[game] = (state.partidas[game] ?? 0) + 1;
      if (game !== ID_MUSICA) sumar(state.lenguas, lang);
      const clave = clavePremio(game, lang, level);
      const flores = floresDeMinijuego({
        game,
        correct,
        total,
        streak: typeof streak === 'number' ? streak : undefined,
      });
      if (flores > 0 && !yaPremiado(state, clave, day)) {
        state.sacuanjoches += flores;
        state.premiosJuegos[clave] = day;
      }
      // Una canción cuenta como completada aunque hoy ya hubiera dado flores.
      // En la música, `level` es el id de la canción.
      if (game === ID_MUSICA && flores > 0 && !state.cancionesCompletas.includes(level)) {
        state.cancionesCompletas.push(level);
        state.cancionesCompletas.sort();
      }
      return;
    }

    case 'joinedSession':
      state.clases += 1;
      return;

    case 'hito': {
      const clave = ev.payload.clave;
      if (typeof clave === 'string' && clave.length > 0 && clave.length <= 64) sumar(state.hitos, clave);
      return;
    }

    case 'canje': {
      // El logro tiene que existir y pedir código: un canje no desbloquea un
      // logro que se gana jugando.
      const { codigo, logro } = ev.payload;
      if (typeof codigo !== 'string' || typeof logro !== 'string') return;
      const l = LOGROS.find((x) => x.id === logro);
      if (l?.condicion.tipo === 'codigo' && state.canjes[logro] === undefined) state.canjes[logro] = codigo;
      return;
    }
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
