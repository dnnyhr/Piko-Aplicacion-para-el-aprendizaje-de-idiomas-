/**
 * Una canción, en cinco etapas: escuchar, descubrir palabras, completar la
 * canción, escuchar y reconocer, y cantar con Piko.
 *
 * Piko acompaña toda la canción: se mueve al ritmo mientras suena, señala
 * las palabras, festeja los aciertos, anima cuando no sale y pide repetir.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Boton } from '../../ui/components/Boton';
import { Globo } from '../../ui/components/Globo';
import { Opcion, type EstadoOpcion } from '../../ui/components/Opcion';
import { Cerrar, Parlante } from '../../ui/minijuegos/Iconos';
import { Nota } from '../../ui/musica/Instrumento';
import { PikoMascota } from '../../ui/piko/PikoMascota';
import type { EstadoPiko } from '../../ui/piko/sprites';
import { elegir } from '../../ui/piko/frases';
import { useTextos } from '../../ui/textos/useTextos';
import { normalizar } from '../../core/content/verificar';
import { paraVozEspanola } from '../../core/content/voz';
import {
  armarCompletar,
  armarEscucha,
  RACHA_CANCION,
  type Cancion,
  type PalabraClave,
  type PreguntaCompletar,
  type PreguntaEscucha,
  type Verso,
} from '../../core/canciones/cancion';
import type { Voz } from '../../core/minijuegos/vocabulario';
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
  onTerminar: (r: ResultadoCancion) => void;
  onSalir: () => void;
}

type Etapa = 1 | 2 | 3 | 4 | 5;
const ETAPAS: readonly Etapa[] = [1, 2, 3, 4, 5];
const NOMBRE = {
  1: 'musica.etapa_escuchar',
  2: 'musica.etapa_descubrir',
  3: 'musica.etapa_completar',
  4: 'musica.etapa_reconocer',
  5: 'musica.etapa_cantar',
} as const;
const AYUDA = {
  1: 'musica.escuchar_ayuda',
  2: 'musica.descubrir_ayuda',
  3: 'musica.completar_ayuda',
  4: 'musica.reconocer_ayuda',
  5: 'musica.cantar_ayuda',
} as const;

/**
 * La voz del teléfono para un texto en una lengua. Sólo las lenguas que
 * tienen voz: inglés, español y el miskito con la voz en español. Las demás
 * suenan sólo desde la grabación de la canción.
 */
function vozPara(lengua: string, t: string): Voz | null {
  if (lengua === 'eng') return { texto: t, lang: 'en-US' };
  if (lengua === 'spa') return { texto: t, lang: 'es-US' };
  if (lengua === 'miq') return { texto: paraVozEspanola(t), lang: 'es-US' };
  return null;
}

export function Experiencia({ cancion, audio, onTerminar, onSalir }: ExperienciaProps) {
  const { t, frases, idioma } = useTextos();
  const tramo = useTramo(audio);
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [paso, setPaso] = useState(0);
  const [elegida, setElegida] = useState<number | null>(null);
  const [aciertos, setAciertos] = useState(0);
  const [respondidas, setRespondidas] = useState(0);
  const [racha, setRacha] = useState(0);
  const [mejorRacha, setMejorRacha] = useState(0);
  const [frase, setFrase] = useState('');
  const [escucho, setEscucho] = useState(false);

  const completar = useMemo<PreguntaCompletar[]>(() => armarCompletar(cancion, Math.random), [cancion]);
  const escucha = useMemo<PreguntaEscucha[]>(() => armarEscucha(cancion, Math.random), [cancion]);
  const claves = useMemo(() => new Set(cancion.palabras.map((p) => normalizar(p.texto))), [cancion]);

  // Piko se mueve al ritmo mientras suena la canción.
  const ritmo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!tramo.sonando) {
      ritmo.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ritmo, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ritmo, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [tramo.sonando, ritmo]);

  useEffect(() => () => callar(), []);

  const versoActual = cancion.letra.findIndex((v) => tramo.tiempo >= v.inicio && tramo.tiempo < v.fin);
  const traducciones = cancion.nivel !== 'avanzado';

  const tocarPalabra = (p: PalabraClave) => {
    if (p.inicio !== undefined && p.fin !== undefined) return tramo.tocar(p.inicio, p.fin);
    const v = vozPara(cancion.lengua, p.texto);
    if (v) decir([v]);
  };

  const tocarVerso = (v: Verso) => tramo.tocar(v.inicio, v.fin);

  /** Lengua de la canción → español → inglés, sin repetir la que ya es una de las dos. */
  const cadena = (p: PalabraClave) =>
    cancion.lengua === 'eng'
      ? `${p.texto} → ${p.es}`
      : cancion.lengua === 'spa'
        ? `${p.es} → ${p.en}`
        : `${p.texto} → ${p.es} → ${p.en}`;

  const pasarEtapa = () => {
    tramo.pausar();
    callar();
    setPaso(0);
    setElegida(null);
    if (etapa === 5) {
      onTerminar({ correct: aciertos, total: respondidas, streak: mejorRacha });
      return;
    }
    const siguiente = (etapa + 1) as Etapa;
    setEtapa(siguiente);
    if (siguiente === 5) setFrase(elegir(frases('piko.cantar')));
  };

  /** Responder una pregunta de las etapas 3 o 4. */
  const responder = (i: number, correcta: number, buena: string) => {
    if (elegida !== null) return;
    const acerto = i === correcta;
    setElegida(i);
    setRespondidas((n) => n + 1);
    const nuevaRacha = acerto ? racha + 1 : 0;
    setRacha(nuevaRacha);
    setMejorRacha((m) => Math.max(m, nuevaRacha));
    if (acerto) {
      setAciertos((n) => n + 1);
      const dicho = nuevaRacha === RACHA_CANCION ? t('musica.racha') : elegir(frases('piko.acierto'));
      setFrase(dicho);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      decir([vozDePiko(dicho, idioma)]);
    } else {
      const dicho = elegir(frases('piko.intento'));
      setFrase(`${dicho} ${buena}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      decir([vozDePiko(dicho, idioma)]);
    }
  };

  const siguientePregunta = (cuantas: number) => {
    setElegida(null);
    setFrase('');
    if (paso + 1 >= cuantas) pasarEtapa();
    else setPaso(paso + 1);
  };

  // Al llegar a una pregunta, suena sola.
  useEffect(() => {
    if (etapa === 3 && completar[paso]) tocarVerso(cancion.letra[completar[paso]!.hueco.verso] as Verso);
    if (etapa === 4 && escucha[paso]) sonarEscucha(escucha[paso]!);
  }, [etapa, paso]); // eslint-disable-line react-hooks/exhaustive-deps

  function sonarEscucha(q: PreguntaEscucha) {
    if (q.verso) return tocarVerso(q.verso);
    if (q.palabra) tocarPalabra(q.palabra);
  }

  const estadoOpcion = (i: number, correcta: number): EstadoOpcion => {
    if (elegida === null) return 'normal';
    if (i === correcta) return 'correcta';
    return i === elegida ? 'fallada' : 'normal';
  };

  const estadoPiko: EstadoPiko =
    elegida !== null
      ? frase && elegida >= 0 && (etapa === 3 ? elegida === completar[paso]?.correcta : elegida === escucha[paso]?.correcta)
        ? 'alegre'
        : 'animando'
      : tramo.sonando
        ? etapa === 5
          ? 'celebrando'
          : 'alegre'
        : etapa === 2
          ? 'pensando'
          : 'idle';
  const salto = ritmo.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  /** Un verso con las palabras clave resaltadas. */
  const VersoVista = ({ v, activo }: { v: Verso; activo: boolean }) => (
    <View style={[styles.verso, activo ? styles.versoActivo : null]}>
      <Text style={styles.versoTexto}>
        {v.texto.split(/(\s+)/).map((w, k) => {
          const limpia = normalizar(w.replace(/^[¿¡«"'(]+|[»"'),.;:!?]+$/g, ''));
          return (
            <Text key={k} style={claves.has(limpia) ? styles.clave : null}>
              {w}
            </Text>
          );
        })}
      </Text>
      {traducciones && v.es && cancion.lengua !== 'spa' && <Text style={styles.traduccion}>{v.es}</Text>}
      {traducciones && v.en && cancion.lengua !== 'eng' && <Text style={styles.traduccion}>{v.en}</Text>}
    </View>
  );

  return (
    <View style={styles.raiz}>
      <View style={styles.cabecera}>
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel={t('musica.salir')} style={styles.redondo}>
          <Cerrar />
        </Pressable>
        <View style={styles.etapas} accessible accessibilityLabel={`${t('musica.etapa', { n: etapa })}: ${t(NOMBRE[etapa])}`}>
          {ETAPAS.map((n) => (
            <View key={n} style={[styles.etapaPunto, n < etapa ? styles.etapaHecha : n === etapa ? styles.etapaActual : null]}>
              <Text style={[styles.etapaNumero, n <= etapa ? styles.etapaNumeroClaro : null]}>{n}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.escenario}>
        <View style={[styles.nota, { left: 26, top: 8 }]}>
          <Nota tam={20} tinte={color.verdeHoja} />
        </View>
        <View style={[styles.nota, { right: 34, top: 24 }]}>
          <Nota tam={16} tinte={color.copete} />
        </View>
        <Animated.View style={{ transform: [{ translateY: salto }] }}>
          <PikoMascota estado={estadoPiko} tam={110} />
        </Animated.View>
        <View style={styles.globo}>
          <Globo>{frase || t(AYUDA[etapa])}</Globo>
        </View>
      </View>

      <Text style={styles.titulo}>
        {t('musica.etapa', { n: etapa })} · {t(NOMBRE[etapa])}
      </Text>

      <ScrollView style={styles.cuerpo} contentContainerStyle={styles.cuerpoContenido} showsVerticalScrollIndicator={false}>
        {etapa === 1 && (
          <>
            {cancion.letra.map((v, i) => (
              <VersoVista key={i} v={v} activo={i === versoActual} />
            ))}
          </>
        )}

        {etapa === 2 &&
          cancion.palabras.map((p, i) => (
            <View key={i} style={styles.palabra}>
              <Pressable
                onPress={() => {
                  setFrase(cadena(p));
                  tocarPalabra(p);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${p.texto}, ${p.es}, ${p.en}`}
                style={styles.palabraFila}
              >
                {cancion.lengua !== 'spa' && cancion.lengua !== 'eng' && (
                  <>
                    <Text style={styles.palabraOriginal}>{p.texto}</Text>
                    <Text style={styles.flecha}>→</Text>
                  </>
                )}
                <Text style={styles.palabraEs}>{p.es}</Text>
                <Text style={styles.flecha}>→</Text>
                <Text style={styles.palabraEn}>{p.en.toLocaleUpperCase('en')}</Text>
              </Pressable>
              <Pressable
                onPress={() => decir([{ texto: p.en, lang: 'en-US' }])}
                accessibilityRole="button"
                accessibilityLabel={`${t('minijuegos.escuchar')}: ${p.en}`}
                style={styles.parlanteChico}
              >
                <Parlante tam={20} />
              </Pressable>
            </View>
          ))}

        {etapa === 3 && completar[paso] && (
          <>
            <View style={styles.hueco}>
              <Text style={styles.huecoTexto}>{completar[paso]!.conHueco}</Text>
              <Pressable
                onPress={() => tocarVerso(cancion.letra[completar[paso]!.hueco.verso] as Verso)}
                accessibilityRole="button"
                accessibilityLabel={t('musica.escuchar_verso')}
                style={styles.parlanteChico}
              >
                <Parlante tam={20} />
              </Pressable>
            </View>
            {completar[paso]!.opciones.map((op, i) => (
              <Opcion
                key={`${paso}-${i}`}
                estado={estadoOpcion(i, completar[paso]!.correcta)}
                disabled={elegida !== null}
                onPress={() => responder(i, completar[paso]!.correcta, completar[paso]!.hueco.oculta)}
              >
                {op}
              </Opcion>
            ))}
          </>
        )}

        {etapa === 4 && escucha[paso] && (
          <>
            <Pressable
              onPress={() => sonarEscucha(escucha[paso]!)}
              accessibilityRole="button"
              accessibilityLabel={t('musica.escuchar_otra_vez')}
              style={styles.escuchaGrande}
            >
              <Parlante tam={34} />
              <Text style={styles.escuchaTexto}>{t('musica.escuchar_otra_vez')}</Text>
            </Pressable>
            {escucha[paso]!.opciones.map((op, i) => (
              <Opcion
                key={`${paso}-${i}`}
                estado={estadoOpcion(i, escucha[paso]!.correcta)}
                disabled={elegida !== null}
                onPress={() => responder(i, escucha[paso]!.correcta, escucha[paso]!.opciones[escucha[paso]!.correcta] as string)}
              >
                {op}
              </Opcion>
            ))}
          </>
        )}

        {etapa === 5 &&
          cancion.letra.slice(cancion.canta.desde, cancion.canta.hasta + 1).map((v, i) => (
            <VersoVista key={i} v={v} activo={cancion.canta.desde + i === versoActual} />
          ))}
      </ScrollView>

      <View style={styles.pie}>
        {(etapa === 1 || etapa === 5) && (
          <Boton
            ancho
            tono="cielo"
            onPress={() => {
              if (tramo.sonando) return tramo.pausar();
              setEscucho(true);
              if (etapa === 1) tramo.tocar(0);
              else {
                const desde = cancion.letra[cancion.canta.desde] as Verso;
                const hasta = cancion.letra[cancion.canta.hasta] as Verso;
                tramo.tocar(desde.inicio, hasta.fin);
              }
            }}
          >
            {tramo.sonando ? t('musica.pausa') : etapa === 5 && escucho ? t('musica.repetir') : t('musica.tocar')}
          </Boton>
        )}
        {(etapa === 3 || etapa === 4) && elegida !== null && (
          <Boton ancho onPress={() => siguientePregunta(etapa === 3 ? completar.length : escucha.length)}>
            {t('musica.seguir')}
          </Boton>
        )}
        {(etapa === 1 || etapa === 2 || etapa === 5) && (
          <Boton ancho tono={etapa === 2 ? 'verde' : 'papel'} onPress={pasarEtapa}>
            {etapa === 5 ? t('musica.terminar') : t('musica.seguir')}
          </Boton>
        )}
      </View>
    </View>
  );
}

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
  etapas: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: espacio.sm },
  etapaPunto: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: color.bordeHondo,
    backgroundColor: color.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etapaHecha: { backgroundColor: color.verdePasto, borderColor: '#7BA22C' },
  etapaActual: { backgroundColor: color.verde, borderColor: color.verde },
  etapaNumero: { fontFamily: fuente.titulo, fontSize: 13, color: color.tintaSuave },
  etapaNumeroClaro: { color: color.blanco },
  escenario: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: espacio.md,
    backgroundColor: color.nube,
    borderRadius: radio.xl,
    paddingHorizontal: espacio.md,
    paddingTop: espacio.md,
    minHeight: 132,
  },
  nota: { position: 'absolute' },
  globo: { flex: 1, marginLeft: espacio.sm, marginBottom: espacio.lg },
  titulo: { ...texto.subtitulo, color: color.verde, marginTop: espacio.lg },
  cuerpo: { flex: 1, marginTop: espacio.sm },
  cuerpoContenido: { gap: espacio.sm, paddingBottom: espacio.lg },
  verso: {
    backgroundColor: color.blanco,
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: color.borde,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.sm,
  },
  versoActivo: { borderColor: color.cielo, backgroundColor: color.nube },
  versoTexto: { fontFamily: fuente.titulo, fontSize: 18, lineHeight: 24, color: color.grafito },
  clave: { color: color.copete, fontFamily: fuente.tituloFuerte },
  traduccion: { ...texto.chico, color: color.tinta },
  palabra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: color.blanco,
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: color.borde,
    borderBottomWidth: 2 + labio.chico,
    borderBottomColor: color.bordeHondo,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
  },
  palabraFila: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: espacio.xs, minHeight: 44 },
  palabraOriginal: { fontFamily: fuente.tituloFuerte, fontSize: 18, color: color.copete },
  palabraEs: { fontFamily: fuente.titulo, fontSize: 17, color: color.grafito },
  palabraEn: { fontFamily: fuente.tituloFuerte, fontSize: 18, color: color.verde },
  flecha: { ...texto.cuerpo, color: color.tintaSuave },
  parlanteChico: {
    width: 44,
    height: 44,
    borderRadius: radio.redondo,
    backgroundColor: color.cieloHondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hueco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.nube,
    borderRadius: radio.md,
    padding: espacio.md,
  },
  huecoTexto: { flex: 1, fontFamily: fuente.titulo, fontSize: 20, lineHeight: 26, color: color.grafito },
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
