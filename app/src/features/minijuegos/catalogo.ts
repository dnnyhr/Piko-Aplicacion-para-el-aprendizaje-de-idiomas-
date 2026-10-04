/**
 * Los minijuegos de Piko.
 *
 * Para sumar uno nuevo:
 *
 * 1. Su lógica pura va en `src/core/minijuegos/<juego>.ts`, armada con el
 *    vocabulario de las lecciones (`vocabulario.ts`). Si sus flores no siguen
 *    la regla común, se agrega la suya en `premios.ts`.
 * 2. Su pantalla va en `app/minijuegos/<juego>.tsx`: `useMinijuego` le da la
 *    lengua, los niveles y el tope diario; `ElegirPartida` va antes de jugar y
 *    `FinPartida` al terminar.
 * 3. Al terminar una partida llama a `cerrar` de `useMinijuego`: las
 *    sacuanjoches, el tope diario y el madroño salen solos de ahí.
 * 4. Se agrega acá abajo, con sus textos en `src/ui/textos/es.ts`.
 */

import type { ComponentType } from 'react';
import { ID_RAYUELA } from '../../core/minijuegos/rayuela';
import { ID_TROMPO } from '../../core/minijuegos/trompo';
import { ID_CHIBOLAS } from '../../core/minijuegos/chibolas';
import { ID_GALLINITA } from '../../core/minijuegos/gallinita';
import type { Clave } from '../../ui/textos/traducir';
import { IconoRayuela } from '../../ui/minijuegos/IconoRayuela';
import { IconoTrompo } from '../../ui/minijuegos/Trompo';
import { IconoChibolas } from '../../ui/minijuegos/Chibola';
import { IconoGallinita } from '../../ui/minijuegos/Venda';

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
  {
    id: ID_TROMPO,
    nombre: 'trompo.nombre',
    descripcion: 'trompo.descripcion',
    ruta: '/minijuegos/trompo',
    Icono: IconoTrompo,
  },
  {
    id: ID_CHIBOLAS,
    nombre: 'chibolas.nombre',
    descripcion: 'chibolas.descripcion',
    ruta: '/minijuegos/chibolas',
    Icono: IconoChibolas,
  },
  {
    id: ID_GALLINITA,
    nombre: 'gallinita.nombre',
    descripcion: 'gallinita.descripcion',
    ruta: '/minijuegos/gallinita',
    Icono: IconoGallinita,
  },
];
