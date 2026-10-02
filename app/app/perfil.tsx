/**
 * El perfil del estudiante.
 *
 * Primero sus sacuanjoches, que es lo que más quiere ver un niño: cuántas
 * juntó y qué hicieron con su madroño. Después su camino de niveles: en cuál
 * está Piko y cuántas estrellas lleva.
 *
 * Todo sale del mismo log de eventos que el resto del progreso, así que lo
 * que se ve acá sobrevive a cerrar la app y viaja con el estudiante si juega
 * en la clase.
 */

import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../src/ui/components/Boton';
import { BarraProgreso } from '../src/ui/components/BarraProgreso';
import { Pantalla } from '../src/ui/components/Pantalla';
import { PikoMascota } from '../src/ui/piko/PikoMascota';
import { MiniaturaArbol } from '../src/ui/arbol/MiniaturaArbol';
import { Sacuanjoche } from '../src/ui/arbol/Sacuanjoche';
import { Estrella } from '../src/features/niveles/CaminoNiveles';
import { useProgreso } from '../src/features/progreso/store';
import { useAulaCliente } from '../src/features/aula/cliente';
import { progresoEtapa } from '../src/core/progress/arbol';
import { caminoDe, estadoDelCamino, nivelActual, resumenCamino } from '../src/core/progress/niveles';
import { color, espacio, fuente, radio, texto } from '../src/ui/tokens';
import { PACKS } from '../content';

/** Cuántas flores se dibujan en la canasta antes de pasar a "+N". */
const FLORES_A_LA_VISTA = 10;

export default function Perfil() {
  const router = useRouter();
  const estado = useProgreso((s) => s.estado);
  const nombre = useAulaCliente((s) => s.roster.find((r) => r.id === s.studentId)?.nombre ?? null);

  // Al abrir la app el estado arranca vacío: se lee lo guardado.
  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const total = estado.sacuanjoches;
  const etapa = progresoEtapa(total);

  const niveles = useMemo(() => estadoDelCamino(caminoDe(PACKS, 'eng'), estado.stars), [estado.stars]);
  const camino = resumenCamino(niveles);
  const actual = nivelActual(niveles);

  const flores = Math.min(total, FLORES_A_LA_VISTA);

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecera}>
          <View style={styles.avatar}>
            <PikoMascota estado="saludando" tam={62} />
          </View>
          <View style={styles.cabeceraTexto}>
            <Text style={styles.titulo}>{nombre ?? 'Mi perfil'}</Text>
            <Text style={styles.sub}>
              {estado.lessons} {estado.lessons === 1 ? 'lección' : 'lecciones'} · {estado.xp} XP
            </Text>
          </View>
        </View>

        {/* ---------------------------------------------------- sacuanjoches */}
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>Mis sacuanjoches</Text>
          <View style={styles.totalFila}>
            <Sacuanjoche tam={56} />
            <Text style={styles.totalNumero}>{total}</Text>
          </View>
          <Text style={styles.frase}>
            {total === 0
              ? 'Todavía no recolectaste sacuanjoches. ¡Superá un nivel!'
              : total === 1
                ? 'Has recolectado 1 sacuanjoche'
                : `Has recolectado ${total} sacuanjoches`}
          </Text>

          {flores > 0 && (
            <View style={styles.canasta} accessibilityElementsHidden>
              {Array.from({ length: flores }, (_, i) => (
                <Sacuanjoche key={i} tam={24} />
              ))}
              {total > FLORES_A_LA_VISTA && <Text style={styles.mas}>+{total - FLORES_A_LA_VISTA}</Text>}
            </View>
          )}

          <View style={styles.madrono}>
            <View style={styles.miniatura}>
              <MiniaturaArbol etapa={etapa.etapa.id} tam={64} />
            </View>
            <View style={styles.madronoTexto}>
              <Text style={styles.madronoTitulo}>Tu madroño: {etapa.etapa.nombre}</Text>
              <BarraProgreso valor={etapa.fraccion} alto={12} tono={color.verdeHoja} />
              <Text style={styles.ayuda}>
                {etapa.siguiente
                  ? `Faltan ${etapa.faltan} para: ${etapa.siguiente.nombre}`
                  : '¡Está todo florecido!'}
              </Text>
            </View>
          </View>

          <Boton ancho tono="papel" onPress={() => router.push('/arbol')}>
            Ver mi árbol
          </Boton>
        </View>

        {/* -------------------------------------------------------- niveles */}
        <View style={styles.tarjeta}>
          <Text style={styles.etiqueta}>Mi camino con Piko</Text>
          <View style={styles.caminoFila}>
            <View style={styles.caminoNivel}>
              <Text style={styles.caminoNumero}>{camino.nivel}</Text>
              <Text style={styles.ayuda}>de {camino.total}</Text>
            </View>
            <View style={styles.caminoTexto}>
              <Text style={styles.madronoTitulo}>
                {camino.completo ? '¡Piko llegó a la copa!' : `Piko está en el nivel ${camino.nivel}`}
              </Text>
              {actual && !camino.completo && <Text style={styles.ayuda}>{actual.titulo}</Text>}
              <View style={styles.estrellasFila}>
                <Estrella llena tam={20} />
                <Text style={styles.estrellasTexto}>
                  {camino.estrellas} de {camino.estrellasPosibles} estrellas
                </Text>
              </View>
            </View>
          </View>
          <BarraProgreso valor={camino.total ? camino.superados / camino.total : 0} />
          <Text style={styles.ayuda}>
            {camino.superados} de {camino.total} niveles superados
          </Text>
          <Boton ancho tono="pico" onPress={() => router.push('/niveles')}>
            Ver niveles
          </Boton>
        </View>

        <View style={styles.datos}>
          <Dato valor={String(estado.lessons)} etiqueta="Lecciones" />
          <Dato valor={String(estado.xp)} etiqueta="XP total" />
          <Dato valor={String(estado.bestStreak)} etiqueta="Mejor racha" />
        </View>

        <Boton ancho tono="fantasma" onPress={() => router.back()}>
          Volver
        </Boton>
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
  contenido: { gap: espacio.lg, paddingBottom: espacio.xl },

  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: color.nube,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  cabeceraTexto: { flex: 1 },
  titulo: { ...texto.display, color: color.verde },
  sub: { ...texto.chico, color: color.tintaSuave },

  tarjeta: {
    gap: espacio.sm,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
  },
  etiqueta: { ...texto.etiqueta, color: color.tintaSuave },
  totalFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  totalNumero: { fontFamily: fuente.tituloFuerte, fontSize: 48, lineHeight: 54, color: color.verde },
  frase: { ...texto.subtitulo, color: color.tinta },
  canasta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
    backgroundColor: color.aciertoFondo,
    borderRadius: radio.md,
    padding: espacio.sm,
  },
  mas: { ...texto.cuerpoFuerte, color: color.aciertoTinta, marginLeft: espacio.xs },

  madrono: { flexDirection: 'row', alignItems: 'center', gap: espacio.md, marginVertical: espacio.xs },
  miniatura: { backgroundColor: color.nube, borderRadius: radio.md, padding: espacio.xs },
  madronoTexto: { flex: 1, gap: espacio.xs },
  madronoTitulo: { ...texto.cuerpoFuerte, color: color.verde },
  ayuda: { ...texto.chico, color: color.tintaSuave },

  caminoFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.md },
  caminoNivel: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D9A066',
    borderWidth: 4,
    borderColor: color.verdePasto,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caminoNumero: { fontFamily: fuente.tituloFuerte, fontSize: 28, lineHeight: 30, color: '#D9452B' },
  caminoTexto: { flex: 1, gap: 2 },
  estrellasFila: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs, marginTop: 2 },
  estrellasTexto: { ...texto.cuerpoFuerte, color: color.intentoTinta },

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
});
