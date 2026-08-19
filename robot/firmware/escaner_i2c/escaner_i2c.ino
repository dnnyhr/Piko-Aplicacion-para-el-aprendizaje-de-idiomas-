/**
 * Escáner de I2C — responde una sola pregunta.
 *
 * ¿Hay algo colgado del bus, y en qué dirección?
 *
 * Sirve igual en el MegaPi y en un Uno: los pines de I2C los define cada
 * placa, así que el sketch no los lleva escritos. En el Mega son el 20 y el
 * 21; en el Uno, A4 y A5. No mueve ningún motor, se puede correr con todo
 * conectado.
 *
 *   arduino-cli compile --fqbn arduino:avr:mega robot/firmware/escaner_i2c
 *   arduino-cli compile --fqbn arduino:avr:uno  robot/firmware/escaner_i2c
 *
 * Cómo leer el resultado:
 *
 *   0x3C o 0x3D  → la OLED. El bus funciona.
 *   0x27 o 0x3F  → una LCD con plaquita I2C.
 *   nada         → o el módulo no está alimentado, o el cableado está mal, o
 *                  el módulo no responde. Fijate además cuánto **tarda** el
 *                  barrido: milisegundos significa un bus sano y vacío; varios
 *                  segundos significa que algo lo está cargando.
 */

#include <Wire.h>

/**
 * Antes de escanear, medir las dos líneas.
 *
 * El escaneo dice si el bus está trabado, pero no cuál de los dos cables lo
 * traba, y son fallas distintas. Esto lo mide directo: se enciende la
 * resistencia interna de cada pin, que lo tira hacia arriba, y se lee. Si
 * igual queda abajo, hay algo afuera arrastrándolo a masa.
 *
 * Tiene que correr **antes** de `Wire.begin()`, porque a partir de ahí el
 * módulo de I2C se adueña de los dos pines y ya no se pueden leer así.
 */
static void revisarLineas() {
  pinMode(SDA, INPUT_PULLUP);
  pinMode(SCL, INPUT_PULLUP);
  delay(10);
  const bool sda = digitalRead(SDA);
  const bool scl = digitalRead(SCL);

  Serial.print(F("SDA (pin "));
  Serial.print(SDA);
  Serial.print(F("): "));
  Serial.println(sda ? F("alta — libre") : F("BAJA — algo la tiene pegada a masa"));
  Serial.print(F("SCL (pin "));
  Serial.print(SCL);
  Serial.print(F("): "));
  Serial.println(scl ? F("alta — libre") : F("BAJA — algo la tiene pegada a masa"));

  if (sda && scl) {
    Serial.println(F("Las dos lineas estan libres. Si igual no contesta nadie,"));
    Serial.println(F("el modulo no esta alimentado o esta dañado."));
  } else {
    Serial.println(F("Con una linea pegada a masa el bus no puede funcionar."));
    Serial.println(F("Desconecta ese cable y volve a correr esto: si sube,"));
    Serial.println(F("el corto esta en el modulo o en ese cable."));
  }
  Serial.println();
}

/**
 * Destrabar el bus a mano, antes de que `Wire` se adueñe de los pines.
 *
 * Si el micro se reinicia en medio de una transacción — y se reinicia cada vez
 * que se abre el puerto serie — el esclavo queda a mitad de un byte, esperando
 * pulsos de reloj que ya nunca van a llegar, y sostiene el bus. Reiniciar el
 * Arduino no lo arregla: el módulo sigue alimentado y sigue esperando.
 *
 * La maniobra estándar es darle esos pulsos a mano hasta que suelte, y después
 * una condición de parada para dejar el bus en reposo. Son nueve porque un
 * byte son ocho bits más el reconocimiento: con eso cualquier esclavo termina
 * lo que había empezado, sin importar en qué punto quedó.
 */
static void liberarBus() {
  const uint8_t SDA_PIN = SDA, SCL_PIN = SCL;   /* los define la placa */

  pinMode(SDA_PIN, INPUT_PULLUP);
  pinMode(SCL_PIN, INPUT_PULLUP);
  delay(5);

  if (digitalRead(SDA_PIN) == HIGH) {
    Serial.println(F("El bus ya estaba en reposo, no hizo falta destrabarlo."));
    return;
  }

  Serial.println(F("SDA estaba tomada. Mandando pulsos de reloj para soltarla..."));
  pinMode(SCL_PIN, OUTPUT);
  uint8_t usados = 0;
  for (uint8_t i = 0; i < 9; i++) {
    digitalWrite(SCL_PIN, LOW);
    delayMicroseconds(5);
    digitalWrite(SCL_PIN, HIGH);
    delayMicroseconds(5);
    usados++;
    if (digitalRead(SDA_PIN) == HIGH) break;
  }

  // Condición de parada: SDA sube mientras SCL está arriba.
  pinMode(SDA_PIN, OUTPUT);
  digitalWrite(SDA_PIN, LOW);
  delayMicroseconds(5);
  digitalWrite(SCL_PIN, HIGH);
  delayMicroseconds(5);
  digitalWrite(SDA_PIN, HIGH);
  delayMicroseconds(5);

  pinMode(SDA_PIN, INPUT_PULLUP);
  pinMode(SCL_PIN, INPUT_PULLUP);
  delay(5);

  Serial.print(F("  "));
  Serial.print(usados);
  Serial.print(F(" pulsos. SDA quedo "));
  Serial.println(digitalRead(SDA_PIN) ? F("alta — se solto") : F("BAJA — no se solto"));
}

void setup() {
  Serial.begin(115200);
  while (!Serial) { }

  Serial.println(F("\nARRANCA escaner_i2c"));
  revisarLineas();
  liberarBus();

  Wire.begin();
  /* Sin esto, una línea trabada cuelga el escáner para siempre y uno se queda
     sin la respuesta justo cuando más la necesita. */
  Wire.setWireTimeout(25000, true);
  Serial.print(F("Escaner I2C — SDA=pin "));
  Serial.print(SDA);
  Serial.print(F(", SCL=pin "));
  Serial.println(SCL);
}

void loop() {
  uint8_t encontrados = 0;

  Serial.println(F("\nBuscando..."));
  for (uint8_t dir = 1; dir < 127; dir++) {
    Wire.beginTransmission(dir);
    uint8_t resultado = Wire.endTransmission();

    if (resultado == 0) {
      encontrados++;
      Serial.print(F("  dispositivo en 0x"));
      if (dir < 16) Serial.print('0');
      Serial.print(dir, HEX);

      if (dir == 0x3C || dir == 0x3D)      Serial.print(F("  → OLED SSD1306"));
      else if (dir == 0x27 || dir == 0x3F) Serial.print(F("  → plaquita I2C de LCD"));
      Serial.println();
    }
  }

  if (encontrados == 0) {
    Serial.println(F("  nada. O los pines 20/21 no salen en esta placa,"));
    Serial.println(F("  o falta alimentacion, o SDA y SCL estan cruzados."));
  } else {
    Serial.print(F("  total: "));
    Serial.println(encontrados);
  }

  delay(4000);
}
