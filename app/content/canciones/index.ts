/**
 * Las canciones de «La Música de Piko».
 *
 * Cada canción es un JSON en esta carpeta (el formato está en
 * `src/core/canciones/cancion.ts`) y su grabación en `audio/`, registrada en
 * `audios.ts`. Sólo entran canciones con permiso de uso;
 * `tests/canciones.test.ts` revisa cada una antes de que llegue a la app.
 * Cómo agregar una: `README.md`.
 *
 * Los datos van separados de los audios para que las pruebas, que corren en
 * Node, puedan revisar las canciones sin cargar los archivos de sonido.
 */

import type { Cancion } from '../../src/core/canciones/cancion';
import mayaya from './mayaya.json';
import daleSuRondon from './dale-su-rondon.json';
import paloDeMayo from './palo-de-mayo.json';
import saborARondonYAPinol from './sabor-a-rondon-y-a-pinol.json';

export const CANCIONES: readonly Cancion[] = [
  mayaya as Cancion,
  daleSuRondon as Cancion,
  paloDeMayo as Cancion,
  saborARondonYAPinol as Cancion,
];
