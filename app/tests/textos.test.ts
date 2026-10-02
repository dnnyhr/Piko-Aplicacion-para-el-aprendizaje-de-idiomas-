import { describe, expect, it } from 'vitest';
import { ES } from '../src/ui/textos/es';
import { avance, desdeIdioma, esClave, frasesDe, traducir } from '../src/ui/textos/traducir';

describe('textos de la interfaz', () => {
  it('en español devuelve el catálogo', () => {
    expect(traducir('spa', 'portada.practicar')).toBe(ES['portada.practicar']);
  });

  it('lo que no está traducido al miskito se muestra en español', () => {
    expect(traducir('miq', 'ejercicio.comprobar')).toBe(traducir('spa', 'ejercicio.comprobar'));
    expect(frasesDe('miq', 'piko.acierto').length).toBeGreaterThan(0);
  });

  it('reemplaza los valores', () => {
    expect(traducir('spa', 'unirse.entraste', { codigo: 'K7' })).toContain('K7');
    expect(traducir('spa', 'comun.xp_correctas', { xp: 30, correctas: 3, respondidas: 4 })).toBe('30 XP · 3/4 correctas');
  });

  it('con la app en miskito se aprende desde el miskito', () => {
    expect(desdeIdioma('miq')).toBe('miq');
    expect(desdeIdioma('spa')).toBe('spa');
  });

  it('reconoce las claves de temas y lenguas', () => {
    expect(esClave('tema.saludos')).toBe(true);
    expect(esClave('tema.no_existe')).toBe(false);
    expect(esClave('piko.acierto')).toBe(false);
  });

  it('cuenta el avance de la traducción', () => {
    const a = avance('miq');
    expect(a.total).toBe(Object.keys(ES).length);
    expect(a.traducidos).toBeLessThanOrEqual(a.total);
  });

  it('las frases de Piko para los errores no dicen «mal» ni «incorrecto»', () => {
    for (const f of ES['piko.intento']) expect(f.toLowerCase()).not.toMatch(/\bmal\b|incorrect|\bno\b/);
  });
});
