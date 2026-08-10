/**
 * El globo de diálogo de Piko. Va siempre pegado a la mascota, con la colita
 * apuntándole.
 */

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, espacio, radio, texto } from '../tokens';

export interface GloboProps {
  children: string;
  /** De qué lado está Piko. La colita apunta hacia allá. */
  hacia?: 'izquierda' | 'abajo';
  style?: StyleProp<ViewStyle>;
}

export function Globo({ children, hacia = 'izquierda', style }: GloboProps) {
  return (
    <View style={[styles.contenedor, style]}>
      <View style={styles.caja}>
        <Text style={styles.texto}>{children}</Text>
      </View>
      <View style={hacia === 'izquierda' ? styles.colaIzq : styles.colaAbajo} />
    </View>
  );
}

/**
 * La colita es un cuadrado rotado 45° que se mete debajo del globo. Sale más
 * barato que un triángulo con bordes propios, y encaja perfecto con el borde
 * de 2px de la caja.
 */
const LADO = 14;

const styles = StyleSheet.create({
  contenedor: { position: 'relative' },
  caja: {
    backgroundColor: color.blanco,
    borderRadius: radio.lg,
    borderWidth: 2,
    borderColor: color.borde,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
  },
  texto: { ...texto.cuerpoFuerte, color: color.tinta },
  colaIzq: {
    position: 'absolute',
    left: -LADO / 2,
    top: '50%',
    marginTop: -LADO / 2,
    width: LADO,
    height: LADO,
    backgroundColor: color.blanco,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: color.borde,
    transform: [{ rotate: '45deg' }],
  },
  colaAbajo: {
    position: 'absolute',
    bottom: -LADO / 2,
    left: espacio.xl,
    width: LADO,
    height: LADO,
    backgroundColor: color.blanco,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: color.borde,
    transform: [{ rotate: '45deg' }],
  },
});
