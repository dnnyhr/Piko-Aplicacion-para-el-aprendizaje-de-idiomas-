/**
 * La base del teléfono: SQLite de verdad.
 *
 * Metro elige este archivo en Android e iOS. En web toma `base.web.ts`, que
 * no arrastra `expo-sqlite` al bundle — su soporte web es alfa y pide wasm
 * más cabeceras de SharedArrayBuffer que no valen la pena para lo único que
 * hacemos en el navegador, que es mirar la interfaz.
 */

import * as SQLite from 'expo-sqlite';
import { driverExpo } from './driver';
import { SqliteEventLog, SqliteSnapshotStore, migrar } from './sqliteLog';
import { NOMBRE_BASE, type BaseLocal } from './tipos';
import { uuidv4 } from '../core/ids';

let cache: BaseLocal | null = null;

export function abrirBase(): BaseLocal {
  if (cache) return cache;

  const db = SQLite.openDatabaseSync(NOMBRE_BASE);
  const sql = driverExpo(db);
  migrar(sql);

  const fila = sql.get<{ device_id: string }>('SELECT device_id FROM device WHERE id = 1');
  let deviceId = fila?.device_id;
  if (!deviceId) {
    deviceId = uuidv4();
    sql.run('INSERT OR REPLACE INTO device (id, device_id) VALUES (1, ?)', [deviceId]);
  }

  cache = {
    sql,
    log: new SqliteEventLog(sql),
    snapshots: new SqliteSnapshotStore(sql),
    deviceId,
    persistente: true,
  };
  return cache;
}
