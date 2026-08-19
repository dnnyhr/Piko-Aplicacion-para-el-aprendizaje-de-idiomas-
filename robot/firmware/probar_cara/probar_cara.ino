/**
 * Prueba de la pantalla, sola.
 *
 * Enciende la OLED y nada más: ni motores, ni LCD, ni LEDs. Si algo no anda
 * acá, el problema es la pantalla o su cableado, y no hay veinte cosas más
 * donde buscar. Ése es todo el punto de este sketch.
 *
 * CABLEADO
 * --------
 *   OLED VCC → 5 V        OLED SDA → pin 20
 *   OLED GND → GND        OLED SCL → pin 21
 *
 * Si no enciende nada, antes de sospechar de la OLED probá `escaner_i2c`:
 * te dice si la pantalla contesta en el bus. Y si no contesta, lo más común
 * es que SDA y SCL estén cruzados — no rompe nada y se arregla dando vuelta
 * dos cables.
 *
 * CÓMO USARLO
 * -----------
 *   arduino-cli compile --fqbn arduino:avr:mega \
 *     --libraries robot/firmware/libraries robot/firmware/probar_cara
 *   arduino-cli upload -p COM5 --fqbn arduino:avr:mega robot/firmware/probar_cara
 *   arduino-cli monitor -p COM5 --config baudrate=115200
 *
 * Arranca recorriendo las seis expresiones, tres segundos cada una. Por el
 * monitor:
 *
 *   espera | izquierda | derecha | sonriendo | riendo | enojado
 *                        se queda fija en esa cara
 *   auto                 vuelve a recorrerlas todas
 *   lista                dice cuáles ya tienen dibujo y cuáles siguen en vector
 *
 * Los nombres de la app también valen: `idle`, `alegre`, `celebrando`…
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <PikoCaras.h>

/**
 * Qué controlador trae tu pantalla. Esto no se elige, se averigua.
 *
 *   1 = SH1106  — el de casi todas las de 1,3"
 *   0 = SSD1306 — el de casi todas las de 0,96"
 *
 * Los dos contestan en la dirección 0x3C y los dos aceptan la inicialización
 * del otro sin quejarse, así que el escáner de I2C no los distingue. Lo que sí
 * los distingue es el síntoma:
 *
 * Un SH1106 manejado como SSD1306 ignora la orden de avance automático de
 * página. Los 1024 bytes terminan escribiéndose todos en la primera franja de
 * ocho filas, pisándose entre sí, y las otras siete franjas nunca se tocan —
 * se quedan con la basura del encendido. Se ve como: la parte final del dibujo
 * arriba, y rayas fijas abajo que no cambian aunque mandes todo blanco o todo
 * negro.
 *
 * Si ves eso, cambiá este número.
 */
#define PANEL_ES_SH1106 1

#if PANEL_ES_SH1106
  #include <Adafruit_SH110X.h>
  #define COLOR_BLANCO SH110X_WHITE
#else
  #include <Adafruit_SSD1306.h>
  #define COLOR_BLANCO SSD1306_WHITE
#endif

const uint8_t DIRECCION_OLED = 0x3C;   // si el escáner dice 0x3D, cambialo acá
const unsigned long MS_POR_CARA = 3000;

/**
 * Alto real del panel: 64 o 32.
 *
 * Esto no es un gusto, es una propiedad física del vidrio que tenés. Si no
 * coinciden, la biblioteca configura mal los pines COM del controlador y la
 * imagen sale partida en **rayas horizontales parejas** — cada fila del dibujo
 * cae en un lugar que no le toca.
 *
 * Casi todos los módulos de 0,96" son de 64 filas y los de 0,91" son de 32,
 * pero se venden mezclados. Si ves rayas, cambiá este número a 32, subí de
 * nuevo, y mirá si se acomoda. Es una prueba de treinta segundos.
 */
#define ALTO_OLED 64

/**
 * Velocidad del bus I2C.
 *
 * 100 kHz es el modo estándar y aguanta cables de puente sueltos, que es lo
 * que hay en una mesa de trabajo. 400 kHz anda bien con pistas cortas y
 * resistencias de pull-up decentes, pero con cables largos empieza a perder
 * bytes — y perder bytes en medio del volcado corre el dibujo hacia arriba y
 * deja el resto de la pantalla con basura, que se confunde con una OLED rota.
 *
 * Arranca lento a propósito. Cuando la cara se vea bien, probá `i2c 400` por
 * el monitor: si sigue bien, ganás pantalla cuatro veces más rápida.
 */
unsigned long velocidadI2C = 100000;

#if PANEL_ES_SH1106
Adafruit_SH1106G oled(128, ALTO_OLED, &Wire, -1);
#else
Adafruit_SSD1306 oled(128, ALTO_OLED, &Wire, -1);
#endif

/** Arranca la pantalla con la firma que pida cada driver. */
static bool encenderPantalla() {
#if PANEL_ES_SH1106
  return oled.begin(DIRECCION_OLED, true);
#else
  return oled.begin(SSD1306_SWITCHCAPVCC, DIRECCION_OLED);
#endif
}

CaraPiko cara = CARA_ESPERA;
uint8_t  cuadro = 0;
bool     recorriendo = true;

unsigned long ultimoCuadro = 0;
unsigned long ultimaCara   = 0;

char linea[24];
uint8_t largo = 0;

static void anunciar() {
  Serial.print(F("\n>>> "));
  Serial.print(NOMBRE_CARA[cara]);
  const Animacion& a = CARAS[cara];
  if (a.n == 0) {
    Serial.println(F("   (vector de emergencia — todavía sin dibujo)"));
  } else {
    Serial.print(F("   ("));
    Serial.print(a.n);
    Serial.print(a.n == 1 ? F(" cuadro, ") : F(" cuadros, "));
    Serial.print(a.ms);
    Serial.println(F(" ms)"));
  }
}

/* `pintarCaraEn` sólo dibuja: el borrar y el volcar son de cada driver, no de
   Adafruit_GFX, y por eso quedan de este lado. */
static void mostrarCara() {
  oled.clearDisplay();
  pintarCaraEn(oled, cara, cuadro);
  oled.display();
}

static void ponerCara(CaraPiko nueva) {
  cara = nueva;
  cuadro = 0;
  ultimoCuadro = millis();
  mostrarCara();
  anunciar();
}

static void listar() {
  Serial.println(F("\nExpresiones:"));
  for (uint8_t i = 0; i < CARAS_TOTAL; i++) {
    Serial.print(F("  "));
    Serial.print(NOMBRE_CARA[i]);
    for (uint8_t e = strlen(NOMBRE_CARA[i]); e < 12; e++) Serial.print(' ');
    if (CARAS[i].n == 0) {
      Serial.println(F("vector"));
    } else {
      Serial.print(CARAS[i].n);
      Serial.println(F(" cuadro(s)"));
    }
  }
}

/**
 * Un patrón que delata exactamente qué está fallando.
 *
 * Un marco pegado a los cuatro bordes, una marca distinta en cada esquina y
 * una raya cada ocho filas. Con eso se lee de un vistazo si el dibujo está
 * corrido, espejado o cortado — cosas que en una cara se confunden con «me
 * salió fea». Si el marco de abajo no está abajo, no es tu dibujo: es el bus.
 */
static void patron() {
  oled.clearDisplay();
  oled.drawRect(0, 0, 128, 64, COLOR_BLANCO);
  oled.fillRect(2, 2, 10, 10, COLOR_BLANCO);      // arriba izquierda: cuadrado grande
  oled.fillRect(120, 2, 6, 6, COLOR_BLANCO);      // arriba derecha: chico
  oled.fillRect(2, 58, 4, 4, COLOR_BLANCO);       // abajo izquierda: más chico
  oled.drawLine(0, 0, 127, 63, COLOR_BLANCO);     // diagonal de esquina a esquina
  for (uint8_t y = 8; y < 64; y += 8) oled.drawFastHLine(0, y, 6, COLOR_BLANCO);
  oled.setTextSize(1);
  oled.setTextColor(COLOR_BLANCO);
  oled.setCursor(46, 28);
  oled.print(F("PIKO"));
  oled.display();
  Serial.println(F("\nPatrón: marco pegado a los 4 bordes, esquinas de distinto tamaño,"));
  Serial.println(F("rayitas cada 8 filas y una diagonal. Si el marco de abajo no está"));
  Serial.println(F("abajo, se están perdiendo bytes: bajá la velocidad con `i2c 100`."));
}

/**
 * Enciende una banda de ocho filas por vez y dice cuál es.
 *
 * Es el diagnóstico que separa las dos causas posibles de una pantalla rayada,
 * y no hace falta interpretar nada — se cuenta y se compara:
 *
 *   La banda encendida baja de a poco, ordenada, y llega abajo del todo
 *     → la geometría está bien y el problema son los datos.
 *
 *   La banda aparece en un lugar que no corresponde, o dos bandas a la vez, o
 *   a partir de cierto número no se ve nada
 *     → el panel no tiene el alto que dice el firmware. Cambiá ALTO_OLED.
 *
 * Ocho filas es justo una «página» del controlador, que es la unidad en que
 * realmente escribe. Por eso se barre así y no fila por fila.
 */
static uint8_t bandaActual = 255;
static unsigned long ultimaBanda = 0;

static void dibujarBanda(uint8_t b) {
  oled.clearDisplay();
  oled.fillRect(0, b * 8, 128, 8, COLOR_BLANCO);
  oled.display();
  Serial.print(F("  banda "));
  Serial.print(b);
  Serial.print(F(" — filas "));
  Serial.print(b * 8);
  Serial.print(F(" a "));
  Serial.println(b * 8 + 7);
}

static void ejecutar(char* l) {
  for (char* p = l; *p; p++) *p = tolower(*p);

  if (!strcmp(l, "barrido")) {
    recorriendo = false;
    bandaActual = 0;
    ultimaBanda = millis();
    Serial.print(F("\nBarrido de "));
    Serial.print(ALTO_OLED / 8);
    Serial.println(F(" bandas. Cada una tiene que verse una sola vez y en orden,"));
    Serial.println(F("bajando. Si alguna aparece donde no va, ALTO_OLED está mal."));
    dibujarBanda(0);
    return;
  }

  if (!strncmp(l, "i2c", 3)) {
    long khz = atol(l + 3);
    if (khz < 10 || khz > 1000) { Serial.println(F("Van entre 10 y 1000 kHz. Probá `i2c 100`.")); return; }
    velocidadI2C = (unsigned long)khz * 1000;
    Wire.setClock(velocidadI2C);
    Serial.print(F("\nBus a "));
    Serial.print(khz);
    Serial.println(F(" kHz."));
    mostrarCara();
    return;
  }

  if (!strcmp(l, "patron")) { recorriendo = false; bandaActual = 255; patron(); return; }

  if (!strcmp(l, "blanco")) {
    recorriendo = false;
    oled.clearDisplay();
    oled.fillRect(0, 0, 128, 64, COLOR_BLANCO);
    oled.display();
    Serial.println(F("\nTodo encendido. Cualquier píxel apagado es un byte que se perdió."));
    return;
  }

  if (!strcmp(l, "negro")) {
    recorriendo = false;
    oled.clearDisplay();
    oled.display();
    Serial.println(F("\nTodo apagado. Cualquier píxel encendido es basura que quedó."));
    return;
  }

  if (!strcmp(l, "auto")) {
    recorriendo = true;
    ultimaCara = millis();
    Serial.println(F("\nRecorriendo las seis."));
    return;
  }
  if (!strcmp(l, "lista")) { listar(); return; }

  int hallada = caraPorNombre(l);
  if (hallada < 0) {
    Serial.println(F("No conozco esa cara. Probá `lista`."));
    return;
  }
  recorriendo = false;
  ponerCara((CaraPiko)hallada);
}

void setup() {
  Serial.begin(115200);
  while (!Serial) { }

  /* El saludo va antes de tocar la pantalla. Si el bus está trabado y la
     inicialización se cuelga, sin esto la placa queda muda y desde afuera
     parece que el firmware no entró. */
  Serial.println(F("\nARRANCA probar_cara"));

  Wire.begin();
  /* Y el tiempo de espera, que es lo que impide el cuelgue. `Wire` en AVR
     aguarda indefinidamente a que se libere la línea: con un módulo que no
     responde, `begin()` no vuelve nunca. */
  Wire.setWireTimeout(25000, true);

  if (!encenderPantalla()) {
    // Sin for(;;) a propósito: el ejemplo de Adafruit se cuelga acá y uno se
    // queda sin saber por qué. Mejor decirlo y seguir vivo por el serie.
    Serial.println(F("La OLED no contesta en 0x3C."));
    Serial.println(F("Revisá 5V y GND, probá cruzar SDA y SCL, y corré escaner_i2c."));
  } else {
    Wire.setClock(velocidadI2C);
  }

  Serial.println(F("Prueba de pantalla — sólo la OLED"));
  Serial.println(F("Ordenes: <nombre> | auto | lista"));
  Serial.println(F("Diagnostico: barrido | patron | blanco | negro | i2c <khz>"));
  Serial.print(F("Panel de 128x"));
  Serial.print(ALTO_OLED);
  Serial.print(F(", bus a "));
  Serial.print(velocidadI2C / 1000);
  Serial.println(F(" kHz."));
  listar();

  ultimaCara = millis();
  ponerCara(CARA_ESPERA);
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      linea[largo] = 0;
      if (largo) ejecutar(linea);
      largo = 0;
      continue;
    }
    if (largo < sizeof(linea) - 1) linea[largo++] = c;
    else largo = 0;
  }

  unsigned long ahora = millis();

  // El barrido se queda corriendo hasta que pidas otra cosa.
  if (bandaActual != 255) {
    if (ahora - ultimaBanda >= 1500) {
      ultimaBanda = ahora;
      bandaActual = (bandaActual + 1) % (ALTO_OLED / 8);
      dibujarBanda(bandaActual);
    }
    return;
  }

  // Pasar a la siguiente expresión del recorrido.
  if (recorriendo && ahora - ultimaCara >= MS_POR_CARA) {
    ultimaCara = ahora;
    ponerCara((CaraPiko)((cara + 1) % CARAS_TOTAL));
  }

  // Avanzar la animación de la expresión actual.
  const Animacion& a = CARAS[cara];
  if (a.n > 1 && ahora - ultimoCuadro >= a.ms) {
    ultimoCuadro = ahora;
    cuadro = (cuadro + 1) % a.n;
    mostrarCara();
  }
}
