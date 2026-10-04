/**
 * El trompo: de madera, con la cabeza oscura, franjas pintadas y la punta de
 * metal, como los de los mercados de Nicaragua.
 *
 * Girar sin físicas: lo que se mueve es la franja pintada (corre de lado a
 * lado dentro de su faja) y el bamboleo alrededor de la punta. Las dos cosas
 * dependen de la `fuerza`: con fuerza gira rápido y derecho; sin fuerza, lento
 * y tambaleándose. Todo con `transform` y el driver nativo, en loops que sólo
 * se rearman cuando la fuerza cambia de escalón.
 */

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import { color } from '../tokens';

const MADERA = '#C98A4B';
const MADERA_HONDA = '#8A5A2B';
const METAL = '#9AA5A0';

/** Colores de la franja que gira. */
const FRANJAS = ['#C8102E', color.pico, color.verdeHoja, color.cielo, '#FFFDF4'];
const ANCHO_FRANJA = 11;
const PERIODO = FRANJAS.length * ANCHO_FRANJA;

/** El trompo quieto, para íconos y para cuando está en la mano de Piko. */
export function DibujoTrompo({ tam = 64 }: { tam?: number }) {
  return (
    <Svg width={(tam * 120) / 150} height={tam} viewBox="0 0 120 150">
      <Cuerpo />
      <Path d="M14 54 Q60 66 106 54" stroke={FRANJAS[0]} strokeWidth={6} fill="none" />
      <Path d="M18 72 Q60 84 102 72" stroke={FRANJAS[2]} strokeWidth={5} fill="none" />
    </Svg>
  );
}

/** El ícono del juego en la lista de minijuegos: el trompo sobre la tierra del patio. */
export function IconoTrompo({ tam = 64 }: { tam?: number }) {
  return (
    <View style={{ width: tam, height: tam, borderRadius: tam * 0.22, backgroundColor: '#E3C79B', alignItems: 'center', justifyContent: 'center' }}>
      <DibujoTrompo tam={tam * 0.8} />
    </View>
  );
}

function Cuerpo() {
  return (
    <>
      <Rect x={52} y={2} width={16} height={20} rx={5} fill={MADERA_HONDA} />
      <Path
        d="M30 24 C 14 32, 9 50, 13 63 C 21 88, 46 110, 60 126 C 74 110, 99 88, 107 63 C 111 50, 106 32, 90 24 Z"
        fill={MADERA}
        stroke={MADERA_HONDA}
        strokeWidth={2.5}
      />
      <Ellipse cx={60} cy={24} rx={30} ry={7} fill={color.pico} stroke={MADERA_HONDA} strokeWidth={2.5} />
      <Path d="M53 122 L60 147 L67 122 Z" fill={METAL} stroke="#6E7873" strokeWidth={1.5} />
      <Path d="M26 92 Q60 106 94 92" stroke={MADERA_HONDA} strokeWidth={2} fill="none" opacity={0.5} />
    </>
  );
}

export type EstadoTrompo = 'listo' | 'lanzando' | 'girando' | 'cayendo';

export interface TrompoProps {
  /** De 0 a 100. */
  fuerza: number;
  estado: EstadoTrompo;
  /** Sube en cada fallo: el trompo se sacude. */
  golpes: number;
  /** Sube en cada acierto: el trompo da un tirón de velocidad. */
  impulsos: number;
  /** Alto en puntos. */
  tam?: number;
}

export function Trompo({ fuerza, estado, golpes, impulsos, tam = 150 }: TrompoProps) {
  const escala = tam / 150;
  const corre = useRef(new Animated.Value(0)).current;
  const bamboleo = useRef(new Animated.Value(0)).current;
  const sacudon = useRef(new Animated.Value(0)).current;
  const tiron = useRef(new Animated.Value(0)).current;
  const vuelo = useRef(new Animated.Value(estado === 'listo' ? 0 : 1)).current;
  const caida = useRef(new Animated.Value(0)).current;
  const [quieto, setQuieto] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setQuieto)
      .catch(() => undefined);
  }, []);

  const gira = estado === 'girando' || estado === 'lanzando';
  // Escalones de fuerza: rearmar los loops en cada punto costaría más que lo que se nota.
  const escalon = Math.max(0, Math.min(10, Math.round(fuerza / 10)));

  // La franja que corre: más fuerza, más rápido.
  useEffect(() => {
    if (!gira || quieto) return;
    corre.setValue(0);
    const loop = Animated.loop(
      Animated.timing(corre, {
        toValue: 1,
        duration: 1150 - escalon * 85,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [gira, escalon, quieto, corre]);

  // El bamboleo alrededor de la punta: menos fuerza, más ancho y más lento.
  useEffect(() => {
    if (!gira || quieto) {
      bamboleo.setValue(0);
      return;
    }
    const amplitud = 2 + (10 - escalon) * 1.3;
    const medio = 380 + (10 - escalon) * 40;
    bamboleo.setValue(-amplitud);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bamboleo, { toValue: amplitud, duration: medio, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bamboleo, { toValue: -amplitud, duration: medio, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [gira, escalon, quieto, bamboleo]);

  // Un fallo: sacudón que se va apagando.
  useEffect(() => {
    if (golpes === 0 || quieto) return;
    sacudon.setValue(0);
    Animated.sequence([
      Animated.timing(sacudon, { toValue: 18, duration: 90, useNativeDriver: true }),
      Animated.timing(sacudon, { toValue: -14, duration: 120, useNativeDriver: true }),
      Animated.timing(sacudon, { toValue: 8, duration: 110, useNativeDriver: true }),
      Animated.timing(sacudon, { toValue: 0, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [golpes, quieto, sacudon]);

  // Un acierto: tirón hacia arriba y un poco más grande.
  useEffect(() => {
    if (impulsos === 0 || quieto) return;
    tiron.setValue(0);
    Animated.sequence([
      Animated.timing(tiron, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(tiron, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: true }),
    ]).start();
  }, [impulsos, quieto, tiron]);

  // Lanzamiento: de la mano de Piko al suelo, en arco.
  useEffect(() => {
    if (estado === 'listo') {
      vuelo.setValue(0);
      caida.setValue(0);
    } else if (estado === 'lanzando') {
      vuelo.setValue(0);
      Animated.timing(vuelo, { toValue: 1, duration: quieto ? 0 : 560, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    } else if (estado === 'cayendo') {
      Animated.timing(caida, { toValue: 1, duration: quieto ? 0 : 700, easing: Easing.bounce, useNativeDriver: true }).start();
    }
  }, [estado, quieto, vuelo, caida]);

  const rotacion = Animated.add(Animated.add(bamboleo, sacudon), Animated.multiply(caida, 78)).interpolate({
    inputRange: [-180, 180],
    outputRange: ['-180deg', '180deg'],
  });
  const enMano = vuelo.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] });
  // En la mano de Piko (a la izquierda, a la altura del ala), más chico; después, al suelo.
  const vueloX = vuelo.interpolate({ inputRange: [0, 1], outputRange: [-tam * 0.42, 0] });
  const vueloY = vuelo.interpolate({ inputRange: [0, 0.45, 1], outputRange: [-tam * 0.32, -tam * 0.5, 0] });
  const enManoEscala = vuelo.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] });
  const caidaY = caida.interpolate({ inputRange: [0, 1], outputRange: [0, tam * 0.18] });
  const subeTiron = tiron.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const crece = tiron.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const franjaX = corre.interpolate({ inputRange: [0, 1], outputRange: [0, -PERIODO * escala] });

  const ancho = (tam * 120) / 150;
  return (
    <View style={{ width: ancho, height: tam + 12 * escala }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.sombra, { width: ancho * 0.55, height: 12 * escala, left: ancho * 0.225, top: tam - 4 * escala }]} />
      <Animated.View
        style={{
          width: ancho,
          height: tam,
          transformOrigin: '50% 97%',
          transform: [
            { translateX: vueloX },
            { translateY: Animated.add(Animated.add(vueloY, caidaY), subeTiron) },
            { rotate: enMano },
            { rotate: rotacion },
            { scale: crece },
            { scale: enManoEscala },
          ],
        }}
      >
        <Svg width={ancho} height={tam} viewBox="0 0 120 150" style={StyleSheet.absoluteFill}>
          <Cuerpo />
        </Svg>
        {/* La faja pintada: dentro, las franjas corren y parece que gira. */}
        <View
          style={[
            styles.faja,
            { left: 15 * escala, top: 44 * escala, width: 90 * escala, height: 30 * escala, borderRadius: 15 * escala },
          ]}
        >
          <Animated.View style={[styles.franjas, { transform: [{ translateX: franjaX }] }]}>
            {[0, 1, 2, 3].flatMap((vuelta) =>
              FRANJAS.map((c, i) => (
                <View key={`${vuelta}-${i}`} style={{ width: ANCHO_FRANJA * escala, backgroundColor: c }} />
              )),
            )}
          </Animated.View>
          <View style={[styles.borde, { left: 0, width: 14 * escala }]} />
          <View style={[styles.borde, { right: 0, width: 14 * escala }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sombra: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(22,36,29,0.18)' },
  faja: { position: 'absolute', overflow: 'hidden', borderWidth: 2, borderColor: MADERA_HONDA },
  franjas: { flexDirection: 'row', height: '100%' },
  borde: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(22,36,29,0.18)' },
});
