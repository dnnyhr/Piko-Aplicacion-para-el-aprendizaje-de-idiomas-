/**
 * Las instrucciones de una actividad, un paso por vez.
 *
 * Nada avanza solo y no hay reloj: cada quien pasa cuando quiere, vuelve atrás
 * y repite lo que necesite. Nada de esto entra al log de progreso, así que
 * repetir no cuesta puntos, ni flores, ni tiempo de respuesta.
 *
 * «Repetir» habla siempre, porque es un pedido; la narración automática sólo
 * corre si está activada en «Mi forma de aprender».
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Boton } from '../../ui/components/Boton';
import { Parlante } from '../../ui/minijuegos/Iconos';
import { crearEstilos, useColor, useEscalaTexto } from '../../ui/tema';
import { espacio, labio, radio, texto } from '../../ui/tokens';
import { useTextos } from '../../ui/textos/useTextos';
import { EjemploPaso } from './EjemploPaso';
import { PASOS, type Actividad } from './pasos';
import { useNarrador } from './useNarrador';

export interface PasosInstruccionProps {
  actividad: Actividad;
  /** El dibujo del juego, para los pasos que lo usan. */
  dibujo?: ReactNode;
  /** Al terminar. Sin esto, el último paso ofrece volver a empezar. */
  onListo?: () => void;
}

export function PasosInstruccion({ actividad, dibujo, onListo }: PasosInstruccionProps) {
  const styles = useEstilos();
  const { t } = useTextos();
  const { activa, voz, decir, callar } = useNarrador();
  const color = useColor();
  // Con letra grande, dos botones lado a lado cortarían las palabras.
  const apilados = useEscalaTexto() > 1;
  const pasos = PASOS[actividad];
  const [i, setI] = useState(0);
  const paso = pasos[Math.min(i, pasos.length - 1)] as (typeof pasos)[number];
  const ultimo = i >= pasos.length - 1;
  const dicho = t(paso.texto);

  useEffect(() => {
    if (!activa) return;
    const reloj = setTimeout(() => decir([voz(dicho)]), 260);
    return () => clearTimeout(reloj);
  }, [i, actividad, activa]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => callar(), [callar]);

  return (
    <View style={styles.tarjeta}>
      <Text style={styles.cuenta} accessibilityRole="header">
        {t('instruccion.paso_de', { n: i + 1, total: pasos.length })}
      </Text>
      <EjemploPaso ejemplo={paso.ejemplo} dibujo={dibujo} />
      <Text style={styles.texto} accessibilityLiveRegion="polite">
        {dicho}
      </Text>

      <Boton ancho chico tono="cielo" icono={<Parlante tam={20} tinta={color.tintaCielo} />} onPress={() => decir([voz(dicho)])}>
        {t('instruccion.repetir')}
      </Boton>
      <View style={apilados ? styles.columna : styles.fila}>
        {i > 0 && (
          <View style={apilados ? null : styles.mitad}>
            <Boton ancho tono="papel" onPress={() => setI(i - 1)}>
              {t('instruccion.atras')}
            </Boton>
          </View>
        )}
        <View style={apilados ? null : styles.mitad}>
          {!ultimo ? (
            <Boton ancho onPress={() => setI(i + 1)}>
              {t('instruccion.siguiente')}
            </Boton>
          ) : onListo ? (
            <Boton
              ancho
              onPress={() => {
                callar();
                onListo();
              }}
            >
              {t('instruccion.entendido')}
            </Boton>
          ) : (
            <Boton ancho tono="papel" onPress={() => setI(0)}>
              {t('instruccion.otra_vez')}
            </Boton>
          )}
        </View>
      </View>
    </View>
  );
}

const useEstilos = crearEstilos((color) => ({
  tarjeta: {
    gap: espacio.md,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderBottomWidth: 2 + labio.normal,
    borderBottomColor: color.bordeHondo,
    borderRadius: radio.xl,
    padding: espacio.lg,
  },
  cuenta: { ...texto.etiqueta, color: color.tintaSuave },
  texto: { ...texto.subtitulo, color: color.grafito },
  fila: { flexDirection: 'row', gap: espacio.sm },
  columna: { flexDirection: 'column-reverse', gap: espacio.sm },
  mitad: { flex: 1 },
}));
