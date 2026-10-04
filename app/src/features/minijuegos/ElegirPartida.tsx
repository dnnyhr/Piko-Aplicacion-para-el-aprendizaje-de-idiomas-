/**
 * Antes de jugar cualquier minijuego: en qué lengua y en qué nivel.
 *
 * Los niveles se abren con las lecciones: el que aparece elegido es el más
 * alto que ya tiene abierto, y los cerrados dicen cuánto falta.
 */

import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Candado, Globito } from '../../ui/minijuegos/Iconos';
import { Boton } from '../../ui/components/Boton';
import { PikoMascota } from '../../ui/piko/PikoMascota';
import { ContadorSacuanjoches } from '../../ui/arbol/ContadorSacuanjoches';
import { useTextos } from '../../ui/textos/useTextos';
import { esClave } from '../../ui/textos/traducir';
import {
  LENGUAS_MINIJUEGOS,
  type EstadoNivel,
  type LenguaMinijuego,
  type NivelMinijuego,
} from '../../core/minijuegos/vocabulario';
import { color, espacio, labio, radio, texto } from '../../ui/tokens';

export interface ElegirPartidaProps {
  /** El nombre del juego, arriba. */
  titulo: string;
  /** Piko con el juego, en grande. */
  portada: ReactNode;
  /** «¿En qué lengua querés…?» */
  pregunta: string;
  /** El dibujo de cada lengua en su tarjeta. */
  iconoLengua: (l: LenguaMinijuego) => ReactNode;
  /** Lo que trae cada nivel, corto: «3 casillas». */
  detalleNivel: (n: NivelMinijuego) => string;
  /** Lo que trae el nivel elegido, en una oración. */
  descNivel: (n: NivelMinijuego) => string;
  /** El botón para empezar. */
  empezar: string;
  lengua: LenguaMinijuego;
  nivel: NivelMinijuego | null;
  niveles: readonly EstadoNivel[];
  sugerido: NivelMinijuego | null;
  /** Temas estudiados en cada lengua, para mostrar de dónde salen las palabras. */
  temas: Record<LenguaMinijuego, readonly string[]>;
  sacuanjoches: number;
  onLengua: (l: LenguaMinijuego) => void;
  onNivel: (n: NivelMinijuego) => void;
  onEmpezar: () => void;
  onPracticar: () => void;
  onVolver: () => void;
  onPerfil: () => void;
}

export function ElegirPartida({
  titulo,
  portada,
  pregunta,
  iconoLengua,
  detalleNivel,
  descNivel,
  empezar,
  lengua,
  nivel,
  niveles,
  sugerido,
  temas,
  sacuanjoches,
  onLengua,
  onNivel,
  onEmpezar,
  onPracticar,
  onVolver,
  onPerfil,
}: ElegirPartidaProps) {
  const { t } = useTextos();
  const nombreTema = (tema: string) => {
    const k = `tema.${tema}`;
    return esClave(k) ? t(k) : tema;
  };
  const hayAlgo = niveles.some((n) => n.abierto);

  return (
    <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
      <View style={styles.cabecera}>
        <Pressable onPress={onVolver} accessibilityRole="button" accessibilityLabel={t('comun.volver')} style={styles.redondo}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color.tinta} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M15 5 L8 12 L15 19" />
          </Svg>
        </Pressable>
        <Text style={styles.titulo} accessibilityRole="header">
          {titulo}
        </Text>
        <ContadorSacuanjoches total={sacuanjoches} onPress={onPerfil} />
      </View>

      <View style={styles.portada} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <PikoMascota estado="saludando" tam={120} />
        {portada}
      </View>

      <Text style={styles.pregunta}>{pregunta}</Text>
      <View style={styles.lenguas}>
        {LENGUAS_MINIJUEGOS.map((l) => {
          const elegida = l === lengua;
          const suyos = temas[l];
          return (
            <Pressable
              key={l}
              onPress={() => onLengua(l)}
              accessibilityRole="radio"
              accessibilityState={{ checked: elegida }}
              style={[styles.lengua, elegida ? styles.lenguaElegida : null]}
            >
              {iconoLengua(l)}
              <View style={styles.lenguaTextos}>
                <Text style={styles.lenguaNombre}>{t(`lengua.${l}`)}</Text>
                <Text style={styles.lenguaSub} numberOfLines={1}>
                  {suyos.length > 0 ? suyos.map(nombreTema).join(', ') : t('minijuegos.sin_vocabulario', { lengua: t(`lengua.${l}`) })}
                </Text>
              </View>
              <View style={[styles.radio, elegida ? styles.radioElegido : null]}>
                {elegida && (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color.blanco} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M5 12 L10 17 L19 7" />
                  </Svg>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {hayAlgo ? (
        <>
          <View style={styles.nivelCabecera}>
            <Text style={styles.subtitulo}>{t('minijuegos.nivel')}</Text>
            {sugerido && <Text style={styles.chico}>{t('minijuegos.segun_lecciones', { nivel: t(`minijuegos.nivel_${sugerido}`) })}</Text>}
          </View>
          <View style={styles.niveles} accessibilityRole="radiogroup">
            {niveles.map((n) => {
              const elegido = n.nivel === nivel;
              return (
                <Pressable
                  key={n.nivel}
                  onPress={() => onNivel(n.nivel)}
                  disabled={!n.abierto}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: elegido, disabled: !n.abierto }}
                  style={[styles.nivel, elegido ? styles.lenguaElegida : null, !n.abierto ? styles.nivelCerrado : null]}
                >
                  {n.nivel === sugerido && (
                    <View style={styles.sello}>
                      <Text style={styles.selloTexto}>{t('minijuegos.sugerido')}</Text>
                    </View>
                  )}
                  {!n.abierto && <Candado />}
                  <Text style={styles.nivelNombre}>{t(`minijuegos.nivel_${n.nivel}`)}</Text>
                  <Text style={styles.nivelSub}>
                    {n.abierto
                      ? detalleNivel(n.nivel)
                      : n.faltanLecciones > 0
                        ? t('minijuegos.bloqueado', { n: n.faltanLecciones })
                        : t('minijuegos.bloqueado_palabras')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {nivel && <Text style={styles.desc}>{descNivel(nivel)}</Text>}

          <View style={styles.pie}>
            <View style={styles.nota}>
              <Globito />
              <Text style={styles.chico}>{t('minijuegos.cambiar_lengua')}</Text>
            </View>
            <Boton ancho onPress={onEmpezar} disabled={!nivel}>
              {empezar}
            </Boton>
          </View>
        </>
      ) : (
        <View style={styles.pie}>
          <Text style={styles.desc}>{t('minijuegos.sin_vocabulario', { lengua: t(`lengua.${lengua}`) })}</Text>
          <Boton ancho onPress={onPracticar}>
            {t('minijuegos.ir_a_practicar')}
          </Boton>
        </View>
      )}
    </ScrollView>
  );
}

const tarjeta = {
  backgroundColor: color.blanco,
  borderWidth: 2,
  borderColor: color.borde,
  borderBottomWidth: 2 + labio.normal,
  borderBottomColor: color.bordeHondo,
} as const;

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
  portada: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: espacio.xl,
    backgroundColor: color.nube,
    borderRadius: radio.xl,
    paddingTop: espacio.lg,
    paddingBottom: espacio.md,
    borderWidth: 2,
    borderColor: color.borde,
  },
  pregunta: { ...texto.subtitulo, color: color.grafito },
  lenguas: { gap: espacio.md },
  lengua: {
    ...tarjeta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    minHeight: 76,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
    borderRadius: radio.lg,
  },
  lenguaElegida: { backgroundColor: color.nube, borderColor: color.cielo, borderBottomColor: color.cieloHondo },
  lenguaTextos: { flex: 1 },
  lenguaNombre: { ...texto.subtitulo, color: color.grafito },
  lenguaSub: { ...texto.chico, color: color.tinta },
  radio: {
    width: 26,
    height: 26,
    borderRadius: radio.redondo,
    borderWidth: 2,
    borderColor: color.bordeHondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioElegido: { backgroundColor: color.verde, borderColor: color.verde },
  nivelCabecera: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: espacio.sm },
  subtitulo: { ...texto.subtitulo, color: color.grafito },
  chico: { ...texto.chico, color: color.tinta, flexShrink: 1 },
  niveles: { flexDirection: 'row', gap: espacio.sm },
  nivel: {
    ...tarjeta,
    flex: 1,
    minHeight: 72,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.xs,
    paddingVertical: espacio.sm,
    gap: 2,
  },
  nivelCerrado: { backgroundColor: color.papelHondo, borderBottomWidth: 2 },
  nivelNombre: { ...texto.cuerpoFuerte, fontFamily: 'Fredoka_600SemiBold', color: color.grafito },
  nivelSub: { ...texto.chico, fontSize: 12, lineHeight: 16, color: color.tinta, textAlign: 'center' },
  sello: {
    position: 'absolute',
    top: -10,
    right: 6,
    backgroundColor: color.verdePasto,
    borderRadius: radio.redondo,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  selloTexto: { fontFamily: 'Fredoka_600SemiBold', fontSize: 11, color: color.verdeHondo },
  desc: { ...texto.cuerpo, color: color.tinta },
  pie: { marginTop: 'auto', gap: espacio.md },
  nota: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
});
