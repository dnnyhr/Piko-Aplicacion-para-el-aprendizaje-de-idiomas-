/**
 * Cuántas sacuanjoches da una partida de minijuego, según el juego.
 *
 * Lo usa la proyección: así las reglas viven en un solo lugar y dos teléfonos
 * con los mismos eventos llegan a las mismas flores. El tope de una vez por
 * día lo pone la proyección, igual para todos los juegos.
 */

import { sacuanjochesPorMinijuego } from '../progress/arbol';
import { ID_TROMPO, sacuanjochesPorTrompo } from './trompo';
import { ID_GALLINITA, sacuanjochesPorGallinita } from './gallinita';
import { ID_MUSICA, sacuanjochesPorCancion } from '../canciones/cancion';

export interface PartidaMinijuego {
  game: string;
  correct: number;
  total: number;
  /** Mejor racha de la partida, para los juegos que la premian. */
  streak?: number;
}

export function floresDeMinijuego(p: PartidaMinijuego): number {
  if (p.game === ID_TROMPO) return sacuanjochesPorTrompo(p.correct, p.total, p.streak ?? 0);
  if (p.game === ID_GALLINITA) return sacuanjochesPorGallinita(p.correct, p.total, p.streak ?? 0);
  if (p.game === ID_MUSICA) return sacuanjochesPorCancion(p.correct, p.total, p.streak ?? 0);
  // La rayuela y las chibolas: la regla común (dos tercios al primer intento).
  return sacuanjochesPorMinijuego(p.correct, p.total);
}
