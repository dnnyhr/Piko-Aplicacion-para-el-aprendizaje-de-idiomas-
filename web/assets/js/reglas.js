/*
 * La página de reglas: filtrar por sección y buscar. Las reglas ya vienen en
 * el HTML (las escribe npm run contenido), así que sin JavaScript se ven todas.
 */
(function () {
  "use strict";

  var tarjetas = Array.prototype.slice.call(document.querySelectorAll(".regla-tarjeta"));
  var filtros = Array.prototype.slice.call(document.querySelectorAll("#filtros .filtro"));
  var q = document.getElementById("q");
  var vacio = document.getElementById("sin-resultados");
  var seccion = "";

  // Sin tildes ni mayúsculas: «número» encuentra «numero».
  var llano = function (t) {
    return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };
  var textos = tarjetas.map(function (t) { return llano(t.textContent); });

  function aplicar() {
    var buscado = llano((q && q.value) || "").trim();
    var visibles = 0;
    tarjetas.forEach(function (t, i) {
      var ve = (!seccion || t.parentNode.parentNode.getAttribute("data-seccion") === seccion) && (!buscado || textos[i].indexOf(buscado) >= 0);
      t.hidden = !ve;
      if (ve) visibles++;
      // Si lo buscado está en los ejemplos, que se vean
      var detalles = t.querySelector("details");
      if (detalles && buscado) detalles.open = ve && llano(detalles.textContent).indexOf(buscado) >= 0;
    });
    // Una sección sin reglas a la vista se esconde entera
    Array.prototype.forEach.call(document.querySelectorAll(".reglas-seccion"), function (s) {
      s.hidden = !s.querySelector(".regla-tarjeta:not([hidden])");
    });
    if (vacio) vacio.hidden = visibles > 0;
  }

  filtros.forEach(function (b) {
    b.addEventListener("click", function () {
      seccion = b.getAttribute("data-seccion") || "";
      filtros.forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
      aplicar();
    });
  });
  if (q) q.addEventListener("input", aplicar);

  // Un enlace a una regla (#m16) la abre entera
  function abrirDestino() {
    var id = location.hash.slice(1);
    var t = id && document.getElementById(id);
    if (t && t.classList.contains("regla-tarjeta")) {
      t.hidden = false;
      t.parentNode.parentNode.hidden = false;
      var d = t.querySelector("details");
      if (d) d.open = true;
    }
  }
  window.addEventListener("hashchange", abrirDestino);
  abrirDestino();
})();
