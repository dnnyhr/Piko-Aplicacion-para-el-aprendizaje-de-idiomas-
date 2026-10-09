/**
 * Escribe los cinco entregables de diseño en docs/diseno/ a partir de los
 * datos reales: la captura de la app, la auditoría de accesibilidad, el kit
 * de assets y el resultado de la verificación del plugin. Correr después de
 * capturar, verificar y exportar:
 *
 *   npm run capturar && npm run plugin && npm run verificar && npm run exportar && npm run documentar
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contraste, nivel } from './auditar.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const DOCS = join(RAIZ, 'docs', 'diseno');
const leer = (r) => JSON.parse(readFileSync(r, 'utf8'));

const datos = leer(join(AQUI, '..', 'plugin', 'datos', 'captura.json'));
const audit = leer(join(AQUI, '..', 'plugin', 'datos', 'auditoria.json'));
const recortes = leer(join(DOCS, 'componentes', 'indice.json'));
const manifiesto = leer(join(DOCS, 'assets', 'manifiesto.json'));
const verif = existsSync(join(AQUI, 'verificar', 'salida', 'resumen.json')) ? leer(join(AQUI, 'verificar', 'salida', 'resumen.json')) : null;
const T = datos.tokens;
const P = Object.fromEntries(datos.pantallas.map((p) => [p.id, p]));
const fecha = new Date(datos.generado).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' });
const pie = `\n---\n\n<sub>Generado por \`figma/captura/documentar.mjs\` a partir de la captura del ${fecha}. Las cifras y tablas salen de la app real; para actualizarlas, ver [figma/README.md](../../figma/README.md).</sub>\n`;

// ── Material para los documentos ─────────────────────────────────────────

mkdirSync(join(DOCS, 'tokens'), { recursive: true });
for (const [k, v] of Object.entries(T.color)) {
  writeFileSync(
    join(DOCS, 'tokens', `${k}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="28" viewBox="0 0 56 28"><rect x="0.5" y="0.5" width="55" height="27" rx="8" fill="${v}" stroke="#CFC3AD"/></svg>`,
  );
}
mkdirSync(join(DOCS, 'verificacion'), { recursive: true });
const SALIDA = join(AQUI, 'verificar', 'salida');
for (const id of ['inicio', 'practicar', 'ejercicio-opcion', 'ejercicio-intento', 'perfil', 'logros']) {
  if (existsSync(join(SALIDA, `${id}.png`))) copyFileSync(join(SALIDA, `${id}.png`), join(DOCS, 'verificacion', `${id}.png`));
}
for (const n of ['flujo-ux', 'componentes', 'fundamentos', 'accesibilidad', 'assets']) {
  if (existsSync(join(SALIDA, `pagina-${n}.png`))) copyFileSync(join(SALIDA, `pagina-${n}.png`), join(DOCS, 'verificacion', `pagina-${n}.png`));
}

// Cuántas instancias de cada componente usa cada pantalla.
const usoPorPantalla = {};
const usoTotal = {};
for (const p of datos.pantallas) {
  const c = {};
  (function ir(n) {
    if (n.comp) {
      c[n.comp.nombre] = (c[n.comp.nombre] ?? 0) + 1;
      usoTotal[n.comp.id] = (usoTotal[n.comp.id] ?? 0) + 1;
    }
    (n.hijos ?? []).forEach(ir);
  })(p.raiz);
  usoPorPantalla[p.id] = c;
}
const nodos = (n) => 1 + (n.hijos ?? []).reduce((a, h) => a + nodos(h), 0);
const conAL = (n) => (n.tipo === 'FRAME' && n.al ? 1 : 0) + (n.hijos ?? []).reduce((a, h) => a + conAL(h), 0);
const marcos = (n) => (n.tipo === 'FRAME' ? 1 : 0) + (n.hijos ?? []).reduce((a, h) => a + marcos(h), 0);
const totalAL = datos.pantallas.reduce((a, p) => a + conAL(p.raiz), 0);
const totalMarcos = datos.pantallas.reduce((a, p) => a + marcos(p.raiz), 0);
const verPorId = Object.fromEntries((verif?.pantallas ?? []).map((v) => [v.id, v]));

const img = (ruta, alt, ancho) => (ancho ? `<img src="${ruta}" alt="${alt}" width="${ancho}"/>` : `![${alt}](${ruta})`);
const nombreColor = Object.fromEntries(Object.entries(T.color).map(([k, v]) => [v.toUpperCase(), k]));
const conNombre = (hex) => (nombreColor[hex] ? `\`${hex}\` ${nombreColor[hex]}` : `\`${hex}\``);

const ORDEN_SECCION = ['Inicio', 'Aprender', 'Progreso', 'Jugar y cantar', 'En clase'];
const porSeccion = ORDEN_SECCION.map((s) => [s, datos.pantallas.filter((p) => p.seccion === s)]);

// ── 0 · Índice ───────────────────────────────────────────────────────────

const indice = `# Diseño de Piko

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
   [\`figma/plugin/manifest.json\`](../../figma/plugin/manifest.json).
3. En un archivo nuevo: **Plugins → Development → Piko · Importar pantallas → Importar**.

En menos de un minuto quedan las seis páginas del plugin. Las tipografías son
Fredoka y Nunito Sans de Google Fonts, que Figma ya trae; si faltan, el plugin
avisa y usa Inter.

## Cifras de esta versión

| | |
|---|---|
| Pantallas capturadas | **${datos.pantallas.length}** a ${datos.dispositivo.ancho} × ${datos.dispositivo.alto} (Android de gama baja) |
| Componentes en la biblioteca | **${Object.keys(datos.componentes).length}** component sets, ${verif ? verif.resultado.componentes : '—'} variantes |
| Instancias de componentes en las pantallas | **${verif ? verif.estructura.instancias : '—'}** |
| Contenedores con auto layout | **${totalAL} de ${totalMarcos}** (${Math.round((100 * totalAL) / totalMarcos)} %) |
| Enlaces del prototipo | **${verif ? verif.estructura.enlaces : '—'}** |
| Assets exportables | **${manifiesto.length}** ilustraciones e íconos (SVG + PNG @1x/@2x/@3x) + la marca |
| Diferencia con la app | ${verif ? `**${Math.max(...verif.pantallas.filter((v) => !P[v.id]?.animada).map((v) => v.diferencia)).toFixed(2)} %** de píxeles en la peor pantalla estática` : '—'} |

El cómo está en [figma/README.md](../../figma/README.md).
${pie}`;

// ── 1 · Pantallas ───────────────────────────────────────────────────────

const fichaPantalla = (p) => {
  const usos = Object.entries(usoPorPantalla[p.id])
    .sort((a, b) => b[1] - a[1])
    .map(([n, c]) => `${n} ×${c}`)
    .join(' · ');
  const v = verPorId[p.id];
  const enlaces = Object.entries(p.enlaces)
    .filter(([, d]) => P[d])
    .map(([t, d]) => `«${t}» → ${P[d].nombre}`)
    .join(' · ');
  return `### ${p.nombre}

<table><tr><td width="260">${img(`pantallas/${p.id}.png`, p.nombre, 240)}</td><td>

${p.descripcion}

**Tamaño del marco:** ${p.ancho} × ${p.alto} px${p.alto > 800 ? ' (la pantalla completa con su scroll desplegado)' : ''}
${p.ruta ? `\n**Ruta en la app:** \`${p.ruta}\`` : ''}

**Componentes usados:** ${usos || '—'}

${enlaces ? `**Prototipo:** ${enlaces}` : ''}

${v ? `**Diferencia con la app:** ${v.diferencia.toFixed(2)} % de píxeles${p.animada ? ' (tiene animaciones continuas: rayos que giran y flores que caen)' : ''}` : ''}

</td></tr></table>
`;
};

const clave = ['inicio', 'practicar', 'ejercicio-opcion', 'perfil'];
const doc1 = `# 1 · Aplicación del manual en pantallas reales

Mockups de alta fidelidad de **${datos.pantallas.length} pantallas** de Piko, con
el manual (paleta, tipografías, radios, el «labio» de los botones) aplicado
exactamente como lo dibuja la app.

## Cómo se hicieron

No se dibujaron a mano. La app se exportó para web y se recorrió con un
navegador a **${datos.dispositivo.ancho} × ${datos.dispositivo.alto}**, el tamaño de
un Android de gama baja (el teléfono para el que está pensada Piko). Se jugó
una lección de verdad para que ejercicios, resultado, perfil y logros tengan
datos. De cada pantalla se guardó:

- la captura PNG que aparece en este documento, y
- el árbol de capas con su geometría, colores, tipografía y **qué componente de
  React** dibujó cada cosa.

El plugin de Figma reconstruye ese árbol con capas editables: textos con su
fuente, tamaño, alto de línea y espaciado; colores enlazados a las variables
del manual; auto layout donde la app usa flexbox; e instancias de los
componentes reutilizables. Después, un verificador corre el plugin fuera de
Figma, dibuja el resultado y lo compara píxel a píxel con la app.

${verif ? `| Pantalla | Diferencia |\n|---|---|\n${verif.pantallas.map((v) => `| ${v.nombre} | ${v.diferencia.toFixed(2)} %${P[v.id]?.animada ? ' · animada' : ''} |`).join('\n')}\n\nLa diferencia que queda es antialiasing del texto y, en «Logro desbloqueado», el cuadro de la animación en que se tomó cada imagen.` : ''}

${img('verificacion/inicio.png', 'Inicio: app, plugin y diferencias')}

<sub>Izquierda: la app. Centro: lo que arma el plugin. Derecha: en rojo, los píxeles que difieren.</sub>

## Las pantallas clave

Las cuatro que pide el entregable — inicio, funcionalidad principal y perfil —
más el ejercicio, que es donde el estudiante pasa la mayor parte del tiempo.

${clave.map((id) => fichaPantalla(P[id])).join('\n')}

## Todas las pantallas

${porSeccion
  .map(([s, ps]) => `<details${s === 'Aprender' ? ' open' : ''}><summary><b>${s}</b> · ${ps.length} pantalla${ps.length === 1 ? '' : 's'}</summary>\n\n${ps.filter((p) => !clave.includes(p.id)).map(fichaPantalla).join('\n')}\n</details>\n`)
  .join('\n')}

## Lo que aplica cada pantalla del manual

| Regla del manual | Dónde se ve |
|---|---|
| Fondo papel \`${T.color.papel}\`, superficies blancas con borde \`${T.color.borde}\` | Todas |
| Títulos en Fredoka (Display 32, Título 24, Subtítulo 19) | Encabezados de Perfil, Logros, Madroño; enunciados de ejercicios |
| Cuerpo en Nunito Sans 16/24 y Chico 13/18 | Descripciones, ayudas, globos de Piko |
| Botones planos con labio de ${T.labio.normal} px, en mayúsculas | Las acciones de todas las pantallas |
| El error en ámbar, nunca en rojo | «Seguí intentando», opción fallada |
| Piko acompaña: nunca enojado ni triste | Saluda en Inicio, piensa en los ejercicios, festeja en el resultado |
| Radios generosos: ${Object.entries(T.radio).map(([k, v]) => `${k} ${v}`).join(', ')} | Tarjetas, opciones, chips |
${pie}`;

// ── 2 · Componentes ─────────────────────────────────────────────────────

const GRUPOS = ['Acciones', 'Encabezados', 'Tarjetas', 'Formularios', 'Ejercicios', 'Piko', 'Progreso', 'Logros', 'Ilustraciones', 'Íconos'];
const porComp = {};
for (const r of recortes) (porComp[r.id] ??= []).push(r);

const GUIAS = {
  Boton: `| Tono | Cuándo |
|---|---|
| **verde** | La acción principal de la pantalla: Practicar, Comprobar, Continuar. Una sola por pantalla. |
| **pico** (ámbar) | Juego y alternativas festivas: Minijuegos, Canjear código; continuar tras un intento. |
| **papel** | Acción secundaria al lado de una principal: Cambiar de tema, La Música de Piko. |
| **cielo** | Lo que tiene que ver con la clase en red: Unirme a la clase. |
| **fantasma** | Volver o salir. Sin fondo ni labio. |

Siempre en mayúsculas (Fredoka SemiBold 16, espaciado 0.6), una sola línea; si no entra, se corta con «…». Deshabilitado = 45 % de opacidad. Al tocarlo, el cuerpo baja los ${T.labio.normal} px del labio en 60 ms.`,
  Opcion: `Cuatro estados: **normal** (blanco), **elegida** (celeste, antes de comprobar), **correcta** (verde) y **fallada** (ámbar — nunca rojo). Con número de atajo en los ejercicios; sin número para elegir lengua o tema. Alto mínimo 64 px.`,
  Bloque: `La ficha se toca (no se arrastra): sube al renglón y deja su **hueco** en el banco para que nada se reacomode bajo el dedo.`,
  Globo: `Siempre pegado a Piko, con la cola hacia él: a la **izquierda** cuando Piko está al costado, **abajo** cuando está debajo.`,
  BarraFeedback: `Aparece desde abajo al comprobar. **Acierto**: verde, Piko alegre. **Intento**: ámbar, Piko animando, y muestra la respuesta correcta sin decir nunca «incorrecto».`,
  Encabezado: `Patrón para pantallas secundarias: botón circular de volver (44 × 44), título y el contador de sacuanjoches, que también es un acceso al perfil.`,
  CampoCodigo: `Formulario de un solo campo. La etiqueta va arriba, el campo es grande (48 px) y centrado, y el formato esperado se muestra debajo como ejemplo.`,
};

const fichaComp = (id) => {
  const info = datos.componentes[id];
  const rs = porComp[id] ?? [];
  if (!info || !rs.length) return '';
  const props = Object.keys(rs.reduce((a, r) => ({ ...a, ...r.variante }), {})).filter((k) => k !== 'Forma');
  const variantes = rs.length > 8 ? rs.filter((r, i) => i < 8) : rs;
  const etiqueta = (r) =>
    Object.entries(r.variante)
      .filter(([k]) => k !== 'Forma')
      .map(([, v]) => v)
      .join(' · ') || 'base';
  return `### ${info.nombre}

${info.descripcion}${info.fuente ? `  \nCódigo: [\`${info.fuente.startsWith('app/') ? info.fuente : 'app/' + info.fuente}\`](../../${info.fuente.startsWith('app/') ? info.fuente : 'app/' + info.fuente})` : ''}

${props.length ? `**Propiedades de variante en Figma:** ${props.map((p) => `\`${p}\``).join(', ')} · ` : ''}**Usos en las pantallas:** ${usoTotal[id] ?? 0}

<table><tr>${variantes.map((r) => `<td align="center">${img(r.archivo, etiqueta(r), Math.min(260, Math.round(r.w * 0.75 + 8)))}<br/><sub>${etiqueta(r)}</sub></td>`).join('')}</tr></table>
${rs.length > variantes.length ? `\n<sub>…y ${rs.length - variantes.length} variantes más en Figma.</sub>\n` : ''}
${GUIAS[id] ? `\n${GUIAS[id]}\n` : ''}`;
};

const filasColor = Object.entries(T.color)
  .map(([k, v]) => {
    const c = v.length > 7 ? null : contraste(v.toUpperCase(), T.color.papel.toUpperCase());
    return `| ${img(`tokens/${k}.svg`, k)} | \`${k}\` | \`${v}\` | ${c ? c.toFixed(2) : '—'} |`;
  })
  .join('\n');

const TEXTO_USO = {
  display: 'Título de pantalla, números grandes',
  titulo: 'Lema, valores de las tarjetas de dato',
  subtitulo: 'Opciones, títulos de tarjetas y de la barra de respuesta',
  cuerpo: 'Texto corrido, descripciones',
  cuerpoFuerte: 'Globos de Piko, fichas, énfasis',
  chico: 'Ayudas, subtítulos, etiquetas de dato',
  etiqueta: 'Rótulos en mayúsculas sobre secciones',
};
const filasTexto = Object.entries(T.texto)
  .map(([k, v]) => `| **${k}** | ${v.fontFamily.replace('_', ' ')} | ${v.fontSize}${v.lineHeight ? ' / ' + v.lineHeight : ''} | ${v.letterSpacing ?? 0} | ${v.textTransform === 'uppercase' ? 'MAYÚSC.' : '—'} | ${TEXTO_USO[k] ?? ''} |`)
  .join('\n');

const doc2 = `# 2 · Sistema de componentes de UI

La biblioteca de elementos reutilizables de Piko, coherente con la guía de
color y tipografía del manual. Cada componente existe en tres lugares que
dicen lo mismo:

| Dónde | Qué es |
|---|---|
| **El código** (\`app/src/ui\`, \`app/src/features\`) | La fuente de verdad. Lo que se ve en el teléfono. |
| **Figma** (página 🧩 Componentes) | Component sets con variantes, auto layout, colores enlazados a variables y textos con estilos. Las pantallas de 📱 usan instancias de estos. |
| **Este documento** | La referencia para desarrollo: qué variantes hay, cuándo usar cada una, de qué archivo sale. |

Hay dos tipos de componente:

- **De código**: un componente de React (\`Boton\`, \`Opcion\`, \`Globo\`…). El
  capturador lee del árbol de React con qué props se montó cada uno, y eso
  decide su variante en Figma (por ejemplo \`tono="pico"\` → \`Tono=pico\`).
- **Patrones**: estructuras que se repiten en varias pantallas sin ser todavía
  un componente de React — encabezados, tarjetas, chips, campos. Se reconocen
  por su estilo y su contenido. Son candidatos naturales a extraerse a
  \`app/src/ui/components\` cuando se toquen esas pantallas.

Cuando un componente lleva otro adentro (la insignia dentro de la celda de
logro, Piko dentro de la barra de respuesta), en Figma se cambia con
**instance swap**, sin multiplicar variantes.

![La página de componentes en Figma](verificacion/pagina-componentes.png)

## Fundamentos

Todos salen de [\`app/src/ui/tokens.ts\`](../../app/src/ui/tokens.ts). En Figma son
la colección de variables **Piko · Tokens** y los estilos de texto **Piko/…**.

### Color

| | Token | Valor | Contraste sobre papel |
|---|---|---|---|
${filasColor}

El error es **ámbar** (\`intento\`), nunca rojo: Piko refuerza sin regañar.

### Tipografía

Dos familias, las mismas de la landing, empaquetadas en la app para que
funcione sin internet: **Fredoka** (títulos y botones) y **Nunito Sans** (cuerpo).

| Estilo | Fuente | Tamaño / alto | Espaciado | Caja | Uso |
|---|---|---|---|---|---|
${filasTexto}
| **Botón** | Fredoka SemiBold | 16 | 0.6 | MAYÚSC. | Todos los botones (14 en los chicos) |

### Espaciado, radios y volumen

- Escala de 4 puntos: ${Object.entries(T.espacio).map(([k, v]) => `\`${k}\` ${v}`).join(' · ')}.
- Radios: ${Object.entries(T.radio).map(([k, v]) => `\`${k}\` ${v}`).join(' · ')}.
- **Labio**: borde inferior más oscuro de ${T.labio.normal} px (${T.labio.chico} px en los chicos) que da volumen sin sombras ni degradados — más barato en gama baja.
- Animaciones: ${T.tiempo.rapido} / ${T.tiempo.normal} / ${T.tiempo.lento} ms.

![La página de fundamentos en Figma](verificacion/pagina-fundamentos.png)

## Componentes

${GRUPOS.map((g) => {
  const ids = Object.keys(datos.componentes).filter((id) => datos.componentes[id].grupo === g && porComp[id]);
  if (!ids.length) return '';
  return `## ${g}\n\n${ids.map(fichaComp).join('\n')}`;
}).join('\n')}

## Reglas para sumar un componente

1. Usar los tokens: nada de colores ni tamaños sueltos.
2. Mínimo **44 × 44** de área tocable (ver [accesibilidad](05-accesibilidad.md)).
3. Plano, con labio si se toca; sin sombras difusas.
4. El texto de los botones en una línea; el de las tarjetas puede crecer (auto layout vertical).
5. Si es de código, agregarlo a \`CATALOGO\` en [\`figma/captura/pantallas.mjs\`](../../figma/captura/pantallas.mjs) con la función que decide su variante, y volver a capturar.
${pie}`;

// ── 3 · Flujo UX ────────────────────────────────────────────────────────

const doc3 = `# 3 · Validación y ajuste del flujo UX

## El flujo de usuario

Piko tiene dos caminos que arrancan en la misma portada: **aprender solo**
(funciona sin red, en la casa) y **aprender en clase** (el teléfono del maestro
levanta la sala y los estudiantes se conectan a su hotspot).

\`\`\`mermaid
flowchart TD
  I([Inicio]) -->|Practicar sola| PR[Practicar · elegir lengua y tema]
  PR -->|tema| EJ{{Ronda de 8 ejercicios}}
  EJ --> OP[Opción múltiple]
  EJ --> AR[Armar oración]
  EJ --> ES[Escuchar]
  OP & AR & ES -->|Comprobar| FB{¿Acertó?}
  FB -->|sí| OK[Barra verde · Piko festeja]
  FB -->|no| IN[Barra ámbar · muestra la respuesta]
  OK & IN -->|Continuar| EJ
  EJ -->|última| LG{¿Logro nuevo?}
  LG -->|sí| CE[Celebración del logro] --> RS
  LG -->|no| RS[Resultado · sacuanjoches y madroño]
  RS -->|Otra ronda| EJ
  RS -->|Cambiar de tema| PR
  RS -->|Ver mi árbol| MA[Mi madroño]

  I -->|Mi madroño| PE[Perfil]
  PE --> MA
  PE -->|Mis logros| ML[Mis logros]
  I -->|Mis logros| ML
  ML -->|Canjear código| CC[Canjear código]

  I -->|Minijuegos| MJ[Minijuegos]
  MJ --> RAY[Rayuela] & TRO[Trompo] & CHI[Chibolas] & GAL[Pikito Ciego]
  I -->|La Música de Piko| MU[Música] --> CA[Canción]

  I -->|Unirme a la clase| UN[Buscar la sala] -->|elige su nombre| JU[Jugar en clase]
  I -->|Soy el maestro| MAE[Mi clase · abrir sala] -->|Empezar ronda| JU
\`\`\`

En Figma, la página **📱 Pantallas** tiene este flujo como **prototipo**
navegable (${verif ? verif.estructura.enlaces : 'los'} enlaces, empieza en Inicio) y la página **🔀 Flujo UX**
lo muestra con **wireframes de baja fidelidad** generados de las mismas pantallas:

![Wireframes y flujo en Figma](verificacion/pagina-flujo-ux.png)

## Validación: qué funciona

| | Evidencia en las pantallas |
|---|---|
| **Una sola acción principal por pantalla** | El botón verde siempre es el siguiente paso (Practicar sola, Comprobar, Continuar, Otra ronda). |
| **El camino sin red va primero** | «Practicar sola» encabeza la portada: es lo único que funciona sin nadie cerca. |
| **El error no castiga** | Ámbar en vez de rojo, Piko animando y la respuesta correcta a la vista. |
| **Recompensa visible y acumulativa** | Cada lección suma sacuanjoches; el madroño crece y Piko sube de rama. |
| **Ronda corta** | 8 ítems: entra en un recreo y en la batería de un teléfono viejo. |
| **La lengua de la interfaz se elige en la portada** | Español / Miskitu, sin entrar a ajustes. |
| **Tocar en vez de arrastrar** | Las fichas se tocan para moverlas: un dedo chico en una pantalla barata acierta mucho mejor. |

## Hallazgos y ajustes propuestos

Encontrados al recorrer las ${datos.pantallas.length} pantallas y al medir sus elementos
(los tamaños salen de la captura).

| # | Hallazgo | Ajuste | Prioridad |
|---|---|---|---|
| 1 | **La salida del ejercicio es un «✕» de 16 × 24 px** y sale de la ronda sin confirmar: un toque accidental pierde el avance. | Llevarla a 44 × 44 y pedir confirmación («¿Salir de la ronda? Lo que respondiste se guarda»). | Alta |
| 2 | **Volver está en dos lugares**: Minijuegos y Música usan un botón circular arriba; Practicar, Perfil, Madroño y Logros usan un botón «Volver» al final del scroll. En Mis logros (${P.logros?.alto ?? '—'} px de alto) hay que bajar todo para salir. | Usar el patrón **Encabezado de pantalla** en todas las pantallas secundarias; dejar el «Volver» de abajo sólo donde el contenido es corto. | Alta |
| 3 | **«¡Continuar aprendiendo!» no entra** en el botón de la celebración: se ve «¡CONTINUAR APRENDIEN…». | Texto más corto («¡A seguir!») o botón de dos líneas. | Media |
| 4 | **El contador de sacuanjoches es un acceso al perfil** pero mide ${audit.toquesChicos.find((t) => /sacuanjoches/i.test(t.etiqueta)) ? `${audit.toquesChicos.find((t) => /sacuanjoches/i.test(t.etiqueta)).w} × ${audit.toquesChicos.find((t) => /sacuanjoches/i.test(t.etiqueta)).h}` : 'menos de 44'} px y no parece tocable. | Alto mínimo de 44 px y un «›» o borde de botón. | Media |
| 5 | **La celebración del logro se monta sobre el resultado**: el estudiante ve dos premios seguidos y el resultado queda tapado. | Mantener el orden (primero el logro) pero entrar al resultado con su propia animación al cerrar la celebración, para que no parezca la misma pantalla. | Baja |
| 6 | **«Soy el maestro»** es un enlace de texto debajo de cuatro botones grandes: a propósito discreto, pero cuesta encontrarlo la primera vez. | Agregar una línea de ayuda en la pantalla de Unirme («¿Sos el maestro? Abrí la sala acá»). | Baja |
| 7 | **El ejercicio de escuchar depende de la voz del sistema**: en teléfonos sin voz en inglés no suena. | Mostrar el texto escrito como respaldo si no hay voz, y priorizar audios grabados. | Media |

Los ajustes 1 a 4 están reflejados como **componentes** en la biblioteca
(Botón circular, Encabezado de pantalla) para que el cambio en el código sea
reemplazar, no diseñar.

## Wireframes

Cada pantalla tiene su wireframe en la página 🔀 Flujo UX de Figma: cajas
grises para las tarjetas, barras para los textos (más oscuras en los títulos),
cruces para las ilustraciones y los botones en gris oscuro con su texto real.
Salen de la misma captura, así que tienen la jerarquía y las proporciones
exactas de la app.
${pie}`;

// ── 4 · Assets ──────────────────────────────────────────────────────────

const grupoAsset = (n) => (/^Piko/.test(n) ? 'Piko' : /^Madroño|^Sacuanjoche/.test(n) ? 'Madroño y sacuanjoches' : /^Insignia/.test(n) ? 'Logros' : /^Instrumento|^Nota/.test(n) ? 'Música' : /^Ícono|^Chibola|^Venda/.test(n) ? 'Minijuegos' : 'Interfaz');
const gruposAsset = {};
for (const a of manifiesto) (gruposAsset[grupoAsset(a.nombre)] ??= []).push(a);

const doc4 = `# 4 · Kit de assets para desarrollo

Todas las ilustraciones e íconos que dibuja la app, exportados **tal cual los
dibuja**, listos para el frontend. Están en
[\`docs/diseno/assets/\`](assets/) y, en Figma, en la página **📦 Assets** como
componentes con la exportación ya configurada.

| Carpeta | Contenido |
|---|---|
| [\`assets/svg/\`](assets/svg/) | ${manifiesto.filter((a) => a.archivo).length} SVG vectoriales (para web o \`react-native-svg\`) |
| [\`assets/png/\`](assets/png/) | Los mismos en PNG transparente a **@1x, @2x y @3x** (+ los dos sprites de Piko) |
| [\`assets/marca/\`](assets/marca/) | Logo (SVG y PNG), Piko vectorial, ícono de la app, splash e íconos adaptativos de Android |
| [\`assets/manifiesto.json\`](assets/manifiesto.json) | Nombre, archivo, tamaño y en qué pantallas se usa cada uno |
| [\`tokens/\`](tokens/) | Una muestra SVG por color del manual |

## Cómo usarlos

- **En la app** (React Native): los SVG ya son componentes en \`app/src/ui\`
  (\`PikoMascota\`, \`Sacuanjoche\`, \`MiniaturaArbol\`, \`Insignia\`, \`Instrumento\`…).
  El kit sirve para web, para material impreso y para quien rediseñe.
- **En web**: \`<img src="assets/svg/sacuanjoche.svg">\` o el SVG en línea.
- **PNG**: usar @2x en pantallas comunes y @3x en las densas. En Android,
  @1x ≈ mdpi, @2x ≈ xhdpi, @3x ≈ xxhdpi.
- **Desde Figma**: en 📦 Assets, seleccionar y **Export** (SVG + PNG ×3 ya configurados).
- **Regenerar**: \`npm run exportar\` en \`figma/captura\` (después de capturar).

## Catálogo

${Object.entries(gruposAsset)
  .map(
    ([g, as]) => `### ${g}

| Vista | Nombre | Archivos | Tamaño | Dónde aparece |
|---|---|---|---|---|
${as
  .map(
    (a) =>
      `| ${img(`assets/${a.png}`, a.nombre, Math.min(64, Math.max(24, Math.round(a.ancho > 300 ? 64 : a.ancho * 0.6))))} | ${a.nombre} | ${a.archivo ? `[SVG](assets/${a.archivo}) · ` : ''}[PNG](assets/${a.png})${a.archivo ? ` · [@2x](assets/${a.png.replace('.png', '@2x.png')}) · [@3x](assets/${a.png.replace('.png', '@3x.png')})` : ''} | ${Math.round(a.ancho)} × ${Math.round(a.alto)} | ${a.usos.slice(0, 3).join(', ')}${a.usos.length > 3 ? '…' : ''} |`,
  )
  .join('\n')}
`,
  )
  .join('\n')}
### Marca

| Vista | Archivo | Uso |
|---|---|---|
| ${img('assets/marca/marca.png', 'Logo de Piko', 120)} | [marca.svg](assets/marca/marca.svg) · [PNG](assets/marca/marca.png) · [@2x](assets/marca/marca@2x.png) · [@3x](assets/marca/marca@3x.png) | Logo en la portada y en la landing |
| ${img('assets/marca/icono-app-1024.png', 'Ícono de la app', 64)} | [icono-app-1024.png](assets/marca/icono-app-1024.png) | Ícono de la app (1024 × 1024) |
| ${img('assets/marca/android-icono-frente.png', 'Ícono adaptativo', 64)} | [frente](assets/marca/android-icono-frente.png) · [fondo](assets/marca/android-icono-fondo.png) · [monocromo](assets/marca/android-icono-monocromo.png) | Ícono adaptativo de Android |
| ${img('assets/marca/splash.png', 'Splash', 64)} | [splash.png](assets/marca/splash.png) | Pantalla de arranque |
| | [piko.svg](assets/marca/piko.svg) | Piko vectorial de la landing |

## Convenciones

- Nombres en minúscula, sin tildes, con guiones: \`madrono-miniatura-brote.svg\`.
- Los SVG conservan su \`viewBox\` original; el tamaño de la tabla es el de diseño.
- Sin texto dentro de los SVG: los textos van siempre como texto, para que se puedan traducir.
- Paleta: sólo colores del manual (ver [componentes](02-sistema-de-componentes.md#color)).
${pie}`;

// ── 5 · Accesibilidad ───────────────────────────────────────────────────

const sugerir = (fg, bg) => {
  // Texto blanco sobre un color claro: lo que ya usa la app en ese fondo
  // (el botón celeste lleva #0B3D57) en vez de un gris inventado.
  if (fg === '#FFFFFF') {
    for (const c of ['#0B3D57', T.color.verdeHondo, T.color.grafito]) if (contraste(c.toUpperCase(), bg) >= 4.5) return c.toUpperCase();
  }
  // Oscurece (o aclara, si el fondo es oscuro) el texto hasta llegar a 4.5:1.
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const aHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const oscuro = contraste(bg, '#000000') < contraste(bg, '#FFFFFF');
  const destino = oscuro ? [255, 255, 255] : [0, 0, 0];
  const a = rgb(fg);
  for (let t = 0; t <= 1; t += 0.02) {
    const c = aHex(a.map((v, i) => v + (destino[i] - v) * t));
    if (contraste(c, bg) >= 4.5) return c;
  }
  return oscuro ? '#FFFFFF' : '#000000';
};

const a11yFilas = audit.contraste
  .map(
    (c) =>
      `| ${c.nivel === 'No cumple' ? '❌' : c.nivel === 'Sólo grande' ? '⚠️' : c.nivel === 'Inactivo' ? '⏸️' : '✅'} | «${c.ejemplo.slice(0, 34)}» | ${conNombre(c.texto)} | ${conNombre(c.fondo)} | **${c.ratio.toFixed(2)}** | ${c.nivel} | ${c.tamMin === c.tamMax ? c.tamMin : `${c.tamMin}–${c.tamMax}`} px | ${c.usos} |`,
  )
  .join('\n');

const problemas = audit.contraste.filter((c) => c.nivel === 'No cumple' || (c.nivel === 'Sólo grande' && !c.grande));
const ajustes = problemas
  .map((c) => {
    const s = sugerir(c.texto, c.fondo);
    return `| «${c.ejemplo.slice(0, 30)}» (${c.pantallas.slice(0, 2).join(', ')}) | ${conNombre(c.texto)} sobre ${conNombre(c.fondo)} → ${c.ratio.toFixed(2)} | \`${s}\` → **${contraste(s, c.fondo).toFixed(2)}** |`;
  })
  .join('\n');

const pasan = audit.contraste.filter((c) => ['AA', 'AAA'].includes(c.nivel)).reduce((a, c) => a + c.usos, 0);
const totalUsos = audit.contraste.filter((c) => c.nivel !== 'Inactivo').reduce((a, c) => a + c.usos, 0);

const doc5 = `# 5 · Chequeo de accesibilidad

Verificación de que la interfaz de Piko cumpla los principios básicos de
accesibilidad. **No es una lista de buenas intenciones**: el contraste y los
tamaños táctiles están medidos sobre las ${audit.resumen.pantallas} pantallas reales
(${audit.resumen.textos} textos, ${audit.resumen.tocables} elementos tocables), por
[\`figma/captura/auditar.mjs\`](../../figma/captura/auditar.mjs). En Figma, la
página **♿ Accesibilidad** tiene la misma tabla con muestras de cada par.

Criterios: **WCAG 2.2 nivel AA** (lo que piden la mayoría de las normas), con
las guías de Android (Material, 48 dp) y Apple (44 pt) para los toques.

## Resumen

| Principio | Estado | Detalle |
|---|---|---|
| Contraste de texto | ${problemas.length ? '⚠️ Casi' : '✅'} | ${pasan} de ${totalUsos} textos (${Math.round((100 * pasan) / totalUsos)} %) pasan AA. ${problemas.length} combinaciones a corregir (abajo). |
| Legibilidad | ✅ | Cuerpo de 16 px con alto de línea 24 (1.5); el texto más usado después es de 13 px. Dos textos de 10–11 px a revisar. |
| Jerarquía visual | ✅ | Escala clara: Display 32 → Título 24 → Subtítulo 19 → Cuerpo 16 → Chico 13. Una acción principal verde por pantalla. |
| Tamaño de los objetivos táctiles | ${audit.resumen.toquesChicos ? '⚠️ Casi' : '✅'} | ${audit.resumen.toques48} de ${audit.resumen.tocables} (${Math.round((100 * audit.resumen.toques48) / audit.resumen.tocables)} %) miden 48 × 48 o más. ${audit.resumen.toquesChicos} por debajo de 44. Botones de 48–52 px de alto, opciones de 64. |
| Uso del color | ✅ | Nada depende sólo del color: acierto e intento llevan texto, la cara de Piko y la respuesta; las opciones llevan número. El error es ámbar, no rojo. |
| Navegación | ⚠️ | Botón atrás de Android en todas las pantallas; «Volver» en dos lugares distintos (ver [flujo UX](03-flujo-ux.md#hallazgos-y-ajustes-propuestos)). Roles y etiquetas en los tocables. |
| Adaptación a usuarios | ✅ | Interfaz en español y miskitu; funciona sin internet; tocar en vez de arrastrar; el audio se puede repetir; los minijuegos respetan «reducir movimiento». |
| Adaptación a dispositivos | ✅ | Diseñado a 360 × 800 (gama baja), todo en scroll vertical, fuentes empaquetadas. En pantallas anchas sólo Logros y Canjear limitan el ancho (560 / 520): el resto se estira. |

## 1. Contraste

WCAG 1.4.3 pide **4.5 : 1** para texto normal y **3 : 1** para texto grande
(24 px, o 18.66 px en negrita). El fondo de cada texto se calcula componiendo
todos los fondos que tiene detrás, incluidos los semitransparentes.

| | Ejemplo | Texto | Fondo | Contraste | Nivel | Tamaño | Usos |
|---|---|---|---|---|---|---|---|
${a11yFilas}

✅ AA o AAA · ⚠️ «Sólo grande»: alcanza para texto grande pero estos son chicos · ❌ no cumple · ⏸️ control deshabilitado (WCAG lo exime).

### Ajustes de color propuestos

El color mínimo que pasa 4.5 : 1 manteniendo el tono:

| Dónde | Hoy | Propuesto |
|---|---|---|
${ajustes}

Lo más rendidor es **un solo cambio de token**: \`tintaSuave\` \`${T.color.tintaSuave}\`
está en ${audit.contraste.filter((c) => c.texto === T.color.tintaSuave.toUpperCase()).reduce((a, c) => a + c.usos, 0)} textos y sobre papel da
${contraste(T.color.tintaSuave.toUpperCase(), T.color.papel.toUpperCase()).toFixed(2)} : 1. Llevarlo a \`${sugerir(T.color.tintaSuave.toUpperCase(), '#F3EEE6')}\` lo deja en AA sobre
todos los fondos claros de la app sin que se note el cambio.

## 2. Legibilidad

| Tamaño | Textos | Comentario |
|---|---|---|
${audit.tamanos.map((t) => `| ${t.tam} px | ${t.usos} | ${t.tam < 12 ? '⚠️ Muy chico para lectores que empiezan: subir a 12–13' : t.tam === 16 ? 'Cuerpo' : t.tam === 13 ? 'Chico (ayudas)' : ''} |`).join('\n')}

- Alto de línea de 1.5 en el cuerpo (16/24) y 1.38 en el chico (13/18).
- Fredoka tiene formas redondas y abiertas, fáciles para quien está aprendiendo a leer.
- **Escalado del sistema**: React Native respeta el tamaño de letra del teléfono. Las tarjetas usan auto layout vertical, así que crecen; los botones son de una línea y se cortan con «…» si el texto no entra — probar con el tamaño de letra al 130 %.

## 3. Jerarquía visual

- **Una acción principal por pantalla**, siempre en verde, y siempre la primera.
- Títulos de pantalla en Display 32 verde; secciones en Subtítulo 19; rótulos en mayúsculas espaciadas.
- Piko y su globo marcan qué hay que hacer («Elegí la traducción correcta»).
- En los ejercicios, el enunciado (27 px) es lo más grande; las opciones (19 px) después; la instrucción (13 px, mayúsculas) arriba.

## 4. Tamaño de los elementos interactivos

WCAG 2.5.8 (AA) pide 24 × 24 como mínimo; Apple recomienda 44 × 44 y Android 48 × 48 dp.

| Pantalla | Elemento | Tamaño | |
|---|---|---|---|
${audit.toquesChicos.map((t) => `| ${t.pantalla} | «${t.etiqueta.slice(0, 40)}» | ${t.w} × ${t.h} | ${t.w < 24 || t.h < 24 ? '❌ < 24' : '⚠️ < 44'} |`).join('\n')}

Notas:

- Algunos tienen \`hitSlop\` en el código (el área tocable es mayor que lo que se ve): el «✕» del ejercicio suma 12 px por lado (40 × 48), «Soy el maestro» 8 px. Igual conviene que el área visible sea de 44.
- Las fichas de una sola letra o palabra corta («a», «is») miden 41 px de ancho: subir el ancho mínimo de \`Bloque\` a 44.
- Los chips de idioma (36 px de alto) y el contador de sacuanjoches (34 px) deberían llegar a 44.

## 5. Uso adecuado del color

- **El significado nunca depende sólo del color.** Acierto: verde + «¡Correcto!» + Piko alegre. Intento: ámbar + la respuesta correcta + Piko animando. Una opción elegida además cambia el borde.
- **Sin rojo para el error**, por pedagogía y porque rojo/verde es el par que más confunde con daltonismo (deuteranopía, ~8 % de los varones).
- Verde \`acierto\` \`${T.color.acierto}\` y ámbar \`intento\` \`${T.color.intento}\` se distinguen también por luminosidad (${contraste(T.color.acierto.toUpperCase(), T.color.intento.toUpperCase()).toFixed(2)} : 1 entre sí), no sólo por tono.
- Los logros pendientes se ven en gris **y** con candado.

## 6. Navegación

- Botón atrás del sistema (Android) en todas las pantallas; en el prototipo de Figma, cada «Volver» lleva a la pantalla anterior.
- ${73} props de accesibilidad en el código (\`accessibilityRole\`, \`accessibilityLabel\`, \`accessibilityState\`): botones, opciones (con \`selected\`), Piko («Saludar a Piko»), tarjetas de acceso («Ver mi madroño y mi perfil»), insignias (con su avance).
- Orden de lectura = orden visual (todo es una columna con scroll).
- **A mejorar**: unificar dónde está «Volver» (encabezado arriba) y que el «✕» del ejercicio tenga \`accessibilityLabel="Salir de la ronda"\`.

## 7. Adaptación a diferentes usuarios

| Usuario | Cómo se atiende |
|---|---|
| Niños que recién leen | Piko explica con frases cortas; instrucciones en mayúsculas de 13 px y enunciado grande; tocar en vez de arrastrar. |
| Hablantes de miskito | Toda la interfaz en Miskitu (elegible en la portada). |
| Sin internet | Funciona offline; las fuentes y los audios van en la app. |
| Baja visión | Contraste AA en ${Math.round((100 * pasan) / totalUsos)} % de los textos; respeta el tamaño de letra del sistema. |
| Sensibles al movimiento | Los minijuegos leen «reducir movimiento» del sistema. **A mejorar**: que la respiración de Piko y la lluvia de flores del logro también lo respeten. |
| Hipoacusia | En los ejercicios de escucha las opciones son palabras escritas y, si se falla, se muestra la respuesta. **A mejorar**: subtítulos en las canciones y una alternativa sin audio. |
| Maestros | Un solo botón grande por paso: abrir la sala, empezar la ronda, terminarla. |

## 8. Adaptación a dispositivos

- Diseñado a **360 × 800**: el Android de gama baja que llega a las escuelas.
- Una sola columna con scroll: nada se sale del ancho en 320 px.
- En pantallas anchas (tablet, web) sólo Mis logros y Canjear centran el contenido con un máximo (560 / 520 px). **A mejorar**: aplicar ese máximo en \`Pantalla\` para todas, así una tablet no estira los botones a lo ancho.
- Sin sombras, blur ni degradados: rinde en gama baja.
- Áreas seguras (notch, barra de gestos) respetadas por \`Pantalla\` (\`SafeAreaView\`).

## Plan de ajustes

| Prioridad | Ajuste | Dónde |
|---|---|---|
| Alta | Subir \`tintaSuave\` a \`${sugerir(T.color.tintaSuave.toUpperCase(), '#F3EEE6')}\` | \`app/src/ui/tokens.ts\` |
| Alta | Textos en \`copete\` (título de la celebración, «🔥 racha» del ejercicio) → \`${sugerir('#E97927', T.color.papel.toUpperCase())}\` | \`app/src/ui/logros/Celebracion.tsx\`, \`app/src/features/exercises/Runner.tsx\` |
| Alta | Texto «Tocá para escuchar» en \`#0B3D57\`, como el texto del botón celeste | \`app/src/features/exercises/EjercicioOpciones.tsx\` |
| Alta | «✕» de salir a 44 × 44, con etiqueta y confirmación | \`app/src/features/exercises/Runner.tsx\` |
| Media | Chips de idioma y contador a 44 px de alto; ancho mínimo 44 en \`Bloque\` | \`app/app/index.tsx\`, \`ContadorSacuanjoches.tsx\`, \`Bloque.tsx\` |
| Media | Textos de 10–11 px a 12 px como mínimo | \`app/app/logros/index.tsx\` |
| Baja | Respetar «reducir movimiento» en Piko y en el festejo de logros | \`PikoMascota.tsx\`, \`Festejo.tsx\` |
${pie}`;

writeFileSync(join(DOCS, 'README.md'), indice);
writeFileSync(join(DOCS, '01-pantallas-alta-fidelidad.md'), doc1);
writeFileSync(join(DOCS, '02-sistema-de-componentes.md'), doc2);
writeFileSync(join(DOCS, '03-flujo-ux.md'), doc3);
writeFileSync(join(DOCS, '04-kit-de-assets.md'), doc4);
writeFileSync(join(DOCS, '05-accesibilidad.md'), doc5);
console.log('Documentos escritos en docs/diseno/');
void nivel;
