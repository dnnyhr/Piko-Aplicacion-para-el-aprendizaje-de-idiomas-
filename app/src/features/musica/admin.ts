/**
 * El modo administrador de La Música de Piko: abre todas las canciones para
 * probarlas sin pasar los niveles, deja saltar a cualquier parte de una
 * canción y no da flores ni guarda progreso.
 *
 * Sólo existe en desarrollo (`npx expo start`) y sólo en la computadora que
 * tiene `EXPO_PUBLIC_PIKO_ADMIN=1` en `app/.env.local`, un archivo que no se
 * sube al repositorio. La página y el APK se arman en modo producción
 * (`__DEV__` es falso): ahí este modo no existe.
 */

export const MODO_ADMIN: boolean = __DEV__ && process.env.EXPO_PUBLIC_PIKO_ADMIN === '1';
