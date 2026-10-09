# Diseño de Piko

Los cinco entregables de diseño de la app, hechos **sobre las pantallas reales**:
nada de esto es un dibujo aparte que después hay que mantener sincronizado.
Un capturador abre la app, recorre sus pantallas y lee del árbol de React qué
componente dibujó cada cosa; un plugin de Figma reconstruye todo con capas
editables, auto layout, variables y componentes; un verificador comprueba
píxel a píxel que lo importado sea igual a la app.

| # | Entregable | Documento | En Figma |
|---|---|---|---|
| 1 | Aplicación del manual en pantallas reales | [01-pantallas-alta-fidelidad.md](01-pantallas-alta-fidelidad.md) | 📱 Pantallas |
| 2 | Sistema de componentes de UI | [02-sistema-de-componentes.md](02-sistema-de-componentes.md) | 🧩 Componentes · 🎨 Fundamentos |
| 3 | Validación y ajuste del flujo UX | [03-flujo-ux.md](03-flujo-ux.md) | 🔀 Flujo UX (+ prototipo en 📱) |
| 4 | Kit de assets para desarrollo | [04-kit-de-assets.md](04-kit-de-assets.md) | 📦 Assets |
| 5 | Chequeo de accesibilidad | [05-accesibilidad.md](05-accesibilidad.md) | ♿ Accesibilidad |

## Llevarlo a Figma

1. Abrí **Figma de escritorio** (los plugins en desarrollo no se pueden importar desde el navegador).
2. Menú **Plugins → Development → Import plugin from manifest…** y elegí
   [`figma/plugin/manifest.json`](../../figma/plugin/manifest.json).
3. En un archivo nuevo: **Plugins → Development → Piko · Importar pantallas → Importar**.

En menos de un minuto quedan las seis páginas del plugin. Las tipografías son
Fredoka y Nunito Sans de Google Fonts, que Figma ya trae; si faltan, el plugin
avisa y usa Inter.

## Cifras de esta versión

| | |
|---|---|
| Pantallas capturadas | **17** a 360 × 800 (Android de gama baja) |
| Componentes en la biblioteca | **31** component sets, 97 variantes |
| Instancias de componentes en las pantallas | **448** |
| Contenedores con auto layout | **640 de 718** (89 %) |
| Enlaces del prototipo | **26** |
| Assets exportables | **38** ilustraciones e íconos (SVG + PNG @1x/@2x/@3x) + la marca |
| Diferencia con la app | **2.22 %** de píxeles en la peor pantalla estática |

El cómo está en [figma/README.md](../../figma/README.md).

---

<sub>Generado por `figma/captura/documentar.mjs` a partir de la captura del 9 de octubre de 2026. Las cifras y tablas salen de la app real; para actualizarlas, ver [figma/README.md](../../figma/README.md).</sub>
