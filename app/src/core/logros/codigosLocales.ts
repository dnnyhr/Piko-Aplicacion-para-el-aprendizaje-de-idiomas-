/**
 * Códigos de logros especiales que la app reconoce sola, sin internet ni
 * servidor: funcionan en el teléfono (también en el aula) y en la web.
 *
 * Acá va la **huella** SHA-256 del código ya normalizado
 * (`PIKO-HK26-XXXX-XXXX`), nunca el código: el repositorio es público. El
 * código lo reparte el equipo (en las tarjetas o en pantalla en el evento).
 *
 * A diferencia de los códigos del servidor (`encuestas/src/canjes.js`), uno
 * de estos lo puede usar más de una persona: sirve para un evento entero. Cada
 * estudiante lo canjea una sola vez, porque el logro queda en su progreso.
 *
 * Para agregar uno:
 *   node -e "console.log(require('crypto').createHash('sha256').update('PIKO-EEEE-XXXX-XXXX').digest('hex'))"
 * y una línea más con esa huella, el id del logro (de `catalogo.ts`) y hasta
 * cuándo vale.
 */

import { LOGRO_HACKATHON } from './catalogo';
import { sha256 } from './sha256';

type CodigoLocal = { logro: string; /** Último instante en que se puede canjear. */ hasta: string };

const HUELLAS: Readonly<Record<string, CodigoLocal>> = {
  // Hackathon Nicaragua 2026: vale hasta el 31 de diciembre de 2026, a medianoche en Nicaragua (UTC−6).
  'a77460cff3d264c37b5bbdc6d2cff2f62d81cb85a7867a1453fede4a831f804a': { logro: LOGRO_HACKATHON, hasta: '2027-01-01T06:00:00Z' },
};

/** El logro que desbloquea este código (ya normalizado), si es uno de los locales y todavía vale. */
export function logroDeCodigoLocal(codigo: string, ahora: number = Date.now()): string | null {
  const c = HUELLAS[sha256(codigo)];
  if (!c || ahora >= Date.parse(c.hasta)) return null;
  return c.logro;
}

/** Todos los códigos locales, para las pruebas. */
export const CODIGOS_LOCALES = HUELLAS;
