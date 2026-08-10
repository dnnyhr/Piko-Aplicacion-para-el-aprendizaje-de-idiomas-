/**
 * La base en el navegador: todo en memoria.
 *
 * Existe para poder correr la app desde la computadora y trabajar la
 * interfaz sin un teléfono a mano. El progreso se pierde al recargar, y el
 * aula en red no funciona igual porque un navegador no puede abrir sockets
 * TCP — para eso están el development build y `npm run sim`.
 */

import { MemoryEventLog, MemorySnapshotStore } from '../core/sync/log';
import { uuidv4 } from '../core/ids';
import type { SqlDriver } from './driver';
import type { BaseLocal } from './tipos';

/** Driver que traga todo y no devuelve nada: no hay SQL detrás. */
function driverVacio(): SqlDriver {
  return {
    exec: () => undefined,
    run: () => 0,
    all: () => [],
    get: () => null,
    tx: (fn) => fn(),
  };
}

let cache: BaseLocal | null = null;

export function abrirBase(): BaseLocal {
  if (!cache) {
    cache = {
      sql: driverVacio(),
      log: new MemoryEventLog(),
      snapshots: new MemorySnapshotStore(),
      deviceId: uuidv4(),
      persistente: false,
    };
  }
  return cache;
}
