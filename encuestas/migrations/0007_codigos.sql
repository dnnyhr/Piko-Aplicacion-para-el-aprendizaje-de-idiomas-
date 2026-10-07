-- Códigos de logros especiales de la app (las tarjetas de un evento, como
-- Hackathon Nicaragua 2026). Cada tarjeta trae uno distinto y cada código se
-- canjea una sola vez. Los carga el equipo con `npm run codigos`; la app los
-- canjea por POST /api/canjes.
CREATE TABLE IF NOT EXISTS codigos (
  -- Normalizado: PIKO-HK26-7KQ2-M9XA
  codigo      TEXT PRIMARY KEY NOT NULL,
  -- El logro de la app que desbloquea, p. ej. piko-hackathon-2026
  logro       TEXT NOT NULL,
  -- La tanda impresa, p. ej. hackathon-2026
  lote        TEXT NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'utilizado')),
  -- Quién lo canjeó: el id del estudiante en la app, el teléfono y, si la
  -- app lo sabe, el nombre con que aparece en la clase.
  alumno      TEXT,
  dispositivo TEXT,
  nombre      TEXT,
  canjeado_en TEXT,
  creado_en   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS codigos_lote ON codigos (lote, estado);

-- Intentos de canje con un código que no existe: quien prueba códigos al azar
-- queda bloqueado un rato. La huella es un hash de la IP, no la IP.
CREATE TABLE IF NOT EXISTS intentos_canje (
  huella    TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS intentos_canje_huella ON intentos_canje (huella, creado_en);
