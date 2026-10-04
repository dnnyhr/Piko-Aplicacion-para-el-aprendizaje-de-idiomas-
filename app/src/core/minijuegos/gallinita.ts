/**
 * Gallinita Ciega de Piko: escuchar y reconocer.
 *
 * Piko tiene los ojos vendados y sólo puede guiarse por el oído: suena una
 * palabra o una frase y hay que elegir, entre lo que hay en el patio, lo que
 * se escuchó. Piko camina hacia lo elegido. Es el juego de la comprensión
 * auditiva: casi todos los retos empiezan por escuchar.
 *
 * Puro y sin React, para poder probarlo en Node.
 */

import type { Rng } from '../ids';
import { normalizar } from '../content/verificar';
import type { StudentState } from '../progress/projection';
import { SACUANJOCHES_BASE } from '../progress/arbol';
import { distractores, elegirObjetivos, opcionesPara, palabrasDeNivel, type NivelMinijuego, type Palabra } from './vocabulario';

export const ID_GALLINITA = 'gallinita';

/** Rondas por partida. */
export const RONDAS = 8;

/** Opciones en el patio, por nivel. */
export const OPCIONES: Record<NivelMinijuego, number> = { inicial: 3, intermedio: 4, avanzado: 4 };

/** Cuántas veces se puede escuchar cada audio. Sin límite al empezar; en el avanzado, dos. */
export const ESCUCHAS: Record<NivelMinijuego, number> = { inicial: Infinity, intermedio: Infinity, avanzado: 2 };

export const RACHA = 3;
export const GRAN_RACHA = 5;

/** Puntos por acierto y los extras de las rachas. */
export const PUNTOS_ACIERTO = 10;
export const BONO_RACHA = 5;
export const BONO_GRAN_RACHA = 10;

/**
 * - `oye_dibujo`: suena en la lengua meta; se elige el dibujo.
 * - `oye_significado`: suena; se elige qué significa, en español.
 * - `oye_palabra`: suena; se elige la palabra escrita, entre otras parecidas.
 * - `dibujo_oye`: se ve un dibujo; cada opción se escucha, sin texto, y se
 *   elige la que lo nombra.
 * - `oye_frase`: suena una frase; se elige qué significa.
 */
export type TipoRonda = 'oye_dibujo' | 'oye_significado' | 'oye_palabra' | 'dibujo_oye' | 'oye_frase';

export interface Ronda {
  tipo: TipoRonda;
  palabra: Palabra;
  opciones: string[];
  correcta: number;
  /** Si las opciones están en la lengua meta (y se escuchan); si no, en español. */
  opcionesEnMeta: boolean;
}

const TIPOS: Record<NivelMinijuego, readonly TipoRonda[]> = {
  inicial: ['oye_dibujo', 'oye_dibujo', 'oye_significado'],
  intermedio: ['oye_palabra', 'dibujo_oye', 'oye_palabra', 'oye_significado'],
  avanzado: ['oye_frase', 'oye_palabra', 'oye_frase'],
};

/** Qué tan distintas se escriben dos palabras: distancia de edición sobre el largo. */
export function distancia(a: string, b: string): number {
  const x = normalizar(a);
  const y = normalizar(b);
  const fila = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let previo = fila[0] as number;
    fila[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const guardado = fila[j] as number;
      fila[j] = Math.min(
        (fila[j] as number) + 1,
        (fila[j - 1] as number) + 1,
        previo + (x[i - 1] === y[j - 1] ? 0 : 1),
      );
      previo = guardado;
    }
  }
  return (fila[y.length] as number) / Math.max(1, x.length, y.length);
}

/**
 * Las opciones escritas que más se parecen a la que suena: así hay que
 * escuchar de verdad, no adivinar por descarte.
 */
function parecidas(palabra: Palabra, pool: readonly Palabra[], n: number, rng: Rng): string[] | null {
  // Barajar primero desempata al azar entre las igual de parecidas.
  const ordenadas = distractores(palabra, pool, true, pool.length, rng).sort(
    (a, b) => distancia(a, palabra.meta) - distancia(b, palabra.meta),
  );
  if (ordenadas.length < n - 1) return null;
  return ordenadas.slice(0, n - 1);
}

/**
 * Las rondas de una partida. `conDibujo` dice qué palabras (en español)
 * tienen dibujo: las rondas de dibujos se arman sólo con ellas, y si no
 * alcanzan salen como de significado. Vacío si el nivel no tiene con qué
 * llenarse.
 */
export function armarRondas(
  vocab: readonly Palabra[],
  nivel: NivelMinijuego,
  state: StudentState,
  rng: Rng,
  conDibujo: (es: string) => boolean = () => false,
): Ronda[] {
  const pool = palabrasDeNivel(vocab, nivel);
  const conDibujos = pool.filter((p) => conDibujo(p.es));
  const n = OPCIONES[nivel];
  const hayDibujos = new Set(conDibujos.map((p) => normalizar(p.es))).size >= n;
  const tipos = TIPOS[nivel];
  const rondas: Ronda[] = [];

  elegirObjetivos(pool, RONDAS, state, rng).forEach((palabra, i) => {
    let tipo = tipos[i % tipos.length] as TipoRonda;
    const dibujo = tipo === 'oye_dibujo' || tipo === 'dibujo_oye';
    if (dibujo && (!hayDibujos || !conDibujo(palabra.es))) tipo = tipo === 'oye_dibujo' ? 'oye_significado' : 'oye_palabra';

    let opciones: string[] | null = null;
    let correcta = 0;
    const enMeta = tipo === 'oye_palabra' || tipo === 'dibujo_oye';
    if (tipo === 'oye_palabra') {
      const otras = parecidas(palabra, pool, n, rng);
      if (otras) {
        const todas = [palabra.meta, ...otras];
        const orden = todas.map((t) => ({ t, k: rng() })).sort((a, b) => a.k - b.k).map((x) => x.t);
        opciones = orden;
        correcta = orden.indexOf(palabra.meta);
      }
    } else {
      // Los dibujos, sólo entre palabras que tienen dibujo.
      const fuente = tipo === 'oye_dibujo' || tipo === 'dibujo_oye' ? conDibujos : pool;
      const armadas = opcionesPara(palabra, fuente, tipo === 'oye_dibujo' || tipo === 'dibujo_oye' ? conDibujos : vocab, enMeta, n, rng);
      if (armadas) {
        opciones = armadas.opciones;
        correcta = armadas.correcta;
      }
    }
    if (!opciones) return;
    rondas.push({ tipo, palabra, opciones, correcta, opcionesEnMeta: enMeta });
  });
  return rondas.length === RONDAS ? rondas : [];
}

// ------------------------------------------------------------------ partida

export interface EstadoGallinita {
  aciertos: number;
  respondidas: number;
  racha: number;
  mejorRacha: number;
  puntos: number;
}

export function partidaNueva(): EstadoGallinita {
  return { aciertos: 0, respondidas: 0, racha: 0, mejorRacha: 0, puntos: 0 };
}

/** Aplica la respuesta de una ronda. */
export function responder(e: EstadoGallinita, acerto: boolean): EstadoGallinita {
  const racha = acerto ? e.racha + 1 : 0;
  let puntos = e.puntos;
  if (acerto) {
    puntos += PUNTOS_ACIERTO;
    if (racha === RACHA) puntos += BONO_RACHA;
    if (racha === GRAN_RACHA) puntos += BONO_GRAN_RACHA;
  }
  return {
    aciertos: e.aciertos + (acerto ? 1 : 0),
    respondidas: e.respondidas + 1,
    racha,
    mejorRacha: Math.max(e.mejorRacha, racha),
    puntos,
  };
}

/** Si esta respuesta llegó a una racha que se festeja. */
export function rachaFestejada(racha: number): 'racha' | 'gran' | null {
  if (racha === GRAN_RACHA) return 'gran';
  if (racha === RACHA) return 'racha';
  return null;
}

/**
 * Sacuanjoches de una partida: hace falta acertar dos tercios. Desde ahí 3,
 * una más con una gran racha y otra si la partida fue perfecta. Entre 3 y 5,
 * como una lección.
 */
export function sacuanjochesPorGallinita(aciertos: number, total: number, mejorRacha: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const bien = Math.max(0, Math.min(aciertos, total));
  if (bien * 3 < total * 2) return 0;
  let n = SACUANJOCHES_BASE;
  if (mejorRacha >= GRAN_RACHA) n += 1;
  if (bien === total) n += 1;
  return n;
}
