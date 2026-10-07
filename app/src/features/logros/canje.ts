/**
 * Canjear el código de una tarjeta (logros especiales).
 *
 * Es lo único de la app que necesita internet, y sólo en el momento de
 * canjear: el servidor (`encuestas/src/canjes.js`) es el que sabe si el código
 * existe y si alguien ya lo usó. Lo que confirma queda en el log de progreso
 * como un evento `canje`, y desde ahí el logro es del estudiante para siempre,
 * con o sin internet.
 */

import { abrirBase } from '../../db';
import { normalizarCodigo } from '../../core/logros/codigo';
import { logroPorId } from '../../core/logros/catalogo';
import { useProgreso } from '../progreso/store';

/** Se puede apuntar a un servidor local con EXPO_PUBLIC_PIKO_CANJES (p. ej. http://localhost:8787/api/canjes). */
export const API_CANJES = process.env.EXPO_PUBLIC_PIKO_CANJES || 'https://encuestas.piko.mugiware.com/api/canjes';

const ESPERA_MS = 15_000;

export type ResultadoCanje =
  | { tipo: 'ok'; logro: string; codigo: string }
  /** No tiene la forma de un código, o el servidor no lo conoce. */
  | { tipo: 'invalido' }
  | { tipo: 'usado' }
  | { tipo: 'ya_lo_tenes'; logro: string }
  | { tipo: 'sin_internet' }
  | { tipo: 'bloqueado'; minutos: number }
  /** El servidor dio un logro que esta versión de la app no conoce. */
  | { tipo: 'actualizar' }
  | { tipo: 'error' };

export async function canjearCodigo(texto: string, nombre: string | null): Promise<ResultadoCanje> {
  const codigo = normalizarCodigo(texto);
  if (!codigo) return { tipo: 'invalido' };

  const progreso = useProgreso.getState();
  const yaCanjeado = Object.entries(progreso.estado.canjes).find(([, c]) => c === codigo);
  if (yaCanjeado) return { tipo: 'ya_lo_tenes', logro: yaCanjeado[0] };

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MS);
  let res: Response;
  try {
    res = await fetch(API_CANJES, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ codigo, alumno: progreso.studentId, dispositivo: abrirBase().deviceId, nombre }),
      signal: control.signal,
    });
  } catch {
    return { tipo: 'sin_internet' };
  } finally {
    clearTimeout(reloj);
  }

  let cuerpo: Record<string, unknown> = {};
  try {
    cuerpo = (await res.json()) as Record<string, unknown>;
  } catch {
    /* sin cuerpo: se decide por el estado */
  }

  if (res.status === 404) return { tipo: 'invalido' };
  if (res.status === 409) return { tipo: 'usado' };
  if (res.status === 429) return { tipo: 'bloqueado', minutos: typeof cuerpo.minutos === 'number' ? cuerpo.minutos : 15 };
  if (!res.ok || typeof cuerpo.logro !== 'string') return { tipo: 'error' };

  const logro = cuerpo.logro;
  const def = logroPorId(logro);
  if (!def || def.condicion.tipo !== 'codigo') return { tipo: 'actualizar' };
  if (progreso.estado.canjes[logro] !== undefined) return { tipo: 'ya_lo_tenes', logro };

  progreso.registrarCanje({
    codigo,
    logro,
    canjeadoEn: typeof cuerpo.canjeadoEn === 'string' ? cuerpo.canjeadoEn : new Date().toISOString(),
  });
  return { tipo: 'ok', logro, codigo };
}
