/**
 * El perfil del estudiante: su madroño, sus sacuanjoches y dónde va Piko.
 *
 * Todo sale del mismo log de eventos que el resto del progreso, así que lo
 * que se ve acá sobrevive a cerrar la app y viaja con el estudiante si juega
 * en la clase.
 */

import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { CANCIONES } from '../content/canciones';
import { logroPorId } from '../src/core/logros/catalogo';
import { resumenLogros } from '../src/core/logros/evaluar';
import { Insignia } from '../src/ui/logros/Insignia';
import { useTextos } from '../src/ui/textos/useTextos';

export default function Perfil() {
  const router = useRouter();
  const estado = useProgreso((s) => s.estado);
  const nombre = useAulaCliente((s) => s.roster.find((r) => r.id === s.studentId)?.nombre ?? null);

  // Al abrir la app el estado arranca vacío: se lee lo guardado.
  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const { t } = useTextos();
  const logros = useMemo(() => resumenLogros(estado), [estado]);
  // Los tres últimos que ganó, sin repetir los especiales (que van aparte).
  const ultimos = useMemo(
    () =>
      Object.entries(estado.logros)
        .sort(([, a], [, b]) => b - a)
        .map(([id]) => logroPorId(id))
        .filter((l) => l !== undefined && l.tipo !== 'especial')
        .slice(0, 3),
    [estado.logros],
  );

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

        <Pressable
          onPress={() => router.push('/logros')}
          accessibilityRole="button"
          accessibilityLabel={t('logros.titulo')}
          style={({ pressed }) => [styles.logros, pressed && styles.apretado]}
        >
          <View style={styles.filaEtiqueta}>
            <Text style={styles.etiqueta}>{t('logros.titulo')}</Text>
            <Text style={styles.cuenta}>›</Text>
          </View>
          <Text style={styles.trofeo}>🏆 {t('logros.desbloqueados', { n: logros.desbloqueados, total: logros.total })}</Text>
          {logros.especiales.length > 0 && (
            <View style={styles.especial}>
              {logros.especiales.map((l) => (
                <Insignia key={l.id} logro={l} desbloqueado tam={56} />
              ))}
              <View style={styles.especialTexto}>
                <Text style={styles.especialTitulo}>⭐ {t('logros.especial_desbloqueado')}</Text>
                <Text style={styles.especialNombre}>{logros.especiales.map((l) => l.nombre).join(' · ')}</Text>
              </View>
            </View>
          )}
          {ultimos.length > 0 && (
            <View style={styles.ultimos}>
              {ultimos.map((l) => l && <Insignia key={l.id} logro={l} desbloqueado tam={52} />)}
              <Text style={styles.ayuda}>{t('logros.ultimos')}</Text>
            </View>
          )}
        </Pressable>

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

        {CANCIONES.length > 0 && (
          <View style={styles.datos}>
            <Dato
              valor={`${CANCIONES.filter((c) => estado.cancionesCompletas.includes(c.id)).length}/${CANCIONES.length}`}
              etiqueta="Canciones completadas"
            />
          </View>
        )}

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

  logros: {
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.md,
    gap: espacio.sm,
  },
  apretado: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
  trofeo: { ...texto.subtitulo, color: color.verde },
  especial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: '#0B3D6E',
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: '#F4C542',
    padding: espacio.sm,
  },
  especialTexto: { flex: 1 },
  especialTitulo: { ...texto.cuerpoFuerte, color: '#F4C542' },
  especialNombre: { ...texto.chico, color: '#FFFFFF' },
  ultimos: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },

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
