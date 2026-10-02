/**
 * Portada. Piko saluda y se elige el camino.
 *
 * "Practicar sola" va primero a propósito: es lo único que funciona sin que
 * haya nadie más cerca, y es lo que un niño puede abrir en su casa.
 */

import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Boton } from '../src/ui/components/Boton';
import { Globo } from '../src/ui/components/Globo';
import { Pantalla } from '../src/ui/components/Pantalla';
import { PikoMascota } from '../src/ui/piko/PikoMascota';
import { MARCA_SVG } from '../src/ui/piko/vector.gen';
import { elegir } from '../src/ui/piko/frases';
import { useTextos } from '../src/ui/textos/useTextos';
import { AUTONIMO, IDIOMAS_APP } from '../src/ui/textos/traducir';
import { useIdioma } from '../src/features/idioma/store';
import { LANGS } from '../src/core/content/schema';
import { MiniaturaArbol } from '../src/ui/arbol/MiniaturaArbol';
import { ContadorSacuanjoches } from '../src/ui/arbol/ContadorSacuanjoches';
import { useProgreso } from '../src/features/progreso/store';
import { etapaDe, nivelDe } from '../src/core/progress/arbol';
import { color, espacio, radio, texto } from '../src/ui/tokens';

export default function Portada() {
  const router = useRouter();
  const { t, frases, idioma } = useTextos();
  const cambiarIdioma = useIdioma((s) => s.cambiar);
  const saludo = useMemo(() => elegir(frases('piko.bienvenida')), [frases]);
  const sacuanjoches = useProgreso((s) => s.estado.sacuanjoches);

  // Lo guardado de otras veces, para que el madroño aparezca como quedó.
  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.marca}>
          <SvgXml xml={MARCA_SVG} width={168} height={90} />
        </View>

        <View style={styles.saludo}>
          <PikoMascota estado="saludando" tam={168} />
          <Globo style={styles.globo}>{saludo}</Globo>
        </View>

        <Text style={styles.lema}>{t('portada.lema')}</Text>

        <View style={styles.idiomas}>
          <Text style={styles.idiomaEtiqueta}>{t('portada.lengua_app')}</Text>
          {IDIOMAS_APP.map((i) => (
            <Pressable
              key={i}
              onPress={() => cambiarIdioma(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: i === idioma }}
              style={[styles.idioma, i === idioma && styles.idiomaElegido]}
            >
              <Text style={[styles.idiomaTexto, i === idioma && styles.idiomaTextoElegido]}>{AUTONIMO[i]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.acciones}>
          <Boton ancho tono="verde" onPress={() => router.push('/practicar')}>
            {t('portada.practicar')}
          </Boton>
          <Boton ancho tono="cielo" onPress={() => router.push('/estudiante/unirse')}>
            {t('portada.unirme')}
          </Boton>
          <Pressable onPress={() => router.push('/maestro')} hitSlop={8}>
            <Text style={styles.soyMaestro}>{t('portada.maestro')}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/perfil')}
          accessibilityRole="button"
          accessibilityLabel="Ver mi madroño y mi perfil"
          style={styles.madrono}
        >
          <View style={styles.madronoCielo}>
            <MiniaturaArbol etapa={etapaDe(sacuanjoches).id} tam={56} />
          </View>
          <View style={styles.madronoTexto}>
            <Text style={styles.madronoTitulo}>Mi madroño</Text>
            <Text style={styles.madronoSub}>
              Nivel {nivelDe(sacuanjoches)} · {etapaDe(sacuanjoches).nombre}
            </Text>
          </View>
          <ContadorSacuanjoches total={sacuanjoches} />
        </Pressable>

        <View style={styles.lenguas}>
          {LANGS.map((l) => (
            <View key={l} style={styles.lengua}>
              <Text style={styles.lenguaTexto}>{t(`lengua.${l}`)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  contenido: { flexGrow: 1, gap: espacio.xl, paddingBottom: espacio.xl },
  marca: { alignItems: 'center', marginTop: espacio.sm },
  saludo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  globo: { flex: 1, marginLeft: espacio.sm },
  lema: { ...texto.titulo, color: color.verde, textAlign: 'center' },
  acciones: { gap: espacio.md, marginTop: espacio.sm },
  soyMaestro: {
    ...texto.cuerpoFuerte,
    color: color.tintaSuave,
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: espacio.sm,
  },
  madrono: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.lg,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.md,
  },
  madronoCielo: { backgroundColor: color.nube, borderRadius: radio.md, padding: espacio.xs },
  madronoTexto: { flex: 1 },
  madronoTitulo: { ...texto.subtitulo, color: color.verde },
  madronoSub: { ...texto.chico, color: color.tintaSuave },
  lenguas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: espacio.sm,
    marginTop: 'auto',
  },
  lengua: {
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: '#0F5D3D24',
    borderRadius: radio.redondo,
    paddingVertical: espacio.xs,
    paddingHorizontal: espacio.md,
  },
  lenguaTexto: { ...texto.chico, color: color.verde, fontFamily: 'Fredoka_500Medium' },

  idiomas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: espacio.sm },
  idiomaEtiqueta: { ...texto.chico, color: color.tintaSuave },
  idioma: {
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.redondo,
    paddingVertical: espacio.xs,
    paddingHorizontal: espacio.md,
    backgroundColor: color.blanco,
  },
  idiomaElegido: { borderColor: color.verde, backgroundColor: color.verde },
  idiomaTexto: { ...texto.cuerpoFuerte, color: color.verde },
  idiomaTextoElegido: { color: color.blanco },
});
