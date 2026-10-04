/**
 * Una partida de trompo.
 *
 * Piko tiene el trompo enrollado; se lanza con un toque y, mientras gira,
 * salen los retos con tiempo. Acertar le da fuerza (gira más rápido y más
 * derecho); fallar o quedarse sin tiempo se la quita (se sacude, se tambalea
 * y frena). Con `META` aciertos se gana; sin fuerza, el trompo cae.
 *
 * Rápido a propósito: después de cada respuesta no hay que tocar nada, el
 * reto siguiente aparece solo.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Boton } from '../../../ui/components/Boton';
import { Opcion, type EstadoOpcion } from '../../../ui/components/Opcion';
import { ContadorSacuanjoches } from '../../../ui/arbol/ContadorSacuanjoches';
import { Escena } from '../../../ui/minijuegos/Escena';
import { Cerrar, Globito, Parlante } from '../../../ui/minijuegos/Iconos';
import { Pictograma, tienePictograma } from '../../../ui/minijuegos/Pictograma';
import { Trompo, type EstadoTrompo as EstadoDibujo } from '../../../ui/minijuegos/Trompo';
import { PikoMascota } from '../../../ui/piko/PikoMascota';
import type { EstadoPiko } from '../../../ui/piko/sprites';
import { elegir } from '../../../ui/piko/frases';
import { useTextos } from '../../../ui/textos/useTextos';
import { vozDePalabra, type LenguaMinijuego, type NivelMinijuego, type Palabra } from '../../../core/minijuegos/vocabulario';
import {
  META,
  partidaNueva,
  rachaFestejada,
  responder,
  SEGUNDOS,
  type EstadoTrompo,
  type Reto,
} from '../../../core/minijuegos/trompo';
import { callar, decir, vozDePiko } from '../voz';
import { color, espacio, fuente, labio, radio, texto } from '../../../ui/tokens';

/** Segundos de más en los retos de audio: lo que tarda Piko en decirlo. */
const EXTRA_AUDIO = 2;
const PAUSA_ACIERTO = 900;
const PAUSA_FALLO = 1800;

export interface JuegoTrompoProps {
  retos: readonly Reto[];
  lengua: LenguaMinijuego;
  nivel: NivelMinijuego;
  sacuanjoches: number;
  onResponder: (palabra: Palabra, acerto: boolean, ms: number) => void;
  onTerminar: (final: EstadoTrompo) => void;
  onSalir: () => void;
}

type Fase = 'listo' | 'lanzando' | 'reto' | 'respuesta' | 'final';

export function JuegoTrompo({ retos, lengua, nivel, sacuanjoches, onResponder, onTerminar, onSalir }: JuegoTrompoProps) {
  const { t, frases, idioma } = useTextos();
  const [fase, setFase] = useState<Fase>('listo');
  const [partida, setPartida] = useState<EstadoTrompo>(partidaNueva);
  /** El reto en pantalla. Avanza recién cuando aparece el siguiente, no al responder. */
  const [indice, setIndice] = useState(0);
  const [elegida, setElegida] = useState<number | null>(null);
  const [tiempoAgotado, setTiempoAgotado] = useState(false);
  const [golpes, setGolpes] = useState(0);
  const [impulsos, setImpulsos] = useState(0);
  const [festejo, setFestejo] = useState<'racha' | 'gran' | null>(null);
  const [sonando, setSonando] = useState(false);
  const [poco, setPoco] = useState(false);

  const reloj = useRef(new Animated.Value(1)).current;
  const cartel = useRef(new Animated.Value(0)).current;
  const relojes = useRef<ReturnType<typeof setTimeout>[]>([]);
  const desde = useRef(0);
  const vivo = useRef(true);

  const r = retos[Math.min(indice, retos.length - 1)] as Reto;
  const nombreLengua = t(`lengua.${lengua}`);

  const luego = (fn: () => void, ms: number) => {
    relojes.current.push(setTimeout(() => vivo.current && fn(), ms));
  };
  const limpiar = () => {
    relojes.current.forEach(clearTimeout);
    relojes.current = [];
  };
  useEffect(
    () => () => {
      vivo.current = false;
      limpiar();
      callar();
    },
    [],
  );

  const escuchar = () => {
    setSonando(true);
    decir([vozDePalabra(lengua, r.palabra)], () => setSonando(false));
  };

  // Cada reto nuevo: arranca el tiempo y, si es de audio, Piko lo dice.
  useEffect(() => {
    if (fase !== 'reto') return;
    const segundos = SEGUNDOS[nivel] + (r.tipo === 'audio' ? EXTRA_AUDIO : 0);
    desde.current = Date.now();
    setPoco(false);
    reloj.setValue(1);
    Animated.timing(reloj, { toValue: 0, duration: segundos * 1000, easing: Easing.linear, useNativeDriver: true }).start();
    luego(() => setPoco(true), segundos * 700);
    luego(() => contestar(null), segundos * 1000);
    if (r.tipo === 'audio') luego(escuchar, 250);
  }, [fase, indice]); // eslint-disable-line react-hooks/exhaustive-deps

  const lanzar = () => {
    setFase('lanzando');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    luego(() => setFase('reto'), 650);
  };

  /** `i` null: se acabó el tiempo. */
  const contestar = (i: number | null) => {
    if (fase !== 'reto' && i !== null) return;
    limpiar();
    reloj.stopAnimation();
    const acerto = i === r.correcta;
    onResponder(r.palabra, acerto, Date.now() - desde.current);
    const despues = responder(partida, acerto);
    setElegida(i);
    setTiempoAgotado(i === null);
    setPartida(despues);
    setFase('respuesta');

    const racha = acerto ? rachaFestejada(despues.racha) : null;
    if (acerto) {
      setImpulsos((n) => n + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      const voces = [vozDePalabra(lengua, r.palabra)];
      if (racha) voces.push(vozDePiko(t(racha === 'gran' ? 'trompo.gran_racha' : 'trompo.racha'), idioma));
      decir(voces);
    } else {
      setGolpes((n) => n + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      decir([vozDePiko(elegir(frases('piko.intento')), idioma), vozDePalabra(lengua, r.palabra)]);
    }
    if (racha) {
      setFestejo(racha);
      cartel.setValue(0);
      Animated.sequence([
        Animated.spring(cartel, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(cartel, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setFestejo(null));
    }

    const pausa = acerto ? PAUSA_ACIERTO : PAUSA_FALLO;
    luego(() => {
      if (despues.fin) {
        setFase('final');
        luego(() => onTerminar(despues), despues.fin === 'completado' ? 1500 : 1100);
        return;
      }
      setElegida(null);
      setTiempoAgotado(false);
      setIndice(despues.reto);
      setFase('reto');
    }, pausa);
  };

  const ultimaBuena = fase === 'respuesta' && elegida === r.correcta;
  const estadoPiko: EstadoPiko =
    fase === 'listo'
      ? 'saludando'
      : fase === 'final'
        ? partida.fin === 'completado'
          ? 'celebrando'
          : 'animando'
        : festejo
          ? 'celebrando'
          : fase === 'respuesta'
            ? ultimaBuena
              ? 'alegre'
              : 'animando'
            : 'pensando';
  const estadoDibujo: EstadoDibujo =
    fase === 'listo' ? 'listo' : fase === 'lanzando' ? 'lanzando' : fase === 'final' && partida.fin !== 'completado' ? 'cayendo' : 'girando';

  const estadoOpcion = (i: number): EstadoOpcion => {
    if (fase !== 'respuesta' && fase !== 'final') return 'normal';
    if (i === r.correcta) return 'correcta';
    return i === elegida ? 'fallada' : 'normal';
  };
  const conDibujos = nivel === 'inicial' && !r.opcionesEnMeta;
  const pregunta =
    r.tipo === 'traduccion'
      ? t('trompo.pregunta_traduccion', { lengua: nombreLengua })
      : r.tipo === 'significado'
        ? t('trompo.pregunta_significado')
        : r.tipo === 'imagen'
          ? t('trompo.pregunta_imagen', { lengua: nombreLengua })
          : r.opcionesEnMeta
            ? t('trompo.pregunta_audio')
            : t('trompo.pregunta_audio_frase');
  const verFoco = r.tipo === 'traduccion' || r.tipo === 'significado' || (r.tipo === 'audio' && fase !== 'reto');
  const enJuego = fase === 'reto' || fase === 'respuesta' || fase === 'final';
  const escalaCartel = cartel.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={styles.raiz}>
      <Escena horizonte={HORIZONTE} />

      <View style={styles.cabecera}>
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel={t('trompo.salir')} style={styles.redondo}>
          <Cerrar />
        </Pressable>
        <View style={styles.marcador} accessible accessibilityLabel={t('trompo.aciertos', { n: partida.aciertos, meta: META })}>
          <View style={styles.puntitos}>
            {Array.from({ length: META }, (_, i) => (
              <View key={i} style={[styles.puntito, i < partida.aciertos ? styles.puntitoLleno : null]} />
            ))}
          </View>
          <Text style={styles.puntos}>{t('trompo.puntos', { n: partida.puntos })}</Text>
        </View>
        <ContadorSacuanjoches total={sacuanjoches} />
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel={t('practicar.elegir_lengua')} style={styles.redondo}>
          <Globito tam={22} tinta={color.tinta} />
        </Pressable>
      </View>

      {enJuego ? (
        <View style={styles.tarjeta}>
          {r.tipo === 'imagen' && (
            <View style={styles.dibujo}>
              <Pictograma es={r.palabra.es} tam={60} />
            </View>
          )}
          <View style={styles.tarjetaTextos}>
            <Text style={styles.etiqueta}>
              {t('trompo.etiqueta', { lengua: nombreLengua, nivel: t(`minijuegos.nivel_${nivel}`) })}
            </Text>
            <Text style={styles.pregunta}>{pregunta}</Text>
            {verFoco ? (
              <Text style={r.foco.length > 14 ? styles.focoLargo : styles.foco} numberOfLines={2}>
                {r.tipo === 'traduccion' ? `«${r.foco}»` : r.foco}
              </Text>
            ) : r.tipo === 'audio' ? (
              <Text style={styles.oculto}>• • •</Text>
            ) : null}
            {tiempoAgotado && <Text style={styles.aviso}>{t('trompo.se_acabo_tiempo')}</Text>}
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
      ) : (
        <View style={styles.tarjeta}>
          <Text style={styles.preparar}>{t('trompo.preparar')}</Text>
        </View>
      )}

      {enJuego && (
        <View style={styles.reloj} accessible accessibilityLabel={t('trompo.tiempo')}>
          <Animated.View
            style={[
              styles.relojLleno,
              poco ? styles.relojPoco : null,
              { transform: [{ scaleX: fase === 'reto' ? reloj : 0 }] },
            ]}
          />
        </View>
      )}

      <View style={styles.patio}>
        <View style={styles.piko}>
          <PikoMascota estado={estadoPiko} tam={118} />
        </View>
        <View style={styles.trompo}>
          <Trompo fuerza={partida.fuerza} estado={estadoDibujo} golpes={golpes} impulsos={impulsos} tam={140} />
        </View>
        {festejo && (
          <Animated.View style={[styles.cartel, { opacity: cartel, transform: [{ scale: escalaCartel }] }]}>
            <Text style={styles.cartelTexto}>{t(festejo === 'gran' ? 'trompo.gran_racha' : 'trompo.racha')}</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.abajo}>
        {fase === 'listo' || fase === 'lanzando' ? (
          <Boton ancho onPress={lanzar} disabled={fase === 'lanzando'}>
            {t('trompo.lanzar')}
          </Boton>
        ) : (
          <View style={styles.opciones}>
            {r.opciones.map((op, i) => (
              <View key={`${indice}-${i}`} style={r.opciones.length > 3 ? styles.mitad : styles.entera}>
                <Opcion
                  estado={estadoOpcion(i)}
                  disabled={fase !== 'reto'}
                  onPress={() => contestar(i)}
                  icono={conDibujos && tienePictograma(op) ? <Pictograma es={op} tam={32} /> : undefined}
                >
                  {op}
                </Opcion>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/** Dónde empieza el patio. */
const HORIZONTE = 300;

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
  marcador: { flex: 1, alignItems: 'center', gap: 2 },
  puntitos: { flexDirection: 'row', gap: 4 },
  puntito: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: color.bordeHondo,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  puntitoLleno: { backgroundColor: color.verdePasto, borderColor: '#7BA22C' },
  puntos: { fontFamily: fuente.titulo, fontSize: 13, color: color.verdeHondo },
  tarjeta: {
    marginHorizontal: espacio.lg,
    marginTop: espacio.sm,
    minHeight: 104,
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
  pregunta: { ...texto.cuerpo, fontSize: 15, lineHeight: 20, color: color.tinta },
  foco: { fontFamily: fuente.tituloFuerte, fontSize: 28, lineHeight: 32, color: color.verde },
  focoLargo: { fontFamily: fuente.tituloFuerte, fontSize: 20, lineHeight: 25, color: color.verde },
  oculto: { fontFamily: fuente.titulo, fontSize: 22, lineHeight: 30, letterSpacing: 6, color: color.cieloHondo },
  aviso: { ...texto.cuerpoFuerte, color: color.intentoTinta },
  preparar: { ...texto.cuerpo, color: color.tinta, flex: 1 },
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
  reloj: {
    marginHorizontal: espacio.lg,
    marginTop: espacio.sm,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
  },
  relojLleno: { flex: 1, backgroundColor: color.verdePasto, transformOrigin: 'left' },
  relojPoco: { backgroundColor: color.pico },
  patio: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: espacio.lg, paddingBottom: espacio.md },
  piko: { marginBottom: 4 },
  trompo: { marginBottom: 0 },
  cartel: {
    position: 'absolute',
    top: espacio.sm,
    alignSelf: 'center',
    backgroundColor: color.pico,
    borderRadius: radio.redondo,
    borderBottomWidth: labio.normal,
    borderBottomColor: '#C08417',
    paddingHorizontal: espacio.xl,
    paddingVertical: espacio.sm,
  },
  cartelTexto: { fontFamily: fuente.tituloFuerte, fontSize: 24, color: '#5C3D02' },
  abajo: { paddingHorizontal: espacio.lg, paddingBottom: espacio.lg, gap: espacio.sm },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  mitad: { width: '48.5%' },
  entera: { width: '100%' },
});
