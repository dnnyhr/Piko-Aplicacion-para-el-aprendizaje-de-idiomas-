/**
 * Las chibolas: canicas de vidrio de colores, con el remolino adentro y el
 * brillo arriba, como las que se juegan en los patios.
 *
 * Un solo SVG chiquito por chibola, sin gradientes: se dibujan varias a la
 * vez en un teléfono de gama baja.
 */

import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { color } from '../tokens';
import { TIERRA, TIZA } from './Escena';

/** Colores de las chibolas de la rueda. El tiro, el de Piko, es el verde. */
export const COLORES_CHIBOLA = [color.cieloHondo, color.copete, '#C8102E', '#7E57C2'] as const;
export const COLOR_TIRO = color.verdeHoja;

export function Chibola({ tinte, tam = 48 }: { tinte: string; tam?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 40 40">
      <Circle cx={20} cy={20} r={18} fill={tinte} stroke="rgba(22,36,29,0.35)" strokeWidth={1.5} />
      {/* El remolino de adentro */}
      <Path d="M10 24 C 14 12, 26 30, 30 16" stroke="#FFFDF4" strokeWidth={3.2} fill="none" strokeLinecap="round" opacity={0.85} />
      <Path d="M12 29 C 18 22, 24 30, 29 24" stroke="rgba(22,36,29,0.25)" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {/* El brillo */}
      <Circle cx={13} cy={12} r={4.2} fill="#FFFFFF" opacity={0.75} />
      <Circle cx={18} cy={9} r={1.6} fill="#FFFFFF" opacity={0.6} />
    </Svg>
  );
}

/** El ícono del juego: la rueda de tiza con chibolas y el hoyito. */
export function IconoChibolas({ tam = 64 }: { tam?: number }) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam * 0.22, backgroundColor: TIERRA, overflow: 'hidden' }}>
      <Svg width={tam} height={tam} viewBox="0 0 64 64">
        <Circle cx={32} cy={30} r={22} fill="none" stroke={TIZA} strokeWidth={2} />
        <Circle cx={32} cy={30} r={4} fill="#8A6A45" />
      </Svg>
      <View style={{ position: 'absolute', left: tam * 0.18, top: tam * 0.2 }}>
        <Chibola tinte={COLORES_CHIBOLA[0]} tam={tam * 0.24} />
      </View>
      <View style={{ position: 'absolute', left: tam * 0.58, top: tam * 0.16 }}>
        <Chibola tinte={COLORES_CHIBOLA[1]} tam={tam * 0.24} />
      </View>
      <View style={{ position: 'absolute', left: tam * 0.56, top: tam * 0.52 }}>
        <Chibola tinte={COLORES_CHIBOLA[2]} tam={tam * 0.24} />
      </View>
      <View style={{ position: 'absolute', left: tam * 0.38, top: tam * 0.7 }}>
        <Chibola tinte={COLOR_TIRO} tam={tam * 0.26} />
      </View>
    </View>
  );
}
