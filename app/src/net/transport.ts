/**
 * La frontera entre la lógica del aula y el socket de verdad.
 *
 * `host.ts` y `client.ts` sólo conocen estas interfaces, así que la misma
 * lógica que corre en el teléfono sobre `react-native-tcp-socket` corre en
 * Node sobre `node:net` — que es lo que permite probar la sala entera, con
 * ocho estudiantes, sin tener ocho teléfonos.
 *
 * Contrato: las conexiones entregan **texto ya decodificado en utf-8**. Quien
 * implemente el transporte se encarga de no cortar un carácter multibyte a la
 * mitad; el framer de `codec.ts` sólo parte por `\n`.
 */

export interface Conexion {
  readonly id: string;
  /** Dirección del otro extremo, para diagnóstico. */
  readonly remoto: string;
  send(linea: string): void;
  close(): void;
  onData(cb: (chunk: string) => void): void;
  onClose(cb: () => void): void;
  onError(cb: (err: Error) => void): void;
}

export interface Servidor {
  listen(puerto: number): Promise<void>;
  onConnection(cb: (c: Conexion) => void): void;
  close(): Promise<void>;
  /** Puerto realmente asignado. Difiere del pedido cuando se pide el 0. */
  readonly puerto: number;
}

export interface Transporte {
  crearServidor(): Servidor;
  conectar(host: string, puerto: number, timeoutMs?: number): Promise<Conexion>;
}

/** Se lanza cuando se pide el aula en una plataforma que no tiene sockets TCP. */
export class AulaNoDisponible extends Error {
  constructor() {
    super(
      'El aula en red necesita un teléfono: los navegadores no pueden abrir sockets TCP. ' +
        'Para probar la sala usá el development build, o corré `npm run sim` en la computadora.',
    );
    this.name = 'AulaNoDisponible';
  }
}
