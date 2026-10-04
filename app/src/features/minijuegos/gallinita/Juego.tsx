/**
 * Una partida de gallinita ciega.
 *
 * Piko tiene los ojos vendados: sólo puede guiarse por lo que se escucha.
 * Suena una palabra o una frase, se elige en el patio lo que se escuchó y
 * Piko camina hasta ahí. Si es lo correcto, lo encuentra y festeja; si no,
 * llega a otro lado, se da cuenta y muestra dónde estaba.
 *
 * Caminar sin navegación: un traslado en línea recta con un bamboleo de
 * pasos, todo con `transform` y el driver nativo.
 */

import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BarraFeedback } from '../../exercises/BarraFeedback';
import { ContadorSacuanjoches } from '../../../ui/arbol/ContadorSacuanjoches';
import { Escena, TIZA } from '../../../ui/minijuegos/Escena';
import { Cerrar, Globito, Parlante } from '../../../ui/minijuegos/Iconos';
import { Pictograma } from '../../../ui/minijuegos/Pictograma';
import { Venda } from '../../../ui/minijuegos/Venda';
import { PikoMascota } from '../../../ui/piko/PikoMascota';
import type { EstadoPiko } from '../../../ui/piko/sprites';
import { elegir } from '../../../ui/piko/frases';
import { useTextos } from '../../../ui/textos/useTextos';
import { vozDe, vozDePalabra, type LenguaMinijuego, type NivelMinijuego, type Palabra } from '../../../core/minijuegos/vocabulario';
import {
  BONO_GRAN_RACHA,
  BONO_RACHA,
  ESCUCHAS,
  partidaNueva,
  rachaFestejada,
  responder,
  RONDAS,
  type EstadoGallinita,
  type Ronda,
} from '../../../core/minijuegos/gallinita';
import { callar, decir, vozDePiko } from '../voz';
import { color, espacio, fuente, labio, radio, texto } from '../../../ui/tokens';

const HORIZONTE = 226;
const PIKO = 96;
const CAMINAR_MS = 820;

export interface JuegoGallinitaProps {
  rondas: readonly Ronda[];
  lengua: LenguaMinijuego;
  nivel: NivelMinijuego;
  sacuanjoches: number;
  onResponder: (palabra: Palabra, acerto: boolean, ms: number) => void;
  onTerminar: (final: EstadoGallinita) => void;
  onSalir: () => void;
}

type Fase = 'escucha' | 'camina' | 'respuesta';

export function JuegoGallinita({ rondas, lengua, nivel, sacuanjoches, onResponder, onTerminar, onSalir }: JuegoGallinitaProps) {
  const { t, frases, idioma } = useTextos();
  const [indice, setIndice] = useState(0);
  const [partida, setPartida] = useState<EstadoGallinita>(partidaNueva);
  const [fase, setFase] = useState<Fase>('escucha');
  const [elegida, setElegida] = useState<number | null>(null);
  const [escuchas, setEscuchas] = useState(0);
  const [sonando, setSonando] = useState<number | 'pregunta' | null>(null);
  const [frase, setFrase] = useState('');
  const [festejo, setFestejo] = useState<string | null>(null);
  const [quieto, setQuieto] = useState(false);
  const [patio, setPatio] = useState<{ w: number; h: number } | null>(null);
  const [lugares, setLugares] = useState<Record<number, { x: number; y: number; w: number; h: number }>>({});
  const grilla = useRef({ x: 0, y: 0 });

  const camino = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const pasos = useRef(new Animated.Value(0)).current;
  const cartel = useRef(new Animated.Value(0)).current;
  const relojes = useRef<ReturnType<typeof setTimeout>[]>([]);
  const desde = useRef(Date.now());

  const r = rondas[indice] as Ronda;
  const nombreLengua = t(`lengua.${lengua}`);
  const maximo = ESCUCHAS[nivel];
  const quedan = maximo === Infinity ? Infinity : Math.max(0, maximo - escuchas);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setQuieto)
      .catch(() => undefined);
    return () => {
      relojes.current.forEach(clearTimeout);
      callar();
    };
  }, []);

  const luego = (fn: () => void, ms: number) => {
    relojes.current.push(setTimeout(fn, ms));
  };

  /** La palabra de la ronda. Cuenta para el límite de escuchas. */
  const escucharPregunta = (cuenta = true) => {
    if (r.tipo === 'dibujo_oye') return;
    if (cuenta && quedan <= 0) return;
    if (cuenta) setEscuchas((n) => n + 1);
    setSonando('pregunta');
    decir([vozDePalabra(lengua, r.palabra)], () => setSonando(null));
  };

  /** Una opción, en la ronda donde las opciones se escuchan. Sin límite: son varias. */
  const escucharOpcion = (i: number) => {
    setSonando(i);
    decir([vozDe(lengua, r.opciones[i] as string, i === r.correcta ? r.palabra.tts : undefined)], () => setSonando(null));
  };

  // Cada ronda nueva: Piko vuelve al medio y suena la palabra sola.
  useEffect(() => {
    desde.current = Date.now();
    camino.setValue({ x: 0, y: 0 });
    setEscuchas(0);
    if (r.tipo !== 'dibujo_oye') {
      luego(() => {
        setEscuchas(1);
        setSonando('pregunta');
        decir([vozDePalabra(lengua, r.palabra)], () => setSonando(null));
      }, 400);
    }
  }, [indice]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Dónde arranca Piko: abajo al centro del patio. */
  const inicio = patio ? { x: patio.w / 2 - (PIKO * 178) / 292 / 2, y: patio.h - PIKO - 6 } : { x: 0, y: 0 };

  const elegirOpcion = (i: number) => {
    if (fase !== 'escucha') return;
    const acerto = i === r.correcta;
    onResponder(r.palabra, acerto, Date.now() - desde.current);
    const despues = responder(partida, acerto);
    setElegida(i);
    setFase('camina');
    callar();

    // Piko camina hasta la opción elegida.
    const lugar = lugares[i];
    const anchoPiko = (PIKO * 178) / 292;
    let hasta = { x: 0, y: -40 };
    if (lugar && patio) {
      // Se para al costado de lo elegido, sin taparlo: del lado que da al borde.
      const izq = grilla.current.x + lugar.x;
      const der = izq + lugar.w;
      const alLado = izq + lugar.w / 2 <= patio.w / 2 ? izq - anchoPiko * 0.7 : der - anchoPiko * 0.3;
      const x = Math.max(0, Math.min(patio.w - anchoPiko, alLado));
      const y = grilla.current.y + lugar.y + lugar.h - PIKO;
      hasta = { x: x - inicio.x, y: y - inicio.y };
    }
    pasos.setValue(0);
    const bamboleo = Animated.loop(
      Animated.sequence([
        Animated.timing(pasos, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.timing(pasos, { toValue: 0, duration: 140, useNativeDriver: true }),
      ]),
      { iterations: Math.round(CAMINAR_MS / 280) },
    );
    Animated.parallel([
      Animated.timing(camino, {
        toValue: hasta,
        duration: quieto ? 0 : CAMINAR_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      quieto ? Animated.delay(0) : bamboleo,
    ]).start(() => {
      pasos.setValue(0);
      setPartida(despues);
      setFase('respuesta');
      const racha = acerto ? rachaFestejada(despues.racha) : null;
      const perfecta = acerto && despues.aciertos === RONDAS;
      if (acerto) {
        const dicho = elegir(frases('piko.acierto'));
        setFrase(`${t('gallinita.encontro')} ${dicho}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        decir([vozDePiko(dicho, idioma), vozDePalabra(lengua, r.palabra)]);
      } else {
        const dicho = elegir(frases('piko.gallinita_choca'));
        setFrase(dicho);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        decir([vozDePiko(dicho, idioma), vozDePalabra(lengua, r.palabra)]);
      }
      const texto = perfecta
        ? t('gallinita.perfecta')
        : racha === 'gran'
          ? t('gallinita.gran_racha', { n: BONO_GRAN_RACHA })
          : racha === 'racha'
            ? t('gallinita.racha', { n: BONO_RACHA })
            : null;
      if (texto) {
        setFestejo(texto);
        cartel.setValue(0);
        Animated.sequence([
          Animated.spring(cartel, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
          Animated.delay(900),
          Animated.timing(cartel, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => setFestejo(null));
      }
    });
  };

  const seguir = () => {
    callar();
    if (indice + 1 >= RONDAS) {
      onTerminar(partida);
      return;
    }
    setIndice(indice + 1);
    setElegida(null);
    setFase('escucha');
  };

  const acerto = fase === 'respuesta' && elegida === r.correcta;
  const estadoPiko: EstadoPiko =
    fase === 'respuesta' ? (acerto ? 'celebrando' : 'animando') : fase === 'camina' ? 'idle' : sonando === 'pregunta' ? 'pensando' : 'idle';
  const pregunta = t(`gallinita.pregunta_${r.tipo}`);
  const verDibujos = r.tipo === 'oye_dibujo';
  const sube = pasos.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const gira = pasos.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });

  const estiloOpcion = (i: number) => {
    if (fase !== 'respuesta') return null;
    if (i === r.correcta) return styles.opcionBuena;
    if (i === elegida) return styles.opcionOtra;
    return styles.opcionApagada;
  };

  return (
    <View style={styles.raiz}>
      <Escena horizonte={HORIZONTE} />

      <View style={styles.cabecera}>
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel={t('gallinita.salir')} style={styles.redondo}>
          <Cerrar />
        </Pressable>
        <View
          style={styles.progreso}
          accessible
          accessibilityLabel={t('gallinita.etiqueta', { lengua: nombreLengua, nivel: t(`minijuegos.nivel_${nivel}`), n: indice + 1, total: RONDAS })}
        >
          <View style={styles.puntitos}>
            {rondas.map((_, i) => (
              <View key={i} style={[styles.puntito, i < indice || (i === indice && fase === 'respuesta') ? styles.puntitoHecho : null]} />
            ))}
          </View>
          <View style={styles.racha}>
            {Array.from({ length: Math.min(partida.racha, 5) }, (_, i) => (
              <View key={i} style={styles.llama} />
            ))}
            <Text style={styles.puntos}>{partida.puntos} pts</Text>
          </View>
        </View>
        <ContadorSacuanjoches total={sacuanjoches} />
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel={t('practicar.elegir_lengua')} style={styles.redondo}>
          <Globito tam={22} tinta={color.tinta} />
        </Pressable>
      </View>

      <View style={styles.tarjeta}>
        {r.tipo === 'dibujo_oye' && (
          <View style={styles.dibujo}>
            <Pictograma es={r.palabra.es} tam={60} />
          </View>
        )}
        <View style={styles.tarjetaTextos}>
          <Text style={styles.etiqueta}>
            {t('gallinita.etiqueta', { lengua: nombreLengua, nivel: t(`minijuegos.nivel_${nivel}`), n: indice + 1, total: RONDAS })}
          </Text>
          <Text style={styles.pregunta}>{pregunta}</Text>
          {fase === 'respuesta' && r.tipo !== 'dibujo_oye' && (
            <Text style={r.palabra.meta.length > 14 ? styles.focoLargo : styles.foco} numberOfLines={2}>
              {r.palabra.meta}
            </Text>
          )}
          {r.tipo !== 'dibujo_oye' && maximo !== Infinity && fase === 'escucha' && (
            <Text style={styles.quedan}>{quedan > 0 ? t('gallinita.escuchas_quedan', { n: quedan }) : t('gallinita.sin_escuchas')}</Text>
          )}
        </View>
        {r.tipo !== 'dibujo_oye' && (
          <Pressable
            onPress={() => escucharPregunta()}
            disabled={quedan <= 0 && fase === 'escucha'}
            accessibilityRole="button"
            accessibilityLabel={t('gallinita.escuchar')}
            accessibilityState={{ disabled: quedan <= 0 && fase === 'escucha' }}
            style={[styles.parlante, sonando === 'pregunta' ? styles.parlanteSonando : null, quedan <= 0 && fase === 'escucha' ? styles.parlanteApagado : null]}
          >
            <Parlante tam={32} />
          </Pressable>
        )}
      </View>

      <View style={styles.patio} onLayout={(e: LayoutChangeEvent) => setPatio({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <View
          style={styles.grilla}
          onLayout={(e) => {
            grilla.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y };
          }}
        >
          {r.opciones.map((op, i) => (
            <View
              key={`${indice}-${i}`}
              style={r.opciones.length > 3 || verDibujos ? styles.mitad : styles.entera}
              onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                setLugares((l) => ({ ...l, [i]: { x, y, w: width, h: height } }));
              }}
            >
              {r.tipo === 'dibujo_oye' ? (
                <View style={[styles.opcion, styles.opcionFila, estiloOpcion(i)]}>
                  <Pressable
                    onPress={() => escucharOpcion(i)}
                    accessibilityRole="button"
                    accessibilityLabel={t('gallinita.escuchar_opcion', { n: i + 1 })}
                    style={[styles.parlanteChico, sonando === i ? styles.parlanteSonando : null]}
                  >
                    <Parlante tam={22} />
                  </Pressable>
                  <Pressable
                    onPress={() => elegirOpcion(i)}
                    disabled={fase !== 'escucha'}
                    accessibilityRole="button"
                    accessibilityLabel={t('gallinita.elegir_opcion', { n: i + 1 })}
                    style={styles.elegirEsta}
                  >
                    <Text style={styles.opcionTexto}>{fase === 'respuesta' ? op : t('gallinita.opcion', { n: i + 1 })}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => elegirOpcion(i)}
                  disabled={fase !== 'escucha'}
                  accessibilityRole="button"
                  accessibilityLabel={op}
                  style={[styles.opcion, verDibujos ? styles.opcionDibujo : null, estiloOpcion(i)]}
                >
                  {verDibujos && <Pictograma es={op} tam={56} />}
                  <Text style={[styles.opcionTexto, verDibujos ? styles.opcionPie : null, op.length > 16 ? styles.opcionLarga : null]} numberOfLines={2}>
                    {op}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        {patio && (
          <Animated.View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.piko,
              {
                left: inicio.x,
                top: inicio.y,
                transform: [{ translateX: camino.x }, { translateY: camino.y }, { translateY: sube }, { rotate: gira }],
              },
            ]}
          >
            <PikoMascota estado={estadoPiko} tam={PIKO} accesorio={<Venda />} />
          </Animated.View>
        )}

        {festejo && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cartel,
              { opacity: cartel, transform: [{ scale: cartel.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] },
            ]}
          >
            <Text style={styles.cartelTexto}>{festejo}</Text>
          </Animated.View>
        )}
      </View>

      <BarraFeedback
        visible={fase === 'respuesta'}
        acerto={acerto}
        titulo={frase}
        gloss={acerto ? `${r.palabra.meta} = ${r.palabra.es}` : t('gallinita.era', { respuesta: `${r.palabra.meta} = ${r.palabra.es}` })}
        etiquetaBoton={indice + 1 >= RONDAS ? t('gallinita.terminar') : t('gallinita.seguir')}
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
  progreso: { flex: 1, alignItems: 'center', gap: 3 },
  puntitos: { flexDirection: 'row', gap: 4 },
  puntito: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: color.bordeHondo,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  puntitoHecho: { backgroundColor: color.verdePasto, borderColor: '#7BA22C' },
  racha: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 16 },
  llama: { width: 9, height: 12, borderTopLeftRadius: 5, borderTopRightRadius: 5, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: color.copete },
  puntos: { fontFamily: fuente.titulo, fontSize: 13, color: color.verdeHondo, marginLeft: 2 },
  tarjeta: {
    marginHorizontal: espacio.lg,
    marginTop: espacio.sm,
    minHeight: 96,
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
    width: 72,
    height: 72,
    borderRadius: radio.md,
    backgroundColor: color.papel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjetaTextos: { flex: 1, gap: 2 },
  etiqueta: { ...texto.etiqueta, fontSize: 11, color: color.tintaSuave },
  pregunta: { ...texto.cuerpoFuerte, fontSize: 16, lineHeight: 21, color: color.tinta },
  foco: { fontFamily: fuente.tituloFuerte, fontSize: 26, lineHeight: 30, color: color.verde },
  focoLargo: { fontFamily: fuente.tituloFuerte, fontSize: 19, lineHeight: 24, color: color.verde },
  quedan: { ...texto.chico, color: color.tintaSuave },
  parlante: {
    width: 64,
    height: 64,
    borderRadius: radio.redondo,
    backgroundColor: color.cieloHondo,
    borderBottomWidth: labio.normal,
    borderBottomColor: '#1F7FB0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parlanteSonando: { backgroundColor: '#1F7FB0' },
  parlanteApagado: { backgroundColor: color.bordeHondo, borderBottomColor: color.borde },
  patio: { flex: 1, marginTop: espacio.lg },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: espacio.md,
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.lg,
  },
  mitad: { width: '46%' },
  entera: { width: '70%' },
  opcion: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,253,244,0.92)',
    borderWidth: 3,
    borderColor: TIZA,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  opcionDibujo: { minHeight: 104 },
  opcionFila: { flexDirection: 'row', justifyContent: 'flex-start', gap: espacio.sm },
  opcionBuena: { backgroundColor: color.aciertoFondo, borderColor: color.acierto },
  opcionOtra: { backgroundColor: color.intentoFondo, borderColor: color.intento },
  opcionApagada: { opacity: 0.5 },
  opcionTexto: { fontFamily: fuente.titulo, fontSize: 18, lineHeight: 22, color: color.grafito, textAlign: 'center' },
  opcionPie: { fontSize: 14, lineHeight: 18, color: color.tinta },
  opcionLarga: { fontFamily: fuente.cuerpoFuerte, fontSize: 14, lineHeight: 18 },
  parlanteChico: {
    width: 44,
    height: 44,
    borderRadius: radio.redondo,
    backgroundColor: color.cieloHondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elegirEsta: { flex: 1, minHeight: 44, justifyContent: 'center' },
  piko: { position: 'absolute' },
  cartel: {
    position: 'absolute',
    bottom: PIKO + 24,
    alignSelf: 'center',
    backgroundColor: color.pico,
    borderRadius: radio.redondo,
    borderBottomWidth: labio.normal,
    borderBottomColor: '#C08417',
    paddingHorizontal: espacio.xl,
    paddingVertical: espacio.sm,
  },
  cartelTexto: { fontFamily: fuente.tituloFuerte, fontSize: 22, color: '#5C3D02' },
});
