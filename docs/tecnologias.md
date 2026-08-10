# Tecnologías

Todas las elecciones responden a las mismas tres restricciones: **sin
internet**, **teléfonos de gama baja**, y **un equipo chico con una fecha
encima**.

## El stack

| Pieza | Versión | Para qué |
|---|---|---|
| React Native | 0.86 | La aplicación |
| Expo SDK | 57 | Módulos nativos, compilación en la nube, herramientas |
| TypeScript | 6 | En modo estricto, con índices verificados |
| expo-router | 57 | Navegación basada en la carpeta `app/` |
| react-native-tcp-socket | 6.4 | Sockets TCP: el aula en red |
| react-native-udp | 4.1 | Reservado para descubrimiento por difusión |
| expo-sqlite | 57 | La base local |
| expo-speech | 57 | Síntesis de voz para los ejercicios de escucha en inglés |
| expo-audio | 57 | Reproducción de grabaciones (para las lenguas indígenas) |
| react-native-svg | 15 | La mascota y el logotipo vectoriales |
| zustand | 5 | Estado de la aplicación, sin ceremonia |
| Vitest | 4 | Las pruebas |
| tsx | 4 | Ejecuta el simulador y las herramientas |

Tipografías **Fredoka** y **Nunito Sans**, las mismas de la landing,
empaquetadas en el APK — la app tiene que arrancar igual de bien sin señal.

## Por qué cada pieza

### Expo en lugar de React Native puro

El equipo no tiene Android SDK ni Java instalados, y montarlos es una tarde de
trabajo y unos 10 GB de disco. Con **EAS Build** la compilación ocurre en la
nube: se necesita internet sólo en el momento de compilar, nunca para usar la
app.

Expo además resuelve de fábrica el manejo de permisos, iconos, splash y la
configuración de Gradle, que en un proyecto con fecha de entrega es tiempo que
no se gasta.

El costo: la app **no corre en Expo Go** porque usa módulos nativos. Hace falta
un *development build*, que se compila una sola vez.

### TCP crudo en lugar de HTTP o WebSocket

Se evaluaron cuatro caminos:

| Opción | Por qué no |
|---|---|
| Node en el dispositivo | Agrega 15–30 MB al APK. Contradice el objetivo de gama baja |
| HTTP con sondeo | No es tiempo real y desperdicia batería |
| WebSocket | Exige un apretón de manos y cabeceras que no hacen falta |
| **TCP + NDJSON** | ✅ Ligero, en tiempo real, y suficiente |

Los dos extremos son la misma aplicación, así que no hay que hablar un
protocolo estándar con nadie. Una línea de JSON por mensaje alcanza, y el
código que lo maneja entra en un archivo.

### SQLite en lugar de almacenamiento clave-valor

La sincronización diferencial necesita preguntar cosas como *"dame los eventos
posteriores al número 40 de esta estudiante"*. Con un almacén clave-valor eso
significa cargar todo a memoria y filtrar; con SQLite es un índice.

Además el registro de eventos crece sin techo a lo largo del año escolar, y
SQLite lo maneja sin despeinarse.

### Zustand en lugar de Redux o Context

Tres almacenes pequeños: progreso, cliente del aula y anfitrión. Sin
proveedores, sin reductores ceremoniales, sin volver a renderizar el árbol
entero. Lo importante es que las conexiones de red **viven fuera del ciclo de
vida de React**: si el estudiante navega entre pantallas o una vista se vuelve
a montar, el socket y el progreso pendiente siguen intactos.

### Vitest en lugar de Jest

El núcleo es TypeScript puro, así que las pruebas no necesitan el entorno de
React Native. Vitest arranca en menos de un segundo y no pide configuración de
transformación. La suite completa corre en unos cuatro segundos, que es lo que
hace que valga la pena correrla seguido.

### Síntesis de voz sólo para inglés

Android trae voces sintéticas para inglés, y eso resuelve los ejercicios de
escucha sin grabar nada.

Para miskito, mayangna, rama y garífuna **no existe síntesis**, y hacerlas
"hablar" con una voz en español enseñaría una pronunciación falsa. El validador
de contenido rechaza a propósito la síntesis en esas lenguas: sus paquetes
requieren grabaciones de hablantes reales.

## Rendimiento en gama baja

| Medida | Efecto |
|---|---|
| Hermes | Arranque más rápido y menos memoria |
| `minSdkVersion 24` | Llega hasta Android 7 |
| ProGuard y reducción de recursos | APK más chico en la versión final |
| Tipografías importadas por ruta exacta | Se ahorran ~1.6 MB — el índice de los paquetes de fuentes arrastra las 21 variantes; sólo se usan 6 |
| Mascota vectorial, no mapa de bits | Un solo archivo para todos los tamaños |
| Animaciones por el hilo nativo | No compiten con la lógica de la aplicación |
| Bloques por toque, no arrastre | Sin dependencia de gestos, y más preciso |

El bundle actual pesa 3.2 MB de bytecode. La meta del APK es quedar por debajo
de 30 MB.

## Ejecución en la computadora

La aplicación también corre en el navegador, y sirve para trabajar la interfaz
sin un teléfono a mano. Metro elige archivos por plataforma:

| En el teléfono | En el navegador |
|---|---|
| `src/db/base.ts` — SQLite real | `src/db/base.web.ts` — en memoria |
| `src/net/transporte.ts` — sockets TCP | `src/net/transporte.web.ts` — error explicativo |

Así `expo-sqlite` y `react-native-tcp-socket` **ni siquiera entran** al paquete
web. Dos diferencias, ambas deliberadas: el aula en red no funciona (un
navegador no puede abrir un socket TCP crudo, y no hay forma de sortearlo) y el
progreso no persiste entre recargas.

## Herramientas propias

| Comando | Qué hace |
|---|---|
| `npm run sim` | Levanta un aula completa sobre TCP en la computadora |
| `npm run validate:packs` | Verifica el contenido y muestra la cobertura por lengua |
| `npm run gen:svg` | Convierte los SVG de `assets/vector/` en módulos importables |
| `npm run typecheck` | Revisa la aplicación y las herramientas por separado |

El simulador merece una mención aparte: además de servir para desarrollar sin
teléfonos, es el **plan B de la demostración** si falla un equipo.
