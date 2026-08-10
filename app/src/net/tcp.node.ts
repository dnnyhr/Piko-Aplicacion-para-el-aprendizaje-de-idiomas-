/**
 * Transporte sobre `node:net`.
 *
 * No se usa en el teléfono: existe para el simulador (`tools/sim.ts`) y para
 * las pruebas de integración, que levantan un host real y varios clientes
 * reales en localhost y ejercitan exactamente el mismo código de sala.
 */

import net from 'node:net';
import type { Conexion, Servidor, Transporte } from './transport';

let contador = 0;

function envolver(socket: net.Socket): Conexion {
  // utf-8 en el propio socket: Node no corta caracteres multibyte entre chunks.
  socket.setEncoding('utf8');
  socket.setNoDelay(true);

  const id = `n${++contador}`;
  const remoto = `${socket.remoteAddress ?? '?'}:${socket.remotePort ?? 0}`;

  return {
    id,
    remoto,
    send(linea) {
      if (!socket.destroyed && socket.writable) socket.write(linea);
    },
    close() {
      socket.end();
      socket.destroy();
    },
    onData(cb) {
      socket.on('data', (chunk) => cb(typeof chunk === 'string' ? chunk : chunk.toString('utf8')));
    },
    onClose(cb) {
      socket.on('close', cb);
    },
    onError(cb) {
      socket.on('error', cb);
    },
  };
}

class ServidorNode implements Servidor {
  private servidor = net.createServer();
  private handler: ((c: Conexion) => void) | null = null;

  constructor() {
    this.servidor.on('connection', (socket) => this.handler?.(envolver(socket)));
  }

  listen(puerto: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const alFallar = (err: Error) => reject(err);
      this.servidor.once('error', alFallar);
      this.servidor.listen(puerto, '0.0.0.0', () => {
        this.servidor.off('error', alFallar);
        resolve();
      });
    });
  }

  onConnection(cb: (c: Conexion) => void): void {
    this.handler = cb;
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.servidor.close(() => resolve()));
  }

  /** Puerto realmente asignado. Útil cuando se pide el 0 en pruebas. */
  get puerto(): number {
    const dir = this.servidor.address();
    return typeof dir === 'object' && dir !== null ? dir.port : 0;
  }
}

export const transporteNode: Transporte & { crearServidor(): ServidorNode } = {
  crearServidor() {
    return new ServidorNode();
  },

  conectar(host, puerto, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port: puerto });
      const alFallar = (err: Error) => {
        socket.destroy();
        reject(err);
      };
      socket.setTimeout(timeoutMs, () => alFallar(new Error(`timeout conectando a ${host}:${puerto}`)));
      socket.once('error', alFallar);
      socket.once('connect', () => {
        socket.setTimeout(0);
        socket.off('error', alFallar);
        resolve(envolver(socket));
      });
    });
  },
};
