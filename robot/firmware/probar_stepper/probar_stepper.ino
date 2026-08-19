/**
 * Prueba del motor a pasos, solo.
 *
 * Un 28BYJ-48 con su módulo ULN2003, y nada más encendido. La secuencia es la
 * misma que usa `piko_robot`, así que lo que verifiques acá vale para el
 * firmware completo.
 *
 * CABLEADO
 * --------
 *   IN1 → pin 36      IN3 → pin 40        (PORT2, cuatro pines seguidos)
 *   IN2 → pin 37      IN4 → pin 41
 *   VCC → 5 V         GND → GND
 *
 * EL MOTOR VIBRA PERO NO GIRA
 * ---------------------------
 * Es la falla clásica y casi siempre son dos cables cruzados. Las bobinas
 * tienen que energizarse en un orden concreto; si el orden está mal, el rotor
 * recibe tirones que se cancelan entre sí y se queda temblando en el lugar.
 *
 * Para eso está la orden `bobinas`: enciende IN1, IN2, IN3 e IN4 de a una y
 * dice cuál. El módulo ULN2003 trae cuatro LEDs, así que se ve sin necesidad
 * de mirar el motor — tienen que prenderse **en orden, de izquierda a
 * derecha**. Si prenden salteados, ahí está el cruce.
 *
 * CUÁNTO ES UNA VUELTA
 * --------------------
 * 4096 medios pasos en el eje de salida. No 2048: ése es el número en pasos
 * enteros, y este firmware mueve en medios pasos porque dan más torque y más
 * suavidad. La orden `vuelta` da exactamente 4096 — marcá el eje con un
 * fibrón y comprobalo, que es la única forma honesta de confirmar el número.
 *
 * Y no pasa de unas 15 rpm. Pedirle más no lo acelera: lo hace zumbar quieto
 * y perder pasos.
 *
 * CÓMO USARLO
 * -----------
 *   arduino-cli compile --fqbn arduino:avr:mega robot/firmware/probar_stepper
 *   arduino-cli upload -p COM6 --fqbn arduino:avr:mega robot/firmware/probar_stepper
 *
 * Arranca quieto y con las bobinas apagadas, a propósito: un motor que se
 * mueve solo al encender la placa es una sorpresa desagradable.
 *
 *   bobinas          enciende IN1..IN4 de a una, para verificar el cableado
 *   vuelta           una vuelta entera; `-vuelta` para el otro lado
 *   grados <n>       gira n grados, con signo
 *   pasos <n>        gira n medios pasos, con signo
 *   rpm <n>          velocidad, de 1 a 15
 *   vaiven           media vuelta para cada lado, sin parar
 *   parar            frena
 *   soltar           apaga las bobinas
 *   sostener         deja las bobinas energizadas al terminar
 */

/* Las cuatro primeras posiciones de PORT2, pegadas una al lado de la otra.
   En el MegaPi el serigrafiado va en orden físico, así que lo que importa para
   cablear cómodo es la posición y no el número. */
const uint8_t PIN_ULN[4] = { 36, 37, 40, 41 };   // IN1 IN2 IN3 IN4

const uint16_t PASOS_POR_VUELTA = 4096;   // medios pasos en el eje de salida
const uint8_t RPM_MAX = 15;

/**
 * Medios pasos. Cada renglón dice qué bobinas quedan energizadas.
 *
 * Se usa media paso y no paso entero porque el 28BYJ-48 tiene vueltas de sobra
 * para permitírselo: se gana suavidad y algo de torque a cambio del doble de
 * pulsos, que a estas velocidades no cuesta nada.
 */
const uint8_t SECUENCIA[8] = {
  0b1000, 0b1100, 0b0100, 0b0110,
  0b0010, 0b0011, 0b0001, 0b1001
};

long          pasosRestantes = 0;
int8_t        sentido = 1;
uint8_t       rpm = 10;
unsigned long intervaloUs = 1465;
unsigned long ultimoPasoUs = 0;
uint8_t       fase = 0;
bool          sostenerBobinas = false;
bool          vaiven = false;

/* El barrido de bobinas usa su propio reloj para no mezclarse con el del
   motor: son dos cosas distintas y compartir estado las volvería frágiles. */
uint8_t       bobinaActual = 255;
unsigned long ultimaBobina = 0;

char linea[32];
uint8_t largo = 0;

// ─────────────────────────────────────────────────────────────────────────

static void apagarBobinas() {
  for (uint8_t i = 0; i < 4; i++) digitalWrite(PIN_ULN[i], LOW);
}

static void aplicarFase() {
  for (uint8_t i = 0; i < 4; i++)
    digitalWrite(PIN_ULN[i], (SECUENCIA[fase] >> (3 - i)) & 1);
}

static void recalcularIntervalo() {
  intervaloUs = 60000000UL / ((unsigned long)rpm * PASOS_POR_VUELTA);
}

static void mover(long pasos) {
  bobinaActual = 255;
  sentido = pasos < 0 ? -1 : 1;
  pasosRestantes = labs(pasos);
  ultimoPasoUs = micros();
  Serial.print(F("\n"));
  Serial.print(pasosRestantes);
  Serial.print(F(" medios pasos hacia la "));
  Serial.print(sentido > 0 ? F("derecha") : F("izquierda"));
  Serial.print(F(", a "));
  Serial.print(rpm);
  Serial.println(F(" rpm"));
}

static void parar() {
  pasosRestantes = 0;
  vaiven = false;
  if (!sostenerBobinas) apagarBobinas();
  Serial.println(F("\nparado"));
}

// ─────────────────────────────────────────────────────────────────────────

static void ejecutar(char* l) {
  for (char* p = l; *p; p++) *p = tolower(*p);
  char* cmd = strtok(l, " ");
  if (!cmd) return;

  if (!strcmp(cmd, "bobinas")) {
    pasosRestantes = 0;
    vaiven = false;
    bobinaActual = 0;
    ultimaBobina = millis();
    Serial.println(F("\nEncendiendo IN1 a IN4 de a una."));
    Serial.println(F("Los 4 LEDs del modulo tienen que prenderse en orden, uno por vez."));
    Serial.println(F("Si prenden salteados, hay dos cables cruzados."));
    return;
  }

  if (!strcmp(cmd, "parar"))  { parar(); return; }

  if (!strcmp(cmd, "soltar")) {
    pasosRestantes = 0;
    vaiven = false;
    bobinaActual = 255;
    sostenerBobinas = false;
    apagarBobinas();
    Serial.println(F("\nBobinas apagadas. El motor queda suelto y deja de calentarse."));
    return;
  }

  if (!strcmp(cmd, "sostener")) {
    sostenerBobinas = true;
    Serial.println(F("\nLas bobinas quedan energizadas al terminar cada giro."));
    Serial.println(F("Sostiene la posicion, pero consume y calienta aun quieto."));
    return;
  }

  if (!strcmp(cmd, "vuelta"))  { vaiven = false; mover(PASOS_POR_VUELTA); return; }
  if (!strcmp(cmd, "-vuelta")) { vaiven = false; mover(-(long)PASOS_POR_VUELTA); return; }

  if (!strcmp(cmd, "vaiven")) {
    vaiven = true;
    mover(PASOS_POR_VUELTA / 2);
    Serial.println(F("Media vuelta para cada lado, sin parar. `parar` lo corta."));
    return;
  }

  if (!strcmp(cmd, "rpm")) {
    char* v = strtok(NULL, " ");
    long n = v ? atol(v) : -1;
    if (n < 1 || n > RPM_MAX) {
      Serial.print(F("\nLas rpm van de 1 a "));
      Serial.print(RPM_MAX);
      Serial.println(F(". Mas rapido no gira: zumba quieto y pierde pasos."));
      return;
    }
    rpm = (uint8_t)n;
    recalcularIntervalo();
    Serial.print(F("\n"));
    Serial.print(rpm);
    Serial.print(F(" rpm — un medio paso cada "));
    Serial.print(intervaloUs);
    Serial.println(F(" us"));
    return;
  }

  if (!strcmp(cmd, "grados") || !strcmp(cmd, "pasos")) {
    char* v = strtok(NULL, " ");
    if (!v) { Serial.println(F("\nFalta el numero.")); return; }
    long n = atol(v);
    vaiven = false;
    mover(cmd[0] == 'g' ? (n * PASOS_POR_VUELTA) / 360 : n);
    return;
  }

  Serial.println(F("No entendi. Probá: bobinas | vuelta | -vuelta | grados n | pasos n"));
  Serial.println(F("                  rpm n | vaiven | parar | soltar | sostener"));
}

// ─────────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  while (!Serial) { }

  for (uint8_t i = 0; i < 4; i++) pinMode(PIN_ULN[i], OUTPUT);
  apagarBobinas();
  recalcularIntervalo();

  Serial.println(F("Prueba del motor a pasos — solo el 28BYJ-48"));
  Serial.println(F("IN1=36  IN2=37  IN3=40  IN4=41  (PORT2)"));
  Serial.print(F("Una vuelta son "));
  Serial.print(PASOS_POR_VUELTA);
  Serial.println(F(" medios pasos."));
  Serial.println(F("Arranca quieto y con las bobinas apagadas."));
  Serial.println(F("Ordenes: bobinas | vuelta | -vuelta | grados n | pasos n"));
  Serial.println(F("         rpm n | vaiven | parar | soltar | sostener"));
  Serial.println(F("\nEmpezá por `bobinas` para verificar el cableado."));
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

  // Barrido de bobinas: una por vez, a mano, sin secuencia.
  if (bobinaActual != 255) {
    if (millis() - ultimaBobina >= 1500) {
      ultimaBobina = millis();
      apagarBobinas();
      digitalWrite(PIN_ULN[bobinaActual], HIGH);
      Serial.print(F("  IN"));
      Serial.print(bobinaActual + 1);
      Serial.print(F("  (pin "));
      Serial.print(PIN_ULN[bobinaActual]);
      Serial.println(F(")"));
      bobinaActual = (bobinaActual + 1) & 3;
    }
    return;
  }

  // El giro no bloquea: un `parar` que llega a mitad de camino se atiende en
  // el momento, y no cuando el giro termina solo.
  if (pasosRestantes > 0) {
    unsigned long ahora = micros();
    if (ahora - ultimoPasoUs >= intervaloUs) {
      ultimoPasoUs = ahora;
      fase = (fase + (sentido > 0 ? 1 : 7)) & 7;
      aplicarFase();
      if (--pasosRestantes == 0) {
        if (vaiven) {
          mover(-sentido * (long)(PASOS_POR_VUELTA / 2));
        } else {
          if (!sostenerBobinas) apagarBobinas();
          Serial.println(F("  listo"));
        }
      }
    }
  }
}
