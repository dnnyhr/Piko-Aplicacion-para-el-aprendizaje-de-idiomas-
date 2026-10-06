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
  'martinillo': require('./audio/martinillo.m4a'),
  'twinkle-twinkle': require('./audio/twinkle-twinkle.m4a'),
  'nicaragua-nicaraguita': require('./audio/nicaragua-nicaraguita.m4a'),
  'mayaya': require('./audio/mayaya.m4a'),
  'dale-su-rondon': require('./audio/dale-su-rondon.m4a'),
  'old-macdonald': require('./audio/old-macdonald.m4a'),
  'row-your-boat': require('./audio/row-your-boat.m4a'),
  'palo-de-mayo': require('./audio/palo-de-mayo.m4a'),
  'tululu': require('./audio/tululu.m4a'),
  'el-rapto': require('./audio/el-rapto.m4a'),
  'nicaragua-mia': require('./audio/nicaragua-mia.m4a'),
  'itsy-bitsy-spider': require('./audio/itsy-bitsy-spider.m4a'),
  'sabor-a-rondon-y-a-pinol': require('./audio/sabor-a-rondon-y-a-pinol.m4a'),
  'pueblo-sencillo': require('./audio/pueblo-sencillo.m4a'),
  'hijos-del-maiz': require('./audio/hijos-del-maiz.m4a'),
  'perjumenes': require('./audio/perjumenes.m4a'),
};
