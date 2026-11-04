/**
 * Las preferencias de «Mi forma de aprender».
 *
 * Se leen de forma síncrona al arrancar, igual que la lengua de la app: así el
 * primer cuadro ya sale con el tamaño y el contraste elegidos, sin un salto.
 * Cada cambio se guarda en el momento: cerrar la app no pierde nada.
 */

import { create } from 'zustand';
import {
  escribirPreferencias,
  leerPreferencias,
  PREFERENCIAS_INICIALES,
  type Preferencias,
} from '../../core/preferencias/preferencias';
import { guardar, leerGuardado } from './guardado';

interface PreferenciasStore extends Preferencias {
  cambiar: (cambios: Partial<Preferencias>) => void;
  /** Deja todo como viene de fábrica. */
  restablecer: () => void;
}

const soloPreferencias = ({ tamano, contraste, narracion, pasoAPaso, senas }: Preferencias): Preferencias => ({
  tamano,
  contraste,
  narracion,
  pasoAPaso,
  senas,
});

export const usePreferencias = create<PreferenciasStore>((set, get) => ({
  ...leerPreferencias(leerGuardado()),
  cambiar(cambios) {
    set(cambios);
    guardar(escribirPreferencias(soloPreferencias(get())));
  },
  restablecer() {
    set({ ...PREFERENCIAS_INICIALES });
    guardar(escribirPreferencias(PREFERENCIAS_INICIALES));
  },
}));
