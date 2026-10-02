-- Las traducciones que el equipo confirmó en el panel (pestaña Palabras).
-- Una por ítem, lengua y forma: se pueden confirmar varias formas de la
-- misma palabra si cambian de una zona a otra.
CREATE TABLE IF NOT EXISTS confirmaciones (
  encuesta_id INTEGER NOT NULL REFERENCES encuestas(id),
  pregunta    TEXT NOT NULL,
  item        TEXT NOT NULL,
  grupo       TEXT NOT NULL,
  clave       TEXT NOT NULL,
  texto       TEXT NOT NULL,
  creada_en   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (encuesta_id, pregunta, item, grupo, clave)
);
