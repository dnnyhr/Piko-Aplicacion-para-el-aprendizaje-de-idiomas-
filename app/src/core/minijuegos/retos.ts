/**
 * Retos de elegir la respuesta, para los minijuegos que los usan (el trompo,
 * las chibolas): traducción, significado, imagen y audio.
 *
 * Cada juego dice cuántos retos, cuántas opciones y en qué orden van los
 * tipos en cada nivel; el armado y las reglas de qué se muestra son estas.
 * Puro y sin React, para poder probarlo en Node.
 */

import type { Rng } from '../ids';
import type { StudentState } from '../progress/projection';
import { elegirObjetivos, opcionesPara, palabrasDeNivel, type NivelMinijuego, type Palabra } from './vocabulario';

/**
 * - `traduccion`: se muestra en español; se elige en la lengua meta.
 * - `significado`: se muestra en la lengua meta; se elige en español.
 * - `imagen`: se muestra un dibujo; se elige en la lengua meta.
 * - `audio`: Piko la dice sin mostrarla. En los primeros niveles se elige la
 *   palabra que se escuchó; en el avanzado, qué significa la frase.
 */
export type TipoReto = 'traduccion' | 'significado' | 'imagen' | 'audio';

export interface Reto {
  tipo: TipoReto;
  palabra: Palabra;
  /** Lo que se muestra: en español, en la lengua meta, o la palabra del dibujo. */
  foco: string;
  opciones: string[];
  correcta: number;
  /** Si las opciones están en la lengua meta. */
  opcionesEnMeta: boolean;
}

export interface FormaDeRetos {
  /** Cuántos retos trae la partida. */
  cantidad: number;
  /** Opciones por reto, por nivel. */
  opciones: Record<NivelMinijuego, number>;
  /** El orden de los tipos en cada nivel; se repite. */
  tipos: Record<NivelMinijuego, readonly TipoReto[]>;
}

function opcionesEnMeta(tipo: TipoReto, nivel: NivelMinijuego): boolean {
  if (tipo === 'significado') return false;
  if (tipo === 'audio') return nivel !== 'avanzado';
  return true;
}

/**
 * Los retos de una partida, del vocabulario aprendido. `conDibujo` dice qué
 * palabras (en español) tienen dibujo: las que no, salen como traducción.
 * Vacío si el nivel no tiene con qué llenarse.
 */
export function armarRetos(
  vocab: readonly Palabra[],
  nivel: NivelMinijuego,
  state: StudentState,
  rng: Rng,
  forma: FormaDeRetos,
  conDibujo: (es: string) => boolean = () => false,
): Reto[] {
  const pool = palabrasDeNivel(vocab, nivel);
  const tipos = forma.tipos[nivel];
  const retos: Reto[] = [];
  elegirObjetivos(pool, forma.cantidad, state, rng).forEach((palabra, i) => {
    let tipo = tipos[i % tipos.length] as TipoReto;
    if (tipo === 'imagen' && !conDibujo(palabra.es)) tipo = 'traduccion';
    const enMeta = opcionesEnMeta(tipo, nivel);
    const armadas = opcionesPara(palabra, pool, vocab, enMeta, forma.opciones[nivel], rng);
    if (!armadas) return;
    retos.push({
      tipo,
      palabra,
      foco: tipo === 'significado' || tipo === 'audio' ? palabra.meta : palabra.es,
      opciones: armadas.opciones,
      correcta: armadas.correcta,
      opcionesEnMeta: enMeta,
    });
  });
  return retos.length === forma.cantidad ? retos : [];
}

/**
 * Una pista que no regala la respuesta: con qué letra empieza y cuántas
 * letras tiene (o palabras, si es una frase).
 */
export function pistaDe(reto: Reto): { inicial: string; largo: number; enPalabras: boolean } {
  const texto = (reto.opciones[reto.correcta] ?? '').replace(/^[¿¡«"\s]+/, '');
  const palabras = texto.split(/\s+/).filter(Boolean);
  const enPalabras = palabras.length > 1;
  return {
    inicial: texto.charAt(0).toLocaleUpperCase(),
    largo: enPalabras ? palabras.length : [...texto].filter((c) => /\p{L}/u.test(c)).length,
    enPalabras,
  };
}
