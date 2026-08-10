/**
 * Tarjeta de opción para los ejercicios de selección.
 *
 * Tres estados visuales: normal, elegida, y revelada — este último se usa
 * después de responder, para pintar en verde la correcta. Cuando el
 * estudiante se equivocó, su elección se marca en ámbar, nunca en rojo.
 */

import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, espacio, labio, radio, texto } from '../tokens';

export type EstadoOpcion = 'normal' | 'elegida' | 'correcta' | 'fallada';

const PALETA: Record<EstadoOpcion, { fondo: string; borde: string; labio: string; texto: string }> =
  {
    normal: {
      fondo: color.blanco,
      borde: color.borde,
      labio: color.bordeHondo,
      texto: color.grafito,
    },
    elegida: {
      fondo: color.nube,
      borde: color.cielo,
      labio: color.cieloHondo,
      texto: '#0B3D57',
    },
    correcta: {
      fondo: color.aciertoFondo,
      borde: color.acierto,
      labio: '#7BA22C',
      texto: color.aciertoTinta,
    },
    fallada: {
      fondo: color.intentoFondo,
      borde: color.intento,
      labio: '#C08417',
      texto: color.intentoTinta,
    },
  };

export interface OpcionProps {
  children: string;
  estado?: EstadoOpcion;
  onPress?: () => void;
  disabled?: boolean;
  /** Número de atajo que se muestra a la izquierda. */
  indice?: number;
}

export function Opcion({ children, estado = 'normal', onPress, disabled, indice }: OpcionProps) {
  const hundido = useRef(new Animated.Value(0)).current;
  const p = PALETA[estado];

  const mover = (hacia: number) =>
    Animated.timing(hundido, { toValue: hacia, duration: 60, useNativeDriver: true }).start();

  const translateY = hundido.interpolate({ inputRange: [0, 1], outputRange: [0, labio.normal] });

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && mover(1)}
      onPressOut={() => mover(0)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: estado !== 'normal', disabled: !!disabled }}
    >
      <View style={[styles.labio, { backgroundColor: p.labio }]}>
        <Animated.View
          style={[
            styles.cuerpo,
            { backgroundColor: p.fondo, borderColor: p.borde, transform: [{ translateY }] },
          ]}
        >
          {indice !== undefined && (
            <View style={[styles.insignia, { borderColor: p.borde }]}>
              <Text style={[styles.insigniaTexto, { color: p.texto }]}>{indice}</Text>
            </View>
          )}
          <Text style={[styles.texto, { color: p.texto }]}>{children}</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  labio: { borderRadius: radio.md, paddingBottom: labio.normal },
  cuerpo: {
    borderRadius: radio.md,
    borderWidth: 2,
    paddingVertical: espacio.lg,
    paddingHorizontal: espacio.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    minHeight: 64,
  },
  insignia: {
    width: 26,
    height: 26,
    borderRadius: radio.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insigniaTexto: { ...texto.chico, fontFamily: 'Fredoka_600SemiBold' },
  texto: { ...texto.subtitulo, flexShrink: 1 },
});
