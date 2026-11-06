/**
 * Qué logros hay que celebrar.
 *
 * Los logros salen del progreso (ver `core/logros/`); acá sólo se recuerda,
 * por estudiante, cuáles ya se festejaron en este teléfono. Lo que se gana y
 * todavía no se festejó espera en `cola` hasta que el estudiante no esté en
 * medio de una ronda (`usePausaLogros`): un cartel encima de una pregunta
 * distrae más de lo que alegra.
 */

import { useEffect } from 'react';
import { create } from 'zustand';
import { abrirBase, logrosVistos, recordarLogrosVistos } from '../../db';
import { useProgreso } from '../progreso/store';

interface LogrosStore {
  /** Por estudiante, los logros ya festejados en este teléfono. */
  vistos: Record<string, string[]>;
  /** Los recién ganados, en el orden en que se ganaron. */
  cola: string[];
  /** Cuántas pantallas piden no interrumpir ahora. */
  pausas: number;
  preparado: boolean;

  /** Lee lo guardado y empieza a mirar el progreso. Una vez, al abrir la app. */
  preparar: () => void;
  /** Compara lo ganado con lo festejado y encola lo nuevo. */
  revisar: () => void;
  /** Ya se mostró: no vuelve a salir. */
  celebrado: (id: string) => void;
  pausar: () => void;
  reanudar: () => void;
}

export const useLogros = create<LogrosStore>((set, get) => ({
  vistos: {},
  cola: [],
  pausas: 0,
  preparado: false,

  preparar() {
    if (get().preparado) return;
    // Primero el progreso guardado: lo que ya estaba ganado no es nuevo.
    useProgreso.getState().recomputar();
    set({ vistos: logrosVistos(abrirBase().sql), preparado: true });
    get().revisar();
    useProgreso.subscribe((s, antes) => {
      if (s.estado !== antes.estado || s.studentId !== antes.studentId) get().revisar();
    });
  },

  revisar() {
    const { studentId, estado } = useProgreso.getState();
    const ganados = Object.keys(estado.logros).sort((a, b) => (estado.logros[a] as number) - (estado.logros[b] as number));
    const { vistos, cola } = get();
    const propios = vistos[studentId];

    // Primera vez que este teléfono ve a este estudiante (o la app recién se
    // actualizó): lo que ya tenía no se festeja de golpe, se ve en la lista.
    if (!propios) {
      const nuevos = { ...vistos, [studentId]: ganados };
      recordarLogrosVistos(abrirBase().sql, nuevos);
      set({ vistos: nuevos, cola: [] });
      return;
    }
    const pendientes = ganados.filter((id) => !propios.includes(id));
    if (pendientes.join() !== cola.join()) set({ cola: pendientes });
  },

  celebrado(id) {
    const { studentId } = useProgreso.getState();
    const { vistos, cola } = get();
    const propios = vistos[studentId] ?? [];
    const nuevos = { ...vistos, [studentId]: propios.includes(id) ? propios : [...propios, id] };
    recordarLogrosVistos(abrirBase().sql, nuevos);
    set({ vistos: nuevos, cola: cola.filter((x) => x !== id) });
  },

  pausar: () => set((s) => ({ pausas: s.pausas + 1 })),
  reanudar: () => set((s) => ({ pausas: Math.max(0, s.pausas - 1) })),
}));

/**
 * Mientras la pantalla que lo llama esté abierta (y `activo`), no aparece la
 * celebración de logros: se guarda para cuando termine la ronda.
 */
export function usePausaLogros(activo = true): void {
  useEffect(() => {
    if (!activo) return;
    useLogros.getState().pausar();
    return () => useLogros.getState().reanudar();
  }, [activo]);
}
