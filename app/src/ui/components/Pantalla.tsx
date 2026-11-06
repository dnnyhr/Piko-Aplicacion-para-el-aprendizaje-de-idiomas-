/**
 * Contenedor base de pantalla: área segura, fondo papel y padding parejo.
 */

import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { espacio } from '../tokens';
import { crearEstilos, useColor } from '../tema';

export interface PantallaProps {
  children: ReactNode;
  /** `false` cuando el contenido maneja su propio padding (listas, juego). */
  acolchado?: boolean;
  fondo?: string;
  style?: StyleProp<ViewStyle>;
}

export function Pantalla({
  children,
  acolchado = true,
  fondo,
  style,
}: PantallaProps) {
  const styles = useEstilos();
  const color = useColor();
  return (
    <SafeAreaView style={[styles.raiz, { backgroundColor: fondo ?? color.papel }]} edges={['top', 'bottom']}>
      <View style={[styles.cuerpo, acolchado && styles.acolchado, style]}>{children}</View>
    </SafeAreaView>
  );
}

const useEstilos = crearEstilos((color) => ({
  raiz: { flex: 1 },
  cuerpo: { flex: 1 },
  acolchado: { paddingHorizontal: espacio.xl, paddingVertical: espacio.lg },
}));
