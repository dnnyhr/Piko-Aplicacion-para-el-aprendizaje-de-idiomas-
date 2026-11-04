/**
 * El botón de Piko.
 *
 * Plano, con un labio inferior más oscuro que le da volumen sin sombras
 * difusas. Al presionarse el labio se achica y el botón baja: la misma
 * mecánica táctil que hace que los botones de Duolingo se sientan físicos,
 * y que en gama baja no cuesta nada porque no hay blur de por medio.
 */

import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { color as colorNormal, colorContraste, espacio, fuente, labio, radio, type Paleta } from '../tokens';
import { crearEstilos, useColor, useEscalaTexto } from '../tema';

export type TonoBoton = 'verde' | 'cielo' | 'papel' | 'fantasma' | 'pico';

interface Tono {
  fondo: string;
  labio: string;
  texto: string;
  borde?: string;
}

function tonos(color: Paleta): Record<TonoBoton, Tono> {
  // Con alto contraste todo botón lleva borde: se distingue aunque no se vea el color.
  const borde = color === colorContraste ? color.borde : undefined;
  return {
    verde: { fondo: color.verdePasto, labio: color.labioVerde, texto: color.verdeHondo, borde },
    cielo: { fondo: color.cielo, labio: color.cieloHondo, texto: color.tintaCielo, borde },
    pico: { fondo: color.pico, labio: color.labioPico, texto: color.tintaPico, borde },
    papel: {
      fondo: color.blanco,
      labio: color.bordeHondo,
      texto: color.verde,
      borde: color.borde,
    },
    fantasma: { fondo: 'transparent', labio: 'transparent', texto: color.tintaSuave, borde },
  };
}

const TONOS = { normal: tonos(colorNormal), contraste: tonos(colorContraste) };

export interface BotonProps {
  children: string;
  onPress?: () => void;
  tono?: TonoBoton;
  /** Ocupa todo el ancho disponible. Es lo normal en las pantallas de juego. */
  ancho?: boolean;
  chico?: boolean;
  disabled?: boolean;
  /** Un dibujo antes del texto. */
  icono?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Boton({
  children,
  onPress,
  tono = 'verde',
  ancho = false,
  chico = false,
  disabled = false,
  icono,
  style,
}: BotonProps) {
  const styles = useEstilos();
  const hundido = useRef(new Animated.Value(0)).current;
  const color = useColor();
  const t = TONOS[color === colorContraste ? 'contraste' : 'normal'][tono];
  const escala = useEscalaTexto();
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
          {icono}
          <Text
            numberOfLines={escala > 1 ? 2 : 1}
            style={[chico ? styles.textoChico : styles.texto, { color: t.texto }]}
          >
            {children}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const useEstilos = crearEstilos((color) => ({
  ancho: { alignSelf: 'stretch' },
  labio: { borderRadius: radio.md },
  cuerpo: {
    borderRadius: radio.md,
    paddingHorizontal: espacio.xl,
    flexDirection: 'row',
    gap: espacio.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  texto: {
    fontFamily: fuente.boton,
    fontSize: 16,
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  textoChico: {
    fontFamily: fuente.boton,
    fontSize: 14,
    letterSpacing: 0.6,
    textAlign: 'center',
    textTransform: 'uppercase',
    flexShrink: 1,
  },
}));
