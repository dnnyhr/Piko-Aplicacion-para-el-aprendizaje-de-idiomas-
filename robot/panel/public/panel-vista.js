/**
 * Lo que se ve del panel, y nada más.
 *
 * Toda la lógica del robot vive en el <script> de index.html: el WebSocket, el
 * latido, las secuencias, la parada. Este archivo corre después y sólo hace tres
 * cosas: cambiar de sección, vestir los botones que aquélla crea y mostrar en
 * pantalla el estado que aquélla ya tiene.
 *
 * La regla que lo mantiene seguro: **de acá no sale ninguna orden propia.** Lee
 * las variables de la lógica (`vivo`, `secuenciaEnCurso`, `efectoPuesto`…) y no
 * escribe en ninguna. Lo único que dispara algo es «Decir» de Inicio, y lo hace
 * apretando el botón `btnDecir` de verdad, para que haya un solo camino.
 */
(function () {
  'use strict';

  const icono = (nombre) =>
    `<svg class="ico" aria-hidden="true"><use href="#i-${nombre}"/></svg>`;

  // ── Las secciones ──────────────────────────────────────────────────────

  let vistaActual = 'inicio';

  function ir(vista) {
    vistaActual = vista;
    document.querySelectorAll('.vista').forEach((v) => {
      v.classList.toggle('activa', v.dataset.vista === vista);
    });
    document.querySelectorAll('.nav__item').forEach((b) => {
      if (b.dataset.ir === vista) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    document.querySelector('.hoja').scrollTop = 0;
    refrescar();
  }

  document.querySelectorAll('[data-ir]').forEach((b) => {
    b.addEventListener('click', () => ir(b.dataset.ir));
  });

  // ── Vestir lo que crea la lógica ───────────────────────────────────────

  const ICONO_SECUENCIA = {
    celebrar: 'celebrar', saludo: 'saludar', pensar: 'pensar',
    hablar: 'boca', dormir: 'dormir',
  };
  const ICONO_RUMBO = { arriba: 'arriba', izq: 'izq', centro: 'centro', der: 'der' };
  const ICONO_EFECTO = {
    fijo: 'fijo', arcoiris: 'arcoiris', respirar: 'respirar',
    destello: 'destello', apagado: 'apagar',
  };

  /* Los botones se visten sin reemplazarlos: traen sus manejadores puestos. */
  document.querySelectorAll('#presets .preset').forEach((b) => {
    const nombre = ICONO_SECUENCIA[b.dataset.seq] || 'cortar';
    const texto = document.createElement('span');
    texto.className = 'preset__txt';
    texto.append(...b.childNodes);
    const marco = document.createElement('span');
    marco.className = 'preset__ico';
    marco.innerHTML = icono(nombre);
    b.append(marco, texto);
  });

  document.querySelectorAll('#rumbo .rumbo').forEach((b) => {
    b.querySelector('.flecha').innerHTML = icono(ICONO_RUMBO[b.dataset.celda]);
  });

  document.querySelectorAll('#efectos .efecto').forEach((b) => {
    b.insertAdjacentHTML('afterbegin', icono(ICONO_EFECTO[b.dataset.efecto]));
  });

  /* El nombre que ve el maestro. El de verdad sigue en `data-nombre`, que es el
     que viaja al puente y no se toca. */
  const NOMBRE_CARA = {
    enfrente: 'De frente', izquierda: 'Izquierda', derecha: 'Derecha', arriba: 'Arriba',
    guino: 'Guiño', abierta: 'Boca abierta', cerrados: 'Ojos cerrados', celebracion: 'Celebración',
  };
  const nombreCara = (n) => NOMBRE_CARA[n] || n;

  function vestirCaras() {
    document.querySelectorAll('#caras .cara:not([data-vestida])').forEach((b) => {
      b.dataset.vestida = '1';
      const nombre = b.dataset.nombre;
      b.textContent = nombreCara(nombre);
      /* Una expresión en video no tiene miniatura, y una que no está en la
         carpeta tampoco: el botón sigue sirviendo con el nombre solo. */
      const img = new Image();
      img.alt = '';
      img.loading = 'lazy';
      img.src = `caras/${encodeURIComponent(nombre)}.svg`;
      img.addEventListener('error', () => img.remove());
      b.prepend(img);
    });
  }

  function vestirSonidos() {
    document.querySelectorAll('#listaSonidos .tecla:not([data-vestida])').forEach((b) => {
      b.dataset.vestida = '1';
      const nombre = b.textContent.replace(/^▶\s*/, '');
      b.innerHTML = icono('play');
      b.append(nombre);
    });
  }

  /* Piko en Inicio: el mismo dibujo y el mismo motor que la cara del robot. Sigue
     lo que el puente confirma —el `expresion` que vuelve y marca el botón—, no lo
     que se apretó. */
  Piko.montar($('espejo'));

  /* El dibujo del robot entra como texto y no como <img> porque hay que llegar a
     sus alas para moverlas. Las alas son las dos elipses dentro de grupos girados:
     en todo el archivo son los únicos grupos con esa rotación. */
  fetch('pikobot.svg')
    .then((r) => r.text())
    .then((svg) => {
      $('robot').insertAdjacentHTML('afterbegin', svg);
      const dibujo = $('robot').querySelector('svg');
      dibujo.setAttribute('aria-hidden', 'true');
      dibujo.querySelector('g[transform^="rotate(-24"] ellipse').classList.add('robot__ala', 'robot__ala--izq');
      dibujo.querySelector('g[transform^="rotate(24"] ellipse').classList.add('robot__ala', 'robot__ala--der');
      refrescar();
    });
  let caraPuesta = 'enfrente';

  /* Al abrir se ve el dibujo con su propia cara. Desde la primera orden de cara o
     de mirada se ve la viva, haya o no teléfono: si no, apretar «Derecha» no
     mostraría nada. Se engancha acá porque todas las secuencias y el ejercicio
     pasan por `ponerExpresion`, y mirar el botón marcado no alcanza: repetir la
     expresión que ya estaba puesta no cambia nada que se pueda observar. La orden
     sigue su camino sin tocarla. */
  let caraViva = false;
  const ponerExpresionOriginal = ponerExpresion;
  window.ponerExpresion = (nombre) => {
    if (vivo) caraViva = true;
    ponerExpresionOriginal(nombre);
    refrescar();
  };

  function seguirCara() {
    const puesta = document.querySelector('#caras .cara.puesta');
    if (!puesta) return;
    caraPuesta = puesta.dataset.nombre;
    Piko.estado(caraPuesta);
  }

  new MutationObserver(() => { vestirCaras(); seguirCara(); })
    .observe($('caras'), { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  new MutationObserver(vestirSonidos).observe($('listaSonidos'), { childList: true });

  // ── La respuesta del robot ─────────────────────────────────────────────

  /* La consola ya recibe todo lo que contesta la placa, así que se la mira en vez
     de abrir otra escucha sobre el WebSocket. */
  let relojResponde = null;
  let relojBrindis = null;

  function brindis(texto) {
    const b = $('brindis');
    b.textContent = texto;
    b.hidden = false;
    clearTimeout(relojBrindis);
    relojBrindis = setTimeout(() => { b.hidden = true; }, 4000);
  }

  new MutationObserver((cambios) => {
    for (const cambio of cambios) {
      for (const linea of cambio.addedNodes) {
        const texto = linea.textContent || '';
        if (!texto.startsWith('← ')) continue;
        const contenido = texto.slice(2);
        const mala = contenido.startsWith('ERR');

        $('respuesta').textContent = `Placa: ${contenido}`;
        $('respuestaLuz').className = `respuesta__luz ${mala ? 'mal' : 'bien'}`;
        if (mala) brindis(contenido.replace(/^ERR\s*/, ''));

        $('chipSerie').classList.add('responde');
        clearTimeout(relojResponde);
        relojResponde = setTimeout(() => $('chipSerie').classList.remove('responde'), 220);
      }
    }
  }).observe($('consola'), { childList: true });

  /* El punto del latido queda verde para siempre una vez que llegó el primero:
     acá se le pone plazo, para que un corte se vea. La telemetría llega cuatro
     veces por segundo, así que un segundo y medio sin nada es un corte de verdad. */
  let ultimoLatido = 0;
  new MutationObserver(() => {
    if ($('pLatido').classList.contains('late')) ultimoLatido = Date.now();
  }).observe($('pLatido'), { attributes: true, attributeFilter: ['class'] });
  const hayLatido = () => Date.now() - ultimoLatido < 1500;

  // ── Decir, desde Inicio ────────────────────────────────────────────────

  /* El campo de Inicio y el de Hablar son el mismo texto: lo que se empezó a
     escribir en uno sigue ahí en el otro. */
  $('fraseRapida').addEventListener('input', (e) => { $('frase').value = e.target.value; });
  $('frase').addEventListener('input', (e) => { $('fraseRapida').value = e.target.value; });
  $('btnDecirRapido').addEventListener('click', () => $('btnDecir').click());
  $('fraseRapida').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $('btnDecir').click(); }
  });

  // ── La parada, a la vista ──────────────────────────────────────────────

  /* Sólo la confirmación visual. `parar()` la sigue llamando el mismo manejador
     de siempre; esto es una escucha más, que no la reemplaza ni la condiciona. */
  let paradaHasta = 0;

  function avisarParada() {
    paradaHasta = Date.now() + 2500;
    $('btnParada').classList.add('dada');
    setTimeout(() => $('btnParada').classList.remove('dada'), 400);
    refrescar();
  }
  $('btnParada').addEventListener('click', avisarParada);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || (e.code === 'Space' && !escribiendo(e))) avisarParada();
  });

  // ── Pintar el estado ───────────────────────────────────────────────────

  /* Al abrir la página todavía no hay puente, y eso no es un corte. */
  let huboPuente = false;

  function estadoGeneral(placa) {
    if (Date.now() < paradaHasta) return ['mal', 'Parada enviada'];
    if (!vivo) return huboPuente ? ['mal', 'Sin conexión'] : ['atento', 'Conectando…'];
    if (aleteo) return ['ocupado', 'Aleteando'];
    if (secuenciaEnCurso) return ['ocupado', SECUENCIAS[secuenciaEnCurso.clave].nombre];
    if (ejercicio) return ['ocupado', 'Ejercicio en curso'];
    if (esperandoVoz.size > 0) return ['ocupado', 'Hablando'];
    if (!placa && !hayCara) return ['atento', 'Robot sin conectar'];
    if (!placa) return ['atento', 'Falta la placa'];
    if (!hayCara) return ['atento', 'Falta la cara'];
    if (!hayLatido()) return ['atento', 'Sin latido'];
    return ['bien', 'Listo'];
  }

  function avisoDeVista(placa) {
    if (!vivo) {
      return huboPuente
        ? ['grave', 'Se cortó la conexión con el puente. Reintentando… Los botones no llegan al robot.']
        : null;
    }
    if (!placa && (vistaActual === 'mover' || vistaActual === 'luces' || vistaActual === 'avanzado')) {
      return ['', 'La placa no está conectada: estas órdenes no llegan al robot.'];
    }
    if (!hayCara && (vistaActual === 'hablar' || vistaActual === 'cara' || vistaActual === 'ejercicio')) {
      return ['', 'No hay teléfono conectado: abrí /cara en el teléfono del robot para ver y oír esto.'];
    }
    return null;
  }

  function ponerTexto(id, texto) {
    const nodo = $(id);
    if (nodo.textContent !== texto) nodo.textContent = texto;
  }

  function lleno(rango) {
    const pct = (rango.value - rango.min) / (rango.max - rango.min) * 100;
    rango.style.setProperty('--lleno', `${pct}%`);
  }

  function refrescar() {
    if (vivo) huboPuente = true;
    const placa = $('pSerie').classList.contains('si');
    const latido = hayLatido();

    const [tono, texto] = estadoGeneral(placa);
    $('general').dataset.tono = tono;
    ponerTexto('generalTexto', texto);

    const aviso = avisoDeVista(placa);
    $('aviso').hidden = !aviso;
    if (aviso) {
      $('aviso').className = `aviso ${aviso[0]}`;
      ponerTexto('avisoTexto', aviso[1]);
    }

    ponerTexto('txtLatido', latido ? 'latido' : 'sin latido');
    $('chipLatido').classList.toggle('sin', !latido);

    // Los controles que la lógica no marca sola.
    const servo = Number($('servo').value);
    document.querySelectorAll('[data-servo]').forEach((b) => {
      b.classList.toggle('puesto', Number(b.dataset.servo) === servo);
    });
    const izq = $('colorA').value.toLowerCase();
    const der = $('colorB').value.toLowerCase();
    document.querySelectorAll('[data-ambas]').forEach((b) => {
      b.classList.toggle('puesto', b.dataset.ambas === izq && b.dataset.ambas === der);
    });
    lleno($('servo'));
    lleno($('brillo'));

    // Piko en Inicio.
    const robot = $('robot');
    const apagado = efectoPuesto === 'apagado';
    const brillo = Number($('brillo').value) / 255;
    robot.style.setProperty('--giro-ala', `${(servo - 90) * 0.32}deg`);
    robot.classList.toggle('en-reposo', !hayCara && !caraViva);
    robot.classList.toggle('arcoiris', efectoPuesto === 'arcoiris');
    pintarAla('.robot__ala--izq', apagado ? '#000000' : izq, brillo);
    pintarAla('.robot__ala--der', apagado ? '#000000' : der, brillo);

    const nombreEfecto = EFECTOS[efectoPuesto].nombre;
    ponerTexto('datoCara', hayCara || caraViva ? nombreCara(caraPuesta) : 'Sin teléfono');
    ponerTexto('datoAlas', `${servo}°`);
    ponerTexto('datoLuces', nombreEfecto);

    // Los atajos dicen cómo está cada cosa antes de entrar.
    ponerTexto('atajoMover', aleteo ? 'aleteando' : `ángulo ${servo}°`);
    ponerTexto('atajoLuces', `${nombreEfecto} · brillo ${$('brillo').value}`);
    ponerTexto('atajoCara', nombreCara(caraPuesta));
    ponerTexto('atajoEjercicio', $('pasoEjercicio').textContent);

    // Lo que sigue corriendo en otra sección.
    marcarNav('ejercicio', ejercicio !== null);
    marcarNav('mover', aleteo !== null);
    marcarNav('luces', relojEfecto !== null);
  }

  function pintarAla(selector, hex, brillo) {
    const ala = document.querySelector(selector);
    if (!ala) return;                  // el dibujo todavía no llegó
    const alfa = Math.round(brillo * 200 + 40).toString(16).padStart(2, '0');
    ala.style.setProperty('--brillo-ala', hex === '#000000' ? 'transparent' : `${hex}${alfa}`);
  }

  function marcarNav(vista, vivoAhi) {
    document.querySelector(`.nav__item[data-ir="${vista}"]`).classList.toggle('vivo', vivoAhi);
  }

  /* Todo lo de arriba es leer y pintar: no manda nada al robot. Por eso puede ir
     con un reloj en vez de engancharse a cada lugar donde cambia algo, que sería
     tocar la lógica. */
  setInterval(refrescar, 200);
  document.addEventListener('click', refrescar);
  document.addEventListener('input', refrescar);

  vestirCaras();
  vestirSonidos();
  refrescar();
})();
