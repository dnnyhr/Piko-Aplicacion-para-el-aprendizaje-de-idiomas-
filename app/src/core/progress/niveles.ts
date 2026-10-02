/**
 * El camino de niveles: las paradas por donde Piko sube el madroño.
 *
 * Cada nivel es un paquete de contenido, en orden de dificultad. Se supera
 * terminando una lección de ese paquete, y eso desbloquea el siguiente. Las
 * estrellas (1 a 3) dicen qué tan bien salió la mejor vez, y siempre se puede
 * volver a un nivel superado para mejorarlas.
 *
 * Igual que el árbol, todo sale del log de eventos: un `lessonDone` cuyo
 * `packId` es el del nivel. Las rondas mezcladas se anotan como `mezcla` y no
 * cuentan para ningún nivel (sí dan sacuanjoches).
 */

import type { LangCode, Pack } from '../content/schema';
import { UMBRAL_BUENA } from './arbol';

/** `packId` de una lección que mezcló ítems de varios paquetes. */
export const PACK_MEZCLA = 'mezcla';

export type Estrellas = 0 | 1 | 2 | 3;

/** 1 por terminar, 2 si acertó el 70 % o más, 3 si fue perfecta. */
export function estrellasDe(correctas: number, total: number): Estrellas {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const bien = Math.max(0, Math.min(correctas, total));
  if (bien === total) return 3;
  if (bien / total >= UMBRAL_BUENA) return 2;
  return 1;
}

export interface Nivel {
  /** 1, 2, 3… de abajo hacia arriba. */
  numero: number;
  packId: string;
  titulo: string;
  theme: string;
}

/**
 * Los niveles de una lengua: sus paquetes por dificultad y, dentro de la
 * misma dificultad, en el orden en que están registrados.
 */
export function caminoDe(packs: readonly Pack[], lang: LangCode): Nivel[] {
  return packs
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.lang === lang)
    .sort((a, b) => a.p.difficulty - b.p.difficulty || a.i - b.i)
    .map(({ p }, k) => ({ numero: k + 1, packId: p.id, titulo: p.title, theme: p.theme }));
}

export type EstadoNivel = 'superado' | 'actual' | 'bloqueado';

export interface NivelConEstado extends Nivel {
  estado: EstadoNivel;
  estrellas: Estrellas;
}

/**
 * Qué está superado, cuál toca y qué sigue con candado. Un nivel cuenta como
 * superado sólo si el anterior también lo está: si alguien practicó un tema
 * más adelante por su cuenta, sus estrellas quedan guardadas y el nivel se
 * abre solo apenas llegue hasta ahí.
 */
export function estadoDelCamino(
  camino: readonly Nivel[],
  estrellas: Readonly<Record<string, number>>,
): NivelConEstado[] {
  let abierto = true;
  let actualPuesto = false;
  return camino.map((n) => {
    const e = Math.max(0, Math.min(3, estrellas[n.packId] ?? 0)) as Estrellas;
    let estado: EstadoNivel;
    if (abierto && e > 0) {
      estado = 'superado';
    } else if (!actualPuesto) {
      estado = 'actual';
      actualPuesto = true;
      abierto = false;
    } else {
      estado = 'bloqueado';
    }
    return { ...n, estado, estrellas: estado === 'bloqueado' ? 0 : e };
  });
}

/** Dónde está Piko: el nivel que toca, o el último si ya superó todos. */
export function nivelActual(niveles: readonly NivelConEstado[]): NivelConEstado | null {
  return niveles.find((n) => n.estado === 'actual') ?? niveles[niveles.length - 1] ?? null;
}

export interface ResumenCamino {
  superados: number;
  total: number;
  estrellas: number;
  estrellasPosibles: number;
  /** Número del nivel donde está Piko. */
  nivel: number;
  completo: boolean;
}

export function resumenCamino(niveles: readonly NivelConEstado[]): ResumenCamino {
  const superados = niveles.filter((n) => n.estado === 'superado').length;
  return {
    superados,
    total: niveles.length,
    estrellas: niveles.reduce((s, n) => s + n.estrellas, 0),
    estrellasPosibles: niveles.length * 3,
    nivel: nivelActual(niveles)?.numero ?? 1,
    completo: niveles.length > 0 && superados === niveles.length,
  };
}
