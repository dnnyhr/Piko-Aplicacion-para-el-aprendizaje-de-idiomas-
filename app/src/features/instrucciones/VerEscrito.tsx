/**
 * La alternativa escrita de una pregunta que llega por audio.
 *
 * Está siempre, sin importar las preferencias: nadie debería tener que
 * configurar nada para poder responder. Usarla no cambia el puntaje.
 */

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { TextoDelAudio } from '../../core/preferencias/escrito';
import { crearEstilos } from '../../ui/tema';
import { espacio, radio, texto } from '../../ui/tokens';
import { useTextos } from '../../ui/textos/useTextos';

export interface VerEscritoProps {
  alternativa: TextoDelAudio;
  /** Avisa que se abrió: Pikito Ciego además escribe sus opciones. */
  onVer?: () => void;
}

export function VerEscrito({ alternativa, onVer }: VerEscritoProps) {
  const styles = useEstilos();
  const { t } = useTextos();
  const [visible, setVisible] = useState(false);

  if (visible) {
    return (
      <View style={styles.tarjeta} accessibilityLiveRegion="polite">
        <Text style={styles.texto}>{t(`escrito.${alternativa.forma}`, { texto: alternativa.texto })}</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={() => {
        setVisible(true);
        onVer?.();
      }}
      accessibilityRole="button"
      hitSlop={6}
      style={styles.boton}
    >
      <Text style={styles.botonTexto}>{t('escrito.ver')}</Text>
    </Pressable>
  );
}

const useEstilos = crearEstilos((color) => ({
  boton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.bordeHondo,
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
  },
  botonTexto: { ...texto.cuerpoFuerte, color: color.verde },
  tarjeta: {
    backgroundColor: color.blanco,
    borderWidth: 2,
    borderColor: color.bordeHondo,
    borderRadius: radio.md,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.md,
  },
  texto: { ...texto.cuerpoFuerte, color: color.grafito },
}));
