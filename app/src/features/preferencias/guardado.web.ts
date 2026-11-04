/**
 * Dónde quedan las preferencias en el navegador.
 *
 * La base web vive en memoria y se pierde al recargar (ver `db/base.web.ts`),
 * pero esto no puede perderse: quien necesita letra grande la necesita también
 * al volver a abrir la página. `localStorage` puede fallar o estar bloqueado;
 * en ese caso vale sólo por esta vez.
 */

const CLAVE = 'piko.preferencias';

export function leerGuardado(): string | null {
  try {
    return globalThis.localStorage?.getItem(CLAVE) ?? null;
  } catch {
    return null;
  }
}

export function guardar(json: string): void {
  try {
    globalThis.localStorage?.setItem(CLAVE, json);
  } catch {
    /* sin almacenamiento: vale sólo por esta vez */
  }
}
