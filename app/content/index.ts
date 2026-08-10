/**
 * Registro estático de paquetes.
 *
 * Metro no puede recorrer directorios en tiempo de ejecución, así que cada
 * paquete se importa a mano. `npm run validate:packs` avisa si quedó alguno
 * en el disco sin registrar acá.
 */

import type { Pack } from '../src/core/content/schema';

import engSaludos from './packs/eng/saludos.json';
import engNumeros from './packs/eng/numeros.json';
import engFamilia from './packs/eng/familia.json';
import engColores from './packs/eng/colores.json';
import engAnimales from './packs/eng/animales.json';
import engEscuela from './packs/eng/escuela.json';

// Miskito, mayangna, rama y garífuna todavía no tienen paquetes: el formato
// está listo, falta el material de hablantes nativos. Ver content/README.md.

export const PACKS: Pack[] = [
  engSaludos,
  engNumeros,
  engFamilia,
  engColores,
  engAnimales,
  engEscuela,
] as Pack[];

export default PACKS;
