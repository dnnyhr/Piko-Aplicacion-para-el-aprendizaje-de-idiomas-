/**
 * Piko, el chocoyo.
 *
 * Acompaña toda la app: mira desde el costado mientras el estudiante piensa,
 * festeja cuando acierta y lo anima cuando no. Nunca se enoja ni se pone
 * triste — reforzar sin regañar es una regla de producto, no un detalle.
 *
 * Mientras `sprites.ts` esté vacío se dibuja el Piko vectorial de la landing.
 * Al registrar una imagen para un estado, la mascota la usa sin que haya que
 * tocar ninguna pantalla.
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { PIKO_SVG } from './vector.gen';
import { spriteDe, type EstadoPiko } from './sprites';

/** Proporción del dibujo vectorial (viewBox 178×292). */
const RELACION = 178 / 292;

export interface PikoMascotaProps {
  estado?: EstadoPiko;
  /** Alto en puntos. El ancho sale de la proporción. */
  tam?: number;
  /** Apagar la animación en listas largas, donde costaría cuadros. */
  animado?: boolean;
  style?: ViewStyle;
}

export function PikoMascota({
  estado = 'idle',
  tam = 120,
  animado = true,
  style,
}: PikoMascotaProps) {
  const respira = useRef(new Animated.Value(0)).current;
  const salta = useRef(new Animated.Value(0)).current;
  const sprite = spriteDe(estado);

  // Respiración: apenas perceptible, pero hace que no parezca una calcomanía.
  useEffect(() => {
    if (!animado) return;
    const ciclo = Animated.loop(
      Animated.sequence([
        Animated.timing(respira, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(respira, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [animado, respira]);

  // Un brinco corto al festejar. Con dos saltos alcanza: más se vuelve ruido.
  useEffect(() => {
    if (!animado) return;
    if (estado !== 'alegre' && estado !== 'celebrando' && estado !== 'saludando') return;

    salta.setValue(0);
    const brinco = Animated.sequence([
      Animated.timing(salta, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(salta, {
        toValue: 0,
        duration: 240,
        easing: Easing.bounce,
        useNativeDriver: true,
      }),
    ]);
    const doble = Animated.sequence([brinco, Animated.delay(60), brinco]);
    doble.start();
    return () => doble.stop();
  }, [estado, animado, salta]);

  const ancho = tam * RELACION;

  const transform = [
    {
      translateY: salta.interpolate({ inputRange: [0, 1], outputRange: [0, -tam * 0.12] }),
    },
    {
      scaleY: respira.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }),
    },
    {
      scaleX: respira.interpolate({ inputRange: [0, 1], outputRange: [1, 0.99] }),
    },
    // Al animar tras un error, Piko se inclina un poco: gesto de "seguí".
    { rotate: estado === 'animando' ? '-6deg' : '0deg' },
  ];

  return (
    <View style={[{ width: ancho, height: tam }, style]} pointerEvents="none">
      <Animated.View style={[styles.lienzo, { transform }]}>
        {sprite ? (
          <Image source={sprite} style={styles.lienzo} resizeMode="contain" />
        ) : (
          <SvgXml xml={PIKO_SVG} width="100%" height="100%" />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  lienzo: { width: '100%', height: '100%' },
});
