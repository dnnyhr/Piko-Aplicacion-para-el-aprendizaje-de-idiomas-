/**
 * Práctica en solitario.
 *
 * Funciona sin sala, sin maestro y sin ninguna red: es lo que un niño puede
 * abrir en su casa, y también el plan B si en la demo falla el hotspot.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../src/ui/components/Boton';
import { Globo } from '../src/ui/components/Globo';
import { Pantalla } from '../src/ui/components/Pantalla';
import { Opcion } from '../src/ui/components/Opcion';
import { PikoMascota } from '../src/ui/piko/PikoMascota';
import { ARBOL_CRECE, FIN_BIEN, FIN_NORMAL, elegir } from '../src/ui/piko/frases';
import { Runner, type ResultadoRonda } from '../src/features/exercises/Runner';
import { useProgreso } from '../src/features/progreso/store';
import { GanaSacuanjoches } from '../src/features/arbol/GanaSacuanjoches';
import { ContadorSacuanjoches } from '../src/ui/arbol/ContadorSacuanjoches';
import type { Recompensa } from '../src/core/progress/arbol';
import { color, espacio, radio, texto } from '../src/ui/tokens';
import { PACKS } from '../content';
import { pickAdaptive, temasDe } from '../src/core/content/selector';
import { LANG_NOMBRE, type LangCode } from '../src/core/content/schema';

const ITEMS_POR_RONDA = 8;

type Fase = 'elegir' | 'jugando' | 'resultado';

export default function Practicar() {
  const router = useRouter();
  const estado = useProgreso((s) => s.estado);
  const registrar = useProgreso((s) => s.registrar);
  const terminarLeccion = useProgreso((s) => s.terminarLeccion);

  // Lo guardado de otras veces: sin esto, al abrir la app se vería en cero.
  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const [fase, setFase] = useState<Fase>('elegir');
  const [tema, setTema] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoRonda | null>(null);
  const [recompensa, setRecompensa] = useState<Recompensa | null>(null);

  // Hoy sólo inglés tiene contenido; las demás lenguas esperan a sus hablantes.
  const lang: LangCode = 'eng';
  const temas = useMemo(() => temasDe(PACKS, lang), [lang]);

  const [items, setItems] = useState<ReturnType<typeof pickAdaptive>>([]);

  const empezar = useCallback(
    (elegido: string | null) => {
      const seleccion = pickAdaptive(PACKS, {
        lang,
        themes: elegido ? [elegido] : undefined,
        count: ITEMS_POR_RONDA,
        state: estado,
      });
      if (seleccion.length === 0) return;
      setTema(elegido);
      setItems(seleccion);
      setFase('jugando');
    },
    [estado, lang],
  );

  if (fase === 'jugando') {
    return (
      <Runner
        items={items.map((x) => x.item)}
        onResponder={(item, acerto, ms) => {
          const origen = items.find((x) => x.item.id === item.id);
          registrar(item, origen?.packId ?? 'desconocido', acerto, ms);
        }}
        onTerminar={(r) => {
          // La lección terminada queda en el log antes de mostrar nada: si la
          // app se cierra en la pantalla de resultado, las sacuanjoches ya están.
          setRecompensa(terminarLeccion(items.map((x) => x.item), r.aciertos));
          setResultado(r);
          setFase('resultado');
        }}
        onSalir={() => router.back()}
      />
    );
  }

  if (fase === 'resultado' && resultado) {
    const bien = resultado.aciertos / Math.max(1, resultado.respondidas) >= 0.7;
    const frase = recompensa?.crecioArbol ? elegir(ARBOL_CRECE) : bien ? elegir(FIN_BIEN) : elegir(FIN_NORMAL);
    return (
      <Pantalla>
        <ScrollView contentContainerStyle={styles.fin} showsVerticalScrollIndicator={false}>
          <PikoMascota estado={bien ? 'celebrando' : 'alegre'} tam={160} />
          <Globo hacia="abajo">{frase}</Globo>

          {recompensa && <GanaSacuanjoches recompensa={recompensa} onVerArbol={() => router.push('/arbol')} />}

          <View style={styles.marcador}>
            <Dato valor={`${resultado.aciertos}/${resultado.respondidas}`} etiqueta="Correctas" />
            <Dato valor={String(estado.xp)} etiqueta="XP total" />
            <Dato valor={String(estado.bestStreak)} etiqueta="Mejor racha" />
          </View>

          <View style={styles.acciones}>
            <Boton ancho onPress={() => empezar(tema)}>
              Otra ronda
            </Boton>
            <Boton ancho tono="papel" onPress={() => setFase('elegir')}>
              Cambiar de tema
            </Boton>
          </View>
        </ScrollView>
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecera}>
          <PikoMascota estado="idle" tam={96} />
          <View style={styles.cabeceraTexto}>
            <Text style={styles.titulo}>{LANG_NOMBRE[lang]}</Text>
            <Text style={styles.sub}>
              {estado.xp} XP · {estado.correct}/{estado.answered} correctas
            </Text>
          </View>
          <ContadorSacuanjoches total={estado.sacuanjoches} onPress={() => router.push('/perfil')} />
        </View>

        <Boton ancho tono="pico" onPress={() => router.push('/niveles')}>
          Subir con Piko por niveles
        </Boton>

        <Text style={styles.instruccion}>O elegí un tema</Text>

        <View style={styles.temas}>
          <Opcion onPress={() => empezar(null)}>Todo mezclado</Opcion>
          {temas.map((t) => (
            <Opcion key={t} onPress={() => empezar(t)}>
              {capitalizar(t)}
            </Opcion>
          ))}
        </View>

        <Boton ancho tono="fantasma" onPress={() => router.back()}>
          Volver
        </Boton>
      </ScrollView>
    </Pantalla>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoValor}>{valor}</Text>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const capitalizar = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  contenido: { gap: espacio.xl, paddingBottom: espacio.xl },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  cabeceraTexto: { flex: 1 },
  titulo: { ...texto.display, color: color.verde },
  sub: { ...texto.cuerpo, color: color.tintaSuave },
  instruccion: {
    ...texto.chico,
    color: color.tintaSuave,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  temas: { gap: espacio.md },

  fin: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.lg, paddingBottom: espacio.lg },
  marcador: { flexDirection: 'row', gap: espacio.md, marginTop: espacio.sm },
  dato: {
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
    alignItems: 'center',
    minWidth: 92,
  },
  datoValor: { ...texto.titulo, color: color.verde },
  datoEtiqueta: { ...texto.chico, color: color.tintaSuave },
  acciones: { alignSelf: 'stretch', gap: espacio.md, marginTop: espacio.lg },
});
