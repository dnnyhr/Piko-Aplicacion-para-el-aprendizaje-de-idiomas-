/**
 * La pastilla con las sacuanjoches del estudiante. Va en las cabeceras para
 * que el total esté siempre a la vista; tocarla lleva al perfil.
 */

import { Pressable, Text, View } from 'react-native';
import { espacio, fuente, radio } from '../tokens';
import { Sacuanjoche } from './Sacuanjoche';
import { crearEstilos } from '../tema';

export interface ContadorSacuanjochesProps {
  total: number;
  onPress?: () => void;
}

export function ContadorSacuanjoches({ total, onPress }: ContadorSacuanjochesProps) {
  const styles = useEstilos();
  const contenido = (
    <View style={styles.pastilla}>
      <Sacuanjoche tam={22} />
      <Text style={styles.numero}>{total}</Text>
    </View>
  );
  if (!onPress) return contenido;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Tenés ${total} sacuanjoches. Ver mi árbol`}
    >
      {contenido}
    </Pressable>
  );
}

const useEstilos = crearEstilos((color) => ({
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.redondo,
    paddingVertical: espacio.xs,
    paddingLeft: espacio.sm,
    paddingRight: espacio.md,
  },
  numero: { fontFamily: fuente.tituloFuerte, fontSize: 17, color: color.verde },
}));
