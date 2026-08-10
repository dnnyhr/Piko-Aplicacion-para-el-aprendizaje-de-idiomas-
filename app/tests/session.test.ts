import { describe, expect, it } from 'vitest';
import { nuevaSesion, reduce, tabla, type SesionState } from '@core/session/machine';

const correr = (state: SesionState, ...acciones: Parameters<typeof reduce>[1][]): SesionState =>
  acciones.reduce(reduce, state);

describe('sesión de aula', () => {
  it('arranca vacía en lobby', () => {
    const s = nuevaSesion('s1');
    expect(s.fase).toBe('lobby');
    expect(s.presentes).toEqual([]);
  });

  it('admite estudiantes sin duplicarlos', () => {
    const s = correr(
      nuevaSesion('s1'),
      { type: 'entra', studentId: 'ana' },
      { type: 'entra', studentId: 'ana' },
      { type: 'entra', studentId: 'beto' },
    );
    expect(s.presentes).toEqual(['ana', 'beto']);
  });

  it('no acepta respuestas fuera de ronda', () => {
    const s = correr(
      nuevaSesion('s1'),
      { type: 'entra', studentId: 'ana' },
      { type: 'responde', studentId: 'ana', itemId: 'e1', correct: true },
    );
    expect(s.marcador.ana?.answered).toBe(0);
  });

  it('no acepta respuestas de un ítem que no es de la ronda', () => {
    const s = correr(
      nuevaSesion('s1'),
      { type: 'entra', studentId: 'ana' },
      { type: 'iniciarRonda', itemIds: ['e1'], endsAt: 1000 },
      { type: 'responde', studentId: 'ana', itemId: 'otro', correct: true },
    );
    expect(s.marcador.ana?.answered).toBe(0);
  });

  it('cuenta aciertos e intentos durante la ronda', () => {
    const s = correr(
      nuevaSesion('s1'),
      { type: 'entra', studentId: 'ana' },
      { type: 'iniciarRonda', itemIds: ['e1', 'e2'], endsAt: 1000 },
      { type: 'responde', studentId: 'ana', itemId: 'e1', correct: true },
      { type: 'responde', studentId: 'ana', itemId: 'e2', correct: false },
    );
    expect(s.marcador.ana).toMatchObject({ answered: 2, correct: 1, xp: 12 });
  });

  it('no permite iniciar una ronda encima de otra', () => {
    const s = correr(
      nuevaSesion('s1'),
      { type: 'iniciarRonda', itemIds: ['e1'], endsAt: 1000 },
      { type: 'iniciarRonda', itemIds: ['e9'], endsAt: 2000 },
    );
    expect(s.ronda).toBe(1);
    expect(s.itemIds).toEqual(['e1']);
  });

  it('el que se desconecta conserva su marcador', () => {
    const s = correr(
      nuevaSesion('s1'),
      { type: 'entra', studentId: 'ana' },
      { type: 'iniciarRonda', itemIds: ['e1'], endsAt: 1000 },
      { type: 'responde', studentId: 'ana', itemId: 'e1', correct: true },
      { type: 'sale', studentId: 'ana' },
    );
    expect(s.presentes).toEqual([]);
    expect(s.marcador.ana?.correct).toBe(1);

    const vuelve = reduce(s, { type: 'entra', studentId: 'ana' });
    expect(vuelve.marcador.ana?.correct).toBe(1);
  });

  it('una sesión cerrada ya no acepta a nadie', () => {
    const s = correr(nuevaSesion('s1'), { type: 'cerrar' }, { type: 'entra', studentId: 'ana' });
    expect(s.fase).toBe('terminada');
    expect(s.presentes).toEqual([]);
  });

  it('la tabla ordena por aciertos y desempata estable', () => {
    const s = correr(
      nuevaSesion('s1'),
      { type: 'iniciarRonda', itemIds: ['e1'], endsAt: 1000 },
      { type: 'responde', studentId: 'zoe', itemId: 'e1', correct: true },
      { type: 'responde', studentId: 'ana', itemId: 'e1', correct: true },
      { type: 'responde', studentId: 'beto', itemId: 'e1', correct: false },
    );
    expect(tabla(s).map((f) => f.studentId)).toEqual(['ana', 'zoe', 'beto']);
  });
});
