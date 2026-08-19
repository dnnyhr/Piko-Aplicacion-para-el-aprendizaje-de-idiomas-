/**
 * Un voltímetro, usando la placa que ya tenés conectada.
 *
 * Sirve para contestar «¿le está llegando corriente a este módulo?» sin
 * multímetro. El ATmega tiene entradas analógicas: se le acerca el punto que
 * uno quiere medir y lo lee.
 *
 * CÓMO SE USA
 * -----------
 *   1. Un cable desde el punto a medir hasta el pin **A9**, en la fila de
 *      headers del borde derecho.
 *   2. La tierra ya es común, así que no hace falta un segundo cable.
 *   3. Se lee el valor por el monitor serie.
 *
 * Para revisar la alimentación de la OLED: pinchá A9 **en el mismo punto donde
 * termina el cable de VCC del módulo**, del lado del módulo y no del lado de la
 * placa. Ahí está la diferencia entre «el pin da 5 V» y «al módulo le llegan
 * 5 V», que es justo lo que un cable flojo separa.
 *
 * ATENCIÓN
 * --------
 * Sólo puntos de hasta 5 V. Nunca a un pin `V+` con el jack de corriente
 * enchufado: son de 6 a 12 V y eso destruye la entrada del micro. Con el jack
 * vacío no hay riesgo, porque todo en la placa queda en 5 V o menos.
 */

const uint8_t PIN_MEDIDA = A9;

/* La referencia del conversor es la propia alimentación de la placa. Si el
   Mega anda por USB eso ronda los 5 V, pero puede estar un poco abajo por la
   caída del cable — así que una lectura de «5,0» en realidad significa «lo
   mismo que la alimentación de la placa», y eso es exactamente lo que interesa
   saber acá. */
const float REFERENCIA = 5.0;

unsigned long ultima = 0;

void setup() {
  Serial.begin(115200);
  while (!Serial) { }
  Serial.println(F("Voltimetro — conecta el punto a medir al pin A9"));
  Serial.println(F("Solo hasta 5 V. Nunca a un pin V+ con el jack enchufado."));
  Serial.println();
}

void loop() {
  if (millis() - ultima < 500) return;
  ultima = millis();

  /* Dos lecturas: la primera después de cambiar de canal arrastra el valor
     anterior del condensador de muestreo, y da un número que no es. */
  analogRead(PIN_MEDIDA);
  delay(5);
  const int crudo = analogRead(PIN_MEDIDA);
  const float voltios = (crudo * REFERENCIA) / 1023.0;

  Serial.print(voltios, 2);
  Serial.print(F(" V   (lectura "));
  Serial.print(crudo);
  Serial.print(F(")   "));

  if (voltios < 0.3)      Serial.println(F("nada — ese punto esta muerto"));
  else if (voltios < 2.5) Serial.println(F("muy bajo — no alcanza para alimentar un modulo"));
  else if (voltios < 4.4) Serial.println(F("bajo — hay una caida, revisa el cable"));
  else                    Serial.println(F("bien, hay 5 V"));
}
