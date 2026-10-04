/**
 * Instrumentos para las tarjetas de las canciones: el tambor y la concha de
 * la Costa Caribe, la marimba de arco, la guitarra, la quijada de burro y las
 * maracas. Pocos trazos y colores de la paleta: se dibujan varios a la vez.
 */

import { View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import type { ImagenCancion } from '../../core/canciones/cancion';
import { color } from '../tokens';

const MADERA = '#C98A4B';
const MADERA_HONDA = '#8A5A2B';
const TINTA = color.tinta;

function Dibujo({ imagen }: { imagen: ImagenCancion }) {
  switch (imagen) {
    case 'tambor':
      return (
        <>
          <Ellipse cx={32} cy={18} rx={18} ry={6} fill="#F7F0E4" stroke={TINTA} strokeWidth={2.4} />
          <Path d="M14 18 L18 52 C 24 56, 40 56, 46 52 L50 18" fill={MADERA} stroke={TINTA} strokeWidth={2.4} />
          <Path d="M17 30 L32 40 L47 30 M18 44 L32 36 L46 44" stroke={color.copete} strokeWidth={2.4} fill="none" />
        </>
      );
    case 'marimba':
      return (
        <>
          <Path d="M8 22 Q32 8 56 22" stroke={MADERA_HONDA} strokeWidth={3} fill="none" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Rect key={i} x={10 + i * 8} y={24} width={6} height={20 - i * 2} rx={1.5} fill={MADERA} stroke={TINTA} strokeWidth={1.6} />
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Ellipse key={`c${i}`} cx={13 + i * 8} cy={50 - i * 2} rx={3} ry={4} fill={color.pico} stroke={TINTA} strokeWidth={1.2} />
          ))}
        </>
      );
    case 'guitarra':
      return (
        <>
          <Path d="M36 10 L44 4 L50 10 L44 16 Z" fill={MADERA_HONDA} stroke={TINTA} strokeWidth={2} />
          <Line x1={42} y1={14} x2={30} y2={30} stroke={MADERA_HONDA} strokeWidth={5} strokeLinecap="round" />
          <Path d="M30 26 C 40 30, 40 40, 32 42 C 34 52, 22 60, 14 52 C 6 44, 14 32, 22 34 C 22 26, 26 24, 30 26 Z" fill={MADERA} stroke={TINTA} strokeWidth={2.2} />
          <Circle cx={23} cy={44} r={4} fill={MADERA_HONDA} />
        </>
      );
    case 'quijada':
      return (
        <>
          <Path d="M8 40 C 14 22, 36 14, 56 18 L54 26 C 38 24, 22 32, 16 46 Z" fill="#F4EAD5" stroke={TINTA} strokeWidth={2.2} />
          {[0, 1, 2, 3, 4].map((i) => (
            <Rect key={i} x={24 + i * 6} y={18 + (i === 0 ? 4 : 0)} width={4} height={6} rx={1} fill="#FFFDF4" stroke={TINTA} strokeWidth={1.2} />
          ))}
          <Path d="M10 50 L20 44" stroke={MADERA_HONDA} strokeWidth={3} strokeLinecap="round" />
        </>
      );
    case 'maracas':
      return (
        <>
          <Ellipse cx={22} cy={22} rx={11} ry={13} fill={color.copete} stroke={TINTA} strokeWidth={2.2} />
          <Line x1={24} y1={34} x2={28} y2={56} stroke={MADERA_HONDA} strokeWidth={4} strokeLinecap="round" />
          <Ellipse cx={42} cy={20} rx={11} ry={13} fill={color.verdePasto} stroke={TINTA} strokeWidth={2.2} />
          <Line x1={40} y1={32} x2={36} y2={56} stroke={MADERA_HONDA} strokeWidth={4} strokeLinecap="round" />
          <Path d="M16 18 L28 18 M14 24 L30 24 M36 16 L48 16 M34 22 L50 22" stroke="#FFFDF4" strokeWidth={1.6} />
        </>
      );
    case 'concha':
      return (
        <>
          <Path d="M10 42 C 10 24, 28 10, 46 14 C 56 16, 58 26, 52 32 C 46 40, 30 48, 10 42 Z" fill="#F2B8B0" stroke={TINTA} strokeWidth={2.2} />
          <Path d="M10 42 C 20 36, 34 32, 52 32 M18 26 C 26 28, 34 30, 40 26 M30 18 C 34 22, 38 24, 46 22" stroke={TINTA} strokeWidth={1.6} fill="none" />
          <Ellipse cx={12} cy={44} rx={5} ry={3} fill="#E79B90" stroke={TINTA} strokeWidth={1.6} />
        </>
      );
  }
}

export function Instrumento({ imagen, tam = 64, fondo = color.nube }: { imagen: ImagenCancion; tam?: number; fondo?: string }) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam * 0.22, backgroundColor: fondo, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={tam * 0.86} height={tam * 0.86} viewBox="0 0 64 64">
        <Dibujo imagen={imagen} />
      </Svg>
    </View>
  );
}

/** Notas musicales sueltas, para el ambiente: pocas y quietas. */
export function Nota({ tam = 22, tinte = color.verde }: { tam?: number; tinte?: string }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      <Path d="M9 18 V5 L19 3 V16" stroke={tinte} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Ellipse cx={6.5} cy={18} rx={3.2} ry={2.6} fill={tinte} />
      <Ellipse cx={16.5} cy={16} rx={3.2} ry={2.6} fill={tinte} />
    </Svg>
  );
}
