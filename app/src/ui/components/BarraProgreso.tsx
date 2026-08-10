/**
 * La barra de avance de la ronda. Gorda, redonda y con un brillo arriba —
 * la que corona todas las pantallas de ejercicio.
 */

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, radio, tiempo } from '../tokens';

export interface BarraProgresoProps {
  /** Entre 0 y 1. */
  valor: number;
  alto?: number;
  tono?: string;
  style?: StyleProp<ViewStyle>;
}

export function BarraProgreso({
  valor,
  alto = 16,
  tono = color.verdePasto,
  style,
}: BarraProgresoProps) {
  const acotado = Math.max(0, Math.min(1, valor));
  const animado = useRef(new Animated.Value(acotado)).current;

  useEffect(() => {
    Animated.timing(animado, {
      toValue: acotado,
      duration: tiempo.normal,
      // Se anima `width`, que no puede ir por el hilo nativo. La barra es un
      // solo elemento y cambia pocas veces por ronda, así que no se nota.
      useNativeDriver: false,
    }).start();
  }, [acotado, animado]);

  const ancho = animado.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.pista, { height: alto, borderRadius: alto / 2 }, style]}>
      <Animated.View
        style={[styles.relleno, { width: ancho, backgroundColor: tono, borderRadius: alto / 2 }]}
      >
        {acotado > 0.06 && <View style={[styles.brillo, { borderRadius: alto / 4 }]} />}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pista: {
    backgroundColor: color.papelHondo,
    overflow: 'hidden',
    width: '100%',
  },
  relleno: { height: '100%', justifyContent: 'flex-start' },
  brillo: {
    height: 4,
    marginTop: 3,
    marginHorizontal: 6,
    backgroundColor: 'rgba(255,255,255,0.42)',
  },
});
