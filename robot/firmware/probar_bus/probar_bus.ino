/**
 * Análisis a fondo del bus I2C, sin usar el hardware del micro.
 *
 * El escáner normal usa el módulo TWI del ATmega a través de `Wire`. Éste
 * genera las señales a mano, moviendo los pines uno por uno. Eso permite tres
 * cosas que con `Wire` no se pueden:
 *
 *   1. **Probar las dos orientaciones de los cables.** Si `SDA` y `SCL` están
 *      invertidos, `Wire` no tiene forma de darse cuenta y la prueba de
 *      continuidad tampoco — un cruce da continuidad perfecta. Acá se escanea
 *      con los pines en un orden y después en el otro. Si el módulo aparece en
 *      la segunda pasada, están cruzados y se arregla dando vuelta dos cables.
 *
 *   2. **Ir tan lento como haga falta.** Si el módulo no está aportando sus
 *      resistencias al bus, las señales suben despacio y a velocidad normal
 *      nada funciona. A 5 kHz hay tiempo de sobra.
 *
 *   3. **Descartar el propio TWI.** Si el hardware I2C del micro estuviera
 *      dañado, esto funcionaría igual.
 *
 * También mide el tiempo de subida de cada línea, que dice si hay resistencias
 * de verdad tirando hacia arriba o sólo las internas del micro, que son
 * débiles. Un módulo sano las trae: si el número es alto, el módulo está
 * eléctricamente ausente aunque tenga los cuatro cables puestos.
 */

const uint8_t PIN_A = 20;   // el que la placa llama SDA
const uint8_t PIN_B = 21;   // el que la placa llama SCL

/* 100 µs por medio ciclo son unos 5 kHz: veinte veces más lento que el modo
   estándar. A esta velocidad, hasta un bus con resistencias flojas anda. */
const uint8_t ESPERA = 100;

uint8_t pSDA = PIN_A;
uint8_t pSCL = PIN_B;

// ── Manejo de las líneas ─────────────────────────────────────────────────
// El I2C es de colector abierto: nadie fuerza el nivel alto, sólo se suelta la
// línea y la resistencia la sube. Por eso «alto» es poner el pin como entrada.

static void soltar(uint8_t p) { pinMode(p, INPUT_PULLUP); }
static void bajar(uint8_t p)  { pinMode(p, OUTPUT); digitalWrite(p, LOW); }

/** Suelta el reloj y espera a que suba de verdad: un esclavo lento puede
    retenerlo un rato, y seguir sin esperarlo corrompe la transferencia. */
static bool soltarReloj() {
  soltar(pSCL);
  for (uint16_t i = 0; i < 1000; i++) {
    if (digitalRead(pSCL)) return true;
    delayMicroseconds(1);
  }
  return false;
}

static void inicio() {
  soltar(pSDA); soltar(pSCL); delayMicroseconds(ESPERA);
  bajar(pSDA);  delayMicroseconds(ESPERA);
  bajar(pSCL);  delayMicroseconds(ESPERA);
}

static void fin() {
  bajar(pSDA);  delayMicroseconds(ESPERA);
  soltarReloj();  delayMicroseconds(ESPERA);
  soltar(pSDA); delayMicroseconds(ESPERA);
}

static void escribirBit(bool b) {
  if (b) soltar(pSDA); else bajar(pSDA);
  delayMicroseconds(ESPERA);
  soltarReloj();
  delayMicroseconds(ESPERA);
  bajar(pSCL);
  delayMicroseconds(ESPERA);
}

/** El reconocimiento: el esclavo tira SDA abajo durante el noveno pulso. */
static bool hayReconocimiento() {
  soltar(pSDA);
  delayMicroseconds(ESPERA);
  soltarReloj();
  delayMicroseconds(ESPERA);
  const bool ack = (digitalRead(pSDA) == LOW);
  bajar(pSCL);
  delayMicroseconds(ESPERA);
  return ack;
}

static bool responde(uint8_t dir) {
  inicio();
  const uint8_t byte = (uint8_t)(dir << 1);   // bit de escritura en 0
  for (int8_t i = 7; i >= 0; i--) escribirBit((byte >> i) & 1);
  const bool ack = hayReconocimiento();
  fin();
  return ack;
}

// ── Medición del tiempo de subida ────────────────────────────────────────

/**
 * Cuánto tarda una línea en volver a nivel alto después de soltarla.
 *
 * Con resistencias externas de verdad —las que trae cualquier módulo sano— la
 * subida es inmediata y esto da 0. Si sólo actúan las internas del micro, que
 * son diez veces más flojas, el número sube. Sirve para distinguir «el módulo
 * está ahí» de «hay cuatro cables puestos pero eléctricamente no hay nadie».
 */
static uint16_t tiempoDeSubida(uint8_t p) {
  bajar(p);
  delayMicroseconds(200);
  uint16_t cuenta = 0;
  pinMode(p, INPUT_PULLUP);
  while (!digitalRead(p) && cuenta < 20000) cuenta++;
  return cuenta;
}

// ── Barridos ─────────────────────────────────────────────────────────────

static uint8_t barrer(const char* etiqueta) {
  Serial.print(F("\n--- "));
  Serial.print(etiqueta);
  Serial.print(F("  (SDA=pin "));
  Serial.print(pSDA);
  Serial.print(F(", SCL=pin "));
  Serial.print(pSCL);
  Serial.println(F(") ---"));

  soltar(pSDA);
  soltar(pSCL);
  delay(5);

  uint8_t hallados = 0;
  for (uint8_t dir = 1; dir < 127; dir++) {
    if (!responde(dir)) continue;
    hallados++;
    Serial.print(F("  >>> RESPONDE en 0x"));
    if (dir < 16) Serial.print('0');
    Serial.print(dir, HEX);
    if (dir == 0x3C || dir == 0x3D) Serial.print(F("  — es la OLED"));
    Serial.println();
  }

  if (!hallados) Serial.println(F("  nadie"));
  return hallados;
}

void setup() {
  Serial.begin(115200);
  while (!Serial) { }

  Serial.println(F("\nAnalisis a fondo del bus I2C — señales generadas a mano"));

  Serial.println(F("\nTiempo de subida de cada linea:"));
  Serial.print(F("  pin 20: "));
  Serial.println(tiempoDeSubida(PIN_A));
  Serial.print(F("  pin 21: "));
  Serial.println(tiempoDeSubida(PIN_B));
  Serial.println(F("  0 = hay resistencias externas, el modulo esta presente."));
  Serial.println(F("  alto = solo actuan las internas: nadie mas tira del bus."));

  uint8_t total = 0;

  pSDA = PIN_A; pSCL = PIN_B;
  total += barrer("Orientacion normal");

  pSDA = PIN_B; pSCL = PIN_A;
  total += barrer("Orientacion CRUZADA");

  Serial.println();
  if (total == 0) {
    Serial.println(F("Nadie contesta en ninguna de las dos orientaciones."));
    Serial.println(F("Con las señales generadas a mano y a 5 kHz, ya no queda"));
    Serial.println(F("nada del lado del micro que pueda estar fallando."));
  } else {
    Serial.println(F("Alguien contesto. Mira arriba en cual de las dos orientaciones:"));
    Serial.println(F("si fue en la CRUZADA, hay que dar vuelta SDA y SCL."));
  }
}

/**
 * Después de los barridos, comprobar el supuesto que quedó sin verificar.
 *
 * Todo esto asume que el header rotulado SDA/SCL de la placa son de verdad los
 * pines 20 y 21 del micro. Nunca lo comprobamos: la prueba de continuidad
 * confirma que el cable llega del header al módulo, pero no que ese header sea
 * ese pin.
 *
 * Acá se mueve un pin por vez, lento, avisando cuál. Con la punta del
 * multímetro en la pata correspondiente del módulo, tiene que verse saltar
 * entre 0 y 5 V. Si se queda fijo, ese pin del micro no llega a la pantalla, y
 * ahí está la explicación de todo.
 */
void loop() {
  static uint8_t cual = 0;

  const uint8_t pin = cual ? PIN_B : PIN_A;
  Serial.print(F("\nMoviendo el pin "));
  Serial.print(pin);
  Serial.print(pin == PIN_A ? F("  (deberia ser SDA)") : F("  (deberia ser SCL)"));
  Serial.println(F(" — 8 s. Medi en la pata del modulo."));

  pinMode(pin, OUTPUT);
  for (uint8_t i = 0; i < 16; i++) {
    digitalWrite(pin, i & 1);
    delay(500);
  }
  pinMode(pin, INPUT_PULLUP);

  cual ^= 1;
}
