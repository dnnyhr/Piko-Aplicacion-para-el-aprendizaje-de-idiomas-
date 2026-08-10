/**
 * Carga de tipografías. Fredoka para títulos y botones, Nunito Sans para el
 * cuerpo — las mismas dos de la landing.
 *
 * Van empaquetadas en el APK, no se descargan: la app tiene que arrancar
 * igual de bien en un aula sin señal.
 *
 * Se importa cada `.ttf` por su ruta exacta y no desde el índice del paquete:
 * el índice reexporta las 5 variantes de Fredoka y las 16 de Nunito Sans, y
 * Metro las mete todas al bundle. Son casi 2 MB de fuentes que nadie usa, en
 * una app que apunta a teléfonos de gama baja.
 */

import { useFonts } from 'expo-font';

export function useTipografias(): boolean {
  const [listas] = useFonts({
    Fredoka_500Medium: require('@expo-google-fonts/fredoka/500Medium/Fredoka_500Medium.ttf'),
    Fredoka_600SemiBold: require('@expo-google-fonts/fredoka/600SemiBold/Fredoka_600SemiBold.ttf'),
    Fredoka_700Bold: require('@expo-google-fonts/fredoka/700Bold/Fredoka_700Bold.ttf'),
    NunitoSans_400Regular: require('@expo-google-fonts/nunito-sans/400Regular/NunitoSans_400Regular.ttf'),
    NunitoSans_600SemiBold: require('@expo-google-fonts/nunito-sans/600SemiBold/NunitoSans_600SemiBold.ttf'),
    NunitoSans_700Bold: require('@expo-google-fonts/nunito-sans/700Bold/NunitoSans_700Bold.ttf'),
  });
  return listas;
}
