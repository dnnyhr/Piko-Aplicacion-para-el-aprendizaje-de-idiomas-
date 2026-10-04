import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mulberry32, uuidv4 } from '@core/ids';
import { normalizar } from '@core/content/verificar';
import { paraVozEspanola } from '@core/content/voz';
import { paraVozEspanola as paraVozDelDiccionario } from '../../diccionario/herramientas/voz';
import { answerEvent, gameDoneEvent, lessonDoneEvent, parseEvent, type ProgressEvent } from '@core/progress/events';
import { cloneState, emptyState, project, type StudentState } from '@core/progress/projection';
import { sacuanjochesPorMinijuego } from '@core/progress/arbol';
import {
  armarPartida,
  CASILLAS,
  diaLocal,
  nivelesDe,
  nivelSugerido,
  SALTOS,
  vocabularioAprendido,
  vozDe,
  vozDePalabra,
  type NivelRayuela,
} from '@core/minijuegos/rayuela';
import { PACKS } from '../content';

/** Un estudiante que terminó estos paquetes. */
function conLecciones(ids: string[]): StudentState {
  const rng = mulberry32(7);
  const evs: ProgressEvent[] = ids.map((packId, i) =>
    lessonDoneEvent({ id: uuidv4(rng), studentId: 'ana', originDevice: 'd', createdAt: 1000 + i, packId, correct: 5, total: 5 }),
  );
  return project('ana', evs);
}

const TODO_ENG = PACKS.filter((p) => p.lang === 'eng').map((p) => p.id);
const TODO_MIQ = PACKS.filter((p) => p.lang === 'miq' && !p.desde).map((p) => p.id);

function partida(game: Partial<Parameters<typeof gameDoneEvent>[0]>, n: number): ProgressEvent {
  return gameDoneEvent({
    id: `g${n}`,
    studentId: 'ana',
    originDevice: 'd',
    createdAt: 5000 + n,
    game: 'rayuela',
    lang: 'eng',
    level: 'inicial',
    correct: 6,
    total: 6,
    day: '2026-10-03',
    ...game,
  });
}

describe('rayuela: vocabulario', () => {
  it('sin lecciones no hay palabras ni niveles', () => {
    const s = emptyState('ana');
    expect(vocabularioAprendido(PACKS, s, 'eng')).toEqual([]);
    expect(nivelSugerido(nivelesDe(PACKS, s, 'eng'))).toBeNull();
  });

  it('sólo usa palabras de las lecciones hechas', () => {
    const s = conLecciones(['eng.animales.1']);
    const vocab = vocabularioAprendido(PACKS, s, 'eng');
    expect(vocab.length).toBeGreaterThan(0);
    expect(vocab.every((p) => p.packId === 'eng.animales.1')).toBe(true);
    expect(vocab.map((p) => p.meta)).toContain('dog');
    expect(vocab.map((p) => p.meta)).not.toContain('mother');
  });

  it('cada par sale tal cual de un paquete: nada inventado', () => {
    const s = conLecciones([...TODO_ENG, ...TODO_MIQ]);
    for (const lang of ['eng', 'miq'] as const) {
      for (const p of vocabularioAprendido(PACKS, s, lang)) {
        const it = p.item;
        const pares =
          it.type === 'choice' ? [it.answer, it.prompt] : it.type === 'listen' ? [it.answer, it.gloss] : [it.target, it.gloss];
        expect([p.meta, p.es]).toEqual(pares.map((x) => x.trim()));
      }
    }
  });
});

describe('rayuela: niveles', () => {
  it('se abren con las lecciones, de a uno', () => {
    const una = nivelesDe(PACKS, conLecciones(['eng.animales.1']), 'eng');
    expect(una.map((n) => n.abierto)).toEqual([true, false, false]);
    expect(una[1]?.faltanLecciones).toBe(1);

    const todas = nivelesDe(PACKS, conLecciones(TODO_ENG), 'eng');
    expect(todas.every((n) => n.abierto)).toBe(true);
    expect(nivelSugerido(todas)).toBe('avanzado');
  });

  it('el miskito se abre con sus propias lecciones', () => {
    const s = conLecciones(TODO_ENG);
    expect(nivelSugerido(nivelesDe(PACKS, s, 'miq'))).toBeNull();
    expect(nivelSugerido(nivelesDe(PACKS, conLecciones(TODO_MIQ), 'miq'))).toBe('avanzado');
  });
});

describe('rayuela: partida', () => {
  const niveles: NivelRayuela[] = ['inicial', 'intermedio', 'avanzado'];

  for (const lang of ['eng', 'miq'] as const) {
    for (const nivel of niveles) {
      it(`${lang} ${nivel}: ${SALTOS} saltos bien armados`, () => {
        const s = conLecciones(lang === 'eng' ? TODO_ENG : TODO_MIQ);
        const vocab = vocabularioAprendido(PACKS, s, lang);
        for (let semilla = 1; semilla <= 25; semilla++) {
          const preguntas = armarPartida(vocab, nivel, s, mulberry32(semilla));
          expect(preguntas).toHaveLength(SALTOS);
          for (const q of preguntas) {
            expect(q.opciones).toHaveLength(CASILLAS[nivel]);
            const correcta = q.opcionesEnMeta ? q.palabra.meta : q.palabra.es;
            expect(q.opciones[q.correcta]).toBe(correcta);
            // Sin casillas repetidas.
            expect(new Set(q.opciones.map(normalizar)).size).toBe(q.opciones.length);
            // Cada casilla equivocada es otro par aprendido, nunca uno con el mismo significado.
            for (const [i, op] of q.opciones.entries()) {
              if (i === q.correcta) continue;
              const par = vocab.find((p) => (q.opcionesEnMeta ? p.meta : p.es) === op);
              expect(par).toBeDefined();
              expect(normalizar(par!.es)).not.toBe(normalizar(q.palabra.es));
            }
          }
          if (nivel === 'avanzado') expect(preguntas.some((q) => q.tipo === 'escucha')).toBe(true);
          if (nivel === 'inicial') expect(preguntas.every((q) => !q.palabra.frase)).toBe(true);
        }
      });
    }
  }

  it('sin con qué llenar las casillas no arma una partida a medias', () => {
    const s = conLecciones(['eng.animales.1']);
    const vocab = vocabularioAprendido(PACKS, s, 'eng').slice(0, 2);
    expect(armarPartida(vocab, 'inicial', s, mulberry32(1))).toEqual([]);
    expect(armarPartida([], 'avanzado', s, mulberry32(1))).toEqual([]);
  });
});

describe('rayuela: voz', () => {
  it('el inglés suena en inglés americano', () => {
    expect(vozDe('eng', 'tree').lang).toBe('en-US');
  });

  it('el miskito usa la voz en español con el texto preparado', () => {
    expect(vozDe('miq', 'mihta')).toEqual({ texto: 'mijta', lang: 'es-US' });
    const s = conLecciones(TODO_MIQ);
    const conVoz = vocabularioAprendido(PACKS, s, 'miq').find((p) => p.tts);
    expect(conVoz).toBeDefined();
    expect(vozDePalabra('miq', conVoz!)).toEqual({ texto: conVoz!.tts!.texto, lang: conVoz!.tts!.lang });
  });

  it('la copia de la app dice lo mismo que el diccionario, con todo el léxico', () => {
    const lexico = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../diccionario/miskito/lexico.json'), 'utf8'),
    ) as { entradas: { forma: string }[] };
    for (const e of lexico.entradas) expect(paraVozEspanola(e.forma)).toBe(paraVozDelDiccionario(e.forma));
  });
});

describe('rayuela: recompensas', () => {
  it('sin saltar bien no hay flores', () => {
    expect(sacuanjochesPorMinijuego(0, 6)).toBe(0);
    expect(sacuanjochesPorMinijuego(3, 6)).toBe(0);
    expect(sacuanjochesPorMinijuego(4, 6)).toBe(3);
    expect(sacuanjochesPorMinijuego(5, 6)).toBe(4);
    expect(sacuanjochesPorMinijuego(6, 6)).toBe(5);
  });

  it('suman al total de sacuanjoches', () => {
    expect(project('ana', [partida({}, 1)]).sacuanjoches).toBe(5);
  });

  it('la misma rayuela da flores una sola vez por día', () => {
    const s = project('ana', [partida({}, 1), partida({}, 2), partida({ correct: 5 }, 3)]);
    expect(s.sacuanjoches).toBe(5);
  });

  it('otro día, otro nivel u otra lengua vuelven a dar', () => {
    const s = project('ana', [
      partida({}, 1),
      partida({ day: '2026-10-04' }, 2),
      partida({ level: 'intermedio' }, 3),
      partida({ lang: 'miq' }, 4),
    ]);
    expect(s.sacuanjoches).toBe(20);
  });

  it('una partida sin flores no gasta el premio del día', () => {
    const s = project('ana', [partida({ correct: 1 }, 1), partida({ correct: 6 }, 2)]);
    expect(s.sacuanjoches).toBe(5);
  });

  it('se guardan en el log: proyectar de nuevo da lo mismo', () => {
    const evs = [partida({}, 1), partida({ day: '2026-10-04' }, 2)];
    expect(project('ana', evs)).toEqual(project('ana', [...evs].reverse()));
  });

  it('sigue el tope desde un snapshot', () => {
    const base = project('ana', [partida({}, 1)]);
    const otra = project('ana', [partida({}, 2)], base);
    expect(otra.sacuanjoches).toBe(5);
    // Un snapshot de una versión anterior, sin el campo, arranca vacío.
    const viejo = { ...base } as Partial<StudentState>;
    delete viejo.premiosJuegos;
    expect(cloneState(viejo as StudentState).premiosJuegos).toEqual({});
  });

  it('el evento viaja por la red como cualquier otro', () => {
    const ev = partida({}, 1);
    expect(parseEvent(JSON.parse(JSON.stringify(ev)))).toEqual(ev);
  });

  it('las respuestas siguen sumando XP como en las lecciones', () => {
    const ev = answerEvent({
      id: 'a1', studentId: 'ana', originDevice: 'd', createdAt: 1, itemId: 'eng.animales.1.a', packId: 'eng.animales.1', skill: 'eng.animales', correct: true, ms: 900,
    });
    expect(project('ana', [ev]).xp).toBeGreaterThan(0);
  });
});

describe('rayuela: día', () => {
  it('formatea el día local', () => {
    expect(diaLocal(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});
