import { describe, expect, it } from 'vitest';
import { mulberry32, uuidv4 } from '@core/ids';
import { normalizar } from '@core/content/verificar';
import { gameDoneEvent, lessonDoneEvent, type ProgressEvent } from '@core/progress/events';
import { project, type StudentState } from '@core/progress/projection';
import { vocabularioAprendido, type NivelMinijuego } from '@core/minijuegos/vocabulario';
import { pistaDe } from '@core/minijuegos/retos';
import { armarPartida, chibolaAlcanzada, CHIBOLAS, ID_CHIBOLAS, TIROS } from '@core/minijuegos/chibolas';
import { PACKS } from '../content';

function conLecciones(ids: string[]): StudentState {
  const rng = mulberry32(5);
  const evs: ProgressEvent[] = ids.map((packId, i) =>
    lessonDoneEvent({ id: uuidv4(rng), studentId: 'ana', originDevice: 'd', createdAt: 1000 + i, packId, correct: 5, total: 5 }),
  );
  return project('ana', evs);
}

const TODO_ENG = PACKS.filter((p) => p.lang === 'eng').map((p) => p.id);
const TODO_MIQ = PACKS.filter((p) => p.lang === 'miq' && !p.desde).map((p) => p.id);
const DIBUJOS = new Set(['perro', 'pez', 'gato', 'vaca', 'pájaro', 'caballo', 'libro', 'árbol', 'casa', 'agua']);

describe('chibolas: partida', () => {
  const niveles: NivelMinijuego[] = ['inicial', 'intermedio', 'avanzado'];
  for (const lang of ['eng', 'miq'] as const) {
    for (const nivel of niveles) {
      it(`${lang} ${nivel}: una chibola por respuesta, sólo con lo aprendido`, () => {
        const s = conLecciones(lang === 'eng' ? TODO_ENG : TODO_MIQ);
        const vocab = vocabularioAprendido(PACKS, s, lang);
        for (let semilla = 1; semilla <= 20; semilla++) {
          const retos = armarPartida(vocab, nivel, s, mulberry32(semilla), (es) => DIBUJOS.has(es));
          expect(retos).toHaveLength(TIROS);
          for (const r of retos) {
            expect(r.opciones).toHaveLength(CHIBOLAS[nivel]);
            expect(new Set(r.opciones.map(normalizar)).size).toBe(r.opciones.length);
            expect(r.opciones[r.correcta]).toBe(r.opcionesEnMeta ? r.palabra.meta : r.palabra.es);
          }
          if (nivel === 'avanzado') expect(retos.every((r) => r.palabra.frase)).toBe(true);
          if (nivel === 'inicial') expect(retos.some((r) => r.tipo === 'audio')).toBe(false);
        }
      });
    }
  }
});

describe('chibolas: el tiro', () => {
  const blancos = [{ angulo: -40 }, { angulo: 0 }, { angulo: 40 }];

  it('pega en la chibola más cercana a la dirección del tiro', () => {
    expect(chibolaAlcanzada(-35, blancos)).toBe(0);
    expect(chibolaAlcanzada(5, blancos)).toBe(1);
    expect(chibolaAlcanzada(90, blancos)).toBe(2);
  });

  it('da la vuelta bien por los 180 grados', () => {
    expect(chibolaAlcanzada(179, [{ angulo: -179 }, { angulo: 90 }])).toBe(0);
  });
});

describe('chibolas: pista', () => {
  it('dice con qué empieza y cuánto mide, sin decir la respuesta', () => {
    const s = conLecciones(TODO_ENG);
    const [r] = armarPartida(vocabularioAprendido(PACKS, s, 'eng'), 'intermedio', s, mulberry32(2));
    const p = pistaDe(r!);
    const buena = r!.opciones[r!.correcta]!;
    expect(buena.replace(/^[¿¡«"\s]+/, '').toLocaleUpperCase().startsWith(p.inicial)).toBe(true);
    expect(p.largo).toBeGreaterThan(0);
  });
});

describe('chibolas: sacuanjoches', () => {
  const partida = (correct: number, n: number): ProgressEvent =>
    gameDoneEvent({
      id: `c${n}`, studentId: 'ana', originDevice: 'd', createdAt: 100 + n, game: ID_CHIBOLAS, lang: 'miq', level: 'inicial', correct, total: TIROS, day: '2026-10-04',
    });

  it('con la regla común: dos tercios al primer tiro', () => {
    expect(project('ana', [partida(3, 1)]).sacuanjoches).toBe(0);
    expect(project('ana', [partida(4, 1)]).sacuanjoches).toBe(3);
    expect(project('ana', [partida(6, 1)]).sacuanjoches).toBe(5);
  });

  it('una vez por día', () => {
    expect(project('ana', [partida(6, 1), partida(6, 2)]).sacuanjoches).toBe(5);
  });
});
