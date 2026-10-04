/**
 * Una partida de chibolas.
 *
 * En la rueda de tiza hay una chibola por respuesta, alrededor del hoyito. Se
 * apunta arrastrando el tiro hacia atrás (como cuando se tira con el dedo) y
 * se suelta; o, más fácil, se toca la chibola elegida. Si el tiro le pega a
 * la correcta, esa chibola cae al hoyito; si no, el tiro rebota, Piko da una
 * pista y se vuelve a tirar.
 *
 * Sin físicas: el tiro va derecho a la chibola que queda más cerca de la
 * dirección apuntada, con `transform` y el driver nativo.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line } from 'react-native-svg';
import { BarraFeedback } from '../../exercises/BarraFeedback';
import { ContadorSacuanjoches } from '../../../ui/arbol/ContadorSacuanjoches';
import { Escena, TIZA } from '../../../ui/minijuegos/Escena';
import { Chibola, COLORES_CHIBOLA, COLOR_TIRO } from '../../../ui/minijuegos/Chibola';
import { Cerrar, Globito, Parlante } from '../../../ui/minijuegos/Iconos';
import { Pictograma, tienePictograma } from '../../../ui/minijuegos/Pictograma';
import { PikoMascota } from '../../../ui/piko/PikoMascota';
import type { EstadoPiko } from '../../../ui/piko/sprites';
import { elegir } from '../../../ui/piko/frases';
import { useTextos } from '../../../ui/textos/useTextos';
import { vozDePalabra, type LenguaMinijuego, type NivelMinijuego, type Palabra } from '../../../core/minijuegos/vocabulario';
import { pistaDe, type Reto } from '../../../core/minijuegos/retos';
import { chibolaAlcanzada, TIROS } from '../../../core/minijuegos/chibolas';
import { callar, decir, vozDePiko } from '../voz';
import { color, espacio, fuente, labio, radio, texto } from '../../../ui/tokens';

const HORIZONTE = 236;
const TAM_CHIBOLA = 46;
const TAM_TIRO = 40;
const VUELO_MS = 380;

export interface JuegoChibolasProps {
  retos: readonly Reto[];
  lengua: LenguaMinijuego;
  nivel: NivelMinijuego;
  sacuanjoches: number;
  /** El primer tiro de cada pregunta, para el progreso del estudiante. */
  onResponder: (palabra: Palabra, acerto: boolean, ms: number) => void;
  onTerminar: (primeros: number) => void;
  onSalir: () => void;
}

type Resultado = null | 'acierto' | 'reboto';

interface Punto {
  x: number;
  y: number;
}

/** Dónde va cada chibola en la rueda: un triángulo o un cuadrado alrededor del hoyito. */
function lugares(n: number, centro: Punto, r: number): Punto[] {
  if (n <= 3) {
    return [
      { x: centro.x, y: centro.y - r * 0.62 },
      { x: centro.x - r * 0.58, y: centro.y + r * 0.18 },
      { x: centro.x + r * 0.58, y: centro.y + r * 0.18 },
    ].slice(0, n);
  }
  return [
    { x: centro.x - r * 0.5, y: centro.y - r * 0.5 },
    { x: centro.x + r * 0.5, y: centro.y - r * 0.5 },
    { x: centro.x - r * 0.5, y: centro.y + r * 0.3 },
    { x: centro.x + r * 0.5, y: centro.y + r * 0.3 },
  ].slice(0, n);
}

/** Ángulo de `a` hacia `b`, en grados; 0 es derecho hacia arriba. */
function anguloHacia(a: Punto, b: Punto): number {
  return (Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI;
}

export function JuegoChibolas({ retos, lengua, nivel, sacuanjoches, onResponder, onTerminar, onSalir }: JuegoChibolasProps) {
  const { t, frases, idioma } = useTextos();
  const [paso, setPaso] = useState(0);
  const [probadas, setProbadas] = useState<number[]>([]);
  const [golpeada, setGolpeada] = useState<number | null>(null);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [frase, setFrase] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [sonando, setSonando] = useState(false);
  const [apunta, setApunta] = useState<{ angulo: number; largo: number } | null>(null);
  const [campo, setCampo] = useState<{ w: number; h: number } | null>(null);
  const [quieto, setQuieto] = useState(false);

  const primeros = useRef(0);
  const desde = useRef(Date.now());
  const relojes = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tiro = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const caida = useRef(new Animated.Value(0)).current;
  const destello = useRef(new Animated.Value(0)).current;

  const r = retos[paso] as Reto;
  const nombreLengua = t(`lengua.${lengua}`);

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

  // La geometría del patio: la rueda arriba, el tiro abajo al centro.
  const geo = useMemo(() => {
    if (!campo) return null;
    const radioRueda = Math.min(campo.w * 0.44, campo.h * 0.36);
    const centro = { x: campo.w / 2, y: radioRueda + 16 };
    const inicio = { x: campo.w / 2, y: campo.h - TAM_TIRO / 2 - 20 };
    const puntos = lugares(r.opciones.length, centro, radioRueda);
    return { radioRueda, centro, inicio, puntos, angulos: puntos.map((p) => ({ angulo: anguloHacia(inicio, p) })) };
  }, [campo, r.opciones.length]);

  const escuchar = () => {
    setSonando(true);
    decir([vozDePalabra(lengua, r.palabra)], () => setSonando(false));
  };

  // Cada pregunta nueva: el tiro vuelve a la mano y, si es de audio, Piko la dice.
  useEffect(() => {
    desde.current = Date.now();
    tiro.setValue({ x: 0, y: 0 });
    caida.setValue(0);
    if (r.tipo === 'audio') luego(escuchar, 350);
  }, [paso]); // eslint-disable-line react-hooks/exhaustive-deps

  const tirar = (i: number) => {
    if (!geo || ocupado || resultado || probadas.includes(i)) return;
    const primerTiro = probadas.length === 0;
    const acerto = i === r.correcta;
    if (primerTiro) {
      onResponder(r.palabra, acerto, Date.now() - desde.current);
      if (acerto) primeros.current += 1;
    }
    setOcupado(true);
    setApunta(null);
    setGolpeada(i);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    const blanco = geo.puntos[i] as Punto;
    const hasta = { x: blanco.x - geo.inicio.x, y: blanco.y - geo.inicio.y + TAM_CHIBOLA * 0.45 };
    const vuelo = Animated.timing(tiro, {
      toValue: hasta,
      duration: quieto ? 0 : VUELO_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    if (acerto) {
      const dicho = elegir(frases('piko.acierto'));
      setFrase(dicho);
      vuelo.start(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        destello.setValue(0);
        Animated.parallel([
          Animated.timing(caida, { toValue: 1, duration: quieto ? 0 : 480, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(destello, { toValue: 1, duration: quieto ? 0 : 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
        decir([vozDePiko(dicho, idioma), vozDePalabra(lengua, r.palabra)]);
        luego(() => {
          setResultado('acierto');
          setOcupado(false);
        }, 420);
      });
    } else {
      const dicho = elegir(frases('piko.chibola_rebota'));
      setFrase(dicho);
      Animated.sequence([
        vuelo,
        Animated.timing(tiro, {
          toValue: { x: hasta.x * 0.25, y: hasta.y * 0.25 },
          duration: quieto ? 0 : 420,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        decir([vozDePiko(dicho, idioma)]);
        setProbadas((p) => [...p, i]);
        setResultado('reboto');
        setOcupado(false);
      });
    }
  };

  // Apuntar: se arrastra el tiro hacia atrás y sale para el otro lado.
  const tirarRef = useRef(tirar);
  tirarRef.current = tirar;
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const libres = useRef<number[]>([]);
  libres.current = r.opciones.map((_, i) => i).filter((i) => !probadas.includes(i));
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => {
          const largo = Math.hypot(g.dx, g.dy);
          if (largo < 8) return setApunta(null);
          setApunta({ angulo: (Math.atan2(-g.dx, g.dy) * 180) / Math.PI, largo: Math.min(largo, 120) });
        },
        onPanResponderRelease: (_, g) => {
          const g2 = geoRef.current;
          const largo = Math.hypot(g.dx, g.dy);
          setApunta(null);
          if (!g2 || largo < 20) return;
          const angulo = (Math.atan2(-g.dx, g.dy) * 180) / Math.PI;
          const posibles = libres.current;
          const i = posibles[chibolaAlcanzada(angulo, posibles.map((k) => g2.angulos[k] as { angulo: number }))];
          if (i !== undefined) tirarRef.current(i);
        },
        onPanResponderTerminate: () => setApunta(null),
      }),
    [],
  );

  const seguir = () => {
    if (resultado === 'reboto') {
      tiro.setValue({ x: 0, y: 0 });
      setResultado(null);
      setGolpeada(null);
      return;
    }
    callar();
    if (paso + 1 >= TIROS) {
      onTerminar(primeros.current);
      return;
    }
    setPaso(paso + 1);
    setProbadas([]);
    setGolpeada(null);
    setResultado(null);
  };

  const apuntada =
    apunta && geo
      ? libres.current[chibolaAlcanzada(apunta.angulo, libres.current.map((k) => geo.angulos[k] as { angulo: number }))]
      : undefined;
  const estadoPiko: EstadoPiko = resultado === 'acierto' ? 'celebrando' : resultado === 'reboto' ? 'animando' : apunta ? 'pensando' : 'idle';
  const pista = pistaDe(r);
  const pregunta =
    r.tipo === 'traduccion'
      ? t('chibolas.pregunta_traduccion', { lengua: nombreLengua })
      : r.tipo === 'significado'
        ? t('chibolas.pregunta_significado')
        : r.tipo === 'imagen'
          ? t('chibolas.pregunta_imagen', { lengua: nombreLengua })
          : r.opcionesEnMeta
            ? t('chibolas.pregunta_audio')
            : t('chibolas.pregunta_audio_frase');
  const verFoco = r.tipo === 'traduccion' || r.tipo === 'significado' || (r.tipo === 'audio' && resultado === 'acierto');
  const conDibujos = nivel === 'inicial' && !r.opcionesEnMeta;

  return (
    <View style={styles.raiz}>
      <Escena horizonte={HORIZONTE} />

      <View style={styles.cabecera}>
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel={t('chibolas.salir')} style={styles.redondo}>
          <Cerrar />
        </Pressable>
        <View
          style={styles.progreso}
          accessible
          accessibilityLabel={t('chibolas.etiqueta', { lengua: nombreLengua, nivel: t(`minijuegos.nivel_${nivel}`), n: paso + 1, total: TIROS })}
        >
          {retos.map((_, i) => {
            const hecho = i < paso || (i === paso && resultado === 'acierto');
            return (
              <View key={i} style={[styles.bolita, hecho ? null : styles.bolitaVacia]}>
                {hecho && <Chibola tinte={COLORES_CHIBOLA[i % COLORES_CHIBOLA.length] as string} tam={16} />}
              </View>
            );
          })}
        </View>
        <ContadorSacuanjoches total={sacuanjoches} />
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel={t('practicar.elegir_lengua')} style={styles.redondo}>
          <Globito tam={22} tinta={color.tinta} />
        </Pressable>
      </View>

      <View style={styles.tarjeta}>
        {r.tipo === 'imagen' && (
          <View style={styles.dibujo}>
            <Pictograma es={r.palabra.es} tam={56} />
          </View>
        )}
        <View style={styles.tarjetaTextos}>
          <Text style={styles.etiqueta}>
            {t('chibolas.etiqueta', { lengua: nombreLengua, nivel: t(`minijuegos.nivel_${nivel}`), n: paso + 1, total: TIROS })}
          </Text>
          <Text style={styles.pregunta}>{pregunta}</Text>
          {verFoco ? (
            <Text style={r.foco.length > 14 ? styles.focoLargo : styles.foco} numberOfLines={2}>
              {r.tipo === 'traduccion' ? `«${r.foco}»` : r.foco}
            </Text>
          ) : r.tipo === 'audio' ? (
            <Text style={styles.oculto}>• • •</Text>
          ) : null}
        </View>
        {(r.tipo === 'audio' || r.tipo === 'significado') && (
          <Pressable
            onPress={escuchar}
            accessibilityRole="button"
            accessibilityLabel={t('minijuegos.escuchar')}
            style={[styles.parlante, sonando ? styles.parlanteSonando : null]}
          >
            <Parlante />
          </Pressable>
        )}
      </View>

      <View style={styles.campo} onLayout={(e: LayoutChangeEvent) => setCampo({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {geo && (
          <>
            {/* La rueda de tiza, el hoyito y la línea de tiro */}
            <Svg width={campo!.w} height={campo!.h} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Circle cx={geo.centro.x} cy={geo.centro.y} r={geo.radioRueda} fill="none" stroke={TIZA} strokeWidth={3} />
              <Circle cx={geo.centro.x} cy={geo.centro.y} r={11} fill="#8A6A45" stroke="#6E5233" strokeWidth={2} />
              <Line
                x1={geo.inicio.x - 60}
                y1={geo.inicio.y - TAM_TIRO / 2 - 8}
                x2={geo.inicio.x + 60}
                y2={geo.inicio.y - TAM_TIRO / 2 - 8}
                stroke={TIZA}
                strokeWidth={3}
                strokeDasharray="8 6"
              />
              {apunta && (
                <Line
                  x1={geo.inicio.x}
                  y1={geo.inicio.y}
                  x2={geo.inicio.x + Math.sin((apunta.angulo * Math.PI) / 180) * (60 + apunta.largo * 1.4)}
                  y2={geo.inicio.y - Math.cos((apunta.angulo * Math.PI) / 180) * (60 + apunta.largo * 1.4)}
                  stroke={color.verde}
                  strokeWidth={3}
                  strokeDasharray="2 8"
                  strokeLinecap="round"
                />
              )}
            </Svg>

            {/* El destello del acierto, en el hoyito */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.destello,
                {
                  left: geo.centro.x - 40,
                  top: geo.centro.y - 40,
                  opacity: destello.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                  transform: [{ scale: destello.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.6] }) }],
                },
              ]}
            />

            {r.opciones.map((op, i) => {
              const p = geo.puntos[i] as Punto;
              const probada = probadas.includes(i);
              const cae = resultado === 'acierto' && i === r.correcta;
              const golpeadaAhora = golpeada === i && i === r.correcta;
              const moverX = golpeadaAhora ? caida.interpolate({ inputRange: [0, 1], outputRange: [0, geo.centro.x - p.x] }) : 0;
              const moverY = golpeadaAhora ? caida.interpolate({ inputRange: [0, 1], outputRange: [0, geo.centro.y - p.y] }) : 0;
              const achica = golpeadaAhora ? caida.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) : 1;
              return (
                <View key={`${paso}-${i}`} style={[styles.lugar, { left: p.x - 70, top: p.y - TAM_CHIBOLA / 2 }]}>
                  <Pressable
                    onPress={() => tirar(i)}
                    disabled={ocupado || !!resultado || probada}
                    accessibilityRole="button"
                    accessibilityLabel={t('chibolas.chibola', { texto: op })}
                    accessibilityState={{ disabled: ocupado || !!resultado || probada }}
                    style={[styles.blanco, probada ? styles.apagada : null]}
                  >
                    <Animated.View
                      style={[
                        apuntada === i ? styles.apuntada : null,
                        { transform: [{ translateX: moverX }, { translateY: moverY }, { scale: achica }] },
                      ]}
                    >
                      <Chibola tinte={COLORES_CHIBOLA[i % COLORES_CHIBOLA.length] as string} tam={TAM_CHIBOLA} />
                    </Animated.View>
                    <View style={[styles.rotulo, cae ? styles.rotuloBueno : null]}>
                      {conDibujos && tienePictograma(op) && <Pictograma es={op} tam={22} />}
                      <Text style={[styles.rotuloTexto, op.length > 14 ? styles.rotuloLargo : null]} numberOfLines={2}>
                        {op}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              );
            })}

            {/* Piko, al lado de la raya */}
            <View pointerEvents="none" style={[styles.piko, { left: geo.inicio.x - 150, top: geo.inicio.y - 100 }]}>
              <PikoMascota estado={estadoPiko} tam={104} />
            </View>

            {/* El tiro: se arrastra para apuntar */}
            <Animated.View
              {...pan.panHandlers}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.tiro,
                {
                  left: geo.inicio.x - TAM_TIRO / 2,
                  top: geo.inicio.y - TAM_TIRO / 2,
                  transform: [{ translateX: tiro.x }, { translateY: tiro.y }],
                },
              ]}
            >
              <Chibola tinte={COLOR_TIRO} tam={TAM_TIRO} />
            </Animated.View>
            {!resultado && !ocupado && paso === 0 && probadas.length === 0 && (
              <Text style={[styles.como, { top: geo.inicio.y + TAM_TIRO / 2 - 4 }]}>{t('chibolas.como')}</Text>
            )}
          </>
        )}
      </View>

      <BarraFeedback
        visible={resultado !== null}
        acerto={resultado === 'acierto'}
        titulo={resultado === 'acierto' ? `${frase} ${t('chibolas.al_hoyo')}` : frase}
        gloss={
          resultado === 'acierto'
            ? `${r.palabra.meta} = ${r.palabra.es}`
            : t(pista.enPalabras ? 'chibolas.pista_frase' : 'chibolas.pista', { inicial: pista.inicial, n: pista.largo })
        }
        etiquetaBoton={
          resultado === 'reboto' ? t('chibolas.tirar_otra_vez') : paso + 1 >= TIROS ? t('chibolas.terminar') : t('chibolas.seguir')
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
  progreso: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  bolita: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  bolitaVacia: { borderRadius: 9, borderWidth: 2, borderColor: color.bordeHondo, backgroundColor: 'rgba(255,255,255,0.7)' },
  tarjeta: {
    marginHorizontal: espacio.lg,
    marginTop: espacio.sm,
    minHeight: 100,
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
    width: 68,
    height: 68,
    borderRadius: radio.md,
    backgroundColor: color.papel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tarjetaTextos: { flex: 1, gap: 2 },
  etiqueta: { ...texto.etiqueta, fontSize: 11, color: color.tintaSuave },
  pregunta: { ...texto.cuerpo, fontSize: 15, lineHeight: 20, color: color.tinta },
  foco: { fontFamily: fuente.tituloFuerte, fontSize: 28, lineHeight: 32, color: color.verde },
  focoLargo: { fontFamily: fuente.tituloFuerte, fontSize: 20, lineHeight: 25, color: color.verde },
  oculto: { fontFamily: fuente.titulo, fontSize: 22, lineHeight: 30, letterSpacing: 6, color: color.cieloHondo },
  parlante: {
    width: 52,
    height: 52,
    borderRadius: radio.redondo,
    backgroundColor: color.cieloHondo,
    borderBottomWidth: labio.normal,
    borderBottomColor: '#1F7FB0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parlanteSonando: { backgroundColor: '#1F7FB0' },
  campo: { flex: 1, marginTop: espacio.lg },
  lugar: { position: 'absolute', width: 140, alignItems: 'center' },
  blanco: { alignItems: 'center', gap: 4, minWidth: 64, minHeight: 64 },
  apagada: { opacity: 0.35 },
  apuntada: { transform: [{ scale: 1.15 }] },
  rotulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 136,
    backgroundColor: 'rgba(255,253,244,0.92)',
    borderRadius: radio.sm,
    borderWidth: 2,
    borderColor: TIZA,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rotuloBueno: { backgroundColor: color.aciertoFondo, borderColor: color.acierto },
  rotuloTexto: { fontFamily: fuente.titulo, fontSize: 16, lineHeight: 20, color: color.grafito, flexShrink: 1, textAlign: 'center' },
  rotuloLargo: { fontFamily: fuente.cuerpoFuerte, fontSize: 13, lineHeight: 16 },
  destello: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: color.verdePasto,
  },
  piko: { position: 'absolute' },
  tiro: { position: 'absolute', width: TAM_TIRO, height: TAM_TIRO, zIndex: 4 },
  como: {
    position: 'absolute',
    left: espacio.xl,
    right: espacio.xl,
    textAlign: 'center',
    ...texto.chico,
    color: color.tinta,
  },
});
