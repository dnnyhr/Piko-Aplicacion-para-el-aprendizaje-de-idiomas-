/**
 * Una canción de «La Música de Piko»: primero «Conoce nuestra canción», luego
 * las cinco etapas y al final la recompensa.
 *
 * Canción → aprender → completar retos → ganar sacuanjoches → crece el
 * madroño. La canción terminada entra al mismo log de progreso que las
 * lecciones y los minijuegos (evento `gameDone`, juego `musica`): suma al
 * total, se ve en el perfil y vale una vez por día.
 */

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Boton } from '../../src/ui/components/Boton';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { PikoMascota } from '../../src/ui/piko/PikoMascota';
import { Instrumento } from '../../src/ui/musica/Instrumento';
import { useTextos } from '../../src/ui/textos/useTextos';
import { elegir } from '../../src/ui/piko/frases';
import { useProgreso } from '../../src/features/progreso/store';
import { decir, vozDePiko } from '../../src/features/minijuegos/voz';
import { FinPartida } from '../../src/features/minijuegos/FinPartida';
import { useNivelMusical } from '../../src/features/musica/useNivelMusical';
import { Experiencia, type ResultadoCancion } from '../../src/features/musica/Experiencia';
import { cancionesAbiertas, ID_MUSICA } from '../../src/core/canciones/cancion';
import { diaLocal } from '../../src/core/minijuegos/vocabulario';
import { clavePremio, yaPremiado } from '../../src/core/progress/projection';
import type { Recompensa } from '../../src/core/progress/arbol';
import { CANCIONES } from '../../content/canciones';
import { AUDIOS } from '../../content/canciones/audios';
import { color, espacio, radio, texto } from '../../src/ui/tokens';

type Fase = 'conoce' | 'cancion' | 'fin';

interface Final {
  recompensa: Recompensa;
  resultado: ResultadoCancion;
  repetida: boolean;
  titulo: string;
}

export default function CancionPantalla() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, frases, idioma } = useTextos();
  const terminarMinijuego = useProgreso((s) => s.terminarMinijuego);
  const completas = useProgreso((s) => s.estado.cancionesCompletas);
  const nivel = useNivelMusical();
  const [fase, setFase] = useState<Fase>('conoce');
  const [intento, setIntento] = useState(0);
  const [final, setFinal] = useState<Final | null>(null);
  const [premiable, setPremiable] = useState(true);

  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const encontrada = CANCIONES.find((x) => x.id === id);
  const audio = encontrada ? AUDIOS[encontrada.id] : undefined;
  const abierta = encontrada ? cancionesAbiertas(CANCIONES, completas, nivel).has(encontrada.id) : false;
  if (!encontrada || audio === undefined || !abierta) {
    return (
      <Pantalla>
        <View style={styles.centro}>
          <PikoMascota estado="pensando" tam={140} />
          <Boton onPress={() => router.replace('/musica')}>{t('comun.volver')}</Boton>
        </View>
      </Pantalla>
    );
  }
  const c = encontrada;

  const empezar = () => {
    const actual = useProgreso.getState().estado;
    setPremiable(!yaPremiado(actual, clavePremio(ID_MUSICA, c.lengua, c.id), diaLocal()));
    setIntento((n) => n + 1);
    setFinal(null);
    setFase('cancion');
  };

  const terminar = (resultado: ResultadoCancion) => {
    const recompensa = terminarMinijuego({
      game: ID_MUSICA,
      lang: c.lengua,
      level: c.id,
      correct: resultado.correct,
      total: resultado.total,
      streak: resultado.streak,
      day: diaLocal(),
    });
    const titulo =
      recompensa.ganadas > 0
        ? recompensa.crecioArbol
          ? elegir(frases('piko.arbol_crece'))
          : t('musica.fin_bien')
        : !premiable
          ? t('musica.fin_repetida')
          : t('musica.fin_sin_flores');
    decir([vozDePiko(titulo, idioma)]);
    setFinal({ recompensa, resultado, repetida: !premiable, titulo });
    setFase('fin');
  };

  if (fase === 'cancion') {
    return (
      <Pantalla>
        <Experiencia key={intento} cancion={c} audio={audio} premiable={premiable} onTerminar={terminar} onSalir={() => setFase('conoce')} />
      </Pantalla>
    );
  }

  if (fase === 'fin' && final) {
    const r = final.resultado;
    return (
      <Pantalla>
        <FinPartida
          recompensa={final.recompensa}
          repetida={final.repetida}
          titulo={final.titulo}
          explicacionSinFlores={t('musica.sin_flores_explica')}
          datos={[
            { valor: `${r.correct}/${r.total}`, etiqueta: t('musica.aciertos') },
            { valor: String(r.streak), etiqueta: t('musica.mejor_racha') },
            { valor: `+${final.recompensa.ganadas}`, etiqueta: t('minijuegos.sacuanjoches') },
          ]}
          textoReintentar={t('musica.de_nuevo')}
          textoOtra={t('musica.otra_cancion')}
          onReintentar={empezar}
          onOtra={() => router.replace('/musica')}
          onVerArbol={() => router.push('/arbol')}
        />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.portada}>
          <Instrumento imagen={c.imagen} tam={96} />
          <View style={styles.textos}>
            <Text style={styles.titulo} accessibilityRole="header">
              {c.titulo}
            </Text>
            <Text style={styles.detalle}>{t('musica.lengua_region', { lengua: t(`lengua.${c.lengua}`), region: c.region })}</Text>
            <Text style={styles.detalle}>{c.comunidad}</Text>
          </View>
        </View>

        <View style={styles.conoce}>
          <Text style={styles.subtitulo}>{t('musica.conoce')}</Text>
          <Text style={styles.cultura}>{c.lengua === 'eng' ? t('musica.cultura_mundo') : t('musica.cultura')}</Text>
          <Dato etiqueta={t('musica.de_donde')} valor={c.conoce.origen} />
          <Dato etiqueta={t('musica.lengua')} valor={c.conoce.lengua} />
          <Dato etiqueta={t('musica.region')} valor={c.conoce.region} />
          <Dato etiqueta={t('musica.representa')} valor={c.conoce.representa} />
          {c.miskito && c.miskito.length > 0 && (
            <View style={styles.miskito}>
              <Text style={styles.datoEtiqueta}>{t('musica.en_miskito')}</Text>
              <View style={styles.chips}>
                {c.miskito.map((m) => (
                  <View key={m.lexico} style={styles.chip}>
                    <Text style={styles.chipMiq}>{m.miq}</Text>
                    <Text style={styles.chipEs}>
                      {m.en} · {m.es}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.credito}>{t('musica.miskito_validado')}</Text>
            </View>
          )}
          <Text style={styles.credito}>
            {t('musica.canta', { quien: c.fuente.interpreta })}
            {c.fuente.autoria !== c.fuente.interpreta ? ` · ${t('musica.autoria', { quien: c.fuente.autoria })}` : ''}
          </Text>
        </View>

        <View style={styles.acciones}>
          <Boton ancho onPress={empezar}>
            {t('musica.comenzar')}
          </Boton>
          <Boton ancho tono="fantasma" onPress={() => router.back()}>
            {t('comun.volver')}
          </Boton>
        </View>
      </ScrollView>
    </Pantalla>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espacio.xl },
  contenido: { flexGrow: 1, gap: espacio.xl, paddingBottom: espacio.xl },
  portada: { flexDirection: 'row', alignItems: 'center', gap: espacio.lg },
  textos: { flex: 1, gap: 2 },
  titulo: { ...texto.titulo, color: color.verde },
  detalle: { ...texto.chico, color: color.tinta },
  conoce: {
    gap: espacio.md,
    backgroundColor: color.blanco,
    borderRadius: radio.xl,
    borderWidth: 2,
    borderColor: color.borde,
    padding: espacio.lg,
  },
  subtitulo: { ...texto.subtitulo, color: color.grafito },
  cultura: { ...texto.cuerpoFuerte, color: color.verde },
  dato: { gap: 2 },
  datoEtiqueta: { ...texto.etiqueta, fontSize: 11, color: color.tintaSuave },
  datoValor: { ...texto.cuerpo, color: color.grafito },
  credito: { ...texto.chico, color: color.tintaSuave },
  miskito: { gap: espacio.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  chip: { backgroundColor: color.nube, borderRadius: radio.md, paddingHorizontal: espacio.md, paddingVertical: espacio.xs },
  chipMiq: { ...texto.cuerpoFuerte, color: color.verde },
  chipEs: { ...texto.chico, color: color.tinta },
  acciones: { gap: espacio.md, marginTop: 'auto' },
});
