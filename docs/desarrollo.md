# Desarrollo

## Requisitos

- **Node 22 o más nuevo.** Las pruebas de la app y de las encuestas usan
  `node:sqlite`, que no existe en versiones anteriores. Es la misma versión que
  usa CI.
- **Git.**
- Sólo para compilar el APK: una cuenta de Expo (gratis). Ver [En el
  teléfono](#3-en-el-teléfono).
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

121 pruebas sobre el núcleo puro y la persistencia. Corren en unos cuatro
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

La aplicación usa módulos nativos, así que **no corre en Expo Go**. Hace falta
un *development build*: un APK con los módulos nativos incluidos que se conecta
al servidor de desarrollo. Se compila **una sola vez**.

### Preparación

```bash
npm install -g eas-cli
```

```bash
eas login
```

```bash
eas init
```

`eas init` crea el identificador del proyecto en `app.json`. Conviene
versionarlo.

### Compilar

```bash
eas build --profile development --platform android
```

Se compila en la nube (10–20 minutos en el plan gratuito). Al terminar da un
enlace y un código QR: se abre desde el teléfono y se instala. **Instalalo en
los dos teléfonos** si vas a probar el aula.

### Iterar

```bash
npm start
```

Se abre Piko en el teléfono, escanea el código y listo. A partir de ahí cada
cambio se recarga solo.

> **Para probar el aula:** conectá también la computadora al hotspot del
> teléfono que hace de maestro. Así el servidor de desarrollo queda accesible
> desde ambos teléfonos.

El *development build* sólo hay que rehacerlo si se agrega o cambia una
dependencia **nativa**. Pantallas, estilos, contenido y sprites entran solos.

---

## 4. El APK para repartir

Este no necesita servidor de desarrollo: funciona solo.

```bash
eas build --profile preview --platform android
```

Se descarga el `.apk` y ya se puede pasar de teléfono en teléfono. La primera
vez hay que habilitar la instalación desde orígenes desconocidos.

Para la versión de entrega, con minificación completa:

```bash
eas build --profile production --platform android
```

Los tres perfiles están en `app/eas.json` y los tres generan **APK, no AAB**:
Piko no se distribuye por la tienda, se comparte de mano en mano.

### Sin la nube

Es posible, pero exige Android Studio y JDK 17 (unos 10 GB):

```bash
npx expo run:android --variant release
```

---

## Prueba de aceptación en el aula

Con dos teléfonos y el *development build* instalado:

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
npm run prueba      # 44 comprobaciones del puente: no hace falta la placa
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
corre tres trabajos, con Node 22:

| Trabajo | Comandos |
|---|---|
| App | `npm test` · `npm run typecheck` · `npm run validate:packs` |
| Robot | `npm run prueba` (en `robot/panel`) |
| Encuestas | `npm run prueba` · `npm run validar` (en `encuestas`) |

Conviene correr localmente los de la parte que tocaste antes de abrir el PR.

---

## Agregar contenido

Ver [../app/content/README.md](../app/content/README.md) para el formato
completo.

1. Crear `app/content/packs/<lengua>/<tema>.json`.
2. Importarlo en `app/content/index.ts` y agregarlo al arreglo `PACKS`.
3. `npm run validate:packs`.

Metro no puede recorrer directorios en tiempo de ejecución, de ahí el índice
estático. El validador avisa si quedó un archivo sin registrar.

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
