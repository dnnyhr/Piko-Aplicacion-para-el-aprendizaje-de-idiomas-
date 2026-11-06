/**
 * La barra que aparece abajo después de responder.
 *
 * Cuando el estudiante acierta, Piko festeja. Cuando no, Piko **no** regaña:
 * asoma animando, la barra se pinta de ámbar y no de rojo, y el texto muestra
 * la respuesta correcta sin decir en ningún momento que estuvo mal.
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { Boton } from '../../ui/components/Boton';
import { Marca } from '../../ui/components/Marca';
import { useNarrador } from '../instrucciones/useNarrador';
import { PikoMascota } from '../../ui/piko/PikoMascota';
import { espacio, radio, texto, tiempo } from '../../ui/tokens';
import { crearEstilos, useColor } from '../../ui/tema';

export interface BarraFeedbackProps {
  visible: boolean;
  acerto: boolean;
  /** Frase de Piko. */
  titulo: string;
  /** La respuesta correcta. Se muestra siempre que el estudiante no acertó. */
  respuesta?: string;
  /** Traducción al español, cuando la hay. */
  gloss?: string;
  etiquetaBoton: string;
  onContinuar: () => void;
}

export function BarraFeedback({
  visible,
  acerto,
  titulo,
  respuesta,
  gloss,
  etiquetaBoton,
  onContinuar,
}: BarraFeedbackProps) {
  const styles = useEstilos();
  const color = useColor();
  const entra = useRef(new Animated.Value(0)).current;
  const { activa, voz, decir } = useNarrador();

  useEffect(() => {
    Animated.timing(entra, {
      toValue: visible ? 1 : 0,
      duration: visible ? tiempo.normal : tiempo.rapido,
      easing: visible ? Easing.out(Easing.back(1.3)) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible, entra]);

  useEffect(() => {
    if (visible && activa) decir([voz(titulo)]);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const translateY = entra.interpolate({ inputRange: [0, 1], outputRange: [260, 0] });
  const fondo = acerto ? color.aciertoFondo : color.intentoFondo;
  const tinta = acerto ? color.aciertoTinta : color.intentoTinta;

  return (
    <Animated.View style={[styles.raiz, { backgroundColor: fondo, transform: [{ translateY }] }]}>
      <View style={styles.fila}>
        <PikoMascota estado={acerto ? 'alegre' : 'animando'} tam={78} />
        <View style={styles.textos}>
          <View style={styles.tituloFila}>
            {acerto && <Marca tipo="visto" tinta={tinta} tam={22} />}
            <Text style={[styles.titulo, { color: tinta }]}>{titulo}</Text>
          </View>
          {!acerto && respuesta && <Text style={[styles.respuesta, { color: tinta }]}>{respuesta}</Text>}
          {gloss && <Text style={[styles.gloss, { color: tinta }]}>{gloss}</Text>}
        </View>
      </View>

      <Boton tono={acerto ? 'verde' : 'pico'} ancho onPress={onContinuar}>
        {etiquetaBoton}
      </Boton>
    </Animated.View>
  );
}

const useEstilos = crearEstilos((color) => ({
  raiz: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: espacio.xl,
    paddingTop: espacio.lg,
    paddingBottom: espacio.xl,
    borderTopLeftRadius: radio.xl,
    borderTopRightRadius: radio.xl,
    gap: espacio.lg,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  textos: { flex: 1, gap: 2 },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  titulo: { ...texto.subtitulo, flexShrink: 1 },
  respuesta: { ...texto.cuerpoFuerte, fontSize: 18 },
  gloss: { ...texto.chico },
}));
