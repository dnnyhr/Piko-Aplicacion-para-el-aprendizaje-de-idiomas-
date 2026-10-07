/**
 * Mis logros: cuántos llevás, y todas las insignias por categoría.
 *
 * Las ganadas se ven a color; las que faltan, en gris con candado, para que
 * se sepa qué viene. Arriba van los especiales (eventos, con código), con su
 * propio fondo. Tocar una insignia abre su detalle.
 */

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from '../../src/ui/components/Boton';
import { BarraProgreso } from '../../src/ui/components/BarraProgreso';
import { Pantalla } from '../../src/ui/components/Pantalla';
import { PikoMascota } from '../../src/ui/piko/PikoMascota';
import { Insignia } from '../../src/ui/logros/Insignia';
import { DetalleLogro } from '../../src/ui/logros/Detalle';
import { useTextos } from '../../src/ui/textos/useTextos';
import { useProgreso } from '../../src/features/progreso/store';
import { CATEGORIAS } from '../../src/core/logros/catalogo';
import { logrosDe, resumenLogros } from '../../src/core/logros/evaluar';
import type { LogroConEstado } from '../../src/core/logros/tipos';
import { color, espacio, radio, texto } from '../../src/ui/tokens';

const COLUMNAS = 3;

export default function MisLogros() {
  const router = useRouter();
  const { t } = useTextos();
  const { width } = useWindowDimensions();
  const estado = useProgreso((s) => s.estado);
  const [abierto, setAbierto] = useState<LogroConEstado | null>(null);

  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const lista = useMemo(() => logrosDe(estado), [estado]);
  const resumen = useMemo(() => resumenLogros(estado), [estado]);
  const ancho = Math.min(width, 560) - espacio.xl * 2;
  const celda = Math.floor((ancho - espacio.sm * (COLUMNAS - 1)) / COLUMNAS);

  return (
    <Pantalla>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>{t('logros.titulo')}</Text>

        <View style={styles.resumen}>
          <PikoMascota estado={resumen.desbloqueados > 0 ? 'alegre' : 'saludando'} tam={96} />
          <View style={styles.resumenTexto}>
            <Text style={styles.trofeo}>🏆 {t('logros.desbloqueados', { n: resumen.desbloqueados, total: resumen.total })}</Text>
            <BarraProgreso valor={resumen.total ? resumen.desbloqueados / resumen.total : 0} tono={color.pico} />
            {resumen.desbloqueados === 0 && <Text style={styles.ayuda}>{t('logros.empezar')}</Text>}
            {resumen.especiales.length > 0 && <Text style={styles.especial}>⭐ {t('logros.especial_desbloqueado')}</Text>}
          </View>
        </View>

        <Boton ancho tono="pico" onPress={() => router.push('/logros/canjear')}>
          {`🎟️  ${t('logros.canjear')}`}
        </Boton>

        {CATEGORIAS.map((cat) => {
          const deCategoria = lista.filter((x) => x.logro.categoria === cat.id);
          if (deCategoria.length === 0) return null;
          const especiales = cat.id === 'especiales';
          const ganados = deCategoria.filter((x) => x.desbloqueado).length;
          return (
            <View key={cat.id} style={[styles.seccion, especiales && styles.seccionEspecial]}>
              <View style={styles.cabecera}>
                <Text style={[styles.categoria, especiales && styles.categoriaEspecial]}>{cat.nombre}</Text>
                <Text style={[styles.cuenta, especiales && styles.cuentaEspecial]}>
                  {ganados}/{deCategoria.filter((x) => !x.proximamente).length}
                </Text>
              </View>
              <Text style={[styles.descripcion, especiales && styles.descripcionEspecial]}>{cat.descripcion}</Text>
              <View style={styles.grilla}>
                {deCategoria.map((x) => (
                  <Pressable
                    key={x.logro.id}
                    onPress={() => setAbierto(x)}
                    accessibilityRole="button"
                    accessibilityLabel={`${x.logro.nombre}. ${x.desbloqueado ? '' : x.proximamente ? t('logros.proximamente') : t('logros.llevas', { actual: x.actual, meta: x.meta })}`}
                    style={({ pressed }) => [
                      styles.celda,
                      { width: celda },
                      x.desbloqueado && styles.celdaGanada,
                      especiales && styles.celdaEspecial,
                      pressed && styles.apretada,
                    ]}
                  >
                    <Insignia logro={x.logro} desbloqueado={x.desbloqueado} proximamente={x.proximamente} tam={Math.min(78, celda - 16)} />
                    <Text numberOfLines={2} style={[styles.nombre, !x.desbloqueado && styles.nombreBloqueado, especiales && styles.nombreEspecial]}>
                      {x.logro.nombre}
                    </Text>
                    {x.logro.exclusivo ? (
                      <View style={styles.exclusivo}>
                        <Text style={styles.exclusivoTexto}>{t('logros.exclusivo')}</Text>
                      </View>
                    ) : x.proximamente ? (
                      <Text style={styles.proximo}>{t('logros.proximamente')}</Text>
                    ) : !x.desbloqueado && x.meta > 1 ? (
                      <Text style={styles.progreso}>
                        {x.actual}/{x.meta}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}

        <Boton ancho tono="fantasma" onPress={() => router.back()}>
          {t('comun.volver')}
        </Boton>
      </ScrollView>

      {abierto && <DetalleLogro item={abierto} onCerrar={() => setAbierto(null)} />}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: espacio.lg, paddingBottom: espacio.xl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  titulo: { ...texto.display, color: color.verde },

  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.lg,
    padding: espacio.md,
  },
  resumenTexto: { flex: 1, gap: espacio.sm },
  trofeo: { ...texto.subtitulo, color: color.verde },
  ayuda: { ...texto.chico, color: color.tintaSuave },
  especial: { ...texto.cuerpoFuerte, color: '#1F6FB2' },

  seccion: { gap: espacio.xs },
  seccionEspecial: { backgroundColor: '#0B3D6E', borderRadius: radio.lg, padding: espacio.md, borderWidth: 3, borderColor: '#F4C542' },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  categoria: { ...texto.subtitulo, color: color.verde },
  categoriaEspecial: { color: '#F4C542' },
  cuenta: { ...texto.cuerpoFuerte, color: color.tintaSuave },
  cuentaEspecial: { color: '#DDF1FC' },
  descripcion: { ...texto.chico, color: color.tintaSuave, marginBottom: espacio.xs },
  descripcionEspecial: { color: '#DDF1FC' },

  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.sm },
  celda: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.xs,
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: color.borde,
    backgroundColor: '#F3EEE6',
    borderBottomWidth: 4,
  },
  celdaGanada: { backgroundColor: color.blanco, borderColor: '#F0D79A' },
  celdaEspecial: { backgroundColor: '#14528F', borderColor: '#F4C542' },
  apretada: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
  nombre: { ...texto.chico, fontFamily: 'Fredoka_600SemiBold', color: color.verde, textAlign: 'center', minHeight: 36 },
  nombreBloqueado: { color: color.tintaSuave },
  nombreEspecial: { color: '#FFFFFF' },
  progreso: { ...texto.chico, color: color.tintaSuave },
  proximo: { ...texto.chico, fontSize: 11, color: color.intentoTinta, fontFamily: 'NunitoSans_700Bold' },
  exclusivo: { backgroundColor: '#F4C542', borderRadius: radio.redondo, paddingHorizontal: espacio.sm },
  exclusivoTexto: { ...texto.etiqueta, fontSize: 10, color: '#5C3D02' },
});
