/**
 * El detalle de un logro, al tocarlo en la cuadrícula: qué es, cómo se
 * obtiene y, si ya es tuyo, cuándo lo ganaste, con Piko festejándolo. Si
 * todavía no, cuánto llevás, sin apurar a nadie.
 */

import { useMemo } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { LogroConEstado } from '../../core/logros/tipos';
import { BarraProgreso } from '../components/BarraProgreso';
import { Boton } from '../components/Boton';
import { PikoMascota } from '../piko/PikoMascota';
import { elegir } from '../piko/frases';
import { useTextos } from '../textos/useTextos';
import { color, espacio, fuente, radio, texto } from '../tokens';
import { fechaLarga } from './fecha';
import { LluviaFlores, Rayos, useEntrada } from './Festejo';
import { Insignia } from './Insignia';

export function DetalleLogro({ item, onCerrar }: { item: LogroConEstado; onCerrar: () => void }) {
  const { t, frases } = useTextos();
  const { width } = useWindowDimensions();
  const entrada = useEntrada();
  const { logro, desbloqueado, fecha, actual, meta, proximamente, requiereCodigo } = item;
  const especial = logro.tipo === 'especial';
  const ancho = Math.min(width - espacio.xl * 2, 380);
  const dice = useMemo(() => elegir(frases('piko.logro')), [frases]);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel={t('logros.cerrar')}>
        <Pressable style={[styles.tarjeta, especial && desbloqueado && styles.tarjetaEspecial, { width: ancho }]} onPress={() => undefined}>
          {desbloqueado && <LluviaFlores ancho={ancho} alto={520} cuantas={8} />}

          <View style={styles.escena}>
            {desbloqueado && (
              <View style={styles.rayos}>
                <Rayos tam={190} color={especial ? '#7FC4FF' : '#FFE3A3'} />
              </View>
            )}
            <Animated.View style={desbloqueado ? entrada : null}>
              <Insignia logro={logro} desbloqueado={desbloqueado} proximamente={proximamente} tam={116} />
            </Animated.View>
          </View>

          {logro.exclusivo && (
            <View style={styles.exclusivo}>
              <Text style={styles.exclusivoTexto}>⭐ {t('logros.exclusivo')}</Text>
            </View>
          )}

          <Text style={[styles.nombre, especial && desbloqueado && styles.claro]}>{logro.nombre}</Text>
          <Text style={[styles.descripcion, especial && desbloqueado && styles.claroSuave]}>{logro.descripcion}</Text>

          <View style={[styles.como, especial && desbloqueado && styles.comoEspecial]}>
            <Text style={styles.comoEtiqueta}>{t('logros.como')}</Text>
            <Text style={styles.comoTexto}>{logro.como}</Text>
          </View>

          {desbloqueado && fecha !== null ? (
            <>
              <Text style={[styles.fecha, especial && styles.fechaEspecial]}>🗓️ {t('logros.desbloqueado_el', { fecha: fechaLarga(fecha) })}</Text>
              <View style={styles.piko}>
                <PikoMascota estado="celebrando" tam={78} />
                <View style={styles.globo}>
                  <Text style={styles.globoTexto}>{dice}</Text>
                </View>
              </View>
            </>
          ) : proximamente ? (
            <Text style={styles.ayuda}>{t('logros.proximamente_ayuda')}</Text>
          ) : (
            <View style={styles.falta}>
              {meta > 0 && (
                <>
                  <Text style={styles.cuenta}>{t('logros.llevas', { actual, meta })}</Text>
                  <BarraProgreso valor={actual / meta} />
                </>
              )}
              <View style={styles.piko}>
                <PikoMascota estado="pensando" tam={70} />
                <Text style={styles.animo}>{requiereCodigo ? t('logros.animo_codigo') : t('logros.animo')}</Text>
              </View>
            </View>
          )}

          <Boton ancho tono={desbloqueado ? 'verde' : 'papel'} onPress={onCerrar}>
            {t('logros.cerrar')}
          </Boton>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(22,36,29,0.55)', alignItems: 'center', justifyContent: 'center' },
  tarjeta: {
    backgroundColor: color.papel,
    borderRadius: radio.xl,
    borderWidth: 2,
    borderColor: color.borde,
    padding: espacio.xl,
    alignItems: 'center',
    gap: espacio.sm,
    overflow: 'hidden',
  },
  tarjetaEspecial: { backgroundColor: '#0B3D6E', borderColor: '#F4C542', borderWidth: 3 },
  escena: { width: 190, height: 140, alignItems: 'center', justifyContent: 'center' },
  rayos: { position: 'absolute', left: 0, top: -25 },
  exclusivo: { backgroundColor: '#F4C542', borderRadius: radio.redondo, paddingHorizontal: espacio.md, paddingVertical: 2 },
  exclusivoTexto: { ...texto.etiqueta, color: '#5C3D02' },
  nombre: { ...texto.titulo, color: color.verde, textAlign: 'center' },
  descripcion: { ...texto.cuerpo, color: color.tinta, textAlign: 'center' },
  claro: { color: '#FFFFFF' },
  claroSuave: { color: '#DDF1FC' },
  como: { alignSelf: 'stretch', backgroundColor: color.blanco, borderRadius: radio.md, borderWidth: 2, borderColor: color.borde, padding: espacio.md, gap: 2 },
  comoEspecial: { borderColor: '#F4C542' },
  comoEtiqueta: { ...texto.etiqueta, color: color.tintaSuave },
  comoTexto: { ...texto.cuerpoFuerte, color: color.tinta },
  fecha: { ...texto.cuerpoFuerte, color: color.verdeBosque },
  fechaEspecial: { color: '#F4C542' },
  falta: { alignSelf: 'stretch', gap: espacio.sm },
  cuenta: { ...texto.cuerpoFuerte, color: color.verde, textAlign: 'center' },
  ayuda: { ...texto.chico, color: color.tintaSuave, textAlign: 'center' },
  piko: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  animo: { ...texto.cuerpoFuerte, color: color.tinta, flexShrink: 1 },
  globo: { backgroundColor: color.blanco, borderRadius: radio.md, borderWidth: 2, borderColor: color.borde, paddingHorizontal: espacio.md, paddingVertical: espacio.sm },
  globoTexto: { fontFamily: fuente.cuerpoFuerte, fontSize: 15, color: color.verde },
});
