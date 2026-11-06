/**
 * La forma de los códigos de las tarjetas de logros especiales:
 * `PIKO-HK26-7KQ2-M9XA` (PIKO, el evento, y 8 caracteres al azar).
 *
 * Es la misma regla que usa el servidor (`encuestas/src/codigos.js`): la app
 * sólo la usa para ordenar lo que escribe el niño y avisar al toque si le
 * faltan letras, sin gastar internet. Si el código existe y está libre lo
 * decide el servidor.
 */

const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** El código escrito como venga → `PIKO-EEEE-XXXX-XXXX`, o null si no tiene la forma. */
export function normalizarCodigo(texto: string): string | null {
  const s = texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 16 || !s.startsWith('PIKO')) return null;
  const evento = s.slice(4, 8);
  const azar = s.slice(8).replace(/O/g, '0').replace(/[IL]/g, '1');
  for (const c of azar) if (!ALFABETO.includes(c)) return null;
  return `PIKO-${evento}-${azar.slice(0, 4)}-${azar.slice(4)}`;
}

/**
 * Mientras se escribe: mayúsculas y los guiones en su lugar, para que se vea
 * igual que en la tarjeta. No valida.
 */
export function formatearMientrasEscribe(texto: string): string {
  const s = texto.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  return [s.slice(0, 4), s.slice(4, 8), s.slice(8, 12), s.slice(12, 16)].filter(Boolean).join('-');
}
