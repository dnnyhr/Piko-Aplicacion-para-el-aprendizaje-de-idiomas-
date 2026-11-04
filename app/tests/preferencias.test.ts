/**
 * «Mi forma de aprender»: que las preferencias sobrevivan, que nunca impidan
 * abrir la app, que el alto contraste sea alto de verdad y que no se cuele
 * contenido de lengua de señas sin validar.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { driverNode } from '@/db/driver';
import { migrar } from '@/db/sqliteLog';
import { MIGRACIONES } from '@/db/schema';
import {
  escribirPreferencias,
  leerPreferencias,
  PREFERENCIAS_INICIALES,
  TAMANOS,
  tamanoVecino,
} from '@core/preferencias/preferencias';
import { textoDelAudio } from '@core/preferencias/escrito';
import { recursosPara, validarRecurso, type RecursoSena } from '@core/senas/recurso';
import { color, colorContraste, type Paleta } from '@/ui/tokens';
import { ES } from '@/ui/textos/es';
import { PASOS } from '@/features/instrucciones/pasos';
import { RECURSOS_SENAS } from '../content/senas';

// `db/index.ts` arrastra expo-sqlite: acá se corre el mismo SQL contra node:sqlite.
const GUARDAR = 'UPDATE device SET preferencias = ? WHERE id = 1';
const LEER = 'SELECT preferencias FROM device WHERE id = 1';

describe('las preferencias', () => {
  it('sin nada guardado, la app queda como siempre', () => {
    expect(leerPreferencias(null)).toEqual(PREFERENCIAS_INICIALES);
    expect(PREFERENCIAS_INICIALES).toMatchObject({ tamano: 'normal', contraste: false, narracion: false });
  });

  it('se pueden combinar todas', () => {
    const todas = { tamano: 'muy_grande', contraste: true, narracion: true, pasoAPaso: true, senas: true } as const;
    expect(leerPreferencias(escribirPreferencias(todas))).toEqual(todas);
  });

  it('un dato dañado o viejo nunca rompe la app', () => {
    expect(leerPreferencias('{esto no es json')).toEqual(PREFERENCIAS_INICIALES);
    expect(leerPreferencias('"texto"')).toEqual(PREFERENCIAS_INICIALES);
    expect(leerPreferencias('null')).toEqual(PREFERENCIAS_INICIALES);
    expect(leerPreferencias('{"tamano":"enorme","contraste":"si"}')).toEqual(PREFERENCIAS_INICIALES);
    // Lo que se entiende se conserva.
    expect(leerPreferencias('{"contraste":true}').contraste).toBe(true);
  });

  it('el tamaño sube y baja de a un paso y se queda en la punta', () => {
    expect(tamanoVecino('normal', 1)).toBe('grande');
    expect(tamanoVecino('normal', -1)).toBe('chico');
    expect(tamanoVecino(TAMANOS[0], -1)).toBe(TAMANOS[0]);
    expect(tamanoVecino('muy_grande', 1)).toBe('muy_grande');
  });

  it('sobreviven a cerrar y volver a abrir la base', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'piko-'));
    const archivo = path.join(dir, 'piko.db');
    const elegidas = { ...PREFERENCIAS_INICIALES, tamano: 'grande', contraste: true } as const;
    try {
      const primera = new DatabaseSync(archivo);
      const sql = driverNode(primera);
      migrar(sql);
      sql.run('INSERT OR REPLACE INTO device (id, device_id) VALUES (1, ?)', ['tel']);
      sql.run(GUARDAR, [escribirPreferencias(elegidas)]);
      primera.close();

      const segunda = new DatabaseSync(archivo);
      const otra = driverNode(segunda);
      migrar(otra);
      expect(leerPreferencias(otra.get<{ preferencias: string }>(LEER)?.preferencias)).toEqual(elegidas);
      segunda.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('un teléfono que viene de la versión anterior conserva todo', () => {
    const db = new DatabaseSync(':memory:');
    const sql = driverNode(db);
    // La base tal como quedó en la versión 3.
    for (const v of MIGRACIONES.slice(0, 3)) for (const paso of v) sql.exec(paso);
    sql.exec('PRAGMA user_version = 3');
    sql.run("INSERT INTO device (id, device_id, idioma_app) VALUES (1, 'tel', 'miq')");

    migrar(sql);

    const fila = sql.get<{ idioma_app: string; preferencias: string | null }>('SELECT idioma_app, preferencias FROM device');
    expect(fila).toEqual({ idioma_app: 'miq', preferencias: null });
    db.close();
  });
});

/** Relación de contraste de la WCAG entre dos colores `#RRGGBB`. */
function contraste(a: string, b: string): number {
  const luz = (hex: string) => {
    const canal = (i: number) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5);
  };
  const [claro, oscuro] = [luz(a), luz(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Texto sobre fondo, tal como se usan en las pantallas. */
const PAREJAS: readonly (readonly [keyof Paleta, keyof Paleta])[] = [
  ['tinta', 'papel'],
  ['tintaSuave', 'papel'],
  ['grafito', 'blanco'],
  ['tinta', 'blanco'],
  ['tintaSuave', 'blanco'],
  ['verde', 'papel'],
  ['verde', 'blanco'],
  ['verdeHondo', 'verdePasto'],
  ['tintaCielo', 'cielo'],
  ['tintaCielo', 'nube'],
  ['tintaPico', 'pico'],
  ['aciertoTinta', 'aciertoFondo'],
  ['intentoTinta', 'intentoFondo'],
  ['copete', 'blanco'],
  ['cieloHondo', 'blanco'],
];

describe('el contraste', () => {
  it('el alto contraste llega a 7:1 (WCAG AAA) en todo texto', () => {
    for (const [tinta, fondo] of PAREJAS) {
      expect(contraste(colorContraste[tinta], colorContraste[fondo]), `${tinta} sobre ${fondo}`).toBeGreaterThanOrEqual(7);
    }
  });

  it('los bordes se distinguen del papel', () => {
    expect(contraste(colorContraste.borde, colorContraste.papel)).toBeGreaterThanOrEqual(3);
    expect(contraste(colorContraste.bordeElegido, colorContraste.nube)).toBeGreaterThanOrEqual(3);
    expect(contraste(colorContraste.barra, colorContraste.papelHondo)).toBeGreaterThanOrEqual(3);
  });

  it('la paleta normal llega a 4.5:1 (WCAG AA) en la tinta suave y los botones', () => {
    expect(contraste(color.tintaSuave, color.papel)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(color.tintaCielo, color.cielo)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(color.tintaPico, color.pico)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(color.verdeHondo, color.verdePasto)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('la alternativa escrita', () => {
  const palabra = { meta: 'dog', es: 'perro' };

  it('nunca regala la respuesta', () => {
    expect(textoDelAudio(palabra, true)).toEqual({ forma: 'significa', texto: 'perro' });
    expect(textoDelAudio(palabra, false)).toEqual({ forma: 'dice', texto: 'dog' });
  });
});

describe('los textos de la accesibilidad', () => {
  const nuestros = Object.entries(ES).filter(([k]) => /^(forma|paso|instruccion|escrito|senas)\./.test(k));

  it('cada paso existe y es corto', () => {
    for (const pasos of Object.values(PASOS)) {
      expect(pasos.length).toBeGreaterThanOrEqual(3);
      for (const p of pasos) expect((ES[p.texto] as string).length).toBeLessThanOrEqual(80);
    }
  });

  it('no diagnostican ni clasifican a nadie', () => {
    for (const [clave, texto] of nuestros) {
      expect(texto as string, clave).not.toMatch(/discapacid|sord[oa]|ciego|autis|dislex|diagn|problema|necesidades especiales/i);
    }
  });

  it('siguen la regla de tono de Piko', () => {
    for (const [clave, texto] of nuestros) {
      if (clave === 'forma.no') continue; // el estado del interruptor
      expect(texto as string, clave).not.toMatch(/\bmal\b|incorrect|error/i);
    }
  });
});

describe('la lengua de señas', () => {
  const valido: RecursoSena = {
    id: 'ejemplo',
    lengua: 'ncs',
    clave: 'instruccion.choice',
    video: 1,
    descripcion: 'Elegí la traducción correcta.',
    permiso: true,
    validacion: { por: 'Persona de prueba', competencia: 'Usuaria de la lengua', fecha: '2026-01-01' },
  };

  it('todo lo que hay en el catálogo está validado', () => {
    for (const r of RECURSOS_SENAS) expect(validarRecurso(r), r.id).toEqual([]);
  });

  it('un recurso completo pasa', () => {
    expect(validarRecurso(valido)).toEqual([]);
    expect(recursosPara([valido], ['instruccion.choice'])).toEqual([valido]);
    expect(recursosPara([valido], ['instruccion.build'])).toEqual([]);
  });

  it('sin validación, sin permiso o sin descripción no llega a la pantalla', () => {
    const faltas: unknown[] = [
      { ...valido, validacion: undefined },
      { ...valido, validacion: { por: ' ', competencia: 'x', fecha: '2026-01-01' } },
      { ...valido, validacion: { por: 'x', competencia: '', fecha: '2026-01-01' } },
      { ...valido, validacion: { por: 'x', competencia: 'x', fecha: 'ayer' } },
      { ...valido, permiso: false },
      { ...valido, descripcion: '' },
      { ...valido, clave: 'cualquier-cosa' },
    ];
    for (const r of faltas) {
      expect(validarRecurso(r).length).toBeGreaterThan(0);
      expect(recursosPara([r as RecursoSena], [valido.clave])).toEqual([]);
    }
  });
});
