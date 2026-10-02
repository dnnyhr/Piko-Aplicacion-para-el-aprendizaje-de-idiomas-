-- Intentos fallidos de entrar al panel: quien prueba tokens al azar queda
-- bloqueado un rato. La huella es un hash de la IP, no la IP.
CREATE TABLE IF NOT EXISTS intentos_admin (
  huella    TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS intentos_admin_huella ON intentos_admin (huella, creado_en);
