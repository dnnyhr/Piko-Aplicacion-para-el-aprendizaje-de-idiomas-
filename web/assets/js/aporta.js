/*
 * «Aportá tu lengua»: el estado de cada lengua y los créditos. Sale de
 * datos/estado.json, que escribe `npm run contenido`.
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var anim = function () { return window.PikoAnim || { aparecer: function () {}, contar: function () {} }; };
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function cifra(n, texto) { return '<div><dt>' + texto + '</dt><dd data-contar="' + n + '">' + n + "</dd></div>"; }
  var SEMILLA = '<svg class="semilla" viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="42" rx="14" ry="4" fill="#ECE1CC"/><path d="M24 40V24" stroke="#61A66B" stroke-width="3" stroke-linecap="round"/><path d="M24 28c-9 0-12-7-12-12 7 0 12 4 12 12z" fill="#97C137"/><path d="M24 24c0-8 5-13 13-13 0 6-4 13-13 13z" fill="#61A66B"/></svg>';
  var LIBRO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm0 16a1 1 0 0 0 0 2h12v-2H6z"/></svg>';

  function lengua(l) {
    if (l.entradas == null) {
      return (
        '<div class="tarjeta lengua lengua--vacia">' + (l.desde ? "" : SEMILLA) + "<h3>" + esc(l.nombre) + "</h3>" +
        '<p class="lengua__autonimo">' + (l.desde ? "Se enseña desde el " + esc(l.desde === "miq" ? "miskito" : l.desde) + ", con la app en miskito." : "Todavía sin palabras.") + "</p>" +
        (l.desde ? "" : '<p style="margin:0">¿La hablás? <a href="https://encuestas.piko.mugiware.com/e/tu-lengua" target="_blank" rel="noopener">Sé la primera persona en aportar</a>.</p>') +
        "</div>"
      );
    }
    var interfaz = "";
    if (l.interfaz) {
      var pct = l.interfaz.total ? Math.round((100 * l.interfaz.traducidos) / l.interfaz.total) : 0;
      interfaz =
        '<p style="margin:1rem 0 0; font-size:.9rem">La app en ' + esc(l.autonimo || l.nombre) + ": <b>" + l.interfaz.traducidos + "</b> de " + l.interfaz.total + " textos traducidos" +
        '<span class="barra" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><span data-barra="' + pct + '"></span></span></p>';
    }
    var personas = l.fuentes.filter(function (f) { return f.tipo === "encuesta"; }).length;
    var obras = l.fuentes.filter(function (f) { return f.tipo === "publicacion"; }).length;
    var de = l.fuentes.length
      ? personas + (personas === 1 ? " hablante" : " hablantes") + (obras ? " y " + obras + (obras === 1 ? " obra publicada" : " obras publicadas") : "")
      : "Escrito por el equipo";
    return (
      '<div class="tarjeta tarjeta--viva lengua' + (l.diccionario ? " lengua--grande" : "") + '"><h3>' + esc(l.nombre) + "</h3>" +
      '<p class="lengua__autonimo">' + (l.autonimo ? esc(l.autonimo) + " · " : "") + esc(de) + "</p>" +
      '<dl class="cifras">' +
      cifra(l.entradas, "palabras y frases") +
      cifra(l.ejercicios, "ejercicios desde el español") +
      (l.al_espanol ? cifra(l.al_espanol, "ejercicios de español desde esta lengua") : "") +
      (l.dichas_por_varias_personas ? cifra(l.dichas_por_varias_personas, "dichas por dos personas o más") : "") +
      "</dl>" + interfaz +
      (l.diccionario ? '<p style="margin:1rem 0 0"><a class="btn btn--linea" href="../diccionario/">Abrir el diccionario</a></p>' : "") +
      "</div>"
    );
  }

  fetch("../datos/estado.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      // Primero las que ya tienen palabras.
      var lenguas = d.lenguas.slice().sort(function (a, b) { return (b.entradas || 0) - (a.entradas || 0); });
      $("lenguas").innerHTML = lenguas.map(lengua).join("");
      anim().aparecer($("lenguas").children, { stagger: .1 });
      anim().contar($("lenguas"));

      var vistas = {}, creditos = [];
      d.lenguas.forEach(function (l) {
        (l.fuentes || []).forEach(function (f) {
          if (vistas[f.id]) return;
          vistas[f.id] = true;
          creditos.push({ f: f, lengua: l.nombre });
        });
      });
      creditos.sort(function (a, b) { return (a.f.tipo === "encuesta" ? 0 : 1) - (b.f.tipo === "encuesta" ? 0 : 1); });
      $("creditos").innerHTML = creditos.map(function (c) {
        var f = c.f;
        var nombre = f.enlace ? '<a href="' + esc(f.enlace) + '" target="_blank" rel="noopener">' + esc(f.nombre) + "</a>" : esc(f.nombre);
        var avatar = f.tipo === "publicacion" ? '<span class="avatar avatar--libro">' + LIBRO + "</span>" : '<span class="avatar">' + esc(f.nombre.charAt(0)) + "</span>";
        return '<li class="tarjeta">' + avatar + "<div><b>" + nombre + "</b><small>" + esc(c.lengua) + " · " +
          (f.tipo === "encuesta" ? esc(f.detalle) : "Obra publicada (" + esc(f.fecha) + ")") + "</small>" +
          (f.tipo === "publicacion" ? "<small><i>" + esc(f.detalle) + "</i></small>" : "") + "</div></li>";
      }).join("");
      anim().aparecer($("creditos").children);
    })
    .catch(function () { $("lenguas").innerHTML = "<p>No se pudo cargar el estado.</p>"; });

})();
