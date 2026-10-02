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
import { elegir } from '../src/ui/piko/frases';
import { useTextos } from '../src/ui/textos/useTextos';
import { esClave } from '../src/ui/textos/traducir';
import { Runner, type ResultadoRonda } from '../src/features/exercises/Runner';
import { useProgreso } from '../src/features/progreso/store';
import { RecompensaLeccion } from '../src/features/arbol/RecompensaLeccion';
import { ContadorSacuanjoches } from '../src/ui/arbol/ContadorSacuanjoches';
import type { Recompensa } from '../src/core/progress/arbol';
import { color, espacio, radio, texto } from '../src/ui/tokens';
import { PACKS } from '../content';
import { pickAdaptive, temasDe } from '../src/core/content/selector';
import { LANGS, type LangCode } from '../src/core/content/schema';

const ITEMS_POR_RONDA = 8;

/** Las lenguas que se pueden aprender desde `desde`: las que tienen ejercicios. */
const conContenido = (desde: LangCode) => LANGS.filter((l) => temasDe(PACKS, l, desde).length > 0);

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

  const { t, frases, desde } = useTextos();
  const disponibles = useMemo(() => conContenido(desde), [desde]);
  const [elegida, setLang] = useState<LangCode>('eng');
  // Al cambiar la lengua de la app cambian las que se pueden aprender.
  const lang: LangCode = disponibles.includes(elegida) ? elegida : (disponibles[0] ?? elegida);
  const temas = useMemo(() => temasDe(PACKS, lang, desde), [lang, desde]);
  const nombreTema = (tema: string): string => {
    const clave = `tema.${tema}`;
    return esClave(clave) ? t(clave) : tema.charAt(0).toLocaleUpperCase() + tema.slice(1);
  };

  const [items, setItems] = useState<ReturnType<typeof pickAdaptive>>([]);

  const empezar = useCallback(
    (elegido: string | null) => {
      const seleccion = pickAdaptive(PACKS, {
        lang,
        desde,
        themes: elegido ? [elegido] : undefined,
        count: ITEMS_POR_RONDA,
        state: estado,
      });
      if (seleccion.length === 0) return;
      setTema(elegido);
      setItems(seleccion);
      setFase('jugando');
    },
    [estado, lang, desde],
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
    const frase = recompensa?.crecioArbol
      ? elegir(frases('piko.arbol_crece'))
      : recompensa?.subioNivel
        ? elegir(frases('piko.subir_nivel'))
        : bien
          ? elegir(frases('piko.fin_bien'))
          : elegir(frases('piko.fin_normal'));
    return (
      <Pantalla>
        <ScrollView contentContainerStyle={styles.fin} showsVerticalScrollIndicator={false}>
          {recompensa ? (
            <>
              <Globo hacia="abajo">{frase}</Globo>
              {/* Piko está en su madroño: el árbol y la subida son el festejo. */}
              <RecompensaLeccion recompensa={recompensa} onVerArbol={() => router.push('/arbol')} />
            </>
          ) : (
            <>
              <PikoMascota estado={bien ? 'celebrando' : 'alegre'} tam={190} />
              <Globo hacia="abajo">{frase}</Globo>
            </>
          )}

          <View style={styles.marcador}>
            <Dato valor={`${resultado.aciertos}/${resultado.respondidas}`} etiqueta={t('resultado.correctas')} />
            <Dato valor={String(estado.xp)} etiqueta={t('comun.xp_total')} />
            <Dato valor={String(estado.bestStreak)} etiqueta={t('resultado.mejor_racha')} />
          </View>

          <View style={styles.acciones}>
            <Boton ancho onPress={() => empezar(tema)}>
              {t('resultado.otra_ronda')}
            </Boton>
            <Boton ancho tono="papel" onPress={() => setFase('elegir')}>
              {t('resultado.cambiar_tema')}
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
            <Text style={styles.titulo}>{t(`lengua.${lang}`)}</Text>
            <Text style={styles.sub}>
              {t('comun.xp_correctas', { xp: estado.xp, correctas: estado.correct, respondidas: estado.answered })}
            </Text>
          </View>
          <ContadorSacuanjoches total={estado.sacuanjoches} onPress={() => router.push('/perfil')} />
        </View>

        {disponibles.length === 0 && <Text style={styles.sub}>{t('practicar.sin_contenido')}</Text>}

        {disponibles.length > 1 && (
          <>
            <Text style={styles.instruccion}>{t('practicar.elegir_lengua')}</Text>
            <View style={styles.lenguas}>
              {disponibles.map((l) => (
                <View key={l} style={styles.lengua}>
                  <Opcion estado={l === lang ? 'elegida' : 'normal'} onPress={() => setLang(l)}>
                    {t(`lengua.${l}`)}
                  </Opcion>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.instruccion}>{t('practicar.elegir_tema')}</Text>

        <View style={styles.temas}>
          <Opcion onPress={() => empezar(null)}>{t('practicar.todo_mezclado')}</Opcion>
          {temas.map((tema) => (
            <Opcion key={tema} onPress={() => empezar(tema)}>
              {nombreTema(tema)}
            </Opcion>
          ))}
        </View>

        <Boton ancho tono="fantasma" onPress={() => router.back()}>
          {t('comun.volver')}
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
  lenguas: { flexDirection: 'row', gap: espacio.md },
  lengua: { flex: 1 },

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
