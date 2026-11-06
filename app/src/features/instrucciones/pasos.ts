/**
 * Las instrucciones de cada actividad, en pasos cortos.
 *
 * Son datos: para sumar un minijuego se agrega su lista acá y sus textos en
 * `es.ts`. Cada paso dice una sola cosa, y `ejemplo` es el dibujo que lo
 * acompaña (ver `EjemploPaso.tsx`).
 */

import type { Clave } from '../../ui/textos/traducir';

export type EjemploDePaso = 'leer' | 'escuchar' | 'opcion' | 'armar' | 'comprobar' | 'dibujo';

export interface Paso {
  texto: Clave;
  ejemplo: EjemploDePaso;
}

export type Actividad = 'choice' | 'listen' | 'build' | 'rayuela' | 'trompo' | 'chibolas' | 'gallinita';

export const PASOS: Record<Actividad, readonly Paso[]> = {
  choice: [
    { texto: 'paso.choice_1', ejemplo: 'leer' },
    { texto: 'paso.choice_2', ejemplo: 'opcion' },
    { texto: 'paso.comprobar', ejemplo: 'comprobar' },
  ],
  listen: [
    { texto: 'paso.listen_1', ejemplo: 'escuchar' },
    { texto: 'paso.listen_2', ejemplo: 'leer' },
    { texto: 'paso.listen_3', ejemplo: 'opcion' },
    { texto: 'paso.comprobar', ejemplo: 'comprobar' },
  ],
  build: [
    { texto: 'paso.build_1', ejemplo: 'leer' },
    { texto: 'paso.build_2', ejemplo: 'armar' },
    { texto: 'paso.build_3', ejemplo: 'armar' },
    { texto: 'paso.comprobar', ejemplo: 'comprobar' },
  ],
  rayuela: [
    { texto: 'paso.mirar_pregunta', ejemplo: 'leer' },
    { texto: 'paso.rayuela_2', ejemplo: 'dibujo' },
    { texto: 'paso.rayuela_3', ejemplo: 'opcion' },
    { texto: 'paso.rayuela_4', ejemplo: 'dibujo' },
  ],
  trompo: [
    { texto: 'paso.trompo_1', ejemplo: 'dibujo' },
    { texto: 'paso.mirar_pregunta', ejemplo: 'leer' },
    { texto: 'paso.trompo_3', ejemplo: 'opcion' },
    { texto: 'paso.trompo_4', ejemplo: 'dibujo' },
  ],
  chibolas: [
    { texto: 'paso.mirar_pregunta', ejemplo: 'leer' },
    { texto: 'paso.chibolas_2', ejemplo: 'dibujo' },
    { texto: 'paso.chibolas_3', ejemplo: 'dibujo' },
  ],
  gallinita: [
    { texto: 'paso.gallinita_1', ejemplo: 'escuchar' },
    { texto: 'paso.gallinita_2', ejemplo: 'dibujo' },
    { texto: 'paso.gallinita_3', ejemplo: 'opcion' },
  ],
};
