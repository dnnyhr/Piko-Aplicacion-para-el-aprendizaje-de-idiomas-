# Sprint 3 · Entregables

Piko en producción sobre Azure: en línea, con HTTPS, sin pantallas técnicas, con
sesiones JWT y con el servidor igual a `main` de GitHub.

| Dirección | Qué sirve | Dónde corre |
|---|---|---|
| https://azure.piko.mugiware.com | El sitio y la app web (`/probar/app`) | Azure (VM + Docker + Nginx) |
| https://api.piko.mugiware.com | Las encuestas, el panel y su API | Azure (mismo servidor) |
| https://piko.mugiware.com | El mismo sitio, réplica | Netlify |

La guía completa del servidor, paso a paso, está en [`despliegue/README.md`](../despliegue/README.md).

```
Internet ──443──▶ Nginx ─┬─ azure.piko… → web/ (estático, gzip, HTTP/2)
  (HTTPS, único           └─ api.piko…   → api:8787 (Node) ──▶ db:8080 (libSQL)
   puerto abierto)                         JWT · CORS          volumen propio
                                              └──▶ Resend (correo, API externa)
```

---

## 1. Rendimiento y acceso

La aplicación está en línea, se abre con una URL y no se cae al usarla.

- **Una URL para todo.** El sitio, la app web y las encuestas cuelgan de
  `azure.piko.mugiware.com` y `api.piko.mugiware.com`. Cualquier ruta de la app
  (`/probar/app/practicar`, `/probar/app/musica/tululu`…) abre directo.
- **Carga rápida.** La app web sale minificada (`npm run web:sitio`). Nginx la
  comprime con gzip, usa HTTP/2 y deja guardar en caché un año los archivos con
  huella en el nombre, así la segunda visita casi no descarga nada.
- **No se cae.** Los contenedores se reinician solos (`restart: unless-stopped`).
  La API tiene `HEALTHCHECK` y Nginx no arranca hasta que la API está sana. Un
  límite de 10 pedidos por segundo por IP protege la API de abusos.
- **Vigilado.** Azure Monitor y una prueba de disponibilidad sobre `/api/salud`
  avisan si deja de responder ([paso 8](../despliegue/README.md#8-monitoreo)).

## 2. Seguridad (HTTPS)

- Certificados de **Let's Encrypt** emitidos en el propio servidor, para los dos
  dominios, y renovados solos por el contenedor `certbot` cada 12 horas.
- Todo lo que llega por HTTP se redirige con `301` a HTTPS.
- Solo TLS 1.2 y 1.3, y HSTS en las respuestas
  ([`nginx/snippets/tls.conf`](../despliegue/nginx/snippets/tls.conf)).
- Un nombre que no es nuestro (escaneos por IP) se corta sin responder (`444`).

## 3. Flujo automático y errores amigables

Nadie ve un código de error ni una pantalla técnica:

| Si pasa esto | La persona ve |
|---|---|
| Una dirección que no existe en el sitio o en la app web | [`web/404.html`](../web/404.html): "Esta página se fue volando", con Piko y botones para volver |
| El servidor falla (500, 502, 503, 504) | [`web/50x.html`](../web/50x.html): "Piko se tomó un descanso", con un botón para probar de nuevo |
| La API no responde o se piden demasiadas cosas | JSON con un mensaje para la persona, que la encuesta y el panel muestran tal cual |
| Falla algo dentro de la API | `{"error": "Algo se rompió de nuestro lado."}`; el detalle técnico va solo al registro |
| Se cae la señal al mandar una encuesta | La respuesta queda guardada en el teléfono y se manda sola cuando vuelve |
| La sesión del panel vence | Vuelve a pedir la contraseña: "La sesión venció o no es válida. Entrá de nuevo." |

Las dos páginas reutilizan la barra, el pie, los colores y la mascota del sitio.
Netlify usa `404.html` por su cuenta; en Azure lo hace Nginx
([`piko.conf.template`](../despliegue/nginx/piko.conf.template)).

El sistema corre de principio a fin sin ayuda técnica: las migraciones de la base
se aplican solas al arrancar, los certificados se renuevan solos y cada merge a
`main` se despliega solo (punto 5).

## 4. Integraciones: JWT, base de datos y APIs externas

**JWT.** El panel de las encuestas ya no viaja con la contraseña en cada pedido:

1. `POST /api/admin/sesion` con `{ "clave": "<ADMIN_TOKEN>" }`.
2. La API responde `{ "token": "<JWT>", "expira": "…" }`. Es un JWT **HS256** que
   vence a las **8 horas**, firmado con `JWT_SECRET`
   ([`encuestas/src/jwt.js`](../encuestas/src/jwt.js), con Web Crypto y sin
   dependencias, igual en Azure y en Cloudflare).
3. Todo `/api/admin/*` exige `Authorization: Bearer <JWT>`. Se rechazan los JWT
   alterados, vencidos, firmados con otra clave o con `alg: none`.
4. Las contraseñas y los JWT equivocados cuentan para el bloqueo: 10 intentos
   fallidos en 15 minutos bloquean la IP, aunque después acierte.

El panel ([`public/js/admin.js`](../encuestas/public/js/admin.js)) y las
herramientas (`npm run publicar`, `npm run codigos`) entran así; solo guardan el
JWT, nunca la contraseña.

**Base de datos.** libSQL (SQLite por red) en su propio contenedor y volumen, sin
puertos hacia afuera. La API habla con ella con la misma interfaz de D1
([`servidor/d1-libsql.mjs`](../encuestas/servidor/d1-libsql.mjs)), así el mismo
código corre en Azure y en Cloudflare.

**APIs externas.** Resend manda el correo con el enlace de descarga de la app a
quien deja su dirección. CORS solo para los orígenes de `CORS_ORIGINS`, y nunca en
`/api/admin/*`. La portada consume `/api/publico/contador` en vivo.

**Pruebas.** 84 pruebas sobre la API corren en cada PR (`npm run prueba` en
`encuestas/`), incluidas las del JWT: sin JWT, alterado, `alg: none`, otro
secreto, vencido y el bloqueo por IP.

## 5. Código vinculado a GitHub

El código que corre en Azure es el de `main`, y se puede comprobar:

- **Despliegue automático.** [`.github/workflows/desplegar.yml`](../.github/workflows/desplegar.yml)
  corre cuando CI pasa en `main`: entra por SSH con una llave solo para eso y
  ejecuta [`despliegue/actualizar.sh`](../despliegue/actualizar.sh), que deja el
  servidor en `git reset --hard origin/main` y reconstruye los contenedores.
- **Comprobación en vivo.** El mismo workflow pide
  `https://azure.piko.mugiware.com/version.json` y
  `https://api.piko.mugiware.com/api/salud` y falla si el commit que dicen no es
  el de GitHub. También revisa que HTTP lleve a HTTPS y que el 404 sea el amigable.
- **Nada a mano en el servidor.** Solo `despliegue/.env`, con los secretos, vive
  fuera de git.

### Cómo comprobarlo

```bash
git ls-remote https://github.com/dnnyhr/Piko-Aplicacion-para-el-aprendizaje-de-idiomas-.git main
```

```bash
curl -s https://azure.piko.mugiware.com/version.json
```

```bash
curl -s https://api.piko.mugiware.com/api/salud
```

Los tres tienen que mostrar el mismo commit.

```bash
curl -sI http://azure.piko.mugiware.com/ | head -3
```

```bash
curl -s https://azure.piko.mugiware.com/no-existe | grep -o 'Esta página se fue volando'
```

```bash
curl -s -X POST https://api.piko.mugiware.com/api/admin/sesion -H 'content-type: application/json' -d '{"clave":"mala"}'
```

---

## Archivos de este sprint

| Archivo | Qué cambió |
|---|---|
| `encuestas/src/jwt.js` | Firmar y verificar JWT HS256 |
| `encuestas/src/index.js` | `POST /api/admin/sesion`, `/api/admin/*` con JWT, versión en `/api/salud` |
| `encuestas/public/js/admin.js` | El panel entra con JWT y vuelve a pedir la contraseña si vence |
| `encuestas/herramientas/sesion.mjs` | Las herramientas de línea de comandos entran con JWT |
| `encuestas/test/` | Pruebas del JWT y de la versión |
| `web/404.html`, `web/50x.html` | Páginas de error amigables |
| `despliegue/nginx/piko.conf.template` | Usa esas páginas, JSON cuando la API falla, `version.json` sin caché |
| `despliegue/actualizar.sh` | El servidor igual a `origin/main`, con el commit anotado |
| `.github/workflows/desplegar.yml` | Despliegue automático y comprobación en vivo |
