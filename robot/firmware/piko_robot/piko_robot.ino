/**
 * Piko — firmware del acompañante de aula (Ruta 2).
 *
 * Un Arduino Mega —en realidad un MegaPi de Makeblock— que mueve el cuerpo y
 * las luces. No decide nada: la inteligencia vive del otro lado del cable USB,
 * en la PC.
 *
 * LA CARA NO ESTÁ ACÁ.
 * --------------------
 * Piko mira desde un teléfono montado en el robot, que muestra animaciones en
 * un navegador. Este firmware no sabe nada de expresiones: sólo gira el motor
 * a pasos que apunta ese teléfono. Toda la parte de OLED, mapas de bits e I2C
 * que había antes desapareció, y con ella la mitad del código.
 *
 * PROTOCOLO
 * ---------
 * Una orden por línea, terminada en \n, en ASCII plano. Se eligió texto y no
 * JSON por dos razones: parsear JSON en 8 KB de RAM es caro, y sobre todo
 * porque así se puede depurar a mano desde el Monitor Serie cuando el panel no
 * está — que es exactamente el momento en que uno necesita depurar.
 *
 *   host → robot
 *     HB                      latido; mantiene vivo al hombre muerto
 *     SV <0..180>             servo: alas, cola y cuerpo
 *     PA <pasos> <rpm>        motor a pasos: gira el teléfono. Relativo, con signo
 *     PARA                    frena todo, ya
 *     LED <i|-1> <r> <g> <b>  un píxel de 0 a 7, o todos con -1
 *     TIRA <0|1|-1> <r> <g> <b>  una tira entera: A, B, o las dos
 *     BRILLO <0..255>         brillo global de las dos tiras
 *     PING                    prueba de vida
 *
 *   robot → host
 *     LISTO <version>         al terminar de arrancar
 *     ARRANCA / PASO ...      marcas de arranque, por si algo se cuelga antes
 *     OK <orden>              la orden se ejecutó
 *     ERR <motivo>            no se entendió, o venía fuera de rango
 *     TEL sv=.. pa=.. hm=..   telemetría periódica
 *
 * EL HOMBRE MUERTO
 * ----------------
 * Si pasan MS_HOMBRE_MUERTO sin recibir una sola línea, el firmware frena los
 * motores por su cuenta. Entre el navegador y este chip hay un WebSocket, un
 * túnel de Cloudflare e internet, y cualquiera de los tres se puede caer justo
 * después de un "girá" y antes del "pará". La parada tiene que vivir acá
 * abajo, donde no depende de nadie.
 */

#include <Servo.h>
#include <Adafruit_NeoPixel.h>

// ═════════════════════════════════════════════════════════════════════════
//  PINES
// ═════════════════════════════════════════════════════════════════════════

/* Estos números no son los de un Arduino Mega pelado: son los del MegaPi de
   Makeblock, donde los pines ya vienen cableados de fábrica a los slots de
   motor. Salen del arreglo `megaPi_slots` de la biblioteca oficial y coinciden
   con el serigrafiado, que va en orden físico:

     PORT1  35  34  33  32  31  18  12  11
     PORT2  36  37  40  41  38  19   8   7
     PORT3  42  43  47  48  49   3   9   6
     PORT4  A5  A4  A3  A2  A1   2   5   4

   Lo que importa para cablear cómodo es la posición, no el número: el 49 y el
   3 son vecinos aunque no se parezcan. Todo está elegido para que cada módulo
   ocupe pines pegados. */

const uint8_t PIN_ULN[4] = { 36, 37, 40, 41 };   // IN1..IN4, primeras 4 de PORT2

/* Tres pines seguidos del header de diez que está debajo del Bluetooth. Con la
   LCD fuera, del 22 al 26 quedan libres, más el 30 y el 39. */
const uint8_t PIN_TIRA_A = 27;
const uint8_t PIN_TIRA_B = 28;
const uint8_t PIN_SERVO  = 29;

// ── El servo, según cómo haya quedado montado ────────────────────────────

/**
 * 1 si el servo quedó al revés: las alas suben cuando deberían bajar.
 *
 * Se arregla acá y no desarmando porque el eje del servo tiene dientes: el
 * brazo sólo entra en unas pocas posiciones, y casi nunca en la que uno
 * necesita. Invertir el ángulo cuesta una resta y no toca el mecanismo.
 */
#define SERVO_INVERTIDO 1

/**
 * Hasta dónde puede moverse, en grados de los que pide el panel.
 *
 * El rango de 0 a 180 es del servo, no del robot: una vez montadas las alas,
 * la pieza choca mucho antes. Un servo trabado contra un tope no falla
 * ruidosamente — sigue empujando, tira hasta 700 mA y se calienta hasta
 * romperse. Achicar estos dos números es lo que lo impide.
 */
const uint8_t SERVO_MIN = 0;
const uint8_t SERVO_MAX = 180;

/**
 * La ventana de pulso, en microsegundos. Esto es lo que decide cuánto gira de
 * tope a tope.
 *
 * La biblioteca de Arduino usa 544 a 2400 por defecto, que es conservador: casi
 * todos estos servos llegan más lejos. Ensanchar la ventana da unos grados
 * extra en cada extremo sin cambiar nada del cableado ni del panel — el ángulo
 * 0 sigue siendo 0, sólo que ahora empuja más.
 *
 * **Hasta acá y no más.** Por debajo de 500 o por encima de 2500 se le está
 * pidiendo al servo que pase su propio tope interno, y ahí no falla
 * ruidosamente: zumba, sigue empujando, tira hasta 700 mA y se calienta hasta
 * romperse. Si en el extremo zumba y no se mueve, achicá estos números.
 */
const uint16_t SERVO_PULSO_MIN = 500;
const uint16_t SERVO_PULSO_MAX = 2500;

/** Traduce lo que pide el panel a lo que hay que escribirle al servo. */
static uint8_t anguloReal(uint8_t pedido) {
  const uint8_t acotado = constrain(pedido, SERVO_MIN, SERVO_MAX);
#if SERVO_INVERTIDO
  return 180 - acotado;
#else
  return acotado;
#endif
}

// ═════════════════════════════════════════════════════════════════════════
//  CONSTANTES
// ═════════════════════════════════════════════════════════════════════════

const char VERSION[] = "piko-robot 2.0";

/* Dos módulos de cuatro. Se manejan como un solo espacio de ocho para que el
   panel no tenga que saber cómo están repartidos: del 0 al 3 la primera tira,
   del 4 al 7 la segunda. Van en pines distintos —y no encadenados— para poder
   refrescar una sin tocar la otra. */
const uint8_t LEDS_POR_TIRA = 4;
const uint8_t LEDS_TOTAL    = LEDS_POR_TIRA * 2;

const unsigned long MS_HOMBRE_MUERTO = 500;
const unsigned long MS_TELEMETRIA    = 250;

/**
 * Cómo se energizan las bobinas. Esto decide cuánta fuerza tiene el motor.
 *
 *   1 = pasos completos. Siempre dos bobinas a la vez, así que da el torque
 *       máximo del motor. 2048 pasos por vuelta.
 *   0 = medios pasos. Alterna una bobina y dos, lo que duplica la resolución
 *       —4096 por vuelta— y suaviza el movimiento, pero en los pasos de una
 *       sola bobina tiene bastante menos fuerza.
 *
 * Está en medios pasos porque así es como quedó funcionando en la placa, con
 * el movimiento más suave — y suavidad importa cuando lo que gira es la cara.
 *
 * El interruptor queda por si algún día el motor zumba sin avanzar con carga:
 * el 28BYJ-48 tiene apenas unos 34 mN·m, y pasar a pasos completos es la única
 * forma de ganarle fuerza sin cambiar de motor. Ojo que también cambia la
 * cuenta —2048 por vuelta en vez de 4096— y hay que ajustar el panel.
 */
#define PASO_COMPLETO 0

#if PASO_COMPLETO
const uint16_t PASOS_POR_VUELTA = 2048;
#else
const uint16_t PASOS_POR_VUELTA = 4096;
#endif

/**
 * Dejar las bobinas energizadas al terminar el giro.
 *
 * En 0 el motor queda suelto: no consume ni se calienta, pero tampoco sostiene
 * la posición. Si el teléfono no está centrado sobre el eje, su propio peso lo
 * va a hacer girar solo — y ahí hay que poner 1, a cambio de unos 250 mA
 * permanentes y de que el motor se ponga tibio.
 *
 * Antes de recurrir a esto conviene equilibrar el montaje: que el centro de
 * masa del teléfono caiga sobre el eje resuelve el problema sin gastar
 * corriente ni calentar nada.
 */
#define SOSTENER_PASOS 0

/* El 28BYJ-48 con su reductora no pasa de unas 15 rpm en el eje de salida.
   Pedirle más no lo hace girar más rápido: lo hace zumbar quieto y perder
   pasos. Y con carga conviene ir más lento todavía — un motor a pasos tiene
   más fuerza cuanto más despacio va. */
const uint16_t RPM_MAX = 15;

// ═════════════════════════════════════════════════════════════════════════

Adafruit_NeoPixel tiraA(LEDS_POR_TIRA, PIN_TIRA_A, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel tiraB(LEDS_POR_TIRA, PIN_TIRA_B, NEO_GRB + NEO_KHZ800);
Servo servo;

uint8_t anguloServo = 90;

long          pasosRestantes  = 0;
int8_t        sentidoPaso     = 1;
unsigned long intervaloPasoUs = 1465;
unsigned long ultimoPasoUs    = 0;
uint8_t       faseULN         = 0;

bool sucioA = false;
bool sucioB = false;

unsigned long ultimoContacto   = 0;
unsigned long ultimaTelemetria = 0;
bool          frenadoPorCorte  = false;

char linea[80];
uint8_t largoLinea = 0;

// ═════════════════════════════════════════════════════════════════════════
//  MOTORES
// ═════════════════════════════════════════════════════════════════════════

static void apagarBobinas() {
  for (uint8_t i = 0; i < 4; i++) digitalWrite(PIN_ULN[i], LOW);
}

/**
 * La secuencia de bobinas. Cada renglón dice cuáles quedan energizadas.
 *
 * En pasos completos son cuatro estados y **los cuatro tienen dos bobinas
 * prendidas**, que es de donde sale el torque. En medios pasos son ocho y se
 * intercalan estados de una sola bobina: más resolución y más suavidad, pero
 * en esos estados la fuerza cae bastante — y con un teléfono colgado del eje,
 * ahí es donde el motor zumba sin llegar a girar.
 */
#if PASO_COMPLETO
const uint8_t SECUENCIA[] = { 0b1100, 0b0110, 0b0011, 0b1001 };
#else
const uint8_t SECUENCIA[] = {
  0b1000, 0b1100, 0b0100, 0b0110,
  0b0010, 0b0011, 0b0001, 0b1001
};
#endif

const uint8_t FASES = sizeof(SECUENCIA);

static void pararTodo() {
  pasosRestantes = 0;
  apagarBobinas();
}

/**
 * El motor a pasos no bloquea.
 *
 * La tentación era usar `Stepper.step()`, que se queda girando hasta terminar
 * — y durante esos segundos el firmware deja de leer el puerto serie. Un
 * "PARA" que llega en medio de un giro largo no se atendería hasta que el giro
 * termine solo, que es justo cuando no sirve.
 */
static void atenderPaso() {
  if (pasosRestantes == 0) return;
  const unsigned long ahora = micros();
  if (ahora - ultimoPasoUs < intervaloPasoUs) return;
  ultimoPasoUs = ahora;

  /* Sumar FASES−1 es restar 1 en módulo FASES. Las dos direcciones usan la
     misma aritmética, así que el motor no puede ser más fuerte hacia un lado
     que hacia el otro: si eso pasa, la causa es mecánica. */
  faseULN = (faseULN + (sentidoPaso > 0 ? 1 : FASES - 1)) % FASES;
  for (uint8_t i = 0; i < 4; i++)
    digitalWrite(PIN_ULN[i], (SECUENCIA[faseULN] >> (3 - i)) & 1);

  if (--pasosRestantes == 0) {
#if !SOSTENER_PASOS
    /* Se sueltan las bobinas: un motor a pasos energizado consume y calienta
       aunque esté quieto. Con SOSTENER_PASOS en 1 se quedan prendidas para
       aguantar el peso del teléfono. */
    apagarBobinas();
#endif
  }
}

// ═════════════════════════════════════════════════════════════════════════
//  LUCES
// ═════════════════════════════════════════════════════════════════════════

/**
 * Las tiras se refrescan sólo cuando cambian, y sólo la que cambió.
 *
 * `show()` apaga las interrupciones mientras escribe: unos 130 µs por tira de
 * cuatro. Si eso cayera en cada vuelta del `loop()`, el servo temblaría y el
 * motor a pasos perdería cuentas. Actualizando sólo al cambiar, el temblor
 * pasa a ser un parpadeo único que nadie ve, y entra holgado en el hueco entre
 * dos pulsos del motor: el 28BYJ-48 a 10 rpm da un medio paso cada 1465 µs.
 *
 * Tenerlas en pines separados en vez de encadenadas es justamente lo que
 * permite tocar una sin pagar el costo de la otra.
 */
static void atenderLeds() {
  if (sucioA) { tiraA.show(); sucioA = false; }
  if (sucioB) { tiraB.show(); sucioB = false; }
}

/**
 * Pintar una tira entera de un saque.
 *
 * Existe además de `LED` porque los efectos del panel cambian módulos
 * completos muchas veces por segundo, y hacerlo de a un píxel serían cuatro
 * órdenes en vez de una — por el túnel, cuatro veces el tráfico y cuatro veces
 * el ruido en la consola.
 *
 *   0 = tira A     1 = tira B     -1 = las dos
 */
static void pintarTira(int8_t cual, uint8_t r, uint8_t g, uint8_t b) {
  if (cual <= 0) {
    for (uint8_t k = 0; k < LEDS_POR_TIRA; k++) tiraA.setPixelColor(k, tiraA.Color(r, g, b));
    sucioA = true;
  }
  if (cual != 0) {
    for (uint8_t k = 0; k < LEDS_POR_TIRA; k++) tiraB.setPixelColor(k, tiraB.Color(r, g, b));
    sucioB = true;
  }
}

static void pintarLed(int16_t i, uint8_t r, uint8_t g, uint8_t b) {
  if (i < 0) {
    for (uint8_t k = 0; k < LEDS_POR_TIRA; k++) {
      tiraA.setPixelColor(k, tiraA.Color(r, g, b));
      tiraB.setPixelColor(k, tiraB.Color(r, g, b));
    }
    sucioA = sucioB = true;
  } else if (i < LEDS_POR_TIRA) {
    tiraA.setPixelColor((uint16_t)i, tiraA.Color(r, g, b));
    sucioA = true;
  } else {
    tiraB.setPixelColor((uint16_t)(i - LEDS_POR_TIRA), tiraB.Color(r, g, b));
    sucioB = true;
  }
}

// ═════════════════════════════════════════════════════════════════════════
//  PROTOCOLO
// ═════════════════════════════════════════════════════════════════════════

static void ok(const char* que)     { Serial.print(F("OK "));  Serial.println(que); }
static void err(const char* motivo) { Serial.print(F("ERR ")); Serial.println(motivo); }

static bool siguienteEntero(long& salida) {
  char* t = strtok(NULL, " ");
  if (!t) return false;
  char* fin;
  const long v = strtol(t, &fin, 10);
  if (fin == t) return false;
  salida = v;
  return true;
}

static void ejecutar(char* l) {
  ultimoContacto = millis();
  frenadoPorCorte = false;

  char* cmd = strtok(l, " ");
  if (!cmd) return;

  // El latido no contesta nada. Va cinco veces por segundo: si respondiera,
  // la consola del panel sería ilegible.
  if (!strcmp(cmd, "HB")) return;

  if (!strcmp(cmd, "PING")) { Serial.println(F("OK PING")); return; }
  if (!strcmp(cmd, "PARA")) { pararTodo(); ok("PARA"); return; }

  if (!strcmp(cmd, "SV")) {
    long a;
    if (!siguienteEntero(a) || a < 0 || a > 180) { err("SV fuera de rango"); return; }
    /* Se guarda lo que pidió el panel, no lo que se le escribió al servo: la
       telemetría tiene que hablar el mismo idioma que la orden, o depurar
       desde el otro lado se vuelve un acertijo. */
    anguloServo = (uint8_t)a;
    servo.write(anguloReal(anguloServo));
    ok("SV");
    return;
  }

  if (!strcmp(cmd, "PA")) {
    long pasos, rpm;
    if (!siguienteEntero(pasos)) { err("PA sin pasos"); return; }
    if (!siguienteEntero(rpm)) rpm = 10;
    if (rpm < 1 || rpm > RPM_MAX) { err("PA rpm fuera de rango"); return; }
    sentidoPaso     = pasos < 0 ? -1 : 1;
    pasosRestantes  = labs(pasos);
    intervaloPasoUs = 60000000UL / ((unsigned long)rpm * PASOS_POR_VUELTA);
    ultimoPasoUs    = micros();
    ok("PA");
    return;
  }

  if (!strcmp(cmd, "LED")) {
    long i, r, g, b;
    if (!siguienteEntero(i) || !siguienteEntero(r) ||
        !siguienteEntero(g) || !siguienteEntero(b)) { err("LED faltan datos"); return; }
    if (i >= LEDS_TOTAL) { err("LED indice"); return; }
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) { err("LED color"); return; }
    pintarLed((int16_t)i, (uint8_t)r, (uint8_t)g, (uint8_t)b);
    ok("LED");
    return;
  }

  if (!strcmp(cmd, "TIRA")) {
    long t, r, g, b;
    if (!siguienteEntero(t) || !siguienteEntero(r) ||
        !siguienteEntero(g) || !siguienteEntero(b)) { err("TIRA faltan datos"); return; }
    if (t < -1 || t > 1) { err("TIRA indice"); return; }
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) { err("TIRA color"); return; }
    pintarTira((int8_t)t, (uint8_t)r, (uint8_t)g, (uint8_t)b);
    ok("TIRA");
    return;
  }

  if (!strcmp(cmd, "BRILLO")) {
    long v;
    if (!siguienteEntero(v) || v < 0 || v > 255) { err("BRILLO fuera de rango"); return; }
    tiraA.setBrightness((uint8_t)v);
    tiraB.setBrightness((uint8_t)v);
    sucioA = sucioB = true;
    ok("BRILLO");
    return;
  }

  err("orden desconocida");
}

static void leerSerie() {
  while (Serial.available()) {
    const char c = Serial.read();
    if (c == '\r') continue;
    if (c == '\n') {
      linea[largoLinea] = 0;
      if (largoLinea) ejecutar(linea);
      largoLinea = 0;
      continue;
    }
    if (largoLinea < sizeof(linea) - 1) linea[largoLinea++] = c;
    else { largoLinea = 0; err("linea muy larga"); }
  }
}

static void telemetria() {
  Serial.print(F("TEL sv="));  Serial.print(anguloServo);
  Serial.print(F(" pa="));     Serial.print(pasosRestantes);
  Serial.print(F(" hm="));     Serial.println(frenadoPorCorte ? 1 : 0);
}

// ═════════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);

  /* El saludo va primero, antes de tocar un solo periférico. Si un módulo mal
     cableado cuelga la inicialización, sin esto la placa queda muda y desde
     afuera parece que el firmware nunca entró. Las marcas `PASO` dicen hasta
     dónde llegó: la última que se ve es la que falló. */
  Serial.println();
  Serial.print(F("ARRANCA "));
  Serial.println(VERSION);

  Serial.println(F("PASO pasos"));
  for (uint8_t i = 0; i < 4; i++) pinMode(PIN_ULN[i], OUTPUT);
  apagarBobinas();

  Serial.println(F("PASO servo"));
  servo.attach(PIN_SERVO, SERVO_PULSO_MIN, SERVO_PULSO_MAX);
  servo.write(anguloReal(anguloServo));

  Serial.println(F("PASO leds"));
  tiraA.begin();
  tiraB.begin();
  tiraA.setBrightness(60);
  tiraB.setBrightness(60);
  tiraA.clear();
  tiraB.clear();
  tiraA.show();
  tiraB.show();

  ultimoContacto = millis();
  Serial.print(F("LISTO "));
  Serial.println(VERSION);
}

void loop() {
  leerSerie();
  atenderPaso();
  atenderLeds();

  const unsigned long ahora = millis();

  // El hombre muerto. Sólo actúa una vez por corte, para no inundar el puerto
  // con avisos mientras el cable siga desconectado.
  if (!frenadoPorCorte && ahora - ultimoContacto > MS_HOMBRE_MUERTO) {
    if (pasosRestantes != 0) {
      pararTodo();
      Serial.println(F("ERR hombre muerto: se corto el contacto, freno todo"));
    }
    frenadoPorCorte = true;
  }

  if (ahora - ultimaTelemetria >= MS_TELEMETRIA) {
    ultimaTelemetria = ahora;
    telemetria();
  }
}
