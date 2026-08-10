import { describe, expect, it } from 'vitest';
import {
  LineFramer,
  LineaDemasiadoLarga,
  MAX_LINEA,
  decode,
  decodeChunk,
  encode,
} from '@core/protocol/codec';
import { PROTOCOL_VERSION, parseMessage, type Message } from '@core/protocol/messages';

const hello: Message = { t: 'hello', v: PROTOCOL_VERSION, deviceId: 'dev-1', appVersion: '0.1.0' };

describe('LineFramer', () => {
  it('entrega una línea completa', () => {
    const f = new LineFramer();
    expect(f.push('{"a":1}\n')).toEqual(['{"a":1}']);
  });

  it('no entrega nada hasta ver el salto de línea', () => {
    const f = new LineFramer();
    expect(f.push('{"a":')).toEqual([]);
    expect(f.push('1}')).toEqual([]);
    expect(f.push('\n')).toEqual(['{"a":1}']);
  });

  it('parte un mensaje en pedazos de un carácter y lo reconstruye', () => {
    const f = new LineFramer();
    const linea = encode(hello);
    const salida: string[] = [];
    for (const ch of linea) salida.push(...f.push(ch));
    expect(salida).toHaveLength(1);
    expect(decode(salida[0] as string)).toEqual(hello);
    expect(f.pendiente).toBe(0);
  });

  it('entrega varios mensajes pegados en un solo chunk', () => {
    const f = new LineFramer();
    const chunk = encode(hello) + encode({ t: 'ping', ts: 7 }) + encode({ t: 'pong', ts: 8 });
    expect(f.push(chunk)).toHaveLength(3);
  });

  it('deja pendiente el resto cuando el chunk corta a mitad del último', () => {
    const f = new LineFramer();
    const chunk = encode(hello) + '{"t":"ping","ts":';
    expect(f.push(chunk)).toHaveLength(1);
    expect(f.pendiente).toBeGreaterThan(0);
    expect(f.push('9}\n')).toEqual(['{"t":"ping","ts":9}']);
  });

  it('tolera CRLF y descarta líneas en blanco', () => {
    const f = new LineFramer();
    expect(f.push('{"a":1}\r\n\n{"b":2}\n')).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('aborta si la línea supera el máximo', () => {
    const f = new LineFramer();
    expect(() => f.push('x'.repeat(MAX_LINEA + 1))).toThrow(LineaDemasiadoLarga);
    // Tras el corte el buffer queda limpio: el llamador cierra la conexión.
    expect(f.pendiente).toBe(0);
  });
});

describe('decode', () => {
  it('ida y vuelta', () => {
    expect(decode(encode(hello).trimEnd())).toEqual(hello);
  });

  it('devuelve null con JSON roto', () => {
    expect(decode('{no soy json')).toBeNull();
  });

  it('devuelve null con un tipo desconocido', () => {
    expect(decode('{"t":"algoQueNoExiste"}')).toBeNull();
  });

  it('devuelve null si faltan campos obligatorios', () => {
    expect(decode('{"t":"pull","studentId":"a"}')).toBeNull();
    expect(decode('{"t":"pull","studentId":"a","sinceSeq":-1}')).toBeNull();
  });

  it('descarta líneas inválidas sin tumbar el resto del chunk', () => {
    const f = new LineFramer();
    const chunk = encode(hello) + 'basura\n' + encode({ t: 'ping', ts: 1 });
    const msgs = decodeChunk(f, chunk);
    expect(msgs.map((m) => m.t)).toEqual(['hello', 'ping']);
  });
});

describe('parseMessage', () => {
  it('rechaza un ack con seq inválido', () => {
    expect(
      parseMessage({ t: 'ack', studentId: 'a', headSeq: 3, assigned: [{ id: 'x', seq: 0 }] }),
    ).toBeNull();
  });

  it('acepta un ack bien formado', () => {
    const m = parseMessage({
      t: 'ack',
      studentId: 'a',
      headSeq: 3,
      assigned: [{ id: 'x', seq: 3 }],
    });
    expect(m).toEqual({ t: 'ack', studentId: 'a', headSeq: 3, assigned: [{ id: 'x', seq: 3 }] });
  });

  it('rechaza un push con un evento malformado', () => {
    expect(parseMessage({ t: 'push', studentId: 'a', events: [{ id: 'x' }] })).toBeNull();
  });
});
