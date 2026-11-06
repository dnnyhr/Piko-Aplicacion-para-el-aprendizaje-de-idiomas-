/**
 * La frontera entre la lógica del aula y el socket de verdad.
 *
 * `host.ts` y `client.ts` sólo conocen estas interfaces, así que la misma
 * lógica que corre en el teléfono sobre el módulo nativo `PikoRed` corre en
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

/** Lo que el aparato sabe de su propia red. Lo da el módulo nativo `PikoRed`. */
export interface InfoRedLocal {
  /** La red wifi a la que está unido, si hay una (el estudiante en el hotspot). */
  wifi: {
    ip: string | null;
    prefijo: number | null;
    /** En un hotspot, la puerta de enlace es el teléfono del maestro. */
    puertaEnlace: string | null;
  } | null;
  /** Todas las direcciones IPv4 del aparato (el maestro ve acá la del hotspot). */
  interfaces: Array<{ nombre: string; ip: string; prefijo: number }>;
}

/** Descubrimiento de la sala: lo que no es TCP. */
export interface RedLocal {
  info(): InfoRedLocal;
  /** El maestro anuncia la sala por UDP hasta que se llame `detenerFaro`. */
  iniciarFaro(puerto: number, mensaje: string): void;
  detenerFaro(): void;
  /** El estudiante pregunta por difusión y espera un faro. */
  buscarFaro(puerto: number, esperaMs: number): Promise<{ ip: string; mensaje: string } | null>;
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
