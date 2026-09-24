-- Registro de los correos automáticos (el enlace de descarga que se manda a
-- quien deja su dirección). Uno por respuesta: si la señal falla y el
-- teléfono reintenta, no se manda dos veces.
--
--   estado: enviado | error | omitido (omitido = falta configurar Resend)

CREATE TABLE correos (
  respuesta_id  TEXT PRIMARY KEY REFERENCES respuestas(id) ON DELETE CASCADE,
  para          TEXT NOT NULL,
  estado        TEXT NOT NULL CHECK (estado IN ('enviado', 'error', 'omitido')),
  detalle       TEXT,
  resend_id     TEXT,
  creado_en     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX correos_por_estado ON correos (estado, creado_en);
