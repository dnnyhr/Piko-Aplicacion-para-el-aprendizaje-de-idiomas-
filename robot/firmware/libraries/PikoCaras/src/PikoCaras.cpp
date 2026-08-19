#include "PikoCaras.h"
#include "dibujos.h"

const Animacion CARAS[CARAS_TOTAL] = {
  ANIM_ESPERA,
  ANIM_IZQUIERDA,
  ANIM_DERECHA,
  ANIM_SONRIENDO,
  ANIM_RIENDO,
  ANIM_ENOJADO,
};

const char* const NOMBRE_CARA[CARAS_TOTAL] = {
  "espera", "izquierda", "derecha", "sonriendo", "riendo", "enojado"
};

// ─────────────────────────────────────────────────────────────────────────
//  Nombres
// ─────────────────────────────────────────────────────────────────────────

struct Alias { const char* nombre; uint8_t cara; };

/* Los siete estados que ya usa la app, resueltos a las seis caras del robot.
   `pensando` cae en `izquierda` porque mirar a un costado es exactamente lo
   que hace alguien buscando una palabra. */
static const Alias ALIAS[] = {
  { "idle",       CARA_ESPERA    },
  { "saludando",  CARA_SONRIENDO },
  { "pensando",   CARA_IZQUIERDA },
  { "alegre",     CARA_SONRIENDO },
  { "animando",   CARA_SONRIENDO },
  { "celebrando", CARA_RIENDO    },
  { "dormido",    CARA_ESPERA    },
};

int caraPorNombre(const char* nombre) {
  for (uint8_t i = 0; i < CARAS_TOTAL; i++)
    if (!strcmp(nombre, NOMBRE_CARA[i])) return i;

  for (uint8_t i = 0; i < sizeof(ALIAS) / sizeof(ALIAS[0]); i++)
    if (!strcmp(nombre, ALIAS[i].nombre)) return ALIAS[i].cara;

  return -1;
}

// ─────────────────────────────────────────────────────────────────────────
//  El dibujo de emergencia
// ─────────────────────────────────────────────────────────────────────────

/* Esto no pretende competir con lo que dibujes en Piskel. Es la red de abajo:
   mientras una expresión no tenga mapa de bits, se dibuja con primitivas para
   que el robot tenga cara igual. Es el mismo trato que hace la app con los
   sprites de Piko en `sprites.ts`.

   Piko es un pájaro, así que la boca es un pico: un triángulo. */

static const int16_t OJO_IZQ_X = 42, OJO_DER_X = 86, OJO_Y = 26, OJO_R = 13;

static void ojosAbiertos(Adafruit_GFX& lienzo, int8_t dx, int8_t dy, uint8_t r) {
  lienzo.drawCircle(OJO_IZQ_X, OJO_Y, OJO_R, BLANCO);
  lienzo.drawCircle(OJO_DER_X, OJO_Y, OJO_R, BLANCO);
  lienzo.fillCircle(OJO_IZQ_X + dx, OJO_Y + dy, r, BLANCO);
  lienzo.fillCircle(OJO_DER_X + dx, OJO_Y + dy, r, BLANCO);
}

/** Ojos cerrados de contento: dos arcos hacia arriba, nunca hacia abajo. */
static void ojosArco(Adafruit_GFX& lienzo) {
  for (int8_t d = -1; d <= 1; d++) {
    lienzo.drawLine(OJO_IZQ_X - 11, OJO_Y + 4 + d, OJO_IZQ_X, OJO_Y - 6 + d, BLANCO);
    lienzo.drawLine(OJO_IZQ_X, OJO_Y - 6 + d, OJO_IZQ_X + 11, OJO_Y + 4 + d, BLANCO);
    lienzo.drawLine(OJO_DER_X - 11, OJO_Y + 4 + d, OJO_DER_X, OJO_Y - 6 + d, BLANCO);
    lienzo.drawLine(OJO_DER_X, OJO_Y - 6 + d, OJO_DER_X + 11, OJO_Y + 4 + d, BLANCO);
  }
}

/** Las cejas son lo único que hace falta para leer enojo. Los ojos casi no
    cambian: es la inclinación hacia el centro la que dice todo. */
static void cejasEnojadas(Adafruit_GFX& lienzo) {
  for (int8_t d = 0; d < 3; d++) {
    lienzo.drawLine(OJO_IZQ_X - 14, OJO_Y - 18 + d, OJO_IZQ_X + 10, OJO_Y - 8 + d, BLANCO);
    lienzo.drawLine(OJO_DER_X + 14, OJO_Y - 18 + d, OJO_DER_X - 10, OJO_Y - 8 + d, BLANCO);
  }
}

static void pico(Adafruit_GFX& lienzo, bool abierto) {
  const int16_t cx = 64, cy = 46;
  if (abierto) lienzo.fillTriangle(cx - 11, cy, cx + 11, cy, cx, cy + 14, BLANCO);
  else         lienzo.fillTriangle(cx - 8,  cy, cx + 8,  cy, cx, cy + 7,  BLANCO);
}

static void destellos(Adafruit_GFX& lienzo) {
  const int16_t xs[] = { 12, 116, 20, 108 };
  const int16_t ys[] = { 12, 12, 52, 52 };
  for (uint8_t i = 0; i < 4; i++) {
    lienzo.drawLine(xs[i] - 4, ys[i], xs[i] + 4, ys[i], BLANCO);
    lienzo.drawLine(xs[i], ys[i] - 4, xs[i], ys[i] + 4, BLANCO);
  }
}

static void dibujarVector(Adafruit_GFX& lienzo, CaraPiko c) {
  switch (c) {
    case CARA_ESPERA:
      ojosAbiertos(lienzo, 0, 0, 5);
      pico(lienzo, false);
      break;

    case CARA_IZQUIERDA:
      // La pupila corrida es todo: el ojo no se mueve, la mirada sí.
      ojosAbiertos(lienzo, -7, 0, 5);
      pico(lienzo, false);
      break;

    case CARA_DERECHA:
      ojosAbiertos(lienzo, 7, 0, 5);
      pico(lienzo, false);
      break;

    case CARA_SONRIENDO:
      ojosArco(lienzo);
      pico(lienzo, false);
      break;

    case CARA_RIENDO:
      ojosArco(lienzo);
      pico(lienzo, true);
      destellos(lienzo);
      break;

    case CARA_ENOJADO:
      ojosAbiertos(lienzo, 0, 2, 6);
      cejasEnojadas(lienzo);
      pico(lienzo, false);
      break;

    default:
      break;
  }
}

// ─────────────────────────────────────────────────────────────────────────

void pintarCaraEn(Adafruit_GFX& lienzo, CaraPiko cara, uint8_t cuadro) {
  if (cara >= CARAS_TOTAL) return;
  const Animacion& a = CARAS[cara];

  if (a.n == 0) {
    dibujarVector(lienzo, cara);
  } else {
    // Filas de 16 bytes con el bit más significativo a la izquierda, que es lo
    // que `drawBitmap` lee de PROGMEM. El conversor ya deja los datos así.
    lienzo.drawBitmap(0, 0, a.cuadros[cuadro % a.n], 128, 64, BLANCO);
  }
}
