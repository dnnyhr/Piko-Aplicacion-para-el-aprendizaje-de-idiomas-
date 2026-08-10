/** Contrato que cumplen las dos variantes de la base: la de SQLite y la de memoria. */

import type { SqlDriver } from './driver';
import type { EventLog, SnapshotStore } from '../core/sync/log';

export const NOMBRE_BASE = 'piko.db';

export interface BaseLocal {
  sql: SqlDriver;
  log: EventLog;
  snapshots: SnapshotStore;
  /** Identificador de este aparato. Se pierde si se desinstala la app. */
  deviceId: string;
  /** `false` en el navegador: nada sobrevive a recargar la página. */
  persistente: boolean;
}
