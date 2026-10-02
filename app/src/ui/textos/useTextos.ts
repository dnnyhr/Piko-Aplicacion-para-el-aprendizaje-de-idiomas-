/**
 * Los textos de la interfaz en la lengua elegida, para las pantallas.
 *
 *   const { t, frases } = useTextos();
 *   t('portada.practicar')               → «Practicar sola», o su traducción
 *   t('unirse.entraste', { codigo })     → con el valor reemplazado
 *   elegir(frases('piko.acierto'))       → una frase de Piko al azar
 */

import { useCallback } from 'react';
import { useIdioma } from '../../features/idioma/store';
import { desdeIdioma, frasesDe, traducir, type Clave, type ClaveFrases } from './traducir';

export function useTextos() {
  const idioma = useIdioma((s) => s.idioma);
  const t = useCallback(
    (clave: Clave, valores?: Record<string, string | number>) => traducir(idioma, clave, valores),
    [idioma],
  );
  const frases = useCallback((clave: ClaveFrases) => frasesDe(idioma, clave), [idioma]);
  return { t, frases, idioma, desde: desdeIdioma(idioma) };
}
