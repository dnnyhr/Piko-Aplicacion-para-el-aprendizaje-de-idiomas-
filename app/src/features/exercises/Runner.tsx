/**
 * El motor de la ronda: barra de avance arriba, ejercicio en el medio, botón
 * de comprobar abajo, y la barra de Piko que sube al responder.
 *
 * No sabe nada de red ni de base de datos. Recibe ítems y avisa cada
 * respuesta hacia afuera; quien lo use decide si eso se guarda en el log
 * local, se sincroniza con el maestro, o las dos cosas.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BarraProgreso } from '../../ui/components/BarraProgreso';
import { Boton } from '../../ui/components/Boton';
import { BarraFeedback } from './BarraFeedback';
import { EjercicioBloques } from './EjercicioBloques';
import { EjercicioOpciones } from './EjercicioOpciones';
import { espacio, texto } from '../../ui/tokens';
import { hashSeed, mulberry32, shuffle } from '../../core/ids';
import { elegir } from '../../ui/piko/frases';
import { useTextos } from '../../ui/textos/useTextos';
import { usePreferencias } from '../preferencias/store';
import { BotonRepetir } from '../instrucciones/BotonRepetir';
import { PasosInstruccion } from '../instrucciones/PasosInstruccion';
import { useNarrador } from '../instrucciones/useNarrador';
import { PanelSenas } from '../senas/PanelSenas';
import type { Voz } from '../../core/minijuegos/rayuela';
import {
  esCorrecta,
  estaCompleta,
  glosaDe,
  respuestaCorrecta,
  type Respuesta,
} from '../../core/content/verificar';
import type { BuildItem, ChoiceItem, Item, ListenItem } from '../../core/content/schema';
import { crearEstilos } from '../../ui/tema';
import { usePausaLogros } from '../logros/store';

export interface ResultadoRonda {
  respondidas: number;
  aciertos: number;
}

export interface RunnerProps {
  items: readonly Item[];
  /** Se llama por cada respuesta, en el momento de comprobar. */
  onResponder: (item: Item, acerto: boolean, ms: number) => void;
  onTerminar: (resultado: ResultadoRonda) => void;
  onSalir?: () => void;
}

export function Runner({ items, onResponder, onTerminar, onSalir }: RunnerProps) {
  const styles = useEstilos();
  // Un logro ganado a mitad de la ronda se festeja al terminarla.
  usePausaLogros();
  const [indice, setIndice] = useState(0);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [armado, setArmado] = useState<number[]>([]);
  const [revelado, setRevelado] = useState(false);
  const [acerto, setAcerto] = useState(false);
  const [racha, setRacha] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const { t, frases } = useTextos();
  const pasoAPaso = usePreferencias((s) => s.pasoAPaso);
  const narrador = useNarrador();
  // Los pasos se muestran la primera vez que aparece cada tipo de ejercicio.
  const [tiposVistos, setTiposVistos] = useState<readonly Item['type'][]>([]);
  const [pasosAbiertos, setPasosAbiertos] = useState(false);

  const empezado = useRef(Date.now());
  const item = items[indice];
  const verPasos = !!item && pasoAPaso && (pasosAbiertos || !tiposVistos.includes(item.type));

  // Semilla estable por ítem: las opciones se barajan igual mientras dure el
  // ejercicio, pero distinto entre ítems.
  const seed = useMemo(() => (item ? hashSeed(item.id) : 0), [item]);

  /**
   * El banco de palabras vive acá, no en el componente hijo: `armado` guarda
   * índices dentro de este arreglo, así que los dos tienen que estar mirando
   * exactamente la misma lista barajada.
   */
  const banco = useMemo(
    () => (item?.type === 'build' ? shuffle(item.blocks, mulberry32(seed)) : []),
    [item, seed],
  );

  const siguiente = useCallback(() => {
    setSeleccion(null);
    setArmado([]);
    setRevelado(false);
    empezado.current = Date.now();
  }, []);

  // Al salir de la ronda se calla lo que se estuviera leyendo.
  const { callar } = narrador;
  useEffect(() => () => callar(), [callar]);

  /** Lo que Piko dice de este ejercicio. Todo está también escrito en la pantalla. */
  const voces = useMemo((): Voz[] => {
    if (!item) return [];
    if (item.type === 'choice') return [narrador.voz(t('ejercicio.elegir_traduccion')), narrador.voz(item.prompt)];
    if (item.type === 'build') return [narrador.voz(t('ejercicio.arma_oracion')), narrador.voz(item.gloss)];
    const palabra = item.tts ? [{ texto: item.tts, lang: item.ttsLang ?? 'en-US' }] : [];
    return [narrador.voz(t('ejercicio.que_escuchaste')), ...palabra];
  }, [item, narrador.voz, t]);

  if (!item) return null;

  const respuesta: Respuesta | null =
    item.type === 'build'
      ? { tipo: 'bloques', palabras: armado.map((i) => banco[i] ?? '') }
      : seleccion !== null
        ? { tipo: 'opcion', valor: seleccion }
        : null;

  const listo = estaCompleta(item, respuesta);
  const ultimo = indice + 1 >= items.length;

  const comprobar = () => {
    if (!respuesta || revelado) return;
    const bien = esCorrecta(item, respuesta);

    setAcerto(bien);
    setRevelado(true);
    setRacha(bien ? racha + 1 : 0);
    if (bien) setAciertos((n) => n + 1);

    Haptics.notificationAsync(
      bien ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
    ).catch(() => undefined);

    onResponder(item, bien, Date.now() - empezado.current);
  };

  const continuar = () => {
    if (ultimo) {
      onTerminar({ respondidas: items.length, aciertos });
      return;
    }
    setIndice(indice + 1);
    siguiente();
  };

  const titulo = acerto
    ? elegir(frases(racha >= 3 ? 'piko.racha' : 'piko.acierto'))
    : elegir(frases('piko.intento'));

  const cerrarPasos = () => {
    setTiposVistos((v) => (v.includes(item.type) ? v : [...v, item.type]));
    setPasosAbiertos(false);
    // El rato leyendo los pasos no cuenta como tiempo de respuesta.
    empezado.current = Date.now();
  };

  return (
    <View style={styles.raiz}>
      <View style={styles.barraSuperior}>
        {onSalir && (
          <Pressable onPress={onSalir} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('comun.volver')}>
            <Text style={styles.salir}>✕</Text>
          </Pressable>
        )}
        <BarraProgreso valor={indice / items.length} style={styles.progreso} />
        {racha >= 2 && <Text style={styles.racha}>🔥 {racha}</Text>}
      </View>

      {verPasos ? (
        <ScrollView style={styles.cuerpo} contentContainerStyle={styles.pasos} showsVerticalScrollIndicator={false}>
          <PasosInstruccion key={item.type} actividad={item.type} onListo={cerrarPasos} />
          <PanelSenas claves={[`instruccion.${item.type}`]} />
        </ScrollView>
      ) : (
      <>
      {(pasoAPaso || narrador.activa) && !revelado && (
        <View style={styles.ayudas}>
          {pasoAPaso && (
            <Boton chico tono="papel" onPress={() => setPasosAbiertos(true)}>
              {t('instruccion.ver_pasos')}
            </Boton>
          )}
          <BotonRepetir voces={voces} clave={item.id} />
        </View>
      )}
      <PanelSenas avisar={false} style={styles.senas} claves={[`instruccion.${item.type}`, `vocabulario.${item.id}`]} />

      <View style={styles.cuerpo}>
        {item.type === 'build' ? (
          <EjercicioBloques
            item={item as BuildItem}
            banco={banco}
            armado={armado}
            onArmado={setArmado}
            revelado={revelado}
          />
        ) : (
          <EjercicioOpciones
            item={item as ChoiceItem | ListenItem}
            seleccion={seleccion}
            onSeleccion={setSeleccion}
            revelado={revelado}
            seed={seed}
            autoSonar={!narrador.activa}
          />
        )}
      </View>

      {!revelado && !verPasos && (
        <View style={styles.pie}>
          <Boton ancho disabled={!listo} onPress={comprobar}>
            {t('ejercicio.comprobar')}
          </Boton>
        </View>
      )}

      </>
      )}

      <BarraFeedback
        visible={revelado}
        acerto={acerto}
        titulo={titulo}
        respuesta={respuestaCorrecta(item)}
        gloss={acerto ? undefined : glosaDe(item)}
        etiquetaBoton={t(ultimo ? 'ejercicio.terminar' : 'ejercicio.continuar')}
        onContinuar={continuar}
      />
    </View>
  );
}

const useEstilos = crearEstilos((color) => ({
  raiz: { flex: 1, backgroundColor: color.papel },
  barraSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingHorizontal: espacio.xl,
    paddingTop: espacio.md,
    paddingBottom: espacio.sm,
  },
  salir: { ...texto.subtitulo, color: color.tintaSuave },
  progreso: { flex: 1 },
  racha: { ...texto.cuerpoFuerte, color: color.copete },
  cuerpo: { flex: 1, paddingHorizontal: espacio.xl, paddingTop: espacio.lg },
  pasos: { gap: espacio.md, paddingBottom: espacio.xl },
  ayudas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: espacio.sm, paddingHorizontal: espacio.xl },
  senas: { marginHorizontal: espacio.xl, marginTop: espacio.sm },
  pie: { paddingHorizontal: espacio.xl, paddingBottom: espacio.xl, paddingTop: espacio.sm },
}));
