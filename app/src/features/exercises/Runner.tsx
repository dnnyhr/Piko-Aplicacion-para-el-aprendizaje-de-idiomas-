/**
 * El motor de la ronda: barra de avance arriba, ejercicio en el medio, botón
 * de comprobar abajo, y la barra de Piko que sube al responder.
 *
 * No sabe nada de red ni de base de datos. Recibe ítems y avisa cada
 * respuesta hacia afuera; quien lo use decide si eso se guarda en el log
 * local, se sincroniza con el maestro, o las dos cosas.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BarraProgreso } from '../../ui/components/BarraProgreso';
import { Boton } from '../../ui/components/Boton';
import { BarraFeedback } from './BarraFeedback';
import { EjercicioBloques } from './EjercicioBloques';
import { EjercicioOpciones } from './EjercicioOpciones';
import { color, espacio, texto } from '../../ui/tokens';
import { hashSeed, mulberry32, shuffle } from '../../core/ids';
import { ACIERTO, INTENTO, RACHA, elegir } from '../../ui/piko/frases';
import {
  esCorrecta,
  estaCompleta,
  glosaDe,
  respuestaCorrecta,
  type Respuesta,
} from '../../core/content/verificar';
import type { BuildItem, ChoiceItem, Item, ListenItem } from '../../core/content/schema';

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
  const [indice, setIndice] = useState(0);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [armado, setArmado] = useState<number[]>([]);
  const [revelado, setRevelado] = useState(false);
  const [acerto, setAcerto] = useState(false);
  const [racha, setRacha] = useState(0);
  const [aciertos, setAciertos] = useState(0);

  const empezado = useRef(Date.now());
  const item = items[indice];

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

  const titulo = acerto ? (racha >= 3 ? elegir(RACHA) : elegir(ACIERTO)) : elegir(INTENTO);

  return (
    <View style={styles.raiz}>
      <View style={styles.barraSuperior}>
        {onSalir && (
          <Pressable onPress={onSalir} hitSlop={12} accessibilityRole="button">
            <Text style={styles.salir}>✕</Text>
          </Pressable>
        )}
        <BarraProgreso valor={indice / items.length} style={styles.progreso} />
        {racha >= 2 && <Text style={styles.racha}>🔥 {racha}</Text>}
      </View>

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
          />
        )}
      </View>

      {!revelado && (
        <View style={styles.pie}>
          <Boton ancho disabled={!listo} onPress={comprobar}>
            Comprobar
          </Boton>
        </View>
      )}

      <BarraFeedback
        visible={revelado}
        acerto={acerto}
        titulo={titulo}
        respuesta={respuestaCorrecta(item)}
        gloss={acerto ? undefined : glosaDe(item)}
        etiquetaBoton={ultimo ? 'Terminar' : 'Continuar'}
        onContinuar={continuar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  pie: { paddingHorizontal: espacio.xl, paddingBottom: espacio.xl, paddingTop: espacio.sm },
});
