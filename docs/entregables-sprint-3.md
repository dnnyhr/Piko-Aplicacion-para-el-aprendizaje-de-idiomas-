# Sprint 3 · Entregables

Las encuestas de Piko en producción sobre Azure: en línea, con HTTPS, sin
pantallas técnicas, con sesiones JWT y con el servidor igual a `main` de GitHub.

| Dirección | Qué sirve | Dónde corre |
|---|---|---|
| https://api.piko.mugiware.com | Las encuestas, el panel (`/admin.html`) y su API | **Azure** (VM + Docker + Nginx) |
| https://piko.mugiware.com | El sitio y la app web, que piden el contador en vivo a la API | Netlify |

La guía completa del servidor, paso a paso, está en [`despliegue/README.md`](../despliegue/README.md).

```
Internet ──443──▶ Nginx ── api.piko.mugiware.com ──▶ api:8787 (Node) ──▶ db:8080 (libSQL)
  (HTTPS, único     │  estilos y dibujos directo      JWT · CORS          volumen propio
   puerto abierto)  └─ si la API cae: 50x.html           └──▶ Resend (correo, API externa)
```

---

## 1. Rendimiento y acceso

Las encuestas están en línea, se abren con una URL y no se caen al usarlas.

- **Una URL.** `https://api.piko.mugiware.com` abre la encuesta principal;
  `/e/` lista las abiertas y `/e/<nombre>` abre una. El sitio enlaza ahí.
- **Carga rápida.** Nginx comprime con gzip, usa HTTP/2 y sirve directo los
  estilos y los dibujos, sin pasar por Node. La página pesa poco y está pensada
  para teléfonos de gama baja con poca señal (mobile first, 360 px).
- **No se cae.** Los contenedores se reinician solos (`restart: unless-stopped`).
  La API tiene `HEALTHCHECK` y Nginx no arranca hasta que la API está sana. Un
  límite de 10 pedidos por segundo por IP la protege de abusos.
- **Vigilado.** Azure Monitor y una prueba de disponibilidad sobre `/api/salud`
  avisan si deja de responder ([paso 8](../despliegue/README.md#8-monitoreo)).

## 2. Seguridad (HTTPS)

- Certificado de **Let's Encrypt** emitido en el propio servidor y renovado solo
  por el contenedor `certbot` cada 12 horas.
- Todo lo que llega por HTTP se redirige con `301` a HTTPS.
- Solo TLS 1.2 y 1.3, y HSTS en todas las respuestas
  ([`nginx/snippets/tls.conf`](../despliegue/nginx/snippets/tls.conf)).
- Un nombre que no es nuestro (escaneos por IP) se corta sin responder (`444`).

## 3. Flujo automático y errores amigables

Nadie ve un código de error ni una pantalla técnica:

| Si pasa esto | La persona ve |
|---|---|
| La API se cae o no responde (502, 503, 504) | [`encuestas/public/50x.html`](../encuestas/public/50x.html): "Piko se tomó un descanso", con el estilo de las encuestas y un botón para probar de nuevo. Nginx la sirve aunque Node esté caído |
| Un enlace a una encuesta que no existe o ya cerró | "No encontramos esa encuesta", con Piko y un botón a las encuestas abiertas |
| La API no responde o se piden demasiadas cosas | JSON con un mensaje para la persona, que la encuesta y el panel muestran tal cual |
| Falla algo dentro de la API | "Algo se rompió de nuestro lado."; el detalle técnico va solo al registro |
| Se cae la señal al mandar una encuesta | La respuesta queda guardada en el teléfono y se manda sola cuando vuelve |
| La sesión del panel vence | Vuelve a pedir la contraseña: "La sesión venció o no es válida. Entrá de nuevo." |

Antes, la encuesta y el panel podían mostrar "Error 4xx" si la API no mandaba
mensaje; ahora siempre hay una frase en español.

El sitio en Netlify también tiene su página 404 ([`web/404.html`](../web/404.html)):
"Esta página se fue volando", con la barra, el pie y la mascota del sitio.

Todo corre de principio a fin sin ayuda técnica: las migraciones de la base se
aplican solas al arrancar, el certificado se renueva solo y cada merge a `main`
se despliega solo (punto 5).

## 4. Integraciones: JWT, base de datos y APIs externas

**JWT.** El panel de las encuestas ya no viaja con la contraseña en cada pedido:

1. `POST /api/admin/sesion` con `{ "clave": "<ADMIN_TOKEN>" }`.
2. La API responde `{ "token": "<JWT>", "expira": "…" }`. Es un JWT **HS256** que
   vence a las **8 horas**, firmado con `JWT_SECRET`
   ([`encuestas/src/jwt.js`](../encuestas/src/jwt.js), con Web Crypto y sin
   dependencias).
3. Todo `/api/admin/*` exige `Authorization: Bearer <JWT>`. Se rechazan los JWT
   alterados, vencidos, firmados con otra clave o con `alg: none`.
4. Las contraseñas y los JWT equivocados cuentan para el bloqueo: 10 intentos
   fallidos en 15 minutos bloquean la IP, aunque después acierte.

El panel ([`public/js/admin.js`](../encuestas/public/js/admin.js)) y las
herramientas (`npm run publicar`, `npm run codigos`) entran así y solo guardan
el JWT, nunca la contraseña.

**Base de datos.** libSQL (SQLite por red) en su propio contenedor y volumen, sin
puertos hacia afuera. La API habla con ella con la misma interfaz de D1
([`servidor/d1-libsql.mjs`](../encuestas/servidor/d1-libsql.mjs)).

**APIs externas.** Resend manda el correo con el enlace de descarga de la app a
quien deja su dirección. El sitio de Netlify consume `/api/publico/contador` en
vivo, con CORS solo para `piko.mugiware.com` y nunca en `/api/admin/*`. La app
canjea códigos de logros en `/api/canjes`.

**Pruebas.** 84 pruebas sobre la API corren en cada PR (`npm run prueba` en
`encuestas/`), incluidas las del JWT: sin JWT, alterado, `alg: none`, otro
secreto, vencido y el bloqueo por IP.

## 5. Código vinculado a GitHub

El código que corre en Azure es el de `main`, y se puede comprobar:

- **Despliegue automático.** [`.github/workflows/desplegar.yml`](../.github/workflows/desplegar.yml)
  corre cuando CI pasa en `main`: entra por SSH con una llave solo para eso y
  ejecuta [`despliegue/actualizar.sh`](../despliegue/actualizar.sh). Ese script
  deja el servidor en `git reset --hard origin/main`, reconstruye los
  contenedores y recarga Nginx solo si la configuración nueva pasa `nginx -t`.
- **Comprobación en vivo.** El mismo workflow pide `/api/salud` y falla si el
  commit que dice no es el de GitHub. También revisa que HTTP lleve a HTTPS y
  que los errores salgan con mensaje.
- **CI antes de llegar.** Cada PR levanta la API con la base real en Docker,
  prueba CORS y corre `nginx -t` con la plantilla de producción.
- **Nada a mano en el servidor.** Solo `despliegue/.env`, con los secretos, vive
  fuera de git.

### Cómo comprobarlo

Estos dos comandos tienen que mostrar el mismo commit:

```bash
git ls-remote https://github.com/dnnyhr/Piko-Aplicacion-para-el-aprendizaje-de-idiomas-.git main
```

```bash
curl -s https://api.piko.mugiware.com/api/salud
```

HTTP lleva a HTTPS:

```bash
curl -sI http://api.piko.mugiware.com/ | head -3
```

Una contraseña equivocada da un mensaje, no un código:

```bash
curl -s -X POST https://api.piko.mugiware.com/api/admin/sesion -H 'content-type: application/json' -d '{"clave":"mala"}'
```

Sin JWT el panel no responde:

```bash
curl -s https://api.piko.mugiware.com/api/admin/encuestas
```

---

## Archivos de este sprint

| Archivo | Qué cambió |
|---|---|
| `encuestas/src/jwt.js` | Firmar y verificar JWT HS256 |
| `encuestas/src/index.js` | `POST /api/admin/sesion`, `/api/admin/*` con JWT, versión en `/api/salud` |
| `encuestas/servidor/node.mjs` | Pasa `JWT_SECRET` y `VERSION` a la API |
| `encuestas/public/js/admin.js` | El panel entra con JWT y vuelve a pedir la contraseña si vence |
| `encuestas/public/50x.html` | La página de "volvemos enseguida" |
| `encuestas/herramientas/sesion.mjs` | Las herramientas de línea de comandos entran con JWT |
| `encuestas/test/` | Pruebas del JWT y de la versión |
| `web/404.html` | La página 404 del sitio |
| `despliegue/nginx/piko.conf.template` | Solo las encuestas; 50x amigable, JSON si la API falla, estáticos directo |
| `despliegue/actualizar.sh` | El servidor igual a `origin/main`, con el commit anotado |
| `.github/workflows/desplegar.yml` | Despliegue automático y comprobación en vivo |
