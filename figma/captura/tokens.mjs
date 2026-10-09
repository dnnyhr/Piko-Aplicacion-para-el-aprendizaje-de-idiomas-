/**
 * Lee los tokens de diseño directamente de `app/src/ui/tokens.ts`, para que
 * las variables y estilos de Figma salgan de la misma fuente que la app.
 */
import { readFileSync } from 'node:fs';

export function leerTokens(ruta) {
  const src = readFileSync(ruta, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/\bas const\b/g, '')
    .replace(/export const (\w+)\s*=/g, 'out.$1 = $1 =')
    .replace(/^(?!out\.)/gm, '');
  const out = {};
  // eslint-disable-next-line no-new-func
  new Function('out', `let color, espacio, radio, fuente, texto, labio, tiempo; ${src}`)(out);
  return out;
}
