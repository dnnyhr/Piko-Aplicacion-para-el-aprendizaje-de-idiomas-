/**
 * La venda de la gallinita ciega: un pañuelo rojo sobre los ojos de Piko,
 * con el nudo atrás. Tapa los ojos pero deja ver el pico y el copete, que es
 * lo que hace a Piko expresivo.
 *
 * Va en las coordenadas del dibujo vectorial de Piko (viewBox 178×292, el ojo
 * está cerca de 104,62): se pasa como `accesorio` de `PikoMascota`.
 */

import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PikoMascota } from '../piko/PikoMascota';
import { TIERRA } from './Escena';

const PANUELO = '#D2453B';
const PANUELO_HONDO = '#A3302A';

export function Venda() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 178 292">
      {/* Las puntas del nudo, atrás de la cabeza */}
      <Path d="M66 58 C 54 50, 44 50, 38 56 C 46 58, 54 62, 64 64 Z" fill={PANUELO} stroke={PANUELO_HONDO} strokeWidth={1.5} />
      <Path d="M66 64 C 56 70, 48 78, 46 86 C 54 82, 60 76, 68 68 Z" fill={PANUELO} stroke={PANUELO_HONDO} strokeWidth={1.5} />
      {/* La faja sobre los ojos */}
      <Path
        d="M62 50 C 90 42, 122 44, 148 52 L 146 74 C 120 66, 90 66, 64 72 Z"
        fill={PANUELO}
        stroke={PANUELO_HONDO}
        strokeWidth={2}
      />
      <Path d="M66 58 C 92 52, 120 53, 146 60" stroke="#FFFDF4" strokeWidth={2} fill="none" strokeDasharray="4 5" opacity={0.8} />
      <Path d="M62 50 C 64 56, 64 64, 64 72" stroke={PANUELO_HONDO} strokeWidth={3} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** El ícono del juego: Piko vendado sobre la tierra del patio. */
export function IconoGallinita({ tam = 64 }: { tam?: number }) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam * 0.22, backgroundColor: TIERRA, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' }}>
      <PikoMascota tam={tam * 0.95} animado={false} accesorio={<Venda />} />
    </View>
  );
}
