/**
 * La sacuanjoche, flor nacional de Nicaragua, como moneda de Piko.
 *
 * Cinco pétalos blancos en remolino con el corazón amarillo, como la de
 * verdad. Es un dibujo de pocos trazos a propósito: se repite en contadores y
 * listas, y tiene que costar poco en un teléfono de gama baja.
 */

import Svg, { Circle, G, Path } from 'react-native-svg';
import { color } from '../tokens';

export const SACUANJOCHE_COLOR = {
  petalo: '#FFFDF4',
  borde: '#E6D6B0',
  corazon: '#F4C542',
  centro: color.pico,
} as const;

const PETALO = 'M20 20 C 13.5 15, 12.5 5, 19 2.2 C 25 3.5, 25.5 13, 20 20 Z';
const CORAZON = 'M20 20 C 17.4 16.5, 17.2 11.5, 19.6 9.4 C 22 11.5, 21.8 16.5, 20 20 Z';
const GIROS = [0, 72, 144, 216, 288];

export interface SacuanjocheProps {
  tam?: number;
}

export function Sacuanjoche({ tam = 24 }: SacuanjocheProps) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 40 40" accessibilityLabel="Sacuanjoche">
      {GIROS.map((g) => (
        <G key={g} rotation={g} origin="20, 20">
          <Path d={PETALO} fill={SACUANJOCHE_COLOR.petalo} stroke={SACUANJOCHE_COLOR.borde} strokeWidth={1.2} />
          <Path d={CORAZON} fill={SACUANJOCHE_COLOR.corazon} />
        </G>
      ))}
      <Circle cx={20} cy={20} r={2.6} fill={SACUANJOCHE_COLOR.centro} />
    </Svg>
  );
}

/**
 * La misma flor para usar adentro de otro dibujo SVG (la falda de Piko):
 * centrada en `x`, `y`, de `tam` unidades del dibujo que la contiene.
 */
export function FlorEnDibujo({ x, y, tam, giro = 0 }: { x: number; y: number; tam: number; giro?: number }) {
  const k = tam / 40;
  return (
    <G transform={`translate(${x - tam / 2} ${y - tam / 2}) scale(${k}) rotate(${giro} 20 20)`}>
      {GIROS.map((g) => (
        <G key={g} rotation={g} origin="20, 20">
          <Path d={PETALO} fill={SACUANJOCHE_COLOR.petalo} stroke={SACUANJOCHE_COLOR.borde} strokeWidth={1.4} />
          <Path d={CORAZON} fill={SACUANJOCHE_COLOR.corazon} />
        </G>
      ))}
      <Circle cx={20} cy={20} r={2.8} fill={SACUANJOCHE_COLOR.centro} />
    </G>
  );
}
