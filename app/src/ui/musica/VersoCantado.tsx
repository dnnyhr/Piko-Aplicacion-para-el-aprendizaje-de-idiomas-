/**
 * Un verso que se canta palabra por palabra, con una sacuanjoche encima.
 *
 * Mientras suena, la flor se para sobre la palabra que se está cantando (según
 * el tiempo de la grabación) y salta en arco a la siguiente, dejando un rastro
 * de sacuanjoches chiquitas que se desvanecen; además rebota con el pulso de
 * la canción, como una pelotita de karaoke. La palabra que suena se resalta y
 * las que ya se cantaron quedan en verde.
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
/** Las florcitas del rastro. */
const MINI = 18;
/** Cuántas deja en cada salto y cuánto duran a la vista. */
const POR_SALTO = 4;
const DURA_RASTRO = 1600;

interface Punto {
  x: number;
  y: number;
  /** Cuándo pasa la flor por ahí, en milisegundos desde que salta. */
  demora: number;
}

interface Salto {
  id: number;
  puntos: Punto[];
}

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
  const arco = useRef(new Animated.Value(0)).current;
  const arcoAlto = useRef(new Animated.Value(0)).current;
  const rebote = useRef(new Animated.Value(0)).current;
  const primera = useRef(true);
  const desde = useRef({ x: 0, y: 0 });
  const [saltos, setSaltos] = useState<Salto[]>([]);
  const cuenta = useRef(0);

  // La flor va a la palabra que se canta. La primera vez aparece ahí; después
  // salta en arco y deja florcitas por donde pasa.
  useEffect(() => {
    const l = lugares.current[actual];
    if (actual < 0 || !l) return;
    const destino = { x: l.x + l.w / 2 - FLOR / 2, y: l.y - FLOR + 2 };
    if (primera.current) {
      primera.current = false;
      pos.setValue(destino);
      desde.current = destino;
      return;
    }
    const a = desde.current;
    desde.current = destino;
    // Al bajar de renglón no hay arco ni rastro: cruzaría por encima de la
    // letra. La flor aparece directo en la primera palabra del renglón nuevo.
    if (Math.abs(destino.y - a.y) > 4) {
      pos.stopAnimation();
      arco.stopAnimation();
      arco.setValue(0);
      pos.setValue(destino);
      return;
    }
    const dura = Math.max(160, Math.min(320, periodo * 500));
    const alto = Math.min(22, 8 + Math.hypot(destino.x - a.x, destino.y - a.y) * 0.15);

    // El rastro: puntos a lo largo del mismo arco, sin la flor grande encima.
    const puntos: Punto[] = [];
    for (let i = 1; i <= POR_SALTO; i++) {
      const u = i / (POR_SALTO + 1);
      puntos.push({
        x: a.x + (destino.x - a.x) * u + (FLOR - MINI) / 2,
        y: a.y + (destino.y - a.y) * u - alto * 4 * u * (1 - u) + (FLOR - MINI) / 2,
        demora: dura * u,
      });
    }
    const id = ++cuenta.current;
    setSaltos((s) => [...s.slice(-3), { id, puntos }]);

    arco.setValue(0);
    arcoAlto.setValue(alto);
    Animated.parallel([
      Animated.timing(pos, { toValue: destino, duration: dura, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(arco, { toValue: 1, duration: dura, easing: Easing.linear, useNativeDriver: true }),
    ]).start();
  }, [actual, medido, periodo, pos, arco, arcoAlto]);

  // Al dejar de sonar el verso se borra el rastro.
  useEffect(() => {
    if (!activo) {
      setSaltos([]);
      primera.current = true;
    }
  }, [activo]);

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
      {saltos.map((salto) =>
        salto.puntos.map((p, i) => <Florcita key={`${salto.id}-${i}`} punto={p} />),
      )}
      {actual >= 0 && lugares.current[actual] && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flor,
            {
              transform: [
                { translateX: pos.x },
                { translateY: pos.y },
                {
                  translateY: Animated.multiply(
                    arco.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -0.75, -1, -0.75, 0] }),
                    arcoAlto,
                  ),
                },
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

/** Una florcita del rastro: aparece cuando pasa la flor y se desvanece. */
function Florcita({ punto }: { punto: Punto }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(punto.demora),
      Animated.timing(v, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(v, { toValue: 2, duration: DURA_RASTRO, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [punto, v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.mini,
        {
          opacity: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
          transform: [
            { translateX: punto.x },
            { translateY: punto.y },
            { translateY: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 0, 6] }) },
            { scale: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0.5, 1, 0.75] }) },
            { rotate: v.interpolate({ inputRange: [0, 2], outputRange: ['0deg', '90deg'] }) },
          ],
        },
      ]}
    >
      <Sacuanjoche tam={MINI} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Lugar arriba de cada renglón para que la flor no tape el renglón de arriba.
  fila: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 6, rowGap: FLOR - 2, paddingTop: FLOR - 2 },
  flor: { position: 'absolute', left: 0, top: 0, width: FLOR, height: FLOR },
  mini: { position: 'absolute', left: 0, top: 0, width: MINI, height: MINI },
  // Un aro verde suave atrás de la flor, para que se vea sobre el fondo claro.
  halo: { width: FLOR, height: FLOR, borderRadius: FLOR / 2, backgroundColor: 'rgba(123,162,44,0.28)' },
  resaltada: { backgroundColor: '#FFE3A3', borderRadius: 6, marginHorizontal: -3, paddingHorizontal: 3 },
  actual: { color: color.copete },
  cantada: { color: color.verde },
});
