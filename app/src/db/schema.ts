/**
 * Esquema de la base local.
 *
 * Se guarda igual en el teléfono del maestro y en el del estudiante: los dos
 * llevan el mismo log de eventos, sólo que el maestro tiene los de toda el
 * aula y el estudiante nada más los suyos. Esa simetría es lo que permite que
 * cualquier teléfono pueda ser anfitrión si al del maestro se le acaba la
 * batería.
 */

export const VERSION_ESQUEMA = 1;

/**
 * Notas de diseño de las tablas:
 *
 * - `progress_event` tiene clave primaria compuesta `(student_id, id)`. La
 *   idempotencia va por estudiante: si dos teléfonos generaran el mismo uuid,
 *   con clave global el progreso del segundo se perdería en silencio.
 * - `seq` es NULL mientras el evento vive sólo en este dispositivo. El índice
 *   parcial sobre los NULL hace que buscar "lo que falta enviar" sea barato
 *   aunque el log tenga decenas de miles de filas.
 * - `snapshot` es la compactación: estado ya proyectado hasta cierto `seq`,
 *   para que un teléfono nuevo no tenga que recibir el historial completo.
 */
export const MIGRACIONES: readonly string[][] = [
  // v1
  [
    `CREATE TABLE IF NOT EXISTS student (
       id          TEXT PRIMARY KEY NOT NULL,
       nombre      TEXT NOT NULL,
       avatar      INTEGER NOT NULL DEFAULT 0,
       grado       TEXT,
       creado_en   INTEGER NOT NULL
     )`,

    `CREATE TABLE IF NOT EXISTS progress_event (
       student_id    TEXT NOT NULL,
       id            TEXT NOT NULL,
       seq           INTEGER,
       kind          TEXT NOT NULL,
       payload       TEXT NOT NULL,
       created_at    INTEGER NOT NULL,
       origin_device TEXT NOT NULL,
       PRIMARY KEY (student_id, id)
     )`,

    `CREATE INDEX IF NOT EXISTS ix_evento_orden
       ON progress_event (student_id, seq)`,

    `CREATE INDEX IF NOT EXISTS ix_evento_pendiente
       ON progress_event (student_id, created_at)
       WHERE seq IS NULL`,

    `CREATE TABLE IF NOT EXISTS snapshot (
       student_id   TEXT PRIMARY KEY NOT NULL,
       through_seq  INTEGER NOT NULL,
       state        TEXT NOT NULL,
       actualizado  INTEGER NOT NULL
     )`,

    `CREATE TABLE IF NOT EXISTS preset (
       id          TEXT PRIMARY KEY NOT NULL,
       nombre      TEXT NOT NULL,
       lang        TEXT NOT NULL,
       themes      TEXT NOT NULL,
       difficulty  INTEGER NOT NULL,
       count       INTEGER NOT NULL,
       creado_en   INTEGER NOT NULL
     )`,

    // Una sola fila (id = 1) con la configuración del propio aparato.
    `CREATE TABLE IF NOT EXISTS device (
       id            INTEGER PRIMARY KEY CHECK (id = 1),
       device_id     TEXT NOT NULL,
       rol           TEXT,
       ultimo_alumno TEXT,
       ultimo_host   TEXT
     )`,

    // Hasta dónde conoce este teléfono a cada estudiante. Es el `sinceSeq`
    // que se manda al reclamar identidad.
    `CREATE TABLE IF NOT EXISTS sync_state (
       student_id TEXT PRIMARY KEY NOT NULL,
       last_seq   INTEGER NOT NULL DEFAULT 0
     )`,
  ],
];

export const SQL_INICIAL = [
  'PRAGMA journal_mode = WAL',
  'PRAGMA foreign_keys = ON',
  // Gama baja: menos fsync sin arriesgar corrupción con WAL activo.
  'PRAGMA synchronous = NORMAL',
];
