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
import martinillo from './martinillo.json';
import twinkleTwinkle from './twinkle-twinkle.json';
import nicaraguaNicaraguita from './nicaragua-nicaraguita.json';
import mayaya from './mayaya.json';
import daleSuRondon from './dale-su-rondon.json';
import oldMacdonald from './old-macdonald.json';
import rowYourBoat from './row-your-boat.json';
import paloDeMayo from './palo-de-mayo.json';
import tululu from './tululu.json';
import elRapto from './el-rapto.json';
import nicaraguaMia from './nicaragua-mia.json';
import itsyBitsySpider from './itsy-bitsy-spider.json';
import saborARondonYAPinol from './sabor-a-rondon-y-a-pinol.json';
import puebloSencillo from './pueblo-sencillo.json';
import hijosDelMaiz from './hijos-del-maiz.json';
import perjumenes from './perjumenes.json';

/** En orden de dificultad: primero las del nivel inicial. */
export const CANCIONES: readonly Cancion[] = [
  martinillo as Cancion,
  twinkleTwinkle as Cancion,
  nicaraguaNicaraguita as Cancion,
  mayaya as Cancion,
  daleSuRondon as Cancion,
  oldMacdonald as Cancion,
  rowYourBoat as Cancion,
  paloDeMayo as Cancion,
  tululu as Cancion,
  elRapto as Cancion,
  nicaraguaMia as Cancion,
  itsyBitsySpider as Cancion,
  saborARondonYAPinol as Cancion,
  puebloSencillo as Cancion,
  hijosDelMaiz as Cancion,
  perjumenes as Cancion,
];
