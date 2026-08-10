/**
 * Encontrar el teléfono del maestro dentro del hotspot.
 *
 * Tres intentos, del más cómodo al más manual. Ninguno depende de internet
 * ni de que alguien recuerde una dirección IP:
 *
 *   1. La puerta de enlace. En un hotspot de Android el anfitrión **es** el
 *      router, así que casi siempre está en `a.b.c.1`. Es instantáneo.
 *   2. Un barrido corto del resto de la subred, por si el maestro se conectó
 *      a una red ajena en vez de crear el hotspot.
 *   3. Escribir la IP a mano, que el maestro tiene en pantalla.
 */

import * as Network from 'expo-network';
import { PUERTO_AULA } from '../core/protocol/messages';
import type { Transporte } from './transport';

/** Direcciones típicas de anfitrión, en orden de probabilidad. */
const CANDIDATAS_FIJAS = ['192.168.43.1', '192.168.49.1', '172.20.10.1'];

export function ipValida(ip: string): boolean {
  const partes = ip.trim().split('.');
  if (partes.length !== 4) return false;
  return partes.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

/** `192.168.43.57` → `192.168.43.` */
function prefijoDe(ip: string): string | null {
  if (!ipValida(ip)) return null;
  return ip.split('.').slice(0, 3).join('.') + '.';
}

export async function miIp(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    return ip && ip !== '0.0.0.0' ? ip : null;
  } catch {
    return null;
  }
}

/** ¿Hay una sala escuchando en esta dirección? */
async function responde(
  transporte: Transporte,
  ip: string,
  puerto: number,
  timeoutMs: number,
): Promise<boolean> {
  try {
    const conexion = await transporte.conectar(ip, puerto, timeoutMs);
    conexion.close();
    return true;
  } catch {
    return false;
  }
}

export interface OpcionesBusqueda {
  puerto?: number;
  /** Se avisa cada vez que cambia lo que se está probando, para la pantalla. */
  onProgreso?: (mensaje: string) => void;
  señal?: { cancelado: boolean };
}

/**
 * Devuelve la IP del anfitrión, o `null` si no apareció.
 *
 * El barrido va de a tandas para no abrir 254 sockets de golpe en un teléfono
 * de gama baja, que es una forma segura de que el sistema empiece a matar
 * conexiones.
 */
export async function buscarAnfitrion(
  transporte: Transporte,
  opciones: OpcionesBusqueda = {},
): Promise<string | null> {
  const puerto = opciones.puerto ?? PUERTO_AULA;
  const { onProgreso, señal } = opciones;
  const cancelado = () => señal?.cancelado === true;

  const propia = await miIp();
  const prefijo = propia ? prefijoDe(propia) : null;

  // 1. La puerta de enlace y las direcciones típicas de hotspot.
  const primeras = [...(prefijo ? [`${prefijo}1`] : []), ...CANDIDATAS_FIJAS].filter(
    (ip, i, todas) => todas.indexOf(ip) === i && ip !== propia,
  );

  onProgreso?.('Buscando al maestro…');
  for (const ip of primeras) {
    if (cancelado()) return null;
    if (await responde(transporte, ip, puerto, 1200)) return ip;
  }

  if (!prefijo) return null;

  // 2. Barrido del resto de la subred, de a 24 por vez.
  onProgreso?.('Revisando la red del aula…');
  const TANDA = 24;
  const finales: number[] = [];
  for (let n = 2; n <= 254; n++) {
    const ip = `${prefijo}${n}`;
    if (ip !== propia && !primeras.includes(ip)) finales.push(n);
  }

  for (let i = 0; i < finales.length; i += TANDA) {
    if (cancelado()) return null;
    const tanda = finales.slice(i, i + TANDA);
    const resultados = await Promise.all(
      tanda.map(async (n) => {
        const ip = `${prefijo}${n}`;
        return (await responde(transporte, ip, puerto, 700)) ? ip : null;
      }),
    );
    const encontrada = resultados.find((r): r is string => r !== null);
    if (encontrada) return encontrada;
  }

  return null;
}
