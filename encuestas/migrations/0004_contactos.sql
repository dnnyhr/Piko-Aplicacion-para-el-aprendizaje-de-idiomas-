-- Contactos agregados a mano desde el panel de admin (por ejemplo, los que
-- se dejaron antes de que existiera el correo automático, o los que se
-- anotaron en papel). Van aparte de las respuestas: no cuentan en las
-- estadísticas de la encuesta.

CREATE TABLE contactos (
  id                     TEXT    PRIMARY KEY,
  encuesta_id            INTEGER NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  nombre                 TEXT,
  correo                 TEXT,                -- en minúsculas
  telefono               TEXT,                -- solo dígitos, con + si lo tenía
  correo_estado          TEXT CHECK (correo_estado IN ('enviado', 'error', 'omitido')),
  correo_detalle         TEXT,
  correo_intentos        INTEGER NOT NULL DEFAULT 0,
  correo_resend_id       TEXT,
  correo_actualizado_en  TEXT,
  creado_en              TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (correo IS NOT NULL OR telefono IS NOT NULL)
);

-- El mismo correo o número no se agrega dos veces a la misma encuesta.
CREATE UNIQUE INDEX contactos_correo   ON contactos (encuesta_id, correo)   WHERE correo IS NOT NULL;
CREATE UNIQUE INDEX contactos_telefono ON contactos (encuesta_id, telefono) WHERE telefono IS NOT NULL;
