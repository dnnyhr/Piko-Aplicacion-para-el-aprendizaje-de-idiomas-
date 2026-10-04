/**
 * Banderitas para elegir la lengua de los minijuegos: Estados Unidos para el
 * inglés (es el inglés americano el que suena en la app) y Nicaragua para el
 * miskito.
 */

import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { LenguaRayuela } from '../../core/minijuegos/rayuela';

export function Bandera({ lengua, ancho = 44 }: { lengua: LenguaRayuela; ancho?: number }) {
  const alto = Math.round((ancho * 2) / 3);
  if (lengua === 'miq') {
    return (
      <Svg width={ancho} height={alto} viewBox="0 0 60 40">
        <Rect width={60} height={40} rx={5} fill="#0067C6" />
        <Rect y={13.3} width={60} height={13.4} fill="#FFFFFF" />
        <Circle cx={30} cy={20} r={4.6} fill="none" stroke="#C9A227" strokeWidth={1.4} />
        <Path d="M27.2 21.8 L30 17.2 L32.8 21.8 Z" fill="#3AA8E0" />
      </Svg>
    );
  }
  const franjas = [0, 1, 2, 3, 4, 5, 6].map((i) => (
    <Rect key={i} y={(i * 2 * 40) / 13} width={60} height={40 / 13} fill="#B22234" />
  ));
  return (
    <Svg width={ancho} height={alto} viewBox="0 0 60 40">
      <Rect width={60} height={40} rx={5} fill="#FFFFFF" />
      {franjas}
      <Rect width={26} height={(7 * 40) / 13} fill="#3C3B6E" />
      {[4, 10, 16, 22].map((x) => (
        <Circle key={`a${x}`} cx={x} cy={5} r={1.2} fill="#FFFFFF" />
      ))}
      {[7, 13, 19].map((x) => (
        <Circle key={`b${x}`} cx={x} cy={10} r={1.2} fill="#FFFFFF" />
      ))}
      {[4, 10, 16, 22].map((x) => (
        <Circle key={`c${x}`} cx={x} cy={15} r={1.2} fill="#FFFFFF" />
      ))}
    </Svg>
  );
}
