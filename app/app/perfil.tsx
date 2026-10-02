/**
 * El perfil del estudiante: su madroño, sus sacuanjoches y dónde va Piko.
 *
 * Todo sale del mismo log de eventos que el resto del progreso, así que lo
 * que se ve acá sobrevive a cerrar la app y viaja con el estudiante si juega
 * en la clase.
 */

import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../src/ui/components/Boton';
import { BarraProgreso } from '../src/ui/components/BarraProgreso';
import { Pantalla } from '../src/ui/components/Pantalla';
import { ArbolMadrono } from '../src/ui/arbol/ArbolMadrono';
import { Sacuanjoche } from '../src/ui/arbol/Sacuanjoche';
import { useProgreso } from '../src/features/progreso/store';
import { useAulaCliente } from '../src/features/aula/cliente';
import { lugarDePiko, progresoEtapa, progresoNivel } from '../src/core/progress/arbol';
import { color, espacio, radio, texto } from '../src/ui/tokens';

export default function Perfil() {
  const router = useRouter();
  const estado = useProgreso((s) => s.estado);
  const nombre = useAulaCliente((s) => s.roster.find((r) => r.id === s.studentId)?.nombre ?? null);

  // Al abrir la app el estado arranca vacío: se lee lo guardado.
  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const total = estado.sacuanjoches;
  const nivel = progresoNivel(total);
  const etapa = progresoEtapa(total);

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>{nombre ?? 'Mi perfil'}</Text>

        <View style={styles.tarjeta}>
          <View style={styles.cielo}>
            <ArbolMadrono sacuanjoches={total} ancho={150} />
          </View>
          <View style={styles.resumen}>
            <View style={styles.fila}>
              <Sacuanjoche tam={30} />
              <Text style={styles.numero}>{total}</Text>
            </View>
            <Text style={styles.frase}>
              {total === 1 ? 'Has recolectado 1 sacuanjoche' : `Has recolectado ${total} sacuanjoches`}
            </Text>
            <Text style={styles.nivelGrande}>Nivel {nivel.nivel}</Text>
            <Text style={styles.lugar}>{lugarDePiko(nivel.nivel)}</Text>
          </View>
        </View>

        <View style={styles.bloque}>
          <View style={styles.filaEtiqueta}>
            <Text style={styles.etiqueta}>Siguiente nivel</Text>
            <Text style={styles.cuenta}>
              {nivel.hasta === null ? 'Nivel máximo' : `${total} / ${nivel.hasta}`}
            </Text>
          </View>
          <BarraProgreso valor={nivel.fraccion} />
          <Text style={styles.ayuda}>
            {nivel.hasta === null
              ? '¡Piko llegó a la cima del madroño!'
              : `Faltan ${nivel.faltan} sacuanjoches para el nivel ${nivel.nivel + 1}.`}
          </Text>
        </View>

        <View style={styles.bloque}>
          <View style={styles.filaEtiqueta}>
            <Text style={styles.etiqueta}>Tu madroño: {etapa.etapa.nombre}</Text>
            <Text style={styles.cuenta}>
              {etapa.siguiente ? `${total} / ${etapa.siguiente.desde}` : 'Florecido'}
            </Text>
          </View>
          <BarraProgreso valor={etapa.fraccion} tono={color.verdeHoja} />
          <Text style={styles.ayuda}>
            {etapa.siguiente
              ? `Con ${etapa.faltan} más llega a: ${etapa.siguiente.nombre}.`
              : etapa.etapa.descripcion}
          </Text>
        </View>

        <View style={styles.datos}>
          <Dato valor={String(estado.lessons)} etiqueta="Lecciones" />
          <Dato valor={String(estado.xp)} etiqueta="XP total" />
          <Dato valor={String(estado.bestStreak)} etiqueta="Mejor racha" />
        </View>

        <View style={styles.acciones}>
          <Boton ancho onPress={() => router.push('/arbol')}>
            Ver mi árbol
          </Boton>
          <Boton ancho tono="fantasma" onPress={() => router.back()}>
            Volver
          </Boton>
        </View>
      </ScrollView>
    </Pantalla>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoValor}>{valor}</Text>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: espacio.xl, paddingBottom: espacio.xl },
  titulo: { ...texto.display, color: color.verde },

  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.md,
  },
  cielo: { backgroundColor: color.nube, borderRadius: radio.md, paddingTop: espacio.xs, overflow: 'hidden' },
  resumen: { flex: 1, gap: espacio.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  numero: { ...texto.display, color: color.verde },
  frase: { ...texto.cuerpoFuerte, color: color.tinta },
  nivelGrande: { ...texto.titulo, color: color.verdeBosque, marginTop: espacio.xs },
  lugar: { ...texto.chico, color: color.tintaSuave },

  bloque: { gap: espacio.sm },
  filaEtiqueta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  etiqueta: { ...texto.etiqueta, color: color.tintaSuave, flexShrink: 1 },
  cuenta: { ...texto.cuerpoFuerte, color: color.verde },
  ayuda: { ...texto.chico, color: color.tintaSuave },

  datos: { flexDirection: 'row', gap: espacio.md },
  dato: {
    flex: 1,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.md,
    paddingVertical: espacio.md,
    alignItems: 'center',
  },
  datoValor: { ...texto.titulo, color: color.verde },
  datoEtiqueta: { ...texto.chico, color: color.tintaSuave },

  acciones: { gap: espacio.md },
});
