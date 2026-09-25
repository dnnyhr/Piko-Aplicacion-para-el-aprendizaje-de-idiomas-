# Encuestas de Piko

Una página, muchas encuestas. Corre en **Cloudflare Workers** y guarda las
respuestas en **D1**. Hay dos:

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
├── definiciones/        una encuesta = un JSON (esto es lo que se edita)
├── migrations/          el esquema de D1
├── public/              la página: HTML, CSS, JS y los dibujos de Piko
│   └── js/reglas.js     validación compartida por el navegador y el Worker
├── src/index.js         el Worker: API sobre D1 + sirve public/
├── herramientas/        publicar.mjs: sube las definiciones al Worker
└── test/                pruebas en Node con un D1 falso sobre node:sqlite
```

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
PIKO_ENCUESTAS_URL=https://piko-encuestas.<tu-cuenta>.workers.dev \
PIKO_ENCUESTAS_TOKEN=<el ADMIN_TOKEN> \
npm run publicar
```

Para un dominio propio (por ejemplo `encuestas.piko.mugiware.com`), agregá
una *Custom Domain* al Worker desde el panel de Cloudflare.

### En local

```bash
cp .dev.vars.example .dev.vars      # ADMIN_TOKEN=cambiame-en-local
npm run db:local
npm run dev                         # http://localhost:8787

# en otra terminal
PIKO_ENCUESTAS_URL=http://localhost:8787 PIKO_ENCUESTAS_TOKEN=cambiame-en-local npm run publicar
```

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
`APP_DESCARGA_URL`. Después `npm run deploy`. Mientras falte algo, no se manda
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
descripción de esa encuesta. Funciona igual en `workers.dev` y en un dominio
propio.

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
| `/admin` | Resultados en pestañas (Resumen, Preguntas, Correos, Contactos) con gráficas, filtros, buscador y descarga en CSV (pide el `ADMIN_TOKEN`) |
| `GET /api/encuestas/<slug>` | Definición vigente |
| `POST /api/encuestas/<slug>/respuestas` | Guardar una respuesta |
| `PUT /api/admin/encuestas/<slug>` | Publicar o actualizar una definición |
| `GET /api/admin/encuestas/<slug>/resumen` | Agregados por pregunta |
| `GET /api/admin/encuestas/<slug>/csv` | Todas las respuestas, una fila por persona |

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

No hace falta tocar código ni el esquema.

### Tipos de pregunta

| `tipo` | Para qué | Campos |
|---|---|---|
| `unica` | Una opción | `opciones` |
| `multiple` | Varias opciones | `opciones`, `min`, `max` |
| `escala` | Un número (1–5, 0–10…) | `min`, `max`, `etiquetaMin`, `etiquetaMax` |
| `matriz` | Una escala por fila | `filas`, `escala: { min, max, etiquetaMin, etiquetaMax }` |
| `texto` | Texto libre | `multilinea`, `max`, `placeholder` |
| `traducir` | A cada persona le tocan `cuantas` cosas al azar de un `banco` y escribe cómo se dicen | `banco: [{ id, texto, tema }]`, `cuantas`, `temas`, `max`, `lengua` y `zona` (ids de preguntas de opción única anteriores). En el texto, `{lengua}` se cambia por la lengua elegida |

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

1. **Recolectar.** A cada persona le tocan 10 palabras (de un banco de 120, por
   temas) y 3 frases (de 15), al azar. Así nadie se cansa, entre todos se
   cubre el banco, y la misma palabra la contestan varias personas.
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
cambia cada día y por encuesta (no sirve para seguir a nadie). La única
pregunta con datos personales es el contacto opcional para probar Piko: sale
en el CSV, así que tratá ese archivo con cuidado.

## Pruebas

```bash
npm run prueba      # reglas + Worker completo contra un D1 en memoria
npm run validar     # las definiciones de definiciones/
```
