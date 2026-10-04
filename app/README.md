# Piko — la app

Aprendizaje de lenguas para escuelas rurales de Nicaragua. Funciona **sin
internet**: el teléfono del maestro levanta la sala y los estudiantes se
conectan a su hotspot para jugar entre sí.

## Arrancar

Hace falta **Node 22 o más nuevo** (las pruebas de persistencia usan
`node:sqlite`). Todos los comandos se corren desde esta carpeta.

```bash
npm install
```

### Desde la computadora (para trabajar la interfaz)

```bash
npm run web
```

Abre en `http://localhost:8081`. Sirve para toda la interfaz y la práctica en
solitario, que es donde se trabaja el diseño y se prueban los sprites de Piko.

Dos diferencias respecto del teléfono, ambas a propósito:

- **El aula en red no funciona.** Un navegador no puede abrir un socket TCP
  crudo; no es algo que se pueda sortear. Para la sala, teléfonos o
  `npm run sim`.
- **El progreso no persiste.** En web la base es en memoria (`src/db/base.web.ts`);
  el soporte web de `expo-sqlite` es alfa y pide wasm más cabeceras de
  `SharedArrayBuffer`, que no vale la pena para mirar pantallas.

Metro elige por plataforma: `base.ts` / `base.web.ts` y `transporte.ts` /
`transporte.web.ts`. Así `expo-sqlite` y `react-native-tcp-socket` ni siquiera
entran al bundle web.

### En el teléfono

La app usa módulos nativos (sockets TCP), así que **no corre en Expo Go**. Hace
falta un development build:

```bash
npx eas build --profile development --platform android
```

Con el dev client instalado en el teléfono:

```bash
npm start
```

## Verificar sin teléfono

Casi todo se comprueba en la computadora, que es lo que permite avanzar rápido
sin un aula llena de equipos:

```bash
npm test
```
151 pruebas sobre el núcleo puro y la persistencia: el framer de líneas partido
a mitad de paquete, la convergencia de la sincronización diferencial, el
determinismo de la proyección, los umbrales del semáforo y el esquema SQLite
real (contra `node:sqlite`).

```bash
npm run sim -- --students 8 --rondas 2
```
Levanta **un host real y ocho clientes reales** sobre TCP en localhost, con el
mismo código que corre en los teléfonos. Juega dos rondas, tira un teléfono a
mitad de camino, lo reconecta, y verifica que todos converjan. También sirve de
plan B en la demo si falla un equipo.

```bash
npm run validate:packs   # formato del contenido y cobertura por lengua
npm run typecheck        # app + herramientas de Node
```

## Cómo está armado

```
app/            pantallas (expo-router)
content/        paquetes de contenido en JSON + índice estático
src/
  core/         ⚠ TypeScript PURO, sin un solo import de React Native
    protocol/   mensajes del aula + framer NDJSON
    sync/       sincronización diferencial (snapshot + cola)
    progress/   eventos, proyección determinista, semáforo de rezago
    content/    esquema, selección de ítems, corrección de respuestas
    session/    la sala como reductor puro
    minijuegos/ preguntas y niveles de los minijuegos, desde el vocabulario aprendido
  net/          transporte (nativo / Node), host y cliente
  db/           SQLite: esquema, migraciones, log de eventos
  ui/           sistema de diseño y Piko
  features/     ejercicios, progreso, sala, minijuegos
tools/          simulador, validador de paquetes, generador de SVG
tests/          vitest
```

**La regla que sostiene todo:** `src/core/` no importa React Native. Por eso el
protocolo, la sincronización y el motor de progreso se prueban en Node, y la
misma lógica de sala corre igual en el simulador que en el teléfono — lo único
que cambia es qué transporte se le inyecta.

## Minijuegos

`app/minijuegos/` es la sección de minijuegos; la lista sale de
`src/features/minijuegos/catalogo.ts`, que explica cómo sumar uno nuevo. Todos
se juegan en inglés o en miskito, sólo con palabras de las lecciones que el
estudiante ya hizo (`src/core/minijuegos/vocabulario.ts`), y sus niveles
(inicial, intermedio, avanzado) se abren con esas lecciones.

- **Rayuela de Piko**: seis saltos; en cada uno se elige la casilla correcta.
- **El Trompo de Piko**: se lanza el trompo y, mientras gira, salen retos con
  tiempo (traducción, significado, imagen y audio). Acertar le da fuerza y
  fallar se la quita; con seis aciertos antes de que caiga se gana.
- **Bolas chinas**: en la rueda de tiza hay una chibola por respuesta. Se
  agarra el tiro, se estira hacia atrás (una línea de puntos marca hacia
  dónde sale) y se suelta: el tiro vuela hasta la chibola de esa dirección y
  la correcta cae al hoyito. Si rebota, Piko da una pista y se vuelve a tirar.
- **Pikito Ciego** (la gallinita ciega, id `gallinita`): el patio está a
  oscuras y sólo se ve un círculo de luz alrededor de Piko, vendado. Suena
  una palabra o una frase; las respuestas están escondidas y Piko va a
  tantearlas de a una, así que hay que guiarse por lo que se escuchó. Con
  «¡Es esta!» se responde y se prende la luz. Más nivel, menos luz y más
  respuestas que sólo se escuchan; rachas con bonos; en el avanzado, cada
  audio se escucha dos veces nomás.

Las pantallas usan `useMinijuego` (lengua, niveles, tope diario y cierre de la
partida), `ElegirPartida` y `FinPartida`; los retos de elegir respuesta salen
de `src/core/minijuegos/retos.ts`.

Al terminar, la partida queda en el log como un evento `gameDone`. Cada juego
pone su regla de flores en `src/core/minijuegos/premios.ts`, y la proyección
las da **una sola vez por día** por juego, lengua y nivel: repetir la misma
partida es práctica, no flores. Como todo el progreso, suman al total, se ven
en el perfil, hacen crecer el madroño y viajan al maestro.

## La Música de Piko

`app/musica/` es la sección de canciones: aprender inglés con canciones de
Nicaragua que ya conocemos. Escucho mi canción → entiendo una frase → aprendo
cómo decirla en inglés → practico → canto → gano sacuanjoches.

Después de «Conoce nuestra canción», la canción suena con Piko bailando a
tiempo con el pulso de la grabación (con su falda de sacuanjoches) y una
sacuanjoche que salta encima de cada palabra que se canta, rebotando con el
pulso. Cada línea muestra la letra como se canta, qué
significa y cómo se dice en inglés; las partes que vuelven dicen «Se repite» o
«Repite el coro». Después, cada frase elegida es una lección (original →
español → inglés, con «Significado aproximado» cuando no es literal) con
cuatro actividades: completar la frase, usar la palabra nueva en otra
oración, ordenar una frase y reconocer lo que se escucha. Al final se canta
el coro. Una sacuanjoche cada tres respuestas buenas (se ven crecer mientras
se juega), con el mismo evento `gameDone` (juego `musica`, una vez por día por
canción); las completadas se ven en el perfil y abren las del nivel siguiente.

Las canciones viven en `content/canciones/` y **sólo entran con permiso de
uso** y con letra y traducciones validadas: el formato, el instructivo y la
prueba que las revisa están ahí (`README.md`) y en
`src/core/canciones/cancion.ts`.

## Los sprites de Piko

`src/ui/piko/sprites.ts` tiene siete estados (`idle`, `saludando`, `pensando`,
`alegre`, `animando`, `celebrando`, `dormido`). Mientras esté vacío se dibuja el
Piko vectorial de la landing. Al poner un PNG en `assets/piko/` y descomentar su
línea, la mascota lo usa en toda la app sin tocar ninguna pantalla. Si falta un
estado cae al más parecido, así que con un solo dibujo alegre ya se cubren la
celebración y el ánimo.

## El contenido

Ver [content/README.md](content/README.md). Hay inglés y miskito, y se generan
con `npm run contenido` desde `diccionario/`. Mayangna, rama y garífuna esperan
material de hablantes nativos — el validador rechaza a propósito la síntesis de voz en esas lenguas,
para que nadie termine enseñando una pronunciación inventada. La excepción es
el miskito: puede sonar con la voz en español para mientras se consiguen
grabaciones (decisión 16 de `docs/decisiones.md`).

## Más documentación

| Documento | Para qué |
|---|---|
| [docs/desarrollo.md](../docs/desarrollo.md) | Guía completa: navegador, simulador, teléfono, APK y prueba de aceptación en el aula |
| [docs/arquitectura.md](../docs/arquitectura.md) | Protocolo del aula, sincronización, semáforo, base local |
| [docs/decisiones.md](../docs/decisiones.md) | Por qué está hecho así — conviene leerlo antes de "simplificar" algo |

## Detalles que no son obvios

- **El progreso pertenece al estudiante, no al aparato.** Un niño reclama su
  nombre en cualquier teléfono y recibe un snapshot ya proyectado — de tamaño
  fijo, no el historial.
- **El marcador del maestro se alimenta del log durable**, no de un aviso en
  vivo. Un teléfono que pierde señal sigue sumando y aparece bien apenas vuelve.
- **La idempotencia va por `(estudiante, id)`**, no por `id` solo: dos teléfonos
  podrían generar el mismo uuid y el segundo se perdería en silencio.
- **El error nunca es rojo.** Piko muestra la respuesta y anima; el XP jamás baja.
