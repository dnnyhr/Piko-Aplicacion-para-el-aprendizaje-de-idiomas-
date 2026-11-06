/**
 * Qué transporte usa este aparato. Versión de teléfono.
 *
 * Metro toma `transporte.web.ts` en el navegador, así que el módulo nativo
 * `PikoRed` nunca entra al bundle web.
 */

import { PikoRed } from '../../modules/piko-red/src';
import { transporteNativo } from './tcp.native';
import { AulaNoDisponible, type RedLocal, type Transporte } from './transport';

/** Hay red de aula sólo si el APK trae el módulo nativo (no en Expo Go). */
export const hayRed = PikoRed !== null;

export function transporteDelDispositivo(): Transporte {
  return transporteNativo;
}

export function redDelDispositivo(): RedLocal {
  const red = PikoRed;
  if (!red) throw new AulaNoDisponible();
  return {
    info() {
      try {
        return red.infoRed();
      } catch {
        return { wifi: null, interfaces: [] };
      }
    },
    iniciarFaro: (puerto, mensaje) => red.iniciarFaro(puerto, mensaje),
    detenerFaro: () => red.detenerFaro(),
    buscarFaro: (puerto, esperaMs) => red.buscarFaro(puerto, esperaMs),
  };
}
