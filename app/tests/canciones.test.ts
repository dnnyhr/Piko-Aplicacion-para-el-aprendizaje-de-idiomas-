import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@core/ids';
import { gameDoneEvent, type ProgressEvent } from '@core/progress/events';
import { project } from '@core/progress/projection';
import {
  armarLeccion,
  armarOracion,
  cancionesAbiertas,
  fichasDe,
  ID_MUSICA,
  marcasDeRepeticion,
  ordenCorrecto,
  repeticiones,
  sacuanjochesPorCancion,
  taparEnVerso,
  validarCancion,
  versoEn,
  type Cancion,
} from '@core/canciones/cancion';
import { CANCIONES } from '../content/canciones';

/**
 * Una canción SÓLO PARA PROBAR el formato. No es una canción real ni va a la
 * app: la letra son frases del corpus de Piko.
 */
function prueba(extra: Partial<Cancion> = {}): Cancion {
  return {
    id: 'prueba',
    titulo: 'Prueba',
    lengua: 'spa',
    region: 'Región de prueba',
    comunidad: 'Comunidad de prueba',
    nivel: 'inicial',
    imagen: 'tambor',
    audio: 'prueba.m4a',
    fuente: {
      interpreta: 'Equipo',
      autoria: 'Equipo',
      autoriza: 'Equipo',
      forma: 'por escrito',
      fecha: '2026-10-04',
      validado_por: 'Equipo',
      permiso: true,
    },
    conoce: { origen: 'prueba', lengua: 'español', region: 'prueba', representa: 'prueba' },
    ritmo: { bpm: 120, pulso: 0.5 },
    letra: [
      { texto: 'El pájaro es verde', en: 'The bird is green.', inicio: 0, fin: 3 },
      { texto: 'El pájaro puede volar', en: 'The bird can fly.', inicio: 3, fin: 6 },
      { texto: 'El pájaro es verde', en: 'The bird is green.', inicio: 6, fin: 9 },
      { texto: 'El pájaro puede volar', en: 'The bird can fly.', inicio: 9, fin: 12 },
      { texto: 'Mi familia es grande', en: 'My family is big.', inicio: 12, fin: 15 },
    ],
    coro: [0],
    lecciones: [
      {
        verso: 0,
        completar: { oculta: 'bird', opciones: ['bird', 'dog', 'book'] },
        palabra: { en: 'green', es: 'verde', ejemplo: 'The tree is green.', ejemploEs: 'El árbol es verde.', opciones: ['green', 'fast', 'under'] },
        ordenar: 'The bird is green.',
        escucha: ['The bird is blue.', 'The dog is green.'],
      },
      {
        verso: 4,
        completar: { oculta: 'big', opciones: ['big', 'cold', 'wet', 'late'] },
        palabra: { en: 'family', es: 'familia', ejemplo: 'I love my family.', ejemploEs: 'Quiero a mi familia.', opciones: ['family', 'spoon', 'rain'] },
        ordenar: 'My family is big.',
        escucha: ['My family is small.', 'My house is big.'],
      },
    ],
    canta: { desde: 0, hasta: 1 },
    ...extra,
  };
}

describe('canciones de la app', () => {
  it('cada canción cumple el formato, con permiso y traducciones validadas', () => {
    for (const cancion of CANCIONES) {
      expect(validarCancion(cancion)).toEqual([]);
    }
  });

  it('cada canción tiene su grabación en la carpeta de audio, registrada en audios.ts', () => {
    const audios = fs.readFileSync(path.resolve(__dirname, '../content/canciones/audios.ts'), 'utf8');
    for (const cancion of CANCIONES) {
      expect(fs.existsSync(path.resolve(__dirname, '../content/canciones/audio', cancion.audio))).toBe(true);
      expect(audios).toContain(`'${cancion.id}': require('./audio/${cancion.audio}')`);
    }
  });

  it('no hay dos canciones con el mismo id', () => {
    const ids = CANCIONES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('canciones: validación', () => {
  it('una canción completa pasa', () => {
    expect(validarCancion(prueba())).toEqual([]);
  });

  it('sin permiso no entra', () => {
    const sin = { ...prueba(), fuente: { ...prueba().fuente, permiso: false } };
    expect(validarCancion(sin).join(' ')).toMatch(/permiso/);
    const { fuente: _sacada, ...sinFuente } = prueba();
    expect(validarCancion(sinFuente).join(' ')).toMatch(/fuente/);
  });

  it('una canción en otra lengua necesita la traducción al español de cada verso', () => {
    const c = prueba({ lengua: 'bzk', letra: [{ texto: 'Gyal a boy dem pasanda', en: 'The girls and boys are passing.', inicio: 0, fin: 2 }, ...prueba().letra.slice(1)] });
    expect(validarCancion(c).join(' ')).toMatch(/traducción validada/);
  });

  it('cada verso trae su inglés, o una nota que diga por qué no se traduce', () => {
    const sinIngles = prueba({ letra: [{ texto: 'Mayaya lasiqui', inicio: 0, fin: 2 }, ...prueba().letra.slice(1)] });
    expect(validarCancion(sinIngles).join(' ')).toMatch(/inglés/);
    const conNota = prueba({ letra: [{ texto: 'Mayaya lasiqui', nota: 'Es el coro: no se traduce.', inicio: 0, fin: 2 }, ...prueba().letra.slice(1)] });
    expect(validarCancion(conNota).join(' ')).not.toMatch(/verso 0/);
  });

  it('un inglés aproximado explica la idea', () => {
    const letra = prueba().letra.slice();
    letra[0] = { ...letra[0]!, aproximado: true };
    expect(validarCancion(prueba({ letra })).join(' ')).toMatch(/aproximado/);
  });

  it('la palabra a completar tiene que estar en el inglés del verso, entre sus opciones', () => {
    const l = prueba().lecciones;
    const mal = prueba({ lecciones: [{ ...l[0]!, completar: { oculta: 'house', opciones: ['house', 'dog', 'cat'] } }, l[1]!] });
    expect(validarCancion(mal).join(' ')).toMatch(/no está en/);
    const sinCorrecta = prueba({ lecciones: [{ ...l[0]!, completar: { oculta: 'bird', opciones: ['dog', 'cat', 'cow'] } }, l[1]!] });
    expect(validarCancion(sinCorrecta).join(' ')).toMatch(/opciones/);
  });

  it('la palabra nueva tiene que aparecer en su ejemplo', () => {
    const l = prueba().lecciones;
    const mal = prueba({ lecciones: [{ ...l[0]!, palabra: { ...l[0]!.palabra, ejemplo: 'The sky is blue.' } }, l[1]!] });
    expect(validarCancion(mal).join(' ')).toMatch(/ejemplo/);
  });

  it('pide entre 2 y 4 lecciones', () => {
    expect(validarCancion(prueba({ lecciones: prueba().lecciones.slice(0, 1) })).join(' ')).toMatch(/entre 2 y 4/);
  });
});

describe('canciones: la letra', () => {
  it('reconoce los versos que se repiten', () => {
    expect(repeticiones(prueba().letra)).toEqual([-1, -1, 0, 1, -1]);
  });

  it('marca el principio de cada tramo repetido, y si es el coro', () => {
    expect(marcasDeRepeticion(prueba().letra, [0])).toEqual([null, null, 'coro', null, null]);
    expect(marcasDeRepeticion(prueba().letra)).toEqual([null, null, 'repite', null, null]);
  });

  it('sabe qué verso suena en cada segundo', () => {
    expect(versoEn(prueba().letra, 4)).toBe(1);
    expect(versoEn(prueba().letra, 99)).toBe(-1);
  });
});

describe('canciones: la lección de cada frase', () => {
  it('tapa la palabra respetando los signos', () => {
    expect(taparEnVerso('The bird is green.', 'bird')).toBe('The ___ is green.');
    expect(taparEnVerso('All the kids are happy.', 'all')).toBe('___ the kids are happy.');
  });

  it('arma las cuatro actividades con la respuesta en su lugar', () => {
    const c = prueba();
    for (let s = 1; s <= 10; s++) {
      const a = armarLeccion(c, c.lecciones[0]!, mulberry32(s));
      expect(a.completar.conHueco).toBe('The ___ is green.');
      expect(a.completar.opciones[a.completar.correcta]).toBe('bird');
      expect(a.usa.conHueco).toBe('The tree is ___.');
      expect(a.usa.opciones[a.usa.correcta]).toBe('green');
      expect(a.escucha.opciones[a.escucha.correcta]).toBe('The bird is green.');
      expect(a.escucha.opciones).toHaveLength(3);
      expect(ordenCorrecto(a.ordenar.fichas, a.ordenar.solucion)).toBe(false);
      expect([...a.ordenar.fichas].sort()).toEqual([...a.ordenar.solucion].sort());
    }
  });

  it('las fichas no delatan cuál va primero, y la oración se arma con mayúscula y punto', () => {
    expect(fichasDe('The boys are passing.')).toEqual(['the', 'boys', 'are', 'passing']);
    expect(fichasDe('I want to eat.')).toEqual(['I', 'want', 'to', 'eat']);
    expect(armarOracion(['the', 'boys', 'are', 'passing'])).toBe('The boys are passing.');
  });
});

describe('canciones: desbloqueo', () => {
  const c = (id: string, nivel: Cancion['nivel']) => prueba({ id, nivel });
  const catalogo = [c('a', 'inicial'), c('b', 'inicial'), c('m', 'intermedio'), c('z', 'avanzado')];

  it('al empezar sólo están las iniciales', () => {
    expect([...cancionesAbiertas(catalogo, [])].sort()).toEqual(['a', 'b']);
  });

  it('completar una del nivel abre el siguiente', () => {
    expect([...cancionesAbiertas(catalogo, ['a'])].sort()).toEqual(['a', 'b', 'm']);
    expect([...cancionesAbiertas(catalogo, ['a', 'm'])].sort()).toEqual(['a', 'b', 'm', 'z']);
  });

  it('si no hay canciones de un nivel, no lo pide', () => {
    expect([...cancionesAbiertas([c('m', 'intermedio')], [])]).toEqual(['m']);
  });
});

describe('canciones: sacuanjoches y progreso', () => {
  it('una flor cada 3 buenas, una más con racha de 6; sin la mitad, ninguna', () => {
    expect(sacuanjochesPorCancion(5, 12, 2)).toBe(0);
    expect(sacuanjochesPorCancion(6, 12, 3)).toBe(2);
    expect(sacuanjochesPorCancion(9, 12, 4)).toBe(3);
    expect(sacuanjochesPorCancion(12, 12, 12)).toBe(5);
    expect(sacuanjochesPorCancion(3, 3, 3)).toBe(1);
  });

  const partida = (cancion: string, correct: number, n: number, day = '2026-10-04'): ProgressEvent =>
    gameDoneEvent({
      id: `m${n}`, studentId: 'ana', originDevice: 'd', createdAt: 100 + n, game: ID_MUSICA, lang: 'eng', level: cancion, correct, total: 12, streak: correct, day,
    });

  it('la canción completada queda en el perfil y suma flores una vez por día', () => {
    const s = project('ana', [partida('a', 12, 1), partida('a', 12, 2), partida('b', 12, 3)]);
    expect(s.cancionesCompletas).toEqual(['a', 'b']);
    expect(s.sacuanjoches).toBe(10);
  });

  it('con menos de la mitad no cuenta como completada', () => {
    const s = project('ana', [partida('a', 5, 1)]);
    expect(s.cancionesCompletas).toEqual([]);
    expect(s.sacuanjoches).toBe(0);
  });

  it('repetirla otro día cuenta una sola vez como completada', () => {
    const s = project('ana', [partida('a', 12, 1), partida('a', 12, 2, '2026-10-05')]);
    expect(s.cancionesCompletas).toEqual(['a']);
    expect(s.sacuanjoches).toBe(10);
  });
});
