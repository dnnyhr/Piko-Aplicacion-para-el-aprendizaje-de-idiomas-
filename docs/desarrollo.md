# Desarrollo

## Requisitos

- **Node 22 o más nuevo.** Las pruebas de la app y de las encuestas usan
  `node:sqlite`, que no existe en versiones anteriores. Es la misma versión que
  usa CI.
- **Git.**
- Sólo para compilar el APK en la computadora: JDK 17 y el Android SDK. En
  GitHub Actions no hace falta nada. Ver [En el teléfono](#3-en-el-teléfono).
- Sólo para el robot: [`arduino-cli`](https://arduino.github.io/arduino-cli/) o
  el IDE de Arduino, y la placa. El panel se prueba sin placa.

Cada parte del repositorio es un proyecto de Node independiente, con su propio
`npm install`:

| Carpeta | Qué es | Sección |
|---|---|---|
| `app/` | La aplicación | 1 a 4 |
| `robot/panel/` | El puente y el panel del robot | [5](#5-el-panel-del-robot) |
| `encuestas/` | Las encuestas | [6](#6-las-encuestas) |

Salvo que se diga otra cosa, los comandos de las secciones 1 a 4 se corren
desde `app/`:

```bash
cd app && npm install
```

---

## Los tres entornos de trabajo

| Qué estás haciendo | Dónde | Espera |
|---|---|---|
| Interfaz, contenido, mascota, ejercicios | Navegador | Instantáneo |
| Lógica de sala, sincronización, semáforo | Simulador | Segundos |
| Hotspot, multijugador real, APK | Teléfonos | Compilación |

La mayor parte del trabajo ocurre en los dos primeros.

---

## 1. En el navegador

```bash
npm run web
```

Abre en `http://localhost:8081`. La primera compilación tarda unos 40 segundos;
después recarga sola con cada cambio.

Sirve para toda la interfaz y la práctica en solitario. Dos diferencias
respecto del teléfono, ambas deliberadas:

- **El aula en red no funciona.** Un navegador no puede abrir sockets TCP
  crudos. Si tocás *Unirme a la clase* te lo dice en pantalla en vez de
  quedarse colgado.
- **El progreso no persiste.** La base es en memoria; al recargar arrancás de
  cero.

---

## 2. Las pruebas y el simulador

```bash
npm test
```

151 pruebas sobre el núcleo puro y la persistencia. Corren en unos cuatro
segundos, sin emulador. Cubren el troceado de mensajes partidos a mitad de
paquete, la convergencia de la sincronización, el determinismo de la
proyección, los umbrales del semáforo, la corrección de respuestas y el
esquema SQLite real.

```bash
npm run sim -- --students 8 --rondas 2
```

Levanta **un anfitrión real y ocho estudiantes reales** hablando TCP en
`localhost`, con el mismo código que corre en los teléfonos. Reparte las
rondas, tira un teléfono a mitad de camino, lo reconecta y verifica que todos
converjan. Después prueba el caso del teléfono prestado y muestra el semáforo
del maestro.

Acepta `--students`, `--rondas` y `--seed`. Con la misma semilla, el resultado
se repite exactamente.

> Este comando también es el **plan B de la demostración** si falla un equipo.

```bash
npm run validate:packs
```

Verifica el formato del contenido, que cada archivo esté registrado en el
índice, que existan los audios referenciados, y muestra la cobertura por
lengua.

```bash
npm run typecheck
```

Revisa la aplicación y las herramientas de Node por separado — usan
configuraciones distintas porque unas corren en el teléfono y otras no.

---

## 3. En el teléfono

La aplicación usa un módulo nativo propio (`app/modules/piko-red`, en Kotlin:
los sockets de la sala y el faro UDP), así que **no corre en Expo Go**. Todo se
compila **sin la nube de Expo**: no hay cola de EAS que esperar.

### El APK para repartir — en GitHub (lo más rápido)

1. Pestaña **Actions** del repositorio → **APK** → **Run workflow**.
2. A los ~15 minutos, en esa corrida, **Artifacts → piko-apk**: adentro está el
   `.apk`.

También corre solo en cada push a `main` que toque `app/`.

### El APK para repartir — en la computadora

Hace falta JDK 17 y el Android SDK (Android Studio lo instala, o las
*command line tools* con `platforms;android-36` y `build-tools;36.0.0`):

```bash
cd app
```

```bash
npm run apk
```

Queda en `app/android/app/build/outputs/apk/release/app-release.apk`. Se pasa de
teléfono en teléfono; la primera vez hay que habilitar la instalación desde
orígenes desconocidos. `npm run apk` genera `android/` con `expo prebuild`
(local, no usa internet de Expo) y compila con Gradle.

El APK va firmado con la llave de depuración, que alcanza para instalarlo a
mano. Para publicarlo en una tienda haría falta una llave propia.

### Para desarrollar

```bash
npx expo run:android
```

Compila e instala un build de depuración con el dev client en el teléfono
conectado por USB. Después:

```bash
npm start
```

Cada cambio de pantallas, estilos o contenido se recarga solo. Sólo hay que
recompilar si cambia algo **nativo** (por ejemplo `modules/piko-red`).

> **Para probar el aula:** conectá también la computadora al hotspot del
> teléfono que hace de maestro. Así el servidor de desarrollo queda accesible
> desde ambos teléfonos.

### Cómo se encuentran los teléfonos

El estudiante prueba, en este orden y sin escribir nada:

1. la última sala donde entró;
2. **la puerta de enlace del wifi** — en un hotspot es exactamente el teléfono
   del maestro, aunque Android 11+ elija una dirección al azar;
3. **el faro UDP** (puerto 7332): el maestro anuncia la sala cada segundo y
   contesta a quien pregunte;
4. un barrido de la subred (puerto 7331).

Si nada contesta, escribe la dirección que el maestro tiene en pantalla.

Cada socket del estudiante se **ata a la red wifi**: el hotspot no tiene
internet, y sin esto Android manda las conexiones por los datos móviles y nunca
llegan al maestro. Si el teléfono avisa que "la red no tiene acceso a
internet", hay que elegir **mantener la conexión**.

---

## Prueba de aceptación en el aula

Con dos teléfonos y el APK instalado:

1. **Maestro:** enciende el punto de acceso desde los ajustes de Android.
2. Abre Piko → *Soy el maestro* → *Usar una lista de ejemplo* → **Abrir la
   sala**. Anota el código de cuatro dígitos.
3. **Estudiante:** conecta el teléfono a ese hotspot desde los ajustes.
4. Abre Piko → *Unirme a la clase*. Debería encontrar la sala sola; si no,
   escribe la dirección que el maestro tiene en pantalla.
5. Toca su nombre en la lista.
6. **Maestro:** *Empezar una ronda*. El estudiante recibe los ejercicios.
7. Mientras responde, el maestro ve moverse el semáforo.

**Las dos pruebas que importan:**

- **Sin señal.** Apagá el wifi del estudiante a mitad de ronda. Tiene que poder
  seguir jugando, y al reconectar su progreso aparece en el teléfono del
  maestro sin duplicarse.
- **Cambio de teléfono.** Que el estudiante salga y reclame el mismo nombre
  desde un teléfono distinto. Su XP y sus aciertos tienen que estar ahí.

---

## 5. El panel del robot

```bash
cd robot/panel
npm install
npm run prueba      # 61 comprobaciones del puente: no hace falta la placa
npm start           # http://localhost:4700 (control) y http://localhost:4700/cara
```

El puerto serie se detecta solo; `npm run puertos` los lista si hay varios. Con
`node server.js --puerto COM5 --http 4800` se fijan a mano. Si el puerto no
abre, casi siempre es el Monitor Serie del IDE de Arduino que lo tiene tomado.

El firmware se compila con:

```bash
arduino-cli compile --fqbn arduino:avr:mega robot/firmware/piko_robot
```

Cableado, sketches de prueba, el túnel y todo lo demás: [robot/README.md](../robot/README.md).

---

## 6. Las encuestas

```bash
cd encuestas
npm install
npm run prueba      # reglas y Worker completo contra un D1 en memoria
npm run validar     # revisa las definiciones de definiciones/

cp .dev.vars.example .dev.vars
npm run db:local
npm run dev         # http://localhost:8787
```

Crear una encuesta, publicarla y el despliegue en Cloudflare:
[encuestas/README.md](../encuestas/README.md).

---

## Qué corre CI

En cada pull request y en cada push a `main`, [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
corre cuatro trabajos, con Node 22:

| Trabajo | Comandos |
|---|---|
| App | `npm test` · `npm run typecheck` · `npm run validate:packs` |
| Robot | `npm run prueba` (en `robot/panel`) |
| Encuestas | `npm run prueba` · `npm run validar` (en `encuestas`) |
| Despliegue | `docker compose config`, la API con libSQL y su CORS, y `nginx -t` (en `despliegue`) |

Conviene correr localmente los de la parte que tocaste antes de abrir el PR.

---

## Agregar contenido

Ver [../app/content/README.md](../app/content/README.md) para el formato
completo.

1. Agregar las palabras a `diccionario/<lengua>/lexico.json` y las recetas a
   `diccionario/<lengua>/ejercicios.json`.
2. `npm run contenido`: genera `app/content/packs/` y `app/content/index.ts`.
3. `npm run validate:diccionario` y `npm run validate:packs`.

Metro no puede recorrer directorios en tiempo de ejecución, de ahí el índice
estático; ahora lo escribe el generador. CI corre `npm run
contenido:comprobar` para que nadie edite los paquetes a mano.

---

## Agregar los sprites de Piko

1. Poner los PNG en `app/assets/piko/` — 512×512, fondo transparente, el
   pájaro centrado con algo de aire alrededor.
2. Descomentar las líneas correspondientes en `app/src/ui/piko/sprites.ts`.

Los siete estados son `idle`, `saludando`, `pensando`, `alegre`, `animando`,
`celebrando` y `dormido`. Si falta alguno, cae al más parecido, así que se
puede empezar con dos o tres. Mientras el registro esté vacío se dibuja el Piko
vectorial.

Los cambios se ven al instante en el navegador, sin recompilar.

---

## Convenciones

- **`src/core/` no importa React Native.** Si algo del núcleo necesita saber de
  la pantalla, del socket o del disco, se le inyecta desde afuera.
- **Los textos van en español**, incluidos los comentarios y los nombres de
  funciones nuevas, para que el equipo lea el código en su idioma.
- **Ningún texto le dice al estudiante que se equivocó.** Ver la decisión 8 en
  [decisiones.md](decisiones.md).
- Antes de subir cambios, los mismos comandos que corre CI para la parte que
  tocaste — ver [Qué corre CI](#qué-corre-ci). En la app:
  `npm test && npm run typecheck && npm run validate:packs`.
