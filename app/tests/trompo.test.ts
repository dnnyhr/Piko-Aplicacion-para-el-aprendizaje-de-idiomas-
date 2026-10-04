import { describe, expect, it } from 'vitest';
import { mulberry32, uuidv4 } from '@core/ids';
import { normalizar } from '@core/content/verificar';
import { gameDoneEvent, lessonDoneEvent, type ProgressEvent } from '@core/progress/events';
import { project, type StudentState } from '@core/progress/projection';
import { nivelesDe, nivelSugerido, vocabularioAprendido, type NivelMinijuego } from '@core/minijuegos/vocabulario';
import {
  armarRetos,
  FUERZA_ACIERTO,
  FUERZA_FALLO,
  FUERZA_INICIAL,
  GRAN_RACHA,
  ID_TROMPO,
  MAX_RETOS,
  META,
  OPCIONES,
  partidaNueva,
  rachaFestejada,
  responder,
  sacuanjochesPorTrompo,
  SEGUNDOS,
  type EstadoTrompo,
} from '@core/minijuegos/trompo';
import { PACKS } from '../content';

function conLecciones(ids: string[]): StudentState {
  const rng = mulberry32(3);
  const evs: ProgressEvent[] = ids.map((packId, i) =>
    lessonDoneEvent({ id: uuidv4(rng), studentId: 'ana', originDevice: 'd', createdAt: 1000 + i, packId, correct: 5, total: 5 }),
  );
  return project('ana', evs);
}

const TODO_ENG = PACKS.filter((p) => p.lang === 'eng').map((p) => p.id);
const TODO_MIQ = PACKS.filter((p) => p.lang === 'miq' && !p.desde).map((p) => p.id);
const DIBUJOS = new Set(['perro', 'pez', 'gato', 'vaca', 'pájaro', 'caballo', 'libro', 'árbol', 'casa']);

/** Juega una partida con las respuestas dadas, hasta que termina. */
function jugar(respuestas: boolean[]): EstadoTrompo {
  let e = partidaNueva();
  for (const r of respuestas) e = responder(e, r);
  return e;
}

describe('trompo: la fuerza', () => {
  it('acertar le da fuerza, con techo', () => {
    const e = jugar([true]);
    expect(e.fuerza).toBe(FUERZA_INICIAL + FUERZA_ACIERTO);
    expect(jugar([true, true, true, true, true]).fuerza).toBeLessThanOrEqual(100);
  });

  it('fallar le quita fuerza, y sin fuerza cae', () => {
    expect(jugar([false]).fuerza).toBe(FUERZA_INICIAL - FUERZA_FALLO);
    const e = jugar([false, false, false]);
    expect(e.fuerza).toBe(0);
    expect(e.fin).toBe('caido');
  });

  it('con META aciertos se completa', () => {
    const e = jugar(Array(META).fill(true));
    expect(e.fin).toBe('completado');
    expect(e.aciertos).toBe(META);
  });

  it('una partida terminada no cambia más', () => {
    const e = jugar(Array(META).fill(true));
    expect(responder(e, false)).toBe(e);
  });

  it('mezclando, los aciertos sostienen el trompo', () => {
    const e = jugar([true, false, true, true, false, true, true, true]);
    expect(e.fin).toBe('completado');
    expect(e.mejorRacha).toBe(3);
  });

  it('festeja la racha a los 3 y la gran racha a los 5', () => {
    expect(rachaFestejada(2)).toBeNull();
    expect(rachaFestejada(3)).toBe('racha');
    expect(rachaFestejada(4)).toBeNull();
    expect(rachaFestejada(GRAN_RACHA)).toBe('gran');
  });

  it('los puntos crecen con la racha', () => {
    expect(jugar([true, true, true]).puntos).toBeGreaterThan(3 * jugar([true]).puntos);
  });
});

describe('trompo: retos', () => {
  const niveles: NivelMinijuego[] = ['inicial', 'intermedio', 'avanzado'];

  it('menos tiempo y más opciones al subir de nivel', () => {
    expect(SEGUNDOS.inicial).toBeGreaterThan(SEGUNDOS.intermedio);
    expect(SEGUNDOS.intermedio).toBeGreaterThan(SEGUNDOS.avanzado);
    expect(OPCIONES.inicial).toBeLessThan(OPCIONES.intermedio);
  });

  for (const lang of ['eng', 'miq'] as const) {
    for (const nivel of niveles) {
      it(`${lang} ${nivel}: retos bien armados, sólo con lo aprendido`, () => {
        const s = conLecciones(lang === 'eng' ? TODO_ENG : TODO_MIQ);
        const vocab = vocabularioAprendido(PACKS, s, lang);
        for (let semilla = 1; semilla <= 20; semilla++) {
          const retos = armarRetos(vocab, nivel, s, mulberry32(semilla), (es) => DIBUJOS.has(es));
          expect(retos).toHaveLength(MAX_RETOS);
          for (const r of retos) {
            expect(r.opciones).toHaveLength(OPCIONES[nivel]);
            expect(new Set(r.opciones.map(normalizar)).size).toBe(r.opciones.length);
            expect(r.opciones[r.correcta]).toBe(r.opcionesEnMeta ? r.palabra.meta : r.palabra.es);
            for (const op of r.opciones) {
              expect(vocab.some((p) => (r.opcionesEnMeta ? p.meta : p.es) === op)).toBe(true);
            }
            if (r.tipo === 'imagen') expect(DIBUJOS.has(r.palabra.es)).toBe(true);
          }
          const tipos = new Set(retos.map((r) => r.tipo));
          if (nivel === 'inicial') {
            expect(tipos.has('audio')).toBe(false);
            expect(retos.every((r) => !r.palabra.frase)).toBe(true);
          }
          if (nivel === 'avanzado') {
            expect(tipos.has('audio')).toBe(true);
            expect(retos.every((r) => r.palabra.frase)).toBe(true);
          }
        }
      });
    }
  }

  it('sin dibujos, el reto de imagen sale como traducción', () => {
    const s = conLecciones(TODO_ENG);
    const retos = armarRetos(vocabularioAprendido(PACKS, s, 'eng'), 'inicial', s, mulberry32(1));
    expect(retos.some((r) => r.tipo === 'imagen')).toBe(false);
  });

  it('los niveles se abren con las lecciones', () => {
    expect(nivelSugerido(nivelesDe(PACKS, conLecciones([]), 'eng', OPCIONES))).toBeNull();
    expect(nivelSugerido(nivelesDe(PACKS, conLecciones(['eng.animales.1']), 'eng', OPCIONES))).toBe('inicial');
    expect(nivelSugerido(nivelesDe(PACKS, conLecciones(TODO_MIQ), 'miq', OPCIONES))).toBe('avanzado');
  });
});

describe('trompo: sacuanjoches', () => {
  it('sólo si el trompo siguió girando hasta la meta', () => {
    expect(sacuanjochesPorTrompo(META - 1, META - 1, META - 1)).toBe(0);
    expect(sacuanjochesPorTrompo(META, 9, 2)).toBe(3);
    expect(sacuanjochesPorTrompo(META, 7, 3)).toBe(4);
    expect(sacuanjochesPorTrompo(META, META, META)).toBe(5);
  });

  function partida(extra: Partial<Parameters<typeof gameDoneEvent>[0]>, n: number): ProgressEvent {
    return gameDoneEvent({
      id: `t${n}`,
      studentId: 'ana',
      originDevice: 'd',
      createdAt: 9000 + n,
      game: ID_TROMPO,
      lang: 'eng',
      level: 'inicial',
      correct: META,
      total: META,
      streak: META,
      day: '2026-10-04',
      ...extra,
    });
  }

  it('suman al total con su propia regla', () => {
    expect(project('ana', [partida({}, 1)]).sacuanjoches).toBe(5);
    expect(project('ana', [partida({ total: 9, streak: 2 }, 1)]).sacuanjoches).toBe(3);
  });

  it('una vez por día, sin pisarse con la rayuela', () => {
    const rayuela = gameDoneEvent({
      id: 'r1', studentId: 'ana', originDevice: 'd', createdAt: 1, game: 'rayuela', lang: 'eng', level: 'inicial', correct: 6, total: 6, day: '2026-10-04',
    });
    const s = project('ana', [partida({}, 1), partida({}, 2), rayuela]);
    expect(s.sacuanjoches).toBe(10);
  });

  it('el trompo caído no gasta el premio del día', () => {
    const s = project('ana', [partida({ correct: 2, total: 5, streak: 1 }, 1), partida({}, 2)]);
    expect(s.sacuanjoches).toBe(5);
  });
});
