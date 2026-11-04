/**
 * Tarjeta de opción para los ejercicios de selección.
 *
 * Tres estados visuales: normal, elegida, y revelada — este último se usa
 * después de responder, para pintar en verde la correcta. Cuando el
 * estudiante se equivocó, su elección se marca en ámbar, nunca en rojo.
 */

import { useRef, type ReactNode } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { color as colorNormal, colorContraste, espacio, labio, radio, texto, type Paleta } from '../tokens';
import { Marca } from './Marca';
import { useTextos } from '../textos/useTextos';
import { crearEstilos, useColor } from '../tema';

export type EstadoOpcion = 'normal' | 'elegida' | 'correcta' | 'fallada';

interface Tinta {
  fondo: string;
  borde: string;
  labio: string;
  texto: string;
}

function paleta(color: Paleta): Record<EstadoOpcion, Tinta> {
  return {
    normal: {
      fondo: color.blanco,
      borde: color.borde,
      labio: color.bordeHondo,
      texto: color.grafito,
    },
    elegida: {
      fondo: color.nube,
      borde: color.bordeElegido,
      labio: color.cieloHondo,
      texto: color.tintaCielo,
    },
    correcta: {
      fondo: color.aciertoFondo,
      borde: color.acierto,
      labio: color.labioVerde,
      texto: color.aciertoTinta,
    },
    fallada: {
      fondo: color.intentoFondo,
      borde: color.intento,
      labio: color.labioPico,
      texto: color.intentoTinta,
    },
  };
}

const PALETAS = { normal: paleta(colorNormal), contraste: paleta(colorContraste) };

export interface OpcionProps {
  children: string;
  estado?: EstadoOpcion;
  onPress?: () => void;
  disabled?: boolean;
  /** Número de atajo que se muestra a la izquierda. */
  indice?: number;
  /** Un dibujo de apoyo antes del texto (los minijuegos, en el nivel inicial). */
  icono?: ReactNode;
}

export function Opcion({ children, estado = 'normal', onPress, disabled, indice, icono }: OpcionProps) {
  const styles = useEstilos();
  const hundido = useRef(new Animated.Value(0)).current;
  const color = useColor();
  const p = PALETAS[color === colorContraste ? 'contraste' : 'normal'][estado];
  const { t } = useTextos();
  // El estado también se dice y se dibuja: el color solo no alcanza.
  const dicho = estado === 'normal' ? '' : `, ${t(`opcion.${estado}`)}`;

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
      accessibilityLabel={`${children}${dicho}`}
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
          {icono}
          <Text style={[styles.texto, { color: p.texto }]}>{children}</Text>
          {estado !== 'normal' && (
            <View style={styles.marca}>
              <Marca tipo={estado === 'correcta' ? 'visto' : 'punto'} tinta={p.texto} />
            </View>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const useEstilos = crearEstilos((color) => ({
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
  marca: { marginLeft: 'auto' },
  insignia: {
    minWidth: 26,
    minHeight: 26,
    borderRadius: radio.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insigniaTexto: { ...texto.chico, fontFamily: 'Fredoka_600SemiBold' },
  texto: { ...texto.subtitulo, flexShrink: 1 },
}));
