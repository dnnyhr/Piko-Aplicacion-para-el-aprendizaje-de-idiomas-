/**
 * El botón de Piko.
 *
 * Plano, con un labio inferior más oscuro que le da volumen sin sombras
 * difusas. Al presionarse el labio se achica y el botón baja: la misma
 * mecánica táctil que hace que los botones de Duolingo se sientan físicos,
 * y que en gama baja no cuesta nada porque no hay blur de por medio.
 */

import { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { color, espacio, fuente, labio, radio } from '../tokens';

export type TonoBoton = 'verde' | 'cielo' | 'papel' | 'fantasma' | 'pico';

interface Tono {
  fondo: string;
  labio: string;
  texto: string;
  borde?: string;
}

const TONOS: Record<TonoBoton, Tono> = {
  verde: { fondo: color.verdePasto, labio: '#7BA22C', texto: color.verdeHondo },
  cielo: { fondo: color.cielo, labio: color.cieloHondo, texto: '#0B3D57' },
  pico: { fondo: color.pico, labio: '#C08417', texto: '#5C3D02' },
  papel: {
    fondo: color.blanco,
    labio: color.bordeHondo,
    texto: color.verde,
    borde: color.borde,
  },
  fantasma: { fondo: 'transparent', labio: 'transparent', texto: color.tintaSuave },
};

export interface BotonProps {
  children: string;
  onPress?: () => void;
  tono?: TonoBoton;
  /** Ocupa todo el ancho disponible. Es lo normal en las pantallas de juego. */
  ancho?: boolean;
  chico?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Boton({
  children,
  onPress,
  tono = 'verde',
  ancho = false,
  chico = false,
  disabled = false,
  style,
}: BotonProps) {
  const hundido = useRef(new Animated.Value(0)).current;
  const t = TONOS[tono];
  const alto = chico ? labio.chico : labio.normal;

  const mover = (hacia: number) =>
    Animated.timing(hundido, {
      toValue: hacia,
      duration: 60,
      useNativeDriver: true,
    }).start();

  const translateY = hundido.interpolate({ inputRange: [0, 1], outputRange: [0, alto] });

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && mover(1)}
      onPressOut={() => mover(0)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={[ancho && styles.ancho, style]}
    >
      {/* El labio vive detrás; el cuerpo se desliza sobre él al presionar. */}
      <View style={[styles.labio, { backgroundColor: t.labio, paddingBottom: alto }]}>
        <Animated.View
          style={[
            styles.cuerpo,
            {
              backgroundColor: t.fondo,
              transform: [{ translateY }],
              paddingVertical: chico ? espacio.sm + 2 : espacio.md + 2,
              opacity: disabled ? 0.45 : 1,
            },
            t.borde ? { borderWidth: 2, borderColor: t.borde } : null,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.texto, { color: t.texto, fontSize: chico ? 14 : 16 }]}
          >
            {children}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ancho: { alignSelf: 'stretch' },
  labio: { borderRadius: radio.md },
  cuerpo: {
    borderRadius: radio.md,
    paddingHorizontal: espacio.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontFamily: fuente.boton,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
