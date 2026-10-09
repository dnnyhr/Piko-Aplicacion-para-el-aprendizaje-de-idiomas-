# 2 · Sistema de componentes de UI

La biblioteca de elementos reutilizables de Piko, coherente con la guía de
color y tipografía del manual. Cada componente existe en tres lugares que
dicen lo mismo:

| Dónde | Qué es |
|---|---|
| **El código** (`app/src/ui`, `app/src/features`) | La fuente de verdad. Lo que se ve en el teléfono. |
| **Figma** (página 🧩 Componentes) | Component sets con variantes, auto layout, colores enlazados a variables y textos con estilos. Las pantallas de 📱 usan instancias de estos. |
| **Este documento** | La referencia para desarrollo: qué variantes hay, cuándo usar cada una, de qué archivo sale. |

Hay dos tipos de componente:

- **De código**: un componente de React (`Boton`, `Opcion`, `Globo`…). El
  capturador lee del árbol de React con qué props se montó cada uno, y eso
  decide su variante en Figma (por ejemplo `tono="pico"` → `Tono=pico`).
- **Patrones**: estructuras que se repiten en varias pantallas sin ser todavía
  un componente de React — encabezados, tarjetas, chips, campos. Se reconocen
  por su estilo y su contenido. Son candidatos naturales a extraerse a
  `app/src/ui/components` cuando se toquen esas pantallas.

Cuando un componente lleva otro adentro (la insignia dentro de la celda de
logro, Piko dentro de la barra de respuesta), en Figma se cambia con
**instance swap**, sin multiplicar variantes.

![La página de componentes en Figma](verificacion/pagina-componentes.png)

## Fundamentos

Todos salen de [`app/src/ui/tokens.ts`](../../app/src/ui/tokens.ts). En Figma son
la colección de variables **Piko · Tokens** y los estilos de texto **Piko/…**.

### Color

| | Token | Valor | Contraste sobre papel |
|---|---|---|---|
| ![verde](tokens/verde.svg) | `verde` | `#0F5D3D` | 6.99 |
| ![verdeHondo](tokens/verdeHondo.svg) | `verdeHondo` | `#0A4530` | 9.72 |
| ![verdeBosque](tokens/verdeBosque.svg) | `verdeBosque` | `#197249` | 5.23 |
| ![verdeMonte](tokens/verdeMonte.svg) | `verdeMonte` | `#327945` | 4.69 |
| ![verdeHoja](tokens/verdeHoja.svg) | `verdeHoja` | `#61A66B` | 2.58 |
| ![verdePasto](tokens/verdePasto.svg) | `verdePasto` | `#97C137` | 1.85 |
| ![cielo](tokens/cielo.svg) | `cielo` | `#60C5FA` | 1.71 |
| ![cieloHondo](tokens/cieloHondo.svg) | `cieloHondo` | `#3AA8E0` | 2.36 |
| ![nube](tokens/nube.svg) | `nube` | `#DDF1FC` | 1.03 |
| ![papel](tokens/papel.svg) | `papel` | `#F7F0E4` | 1.00 |
| ![papelHondo](tokens/papelHondo.svg) | `papelHondo` | `#ECE1CC` | 1.14 |
| ![blanco](tokens/blanco.svg) | `blanco` | `#FFFFFF` | 1.13 |
| ![copete](tokens/copete.svg) | `copete` | `#E97927` | 2.56 |
| ![pico](tokens/pico.svg) | `pico` | `#E8A429` | 1.90 |
| ![picoHondo](tokens/picoHondo.svg) | `picoHondo` | `#C9862060` | — |
| ![grafito](tokens/grafito.svg) | `grafito` | `#16241D` | 14.21 |
| ![tinta](tokens/tinta.svg) | `tinta` | `#33453B` | 9.02 |
| ![tintaSuave](tokens/tintaSuave.svg) | `tintaSuave` | `#6B7A70` | 3.99 |
| ![borde](tokens/borde.svg) | `borde` | `#E3DACA` | 1.22 |
| ![bordeHondo](tokens/bordeHondo.svg) | `bordeHondo` | `#CFC3AD` | 1.54 |
| ![acierto](tokens/acierto.svg) | `acierto` | `#97C137` | 1.85 |
| ![aciertoFondo](tokens/aciertoFondo.svg) | `aciertoFondo` | `#EDF8D9` | 1.03 |
| ![aciertoTinta](tokens/aciertoTinta.svg) | `aciertoTinta` | `#3F6B0E` | 5.58 |
| ![intento](tokens/intento.svg) | `intento` | `#E8A429` | 1.90 |
| ![intentoFondo](tokens/intentoFondo.svg) | `intentoFondo` | `#FDF2DC` | 1.02 |
| ![intentoTinta](tokens/intentoTinta.svg) | `intentoTinta` | `#8A5A08` | 5.23 |

El error es **ámbar** (`intento`), nunca rojo: Piko refuerza sin regañar.

### Tipografía

Dos familias, las mismas de la landing, empaquetadas en la app para que
funcione sin internet: **Fredoka** (títulos y botones) y **Nunito Sans** (cuerpo).

| Estilo | Fuente | Tamaño / alto | Espaciado | Caja | Uso |
|---|---|---|---|---|---|
| **display** | Fredoka 700Bold | 32 / 36 | 0 | — | Título de pantalla, números grandes |
| **titulo** | Fredoka 600SemiBold | 24 / 29 | 0 | — | Lema, valores de las tarjetas de dato |
| **subtitulo** | Fredoka 600SemiBold | 19 / 24 | 0 | — | Opciones, títulos de tarjetas y de la barra de respuesta |
| **cuerpo** | NunitoSans 400Regular | 16 / 24 | 0 | — | Texto corrido, descripciones |
| **cuerpoFuerte** | NunitoSans 700Bold | 16 / 24 | 0 | — | Globos de Piko, fichas, énfasis |
| **chico** | NunitoSans 400Regular | 13 / 18 | 0 | — | Ayudas, subtítulos, etiquetas de dato |
| **etiqueta** | Fredoka 600SemiBold | 13 | 1.2 | MAYÚSC. | Rótulos en mayúsculas sobre secciones |
| **Botón** | Fredoka SemiBold | 16 | 0.6 | MAYÚSC. | Todos los botones (14 en los chicos) |

### Espaciado, radios y volumen

- Escala de 4 puntos: `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `xxl` 32 · `xxxl` 48.
- Radios: `sm` 10 · `md` 16 · `lg` 20 · `xl` 28 · `redondo` 999.
- **Labio**: borde inferior más oscuro de 4 px (3 px en los chicos) que da volumen sin sombras ni degradados — más barato en gama baja.
- Animaciones: 120 / 200 / 380 ms.

![La página de fundamentos en Figma](verificacion/pagina-fundamentos.png)

## Componentes

## Acciones

### Botón

El botón de Piko.  
Código: [`app/src/ui/components/Boton.tsx`](../../app/src/ui/components/Boton.tsx)

**Propiedades de variante en Figma:** `Tono`, `Tamaño`, `Estado` · **Usos en las pantallas:** 47

<table><tr><td align="center"><img src="componentes/boton-tono-fantasma-tamano-normal-estado-activo.png" alt="fantasma · normal · activo" width="242"/><br/><sub>fantasma · normal · activo</sub></td><td align="center"><img src="componentes/boton-tono-verde-tamano-normal-estado-deshabilitado.png" alt="verde · normal · deshabilitado" width="242"/><br/><sub>verde · normal · deshabilitado</sub></td><td align="center"><img src="componentes/boton-tono-verde-tamano-normal-estado-activo.png" alt="verde · normal · activo" width="242"/><br/><sub>verde · normal · activo</sub></td><td align="center"><img src="componentes/boton-tono-pico-tamano-normal-estado-activo.png" alt="pico · normal · activo" width="242"/><br/><sub>pico · normal · activo</sub></td><td align="center"><img src="componentes/boton-tono-papel-tamano-normal-estado-activo.png" alt="papel · normal · activo" width="242"/><br/><sub>papel · normal · activo</sub></td><td align="center"><img src="componentes/boton-tono-cielo-tamano-normal-estado-activo.png" alt="cielo · normal · activo" width="242"/><br/><sub>cielo · normal · activo</sub></td><td align="center"><img src="componentes/boton-tono-pico-tamano-normal-estado-deshabilitado.png" alt="pico · normal · deshabilitado" width="242"/><br/><sub>pico · normal · deshabilitado</sub></td></tr></table>


| Tono | Cuándo |
|---|---|
| **verde** | La acción principal de la pantalla: Practicar, Comprobar, Continuar. Una sola por pantalla. |
| **pico** (ámbar) | Juego y alternativas festivas: Minijuegos, Canjear código; continuar tras un intento. |
| **papel** | Acción secundaria al lado de una principal: Cambiar de tema, La Música de Piko. |
| **cielo** | Lo que tiene que ver con la clase en red: Unirme a la clase. |
| **fantasma** | Volver o salir. Sin fondo ni labio. |

Siempre en mayúsculas (Fredoka SemiBold 16, espaciado 0.6), una sola línea; si no entra, se corta con «…». Deshabilitado = 45 % de opacidad. Al tocarlo, el cuerpo baja los 4 px del labio en 60 ms.

### Botón circular

Botón redondo de 44 × 44 con un ícono: volver atrás en los encabezados.  
Código: [`app/minijuegos/index.tsx`](../../app/minijuegos/index.tsx)

**Usos en las pantallas:** 2

<table><tr><td align="center"><img src="componentes/botoncircular-base.png" alt="base" width="41"/><br/><sub>base</sub></td></tr></table>


### Chip de idioma

Selector de la lengua de la interfaz (Español / Miskitu). El elegido va relleno de verde.  
Código: [`app/index.tsx`](../../app/index.tsx)

**Propiedades de variante en Figma:** `Estado` · **Usos en las pantallas:** 2

<table><tr><td align="center"><img src="componentes/chipidioma-estado-elegido.png" alt="elegido" width="73"/><br/><sub>elegido</sub></td><td align="center"><img src="componentes/chipidioma-estado-normal.png" alt="normal" width="69"/><br/><sub>normal</sub></td></tr></table>


### Etiqueta de lengua

Píldora informativa con el nombre de cada lengua que enseña Piko. No es tocable.  
Código: [`app/index.tsx`](../../app/index.tsx)

**Usos en las pantallas:** 6

<table><tr><td align="center"><img src="componentes/etiquetalengua-base.png" alt="base" width="54"/><br/><sub>base</sub></td></tr></table>


## Encabezados

### Encabezado de pantalla

Volver + título + contador de sacuanjoches (que lleva al perfil). Encabeza Minijuegos y La Música de Piko.  
Código: [`app/minijuegos/index.tsx`](../../app/minijuegos/index.tsx)

**Usos en las pantallas:** 2

<table><tr><td align="center"><img src="componentes/encabezado-base.png" alt="base" width="242"/><br/><sub>base</sub></td></tr></table>


Patrón para pantallas secundarias: botón circular de volver (44 × 44), título y el contador de sacuanjoches, que también es un acceso al perfil.

## Tarjetas

### Tarjeta de acceso

Fila tocable con ícono, título, subtítulo y un dato a la derecha: lleva al madroño y a los logros desde el inicio.  
Código: [`app/index.tsx`](../../app/index.tsx)

**Usos en las pantallas:** 2

<table><tr><td align="center"><img src="componentes/tarjetaacceso-base.png" alt="base" width="242"/><br/><sub>base</sub></td><td align="center"><img src="componentes/tarjetaacceso-forma-b.png" alt="base" width="242"/><br/><sub>base</sub></td></tr></table>


### Tarjeta de minijuego

Ícono del juego, nombre, descripción y el botón «Jugar». Lleva el labio inferior de 6 px.  
Código: [`app/minijuegos/index.tsx`](../../app/minijuegos/index.tsx)

**Usos en las pantallas:** 4

<table><tr><td align="center"><img src="componentes/tarjetaminijuego-base.png" alt="base" width="242"/><br/><sub>base</sub></td><td align="center"><img src="componentes/tarjetaminijuego-forma-b.png" alt="base" width="242"/><br/><sub>base</sub></td><td align="center"><img src="componentes/tarjetaminijuego-forma-c.png" alt="base" width="242"/><br/><sub>base</sub></td><td align="center"><img src="componentes/tarjetaminijuego-forma-d.png" alt="base" width="242"/><br/><sub>base</sub></td></tr></table>


### Tarjeta de canción

Instrumento, título, lengua y región, nivel y el botón para cantar.  
Código: [`app/musica/index.tsx`](../../app/musica/index.tsx)

**Usos en las pantallas:** 16

<table><tr><td align="center"><img src="componentes/tarjetacancion-base.png" alt="base" width="242"/><br/><sub>base</sub></td></tr></table>


### Celda de logro

Insignia + nombre + avance. Ganada a color, pendiente en gris con candado, especial en azul y oro.  
Código: [`app/logros/index.tsx`](../../app/logros/index.tsx)

**Propiedades de variante en Figma:** `Estado` · **Usos en las pantallas:** 23

<table><tr><td align="center"><img src="componentes/celdalogro-estado-especial.png" alt="especial" width="82"/><br/><sub>especial</sub></td><td align="center"><img src="componentes/celdalogro-estado-ganada.png" alt="ganada" width="82"/><br/><sub>ganada</sub></td><td align="center"><img src="componentes/celdalogro-estado-pendiente.png" alt="pendiente" width="82"/><br/><sub>pendiente</sub></td><td align="center"><img src="componentes/celdalogro-estado-pendiente-forma-b.png" alt="pendiente" width="82"/><br/><sub>pendiente</sub></td></tr></table>


### Etapa del madroño

Una etapa del camino de semilla a árbol florecido; la actual se resalta en verde.  
Código: [`app/arbol.tsx`](../../app/arbol.tsx)

**Propiedades de variante en Figma:** `Estado` · **Usos en las pantallas:** 6

<table><tr><td align="center"><img src="componentes/tarjetaetapa-estado-normal.png" alt="normal" width="242"/><br/><sub>normal</sub></td><td align="center"><img src="componentes/tarjetaetapa-estado-actual.png" alt="actual" width="242"/><br/><sub>actual</sub></td></tr></table>


### Aviso informativo

Bloque celeste con título y texto para instrucciones importantes (antes de abrir la sala).  
Código: [`app/maestro/index.tsx`](../../app/maestro/index.tsx)

**Usos en las pantallas:** 1

<table><tr><td align="center"><img src="componentes/aviso-base.png" alt="base" width="242"/><br/><sub>base</sub></td></tr></table>


## Formularios

### Campo de código

Formulario de canje: etiqueta, campo de texto grande y el formato esperado debajo.  
Código: [`app/logros/canjear.tsx`](../../app/logros/canjear.tsx)

**Usos en las pantallas:** 1

<table><tr><td align="center"><img src="componentes/campocodigo-base.png" alt="base" width="242"/><br/><sub>base</sub></td></tr></table>


Formulario de un solo campo. La etiqueta va arriba, el campo es grande (48 px) y centrado, y el formato esperado se muestra debajo como ejemplo.

### Campo de texto

Entrada de texto: fondo blanco, radio 16, texto Fredoka centrado. El texto de ayuda va en gris.  
Código: [`app/logros/canjear.tsx`](../../app/logros/canjear.tsx)

**Usos en las pantallas:** 1

<table><tr><td align="center"><img src="componentes/campo-base.png" alt="base" width="214"/><br/><sub>base</sub></td></tr></table>


## Ejercicios

### Opción

Tarjeta de opción para los ejercicios de selección.  
Código: [`app/src/ui/components/Opcion.tsx`](../../app/src/ui/components/Opcion.tsx)

**Propiedades de variante en Figma:** `Estado`, `Atajo` · **Usos en las pantallas:** 18

<table><tr><td align="center"><img src="componentes/opcion-estado-elegida-atajo-sin-numero.png" alt="elegida · sin número" width="121"/><br/><sub>elegida · sin número</sub></td><td align="center"><img src="componentes/opcion-estado-normal-atajo-sin-numero.png" alt="normal · sin número" width="121"/><br/><sub>normal · sin número</sub></td><td align="center"><img src="componentes/opcion-estado-normal-atajo-con-numero.png" alt="normal · con número" width="242"/><br/><sub>normal · con número</sub></td><td align="center"><img src="componentes/opcion-estado-correcta-atajo-con-numero.png" alt="correcta · con número" width="242"/><br/><sub>correcta · con número</sub></td></tr></table>


Cuatro estados: **normal** (blanco), **elegida** (celeste, antes de comprobar), **correcta** (verde) y **fallada** (ámbar — nunca rojo). Con número de atajo en los ejercicios; sin número para elegir lengua o tema. Alto mínimo 64 px.

### Ficha de palabra

Ficha de palabra para armar oraciones.  
Código: [`app/src/ui/components/Bloque.tsx`](../../app/src/ui/components/Bloque.tsx)

**Propiedades de variante en Figma:** `Estado` · **Usos en las pantallas:** 27

<table><tr><td align="center"><img src="componentes/bloque-estado-normal.png" alt="normal" width="53"/><br/><sub>normal</sub></td><td align="center"><img src="componentes/bloque-estado-hueco.png" alt="hueco" width="41"/><br/><sub>hueco</sub></td></tr></table>


La ficha se toca (no se arrastra): sube al renglón y deja su **hueco** en el banco para que nada se reacomode bajo el dedo.

### Barra de respuesta

La barra que aparece abajo después de responder.  
Código: [`app/src/features/exercises/BarraFeedback.tsx`](../../app/src/features/exercises/BarraFeedback.tsx)

**Propiedades de variante en Figma:** `Resultado` · **Usos en las pantallas:** 2

<table><tr><td align="center"><img src="componentes/barrafeedback-resultado-acierto.png" alt="acierto" width="260"/><br/><sub>acierto</sub></td><td align="center"><img src="componentes/barrafeedback-resultado-intento.png" alt="intento" width="260"/><br/><sub>intento</sub></td></tr></table>


Aparece desde abajo al comprobar. **Acierto**: verde, Piko alegre. **Intento**: ámbar, Piko animando, y muestra la respuesta correcta sin decir nunca «incorrecto».

## Piko

### Globo de diálogo

El globo de diálogo de Piko. Va siempre pegado a la mascota, con la colita apuntándole.  
Código: [`app/src/ui/components/Globo.tsx`](../../app/src/ui/components/Globo.tsx)

**Propiedades de variante en Figma:** `Cola` · **Usos en las pantallas:** 8

<table><tr><td align="center"><img src="componentes/globo-cola-abajo.png" alt="abajo" width="202"/><br/><sub>abajo</sub></td><td align="center"><img src="componentes/globo-cola-izquierda.png" alt="izquierda" width="159"/><br/><sub>izquierda</sub></td></tr></table>


Siempre pegado a Piko, con la cola hacia él: a la **izquierda** cuando Piko está al costado, **abajo** cuando está debajo.

### Piko

Piko, el chocoyo.  
Código: [`app/src/ui/piko/PikoMascota.tsx`](../../app/src/ui/piko/PikoMascota.tsx)

**Propiedades de variante en Figma:** `Estado` · **Usos en las pantallas:** 21

<table><tr><td align="center"><img src="componentes/pikomascota-estado-idle.png" alt="idle" width="52"/><br/><sub>idle</sub></td><td align="center"><img src="componentes/pikomascota-estado-pensando.png" alt="pensando" width="50"/><br/><sub>pensando</sub></td><td align="center"><img src="componentes/pikomascota-estado-alegre.png" alt="alegre" width="44"/><br/><sub>alegre</sub></td><td align="center"><img src="componentes/pikomascota-estado-pensando-forma-b.png" alt="pensando" width="50"/><br/><sub>pensando</sub></td><td align="center"><img src="componentes/pikomascota-estado-idle-forma-b.png" alt="idle" width="50"/><br/><sub>idle</sub></td><td align="center"><img src="componentes/pikomascota-estado-animando.png" alt="animando" width="44"/><br/><sub>animando</sub></td><td align="center"><img src="componentes/pikomascota-estado-celebrando.png" alt="celebrando" width="34"/><br/><sub>celebrando</sub></td><td align="center"><img src="componentes/pikomascota-estado-saludando.png" alt="saludando" width="85"/><br/><sub>saludando</sub></td></tr></table>

<sub>…y 2 variantes más en Figma.</sub>


## Progreso

### Barra de progreso

La barra de avance de la ronda. Gorda, redonda y con un brillo arriba — la que corona todas las pantallas de ejercicio.  
Código: [`app/src/ui/components/BarraProgreso.tsx`](../../app/src/ui/components/BarraProgreso.tsx)

**Propiedades de variante en Figma:** `Tono`, `Avance` · **Usos en las pantallas:** 10

<table><tr><td align="center"><img src="componentes/barraprogreso-tono-verdepasto-avance-0.png" alt="verdePasto · 0%" width="221"/><br/><sub>verdePasto · 0%</sub></td><td align="center"><img src="componentes/barraprogreso-tono-verdepasto-avance-13.png" alt="verdePasto · 13%" width="221"/><br/><sub>verdePasto · 13%</sub></td><td align="center"><img src="componentes/barraprogreso-tono-verdepasto-avance-50.png" alt="verdePasto · 50%" width="187"/><br/><sub>verdePasto · 50%</sub></td><td align="center"><img src="componentes/barraprogreso-tono-verdehoja-avance-0.png" alt="verdeHoja · 0%" width="242"/><br/><sub>verdeHoja · 0%</sub></td><td align="center"><img src="componentes/barraprogreso-tono-pico-avance-10.png" alt="pico · 10%" width="168"/><br/><sub>pico · 10%</sub></td></tr></table>


### Contador de sacuanjoches

La pastilla con las sacuanjoches del estudiante. Va en las cabeceras para que el total esté siempre a la vista; tocarla lleva al perfil.  
Código: [`app/src/ui/arbol/ContadorSacuanjoches.tsx`](../../app/src/ui/arbol/ContadorSacuanjoches.tsx)

**Usos en las pantallas:** 5

<table><tr><td align="center"><img src="componentes/contadorsacuanjoches-base.png" alt="base" width="53"/><br/><sub>base</sub></td></tr></table>


### Tarjeta de dato

Un número grande con su etiqueta: lecciones, XP, racha, correctas.  
Código: [`app/perfil.tsx`](../../app/perfil.tsx)

**Usos en las pantallas:** 10

<table><tr><td align="center"><img src="componentes/dato-base.png" alt="base" width="77"/><br/><sub>base</sub></td></tr></table>


### Paso del ciclo

Número en círculo verde y una acción corta: el ciclo aprender → sacuanjoches → árbol → Piko sube.  
Código: [`app/arbol.tsx`](../../app/arbol.tsx)

**Usos en las pantallas:** 4

<table><tr><td align="center"><img src="componentes/paso-base.png" alt="base" width="64"/><br/><sub>base</sub></td></tr></table>


## Logros

### Insignia de logro

La insignia de un logro.  
Código: [`app/src/ui/logros/Insignia.tsx`](../../app/src/ui/logros/Insignia.tsx)

**Propiedades de variante en Figma:** `Logro`, `Estado` · **Usos en las pantallas:** 26

<table><tr><td align="center"><img src="componentes/insignia-logro-primera-palabra-estado-ganada.png" alt="primera-palabra · ganada" width="105"/><br/><sub>primera-palabra · ganada</sub></td><td align="center"><img src="componentes/insignia-logro-primer-paso-estado-ganada.png" alt="primer-paso · ganada" width="47"/><br/><sub>primer-paso · ganada</sub></td><td align="center"><img src="componentes/insignia-logro-piko-hackathon-2026-estado-bloqueada.png" alt="piko-hackathon-2026 · bloqueada" width="67"/><br/><sub>piko-hackathon-2026 · bloqueada</sub></td><td align="center"><img src="componentes/insignia-logro-ya-arrancamos-estado-bloqueada.png" alt="ya-arrancamos · bloqueada" width="67"/><br/><sub>ya-arrancamos · bloqueada</sub></td><td align="center"><img src="componentes/insignia-logro-aprendiz-constante-estado-bloqueada.png" alt="aprendiz-constante · bloqueada" width="67"/><br/><sub>aprendiz-constante · bloqueada</sub></td><td align="center"><img src="componentes/insignia-logro-dominando-el-camino-estado-bloqueada.png" alt="dominando-el-camino · bloqueada" width="67"/><br/><sub>dominando-el-camino · bloqueada</sub></td><td align="center"><img src="componentes/insignia-logro-no-te-detengas-estado-bloqueada.png" alt="no-te-detengas · bloqueada" width="67"/><br/><sub>no-te-detengas · bloqueada</sub></td><td align="center"><img src="componentes/insignia-logro-constancia-estado-bloqueada.png" alt="constancia · bloqueada" width="67"/><br/><sub>constancia · bloqueada</sub></td></tr></table>

<sub>…y 15 variantes más en Figma.</sub>


## Ilustraciones

### Sacuanjoche

La sacuanjoche, flor nacional de Nicaragua, como moneda de Piko.  
Código: [`app/src/ui/arbol/Sacuanjoche.tsx`](../../app/src/ui/arbol/Sacuanjoche.tsx)

**Usos en las pantallas:** 27

<table><tr><td align="center"><img src="componentes/sacuanjoche-base.png" alt="base" width="25"/><br/><sub>base</sub></td></tr></table>


### Madroño miniatura

El madroño de una etapa en chiquito, encuadrado para que se lea: en la portada y en el camino de etapas. Sin Piko y sin animación.  
Código: [`app/src/ui/arbol/MiniaturaArbol.tsx`](../../app/src/ui/arbol/MiniaturaArbol.tsx)

**Propiedades de variante en Figma:** `Etapa` · **Usos en las pantallas:** 7

<table><tr><td align="center"><img src="componentes/miniaturaarbol-etapa-brote.png" alt="brote" width="50"/><br/><sub>brote</sub></td><td align="center"><img src="componentes/miniaturaarbol-etapa-semilla.png" alt="semilla" width="47"/><br/><sub>semilla</sub></td><td align="center"><img src="componentes/miniaturaarbol-etapa-arbolito.png" alt="arbolito" width="39"/><br/><sub>arbolito</sub></td><td align="center"><img src="componentes/miniaturaarbol-etapa-hojas.png" alt="hojas" width="37"/><br/><sub>hojas</sub></td><td align="center"><img src="componentes/miniaturaarbol-etapa-flores.png" alt="flores" width="35"/><br/><sub>flores</sub></td><td align="center"><img src="componentes/miniaturaarbol-etapa-florecido.png" alt="florecido" width="35"/><br/><sub>florecido</sub></td></tr></table>


### Madroño

El madroño del estudiante, con Piko encima.  
Código: [`app/src/ui/arbol/ArbolMadrono.tsx`](../../app/src/ui/arbol/ArbolMadrono.tsx)

**Propiedades de variante en Figma:** `Sacuanjoches` · **Usos en las pantallas:** 4

<table><tr><td align="center"><img src="componentes/arbolmadrono-sacuanjoches-4.png" alt="4" width="158"/><br/><sub>4</sub></td></tr></table>


### Instrumento

Instrumentos para las tarjetas de las canciones: el tambor y la concha de la Costa Caribe, la marimba de arco, la guitarra, la quijada de burro y las maracas. Pocos trazos y colores de la paleta: se dibujan varios a la vez.  
Código: [`app/src/ui/musica/Instrumento.tsx`](../../app/src/ui/musica/Instrumento.tsx)

**Propiedades de variante en Figma:** `Dibujo` · **Usos en las pantallas:** 18

<table><tr><td align="center"><img src="componentes/instrumento-dibujo-tambor.png" alt="tambor" width="50"/><br/><sub>tambor</sub></td><td align="center"><img src="componentes/instrumento-dibujo-marimba.png" alt="marimba" width="50"/><br/><sub>marimba</sub></td><td align="center"><img src="componentes/instrumento-dibujo-guitarra.png" alt="guitarra" width="62"/><br/><sub>guitarra</sub></td><td align="center"><img src="componentes/instrumento-dibujo-maracas.png" alt="maracas" width="62"/><br/><sub>maracas</sub></td><td align="center"><img src="componentes/instrumento-dibujo-concha.png" alt="concha" width="62"/><br/><sub>concha</sub></td><td align="center"><img src="componentes/instrumento-dibujo-quijada.png" alt="quijada" width="62"/><br/><sub>quijada</sub></td></tr></table>


## Íconos

### Ícono · Gallinita ciega

Íconos de trazo de los minijuegos. Dibujados con pocos trazos, sin emojis: se ven igual en cualquier teléfono.  
Código: [`app/src/ui/minijuegos/Iconos.tsx`](../../app/src/ui/minijuegos/Iconos.tsx)

**Usos en las pantallas:** 1

<table><tr><td align="center"><img src="componentes/iconogallinita-base.png" alt="base" width="62"/><br/><sub>base</sub></td></tr></table>


### Ícono · Chibolas

Íconos de trazo de los minijuegos. Dibujados con pocos trazos, sin emojis: se ven igual en cualquier teléfono.  
Código: [`app/src/ui/minijuegos/Iconos.tsx`](../../app/src/ui/minijuegos/Iconos.tsx)

**Usos en las pantallas:** 1

<table><tr><td align="center"><img src="componentes/iconochibolas-base.png" alt="base" width="62"/><br/><sub>base</sub></td></tr></table>


### Ícono · Trompo

Íconos de trazo de los minijuegos. Dibujados con pocos trazos, sin emojis: se ven igual en cualquier teléfono.  
Código: [`app/src/ui/minijuegos/Iconos.tsx`](../../app/src/ui/minijuegos/Iconos.tsx)

**Usos en las pantallas:** 1

<table><tr><td align="center"><img src="componentes/iconotrompo-base.png" alt="base" width="62"/><br/><sub>base</sub></td></tr></table>


### Ícono · Rayuela

La rayuela dibujada con tiza, en chiquito: 1, 2|3, 4, 5|6 y el cielo. Es el ícono del juego en la lista de minijuegos y en la portada de la partida.  
Código: [`app/src/ui/minijuegos/IconoRayuela.tsx`](../../app/src/ui/minijuegos/IconoRayuela.tsx)

**Usos en las pantallas:** 1

<table><tr><td align="center"><img src="componentes/iconorayuela-base.png" alt="base" width="62"/><br/><sub>base</sub></td></tr></table>



## Reglas para sumar un componente

1. Usar los tokens: nada de colores ni tamaños sueltos.
2. Mínimo **44 × 44** de área tocable (ver [accesibilidad](05-accesibilidad.md)).
3. Plano, con labio si se toca; sin sombras difusas.
4. El texto de los botones en una línea; el de las tarjetas puede crecer (auto layout vertical).
5. Si es de código, agregarlo a `CATALOGO` en [`figma/captura/pantallas.mjs`](../../figma/captura/pantallas.mjs) con la función que decide su variante, y volver a capturar.

---

<sub>Generado por `figma/captura/documentar.mjs` a partir de la captura del 9 de octubre de 2026. Las cifras y tablas salen de la app real; para actualizarlas, ver [figma/README.md](../../figma/README.md).</sub>
