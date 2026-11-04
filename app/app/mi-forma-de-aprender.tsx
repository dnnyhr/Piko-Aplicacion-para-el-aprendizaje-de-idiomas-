/**
 * Mi forma de aprender.
 *
 * Cada quien acomoda Piko como le sirve. Son gustos, no etiquetas: la pantalla
 * nunca pregunta por qué ni clasifica a nadie, y se puede combinar todo.
 * Cada cambio se ve al instante y queda guardado en el teléfono.
 */

import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Boton } from '../src/ui/components/Boton';
import { Globo } from '../src/ui/components/Globo';
import { Marca } from '../src/ui/components/Marca';
import { Pantalla } from '../src/ui/components/Pantalla';
import { PikoMascota } from '../src/ui/piko/PikoMascota';
import { Parlante } from '../src/ui/minijuegos/Iconos';
import { crearEstilos, useColor } from '../src/ui/tema';
import { espacio, labio, radio, texto } from '../src/ui/tokens';
import { useTextos } from '../src/ui/textos/useTextos';
import { usePreferencias } from '../src/features/preferencias/store';
import { useNarrador } from '../src/features/instrucciones/useNarrador';
import { TAMANOS, tamanoVecino } from '../src/core/preferencias/preferencias';
import { RECURSOS_SENAS } from '../content/senas';

export default function MiFormaDeAprender() {
  const styles = useEstilos();
  const color = useColor();
  const router = useRouter();
  const { t } = useTextos();
  const { voz, decir } = useNarrador();
  const { tamano, contraste, narracion, pasoAPaso, senas, cambiar, restablecer } = usePreferencias();
  const nivel = TAMANOS.indexOf(tamano);

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
            {t('forma.titulo')}
          </Text>
        </View>

        <View style={styles.saludo}>
          <PikoMascota estado="saludando" tam={96} />
          <Globo style={styles.globo}>{t('forma.saludo')}</Globo>
        </View>

        <View style={styles.tarjeta}>
          <View style={styles.fila}>
            <View style={styles.icono}>
              <Text style={styles.iconoLetras}>Aa</Text>
            </View>
            <View style={styles.textos}>
              <Text style={styles.nombre}>{t('forma.letras')}</Text>
              <Text style={styles.ayuda} accessibilityLiveRegion="polite">
                {t(`forma.tam_${tamano}`)}
              </Text>
            </View>
          </View>
          <View style={styles.tamanos}>
            <Pressable
              onPress={() => cambiar({ tamano: tamanoVecino(tamano, -1) })}
              disabled={nivel === 0}
              accessibilityRole="button"
              accessibilityLabel={t('forma.mas_chicas')}
              accessibilityState={{ disabled: nivel === 0 }}
              style={[styles.tamanoBoton, nivel === 0 ? styles.apagado : null]}
            >
              <Text style={styles.tamanoMenos}>A−</Text>
            </Pressable>
            <View style={styles.puntos} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {TAMANOS.map((x, i) => (
                <View key={x} style={[styles.punto, i <= nivel ? styles.puntoLleno : null]} />
              ))}
            </View>
            <Pressable
              onPress={() => cambiar({ tamano: tamanoVecino(tamano, 1) })}
              disabled={nivel === TAMANOS.length - 1}
              accessibilityRole="button"
              accessibilityLabel={t('forma.mas_grandes')}
              accessibilityState={{ disabled: nivel === TAMANOS.length - 1 }}
              style={[styles.tamanoBoton, nivel === TAMANOS.length - 1 ? styles.apagado : null]}
            >
              <Text style={styles.tamanoMas}>A+</Text>
            </Pressable>
          </View>
        </View>

        <Interruptor
          icono={
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={10} fill={color.blanco} stroke={color.grafito} strokeWidth={2} />
              <Path d="M12 2 A10 10 0 0 1 12 22 Z" fill={color.grafito} />
            </Svg>
          }
          nombre={t('forma.contraste')}
          ayuda={t('forma.contraste_ayuda')}
          activo={contraste}
          onCambiar={(v) => cambiar({ contraste: v })}
        />

        <Interruptor
          icono={<Parlante tam={26} />}
          oscuro
          nombre={t('forma.narracion')}
          ayuda={t('forma.narracion_ayuda')}
          activo={narracion}
          onCambiar={(v) => cambiar({ narracion: v })}
        >
          {narracion && (
            <Boton chico tono="cielo" onPress={() => decir([voz(t('forma.voz_prueba'))])}>
              {t('forma.probar_voz')}
            </Boton>
          )}
        </Interruptor>

        <Interruptor
          icono={<Text style={styles.iconoLetras}>1·2</Text>}
          nombre={t('forma.pasos')}
          ayuda={t('forma.pasos_ayuda')}
          activo={pasoAPaso}
          onCambiar={(v) => cambiar({ pasoAPaso: v })}
        />

        <Interruptor
          icono={
            <Svg width={30} height={30} viewBox="0 0 24 24">
              <Rect x={2} y={4} width={20} height={16} rx={3} fill={color.blanco} stroke={color.grafito} strokeWidth={2} />
              <Path d="M10 8.5 L16 12 L10 15.5 Z" fill={color.grafito} />
            </Svg>
          }
          nombre={t('forma.senas')}
          ayuda={t('forma.senas_ayuda')}
          activo={senas}
          onCambiar={(v) => cambiar({ senas: v })}
        >
          {senas && RECURSOS_SENAS.length === 0 && <Text style={styles.ayuda}>{t('senas.pendiente')}</Text>}
        </Interruptor>

        <Text style={styles.nota}>{t('forma.guardado')}</Text>

        <View style={styles.acciones}>
          <Boton ancho onPress={() => router.back()}>
            {t('forma.listo')}
          </Boton>
          <Boton ancho tono="fantasma" onPress={restablecer}>
            {t('forma.restablecer')}
          </Boton>
        </View>
      </ScrollView>
    </Pantalla>
  );
}

interface InterruptorProps {
  icono: ReactNode;
  /** El icono es claro y necesita un fondo oscuro. */
  oscuro?: boolean;
  nombre: string;
  ayuda: string;
  activo: boolean;
  onCambiar: (activo: boolean) => void;
  children?: ReactNode;
}

/** Toda la tarjeta se puede tocar: es un blanco grande, y el estado se lee además de verse. */
function Interruptor({ icono, oscuro, nombre, ayuda, activo, onCambiar, children }: InterruptorProps) {
  const styles = useEstilos();
  const color = useColor();
  const { t } = useTextos();
  return (
    <View style={[styles.tarjeta, activo ? styles.tarjetaActiva : null]}>
      <Pressable
        onPress={() => onCambiar(!activo)}
        accessibilityRole="switch"
        accessibilityLabel={nombre}
        accessibilityHint={ayuda}
        accessibilityState={{ checked: activo }}
        aria-checked={activo}
        style={styles.fila}
      >
        <View style={[styles.icono, oscuro ? styles.iconoOscuro : null]}>{icono}</View>
        <View style={styles.textos}>
          <Text style={styles.nombre}>{nombre}</Text>
          <Text style={styles.ayuda}>{ayuda}</Text>
        </View>
        <View style={styles.estado}>
          <View style={[styles.casilla, activo ? styles.casillaActiva : null]}>
            {activo && <Marca tipo="visto" tinta={color.blanco} tam={22} />}
          </View>
          <Text style={styles.estadoTexto}>{t(activo ? 'forma.si' : 'forma.no')}</Text>
        </View>
      </Pressable>
      {children}
    </View>
  );
}

const useEstilos = crearEstilos((color) => ({
  contenido: { gap: espacio.lg, paddingBottom: espacio.xl },
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
  saludo: { flexDirection: 'row', alignItems: 'center' },
  globo: { flex: 1, marginLeft: espacio.sm },

  tarjeta: {
    gap: espacio.md,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderBottomWidth: 2 + labio.normal,
    borderBottomColor: color.bordeHondo,
    borderRadius: radio.lg,
    padding: espacio.md,
  },
  tarjetaActiva: { backgroundColor: color.aciertoFondo, borderColor: color.acierto, borderBottomColor: color.labioVerde },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, minHeight: 56 },
  icono: {
    width: 52,
    height: 52,
    borderRadius: radio.md,
    backgroundColor: color.nube,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoOscuro: { backgroundColor: color.cieloHondo },
  iconoLetras: { fontFamily: 'Fredoka_600SemiBold', fontSize: 20, color: color.verde },
  textos: { flex: 1, gap: 2 },
  nombre: { ...texto.subtitulo, color: color.grafito },
  ayuda: { ...texto.chico, color: color.tinta },

  estado: { alignItems: 'center', gap: 2, minWidth: 44 },
  casilla: {
    width: 36,
    height: 36,
    borderRadius: radio.sm,
    borderWidth: 3,
    borderColor: color.bordeHondo,
    backgroundColor: color.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaActiva: { backgroundColor: color.verde, borderColor: color.verde },
  estadoTexto: { ...texto.chico, fontFamily: 'Fredoka_600SemiBold', color: color.tinta },

  tamanos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacio.md },
  tamanoBoton: {
    width: 72,
    height: 56,
    borderRadius: radio.md,
    backgroundColor: color.cielo,
    borderBottomWidth: labio.normal,
    borderBottomColor: color.cieloHondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apagado: { opacity: 0.4 },
  tamanoMenos: { fontFamily: 'Fredoka_600SemiBold', fontSize: 18, color: color.tintaCielo },
  tamanoMas: { fontFamily: 'Fredoka_600SemiBold', fontSize: 26, color: color.tintaCielo },
  puntos: { flexDirection: 'row', gap: espacio.sm, alignItems: 'center' },
  punto: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: color.bordeHondo, backgroundColor: color.blanco },
  puntoLleno: { backgroundColor: color.verde, borderColor: color.verde },

  nota: { ...texto.chico, color: color.tinta, textAlign: 'center' },
  acciones: { gap: espacio.sm },
}));
