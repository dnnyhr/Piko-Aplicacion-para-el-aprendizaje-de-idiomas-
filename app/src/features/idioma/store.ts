/**
 * En qué lengua está la app.
 *
 * Se guarda en el teléfono, así que la elección sobrevive a cerrar la app. De
 * ella sale también desde qué lengua se aprende: con la app en miskito se
 * aprende español desde el miskito.
 */

import { create } from 'zustand';
import { abrirBase, recordarIdioma, ultimoIdioma } from '../../db';
import { IDIOMAS_APP, type IdiomaApp } from '../../ui/textos/traducir';

function leerGuardado(): IdiomaApp {
  try {
    const v = ultimoIdioma(abrirBase().sql);
    return (IDIOMAS_APP as readonly string[]).includes(v ?? '') ? (v as IdiomaApp) : 'spa';
  } catch {
    return 'spa';
  }
}

interface IdiomaStore {
  idioma: IdiomaApp;
  cambiar: (idioma: IdiomaApp) => void;
}

export const useIdioma = create<IdiomaStore>((set) => ({
  idioma: leerGuardado(),
  cambiar(idioma) {
    set({ idioma });
    try {
      recordarIdioma(abrirBase().sql, idioma);
    } catch {
      /* sin base (p. ej. en el navegador) vale sólo por esta vez */
    }
  },
}));
