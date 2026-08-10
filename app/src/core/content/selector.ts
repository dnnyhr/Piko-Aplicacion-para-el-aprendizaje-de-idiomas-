/**
 * Elección de ítems.
 *
 * Dos modos, porque el aula y la práctica solitaria piden cosas distintas:
 *
 * - `pickRound` es determinista a partir de una semilla. Todos los teléfonos
 *   de una ronda reciben exactamente los mismos ejercicios en el mismo orden,
 *   sin que el host tenga que mandarlos uno por uno ni negociar nada.
 * - `pickAdaptive` mira el dominio del estudiante y le insiste con lo que peor
 *   le sale. Es para cuando juega solo, sin sala.
 */

import { mulberry32, shuffle, type Rng } from '../ids';
import type { StudentState } from '../progress/projection';
import type { Difficulty, Item, ItemType, LangCode, Pack } from './schema';

export interface FiltroContenido {
  lang: LangCode;
  /** Vacío o ausente = todos los temas del idioma. */
  themes?: readonly string[];
  /** Vacío o ausente = todas las dificultades. */
  difficulty?: Difficulty;
  /** Vacío o ausente = los tres tipos de ejercicio. */
  types?: readonly ItemType[];
}

export interface ItemConOrigen {
  item: Item;
  packId: string;
}

/** Aplana los paquetes que pasan el filtro, conservando de dónde vino cada ítem. */
export function poolDe(packs: readonly Pack[], filtro: FiltroContenido): ItemConOrigen[] {
  const temas = filtro.themes && filtro.themes.length > 0 ? new Set(filtro.themes) : null;
  const tipos = filtro.types && filtro.types.length > 0 ? new Set<string>(filtro.types) : null;

  const out: ItemConOrigen[] = [];
  for (const pack of packs) {
    if (pack.lang !== filtro.lang) continue;
    if (temas && !temas.has(pack.theme)) continue;
    if (filtro.difficulty !== undefined && pack.difficulty !== filtro.difficulty) continue;
    for (const item of pack.items) {
      if (tipos && !tipos.has(item.type)) continue;
      out.push({ item, packId: pack.id });
    }
  }
  // Orden estable por id: el pool no debe depender de en qué orden se leyeron
  // los archivos del disco, o dos dispositivos generarían rondas distintas.
  out.sort((a, b) => (a.item.id < b.item.id ? -1 : a.item.id > b.item.id ? 1 : 0));
  return out;
}

/**
 * Ronda del aula: misma semilla ⇒ misma lista, en todos los dispositivos.
 * La semilla natural es `hashSeed(sessionId)`.
 */
export function pickRound(
  packs: readonly Pack[],
  opts: FiltroContenido & { count: number; seed: number },
): ItemConOrigen[] {
  const pool = poolDe(packs, opts);
  if (pool.length === 0) return [];
  const rng = mulberry32(opts.seed);
  return shuffle(pool, rng).slice(0, Math.min(opts.count, pool.length));
}

/**
 * Peso de un ítem para la práctica adaptativa. Lo nunca visto pesa más que lo
 * dominado, pero nada llega a peso cero: se sigue repasando lo que ya sabe.
 */
function peso(item: Item, state: StudentState | undefined): number {
  if (!state) return 1;
  const skill = state.skills[item.skill];
  if (!skill || skill.seen === 0) return 3;
  return 1 + 2 * (1 - skill.mastery);
}

/** Muestreo sin reemplazo, proporcional al peso. */
export function pickAdaptive(
  packs: readonly Pack[],
  opts: FiltroContenido & { count: number; state?: StudentState; rng?: Rng },
): ItemConOrigen[] {
  const rng = opts.rng ?? Math.random;
  const restantes = poolDe(packs, opts);
  const pesos = restantes.map((x) => peso(x.item, opts.state));
  const out: ItemConOrigen[] = [];
  const n = Math.min(opts.count, restantes.length);

  for (let k = 0; k < n; k++) {
    let total = 0;
    for (const p of pesos) total += p;

    let objetivo = rng() * total;
    let elegido = restantes.length - 1;
    for (let i = 0; i < restantes.length; i++) {
      objetivo -= pesos[i] as number;
      if (objetivo <= 0) {
        elegido = i;
        break;
      }
    }

    out.push(restantes[elegido] as ItemConOrigen);
    restantes.splice(elegido, 1);
    pesos.splice(elegido, 1);
  }
  return out;
}

/**
 * Baraja las opciones de un ítem de selección múltiple.
 * Se hace al presentar, no al guardar, para que la respuesta correcta no
 * quede siempre en la misma posición.
 */
export function opcionesBarajadas(item: Item, rng: Rng): string[] {
  if (item.type === 'choice' || item.type === 'listen') return shuffle(item.options, rng);
  return [];
}

export function bloquesBarajados(item: Item, rng: Rng): string[] {
  return item.type === 'build' ? shuffle(item.blocks, rng) : [];
}

/** Temas disponibles para un idioma, ordenados. Alimenta la pantalla de presets. */
export function temasDe(packs: readonly Pack[], lang: LangCode): string[] {
  const set = new Set<string>();
  for (const p of packs) if (p.lang === lang) set.add(p.theme);
  return [...set].sort();
}
