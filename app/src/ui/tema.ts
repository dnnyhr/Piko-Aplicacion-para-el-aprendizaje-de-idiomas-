/**
 * El tema: lo que «Mi forma de aprender» le cambia a la forma de verse la app.
 *
 * Los estilos de RN se fijan al cargar el archivo, así que un cambio de tamaño
 * o de contraste no llegaría a ninguna pantalla. `crearEstilos` es el reemplazo
 * de `StyleSheet.create`: recibe la paleta y devuelve un gancho que entrega los
 * estilos ya escalados.
 *
 *   const useEstilos = crearEstilos((color) => ({
 *     titulo: { ...texto.titulo, color: color.verde },
 *   }));
 *   function Pantalla() { const styles = useEstilos(); … }
 *
 * Cada variante se arma una sola vez y queda guardada: en gama baja, un render
 * normal cuesta lo mismo que antes. Son como mucho 8 (4 tamaños × 2 paletas),
 * y con los valores iniciales los estilos son idénticos a los de siempre.
 */

import { StyleSheet } from 'react-native';
import { ESCALA_TEXTO } from '../core/preferencias/preferencias';
import { usePreferencias } from '../features/preferencias/store';
import { color as colorNormal, colorContraste, type Paleta } from './tokens';

type Estilos = StyleSheet.NamedStyles<any>;

export interface OpcionesEstilos {
  /**
   * Hasta dónde crece el texto. Para lo que vive en una caja de tamaño fijo,
   * como las casillas de un tablero, donde más grande ya no entraría.
   */
  escalaMaxima?: number;
}

/** Agranda `fontSize` y `lineHeight` de cada estilo; lo demás queda igual. */
export function escalarEstilos<T extends Estilos>(estilos: T, escala: number): T {
  if (escala === 1) return estilos;
  const salida: Record<string, unknown> = {};
  for (const [nombre, estilo] of Object.entries(estilos)) {
    const copia = { ...(estilo as Record<string, unknown>) };
    if (typeof copia.fontSize === 'number') copia.fontSize = Math.round(copia.fontSize * escala);
    if (typeof copia.lineHeight === 'number') copia.lineHeight = Math.round(copia.lineHeight * escala);
    salida[nombre] = copia;
  }
  return salida as T;
}

export function crearEstilos<T extends StyleSheet.NamedStyles<T> | Estilos>(
  fabrica: (color: Paleta) => T & Estilos,
  opciones: OpcionesEstilos = {},
): () => T {
  const hechos = new Map<string, T>();
  return function useEstilos() {
    const tamano = usePreferencias((s) => s.tamano);
    const contraste = usePreferencias((s) => s.contraste);
    const clave = `${tamano}|${contraste}`;
    let estilos = hechos.get(clave);
    if (!estilos) {
      const escala = Math.min(ESCALA_TEXTO[tamano], opciones.escalaMaxima ?? Infinity);
      estilos = StyleSheet.create(escalarEstilos(fabrica(contraste ? colorContraste : colorNormal), escala)) as T;
      hechos.set(clave, estilos);
    }
    return estilos;
  };
}

/** La paleta en uso, para los colores que van fuera de una hoja de estilos. */
export function useColor(): Paleta {
  return usePreferencias((s) => s.contraste) ? colorContraste : colorNormal;
}

/** Por cuánto se está multiplicando el texto. */
export function useEscalaTexto(): number {
  return ESCALA_TEXTO[usePreferencias((s) => s.tamano)];
}
