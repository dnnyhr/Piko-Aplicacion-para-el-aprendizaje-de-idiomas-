# Arquitectura

## Mapa del repositorio

```
piko/
├── app/                    la aplicación React Native (Ruta 1)
│   ├── app/                pantallas — el enrutado sale de esta carpeta
│   │   ├── index.tsx         inicio: soy maestro / unirme / practicar
│   │   ├── practicar.tsx     práctica en solitario
│   │   ├── maestro/          abrir la sala, lista, rondas, semáforo
│   │   └── estudiante/       buscar la sala, reclamar el nombre, jugar
│   ├── content/            paquetes de contenido en JSON + índice estático
│   ├── src/
│   │   ├── core/           ⚠ TypeScript puro, sin React Native
│   │   ├── net/            transporte, anfitrión y cliente del aula
│   │   ├── db/             SQLite: esquema, migraciones, log de eventos
│   │   ├── ui/             sistema de diseño y la mascota
│   │   └── features/       ejercicios, progreso, sala
│   ├── tools/              simulador, validadores, generadores
│   └── tests/              pruebas automatizadas
├── robot/                  el acompañante de aula (Ruta 2)
│   ├── firmware/           sketches de Arduino: el completo y los de prueba
│   └── panel/              puente Node ↔ placa, panel del maestro y cara
├── encuestas/              Cloudflare Worker + D1 (encuestas.piko.mugiware.com)
├── web/                    la landing (HTML estático, no se toca desde la app)
├── docs/                   esta documentación
└── .github/                CI, plantillas de issues y de pull request
```

Este documento se centra en la app. El robot y las encuestas tienen su
arquitectura explicada en su propio README — ver [Fuera de la app](#fuera-de-la-app)
al final.

## La regla que sostiene todo

**`src/core/` no importa React Native.** Ni una línea.

Ahí viven el protocolo del aula, la sincronización, el motor de progreso, la
corrección de respuestas y la máquina de estados de la sesión — o sea, todo lo
que puede estar mal de una forma que rompa el proyecto.

Como no depende del entorno móvil, ese código se ejecuta en Node. Eso permite
dos cosas que serían imposibles de otro modo:

1. **Probar la lógica difícil sin un dispositivo.** Las 121 pruebas corren en
   segundos, sin emulador y sin Android SDK.
2. **Simular un aula entera.** `tools/sim.ts` levanta un anfitrión real y ocho
   estudiantes reales hablando TCP en `localhost`, con el mismo código que
   corre en los teléfonos.

Si algo tiene que saber de la pantalla, del socket o del disco, no va en
`core/`. Va en `net/`, `db/`, `ui/` o `features/`, que sí pueden importar lo
que necesiten.

## Las capas

```
        app/                    pantallas
          │
      features/                 ejercicios · progreso · sala
          │
   ┌──────┴──────┬─────────────┐
  ui/          net/           db/         React Native, sockets, SQLite
   │             │             │
   └──────┬──────┴─────────────┘
       src/core/                          TypeScript puro
```

Las flechas van sólo hacia abajo. `core/` no conoce a nadie.

## El aula en red

### Topología

El teléfono del maestro enciende su **punto de acceso** desde los ajustes de
Android — no se puede activar por programa sin permisos de sistema, así que la
app lo guía con instrucciones en pantalla. Los estudiantes se conectan a esa
red, y ahí dentro el teléfono del maestro es el único punto central.

```
        ┌──────────────┐
        │   MAESTRO    │  anfitrión · puerto 7331
        │  (hotspot)   │  reparte rondas, ordena los eventos
        └──────┬───────┘
    ┌──────┬───┴───┬──────┐
   📱     📱      📱     📱      estudiantes
```

### Transporte

**TCP crudo con NDJSON**: una línea de JSON por mensaje, terminada en `\n`.

TCP entrega bytes, no mensajes: un envío puede llegar partido en tres pedazos o
pegado al siguiente. `core/protocol/codec.ts` acumula texto hasta encontrar un
salto de línea y recién ahí entrega un mensaje completo. Trabaja sobre texto ya
decodificado — el transporte pone el socket en modo utf-8 para que nunca se
corte un carácter multibyte a la mitad.

### Descubrimiento del anfitrión

Tres intentos en cascada, ninguno depende de que alguien recuerde una dirección:

1. **La puerta de enlace.** En un hotspot de Android el anfitrión *es* el
   router, así que casi siempre está en `a.b.c.1`. Es instantáneo.
2. **Barrido corto de la subred**, de a 24 direcciones por tanda para no abrir
   254 sockets de golpe en un teléfono de gama baja.
3. **Escribir la dirección a mano**, que el maestro tiene en pantalla.

### Los mensajes

| Cliente → Anfitrión | Qué hace |
|---|---|
| `hello` | Se presenta y negocia versión de protocolo |
| `claim` | Reclama una identidad de la lista, diciendo hasta dónde la conoce |
| `push` | Envía eventos de progreso creados en este teléfono |
| `pull` | Pide lo que le falta |
| `ping` | Latido |

| Anfitrión → Cliente | Qué hace |
|---|---|
| `welcome` | Código de sala, lista de la clase y preset |
| `claimed` | Confirma identidad y, si hace falta, manda el estado completo |
| `denied` | Rechazo con motivo legible |
| `delta` | Los eventos que le faltaban |
| `ack` | Confirma qué eventos aceptó y con qué orden |
| `roundStart` | Arranca una ronda con sus ítems |
| `tick` | Marcador en vivo, a lo sumo una vez por segundo |
| `roundEnd` | Cierre de ronda |
| `pong` | Respuesta al latido |

Un mensaje que no se entiende **se descarta sin cortar la conexión**: una
versión más nueva de Piko puede mandar cosas que esta no conoce, y eso no
debería echar a nadie de la sala.

### Reconexión

El cliente reintenta con espera creciente (0.5 s → 15 s). Al reconectar vuelve
a presentarse y reclama su identidad solo — el niño no tiene que buscar su
nombre otra vez cada vez que parpadea el wifi. Lo que respondió mientras estuvo
sin señal se guardó en su teléfono y viaja cuando la conexión vuelve.

## Progreso y sincronización

### Un registro que sólo crece

Nada se edita ni se borra. Cada respuesta produce un evento:

```
{ id, studentId, kind, payload, createdAt, originDevice, seq? }
```

`seq` es el orden autoritativo y **lo asigna el anfitrión** al recibirlo. Los
clientes nunca lo inventan. Mientras un evento vive sólo en el teléfono que lo
creó, no tiene `seq`.

### Estado = pliegue determinista de los eventos

`core/progress/projection.ts` convierte una lista de eventos en el estado del
estudiante: XP, aciertos, racha y dominio por habilidad. Es determinista por
contrato — los mismos eventos producen el mismo estado en cualquier
dispositivo, sin importar en qué orden llegaron.

Eso es lo que permite que no haya una "fuente de verdad" única: cualquier
teléfono que tenga los eventos llega al mismo resultado.

### Qué viaja, exactamente

| Situación | Qué se manda |
|---|---|
| El dispositivo está al día | Nada |
| Le faltan pocos eventos | Sólo esos eventos |
| Nunca vio a este estudiante | Un **estado ya calculado**, de tamaño fijo |

El tercer caso es el del teléfono prestado. En lugar de mandar miles de eventos
históricos, el anfitrión pliega todo y manda el resultado: un objeto de unos
cientos de bytes, cueste lo que cueste el historial detrás. Se guarda
periódicamente como *snapshot* para no recalcularlo cada vez.

### Idempotencia

Reenviar un evento es gratis. La clave es **`(estudiante, id)`**, no el `id`
solo: si dos teléfonos generaran el mismo identificador, con clave global el
progreso del segundo se descartaría en silencio como si fuera un reenvío. Es un
fallo que no da error y sólo se nota cuando a un niño le faltan respuestas.

### El marcador del maestro

Se alimenta **del mismo registro de eventos** que se sincroniza, y de ningún
otro lado.

La versión anterior usaba un aviso aparte, en vivo. El resultado era que un
teléfono con un parpadeo de señal perdía el aviso: el niño seguía sumando
progreso real, pero aparecía atrasado en el semáforo. Como el ingreso de
eventos es idempotente, contar desde ahí suma exactamente una vez, y lo que se
respondió sin señal cuenta apenas vuelve la conexión.

## El semáforo de rezago

Un punto de color por estudiante. Sin gráficas ni porcentajes: con treinta
niños hablando, el maestro necesita mirar la lista y saber dónde parar.

Se compara el avance de cada uno contra **la mediana del propio grupo**, no
contra una meta abstracta — un aula rural que avanza despacio no está en rojo,
va a su ritmo.

| Color | Cuándo |
|---|---|
| 🟢 | Al 90 % de la mediana o más |
| 🟡 | Entre el 75 % y el 90 % |
| 🔴 | Por debajo del 75 % |

Dos salvaguardas: si el grupo apenas arrancó (mediana menor a 3 aciertos) están
todos en verde, y quien responde rápido y mal baja un nivel aunque su cuenta
parezca normal.

## La base local

El mismo esquema en el teléfono del maestro y en el del estudiante — si al
maestro se le acaba la batería, cualquier teléfono puede levantar la sala.

| Tabla | Qué guarda |
|---|---|
| `student` | La lista de la clase |
| `progress_event` | El registro que sólo crece |
| `snapshot` | Estados ya calculados, para no recorrer el historial |
| `preset` | Configuraciones de aula guardadas |
| `device` | Identidad del aparato y últimas preferencias |
| `sync_state` | Hasta dónde conoce este teléfono a cada estudiante |

Dos detalles que importan en el rendimiento: la clave primaria de
`progress_event` es compuesta `(student_id, id)`, y hay un índice parcial sobre
los eventos sin `seq` para que buscar "lo que falta enviar" siga siendo barato
con decenas de miles de filas.

## Los ejercicios

Los tres comparten el mismo motor (`features/exercises/Runner.tsx`): barra de
avance arriba, ejercicio en el medio, botón de comprobar abajo, y la barra de
Piko que sube al responder. El motor no sabe nada de red ni de base de datos —
recibe ítems y avisa cada respuesta hacia afuera.

| Tipo | Mecánica |
|---|---|
| `choice` | Traducción por selección múltiple |
| `listen` | Se escucha y se elige lo que se oyó |
| `build` | Se ordenan bloques de palabras para formar la oración |

En `build` las fichas se colocan **por toque, no arrastrando**: un dedo de niño
sobre una pantalla de gama baja acierta mucho mejor un toque, y además evita
una dependencia de gestos.

Las opciones se barajan con una semilla derivada del identificador del ítem, así
que no saltan de lugar bajo el dedo mientras dura el ejercicio.

### Rondas idénticas sin negociar nada

Los ítems de una ronda se eligen con una semilla derivada de la sesión y el
número de ronda. Al ser determinista, el anfitrión puede reconstruir
exactamente la misma lista para un estudiante que llega tarde, y engancharlo a
la ronda en curso sin haber guardado nada.

## La mascota

Piko tiene siete estados: `idle`, `saludando`, `pensando`, `alegre`,
`animando`, `celebrando` y `dormido`.

El registro `src/ui/piko/sprites.ts` los mapea a imágenes. Mientras esté vacío
se dibuja el Piko vectorial extraído de la landing. Al registrar una imagen,
la mascota la usa en toda la app sin tocar ninguna pantalla; si falta un
estado, cae al más parecido, de modo que un solo dibujo alegre ya cubre la
celebración y el ánimo.

La animación es de respiración continua más un doble brinco al festejar, con el
API nativo de animación para que no cueste cuadros en gama baja.

## Fuera de la app

Las otras dos partes del proyecto no comparten código con la app — sólo las
reglas de producto.

### El robot

```
                    ┌─ USB ──► MegaPi ──► servo · motor a pasos · 8 LEDs
   PC (el puente) ──┤
                    └─ HTTP/WebSocket ─┬─► /      teléfono del maestro   manda
                                       └─► /cara  teléfono del robot     muestra
```

- **El puente** (`robot/panel/server.js`) es el único que habla con la placa,
  por el puerto serie. Los dos teléfonos hablan con el puente y nunca entre sí.
- **El protocolo serie es texto**, una orden por línea (`SV 90`, `PA 512 10`,
  `PARA`…), para poder depurarlo a mano desde el Monitor Serie.
- **Hombre muerto:** si la placa pasa 500 ms sin recibir una línea, frena. El
  latido lo manda el navegador del maestro, no el servidor, para que un teléfono
  que se cae detenga al robot.
- **Las frases de Piko** salen de `app/src/ui/piko/frases.ts`, igual que en la
  app: el robot tampoco dice «mal» ni «incorrecto».

Todo el detalle — cableado, caras, voz, sonidos, el ejercicio simulado — está
en [robot/README.md](../robot/README.md).

### Las encuestas

Un Cloudflare Worker (`encuestas/src/index.js`) sirve una sola página para
todas las encuestas y guarda las respuestas en D1. Cada encuesta es un JSON en
`encuestas/definiciones/`; la validación (`public/js/reglas.js`) es la misma en
el navegador y en el Worker.

Es la **única parte del proyecto que corre en un servidor**, y por eso vive
fuera del aula: ni la app ni el robot dependen de ella. Su conexión con la app
es de una sola vía y pasa por una persona — lo que los hablantes escriben en
*Tu lengua en Piko* se revisa y confirma en el panel, y se exporta en el formato
de `src/core/content/schema.ts` para sumarlo a `app/content/packs/`.

Todo el detalle está en [encuestas/README.md](../encuestas/README.md).
