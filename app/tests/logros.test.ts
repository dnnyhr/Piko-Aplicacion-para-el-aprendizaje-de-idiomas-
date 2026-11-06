import { describe, expect, it } from 'vitest';
import {
  answerEvent,
  canjeEvent,
  gameDoneEvent,
  hitoEvent,
  joinedSessionEvent,
  lessonDoneEvent,
  parseEvent,
  type ProgressEvent,
} from '@core/progress/events';
import { diaNicaragua, project } from '@core/progress/projection';
import { CATEGORIAS, LOGRO_HACKATHON, LOGROS } from '@core/logros/catalogo';
import { logrosDe, resumenLogros } from '@core/logros/evaluar';
import { formatearMientrasEscribe, normalizarCodigo } from '@core/logros/codigo';
import { ID_CHIBOLAS } from '@core/minijuegos/chibolas';
import { ID_GALLINITA } from '@core/minijuegos/gallinita';
import { ID_RAYUELA } from '@core/minijuegos/rayuela';
import { ID_TROMPO } from '@core/minijuegos/trompo';
import { ID_MUSICA } from '@core/canciones/cancion';

const HORA = 3_600_000;
const DIA = 24 * HORA;
/** Mediodía en Nicaragua del 1 de marzo de 2026 (18:00 UTC). */
const T0 = Date.parse('2026-03-01T18:00:00Z');

let n = 0;
const base = (createdAt: number) => ({ id: `ev-${++n}`, studentId: 'ana', originDevice: 'tel', createdAt });

const respuesta = (t: number, itemId = `it-${n}`, correct = true, skill = 'eng.saludos') =>
  answerEvent({ ...base(t), itemId, packId: 'eng.saludos.1', skill, correct, ms: 900 });
const leccion = (t: number) => lessonDoneEvent({ ...base(t), packId: 'eng.saludos.1', correct: 4, total: 5 });
const partida = (t: number, game: string, lang = 'eng') =>
  gameDoneEvent({ ...base(t), game, lang, level: 'inicial', correct: 5, total: 6, day: diaNicaragua(t) });

const estado = (evs: ProgressEvent[]) => project('ana', evs);
const tiene = (evs: ProgressEvent[], id: string) => estado(evs).logros[id] !== undefined;

describe('el catálogo de logros', () => {
  it('cada logro tiene un id único, en minúsculas con guiones, y una categoría que existe', () => {
    const ids = LOGROS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const categorias = new Set(CATEGORIAS.map((c) => c.id));
    for (const l of LOGROS) {
      expect(l.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(categorias.has(l.categoria)).toBe(true);
      for (const campo of [l.nombre, l.descripcion, l.como, l.felicitacion, l.insignia.icono]) expect(campo.trim()).not.toBe('');
      expect(l.insignia.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('los minijuegos que nombra existen', () => {
    const juegos = new Set([ID_RAYUELA, ID_TROMPO, ID_CHIBOLAS, ID_GALLINITA]);
    for (const l of LOGROS) {
      const c = l.condicion;
      if (c.tipo === 'juegos') for (const j of c.juegos) expect(juegos.has(j)).toBe(true);
      if (c.tipo === 'partidas' && c.juego) expect(juegos.has(c.juego)).toBe(true);
    }
  });

  it('los especiales sólo se ganan con código, y los de código son especiales', () => {
    for (const l of LOGROS) expect(l.tipo === 'especial').toBe(l.condicion.tipo === 'codigo');
    const hk = LOGROS.find((l) => l.id === LOGRO_HACKATHON);
    expect(hk?.exclusivo).toBe(true);
    expect(hk?.categoria).toBe('especiales');
  });
});

describe('desbloquear logros', () => {
  it('la primera lección da «Primer paso», con la fecha de esa lección', () => {
    const t = T0 + 5 * HORA;
    const e = estado([respuesta(T0), leccion(t)]);
    expect(e.logros['primer-paso']).toBe(t);
    expect(e.logros['ya-arrancamos']).toBeUndefined();
    const ya = logrosDe(e).find((x) => x.logro.id === 'ya-arrancamos');
    expect([ya?.actual, ya?.meta, ya?.desbloqueado]).toEqual([1, 5, false]);
  });

  it('cinco lecciones dan «Ya arrancamos» y la fecha queda en la quinta', () => {
    const evs = Array.from({ length: 5 }, (_, i) => leccion(T0 + i * HORA));
    expect(estado(evs).logros['ya-arrancamos']).toBe(T0 + 4 * HORA);
  });

  it('la racha cuenta días seguidos en hora de Nicaragua', () => {
    // 23:30 en Nicaragua sigue siendo el mismo día aunque en UTC ya sea mañana.
    const noche = Date.parse('2026-03-02T05:30:00Z');
    expect(diaNicaragua(noche)).toBe('2026-03-01');
    const dos = [respuesta(T0), respuesta(noche), respuesta(T0 + DIA)];
    expect(estado(dos).mejorRachaDias).toBe(2);
    expect(tiene(dos, 'no-te-detengas')).toBe(false);

    const tres = [...dos, leccion(T0 + 2 * DIA)];
    expect(tiene(tres, 'no-te-detengas')).toBe(true);
  });

  it('un día sin estudiar corta la racha, pero la mejor queda', () => {
    const evs = [0, 1, 2, 4, 5].map((d) => respuesta(T0 + d * DIA));
    const e = estado(evs);
    expect([e.rachaDias, e.mejorRachaDias]).toEqual([2, 3]);
  });

  it('las palabras cuentan una vez cada una, y por lengua', () => {
    const evs = [
      respuesta(T0, 'eng.saludos.1.a'),
      respuesta(T0 + 1, 'eng.saludos.1.a'),
      respuesta(T0 + 2, 'eng.saludos.1.b', false),
      respuesta(T0 + 3, 'miq.saludos.1.a', true, 'miq.saludos'),
    ];
    const e = estado(evs);
    expect(e.aprendidas.eng).toHaveLength(1);
    expect(e.lenguas).toEqual(['eng', 'miq']);
    expect(tiene(evs, 'primera-palabra')).toBe(true);
    expect(tiene(evs, 'desde-la-costa-caribe')).toBe(true);
    expect(tiene(evs, 'dos-lenguas')).toBe(true);
  });

  it('las palabras no crecen más allá del logro más alto', () => {
    const evs = Array.from({ length: 150 }, (_, i) => respuesta(T0 + i, `eng.x.${i}`));
    const e = estado(evs);
    expect(e.aprendidas.eng).toHaveLength(100);
    expect(e.logros['diccionario-humano']).toBe(T0 + 99);
  });

  it('jugar los cuatro minijuegos da «Recreo completo»; la música no cuenta como partida', () => {
    const musica = [partida(T0, ID_MUSICA, 'spa')];
    expect(tiene(musica, 'a-jugar')).toBe(false);
    const evs = [ID_RAYUELA, ID_TROMPO, ID_CHIBOLAS, ID_GALLINITA].map((j, i) => partida(T0 + i, j));
    expect(tiene(evs, 'a-jugar')).toBe(true);
    expect(tiene(evs.slice(0, 3), 'recreo-completo')).toBe(false);
    expect(tiene(evs, 'recreo-completo')).toBe(true);
  });

  it('saludar a Piko y unirse a una clase', () => {
    expect(tiene([hitoEvent({ ...base(T0), clave: 'piko' })], 'conoce-a-piko')).toBe(true);
    expect(tiene([hitoEvent({ ...base(T0), clave: 'otra' })], 'conoce-a-piko')).toBe(false);
    expect(tiene([joinedSessionEvent({ ...base(T0), sessionId: 's1' })], 'companeros-de-aula')).toBe(true);
  });

  it('los de pronunciación están en «Próximamente» y no cuentan en el total', () => {
    const lista = logrosDe(estado([]));
    const proximos = lista.filter((x) => x.proximamente).map((x) => x.logro.id);
    expect(proximos).toEqual(['buen-oido', 'lo-dijiste']);
    expect(resumenLogros(estado([])).total).toBe(LOGROS.length - 2);
  });
});

describe('el logro de Hackathon Nicaragua 2026', () => {
  const canje = (t: number, logro = LOGRO_HACKATHON) =>
    canjeEvent({ ...base(t), codigo: 'PIKO-HK26-7KQ2-M9XA', logro, canjeadoEn: '2026-03-01T18:00:00Z' });

  it('no se gana con progreso, por mucho que sea', () => {
    const evs = [
      ...Array.from({ length: 60 }, (_, i) => leccion(T0 + i * DIA)),
      ...Array.from({ length: 120 }, (_, i) => respuesta(T0 + i, `eng.x.${i}`)),
    ];
    expect(tiene(evs, LOGRO_HACKATHON)).toBe(false);
  });

  it('se gana con el canje, queda con su fecha y cuenta como especial', () => {
    const t = T0 + 3 * HORA;
    const e = estado([leccion(T0), canje(t)]);
    expect(e.logros[LOGRO_HACKATHON]).toBe(t);
    expect(e.canjes[LOGRO_HACKATHON]).toBe('PIKO-HK26-7KQ2-M9XA');
    expect(resumenLogros(e).especiales.map((l) => l.id)).toEqual([LOGRO_HACKATHON]);
  });

  it('un canje no desbloquea un logro que se gana jugando', () => {
    expect(tiene([canje(T0, 'diccionario-humano')], 'diccionario-humano')).toBe(false);
  });

  it('el evento de canje viaja por la red', () => {
    const ev = canje(T0);
    expect(parseEvent(JSON.parse(JSON.stringify(ev)))).toEqual(ev);
  });
});

describe('los logros son los mismos en cualquier teléfono', () => {
  it('no importa en qué orden llegaron los eventos', () => {
    const evs = [
      leccion(T0),
      respuesta(T0 + DIA, 'eng.a'),
      partida(T0 + 2 * DIA, ID_TROMPO),
      hitoEvent({ ...base(T0 + 3 * DIA), clave: 'piko' }),
      leccion(T0 + 4 * DIA),
    ];
    const al_reves = evs.slice().reverse();
    expect(project('ana', al_reves).logros).toEqual(project('ana', evs).logros);
    expect(Object.keys(project('ana', evs).logros).sort()).toEqual(['a-jugar', 'conoce-a-piko', 'no-te-detengas', 'primer-paso', 'primera-palabra']);
  });
});

describe('los códigos de las tarjetas', () => {
  it('se leen como se escriban', () => {
    expect(normalizarCodigo(' piko hk26 7kq2 m9xa ')).toBe('PIKO-HK26-7KQ2-M9XA');
    expect(normalizarCodigo('PIKO-HK26-OI2L-M9XA')).toBe('PIKO-HK26-0121-M9XA');
    expect(normalizarCodigo('PIKO-HK26-A7F3')).toBeNull();
    expect(normalizarCodigo('PIKO-HK26-7KQ2-M9XU')).toBeNull();
  });

  it('se ordenan con guiones mientras se escriben', () => {
    expect(formatearMientrasEscribe('pikohk267k')).toBe('PIKO-HK26-7K');
    expect(formatearMientrasEscribe('PIKO-HK26-7KQ2-M9XA-EXTRA')).toBe('PIKO-HK26-7KQ2-M9XA');
  });
});
