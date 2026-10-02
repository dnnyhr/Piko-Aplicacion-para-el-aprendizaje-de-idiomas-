/**
 * El camino de niveles: Piko sube el madroño nivel por nivel.
 *
 * Tres momentos, como en la práctica: el camino, la lección del nivel y el
 * resultado. Al volver al camino después de superar un nivel nuevo, Piko salta
 * a la rama siguiente: esa subida es la recompensa, no un cambio de pantalla.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../src/ui/components/Boton';
import { Globo } from '../src/ui/components/Globo';
import { Pantalla } from '../src/ui/components/Pantalla';
import { PikoMascota } from '../src/ui/piko/PikoMascota';
import { ContadorSacuanjoches } from '../src/ui/arbol/ContadorSacuanjoches';
import { FIN_BIEN, FIN_NORMAL, NIVEL_CERRADO, SUBIR_NIVEL, elegir } from '../src/ui/piko/frases';
import { Runner, type ResultadoRonda } from '../src/features/exercises/Runner';
import { CaminoNiveles, geometriaCamino } from '../src/features/niveles/CaminoNiveles';
import { ResultadoNivel } from '../src/features/niveles/ResultadoNivel';
import { GanaSacuanjoches } from '../src/features/arbol/GanaSacuanjoches';
import { useProgreso } from '../src/features/progreso/store';
import { pickAdaptive } from '../src/core/content/selector';
import type { Recompensa } from '../src/core/progress/arbol';
import {
  caminoDe,
  estadoDelCamino,
  estrellasDe,
  nivelActual,
  resumenCamino,
  type NivelConEstado,
} from '../src/core/progress/niveles';
import type { LangCode } from '../src/core/content/schema';
import { color, espacio, texto } from '../src/ui/tokens';
import { PACKS } from '../content';

const ITEMS_POR_NIVEL = 8;

type Fase = 'camino' | 'jugando' | 'resultado';

interface Jugada {
  nivel: NivelConEstado;
  items: ReturnType<typeof pickAdaptive>;
}

interface Final {
  resultado: ResultadoRonda;
  recompensa: Recompensa;
  estrellas: number;
  estrellasAntes: number;
  /** El nivel quedó superado por primera vez: Piko sube. */
  nuevo: boolean;
  pikoAntes: number;
}

export default function Niveles() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const estado = useProgreso((s) => s.estado);
  const registrar = useProgreso((s) => s.registrar);
  const terminarLeccion = useProgreso((s) => s.terminarLeccion);

  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  // Hoy sólo inglés tiene contenido; las demás lenguas esperan a sus hablantes.
  const lang: LangCode = 'eng';
  const camino = useMemo(() => caminoDe(PACKS, lang), [lang]);
  const niveles = useMemo(() => estadoDelCamino(camino, estado.stars), [camino, estado.stars]);
  const resumen = resumenCamino(niveles);
  const pikoEn = nivelActual(niveles)?.numero ?? 1;

  const [fase, setFase] = useState<Fase>('camino');
  const [jugada, setJugada] = useState<Jugada | null>(null);
  const [final, setFinal] = useState<Final | null>(null);
  const [subiendoDesde, setSubiendoDesde] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const ancho = Math.min(width, 480) - espacio.xl * 2;
  const scroll = useRef<ScrollView>(null);
  const [altoVista, setAltoVista] = useState(600);

  // El camino abre mostrando la rama donde está Piko.
  useEffect(() => {
    if (fase !== 'camino') return;
    const g = geometriaCamino(niveles.length, ancho);
    const nodo = g.nodos[pikoEn - 1];
    if (!nodo) return;
    const y = Math.max(0, nodo.y - altoVista * 0.55);
    const t = setTimeout(() => scroll.current?.scrollTo({ y, animated: subiendoDesde !== null }), 60);
    return () => clearTimeout(t);
  }, [fase, pikoEn, niveles.length, ancho, altoVista, subiendoDesde]);

  const jugar = useCallback(
    (nivel: NivelConEstado) => {
      const items = pickAdaptive(PACKS, {
        lang,
        themes: [nivel.theme],
        count: ITEMS_POR_NIVEL,
        state: estado,
      }).filter((x) => x.packId === nivel.packId);
      if (items.length === 0) return;
      setAviso(null);
      setSubiendoDesde(null);
      setJugada({ nivel, items });
      setFase('jugando');
    },
    [estado, lang],
  );

  if (fase === 'jugando' && jugada) {
    return (
      <Runner
        items={jugada.items.map((x) => x.item)}
        onResponder={(item, acerto, ms) => registrar(item, jugada.nivel.packId, acerto, ms)}
        onTerminar={(r) => {
          const estrellasAntes = jugada.nivel.estrellas;
          const yaSuperado = jugada.nivel.estado === 'superado';
          // La lección queda en el log antes de mostrar nada: si la app se
          // cierra en el resultado, el nivel y las sacuanjoches ya están.
          const recompensa = terminarLeccion(
            jugada.items.map((x) => x.item),
            r.aciertos,
          );
          setFinal({
            resultado: r,
            recompensa,
            estrellas: estrellasDe(r.aciertos, r.respondidas),
            estrellasAntes,
            nuevo: !yaSuperado,
            pikoAntes: pikoEn,
          });
          setFase('resultado');
        }}
        onSalir={() => setFase('camino')}
      />
    );
  }

  if (fase === 'resultado' && final && jugada) {
    const bien = final.resultado.aciertos / Math.max(1, final.resultado.respondidas) >= 0.7;
    const hayOtro = final.nuevo && !resumen.completo;
    return (
      <Pantalla>
        <ScrollView contentContainerStyle={styles.fin} showsVerticalScrollIndicator={false}>
          <PikoMascota estado={bien || final.nuevo ? 'celebrando' : 'alegre'} tam={150} />
          <Globo hacia="abajo">
            {final.nuevo ? elegir(SUBIR_NIVEL) : bien ? elegir(FIN_BIEN) : elegir(FIN_NORMAL)}
          </Globo>

          <ResultadoNivel
            numero={jugada.nivel.numero}
            titulo={jugada.nivel.titulo}
            estrellas={final.estrellas}
            mejorAntes={final.estrellasAntes}
            aciertos={final.resultado.aciertos}
            total={final.resultado.respondidas}
            desbloqueado={hayOtro ? jugada.nivel.numero + 1 : null}
          />

          <GanaSacuanjoches recompensa={final.recompensa} onVerArbol={() => router.push('/arbol')} />

          <View style={styles.acciones}>
            <Boton
              ancho
              onPress={() => {
                setSubiendoDesde(final.nuevo ? final.pikoAntes : null);
                setFase('camino');
              }}
            >
              {final.nuevo ? 'Subir con Piko' : 'Volver al camino'}
            </Boton>
            <Boton ancho tono="papel" onPress={() => jugar(jugada.nivel)}>
              Repetir el nivel
            </Boton>
          </View>
        </ScrollView>
      </Pantalla>
    );
  }

  return (
    <Pantalla acolchado={false} fondo={color.nube}>
      <View style={styles.cabecera}>
        <View style={styles.cabeceraTexto}>
          <Text style={styles.titulo}>Subí con Piko</Text>
          <Text style={styles.sub}>
            Nivel {resumen.nivel} de {resumen.total} · {resumen.estrellas}/{resumen.estrellasPosibles} estrellas
          </Text>
        </View>
        <ContadorSacuanjoches total={estado.sacuanjoches} onPress={() => router.push('/perfil')} />
      </View>

      {aviso && (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>{aviso}</Text>
        </View>
      )}

      <ScrollView
        ref={scroll}
        onLayout={(e) => setAltoVista(e.nativeEvent.layout.height)}
        contentContainerStyle={styles.camino}
        showsVerticalScrollIndicator={false}
      >
        <CaminoNiveles
          niveles={niveles}
          ancho={ancho}
          pikoEn={pikoEn}
          subiendoDesde={subiendoDesde}
          onElegir={jugar}
          onBloqueado={() => setAviso(elegir(NIVEL_CERRADO))}
          onLlego={() => setSubiendoDesde(null)}
        />
      </ScrollView>

      <View style={styles.pie}>
        <Boton ancho tono="papel" onPress={() => router.back()}>
          Volver
        </Boton>
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingHorizontal: espacio.xl,
    paddingTop: espacio.lg,
    paddingBottom: espacio.sm,
  },
  cabeceraTexto: { flex: 1 },
  titulo: { ...texto.display, color: color.verde },
  sub: { ...texto.chico, color: color.tinta },
  aviso: {
    marginHorizontal: espacio.xl,
    backgroundColor: color.intentoFondo,
    borderRadius: 12,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.md,
  },
  avisoTexto: { ...texto.cuerpoFuerte, color: color.intentoTinta, textAlign: 'center' },
  camino: { alignItems: 'center', paddingHorizontal: espacio.xl },
  pie: {
    paddingHorizontal: espacio.xl,
    paddingTop: espacio.sm,
    paddingBottom: espacio.md,
    backgroundColor: color.papel,
  },

  fin: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.lg, paddingBottom: espacio.lg },
  acciones: { alignSelf: 'stretch', gap: espacio.md, marginTop: espacio.sm },
});
