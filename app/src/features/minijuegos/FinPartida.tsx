/**
 * Al terminar cualquier minijuego.
 *
 * El festejo depende de cómo se jugó: sólo hay flores y madroño que crece
 * cuando hubo flores. Si no alcanzó, Piko anima a volver a intentarlo; si el
 * juego ya dio flores hoy, lo dice: no se festeja algo que no pasó.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Boton } from '../../ui/components/Boton';
import { Globo } from '../../ui/components/Globo';
import { PikoMascota } from '../../ui/piko/PikoMascota';
import { Sacuanjoche } from '../../ui/arbol/Sacuanjoche';
import { RecompensaLeccion } from '../arbol/RecompensaLeccion';
import { useTextos } from '../../ui/textos/useTextos';
import type { Recompensa } from '../../core/progress/arbol';
import { color, espacio, radio, texto } from '../../ui/tokens';

export interface DatoPartida {
  valor: string;
  etiqueta: string;
}

export interface FinPartidaProps {
  recompensa: Recompensa;
  /** El juego ya había dado flores hoy: esta partida fue de práctica. */
  repetida: boolean;
  titulo: string;
  /** Qué faltó para que hubiera flores. */
  explicacionSinFlores: string;
  /** Los números de la partida, en tarjetitas. */
  datos: readonly DatoPartida[];
  /** «Volver a saltar», «Lanzar otra vez»… */
  textoReintentar: string;
  textoOtra: string;
  onReintentar: () => void;
  onOtra: () => void;
  onVerArbol: () => void;
}

export function FinPartida({
  recompensa,
  repetida,
  titulo,
  explicacionSinFlores,
  datos,
  textoReintentar,
  textoOtra,
  onReintentar,
  onOtra,
  onVerArbol,
}: FinPartidaProps) {
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
          <Text style={styles.explica}>{repetida ? t('minijuegos.repetida_explica') : explicacionSinFlores}</Text>
        </View>
      )}

      <View style={styles.marcador}>
        {datos.map((d) => (
          <View key={d.etiqueta} style={styles.dato}>
            <Text style={styles.datoValor}>{d.valor}</Text>
            <Text style={styles.datoEtiqueta}>{d.etiqueta}</Text>
          </View>
        ))}
      </View>

      <View style={styles.acciones}>
        {!hubo && !repetida ? (
          <>
            <Boton ancho onPress={onReintentar}>
              {textoReintentar}
            </Boton>
            <Boton ancho tono="papel" onPress={onOtra}>
              {textoOtra}
            </Boton>
          </>
        ) : (
          <Boton ancho onPress={onOtra}>
            {textoOtra}
          </Boton>
        )}
      </View>
    </ScrollView>
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
