/**
 * Transporte sobre `react-native-tcp-socket`. Es el que corre en el teléfono.
 *
 * Cumple el mismo contrato que `tcp.node.ts`, así que `host.ts` y `client.ts`
 * no cambian ni una línea entre el simulador y el aula de verdad.
 */

import TcpSocket from 'react-native-tcp-socket';
import type { Conexion, Servidor, Transporte } from './transport';

type SocketRN = {
  write(datos: string): void;
  destroy(): void;
  end?(): void;
  setEncoding?(encoding: string): void;
  setNoDelay?(activo: boolean): void;
  on(evento: string, cb: (arg?: unknown) => void): void;
  remoteAddress?: string;
  remotePort?: number;
};

let contador = 0;

function envolver(socket: SocketRN): Conexion {
  // Pedir utf-8 al socket: así la librería entrega texto ya decodificado y
  // nunca parte un carácter multibyte entre dos chunks, que es justo lo que
  // el framer de líneas no sabría reparar.
  socket.setEncoding?.('utf8');
  socket.setNoDelay?.(true);

  const id = `rn${++contador}`;
  const remoto = `${socket.remoteAddress ?? '?'}:${socket.remotePort ?? 0}`;
  let cerrado = false;

  return {
    id,
    remoto,
    send(linea) {
      if (!cerrado) socket.write(linea);
    },
    close() {
      if (cerrado) return;
      cerrado = true;
      try {
        socket.destroy();
      } catch {
        /* ya estaba muerto */
      }
    },
    onData(cb) {
      socket.on('data', (chunk) => {
        // Con `setEncoding` llega texto; sin él, algo tipo Buffer.
        cb(typeof chunk === 'string' ? chunk : String(chunk));
      });
    },
    onClose(cb) {
      socket.on('close', () => {
        cerrado = true;
        cb();
      });
    },
    onError(cb) {
      socket.on('error', (err) => cb(err instanceof Error ? err : new Error(String(err))));
    },
  };
}

class ServidorRN implements Servidor {
  private servidor: ReturnType<typeof TcpSocket.createServer> | null = null;
  private handler: ((c: Conexion) => void) | null = null;
  private enEscucha = 0;

  listen(puerto: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const servidor = TcpSocket.createServer((socket) => {
        this.handler?.(envolver(socket as unknown as SocketRN));
      });
      this.servidor = servidor;

      servidor.on('error', (err: unknown) => {
        reject(err instanceof Error ? err : new Error(String(err)));
      });
      servidor.on('listening', () => {
        this.enEscucha = puerto;
        resolve();
      });
      servidor.listen({ port: puerto, host: '0.0.0.0', reuseAddress: true });
    });
  }

  onConnection(cb: (c: Conexion) => void): void {
    this.handler = cb;
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.servidor) return resolve();
      try {
        this.servidor.close(() => resolve());
      } catch {
        resolve();
      }
      this.servidor = null;
      this.enEscucha = 0;
    });
  }

  get puerto(): number {
    return this.enEscucha;
  }
}

export const transporteNativo: Transporte = {
  crearServidor() {
    return new ServidorRN();
  },

  conectar(host, puerto, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      let resuelto = false;

      const socket = TcpSocket.createConnection({ host, port: puerto }, () => {
        if (resuelto) return;
        resuelto = true;
        clearTimeout(reloj);
        resolve(envolver(socket as unknown as SocketRN));
      });

      const reloj = setTimeout(() => {
        if (resuelto) return;
        resuelto = true;
        try {
          socket.destroy();
        } catch {
          /* nada */
        }
        reject(new Error(`No se pudo conectar a ${host}:${puerto}`));
      }, timeoutMs);

      socket.on('error', (err: unknown) => {
        if (resuelto) return;
        resuelto = true;
        clearTimeout(reloj);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  },
};
