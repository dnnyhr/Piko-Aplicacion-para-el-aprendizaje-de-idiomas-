/**
 * Que la pantalla del teléfono no se apague.
 *
 * El ajuste de «apagar pantalla» de Android no pasa de unos minutos, y la cara
 * de Piko tiene que quedarse encendida toda la clase. Hay dos formas de pedirlo
 * y acá se usan las dos, en orden:
 *
 *  1. El candado de pantalla (`navigator.wakeLock`). Es la forma correcta y la
 *     que existe para esto. Tiene una condición dura: **sólo funciona en
 *     contexto seguro**, o sea https o localhost. Por el túnel de Cloudflare
 *     está; abriendo la cara por `http://192.168.x.x` en la red local, no.
 *
 *  2. El truco de YouTube: mientras haya un video reproduciéndose, el sistema
 *     no apaga la pantalla. Es un rodeo, pero no pide contexto seguro, así que
 *     es lo único que queda cuando la página se sirve por http pelado.
 *
 * Lo que hace que esto aguante una clase entera y no unos minutos es la parte
 * aburrida: el sistema suelta el candado solo —al pasar a segundo plano, al
 * salir de pantalla completa, al bajar la batería— y no avisa por ningún lado
 * salvo el evento `release`. Un `request()` suelto al arrancar se pierde en el
 * primer descuido y nadie se entera hasta que la pantalla se apagó. Por eso acá
 * se vuelve a pedir ante cada cosa que puede haberlo soltado, y además se
 * revisa cada tanto por si se soltó sin decir nada.
 *
 *   Vigilia.empezar({ respaldo: true, alCambiar(modo) {} })
 *   Vigilia.modo()   →  'candado' | 'video' | 'apagado' | 'imposible'
 *
 * Conviene llamarlo desde un toque del usuario. El candado no lo exige, pero el
 * video sí: ningún navegador de teléfono deja reproducir nada antes del primer
 * gesto.
 */
const Vigilia = (function () {
  /* Cada cuánto revisar que el candado siga puesto. El sistema puede soltarlo
     sin disparar `release` —pasa con algunos ahorros de batería—, así que la
     única forma honesta de saberlo es mirar. */
  const REVISAR_MS = 20000;

  const hayCandado = window.isSecureContext && 'wakeLock' in navigator;

  let candado = null;
  let video = null;
  let reloj = null;
  let pincelada = null;
  let conRespaldo = false;
  let fallosSeguidos = 0;
  /* Arranca en un valor que nunca se anuncia, para que la primera revisión
     avise sí o sí. Empezando en 'apagado', un candado denegado de entrada no
     cambiaba nada y el fallo pasaba callado. */
  let modo = 'inicio';
  let avisarCambio = null;

  function anunciar(nuevo) {
    if (nuevo === modo) return;
    modo = nuevo;
    if (avisarCambio) { try { avisarCambio(modo); } catch { } }
  }

  // ── 1. El candado ──────────────────────────────────────────────────────

  async function pedirCandado() {
    if (!hayCandado) return false;
    if (candado && !candado.released) return true;
    try {
      candado = await navigator.wakeLock.request('screen');
      candado.addEventListener('release', () => {
        candado = null;
        // No anunciar 'apagado' acá: si hay respaldo, sigue sosteniendo, y un
        // aviso que aparece y desaparece cada vez que Android parpadea no le
        // sirve a nadie. La revisión periódica pone el modo real.
        revisar();
      });
      anunciar('candado');
      return true;
    } catch {
      candado = null;
      return false;
    }
  }

  // ── 2. El respaldo de video ────────────────────────────────────────────

  /**
   * Un video de 3×3 píxeles, negro y mudo, reproduciéndose en un rincón.
   *
   * El cuadro sale de un canvas y no de un archivo: así no hay que meter un
   * binario en el repositorio para algo que son nueve píxeles negros.
   *
   * Dos detalles que parecen de más y no lo son. El canvas hay que repintarlo
   * aunque sea del mismo color, porque un canvas que no cambia deja de producir
   * cuadros y el video se queda quieto — y un video quieto no sostiene nada. Y
   * el elemento tiene que estar realmente en pantalla: con `display:none`, con
   * tamaño cero o tapado por otra cosa, el navegador lo considera invisible y
   * no cuenta como reproducción.
   */
  function encenderVideo() {
    if (video) {
      video.play().then(() => anunciar('video')).catch(() => { });
      return;
    }

    const lienzo = document.createElement('canvas');
    lienzo.width = lienzo.height = 3;
    const pincel = lienzo.getContext('2d');
    let tono = 0;
    const pintar = () => {
      // Dos negros que no se distinguen, para que el canvas cuente como
      // cambiado y el stream siga entregando cuadros.
      pincel.fillStyle = (tono ^= 1) ? '#000000' : '#010101';
      pincel.fillRect(0, 0, 3, 3);
    };
    pintar();
    pincelada = setInterval(pintar, 1000);

    video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');   // Safari viejo lee el atributo
    video.setAttribute('aria-hidden', 'true');
    video.tabIndex = -1;
    video.style.cssText = 'position:fixed;left:0;bottom:0;width:3px;height:3px;' +
      'background:#000;pointer-events:none;z-index:2147483647';

    try {
      video.srcObject = lienzo.captureStream(1);
    } catch {
      video = null;
      clearInterval(pincelada);
      pincelada = null;
      return;
    }

    document.body.appendChild(video);
    video.play().then(() => anunciar('video')).catch(() => { });
  }

  // ── El que insiste ─────────────────────────────────────────────────────

  async function revisar() {
    // Con la página oculta no se puede pedir nada, y tampoco hace falta: la
    // pantalla ya está mostrando otra cosa.
    if (document.visibilityState !== 'visible') return;

    if (await pedirCandado()) { fallosSeguidos = 0; return; }

    if (conRespaldo) {
      encenderVideo();
      if (video && !video.paused) { fallosSeguidos = 0; anunciar('video'); return; }
    }

    if (!hayCandado && !conRespaldo) { anunciar('imposible'); return; }

    /* Un fallo suelto no se anuncia. El sistema suelta el candado a cada rato
       —al parpadear la pantalla, al salir de pantalla completa— y lo recupera
       en el intento siguiente; avisar de cada uno sería un cartel que aparece y
       desaparece sin que nadie tenga nada que hacer al respecto. Dos seguidos
       ya son un problema de verdad. */
    if (++fallosSeguidos >= 2) anunciar('apagado');
  }

  function empezar(opciones) {
    const o = opciones || {};
    conRespaldo = !!o.respaldo;
    avisarCambio = o.alCambiar || null;

    /* Todo lo que puede haber soltado el candado sin que nos enteremos. Sale
       más barato pedirlo de más —si ya está puesto, `revisar` no hace nada—
       que descubrir que se soltó cuando la pantalla ya está negra. */
    document.addEventListener('visibilitychange', revisar);
    document.addEventListener('fullscreenchange', revisar);
    window.addEventListener('focus', revisar);
    window.addEventListener('pageshow', revisar);
    document.addEventListener('click', revisar);

    if (!reloj) reloj = setInterval(revisar, REVISAR_MS);
    revisar();
  }

  return { empezar, revisar, modo: () => modo, hayCandado };
})();
