/**
 * Corrección de respuestas.
 *
 * Vive en el núcleo y no en la pantalla: es la regla que decide si un niño
 * acertó, y tiene que ser idéntica en el teléfono del estudiante y en el del
 * maestro. Además así se puede probar sin montar la interfaz.
 */

import { words, type Item } from './schema';

export type Respuesta =
  | { tipo: 'opcion'; valor: string }
  | { tipo: 'bloques'; palabras: readonly string[] };

/**
 * Normalización para comparar. Se ignoran mayúsculas, espacios de más y la
 * puntuación final — un niño que escribe la oración correcta sin el signo de
 * pregunta la sabe igual.
 */
export function normalizar(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase()
    .replace(/[.,!?¿¡;:]+$/u, '')
    .replace(/\s+/g, ' ');
}

export function esCorrecta(item: Item, respuesta: Respuesta): boolean {
  switch (item.type) {
    case 'choice':
    case 'listen':
      return respuesta.tipo === 'opcion' && normalizar(respuesta.valor) === normalizar(item.answer);

    case 'build': {
      if (respuesta.tipo !== 'bloques') return false;
      const esperado = words(item.target).map(normalizar);
      const dado = respuesta.palabras.map(normalizar);
      if (esperado.length !== dado.length) return false;
      return esperado.every((p, i) => p === dado[i]);
    }
  }
}

/** El texto que se le muestra al estudiante como la forma correcta. */
export function respuestaCorrecta(item: Item): string {
  return item.type === 'build' ? item.target : item.answer;
}

/** La traducción al español, cuando el ítem la trae. */
export function glosaDe(item: Item): string | undefined {
  return item.type === 'choice' ? item.prompt : item.gloss;
}

/** Lo que se le pide al estudiante, en español. */
export function enunciadoDe(item: Item): string {
  switch (item.type) {
    case 'choice':
      return item.prompt;
    case 'listen':
      return 'Escuchá y elegí lo que oíste';
    case 'build':
      return item.gloss;
  }
}

/**
 * Una respuesta vacía o a medio armar cuenta como no respondida, no como
 * error: el botón de comprobar queda apagado en vez de castigar el intento.
 */
export function estaCompleta(item: Item, respuesta: Respuesta | null): boolean {
  if (!respuesta) return false;
  if (respuesta.tipo === 'opcion') return respuesta.valor.length > 0;
  if (item.type !== 'build') return false;
  return respuesta.palabras.length === words(item.target).length;
}
