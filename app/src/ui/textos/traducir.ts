/**
 * La lengua de la interfaz.
 *
 * Funciones puras, sin React ni base de datos, para poder probarlas en Node.
 * El gancho para las pantallas está en `useTextos.ts`.
 */

import type { LangCode } from '../../core/content/schema';
import { ES } from './es';
import { MIQ } from './miq';

/** Las lenguas en que puede estar la app. */
export const IDIOMAS_APP = ['spa', 'miq'] as const;
export type IdiomaApp = (typeof IDIOMAS_APP)[number];

/** Cómo se llama cada una en su propia lengua: así la encuentra quien la habla. */
export const AUTONIMO: Record<IdiomaApp, string> = { spa: 'Español', miq: 'Miskitu' };

type Catalogo = typeof ES;
export type Clave = { [K in keyof Catalogo]: Catalogo[K] extends string ? K : never }[keyof Catalogo];
export type ClaveFrases = { [K in keyof Catalogo]: Catalogo[K] extends readonly string[] ? K : never }[keyof Catalogo];
/** Una traducción: puede faltar cualquier clave, y entonces se usa el español. */
export type CatalogoParcial = { [K in Clave]?: string } & { [K in ClaveFrases]?: readonly string[] };

const CATALOGOS: Record<IdiomaApp, CatalogoParcial> = { spa: ES, miq: MIQ };

const rellenar = (texto: string, valores?: Record<string, string | number>) =>
  valores ? texto.replace(/\{(\w+)\}/g, (todo, k: string) => (k in valores ? String(valores[k]) : todo)) : texto;

/** El texto de `clave` en `idioma`, o en español si todavía no está traducido. */
export function traducir(idioma: IdiomaApp, clave: Clave, valores?: Record<string, string | number>): string {
  const propio = CATALOGOS[idioma][clave];
  return rellenar(propio && propio.trim() ? propio : ES[clave], valores);
}

/** Las frases de Piko para `clave`, o las del español si todavía no hay. */
export function frasesDe(idioma: IdiomaApp, clave: ClaveFrases): readonly string[] {
  const propias = CATALOGOS[idioma][clave];
  return propias && propias.length > 0 ? propias : ES[clave];
}

/** Desde qué lengua se aprende cuando la app está en `idioma`. */
export const desdeIdioma = (idioma: IdiomaApp): LangCode => idioma;

/** Si una clave de tema o lengua existe en el catálogo. */
export const esClave = (k: string): k is Clave => k in ES && typeof ES[k as keyof Catalogo] === 'string';

/** Cuántos textos tiene traducidos un idioma, para mostrar el avance. */
export function avance(idioma: IdiomaApp): { traducidos: number; total: number } {
  const claves = Object.keys(ES) as (keyof Catalogo)[];
  const cat = CATALOGOS[idioma] as Record<string, unknown>;
  return { traducidos: claves.filter((k) => cat[k] !== undefined).length, total: claves.length };
}
