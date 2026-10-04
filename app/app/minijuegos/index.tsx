/**
 * Minijuegos: juegos cortos con las palabras de las lecciones.
 *
 * La lista sale de `src/features/minijuegos/catalogo.ts`: un juego nuevo se
 * suma ahí y aparece acá solo.
 */

import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Boton } from '../../src/ui/components/Boton';
import { Globo } from '../../src/ui/components/Globo';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { PikoMascota } from '../../src/ui/piko/PikoMascota';
import { ContadorSacuanjoches } from '../../src/ui/arbol/ContadorSacuanjoches';
import { useTextos } from '../../src/ui/textos/useTextos';
import { useProgreso } from '../../src/features/progreso/store';
import { MINIJUEGOS } from '../../src/features/minijuegos/catalogo';
import { color, espacio, labio, radio, texto } from '../../src/ui/tokens';

export default function Minijuegos() {
  const router = useRouter();
  const { t } = useTextos();
  const sacuanjoches = useProgreso((s) => s.estado.sacuanjoches);

  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

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
            {t('minijuegos.titulo')}
          </Text>
          <ContadorSacuanjoches total={sacuanjoches} onPress={() => router.push('/perfil')} />
        </View>

        <View style={styles.saludo}>
          <PikoMascota estado="saludando" tam={110} />
          <Globo style={styles.globo}>{t('minijuegos.sub')}</Globo>
        </View>

        {MINIJUEGOS.map((juego) => (
          <View key={juego.id} style={styles.tarjeta}>
            <View style={styles.fila}>
              <juego.Icono tam={72} />
              <View style={styles.textos}>
                <Text style={styles.nombre}>{t(juego.nombre)}</Text>
                <Text style={styles.descripcion}>{t(juego.descripcion)}</Text>
              </View>
            </View>
            <Boton ancho onPress={() => router.push(juego.ruta as Href)}>
              {t('minijuegos.jugar')}
            </Boton>
          </View>
        ))}

        <Text style={styles.pronto}>{t('minijuegos.pronto')}</Text>
      </ScrollView>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  contenido: { flexGrow: 1, gap: espacio.xl, paddingBottom: espacio.xl },
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
    gap: espacio.lg,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderBottomWidth: 2 + labio.normal,
    borderBottomColor: color.bordeHondo,
    borderRadius: radio.xl,
    padding: espacio.lg,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.lg },
  textos: { flex: 1, gap: espacio.xs },
  nombre: { ...texto.subtitulo, color: color.grafito },
  descripcion: { ...texto.cuerpo, color: color.tinta },
  pronto: { ...texto.chico, color: color.tintaSuave, textAlign: 'center' },
});
