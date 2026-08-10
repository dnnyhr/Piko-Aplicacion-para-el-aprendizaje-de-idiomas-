import { describe, expect, it } from 'vitest';
import {
  enunciadoDe,
  esCorrecta,
  estaCompleta,
  glosaDe,
  normalizar,
  respuestaCorrecta,
} from '@core/content/verificar';
import type { BuildItem, ChoiceItem, ListenItem } from '@core/content/schema';
import { packDemo } from './helpers';

const choice = packDemo.items[0] as ChoiceItem; // "Buenos días" → Good morning
const build = packDemo.items[2] as BuildItem; // "My name is Piko"
const listen = packDemo.items[3] as ListenItem; // three

describe('normalizar', () => {
  it('ignora mayúsculas, espacios de más y puntuación final', () => {
    expect(normalizar('  How  are   you?  ')).toBe('how are you');
    expect(normalizar('Good Morning')).toBe('good morning');
  });

  it('no toca la puntuación interna', () => {
    expect(normalizar("it's fine")).toBe("it's fine");
  });
});

describe('selección múltiple', () => {
  it('acepta la respuesta correcta', () => {
    expect(esCorrecta(choice, { tipo: 'opcion', valor: 'Good morning' })).toBe(true);
  });

  it('es tolerante con mayúsculas', () => {
    expect(esCorrecta(choice, { tipo: 'opcion', valor: 'good MORNING' })).toBe(true);
  });

  it('rechaza otra opción', () => {
    expect(esCorrecta(choice, { tipo: 'opcion', valor: 'Good night' })).toBe(false);
  });

  it('no acepta una respuesta de otro tipo', () => {
    expect(esCorrecta(choice, { tipo: 'bloques', palabras: ['Good', 'morning'] })).toBe(false);
  });
});

describe('escucha', () => {
  it('funciona igual que la selección múltiple', () => {
    expect(esCorrecta(listen, { tipo: 'opcion', valor: 'three' })).toBe(true);
    expect(esCorrecta(listen, { tipo: 'opcion', valor: 'tree' })).toBe(false);
  });
});

describe('construcción por bloques', () => {
  it('acepta la oración en el orden correcto', () => {
    expect(
      esCorrecta(build, { tipo: 'bloques', palabras: ['My', 'name', 'is', 'Piko'] }),
    ).toBe(true);
  });

  it('rechaza el orden cambiado', () => {
    expect(
      esCorrecta(build, { tipo: 'bloques', palabras: ['My', 'is', 'name', 'Piko'] }),
    ).toBe(false);
  });

  it('rechaza si falta o sobra una palabra', () => {
    expect(esCorrecta(build, { tipo: 'bloques', palabras: ['My', 'name', 'is'] })).toBe(false);
    expect(
      esCorrecta(build, { tipo: 'bloques', palabras: ['My', 'name', 'is', 'Piko', 'your'] }),
    ).toBe(false);
  });

  it('es tolerante con mayúsculas', () => {
    expect(
      esCorrecta(build, { tipo: 'bloques', palabras: ['my', 'NAME', 'is', 'piko'] }),
    ).toBe(true);
  });
});

describe('textos para la pantalla', () => {
  it('la respuesta correcta es la oración completa en los bloques', () => {
    expect(respuestaCorrecta(build)).toBe('My name is Piko');
    expect(respuestaCorrecta(choice)).toBe('Good morning');
  });

  it('la glosa sale del campo que corresponde a cada tipo', () => {
    expect(glosaDe(build)).toBe('Mi nombre es Piko');
    expect(glosaDe(listen)).toBe('tres');
    expect(glosaDe(choice)).toBe('Buenos días');
  });

  it('el enunciado cambia según el tipo', () => {
    expect(enunciadoDe(choice)).toBe('Buenos días');
    expect(enunciadoDe(build)).toBe('Mi nombre es Piko');
    expect(enunciadoDe(listen)).toContain('Escuchá');
  });
});

describe('respuesta completa', () => {
  it('null no está completa', () => {
    expect(estaCompleta(choice, null)).toBe(false);
  });

  it('una opción vacía no cuenta', () => {
    expect(estaCompleta(choice, { tipo: 'opcion', valor: '' })).toBe(false);
    expect(estaCompleta(choice, { tipo: 'opcion', valor: 'algo' })).toBe(true);
  });

  it('los bloques necesitan tantas palabras como la oración', () => {
    expect(estaCompleta(build, { tipo: 'bloques', palabras: ['My', 'name'] })).toBe(false);
    expect(estaCompleta(build, { tipo: 'bloques', palabras: ['My', 'name', 'is', 'Piko'] })).toBe(
      true,
    );
  });
});
