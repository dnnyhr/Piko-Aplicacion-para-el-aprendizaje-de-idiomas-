/**
 * Traducción por selección múltiple, y comprensión auditiva.
 *
 * Los dos ejercicios comparten la misma mecánica — elegir una tarjeta — así
 * que comparten componente. Lo único que cambia es la cabecera: uno muestra
 * la frase en español, el otro un botón grande para volver a escuchar.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import Svg, { Path } from 'react-native-svg';
import { Opcion, type EstadoOpcion } from '../../ui/components/Opcion';
import { PikoMascota } from '../../ui/piko/PikoMascota';
import { color, espacio, radio, texto } from '../../ui/tokens';
import { mulberry32, shuffle } from '../../core/ids';
import { normalizar } from '../../core/content/verificar';
import type { ChoiceItem, ListenItem } from '../../core/content/schema';

export interface EjercicioOpcionesProps {
  item: ChoiceItem | ListenItem;
  seleccion: string | null;
  onSeleccion: (valor: string) => void;
  /** Tras responder: se pinta la correcta y se bloquean los toques. */
  revelado: boolean;
  seed: number;
}

export function EjercicioOpciones({
  item,
  seleccion,
  onSeleccion,
  revelado,
  seed,
}: EjercicioOpcionesProps) {
  // Se barajan una sola vez por ítem: si se rebarajaran en cada render, las
  // tarjetas saltarían de lugar bajo el dedo del estudiante.
  const opciones = useMemo(
    () => shuffle(item.options, mulberry32(seed)),
    [item.id, seed], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const esEscucha = item.type === 'listen';

  const hablar = () => {
    if (item.type !== 'listen') return;
    Speech.stop();
    if (item.tts) {
      Speech.speak(item.tts, { language: item.ttsLang ?? 'en-US', rate: 0.85 });
    }
    // Con `audio` grabado, la reproducción la maneja `useAudioPlayer` — todavía
    // no hay grabaciones, así que por ahora sólo entra la rama de síntesis.
  };

  // En los de escucha se reproduce solo al aparecer: el niño no debería tener
  // que descubrir que hay algo que tocar.
  const yaSono = useRef<string | null>(null);
  useEffect(() => {
    if (!esEscucha || yaSono.current === item.id) return;
    yaSono.current = item.id;
    const t = setTimeout(hablar, 260);
    return () => clearTimeout(t);
  }, [item.id, esEscucha]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => void Speech.stop(), []);

  const estadoDe = (opcion: string): EstadoOpcion => {
    const elegida = seleccion !== null && normalizar(seleccion) === normalizar(opcion);
    if (!revelado) return elegida ? 'elegida' : 'normal';
    if (normalizar(opcion) === normalizar(item.answer)) return 'correcta';
    return elegida ? 'fallada' : 'normal';
  };

  return (
    <ScrollView
      contentContainerStyle={styles.contenido}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.cabecera}>
        <PikoMascota estado={revelado ? 'idle' : 'pensando'} tam={92} />
        <View style={styles.enunciado}>
          {esEscucha ? (
            <Pressable onPress={hablar} style={styles.bocina} accessibilityRole="button">
              <Svg viewBox="0 0 24 24" width={30} height={30}>
                <Path
                  d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a6.8 6.8 0 0 1 0 13.4v2.1a8.9 8.9 0 0 0 0-17.6z"
                  fill={color.blanco}
                />
              </Svg>
              <Text style={styles.bocinaTexto}>Tocá para escuchar</Text>
            </Pressable>
          ) : (
            <Text style={styles.frase}>{(item as ChoiceItem).prompt}</Text>
          )}
        </View>
      </View>

      <Text style={styles.instruccion}>
        {esEscucha ? '¿Qué escuchaste?' : 'Elegí la traducción correcta'}
      </Text>

      <View style={styles.opciones}>
        {opciones.map((opcion, i) => (
          <Opcion
            key={opcion}
            indice={i + 1}
            estado={estadoDe(opcion)}
            disabled={revelado}
            onPress={() => onSeleccion(opcion)}
          >
            {opcion}
          </Opcion>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { paddingBottom: espacio.xxxl, gap: espacio.xl },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  enunciado: { flex: 1 },
  frase: { ...texto.display, color: color.grafito, fontSize: 27, lineHeight: 32 },
  instruccion: { ...texto.chico, color: color.tintaSuave, textTransform: 'uppercase', letterSpacing: 1 },
  opciones: { gap: espacio.md },
  bocina: {
    backgroundColor: color.cielo,
    borderRadius: radio.lg,
    paddingVertical: espacio.lg,
    paddingHorizontal: espacio.lg,
    alignItems: 'center',
    gap: espacio.sm,
  },
  bocinaTexto: { ...texto.chico, color: color.blanco, fontFamily: 'Fredoka_600SemiBold' },
});
