/**
 * Portada. Piko saluda y se elige el camino.
 *
 * "Practicar sola" va primero a propósito: es lo único que funciona sin que
 * haya nadie más cerca, y es lo que un niño puede abrir en su casa.
 */

import { useEffect, useMemo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Boton } from '../src/ui/components/Boton';
import { Globo } from '../src/ui/components/Globo';
import { Pantalla } from '../src/ui/components/Pantalla';
import { PikoMascota } from '../src/ui/piko/PikoMascota';
import { MARCA_SVG } from '../src/ui/piko/vector.gen';
import { BIENVENIDA, elegir } from '../src/ui/piko/frases';
import { MiniaturaArbol } from '../src/ui/arbol/MiniaturaArbol';
import { Sacuanjoche } from '../src/ui/arbol/Sacuanjoche';
import { useProgreso } from '../src/features/progreso/store';
import { etapaDe } from '../src/core/progress/arbol';
import { caminoDe, estadoDelCamino, nivelActual } from '../src/core/progress/niveles';
import { PACKS } from '../content';
import { color, espacio, radio, texto } from '../src/ui/tokens';

export default function Portada() {
  const router = useRouter();
  const saludo = useMemo(() => elegir(BIENVENIDA), []);
  const sacuanjoches = useProgreso((s) => s.estado.sacuanjoches);
  const estrellas = useProgreso((s) => s.estado.stars);
  const nivel = useMemo(
    () => nivelActual(estadoDelCamino(caminoDe(PACKS, 'eng'), estrellas))?.numero ?? 1,
    [estrellas],
  );

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

        <Text style={styles.lema}>Aprendé jugando, sin internet.</Text>

        <View style={styles.acciones}>
          <Boton ancho tono="verde" onPress={() => router.push('/practicar')}>
            Practicar sola
          </Boton>
          <Boton ancho tono="cielo" onPress={() => router.push('/estudiante/unirse')}>
            Unirme a la clase
          </Boton>
          <Pressable onPress={() => router.push('/maestro')} hitSlop={8}>
            <Text style={styles.soyMaestro}>Soy el maestro</Text>
          </Pressable>
        </View>

        <View style={styles.atajos}>
          <Atajo titulo="Niveles" detalle={`Nivel ${nivel}`} onPress={() => router.push('/niveles')}>
            <PikoMascota estado="idle" tam={52} animado={false} />
          </Atajo>
          <Atajo titulo="Mi árbol" detalle={etapaDe(sacuanjoches).nombre} onPress={() => router.push('/arbol')}>
            <MiniaturaArbol etapa={etapaDe(sacuanjoches).id} tam={52} />
          </Atajo>
          <Atajo titulo="Mi perfil" detalle={`${sacuanjoches} sacuanjoches`} onPress={() => router.push('/perfil')}>
            <Sacuanjoche tam={44} />
          </Atajo>
        </View>

        <View style={styles.lenguas}>
          {['Miskito', 'Mayangna', 'Rama', 'Garífuna', 'Inglés'].map((l) => (
            <View key={l} style={styles.lengua}>
              <Text style={styles.lenguaTexto}>{l}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Pantalla>
  );
}

function Atajo({
  titulo,
  detalle,
  onPress,
  children,
}: {
  titulo: string;
  detalle: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}: ${detalle}`}
      style={styles.atajo}
    >
      <View style={styles.atajoDibujo}>{children}</View>
      <Text style={styles.atajoTitulo}>{titulo}</Text>
      <Text style={styles.atajoDetalle} numberOfLines={1}>
        {detalle}
      </Text>
    </Pressable>
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
  atajos: { flexDirection: 'row', gap: espacio.sm },
  atajo: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.lg,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.xs,
  },
  atajoDibujo: {
    width: 64,
    height: 64,
    borderRadius: radio.md,
    backgroundColor: color.nube,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: espacio.xs,
  },
  atajoTitulo: { ...texto.cuerpoFuerte, color: color.verde },
  atajoDetalle: { ...texto.chico, color: color.tintaSuave },
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
});
