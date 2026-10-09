# Encuestas de Piko

Una página, muchas encuestas, en
[encuestas.piko.mugiware.com](https://encuestas.piko.mugiware.com). Corre en
**Cloudflare Workers** y guarda las respuestas en **D1**. Es la única parte de
Piko que corre en un servidor, y vive fuera del aula: ni la app ni el robot la
necesitan para funcionar (la app sólo la usa para canjear los códigos de
logros especiales, ver [Códigos de logros especiales](#códigos-de-logros-especiales)).
Hay dos encuestas:

- [`¿Qué le falta a Piko?`](definiciones/que-le-falta-a-piko.json): qué quiere
  la gente en la app y en el robot, el acompañante de aula que **guía, escucha
  y corrige con IA**. Es la principal: se abre en la raíz del dominio.
- [`Tu lengua en Piko`](definiciones/tu-lengua.json) (`/e/tu-lengua`): los
  hablantes escriben cómo se dicen palabras y frases en miskito, mayangna,
  rama, garífuna o kriol. Con eso se arman los paquetes de lecciones de la app
  (ver [Palabras para la app](#palabras-para-la-app)).

La página es **mobile first**: casi todas las personas la van a contestar con
el pulgar, en un teléfono de gama baja y con poca señal. Los estilos base son
para 360px, y las pantallas más grandes se agregan con `min-width` (640px y
960px).

```
encuestas/
├── definiciones/          una encuesta = un JSON (esto es lo que se edita)
├── migrations/            el esquema de D1 (0001 a 0006)
├── public/                la página: HTML, CSS, JS y los dibujos de Piko
│   ├── index.html         la encuesta y la lista de encuestas
│   ├── admin.html         el panel de resultados
│   ├── js/reglas.js       validación compartida por el navegador y el Worker
│   └── _headers           cabeceras de seguridad de los archivos estáticos
├── src/
│   ├── index.js           el Worker: API sobre D1 + sirve public/
│   ├── correo.js          el correo con el enlace de descarga (Resend)
│   ├── contactos.js       leer contactos pegados a mano en el panel
│   └── palabras.js        agrupar traducciones y armar los paquetes de la app
├── herramientas/          publicar.mjs (sube las definiciones) y animar-pikobot.mjs
└── test/                  pruebas en Node con un D1 falso sobre node:sqlite
```

Hace falta **Node 22 o más nuevo**: las pruebas usan `node:sqlite` para hacer
de D1.

## Poner en marcha

```bash
cd encuestas
npm install

# 1. La base de datos (una sola vez). Copiá el database_id que imprime
#    en wrangler.jsonc.
npx wrangler d1 create piko-encuestas
npm run db:remoto

# 2. El secreto para publicar encuestas y ver resultados
npx wrangler secret put ADMIN_TOKEN

# 3. Subir el Worker
npm run deploy

# 4. Publicar las encuestas de definiciones/
PIKO_ENCUESTAS_URL=https://encuestas.piko.mugiware.com \
PIKO_ENCUESTAS_TOKEN=<el ADMIN_TOKEN> \
npm run publicar
```

En Windows (PowerShell) las variables van en líneas aparte:

```powershell
$env:PIKO_ENCUESTAS_URL = "https://encuestas.piko.mugiware.com"
$env:PIKO_ENCUESTAS_TOKEN = "<el ADMIN_TOKEN>"
npm run publicar tu-lengua        # o sin nombre, para publicar todas
```

Cada vez que baja código nuevo: `git pull`, `npm run db:remoto` (si hay
migraciones nuevas; no toca los datos) y `npm run deploy`. Publicar hace falta
solo cuando cambia algo en `definiciones/`.

La encuesta que se abre en la raíz del dominio es `ENCUESTA_PRINCIPAL`, en
`vars` de `wrangler.jsonc`.

El dominio está fijo en `routes` de `wrangler.jsonc` (`custom_domain: true`), y
Cloudflare lo crea solo en el primer `deploy`. La dirección `*.workers.dev` y
las URLs de vista previa están **apagadas a propósito** (`workers_dev` y
`preview_urls` en `false`). Si montás tu propia copia en otra cuenta, cambiá el
`pattern` de `routes` por un dominio tuyo, o poné `workers_dev: true` y usá la
dirección `https://piko-encuestas.<tu-cuenta>.workers.dev`.

### En local

```bash
cp .dev.vars.example .dev.vars      # ADMIN_TOKEN=cambiame-en-local
npm run db:local
npm run dev                         # http://localhost:8787

# en otra terminal
PIKO_ENCUESTAS_URL=http://localhost:8787 PIKO_ENCUESTAS_TOKEN=cambiame-en-local npm run publicar
```

### En un servidor propio (Azure)

Las mismas encuestas corren también en Node, detrás de Nginx y con la base en
un contenedor de libSQL: `servidor/node.mjs` le arma al Worker lo que
Cloudflare le daba hecho (`env.DB` sobre libSQL, `env.ASSETS` sobre `public/`
y las variables desde el `.env`), sin cambiar `src/index.js`. La guía completa
está en [`despliegue/`](../despliegue/README.md). Para probarlo en local, con un
SQLite en un archivo:

```bash
DB_URL=file:encuestas.db ADMIN_TOKEN=cambiame-en-local-123 npm run servir
```

`GET /api/publico/contador` devuelve solo conteos (`{ personas, palabras }`)
y es la única ruta con CORS: lo da exactamente a los orígenes de
`CORS_ORIGINS`, para que la portada del sitio muestre el contador en vivo.

## Correo con el enlace de descarga

Si la persona deja su correo al final de la encuesta, el Worker le manda al
instante un correo con el enlace para descargar la app (vía
[Resend](https://resend.com)). El correo sale después de guardar la
respuesta: si Resend falla, la respuesta queda guardada igual.

- **Una vez por respuesta.** Reenviar la misma respuesta no manda otro correo,
  y a Resend le llega una clave de idempotencia por si hay reintentos.
- **Personalizado.** Si escribió su nombre, lo usa. Si no, lo intenta sacar del
  correo solo cuando tiene forma de nombre (`maria.lopez@…` → "Maria"); con
  números o direcciones de un puesto (`info@`, `ventas@`) saluda sin nombre.
- **Registro.** Cada envío queda en la tabla `correos` con su estado
  (`enviado`, `error` u `omitido`), el motivo si falló y cuántos intentos van.
- **Reenvíos desde `/admin`.** La sección *Correos* lista cada dirección con
  su estado. "Intentar de nuevo" reenvía uno; "Reenviar los que no llegaron"
  reintenta los fallidos y los que quedaron sin enviar, de a 20 y con una
  pausa entre cada uno para no pasar el límite de Resend. Cada reenvío es un
  intento nuevo (con su propia clave de idempotencia), así que sí sale.
- **Plantilla:** `src/correo.js` (HTML y texto). La cabecera es
  `public/img/correo-cabecera.jpg`: los correos no muestran SVG.

- **Contactos agregados a mano.** En `/admin`, la sección *Contactos agregados
  a mano* sirve para los que dejaron su correo o número antes de que
  existiera el correo automático (por ejemplo en la pregunta "contacto" de
  una versión anterior) o por fuera de la encuesta. "Traer los contactos
  viejos de la encuesta" llena el cuadro con lo que la gente escribió en
  preguntas de versiones anteriores que tenga pinta de correo o número; se
  revisa y se agrega. Uno por línea, con nombre opcional (`Ana López,
  ana@correo.com`); los repetidos no entran dos veces y, si se marca la
  casilla, a los que tienen correo les llega el enlace. Van en la tabla
  `contactos` (migración 0004), aparte de las respuestas: no cuentan en las
  estadísticas.

Para activarlo:

```bash
npm run db:remoto                          # tablas correos, contactos, intentos_admin y confirmaciones (migraciones 0002 a 0006)
npx wrangler secret put RESEND_API_KEY     # la API key de Resend
```

y en `wrangler.jsonc`, dentro de `vars`, `CORREO_REMITENTE` (una dirección de
un dominio verificado en Resend, por ejemplo `Piko <piko@mugiware.com>`) y
`APP_DESCARGA_URL`. Opcionales: `CORREO_RESPUESTA` (a dónde llegan las
respuestas al correo) y `CORREOS_POR_DIA` (el tope diario, 100 si no se pone).
Después `npm run deploy`. Mientras falte algo, no se manda
nada y el motivo queda en la tabla `correos`.

Para ver cómo salieron:

```bash
npx wrangler d1 execute piko-encuestas --remote --command "SELECT estado, detalle, creado_en FROM correos ORDER BY creado_en DESC LIMIT 20"
```

## Vista previa al compartir

Al pegar el enlace en WhatsApp, Facebook o X aparece la imagen de la encuesta
(`imagen` en su definición; si no tiene, `public/img/og.jpg`) con su título.
La lista `/e/` usa `public/img/og-encuestas.jpg`. Esas apps no ejecutan JavaScript ni
aceptan direcciones relativas, así que el Worker atiende `/`, `/e/` y
`/e/<slug>` (ver `run_worker_first` en `wrangler.jsonc`) y completa las etiquetas Open
Graph con el dominio desde el que se abrió la página y con el título y la
descripción de esa encuesta. Por eso funciona en cualquier dominio donde se
publique, sin tocar el HTML.

## Pikobot animado

`public/img/pikobot.svg` es el dibujo del equipo y no se toca. Las versiones
animadas (alas que aletean, luces que laten y la pantalla cambiando de cara
con las expresiones de `robot/panel/public/caras/`) se generan desde ahí:

```bash
node herramientas/animar-pikobot.mjs
```

Salen `pikobot-animado.svg` (mira a los lados, parpadea, guiña, festeja) y
`pikobot-celebra.svg` (para la pantalla final). El guion de expresiones está
al principio del script. Si el teléfono pide menos movimiento, Pikobot se
queda quieto mirando de frente.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | La encuesta principal (`ENCUESTA_PRINCIPAL` en `wrangler.jsonc`). Sin principal: la lista, o directo a la única abierta |
| `/e/` | Todas las encuestas abiertas, cada una con su imagen; marca las que ya se respondieron en ese teléfono. Al final de cada encuesta, "Ver más encuestas" lleva acá |
| `/e/<slug>` | La encuesta. `?origen=whatsapp` queda guardado con la respuesta, para saber qué enlace funcionó mejor |
| `/admin` | El panel (ver [El panel](#el-panel)). Pide el `ADMIN_TOKEN` |
| `GET /api/encuestas/<slug>` | Definición vigente |
| `POST /api/encuestas/<slug>/respuestas` | Guardar una respuesta |
| `PUT /api/admin/encuestas/<slug>` | Publicar o actualizar una definición |
| `POST /api/admin/encuestas/<slug>/estado` | Abrirla, cerrarla o pasarla a borrador (el panel lo usa) |
| `GET /api/admin/encuestas/<slug>/resumen` | Agregados por pregunta |
| `GET /api/admin/encuestas/<slug>/csv` | Todas las respuestas, una fila por persona |
| `GET /api/admin/encuestas/<slug>/correos` · `POST …/correos/reenviar` | Los correos enviados y reenviar los que fallaron |
| `GET` · `POST /api/admin/encuestas/<slug>/contactos` | Contactos agregados a mano |
| `GET /api/admin/encuestas/<slug>/palabras` | Traducciones agrupadas por palabra, lengua y zona |
| `POST …/palabras/confirmar` · `GET …/palabras/exportar?grupo=` | Confirmar una traducción; descargar lo confirmado y los paquetes |
| `POST /api/canjes` | Canjear el código de una tarjeta de logro especial (lo llama la app; ver [Códigos de logros especiales](#códigos-de-logros-especiales)) |
| `POST` · `GET /api/admin/codigos` | Crear una tanda de códigos; verlos con su estado, quién los canjeó y cuándo |

El panel y las herramientas entran con `POST /api/admin/sesion` y `{ "clave": "<ADMIN_TOKEN>" }`: a cambio reciben un **JWT** (HS256, 8 horas, ver `src/jwt.js`). Todas las de `/api/admin/` piden `Authorization: Bearer <JWT>`; la contraseña sola no abre nada. Los JWT se firman con `JWT_SECRET` (secreto opcional, 32 caracteres o más) o, si no está, con uno que sale de `ADMIN_TOKEN`: cambiar la contraseña cierra todas las sesiones. Las contraseñas y los JWT equivocados cuentan para el bloqueo por IP.

## Códigos de logros especiales

Los logros especiales de la app (el de Hackathon Nicaragua 2026, y los que
vengan de concursos, escuelas o colaboraciones) no se ganan jugando: se
canjean con el código de una tarjeta impresa. Cada tarjeta trae un código
distinto, y cada código sirve **una sola vez en todos los teléfonos**. Eso es
lo único que la app no puede saber sola, y por eso vive acá, en la tabla
`codigos` de D1 (migración 0007): el código, su estado (`disponible` o
`utilizado`), el logro que desbloquea, la tanda, quién lo canjeó (el id del
estudiante en la app, el teléfono y el nombre si está en una clase) y cuándo.

Los códigos tienen la forma `PIKO-HK26-7KQ2-M9XA`: `PIKO`, el evento (4
caracteres) y 8 al azar. Sin I, L, O ni U, para que no se confundan al
copiarlos; si alguien escribe O o I igual se leen como 0 y 1. Probar códigos
al azar no sirve: son 40 bits, y después de 10 códigos que no existen en 15
minutos esa IP queda bloqueada un rato.

```bash
cd encuestas
npm run db:remoto            # la primera vez: crea la tabla codigos

# Una tanda de 300 tarjetas para Hackathon Nicaragua 2026.
# --logro es el id del logro en app/src/core/logros/catalogo.ts.
PIKO_ENCUESTAS_URL=https://encuestas.piko.mugiware.com PIKO_ENCUESTAS_TOKEN=... \
  npm run codigos -- crear --lote hackathon-2026 --logro piko-hackathon-2026 --evento HK26 --cantidad 300
# → codigos-hackathon-2026.csv, uno por línea, para mandar a imprimir

# Cuántos se canjearon, y un CSV con cada código, su estado, quién y cuándo
PIKO_ENCUESTAS_URL=... PIKO_ENCUESTAS_TOKEN=... npm run codigos -- ver --lote hackathon-2026
```

Los CSV no se suben al repositorio (están en `.gitignore`): quien tenga un
código disponible puede canjearlo. Cargar dos veces la misma tanda no libera
los ya canjeados.

Un logro especial nuevo: se agrega en `app/src/core/logros/catalogo.ts` con
`tipo: 'especial'` y `condicion: { tipo: 'codigo' }`, se publica la app, y
recién entonces se crea su tanda con ese mismo `--logro`. Una app vieja que
recibe un logro que no conoce le pide al niño que la actualice, y el código
**ya queda canjeado a su nombre**: conviene repartir las tarjetas después de
que la versión nueva esté en los teléfonos.

## El panel

`/admin`, con la contraseña del panel (`ADMIN_TOKEN`):

- **Encuestas:** una tarjeta por encuesta con su imagen, estado y respuestas.
  Tocar una la abre; su botón la **cierra**, la **abre** o **publica** un
  borrador (con aviso antes). La principal lleva la etiqueta "Principal".
- **Resumen:** respuestas por día, quién respondió, NPS, lo mejor valorado y lo
  más elegido en cada pregunta.
- **Preguntas:** cada pregunta en una tarjeta plegable con su gráfica, filtradas
  por sección.
- **Palabras** (solo en encuestas con preguntas `traducir`): ver
  [Palabras para la app](#palabras-para-la-app).
- **Correos** y **Contactos** (solo en encuestas que mandan correo): estado de
  cada envío, reenvíos y contactos agregados a mano.
- **Descargar respuestas:** el CSV de la encuesta elegida.

## Hacer una encuesta nueva

1. Copiá `definiciones/que-le-falta-a-piko.json` a `definiciones/<slug>.json`
   (el nombre del archivo tiene que ser el slug).
2. Cambiá el contenido. Empezá con `"estado": "borrador"`: un borrador solo
   lo ve quien manda el token. Para que se reconozca al compartirla y en la
   lista de `/e/`, dale su propia imagen de 1200×630: guardala en
   `public/img/` y poné `"imagen": "/img/og-<slug>.jpg"` (sin imagen usa
   `og.jpg`).
3. `npm run validar` revisa que esté bien armada (CI lo corre en cada PR).
4. `npm run publicar <slug>`. Cuando esté lista, pasá a `"abierta"` y publicá
   de nuevo; para cerrarla, `"cerrada"`.

También se puede abrir, cerrar o publicar un borrador desde `/admin`, con el
botón de la tarjeta de cada encuesta, sin tocar el JSON. Ojo: `npm run
publicar` vuelve a poner el estado que diga el archivo, así que si cerraste
una desde el panel, cambiá también su `"estado"` antes de publicarla otra vez.

No hace falta tocar código ni el esquema.

### Tipos de pregunta

| `tipo` | Para qué | Campos |
|---|---|---|
| `unica` | Una opción | `opciones` |
| `multiple` | Varias opciones | `opciones`, `min`, `max` |
| `escala` | Un número (1–5, 0–10…) | `min`, `max`, `etiquetaMin`, `etiquetaMax` |
| `matriz` | Una escala por fila | `filas`, `escala: { min, max, etiquetaMin, etiquetaMax }` |
| `texto` | Texto libre | `multilinea`, `max`, `placeholder` |
| `traducir` | Escribir cómo se dicen las cosas de un `banco`. La persona elige una parte (`cuantas`, distintas para cada quien) o todas; si hizo una parte, al final de la encuesta se le ofrece completar todo | `banco: [{ id, texto, tema }]`, `cuantas`, `temas`, `max`, `lengua` y `zona` (ids de preguntas de opción única anteriores). En el texto, `{lengua}` se cambia por la lengua elegida |

Todas aceptan `requerida`, `ayuda` y `mostrarSi: { "pregunta": "rol", "en": ["docente"] }`
para mostrarse solo según una respuesta anterior. Una opción con `"otro": true`
abre un campo para escribir.

Cada sección puede traer `piko: { cara, dice }` (lo que dice Piko al empezarla;
`cara` es `saludo`, `feliz`, `pensando`, `guino` o `robot`) y `concepto`, la
tarjeta para presentar una idea antes de preguntar (así se presenta el robot).

### Cambiar una encuesta que ya está abierta

Publicar una definición con preguntas distintas crea una **versión nueva**; si
solo cambia el estado, no. Cada respuesta guarda con qué versión se contestó y
se valida contra esa, así que quien empezó antes del cambio puede terminar sin
problemas. Para no romper los agregados, **no reutilices el id de una pregunta
u opción con otro significado**: agregá uno nuevo.

## Palabras para la app

"Tu lengua en Piko" llena los paquetes de `app/content/packs/`, que hoy están
vacíos. El recorrido:

1. **Recolectar.** Cada persona elige: una parte (10 palabras de distintos
   temas y 3 frases) o todo (las 120 palabras por tema y las 15 frases). Si
   hizo una parte, al final, antes de enviar, una pantalla le ofrece dos
   botones: "Completar todo" (vuelve con todas, sin perder lo escrito) o
   "Terminar la encuesta". Las 10 de la parte son distintas para cada
   quien: así entre todos se cubre el banco y la misma palabra la contestan
   varias personas.
2. **Revisar.** En `/admin`, la pestaña **Palabras** agrupa lo que escribió la
   gente por palabra y por lengua ("Li" y "li." cuentan como lo mismo) y dice
   cuántas personas y de cuántas zonas coinciden. Es **probable** cuando la
   escribieron igual 3 personas o más, de 2 zonas o más. Quien habla la lengua
   la **confirma**; se pueden confirmar varias formas si cambian según la zona.
3. **Exportar.** "Descargar para la app" baja un JSON con lo confirmado de esa
   lengua y, si la lengua está en la app (miskito `miq`, mayangna `sum`, rama
   `rma`, garífuna `cab`), los **paquetes** ya en el formato de
   `app/src/core/content/schema.ts`: uno de opción múltiple por tema (hacen
   falta 2 palabras confirmadas en el tema) y uno de ordenar frases. El kriol
   todavía no está en la app: se descarga la lista, sin paquetes.

Solo se usa lo de quien respondió "Sí" en el permiso (`"permiso"` en la
definición); lo demás no aparece en Palabras ni se exporta. Las confirmaciones
van en la tabla `confirmaciones` (migración 0006).

Los ejercicios de escuchar necesitan grabaciones de hablantes: la encuesta
pregunta quién se anima a grabar y deja su WhatsApp para una segunda ronda.

## Cómo se guarda

- `encuestas` y `versiones_encuesta`: la definición como JSON versionado.
- `respuestas`: una fila por persona, con el JSON validado.
- `respuestas_items`: una fila por cosa contable (opción elegida, fila de
  matriz, número, texto). Así "¿cuántos pidieron X?" es un `GROUP BY` y
  sirve igual para cualquier encuesta futura.

```sql
-- ¿Qué pide la gente del robot, en promedio?
SELECT i.fila, ROUND(AVG(i.numero), 2) AS promedio, COUNT(*) AS n
  FROM respuestas_items i JOIN respuestas r ON r.id = i.respuesta_id
  JOIN encuestas e ON e.id = r.encuesta_id
 WHERE e.slug = 'que-le-falta-a-piko' AND i.pregunta = 'robot_funciones'
 GROUP BY i.fila ORDER BY promedio DESC;
```

## Pensada para la señal que hay

- Lo contestado se guarda en el teléfono a cada toque: se puede cerrar y seguir.
- Si al enviar no hay señal, la respuesta queda en cola y sale sola al volver.
- Cada respuesta lleva un id generado en el teléfono: reenviarla no la duplica.
- Si el servidor la rechaza por otro motivo, la pantalla lo dice ("No pudimos
  guardar tus respuestas"), con el motivo y un botón para probar de nuevo; lo
  contestado sigue en el teléfono.
- Al terminar, **"Otra persona va a responder en este teléfono"** deja el
  teléfono listo para la siguiente, para aulas con un solo teléfono.

## Seguridad

- **Panel:** `ADMIN_TOKEN` tiene que tener al menos 16 caracteres; con uno más
  corto el panel no abre y dice cómo cambiarlo. Una IP que prueba 10 tokens
  equivocados en 15 minutos queda bloqueada esos 15 minutos, aunque después
  acierte (tabla `intentos_admin`, migración 0005). El token vive solo en la
  pestaña del navegador y se borra al cerrarla.
- **Correo:** nadie puede usar la encuesta para mandar correos a direcciones
  ajenas: el envío automático sale una sola vez por día a cada dirección, y
  hay un tope diario (`CORREOS_POR_DIA`, 100 si no se pone). Lo que se frena
  queda como "Sin enviar" y se puede mandar desde el panel.
- **Respuestas:** hasta 60 por día desde un mismo lugar, 64 KB como máximo por
  envío, un campo trampa para bots, y el CSV protegido contra fórmulas.
- **Navegador:** todas las páginas y la API salen con Content-Security-Policy
  (solo scripts propios, nadie puede meter la página en un iframe), HSTS,
  `nosniff` y demás cabeceras. Las de los archivos estáticos están en
  `public/_headers`; las del Worker, en `src/index.js`. Si se agrega un
  script, una fuente o una imagen de otro dominio, hay que sumarlo a las dos.

## Privacidad

No se guarda la IP. Para frenar abusos se guarda un hash de IP + navegador que
cambia cada día y por encuesta (no sirve para seguir a nadie). Los datos
personales son todos opcionales: en "¿Qué le falta a Piko?", el correo y el
WhatsApp para probar la app; en "Tu lengua en Piko", el nombre para los
créditos y el WhatsApp de quien se anima a revisar o grabar. Salen en el CSV,
así que tratá ese archivo con cuidado.

## Consultas útiles

Desde la carpeta `encuestas`, con `npx wrangler d1 execute piko-encuestas
--remote --command "…"` (agregá `--json` para ver el resultado aunque esté
vacío):

```sql
-- Cuántas respuestas tiene cada encuesta
SELECT e.slug, COUNT(r.id) AS respuestas
  FROM encuestas e LEFT JOIN respuestas r ON r.encuesta_id = e.id GROUP BY e.slug;

-- De dónde son los que no recomiendan Piko (0 a 6, como el NPS del panel)
SELECT z.opcion AS lugar, COUNT(*) AS personas
  FROM respuestas_items n
  LEFT JOIN respuestas_items z ON z.respuesta_id = n.respuesta_id AND z.pregunta = 'region'
 WHERE n.pregunta = 'recomendar' AND n.numero BETWEEN 0 AND 6
 GROUP BY lugar ORDER BY personas DESC;

-- Las últimas respuestas de "Tu lengua en Piko" y cuántas palabras trajo cada una
SELECT r.creada_en,
       (SELECT COUNT(*) FROM respuestas_items i WHERE i.respuesta_id = r.id AND i.pregunta = 'palabras') AS palabras,
       (SELECT COUNT(*) FROM respuestas_items i WHERE i.respuesta_id = r.id AND i.pregunta = 'frases') AS frases
  FROM respuestas r JOIN encuestas e ON e.id = r.encuesta_id
 WHERE e.slug = 'tu-lengua' ORDER BY r.creada_en DESC LIMIT 10;
```

Si algo no se guarda, `npx wrangler tail` muestra en vivo cada pedido que
llega al Worker y sus errores.

## Pruebas

```bash
npm run prueba      # reglas, Worker, correo, contactos, palabras y seguridad contra un D1 en memoria
npm run validar     # las definiciones de definiciones/
```
