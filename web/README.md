# Sitio web

piko.mugiware.com. Es un sitio estático, sin paso de compilación: se sirve la
carpeta `web/` tal cual.

```
web/
├── index.html              portada (la de siempre, con la barra arriba)
├── diccionario/            buscar palabras en miskito o en español
├── probar/                 Piko en el navegador
│   └── app/                GENERADO: npm run web:sitio (expo export de app/)
├── docentes/               cómo dar una clase, y el miskito en 10 ideas
├── aporta/                 cómo ayudar, estado de cada lengua, palabras en revisión
├── datos/                  GENERADO: npm run contenido (diccionario y estado)
├── assets/
│   ├── css/nav.css         la barra y el pie, en todas las páginas
│   ├── css/sitio.css       las piezas de las páginas interiores
│   ├── css/portada.css     sólo la portada
│   ├── js/nav.js           arma la barra y el pie
│   ├── js/portada.js       animaciones y datos vivos de la portada (GSAP)
│   ├── js/diccionario.js   la búsqueda del diccionario
│   ├── js/aporta.js        el estado de cada lengua y los créditos
│   ├── img/                logos, la mascota y las fotos (WebP con JPEG de respaldo)
│   └── og/                 las imágenes para compartir (1200 × 630)
├── herramientas/og.mjs     genera assets/og/
├── sitemap.xml             GENERADO: npm run contenido
├── robots.txt · site.webmanifest
```

## ¿Qué edito?

| Quiero… | Voy a… |
|---|---|
| Cambiar un texto de una página | su `index.html` |
| Agregar una página | una carpeta con su `index.html` (copiar el `<head>` de otra), sumarla a `PAGINAS` en `assets/js/nav.js`, a `PAGINAS_DEL_SITIO` en `diccionario/herramientas/web.ts` y a `herramientas/og.mjs` |
| Corregir una palabra del diccionario | `diccionario/miskito/lexico.json` y `cd app && npm run contenido` (nunca `web/datos/`) |
| Actualizar Piko en el navegador | `cd app && npm run web:sitio` |
| Rehacer las imágenes para compartir | `npx -y -p playwright-core node web/herramientas/og.mjs` (con `app/node_modules` instalado) |

## Cada página interior

```html
<body class="pagina">
<div id="nav" data-pagina="diccionario" data-raiz="../"></div>
…
<div id="pie"></div>
<script src="../assets/js/nav.js"></script>
```

`data-raiz` es la ruta hasta `web/`, para que los enlaces funcionen en el
dominio y también abriendo el archivo. Cada `<head>` lleva su título, su
descripción, su `canonical`, las etiquetas Open Graph y X/Twitter con su
imagen de `assets/og/`, y sus datos estructurados (JSON-LD de schema.org).

## Probarlo en la computadora

```bash
cd web && python3 -m http.server 8080
```

y abrir http://localhost:8080. Hace falta un servidor: abriendo el archivo
directo, el navegador no deja leer `datos/`. Piko en el navegador espera estar
en `/probar/app/` (`baseUrl` en `app/app.json`), así que se prueba sirviendo
`web/` como raíz.

## Lo que muestra

El diccionario y el estado salen de `diccionario/` y nada más: lo que está
en revisión se ve marcado como tal, y de las encuestas sólo se muestra lo que
ya pasó al diccionario, con el crédito que eligió cada persona. Nunca datos de
contacto.
