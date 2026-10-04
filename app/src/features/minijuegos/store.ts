/**
 * La lengua con que se juegan los minijuegos.
 *
 * Se guarda en el teléfono, así que no hay que elegirla cada vez; se cambia
 * antes de cada partida o desde el globo, en medio de una.
 */

import { create } from 'zustand';
import { abrirBase, recordarLenguaMinijuegos, ultimaLenguaMinijuegos } from '../../db';
import { LENGUAS_RAYUELA, type LenguaRayuela } from '../../core/minijuegos/rayuela';

function leerGuardada(): LenguaRayuela | null {
  try {
    const v = ultimaLenguaMinijuegos(abrirBase().sql);
    return (LENGUAS_RAYUELA as readonly string[]).includes(v ?? '') ? (v as LenguaRayuela) : null;
  } catch {
    return null;
  }
}

interface MinijuegosStore {
  /** Null mientras no haya elegido ninguna. */
  lengua: LenguaRayuela | null;
  elegirLengua: (lengua: LenguaRayuela) => void;
}

export const useMinijuegos = create<MinijuegosStore>((set) => ({
  lengua: leerGuardada(),
  elegirLengua(lengua) {
    set({ lengua });
    try {
      recordarLenguaMinijuegos(abrirBase().sql, lengua);
    } catch {
      /* sin base (p. ej. en el navegador) vale sólo por esta vez */
    }
  },
}));
