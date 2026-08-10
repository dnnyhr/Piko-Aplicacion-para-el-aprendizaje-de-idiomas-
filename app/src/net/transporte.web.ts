/**
 * Qué transporte usa este aparato. Versión de navegador: ninguno.
 *
 * Un navegador no puede abrir un socket TCP crudo — es una restricción de la
 * plataforma, no algo que se pueda sortear. Desde la computadora se puede
 * jugar la práctica en solitario y revisar toda la interfaz; para el aula,
 * teléfonos con el development build, o `npm run sim`.
 */

import { AulaNoDisponible, type Transporte } from './transport';

export const hayRed = false;

export function transporteDelDispositivo(): Transporte {
  throw new AulaNoDisponible();
}
