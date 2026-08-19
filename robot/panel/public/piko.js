/**
 * Piko animado, en un solo dibujo con estados.
 *
 * Las ocho caras del diseño comparten casi todo: el fondo, el cielo, las
 * franjas del atardecer y los contornos de los ojos son idénticos byte a byte
 * en casi todos los archivos. Lo que cambia es poco, y cambia de dos maneras
 * distintas — y esa diferencia manda cómo se anima cada cosa:
 *
 *   Se DESPLAZAN. Las pupilas y sus brillos son el mismo trazado movido de
 *   lugar. Eso se puede animar de verdad: la pupila viaja de donde está a
 *   donde va, que es lo que el ojo lee como que Piko giró la mirada.
 *
 *   Son OTRO TRAZADO. El ojo cerrado, la ceja del guiño, las estrellas de la
 *   celebración, la boca de mirar arriba: no son la misma figura corrida, son
 *   figuras distintas. Ésas cambian de golpe, como cuadros.
 *
 * Por eso esto no muestra ocho archivos sino uno con piezas encendidas y
 * apagadas. Y hace que las combinaciones salgan gratis: ocho expresiones son
 * cincuenta y seis transiciones entre pares, y con archivos habría que
 * dibujar las cincuenta y seis.
 *
 * Los colores son los del diseño, sin tocar. Los trazados están copiados tal
 * cual de los archivos originales.
 */

(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  //  Los estados
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Qué pieza se enciende y cuánto se desplaza cada cosa en cada expresión.
   *
   * Los desplazamientos salen de restar coordenadas entre los archivos. Los
   * brillos se mueven menos que las pupilas —14,9 contra 24,2 hacia la
   * izquierda— porque en el dibujo original quedan más pegados al borde del
   * ojo. Se respeta esa diferencia en vez de promediarla: es lo que hace que
   * la mirada se vea redonda y no plana.
   */
  const ESTADOS = {
    enfrente: {
      pupila: [0, 0], brillo: [0, 0], brilloVar: 'normal',
      blanco: 'normal', ojosVisibles: true,
      tapaIzq: 'normal', tapaDer: 'normal', cejaIzq: 'normal', cejaDer: 'normal',
      cuerpo: 0, boca: 'normal', bocaY: 0, plato: 'normal',
      chispas: false, pataIzq: true, pataDer: true,
    },
    izquierda: {
      pupila: [-24.236, 0.911], brillo: [-14.881, 0.911], brilloVar: 'normal',
      blanco: 'normal', ojosVisibles: true,
      tapaIzq: 'normal', tapaDer: 'normal', cejaIzq: 'normal', cejaDer: 'normal',
      cuerpo: 15, boca: 'normal', bocaY: 21, plato: 'normal',
      chispas: false, pataIzq: true, pataDer: true,
    },
    derecha: {
      pupila: [25.764, 0], brillo: [25.764, 0], brilloVar: 'normal',
      blanco: 'normal', ojosVisibles: true,
      tapaIzq: 'normal', tapaDer: 'normal', cejaIzq: 'normal', cejaDer: 'normal',
      cuerpo: 15, boca: 'normal', bocaY: 24, plato: 'normal',
      chispas: false, pataIzq: true, pataDer: true,
    },
    arriba: {
      pupila: [0, -26.089], brillo: [0, -26.089], brilloVar: 'normal',
      blanco: 'normal', ojosVisibles: true,
      tapaIzq: 'arriba', tapaDer: 'arriba', cejaIzq: 'normal', cejaDer: 'normal',
      cuerpo: 0, boca: 'arriba', bocaY: 0, plato: 'normal',
      chispas: false, pataIzq: false, pataDer: false,
    },
    guino: {
      pupila: [0, 0], brillo: [0, 0], brilloVar: 'normal',
      blanco: 'normal', ojosVisibles: true,
      tapaIzq: 'guino', tapaDer: 'cerradoDer', cejaIzq: 'normal', cejaDer: 'guino',
      cuerpo: 0, boca: 'normal', bocaY: 0, plato: 'normal',
      chispas: false, pataIzq: true, pataDer: false,
    },
    abierta: {
      pupila: [0, 0], brillo: [0, 0], brilloVar: 'normal',
      blanco: 'normal', ojosVisibles: true,
      tapaIzq: 'normal', tapaDer: 'normal', cejaIzq: 'normal', cejaDer: 'normal',
      cuerpo: 19, boca: 'normal', bocaY: 19, plato: 'abierta',
      chispas: false, pataIzq: true, pataDer: true,
    },
    /* El ojo cerrado del diseño no tapa nada: cambia el blanco del ojo por
       piel, saca pupila y reflejo, y pone otra ceja. Por eso no había forma de
       sintetizarlo a partir del guiño — no es un párpado que baja. */
    cerrados: {
      pupila: [0, 0], brillo: [0, 0], brilloVar: 'normal',
      blanco: 'cerrado', ojosVisibles: false,
      tapaIzq: 'normal', tapaDer: 'normal', cejaIzq: 'cerrado', cejaDer: 'cerrado',
      cuerpo: 0, boca: 'normal', bocaY: 0, plato: 'normal',
      chispas: false, pataIzq: true, pataDer: true,
    },
    celebracion: {
      pupila: [0, 0], brillo: [0, 0], brilloVar: 'estrella',
      blanco: 'normal', ojosVisibles: true,
      tapaIzq: 'normal', tapaDer: 'normal', cejaIzq: 'normal', cejaDer: 'normal',
      cuerpo: 30, boca: 'celebra', bocaY: 0, plato: 'celebra',
      chispas: true, pataIzq: true, pataDer: true,
    },
  };

  /** Lo que el parpadeo pisa mientras dura, sin tocar el resto de la cara. */
  const OJOS_CERRADOS = {
    blanco: 'cerrado', ojosVisibles: false,
    tapaIzq: 'normal', tapaDer: 'normal', cejaIzq: 'cerrado', cejaDer: 'cerrado',
  };

  /**
   * Los nombres de archivo traen mayúsculas, tildes y espacios: «Vista
   * enfrente», «guiño», «ojos cerrados». Se normalizan para que el panel pueda
   * llamarlos como salgan y esto los entienda igual.
   */
  const ALIAS = {
    'vista enfrente': 'enfrente', 'enfrente': 'enfrente', 'frente': 'enfrente',
    'idle': 'enfrente', 'espera': 'enfrente', 'neutro': 'enfrente',
    'izquierda': 'izquierda',
    'derecha': 'derecha',
    'viendo arriba': 'arriba', 'arriba': 'arriba', 'pensando': 'arriba',
    'guino': 'guino', 'guiño': 'guino',
    'boca abierta': 'abierta', 'abierta': 'abierta', 'hablando': 'abierta',
    'ojos cerrados': 'cerrados', 'cerrados': 'cerrados', 'dormido': 'cerrados',
    'celebracion': 'celebracion', 'celebración': 'celebracion',
    'celebrando': 'celebracion', 'alegre': 'celebracion',
  };

  function resolver(nombre) {
    const limpio = String(nombre)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return ALIAS[limpio] || null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  El dibujo
  // ═══════════════════════════════════════════════════════════════════════

  /* Todo lo que sigue está copiado tal cual de los ocho archivos. Lo único
     agregado son los grupos con identificador alrededor de lo que se mueve o
     se enciende. Ningún color fue tocado. */
  const DIBUJO = `
<!-- El fill="none" del original no es decorativo: varios trazados llevan sólo
     stroke y ningún fill —las cejas, los detalles de la pechera— y heredan de
     acá el "sin relleno". Si falta, el navegador les pone negro por defecto y
     los contornos de los ojos salen negros en vez del olivo del diseño. -->
<svg id="piko" viewBox="0 0 647 302" fill="none" xmlns="http://www.w3.org/2000/svg"
     preserveAspectRatio="xMidYMid meet" role="img" aria-label="La cara de Piko">
<defs><clipPath id="pikoClip"><rect width="647" height="302" fill="white"/></clipPath></defs>
<rect width="647" height="302" fill="#1E1E1E"/>
<g clip-path="url(#pikoClip)">
<rect width="647" height="302" fill="white"/>
<rect y="-1" width="647" height="303" fill="#659327"/>
<ellipse cx="319" cy="-202.5" rx="397" ry="382.5" fill="#588EA9"/>
<path d="M543.958 -28.2193C706.497 -49.8385 638.754 -1.72482 595.33 45.2404C380.979 57.5226 259.252 58.9639 37.578 45.2404C14.0208 2.92921 -53.8782 -38.658 84.0573 -28.2193C87.9848 -50.9635 134.772 -47.0827 221.049 -39.1022C306.295 -62.3012 332.518 -55.2269 390.97 -39.4579L392.289 -39.1022C525.745 -53.923 538.711 -46.3393 543.958 -28.2193Z" fill="#ED4B14" stroke="#ED4B14"/>
<path d="M507.973 40.5895C648.404 30.8707 589.875 52.4999 552.358 73.6126C367.161 79.134 261.991 79.7819 70.4669 73.6126C50.1138 54.592 -8.55013 35.8968 110.624 40.5895C114.018 30.365 154.441 32.1096 228.984 35.6972C302.635 25.2683 325.292 28.4485 375.794 35.5373L376.933 35.6972C492.237 29.0346 503.44 32.4438 507.973 40.5895Z" fill="#EE690E" stroke="#EE690E"/>
<path d="M488.051 61.2451C614.163 50.138 561.602 74.857 527.91 98.9859C361.597 105.296 267.151 106.037 95.1563 98.9859C76.8786 77.248 24.1965 55.8821 131.219 61.2451C134.266 49.56 170.568 51.5538 237.509 55.6539C303.651 43.7351 323.997 47.3697 369.35 55.4712L370.373 55.6539C473.92 48.0395 483.98 51.9358 488.051 61.2451Z" fill="#E97927" stroke="#E97927"/>

<g id="blancoIzq">
  <circle class="v normal act" cx="154.5" cy="130.5" r="77.5" fill="white"/>
  <circle class="v cerrado" cx="154.5" cy="130.5" r="77.5" fill="#E7BB52"/>
</g>
<g id="pupIzq"><path d="M147.269 89.0896C167.372 89.0896 183.802 108.327 183.802 132.236C183.802 156.145 167.372 175.383 147.269 175.383C127.166 175.382 110.736 156.145 110.736 132.236C110.736 108.327 127.166 89.0897 147.269 89.0896Z" fill="#58302E" stroke="#58302E"/></g>
<g id="briIzq">
  <circle class="v normal act" cx="128.752" cy="111.872" r="15.3714" fill="white" stroke="white"/>
  <path class="v estrella" d="M128.5 89.2021C130.669 100.667 139.704 109.702 151.169 111.872C139.704 114.042 130.67 123.076 128.5 134.541C126.33 123.076 117.295 114.041 105.83 111.872C117.296 109.703 126.331 100.668 128.5 89.2021Z" fill="white" stroke="white"/>
</g>
<g id="tapaIzq">
  <path class="v normal act" d="M64.5826 58.7493C88.0187 37.2029 123.836 20.7862 170.385 32.2776L171.487 32.555L171.572 32.5765L171.645 32.6263C203.135 54.1172 222.812 72.0784 233.579 92.139C244.356 112.22 246.17 134.336 242.102 164.046L242.091 164.123L242.058 164.194C221.41 207.398 180.091 224.689 138.464 216.547C96.8519 208.408 54.9766 174.872 33.0553 116.54L33.0524 116.532C32.2189 114.193 32.346 110.75 33.3111 106.632C34.2811 102.495 36.1153 97.6033 38.7789 92.3235C44.1069 81.7625 52.7773 69.6029 64.5826 58.7493ZM184.27 93.3118C173.656 80.5522 159.58 74.5291 145.779 74.8636C118.128 75.5339 91.8625 101.657 96.5113 149.478L96.5152 149.519L96.526 149.559C99.2117 159.63 106.338 167.906 115.672 173.885C125.008 179.864 136.582 183.567 148.232 184.482C171.51 186.31 195.298 177 202 152.205L202.016 152.141V152.074C202.016 125.535 194.882 106.069 184.27 93.3118Z" fill="#E7BB52"/>
  <path class="v guino" d="M64.5829 58.7488C88.0189 37.2024 123.836 20.7857 170.386 32.2771L171.487 32.5545L171.572 32.576L171.645 32.6258C203.135 54.1166 222.812 72.078 233.579 92.1385C244.356 112.219 246.17 134.335 242.102 164.046L242.092 164.123L242.058 164.193C221.411 207.397 180.091 224.689 138.465 216.547C96.8521 208.407 54.9768 174.872 33.0555 116.54L33.0526 116.531C32.2192 114.192 32.3462 110.749 33.3114 106.632C34.2813 102.494 36.1155 97.6029 38.7792 92.323C44.1072 81.7619 52.7774 69.6025 64.5829 58.7488ZM184.569 91.4676C173.853 79.9743 159.656 74.5606 145.752 74.8611C131.849 75.1618 118.236 81.1756 108.69 92.5281C99.1407 103.885 93.6911 120.549 96.0389 142.096L96.0438 142.141L96.0565 142.185C98.7746 151.279 105.98 158.735 115.393 164.114C124.811 169.495 136.483 172.825 148.229 173.648C171.678 175.292 195.698 166.935 202.473 144.568L202.495 144.498V144.424C202.495 120.507 195.287 102.963 184.569 91.4676Z" fill="#E7BB52"/>
  <path class="v arriba" d="M64.0832 59.2491C87.5193 37.7026 123.336 21.2859 169.886 32.7774L170.987 33.0548L171.072 33.0763L171.146 33.1261C202.636 54.617 222.313 72.5782 233.079 92.6388C243.857 112.72 245.671 134.836 241.603 164.546L241.592 164.623L241.559 164.693C220.911 207.898 179.591 225.189 137.965 217.047C96.3523 208.908 54.4772 175.372 32.5558 117.04L32.5529 117.031C31.7194 114.693 31.8464 111.25 32.8117 107.132C33.7816 102.994 35.6158 98.1033 38.2794 92.8233C43.6075 82.2622 52.2776 70.1028 64.0832 59.2491ZM183.77 93.8116C173.156 81.0523 159.08 75.0289 145.278 75.3634C117.628 76.034 91.3623 102.157 96.0109 149.978L96.1105 151.001L96.8537 150.291C101.234 146.109 109.564 143.287 119.798 141.661C130.002 140.04 141.993 139.623 153.591 140.17C165.19 140.717 176.373 142.228 184.959 144.449C189.254 145.56 192.88 146.845 195.579 148.265C198.301 149.697 199.982 151.218 200.547 152.748L201.516 152.574C201.516 126.035 194.382 106.569 183.77 93.8116Z" fill="#E7BB52"/>
</g>
<g id="cejaIzq">
  <g class="v normal act">
    <path d="M98.603 154.045C100.123 156.882 101.841 159.754 103.767 162.656C101.66 159.994 99.9136 157.118 98.603 154.045C48.8516 61.2056 210.481 5.7667 201.517 152.075C201.517 46.2652 87.7525 54.201 97.01 149.429C97.4323 151.013 97.9662 152.552 98.603 154.045Z" fill="#816825"/>
    <path d="M201.517 152.075C210.755 1.29621 38.815 64.7819 103.767 162.656C100.637 158.701 98.3013 154.272 97.01 149.429C87.7525 54.201 201.517 46.2652 201.517 152.075Z" stroke="#816825"/>
  </g>
  <g class="v cerrado">
    <path d="M80.5769 143.492C82.4231 144.56 84.5089 145.641 86.8477 146.733C84.2895 145.731 82.1685 144.649 80.5769 143.492C20.1554 108.551 216.449 87.6854 205.562 142.751C205.562 102.928 67.3993 105.914 78.6422 141.755C79.155 142.351 79.8034 142.931 80.5769 143.492Z" fill="#816825"/>
    <path d="M205.562 142.751C216.782 86.0029 7.96634 109.897 86.8477 146.733C83.0465 145.245 80.2104 143.578 78.6422 141.755C67.3993 105.914 205.562 102.928 205.562 142.751Z" stroke="#816825"/>
  </g>
</g>

<g id="blancoDer">
  <circle class="v normal act" cx="77.5" cy="77.5" r="77.5" transform="matrix(-1 0 0 1 571.1 52.5)" fill="white"/>
  <circle class="v cerrado" cx="77.5" cy="77.5" r="77.5" transform="matrix(-1 0 0 1 571.1 52.5)" fill="#E7BB52"/>
</g>
<g id="pupDer"><path d="M500.831 88.5892C480.728 88.5892 464.297 107.826 464.297 131.736C464.297 155.645 480.728 174.882 500.831 174.882C520.933 174.882 537.364 155.645 537.364 131.736C537.364 107.826 520.933 88.5893 500.831 88.5892Z" fill="#58302E" stroke="#58302E"/></g>
<g id="briDer">
  <circle class="v normal act" cx="15.8714" cy="15.8714" r="15.3714" transform="matrix(-1 0 0 1 495.743 96)" fill="white" stroke="white"/>
  <path class="v estrella" d="M479.5 89.2015C477.331 100.667 468.296 109.702 456.831 111.871C468.296 114.041 477.33 123.075 479.5 134.54C481.67 123.075 490.705 114.041 502.17 111.871C490.704 109.702 481.669 100.667 479.5 89.2015Z" fill="white" stroke="white"/>
</g>
<g id="tapaDer">
  <path class="v normal act" d="M583.517 58.2491C560.081 36.7026 524.264 20.286 477.714 31.7774L476.613 32.0547L476.528 32.0762L476.454 32.126C444.964 53.6168 425.288 71.5783 414.521 91.6387C403.743 111.72 401.93 133.836 405.997 163.546L406.008 163.623L406.041 163.693C426.689 206.898 468.009 224.189 509.635 216.047C551.248 207.908 593.123 174.372 615.044 116.04L615.047 116.031C615.881 113.693 615.754 110.249 614.788 106.132C613.819 101.994 611.984 97.1032 609.321 91.8233C603.993 81.2622 595.322 69.1027 583.517 58.2491ZM463.829 92.8116C474.443 80.0521 488.519 74.0289 502.321 74.3633C529.971 75.0336 556.237 101.157 551.588 148.978L551.584 149.019L551.574 149.059C548.888 159.129 541.762 167.406 532.427 173.385C523.092 179.364 511.518 183.066 499.868 183.981C476.59 185.81 452.801 176.5 446.1 151.705L446.083 151.641V151.574C446.084 125.035 453.217 105.569 463.829 92.8116Z" fill="#E7BB52"/>
  <path class="v cerradoDer" d="M583.516 58.2494C560.08 36.7029 524.263 20.2861 477.713 31.7777L476.612 32.055L476.527 32.0765L476.454 32.1263C444.964 53.6171 425.287 71.5785 414.52 91.639C403.743 111.72 401.929 133.836 405.997 163.546L406.007 163.623L406.041 163.694C426.688 206.898 468.008 224.189 509.634 216.047C551.247 207.908 593.122 174.372 615.044 116.04L615.046 116.032C615.88 113.693 615.753 110.25 614.788 106.132C613.818 101.995 611.984 97.1035 609.32 91.8236C603.992 81.2625 595.322 69.103 583.516 58.2494ZM500.193 109.5C506.954 109.512 513.582 109.756 518.24 110.217C520.559 110.447 522.426 110.734 523.579 111.084C523.869 111.173 524.129 111.269 524.343 111.376C524.551 111.48 524.755 111.61 524.9 111.785C525.059 111.976 525.158 112.24 525.079 112.535C525.009 112.792 524.824 112.982 524.644 113.119L524.568 113.178L524.475 113.204C523.771 113.4 522.531 113.569 520.928 113.717C519.312 113.866 517.288 113.996 514.992 114.105C510.399 114.323 504.702 114.459 498.967 114.493C493.232 114.526 487.452 114.457 482.695 114.268C477.963 114.079 474.176 113.77 472.473 113.302L472.106 113.201V112.82C472.106 112.535 472.238 112.301 472.403 112.125C472.564 111.954 472.777 111.814 473.009 111.695C473.475 111.456 474.125 111.25 474.903 111.069C476.468 110.703 478.679 110.407 481.29 110.174C486.518 109.708 493.431 109.488 500.193 109.5Z" fill="#E7BB52"/>
  <path class="v arriba" d="M583.517 58.2487C560.081 36.7023 524.264 20.2855 477.714 31.777L476.613 32.0543L476.528 32.0758L476.454 32.1256C444.964 53.6164 425.287 71.5779 414.521 91.6383C403.743 111.719 401.929 133.835 405.997 163.546L406.008 163.623L406.041 163.693C426.689 206.897 468.009 224.188 509.635 216.047C551.248 207.907 593.123 174.372 615.044 116.04L615.047 116.031C615.88 113.692 615.754 110.249 614.788 106.131C613.818 101.994 611.984 97.1026 609.321 91.8229C603.992 81.2618 595.322 69.1022 583.517 58.2487ZM463.83 92.8121C474.444 80.0525 488.52 74.0294 502.322 74.3639C529.972 75.0345 556.238 101.157 551.589 148.978L551.49 150.002L550.746 149.292C546.366 145.11 538.036 142.288 527.802 140.662C517.598 139.041 505.607 138.624 494.009 139.171C482.41 139.718 471.227 141.228 462.641 143.45C458.346 144.561 454.72 145.845 452.021 147.265C449.299 148.697 447.618 150.218 447.053 151.749L446.084 151.575C446.084 125.035 453.218 105.57 463.83 92.8121Z" fill="#E7BB52"/>
</g>
<g id="cejaDer">
  <g class="v normal act">
    <path d="M549.497 153.546C547.977 156.382 546.259 159.254 544.333 162.156C546.44 159.494 548.186 156.618 549.497 153.546C599.248 60.7059 437.618 5.26694 446.583 151.575C446.583 45.7655 560.347 53.7012 551.09 148.93C550.668 150.513 550.134 152.053 549.497 153.546Z" fill="#816825"/>
    <path d="M446.583 151.575C437.344 0.796452 609.285 64.2821 544.333 162.156C547.463 158.201 549.799 153.772 551.09 148.93C560.347 53.7012 446.583 45.7655 446.583 151.575Z" stroke="#816825"/>
  </g>
  <g class="v guino">
    <path d="M566.17 157.289C564.283 158.841 562.151 160.412 559.761 162C562.376 160.544 564.543 158.97 566.17 157.289C627.914 106.499 427.322 76.1699 438.447 156.211C438.447 98.3257 579.636 102.667 568.147 154.764C567.623 155.631 566.96 156.473 566.17 157.289Z" fill="#816825"/>
    <path d="M438.447 156.211C426.982 73.7242 640.37 108.456 559.761 162C563.646 159.836 566.544 157.413 568.147 154.764C579.636 102.667 438.447 98.3257 438.447 156.211Z" stroke="#816825"/>
  </g>
  <g class="v cerrado">
    <path d="M566.423 143.492C564.577 144.56 562.491 145.641 560.152 146.733C562.71 145.731 564.831 144.649 566.423 143.492C626.845 108.551 430.551 87.6854 441.438 142.751C441.438 102.928 579.601 105.914 568.358 141.755C567.845 142.351 567.197 142.931 566.423 143.492Z" fill="#816825"/>
    <path d="M441.438 142.751C430.218 86.0029 639.034 109.897 560.152 146.733C563.954 145.245 566.79 143.578 568.358 141.755C579.601 105.914 441.438 102.928 441.438 142.751Z" stroke="#816825"/>
  </g>
</g>

<g id="chispas">
  <path d="M73 -2.66992C75.1692 8.79537 84.2037 17.8304 95.6689 20C84.204 22.1695 75.1695 31.204 73 42.6689C70.8304 31.2037 61.7954 22.1692 50.3301 20C61.7957 17.8307 70.8307 8.79567 73 -2.66992Z" fill="#FFA300" stroke="#FFA300"/>
  <path d="M612 180.33C614.169 191.795 623.204 200.83 634.669 203C623.204 205.17 614.17 214.204 612 225.669C609.83 214.204 600.795 205.169 589.33 203C600.796 200.831 609.831 191.796 612 180.33Z" fill="#FFA300" stroke="#FFA300"/>
  <path d="M94 219.623C95.7887 227.786 102.214 234.211 110.376 236C102.214 237.789 95.789 244.214 94 252.376C92.2109 244.214 85.7856 237.789 77.623 236C85.7859 234.211 92.2112 227.786 94 219.623Z" fill="#FFA300" stroke="#FFA300"/>
  <path d="M626 59.623C627.789 67.7856 634.214 74.2109 642.376 76C634.214 77.789 627.789 84.2138 626 92.376C624.211 84.2135 617.786 77.7887 609.623 76C617.786 74.2112 624.211 67.7859 626 59.623Z" fill="#FFA300" stroke="#FFA300"/>
  <path d="M43 82.6172C45.8579 101.343 60.6559 116.142 79.3818 119C60.6562 121.858 45.8583 136.656 43 155.382C40.1417 136.656 25.3431 121.858 6.61719 119C25.3434 116.142 40.142 101.343 43 82.6172Z" fill="#FFA300" stroke="#FFA300"/>
  <path d="M541 224.617C543.858 243.343 558.656 258.142 577.382 261C558.656 263.858 543.858 278.656 541 297.382C538.142 278.656 523.343 263.858 504.617 261C523.343 258.142 538.142 243.343 541 224.617Z" fill="#FFA300" stroke="#FFA300"/>
</g>

<g id="cuerpo">
  <ellipse cx="323.568" cy="172.078" rx="85.142" ry="110.31" fill="black" fill-opacity="0.1"/>
  <ellipse cx="323.568" cy="160.833" rx="85.142" ry="110.845" fill="#B77C38"/>
  <ellipse cx="324.142" cy="139.845" rx="85.142" ry="110.845" fill="#7A463B"/>
</g>
<g id="boca">
  <ellipse class="v normal act" cx="323" cy="229.5" rx="34" ry="11.5" fill="#B35C52"/>
  <ellipse class="v arriba" cx="355.353" cy="225.353" rx="73.2904" ry="24.7894" transform="rotate(45 355.353 225.353)" fill="#B35C52"/>
  <ellipse class="v celebra" cx="323" cy="252" rx="42" ry="19" fill="#B35C52"/>
</g>
<g id="plato">
  <g class="v normal act">
    <path d="M395.715 211.876C447.012 125.722 380.433 15.5764 322.585 20.1371C271.287 16.6668 198.157 121.36 249.456 211.876C251.639 231.506 293.115 230.415 320.402 280.581C322.297 282.988 323.492 282.991 325.859 280.581C353.146 230.415 393.532 231.506 395.715 211.876Z" fill="#E6A22A" stroke="#E6A22A"/>
    <path d="M395.405 214.46C395.537 213.915 395.637 213.354 395.702 212.774C395.989 213.373 395.874 213.915 395.405 214.46C391.129 232.033 352.56 232.462 326.245 280.245C355.023 224.978 390.979 219.593 395.405 214.46Z" fill="#AE762A"/>
    <path d="M395.702 212.774C393.532 232.052 353.376 230.981 326.245 280.245C358.077 219.112 398.692 219.012 395.702 212.774Z" stroke="#AE762A"/>
    <path d="M249.596 214.46C249.461 213.915 249.36 213.354 249.294 212.774C249.002 213.373 249.119 213.915 249.596 214.46C253.937 232.033 293.099 232.462 319.819 280.245C290.599 224.978 254.089 219.593 249.596 214.46Z" fill="#AE762A"/>
    <path d="M249.294 212.774C251.498 232.052 292.271 230.981 319.819 280.245C287.498 219.112 246.258 219.012 249.294 212.774Z" stroke="#AE762A"/>
    <path d="M334.904 185.298C367.697 115.374 361.023 84.8056 328.61 43.0105C327.961 42.1735 326.635 42.7955 326.858 43.8309C337.41 92.8703 340.289 124.469 333.012 184.774C332.877 185.899 334.423 186.324 334.904 185.298Z" fill="#EEB453" stroke="#EEB453"/>
    <path d="M283.472 87.7664C266.588 71.9928 270.393 61.3164 277.165 60.5012C294.048 76.2748 290.243 86.9512 283.472 87.7664Z" fill="#AA6718" stroke="#AA6718"/>
    <path d="M362.299 85.5835C379.183 69.8099 375.378 59.1335 368.606 58.3183C351.723 74.0919 355.528 84.7683 362.299 85.5835Z" fill="#AA6718" stroke="#AA6718"/>
  </g>
  <g class="v abierta">
    <path d="M395.689 199.161C446.968 118.717 380.412 15.8696 322.585 20.1281C271.305 16.8878 198.201 114.643 249.482 199.161C251.664 217.49 293.125 216.472 320.402 263.313C322.297 265.561 323.491 265.564 325.858 263.313C353.135 216.472 393.507 217.49 395.689 199.161Z" fill="#E6A22A" stroke="#E6A22A"/>
    <path d="M395.576 201.574C395.71 201.065 395.81 200.541 395.875 200C396.164 200.559 396.049 201.065 395.576 201.574C391.277 217.982 352.494 218.383 326.032 263C354.97 211.395 391.126 206.367 395.576 201.574Z" fill="#AE762A"/>
    <path d="M395.875 200C393.693 218 353.314 217 326.032 263C358.041 205.918 398.882 205.825 395.875 200Z" stroke="#AE762A"/>
    <path d="M249.495 201.574C249.359 201.065 249.258 200.541 249.191 200C248.899 200.559 249.016 201.065 249.495 201.574C253.855 217.982 293.193 218.383 320.032 263C290.681 211.395 254.008 206.367 249.495 201.574Z" fill="#AE762A"/>
    <path d="M249.191 200C251.405 218 292.361 217 320.032 263C287.566 205.918 246.142 205.825 249.191 200Z" stroke="#AE762A"/>
    <path d="M334.974 174.269C367.697 109.086 361.054 80.5436 328.722 41.5826C328.059 40.7829 326.702 41.4375 326.934 42.4443C337.446 88.1087 340.309 117.605 333.052 173.797C332.91 174.894 334.469 175.274 334.974 174.269Z" fill="#EEB453" stroke="#EEB453"/>
    <path d="M283.504 83.2758C266.621 68.5474 270.425 58.5785 277.197 57.8173C294.08 72.5457 290.276 82.5146 283.504 83.2758Z" fill="#AA6718" stroke="#AA6718"/>
    <path d="M362.331 81.2378C379.215 66.5094 375.41 56.5405 368.639 55.7793C351.755 70.5077 355.56 80.4766 362.331 81.2378Z" fill="#AA6718" stroke="#AA6718"/>
  </g>
  <g class="v celebra">
    <path d="M395.689 181.611C446.968 109.046 380.412 16.2742 322.585 20.1156C271.305 17.1927 198.201 105.372 249.482 181.611C251.664 198.144 293.125 197.226 320.402 239.478C322.297 241.506 323.491 241.509 325.858 239.478C353.135 197.226 393.507 198.144 395.689 181.611Z" fill="#E6A22A" stroke="#E6A22A"/>
    <path d="M395.576 183.424C395.71 182.964 395.81 182.49 395.875 182C396.164 182.506 396.049 182.964 395.576 183.424C391.277 198.27 352.494 198.632 326.032 239C354.97 192.31 391.126 187.761 395.576 183.424Z" fill="#AE762A"/>
    <path d="M395.875 182C393.693 198.286 353.314 197.381 326.032 239C358.041 187.354 398.882 187.27 395.875 182Z" stroke="#AE762A"/>
    <path d="M249.495 183.424C249.359 182.964 249.258 182.49 249.191 182C248.899 182.506 249.016 182.964 249.495 183.424C253.855 198.27 293.193 198.632 320.032 239C290.681 192.31 254.008 187.761 249.495 183.424Z" fill="#AE762A"/>
    <path d="M249.191 182C251.405 198.286 292.361 197.381 320.032 239C287.566 187.354 246.142 187.27 249.191 182Z" stroke="#AE762A"/>
    <path d="M335.058 159.063C367.681 100.406 361.086 74.6596 328.877 39.6021C328.193 38.8576 326.79 39.5542 327.035 40.5159C337.487 81.5357 340.323 108.132 333.094 158.666C332.943 159.718 334.518 160.035 335.058 159.063Z" fill="#EEB453" stroke="#EEB453"/>
    <path d="M283.536 77.0774C266.653 63.7918 270.458 54.7994 277.229 54.1128C294.113 67.3984 290.308 76.3908 283.536 77.0774Z" fill="#AA6718" stroke="#AA6718"/>
    <path d="M362.364 75.2391C379.247 61.9535 375.442 52.9612 368.671 52.2745C351.787 65.5601 355.592 74.5525 362.364 75.2391Z" fill="#AA6718" stroke="#AA6718"/>
  </g>
</g>
<circle id="pataDer" cx="498" cy="203" r="12" fill="#E7BB52"/>
<circle id="pataIzq" cx="150" cy="203" r="12" fill="#E7BB52"/>
</g>
</svg>`;

  const ESTILO = `
#piko{width:100%; height:100%; display:block}

/* Lo único que se anima de verdad es lo que en el diseño está desplazado: las
   pupilas, los brillos, el cuerpo y la boca. La mirada llega con un rebote
   mínimo — un ojo que frena en seco parece mecánico. */
#piko #pupIzq, #piko #pupDer, #piko #briIzq, #piko #briDer{
  transition:transform .26s cubic-bezier(.34,1.35,.5,1);
}
#piko #cuerpo, #piko #boca{transition:transform .3s cubic-bezier(.3,.9,.3,1)}

/* Mientras habla, esa misma transición es el enemigo: la boca recibe un valor
   nuevo cada cuadro y con 300 ms de suavizado llega siempre tarde y a media
   sílaba. Se baja a 60 ms, que alcanza para que no se vea a saltos y no tanto
   como para que la boca vaya atrasada respecto de lo que se escucha. */
#piko.hablando #cuerpo, #piko.hablando #boca{
  transition-duration:.06s; transition-timing-function:linear;
}

/* Los trazados que no son el mismo dibujo corrido —el ojo cerrado, la ceja del
   guiño, las estrellas de la celebración— cambian de golpe, sin fundido, y eso
   es a propósito.

   Un fundido acá se ve mal por una razón concreta: durante el cruce las dos
   versiones quedan a media opacidad al mismo tiempo, y dos figuras encimadas al
   50 % no tapan lo que hay detrás. El resultado es que toda la zona del ojo se
   transparenta y se ve el cielo del fondo por un instante.

   Cruzar por opacidad sólo sirve entre cosas que no se superponen. Éstas se
   superponen todas, así que van con corte seco — que además es lo que hace
   cualquier animación por cuadros, y estos dibujos son cuadros. */
#piko .v{opacity:0}
#piko .v.act{opacity:1}
#piko .oculta{opacity:0}

/* Sólo quedan con transición las piezas que se desplazan; el resto ya cambia
   de golpe. Para quien pidió menos movimiento, también la mirada salta. */
@media (prefers-reduced-motion:reduce){
  #piko #pupIzq, #piko #pupDer, #piko #briIzq, #piko #briDer,
  #piko #cuerpo, #piko #boca{transition-duration:.01ms}
}`;

  // ═══════════════════════════════════════════════════════════════════════
  //  El motor
  // ═══════════════════════════════════════════════════════════════════════

  let raiz = null;
  let estadoActual = 'enfrente';
  let relojParpadeo = null;
  let parpadeando = false;

  /* Cuánto baja el cuerpo cuando el pico se abre del todo. Sale del estado
     `abierta` del diseño, que baja cuerpo y boca 19 px y cambia el trazado del
     pico. Se suma a lo que ya tenga la expresión en vez de reemplazarlo, así
     hablar mirando a la izquierda sigue siendo mirar a la izquierda. */
  const APERTURA_MAX = 19;

  /* Por debajo de esto el pico se queda cerrado. Existe porque el pico son dos
     dibujos y no uno estirable: abrirlo con cada soplido de fondo lo hace
     tiritar. */
  const UMBRAL_PICO = 0.18;

  /** Cuánta voz hay ahora mismo, de 0 a 1. `null` es que no está hablando. */
  let apertura = null;

  const el = (id) => raiz && raiz.querySelector('#' + id);

  /** Enciende una sola de las variantes de un grupo y apaga las demás. */
  function variante(grupoId, cual) {
    const grupo = el(grupoId);
    if (!grupo) return;
    for (const v of grupo.querySelectorAll(':scope > .v')) {
      v.classList.toggle('act', v.classList.contains(cual));
    }
  }

  /** Los ojos: el blanco, los contornos, las cejas y si se ven pupila y brillo. */
  function ponerOjos(e) {
    variante('blancoIzq', e.blanco);
    variante('blancoDer', e.blanco);
    variante('tapaIzq', e.tapaIzq);
    variante('tapaDer', e.tapaDer);
    variante('cejaIzq', e.cejaIzq);
    variante('cejaDer', e.cejaDer);
    el('pupIzq').classList.toggle('oculta', !e.ojosVisibles);
    el('pupDer').classList.toggle('oculta', !e.ojosVisibles);
    el('briIzq').classList.toggle('oculta', !e.ojosVisibles);
    el('briDer').classList.toggle('oculta', !e.ojosVisibles);
  }

  /**
   * El cuerpo, la boca y el pico, que son lo único que la voz mueve.
   *
   * Va en su propia función porque tiene dos dueños: la expresión, que los
   * coloca al cambiar de cara, y la voz, que los corrige sesenta veces por
   * segundo mientras suena un audio. Si cada uno escribiera el transform por su
   * lado, cambiar de expresión mientras habla dejaría la boca clavada hasta el
   * próximo cuadro.
   */
  function pintarBoca() {
    const e = ESTADOS[estadoActual];
    if (!e || !raiz) return;

    const k = apertura === null ? 0 : apertura;
    const baja = k * APERTURA_MAX;

    el('cuerpo').style.transform = `translate(0px, ${e.cuerpo + baja}px)`;
    el('boca').style.transform = `translate(0px, ${e.bocaY + baja}px)`;

    /* El pico sólo se cambia si la expresión traía el normal. La celebración y
       la boca abierta ya tienen el suyo, dibujado para esa cara, y pisarlo por
       hablar sería romper el gesto para animar la boca dentro de él. */
    const abierto = k >= UMBRAL_PICO && e.plato === 'normal';
    variante('plato', abierto ? 'abierta' : e.plato);
  }

  function aplicar(nombre) {
    const e = ESTADOS[nombre];
    if (!e || !raiz) return;
    estadoActual = nombre;

    const p = `translate(${e.pupila[0]}px, ${e.pupila[1]}px)`;
    const b = `translate(${e.brillo[0]}px, ${e.brillo[1]}px)`;
    el('pupIzq').style.transform = p;
    el('pupDer').style.transform = p;
    el('briIzq').style.transform = b;
    el('briDer').style.transform = b;

    variante('briIzq', e.brilloVar);
    variante('briDer', e.brilloVar);

    variante('boca', e.boca);
    pintarBoca();

    el('chispas').classList.toggle('oculta', !e.chispas);
    el('pataIzq').classList.toggle('oculta', !e.pataIzq);
    el('pataDer').classList.toggle('oculta', !e.pataDer);

    if (!parpadeando) ponerOjos(e);
  }

  /**
   * El parpadeo, ahora sí, con el dibujo del diseño.
   *
   * Antes no se podía: intenté sintetizarlo reutilizando el ojo cerrado del
   * guiño y cada versión dejaba un artefacto —una figura más grande que el ojo,
   * un destello blanco, una rayita del color del cielo—. La razón es que ese
   * ojo cerrado no es un párpado que baja: está dibujado para su composición y
   * su ceja lo acompaña.
   *
   * El archivo «ojos cerrados» resuelve eso de otra manera: cambia el blanco
   * del ojo por piel, saca pupila y reflejo, y trae su propia ceja. Sin huecos
   * y sin nada que asome. Eso es lo que se usa acá.
   *
   * Los intervalos son irregulares porque un parpadeo cada exactamente cuatro
   * segundos se nota, y queda peor que no parpadear.
   */
  function parpadear() {
    if (!raiz) return;
    const e = ESTADOS[estadoActual];

    /* Con la celebración y el guiño no se parpadea: en una las estrellas son el
       gesto y taparlas lo arruina, en el otro ya hay un ojo cerrado. Y mirando
       hacia arriba el contorno es otro, que no combina con la ceja cerrada. */
    const parpadeable = e.ojosVisibles && e.tapaIzq === 'normal' &&
                        e.tapaDer === 'normal' && e.brilloVar === 'normal';

    if (parpadeable) {
      parpadeando = true;
      ponerOjos({ ...e, ...OJOS_CERRADOS });
      setTimeout(() => {
        parpadeando = false;
        ponerOjos(ESTADOS[estadoActual]);
      }, 120);
    }

    relojParpadeo = setTimeout(parpadear, 2400 + Math.random() * 3600);
  }

  // ═══════════════════════════════════════════════════════════════════════

  window.Piko = {
    /** Mete el dibujo en el contenedor y lo pone a parpadear. */
    montar(contenedor) {
      if (!document.getElementById('piko-estilo')) {
        const estilo = document.createElement('style');
        estilo.id = 'piko-estilo';
        estilo.textContent = ESTILO;
        document.head.appendChild(estilo);
      }
      contenedor.innerHTML = DIBUJO;
      raiz = contenedor;

      aplicar('enfrente');
      relojParpadeo = setTimeout(parpadear, 2200);
    },

    /** Cambia de expresión. Devuelve false si no conoce ese nombre, para que
        quien llama pueda caer a mostrar el archivo suelto. */
    estado(nombre) {
      const clave = resolver(nombre);
      if (!clave) return false;
      aplicar(clave);
      return true;
    },

    /** Los nombres que entiende, para que el panel pueda ofrecerlos aunque no
        haya ningún archivo en la carpeta. */
    /**
     * Abre el pico según cuánta voz hay en este instante, de 0 a 1.
     *
     * `null` lo devuelve a donde lo deja la expresión. Se llama con la energía
     * del audio, cuadro a cuadro: por eso recibe un número y no un «abrí» y un
     * «cerrá». Una boca que se abre y se cierra a ritmo fijo se lee como que
     * mastica; abrirse en las sílabas y cerrarse en las pausas es lo que se lee
     * como que habla.
     */
    boca(cuanto) {
      if (!raiz) return;
      apertura = cuanto === null || cuanto === undefined
        ? null
        : Math.max(0, Math.min(1, cuanto));
      const svg = el('piko');
      if (svg) svg.classList.toggle('hablando', apertura !== null);
      pintarBoca();
    },

    nombres() { return Object.keys(ESTADOS); },

    conoce(nombre) { return resolver(nombre) !== null; },

    detener() {
      clearTimeout(relojParpadeo);
      raiz = null;
    },
  };
})();
