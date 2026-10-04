/**
 * Un verso que se canta palabra por palabra, con una sacuanjoche encima.
 *
 * Mientras suena, la flor se para sobre la palabra que se está cantando (según
 * el tiempo de la grabación) y salta a la siguiente; además rebota con el
 * pulso de la canción, como una pelotita de karaoke. La palabra que suena se
 * resalta y las que ya se cantaron quedan en verde.
 *
 * Liviano: las palabras se miden una vez (al dibujarse) y la flor se mueve
 * con `transform` y el driver nativo; sólo se vuelve a dibujar el verso
 * cuando cambia la palabra.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type LayoutChangeEvent, type TextStyle } from 'react-native';
import { Sacuanjoche } from '../arbol/Sacuanjoche';
import { palabraEn, palabrasDelVerso, type Verso } from '../../core/canciones/cancion';
import { color } from '../tokens';

const FLOR = 30;

export interface VersoCantadoProps {
  verso: Verso;
  /** Segundo de la grabación. */
  tiempo: number;
  /** Si este verso es el que suena ahora. */
  activo: boolean;
  /** Segundos entre pulsos de la canción. */
  periodo: number;
  estilo: TextStyle;
}

export function VersoCantado({ verso, tiempo, activo, periodo, estilo }: VersoCantadoProps) {
  const palabras = palabrasDelVerso(verso.texto);
  const actual = activo ? palabraEn(verso, tiempo) : -1;
  const lugares = useRef<Record<number, { x: number; y: number; w: number }>>({});
  const [medido, setMedido] = useState(0);
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const rebote = useRef(new Animated.Value(0)).current;
  const primera = useRef(true);

  // La flor va a la palabra que se canta. La primera vez aparece ahí, después salta.
  useEffect(() => {
    const l = lugares.current[actual];
    if (actual < 0 || !l) return;
    const destino = { x: l.x + l.w / 2 - FLOR / 2, y: l.y - FLOR + 2 };
    if (primera.current) {
      primera.current = false;
      pos.setValue(destino);
      return;
    }
    Animated.timing(pos, {
      toValue: destino,
      duration: Math.min(200, periodo * 400),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [actual, medido, periodo, pos]);

  // El rebote, a tiempo con el pulso de la canción.
  useEffect(() => {
    if (!activo) return;
    const paso = Math.max(0.3, periodo < 0.42 ? periodo * 2 : periodo) * 1000;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rebote, { toValue: 1, duration: paso * 0.35, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(rebote, { toValue: 0, duration: paso * 0.65, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      rebote.setValue(0);
    };
  }, [activo, periodo, rebote]);

  // Un verso que no suena: el texto de siempre, sin medir nada.
  if (!activo) return <Text style={estilo}>{verso.texto}</Text>;

  return (
    <View style={styles.fila} accessible accessibilityLabel={verso.texto}>
      {palabras.map((w, k) => (
        <View
          key={k}
          style={k === actual ? styles.resaltada : null}
          onLayout={(e: LayoutChangeEvent) => {
            const { x, y, width } = e.nativeEvent.layout;
            lugares.current[k] = { x, y, w: width };
            if (k === palabras.length - 1) setMedido((n) => n + 1);
          }}
        >
          <Text style={[estilo, k < actual ? styles.cantada : k === actual ? styles.actual : null]}>{w}</Text>
        </View>
      ))}
      {actual >= 0 && lugares.current[actual] && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flor,
            {
              transform: [
                { translateX: pos.x },
                { translateY: pos.y },
                { translateY: rebote.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
                { scale: rebote.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
              ],
            },
          ]}
        >
          <View style={styles.halo}>
            <Sacuanjoche tam={FLOR} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Lugar arriba de cada renglón para que la flor no tape el renglón de arriba.
  fila: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: FLOR - 2, paddingTop: FLOR - 2 },
  flor: { position: 'absolute', left: 0, top: 0, width: FLOR, height: FLOR },
  // Un aro verde suave atrás de la flor, para que se vea sobre el fondo claro.
  halo: { width: FLOR, height: FLOR, borderRadius: FLOR / 2, backgroundColor: 'rgba(123,162,44,0.28)' },
  resaltada: { backgroundColor: '#FFE3A3', borderRadius: 6, marginHorizontal: -3, paddingHorizontal: 3 },
  actual: { color: color.copete },
  cantada: { color: color.verde },
});
