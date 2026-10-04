/**
 * Íconos de trazo de los minijuegos. Dibujados con pocos trazos, sin
 * emojis: se ven igual en cualquier teléfono.
 */

import Svg, { Circle, Path } from 'react-native-svg';
import { color } from '../tokens';

export function Candado() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color.tintaSuave} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M7 11 V8 a5 5 0 0 1 10 0 V11" />
      <Path d="M5 11 H19 V20 H5 Z" />
    </Svg>
  );
}

/** El globo para cambiar de lengua. */
export function Globito({ tam = 18, tinta = color.tintaSuave }: { tam?: number; tinta?: string }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={tinta} strokeWidth={2} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12 H21 M12 3 C15.5 6.5 15.5 17.5 12 21 M12 3 C8.5 6.5 8.5 17.5 12 21" />
    </Svg>
  );
}

/** Una hoja, para el miskito: la lengua de la tierra de quien juega. */
export function Hoja({ ancho = 44 }: { ancho?: number }) {
  const alto = Math.round((ancho * 2) / 3);
  return (
    <Svg width={ancho} height={alto} viewBox="0 0 60 40">
      <Path d="M8 34 C 10 14, 30 4, 52 6 C 52 26, 34 38, 8 34 Z" fill={color.verdeHoja} stroke={color.verdeMonte} strokeWidth={2} />
      <Path d="M10 33 C 24 26, 36 18, 48 9" stroke={color.verdeMonte} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M22 26 L 22 18 M 32 20 L 33 12 M 28 23 L 38 22" stroke={color.verdeMonte} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function Parlante({ tam = 28 }: { tam?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={color.blanco} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9.5 H7 L12 5.5 V18.5 L7 14.5 H3 Z" fill={color.blanco} />
      <Path d="M15.5 9.5 C16.5 10.8 16.5 13.2 15.5 14.5" />
      <Path d="M18 7.5 C20 10 20 14 18 16.5" />
    </Svg>
  );
}

export function Cerrar() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.tinta} strokeWidth={2.8} strokeLinecap="round">
      <Path d="M6 6 L18 18 M18 6 L6 18" />
    </Svg>
  );
}
