/**
 * Encontrar el teléfono del maestro dentro del hotspot.
 *
 * Del más rápido al más lento. Ninguno depende de internet, y el estudiante
 * no tiene que escribir nada salvo que todo lo demás falle:
 *
 *   1. **La última sala** donde entró este teléfono.
 *   2. **La puerta de enlace del wifi.** En un hotspot el teléfono del
 *      maestro *es* el router, así que la puerta de enlace es su dirección
 *      exacta — sea `192.168.43.1` o la dirección al azar que eligen los
 *      Android 11 en adelante. Se lee del sistema, no se adivina.
 *   3. **El faro UDP.** El maestro anuncia la sala cada segundo y contesta a
 *      quien pregunte. Sirve también cuando maestro y estudiantes están en el
 *      mismo router de la escuela en vez de un hotspot.
 *   4. **Un barrido** de la subred, por si la difusión está bloqueada.
 *   5. Escribir la IP a mano, que el maestro tiene en pantalla.
 *
 * Todo lo que toca el sistema entra por `Transporte` y `RedLocal`, así que
 * esta lógica se prueba entera en Node (`tests/descubrir.test.ts`).
 */

import { PUERTO_AULA, PUERTO_FARO } from '../core/protocol/messages';
import type { InfoRedLocal, RedLocal, Transporte } from './transport';

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

function esPrivada(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number) as [number, number];
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/** Interfaces de datos móviles, VPN y similares: nunca son la sala. */
const NO_ES_AULA = /^(rmnet|ccmni|v4-|pdp|dummy|tun|ppp|ipsec|clat|lo)/;
/** Nombres que usa Android para la interfaz del hotspot, según el fabricante. */
const HOTSPOT = /^(ap|swlan|softap|wlan[1-9]|wigig|rndis|usb|bt-pan)/;

// ---------------------------------------------------------------- el faro

/** Lo que difunde el maestro: `PIKO1 <puerto tcp> <código de sala>`. */
export function mensajeFaro(roomCode: string, puerto: number = PUERTO_AULA): string {
  return `PIKO1 ${puerto} ${roomCode}`;
}

export function leerFaro(mensaje: string): { puerto: number; roomCode: string } | null {
  const m = /^PIKO1 (\d{1,5}) (\S+)/.exec(mensaje.trim());
  if (!m) return null;
  const puerto = Number(m[1]);
  if (!(puerto > 0 && puerto < 65536)) return null;
  return { puerto, roomCode: m[2] as string };
}

// ---------------------------------------------------------------- maestro

/**
 * Las direcciones por las que los estudiantes pueden llegar a este teléfono,
 * la más probable primero. El maestro las ve en pantalla para el plan manual.
 */
export function ipsDelAnfitrion(info: InfoRedLocal): string[] {
  const candidatas = info.interfaces.filter(
    (i) => ipValida(i.ip) && esPrivada(i.ip) && !NO_ES_AULA.test(i.nombre),
  );
  const puntaje = (nombre: string) => (HOTSPOT.test(nombre) ? 0 : nombre.startsWith('wlan') ? 1 : 2);
  const orden = [...candidatas].sort((a, b) => puntaje(a.nombre) - puntaje(b.nombre));
  const ips = orden.map((i) => i.ip);
  if (info.wifi?.ip && ipValida(info.wifi.ip) && !ips.includes(info.wifi.ip)) ips.push(info.wifi.ip);
  return ips.filter((ip, i, todas) => todas.indexOf(ip) === i);
}

// ---------------------------------------------------------------- estudiante

export type PasoBusqueda = 'sin_wifi' | 'primeras' | 'faro' | 'barrido';

export interface OpcionesBusqueda {
  puerto?: number;
  puertoFaro?: number;
  /** Direcciones donde ya hubo una sala, para probar antes que nada. */
  conocidas?: readonly string[];
  /** Se avisa en cada paso para que la pantalla diga qué está haciendo. */
  onProgreso?: (paso: PasoBusqueda) => void;
  señal?: { cancelado: boolean };
  /** Tiempos, para las pruebas. */
  tiempos?: Partial<typeof TIEMPOS>;
}

const TIEMPOS = {
  primeras: 1500,
  faro: 2500,
  barrido: 700,
  tanda: 32,
};

export interface Anfitrion {
  ip: string;
  puerto: number;
  via: 'conocida' | 'puerta' | 'faro' | 'barrido';
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

/**
 * Devuelve dónde está la sala, o `null` si no apareció.
 *
 * El barrido va de a tandas para no abrir 254 sockets de golpe en un teléfono
 * de gama baja. Cada intento tiene su tiempo límite en el sistema operativo,
 * así que una tanda dura lo que el más lento, no más.
 */
export async function buscarAnfitrion(
  transporte: Transporte,
  red: RedLocal,
  opciones: OpcionesBusqueda = {},
): Promise<Anfitrion | null> {
  const puerto = opciones.puerto ?? PUERTO_AULA;
  const puertoFaro = opciones.puertoFaro ?? PUERTO_FARO;
  const t = { ...TIEMPOS, ...opciones.tiempos };
  const { onProgreso, señal } = opciones;
  const cancelado = () => señal?.cancelado === true;

  const info = red.info();
  const propia = info.wifi?.ip && ipValida(info.wifi.ip) ? info.wifi.ip : null;
  if (!info.wifi) onProgreso?.('sin_wifi');

  // 1 y 2. Lo conocido y la puerta de enlace, en paralelo: lo que conteste.
  const puerta = info.wifi?.puertaEnlace && ipValida(info.wifi.puertaEnlace) ? info.wifi.puertaEnlace : null;
  const primeras: Array<{ ip: string; via: Anfitrion['via'] }> = [];
  for (const ip of opciones.conocidas ?? []) if (ipValida(ip)) primeras.push({ ip, via: 'conocida' });
  if (puerta) primeras.push({ ip: puerta, via: 'puerta' });
  const unicas = primeras.filter((c, i) => primeras.findIndex((o) => o.ip === c.ip) === i && c.ip !== propia);

  if (unicas.length > 0) {
    if (info.wifi) onProgreso?.('primeras');
    const resultados = await Promise.all(
      unicas.map(async (c) => ((await responde(transporte, c.ip, puerto, t.primeras)) ? c : null)),
    );
    // Se respeta el orden: la sala conocida gana a la puerta de enlace.
    const hallada = resultados.find((r) => r !== null);
    if (hallada) return { ip: hallada.ip, puerto, via: hallada.via };
  }
  if (cancelado()) return null;

  // 3. El faro.
  onProgreso?.('faro');
  try {
    const faro = await red.buscarFaro(puertoFaro, t.faro);
    const datos = faro ? leerFaro(faro.mensaje) : null;
    if (faro && datos && ipValida(faro.ip)) return { ip: faro.ip, puerto: datos.puerto, via: 'faro' };
  } catch {
    /* sin UDP: queda el barrido */
  }
  if (cancelado()) return null;

  // 4. Barrido de la subred del wifi.
  const prefijo = propia ? prefijoDe(propia) : null;
  if (!prefijo) return null;

  onProgreso?.('barrido');
  const yaProbadas = new Set(unicas.map((c) => c.ip));
  const finales: string[] = [];
  for (let n = 1; n <= 254; n++) {
    const ip = `${prefijo}${n}`;
    if (ip !== propia && !yaProbadas.has(ip)) finales.push(ip);
  }

  for (let i = 0; i < finales.length; i += t.tanda) {
    if (cancelado()) return null;
    const tanda = finales.slice(i, i + t.tanda);
    const resultados = await Promise.all(
      tanda.map(async (ip) => ((await responde(transporte, ip, puerto, t.barrido)) ? ip : null)),
    );
    const encontrada = resultados.find((r): r is string => r !== null);
    if (encontrada) return { ip: encontrada, puerto, via: 'barrido' };
  }

  return null;
}
