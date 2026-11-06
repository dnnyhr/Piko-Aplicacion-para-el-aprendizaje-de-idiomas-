/**
 * Cómo el estudiante encuentra al maestro, sin teléfonos.
 *
 * El maestro corre de verdad sobre `node:net` en 127.0.0.1; lo que falta (la
 * puerta de enlace del wifi, el faro UDP) lo pone una `RedLocal` de mentira.
 * Las direcciones del aula se traducen a 127.0.0.1 en un transporte que
 * envuelve al de Node: así el barrido "toca" 254 direcciones y sólo una
 * contesta.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  buscarAnfitrion,
  ipsDelAnfitrion,
  leerFaro,
  mensajeFaro,
  type PasoBusqueda,
} from '@/net/descubrir';
import { transporteNode } from '@/net/tcp.node';
import type { InfoRedLocal, RedLocal, Servidor, Transporte } from '@/net/transport';

const abiertos: Servidor[] = [];

afterEach(async () => {
  for (const s of abiertos.splice(0)) await s.close();
});

/** Un maestro escuchando en un puerto libre de 127.0.0.1. */
async function maestro(): Promise<number> {
  const servidor = transporteNode.crearServidor();
  servidor.onConnection((c) => c.onData(() => undefined));
  await servidor.listen(0);
  abiertos.push(servidor);
  return servidor.puerto;
}

/** Transporte donde sólo `ipMaestro` llega al servidor; el resto falla. */
function aula(ipMaestro: string, probadas: string[] = []): Transporte {
  return {
    crearServidor: () => transporteNode.crearServidor(),
    async conectar(host, puerto, timeoutMs) {
      probadas.push(host);
      if (host !== ipMaestro) throw new Error(`nadie en ${host}`);
      return transporteNode.conectar('127.0.0.1', puerto, timeoutMs);
    },
  };
}

function red(info: InfoRedLocal, faro: { ip: string; mensaje: string } | null = null): RedLocal {
  return {
    info: () => info,
    iniciarFaro: () => undefined,
    detenerFaro: () => undefined,
    buscarFaro: async () => faro,
  };
}

const RAPIDO = { primeras: 300, faro: 10, barrido: 200, tanda: 64 };

const wifiDelHotspot = (puertaEnlace: string | null): InfoRedLocal => ({
  wifi: { ip: '192.168.217.40', prefijo: 24, puertaEnlace },
  interfaces: [{ nombre: 'wlan0', ip: '192.168.217.40', prefijo: 24 }],
});

describe('el faro', () => {
  it('ida y vuelta', () => {
    expect(leerFaro(mensajeFaro('KOLA', 7331))).toEqual({ puerto: 7331, roomCode: 'KOLA' });
  });

  it('ignora lo que no es un faro de Piko', () => {
    expect(leerFaro('PIKO?')).toBeNull();
    expect(leerFaro('HOLA 7331 X')).toBeNull();
    expect(leerFaro('PIKO1 99999 X')).toBeNull();
  });
});

describe('la dirección del maestro', () => {
  it('prefiere la interfaz del hotspot y descarta la de datos móviles', () => {
    const ips = ipsDelAnfitrion({
      wifi: null,
      interfaces: [
        { nombre: 'rmnet_data0', ip: '10.45.2.9', prefijo: 30 },
        { nombre: 'wlan0', ip: '192.168.1.20', prefijo: 24 },
        { nombre: 'ap0', ip: '192.168.217.104', prefijo: 24 },
      ],
    });
    expect(ips).toEqual(['192.168.217.104', '192.168.1.20']);
  });

  it('sin hotspot ni wifi no inventa nada', () => {
    expect(ipsDelAnfitrion({ wifi: null, interfaces: [] })).toEqual([]);
  });
});

describe('buscar al maestro', () => {
  it('la puerta de enlace del wifi es el maestro: lo encuentra sin barrer', async () => {
    const puerto = await maestro();
    const probadas: string[] = [];
    // Android 11+ elige la dirección del hotspot al azar: no es la .1.
    const hallado = await buscarAnfitrion(aula('192.168.217.104', probadas), red(wifiDelHotspot('192.168.217.104')), {
      puerto,
      tiempos: RAPIDO,
    });
    expect(hallado).toEqual({ ip: '192.168.217.104', puerto, via: 'puerta' });
    expect(probadas).toEqual(['192.168.217.104']);
  });

  it('la última sala conocida va primero', async () => {
    const puerto = await maestro();
    const hallado = await buscarAnfitrion(aula('192.168.217.9'), red(wifiDelHotspot('192.168.217.1')), {
      puerto,
      conocidas: ['192.168.217.9'],
      tiempos: RAPIDO,
    });
    expect(hallado?.via).toBe('conocida');
  });

  it('si la puerta de enlace no contesta, el faro dice dónde está la sala', async () => {
    const puerto = await maestro();
    const hallado = await buscarAnfitrion(
      aula('192.168.217.55'),
      red(wifiDelHotspot('192.168.217.1'), { ip: '192.168.217.55', mensaje: mensajeFaro('KOLA', puerto) }),
      { puerto: 1, tiempos: RAPIDO },
    );
    // El puerto lo trae el faro, no la suposición.
    expect(hallado).toEqual({ ip: '192.168.217.55', puerto, via: 'faro' });
  });

  it('sin faro, el barrido la encuentra en la subred', async () => {
    const puerto = await maestro();
    const pasos: PasoBusqueda[] = [];
    const hallado = await buscarAnfitrion(aula('192.168.217.200'), red(wifiDelHotspot(null)), {
      puerto,
      tiempos: RAPIDO,
      onProgreso: (p) => pasos.push(p),
    });
    expect(hallado).toEqual({ ip: '192.168.217.200', puerto, via: 'barrido' });
    expect(pasos).toEqual(['faro', 'barrido']);
  });

  it('sin wifi lo avisa, y no barre nada', async () => {
    const probadas: string[] = [];
    const pasos: PasoBusqueda[] = [];
    const hallado = await buscarAnfitrion(aula('x', probadas), red({ wifi: null, interfaces: [] }), {
      tiempos: RAPIDO,
      onProgreso: (p) => pasos.push(p),
    });
    expect(hallado).toBeNull();
    expect(pasos[0]).toBe('sin_wifi');
    expect(probadas).toEqual([]);
  });

  it('se puede cancelar', async () => {
    const señal = { cancelado: true };
    const probadas: string[] = [];
    const hallado = await buscarAnfitrion(aula('x', probadas), red(wifiDelHotspot(null)), {
      tiempos: RAPIDO,
      señal,
    });
    expect(hallado).toBeNull();
    expect(probadas).toEqual([]);
  });
});
