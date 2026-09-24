# Encuestas de Piko

Una página, muchas encuestas. Corre en **Cloudflare Workers** y guarda las
respuestas en **D1**. La primera encuesta es
[`¿Qué le falta a Piko?`](definiciones/que-le-falta-a-piko.json): qué quiere la
gente en la app y en el robot, el acompañante de aula que **guía, escucha y
corrige con IA**.

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

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Lista de encuestas abiertas (si hay una sola, entra directo) |
| `/e/<slug>` | La encuesta. `?origen=whatsapp` queda guardado con la respuesta, para saber qué enlace funcionó mejor |
| `/admin` | Resultados con barras y descarga en CSV (pide el `ADMIN_TOKEN`) |
| `GET /api/encuestas/<slug>` | Definición vigente |
| `POST /api/encuestas/<slug>/respuestas` | Guardar una respuesta |
| `PUT /api/admin/encuestas/<slug>` | Publicar o actualizar una definición |
| `GET /api/admin/encuestas/<slug>/resumen` | Agregados por pregunta |
| `GET /api/admin/encuestas/<slug>/csv` | Todas las respuestas, una fila por persona |

## Hacer una encuesta nueva

1. Copiá `definiciones/que-le-falta-a-piko.json` a `definiciones/<slug>.json`
   (el nombre del archivo tiene que ser el slug).
2. Cambiá el contenido. Empezá con `"estado": "borrador"`: un borrador solo
   lo ve quien manda el token.
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
