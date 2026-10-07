/**
 * Una partida de chibolas.
 *
 * En la rueda de tiza hay una chibola por respuesta, alrededor del hoyito.
 * Se tira como de verdad: se agarra el tiro, se estira hacia atrás (la línea
 * de puntos dice hacia dónde va a salir) y se suelta. El tiro vuela hasta la
 * chibola que queda en esa dirección y se detiene al tocarla. Si es la
 * correcta, cae al hoyito; si no, el tiro rebota, Piko da una pista y se
 * vuelve a tirar.
 *
 * Sin motor de físicas: el vuelo es un traslado en línea recta, con
 * `transform` y el driver nativo. Mientras se apunta no se vuelve a dibujar la
 * pantalla en cada movimiento del dedo: la chibola estirada y la línea se
 * mueven con valores animados, y el estado cambia sólo cuando cambia la
 * chibola apuntada. Así anda en un Android de gama baja.
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
import { Sacuanjoche } from '../../../ui/arbol/Sacuanjoche';
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
import { ARRASTRE_MAXIMO, chibolaAlcanzada, leerArrastre, puntoDeImpacto, TIROS } from '../../../core/minijuegos/chibolas';
import { callar, decir, vozDePiko } from '../voz';
import { color, espacio, fuente, labio, radio, texto } from '../../../ui/tokens';
import { usePausaLogros } from '../../logros/store';

const HORIZONTE = 236;
const TAM_CHIBOLA = 46;
const TAM_TIRO = 40;
/** La zona donde se agarra el tiro: mucho más grande que la chibola, para que no haga falta puntería con el dedo. */
const AGARRE = 120;
/** Velocidad del vuelo, en puntos por milisegundo (con un mínimo y un máximo de duración). */
const VELOCIDAD = 0.9;
/** Largo de la línea de puntos y cuántos puntos la forman. */
const LARGO_MIRA = 150;
const PUNTOS_MIRA = 7;
/** Si una animación no termina (la app se fue al fondo, por ejemplo), el tiro se destraba solo. */
const DESTRABE_MS = 2600;

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

/** Las flores del festejo: salen del hoyito para los costados. */
const FLORES = [
  { x: -70, y: -60 },
  { x: 70, y: -60 },
  { x: -95, y: 5 },
  { x: 95, y: 5 },
  { x: -45, y: 55 },
  { x: 45, y: 55 },
];

export function JuegoChibolas({ retos, lengua, nivel, sacuanjoches, onResponder, onTerminar, onSalir }: JuegoChibolasProps) {
  // Un logro ganado a mitad de la ronda se festeja al terminarla.
  usePausaLogros();
  const { t, frases, idioma } = useTextos();
  const [paso, setPaso] = useState(0);
  const [probadas, setProbadas] = useState<number[]>([]);
  const [golpeada, setGolpeada] = useState<number | null>(null);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [frase, setFrase] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [sonando, setSonando] = useState(false);
  const [apuntando, setApuntando] = useState(false);
  const [apuntada, setApuntada] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [campo, setCampo] = useState<{ w: number; h: number } | null>(null);
  const [quieto, setQuieto] = useState(false);

  const primeros = useRef(0);
  const desde = useRef(Date.now());
  const relojes = useRef<ReturnType<typeof setTimeout>[]>([]);
  const destrabe = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** El tiro, relativo a su lugar en la raya. */
  const tiro = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  /** La línea de puntos: hacia dónde y qué tan estirado. */
  const mira = useRef(new Animated.Value(0)).current;
  const fuerza = useRef(new Animated.Value(0)).current;
  /** La chibola golpeada: cae al hoyito, o tiembla si no era. */
  const caida = useRef(new Animated.Value(0)).current;
  const tiembla = useRef(new Animated.Value(0)).current;
  const destello = useRef(new Animated.Value(0)).current;
  const festejo = useRef(new Animated.Value(0)).current;

  const r = retos[paso] as Reto;
  const nombreLengua = t(`lengua.${lengua}`);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setQuieto)
      .catch(() => undefined);
    return () => {
      relojes.current.forEach(clearTimeout);
      if (destrabe.current) clearTimeout(destrabe.current);
      callar();
    };
  }, []);

  const luego = (fn: () => void, ms: number) => {
    relojes.current.push(setTimeout(fn, ms));
  };

  // La geometría del patio: la rueda arriba, el tiro abajo al centro.
  const geo = useMemo(() => {
    if (!campo) return null;
    // Abajo del tiro queda lugar para estirarlo entero sin que se salga de la pantalla.
    const inicio = { x: campo.w / 2, y: campo.h - TAM_TIRO / 2 - ARRASTRE_MAXIMO - 12 };
    const radioRueda = Math.min(campo.w * 0.44, (inicio.y - TAM_TIRO - 150) / 2);
    const centro = { x: campo.w / 2, y: radioRueda + 16 };
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
    tiembla.setValue(0);
    festejo.setValue(0);
    if (r.tipo === 'audio') luego(escuchar, 350);
  }, [paso]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Las chibolas que todavía se pueden tirar en esta pregunta. */
  const libres = r.opciones.map((_, i) => i).filter((i) => !probadas.includes(i));

  /** Si algo se traba, el tiro vuelve a la mano y se puede seguir tirando. */
  const armarDestrabe = () => {
    if (destrabe.current) clearTimeout(destrabe.current);
    destrabe.current = setTimeout(() => {
      setOcupado((o) => {
        if (o) tiro.setValue({ x: 0, y: 0 });
        return false;
      });
    }, DESTRABE_MS);
  };
  const soltarDestrabe = () => {
    if (destrabe.current) clearTimeout(destrabe.current);
    destrabe.current = null;
  };

  /**
   * Lanza el tiro desde donde quedó estirado (`suelto`) hasta la chibola `i`.
   * Lo usa el gesto y, para quien usa lector de pantalla, la acción de cada chibola.
   */
  const lanzar = (i: number, suelto: Punto = { x: 0, y: 0 }) => {
    if (!geo || ocupado || resultado || probadas.includes(i)) return;
    const primerTiro = probadas.length === 0;
    const acerto = i === r.correcta;
    if (primerTiro) {
      onResponder(r.palabra, acerto, Date.now() - desde.current);
      if (acerto) primeros.current += 1;
    }
    setOcupado(true);
    setApuntada(null);
    setGolpeada(i);
    setAviso(null);
    armarDestrabe();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);

    const blanco = geo.puntos[i] as Punto;
    const salida = { x: geo.inicio.x + suelto.x, y: geo.inicio.y + suelto.y };
    const choque = puntoDeImpacto(salida, blanco, (TAM_CHIBOLA + TAM_TIRO) / 2 - 4);
    const hasta = { x: choque.x - geo.inicio.x, y: choque.y - geo.inicio.y };
    const distancia = Math.hypot(choque.x - salida.x, choque.y - salida.y);
    const vuelo = Animated.timing(tiro, {
      toValue: hasta,
      duration: quieto ? 0 : Math.max(220, Math.min(520, distancia / VELOCIDAD)),
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });

    if (acerto) {
      const dicho = elegir(frases('piko.acierto'));
      setFrase(dicho);
      vuelo.start(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        destello.setValue(0);
        festejo.setValue(0);
        Animated.parallel([
          Animated.timing(caida, { toValue: 1, duration: quieto ? 0 : 480, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(destello, { toValue: 1, duration: quieto ? 0 : 600, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(festejo, { toValue: 1, duration: quieto ? 0 : 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          // El tiro se queda donde pegó, apenas empujado hacia atrás.
          Animated.timing(tiro, {
            toValue: { x: hasta.x * 0.92, y: hasta.y * 0.92 },
            duration: quieto ? 0 : 200,
            useNativeDriver: true,
          }),
        ]).start();
        decir([vozDePiko(dicho, idioma), vozDePalabra(lengua, r.palabra)]);
        luego(() => {
          soltarDestrabe();
          setResultado('acierto');
          setOcupado(false);
        }, 420);
      });
    } else {
      const dicho = elegir(frases('piko.chibola_rebota'));
      setFrase(dicho);
      vuelo.start(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        tiembla.setValue(0);
        Animated.parallel([
          // La chibola golpeada se sacude…
          Animated.timing(tiembla, { toValue: 1, duration: quieto ? 0 : 420, easing: Easing.linear, useNativeDriver: true }),
          // …y el tiro rebota hacia atrás.
          Animated.timing(tiro, {
            toValue: { x: hasta.x * 0.45, y: hasta.y * 0.45 },
            duration: quieto ? 0 : 420,
            easing: Easing.out(Easing.bounce),
            useNativeDriver: true,
          }),
        ]).start(() => {
          soltarDestrabe();
          decir([vozDePiko(dicho, idioma)]);
          setProbadas((p) => [...p, i]);
          setResultado('reboto');
          setOcupado(false);
        });
      });
    }
  };

  // El gesto vive en un ref: el PanResponder se arma una sola vez.
  const lanzarRef = useRef(lanzar);
  lanzarRef.current = lanzar;
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const libresRef = useRef(libres);
  libresRef.current = libres;
  const listoRef = useRef(false);
  listoRef.current = !ocupado && !resultado;
  const apuntadaRef = useRef<number | null>(null);

  const blancoDe = (angulo: number): number | undefined => {
    const g = geoRef.current;
    const posibles = libresRef.current;
    if (!g || posibles.length === 0) return undefined;
    return posibles[chibolaAlcanzada(angulo, posibles.map((k) => g.angulos[k] as { angulo: number }))];
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => listoRef.current,
        onMoveShouldSetPanResponder: () => listoRef.current,
        // Nadie le roba el gesto mientras se apunta (un scroll, un gesto del sistema).
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          Haptics.selectionAsync().catch(() => undefined);
          tiro.setValue({ x: 0, y: 0 });
          fuerza.setValue(0);
          apuntadaRef.current = null;
          setAviso(null);
          setApuntando(true);
        },
        onPanResponderMove: (_, g) => {
          const a = leerArrastre(g.dx, g.dy);
          tiro.setValue({ x: a.x, y: a.y });
          mira.setValue(a.angulo);
          fuerza.setValue(a.lanza ? a.fuerza : 0);
          const i = a.lanza ? blancoDe(a.angulo) : undefined;
          const nueva = i ?? null;
          if (nueva !== apuntadaRef.current) {
            apuntadaRef.current = nueva;
            setApuntada(nueva);
            if (nueva !== null) Haptics.selectionAsync().catch(() => undefined);
          }
        },
        onPanResponderRelease: (_, g) => {
          const a = leerArrastre(g.dx, g.dy);
          setApuntando(false);
          setApuntada(null);
          apuntadaRef.current = null;
          fuerza.setValue(0);
          const i = a.lanza ? blancoDe(a.angulo) : undefined;
          if (i === undefined) {
            // Un toque o un estirón muy corto: el tiro vuelve y Piko explica.
            Animated.spring(tiro, { toValue: { x: 0, y: 0 }, friction: 5, tension: 120, useNativeDriver: true }).start();
            setAviso(t('chibolas.estira_mas'));
            return;
          }
          lanzarRef.current(i, { x: a.x, y: a.y });
        },
        onPanResponderTerminate: () => {
          setApuntando(false);
          setApuntada(null);
          apuntadaRef.current = null;
          fuerza.setValue(0);
          Animated.spring(tiro, { toValue: { x: 0, y: 0 }, friction: 5, tension: 120, useNativeDriver: true }).start();
        },
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const seguir = () => {
    if (resultado === 'reboto') {
      Animated.timing(tiro, { toValue: { x: 0, y: 0 }, duration: quieto ? 0 : 180, useNativeDriver: true }).start();
      tiembla.setValue(0);
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

  const estadoPiko: EstadoPiko = resultado === 'acierto' ? 'celebrando' : resultado === 'reboto' ? 'animando' : apuntando ? 'pensando' : 'idle';
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
  const ayuda = aviso ?? (!resultado && !ocupado && paso === 0 && probadas.length === 0 ? t('chibolas.como') : null);

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
            {/* La rueda de tiza, el hoyito y la raya de tiro */}
            <Svg width={campo!.w} height={campo!.h} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Circle cx={geo.centro.x} cy={geo.centro.y} r={geo.radioRueda} fill="none" stroke={TIZA} strokeWidth={3} />
              <Circle cx={geo.centro.x} cy={geo.centro.y} r={11} fill="#8A6A45" stroke="#6E5233" strokeWidth={2} />
              <Line
                x1={geo.inicio.x - 70}
                y1={geo.inicio.y - TAM_TIRO / 2 - 10}
                x2={geo.inicio.x + 70}
                y2={geo.inicio.y - TAM_TIRO / 2 - 10}
                stroke={TIZA}
                strokeWidth={3}
                strokeDasharray="8 6"
              />
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
              const golpeadaAhora = golpeada === i;
              const buena = golpeadaAhora && i === r.correcta;
              const mala = golpeadaAhora && i !== r.correcta;
              const moverX = buena
                ? caida.interpolate({ inputRange: [0, 1], outputRange: [0, geo.centro.x - p.x] })
                : mala
                  ? tiembla.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -7, 7, -5, 3, 0] })
                  : 0;
              const moverY = buena ? caida.interpolate({ inputRange: [0, 1], outputRange: [0, geo.centro.y - p.y] }) : 0;
              const achica = buena ? caida.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) : 1;
              return (
                <View
                  key={`${paso}-${i}`}
                  pointerEvents="none"
                  style={[styles.lugar, { left: p.x - 70, top: p.y - TAM_CHIBOLA / 2 }]}
                >
                  <View
                    // Para lectores de pantalla: la acción de la chibola es tirarle.
                    testID={`chibola-${i}`}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel={t('chibolas.chibola', { texto: op })}
                    accessibilityHint={t('chibolas.como')}
                    accessibilityState={{ disabled: ocupado || !!resultado || probada }}
                    accessibilityActions={[{ name: 'activate' }]}
                    onAccessibilityAction={() => lanzar(i)}
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
                    <View style={[styles.rotulo, apuntada === i ? styles.rotuloApuntado : null, cae ? styles.rotuloBueno : null, mala && resultado ? styles.rotuloMalo : null]}>
                      {conDibujos && tienePictograma(op) && <Pictograma es={op} tam={22} />}
                      <Text style={[styles.rotuloTexto, op.length > 14 ? styles.rotuloLargo : null]} numberOfLines={2}>
                        {op}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* El festejo: sacuanjoches que salen del hoyito */}
            {resultado === 'acierto' &&
              FLORES.map((f, k) => (
                <Animated.View
                  key={k}
                  pointerEvents="none"
                  style={[
                    styles.flor,
                    {
                      left: geo.centro.x - 13,
                      top: geo.centro.y - 13,
                      opacity: festejo.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                      transform: [
                        { translateX: festejo.interpolate({ inputRange: [0, 1], outputRange: [0, f.x] }) },
                        { translateY: festejo.interpolate({ inputRange: [0, 1], outputRange: [0, f.y] }) },
                        { rotate: festejo.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${k % 2 ? 160 : -160}deg`] }) },
                      ],
                    },
                  ]}
                >
                  <Sacuanjoche tam={26} />
                </Animated.View>
              ))}

            {/* Piko, al lado de la raya */}
            <View pointerEvents="none" style={[styles.piko, { left: geo.inicio.x - 160, top: geo.inicio.y - 96 }]}>
              <PikoMascota estado={estadoPiko} tam={104} />
            </View>

            {/* La mira: puntos desde el tiro hacia donde va a salir */}
            {apuntando && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.mira,
                  {
                    left: geo.inicio.x - 6,
                    top: geo.inicio.y - LARGO_MIRA,
                    opacity: fuerza.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0.6, 1] }),
                    transform: [
                      { translateX: tiro.x },
                      { translateY: tiro.y },
                      { rotate: mira.interpolate({ inputRange: [-180, 180], outputRange: ['-180deg', '180deg'] }) },
                    ],
                  },
                ]}
              >
                {Array.from({ length: PUNTOS_MIRA }, (_, k) => (
                  <View key={k} style={[styles.puntoMira, { opacity: 0.35 + k * 0.1, transform: [{ scale: 0.7 + k * 0.05 }] }]} />
                ))}
              </Animated.View>
            )}

            {/* El tiro: se agarra desde una zona grande y se estira hacia atrás */}
            <View
              {...pan.panHandlers}
              testID="tiro"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.agarre, { left: geo.inicio.x - AGARRE / 2, top: geo.inicio.y - AGARRE / 2 }]}
            >
              <Animated.View
                pointerEvents="none"
                style={[styles.tiro, apuntando ? styles.tiroAgarrado : null, { transform: [{ translateX: tiro.x }, { translateY: tiro.y }] }]}
              >
                <Chibola tinte={COLOR_TIRO} tam={TAM_TIRO} />
              </Animated.View>
            </View>

            {ayuda && (
              <View pointerEvents="none" style={[styles.comoCaja, { top: geo.inicio.y - 146 }]}>
                <Text style={[styles.como, aviso ? styles.aviso : null]}>{ayuda}</Text>
              </View>
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
  apuntada: { transform: [{ scale: 1.18 }] },
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
  rotuloApuntado: { borderColor: color.verde, backgroundColor: color.blanco },
  rotuloBueno: { backgroundColor: color.aciertoFondo, borderColor: color.acierto },
  rotuloMalo: { backgroundColor: color.intentoFondo, borderColor: color.intento },
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
  flor: { position: 'absolute', width: 26, height: 26 },
  piko: { position: 'absolute' },
  // La mira mide el doble de largo y gira sobre su centro, que es el tiro: los puntos van en la mitad de arriba.
  mira: {
    position: 'absolute',
    width: 12,
    height: LARGO_MIRA * 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: (LARGO_MIRA - PUNTOS_MIRA * 10) / PUNTOS_MIRA,
  },
  puntoMira: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.blanco, borderWidth: 2, borderColor: color.verde },
  agarre: {
    position: 'absolute',
    width: AGARRE,
    height: AGARRE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  tiro: {
    width: TAM_TIRO + 8,
    height: TAM_TIRO + 8,
    borderRadius: (TAM_TIRO + 8) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,253,244,0.8)',
  },
  tiroAgarrado: { borderColor: color.verde },
  comoCaja: {
    position: 'absolute',
    left: espacio.xl,
    right: espacio.xl,
    backgroundColor: 'rgba(255,253,244,0.92)',
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
  },
  como: {
    textAlign: 'center',
    ...texto.chico,
    color: color.tinta,
  },
  aviso: { ...texto.cuerpoFuerte, fontSize: 14, color: color.verdeHondo },
});
