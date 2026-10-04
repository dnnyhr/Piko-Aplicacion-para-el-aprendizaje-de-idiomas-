import { describe, expect, it } from 'vitest';
import { mulberry32, uuidv4 } from '@core/ids';
import { normalizar } from '@core/content/verificar';
import { gameDoneEvent, lessonDoneEvent, type ProgressEvent } from '@core/progress/events';
import { project, type StudentState } from '@core/progress/projection';
import { vocabularioAprendido, type NivelMinijuego } from '@core/minijuegos/vocabulario';
import {
  armarRondas,
  BONO_GRAN_RACHA,
  BONO_RACHA,
  distancia,
  ESCUCHAS,
  ID_GALLINITA,
  OPCIONES,
  partidaNueva,
  PUNTOS_ACIERTO,
  rachaFestejada,
  responder,
  RONDAS,
  sacuanjochesPorGallinita,
  escondites,
  RADIO_LUZ,
  soloSeEscuchan,
} from '@core/minijuegos/gallinita';
import { PACKS } from '../content';

function conLecciones(ids: string[]): StudentState {
  const rng = mulberry32(9);
  const evs: ProgressEvent[] = ids.map((packId, i) =>
    lessonDoneEvent({ id: uuidv4(rng), studentId: 'ana', originDevice: 'd', createdAt: 1000 + i, packId, correct: 5, total: 5 }),
  );
  return project('ana', evs);
}

const TODO_ENG = PACKS.filter((p) => p.lang === 'eng').map((p) => p.id);
const TODO_MIQ = PACKS.filter((p) => p.lang === 'miq' && !p.desde).map((p) => p.id);
const DIBUJOS = new Set(['perro', 'pez', 'gato', 'vaca', 'pájaro', 'caballo', 'libro', 'árbol', 'casa', 'agua', 'lápiz', 'cerdo']);
const conDibujo = (es: string) => DIBUJOS.has(es);

describe('gallinita: rondas', () => {
  const niveles: NivelMinijuego[] = ['inicial', 'intermedio', 'avanzado'];
  for (const lang of ['eng', 'miq'] as const) {
    for (const nivel of niveles) {
      it(`${lang} ${nivel}: todo empieza por escuchar, sólo con lo aprendido`, () => {
        const s = conLecciones(lang === 'eng' ? TODO_ENG : TODO_MIQ);
        const vocab = vocabularioAprendido(PACKS, s, lang);
        for (let semilla = 1; semilla <= 20; semilla++) {
          const rondas = armarRondas(vocab, nivel, s, mulberry32(semilla), conDibujo);
          expect(rondas).toHaveLength(RONDAS);
          for (const r of rondas) {
            expect(r.opciones).toHaveLength(OPCIONES[nivel]);
            expect(new Set(r.opciones.map(normalizar)).size).toBe(r.opciones.length);
            expect(r.opciones[r.correcta]).toBe(r.opcionesEnMeta ? r.palabra.meta : r.palabra.es);
            // Cada opción es un par aprendido.
            for (const op of r.opciones) expect(vocab.some((p) => (r.opcionesEnMeta ? p.meta : p.es) === op)).toBe(true);
            // Las de dibujos tienen dibujo en todas sus opciones.
            if (r.tipo === 'oye_dibujo') for (const op of r.opciones) expect(conDibujo(op)).toBe(true);
            if (r.tipo === 'dibujo_oye') expect(conDibujo(r.palabra.es)).toBe(true);
          }
          if (nivel === 'inicial') expect(rondas.every((r) => !r.palabra.frase)).toBe(true);
          if (nivel === 'avanzado') expect(rondas.every((r) => r.palabra.frase)).toBe(true);
        }
      });
    }
  }

  it('en inglés inicial hay rondas de dibujos', () => {
    const s = conLecciones(TODO_ENG);
    const rondas = armarRondas(vocabularioAprendido(PACKS, s, 'eng'), 'inicial', s, mulberry32(1), conDibujo);
    expect(rondas.some((r) => r.tipo === 'oye_dibujo')).toBe(true);
  });

  it('sin dibujos, las rondas de dibujos salen como de significado', () => {
    const s = conLecciones(TODO_ENG);
    const rondas = armarRondas(vocabularioAprendido(PACKS, s, 'eng'), 'inicial', s, mulberry32(1));
    expect(rondas.some((r) => r.tipo === 'oye_dibujo' || r.tipo === 'dibujo_oye')).toBe(false);
  });

  it('en «oye_palabra» las opciones se parecen a la que suena', () => {
    expect(distancia('three', 'tree')).toBeLessThan(distancia('three', 'grandmother'));
    const s = conLecciones(TODO_ENG);
    const vocab = vocabularioAprendido(PACKS, s, 'eng');
    let parecido = 0;
    let azar = 0;
    for (let semilla = 1; semilla <= 30; semilla++) {
      for (const r of armarRondas(vocab, 'intermedio', s, mulberry32(semilla), conDibujo)) {
        if (r.tipo !== 'oye_palabra') continue;
        for (const [i, op] of r.opciones.entries()) if (i !== r.correcta) parecido += distancia(op, r.palabra.meta);
        const otra = vocab[(semilla * 7) % vocab.length]!;
        azar += distancia(otra.meta, r.palabra.meta) * (r.opciones.length - 1);
      }
    }
    expect(parecido).toBeLessThan(azar);
  });

  it('el audio se escucha sin límite al empezar y con límite en el avanzado', () => {
    expect(ESCUCHAS.inicial).toBe(Infinity);
    expect(ESCUCHAS.avanzado).toBeLessThan(5);
  });
});

describe('gallinita: rachas y puntos', () => {
  const jugar = (rs: boolean[]) => rs.reduce(responder, partidaNueva());

  it('festeja a los 3 y a los 5, con bono', () => {
    expect(rachaFestejada(3)).toBe('racha');
    expect(rachaFestejada(5)).toBe('gran');
    expect(jugar([true, true, true]).puntos).toBe(3 * PUNTOS_ACIERTO + BONO_RACHA);
    expect(jugar([true, true, true, true, true]).puntos).toBe(5 * PUNTOS_ACIERTO + BONO_RACHA + BONO_GRAN_RACHA);
  });

  it('un fallo corta la racha', () => {
    const e = jugar([true, true, false, true]);
    expect(e.racha).toBe(1);
    expect(e.mejorRacha).toBe(2);
  });
});

describe('gallinita: sacuanjoches', () => {
  it('dos tercios para empezar; gran racha y partida perfecta suman', () => {
    expect(sacuanjochesPorGallinita(5, 8, 5)).toBe(0);
    expect(sacuanjochesPorGallinita(6, 8, 3)).toBe(3);
    expect(sacuanjochesPorGallinita(6, 8, 5)).toBe(4);
    expect(sacuanjochesPorGallinita(8, 8, 8)).toBe(5);
  });

  const partida = (extra: Partial<Parameters<typeof gameDoneEvent>[0]>, n: number): ProgressEvent =>
    gameDoneEvent({
      id: `g${n}`, studentId: 'ana', originDevice: 'd', createdAt: 100 + n, game: ID_GALLINITA, lang: 'eng', level: 'inicial', correct: RONDAS, total: RONDAS, streak: RONDAS, day: '2026-10-04', ...extra,
    });

  it('suman al total una vez por día', () => {
    expect(project('ana', [partida({}, 1), partida({}, 2)]).sacuanjoches).toBe(5);
    expect(project('ana', [partida({}, 1), partida({ day: '2026-10-05' }, 2)]).sacuanjoches).toBe(10);
  });
});

describe('Pikito Ciego: la oscuridad', () => {
  it('el círculo de luz se achica con el nivel', () => {
    expect(RADIO_LUZ.inicial).toBeGreaterThan(RADIO_LUZ.intermedio);
    expect(RADIO_LUZ.intermedio).toBeGreaterThan(RADIO_LUZ.avanzado);
  });

  it('las respuestas escondidas quedan lejos unas de otras: con la luz en una no se ve otra', () => {
    for (const n of [3, 4]) {
      const e = escondites(n);
      expect(e).toHaveLength(n);
      // En un patio de 360 × 560, la distancia entre escondites supera el diámetro de la luz más grande.
      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
          const d = Math.hypot((e[a]!.x - e[b]!.x) * 360, (e[a]!.y - e[b]!.y) * 560);
          expect(d).toBeGreaterThan(RADIO_LUZ.inicial * 1.4);
        }
      }
    }
  });

  it('en el avanzado las respuestas en la lengua que se aprende sólo se escuchan', () => {
    const r = { tipo: 'oye_palabra', opcionesEnMeta: true } as Parameters<typeof soloSeEscuchan>[0];
    expect(soloSeEscuchan(r, 'avanzado')).toBe(true);
    expect(soloSeEscuchan(r, 'intermedio')).toBe(false);
    expect(soloSeEscuchan({ ...r, tipo: 'dibujo_oye' }, 'inicial')).toBe(true);
    expect(soloSeEscuchan({ ...r, tipo: 'oye_frase', opcionesEnMeta: false }, 'avanzado')).toBe(false);
  });
});
