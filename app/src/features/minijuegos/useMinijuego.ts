/**
 * Lo que toda pantalla de minijuego necesita del progreso: la lengua elegida,
 * los niveles que abren las lecciones, el tope de flores por día y cerrar la
 * partida en el log.
 *
 * Así cada juego sólo se ocupa de jugarse: ver `app/minijuegos/*.tsx`.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useProgreso } from '../progreso/store';
import { useMinijuegos } from './store';
import {
  diaLocal,
  LENGUAS_MINIJUEGOS,
  nivelesDe,
  nivelSugerido,
  paquetesEstudiados,
  vocabularioAprendido,
  type EstadoNivel,
  type LenguaMinijuego,
  type NivelMinijuego,
  type Palabra,
} from '../../core/minijuegos/vocabulario';
import { clavePremio, yaPremiado, type StudentState } from '../../core/progress/projection';
import type { Recompensa } from '../../core/progress/arbol';
import { PACKS } from '../../../content';

export interface CierreMinijuego {
  recompensa: Recompensa;
  /** El juego ya había dado flores hoy en ese nivel: fue de práctica. */
  repetida: boolean;
  xpGanado: number;
}

export interface PropsDeEleccion {
  lengua: LenguaMinijuego;
  nivel: NivelMinijuego | null;
  niveles: readonly EstadoNivel[];
  sugerido: NivelMinijuego | null;
  temas: Record<LenguaMinijuego, readonly string[]>;
  sacuanjoches: number;
  onLengua: (l: LenguaMinijuego) => void;
  onNivel: (n: NivelMinijuego) => void;
}

/**
 * `id` es el del juego en el evento `gameDone`; `opciones`, cuántas
 * respuestas muestra en cada nivel (para saber qué niveles alcanzan).
 */
export function useMinijuego(id: string, opciones: Record<NivelMinijuego, number>) {
  const estado = useProgreso((s) => s.estado);
  const registrar = useProgreso((s) => s.registrar);
  const terminarMinijuego = useProgreso((s) => s.terminarMinijuego);
  const lenguaGuardada = useMinijuegos((s) => s.lengua);
  const elegirLengua = useMinijuegos((s) => s.elegirLengua);
  const lengua: LenguaMinijuego = lenguaGuardada ?? 'eng';

  // Lo guardado de otras veces: las lecciones hechas abren los niveles.
  useEffect(() => {
    useProgreso.getState().recomputar();
  }, []);

  const niveles = useMemo(() => nivelesDe(PACKS, estado, lengua, opciones), [estado, lengua, opciones]);
  const sugerido = nivelSugerido(niveles);
  const [elegido, setElegido] = useState<NivelMinijuego | null>(null);
  const abierto = (n: NivelMinijuego | null) => !!n && niveles.some((x) => x.nivel === n && x.abierto);
  const nivel = abierto(elegido) ? elegido : sugerido;

  const temas = useMemo(() => {
    const out = {} as Record<LenguaMinijuego, string[]>;
    for (const l of LENGUAS_MINIJUEGOS) {
      out[l] = [...new Set(paquetesEstudiados(PACKS, estado, l).map((p) => p.theme))].sort();
    }
    return out;
  }, [estado]);

  // Fijado al empezar: lo que cambia durante la partida no debe mover la regla.
  const partida = useRef<{ nivel: NivelMinijuego; premiable: boolean; xpInicio: number }>({
    nivel: 'inicial',
    premiable: true,
    xpInicio: 0,
  });

  /**
   * Empieza una partida en el nivel elegido: devuelve el vocabulario y el
   * estado con que armarla, o null si no hay nivel abierto.
   */
  const empezar = (): { nivel: NivelMinijuego; vocab: Palabra[]; estado: StudentState } | null => {
    if (!nivel) return null;
    const actual = useProgreso.getState().estado;
    partida.current = {
      nivel,
      // Si este juego ya dio flores hoy en este nivel, se juega de práctica: sin XP ni flores.
      premiable: !yaPremiado(actual, clavePremio(id, lengua, nivel), diaLocal()),
      xpInicio: actual.xp,
    };
    return { nivel, vocab: vocabularioAprendido(PACKS, actual, lengua), estado: actual };
  };

  /** Anota una respuesta en el progreso (si la partida da premio). */
  const responder = (palabra: Palabra, acerto: boolean, ms: number) => {
    if (partida.current.premiable) registrar(palabra.item, palabra.packId, acerto, ms);
  };

  /** Cierra la partida en el log: de ahí salen las flores, el perfil y el madroño. */
  const cerrar = (resultado: { correct: number; total: number; streak?: number }): CierreMinijuego => {
    const { nivel: jugado, premiable, xpInicio } = partida.current;
    const recompensa = terminarMinijuego({ game: id, lang: lengua, level: jugado, day: diaLocal(), ...resultado });
    return {
      recompensa,
      repetida: !premiable,
      xpGanado: Math.max(0, useProgreso.getState().estado.xp - xpInicio),
    };
  };

  const eleccion: PropsDeEleccion = {
    lengua,
    nivel,
    niveles,
    sugerido,
    temas,
    sacuanjoches: estado.sacuanjoches,
    onLengua: (l) => {
      elegirLengua(l);
      setElegido(null);
    },
    onNivel: setElegido,
  };

  return { estado, lengua, partida, empezar, responder, cerrar, eleccion };
}
