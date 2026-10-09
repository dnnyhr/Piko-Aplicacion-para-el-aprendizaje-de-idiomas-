# Piko en Figma

Un plugin de Figma que importa las **pantallas reales** de la app — no una
imagen: capas editables con auto layout, colores enlazados a variables,
estilos de texto y **componentes reutilizables con variantes** — y las
herramientas que lo alimentan y lo verifican.

Los entregables de diseño que salen de acá están en [`docs/diseno/`](../docs/diseno/).

```
figma/
├── plugin/                 ← lo que se importa en Figma
│   ├── manifest.json
│   ├── code.js             (generado: plugin + datos adentro)
│   ├── ui.html
│   ├── src/plugin.js       el código del plugin
│   └── datos/              captura.json y auditoria.json
└── captura/                ← lo que genera los datos
    ├── capturar.mjs        recorre la app y captura cada pantalla
    ├── extraer.js          (corre en el navegador) DOM + árbol de React → nodos
    ├── maquetar.mjs        infiere y verifica el auto layout; marca componentes
    ├── pantallas.mjs       qué pantallas, qué componentes, qué patrones
    ├── auditar.mjs         contraste y tamaños táctiles
    ├── construir-plugin.mjs
    ├── exportar.mjs        kit de assets y recortes de componentes
    ├── documentar.mjs      escribe docs/diseno/*.md
    └── verificar/          figma falso + render + comparación píxel a píxel
```

## Usar el plugin

1. **Figma de escritorio** → menú **Plugins → Development → Import plugin from manifest…**
2. Elegí `figma/plugin/manifest.json`.
3. En un archivo (nuevo, idealmente): **Plugins → Development → Piko · Importar pantallas**.
4. Elegí las pantallas y tocá **Importar**.

Crea estas páginas (y las rehace si se vuelve a importar):

| Página | Contenido |
|---|---|
| 🎨 Fundamentos | Paleta, tipografía, espaciado y radios, enlazados a la colección de variables **Piko · Tokens** y a los estilos de texto **Piko/…** |
| 🧩 Componentes | La biblioteca: un component set por componente, con sus variantes reales y la descripción del código |
| 📱 Pantallas | Los mockups, por sección, hechos de instancias; enlazados como **prototipo** (empieza en Inicio) |
| 🔀 Flujo UX | Wireframes de baja fidelidad unidos por las flechas del flujo |
| 📦 Assets | Ilustraciones e íconos como componentes con exportación SVG + PNG @1x/@2x/@3x |
| ♿ Accesibilidad | Contraste de cada par de colores y los toques chicos |

Fuentes: Fredoka y Nunito Sans (Google Fonts, ya vienen en Figma). Si no están,
el plugin avisa y usa Inter.

## Cómo logra que sea igual a la app

1. **Captura real.** La app se exporta para web sin minificar y se recorre con
   Chromium a 360 × 800. Se juega una lección de verdad (con una semilla fija,
   para que salga siempre igual) para tener ejercicios, resultado, perfil y
   logros con datos.
2. **Del DOM a nodos.** `extraer.js` lee de cada elemento su caja sin
   transformaciones, fondo, bordes por lado, radios, opacidad, y de los textos
   cada tramo con su fuente, tamaño, color, espaciado y caja; el alto de
   línea se mide. Los SVG se copian limpios (se reescribe `transform-origin`,
   que Figma no entiende) y las imágenes se bajan tal cual.
3. **Componentes desde React.** Cada nodo del DOM guarda su fibra de React:
   subiendo por ella se sabe que esa caja la dibujó un `<Boton tono="pico">`.
   Así cada aparición cae en su variante (`Tono=pico, Tamaño=normal,
   Estado=activo`). Lo que no es un componente de React pero se repite
   (encabezados, tarjetas, chips, campos) se reconoce por estilo con los
   **patrones** de `pantallas.mjs`.
4. **Auto layout verificado.** `maquetar.mjs` traduce el flexbox de cada
   contenedor a auto layout (dirección, padding con el borde incluido, gap,
   alineación, hug/fill/fixed, wrap) y **simula** dónde caería cada hijo: si
   alguno se corre más de 1 px de su lugar real, ese contenedor queda con
   posiciones absolutas. Así se gana edición sin perder exactitud.
5. **Instancias, no copias.** Cada componente se arma una vez desde su primera
   aparición; las demás son instancias con sus textos y, si llevan otro
   componente adentro distinto (otra insignia en la misma celda), *instance swap*.
6. **Verificación.** `verificar/` carga `code.js` con un `figma` falso en
   Chromium (estricto: falla donde Figma fallaría), corre la importación
   completa, dibuja el resultado y lo compara con las capturas de la app. El
   resultado de la última corrida está en
   [`docs/diseno/01-pantallas-alta-fidelidad.md`](../docs/diseno/01-pantallas-alta-fidelidad.md#cómo-se-hicieron).

## Regenerar todo

Hace falta Node 22 y las dependencias de la app (`cd app && npm install`).

```bash
cd figma/captura
npm install                 # Playwright
npm run todo                # capturar → plugin → verificar → exportar → documentar
```

O por partes:

| Comando | Qué hace |
|---|---|
| `npm run capturar` | Exporta la app web y la captura (`-- --web <carpeta>` para usar una exportación ya hecha; `-- --semilla N` para otra ronda) |
| `npm run plugin` | Arma `plugin/code.js` con los datos adentro |
| `npm run verificar` | Corre el plugin fuera de Figma y lo compara con la app; falla si una pantalla difiere más de 3 % |
| `npm run exportar` | Kit de assets y recortes de componentes en `docs/diseno/` |
| `npm run documentar` | Reescribe los cinco documentos con las cifras nuevas |

Después de cambiar algo visual en la app: `npm run todo` y reimportar en Figma.

### Agregar una pantalla

En `captura/pantallas.mjs`, sumar a `PANTALLAS`:

```js
{
  id: 'mi-pantalla',
  nombre: 'Mi pantalla',
  seccion: 'Progreso',                 // Inicio · Aprender · Progreso · Jugar y cantar · En clase
  descripcion: 'Qué es, en una línea.',
  ruta: '/mi-ruta',                    // o `pasos: async (app) => { … }` para llegar tocando
  enlaces: { Volver: 'perfil' },       // texto del botón → pantalla destino (prototipo)
}
```

### Agregar un componente

Si es de React, sumarlo a `CATALOGO` con el nombre de la función y cómo sus
props se convierten en variantes:

```js
MiTarjeta: {
  nombre: 'Mi tarjeta',
  grupo: 'Tarjetas',
  fuente: 'src/ui/components/MiTarjeta.tsx',   // su comentario de cabecera es la descripción
  variantes: (p) => ({ Estado: p.activa ? 'activa' : 'normal' }),
},
```

Si no es de React, igual pero con `patron: (nodo) => boolean`.
