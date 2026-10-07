/**
 * «¡Nuevo logro desbloqueado!»: la celebración que aparece al ganar uno.
 *
 * Vive una sola vez, en el layout de la app, y muestra de a uno los logros
 * de la cola (`features/logros/store.ts`) cuando el estudiante no está en
 * medio de una ronda. Los especiales se festejan en azul y oro, con la
 * etiqueta «Exclusivo».
 */

import { useMemo } from 'react';
import { Animated, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { logroPorId } from '../../core/logros/catalogo';
import type { Logro } from '../../core/logros/tipos';
import { useLogros } from '../../features/logros/store';
import { Boton } from '../components/Boton';
import { PikoMascota } from '../piko/PikoMascota';
import { elegir } from '../piko/frases';
import { useTextos } from '../textos/useTextos';
import { color, espacio, fuente, radio, texto } from '../tokens';
import { LluviaFlores, Rayos, useEntrada } from './Festejo';
import { Insignia } from './Insignia';

export function CelebracionLogros() {
  const cola = useLogros((s) => s.cola);
  const pausas = useLogros((s) => s.pausas);
  const id = pausas === 0 ? cola[0] : undefined;
  const logro = id ? logroPorId(id) : undefined;
  if (!logro) return null;
  return <Cartel key={logro.id} logro={logro} onCerrar={() => useLogros.getState().celebrado(logro.id)} />;
}

export function Cartel({ logro, onCerrar }: { logro: Logro; onCerrar: () => void }) {
  const { t, frases } = useTextos();
  const { width, height } = useWindowDimensions();
  const entrada = useEntrada();
  const especial = logro.tipo === 'especial';
  const ancho = Math.min(width - espacio.xl * 2, 380);
  const dice = useMemo(() => elegir(frases('piko.logro')), [frases]);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCerrar} statusBarTranslucent>
      <View style={styles.fondo}>
        <LluviaFlores ancho={width} alto={height} cuantas={especial ? 22 : 14} />
        <View style={[styles.tarjeta, especial && styles.tarjetaEspecial, { width: ancho }]}>
          <Text style={[styles.titulo, especial && styles.tituloEspecial]}>{especial ? t('logros.nuevo_especial') : t('logros.nuevo')}</Text>

          <View style={styles.escena}>
            <View style={styles.rayos}>
              <Rayos tam={220} color={especial ? '#7FC4FF' : '#FFE3A3'} />
            </View>
            <Animated.View style={entrada}>
              <Insignia logro={logro} desbloqueado tam={128} />
            </Animated.View>
          </View>

          {logro.exclusivo && (
            <View style={styles.exclusivo}>
              <Text style={styles.exclusivoTexto}>⭐ {t('logros.exclusivo')}</Text>
            </View>
          )}

          <Text style={[styles.nombre, especial && styles.nombreEspecial]}>🏆 {logro.nombre}</Text>
          <Text style={[styles.felicitacion, especial && styles.felicitacionEspecial]}>«{logro.felicitacion}»</Text>

          <View style={styles.piko}>
            <PikoMascota estado="celebrando" tam={86} />
            <View style={styles.globo}>
              <Text style={styles.globoTexto}>{dice}</Text>
            </View>
          </View>

          <Boton ancho tono={especial ? 'pico' : 'verde'} onPress={onCerrar}>
            {t('logros.continuar')}
          </Boton>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(10,69,48,0.72)', alignItems: 'center', justifyContent: 'center' },
  tarjeta: {
    backgroundColor: color.papel,
    borderRadius: radio.xl,
    borderWidth: 3,
    borderColor: color.pico,
    padding: espacio.xl,
    alignItems: 'center',
    gap: espacio.md,
  },
  tarjetaEspecial: { backgroundColor: '#0B3D6E', borderColor: '#F4C542' },
  titulo: { ...texto.etiqueta, fontSize: 15, color: color.copete, textAlign: 'center' },
  tituloEspecial: { color: '#F4C542', fontSize: 18 },
  escena: { width: 220, height: 170, alignItems: 'center', justifyContent: 'center' },
  rayos: { position: 'absolute', left: 0, top: -25 },
  exclusivo: { backgroundColor: '#F4C542', borderRadius: radio.redondo, paddingHorizontal: espacio.md, paddingVertical: 2 },
  exclusivoTexto: { ...texto.etiqueta, color: '#5C3D02' },
  nombre: { ...texto.titulo, color: color.verde, textAlign: 'center' },
  nombreEspecial: { color: '#FFFFFF' },
  felicitacion: { ...texto.cuerpo, color: color.tinta, textAlign: 'center' },
  felicitacionEspecial: { color: '#DDF1FC' },
  piko: { flexDirection: 'row', alignItems: 'center', gap: espacio.sm },
  globo: { backgroundColor: color.blanco, borderRadius: radio.md, borderWidth: 2, borderColor: color.borde, paddingHorizontal: espacio.md, paddingVertical: espacio.sm },
  globoTexto: { fontFamily: fuente.cuerpoFuerte, fontSize: 15, color: color.verde },
});
