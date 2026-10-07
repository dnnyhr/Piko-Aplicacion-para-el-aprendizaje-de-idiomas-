/**
 * La insignia de un logro.
 *
 * La de siempre es una escarapela: un aro festoneado del color de la
 * categoría, con el dibujo del logro en el medio y dos cintas abajo. Las de
 * eventos tienen su propio dibujo (hoy, la de Hackathon Nicaragua 2026).
 *
 * Bloqueada se ve gris, con un candadito: se sabe que existe y se adivina qué
 * es, pero queda claro que todavía no es tuya. «Próximamente» lleva un
 * relojito en lugar del candado.
 */

import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Polygon, Rect } from 'react-native-svg';
import type { Logro } from '../../core/logros/tipos';
import { InsigniaHackathon } from './InsigniaHackathon';

export interface InsigniaProps {
  logro: Logro;
  desbloqueado: boolean;
  proximamente?: boolean;
  /** Ancho en puntos. El alto es un poco más, por las cintas. */
  tam?: number;
}

export const GRIS = { aro: '#CFC8BC', aroHondo: '#B3AB9D', centro: '#F1ECE3', cinta: '#BDB5A7' } as const;

/** Un color un poco más oscuro, para las cintas y el borde. */
export function oscurecer(hex: string, f = 0.78): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) * f);
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`;
}

/** Un color más claro, mezclado con blanco. */
export function aclarar(hex: string, f = 0.75): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.round(((n >> s) & 255) + (255 - ((n >> s) & 255)) * f);
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`;
}

// 14 festones alrededor del aro.
const FESTONES = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  return { x: 50 + Math.cos(a) * 38, y: 46 + Math.sin(a) * 38 };
});

export function Insignia({ logro, desbloqueado, proximamente = false, tam = 88 }: InsigniaProps) {
  if (logro.insignia.forma === 'hackathon') return <InsigniaHackathon desbloqueado={desbloqueado} tam={tam} />;

  const base = desbloqueado ? logro.insignia.color : GRIS.aro;
  const hondo = desbloqueado ? oscurecer(base) : GRIS.aroHondo;
  const centro = desbloqueado ? aclarar(base, 0.82) : GRIS.centro;
  const cinta = desbloqueado ? oscurecer(base, 0.68) : GRIS.cinta;
  const alto = tam * 1.12;

  return (
    <View style={{ width: tam, height: alto }} accessibilityLabel={logro.nombre}>
      <Svg width={tam} height={alto} viewBox="0 0 100 112">
        {/* Las cintas */}
        <Polygon points="30,70 22,108 34,100 42,108 46,74" fill={cinta} />
        <Polygon points="70,70 78,108 66,100 58,108 54,74" fill={cinta} />
        {/* El aro festoneado */}
        <G>
          {FESTONES.map((f, i) => (
            <Circle key={i} cx={f.x} cy={f.y} r={10} fill={hondo} />
          ))}
          <Circle cx={50} cy={46} r={40} fill={base} />
        </G>
        {/* El centro, con un aro fino como de moneda */}
        <Circle cx={50} cy={46} r={30} fill={centro} />
        <Circle cx={50} cy={46} r={30} fill="none" stroke={hondo} strokeWidth={2.5} />
        {desbloqueado && <Path d="M28 30 A 30 30 0 0 1 62 18" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={4} strokeLinecap="round" fill="none" />}
      </Svg>

      <View style={[styles.centro, { width: tam, height: tam * 0.92 }]}>
        <Text style={{ fontSize: tam * 0.3, opacity: desbloqueado ? 1 : 0.22 }}>{logro.insignia.icono}</Text>
      </View>

      {!desbloqueado && (
        <View style={[styles.marca, { right: tam * 0.08, top: tam * 0.6, width: tam * 0.3, height: tam * 0.3 }]}>
          {proximamente ? <Reloj tam={tam * 0.3} /> : <Candado tam={tam * 0.3} />}
        </View>
      )}
    </View>
  );
}

export function Candado({ tam }: { tam: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 30 30">
      <Circle cx={15} cy={15} r={14} fill="#6B7A70" stroke="#FFFFFF" strokeWidth={2} />
      <Path d="M10.5 13.5 V11 a4.5 4.5 0 0 1 9 0 V13.5" stroke="#FFFFFF" strokeWidth={2.4} fill="none" />
      <Rect x={8.5} y={13} width={13} height={9.5} rx={2} fill="#FFFFFF" />
      <Circle cx={15} cy={17.5} r={1.6} fill="#6B7A70" />
    </Svg>
  );
}

function Reloj({ tam }: { tam: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 30 30">
      <Circle cx={15} cy={15} r={14} fill="#E8A429" stroke="#FFFFFF" strokeWidth={2} />
      <Circle cx={15} cy={15} r={8} fill="none" stroke="#FFFFFF" strokeWidth={2.2} />
      <Path d="M15 10.5 V15 L18 17" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  centro: { position: 'absolute', left: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  marca: { position: 'absolute' },
});
