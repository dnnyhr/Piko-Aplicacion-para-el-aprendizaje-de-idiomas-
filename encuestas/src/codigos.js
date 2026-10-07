/**
 * El formato de los códigos de logros especiales.
 *
 *   PIKO-HK26-7KQ2-M9XA
 *   │    │    └───────┴── 8 caracteres al azar (40 bits): no se adivinan probando
 *   │    └── el evento, 4 caracteres
 *   └── siempre PIKO
 *
 * La parte al azar usa el alfabeto de Crockford (sin I, L, O ni U), así un
 * niño que copia la tarjeta no se equivoca entre 0 y O o entre 1 e I: al
 * normalizar, O se lee como 0 e I o L como 1. Mayúsculas, minúsculas,
 * espacios y guiones dan igual.
 *
 * La app tiene la misma regla en `app/src/core/logros/codigo.ts`.
 */

export const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** El código escrito como venga → `PIKO-EEEE-XXXX-XXXX`, o null si no tiene la forma. */
export function normalizarCodigo(texto) {
  if (typeof texto !== 'string') return null;
  const s = texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 16 || !s.startsWith('PIKO')) return null;
  const evento = s.slice(4, 8);
  const azar = s
    .slice(8)
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (!/^[A-Z0-9]{4}$/.test(evento)) return null;
  for (const c of azar) if (!ALFABETO.includes(c)) return null;
  return `PIKO-${evento}-${azar.slice(0, 4)}-${azar.slice(4)}`;
}

/** Un código nuevo para el evento, con azar criptográfico. */
export function codigoNuevo(evento) {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const azar = [...bytes].map((b) => ALFABETO[b % 32]).join('');
  return `PIKO-${evento}-${azar.slice(0, 4)}-${azar.slice(4)}`;
}
