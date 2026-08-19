# Piko — el acompañante de aula (Ruta 2)

El robot de la segunda ruta: el que llega al aula donde no alcanzan los
teléfonos. Esto es el prototipo de control.

**La cara de Piko es un teléfono.** Va montado en el robot, abre una página en
el navegador y muestra animaciones. El motor a pasos lo gira, el servo mueve
alas, cola y cuerpo, y dos tiras de LEDs lo acompañan. El microcontrolador no
sabe nada de expresiones: sólo mueve cosas.

```
                    ┌─ USB ──► MegaPi ──► servo · motor a pasos · 8 LEDs
   PC (el puente) ──┤
                    └─ túnel ─┬─► /      teléfono del maestro   manda
                              └─► /cara  teléfono del robot     muestra
```

Los dos teléfonos nunca se hablan entre sí: los dos hablan con el puente, y el
puente reparte. Así puede haber dos maestros mirando, o ninguno, sin que la
cara se entere.

## Qué está probado en la placa

| Subsistema | Estado |
|---|---|
| 4× WS2812 · pin 28 | **anda** |
| 28BYJ-48 · PORT2 | **anda** — gira; falta confirmar que 4096 sea vuelta exacta |
| Panel, puente y reparto de roles | **anda** — 27 comprobaciones automáticas |
| Cara en el navegador | **anda** — las ocho expresiones, con la mirada animada |
| La boca sigue a la voz | **anda** — probada con una onda de sílabas medidas |
| Que no se apague la pantalla | **a medias** — probado el respaldo de video; el candado, no |
| Servo · pin 29 | sin probar |
| Segunda tira de LEDs · pin 27 | sin probar |
| Todo junto, con el robot armado | sin probar |

Del motor a pasos quedó verificado el orden de las bobinas y que una orden de
4096 medios pasos tarda los 6,0 s que corresponden a 10 rpm. Lo que **no** está
comprobado es que esos 4096 sean una vuelta exacta del eje de salida: para eso
hay que marcar el eje con un fibrón y mirar dónde termina.

---

## Cableado

La placa es un **Makeblock MegaPi**, no un Arduino Mega pelado: lleva el mismo
ATmega2560, pero los pines ya vienen cableados de fábrica a los cuatro slots de
motor. Estos son los del serigrafiado, que coinciden con el arreglo
`megaPi_slots` de la biblioteca oficial de Makeblock:

```
PORT1  35  34  33  32  31  18  12  11
PORT2  36  37  40  41  38  19   8   7
PORT3  42  43  47  48  49   3   9   6
PORT4  A5  A4  A3  A2  A1   2   5   4
```

**Lo que importa para cablear cómodo es la posición, no el número.** El
serigrafiado va en orden físico, así que el 49 y el 3 son vecinos aunque no se
parezcan, y el 40 y el 7 están en extremos opuestos aunque uno sea chico.

| Qué | Pines | De dónde salen |
|---|---|---|
| 28BYJ-48 — ULN2003 | IN1–IN4 en 36, 37, 40, 41 | PORT2, primeras 4 posiciones |
| Tira de LEDs A | datos 27 | header de 10 |
| Tira de LEDs B | datos 28 | header de 10 |
| Servo | señal 29 | header de 10 |

Los tres últimos son pines seguidos del header de diez que está debajo del
módulo Bluetooth — del 22 al 30, más el 39. Del 22 al 26 quedan libres, igual
que PORT1, PORT3, PORT4 y toda la fila A9–A15.

Las dos tiras van en pines separados y no encadenadas a propósito: así se puede
refrescar una sin tocar la otra. Para el panel son ocho luces seguidas, de la 0
a la 7; el firmware se encarga de repartirlas.

Tres cosas antes de energizar:

1. **Todo cuelga de los 5 V del USB.** El motor a pasos suma unos 250 mA
   girando y el servo entre 100 y 250 mA, más si algo lo traba. Si la placa se
   reinicia justo cuando arranca un motor, es la corriente y no el firmware. La
   salida es el jack de 6–12 V de la placa.
2. **La tierra tiene que ser común** entre la placa y cada módulo.
3. **En la fila roja de los slots hay pines `V+`**, que llevan la tensión cruda
   del jack y no 5 V. Un módulo de 5 V conectado ahí se quema.

---

## Correr el puente

```bash
cd robot/panel && npm install && npm start
```

```
Control:  http://localhost:4700/
Cara:     http://localhost:4700/cara
```

El puerto serie se detecta solo. Si tenés varios cacharros USB:

```bash
node server.js --listar
```

> Si el puerto no abre, casi siempre es que el Monitor Serie del IDE de Arduino
> lo tiene tomado. Cerralo — no se puede compartir.

Y la prueba, que no necesita ni placa ni teléfonos:

```bash
npm run prueba
```

---

## Las caras

Ocho expresiones: `enfrente`, `izquierda`, `derecha`, `arriba`, `guino`,
`abierta`, `cerrados` y `celebracion`.

**No son ocho archivos: son un solo dibujo con estados**, en
[`public/piko.js`](panel/public/piko.js). Los ocho SVG del diseño comparten
casi todo —el fondo, el cielo, las franjas del atardecer, los contornos de los
ojos son idénticos byte a byte—, y lo que cambia lo hace de dos maneras que
piden tratos distintos:

**Se desplazan.** Las pupilas y sus brillos son el mismo trazado movido de
lugar, así que se animan de verdad: la pupila viaja de donde está a donde va,
que es lo que el ojo lee como que Piko giró la mirada. Las medidas salen de
restar coordenadas entre los archivos, y respetan hasta el detalle de que los
brillos se corren menos que las pupilas.

**Son otro trazado.** El ojo cerrado, la ceja del guiño, las estrellas de la
celebración: no son la misma figura corrida. Ésas cambian de golpe, como
cuadros. Nada de fundidos — durante un cruce las dos versiones quedan a media
opacidad y, como se superponen, deja de tapar el fondo y se transparenta toda
la zona del ojo.

Así, las **cincuenta y seis transiciones** entre pares de expresiones salen
gratis. Con un archivo por cara habría que dibujarlas una por una, y una novena
expresión costaría dieciséis más.

Los ocho SVG quedan en `public/caras/` como respaldo y como fuente. Cualquier
archivo que dejes ahí con un nombre que `piko.js` no conozca se muestra tal
cual: sirven `.svg` `.gif` `.png` `.webp` y `.mp4` `.webm`.

Tres cosas más que la página de la cara resuelve:

**Se cargan todas de entrada.** Con el túnel de por medio, bajar un video justo
cuando hay que mostrarlo se ve como un parpadeo negro en el peor momento.

**Hace falta tocar la pantalla una vez.** Los navegadores de teléfono no dejan
reproducir video ni audio sin un gesto previo. Por eso el velo verde del
arranque.

**Una cara que llega tarde se pone al día.** Si el teléfono se reinicia o
recarga la página, el puente le dice qué expresión estaba puesta y arranca ahí
en vez de quedarse en negro.

### Instalala como aplicación en el teléfono del robot

Abrí `/cara` en Chrome y elegí **«Agregar a pantalla de inicio»**. Abierta
desde ese ícono arranca sin barra de direcciones, en horizontal y a pantalla
completa, y se queda así.

No es un lujo: `requestFullscreen()` en Android es frágil por diseño — el
sistema la abandona sola en cuanto aparece una notificación o el teclado. Para
una cara que tiene que estar toda la clase, la aplicación instalada es lo único
que aguanta. El botón ⛶ de la esquina queda por si hace falta volver.

### Que la pantalla no se apague

El ajuste de Android no pasa de unos minutos y la cara tiene que estar toda la
clase. De eso se ocupa `public/vigilia.js`, con dos recursos, en orden:

**El candado de pantalla** (`navigator.wakeLock`), que es la forma correcta.
Tiene una condición dura: **sólo funciona en conexión segura** — por el túnel
sí, por `http://192.168.x.x` en la red local no.

**El truco de YouTube**, para cuando el candado no está: mientras haya un video
reproduciéndose, el sistema no apaga la pantalla. La cara lleva uno de 3×3
píxeles, negro y mudo, en un rincón. El cuadro sale de un canvas y no de un
archivo, así que no hay ningún binario en el repositorio por nueve píxeles
negros.

Lo que hace que esto aguante una clase y no unos minutos no es pedirlo, es
insistir. El sistema suelta el candado solo —al pasar a segundo plano, al salir
de pantalla completa, al bajar la batería— y no lo dice por ningún lado salvo el
evento `release`. Un `request()` suelto al arrancar se pierde en el primer
descuido y nadie se entera hasta que la pantalla ya está negra. Por eso se vuelve
a pedir ante cada cosa que puede haberlo soltado, y además se revisa cada 20
segundos por si se soltó callado.

Si aun así no lo consigue, la cara lo dice en la barra de abajo y el panel lo
escribe en su consola. Dos respaldos que no dependen del navegador: dejar el
teléfono del robot **cargando** con «Permanecer activo» encendido en las
opciones de desarrollador, que es una garantía del sistema y no una promesa del
navegador; o poner el tiempo de espera de pantalla en «nunca».

El panel de control lleva el mismo candado, sin el respaldo de video: esa página
se está tocando todo el tiempo y ningún teléfono se duerme mientras le aprietan
botones. La que se queda una hora sin que nadie la toque es la cara. Que el
teléfono del maestro no se duerma igual importa: si se apaga se corta el latido
y salta el hombre muerto, que frena a Piko en mitad de la clase.

## Los sonidos

En `public/sonidos/`, y los reproduce **el teléfono del robot** — el sonido
tiene que salir de donde está la cara. Sirven `.mp3` `.ogg` `.wav` `.m4a`.

**La boca se mueve con lo que suena.** El audio pasa por un `AnalyserNode` y el
pico se abre según la energía de la onda en ese instante, cuadro a cuadro. La
alternativa fácil —abrir y cerrar en bucle mientras dure el sonido— se ve mal
por un motivo concreto: la boca sigue moviéndose en las pausas entre frases y se
queda quieta en medio de una palabra larga. Lo que el ojo lee como hablar es que
se abra en las sílabas y se cierre en los silencios.

Tres detalles que hacen la diferencia entre que se vea hablando y que se vea
masticando:

- **Se mide contra el pico reciente, no contra un umbral fijo.** Con un número
  fijo, un audio grabado bajo apenas movería el pico y uno fuerte lo dejaría
  abierto de punta a punta.
- **Abre rápido y cierra despacio.** Al revés, la boca alcanza a cerrarse del
  todo entre sílaba y sílaba, que es justo cuando tendría que seguir abierta.
- **Mientras habla, la transición de la boca baja de 300 ms a 60.** Con los 300
  de la mirada, la boca llegaría siempre media sílaba tarde.

El `AudioContext` nace suspendido y hay que despertarlo con un gesto, así que se
arma en el toque del velo. Ojo si se toca esto: desde que se llama a
`createMediaElementSource`, el `<audio>` deja de sonar por su cuenta y sólo se
escucha lo que esté conectado a la salida del grafo. Si un navegador no tiene
Web Audio, queda el títere —abrir y cerrar a ritmo fijo—, que se nota falso pero
menos que una cara inmóvil mientras suena una voz.

La secuencia **Hablar** del panel sigue existiendo y es otra cosa: mueve la boca
sin audio, para cuando Piko tiene que parecer que dice algo y no hay nada que
reproducir.

---

## El protocolo

Una orden por línea, en texto plano, a 115200 baudios. Es texto y no JSON a
propósito: se puede depurar a mano desde el Monitor Serie cuando el panel no
está, que es justo cuando uno necesita depurar.

| Orden | Qué hace |
|---|---|
| `HB` | latido; mantiene vivo al hombre muerto |
| `SV <0..180>` | servo: alas, cola y cuerpo |
| `PA <pasos> <rpm>` | motor a pasos: gira la cara. Relativo, con signo |
| `PARA` | frena todo, ya |
| `LED <i\|-1> <r> <g> <b>` | una luz de 0 a 7, o todas con `-1` |
| `BRILLO <0..255>` | brillo global de las dos tiras |
| `PING` | prueba de vida |

De vuelta llegan `ARRANCA`, `PASO …`, `LISTO`, `OK <orden>`, `ERR <motivo>` y
`TEL …` cuatro veces por segundo.

### El hombre muerto

Si pasan **500 ms sin recibir una sola línea**, el firmware frena el motor por
su cuenta.

No es un lujo. Entre el navegador y el chip hay un WebSocket, un túnel y el
internet de una escuela rural, y cualquiera de los tres se puede caer justo
después de un «girá» y antes del «pará». Por eso el latido lo manda el
**navegador que controla** y no el servidor: si lo generara el servidor, el
Arduino seguiría creyendo que hay alguien al mando cuando lo que se cayó fue el
teléfono del maestro.

### El arranque habla

El firmware saluda **antes** de tocar ningún periférico, y va dejando marcas
`PASO` a medida que inicializa. Si algo se cuelga, la última marca dice dónde.
Sin eso, un módulo mal cableado deja la placa muda y desde afuera parece que el
firmware nunca entró.

---

## Probar de a uno

Sketches chicos, cada uno enciende una sola cosa. Cuando algo no anda, sirven
para saber si el problema es el módulo o el firmware completo.

| Sketch | Para qué |
|---|---|
| [`probar_leds`](firmware/probar_leds) | Los WS2812 solos: cuántos responden, cuál es el 0, el orden de colores |
| [`probar_stepper`](firmware/probar_stepper) | El 28BYJ-48 solo, con verificación de bobinas |
| [`probar_servo`](firmware/probar_servo) | El servo solo, con barrido y límites |
| [`buscar_pin`](firmware/buscar_pin) | Hace parpadear el pin que le pidas, para rotular la placa con un LED |
| [`medir_voltaje`](firmware/medir_voltaje) | Un voltímetro hecho con la propia placa, sin multímetro |
| [`piko_robot`](firmware/piko_robot) | Todo junto, el de verdad |

Se compilan igual, cambiando la última carpeta:

```bash
arduino-cli compile --fqbn arduino:avr:mega robot/firmware/probar_leds
```

Para hablarles por serie sin abrir el IDE, y sin averiguar en qué puerto quedó
la placa esta vez:

```bash
node robot/panel/consola.mjs --segundos 20 --enviar barrido
```

---

## Abrirlo a internet

Primero probalo en la red local hasta que el hardware funcione. Después el
túnel.

```bash
winget install --id Cloudflare.cloudflared
```

```bash
cloudflared tunnel login
```

Ese comando abre tu navegador para que autorices la zona vos mismo. No hace
falta pegar ninguna llave ni token en ningún lado.

```bash
cloudflared tunnel create piko-robot
```

```bash
cloudflared tunnel route dns piko-robot robot.tudominio.com
```

```bash
cloudflared tunnel run --url http://localhost:4700 piko-robot
```

### Ponele Access antes de conectar los motores

Un túnel desnudo significa que **cualquiera con la URL puede mover el robot**.
Los dominios se escanean; no hace falta que se la pases a nadie.

En el panel de Cloudflare Zero Trust: **Access → Applications → Add an
application → Self-hosted**, dominio `robot.tudominio.com`, y una política que
permita sólo los correos tuyos y del equipo. Cloudflare valida antes de que el
tráfico toque tu PC, y no hay que escribir una línea de login.

### Para el aula de verdad, la cara va por la red local

Hoy los dos teléfonos entran por el túnel, que está bien para la demo. Pero en
un aula sin señal, una cara que depende de internet se queda en negro — y ése
es justamente el lugar donde Piko tiene que funcionar. El teléfono del robot
está a un metro de la PC: cuando se pase a producción, que entre por la IP de
la PC en el WiFi del hotspot y el túnel quede sólo para el control remoto.
