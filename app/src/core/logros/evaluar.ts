/**
 * Cuánto lleva el estudiante en cada logro.
 *
 * Todo sale del `StudentState`, que a su vez sale del log de eventos: por eso
 * los logros, y la fecha en que se ganó cada uno, son los mismos en cualquier
 * teléfono que tenga los mismos eventos.
 */

import type { StudentState } from '../progress/projection';
import { LOGROS } from './catalogo';
import type { CondicionLogro, Logro, LogroConEstado } from './tipos';

/** El minijuego con que se registra La Música de Piko (`ID_MUSICA`). */
const MUSICA = 'musica';

/** `meta` 0: no se mide con una barra (código o próximamente). */
export function progresoDe(c: CondicionLogro, e: StudentState): { actual: number; meta: number } {
  switch (c.tipo) {
    case 'lecciones':
      return { actual: e.lessons, meta: c.n };
    case 'racha_dias':
      return { actual: e.mejorRachaDias, meta: c.n };
    case 'palabras':
      return { actual: e.aprendidas[c.lengua]?.length ?? 0, meta: c.n };
    case 'lenguas':
      return { actual: e.lenguas.length, meta: c.n };
    case 'canciones':
      return { actual: e.cancionesCompletas.length, meta: c.n };
    case 'partidas': {
      if (c.juego) return { actual: e.partidas[c.juego] ?? 0, meta: c.n };
      let total = 0;
      for (const [juego, n] of Object.entries(e.partidas)) if (juego !== MUSICA) total += n;
      return { actual: total, meta: c.n };
    }
    case 'juegos':
      return { actual: c.juegos.filter((j) => (e.partidas[j] ?? 0) > 0).length, meta: c.juegos.length };
    case 'sacuanjoches':
      return { actual: e.sacuanjoches, meta: c.n };
    case 'clases':
      return { actual: e.clases, meta: c.n };
    case 'hito':
      return { actual: e.hitos.includes(c.clave) ? 1 : 0, meta: 1 };
    case 'codigo':
    case 'proximamente':
      return { actual: 0, meta: 0 };
  }
}

/**
 * Si el estado ya cumple la condición. Los de código se desbloquean sólo con
 * el evento de canje (ver la proyección), nunca por progreso.
 */
export function cumple(l: Logro, e: StudentState): boolean {
  const { actual, meta } = progresoDe(l.condicion, e);
  return meta > 0 && actual >= meta;
}

/** Todos los logros, con lo que lleva el estudiante, en el orden del catálogo. */
export function logrosDe(e: StudentState, catalogo: readonly Logro[] = LOGROS): LogroConEstado[] {
  return catalogo.map((logro) => {
    const fecha = e.logros[logro.id] ?? null;
    const { actual, meta } = progresoDe(logro.condicion, e);
    return {
      logro,
      desbloqueado: fecha !== null,
      fecha,
      actual: Math.min(actual, meta),
      meta,
      requiereCodigo: logro.condicion.tipo === 'codigo',
      proximamente: logro.condicion.tipo === 'proximamente',
    };
  });
}

/**
 * Cuántos hay desbloqueados y de cuántos. Los «Próximamente» no cuentan en el
 * total: todavía no se pueden ganar.
 */
export function resumenLogros(e: StudentState, catalogo: readonly Logro[] = LOGROS) {
  const posibles = catalogo.filter((l) => l.condicion.tipo !== 'proximamente');
  const ganados = posibles.filter((l) => e.logros[l.id] !== undefined);
  return {
    desbloqueados: ganados.length,
    total: posibles.length,
    especiales: ganados.filter((l) => l.tipo === 'especial'),
  };
}
