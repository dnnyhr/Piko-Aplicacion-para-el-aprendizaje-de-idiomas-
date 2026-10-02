/**
 * Cómo salió el nivel: las estrellas, de a una, y si se abrió el siguiente.
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { color, espacio, fuente, radio, texto } from '../../ui/tokens';
import { Estrella } from './CaminoNiveles';

export interface ResultadoNivelProps {
  numero: number;
  titulo: string;
  estrellas: number;
  /** Mejores estrellas que tenía antes de esta vez (0 si era la primera). */
  mejorAntes: number;
  aciertos: number;
  total: number;
  /** Número del nivel que se acaba de abrir, si se abrió alguno. */
  desbloqueado: number | null;
}

export function ResultadoNivel({
  numero,
  titulo,
  estrellas,
  mejorAntes,
  aciertos,
  total,
  desbloqueado,
}: ResultadoNivelProps) {
  const pops = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const sello = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(250),
      Animated.stagger(
        220,
        pops.map((v) =>
          Animated.timing(v, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(2.4)), useNativeDriver: true }),
        ),
      ),
      Animated.timing(sello, { toValue: 1, duration: 300, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [pops, sello]);

  const mejoro = mejorAntes > 0 && estrellas > mejorAntes;

  return (
    <View style={styles.tarjeta} accessibilityLabel={`Nivel ${numero}: ${estrellas} de 3 estrellas`}>
      <Text style={styles.nivel}>
        Nivel {numero} · {titulo}
      </Text>
      <View style={styles.estrellas}>
        {pops.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              i === 1 && styles.estrellaAlta,
              { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }], opacity: v },
            ]}
          >
            <Estrella llena={i < estrellas} tam={i === 1 ? 56 : 46} />
          </Animated.View>
        ))}
      </View>
      <Text style={styles.cuenta}>
        {aciertos} de {total} correctas
        {mejoro ? ' · ¡nueva mejor marca!' : ''}
      </Text>
      {desbloqueado !== null && (
        <Animated.View style={[styles.sello, { opacity: sello, transform: [{ scale: sello }] }]}>
          <Text style={styles.selloTexto}>¡Abriste el nivel {desbloqueado}!</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
    gap: espacio.sm,
  },
  nivel: { ...texto.etiqueta, color: color.tintaSuave },
  estrellas: { flexDirection: 'row', alignItems: 'flex-end', gap: espacio.sm },
  estrellaAlta: { marginBottom: espacio.md },
  cuenta: { ...texto.cuerpoFuerte, color: color.verde },
  sello: {
    backgroundColor: color.verdePasto,
    borderRadius: radio.redondo,
    paddingVertical: espacio.xs,
    paddingHorizontal: espacio.lg,
  },
  selloTexto: { fontFamily: fuente.tituloFuerte, fontSize: 16, color: color.verdeHondo },
});
