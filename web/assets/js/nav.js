/*
 * La barra de navegación y el pie, iguales en todas las páginas.
 *
 * Cada página pone un <div id="nav" data-pagina="…" data-raiz="…"></div> y,
 * si quiere pie, un <div id="pie"></div>. `data-raiz` es la ruta hasta la raíz
 * del sitio ("" en la portada, "../" en las páginas interiores), para que los
 * enlaces funcionen igual en el dominio, en una carpeta o abriendo el archivo.
 */
(function () {
  "use strict";

  var ICONOS = {
    inicio:
      '<path d="M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>',
    diccionario:
      '<path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm0 16a1 1 0 0 0 0 2h12v-2H6zm2-12v2h8V6H8zm0 4v2h6v-2H8z"/>',
    probar:
      '<path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 3v13h10V5H7zm3 3.5 5 3-5 3v-6z"/>',
    docentes:
      '<path d="M2 4h20v12H2V4zm2 2v8h16V6H4zm6 12h4l1 3H9l1-3zM6 8h7v2H6V8zm0 3h5v2H6v-2z"/>',
    aporta:
      '<path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.2 5 6.6 5c2 0 3.5 1.1 4.4 2.5h2C13.9 6.1 15.4 5 17.4 5c3.4 0 5.6 3.3 4.1 6.8C19.5 16.4 12 21 12 21z"/>'
  };

  var PAGINAS = [
    { id: "inicio", texto: "Inicio", ruta: "" },
    { id: "diccionario", texto: "Diccionario", ruta: "diccionario/" },
    { id: "probar", texto: "Probar Piko", ruta: "probar/" },
    { id: "docentes", texto: "Para docentes", ruta: "docentes/" },
    { id: "aporta", texto: "Aportá tu lengua", ruta: "aporta/" }
  ];

  var REPO = "https://github.com/dnnyhr/Piko-Aplicacion-para-el-aprendizaje-de-idiomas-";

  var lugar = document.getElementById("nav");
  if (lugar) {
    var raiz = lugar.getAttribute("data-raiz") || "";
    var actual = lugar.getAttribute("data-pagina") || "";
    var enlaces = PAGINAS.map(function (p) {
      var aqui = p.id === actual ? ' aria-current="page"' : "";
      return (
        '<li><a class="nav__enlace nav__enlace--' + p.id + '" href="' + raiz + p.ruta + '"' + aqui + ">" +
        '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONOS[p.id] + "</svg>" +
        p.texto + "</a></li>"
      );
    }).join("");
    lugar.outerHTML =
      '<nav class="nav" aria-label="Secciones del sitio"><div class="nav__fila">' +
      '<a class="nav__marca" href="' + raiz + '" aria-label="Piko, inicio">' +
      '<img src="' + raiz + 'assets/img/marca.svg" alt="Piko" width="64" height="34"></a>' +
      '<ul class="nav__enlaces">' + enlaces + "</ul></div></nav>";

    // En el teléfono la fila se desliza: que se vea la sección en la que estás.
    var activo = document.querySelector('.nav__enlace[aria-current="page"]');
    if (activo && activo.parentNode && activo.parentNode.parentNode) {
      var lista = activo.parentNode.parentNode;
      lista.scrollLeft = activo.offsetLeft - (lista.clientWidth - activo.offsetWidth) / 2;
    }

    // Al bajar, la barra toma sombra para separarse del contenido.
    var barra = document.querySelector(".nav");
    var bajando = null;
    var marcar = function () {
      var ahora = window.scrollY > 8;
      if (ahora !== bajando) { bajando = ahora; barra.classList.toggle("nav--bajando", ahora); }
    };
    marcar();
    window.addEventListener("scroll", marcar, { passive: true });
  }

  var pie = document.getElementById("pie");
  if (pie) {
    var raizPie = (lugar && lugar.getAttribute("data-raiz")) || pie.getAttribute("data-raiz") || "";
    var enlacesPie = PAGINAS.slice(1).map(function (p) {
      return '<li><a href="' + raizPie + p.ruta + '">' + p.texto + "</a></li>";
    }).join("");
    pie.outerHTML =
      '<footer class="sitio-pie">' +
      '<svg class="sitio-pie__ola" viewBox="0 0 1440 35" preserveAspectRatio="none" aria-hidden="true"><path d="M0 35V18C180 2 360 0 540 10s360 22 540 14 270-20 360-16v19z"/></svg>' +
      '<div class="sitio-pie__grid">' +
      '<div class="sitio-pie__marca"><img src="' + raizPie + 'assets/img/marca-negativo.svg" alt="Piko" width="170" height="91" loading="lazy">' +
      "<p>Una app y un robot que enseñan las lenguas de la Costa Caribe en escuelas rurales, sin internet.</p></div>" +
      '<div><h2>El sitio</h2><ul>' + enlacesPie + "</ul></div>" +
      '<div><h2>El proyecto</h2><ul>' +
      '<li><a href="' + REPO + '">Código en GitHub</a></li>' +
      '<li><a href="' + REPO + '/releases">Descargar el APK</a></li>' +
      '<li><a href="https://encuestas.piko.mugiware.com/e/tu-lengua">Tu lengua en Piko</a></li>' +
      "</ul></div></div>" +
      '<div class="sitio-pie__fila"><span>Piko · equipo MugiWare · Jinotega, Nicaragua</span><span>Software libre (MIT) · Hackathon Nicaragua 2026</span></div>' +
      "</footer>";
  }
})();
