/**
 * Las expresiones de Piko en una OLED SSD1306 de 128×64.
 *
 * Vive en una librería y no dentro de un sketch para que las caras que dibujes
 * una vez sirvan en los dos lados: en `probar_cara`, que enciende sólo la
 * pantalla, y en `piko_robot`, que enciende todo. Un solo lugar donde pegar
 * los mapas de bits — `dibujos.h`, acá al lado.
 */

#pragma once
#include <Arduino.h>
#include <Adafruit_GFX.h>

/**
 * El blanco vale 1 en los dos controladores que usamos.
 *
 * `SSD1306_WHITE` y `SH110X_WHITE` son ambos 1, así que poniendo el número se
 * evita arrastrar la cabecera de un driver en particular y esta librería queda
 * sirviendo para los dos. Si algún día aparece un tercero con otra convención,
 * éste es el único lugar a tocar.
 */
const uint16_t BLANCO = 1;

/** El orden manda: `CARAS[]` se arma en este mismo orden. */
enum CaraPiko : uint8_t {
  CARA_ESPERA,
  CARA_IZQUIERDA,
  CARA_DERECHA,
  CARA_SONRIENDO,
  CARA_RIENDO,
  CARA_ENOJADO,
  CARAS_TOTAL
};

struct Animacion {
  const uint8_t* const* cuadros;  ///< punteros a los mapas de bits en PROGMEM
  uint8_t  n;                     ///< cuántos cuadros; 0 = usar el vector
  uint16_t ms;                    ///< cuánto dura cada cuadro
};

extern const Animacion CARAS[CARAS_TOTAL];
extern const char* const NOMBRE_CARA[CARAS_TOTAL];

/**
 * Traduce un nombre a expresión, o devuelve −1 si no lo conoce.
 *
 * Acepta también los siete estados de la app (`idle`, `alegre`, `celebrando`…)
 * y los hace caer en la cara más parecida de las seis del robot. Así el día
 * que la app maneje al robot no hay que traducir nada del otro lado, y no se
 * gasta un solo byte de flash en dibujos repetidos.
 */
int caraPorNombre(const char* nombre);

/**
 * Dibuja el cuadro pedido sobre el lienzo.
 *
 * Recibe un `Adafruit_GFX` y no un driver concreto a propósito: así sirve
 * igual para un SSD1306 que para un SH1106, que son los dos controladores que
 * traen estas pantallitas y se confunden todo el tiempo entre sí.
 *
 * No hace `clearDisplay` ni `display` — esos no son de GFX sino de cada
 * driver, y los hace el llamador. Son dos líneas y a cambio esta librería no
 * queda casada con ningún chip.
 */
void pintarCaraEn(Adafruit_GFX& lienzo, CaraPiko cara, uint8_t cuadro);
