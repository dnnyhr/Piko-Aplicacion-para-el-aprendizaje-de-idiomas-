/**
 * Los minijuegos de Piko.
 *
 * Para sumar uno nuevo:
 *
 * 1. Su lógica pura va en `src/core/minijuegos/<juego>.ts`, armada con el
 *    vocabulario de las lecciones (ver `vocabularioAprendido` en `rayuela.ts`).
 * 2. Su pantalla va en `app/minijuegos/<juego>.tsx`.
 * 3. Al terminar una partida llama a `useProgreso().terminarMinijuego`, con su
 *    `id` como `game`: las sacuanjoches, el tope diario y el madroño salen
 *    solos de ahí.
 * 4. Se agrega acá abajo, con sus textos en `src/ui/textos/es.ts`.
 */

import type { ComponentType } from 'react';
import { ID_RAYUELA } from '../../core/minijuegos/rayuela';
import type { Clave } from '../../ui/textos/traducir';
import { IconoRayuela } from '../../ui/minijuegos/IconoRayuela';

export interface Minijuego {
  /** El mismo que va en el evento `gameDone`. */
  id: string;
  nombre: Clave;
  descripcion: Clave;
  /** La pantalla del juego. */
  ruta: string;
  Icono: ComponentType<{ tam?: number }>;
}

export const MINIJUEGOS: readonly Minijuego[] = [
  {
    id: ID_RAYUELA,
    nombre: 'rayuela.nombre',
    descripcion: 'rayuela.descripcion',
    ruta: '/minijuegos/rayuela',
    Icono: IconoRayuela,
  },
];
