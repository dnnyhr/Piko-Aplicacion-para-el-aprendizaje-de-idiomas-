/**
 * Primitivas deterministas. Sin dependencias, sin React Native.
 *
 * Todo lo aleatorio del núcleo entra por un `Rng` inyectable para que las
 * pruebas y — más importante — el host y los estudiantes puedan generar
 * exactamente la misma ronda a partir de la misma semilla.
 */

export type Rng = () => number;

/** PRNG de 32 bits, rápido y reproducible. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a: convierte un id de sesión en una semilla numérica estable. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const HEX: string[] = [];
for (let i = 0; i < 256; i++) HEX.push((i + 0x100).toString(16).slice(1));

/** UUID v4 en texto. Con un `rng` sembrado es reproducible. */
export function uuidv4(rng: Rng = Math.random): string {
  const b = new Uint8Array(16);
  for (let i = 0; i < 16; i++) b[i] = Math.floor(rng() * 256) & 0xff;
  b[6] = ((b[6] as number) & 0x0f) | 0x40;
  b[8] = ((b[8] as number) & 0x3f) | 0x80;
  const h = (i: number) => HEX[b[i] as number] as string;
  return (
    h(0) + h(1) + h(2) + h(3) + '-' +
    h(4) + h(5) + '-' +
    h(6) + h(7) + '-' +
    h(8) + h(9) + '-' +
    h(10) + h(11) + h(12) + h(13) + h(14) + h(15)
  );
}

/** Mezcla de Fisher-Yates sobre una copia. Determinista para un `rng` dado. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * Código de sala de 4 dígitos. Evita el 0 inicial para que se lea igual
 * escrito en el pizarrón que en la pantalla.
 */
export function roomCode(rng: Rng = Math.random): string {
  return String(1000 + Math.floor(rng() * 9000));
}
