/**
 * El madroño del estudiante, con Piko encima.
 *
 * La etapa del árbol sale de las sacuanjoches acumuladas y la rama de Piko,
 * del nivel. Con `desde` se anima el cambio: el árbol nuevo crece encima del
 * viejo y Piko trepa de una rama a la otra con un par de saltitos.
 *
 * Todo lo que se mueve va por el hilo nativo (sólo `transform` y `opacity`),
 * y el dibujo es un SVG plano: aguanta en un Android de gama baja.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg from 'react-native-svg';
import { etapaDe, nivelDe } from '../../core/progress/arbol';
import { PikoMascota } from '../piko/PikoMascota';
import type { EstadoPiko } from '../piko/sprites';
import { DibujoArbol, LIENZO, Paisaje, VIEWBOX, perchaDe } from './dibujo';

/** Alto de Piko, en unidades del lienzo. */
const ALTO_PIKO = 58;
const RELACION_PIKO = 178 / 292;

export interface ArbolMadronoProps {
  /** Sacuanjoches acumuladas: deciden la etapa del árbol y el nivel. */
  sacuanjoches: number;
  /** Si viene, se anima desde este total hasta `sacuanjoches`. */
  desde?: number;
  /** Ancho en puntos. El alto sale de la proporción del lienzo. */
  ancho?: number;
  /** Sin Piko, p. ej. en la lista de etapas. */
  sinPiko?: boolean;
  /** El volcán, el sol y las nubes de atrás. */
  conPaisaje?: boolean;
  /** Apagado en miniaturas: no vale la pena gastar cuadros ahí. */
  animado?: boolean;
  /** Avisa cuando Piko terminó de trepar. */
  onLlego?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ArbolMadrono({
  sacuanjoches,
  desde,
  ancho = 220,
  sinPiko = false,
  conPaisaje = true,
  animado = true,
  onLlego,
  style,
}: ArbolMadronoProps) {
  const escala = ancho / LIENZO.ancho;
  const alto = LIENZO.alto * escala;
  const altoPiko = ALTO_PIKO * escala;
  const anchoPiko = altoPiko * RELACION_PIKO;

  const inicio = desde ?? sacuanjoches;
  const etapaVieja = etapaDe(inicio);
  const etapaNueva = etapaDe(sacuanjoches);
  const nivelViejo = nivelDe(inicio);
  const nivelNuevo = nivelDe(sacuanjoches);
  const animar = animado && (etapaVieja.id !== etapaNueva.id || nivelViejo !== nivelNuevo);

  /** Esquina superior izquierda de Piko para que pise la percha del nivel. */
  const posicion = useMemo(
    () => (nivel: number) => {
      const p = perchaDe(nivel);
      return {
        x: p.x * escala - anchoPiko / 2,
        y: (p.y - LIENZO.arriba) * escala - altoPiko,
      };
    },
    [escala, anchoPiko, altoPiko],
  );

  const crece = useRef(new Animated.Value(animar ? 0 : 1)).current;
  const trepa = useRef(new Animated.Value(animar ? 0 : 1)).current;
  const brinco = useRef(new Animated.Value(0)).current;
  const [llego, setLlego] = useState(!animar);

  useEffect(() => {
    if (!animar) return;
    crece.setValue(0);
    trepa.setValue(0);
    brinco.setValue(0);
    setLlego(false);

    const saltito = Animated.sequence([
      Animated.timing(brinco, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(brinco, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);

    const secuencia = Animated.sequence([
      Animated.delay(350),
      // Primero crece el árbol, después sube Piko: así se entiende que las
      // sacuanjoches hicieron crecer el árbol y eso le abrió camino.
      Animated.timing(crece, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(trepa, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([saltito, saltito, saltito]),
      ]),
    ]);
    secuencia.start(({ finished }) => {
      if (!finished) return;
      setLlego(true);
      onLlego?.();
    });
    return () => secuencia.stop();
    // Sólo se anima cuando cambia el tramo; `onLlego` puede ser una función
    // nueva en cada render y no debe reiniciar la subida.
  }, [animar, inicio, sacuanjoches]);

  const a = posicion(nivelViejo);
  const b = posicion(nivelNuevo);
  const cambiaEtapa = animar && etapaVieja.id !== etapaNueva.id;

  // Mientras trepa va tranquilo; al llegar festeja (y ahí PikoMascota brinca).
  const estadoPiko: EstadoPiko = llego && animar ? 'celebrando' : 'idle';

  return (
    <View style={[{ width: ancho, height: alto }, style]} accessibilityRole="image" accessibilityLabel={`Madroño en etapa ${etapaNueva.nombre}, Piko en el nivel ${nivelNuevo}`}>
      {conPaisaje && (
        <Svg width={ancho} height={alto} viewBox={VIEWBOX} style={StyleSheet.absoluteFill}>
          <Paisaje />
        </Svg>
      )}

      {cambiaEtapa && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: crece.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
        >
          <Svg width={ancho} height={alto} viewBox={VIEWBOX}>
            <DibujoArbol etapa={etapaVieja.id} />
          </Svg>
        </Animated.View>
      )}

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          cambiaEtapa && {
            opacity: crece,
            // Crece desde el suelo: se escala con el pie del árbol como ancla.
            transform: [
              { translateY: crece.interpolate({ inputRange: [0, 1], outputRange: [alto * 0.08, 0] }) },
              { scale: crece.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1] }) },
            ],
          },
        ]}
      >
        <Svg width={ancho} height={alto} viewBox={VIEWBOX}>
          <DibujoArbol etapa={etapaNueva.id} />
        </Svg>
      </Animated.View>

      {!sinPiko && (
        <Animated.View
          style={[
            styles.piko,
            {
              width: anchoPiko,
              height: altoPiko,
              transform: [
                { translateX: trepa.interpolate({ inputRange: [0, 1], outputRange: [a.x, b.x] }) },
                { translateY: trepa.interpolate({ inputRange: [0, 1], outputRange: [a.y, b.y] }) },
                { translateY: brinco.interpolate({ inputRange: [0, 1], outputRange: [0, -altoPiko * 0.18] }) },
              ],
            },
          ]}
        >
          <PikoMascota estado={estadoPiko} tam={altoPiko} animado={animado} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  piko: { position: 'absolute', left: 0, top: 0 },
});
