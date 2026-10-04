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

export const AUDIOS: Record<string, number> = {
  'mayaya': require('./audio/mayaya.m4a'),
  'dale-su-rondon': require('./audio/dale-su-rondon.m4a'),
  'palo-de-mayo': require('./audio/palo-de-mayo.m4a'),
  'tululu': require('./audio/tululu.m4a'),
  'sabor-a-rondon-y-a-pinol': require('./audio/sabor-a-rondon-y-a-pinol.m4a'),
};
