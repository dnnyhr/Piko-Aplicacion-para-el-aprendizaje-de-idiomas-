/**
 * Portada. Piko saluda y se elige el camino.
 *
 * "Practicar sola" va primero a propósito: es lo único que funciona sin que
 * haya nadie más cerca, y es lo que un niño puede abrir en su casa.
 */

import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { Boton } from '../src/ui/components/Boton';
import { Globo } from '../src/ui/components/Globo';
import { Pantalla } from '../src/ui/components/Pantalla';
import { PikoMascota } from '../src/ui/piko/PikoMascota';
import { MARCA_SVG } from '../src/ui/piko/vector.gen';
import { BIENVENIDA, elegir } from '../src/ui/piko/frases';
import { color, espacio, radio, texto } from '../src/ui/tokens';

export default function Portada() {
  const router = useRouter();
  const saludo = useMemo(() => elegir(BIENVENIDA), []);

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
