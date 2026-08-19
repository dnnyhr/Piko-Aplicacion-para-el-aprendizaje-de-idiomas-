/**
 * Prueba del servo, solo.
 *
 * Nada más encendido: ni pantalla, ni motores, ni LEDs.
 *
 * CABLEADO
 * --------
 *   Naranja o amarillo (señal) → pin 29     (el header de diez)
 *   Rojo (VCC)                 → 5 V
 *   Marrón o negro (GND)       → GND
 *
 * EL CONSUMO
 * ----------
 * Un servo chico tira entre 100 y 250 mA moviéndose, y hasta 700 mA si algo le
 * impide llegar a donde le pediste. Ese caso es el peligroso: no se oye una
 * falla, se oye un zumbido, y mientras tanto está consumiendo el triple y
 * calentándose. Si escuchás que zumba y no se mueve, **quitale la orden en vez
 * de esperar** — está trabado contra un tope.
 *
 * Con todo colgando del USB conviene moverlo de a poco al principio.
 *
 * LOS LÍMITES
 * -----------
 * El rango completo es 0 a 180, pero eso es el rango del servo, no
 * necesariamente el de tu robot: una vez montado, la pieza que mueve puede
 * chocar mucho antes. Por eso está `limites`, para encerrar el recorrido y que
 * ni el barrido ni una orden suelta puedan forzarlo.
 *
 * CÓMO USARLO
 * -----------
 *   arduino-cli compile --fqbn arduino:avr:mega robot/firmware/probar_servo
 *   arduino-cli upload -p COM6 --fqbn arduino:avr:mega robot/firmware/probar_servo
 *
 * Arranca centrado en 90 y quieto.
 *
 *   <numero>            va a ese ángulo
 *   centro              vuelve a 90
 *   mas / menos         cinco grados para un lado o el otro
 *   barrido             va y viene entre los límites
 *   parar               corta el barrido
 *   limites <min> <max> encierra el recorrido
 *   soltar              deja de mandar señal: el servo afloja y deja de zumbar
 */

#include <Servo.h>

const uint8_t PIN_SERVO = 29;

Servo servo;

uint8_t angulo = 90;
uint8_t limMin = 0;
uint8_t limMax = 180;

bool barriendo = false;
int8_t sentido = 1;
unsigned long ultimoPaso = 0;
const unsigned long MS_POR_GRADO = 15;

bool suelto = false;

char linea[32];
uint8_t largo = 0;

// ─────────────────────────────────────────────────────────────────────────

static void ir(int grados) {
  angulo = constrain(grados, limMin, limMax);
  if (suelto) {
    servo.attach(PIN_SERVO);
    suelto = false;
  }
  servo.write(angulo);
  Serial.print(F("\n"));
  Serial.print(angulo);
  Serial.println(F(" grados"));
}

static void ejecutar(char* l) {
  for (char* p = l; *p; p++) *p = tolower(*p);
  char* cmd = strtok(l, " ");
  if (!cmd) return;

  if (!strcmp(cmd, "centro")) { barriendo = false; ir(90); return; }
  if (!strcmp(cmd, "mas"))    { barriendo = false; ir(angulo + 5); return; }
  if (!strcmp(cmd, "menos"))  { barriendo = false; ir(angulo - 5); return; }

  if (!strcmp(cmd, "parar")) {
    barriendo = false;
    Serial.println(F("\nbarrido cortado"));
    return;
  }

  if (!strcmp(cmd, "barrido")) {
    if (suelto) { servo.attach(PIN_SERVO); suelto = false; }
    barriendo = true;
    ultimoPaso = millis();
    Serial.print(F("\nBarriendo entre "));
    Serial.print(limMin);
    Serial.print(F(" y "));
    Serial.println(limMax);
    return;
  }

  if (!strcmp(cmd, "soltar")) {
    /* Soltar de verdad: sin señal el servo deja de sostener la posición, y con
       eso se van el consumo y el zumbido de estar corrigiendo todo el tiempo.
       Es lo que conviene si vas a moverlo con la mano. */
    barriendo = false;
    servo.detach();
    suelto = true;
    Serial.println(F("\nSuelto. Deja de sostener la posicion y de consumir."));
    return;
  }

  if (!strcmp(cmd, "limites")) {
    char* a = strtok(NULL, " ");
    char* b = strtok(NULL, " ");
    long lo = a ? atol(a) : -1;
    long hi = b ? atol(b) : -1;
    if (lo < 0 || hi > 180 || lo >= hi) {
      Serial.println(F("\nUso: limites <min> <max>, entre 0 y 180 y min menor que max."));
      return;
    }
    limMin = (uint8_t)lo;
    limMax = (uint8_t)hi;
    Serial.print(F("\nRecorrido encerrado entre "));
    Serial.print(limMin);
    Serial.print(F(" y "));
    Serial.println(limMax);
    if (angulo < limMin || angulo > limMax) ir(angulo);
    return;
  }

  char* fin;
  long n = strtol(cmd, &fin, 10);
  if (fin != cmd) {
    if (n < 0 || n > 180) { Serial.println(F("\nEl angulo va de 0 a 180.")); return; }
    barriendo = false;
    ir((int)n);
    return;
  }

  Serial.println(F("No entendi. Probá: <numero> | centro | mas | menos"));
  Serial.println(F("                  barrido | parar | limites min max | soltar"));
}

// ─────────────────────────────────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  while (!Serial) { }

  Serial.println(F("\nARRANCA probar_servo"));

  servo.attach(PIN_SERVO);
  servo.write(angulo);

  Serial.print(F("Servo en el pin "));
  Serial.print(PIN_SERVO);
  Serial.println(F(", centrado en 90 y quieto."));
  Serial.println(F("Ordenes: <numero> | centro | mas | menos"));
  Serial.println(F("         barrido | parar | limites min max | soltar"));
  Serial.println(F("\nSi zumba y no se mueve, esta trabado contra un tope: sacale la orden."));
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

  /* El barrido avanza de a un grado, sin bloquear: así una orden de `parar`
     se atiende en el momento y no cuando el recorrido termina solo. */
  if (barriendo && millis() - ultimoPaso >= MS_POR_GRADO) {
    ultimoPaso = millis();
    int siguiente = angulo + sentido;
    if (siguiente >= limMax) { siguiente = limMax; sentido = -1; }
    else if (siguiente <= limMin) { siguiente = limMin; sentido = 1; }
    angulo = siguiente;
    servo.write(angulo);
  }
}
