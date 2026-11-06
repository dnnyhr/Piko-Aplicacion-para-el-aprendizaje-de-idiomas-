/**
 * La alternativa escrita de lo que sólo se escucha.
 *
 * Cuando una pregunta llega por audio, quien no la oye tiene que poder
 * responderla igual, sin que el texto le regale la respuesta:
 *
 * - si las opciones están en la lengua que se aprende, se muestra el
 *   significado: «Significa: perro» y se busca «dog»;
 * - si las opciones son significados, se muestra lo que dijo Piko:
 *   «Dice: dog» y se busca «perro».
 *
 * Es la misma pregunta por otro camino. Usarla no cambia el puntaje.
 */

export interface TextoDelAudio {
  forma: 'significa' | 'dice';
  texto: string;
}

export function textoDelAudio(
  palabra: { meta: string; es: string },
  opcionesEnMeta: boolean,
): TextoDelAudio {
  return opcionesEnMeta ? { forma: 'significa', texto: palabra.es } : { forma: 'dice', texto: palabra.meta };
}
