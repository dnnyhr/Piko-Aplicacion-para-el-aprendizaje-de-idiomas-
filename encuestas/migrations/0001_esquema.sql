-- Esquema de las encuestas de Piko.
--
-- Pensado para muchas encuestas a lo largo del tiempo: ninguna tabla conoce
-- las preguntas de una encuesta en particular. La definición vive como JSON
-- versionado, y las respuestas se guardan dos veces:
--
--   respuestas.datos       el JSON tal cual se validó (para exportar y auditar)
--   respuestas_items       una fila por cosa contable (para agrupar con SQL)

CREATE TABLE encuestas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  slug            TEXT    NOT NULL UNIQUE,
  titulo          TEXT    NOT NULL,
  estado          TEXT    NOT NULL DEFAULT 'borrador'
                          CHECK (estado IN ('borrador', 'abierta', 'cerrada')),
  version_actual  INTEGER NOT NULL DEFAULT 0,
  creada_en       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  actualizada_en  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Cada cambio a las preguntas crea una versión nueva. Las respuestas apuntan
-- a la versión con que se contestaron, así editar una encuesta abierta no
-- vuelve ilegibles las respuestas viejas.
CREATE TABLE versiones_encuesta (
  encuesta_id  INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL,
  definicion   TEXT    NOT NULL,          -- JSON completo de la encuesta
  huella       TEXT    NOT NULL,          -- SHA-256 de la definición
  creada_en    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (encuesta_id, version)
);

CREATE TABLE respuestas (
  id            TEXT    PRIMARY KEY,      -- UUID generado en el navegador: reenviar no duplica
  encuesta_id   INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  datos         TEXT    NOT NULL,         -- { respuestas, otros } ya validados
  origen        TEXT,                     -- ?origen= del enlace (whatsapp, escuela-x, ...)
  duracion_seg  INTEGER,
  huella        TEXT,                     -- hash del cliente, sin IP en claro: solo para frenar abusos
  creada_en     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX respuestas_por_encuesta ON respuestas (encuesta_id, creada_en);
CREATE INDEX respuestas_por_huella   ON respuestas (encuesta_id, huella, creada_en);

CREATE TABLE respuestas_items (
  respuesta_id  TEXT    NOT NULL REFERENCES respuestas(id) ON DELETE CASCADE,
  pregunta      TEXT    NOT NULL,
  fila          TEXT,                     -- solo matriz
  opcion        TEXT,                     -- unica / multiple
  numero        REAL,                     -- escala / matriz
  texto         TEXT                      -- texto libre, o el "otro: ..."
);

CREATE INDEX items_por_pregunta ON respuestas_items (pregunta, opcion, fila, numero);
CREATE INDEX items_por_respuesta ON respuestas_items (respuesta_id);
