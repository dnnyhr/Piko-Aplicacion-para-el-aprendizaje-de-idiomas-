/**
 * Una partida de Pikito Ciego.
 *
 * El patio está a oscuras: sólo se ve un círculo de luz alrededor de Piko,
 * que anda con los ojos vendados. Suena una palabra o una frase. Las
 * respuestas están escondidas en la oscuridad, marcadas apenas con un «?»:
 * al tocar uno, Piko camina hasta ahí y la luz la descubre. Nunca se ven
 * todas juntas, así que hay que guiarse por lo que se escuchó. Cuando la que
 * está a la luz es la que sonó, se toca «¡Es esta!». Ahí se prende la luz
 * del patio y se ve dónde estaba cada cosa.
 *
 * Liviano a propósito: la oscuridad es un solo dibujo con un degradado
 * circular que se traslada con `transform` (driver nativo); no se vuelve a
 * dibujar mientras Piko camina.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
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
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { BarraFeedback } from '../../exercises/BarraFeedback';
import { Boton } from '../../../ui/components/Boton';
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
  escondites,
  ESCUCHAS,
  partidaNueva,
  rachaFestejada,
  RADIO_LUZ,
  responder,
  RONDAS,
  soloSeEscuchan,
  type EstadoGallinita,
  type Ronda,
} from '../../../core/minijuegos/gallinita';
import { callar, decir, vozDePiko } from '../voz';
import { color, espacio, fuente, labio, radio, texto } from '../../../ui/tokens';
import { usePausaLogros } from '../../logros/store';

const HORIZONTE = 226;
const PIKO = 92;
const ANCHO_PIKO = (PIKO * 178) / 292;
const CAMINAR_MS = 700;
const ANCHO_ESCONDITE = 140;
/** El lado del dibujo de la oscuridad: alcanza para tapar el patio esté donde esté la luz. */
const LADO_OSCURIDAD = 2400;
const NOCHE = '#0D1422';

export interface JuegoGallinitaProps {
  rondas: readonly Ronda[];
  lengua: LenguaMinijuego;
  nivel: NivelMinijuego;
  sacuanjoches: number;
  onResponder: (palabra: Palabra, acerto: boolean, ms: number) => void;
  onTerminar: (final: EstadoGallinita) => void;
  onSalir: () => void;
}

/** `busca`: a oscuras, Piko va de escondite en escondite. `camina`: va en camino. `respuesta`: se prendió la luz. */
type Fase = 'busca' | 'camina' | 'respuesta';

interface Punto {
  x: number;
  y: number;
}

/** La oscuridad con un agujero de luz de radio `r` en el centro, con el borde difuso. */
function Oscuridad({ r }: { r: number }) {
  const mitad = LADO_OSCURIDAD / 2;
  const claro = r / mitad;
  return (
    <Svg width={LADO_OSCURIDAD} height={LADO_OSCURIDAD}>
      <Defs>
        <RadialGradient id="luz" cx={mitad} cy={mitad} r={mitad} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={NOCHE} stopOpacity={0} />
          <Stop offset={claro * 0.72} stopColor={NOCHE} stopOpacity={0} />
          <Stop offset={claro} stopColor={NOCHE} stopOpacity={0.7} />
          <Stop offset={claro * 1.25} stopColor={NOCHE} stopOpacity={0.95} />
          <Stop offset="1" stopColor={NOCHE} stopOpacity={0.95} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={LADO_OSCURIDAD} height={LADO_OSCURIDAD} fill="url(#luz)" />
    </Svg>
  );
}

export function JuegoGallinita({ rondas, lengua, nivel, sacuanjoches, onResponder, onTerminar, onSalir }: JuegoGallinitaProps) {
  // Un logro ganado a mitad de la ronda se festeja al terminarla.
  usePausaLogros();
  const { t, frases, idioma } = useTextos();
  const [indice, setIndice] = useState(0);
  const [partida, setPartida] = useState<EstadoGallinita>(partidaNueva);
  const [fase, setFase] = useState<Fase>('busca');
  const [visita, setVisita] = useState<number | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [visitadas, setVisitadas] = useState<number[]>([]);
  const [escuchas, setEscuchas] = useState(0);
  const [sonando, setSonando] = useState<number | 'pregunta' | null>(null);
  const [frase, setFrase] = useState('');
  const [festejo, setFestejo] = useState<string | null>(null);
  const [quieto, setQuieto] = useState(false);
  const [patio, setPatio] = useState<{ w: number; h: number } | null>(null);

  const camino = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const luz = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const apagon = useRef(new Animated.Value(1)).current;
  const pasos = useRef(new Animated.Value(0)).current;
  const cartel = useRef(new Animated.Value(0)).current;
  const relojes = useRef<ReturnType<typeof setTimeout>[]>([]);
  const desde = useRef(Date.now());

  const r = rondas[indice] as Ronda;
  const nombreLengua = t(`lengua.${lengua}`);
  const maximo = ESCUCHAS[nivel];
  const quedan = maximo === Infinity ? Infinity : Math.max(0, maximo - escuchas);
  const soloOido = soloSeEscuchan(r, nivel);
  const verDibujos = r.tipo === 'oye_dibujo';
  const altoEscondite = verDibujos ? 104 : 64;

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

  // Dónde arranca Piko, dónde está cada escondite y dónde se para Piko al llegar a uno.
  const geo = useMemo(() => {
    if (!patio) return null;
    const inicio = { x: patio.w / 2 - ANCHO_PIKO / 2, y: patio.h - PIKO - 8 };
    const centros = escondites(r.opciones.length).map((e) => ({ x: e.x * patio.w, y: e.y * patio.h + altoEscondite / 2 }));
    const paradas = centros.map((c) => ({
      x: Math.max(0, Math.min(patio.w - ANCHO_PIKO, c.x - ANCHO_PIKO / 2)),
      y: Math.min(patio.h - PIKO, c.y + altoEscondite / 2 - 10),
    }));
    return { inicio, centros, paradas };
  }, [patio, r.opciones.length, altoEscondite]);

  /** El centro de la luz cuando Piko está en `p` (arriba a la izquierda de Piko). */
  const luzSobre = (p: Punto): Punto => ({ x: p.x + ANCHO_PIKO / 2, y: p.y + PIKO * 0.45 });

  /** La palabra de la ronda. Cuenta para el límite de escuchas. */
  const escucharPregunta = (cuenta = true) => {
    if (r.tipo === 'dibujo_oye') return;
    if (cuenta && quedan <= 0) return;
    if (cuenta) setEscuchas((n) => n + 1);
    setSonando('pregunta');
    decir([vozDePalabra(lengua, r.palabra)], () => setSonando(null));
  };

  /** Una respuesta escondida, cuando sólo se escucha. Sin límite: son varias. */
  const escucharOpcion = (i: number) => {
    setSonando(i);
    decir([vozDe(lengua, r.opciones[i] as string, i === r.correcta ? r.palabra.tts : undefined)], () => setSonando(null));
  };

  // Cada ronda nueva: se apaga la luz, Piko vuelve abajo al centro y suena la palabra.
  useEffect(() => {
    desde.current = Date.now();
    setEscuchas(0);
    setVisita(null);
    setVisitadas([]);
    if (geo) {
      camino.setValue({ x: 0, y: 0 });
      luz.setValue(luzSobre(geo.inicio));
    }
    Animated.timing(apagon, { toValue: 1, duration: quieto ? 0 : 350, useNativeDriver: true }).start();
    if (r.tipo !== 'dibujo_oye') {
      luego(() => {
        setEscuchas(1);
        setSonando('pregunta');
        decir([vozDePalabra(lengua, r.palabra)], () => setSonando(null));
      }, 450);
    }
  }, [indice]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al medir el patio, la luz arranca sobre Piko.
  useEffect(() => {
    if (geo && visita === null && fase === 'busca') luz.setValue(luzSobre(geo.inicio));
  }, [geo]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Piko va a tantear el escondite `i`: camina hasta ahí y la luz lo descubre. */
  const ir = (i: number) => {
    if (!geo || fase !== 'busca') return;
    if (visita === i) {
      // Ya está ahí: si sólo se escucha, vuelve a sonar.
      if (soloOido) escucharOpcion(i);
      return;
    }
    callar();
    setFase('camina');
    setVisita(null);
    Haptics.selectionAsync().catch(() => undefined);
    const parada = geo.paradas[i] as Punto;
    const hasta = { x: parada.x - geo.inicio.x, y: parada.y - geo.inicio.y };
    pasos.setValue(0);
    const bamboleo = Animated.loop(
      Animated.sequence([
        Animated.timing(pasos, { toValue: 1, duration: 130, useNativeDriver: true }),
        Animated.timing(pasos, { toValue: 0, duration: 130, useNativeDriver: true }),
      ]),
      { iterations: Math.round(CAMINAR_MS / 260) },
    );
    const centro = geo.centros[i] as Punto;
    Animated.parallel([
      Animated.timing(camino, { toValue: hasta, duration: quieto ? 0 : CAMINAR_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      // La luz llega al escondite: queda entre lo escondido y Piko.
      Animated.timing(luz, {
        toValue: { x: centro.x, y: (centro.y + parada.y + PIKO * 0.3) / 2 },
        duration: quieto ? 0 : CAMINAR_MS,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      quieto ? Animated.delay(0) : bamboleo,
    ]).start(() => {
      pasos.setValue(0);
      setVisita(i);
      setVisitadas((v) => (v.includes(i) ? v : [...v, i]));
      setFase('busca');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      if (soloOido) escucharOpcion(i);
    });
  };

  /** «¡Es esta!»: responde con lo que está a la luz. */
  const confirmar = () => {
    if (fase !== 'busca' || visita === null) return;
    const i = visita;
    const acerto = i === r.correcta;
    onResponder(r.palabra, acerto, Date.now() - desde.current);
    const despues = responder(partida, acerto);
    setElegida(i);
    setPartida(despues);
    setFase('respuesta');
    callar();
    // Se prende la luz del patio: se ve dónde estaba cada cosa.
    Animated.timing(apagon, { toValue: 0.12, duration: quieto ? 0 : 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();

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
    const textoFestejo = perfecta
      ? t('gallinita.perfecta')
      : racha === 'gran'
        ? t('gallinita.gran_racha', { n: BONO_GRAN_RACHA })
        : racha === 'racha'
          ? t('gallinita.racha', { n: BONO_RACHA })
          : null;
    if (textoFestejo) {
      setFestejo(textoFestejo);
      cartel.setValue(0);
      Animated.sequence([
        Animated.spring(cartel, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
        Animated.delay(900),
        Animated.timing(cartel, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setFestejo(null));
    }
  };

  const seguir = () => {
    callar();
    if (indice + 1 >= RONDAS) {
      onTerminar(partida);
      return;
    }
    setIndice(indice + 1);
    setElegida(null);
    setFase('busca');
  };

  const acerto = fase === 'respuesta' && elegida === r.correcta;
  const estadoPiko: EstadoPiko =
    fase === 'respuesta' ? (acerto ? 'celebrando' : 'animando') : fase === 'camina' ? 'idle' : sonando !== null ? 'pensando' : 'idle';
  const pregunta = t(`gallinita.pregunta_${r.tipo}`);
  const sube = pasos.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const gira = pasos.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });
  const enLuz = (i: number) => fase === 'respuesta' || visita === i;

  const estiloEscondite = (i: number) => {
    if (fase !== 'respuesta') return visita === i ? styles.esconditeALaLuz : null;
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
          {r.tipo !== 'dibujo_oye' && maximo !== Infinity && fase !== 'respuesta' && (
            <Text style={styles.quedan}>{quedan > 0 ? t('gallinita.escuchas_quedan', { n: quedan }) : t('gallinita.sin_escuchas')}</Text>
          )}
        </View>
        {r.tipo !== 'dibujo_oye' && (
          <Pressable
            onPress={() => escucharPregunta()}
            disabled={quedan <= 0 && fase !== 'respuesta'}
            accessibilityRole="button"
            accessibilityLabel={t('gallinita.escuchar')}
            accessibilityState={{ disabled: quedan <= 0 && fase !== 'respuesta' }}
            style={[styles.parlante, sonando === 'pregunta' ? styles.parlanteSonando : null, quedan <= 0 && fase !== 'respuesta' ? styles.parlanteApagado : null]}
          >
            <Parlante tam={32} />
          </Pressable>
        )}
      </View>

      <View style={styles.patio} onLayout={(e: LayoutChangeEvent) => setPatio({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {geo && (
          <>
            {/* Lo escondido: queda debajo de la oscuridad */}
            {r.opciones.map((op, i) => {
              const c = geo.centros[i] as Punto;
              const mostrar = enLuz(i);
              return (
                <View
                  key={`${indice}-${i}`}
                  pointerEvents="none"
                  style={[
                    styles.escondite,
                    verDibujos ? styles.esconditeDibujo : null,
                    { left: c.x - ANCHO_ESCONDITE / 2, top: c.y - altoEscondite / 2, height: altoEscondite },
                    estiloEscondite(i),
                  ]}
                >
                  {soloOido && fase !== 'respuesta' ? (
                    <View style={[styles.soloOido, mostrar ? null : styles.oculto]}>
                      <View style={[styles.parlanteChico, sonando === i ? styles.parlanteSonando : null]}>
                        <Parlante tam={20} />
                      </View>
                      <Text style={styles.opcionTexto}>{t('gallinita.opcion', { n: i + 1 })}</Text>
                    </View>
                  ) : (
                    <>
                      {verDibujos && mostrar && <Pictograma es={op} tam={52} />}
                      <Text
                        style={[styles.opcionTexto, verDibujos ? styles.opcionPie : null, op.length > 16 ? styles.opcionLarga : null]}
                        numberOfLines={2}
                      >
                        {mostrar ? op : ''}
                      </Text>
                    </>
                  )}
                </View>
              );
            })}

            {/* La oscuridad, con el círculo de luz que sigue a Piko */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.oscuridad,
                {
                  opacity: apagon,
                  transform: [
                    { translateX: Animated.subtract(luz.x, LADO_OSCURIDAD / 2) },
                    { translateY: Animated.subtract(luz.y, LADO_OSCURIDAD / 2) },
                  ],
                },
              ]}
            >
              <Oscuridad r={RADIO_LUZ[nivel]} />
            </Animated.View>

            {/* Las marcas en la oscuridad: dónde se puede ir a tantear */}
            {r.opciones.map((op, i) => {
              const c = geo.centros[i] as Punto;
              const aca = visita === i;
              return (
                <Pressable
                  key={`marca-${indice}-${i}`}
                  testID={`escondite-${i}`}
                  onPress={() => ir(i)}
                  disabled={fase !== 'busca'}
                  accessibilityRole="button"
                  accessibilityLabel={aca && !soloOido ? op : t('gallinita.ir', { n: i + 1 })}
                  accessibilityState={{ disabled: fase !== 'busca', selected: aca }}
                  style={[styles.marca, { left: c.x - ANCHO_ESCONDITE / 2, top: c.y - altoEscondite / 2, height: altoEscondite }]}
                >
                  {!aca && fase !== 'respuesta' && (
                    <View style={[styles.signo, visitadas.includes(i) ? styles.signoVisto : null]}>
                      <Text style={styles.signoTexto}>?</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}

            {/* Piko, vendado: siempre se ve */}
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.piko,
                {
                  left: geo.inicio.x,
                  top: geo.inicio.y,
                  transform: [{ translateX: camino.x }, { translateY: camino.y }, { translateY: sube }, { rotate: gira }],
                },
              ]}
            >
              <PikoMascota estado={estadoPiko} tam={PIKO} accesorio={<Venda />} />
            </Animated.View>

            {fase !== 'respuesta' && visita === null && (
              <View pointerEvents="none" style={styles.como}>
                <Text style={styles.comoTexto}>{t('gallinita.como')}</Text>
              </View>
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
          </>
        )}
      </View>

      {fase !== 'respuesta' && (
        <View style={styles.pie}>
          <Boton ancho onPress={confirmar} disabled={visita === null || fase !== 'busca'}>
            {visita === null ? t('gallinita.busca') : t('gallinita.es_esta')}
          </Boton>
        </View>
      )}

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
    zIndex: 2,
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
  patio: { flex: 1, marginTop: espacio.md, overflow: 'hidden' },
  oscuridad: { position: 'absolute', left: 0, top: 0, width: LADO_OSCURIDAD, height: LADO_OSCURIDAD },
  escondite: {
    position: 'absolute',
    width: ANCHO_ESCONDITE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,253,244,0.95)',
    borderWidth: 3,
    borderColor: TIZA,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.sm,
  },
  esconditeDibujo: { paddingTop: 4 },
  esconditeALaLuz: { borderColor: color.pico },
  opcionBuena: { backgroundColor: color.aciertoFondo, borderColor: color.acierto },
  opcionOtra: { backgroundColor: color.intentoFondo, borderColor: color.intento },
  opcionApagada: { opacity: 0.55 },
  opcionTexto: { fontFamily: fuente.titulo, fontSize: 17, lineHeight: 21, color: color.grafito, textAlign: 'center' },
  opcionPie: { fontSize: 14, lineHeight: 18, color: color.tinta },
  opcionLarga: { fontFamily: fuente.cuerpoFuerte, fontSize: 13, lineHeight: 17 },
  soloOido: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  oculto: { opacity: 0 },
  parlanteChico: {
    width: 36,
    height: 36,
    borderRadius: radio.redondo,
    backgroundColor: color.cieloHondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marca: { position: 'absolute', width: ANCHO_ESCONDITE, alignItems: 'center', justifyContent: 'center' },
  signo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,253,244,0.55)',
    backgroundColor: 'rgba(255,253,244,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signoVisto: { borderStyle: 'dashed', backgroundColor: 'rgba(255,253,244,0.05)' },
  signoTexto: { fontFamily: fuente.tituloFuerte, fontSize: 20, color: 'rgba(255,253,244,0.8)' },
  piko: { position: 'absolute' },
  como: {
    position: 'absolute',
    left: espacio.lg,
    right: espacio.lg,
    bottom: PIKO + 18,
    alignItems: 'center',
  },
  comoTexto: {
    ...texto.chico,
    color: '#F3EBD5',
    textAlign: 'center',
    backgroundColor: 'rgba(13,20,34,0.75)',
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.xs,
    overflow: 'hidden',
  },
  pie: { paddingHorizontal: espacio.lg, paddingVertical: espacio.sm, backgroundColor: NOCHE },
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
