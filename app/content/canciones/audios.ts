/**
 * La grabación de cada canción, por id. Van empaquetadas en la app: la
 * sección suena sin internet.
 *
 * Metro no recorre carpetas en tiempo de ejecución: cada audio se importa
 * uno por uno, con su `require`.
 *
 *   export const AUDIOS: Record<string, number> = {
 *     'mi-cancion': require('./audio/mi-cancion.m4a'),
 *   };
 */

export const AUDIOS: Record<string, number> = {};
