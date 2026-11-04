/** Dónde quedan las preferencias en el teléfono: en la base local. */

import { abrirBase, recordarPreferencias, ultimasPreferencias } from '../../db';

export function leerGuardado(): string | null {
  try {
    return ultimasPreferencias(abrirBase().sql);
  } catch {
    return null;
  }
}

export function guardar(json: string): void {
  try {
    recordarPreferencias(abrirBase().sql, json);
  } catch {
    /* si la base falla, vale sólo por esta vez: la app sigue funcionando */
  }
}
