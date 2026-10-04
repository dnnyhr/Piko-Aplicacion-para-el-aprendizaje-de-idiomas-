/**
 * La rayuela dibujada con tiza, en chiquito: 1, 2|3, 4, 5|6 y el cielo. Es
 * el ícono del juego en la lista de minijuegos y en la portada de la partida.
 */

import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { TIERRA, TIZA } from './Escena';

export function IconoRayuela({ tam = 64, fondo = true }: { tam?: number; fondo?: boolean }) {
  const celda = (x: number, y: number, n: number) => (
    <>
      <Rect x={x} y={y} width={14} height={11} fill="none" stroke={TIZA} strokeWidth={1.6} />
      <SvgText x={x + 2.5} y={y + 5.5} fontSize={4.5} fill={TIZA} fontWeight="bold">
        {String(n)}
      </SvgText>
    </>
  );
  return (
    <Svg width={tam} height={tam} viewBox="0 0 64 64">
      {fondo && <Rect width={64} height={64} rx={14} fill={TIERRA} />}
      <Path d="M18 15 A14 11 0 0 1 46 15" fill="none" stroke={TIZA} strokeWidth={1.6} />
      {celda(18, 15, 5)}
      {celda(32, 15, 6)}
      {celda(25, 26, 4)}
      {celda(18, 37, 2)}
      {celda(32, 37, 3)}
      {celda(25, 48, 1)}
    </Svg>
  );
}
