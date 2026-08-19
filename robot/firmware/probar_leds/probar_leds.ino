/**
 * Prueba de los LEDs, solos.
 *
 * Enciende los cuatro WS2812 y nada más: ni pantalla, ni motores. Si algo no
 * anda acá, el problema es el módulo o su cableado.
 *
 * CABLEADO
 * --------
 *   IN  → pin 28        (el header de diez, debajo del Bluetooth)
 *   VCC → 5 V
 *   GND → GND
 *
 * Los WS2812 quieren 5 V tanto en la alimentación como en la señal de datos.
 * El Mega es de 5 V, así que van directo — no hace falta adaptar niveles.
 *
 * DOS COSAS QUE NO SE VEN MIRANDO EL MÓDULO
 * -----------------------------------------
 * **El orden de los colores.** El WS2812B manda los bytes en orden verde,
 * rojo, azul; algunos clones los mandan rojo, verde, azul. Si pedís rojo y se
 * enciende verde, tu módulo es de los segundos: cambiá ORDEN_COLOR abajo.
 *
 * **El consumo.** Cada LED en blanco pleno tira unos 60 mA, así que los cuatro
 * juntos se comen 240 mA — casi la mitad de lo que da un puerto USB. Por eso
 * el brillo arranca en 60 de 255. La orden `blanco` los pone al máximo a
 * propósito, para ver si la alimentación aguanta: si la placa se reinicia en
 * ese momento, ya sabés que no.
 *
 * CÓMO USARLO
 * -----------
 *   arduino-cli compile --fqbn arduino:avr:mega robot/firmware/probar_leds
 *   arduino-cli upload -p COM5 --fqbn arduino:avr:mega robot/firmware/probar_leds
 *
 * Arranca contando: LED 0 rojo, 1 verde, 2 azul, 3 blanco, fijos. Con eso
 * verificás de un vistazo cuántos responden, cuál es el número 0 y si los
 * colores salen bien. Por el monitor:
 *
 *   rojo | verde | azul | blanco | apagar
 *   contar                  el patrón del arranque
 *   barrido                 uno por vez, de a uno, diciendo cuál
 *   arcoiris                el degradé en movimiento
 *   uno <i> <r> <g> <b>     un LED puntual
 *   todos <r> <g> <b>       los cuatro
 *   brillo <0-255>          brillo global
 */

#include <Adafruit_NeoPixel.h>

const uint8_t PIN_LEDS = 28;
const uint8_t NUM_LEDS = 4;

/* NEO_GRB es lo normal en un WS2812B. Si `rojo` se ve verde y `verde` se ve
   rojo, tu módulo es de los que van en orden RGB: cambiá esta línea. */
#define ORDEN_COLOR (NEO_GRB + NEO_KHZ800)

const uint8_t BRILLO_INICIAL = 60;

Adafruit_NeoPixel tira(NUM_LEDS, PIN_LEDS, ORDEN_COLOR);

enum Modo : uint8_t { FIJO, BARRIDO, ARCOIRIS };
Modo modo = FIJO;

uint8_t paso = 0;
unsigned long ultimoPaso = 0;

char linea[32];
uint8_t largo = 0;

// ─────────────────────────────────────────────────────────────────────────

static void todos(uint8_t r, uint8_t g, uint8_t b) {
  for (uint8_t i = 0; i < NUM_LEDS; i++) tira.setPixelColor(i, tira.Color(r, g, b));
  tira.show();
}

/**
 * Un color distinto por LED: rojo, verde, azul, blanco.
 *
 * Contesta tres preguntas de una: cuántos LEDs responden, cuál de los cuatro
 * físicos es el índice 0 —que depende de por dónde entra el cable de datos, y
 * no siempre es el que uno cree— y si los colores salen en el orden correcto.
 */
static void contar() {
  tira.setPixelColor(0, tira.Color(255, 0, 0));
  tira.setPixelColor(1, tira.Color(0, 255, 0));
  tira.setPixelColor(2, tira.Color(0, 0, 255));
  tira.setPixelColor(3, tira.Color(255, 255, 255));
  tira.show();
  Serial.println(F("\n0 rojo · 1 verde · 2 azul · 3 blanco"));
  Serial.println(F("Si los colores no coinciden, el modulo va en RGB y no en GRB:"));
  Serial.println(F("cambia ORDEN_COLOR arriba del sketch."));
}

/** Degradé por la rueda de color, para el LED i con un desfase. */
static uint32_t rueda(uint8_t pos) {
  if (pos < 85) return tira.Color(255 - pos * 3, pos * 3, 0);
  if (pos < 170) { pos -= 85; return tira.Color(0, 255 - pos * 3, pos * 3); }
  pos -= 170;
  return tira.Color(pos * 3, 0, 255 - pos * 3);
}

static void ejecutar(char* l) {
  for (char* p = l; *p; p++) *p = tolower(*p);

  char* cmd = strtok(l, " ");
  if (!cmd) return;

  if (!strcmp(cmd, "rojo"))   { modo = FIJO; todos(255, 0, 0);     Serial.println(F("\nrojo")); return; }
  if (!strcmp(cmd, "verde"))  { modo = FIJO; todos(0, 255, 0);     Serial.println(F("\nverde")); return; }
  if (!strcmp(cmd, "azul"))   { modo = FIJO; todos(0, 0, 255);     Serial.println(F("\nazul")); return; }
  if (!strcmp(cmd, "apagar")) { modo = FIJO; todos(0, 0, 0);       Serial.println(F("\napagados")); return; }
  if (!strcmp(cmd, "contar")) { modo = FIJO; contar(); return; }

  if (!strcmp(cmd, "blanco")) {
    modo = FIJO;
    tira.setBrightness(255);
    todos(255, 255, 255);
    Serial.println(F("\nBlanco pleno al maximo: unos 240 mA."));
    Serial.println(F("Si la placa se reinicia justo ahora, la alimentacion no da."));
    return;
  }

  if (!strcmp(cmd, "barrido"))  { modo = BARRIDO; paso = 0; ultimoPaso = millis(); Serial.println(F("\nUno por vez.")); return; }
  if (!strcmp(cmd, "arcoiris")) { modo = ARCOIRIS; Serial.println(F("\nArcoiris.")); return; }

  if (!strcmp(cmd, "brillo")) {
    char* v = strtok(NULL, " ");
    long b = v ? atol(v) : -1;
    if (b < 0 || b > 255) { Serial.println(F("Brillo va de 0 a 255.")); return; }
    tira.setBrightness((uint8_t)b);
    tira.show();
    Serial.print(F("\nBrillo "));
    Serial.println(b);
    return;
  }

  if (!strcmp(cmd, "uno") || !strcmp(cmd, "todos")) {
    const bool unoSolo = (cmd[0] == 'u');
    long i = 0;
    if (unoSolo) {
      char* v = strtok(NULL, " ");
      i = v ? atol(v) : -1;
      if (i < 0 || i >= NUM_LEDS) { Serial.println(F("El indice va de 0 a 3.")); return; }
    }
    long c[3];
    for (uint8_t k = 0; k < 3; k++) {
      char* v = strtok(NULL, " ");
      c[k] = v ? atol(v) : -1;
      if (c[k] < 0 || c[k] > 255) { Serial.println(F("Los tres colores van de 0 a 255.")); return; }
    }
    modo = FIJO;
    if (unoSolo) {
      tira.setPixelColor((uint16_t)i, tira.Color(c[0], c[1], c[2]));
      tira.show();
    } else {
      todos(c[0], c[1], c[2]);
    }
    Serial.println(F("\nlisto"));
    return;
  }

  Serial.println(F("No entendi. Probá: contar | rojo | verde | azul | blanco | apagar"));
  Serial.println(F("                  barrido | arcoiris | brillo N | uno i r g b | todos r g b"));
}

// ─────────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  while (!Serial) { }

  tira.begin();
  tira.setBrightness(BRILLO_INICIAL);
  tira.clear();
  tira.show();

  Serial.println(F("Prueba de LEDs — solo los WS2812"));
  Serial.print(F("4 LEDs en el pin "));
  Serial.print(PIN_LEDS);
  Serial.print(F(", brillo "));
  Serial.println(BRILLO_INICIAL);
  Serial.println(F("Ordenes: contar | rojo | verde | azul | blanco | apagar"));
  Serial.println(F("         barrido | arcoiris | brillo N | uno i r g b | todos r g b"));

  contar();
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

  if (modo == BARRIDO && ahora - ultimoPaso >= 700) {
    ultimoPaso = ahora;
    tira.clear();
    tira.setPixelColor(paso, tira.Color(255, 255, 255));
    tira.show();
    Serial.print(F("  LED "));
    Serial.println(paso);
    paso = (paso + 1) % NUM_LEDS;
  }

  if (modo == ARCOIRIS && ahora - ultimoPaso >= 30) {
    ultimoPaso = ahora;
    for (uint8_t i = 0; i < NUM_LEDS; i++)
      tira.setPixelColor(i, rueda((paso + i * 64) & 255));
    tira.show();
    paso++;
  }
}
