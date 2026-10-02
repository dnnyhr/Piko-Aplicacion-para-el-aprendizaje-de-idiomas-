/*
 * «Aportá tu lengua»: el estado de cada lengua, los créditos y las palabras en
 * revisión. Todo sale de datos/, que escribe `npm run contenido`.
 */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function cifra(n, texto) { return "<div><dt>" + texto + "</dt><dd>" + n + "</dd></div>"; }

  function lengua(l) {
    if (l.entradas == null) {
      return (
        '<div class="tarjeta lengua lengua--vacia"><h3>' + esc(l.nombre) + "</h3>" +
        '<p class="lengua__autonimo">' + (l.desde ? "Se enseña desde el " + esc(l.desde === "miq" ? "miskito" : l.desde) + ", con la app en miskito." : "Todavía sin palabras.") + "</p>" +
        (l.desde ? "" : '<p style="margin:0">¿La hablás? <a href="https://encuestas.piko.mugiware.com/e/tu-lengua" target="_blank" rel="noopener">Sé la primera persona en aportar</a>.</p>') +
        "</div>"
      );
    }
    var interfaz = "";
    if (l.interfaz) {
      var pct = l.interfaz.total ? Math.round((100 * l.interfaz.traducidos) / l.interfaz.total) : 0;
      interfaz =
        '<p style="margin:.9rem 0 0; font-size:.9rem">La app en ' + esc(l.autonimo || l.nombre) + ": " + l.interfaz.traducidos + " de " + l.interfaz.total + " textos traducidos" +
        '<span class="barra" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + Math.max(pct, 1) + '%"></span></span></p>';
    }
    var personas = l.fuentes.filter(function (f) { return f.tipo === "encuesta"; }).length;
    var obras = l.fuentes.filter(function (f) { return f.tipo === "publicacion"; }).length;
    var de = l.fuentes.length
      ? personas + (personas === 1 ? " hablante" : " hablantes") + (obras ? " y " + obras + (obras === 1 ? " obra publicada" : " obras publicadas") : "")
      : "Escrito por el equipo";
    return (
      '<div class="tarjeta lengua"><h3>' + esc(l.nombre) + "</h3>" +
      '<p class="lengua__autonimo">' + (l.autonimo ? esc(l.autonimo) + " · " : "") + esc(de) + "</p>" +
      '<dl class="cifras">' +
      cifra(l.entradas, "palabras y frases") +
      cifra(l.ejercicios, "ejercicios desde el español") +
      (l.al_espanol ? cifra(l.al_espanol, "ejercicios de español desde esta lengua") : "") +
      (l.por_revisar ? cifra(l.por_revisar, "en revisión") : "") +
      (l.dichas_por_varias_personas ? cifra(l.dichas_por_varias_personas, "dichas por dos personas o más") : "") +
      "</dl>" + interfaz +
      (l.diccionario ? '<p style="margin:.9rem 0 0"><a href="../diccionario/">Abrir el diccionario</a></p>' : "") +
      "</div>"
    );
  }

  fetch("../datos/estado.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      $("lenguas").innerHTML = d.lenguas.map(lengua).join("");
      var vistas = {};
      var creditos = [];
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
        return "<li><b>" + nombre + "</b><small>" + esc(c.lengua) + " · " + (f.tipo === "encuesta" ? esc(f.detalle) : "Obra publicada (" + esc(f.fecha) + ")") + "</small>" +
          (f.tipo === "publicacion" ? '<small><i>' + esc(f.detalle) + "</i></small>" : "") + "</li>";
      }).join("");
    })
    .catch(function () { $("lenguas").innerHTML = "<p>No se pudo cargar el estado.</p>"; });

  fetch("../datos/diccionario-miq.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      var dudas = d.entradas.filter(function (e) { return e.revisar; });
      $("revisar").innerHTML = dudas.map(function (e) {
        return '<li><a href="../diccionario/#' + encodeURIComponent(e.id) + '">' + esc(e.forma) + "</a> · " + esc(e.es) +
          " <span class=\"insignia\">Miskito</span><p>" + esc(e.revisar) + "</p></li>";
      }).join("");
    })
    .catch(function () { $("revisar").innerHTML = "<li>No se pudieron cargar las palabras.</li>"; });
})();
