/**
 * Transporte sobre el módulo nativo `PikoRed`. Es el que corre en el teléfono.
 *
 * Cumple el mismo contrato que `tcp.node.ts`, así que `host.ts` y `client.ts`
 * no cambian ni una línea entre el simulador y el aula de verdad.
 *
 * Lo que resuelve el módulo nativo y no resolvía la librería de antes:
 *  - los sockets del estudiante salen por el wifi aunque el hotspot no tenga
 *    internet y los datos móviles estén prendidos;
 *  - el tiempo límite de conexión lo aplica el sistema operativo, así que
 *    probar una dirección vacía no deja un hilo colgado dos minutos.
 */

import { PikoRed, type PikoRedNativo } from '../../modules/piko-red/src';
import { AulaNoDisponible, type Conexion, type Servidor, type Transporte } from './transport';

interface Oyentes {
  datos: Array<(chunk: string) => void>;
  cierre: Array<() => void>;
  error: Array<(err: Error) => void>;
}

const porId = new Map<number, Oyentes>();
const entrantes = new Map<number, (c: Conexion) => void>();
let suscrito = false;

function nativo(): PikoRedNativo {
  if (!PikoRed) throw new AulaNoDisponible();
  if (!suscrito) {
    suscrito = true;
    PikoRed.addListener('datos', ({ id, texto }) => {
      for (const cb of porId.get(id)?.datos ?? []) cb(texto);
    });
    PikoRed.addListener('cierre', ({ id }) => {
      const o = porId.get(id);
      porId.delete(id);
      for (const cb of o?.cierre ?? []) cb();
    });
    PikoRed.addListener('entrante', ({ servidor, id, remoto }) => {
      const cb = entrantes.get(servidor);
      if (cb) cb(envolver(id, remoto));
      else PikoRed?.cerrar(id);
    });
  }
  return PikoRed;
}

function envolver(id: number, remoto: string): Conexion {
  const red = nativo();
  const oyentes: Oyentes = { datos: [], cierre: [], error: [] };
  porId.set(id, oyentes);
  let cerrado = false;
  let leyendo = false;

  oyentes.cierre.push(() => {
    cerrado = true;
  });

  return {
    id: `rn${id}`,
    remoto,
    send(linea) {
      if (!cerrado) red.enviar(id, linea);
    },
    close() {
      if (cerrado) return;
      cerrado = true;
      red.cerrar(id);
    },
    onData(cb) {
      oyentes.datos.push(cb);
      // Se empieza a leer recién ahora: así no se pierde nada que llegue
      // antes de que la lógica del aula esté escuchando.
      if (!leyendo) {
        leyendo = true;
        red.leer(id);
      }
    },
    onClose(cb) {
      oyentes.cierre.push(cb);
    },
    onError(cb) {
      // El nativo reporta todo error como cierre: no hay errores sueltos.
      oyentes.error.push(cb);
    },
  };
}

class ServidorRN implements Servidor {
  private id: number | null = null;
  private handler: ((c: Conexion) => void) | null = null;
  private enEscucha = 0;

  async listen(puerto: number): Promise<void> {
    const red = nativo();
    const { id, puerto: real } = await red.escuchar(puerto);
    this.id = id;
    this.enEscucha = real;
    entrantes.set(id, (c) => {
      if (this.handler) this.handler(c);
      else c.close();
    });
  }

  onConnection(cb: (c: Conexion) => void): void {
    this.handler = cb;
  }

  async close(): Promise<void> {
    if (this.id === null) return;
    entrantes.delete(this.id);
    try {
      nativo().cerrarServidor(this.id);
    } catch {
      /* ya estaba cerrado */
    }
    this.id = null;
    this.enEscucha = 0;
  }

  get puerto(): number {
    return this.enEscucha;
  }
}

export const transporteNativo: Transporte = {
  crearServidor() {
    return new ServidorRN();
  },

  async conectar(host, puerto, timeoutMs = 6000) {
    const red = nativo();
    const { id, remoto } = await red.conectar(host, puerto, Math.round(timeoutMs));
    return envolver(id, remoto);
  },
};
