/**
 * Piko bailando, con su falda de sacuanjoches.
 *
 * Mientras suena la canción, Piko rebota a tiempo con el pulso de la
 * grabación y se mece de un lado a otro; la falda se mece al revés, un poco
 * atrasada, como una falda de verdad. En las partes repetidas baila con más
 * ganas, y cuando cambia `festejo` (empieza el coro, una respuesta buena) da
 * una vuelta.
 *
 * Todo con `transform` y el driver nativo, y con dos valores animados en
 * total: anda en un teléfono de gama baja.
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { FlorEnDibujo } from '../arbol/Sacuanjoche';
import { PikoMascota } from '../piko/PikoMascota';
import type { EstadoPiko } from '../piko/sprites';

/** Proporción del dibujo de Piko (viewBox 178×292). */
const RELACION = 178 / 292;
/** La cintura de Piko en el dibujo: de ahí cuelga la falda y alrededor de ahí se mece. */
const CINTURA = { x: 108, y: 210 };

const HOJA = '#3F7A25';
const CINTO = '#4E8F2E';
const TIRAS = [62, 76, 90, 104, 118, 132, 146, 158];
const FLORES = [
  { x: 64, y: 214, tam: 22, giro: 0 },
  { x: 86, y: 222, tam: 24, giro: 20 },
  { x: 110, y: 225, tam: 25, giro: 40 },
  { x: 134, y: 220, tam: 24, giro: 10 },
  { x: 155, y: 210, tam: 21, giro: 30 },
];

/** La falda, en las coordenadas del dibujo de Piko. */
function Falda() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 178 292">
      {TIRAS.map((x, i) => (
        <Path key={x} d={`M${x} 212 q ${i % 2 ? 5 : -5} 18 ${i % 2 ? 1 : -1} ${30 + (i % 3) * 4} q ${i % 2 ? -6 : 6} -16 ${i % 2 ? -1 : 1} -${30 + (i % 3) * 4} Z`} fill={HOJA} />
      ))}
      <Path d="M56 204 Q108 224 162 198 L163 211 Q108 236 54 217 Z" fill={CINTO} />
      {FLORES.map((f) => (
        <FlorEnDibujo key={f.x} x={f.x} y={f.y} tam={f.tam} giro={f.giro} />
      ))}
    </Svg>
  );
}

export interface PikoBailarinProps {
  tam?: number;
  bailando: boolean;
  /** Segundos entre pulsos de la canción. */
  periodo: number;
  /** Milisegundos hasta el próximo pulso, para arrancar a tiempo. */
  desfase?: number;
  /** Baila con más ganas (partes repetidas, «Canta con Piko»). */
  fuerte?: boolean;
  /** Cada vez que cambia, Piko da una vuelta de festejo. */
  festejo?: number;
  estado?: EstadoPiko;
}

export function PikoBailarin({ tam = 120, bailando, periodo, desfase = 0, fuerte = false, festejo = 0, estado = 'alegre' }: PikoBailarinProps) {
  const rebote = useRef(new Animated.Value(0)).current;
  const vaiven = useRef(new Animated.Value(0)).current;
  const vuelta = useRef(new Animated.Value(0)).current;
  const primero = useRef(true);

  // Si el pulso es muy rápido, rebota cada dos: se ve mejor y cansa menos la vista.
  const paso = Math.max(0.3, periodo < 0.42 ? periodo * 2 : periodo) * 1000;

  useEffect(() => {
    if (!bailando) {
      Animated.parallel([
        Animated.timing(rebote, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(vaiven, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      return;
    }
    const rebotar = Animated.loop(
      Animated.sequence([
        Animated.timing(rebote, { toValue: 1, duration: paso * 0.4, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(rebote, { toValue: 0, duration: paso * 0.6, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    const mecer = Animated.loop(
      Animated.sequence([
        Animated.timing(vaiven, { toValue: 1, duration: paso, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(vaiven, { toValue: -1, duration: paso, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const arranque = setTimeout(() => {
      rebotar.start();
      mecer.start();
    }, Math.max(0, desfase));
    return () => {
      clearTimeout(arranque);
      rebotar.stop();
      mecer.stop();
    };
  }, [bailando, paso, desfase, rebote, vaiven]);

  useEffect(() => {
    if (primero.current) {
      primero.current = false;
      return;
    }
    vuelta.setValue(0);
    Animated.timing(vuelta, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [festejo, vuelta]);

  const ancho = tam * RELACION;
  const alto = fuerte ? tam * 0.09 : tam * 0.05;
  const mece = fuerte ? 9 : 5;
  // La falda gira alrededor de la cintura: se lleva el centro de giro hasta ahí y se vuelve.
  const dx = (CINTURA.x / 178) * ancho - ancho / 2;
  const dy = (CINTURA.y / 292) * tam - tam / 2;

  return (
    <View style={{ width: ancho, height: tam }} pointerEvents="none">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              { translateY: rebote.interpolate({ inputRange: [0, 1], outputRange: [0, -alto] }) },
              { rotate: vaiven.interpolate({ inputRange: [-1, 1], outputRange: [`-${mece}deg`, `${mece}deg`] }) },
              { scaleX: vuelta.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [1, 0.2, -1, 0.2, 1] }) },
            ],
          },
        ]}
      >
        <PikoMascota
          estado={estado}
          tam={tam}
          animado={!bailando}
          accesorio={
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [
                    { translateX: dx },
                    { translateY: dy },
                    { rotate: vaiven.interpolate({ inputRange: [-1, 1], outputRange: [`${mece * 1.6}deg`, `-${mece * 1.6}deg`] }) },
                    { translateX: -dx },
                    { translateY: -dy },
                  ],
                },
              ]}
            >
              <Falda />
            </Animated.View>
          }
        />
      </Animated.View>
    </View>
  );
}
