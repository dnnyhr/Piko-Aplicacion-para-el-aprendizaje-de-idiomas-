/**
 * El patio donde se juega la rayuela: cielo, un volcán al fondo, la mata de
 * plátano, la palmera, las sacuanjoches del borde y la tierra donde se dibuja
 * con tiza.
 *
 * Todo plano y quieto: se dibuja una vez detrás del juego y no se anima, para
 * que en gama baja no cueste cuadros.
 */

import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Sacuanjoche } from '../arbol/Sacuanjoche';
import { color } from '../tokens';

export const TIERRA = '#E3C79B';
export const TIZA = '#FFFDF4';

export interface EscenaProps {
  /** Dónde empieza la tierra, en puntos desde arriba. */
  horizonte: number;
}

export function Escena({ horizonte }: EscenaProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.cielo, { height: horizonte + 10 }]} />
      <Svg width="100%" height={140} viewBox="0 0 390 140" preserveAspectRatio="none" style={[styles.abs, { top: horizonte - 132 }]}>
        <Path d="M118 140 L206 34 Q215 24 224 34 L314 140 Z" fill="#BFDCCB" />
        <Path d="M204 37 Q215 29 226 37" stroke="#A3C8B3" strokeWidth={3} fill="none" strokeLinecap="round" />
        <Circle cx={222} cy={20} r={7} fill="#FFFFFF" opacity={0.85} />
        <Circle cx={233} cy={11} r={5} fill="#FFFFFF" opacity={0.7} />
        <Path d="M0 140 V100 Q50 74 112 94 Q172 114 236 92 Q306 68 390 90 V140 Z" fill="#8CC08F" />
        <Path d="M0 140 V122 Q80 104 172 120 Q262 134 390 116 V140 Z" fill={color.verdeHoja} />
      </Svg>
      <View style={[styles.pasto, { top: horizonte - 6 }]} />
      <View style={[styles.tierra, { top: horizonte + 6 }]} />

      {/* Mata de plátano, a la izquierda */}
      <Svg width={120} height={170} viewBox="0 0 120 170" style={[styles.abs, { left: -22, top: horizonte - 128 }]}>
        <Path d="M52 170 C50 130 50 100 54 70" stroke={color.verdeMonte} strokeWidth={7} fill="none" strokeLinecap="round" />
        <Path d="M54 72 C34 44 12 34 0 40 C14 64 34 74 54 72 Z" fill={color.verdeHoja} />
        <Path d="M54 72 C74 36 100 26 116 32 C100 62 76 74 54 72 Z" fill={color.verdeMonte} />
        <Path d="M53 84 C30 84 12 96 4 112 C28 112 44 102 53 84 Z" fill="#4E9258" />
        <Path d="M55 86 C78 90 96 104 104 120 C80 118 64 106 55 86 Z" fill={color.verdeHoja} />
      </Svg>

      {/* Palmera de coco, a la derecha */}
      <Svg width={120} height={180} viewBox="0 0 120 180" style={[styles.abs, { right: -34, top: horizonte - 166 }]}>
        <Path d="M70 180 C74 140 72 100 60 58" stroke="#8A5A2B" strokeWidth={8} fill="none" strokeLinecap="round" />
        <Path d="M60 56 C40 40 20 40 6 52 C28 50 44 54 60 60 Z" fill={color.verdeMonte} />
        <Path d="M60 56 C46 30 30 20 14 20 C34 32 46 44 58 60 Z" fill={color.verdeHoja} />
        <Path d="M60 56 C70 30 88 18 108 18 C92 30 76 44 62 60 Z" fill={color.verdeMonte} />
        <Path d="M60 56 C82 46 104 50 118 64 C96 60 80 60 62 60 Z" fill={color.verdeHoja} />
        <Circle cx={56} cy={64} r={5} fill="#8A5A2B" />
        <Circle cx={65} cy={66} r={5} fill="#7A4E24" />
      </Svg>

      {/* Sacuanjoches al borde del patio */}
      <View style={[styles.mata, { left: -18, top: horizonte + 70 }]} />
      <View style={[styles.flor, { left: 4, top: horizonte + 66 }]}>
        <Sacuanjoche tam={22} />
      </View>
      <View style={[styles.flor, { left: 24, top: horizonte + 84 }]}>
        <Sacuanjoche tam={18} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  cielo: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: color.nube },
  pasto: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: color.verdePasto,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  tierra: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: TIERRA },
  mata: {
    position: 'absolute',
    width: 70,
    height: 54,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: color.verdeHoja,
  },
  flor: { position: 'absolute' },
});
