/**
 * Al terminar la rayuela.
 *
 * El festejo depende de cómo se saltó: sólo hay cielo, flores y madroño que
 * crece cuando hubo flores. Sin aciertos suficientes Piko anima a volver a
 * intentarlo; si la rayuela ya dio flores hoy, lo dice: no se festeja algo
 * que no pasó.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Boton } from '../../../ui/components/Boton';
import { Globo } from '../../../ui/components/Globo';
import { PikoMascota } from '../../../ui/piko/PikoMascota';
import { Sacuanjoche } from '../../../ui/arbol/Sacuanjoche';
import { RecompensaLeccion } from '../../arbol/RecompensaLeccion';
import { useTextos } from '../../../ui/textos/useTextos';
import type { Recompensa } from '../../../core/progress/arbol';
import { SALTOS } from '../../../core/minijuegos/rayuela';
import { color, espacio, radio, texto } from '../../../ui/tokens';

/** Aciertos al primer salto que hacen falta para que haya flores. */
export const MINIMO_FLORES = Math.ceil((SALTOS * 2) / 3);

export interface FinProps {
  recompensa: Recompensa;
  primeros: number;
  /** La rayuela ya había dado flores hoy: esta partida fue de práctica. */
  repetida: boolean;
  xpGanado: number;
  titulo: string;
  onOtra: () => void;
  onVolverASaltar: () => void;
  onVerArbol: () => void;
}

export function Fin({ recompensa, primeros, repetida, xpGanado, titulo, onOtra, onVolverASaltar, onVerArbol }: FinProps) {
  const { t } = useTextos();
  const hubo = recompensa.ganadas > 0;

  return (
    <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
      {hubo ? (
        <>
          <Globo hacia="abajo">{titulo}</Globo>
          <RecompensaLeccion recompensa={recompensa} onVerArbol={onVerArbol} />
        </>
      ) : (
        <View style={styles.sinFlores}>
          <PikoMascota estado={repetida ? 'alegre' : 'animando'} tam={170} />
          <Globo hacia="abajo">{titulo}</Globo>
          <View style={styles.flores} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.florApagada}>
                <Sacuanjoche tam={34} />
              </View>
            ))}
          </View>
          <Text style={styles.explica}>
            {repetida
              ? t('rayuela.repetida_explica')
              : t('rayuela.sin_flores_explica', { n: MINIMO_FLORES, total: SALTOS })}
          </Text>
        </View>
      )}

      <View style={styles.marcador}>
        <Dato valor={`${primeros}/${SALTOS}`} etiqueta={t('rayuela.al_primer_salto')} />
        <Dato valor={`+${xpGanado}`} etiqueta="XP" />
        <Dato valor={`+${recompensa.ganadas}`} etiqueta={t('rayuela.sacuanjoches')} />
      </View>

      <View style={styles.acciones}>
        {!hubo && !repetida ? (
          <>
            <Boton ancho onPress={onVolverASaltar}>
              {t('rayuela.volver_a_saltar')}
            </Boton>
            <Boton ancho tono="papel" onPress={onOtra}>
              {t('rayuela.otra_rayuela')}
            </Boton>
          </>
        ) : (
          <Boton ancho onPress={onOtra}>
            {t('rayuela.otra_rayuela')}
          </Boton>
        )}
      </View>
    </ScrollView>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoValor}>{valor}</Text>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { flexGrow: 1, gap: espacio.xl, paddingBottom: espacio.xl },
  sinFlores: { alignItems: 'center', gap: espacio.lg },
  flores: { flexDirection: 'row', gap: espacio.sm },
  florApagada: { opacity: 0.25 },
  explica: { ...texto.cuerpo, color: color.tinta, textAlign: 'center' },
  marcador: { flexDirection: 'row', gap: espacio.sm },
  dato: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: color.blanco,
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: color.borde,
    paddingVertical: espacio.md,
  },
  datoValor: { ...texto.titulo, color: color.verde },
  datoEtiqueta: { ...texto.chico, color: color.tinta, textAlign: 'center' },
  acciones: { gap: espacio.md, marginTop: 'auto' },
});
