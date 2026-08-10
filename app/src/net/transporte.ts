/**
 * Qué transporte usa este aparato. Versión de teléfono.
 *
 * Metro toma `transporte.web.ts` en el navegador, así que
 * `react-native-tcp-socket` nunca entra al bundle web.
 */

import { transporteNativo } from './tcp.native';
import type { Transporte } from './transport';

export const hayRed = true;

export function transporteDelDispositivo(): Transporte {
  return transporteNativo;
}
