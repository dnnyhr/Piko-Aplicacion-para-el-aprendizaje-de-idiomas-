/**
 * Mi madroño: el árbol que crece con las sacuanjoches.
 *
 * Es aparte del camino de niveles: acá no se sube, se mira crecer. Está
 * pensado para leerse sin instrucciones: arriba el árbol de hoy, cuánto falta
 * para la próxima etapa, y abajo las seis etapas con lo que pide cada una.
 */

import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../src/ui/components/Boton';
import { Globo } from '../src/ui/components/Globo';
import { Pantalla } from '../src/ui/components/Pantalla';
import { ArbolMadrono } from '../src/ui/arbol/ArbolMadrono';
import { ContadorSacuanjoches } from '../src/ui/arbol/ContadorSacuanjoches';
import { Sacuanjoche } from '../src/ui/arbol/Sacuanjoche';
import { MiniaturaArbol } from '../src/ui/arbol/MiniaturaArbol';
import { useProgreso } from '../src/features/progreso/store';
import { BarraProgreso } from '../src/ui/components/BarraProgreso';
import {
  ETAPAS,
  SACUANJOCHES_BASE,
  SACUANJOCHES_MAX,
  etapaDe,
  progresoEtapa,
} from '../src/core/progress/arbol';
import { color, espacio, fuente, radio, texto } from '../src/ui/tokens';

export default function Arbol() {
  const router = useRouter();
  const total = useProgreso((s) => s.estado.sacuanjoches);

  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const actual = etapaDe(total);
  const avance = progresoEtapa(total);

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecera}>
          <Text style={styles.titulo}>Mi madroño</Text>
          <ContadorSacuanjoches total={total} />
        </View>

        <Globo hacia="abajo" style={styles.globo}>
          {actual.descripcion}
        </Globo>

        <View style={styles.cielo}>
          <ArbolMadrono sacuanjoches={total} ancho={240} />
        </View>

        <View style={styles.avance}>
          <View style={styles.avanceFila}>
            <Sacuanjoche tam={30} />
            <Text style={styles.avanceTotal}>{total}</Text>
            <Text style={styles.avanceTexto}>
              {total === 1 ? 'sacuanjoche recolectada' : 'sacuanjoches recolectadas'}
            </Text>
          </View>
          <BarraProgreso valor={avance.fraccion} tono={color.verdeHoja} />
          <Text style={styles.avanceAyuda}>
            {avance.siguiente
              ? `Faltan ${avance.faltan} para que tu madroño sea: ${avance.siguiente.nombre}`
              : '¡Tu madroño está todo florecido!'}
          </Text>
        </View>

        <View style={styles.ciclo}>
          <Paso n="1" texto="Superá niveles" />
          <Paso n="2" texto="Ganá sacuanjoches" />
          <Paso n="3" texto="Tu madroño crece" />
        </View>

        <Text style={styles.instruccion}>
          Cada lección te da de {SACUANJOCHES_BASE} a {SACUANJOCHES_MAX} sacuanjoches
        </Text>

        <View style={styles.etapas}>
          {ETAPAS.map((e) => {
            const lograda = total >= e.desde;
            const esActual = e.id === actual.id;
            return (
              <View key={e.id} style={[styles.etapa, esActual && styles.etapaActual]}>
                <View style={[styles.miniatura, !lograda && styles.bloqueada]}>
                  <MiniaturaArbol etapa={e.id} tam={52} />
                </View>
                <View style={styles.etapaTexto}>
                  <Text style={[styles.etapaNombre, !lograda && styles.textoBloqueado]}>{e.nombre}</Text>
                  <Text style={styles.etapaDesc}>{lograda ? e.descripcion : `Faltan ${e.desde - total}`}</Text>
                </View>
                <View style={styles.umbral}>
                  <Sacuanjoche tam={18} />
                  <Text style={styles.umbralTexto}>{e.desde}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Boton ancho tono="fantasma" onPress={() => router.back()}>
          Volver
        </Boton>
      </ScrollView>
    </Pantalla>
  );
}

function Paso({ n, texto: t }: { n: string; texto: string }) {
  return (
    <View style={styles.paso}>
      <View style={styles.pasoNumero}>
        <Text style={styles.pasoNumeroTexto}>{n}</Text>
      </View>
      <Text style={styles.pasoTexto}>{t}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: espacio.lg, paddingBottom: espacio.xl },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { ...texto.display, color: color.verde },

  cielo: {
    alignItems: 'center',
    backgroundColor: color.nube,
    borderRadius: radio.xl,
    paddingTop: espacio.md,
    overflow: 'hidden',
  },
  globo: { alignSelf: 'center' },

  avance: {
    gap: espacio.sm,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
  },
  avanceFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  avanceTotal: { ...texto.display, color: color.verde },
  avanceTexto: { ...texto.cuerpoFuerte, color: color.tinta, flex: 1 },
  avanceAyuda: { ...texto.chico, color: color.tintaSuave },

  ciclo: { flexDirection: 'row', gap: espacio.xs },
  paso: { flex: 1, alignItems: 'center', gap: espacio.xs },
  pasoNumero: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.verdePasto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoNumeroTexto: { fontFamily: fuente.tituloFuerte, fontSize: 14, color: color.verdeHondo },
  pasoTexto: { ...texto.chico, color: color.tinta, textAlign: 'center' },

  instruccion: {
    ...texto.chico,
    color: color.tintaSuave,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },

  etapas: { gap: espacio.sm },
  etapa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.md,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.md,
  },
  etapaActual: { borderColor: color.verdePasto, backgroundColor: color.aciertoFondo },
  miniatura: { backgroundColor: color.nube, borderRadius: radio.sm, padding: 4 },
  bloqueada: { opacity: 0.35 },
  etapaTexto: { flex: 1 },
  etapaNombre: { ...texto.cuerpoFuerte, color: color.verde },
  textoBloqueado: { color: color.tintaSuave },
  etapaDesc: { ...texto.chico, color: color.tintaSuave },
  umbral: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  umbralTexto: { fontFamily: fuente.titulo, fontSize: 15, color: color.verde },
});
