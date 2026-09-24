-- Reenvíos desde el panel de admin: cuántas veces se intentó mandar el
-- correo de cada respuesta y cuándo fue el último intento. Cada intento usa
-- su propia clave de idempotencia en Resend, así un reenvío pedido a mano sí
-- sale, pero un reintento automático del mismo intento no se duplica.

ALTER TABLE correos ADD COLUMN intentos INTEGER NOT NULL DEFAULT 1;
ALTER TABLE correos ADD COLUMN actualizado_en TEXT;
