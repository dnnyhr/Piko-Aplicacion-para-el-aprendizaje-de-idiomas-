/**
 * El madroño del estudiante, en la etapa que le dan sus sacuanjoches.
 *
 * Con `desde` se anima el cambio de etapa: el árbol nuevo crece desde el
 * suelo encima del viejo. Piko, si va, mira el árbol desde abajo y festeja
 * cuando crece; el que sube por niveles es el camino, no este árbol.
 *
 * Lo único que se anima es `transform` y `opacity`, por el hilo nativo, y el
 * dibujo es un SVG plano: aguanta en un Android de gama baja.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg from 'react-native-svg';
import { etapaDe } from '../../core/progress/arbol';
import { PikoMascota } from '../piko/PikoMascota';
import { DibujoArbol, LIENZO, Paisaje, VIEWBOX } from './dibujo';

/** Alto de Piko y dónde pisa, en unidades del lienzo: a la izquierda, en el pasto. */
const PIKO = { alto: 58, x: 24, y: 252 } as const;
const RELACION_PIKO = 178 / 292;

export interface ArbolMadronoProps {
  /** Sacuanjoches acumuladas: deciden la etapa del árbol. */
  sacuanjoches: number;
  /** Si viene, se anima el paso desde la etapa de este total. */
  desde?: number;
  /** Ancho en puntos. El alto sale de la proporción del lienzo. */
  ancho?: number;
  conPiko?: boolean;
  /** El volcán, el sol y las nubes de atrás. */
  conPaisaje?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ArbolMadrono({
  sacuanjoches,
  desde,
  ancho = 220,
  conPiko = true,
  conPaisaje = true,
  style,
}: ArbolMadronoProps) {
  const escala = ancho / LIENZO.ancho;
  const alto = LIENZO.alto * escala;
  const altoPiko = PIKO.alto * escala;
  const anchoPiko = altoPiko * RELACION_PIKO;

  const etapaVieja = etapaDe(desde ?? sacuanjoches);
  const etapaNueva = etapaDe(sacuanjoches);
  const crece = etapaVieja.id !== etapaNueva.id;

  const avance = useRef(new Animated.Value(crece ? 0 : 1)).current;
  const [crecio, setCrecio] = useState(false);

  useEffect(() => {
    if (!crece) return;
    avance.setValue(0);
    setCrecio(false);
    const anim = Animated.sequence([
      Animated.delay(450),
      Animated.timing(avance, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]);
    anim.start(({ finished }) => finished && setCrecio(true));
    return () => anim.stop();
  }, [crece, etapaNueva.id, avance]);

  return (
    <View
      style={[{ width: ancho, height: alto }, style]}
      accessibilityRole="image"
      accessibilityLabel={`Tu madroño: ${etapaNueva.nombre}`}
    >
      {conPaisaje && (
        <Svg width={ancho} height={alto} viewBox={VIEWBOX} style={StyleSheet.absoluteFill}>
          <Paisaje />
        </Svg>
      )}

      {crece && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: avance.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
        >
          <Svg width={ancho} height={alto} viewBox={VIEWBOX}>
            <DibujoArbol etapa={etapaVieja.id} />
          </Svg>
        </Animated.View>
      )}

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          crece && {
            opacity: avance,
            // Crece desde el suelo.
            transform: [
              { translateY: avance.interpolate({ inputRange: [0, 1], outputRange: [alto * 0.08, 0] }) },
              { scale: avance.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] }) },
            ],
          },
        ]}
      >
        <Svg width={ancho} height={alto} viewBox={VIEWBOX}>
          <DibujoArbol etapa={etapaNueva.id} />
        </Svg>
      </Animated.View>

      {conPiko && (
        <View
          style={[
            styles.piko,
            {
              left: PIKO.x * escala - anchoPiko / 2,
              top: (PIKO.y - LIENZO.arriba) * escala - altoPiko,
            },
          ]}
        >
          <PikoMascota estado={crecio ? 'celebrando' : 'idle'} tam={altoPiko} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  piko: { position: 'absolute' },
});
