/*
 * El diccionario consultable. Lee datos/diccionario-miq.json, que escribe
 * `npm run contenido` a partir de diccionario/miskito/; acá no se edita nada.
 */
(function () {
  "use strict";

  var TEMAS = {
    saludos: "Saludos", frases: "Frases", familia: "Familia", cuerpo: "Cuerpo",
    numeros: "Números", colores: "Colores", animales: "Animales", comida: "Comida",
    naturaleza: "Naturaleza", casa: "Casa", escuela: "Escuela", acciones: "Acciones",
    cualidades: "Cómo es", tiempo: "Tiempo", gramatica: "Palabras de enlace"
  };
  var ESTADOS = {
    publicada: ["Diccionario publicado", "publicada"],
    un_hablante: ["Una persona", ""],
    varios_hablantes: ["Dos personas o más", "varias"],
    probable: ["Probable", "varias"],
    confirmada: ["Confirmada", "varias"]
  };
  var CATEGORIAS = {
    sustantivo: "sustantivo", verbo: "verbo", adjetivo: "adjetivo", adverbio: "adverbio",
    numeral: "número", pronombre: "pronombre", interjeccion: "interjección", expresion: "expresión",
    frase: "frase", posposicion: "posposición", conjuncion: "conjunción", particula: "partícula"
  };

  var datos = null;
  var tema = "";
  var verRevision = true;
  var $ = function (id) { return document.getElementById(id); };

  /** Para buscar: sin mayúsculas, sin tildes ni circunflejos, y la h no cuenta. */
  function llano(t) {
    return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/h/g, "");
  }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ---------- Voz ----------
  var voz = null;
  function elegirVoz() {
    if (!("speechSynthesis" in window)) return;
    var todas = speechSynthesis.getVoices();
    voz = todas.find(function (v) { return /^es[-_](US|MX|419)/i.test(v.lang); }) ||
      todas.find(function (v) { return /^es/i.test(v.lang); }) || null;
  }
  if ("speechSynthesis" in window) {
    elegirVoz();
    speechSynthesis.onvoiceschanged = elegirVoz;
  }
  function decir(texto) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(texto);
    u.lang = voz ? voz.lang : "es-US";
    if (voz) u.voice = voz;
    u.rate = 0.85;
    speechSynthesis.speak(u);
  }

  // ---------- Tarjetas ----------
  function fuenteCorta(id) {
    var f = datos.fuentes.find(function (x) { return x.id === id; });
    if (!f) return esc(id);
    var nombre = f.tipo === "publicacion" ? f.nombre.split(" ").slice(-2).join(" ") + " (" + f.fecha + ")" : f.nombre;
    return esc(nombre);
  }

  function tarjeta(e) {
    var est = ESTADOS[e.estado] || [e.estado, ""];
    var clases = "palabra" + (e.revisar ? " palabra--revision" : e.estado === "publicada" ? " palabra--publicada" : "");
    var insignias = [];
    if (e.revisar) insignias.push('<span class="insignia insignia--revision">En revisión</span>');
    insignias.push('<span class="insignia' + (est[1] ? " insignia--" + est[1] : "") + '">' + esc(est[0]) + "</span>");
    insignias.push('<span class="insignia">' + esc(TEMAS[e.tema] || e.tema) + "</span>");

    var det = [];
    det.push("<dt>Qué es</dt><dd>" + esc(CATEGORIAS[e.categoria] || e.categoria) + "</dd>");
    if (e.glosa) {
      det.push('<dt>Por partes</dt><dd><div class="glosa"><span>' + esc(e.analisis || e.forma) + "</span><span>" + esc(e.glosa) + "</span></div></dd>");
    }
    if (e.prestamo) {
      det.push("<dt>Viene de</dt><dd>" + esc(e.prestamo.de) + ", <i>" + esc(e.prestamo.origen) + "</i>" +
        (e.prestamo.confianza ? " · confianza " + esc(e.prestamo.confianza) : "") + "</dd>");
    }
    var escritas = (e.escrito || []).filter(function (x, i, a) { return a.indexOf(x) === i; });
    if (escritas.length) det.push("<dt>Cómo la escribieron</dt><dd>" + escritas.map(function (x) { return "<i>" + esc(x) + "</i>"; }).join(" · ") + "</dd>");
    det.push("<dt>Fuentes</dt><dd>" + e.fuentes.map(fuenteCorta).join(" · ") + "</dd>");
    if (e.reglas && e.reglas.length) {
      det.push("<dt>Reglas</dt><dd>" + e.reglas.map(function (r) {
        var g = datos.reglas[r];
        return '<a class="regla insignia" href="' + esc(g.enlace) + '" target="_blank" rel="noopener" title="Confianza ' + esc(g.confianza) + '">' +
          esc(r) + " · " + esc(g.titulo) + "</a>";
      }).join("") + "</dd>");
    }
    if (e.notas) det.push("<dt>Notas</dt><dd>" + esc(e.notas) + "</dd>");

    return (
      '<article class="' + clases + '" id="' + esc(e.id) + '">' +
      '<div class="palabra__fila"><h3 class="palabra__forma" lang="miq">' + esc(e.forma) + "</h3>" +
      '<button class="escuchar" type="button" data-voz="' + esc(e.voz) + '" aria-label="Escuchar «' + esc(e.forma) + '»">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg></button></div>' +
      '<p class="palabra__es">' + esc(e.es) + "</p>" +
      '<div class="palabra__insignias">' + insignias.join("") + "</div>" +
      (e.revisar ? '<p class="revision"><b>Qué hay que revisar:</b> ' + esc(e.revisar) + "</p>" : "") +
      "<details><summary>Más sobre esta palabra</summary><dl class=\"detalle\">" + det.join("") + "</dl></details>" +
      '<a class="enlace-copiar" href="#' + esc(e.id) + '" style="font-size:.82rem; display:inline-block; margin-top:.5rem">Enlace a esta palabra</a>' +
      "</article>"
    );
  }

  // ---------- Búsqueda ----------
  function puntaje(e, q) {
    if (!q) return 1;
    var f = llano(e.forma), es = llano(e.es);
    if (f === q || es === q) return 100;
    if (f.indexOf(q) === 0) return 60;
    if (es.split(/[\s,;()/]+/).indexOf(q) >= 0) return 55;
    if (es.indexOf(q) === 0) return 50;
    if (f.indexOf(q) >= 0) return 30;
    if (es.indexOf(q) >= 0) return 25;
    if ((e.escrito || []).some(function (x) { return llano(x).indexOf(q) >= 0; })) return 20;
    if (e.glosa && llano(e.glosa).indexOf(q) >= 0) return 10;
    return 0;
  }

  function mostrar() {
    var q = llano($("q").value.trim());
    var lista = datos.entradas
      .filter(function (e) { return (!tema || e.tema === tema) && (verRevision || !e.revisar); })
      .map(function (e) { return { e: e, p: puntaje(e, q) }; })
      .filter(function (x) { return x.p > 0; });
    if (q) lista.sort(function (a, b) { return b.p - a.p || a.e.forma.localeCompare(b.e.forma, "es"); });
    else lista.sort(function (a, b) { return a.e.forma.localeCompare(b.e.forma, "es"); });

    $("palabras").innerHTML = lista.length
      ? lista.map(function (x) { return tarjeta(x.e); }).join("")
      : '<p class="vacio">No encontramos «' + esc($("q").value) + '». Probá en español o en miskito, o con otra forma de escribirla.<br>' +
        '¿La conocés? <a href="../aporta/">Aportala</a>.</p>';
    $("cuenta").textContent = lista.length === datos.entradas.length
      ? datos.entradas.length + " palabras y frases"
      : lista.length + " de " + datos.entradas.length + " palabras y frases";
  }

  function filtros() {
    var cuenta = {};
    datos.entradas.forEach(function (e) { cuenta[e.tema] = (cuenta[e.tema] || 0) + 1; });
    var temas = Object.keys(TEMAS).filter(function (t) { return cuenta[t]; });
    Object.keys(cuenta).forEach(function (t) { if (temas.indexOf(t) < 0) temas.push(t); });
    var revision = datos.entradas.filter(function (e) { return e.revisar; }).length;
    $("filtros").innerHTML =
      '<button class="filtro" type="button" data-tema="" aria-pressed="true">Todo</button>' +
      temas.map(function (t) {
        return '<button class="filtro" type="button" data-tema="' + esc(t) + '" aria-pressed="false">' + esc(TEMAS[t] || t) + " · " + cuenta[t] + "</button>";
      }).join("") +
      '<button class="filtro filtro--revision" type="button" data-revision aria-pressed="true">Con las ' + revision + " en revisión</button>";
  }

  function fuentes() {
    $("fuentes").innerHTML = datos.fuentes.map(function (f) {
      var n = datos.entradas.filter(function (e) { return e.fuentes.indexOf(f.id) >= 0; }).length;
      var nombre = f.enlace ? '<a href="' + esc(f.enlace) + '" target="_blank" rel="noopener">' + esc(f.nombre) + "</a>" : esc(f.nombre);
      return "<li><b>" + nombre + "</b>" + (f.fecha ? " · " + esc(f.fecha.slice(0, 4)) : "") +
        "<br>" + esc(f.detalle) + "<br><span style=\"color:var(--tinta-suave)\">" + n + " palabras</span></li>";
    }).join("");
  }

  // ---------- Arranque ----------
  $("filtros").addEventListener("click", function (ev) {
    var b = ev.target.closest(".filtro");
    if (!b) return;
    if (b.hasAttribute("data-revision")) {
      verRevision = !verRevision;
      b.setAttribute("aria-pressed", String(verRevision));
    } else {
      tema = b.getAttribute("data-tema");
      document.querySelectorAll(".filtro[data-tema]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    }
    mostrar();
  });
  $("palabras").addEventListener("click", function (ev) {
    var b = ev.target.closest(".escuchar");
    if (b) decir(b.getAttribute("data-voz"));
  });
  var espera;
  $("q").addEventListener("input", function () { clearTimeout(espera); espera = setTimeout(mostrar, 120); });

  fetch("../datos/diccionario-miq.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      datos = d;
      var buscado = new URLSearchParams(location.search).get("q");
      if (buscado) $("q").value = buscado;
      filtros();
      fuentes();
      mostrar();
      if (location.hash) {
        var el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (el) { el.querySelector("details").open = true; el.scrollIntoView({ block: "start" }); }
      }
    })
    .catch(function () {
      $("palabras").innerHTML = '<p class="vacio">No se pudo cargar el diccionario. Si abriste el archivo directo, servilo con un servidor local (por ejemplo <code>python3 -m http.server</code> dentro de <code>web/</code>).</p>';
    });
})();
