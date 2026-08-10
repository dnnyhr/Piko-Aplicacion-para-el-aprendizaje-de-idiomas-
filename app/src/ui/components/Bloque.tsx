/**
 * Ficha de palabra para armar oraciones.
 *
 * Se toca para llevarla al renglón y se vuelve a tocar para devolverla — nada
 * de arrastrar. Un dedo de niño sobre una pantalla de gama baja acierta mucho
 * mejor un toque que un arrastre, y así tampoco hace falta gesture-handler.
 */

import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, espacio, labio, radio, texto } from '../tokens';

export interface BloqueProps {
  children: string;
  onPress?: () => void;
  /** Deja el hueco ocupando espacio, pero vacío: el renglón no salta. */
  fantasma?: boolean;
  disabled?: boolean;
}

export function Bloque({ children, onPress, fantasma = false, disabled = false }: BloqueProps) {
  const hundido = useRef(new Animated.Value(0)).current;

  const mover = (hacia: number) =>
    Animated.timing(hundido, { toValue: hacia, duration: 55, useNativeDriver: true }).start();

  const translateY = hundido.interpolate({ inputRange: [0, 1], outputRange: [0, labio.chico] });

  if (fantasma) {
    return (
      <View style={[styles.labio, styles.hueco]}>
        <View style={[styles.cuerpo, styles.cuerpoHueco]}>
          <Text style={[styles.texto, styles.textoInvisible]}>{children}</Text>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && mover(1)}
      onPressOut={() => mover(0)}
      disabled={disabled}
      accessibilityRole="button"
    >
      <View style={styles.labio}>
        <Animated.View style={[styles.cuerpo, { transform: [{ translateY }] }]}>
          <Text style={styles.texto}>{children}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  labio: {
    backgroundColor: color.bordeHondo,
    borderRadius: radio.sm + 2,
    paddingBottom: labio.chico,
  },
  hueco: { backgroundColor: 'transparent' },
  cuerpo: {
    backgroundColor: color.blanco,
    borderRadius: radio.sm + 2,
    borderWidth: 2,
    borderColor: color.borde,
    paddingVertical: espacio.sm + 2,
    paddingHorizontal: espacio.md + 2,
  },
  cuerpoHueco: {
    backgroundColor: color.papelHondo,
    borderColor: 'transparent',
  },
  texto: { ...texto.cuerpoFuerte, color: color.grafito },
  textoInvisible: { opacity: 0 },
});
