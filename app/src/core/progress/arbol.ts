/**
 * El árbol de madroño: las sacuanjoches y las etapas en que crece.
 *
 * Es una de las dos caras del progreso. La otra es el camino de niveles
 * (`niveles.ts`), por donde sube Piko. El ciclo que ve el niño:
 * supera un nivel → gana sacuanjoches → su madroño crece → sigue subiendo.
 *
 * Reglas de diseño:
 *
 * - **Las sacuanjoches no se gastan.** El árbol no "consume" flores: su etapa
 *   sale del total acumulado, que sólo puede subir. Así el total es a la vez
 *   el historial del estudiante y lo que hace crecer el árbol.
 * - **Terminar siempre rinde.** Toda lección terminada da sacuanjoches, por
 *   más que haya salido mal: igual que con el XP, equivocarse rinde menos,
 *   nunca resta ni deja con las manos vacías.
 * - **Crecer de a poco.** Seis etapas, de semilla a árbol florecido. Con lo
 *   que da una lección, el árbol avanza a lo sumo una etapa por vez.
 *
 * Todo lo de acá es puro y determinista, como la proyección: dos teléfonos con
 * los mismos eventos ven el mismo árbol.
 */

// ------------------------------------------------------------- sacuanjoches

/** Lo que da cualquier lección terminada. */
export const SACUANJOCHES_BASE = 3;
/** Una más si acertó al menos esta proporción. */
export const UMBRAL_BUENA = 0.7;
/** El máximo por lección: base + buena + perfecta. */
export const SACUANJOCHES_MAX = SACUANJOCHES_BASE + 2;

/**
 * Sacuanjoches que da una lección: 3 por terminarla, una más si salió bien
 * (70 % o más) y otra si salió perfecta. Entre 3 y 5, fácil de explicar.
 */
export function sacuanjochesPorLeccion(correctas: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const bien = Math.max(0, Math.min(correctas, total));
  let n = SACUANJOCHES_BASE;
  if (bien / total >= UMBRAL_BUENA) n += 1;
  if (bien === total) n += 1;
  return n;
}

// ----------------------------------------------------------------- etapas

export type EtapaId = 'semilla' | 'brote' | 'arbolito' | 'hojas' | 'flores' | 'florecido';

export interface Etapa {
  id: EtapaId;
  /** Índice 0..5, en orden de crecimiento. */
  indice: number;
  nombre: string;
  /** Lo que se le cuenta al niño cuando llega a esta etapa. */
  descripcion: string;
  /** Sacuanjoches acumuladas desde las que el árbol está en esta etapa. */
  desde: number;
}

/**
 * Cuántas sacuanjoches pide cada etapa. Los saltos crecen de a poco: la
 * primera lección ya hace brotar la semilla, y el árbol florecido pide unas
 * 25 lecciones.
 */
export const ETAPAS: readonly Etapa[] = [
  { id: 'semilla', indice: 0, nombre: 'Semilla', descripcion: 'Tu madroño está por nacer.', desde: 0 },
  { id: 'brote', indice: 1, nombre: 'Brote', descripcion: '¡Salió el primer brote!', desde: 3 },
  { id: 'arbolito', indice: 2, nombre: 'Arbolito', descripcion: 'Creció el tallo.', desde: 12 },
  { id: 'hojas', indice: 3, nombre: 'Árbol con hojas', descripcion: 'Tiene ramas y hojas.', desde: 30 },
  { id: 'flores', indice: 4, nombre: 'Primeras flores', descripcion: 'Aparecieron las primeras flores.', desde: 60 },
  { id: 'florecido', indice: 5, nombre: 'Árbol florecido', descripcion: '¡Tu madroño está todo florecido!', desde: 100 },
];

export function etapaDe(sacuanjoches: number): Etapa {
  let etapa = ETAPAS[0] as Etapa;
  for (const e of ETAPAS) if (sacuanjoches >= e.desde) etapa = e;
  return etapa;
}

/** Avance hacia la etapa siguiente. En la última, `siguiente` es `null`. */
export interface AvanceEtapa {
  etapa: Etapa;
  siguiente: Etapa | null;
  /** Entre 0 y 1. Es 1 en la última etapa. */
  fraccion: number;
  /** Sacuanjoches que faltan para la siguiente etapa. 0 en la última. */
  faltan: number;
}

export function progresoEtapa(sacuanjoches: number): AvanceEtapa {
  const etapa = etapaDe(sacuanjoches);
  const siguiente = ETAPAS[etapa.indice + 1] ?? null;
  if (!siguiente) return { etapa, siguiente, fraccion: 1, faltan: 0 };
  const largo = siguiente.desde - etapa.desde;
  const fraccion = Math.max(0, Math.min(1, (sacuanjoches - etapa.desde) / largo));
  return { etapa, siguiente, fraccion, faltan: Math.max(0, siguiente.desde - sacuanjoches) };
}

// --------------------------------------------------------------- recompensa

/** Lo que cambió en el árbol entre antes y después de una lección. */
export interface Recompensa {
  antes: number;
  despues: number;
  ganadas: number;
  etapaAntes: Etapa;
  etapaDespues: Etapa;
  crecioArbol: boolean;
}

export function recompensaEntre(antes: number, despues: number): Recompensa {
  const etapaAntes = etapaDe(antes);
  const etapaDespues = etapaDe(despues);
  return {
    antes,
    despues,
    ganadas: Math.max(0, despues - antes),
    etapaAntes,
    etapaDespues,
    crecioArbol: etapaDespues.indice > etapaAntes.indice,
  };
}
