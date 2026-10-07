/**
 * La insignia de Piko Hackathon 2026.
 *
 * Distinta de todas las demás a propósito: un hexágono (la forma de las
 * placas y los chips) con las franjas azul–blanco–azul de la bandera de
 * Nicaragua, pistas de circuito en las franjas, Piko feliz en el centro, una
 * sacuanjoche arriba y la cinta de «2026» abajo. Dorada por fuera: es la
 * única de oro.
 */

import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { Sacuanjoche } from '../arbol/Sacuanjoche';
import { Candado, GRIS } from './Insignia';

const PIKO = require('../../../assets/piko/alegre.png');

/** Un hexágono con una punta arriba. */
function hexagono(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

const AZUL = '#0067C6';
const ORO = '#F4C542';
const ORO_HONDO = '#C98A1B';

export function InsigniaHackathon({ desbloqueado, tam = 88 }: { desbloqueado: boolean; tam?: number }) {
  const alto = tam * 1.12;
  const azul = desbloqueado ? AZUL : GRIS.aroHondo;
  const blanco = desbloqueado ? '#FFFFFF' : GRIS.centro;
  const oro = desbloqueado ? ORO : GRIS.aro;
  const oroHondo = desbloqueado ? ORO_HONDO : GRIS.aroHondo;
  const pista = desbloqueado ? '#7FC4FF' : '#D9D3C8';
  const cara = tam * 0.4;

  return (
    <View style={{ width: tam, height: alto }} accessibilityLabel="Piko Hackathon 2026">
      <Svg width={tam} height={alto} viewBox="0 0 100 112">
        {/* Borde de oro, con un labio más oscuro abajo */}
        <Polygon points={hexagono(50, 52, 47)} fill={oroHondo} />
        <Polygon points={hexagono(50, 50, 47)} fill={oro} />

        {/* La bandera: el hexágono azul y la franja blanca, que cae entera
            entre los lados rectos (x de 16,2 a 83,8 entre y 30,5 y 69,5). Sin
            clipPath, que en el navegador no siempre recorta. */}
        <Polygon points={hexagono(50, 50, 39)} fill={azul} />
        <Rect x={16.3} y={37} width={67.4} height={26} fill={blanco} />

        {/* Pistas de circuito en las franjas azules */}
        <G stroke={pista} strokeWidth={1.6} strokeLinecap="round" fill="none">
          <Path d="M24 33 H30 L34 28 H40" />
          <Path d="M76 33 H70 L66 28 H60" />
          <Path d="M24 67 H30 L34 72 H42" />
          <Path d="M76 67 H70 L66 72 H58" />
          <Line x1={50} y1={16} x2={50} y2={24} />
        </G>
        <G fill={pista}>
          <Circle cx={40} cy={28} r={2} />
          <Circle cx={60} cy={28} r={2} />
          <Circle cx={42} cy={72} r={2} />
          <Circle cx={58} cy={72} r={2} />
          <Circle cx={50} cy={16} r={2} />
        </G>
        <Polygon points={hexagono(50, 50, 39)} fill="none" stroke={oroHondo} strokeWidth={1.5} />

        {/* El aro blanco donde va Piko */}
        <Circle cx={50} cy={50} r={21} fill={blanco} stroke={oro} strokeWidth={3} />

        {/* La cinta de 2026 */}
        <Path d="M14 84 L22 80 L78 80 L86 84 L78 88 L80 96 L20 96 L22 88 Z" fill={oroHondo} />
        <Rect x={20} y={78} width={60} height={16} rx={3} fill={oro} />
        <SvgText x={50} y={90.5} fontSize={11} fontWeight="bold" fill={desbloqueado ? '#5C3D02' : '#8F877A'} textAnchor="middle" letterSpacing={1.5}>
          2026
        </SvgText>
      </Svg>

      {/* Piko, recortado en el aro */}
      <View style={[styles.cara, { width: cara, height: cara, borderRadius: cara / 2, left: tam / 2 - cara / 2, top: tam * 0.5 - cara / 2 }]}>
        <Image
          source={PIKO}
          resizeMode="contain"
          style={{ width: cara * 1.7, height: cara * 2.6, marginLeft: -cara * 0.36, marginTop: -cara * 0.12, opacity: desbloqueado ? 1 : 0.25 }}
        />
      </View>

      {/* La sacuanjoche en la punta de arriba */}
      <View style={[styles.flor, { left: tam / 2 - tam * 0.12, top: -tam * 0.06 }]}>
        <Sacuanjoche tam={tam * 0.24} />
      </View>

      {!desbloqueado && (
        <View style={{ position: 'absolute', right: tam * 0.06, top: tam * 0.56 }}>
          <Candado tam={tam * 0.3} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cara: { position: 'absolute', overflow: 'hidden', alignItems: 'flex-start' },
  flor: { position: 'absolute' },
});
