import { describe, expect, it } from 'vitest';
import { validatePack, words } from '@core/content/schema';
import { pickAdaptive, pickRound, poolDe, temasDe } from '@core/content/selector';
import { hashSeed, mulberry32 } from '@core/ids';
import { project } from '@core/progress/projection';
import { fabricaEventos, packDemo } from './helpers';

describe('validatePack', () => {
  it('acepta un paquete correcto', () => {
    const r = validatePack(packDemo);
    expect(r.ok).toBe(true);
  });

  it('rechaza un idioma desconocido', () => {
    const r = validatePack({ ...packDemo, lang: 'xyz' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toContain('lang');
  });

  it('rechaza una respuesta que no está entre las opciones', () => {
    const r = validatePack({
      ...packDemo,
      items: [{ id: 'x', type: 'choice', skill: 's', prompt: 'p', answer: 'no', options: ['a', 'b'] }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toContain('no está entre las');
  });

  it('rechaza ids repetidos', () => {
    const r = validatePack({ ...packDemo, items: [packDemo.items[0], packDemo.items[0]] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toContain('repetido');
  });

  it('exige que cada palabra de la oración exista como bloque', () => {
    const r = validatePack({
      ...packDemo,
      items: [
        { id: 'b1', type: 'build', skill: 's', target: 'My name is Piko', blocks: ['My', 'name', 'is'], gloss: 'g' },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toContain('Piko');
  });

  it('cuenta las palabras repetidas de la oración', () => {
    const conRepetida = validatePack({
      ...packDemo,
      items: [
        { id: 'b2', type: 'build', skill: 's', target: 'is it is', blocks: ['is', 'it'], gloss: 'g' },
      ],
    });
    expect(conRepetida.ok).toBe(false);

    const completa = validatePack({
      ...packDemo,
      items: [
        { id: 'b3', type: 'build', skill: 's', target: 'is it is', blocks: ['is', 'it', 'is'], gloss: 'g' },
      ],
    });
    expect(completa.ok).toBe(true);
  });

  it('words ignora espacios de más', () => {
    expect(words('  My   name is  ')).toEqual(['My', 'name', 'is']);
  });
});

describe('selección', () => {
  it('filtra por idioma, tema y dificultad', () => {
    expect(poolDe([packDemo], { lang: 'eng' })).toHaveLength(4);
    expect(poolDe([packDemo], { lang: 'miq' })).toHaveLength(0);
    expect(poolDe([packDemo], { lang: 'eng', themes: ['otro'] })).toHaveLength(0);
    expect(poolDe([packDemo], { lang: 'eng', difficulty: 3 })).toHaveLength(0);
  });

  it('filtra por tipo de ejercicio', () => {
    const soloBuild = poolDe([packDemo], { lang: 'eng', types: ['build'] });
    expect(soloBuild).toHaveLength(1);
    expect(soloBuild[0]?.item.type).toBe('build');
  });

  it('el pool no depende del orden en que se leyeron los paquetes', () => {
    const invertido = { ...packDemo, items: packDemo.items.slice().reverse() };
    expect(poolDe([packDemo], { lang: 'eng' }).map((x) => x.item.id)).toEqual(
      poolDe([invertido], { lang: 'eng' }).map((x) => x.item.id),
    );
  });

  it('la misma semilla produce exactamente la misma ronda', () => {
    const seed = hashSeed('sesion-abc');
    const a = pickRound([packDemo], { lang: 'eng', count: 3, seed });
    const b = pickRound([packDemo], { lang: 'eng', count: 3, seed });
    expect(a.map((x) => x.item.id)).toEqual(b.map((x) => x.item.id));
  });

  it('semillas distintas producen rondas distintas', () => {
    const a = pickRound([packDemo], { lang: 'eng', count: 4, seed: hashSeed('uno') });
    const b = pickRound([packDemo], { lang: 'eng', count: 4, seed: hashSeed('dos') });
    expect(a.map((x) => x.item.id)).not.toEqual(b.map((x) => x.item.id));
  });

  it('no pide más ítems de los que hay', () => {
    expect(pickRound([packDemo], { lang: 'eng', count: 99, seed: 1 })).toHaveLength(4);
  });

  it('la selección adaptativa no repite ítems', () => {
    const out = pickAdaptive([packDemo], { lang: 'eng', count: 4, rng: mulberry32(5) });
    expect(new Set(out.map((x) => x.item.id)).size).toBe(4);
  });

  it('la selección adaptativa insiste con la habilidad más floja', () => {
    const f = fabricaEventos(2);
    const eventos = [
      ...Array.from({ length: 12 }, (_, i) => ({
        ...f.respuesta('ana', { correct: true, skill: 'eng.saludos' }),
        seq: i + 1,
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        ...f.respuesta('ana', { correct: false, skill: 'eng.numeros' }),
        seq: i + 13,
      })),
    ];
    const state = project('ana', eventos);

    // Sobre muchas muestras de un solo ítem, `eng.numeros` debe salir más veces
    // que `eng.saludos`, que ya domina.
    let numeros = 0;
    let saludos = 0;
    for (let s = 0; s < 400; s++) {
      const [elegido] = pickAdaptive([packDemo], {
        lang: 'eng',
        count: 1,
        state,
        rng: mulberry32(s),
      });
      if (elegido?.item.skill === 'eng.numeros') numeros++;
      if (elegido?.item.skill === 'eng.saludos') saludos++;
    }
    // Un solo ítem de `eng.numeros` compite contra dos de `eng.saludos` y aun
    // así sale más veces, porque pesa el dominio y no la cantidad.
    expect(numeros).toBeGreaterThan(saludos);
  });

  it('temasDe lista los temas del idioma', () => {
    expect(temasDe([packDemo], 'eng')).toEqual(['saludos']);
    expect(temasDe([packDemo], 'rma')).toEqual([]);
  });
});
