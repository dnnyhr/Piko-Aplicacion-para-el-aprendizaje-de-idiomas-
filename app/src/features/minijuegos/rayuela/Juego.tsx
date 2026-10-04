/**
 * Una partida de rayuela: seis saltos, de la casilla 1 al cielo.
 *
 * En cada salto se ve una palabra (o se escucha), las respuestas están en las
 * casillas de adelante y Piko salta a la que se toque. Si es otra, vuelve a la
 * 1 y se prueba de nuevo: la rayuela no se termina sin haber caído en la
 * correcta, pero lo que cuenta para las flores es el primer intento.
 */

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { BarraFeedback } from '../../exercises/BarraFeedback';
import { ContadorSacuanjoches } from '../../../ui/arbol/ContadorSacuanjoches';
import { Escena } from '../../../ui/minijuegos/Escena';
import { Pictograma, tienePictograma } from '../../../ui/minijuegos/Pictograma';
import { elegir } from '../../../ui/piko/frases';
import { useTextos } from '../../../ui/textos/useTextos';
import {
  SALTOS,
  vozDePalabra,
  type LenguaRayuela,
  type NivelRayuela,
  type Palabra,
  type Pregunta,
} from '../../../core/minijuegos/rayuela';
import { callar, decir, vozDePiko } from '../voz';
import { Tablero, type Casilla } from './Tablero';
import { Globito } from '../../../ui/minijuegos/Iconos';
import { color, espacio, fuente, labio, radio, texto } from '../../../ui/tokens';

/** Dónde termina el cielo y empieza el patio. */
const HORIZONTE = 236;

export interface JuegoProps {
  preguntas: readonly Pregunta[];
  lengua: LenguaRayuela;
  nivel: NivelRayuela;
  sacuanjoches: number;
  /** Cada respuesta al primer intento, para el progreso del estudiante. */
  onResponder: (palabra: Palabra, acerto: boolean, ms: number) => void;
  onTerminar: (primeros: number) => void;
  onSalir: () => void;
}

type Resultado = null | 'acierto' | 'intento';

export function Juego({ preguntas, lengua, nivel, sacuanjoches, onResponder, onTerminar, onSalir }: JuegoProps) {
  const { t, frases, idioma } = useTextos();
  const [paso, setPaso] = useState(0);
  const [pikoEn, setPikoEn] = useState<number | 'inicio'>('inicio');
  const [elegida, setElegida] = useState<number | null>(null);
  const [probadas, setProbadas] = useState<number[]>([]);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [ocupado, setOcupado] = useState(false);
  const [sonando, setSonando] = useState(false);
  const [frase, setFrase] = useState('');
  const primeros = useRef(0);
  const desde = useRef(Date.now());
  const relojes = useRef<ReturnType<typeof setTimeout>[]>([]);

  const q = preguntas[paso] as Pregunta;
  const nombreLengua = t(`lengua.${lengua}`);
  const conParlante = q.tipo !== 'inverso';

  const luego = (fn: () => void, ms: number) => {
    relojes.current.push(setTimeout(fn, ms));
  };
  useEffect(
    () => () => {
      relojes.current.forEach(clearTimeout);
      callar();
    },
    [],
  );

  const escuchar = () => {
    setSonando(true);
    decir([vozDePalabra(lengua, q.palabra)], () => setSonando(false));
  };

  // En los de escucha, Piko la dice solo al empezar el salto.
  useEffect(() => {
    desde.current = Date.now();
    if (q.tipo === 'escucha') luego(escuchar, 380);
  }, [paso]); // eslint-disable-line react-hooks/exhaustive-deps

  const tocar = (i: number) => {
    if (ocupado || resultado || probadas.includes(i)) return;
    const primerIntento = probadas.length === 0;
    const acerto = i === q.correcta;
    if (primerIntento) {
      onResponder(q.palabra, acerto, Date.now() - desde.current);
      if (acerto) primeros.current += 1;
    }
    setElegida(i);
    setPikoEn(i);
    setOcupado(true);

    if (acerto) {
      const dicho = elegir(frases('piko.rayuela_salto'));
      setFrase(dicho);
      luego(() => {
        setResultado('acierto');
        setOcupado(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        decir([vozDePiko(dicho, idioma), vozDePalabra(lengua, q.palabra)]);
      }, 540);
    } else {
      const dicho = elegir(frases('piko.rayuela_casi'));
      setFrase(dicho);
      luego(() => setPikoEn('inicio'), 580);
      luego(() => {
        setProbadas((p) => [...p, i]);
        setResultado('intento');
        setOcupado(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        decir([vozDePiko(dicho, idioma)]);
      }, 940);
    }
  };

  const seguir = () => {
    if (resultado === 'intento') {
      setResultado(null);
      setElegida(null);
      return;
    }
    callar();
    if (paso + 1 >= SALTOS) {
      onTerminar(primeros.current);
      return;
    }
    setPaso(paso + 1);
    setPikoEn('inicio');
    setElegida(null);
    setProbadas([]);
    setResultado(null);
  };

  const casillas: Casilla[] = q.opciones.map((texto, i) => {
    let estado: Casilla['estado'] = 'normal';
    if (resultado === 'acierto') estado = i === q.correcta ? 'correcta' : 'apagada';
    else if (resultado === 'intento' && i === elegida) estado = 'intento';
    else if (probadas.includes(i)) estado = 'probada';
    const dibujo = nivel === 'inicial' && q.tipo === 'directo' && tienePictograma(texto) ? texto : undefined;
    return { texto, dibujo, estado };
  });

  const mostrarFoco = q.tipo !== 'escucha' || resultado === 'acierto';
  const dibujoPregunta = nivel === 'inicial' && q.tipo === 'inverso' && tienePictograma(q.palabra.es);
  const pregunta =
    q.tipo === 'directo'
      ? t('rayuela.pregunta_directo')
      : q.tipo === 'inverso'
        ? t('rayuela.pregunta_inverso', { lengua: nombreLengua })
        : t('rayuela.pregunta_escucha');
  const estadoPiko = resultado === 'acierto' ? 'alegre' : resultado === 'intento' ? 'animando' : 'pensando';

  return (
    <View style={styles.raiz}>
      <Escena horizonte={HORIZONTE} />

      <View style={styles.cabecera}>
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel={t('rayuela.salir')} style={styles.redondo}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color.tinta} strokeWidth={2.8} strokeLinecap="round">
            <Path d="M6 6 L18 18 M18 6 L6 18" />
          </Svg>
        </Pressable>
        <View
          style={styles.progreso}
          accessible
          accessibilityLabel={t('rayuela.etiqueta', { lengua: nombreLengua, nivel: t(`minijuegos.nivel_${nivel}`), n: paso + 1, total: SALTOS })}
        >
          {preguntas.map((_, i) => {
            const hecho = i < paso || (i === paso && resultado === 'acierto');
            return <View key={i} style={[styles.cuadrito, hecho ? styles.cuadritoHecho : i === paso ? styles.cuadritoActual : null]} />;
          })}
          <View style={styles.arquito} />
        </View>
        <ContadorSacuanjoches total={sacuanjoches} />
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel={t('practicar.elegir_lengua')} style={styles.redondo}>
          <Globito tam={22} tinta={color.tinta} />
        </Pressable>
      </View>

      <View style={styles.tarjeta}>
        {dibujoPregunta && (
          <View style={styles.dibujo}>
            <Pictograma es={q.palabra.es} tam={52} />
          </View>
        )}
        <View style={styles.tarjetaTextos}>
          <Text style={styles.etiqueta}>
            {t('rayuela.etiqueta', { lengua: nombreLengua, nivel: t(`minijuegos.nivel_${nivel}`), n: paso + 1, total: SALTOS })}
          </Text>
          <Text style={styles.pregunta}>{pregunta}</Text>
          {mostrarFoco ? (
            <Text style={q.foco.length > 14 ? styles.focoLargo : styles.foco} numberOfLines={3}>
              {q.tipo === 'inverso' ? `«${q.foco}»` : q.foco}
            </Text>
          ) : (
            <Text style={styles.oculto}>• • •</Text>
          )}
        </View>
        {conParlante && (
          <Pressable
            onPress={escuchar}
            accessibilityRole="button"
            accessibilityLabel={t('minijuegos.escuchar')}
            style={[styles.parlante, q.tipo === 'escucha' ? styles.parlanteGrande : null, sonando ? styles.parlanteSonando : null]}
          >
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color.blanco} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M3 9.5 H7 L12 5.5 V18.5 L7 14.5 H3 Z" fill={color.blanco} />
              <Path d="M15.5 9.5 C16.5 10.8 16.5 13.2 15.5 14.5" />
              <Path d="M18 7.5 C20 10 20 14 18 16.5" />
            </Svg>
          </Pressable>
        )}
      </View>

      <View style={styles.patio}>
        <Tablero
          casillas={casillas}
          pikoEn={pikoEn}
          estadoPiko={estadoPiko}
          paso={paso}
          bloqueado={ocupado || resultado !== null}
          etiquetaCielo={t('rayuela.cielo')}
          etiquetaCasilla={(n, texto) => t('rayuela.casilla', { n, texto })}
          onElegir={tocar}
        />
      </View>

      <BarraFeedback
        visible={resultado !== null}
        acerto={resultado === 'acierto'}
        titulo={frase}
        gloss={
          resultado === 'acierto'
            ? `${q.palabra.meta} = ${q.palabra.es}`
            : conParlante
              ? t('rayuela.pista_escucha')
              : t('rayuela.pista_mirar')
        }
        etiquetaBoton={
          resultado === 'intento' ? t('rayuela.reintentar') : paso + 1 >= SALTOS ? t('rayuela.al_cielo') : t('rayuela.seguir')
        }
        onContinuar={seguir}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: color.nube },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.sm,
    height: 56,
  },
  redondo: {
    width: 44,
    height: 44,
    borderRadius: radio.redondo,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progreso: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  cuadrito: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: color.bordeHondo,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  cuadritoHecho: { backgroundColor: color.verdePasto, borderColor: '#7BA22C' },
  cuadritoActual: { backgroundColor: color.blanco, borderColor: color.verde, borderWidth: 2.5 },
  arquito: {
    width: 24,
    height: 12,
    borderWidth: 2.5,
    borderBottomWidth: 0,
    borderColor: color.verde,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginLeft: 2,
    alignSelf: 'flex-end',
    marginBottom: 3,
  },
  tarjeta: {
    marginHorizontal: espacio.lg,
    marginTop: espacio.sm,
    minHeight: 112,
    maxHeight: HORIZONTE - 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderBottomWidth: 2 + labio.normal,
    borderBottomColor: color.bordeHondo,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },
  dibujo: {
    width: 64,
    height: 64,
    borderRadius: radio.md,
    backgroundColor: color.papel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjetaTextos: { flex: 1, gap: 2 },
  etiqueta: { ...texto.etiqueta, fontSize: 11, color: color.tintaSuave },
  pregunta: { ...texto.cuerpo, fontSize: 15, lineHeight: 20, color: color.tinta },
  foco: { fontFamily: fuente.tituloFuerte, fontSize: 30, lineHeight: 34, color: color.verde },
  focoLargo: { fontFamily: fuente.tituloFuerte, fontSize: 21, lineHeight: 26, color: color.verde },
  oculto: { fontFamily: fuente.titulo, fontSize: 22, lineHeight: 30, letterSpacing: 6, color: color.cieloHondo },
  parlante: {
    width: 50,
    height: 50,
    borderRadius: radio.redondo,
    backgroundColor: color.cieloHondo,
    borderBottomWidth: labio.normal,
    borderBottomColor: '#1F7FB0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parlanteGrande: { width: 60, height: 60 },
  parlanteSonando: { backgroundColor: '#1F7FB0' },
  patio: { position: 'absolute', left: 0, right: 0, top: HORIZONTE + 12, bottom: 0 },
});
