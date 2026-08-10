/**
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  AQUÍ VAN LOS SPRITES DE PIKO                                        │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Mientras este registro esté vacío, `<PikoMascota>` dibuja el Piko vectorial
 * de la landing. Apenas agregues una imagen para un estado, la mascota la usa
 * en su lugar automáticamente — no hay que tocar ninguna pantalla.
 *
 * Para agregarlos:
 *
 *   1. Poné los PNG en `assets/piko/` (recomendado: 512×512, fondo
 *      transparente, el pájaro centrado con algo de aire alrededor).
 *   2. Descomentá la línea del estado correspondiente.
 *
 * Los siete estados son los que la app pide hoy. Si sólo tenés algunos,
 * agregá esos: los que falten siguen cayendo al vector.
 */

import type { ImageSourcePropType } from 'react-native';

export type EstadoPiko =
  /** Quieto, respirando. Es el estado por defecto. */
  | 'idle'
  /** Bienvenida y pantalla de inicio. */
  | 'saludando'
  /** Acompaña el enunciado mientras el estudiante piensa. */
  | 'pensando'
  /** Respuesta correcta. */
  | 'alegre'
  /** Respuesta equivocada. Anima, no regaña: nunca enojado ni triste. */
  | 'animando'
  /** Fin de ronda con buen resultado. */
  | 'celebrando'
  /** Sin conexión, o la clase terminó. */
  | 'dormido';

export const ESTADOS_PIKO: readonly EstadoPiko[] = [
  'idle',
  'saludando',
  'pensando',
  'alegre',
  'animando',
  'celebrando',
  'dormido',
];

export const SPRITES: Partial<Record<EstadoPiko, ImageSourcePropType>> = {
  // idle:       require('../../../assets/piko/idle.png'),
  // saludando:  require('../../../assets/piko/saludando.png'),
  // pensando:   require('../../../assets/piko/pensando.png'),
  // alegre:     require('../../../assets/piko/alegre.png'),
  // animando:   require('../../../assets/piko/animando.png'),
  // celebrando: require('../../../assets/piko/celebrando.png'),
  // dormido:    require('../../../assets/piko/dormido.png'),
};

/**
 * Si falta el sprite de un estado, se usa el del estado más parecido antes de
 * caer al vector. Así, con un solo dibujo alegre ya se cubren celebración y
 * ánimo, y la app no se ve incompleta a medio camino.
 */
export const PARECIDOS: Record<EstadoPiko, readonly EstadoPiko[]> = {
  idle: [],
  saludando: ['idle', 'alegre'],
  pensando: ['idle'],
  alegre: ['celebrando', 'idle'],
  animando: ['idle', 'alegre'],
  celebrando: ['alegre', 'idle'],
  dormido: ['idle'],
};

export function spriteDe(estado: EstadoPiko): ImageSourcePropType | null {
  const propio = SPRITES[estado];
  if (propio) return propio;
  for (const alterno of PARECIDOS[estado]) {
    const s = SPRITES[alterno];
    if (s) return s;
  }
  return null;
}
