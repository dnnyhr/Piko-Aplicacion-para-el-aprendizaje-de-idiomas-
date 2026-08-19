/**
 * Buscador de pines del MegaPi.
 *
 * En el MegaPi los pines no están rotulados uno por uno como en un Arduino:
 * vienen en dos filas por puerto, y sólo la de abajo lleva las señales del
 * micro. Este sketch sirve para no adivinar — le pedís un pin y lo hace
 * parpadear, así lo encontrás con un LED en la mano en vez de con la vista.
 *
 * QUÉ NECESITÁS
 * -------------
 * Un LED con una resistencia de 220 Ω a 1 kΩ en serie. La pata corta del LED
 * (cátodo) a cualquier GND de la placa, y la larga, a través de la
 * resistencia, la vas tocando en los pines de la fila amarilla. El que
 * parpadea es el que el sketch está nombrando por el monitor serie.
 *
 * Si no tenés LED, un multímetro en voltios de continua hace lo mismo: la
 * punta negra a GND y la roja al pin. El que oscila entre 0 y 5 V es ése.
 *
 * ANTES DE EMPEZAR
 * ----------------
 * Desconectá los motores. Este sketch mueve pines al azar desde el punto de
 * vista de un driver, y si hay algo enchufado va a dar tirones.
 *
 * Y no toques la fila roja de cada puerto: ahí va la alimentación del motor,
 * no señales. Un LED ahí se quema.
 *
 * CÓMO USARLO
 * -----------
 *   arduino-cli compile --fqbn arduino:avr:mega robot/firmware/buscar_pin
 *   arduino-cli upload -p COM5 --fqbn arduino:avr:mega robot/firmware/buscar_pin
 *   arduino-cli monitor -p COM5 --config baudrate=115200
 *
 * Y por el monitor, una línea:
 *
 *   13        hace parpadear ese pin y nada más
 *   p1        recorre los ocho pines de PORT1, uno por uno, tres segundos
 *             cada uno, diciendo por serie cuál está activo
 *   p2 p3 p4  lo mismo para los otros puertos
 *   cabeza    recorre los diez pines de debajo del Bluetooth: 22 a 30 y 39
 *   libre     recorre los headers del borde derecho (A9 a A15)
 *   alto      apaga todo
 *
 * El recorrido es la forma rápida de rotular la placa: ponés el LED en un pin
 * de la fila amarilla, lanzás `p2`, y anotás en qué momento parpadea.
 */

const unsigned long MS_PARPADEO = 250;   // 2 Hz: rápido de ver, lento de contar
const unsigned long MS_POR_PIN  = 3000;

const uint8_t PINES_P1[8] = { 35, 34, 33, 32, 31, 18, 12, 11 };
const uint8_t PINES_P2[8] = { 36, 37, 40, 41, 38, 19,  8,  7 };
const uint8_t PINES_P3[8] = { 42, 43, 47, 48, 49,  3,  9,  6 };
const uint8_t PINES_P4[8] = { A5, A4, A3, A2, A1,  2,  5,  4 };
const uint8_t LIBRES[7] = { A9, A10, A11, A12, A13, A14, A15 };

/* El header de diez pines que está debajo del módulo Bluetooth. Es el mejor
   lugar de la placa para todo lo que no es motor: diez pines juntos, seis de
   ellos contiguos, que alcanzan para la LCD, los LEDs y el servo sin tocar
   ningún slot. */
const uint8_t CABEZA[10] = { 22, 23, 24, 25, 26, 27, 28, 29, 30, 39 };

/* Los nombres se imprimen aparte porque A5 y compañía son números una vez
   compilados, y "A5" le dice mucho más al que está mirando la placa que "59". */
const char* const NOMBRE_PORT4[8] = { "A5", "A4", "A3", "A2", "A1", "2", "5", "4" };
const char* const NOMBRE_LIBRES[7] = { "A9", "A10", "A11", "A12", "A13", "A14", "A15" };

const uint8_t* lista = nullptr;
const char* const* nombres = nullptr;
uint8_t largoLista = 0;
uint8_t indice = 0;
uint8_t pinSuelto = 255;

unsigned long ultimoCambio = 0;
unsigned long ultimoSalto  = 0;
bool encendido = false;

char linea[24];
uint8_t largo = 0;

static void apagarTodo() {
  for (uint8_t i = 0; i < 8; i++) {
    digitalWrite(PINES_P1[i], LOW);
    digitalWrite(PINES_P2[i], LOW);
    digitalWrite(PINES_P3[i], LOW);
    digitalWrite(PINES_P4[i], LOW);
  }
  for (uint8_t i = 0; i < 7; i++) digitalWrite(LIBRES[i], LOW);
  for (uint8_t i = 0; i < 10; i++) digitalWrite(CABEZA[i], LOW);
}

static void prepararSalidas() {
  for (uint8_t i = 0; i < 8; i++) {
    pinMode(PINES_P1[i], OUTPUT);
    pinMode(PINES_P2[i], OUTPUT);
    pinMode(PINES_P3[i], OUTPUT);
    pinMode(PINES_P4[i], OUTPUT);
  }
  for (uint8_t i = 0; i < 7; i++) pinMode(LIBRES[i], OUTPUT);
  for (uint8_t i = 0; i < 10; i++) pinMode(CABEZA[i], OUTPUT);
}

static void anunciar() {
  Serial.print(F("\n>>> parpadeando el pin "));
  if (nombres) Serial.print(nombres[indice]);
  else Serial.print(lista[indice]);
  Serial.print(F("   ("));
  Serial.print(indice + 1);
  Serial.print(F(" de "));
  Serial.print(largoLista);
  Serial.println(F(")"));
}

static void arrancarRecorrido(const uint8_t* pines, const char* const* rotulos, uint8_t n, const char* que) {
  apagarTodo();
  lista = pines;
  nombres = rotulos;
  largoLista = n;
  indice = 0;
  pinSuelto = 255;
  ultimoSalto = millis();
  Serial.print(F("\nRecorriendo "));
  Serial.print(que);
  Serial.println(F(" — de la bornera verde hacia el centro de la placa."));
  anunciar();
}

static void ejecutar(char* l) {
  for (char* p = l; *p; p++) *p = tolower(*p);

  if (!strcmp(l, "alto")) {
    apagarTodo();
    lista = nullptr;
    pinSuelto = 255;
    Serial.println(F("\nTodo apagado."));
    return;
  }

  if (!strcmp(l, "p1")) { arrancarRecorrido(PINES_P1, nullptr, 8, "PORT1"); return; }
  if (!strcmp(l, "p2")) { arrancarRecorrido(PINES_P2, nullptr, 8, "PORT2"); return; }
  if (!strcmp(l, "p3")) { arrancarRecorrido(PINES_P3, nullptr, 8, "PORT3"); return; }
  if (!strcmp(l, "p4")) { arrancarRecorrido(PINES_P4, NOMBRE_PORT4, 8, "PORT4"); return; }
  if (!strcmp(l, "libre")) { arrancarRecorrido(LIBRES, NOMBRE_LIBRES, 7, "los headers A9-A15"); return; }
  if (!strcmp(l, "cabeza")) { arrancarRecorrido(CABEZA, nullptr, 10, "el header de 10 debajo del Bluetooth"); return; }

  char* fin;
  long n = strtol(l, &fin, 10);
  if (fin != l && n >= 0 && n <= 69) {
    apagarTodo();
    lista = nullptr;
    pinSuelto = (uint8_t)n;
    pinMode(pinSuelto, OUTPUT);
    Serial.print(F("\n>>> parpadeando sólo el pin "));
    Serial.println(pinSuelto);
    return;
  }

  Serial.println(F("No entendi. Probá: un numero, p1, p2, p3, p4, libre, alto"));
}

void setup() {
  Serial.begin(115200);
  while (!Serial) { }
  prepararSalidas();
  apagarTodo();

  Serial.println(F("Buscador de pines del MegaPi"));
  Serial.println(F("----------------------------"));
  Serial.println(F("LED con resistencia: pata corta a GND, pata larga al pin."));
  Serial.println(F("Usá la fila AMARILLA de cada puerto. La roja es potencia."));
  Serial.println(F("Desconectá los motores antes de empezar.\n"));
  Serial.println(F("Ordenes: <numero> | p1 | p2 | p3 | p4 | cabeza | libre | alto"));
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

  // Saltar al siguiente pin del recorrido.
  if (lista && ahora - ultimoSalto >= MS_POR_PIN) {
    ultimoSalto = ahora;
    digitalWrite(lista[indice], LOW);
    indice = (indice + 1) % largoLista;
    anunciar();
  }

  // El parpadeo en sí.
  if (ahora - ultimoCambio >= MS_PARPADEO) {
    ultimoCambio = ahora;
    encendido = !encendido;
    if (lista) digitalWrite(lista[indice], encendido ? HIGH : LOW);
    else if (pinSuelto != 255) digitalWrite(pinSuelto, encendido ? HIGH : LOW);
  }
}
