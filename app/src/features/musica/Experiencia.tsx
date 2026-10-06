/**
 * Una canción convertida en lección de inglés.
 *
 * Escucho mi canción → entiendo una frase → aprendo cómo decirla en inglés →
 * practico → canto → gano sacuanjoches.
 *
 * 1. Escuchar: suena la grabación, Piko baila con su falda de sacuanjoches y
 *    una sacuanjoche salta encima de cada palabra que se canta, a tiempo con
 *    el audio y rebotando con el pulso. Cada línea trae la letra como se
 *    canta, qué significa y cómo se dice en inglés. Las
 *    partes que vuelven dicen «Se repite» o «Repite el coro».
 * 2. Cada frase elegida es una lección: original → español → inglés, y
 *    cuatro actividades (completar, usar la palabra, ordenar, escuchar).
 * 3. Canta con Piko: el coro, con el inglés de cada línea.
 *
 * Las sacuanjoches se ven crecer mientras se juega (una cada tres respuestas
 * buenas) y al final entran al mismo progreso que todo lo demás.
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Boton } from '../../ui/components/Boton';
import { Globo } from '../../ui/components/Globo';
import { Opcion, type EstadoOpcion } from '../../ui/components/Opcion';
import { Sacuanjoche } from '../../ui/arbol/Sacuanjoche';
import { Bandera } from '../../ui/minijuegos/Bandera';
import { Cerrar, Parlante } from '../../ui/minijuegos/Iconos';
import { Nota } from '../../ui/musica/Instrumento';
import { PikoBailarin } from '../../ui/musica/PikoBailarin';
import { VersoCantado } from '../../ui/musica/VersoCantado';
import type { EstadoPiko } from '../../ui/piko/sprites';
import { elegir } from '../../ui/piko/frases';
import { useTextos } from '../../ui/textos/useTextos';
import {
  ACTIVIDADES,
  armarLeccion,
  armarOracion,
  marcasDeRepeticion,
  ordenCorrecto,
  repeticiones,
  sacuanjochesPorCancion,
  versoEn,
  type Actividad,
  type Cancion,
  type LeccionArmada,
  type MarcaRepeticion,
  type Verso,
} from '../../core/canciones/cancion';
import { paraVozEspanola } from '../../core/content/voz';
import { callar, decir, vozDePiko } from '../minijuegos/voz';
import { useTramo } from './useTramo';
import { color, espacio, fuente, labio, radio, texto } from '../../ui/tokens';

export interface ResultadoCancion {
  correct: number;
  total: number;
  streak: number;
}

export interface ExperienciaProps {
  cancion: Cancion;
  audio: number;
  /** Si hoy esta canción todavía da flores (si no, no se anuncian las que se van ganando). */
  premiable: boolean;
  onTerminar: (r: ResultadoCancion) => void;
  onSalir: () => void;
}

type Paso = { tipo: 'escuchar' } | { tipo: 'frase'; k: number } | { tipo: 'actividad'; k: number; act: Actividad } | { tipo: 'cantar' };

const ingles = (t: string) => decir([{ texto: t, lang: 'en-US' }]);

export function Experiencia({ cancion, audio, premiable, onTerminar, onSalir }: ExperienciaProps) {
  const { t, frases, idioma } = useTextos();
  const tramo = useTramo(audio);
  const [i, setI] = useState(0);
  const [elegida, setElegida] = useState<number | null>(null);
  const [aciertos, setAciertos] = useState(0);
  const [respondidas, setRespondidas] = useState(0);
  const [racha, setRacha] = useState(0);
  const [mejorRacha, setMejorRacha] = useState(0);
  const [frase, setFrase] = useState('');
  const [festejo, setFestejo] = useState(0);
  const [vioEjemplo, setVioEjemplo] = useState(false);
  const [puestas, setPuestas] = useState<number[]>([]);
  const [ordenListo, setOrdenListo] = useState<null | boolean>(null);
  const [desfase, setDesfase] = useState(0);

  const lecciones = useMemo<LeccionArmada[]>(() => cancion.lecciones.map((l) => armarLeccion(cancion, l, Math.random)), [cancion]);
  const pasos = useMemo<Paso[]>(
    () => [
      { tipo: 'escuchar' },
      ...cancion.lecciones.flatMap((_, k): Paso[] => [{ tipo: 'frase', k }, ...ACTIVIDADES.map((act): Paso => ({ tipo: 'actividad', k, act }))]),
      { tipo: 'cantar' },
    ],
    [cancion],
  );
  const marcas = useMemo(() => marcasDeRepeticion(cancion.letra, cancion.coro), [cancion]);
  const repetidos = useMemo(() => repeticiones(cancion.letra), [cancion]);
  const coro = useMemo(() => new Set(cancion.coro ?? []), [cancion]);

  const paso = pasos[i] as Paso;
  const leccion = paso.tipo === 'frase' || paso.tipo === 'actividad' ? (lecciones[paso.k] as LeccionArmada) : null;
  const periodo = 60 / cancion.ritmo.bpm;
  const activo = tramo.sonando ? versoEn(cancion.letra, tramo.tiempo) : -1;
  const flores = sacuanjochesPorCancion(aciertos, respondidas, mejorRacha);

  // Al empezar el coro, Piko festeja.
  const ultimoActivo = useRef(-1);
  useEffect(() => {
    if (activo === ultimoActivo.current) return;
    const antes = ultimoActivo.current;
    ultimoActivo.current = activo;
    if (activo < 0 || antes === activo) return;
    const original = (repetidos[activo] as number) >= 0 ? (repetidos[activo] as number) : activo;
    if (coro.has(original) && !coro.has(antes)) setFestejo((n) => n + 1);
  }, [activo, coro, repetidos]);

  // Una flor más: aparece con un «+1».
  const pop = useRef(new Animated.Value(0)).current;
  const floresAntes = useRef(0);
  useEffect(() => {
    if (flores > floresAntes.current && premiable) {
      pop.setValue(0);
      Animated.timing(pop, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    floresAntes.current = flores;
  }, [flores, premiable, pop]);

  useEffect(() => () => callar(), []);

  /** Toca de `desde` a `hasta` y avisa a Piko cuándo cae el próximo pulso, para bailar a tiempo. */
  const tocar = (desde: number, hasta?: number) => {
    const fase = (((cancion.ritmo.pulso - desde) % periodo) + periodo) % periodo;
    setDesfase(Math.round(fase * 1000));
    callar();
    tramo.tocar(desde, hasta);
  };
  const tocarVerso = (v: Verso) => tocar(v.inicio, v.fin);

  const irA = (n: number) => {
    tramo.pausar();
    callar();
    setElegida(null);
    setFrase('');
    setVioEjemplo(false);
    setPuestas([]);
    setOrdenListo(null);
    if (n >= pasos.length) {
      onTerminar({ correct: aciertos, total: respondidas, streak: mejorRacha });
      return;
    }
    setI(n);
    const p = pasos[n] as Paso;
    const l = p.tipo === 'frase' || p.tipo === 'actividad' ? (lecciones[p.k] as LeccionArmada) : null;
    if (p.tipo === 'frase' && l) {
      setFrase(t('musica.frase_ayuda'));
      // La frase suena primero como en la canción.
      setTimeout(() => tocarVerso(l.verso), 300);
    }
    if (p.tipo === 'actividad' && p.act === 'escucha' && l) setTimeout(() => ingles(l.escucha.frase), 350);
    if (p.tipo === 'cantar') setFrase(elegir(frases('piko.cantar')));
  };

  /** Anota una respuesta (sólo el primer intento de cada actividad). */
  const anotar = (acerto: boolean, correcta: string) => {
    setRespondidas((n) => n + 1);
    const nueva = acerto ? racha + 1 : 0;
    setRacha(nueva);
    setMejorRacha((m) => Math.max(m, nueva));
    if (acerto) {
      setAciertos((n) => n + 1);
      setFestejo((n) => n + 1);
      const dicho = elegir(frases('piko.acierto'));
      setFrase(dicho);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      decir([vozDePiko(dicho, idioma), { texto: correcta, lang: 'en-US' }]);
    } else {
      const dicho = elegir(frases('piko.intento'));
      setFrase(`${dicho} ${correcta}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      decir([vozDePiko(dicho, idioma), { texto: correcta, lang: 'en-US' }]);
    }
  };

  const responder = (k: number, correcta: number, opciones: readonly string[], frase: string) => {
    if (elegida !== null) return;
    setElegida(k);
    anotar(k === correcta, frase.replace('___', opciones[correcta] as string));
  };

  const estadoOpcion = (k: number, correcta: number): EstadoOpcion => {
    if (elegida === null) return 'normal';
    if (k === correcta) return 'correcta';
    return k === elegida ? 'fallada' : 'normal';
  };

  const respondio = elegida !== null || ordenListo !== null;
  const acerto =
    paso.tipo === 'actividad' && leccion
      ? paso.act === 'ordenar'
        ? ordenListo === true
        : elegida !== null && elegida === leccion[paso.act].correcta
      : false;
  const estadoPiko: EstadoPiko = respondio ? (acerto ? 'celebrando' : 'animando') : tramo.sonando ? 'alegre' : paso.tipo === 'actividad' ? 'pensando' : 'idle';
  const fuerte = paso.tipo === 'cantar' || (activo >= 0 && (repetidos[activo] as number) >= 0);

  // Los puntos de arriba: Escuchar, una por frase, Cantar.
  const grupo = paso.tipo === 'escuchar' ? 0 : paso.tipo === 'cantar' ? cancion.lecciones.length + 1 : paso.k + 1;
  const grupos = cancion.lecciones.length + 2;

  const ayuda =
    paso.tipo === 'escuchar'
      ? t('musica.escuchar_ayuda')
      : paso.tipo === 'cantar'
        ? t('musica.cantar_ayuda')
        : paso.tipo === 'frase'
          ? t('musica.frase_ayuda')
          : paso.act === 'completar'
            ? t('musica.completar_ayuda')
            : paso.act === 'usa'
              ? t('musica.usa_ayuda')
              : paso.act === 'ordenar'
                ? t('musica.ordenar_ayuda')
                : t('musica.escucha_ayuda');

  return (
    <View style={styles.raiz}>
      <View style={styles.cabecera}>
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel={t('musica.salir')} style={styles.redondo}>
          <Cerrar />
        </Pressable>
        <View style={styles.grupos} accessible accessibilityLabel={t('musica.progreso', { n: grupo + 1, total: grupos })}>
          {Array.from({ length: grupos }, (_, n) => (
            <View key={n} style={[styles.grupo, n < grupo ? styles.grupoHecho : n === grupo ? styles.grupoActual : null]}>
              {n < grupo && <Sacuanjoche tam={16} />}
            </View>
          ))}
        </View>
        <View style={styles.flores} accessible accessibilityLabel={t('musica.flores', { n: flores })}>
          <Sacuanjoche tam={22} />
          <Text style={styles.floresTexto}>{flores}</Text>
          <Animated.Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              styles.pop,
              {
                opacity: pop.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [6, -26] }) }],
              },
            ]}
          >
            +1
          </Animated.Text>
        </View>
      </View>

      <View style={styles.escenario}>
        <View style={[styles.nota, { left: 18, top: 8 }]}>
          <Nota tam={18} tinte={color.verdeHoja} />
        </View>
        <View style={[styles.nota, { left: 96, top: 2 }]}>
          <Nota tam={14} tinte={color.copete} />
        </View>
        <PikoBailarin tam={112} bailando={tramo.sonando} periodo={periodo} desfase={desfase} fuerte={fuerte} festejo={festejo} estado={estadoPiko} />
        <View style={styles.globo}>
          <Globo>{frase || ayuda}</Globo>
        </View>
      </View>

      {(paso.tipo === 'escuchar' || paso.tipo === 'cantar') && (
        <>
          <Text style={styles.titulo}>{paso.tipo === 'escuchar' ? t('musica.paso_escuchar') : t('musica.paso_cantar')}</Text>
          <Letra
            cancion={cancion}
            desde={paso.tipo === 'cantar' ? cancion.canta.desde : 0}
            hasta={paso.tipo === 'cantar' ? cancion.canta.hasta : cancion.letra.length - 1}
            activo={activo}
            tiempo={tramo.tiempo}
            marcas={marcas}
            repetidos={repetidos}
            sonando={tramo.sonando}
            periodo={periodo}
            textos={{ repite: t('musica.se_repite'), coro: t('musica.repite_coro'), aproximado: t('musica.aproximado') }}
          />
          {!premiable && paso.tipo === 'escuchar' && <Text style={styles.aviso}>{t('musica.flores_hoy')}</Text>}
          <View style={styles.pie}>
            <Boton
              ancho
              tono="cielo"
              onPress={() => {
                if (tramo.sonando) return tramo.pausar();
                if (paso.tipo === 'escuchar') tocar(Math.max(0, (cancion.letra[0] as Verso).inicio - 2));
                else tocar((cancion.letra[cancion.canta.desde] as Verso).inicio, (cancion.letra[cancion.canta.hasta] as Verso).fin);
              }}
            >
              {tramo.sonando ? t('musica.pausa') : t('musica.tocar')}
            </Boton>
            <Boton ancho tono={paso.tipo === 'cantar' ? 'verde' : 'papel'} onPress={() => irA(i + 1)}>
              {paso.tipo === 'cantar' ? t('musica.terminar') : t('musica.empezar_leccion')}
            </Boton>
          </View>
        </>
      )}

      {paso.tipo === 'frase' && leccion && (
        <>
          <ScrollView style={styles.cuerpo} contentContainerStyle={styles.cuerpoContenido} showsVerticalScrollIndicator={false}>
            <Text style={styles.titulo}>{t('musica.frase_titulo', { n: paso.k + 1, total: lecciones.length })}</Text>
            <View style={styles.tarjeta}>
              <Text style={styles.rotulo}>🎵 {t('musica.frase_original')}</Text>
              <VersoCantado
                verso={leccion.verso}
                tiempo={tramo.tiempo}
                activo={tramo.sonando && activo === leccion.leccion.verso}
                periodo={periodo}
                estilo={styles.original}
              />
              {cancion.lengua !== 'spa' && leccion.verso.es && (
                <>
                  <Text style={styles.rotulo}>{t('musica.frase_es')}</Text>
                  <Text style={styles.significado}>{leccion.verso.es}</Text>
                </>
              )}
              {cancion.lengua !== 'eng' && (
                <>
                  <View style={styles.filaIngles}>
                    <Bandera lengua="eng" ancho={26} />
                    <Text style={styles.rotulo}>{t('musica.frase_en')}</Text>
                  </View>
                  <Text style={styles.enGrande}>{leccion.verso.en}</Text>
                </>
              )}
              {leccion.verso.aproximado && <Text style={styles.aproximado}>≈ {t('musica.aproximado')}</Text>}
              {leccion.verso.nota && <Text style={styles.nota_}>{leccion.verso.nota}</Text>}
            </View>
            <View style={styles.dosBotones}>
              <Pressable onPress={() => tocarVerso(leccion.verso)} accessibilityRole="button" style={[styles.chip, styles.chipCancion]}>
                <Nota tam={18} tinte={color.blanco} />
                <Text style={styles.chipTexto}>{t('musica.escuchar_cancion')}</Text>
              </Pressable>
              <Pressable onPress={() => ingles(leccion.verso.en as string)} accessibilityRole="button" style={styles.chip}>
                <Parlante tam={20} />
                <Text style={styles.chipTexto}>{t('musica.escuchar_ingles')}</Text>
              </Pressable>
            </View>
          </ScrollView>
          <View style={styles.pie}>
            <Boton ancho onPress={() => irA(i + 1)}>
              {t('musica.a_practicar')}
            </Boton>
          </View>
        </>
      )}

      {paso.tipo === 'actividad' && leccion && (
        <>
          <ScrollView style={styles.cuerpo} contentContainerStyle={styles.cuerpoContenido} showsVerticalScrollIndicator={false}>
            <Text style={styles.titulo}>
              {t(`musica.act_${paso.act}`)} · {t('musica.frase_titulo', { n: paso.k + 1, total: lecciones.length })}
            </Text>

            {paso.act === 'completar' && (
              <>
                <View style={styles.tarjeta}>
                  <Text style={styles.chico}>{cancion.lengua === 'spa' ? leccion.verso.texto : leccion.verso.es}</Text>
                  <Text style={styles.hueco}>{leccion.completar.conHueco}</Text>
                </View>
                {leccion.completar.opciones.map((op, k) => (
                  <Opcion
                    key={k}
                    estado={estadoOpcion(k, leccion.completar.correcta)}
                    disabled={elegida !== null}
                    onPress={() => responder(k, leccion.completar.correcta, leccion.completar.opciones, leccion.completar.conHueco as string)}
                  >
                    {op}
                  </Opcion>
                ))}
              </>
            )}

            {paso.act === 'usa' && (
              <>
                <View style={styles.tarjeta}>
                  <Text style={styles.rotulo}>{t('musica.palabra_nueva')}</Text>
                  <View style={styles.filaIngles}>
                    <Text style={styles.palabraNueva}>{leccion.leccion.palabra.en.toLocaleUpperCase('en')}</Text>
                    <Text style={styles.significado}>= {leccion.leccion.palabra.es}</Text>
                  </View>
                  {(() => {
                    const miq = cancion.miskito?.find((m) => m.en.toLocaleLowerCase('en') === leccion.leccion.palabra.en.toLocaleLowerCase('en'));
                    return miq ? (
                      <Pressable
                        onPress={() => decir([{ texto: paraVozEspanola(miq.miq), lang: 'es-US' }])}
                        accessibilityRole="button"
                        style={styles.miskito}
                      >
                        <Text style={styles.chico}>{t('musica.en_miskito_palabra')}</Text>
                        <Text style={styles.miskitoTexto}>{miq.miq}</Text>
                      </Pressable>
                    ) : null;
                  })()}
                  {!vioEjemplo ? (
                    <>
                      <Text style={styles.rotulo}>{t('musica.usa_ayuda')}</Text>
                      <Pressable onPress={() => ingles(leccion.leccion.palabra.ejemplo)} accessibilityRole="button" style={styles.ejemplo}>
                        <View style={styles.ejemploTextos}>
                          <Text style={styles.enGrande}>{leccion.leccion.palabra.ejemplo}</Text>
                          <Text style={styles.chico}>{leccion.leccion.palabra.ejemploEs}</Text>
                        </View>
                        <View style={styles.parlanteChico}>
                          <Parlante tam={20} />
                        </View>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Text style={styles.rotulo}>{t('musica.usa_pregunta')}</Text>
                      <Text style={styles.hueco}>{leccion.usa.conHueco}</Text>
                    </>
                  )}
                </View>
                {vioEjemplo &&
                  leccion.usa.opciones.map((op, k) => (
                    <Opcion
                      key={k}
                      estado={estadoOpcion(k, leccion.usa.correcta)}
                      disabled={elegida !== null}
                      onPress={() => responder(k, leccion.usa.correcta, leccion.usa.opciones, leccion.usa.conHueco as string)}
                    >
                      {op}
                    </Opcion>
                  ))}
              </>
            )}

            {paso.act === 'ordenar' && (
              <>
                <View style={[styles.tarjeta, ordenListo === true ? styles.tarjetaBien : ordenListo === false ? styles.tarjetaMal : null]}>
                  <Text style={styles.rotulo}>{t('musica.ordenar_ayuda')}</Text>
                  <View style={styles.renglon}>
                    {puestas.length === 0 && <Text style={styles.renglonVacio}>…</Text>}
                    {puestas.map((f, k) => (
                      <Pressable
                        key={`${f}-${k}`}
                        disabled={ordenListo !== null}
                        onPress={() => setPuestas((p) => p.filter((_, j) => j !== k))}
                        accessibilityRole="button"
                        style={[styles.ficha, styles.fichaPuesta]}
                      >
                        <Text style={styles.fichaTexto}>{leccion.ordenar.fichas[f]}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {ordenListo === false && <Text style={styles.chico}>{t('musica.era', { respuesta: armarOracion(leccion.ordenar.solucion) })}</Text>}
                </View>
                <View style={styles.fichas}>
                  {leccion.ordenar.fichas.map((f, k) => {
                    const usada = puestas.includes(k);
                    return (
                      <Pressable
                        key={`${f}-${k}`}
                        disabled={usada || ordenListo !== null}
                        onPress={() => setPuestas((p) => [...p, k])}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: usada }}
                        style={[styles.ficha, usada ? styles.fichaUsada : null]}
                      >
                        <Text style={[styles.fichaTexto, usada ? styles.fichaTextoUsada : null]}>{f}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {paso.act === 'escucha' && (
              <>
                <Pressable onPress={() => ingles(leccion.escucha.frase)} accessibilityRole="button" accessibilityLabel={t('musica.escuchar_otra_vez')} style={styles.escuchaGrande}>
                  <Parlante tam={34} />
                  <Text style={styles.escuchaTexto}>{t('musica.escuchar_otra_vez')}</Text>
                </Pressable>
                {leccion.escucha.opciones.map((op, k) => (
                  <Opcion
                    key={k}
                    estado={estadoOpcion(k, leccion.escucha.correcta)}
                    disabled={elegida !== null}
                    onPress={() => responder(k, leccion.escucha.correcta, leccion.escucha.opciones, leccion.escucha.frase)}
                  >
                    {op}
                  </Opcion>
                ))}
              </>
            )}
          </ScrollView>

          <View style={styles.pie}>
            {paso.act === 'usa' && !vioEjemplo && (
              <Boton ancho onPress={() => setVioEjemplo(true)}>
                {t('musica.ya_la_vi')}
              </Boton>
            )}
            {paso.act === 'ordenar' && ordenListo === null && (
              <Boton
                ancho
                disabled={puestas.length !== leccion.ordenar.fichas.length}
                onPress={() => {
                  const elegidas = puestas.map((k) => leccion.ordenar.fichas[k] as string);
                  const bien = ordenCorrecto(elegidas, leccion.ordenar.solucion);
                  setOrdenListo(bien);
                  anotar(bien, armarOracion(leccion.ordenar.solucion));
                }}
              >
                {t('musica.comprobar')}
              </Boton>
            )}
            {respondio && (
              <Boton ancho onPress={() => irA(i + 1)}>
                {t('musica.seguir')}
              </Boton>
            )}
          </View>
        </>
      )}
    </View>
  );
}

// -------------------------------------------------------------- la letra

interface LetraProps {
  cancion: Cancion;
  desde: number;
  hasta: number;
  activo: number;
  /** Segundo de la grabación, para la flor que salta sobre las palabras. */
  tiempo: number;
  marcas: readonly MarcaRepeticion[];
  repetidos: readonly number[];
  sonando: boolean;
  periodo: number;
  textos: { repite: string; coro: string; aproximado: string };
}

/**
 * La letra. En la línea que suena, una sacuanjoche salta encima de cada
 * palabra que se canta, a tiempo con la grabación y rebotando con el pulso
 * (`VersoCantado`). La lista se desplaza sola para que la línea se vea.
 */
const Letra = memo(function Letra({ cancion, desde, hasta, activo, tiempo, marcas, repetidos, sonando, periodo, textos }: LetraProps) {
  const lista = useRef<ScrollView>(null);
  const lugares = useRef<Record<number, { y: number; h: number }>>({});

  useEffect(() => {
    const l = lugares.current[activo];
    if (activo < desde || activo > hasta || !l) return;
    lista.current?.scrollTo({ y: Math.max(0, l.y - 90), animated: true });
  }, [activo, desde, hasta]);

  return (
    <ScrollView ref={lista} style={styles.cuerpo} contentContainerStyle={styles.letra} showsVerticalScrollIndicator={false}>
      {cancion.letra.slice(desde, hasta + 1).map((v, j) => {
        const n = desde + j;
        const marca = n > desde ? marcas[n] : null;
        const repetido = (repetidos[n] as number) >= 0;
        return (
          <View
            key={n}
            onLayout={(e: LayoutChangeEvent) => {
              lugares.current[n] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
            }}
          >
            {marca && (
              <View style={styles.marca}>
                <Text style={styles.marcaTexto}>{marca === 'coro' ? `🎵 ${textos.coro}` : textos.repite}</Text>
              </View>
            )}
            <View style={[styles.verso, n === activo ? styles.versoActivo : null, repetido ? styles.versoRepetido : null]}>
              <VersoCantado verso={v} tiempo={tiempo} activo={sonando && n === activo} periodo={periodo} estilo={styles.versoTexto} />
              {!repetido && cancion.lengua !== 'spa' && v.es && <Text style={styles.versoEs}>{v.es}</Text>}
              {!repetido && v.en && cancion.lengua !== 'eng' && (
                <View style={styles.versoFilaEn}>
                  <Bandera lengua="eng" ancho={18} />
                  <Text style={styles.versoEn}>{v.en}</Text>
                </View>
              )}
              {!repetido && v.aproximado && <Text style={styles.aproximado}>≈ {textos.aproximado}</Text>}
              {!repetido && !v.en && v.nota && <Text style={styles.nota_}>{v.nota}</Text>}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
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
  grupos: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: espacio.sm },
  grupo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: color.bordeHondo,
    backgroundColor: color.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grupoHecho: { backgroundColor: color.verdePasto, borderColor: '#7BA22C' },
  grupoActual: { borderColor: color.verde, borderWidth: 3 },
  flores: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: color.blanco,
    borderRadius: radio.redondo,
    borderWidth: 2,
    borderColor: color.borde,
    paddingHorizontal: espacio.md,
    height: 40,
  },
  floresTexto: { fontFamily: fuente.tituloFuerte, fontSize: 18, color: color.verde },
  pop: { position: 'absolute', left: -30, top: 8, fontFamily: fuente.tituloFuerte, fontSize: 20, color: color.copete },
  escenario: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: espacio.sm,
    backgroundColor: color.nube,
    borderRadius: radio.xl,
    paddingHorizontal: espacio.md,
    paddingTop: espacio.sm,
    minHeight: 128,
  },
  nota: { position: 'absolute' },
  globo: { flex: 1, marginLeft: espacio.sm, marginBottom: espacio.lg },
  titulo: { ...texto.subtitulo, color: color.verde, marginTop: espacio.md },
  cuerpo: { flex: 1, marginTop: espacio.sm },
  cuerpoContenido: { gap: espacio.sm, paddingBottom: espacio.lg },
  letra: { gap: espacio.sm, paddingBottom: espacio.lg },
  marca: { alignSelf: 'flex-start', backgroundColor: color.papelHondo, borderRadius: radio.redondo, paddingHorizontal: espacio.md, paddingVertical: 2, marginBottom: 4 },
  marcaTexto: { ...texto.etiqueta, fontSize: 12, color: color.verdeHondo },
  verso: {
    backgroundColor: color.blanco,
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: color.borde,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
    gap: 2,
  },
  versoActivo: { borderColor: color.pico, backgroundColor: '#FFF6DE' },
  versoRepetido: { paddingVertical: 6 },
  versoTexto: { fontFamily: fuente.titulo, fontSize: 18, lineHeight: 23, color: color.grafito },
  versoEs: { ...texto.chico, color: color.tinta },
  versoFilaEn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  versoEn: { flex: 1, fontFamily: fuente.cuerpoFuerte, fontSize: 15, lineHeight: 20, color: color.verde },
  aproximado: { ...texto.etiqueta, fontSize: 11, color: color.copete },
  nota_: { ...texto.chico, color: color.tintaSuave, fontStyle: 'italic' },
  aviso: { ...texto.chico, color: color.tintaSuave, textAlign: 'center' },
  tarjeta: {
    gap: espacio.xs,
    backgroundColor: color.blanco,
    borderRadius: radio.lg,
    borderWidth: 2,
    borderColor: color.borde,
    borderBottomWidth: 2 + labio.normal,
    borderBottomColor: color.bordeHondo,
    padding: espacio.lg,
  },
  tarjetaBien: { borderColor: color.acierto, backgroundColor: color.aciertoFondo },
  tarjetaMal: { borderColor: color.intento, backgroundColor: color.intentoFondo },
  rotulo: { ...texto.etiqueta, fontSize: 12, color: color.tintaSuave, marginTop: espacio.xs },
  original: { fontFamily: fuente.tituloFuerte, fontSize: 22, lineHeight: 28, color: color.copete },
  significado: { ...texto.cuerpo, color: color.grafito },
  filaIngles: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginTop: espacio.xs },
  enGrande: { fontFamily: fuente.tituloFuerte, fontSize: 21, lineHeight: 27, color: color.verde },
  chico: { ...texto.chico, color: color.tinta },
  hueco: { fontFamily: fuente.tituloFuerte, fontSize: 22, lineHeight: 29, color: color.grafito },
  miskito: { flexDirection: 'row', alignItems: 'baseline', gap: espacio.sm },
  miskitoTexto: { fontFamily: fuente.tituloFuerte, fontSize: 18, color: color.copete },
  palabraNueva: { fontFamily: fuente.tituloFuerte, fontSize: 26, color: color.verde, letterSpacing: 1 },
  ejemplo: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, backgroundColor: color.nube, borderRadius: radio.md, padding: espacio.md },
  ejemploTextos: { flex: 1, gap: 2 },
  dosBotones: { flexDirection: 'row', gap: espacio.sm },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
    minHeight: 48,
    backgroundColor: color.cieloHondo,
    borderRadius: radio.lg,
    borderBottomWidth: labio.chico,
    borderBottomColor: '#1F7FB0',
  },
  chipCancion: { backgroundColor: color.copete, borderBottomColor: '#B4561B' },
  chipTexto: { fontFamily: fuente.boton, fontSize: 15, color: color.blanco },
  parlanteChico: {
    width: 44,
    height: 44,
    borderRadius: radio.redondo,
    backgroundColor: color.cieloHondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  renglon: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, minHeight: 52, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: color.borde, paddingBottom: espacio.sm },
  renglonVacio: { ...texto.cuerpo, color: color.tintaSuave },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm, justifyContent: 'center' },
  ficha: {
    minHeight: 46,
    justifyContent: 'center',
    backgroundColor: color.blanco,
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: color.borde,
    borderBottomWidth: 2 + labio.chico,
    borderBottomColor: color.bordeHondo,
    paddingHorizontal: espacio.md,
  },
  fichaPuesta: { backgroundColor: color.nube, borderColor: color.cielo },
  fichaUsada: { backgroundColor: color.papelHondo, borderBottomWidth: 2 },
  fichaTexto: { fontFamily: fuente.titulo, fontSize: 18, color: color.grafito },
  fichaTextoUsada: { color: 'transparent' },
  escuchaGrande: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.md,
    backgroundColor: color.cieloHondo,
    borderRadius: radio.lg,
    borderBottomWidth: labio.normal,
    borderBottomColor: '#1F7FB0',
    paddingVertical: espacio.md,
  },
  escuchaTexto: { fontFamily: fuente.boton, fontSize: 17, color: color.blanco },
  pie: { gap: espacio.sm, paddingTop: espacio.sm },
});
