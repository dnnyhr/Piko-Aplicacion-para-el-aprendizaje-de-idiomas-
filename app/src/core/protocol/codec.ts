/**
 * NDJSON sobre un flujo TCP.
 *
 * TCP entrega bytes, no mensajes: un `write` del emisor puede llegar partido
 * en tres pedazos o pegado al siguiente. El framer acumula texto hasta ver un
 * `\n` y recién ahí entrega una línea completa.
 *
 * Trabaja sobre *strings*, no bytes: la capa de transporte pone el socket en
 * modo utf-8 y se encarga de no cortar un carácter multibyte a la mitad
 * (`setEncoding('utf8')` en Node y en react-native-tcp-socket).
 */

import { parseMessage, type Message } from './messages';

/** Un mensaje más largo que esto es un error o un ataque, no un mensaje. */
export const MAX_LINEA = 1 << 20; // 1 MiB

export class LineaDemasiadoLarga extends Error {
  constructor(readonly bytes: number) {
    super(`línea de ${bytes} bytes; el máximo es ${MAX_LINEA}`);
    this.name = 'LineaDemasiadoLarga';
  }
}

/** Acumula pedazos de flujo y entrega líneas completas. */
export class LineFramer {
  private buf = '';

  /**
   * @throws {LineaDemasiadoLarga} si el buffer crece sin encontrar un `\n`.
   * El llamador debe cerrar la conexión: el flujo ya no es confiable.
   */
  push(chunk: string): string[] {
    if (chunk.length === 0) return [];
    this.buf += chunk;

    if (this.buf.indexOf('\n') === -1) {
      if (this.buf.length > MAX_LINEA) {
        const n = this.buf.length;
        this.buf = '';
        throw new LineaDemasiadoLarga(n);
      }
      return [];
    }

    const partes = this.buf.split('\n');
    // El último pedazo es el resto incompleto (cadena vacía si el chunk
    // terminaba justo en `\n`).
    this.buf = partes.pop() ?? '';
    if (this.buf.length > MAX_LINEA) {
      const n = this.buf.length;
      this.buf = '';
      throw new LineaDemasiadoLarga(n);
    }

    const out: string[] = [];
    for (const p of partes) {
      // Tolerar CRLF y líneas en blanco de keep-alive.
      const linea = p.endsWith('\r') ? p.slice(0, -1) : p;
      if (linea.length > 0) out.push(linea);
    }
    return out;
  }

  /** Texto pendiente sin terminar. Útil para diagnóstico. */
  get pendiente(): number {
    return this.buf.length;
  }

  reset(): void {
    this.buf = '';
  }
}

export function encode(msg: Message): string {
  return JSON.stringify(msg) + '\n';
}

/** Decodifica y valida una línea. Devuelve `null` si no es un mensaje usable. */
export function decode(linea: string): Message | null {
  let raw: unknown;
  try {
    raw = JSON.parse(linea);
  } catch {
    return null;
  }
  return parseMessage(raw);
}

/**
 * Decodifica un pedazo de flujo completo. Descarta silenciosamente las líneas
 * inválidas: una versión más nueva de Piko puede mandar mensajes que esta no
 * conoce, y eso no debería tumbar la sala.
 */
export function decodeChunk(framer: LineFramer, chunk: string): Message[] {
  const out: Message[] = [];
  for (const linea of framer.push(chunk)) {
    const msg = decode(linea);
    if (msg) out.push(msg);
  }
  return out;
}
