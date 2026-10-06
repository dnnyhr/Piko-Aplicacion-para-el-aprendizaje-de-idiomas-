/**
 * El nivel del estudiante para elegir canciones: el mismo que le dan sus
 * lecciones de inglés en los minijuegos (`nivelesDe`). Con él se abren las
 * canciones de su nivel y las de abajo; sin lecciones, el inicial.
 */

import { useMemo } from 'react';
import { useProgreso } from '../progreso/store';
import { nivelesDe, nivelSugerido, type NivelMinijuego } from '../../core/minijuegos/vocabulario';
import { PACKS } from '../../../content';

/** Cuántas opciones hacen falta por nivel para medirlo: las de las actividades de las canciones. */
const OPCIONES: Record<NivelMinijuego, number> = { inicial: 3, intermedio: 4, avanzado: 4 };

export function useNivelMusical(): NivelMinijuego {
  const estado = useProgreso((s) => s.estado);
  return useMemo(() => nivelSugerido(nivelesDe(PACKS, estado, 'eng', OPCIONES)) ?? 'inicial', [estado]);
}
