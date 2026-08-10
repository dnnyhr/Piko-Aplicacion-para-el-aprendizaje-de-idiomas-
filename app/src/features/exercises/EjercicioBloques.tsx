/**
 * Construcción de oraciones con fichas de palabras.
 *
 * Se toca una ficha del banco y sube al renglón; se toca en el renglón y
 * vuelve al banco. Las fichas usadas quedan como huecos en su lugar original
 * para que el banco no se reacomode bajo el dedo.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bloque } from '../../ui/components/Bloque';
import { PikoMascota } from '../../ui/piko/PikoMascota';
import { color, espacio, radio, texto } from '../../ui/tokens';
import type { BuildItem } from '../../core/content/schema';

export interface EjercicioBloquesProps {
  item: BuildItem;
  /** Las fichas ya barajadas. Las baraja el Runner, que es quien tiene la semilla. */
  banco: readonly string[];
  /** Índices dentro de `banco`, en el orden en que se colocaron. */
  armado: number[];
  onArmado: (indices: number[]) => void;
  revelado: boolean;
}

export function EjercicioBloques({
  item,
  banco,
  armado,
  onArmado,
  revelado,
}: EjercicioBloquesProps) {
  const colocar = (indice: number) => {
    if (revelado || armado.includes(indice)) return;
    onArmado([...armado, indice]);
  };

  const quitar = (posicion: number) => {
    if (revelado) return;
    onArmado(armado.filter((_, i) => i !== posicion));
  };

  return (
    <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
      <View style={styles.cabecera}>
        <PikoMascota estado={revelado ? 'idle' : 'pensando'} tam={92} />
        <View style={styles.enunciado}>
          <Text style={styles.instruccion}>Armá esta oración</Text>
          <Text style={styles.frase}>{item.gloss}</Text>
        </View>
      </View>

      {/* El renglón: siempre visible, aunque esté vacío, para que se entienda
          dónde van a caer las palabras. */}
      <View style={styles.renglon}>
        {armado.length === 0 ? (
          <Text style={styles.pista}>Tocá las palabras de abajo</Text>
        ) : (
          <View style={styles.fichas}>
            {armado.map((indice, posicion) => (
              <Bloque
                key={`${indice}-${posicion}`}
                disabled={revelado}
                onPress={() => quitar(posicion)}
              >
                {banco[indice] as string}
              </Bloque>
            ))}
          </View>
        )}
      </View>

      <View style={styles.fichas}>
        {banco.map((palabra, indice) => (
          <Bloque
            key={`${palabra}-${indice}`}
            fantasma={armado.includes(indice)}
            disabled={revelado}
            onPress={() => colocar(indice)}
          >
            {palabra}
          </Bloque>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingBottom: espacio.xxxl, gap: espacio.xl },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  enunciado: { flex: 1, gap: espacio.xs },
  instruccion: {
    ...texto.chico,
    color: color.tintaSuave,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  frase: { ...texto.titulo, color: color.grafito },
  renglon: {
    minHeight: 108,
    justifyContent: 'center',
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: color.borde,
    borderStyle: 'dashed',
    borderRadius: radio.sm,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.sm,
  },
  pista: { ...texto.chico, color: color.tintaSuave, textAlign: 'center' },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
});
