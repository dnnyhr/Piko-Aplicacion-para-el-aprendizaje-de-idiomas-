import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '@core/ids';
import { gameDoneEvent, type ProgressEvent } from '@core/progress/events';
import { project } from '@core/progress/projection';
import {
  armarCompletar,
  armarEscucha,
  cancionesAbiertas,
  ID_MUSICA,
  OPCIONES_CANCION,
  sacuanjochesPorCancion,
  taparEnVerso,
  validarCancion,
  type Cancion,
} from '@core/canciones/cancion';
import { CANCIONES } from '../content/canciones';

/** Los ids del diccionario miskito que se pueden usar: sin «revisar». */
function lexicoMiskito(): Set<string> {
  const lexico = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../../diccionario/miskito/lexico.json'), 'utf8'),
  ) as { entradas: { id: string; revisar?: string }[] };
  return new Set(lexico.entradas.filter((e) => !e.revisar).map((e) => e.id));
}

/**
 * Una canción SÓLO PARA PROBAR el formato. No es una canción real ni va a la
 * app: la letra son frases del corpus de inglés de Piko.
 */
function prueba(extra: Partial<Cancion> = {}): Cancion {
  return {
    id: 'prueba',
    titulo: 'Prueba',
    lengua: 'eng',
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
    conoce: { origen: 'prueba', lengua: 'inglés', region: 'prueba', representa: 'prueba' },
    letra: [
      { texto: 'The bird is green', es: 'El pájaro es verde', inicio: 0, fin: 3 },
      { texto: 'The bird can fly', es: 'El pájaro puede volar', inicio: 3, fin: 6 },
      { texto: 'My family is big', es: 'Mi familia es grande', inicio: 6, fin: 9 },
    ],
    palabras: [
      { texto: 'bird', es: 'pájaro', en: 'bird' },
      { texto: 'green', es: 'verde', en: 'green' },
      { texto: 'family', es: 'familia', en: 'family' },
      { texto: 'big', es: 'grande', en: 'big' },
    ],
    completar: [{ verso: 0, en: 'texto', oculta: 'bird' }],
    canta: { desde: 0, hasta: 1 },
    ...extra,
  };
}

describe('canciones de la app', () => {
  it('cada canción cumple el formato, con permiso y traducciones validadas', () => {
    const miq = lexicoMiskito();
    for (const cancion of CANCIONES) {
      expect(validarCancion(cancion, cancion.lengua === 'miq' ? miq : undefined)).toEqual([]);
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
    const c = prueba({ lengua: 'miq', letra: [{ texto: 'Yul pisa', inicio: 0, fin: 2 }, ...prueba().letra.slice(1)] });
    expect(validarCancion(c).join(' ')).toMatch(/traducción validada/);
  });

  it('en miskito, cada palabra clave tiene que estar en el diccionario', () => {
    const miq = lexicoMiskito();
    const c = prueba({
      lengua: 'miq',
      palabras: [
        { texto: 'yul', es: 'perro', en: 'dog', lexico: 'yul' },
        { texto: 'dus', es: 'árbol', en: 'tree', lexico: 'dus' },
        { texto: 'inventada', es: 'algo', en: 'something', lexico: 'no-existe' },
      ],
    });
    const errores = validarCancion(c, miq).join(' ');
    expect(errores).toMatch(/inventada/);
    expect(errores).not.toMatch(/«yul»/);
  });

  it('el hueco tiene que estar en el verso', () => {
    const c = prueba({ completar: [{ verso: 0, en: 'texto', oculta: 'house' }] });
    expect(validarCancion(c).join(' ')).toMatch(/no está en ese verso/);
  });

  it('pide entre 3 y 5 palabras clave', () => {
    expect(validarCancion(prueba({ palabras: prueba().palabras.slice(0, 2) })).join(' ')).toMatch(/entre 3 y 5/);
  });
});

describe('canciones: actividades', () => {
  it('tapa la palabra respetando los signos', () => {
    expect(taparEnVerso('The bird is green', 'bird')).toBe('The ___ is green');
    expect(taparEnVerso('¡Yul pisa!', 'yul')).toBe('¡___ pisa!');
  });

  it('«Completa la canción»: la respuesta entre otras palabras de la canción', () => {
    const c = prueba();
    for (let s = 1; s <= 10; s++) {
      const [q] = armarCompletar(c, mulberry32(s));
      expect(q!.conHueco).toBe('The ___ is green');
      expect(q!.opciones).toHaveLength(OPCIONES_CANCION.inicial);
      expect(q!.opciones[q!.correcta]).toBe('bird');
    }
  });

  it('«Escucha y reconoce»: palabras en los primeros niveles, versos en el avanzado', () => {
    const inicial = armarEscucha(prueba(), mulberry32(1));
    expect(inicial.every((q) => q.palabra && q.opciones[q.correcta] === q.palabra.texto)).toBe(true);
    const avanzado = armarEscucha(prueba({ nivel: 'avanzado' }), mulberry32(1));
    expect(avanzado.every((q) => q.verso && q.opciones[q.correcta] === q.verso.texto)).toBe(true);
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
  it('completar con la mitad da 3; buenas respuestas y racha suman', () => {
    expect(sacuanjochesPorCancion(2, 5, 1)).toBe(0);
    expect(sacuanjochesPorCancion(3, 6, 1)).toBe(3);
    expect(sacuanjochesPorCancion(5, 6, 2)).toBe(4);
    expect(sacuanjochesPorCancion(6, 6, 6)).toBe(5);
  });

  const partida = (cancion: string, correct: number, n: number, day = '2026-10-04'): ProgressEvent =>
    gameDoneEvent({
      id: `m${n}`, studentId: 'ana', originDevice: 'd', createdAt: 100 + n, game: ID_MUSICA, lang: 'eng', level: cancion, correct, total: 6, streak: correct, day,
    });

  it('la canción completada queda en el perfil y suma flores una vez por día', () => {
    const s = project('ana', [partida('a', 6, 1), partida('a', 6, 2), partida('b', 6, 3)]);
    expect(s.cancionesCompletas).toEqual(['a', 'b']);
    expect(s.sacuanjoches).toBe(10);
  });

  it('con menos de la mitad no cuenta como completada', () => {
    const s = project('ana', [partida('a', 2, 1)]);
    expect(s.cancionesCompletas).toEqual([]);
    expect(s.sacuanjoches).toBe(0);
  });

  it('repetirla otro día cuenta una sola vez como completada', () => {
    const s = project('ana', [partida('a', 6, 1), partida('a', 6, 2, '2026-10-05')]);
    expect(s.cancionesCompletas).toEqual(['a']);
    expect(s.sacuanjoches).toBe(10);
  });
});
