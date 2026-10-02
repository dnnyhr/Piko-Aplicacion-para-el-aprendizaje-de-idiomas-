/**
 * El árbol de madroño: sacuanjoches, niveles y etapas.
 *
 * Es el ciclo que ve el niño: aprende → gana sacuanjoches → su árbol crece →
 * Piko sube una rama más → sigue aprendiendo.
 *
 * Reglas de diseño:
 *
 * - **Las sacuanjoches no se gastan.** El árbol no "consume" flores: su etapa
 *   sale del total acumulado, que sólo puede subir. Así el total es a la vez
 *   el historial del estudiante y lo que hace crecer el árbol.
 * - **Terminar siempre rinde.** Toda lección terminada da sacuanjoches, por
 *   más que haya salido mal: igual que con el XP, equivocarse rinde menos,
 *   nunca resta ni deja con las manos vacías.
 * - **Crecer de a poco.** Seis etapas, de semilla a árbol florecido, y cada
 *   cambio de etapa coincide con una subida de nivel: el árbol no salta
 *   nunca de semilla a árbol entero.
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

export const ETAPAS: readonly Etapa[] = [
  { id: 'semilla', indice: 0, nombre: 'Semilla', descripcion: 'Tu madroño está por nacer.', desde: 0 },
  { id: 'brote', indice: 1, nombre: 'Brote', descripcion: '¡Salió el primer brote!', desde: 4 },
  { id: 'arbolito', indice: 2, nombre: 'Arbolito', descripcion: 'Creció el tallo.', desde: 12 },
  { id: 'hojas', indice: 3, nombre: 'Árbol con hojas', descripcion: 'Tiene ramas y hojas.', desde: 35 },
  { id: 'flores', indice: 4, nombre: 'Primeras flores', descripcion: 'Aparecieron las primeras flores.', desde: 68 },
  { id: 'florecido', indice: 5, nombre: 'Árbol florecido', descripcion: '¡Tu madroño está todo florecido!', desde: 110 },
];

// ----------------------------------------------------------------- niveles

/**
 * Sacuanjoches acumuladas que pide cada nivel. `NIVELES[n - 1]` es el piso
 * del nivel `n`. Cada umbral de etapa es también un umbral de nivel, así que
 * el árbol cambia siempre en el mismo momento en que Piko sube.
 *
 * Con 3 a 5 por lección, el primer nivel llega en la segunda lección y la cima
 * en unas 35: un recorrido largo, pero con una recompensa visible cada pocas
 * rondas.
 */
export const NIVELES: readonly number[] = [0, 4, 12, 22, 35, 50, 68, 88, 110, 135];
export const NIVEL_MAX = NIVELES.length;

/** Nivel actual, de 1 a `NIVEL_MAX`. */
export function nivelDe(sacuanjoches: number): number {
  let nivel = 1;
  for (let i = 0; i < NIVELES.length; i++) {
    if (sacuanjoches >= (NIVELES[i] as number)) nivel = i + 1;
  }
  return nivel;
}

export function etapaDe(sacuanjoches: number): Etapa {
  let etapa = ETAPAS[0] as Etapa;
  for (const e of ETAPAS) if (sacuanjoches >= e.desde) etapa = e;
  return etapa;
}

/** Avance dentro de un tramo [desde, hasta). `hasta` es `null` en la cima. */
export interface Tramo {
  desde: number;
  hasta: number | null;
  /** Entre 0 y 1. Es 1 en la cima. */
  fraccion: number;
  /** Sacuanjoches que faltan para el próximo tramo. 0 en la cima. */
  faltan: number;
}

function tramo(total: number, desde: number, hasta: number | null): Tramo {
  if (hasta === null) return { desde, hasta, fraccion: 1, faltan: 0 };
  const largo = hasta - desde;
  const fraccion = largo <= 0 ? 1 : Math.max(0, Math.min(1, (total - desde) / largo));
  return { desde, hasta, fraccion, faltan: Math.max(0, hasta - total) };
}

export function progresoNivel(sacuanjoches: number): Tramo & { nivel: number } {
  const nivel = nivelDe(sacuanjoches);
  const desde = NIVELES[nivel - 1] as number;
  const hasta = nivel < NIVEL_MAX ? (NIVELES[nivel] as number) : null;
  return { nivel, ...tramo(sacuanjoches, desde, hasta) };
}

export function progresoEtapa(sacuanjoches: number): Tramo & { etapa: Etapa; siguiente: Etapa | null } {
  const etapa = etapaDe(sacuanjoches);
  const siguiente = ETAPAS[etapa.indice + 1] ?? null;
  return { etapa, siguiente, ...tramo(sacuanjoches, etapa.desde, siguiente?.desde ?? null) };
}

// ---------------------------------------------------------- dónde está Piko

/**
 * Dónde está Piko en el árbol, nivel por nivel. Lo dice en palabras para el
 * perfil; el dibujo usa el mismo índice para elegir la rama.
 */
export const LUGAR_DE_PIKO: readonly string[] = [
  'Piko espera junto a la semilla.',
  'Piko cuida el brote.',
  'Piko se subió al tallo.',
  'Piko trepa por el tronco.',
  'Piko llegó a la primera rama.',
  'Piko salta a otra rama.',
  'Piko está entre las flores.',
  'Piko sube cada vez más alto.',
  'Piko está casi en la copa.',
  '¡Piko llegó a la cima del madroño!',
];

export function lugarDePiko(nivel: number): string {
  const i = Math.max(1, Math.min(NIVEL_MAX, nivel)) - 1;
  return LUGAR_DE_PIKO[i] as string;
}

// --------------------------------------------------------------- recompensa

/** Lo que cambió entre antes y después de una lección. */
export interface Recompensa {
  antes: number;
  despues: number;
  ganadas: number;
  nivelAntes: number;
  nivelDespues: number;
  subioNivel: boolean;
  etapaAntes: Etapa;
  etapaDespues: Etapa;
  crecioArbol: boolean;
}

export function recompensaEntre(antes: number, despues: number): Recompensa {
  const nivelAntes = nivelDe(antes);
  const nivelDespues = nivelDe(despues);
  const etapaAntes = etapaDe(antes);
  const etapaDespues = etapaDe(despues);
  return {
    antes,
    despues,
    ganadas: Math.max(0, despues - antes),
    nivelAntes,
    nivelDespues,
    subioNivel: nivelDespues > nivelAntes,
    etapaAntes,
    etapaDespues,
    crecioArbol: etapaDespues.indice > etapaAntes.indice,
  };
}
