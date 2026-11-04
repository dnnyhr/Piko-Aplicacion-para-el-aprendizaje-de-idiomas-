/**
 * Los recursos en lengua de señas.
 *
 * Una lengua de señas es una lengua, con su gramática y sus comunidades: no se
 * traduce palabra por palabra ni se genera con una máquina. La regla es la
 * misma que con mayangna, rama y garífuna: preferimos no tener contenido a
 * enseñar uno inventado. Por eso un recurso sin validación no pasa
 * `validarRecurso`, y lo que no pasa nunca llega a la pantalla.
 *
 * Puro y sin React, para probarlo en Node. Cómo sumar contenido:
 * `content/senas/README.md`.
 */

/** ISO 639-3. `ncs`: lengua de señas nicaragüense. */
export const LENGUAS_SENAS = ['ncs'] as const;
export type LenguaSenas = (typeof LENGUAS_SENAS)[number];

export interface ValidacionSena {
  /** Persona u organización que lo revisó. */
  por: string;
  /** Por qué es competente: persona sorda usuaria de la lengua, intérprete… */
  competencia: string;
  /** AAAA-MM-DD. */
  fecha: string;
}

export interface RecursoSena {
  id: string;
  lengua: LenguaSenas;
  /**
   * A qué acompaña: `instruccion.<actividad>` (`instruccion.choice`) o
   * `vocabulario.<id del ítem>` (`vocabulario.eng.saludos.1.a`).
   */
  clave: string;
  /** El video: un `require()` del archivo dentro de la app, para que funcione sin internet. */
  video: number;
  /** Qué se dice en el video, por escrito. */
  descripcion: string;
  /** Quien aparece en el video dio permiso para que se use en Piko. */
  permiso: boolean;
  validacion: ValidacionSena;
}

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Lo que le falta a un recurso para poder mostrarse. Vacío: está en regla. */
export function validarRecurso(raw: unknown): string[] {
  if (typeof raw !== 'object' || raw === null) return ['no es un objeto'];
  const r = raw as Partial<Record<keyof RecursoSena, unknown>>;
  const errores: string[] = [];
  if (!esTexto(r.id)) errores.push('falta `id`');
  if (!(LENGUAS_SENAS as readonly unknown[]).includes(r.lengua)) errores.push('`lengua` desconocida');
  if (!esTexto(r.clave) || !/^(instruccion|vocabulario)\../.test(r.clave)) {
    errores.push('`clave` tiene que empezar con `instruccion.` o `vocabulario.`');
  }
  if (typeof r.video !== 'number') errores.push('falta `video`: un require() del archivo');
  if (!esTexto(r.descripcion)) errores.push('falta `descripcion`: qué se dice, por escrito');
  if (r.permiso !== true) errores.push('falta el permiso de quien aparece en el video');
  const v = r.validacion as Partial<ValidacionSena> | undefined;
  if (!v || !esTexto(v.por) || !esTexto(v.competencia)) {
    errores.push('falta quién lo validó y por qué es competente');
  }
  if (!v || !esTexto(v.fecha) || !/^\d{4}-\d{2}-\d{2}$/.test(v.fecha)) errores.push('falta la fecha de validación');
  return errores;
}

/** Los recursos que acompañan a estas claves. Sólo los que están en regla. */
export function recursosPara(catalogo: readonly RecursoSena[], claves: readonly string[]): RecursoSena[] {
  return catalogo.filter((r) => claves.includes(r.clave) && validarRecurso(r).length === 0);
}
