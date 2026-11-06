/**
 * La narración de instrucciones: la misma voz del sistema que usan los
 * ejercicios y los minijuegos (`expo-speech`), que funciona sin internet.
 *
 * Narra sólo la lengua de la app. Las palabras de una lección siguen sonando
 * con la voz que trae su paquete: mayangna, rama y garífuna no tienen síntesis
 * a propósito, y esto no la agrega por la puerta de atrás.
 */

import { useCallback } from 'react';
import { usePreferencias } from '../preferencias/store';
import { callar, decir, vozDePiko } from '../minijuegos/voz';
import { useTextos } from '../../ui/textos/useTextos';
import type { Voz } from '../../core/minijuegos/rayuela';

export function useNarrador() {
  const activa = usePreferencias((s) => s.narracion);
  const { idioma } = useTextos();
  const voz = useCallback((texto: string): Voz => vozDePiko(texto, idioma), [idioma]);
  return { activa, voz, decir, callar };
}
