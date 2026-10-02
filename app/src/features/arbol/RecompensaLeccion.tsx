/**
 * La recompensa al terminar una lección.
 *
 * Cuenta la historia completa en una sola tarjeta, en el orden en que pasa:
 * llegan las sacuanjoches, el madroño crece y Piko sube. Si no alcanzó para
 * subir de nivel, igual se ve cuánto falta: nunca se termina una lección con
 * las manos vacías.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { progresoNivel, type Recompensa } from '../../core/progress/arbol';
import { ArbolMadrono } from '../../ui/arbol/ArbolMadrono';
import { Sacuanjoche } from '../../ui/arbol/Sacuanjoche';
import { BarraProgreso } from '../../ui/components/BarraProgreso';
import { color, espacio, fuente, radio, texto } from '../../ui/tokens';

export interface RecompensaLeccionProps {
  recompensa: Recompensa;
  onVerArbol?: () => void;
}

export function RecompensaLeccion({ recompensa, onVerArbol }: RecompensaLeccionProps) {
  const { antes, despues, ganadas, subioNivel, crecioArbol, nivelDespues, etapaDespues } = recompensa;
  const [cuenta, setCuenta] = useState(antes);
  const [llego, setLlego] = useState(!subioNivel);
  const aparece = useRef(new Animated.Value(0)).current;
  const sello = useRef(new Animated.Value(subioNivel ? 0 : 1)).current;

  // Las flores entran de a una: con 3 a 5 por lección, se cuentan con los ojos.
  useEffect(() => {
    setCuenta(antes);
    if (despues <= antes) return;
    const reloj = setInterval(() => {
      setCuenta((c) => {
        if (c + 1 >= despues) clearInterval(reloj);
        return Math.min(despues, c + 1);
      });
    }, 180);
    return () => clearInterval(reloj);
  }, [antes, despues]);

  useEffect(() => {
    Animated.spring(aparece, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [aparece]);

  useEffect(() => {
    if (!llego || !subioNivel) return;
    Animated.timing(sello, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: true,
    }).start();
  }, [llego, subioNivel, sello]);

  const p = progresoNivel(despues);

  return (
    <View style={styles.tarjeta}>
      <View style={styles.cielo}>
        <ArbolMadrono sacuanjoches={despues} desde={antes} ancho={200} onLlego={() => setLlego(true)} />
      </View>

      {/* Fuera del cielo, para no tapar a Piko cuando llega a la copa. Ocupa
          su lugar desde el principio y sólo aparece: nada salta de lugar. */}
      {subioNivel && (
        <Animated.View style={[styles.sello, { opacity: sello, transform: [{ scale: sello }] }]}>
          <Text style={styles.selloTexto}>¡Subiste al nivel {nivelDespues}!</Text>
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.ganadas,
          {
            opacity: aparece,
            transform: [{ scale: aparece.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        <Sacuanjoche tam={36} />
        <Text style={styles.mas}>+{ganadas}</Text>
        <Text style={styles.masEtiqueta}>{ganadas === 1 ? 'sacuanjoche' : 'sacuanjoches'}</Text>
      </Animated.View>

      <Text style={styles.total}>Ahora tenés {cuenta} en total</Text>

      {crecioArbol && llego && <Text style={styles.etapa}>Tu madroño ahora es: {etapaDespues.nombre}</Text>}

      <View style={styles.avance}>
        <View style={styles.avanceFila}>
          <Text style={styles.nivel}>Nivel {p.nivel}</Text>
          <Text style={styles.falta}>
            {p.hasta === null ? '¡Llegaste a la cima!' : `Faltan ${p.faltan} para el nivel ${p.nivel + 1}`}
          </Text>
        </View>
        <BarraProgreso valor={p.fraccion} alto={14} />
      </View>

      {onVerArbol && (
        <Pressable onPress={onVerArbol} hitSlop={8} accessibilityRole="button">
          <Text style={styles.verArbol}>Ver mi árbol</Text>
        </Pressable>
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
  cielo: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: color.nube,
    borderRadius: radio.md,
    paddingTop: espacio.sm,
    overflow: 'hidden',
  },
  sello: {
    backgroundColor: color.verdePasto,
    borderRadius: radio.redondo,
    paddingVertical: espacio.xs,
    paddingHorizontal: espacio.lg,
  },
  selloTexto: { fontFamily: fuente.tituloFuerte, fontSize: 16, color: color.verdeHondo },
  ganadas: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginTop: espacio.xs },
  mas: { ...texto.display, color: color.verde },
  masEtiqueta: { ...texto.subtitulo, color: color.verde },
  total: { ...texto.cuerpo, color: color.tintaSuave },
  etapa: { ...texto.cuerpoFuerte, color: color.verdeBosque, textAlign: 'center' },
  avance: { alignSelf: 'stretch', gap: espacio.xs, marginTop: espacio.xs },
  avanceFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  nivel: { ...texto.subtitulo, color: color.verde },
  falta: { ...texto.chico, color: color.tintaSuave },
  verArbol: {
    ...texto.cuerpoFuerte,
    color: color.verde,
    textDecorationLine: 'underline',
    paddingVertical: espacio.xs,
  },
});
