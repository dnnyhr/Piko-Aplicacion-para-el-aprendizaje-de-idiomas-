# Cómo dibujar las caras de Piko

Guía para hacer las expresiones en [Piskel](https://www.piskelapp.com/) y
meterlas en el robot. Todo lo que dibujes sirve igual en `probar_cara`, que
enciende sólo la pantalla, y en `piko_robot`, que enciende todo.

## Estado

| Cara | Cuadros | Intervalo | |
|---|---|---|---|
| `espera` | 1 | 250 ms | listo |
| `izquierda` | 1 | 200 ms | listo |
| `derecha` | 1 | 200 ms | listo |
| `sonriendo` | 1 | 500 ms | listo |
| `riendo` | 1 | 200 ms | listo |
| `enojado` | — | — | **falta** — se dibuja con el vector de emergencia |

Las cinco que están tienen **un solo cuadro**, así que se ven quietas. Para
animarlas hay que volver a Piskel, agregar cuadros y reconvertir; el resto de
la cadena ya está hecha y no cambia nada.

---

## 1. El lienzo

**128 × 64 píxeles.** Es el tamaño exacto de la pantalla. No dibujes en otro
tamaño para escalar después: en una pantalla de este tamaño, escalar convierte
los trazos finos en manchas.

Dibujá **sobre el fondo transparente**, que es como arranca Piskel. El color
del trazo da igual — la OLED es de un bit por píxel, no hay grises ni colores.
El conversor se da cuenta solo de que dibujaste un color sobre transparencia y
toma lo dibujado como encendido, sea negro o blanco.

---

## 2. Cómo se lee una cara en una pantalla de este tamaño

Tres cosas que cambian el resultado más que el talento:

**Los ojos hacen el 80 % del trabajo.** Dejá la forma del ojo igual en todas
las expresiones y cambiá sólo la pupila y lo de arriba — párpado o ceja. Así
Piko sigue siendo Piko cuando cambia de humor. Si cada cara tiene ojos
distintos, parecen varios personajes.

**Nada de trazos de un píxel.** El aula se mira de lejos y un píxel desaparece
a dos metros. Contornos gruesos y figuras rellenas para todo lo que tenga que
leerse. No entra el detalle, entra el gesto.

**Dejá aire en los bordes.** Unos 8 píxeles. Piko va dentro de una caja y el
marco físico se come la orilla.

---

## 3. El truco de los cuadros

El firmware usa **un solo intervalo para todos los cuadros** de una expresión.
Eso parece una limitación y en realidad es la herramienta principal:

> Para que un cuadro dure más, **ponelo repetido varias veces.**

Un parpadeo bueno es tres cuadros con los ojos abiertos y uno con los ojos
cerrados, a 250 ms. El ciclo completo dura un segundo y el ojo queda cerrado un
cuarto de segundo — lo que dura un parpadeo de verdad. Si en cambio ponés un
cuadro abierto y uno cerrado a 500 ms, Piko parece que se está durmiendo.

En Piskel, duplicar el cuadro actual es la forma rápida de hacerlo: dibujás una
vez y repetís el que necesitás que dure.

### Recetas

**`espera`** — 3 cuadros con los ojos abiertos + 1 con los ojos cerrados, a
250 ms. El cuadro cerrado son dos rectángulos horizontales gruesos donde
estaban los ojos. Es la diferencia entre un robot encendido y uno vivo.

**`izquierda` y `derecha`** — 1 al centro, 2 a mitad de camino, 3 y 4 al tope,
a 200 ms. Repetir el tope en dos cuadros es lo que hace que la mirada **llegue
y se quede** en vez de temblar como un tic. Sólo se mueven las pupilas: el
contorno del ojo no, porque la cabeza la gira el servo y no la pantalla.

**`sonriendo`** — 2 cuadros con el arco de los ojos un par de píxeles más alto
y 2 normales, a 500 ms. Ese subir y bajar es casi imperceptible de frente, y es
exactamente por eso que funciona.

**`riendo`** — pico chico, medio, bien abierto, medio, a 200 ms. Lo que separa
una risa de una sonrisa es **el pico moviéndose**. Si además bajás toda la cara
dos píxeles en los cuadros pares, el rebote vertical es lo que el ojo lee como
carcajada.

**`enojado`** — las cejas son todo: dos líneas gruesas inclinadas hacia abajo y
hacia el centro. Los ojos casi no cambian respecto de `espera`. Con 2 cuadros
normales y 2 con la cara corrida un píxel al costado, a 200 ms, se lee como
temblar de rabia. Es el gesto más barato de la lista y el que más se nota.

> `app/src/ui/piko/sprites.ts` dice que Piko *anima, no regaña*, y que nunca va
> enojado ni triste. Como cara de broma esta expresión suma; como respuesta a
> un estudiante que pronunció mal, contradice el proyecto. Elegí bien dónde la
> disparás.

---

## 4. Sacarla de Piskel

Exportá como **archivo C**. Sale algo así:

```c
#define PIKO_FRAME_COUNT 1
#define PIKO_FRAME_WIDTH 128
#define PIKO_FRAME_HEIGHT 64
static const uint32_t piko_data[1][8192] = { … };
```

Eso **no se pega directo**. Piskel escribe un `uint32_t` por píxel — cuatro
bytes con color y transparencia, 32 KB por cuadro. La SSD1306 usa un bit por
píxel: el mismo dibujo le entra en 1 KB. Hay que convertirlo.

---

## 5. Convertirla

```bash
node robot/herramientas/piskel-a-cara.mjs "Neutro (enfrente).c" espera 250
```

Los tres argumentos son el archivo, el nombre de la expresión y el intervalo en
milisegundos. Detecta solo cuántos cuadros trae.

Antes de escupir el código **te dibuja la cara en la terminal**. Si salió
invertida, corrida o vacía, te enterás ahí y no después de subirla a la placa.
Ampliá la ventana a 128 columnas para verla entera.

Para escribirla a un archivo en vez de a la pantalla:

```bash
node robot/herramientas/piskel-a-cara.mjs riendo.c riendo 200 --salida riendo.inc
```

Si algo sale raro:

| Opción | Cuándo |
|---|---|
| `--invertir` | Salió todo prendido o todo apagado |
| `--por-alfa` | Forzar el criterio de "lo dibujado está encendido" |
| `--por-luz` | Forzar el criterio de "lo claro está encendido" |
| `--umbral N` | Con `--por-luz`, qué tan claro cuenta (128 por defecto) |

El conversor tiene su propia prueba, por si alguna vez hay que tocarlo:

```bash
node robot/herramientas/prueba-conversor.mjs
```

---

## 6. Meterla en el robot

Todo va a un solo archivo:
[`firmware/libraries/PikoCaras/src/dibujos.h`](firmware/libraries/PikoCaras/src/dibujos.h).
Pegás el bloque que escupió el conversor, reemplazando el de esa expresión.
Queda así:

```c
const uint8_t PROGMEM espera_1[] = { 0x00, 0x00, … };
const uint8_t* const ESPERA[] = { espera_1 };
#define ANIM_ESPERA { ESPERA, 1, 250 }
```

Los tres valores del `#define` son el arreglo de cuadros, cuántos son, y cada
cuántos milisegundos cambia. El conversor ya los escribe bien.

**El `PROGMEM` no es adorno.** Sin él, cada cuadro se guarda en la RAM en vez
del flash, y cuatro caras se comen los 8 KB del Mega. El síntoma no es un error
de compilación: es una placa que se reinicia sola y te manda a buscar el
problema donde no está. Con las cinco caras puestas, la RAM subió diez bytes y
el flash cinco kilobytes — así se ve cuando está bien.

---

## 7. Verla en la pantalla

```bash
arduino-cli compile --fqbn arduino:avr:mega --libraries robot/firmware/libraries robot/firmware/probar_cara
```

```bash
arduino-cli upload -p COM5 --fqbn arduino:avr:mega robot/firmware/probar_cara
```

```bash
arduino-cli monitor -p COM5 --config baudrate=115200
```

Arranca recorriendo las seis, tres segundos cada una.

| Orden | Qué hace |
|---|---|
| `<nombre>` | Se queda fija en esa cara |
| `auto` | Vuelve al recorrido |
| `lista` | Dice cuáles tienen dibujo tuyo y cuáles caen al vector |
| `patron` | Marco, esquinas y rayas — el patrón de diagnóstico |
| `blanco` / `negro` | Todo encendido o todo apagado |
| `i2c <khz>` | Cambia la velocidad del bus sin recompilar |

Podés ir de a una. No hace falta tener las seis para probar.

---

## 8. Cuando la pantalla se ve mal

### Se ve el dibujo corrido y el resto es ruido

**Se están perdiendo bytes camino a la pantalla.** El volcado son 1024 bytes
seguidos; si se pierden algunos al principio, todo el dibujo se corre hacia
arriba —por eso asoma arriba lo que debería estar abajo— y la parte que nunca
se escribió queda con lo que hubiera antes en la memoria de la pantalla.

No es tu dibujo ni la OLED. Es el bus I2C. En orden:

1. **Bajá la velocidad.** `i2c 100` por el monitor, sin recompilar. Es la causa
   más común con cables de puente sueltos y se arregla al instante.
2. `patron` — el marco tiene que quedar pegado a los cuatro bordes. Si el de
   abajo no está abajo, sigue habiendo pérdida.
3. `blanco` — tiene que quedar la pantalla entera encendida, sin un solo píxel
   apagado. Cualquier hueco es un byte que no llegó.
4. **Acortá los cables.** Arriba de unos 20 cm el I2C empieza a sufrir, sobre
   todo si van sueltos y cerca de los cables del motor.
5. Cuando se vea bien a 100 kHz, probá `i2c 400`. Si aguanta, subí
   `VELOCIDAD_I2C` en los dos sketches: la pantalla se refresca cuatro veces
   más rápido.

### No enciende nada

1. `escaner_i2c` — si no aparece `0x3C`, la OLED no está contestando.
2. Revisá 5 V y GND.
3. Probá cruzar SDA y SCL. Es el error más común y no rompe nada.
4. Si el escáner dice `0x3D`, cambiá `DIRECCION_OLED` arriba de
   `probar_cara.ino`.
