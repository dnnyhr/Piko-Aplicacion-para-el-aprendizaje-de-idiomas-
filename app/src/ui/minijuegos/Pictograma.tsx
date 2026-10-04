/**
 * Dibujos de apoyo para el nivel inicial de los minijuegos.
 *
 * Trazos simples y colores de la paleta: se dibujan muchas veces por pantalla
 * en teléfonos de gama baja. Van por palabra en español, la lengua de apoyo;
 * una palabra sin dibujo simplemente se muestra sin él.
 */

import { SvgXml } from 'react-native-svg';

const DIBUJOS: Record<string, string> = {
  'árbol': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M29 58 L30 40 L34 40 L35 58 Z" fill="#8A5A2B"/><circle cx="32" cy="24" r="16" fill="#61A66B"/><circle cx="20" cy="30" r="9" fill="#61A66B"/><circle cx="44" cy="30" r="9" fill="#61A66B"/><path d="M14 58 H50"/></svg>',
  'perro': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 46 C14 36 20 32 30 32 H44 C48 32 50 36 50 40 V54 M18 54 V44 M26 54 V44 M42 54 V46" fill="#E8C49A"/><path d="M14 46 C14 36 20 32 30 32 H44 C48 32 50 36 50 40 V48 H14 Z" fill="#E8C49A" stroke="none"/><path d="M42 32 L44 16 C46 12 52 12 54 16 L58 22 C59 25 57 27 54 27 L50 27 L48 32 Z" fill="#E8C49A"/><path d="M45 14 L40 22" /><circle cx="51" cy="19" r="1.4" fill="#33453B"/><path d="M14 42 L7 34"/></svg>',
  'pez': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 32 C18 18 38 16 48 32 C38 48 18 46 10 32 Z" fill="#60C5FA"/><path d="M48 32 L58 22 V42 Z" fill="#60C5FA"/><circle cx="20" cy="29" r="2" fill="#33453B"/><path d="M30 24 C33 28 33 36 30 40"/></svg>',
  'gato': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 56 C14 44 18 34 32 34 C46 34 50 44 46 56 Z" fill="#E97927"/><path d="M20 30 L18 12 L28 20 H36 L46 12 L44 30 C44 38 38 42 32 42 C26 42 20 38 20 30 Z" fill="#E97927"/><circle cx="27" cy="29" r="1.6" fill="#33453B"/><circle cx="37" cy="29" r="1.6" fill="#33453B"/><path d="M30 34 H34 M14 32 L24 33 M14 37 L24 35 M50 32 L40 33 M50 37 L40 35"/><path d="M46 52 C54 52 58 46 56 40"/></svg>',
  'vaca': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="28" width="38" height="20" rx="8" fill="#FFFFFF"/><path d="M22 30 C26 34 22 40 18 38" fill="#33453B" stroke="none"/><path d="M36 38 C40 36 44 40 40 44 C36 46 34 42 36 38 Z" fill="#33453B" stroke="none"/><path d="M18 48 V56 M26 48 V56 M38 48 V56 M46 48 V56"/><path d="M44 30 L48 18 H58 L60 30 C60 36 56 38 52 38 C48 38 46 36 46 32" fill="#FFFFFF"/><path d="M48 18 L44 13 M58 18 L62 13"/><ellipse cx="54" cy="34" rx="5" ry="3.4" fill="#F2B8B0"/></svg>',
  'pájaro': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 40 C14 26 26 18 38 20 C46 21 50 28 50 34 C50 46 38 52 26 50 Z" fill="#97C137"/><path d="M48 26 L58 28 L49 32" fill="#E8A429"/><circle cx="42" cy="27" r="1.8" fill="#33453B"/><path d="M22 36 C28 30 36 32 38 40 C32 44 26 42 22 36 Z" fill="#61A66B"/><path d="M14 40 L6 46 L16 46"/><path d="M28 50 L26 58 M34 50 L34 58"/></svg>',
  'caballo': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 30 H40 C44 30 46 34 46 38 V44 H14 C11 44 10 40 10 37 C10 33 11 30 14 30 Z" fill="#B97A45"/><path d="M16 44 V56 M24 44 V56 M38 44 V56 M44 44 V56"/><path d="M38 31 L44 12 C46 9 50 10 52 12 L58 22 C59 25 57 27 54 26 L48 24 L46 34" fill="#B97A45"/><path d="M44 12 C40 16 38 22 37 30" stroke="#5B3B1F" stroke-width="4"/><circle cx="50" cy="16" r="1.4" fill="#33453B"/><path d="M10 34 C6 36 5 42 6 46" stroke="#5B3B1F" stroke-width="3.5"/></svg>',
  'cerdo': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="30" cy="36" rx="20" ry="14" fill="#F2B8B0"/><circle cx="48" cy="32" r="10" fill="#F2B8B0"/><ellipse cx="55" cy="34" rx="4" ry="3.4" fill="#E79B90"/><path d="M42 23 L44 17 L48 22"/><circle cx="47" cy="29" r="1.4" fill="#33453B"/><path d="M18 48 V56 M26 49 V56 M36 49 V56 M42 47 V56"/><path d="M10 34 C6 32 8 28 10 30"/></svg>',
  'libro': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M32 18 C26 14 16 13 8 15 V50 C16 48 26 49 32 53 Z" fill="#60C5FA"/><path d="M32 18 C38 14 48 13 56 15 V50 C48 48 38 49 32 53 Z" fill="#DDF1FC"/><path d="M14 23 C19 22 24 23 27 25 M14 30 C19 29 24 30 27 32 M37 25 C40 23 45 22 50 23 M37 32 C40 30 45 29 50 30"/></svg>',
  'lápiz': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 50 L42 14 L50 20 L22 56 L12 58 Z" fill="#E8A429"/><path d="M42 14 L46 9 L54 15 L50 20" fill="#F2B8B0"/><path d="M14 50 L22 56 M12 58 L16 53"/></svg>',
  'casa': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 30 L32 12 L54 30" fill="#E97927"/><path d="M15 28 V54 H49 V28" fill="#F7F0E4"/><path d="M10 30 L32 12 L54 30 Z" fill="#E97927"/><rect x="27" y="38" width="10" height="16" fill="#8A5A2B"/><rect x="18" y="34" width="7" height="7" fill="#60C5FA"/><rect x="39" y="34" width="7" height="7" fill="#60C5FA"/><path d="M8 54 H56"/></svg>',
  'agua': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#33453B" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M32 8 C40 20 48 30 48 40 C48 50 40 56 32 56 C24 56 16 50 16 40 C16 30 24 20 32 8 Z" fill="#60C5FA"/><path d="M24 40 C24 46 28 49 32 49"/></svg>',
};

/** Otras formas de decir lo mismo que aparecen en los paquetes. */
const SINONIMOS: Record<string, string> = { pescado: 'pez', 'pescado, pez': 'pez', 'agua; lluvia': 'agua', 'pájaro pequeño': 'pájaro' };

function clave(es: string): string | null {
  const k = es.trim().toLocaleLowerCase('es');
  if (DIBUJOS[k]) return k;
  const sin = SINONIMOS[k];
  if (sin) return sin;
  const primera = k.split(/[,;(]/)[0]?.trim() ?? '';
  return DIBUJOS[primera] ? primera : null;
}

export function tienePictograma(es: string): boolean {
  return clave(es) !== null;
}

export function Pictograma({ es, tam = 40 }: { es: string; tam?: number }) {
  const k = clave(es);
  if (!k) return null;
  return <SvgXml xml={DIBUJOS[k] as string} width={tam} height={tam} />;
}
