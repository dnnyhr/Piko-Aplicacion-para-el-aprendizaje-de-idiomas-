/**
 * Antes de saltar: en qué lengua y en qué nivel.
 *
 * Los niveles se abren con las lecciones: el que aparece elegido es el más
 * alto que ya tiene abierto, y los cerrados dicen cuánto falta.
 */

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Boton } from '../../../ui/components/Boton';
import { PikoMascota } from '../../../ui/piko/PikoMascota';
import { ContadorSacuanjoches } from '../../../ui/arbol/ContadorSacuanjoches';
import { Bandera } from '../../../ui/minijuegos/Bandera';
import { IconoRayuela } from '../../../ui/minijuegos/IconoRayuela';
import { useTextos } from '../../../ui/textos/useTextos';
import { esClave } from '../../../ui/textos/traducir';
import {
  CASILLAS,
  LENGUAS_RAYUELA,
  type EstadoNivel,
  type LenguaRayuela,
  type NivelRayuela,
} from '../../../core/minijuegos/rayuela';
import { color, espacio, labio, radio, texto } from '../../../ui/tokens';

export interface ElegirProps {
  lengua: LenguaRayuela;
  nivel: NivelRayuela | null;
  niveles: readonly EstadoNivel[];
  sugerido: NivelRayuela | null;
  /** Temas estudiados en cada lengua, para mostrar de dónde salen las palabras. */
  temas: Record<LenguaRayuela, readonly string[]>;
  sacuanjoches: number;
  onLengua: (l: LenguaRayuela) => void;
  onNivel: (n: NivelRayuela) => void;
  onEmpezar: () => void;
  onPracticar: () => void;
  onVolver: () => void;
  onPerfil: () => void;
}

export function Elegir({
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
}: ElegirProps) {
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
          {t('rayuela.nombre')}
        </Text>
        <ContadorSacuanjoches total={sacuanjoches} onPress={onPerfil} />
      </View>

      <View style={styles.portada} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <PikoMascota estado="saludando" tam={120} />
        <IconoRayuela tam={110} />
      </View>

      <Text style={styles.pregunta}>{t('rayuela.elegir_lengua')}</Text>
      <View style={styles.lenguas}>
        {LENGUAS_RAYUELA.map((l) => {
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
              <Bandera lengua={l} />
              <View style={styles.lenguaTextos}>
                <Text style={styles.lenguaNombre}>{t(`lengua.${l}`)}</Text>
                <Text style={styles.lenguaSub} numberOfLines={1}>
                  {suyos.length > 0 ? suyos.map(nombreTema).join(', ') : t('rayuela.sin_vocabulario', { lengua: t(`lengua.${l}`) })}
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
            <Text style={styles.subtitulo}>{t('rayuela.nivel')}</Text>
            {sugerido && <Text style={styles.chico}>{t('rayuela.segun_lecciones', { nivel: t(`rayuela.nivel_${sugerido}`) })}</Text>}
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
                      <Text style={styles.selloTexto}>{t('rayuela.sugerido')}</Text>
                    </View>
                  )}
                  {!n.abierto && <Candado />}
                  <Text style={styles.nivelNombre}>{t(`rayuela.nivel_${n.nivel}`)}</Text>
                  <Text style={styles.nivelSub}>
                    {n.abierto
                      ? t('rayuela.casillas', { n: CASILLAS[n.nivel] })
                      : n.faltanLecciones > 0
                        ? t('rayuela.bloqueado', { n: n.faltanLecciones })
                        : t('rayuela.bloqueado_palabras')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {nivel && <Text style={styles.desc}>{t(`rayuela.desc_${nivel}`)}</Text>}

          <View style={styles.pie}>
            <View style={styles.nota}>
              <Globito />
              <Text style={styles.chico}>{t('rayuela.cambiar_lengua')}</Text>
            </View>
            <Boton ancho onPress={onEmpezar} disabled={!nivel}>
              {t('rayuela.a_saltar')}
            </Boton>
          </View>
        </>
      ) : (
        <View style={styles.pie}>
          <Text style={styles.desc}>{t('rayuela.sin_vocabulario', { lengua: t(`lengua.${lengua}`) })}</Text>
          <Boton ancho onPress={onPracticar}>
            {t('rayuela.ir_a_practicar')}
          </Boton>
        </View>
      )}
    </ScrollView>
  );
}

function Candado() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color.tintaSuave} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M7 11 V8 a5 5 0 0 1 10 0 V11" />
      <Path d="M5 11 H19 V20 H5 Z" />
    </Svg>
  );
}

export function Globito({ tam = 18, tinta = color.tintaSuave }: { tam?: number; tinta?: string }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={tinta} strokeWidth={2} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12 H21 M12 3 C15.5 6.5 15.5 17.5 12 21 M12 3 C8.5 6.5 8.5 17.5 12 21" />
    </Svg>
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
