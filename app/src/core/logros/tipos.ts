/**
 * Los logros de Piko son datos, no código.
 *
 * Cada logro dice qué es, cómo se ve y **qué condición** lo desbloquea. Agregar
 * uno nuevo es sumar una entrada a `catalogo.ts`: la pantalla de logros, el
 * perfil y la celebración lo toman solos. Un tipo de condición nuevo (algo que
 * hoy la app no cuenta) sí pide código: una métrica en la proyección y un caso
 * en `progresoDe` (`evaluar.ts`).
 *
 * El estado (desbloqueado o no) y la fecha **no** van acá: salen del log de
 * eventos del estudiante, igual que el XP y las sacuanjoches, así que viajan
 * con él de teléfono en teléfono.
 */

export type CategoriaLogro = 'progreso' | 'racha' | 'palabras' | 'interaccion' | 'exploracion' | 'especiales';

/**
 * Lo que tiene que pasar para desbloquearlo. `n` es la meta: la pantalla
 * muestra cuánto falta (3 de 5 lecciones).
 */
export type CondicionLogro =
  /** Terminar `n` lecciones. */
  | { tipo: 'lecciones'; n: number }
  /** Estudiar `n` días seguidos (cualquier respuesta, lección o partida cuenta). */
  | { tipo: 'racha_dias'; n: number }
  /** Aprender `n` palabras distintas de una lengua (acertarlas al menos una vez). */
  | { tipo: 'palabras'; lengua: string; n: number }
  /** Practicar `n` lenguas distintas. */
  | { tipo: 'lenguas'; n: number }
  /** Completar `n` canciones de La Música de Piko. */
  | { tipo: 'canciones'; n: number }
  /** Jugar `n` partidas de minijuegos; de uno en particular si dice `juego`. */
  | { tipo: 'partidas'; n: number; juego?: string }
  /** Jugar al menos una partida de cada uno de estos minijuegos. */
  | { tipo: 'juegos'; juegos: readonly string[] }
  /** Juntar `n` sacuanjoches. */
  | { tipo: 'sacuanjoches'; n: number }
  /** Unirse `n` veces a una clase en vivo. */
  | { tipo: 'clases'; n: number }
  /** Hacer una vez algo que no es respuesta ni partida (ver `HitoPayload`). */
  | { tipo: 'hito'; clave: string }
  /**
   * Sólo con un código físico (las tarjetas de un evento). Nunca se gana
   * jugando: lo desbloquea el canje que confirma el servidor.
   */
  | { tipo: 'codigo' }
  /** Todavía no se puede ganar: la app no tiene lo que pide. Se ve con «Próximamente». */
  | { tipo: 'proximamente' };

/** Cómo se dibuja la insignia. */
export interface InsigniaLogro {
  /** Un emoji, en el centro de la medalla. */
  icono: string;
  /** El color de la medalla cuando está desbloqueada. */
  color: string;
  /**
   * `medalla` es la de todos. Las de eventos tienen su propio dibujo
   * (`ui/logros/Insignia.tsx`); hoy, `hackathon`.
   */
  forma?: 'medalla' | 'hackathon';
}

export interface Logro {
  /** Para siempre: queda guardado en el progreso de los estudiantes. */
  id: string;
  nombre: string;
  /** Qué significa, en una frase. */
  descripcion: string;
  /** Cómo se obtiene, dicho para un niño. */
  como: string;
  /** Lo que se le dice al desbloquearlo: «Completaste tu primera lección.» */
  felicitacion: string;
  categoria: CategoriaLogro;
  /** `especial`: de eventos, concursos, escuelas o colaboraciones. */
  tipo: 'normal' | 'especial';
  /** Se marca «EXCLUSIVO»: sólo lo tienen quienes estuvieron ahí. */
  exclusivo?: boolean;
  insignia: InsigniaLogro;
  condicion: CondicionLogro;
}

export interface Categoria {
  id: CategoriaLogro;
  nombre: string;
  /** Una línea debajo del título de la sección. */
  descripcion: string;
}

/** Un logro con lo que el estudiante lleva. */
export interface LogroConEstado {
  logro: Logro;
  desbloqueado: boolean;
  /** Cuándo se desbloqueó (milisegundos), si se desbloqueó. */
  fecha: number | null;
  /** Para la barra de «cuánto falta». `meta` 0 = no se mide (código, próximamente). */
  actual: number;
  meta: number;
  /** Necesita un código para desbloquearse. */
  requiereCodigo: boolean;
  proximamente: boolean;
}
