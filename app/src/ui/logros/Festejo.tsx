/**
 * Lo que rodea a una insignia cuando se celebra: rayos que giran despacio
 * detrás y sacuanjoches que caen. Todo con `transform` y el driver nativo:
 * se ve fiesta sin costarle cuadros a un teléfono de gama baja.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Sacuanjoche } from '../arbol/Sacuanjoche';

/** Rayos de sol detrás de la insignia. */
export function Rayos({ tam, color = '#FFE3A3' }: { tam: number; color?: string }) {
  const giro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(giro, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [giro]);
  const rayos = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const b = a + Math.PI / 24;
    const c = a - Math.PI / 24;
    return `M50 50 L${50 + Math.cos(b) * 50} ${50 + Math.sin(b) * 50} L${50 + Math.cos(c) * 50} ${50 + Math.sin(c) * 50} Z`;
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ width: tam, height: tam, transform: [{ rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}
    >
      <Svg width={tam} height={tam} viewBox="0 0 100 100">
        {rayos.map((d, i) => (
          <Path key={i} d={d} fill={color} opacity={0.75} />
        ))}
      </Svg>
    </Animated.View>
  );
}

interface Flor {
  x: number;
  demora: number;
  dura: number;
  tam: number;
  giro: number;
}

/** Sacuanjoches que caen sobre un área de `ancho` × `alto`. Se repite mientras se ve. */
export function LluviaFlores({ ancho, alto, cuantas = 14 }: { ancho: number; alto: number; cuantas?: number }) {
  // Lugares fijos (no al azar en cada render): reparto parejo, con algo de vaivén.
  const flores = useMemo<Flor[]>(
    () =>
      Array.from({ length: cuantas }, (_, i) => ({
        x: ((i * 0.618) % 1) * (ancho - 24),
        demora: (i % 7) * 260,
        dura: 2600 + ((i * 37) % 5) * 300,
        tam: 16 + ((i * 13) % 3) * 6,
        giro: i % 2 ? 1 : -1,
      })),
    [ancho, cuantas],
  );
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {flores.map((f, i) => (
        <Cae key={i} flor={f} alto={alto} />
      ))}
    </View>
  );
}

function Cae({ flor, alto }: { flor: Flor; alto: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.delay(flor.demora),
        Animated.timing(v, { toValue: 1, duration: flor.dura, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [flor, v]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: flor.x,
        top: -30,
        opacity: v.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, alto + 40] }) },
          { translateX: v.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, 10, 0, -10, 0] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${flor.giro * 300}deg`] }) },
        ],
      }}
    >
      <Sacuanjoche tam={flor.tam} />
    </Animated.View>
  );
}

/** La insignia entra rebotando y después late suave. */
export function useEntrada() {
  const entra = useRef(new Animated.Value(0)).current;
  const late = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(entra, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }).start();
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(late, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(late, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    l.start();
    return () => l.stop();
  }, [entra, late]);
  return {
    opacity: entra.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      { scale: entra.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
      { rotate: entra.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
      { scale: late.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
    ],
  };
}
