/**
 * Las herramientas entran al panel como el navegador: mandan la contraseña
 * (PIKO_ENCUESTAS_TOKEN = el ADMIN_TOKEN) a /api/admin/sesion y usan el JWT
 * que vuelve en cada pedido.
 */
export async function pedirJwt(url, clave) {
  const res = await fetch(`${url.replace(/\/$/, '')}/api/admin/sesion`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clave }),
  });
  const r = await res.json().catch(() => ({}));
  if (!res.ok || !r.token) {
    console.error(`No se pudo entrar al panel: ${r.error ?? res.status}`);
    process.exit(1);
  }
  return r.token;
}
