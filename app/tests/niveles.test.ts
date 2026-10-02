import { describe, expect, it } from 'vitest';
import { lessonDoneEvent } from '@core/progress/events';
import { project } from '@core/progress/projection';
import {
  PACK_MEZCLA,
  caminoDe,
  estadoDelCamino,
  estrellasDe,
  nivelActual,
  resumenCamino,
} from '@core/progress/niveles';
import type { Pack } from '@core/content/schema';
import { packDemo } from './helpers';

const pack = (id: string, theme: string, difficulty: 1 | 2 | 3, lang: Pack['lang'] = 'eng'): Pack => ({
  ...packDemo,
  id,
  theme,
  title: theme,
  difficulty,
  lang,
});

const PACKS: Pack[] = [
  pack('eng.saludos.1', 'saludos', 1),
  pack('eng.escuela.2', 'escuela', 2),
  pack('miq.saludos.1', 'saludos', 1, 'miq'),
  pack('eng.numeros.1', 'numeros', 1),
  pack('eng.colores.1', 'colores', 1),
];

let n = 0;
const leccion = (packId: string, correct: number, total: number) =>
  lessonDoneEvent({
    id: `l-${++n}`,
    studentId: 'ana',
    originDevice: 'dev-a',
    createdAt: 1_700_000_000_000 + n,
    packId,
    correct,
    total,
  });

describe('estrellas', () => {
  it('1 por terminar, 2 si salió bien, 3 si fue perfecta', () => {
    expect(estrellasDe(0, 8)).toBe(1);
    expect(estrellasDe(5, 8)).toBe(1);
    expect(estrellasDe(6, 8)).toBe(2);
    expect(estrellasDe(8, 8)).toBe(3);
    expect(estrellasDe(0, 0)).toBe(0);
  });

  it('se guarda la mejor vez, no la última', () => {
    const s = project('ana', [leccion('eng.saludos.1', 8, 8), leccion('eng.saludos.1', 1, 8)]);
    expect(s.stars['eng.saludos.1']).toBe(3);
  });

  it('una ronda mezclada no cuenta para ningún nivel', () => {
    const s = project('ana', [leccion(PACK_MEZCLA, 8, 8)]);
    expect(s.stars).toEqual({});
  });
});

describe('camino de niveles', () => {
  const camino = caminoDe(PACKS, 'eng');

  it('un nivel por paquete de la lengua, por dificultad y luego en orden de registro', () => {
    expect(camino.map((c) => c.packId)).toEqual([
      'eng.saludos.1',
      'eng.numeros.1',
      'eng.colores.1',
      'eng.escuela.2',
    ]);
    expect(camino.map((c) => c.numero)).toEqual([1, 2, 3, 4]);
  });

  it('al empezar, el primero toca y los demás tienen candado', () => {
    const niveles = estadoDelCamino(camino, {});
    expect(niveles.map((x) => x.estado)).toEqual(['actual', 'bloqueado', 'bloqueado', 'bloqueado']);
    expect(nivelActual(niveles)?.numero).toBe(1);
  });

  it('superar un nivel abre el siguiente', () => {
    const s = project('ana', [leccion('eng.saludos.1', 6, 8)]);
    const niveles = estadoDelCamino(camino, s.stars);
    expect(niveles.map((x) => x.estado)).toEqual(['superado', 'actual', 'bloqueado', 'bloqueado']);
    expect(niveles[0]?.estrellas).toBe(2);
  });

  it('jugar un tema más adelante no salta niveles, pero sus estrellas esperan', () => {
    const adelantado = { 'eng.escuela.2': 3 };
    let niveles = estadoDelCamino(camino, adelantado);
    expect(niveles[3]).toMatchObject({ estado: 'bloqueado', estrellas: 0 });

    niveles = estadoDelCamino(camino, { ...adelantado, 'eng.saludos.1': 1, 'eng.numeros.1': 1, 'eng.colores.1': 2 });
    expect(niveles[3]).toMatchObject({ estado: 'superado', estrellas: 3 });
  });

  it('el resumen cuenta niveles y estrellas', () => {
    const niveles = estadoDelCamino(camino, { 'eng.saludos.1': 3, 'eng.numeros.1': 1 });
    expect(resumenCamino(niveles)).toEqual({
      superados: 2,
      total: 4,
      estrellas: 4,
      estrellasPosibles: 12,
      nivel: 3,
      completo: false,
    });
  });

  it('con todo superado, Piko se queda en la cima', () => {
    const todo = Object.fromEntries(camino.map((c) => [c.packId, 3]));
    const niveles = estadoDelCamino(camino, todo);
    expect(resumenCamino(niveles).completo).toBe(true);
    expect(nivelActual(niveles)?.numero).toBe(4);
  });
});
