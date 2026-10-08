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
 * y una línea más con esa huella y el id del logro (de `catalogo.ts`).
 */

import { LOGRO_HACKATHON } from './catalogo';
import { sha256 } from './sha256';

const HUELLAS: Readonly<Record<string, string>> = {
  // Hackathon Nicaragua 2026
  'a77460cff3d264c37b5bbdc6d2cff2f62d81cb85a7867a1453fede4a831f804a': LOGRO_HACKATHON,
};

/** El logro que desbloquea este código (ya normalizado), si es uno de los locales. */
export function logroDeCodigoLocal(codigo: string): string | null {
  return HUELLAS[sha256(codigo)] ?? null;
}
