/**
 * El dibujito que acompaña a un paso: una miniatura de lo que hay que tocar,
 * hecha con vistas planas, sin imágenes que pesen en el APK.
 */

import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Marca } from '../../ui/components/Marca';
import { Parlante } from '../../ui/minijuegos/Iconos';
import { crearEstilos, useColor } from '../../ui/tema';
import { espacio, radio, texto } from '../../ui/tokens';
import { useTextos } from '../../ui/textos/useTextos';
import type { EjemploDePaso } from './pasos';

export interface EjemploPasoProps {
  ejemplo: EjemploDePaso;
  /** El dibujo del juego, para los pasos `dibujo`. */
  dibujo?: ReactNode;
}

export function EjemploPaso({ ejemplo, dibujo }: EjemploPasoProps) {
  const styles = useEstilos();
  const color = useColor();
  const { t } = useTextos();

  // Decorativo: el paso ya está escrito al lado.
  return (
    <View style={styles.marco} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {ejemplo === 'leer' && <Text style={styles.letras}>Aa</Text>}
      {ejemplo === 'escuchar' && (
        <View style={styles.parlante}>
          <Parlante tam={34} />
        </View>
      )}
      {ejemplo === 'opcion' && (
        <View style={styles.tarjetas}>
          <View style={styles.tarjeta} />
          <View style={[styles.tarjeta, styles.tarjetaElegida]}>
            <Marca tipo="punto" tinta={color.tintaCielo} tam={18} />
          </View>
          <View style={styles.tarjeta} />
        </View>
      )}
      {ejemplo === 'armar' && (
        <View style={styles.fichas}>
          <View style={styles.ficha} />
          <View style={[styles.ficha, styles.fichaLarga]} />
          <View style={styles.ficha} />
        </View>
      )}
      {ejemplo === 'comprobar' && (
        <View style={styles.boton}>
          <Text style={styles.botonTexto}>{t('ejercicio.comprobar')}</Text>
        </View>
      )}
      {ejemplo === 'dibujo' && dibujo}
    </View>
  );
}

const useEstilos = crearEstilos((color) => ({
  marco: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.nube,
    borderRadius: radio.md,
    padding: espacio.md,
    overflow: 'hidden',
  },
  letras: { ...texto.display, color: color.verde },
  parlante: {
    width: 60,
    height: 60,
    borderRadius: radio.redondo,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.cieloHondo,
  },
  tarjetas: { alignSelf: 'stretch', gap: espacio.xs, maxWidth: 200, width: '100%' },
  tarjeta: {
    height: 24,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderRadius: radio.sm,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: espacio.xs,
  },
  tarjetaElegida: { borderColor: color.bordeElegido, borderWidth: 3 },
  fichas: { flexDirection: 'row', gap: espacio.sm },
  ficha: {
    width: 44,
    height: 30,
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.borde,
    borderBottomWidth: 5,
    borderBottomColor: color.bordeHondo,
    borderRadius: radio.sm,
  },
  fichaLarga: { width: 64 },
  boton: {
    backgroundColor: color.verdePasto,
    borderRadius: radio.md,
    borderBottomWidth: 4,
    borderBottomColor: color.labioVerde,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.xl,
  },
  botonTexto: { ...texto.etiqueta, color: color.verdeHondo },
}));
