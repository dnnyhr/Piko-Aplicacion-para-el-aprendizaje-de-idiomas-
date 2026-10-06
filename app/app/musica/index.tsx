/**
 * La Música de Piko: canciones de Nicaragua, sobre todo de la Costa Caribe,
 * para aprender vocabulario, escucha y cultura.
 *
 * «Aprendemos un idioma nuevo sin dejar atrás nuestra propia voz.»
 *
 * Cada canción es una tarjeta, agrupadas por dificultad. La dificultad va
 * con el nivel del estudiante: se abren las canciones de su nivel (el que le
 * dan sus lecciones de inglés) y las de abajo; completar una canción también
 * abre las del nivel siguiente. Las canciones salen de `content/canciones/` y sólo
 * están las que tienen permiso de uso.
 */

import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Boton } from '../../src/ui/components/Boton';
import { Globo } from '../../src/ui/components/Globo';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { PikoMascota } from '../../src/ui/piko/PikoMascota';
import { ContadorSacuanjoches } from '../../src/ui/arbol/ContadorSacuanjoches';
import { Candado } from '../../src/ui/minijuegos/Iconos';
import { Instrumento, Nota } from '../../src/ui/musica/Instrumento';
import { useTextos } from '../../src/ui/textos/useTextos';
import { useProgreso } from '../../src/features/progreso/store';
import { useNivelMusical } from '../../src/features/musica/useNivelMusical';
import { cancionesAbiertas, NIVELES_CANCION, type Cancion } from '../../src/core/canciones/cancion';
import { CANCIONES } from '../../content/canciones';
import { color, espacio, labio, radio, texto } from '../../src/ui/tokens';

/** El nivel anterior, para decir qué hace falta para abrir una canción. */
const ANTERIOR = { inicial: 'inicial', intermedio: 'inicial', avanzado: 'intermedio' } as const;

export default function Musica() {
  const router = useRouter();
  const { t } = useTextos();
  const estado = useProgreso((s) => s.estado);
  const nivel = useNivelMusical();

  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const abiertas = useMemo(
    () => cancionesAbiertas(CANCIONES, estado.cancionesCompletas, nivel),
    [estado.cancionesCompletas, nivel],
  );
  const completas = new Set(estado.cancionesCompletas);
  const total = CANCIONES.length;
  const hechas = CANCIONES.filter((c) => completas.has(c.id)).length;
  const nombreLengua = (c: Cancion) => t(`lengua.${c.lengua}`);

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecera}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('comun.volver')} style={styles.redondo}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color.tinta} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 5 L8 12 L15 19" />
            </Svg>
          </Pressable>
          <Text style={styles.titulo} accessibilityRole="header">
            {t('musica.titulo')}
          </Text>
          <ContadorSacuanjoches total={estado.sacuanjoches} onPress={() => router.push('/perfil')} />
        </View>

        <View style={styles.escenario}>
          <View style={[styles.nota, { left: 18, top: 14 }]}>
            <Nota tam={22} tinte={color.verdeHoja} />
          </View>
          <View style={[styles.nota, { left: 120, top: 6 }]}>
            <Nota tam={16} tinte={color.copete} />
          </View>
          <PikoMascota estado="saludando" tam={120} />
          <View style={styles.instrumentos}>
            <Instrumento imagen="tambor" tam={56} fondo="transparent" />
            <Instrumento imagen="marimba" tam={56} fondo="transparent" />
          </View>
        </View>
        <Globo hacia="abajo">{t('musica.lema')}</Globo>

        {total > 0 && <Text style={styles.cuenta}>{t('musica.completadas', { n: hechas, total })}</Text>}
        {total > 0 && <Text style={styles.tuNivel}>{t('musica.tu_nivel', { nivel: t(`minijuegos.nivel_${nivel}`) })}</Text>}

        {total === 0 ? (
          <View style={styles.vacia}>
            <Instrumento imagen="guitarra" tam={72} />
            <Text style={styles.vaciaTitulo}>{t('musica.vacia_titulo')}</Text>
            <Text style={styles.vaciaTexto}>{t('musica.vacia')}</Text>
          </View>
        ) : (
          NIVELES_CANCION.map((n) => {
            const delNivel = CANCIONES.filter((c) => c.nivel === n);
            if (delNivel.length === 0) return null;
            return (
              <View key={n} style={styles.grupo}>
                <View style={styles.grupoCabecera}>
                  <Text style={styles.grupoTitulo}>{t(`minijuegos.nivel_${n}`)}</Text>
                  {n === nivel && (
                    <View style={styles.sello}>
                      <Text style={styles.selloTexto}>{t('musica.para_tu_nivel')}</Text>
                    </View>
                  )}
                </View>
                {delNivel.map((c) => {
            const abierta = abiertas.has(c.id);
            const hecha = completas.has(c.id);
            return (
              <View key={c.id} style={[styles.tarjeta, !abierta ? styles.tarjetaCerrada : null]}>
                <View style={styles.fila}>
                  <Instrumento imagen={c.imagen} tam={72} />
                  <View style={styles.textos}>
                    <Text style={styles.nombre}>{c.titulo}</Text>
                    <Text style={styles.detalle}>{t('musica.lengua_region', { lengua: nombreLengua(c), region: c.region })}</Text>
                    <Text style={styles.detalle}>{c.comunidad}</Text>
                    {hecha && <Text style={styles.hecha}>{t('musica.completada')}</Text>}
                  </View>
                </View>
                {abierta ? (
                  <Boton ancho onPress={() => router.push(`/musica/${c.id}` as Href)}>
                    {hecha ? t('musica.repetir') : t('musica.comenzar')}
                  </Boton>
                ) : (
                  <View style={styles.cerrada}>
                    <Candado />
                    <Text style={styles.detalle}>
                      {t('musica.bloqueada_nivel', { nivel: t(`minijuegos.nivel_${c.nivel}`), anterior: t(`minijuegos.nivel_${ANTERIOR[c.nivel]}`) })}
                    </Text>
                  </View>
                )}
              </View>
            );
                })}
              </View>
            );
          })
        )}
      </ScrollView>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  contenido: { flexGrow: 1, gap: espacio.lg, paddingBottom: espacio.xl },
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
  titulo: { ...texto.titulo, flex: 1, color: color.verde },
  escenario: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: espacio.lg,
    backgroundColor: color.nube,
    borderRadius: radio.xl,
    borderWidth: 2,
    borderColor: color.borde,
    paddingTop: espacio.lg,
    paddingBottom: espacio.md,
  },
  nota: { position: 'absolute' },
  instrumentos: { gap: espacio.xs, marginBottom: espacio.sm },
  cuenta: { ...texto.cuerpoFuerte, color: color.verde, textAlign: 'center' },
  tuNivel: { ...texto.chico, color: color.tinta, textAlign: 'center', marginTop: -espacio.sm },
  grupo: { gap: espacio.md },
  grupoCabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm, marginTop: espacio.sm },
  grupoTitulo: { ...texto.subtitulo, color: color.grafito },
  sello: { backgroundColor: color.verdePasto, borderRadius: radio.redondo, paddingHorizontal: espacio.sm, paddingVertical: 2 },
  selloTexto: { ...texto.etiqueta, fontSize: 11, color: color.verdeHondo },
  vacia: {
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: color.blanco,
    borderRadius: radio.xl,
    borderWidth: 2,
    borderColor: color.borde,
    padding: espacio.xl,
  },
  vaciaTitulo: { ...texto.subtitulo, color: color.grafito, textAlign: 'center' },
  vaciaTexto: { ...texto.cuerpo, color: color.tinta, textAlign: 'center' },
  tarjeta: {
    gap: espacio.lg,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderBottomWidth: 2 + labio.normal,
    borderBottomColor: color.bordeHondo,
    borderRadius: radio.xl,
    padding: espacio.lg,
  },
  tarjetaCerrada: { backgroundColor: color.papelHondo, borderBottomWidth: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.lg },
  textos: { flex: 1, gap: 2 },
  nombre: { ...texto.subtitulo, color: color.grafito },
  detalle: { ...texto.chico, color: color.tinta, flexShrink: 1 },
  hecha: { ...texto.etiqueta, fontSize: 11, color: color.aciertoTinta },
  cerrada: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
});
