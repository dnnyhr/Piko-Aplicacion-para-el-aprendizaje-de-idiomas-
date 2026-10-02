# Sitio web

piko.mugiware.com. Es un sitio estático, sin paso de compilación: se sirve la
carpeta `web/` tal cual.

```
web/
├── index.html              portada (la de siempre, con la barra arriba)
├── diccionario/            buscar palabras en miskito o en español
├── probar/                 Piko en el navegador
│   └── app/                GENERADO: npm run web:sitio (expo export de app/, con
│                           sus archivos en assets/paquetes/: ver abajo)
├── docentes/               cómo dar una clase, y el miskito en 10 ideas
├── aporta/                 cómo ayudar, estado de cada lengua y créditos
├── datos/                  GENERADO: npm run contenido (diccionario y estado)
├── assets/
│   ├── css/nav.css         la barra y el pie, en todas las páginas
│   ├── css/sitio.css       las piezas de las páginas interiores (encabezado con
│                           paisaje, tarjetas, botones, insignias de variantes)
│   ├── css/portada.css     sólo la portada
│   ├── js/nav.js           arma la barra y el pie
│   ├── js/portada.js       animaciones y datos vivos de la portada (GSAP)
│   ├── js/animaciones.js   el movimiento de las páginas interiores (GSAP)
│   ├── js/diccionario.js   la búsqueda del diccionario
│   ├── js/aporta.js        el estado de cada lengua y los créditos
│   ├── img/                logos, la mascota, el paisaje (escena.svg) y las fotos
│                           (WebP con JPEG de respaldo)
│   └── og/                 las imágenes para compartir (1200 × 630)
├── herramientas/og.mjs     genera assets/og/
├── sitemap.xml             GENERADO: npm run contenido
├── favicon.ico             la cabeza de Piko; también en assets/ en 192 px, para
│                           iOS (apple-touch-icon) y para Android (icono-192/512)
├── robots.txt · site.webmanifest
```

## ¿Qué edito?

| Quiero… | Voy a… |
|---|---|
| Cambiar un texto de una página | su `index.html` |
| Agregar una página | una carpeta con su `index.html` (copiar el `<head>` de otra), sumarla a `PAGINAS` en `assets/js/nav.js`, a `PAGINAS_DEL_SITIO` en `diccionario/herramientas/web.ts` y a `herramientas/og.mjs` |
| Corregir una palabra del diccionario | `diccionario/miskito/lexico.json` y `cd app && npm run contenido` (nunca `web/datos/`) |
| Actualizar Piko en el navegador | `cd app && npm run web:sitio` (y subir todo `web/probar/app/`) |
| Rehacer las imágenes para compartir | `npx -y -p playwright-core node web/herramientas/og.mjs` (con `app/node_modules` instalado) |

## Piko en el navegador

`expo export` guarda las tipografías y los íconos de la app en
`assets/node_modules/…`, y el `.gitignore` del repositorio ignora toda carpeta
`node_modules`: esos archivos nunca llegaban al sitio y la app quedaba en
blanco esperando las tipografías. Por eso `npm run web:sitio` termina con
`app/tools/sitio-web.ts`, que los mueve a `assets/paquetes/` y corrige las
referencias. `npm run web:comprobar` (también en CI) revisa que cada archivo
que pide la app esté en el repositorio.

## Movimiento

Las páginas interiores cargan GSAP y `assets/js/animaciones.js`: el paisaje
del encabezado (el mismo de la portada) se arma por capas y se mueve, Piko
entra y flota, y lo marcado con `data-aparece` entra al bajar. Con «reducir
movimiento» activado en el sistema, o sin JavaScript, todo se ve quieto y
completo.

## Cada página interior

```html
<body class="pagina" data-pagina="diccionario" data-raiz="../">
<div id="nav" data-pagina="diccionario" data-raiz="../"></div>
<header class="cabeza">
  <div class="cabeza__escena" data-escena></div>   ← el paisaje animado
  …
</header>
…
<div id="pie"></div>
<script src="../assets/js/nav.js"></script>
<script src="../assets/js/gsap.min.js" defer></script>
<script src="../assets/js/ScrollTrigger.min.js" defer></script>
<script src="../assets/js/animaciones.js" defer></script>
```

`data-pagina` en el `<body>` elige el color de acento de la página.

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

Las etiquetas de variantes del diccionario (dos maneras de contar, Raiti ·
Bilwi, varía entre hablantes, varias escrituras, otra palabra) no se escriben
a mano: las calcula `diccionario/herramientas/web.ts` a partir del léxico y
del corpus, que dice quién escribió cada forma.

El diccionario y el estado salen de `diccionario/` y nada más. El sitio
muestra sólo lo confirmado: las palabras en revisión no aparecen, igual que en
los ejercicios de la app, y entran solas cuando se resuelven. Tampoco lleva lo
técnico (glosas, reglas, categorías), que queda en `diccionario/miskito/` para
quien estudia la lengua. De las encuestas sólo se muestra lo que ya pasó al
diccionario, con el crédito que eligió cada persona. Nunca datos de contacto.
