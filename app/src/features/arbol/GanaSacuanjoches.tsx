/**
 * Las sacuanjoches que dio una lección y lo que hicieron con el madroño.
 *
 * Va en todas las pantallas de fin de ronda. Llegan las flores (se cuentan de
 * a una), y abajo se ve el madroño: si cambió de etapa, crece ahí mismo; si
 * no, la barra dice cuánto le falta.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { progresoEtapa, type Recompensa } from '../../core/progress/arbol';
import { MiniaturaArbol } from '../../ui/arbol/MiniaturaArbol';
import { Sacuanjoche } from '../../ui/arbol/Sacuanjoche';
import { BarraProgreso } from '../../ui/components/BarraProgreso';
import { color, espacio, radio, texto } from '../../ui/tokens';

export interface GanaSacuanjochesProps {
  recompensa: Recompensa;
  onVerArbol?: () => void;
}

export function GanaSacuanjoches({ recompensa, onVerArbol }: GanaSacuanjochesProps) {
  const { antes, despues, ganadas, crecioArbol, etapaAntes, etapaDespues } = recompensa;
  const [cuenta, setCuenta] = useState(antes);
  const aparece = useRef(new Animated.Value(0)).current;
  const crece = useRef(new Animated.Value(crecioArbol ? 0 : 1)).current;
  const [crecido, setCrecido] = useState(!crecioArbol);

  // Las flores entran de a una: con 3 a 5 por lección, se cuentan con los ojos.
  useEffect(() => {
    setCuenta(antes);
    if (despues <= antes) return;
    let n = antes;
    const reloj = setInterval(() => {
      n += 1;
      setCuenta(n);
      if (n >= despues) clearInterval(reloj);
    }, 180);
    return () => clearInterval(reloj);
  }, [antes, despues]);

  useEffect(() => {
    Animated.spring(aparece, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    if (!crecioArbol) return;
    // El árbol crece cuando ya llegaron las flores: primero se gana, después se ve qué hizo.
    setCrecido(false);
    crece.setValue(0);
    const anim = Animated.sequence([
      Animated.delay(180 * Math.max(1, despues - antes) + 200),
      Animated.timing(crece, { toValue: 1, duration: 420, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && setCrecido(true));
    return () => anim.stop();
  }, [aparece, crece, crecioArbol, antes, despues]);

  const etapa = progresoEtapa(despues);
  const mostrada = crecido ? etapaDespues : etapaAntes;

  return (
    <View style={styles.tarjeta}>
      <Animated.View
        style={[
          styles.ganadas,
          { opacity: aparece, transform: [{ scale: aparece.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
        ]}
        accessibilityLiveRegion="polite"
      >
        <Sacuanjoche tam={38} />
        <Text style={styles.mas}>+{ganadas}</Text>
        <Text style={styles.masEtiqueta}>{ganadas === 1 ? 'sacuanjoche' : 'sacuanjoches'}</Text>
      </Animated.View>
      <Text style={styles.total}>Ahora tenés {cuenta} en total</Text>

      <View style={styles.arbol}>
        <Animated.View
          style={[
            styles.miniatura,
            crecioArbol && { transform: [{ scale: crece.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }] },
          ]}
        >
          <MiniaturaArbol etapa={mostrada.id} tam={60} />
        </Animated.View>
        <View style={styles.arbolTexto}>
          <Text style={styles.arbolTitulo}>
            {crecioArbol && crecido ? '¡Tu madroño creció!' : `Tu madroño: ${mostrada.nombre}`}
          </Text>
          <BarraProgreso valor={etapa.fraccion} alto={12} tono={color.verdeHoja} />
          <Text style={styles.falta}>
            {etapa.siguiente ? `Faltan ${etapa.faltan} para: ${etapa.siguiente.nombre}` : 'Está todo florecido.'}
          </Text>
        </View>
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
    gap: espacio.xs,
  },
  ganadas: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  mas: { ...texto.display, color: color.verde },
  masEtiqueta: { ...texto.subtitulo, color: color.verde },
  total: { ...texto.cuerpo, color: color.tintaSuave },
  arbol: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    marginTop: espacio.sm,
    paddingTop: espacio.md,
    borderTopWidth: 2,
    borderTopColor: color.borde,
  },
  miniatura: { backgroundColor: color.nube, borderRadius: radio.md, padding: espacio.xs },
  arbolTexto: { flex: 1, gap: espacio.xs },
  arbolTitulo: { ...texto.cuerpoFuerte, color: color.verde },
  falta: { ...texto.chico, color: color.tintaSuave },
  verArbol: {
    ...texto.cuerpoFuerte,
    color: color.verde,
    textDecorationLine: 'underline',
    paddingTop: espacio.sm,
  },
});
