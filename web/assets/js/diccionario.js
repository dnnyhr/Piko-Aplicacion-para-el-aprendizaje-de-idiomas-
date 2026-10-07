/*
 * El diccionario consultable. Lee datos/diccionario-miq.json, que escribe
 * `npm run contenido` a partir de diccionario/miskito/; acá no se edita nada.
 * Sólo trae las palabras confirmadas, y las variantes (cómo la escribió cada
 * persona, si cambia entre Raiti y Bilwi, otras palabras con la misma
 * traducción) ya calculadas. Todo en palabras simples: lo técnico (reglas,
 * glosas) está en diccionario/miskito/ para quien estudia la lengua.
 */
(function () {
  "use strict";

  var TEMAS = {
    saludos: ["Saludos", "#60C5FA"], frases: ["Frases", "#9C88C9"], familia: ["Familia", "#E97927"],
    cuerpo: ["Cuerpo", "#E8A429"], numeros: ["Números", "#97C137"], colores: ["Colores", "#E05D8B"],
    animales: ["Animales", "#61A66B"], comida: ["Comida", "#F2892F"], naturaleza: ["Naturaleza", "#327945"],
    casa: ["Casa", "#B07A4F"], escuela: ["Escuela", "#3D8FD1"], acciones: ["Acciones", "#0F5D3D"],
    cualidades: ["Cómo es", "#C46BB0"], tiempo: ["Tiempo", "#5AB4C5"], gramatica: ["Palabras de enlace", "#7C8B82"]
  };
  var I = {
    sistemas: '<path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4z"/>',
    region: '<path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>',
    hablantes: '<path d="M8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm8 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM1 20c0-3.3 3.1-6 7-6s7 2.7 7 6H1zm15 0c0-2-.8-3.8-2.1-5.1.7-.2 1.4-.3 2.1-.3 3.3 0 6 2.4 6 5.4H16z"/>',
    escrituras: '<path d="m15.2 3.8 5 5L9 20H4v-5L15.2 3.8zm0 2.8L6 15.8V18h2.2l9.2-9.2-2.2-2.2z"/>',
    sinonimo: '<path d="M7 7h11l-3-3 1.4-1.4L21.8 8l-5.4 5.4L15 12l3-3H7V7zm10 10H6l3 3-1.4 1.4L2.2 16l5.4-5.4L9 12l-3 3h11v2z"/>',
    libro: '<path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm0 16a1 1 0 0 0 0 2h12v-2H6z"/>',
    enlace: '<path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a3 3 0 0 1 4.2 4.2l-2 2-1.4-1.4 2-2a1 1 0 0 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0zm2.8-2.8a1 1 0 0 1 0 1.4L9.9 15.5a3 3 0 0 1-4.2-4.2l2-2 1.4 1.4-2 2a1 1 0 0 0 1.4 1.4l3.5-3.5a1 1 0 0 1 1.4 0z"/>',
    voz: '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/>'
  };
  var VARIANTES = {
    sistemas: { corto: "Dos formas de contar", largo: "Del 6 al 10 se puede contar de dos maneras: desde el seis, como Teacher Smith, o desde el cinco, como Tangni. Las dos están bien." },
    region: { corto: "Cambia según el lugar", largo: "En Raiti (Río Coco) y en Bilwi (la costa) se dice o se escribe distinto." },
    hablantes: { corto: "Cada persona la dice distinto", largo: "Teacher Smith y Tangni, las dos personas de Raiti que nos enseñaron, la dijeron de forma diferente." },
    escrituras: { corto: "Se escribe de varias formas", largo: "El miskito no tiene una sola forma de escribirse. Todas valen." },
    sinonimo: { corto: "Tiene otra palabra", largo: "Hay otra palabra que quiere decir lo mismo." }
  };

  var datos = null;
  var PASO = 48;      // tarjetas que se dibujan de una vez; el resto, con «Ver más»
  var limite = PASO;
  var actual = [];    // la lista filtrada, en orden
  var tema = "";
  var variante = "";
  var animadas = [];
  var $ = function (id) { return document.getElementById(id); };
  var anim = function () { return window.PikoAnim || { animar: false, aparecer: function () { return []; }, contar: function () {} }; };

  /** Para buscar: sin mayúsculas, sin tildes ni circunflejos, y la h no cuenta. */
  function llano(t) {
    return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/h/g, "");
  }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function icono(nombre) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + I[nombre] + "</svg>"; }

  // ---------- Voz ----------
  var voz = null;
  function elegirVoz() {
    if (!("speechSynthesis" in window)) return;
    var todas = speechSynthesis.getVoices();
    voz = todas.find(function (v) { return /^es[-_](US|MX|419)/i.test(v.lang); }) ||
      todas.find(function (v) { return /^es/i.test(v.lang); }) || null;
  }
  if ("speechSynthesis" in window) { elegirVoz(); speechSynthesis.onvoiceschanged = elegirVoz; }
  function decir(texto, boton) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(texto);
    u.lang = voz ? voz.lang : "es-US";
    if (voz) u.voice = voz;
    u.rate = .85;
    if (boton) {
      boton.classList.add("escuchar--sonando");
      var listo = function () { boton.classList.remove("escuchar--sonando"); };
      u.onend = listo; u.onerror = listo; setTimeout(listo, 4000);
    }
    speechSynthesis.speak(u);
  }

  // ---------- Tarjetas ----------
  function fuente(id) { return datos.fuentes.find(function (x) { return x.id === id; }); }
  function fuenteCorta(id) {
    var f = fuente(id);
    if (!f) return esc(id);
    return esc(f.tipo === "publicacion" ? f.nombre.split(" ").filter(function (p) { return !/\.$/.test(p); }).slice(-1)[0] + " (" + f.fecha + ")" : f.nombre);
  }

  function insigniaVariante(tipo, e) {
    var v = VARIANTES[tipo];
    return '<span class="insignia insignia--' + tipo + '" title="' + esc(v.largo) + '">' + icono(tipo) + esc(v.corto) + "</span>";
  }

  function insignias(e, conTema) {
    var h = [];
    if (e.variantes) e.variantes.etiquetas.forEach(function (t) { h.push(insigniaVariante(t, e)); });
    if (conTema) h.push('<span class="insignia">' + esc((TEMAS[e.tema] || [e.tema])[0]) + "</span>");
    return h.length ? '<div class="palabra__insignias">' + h.join("") + "</div>" : "";
  }

  function botonVoz(e) {
    return '<button class="escuchar" type="button" data-voz="' + esc(e.voz) + '" aria-label="Escuchar «' + esc(e.forma) + '»">' + icono("voz") + "</button>";
  }

  function quienes(e) {
    return e.fuentes.map(function (id) {
      var f = fuente(id);
      if (!f) return "";
      return f.tipo === "publicacion" ? "el diccionario de " + fuenteCorta(id) : esc(f.nombre) + " (" + esc(f.detalle.split(",")[1] ? f.detalle.split(",")[1].trim() : f.detalle) + ")";
    }).filter(Boolean).join(", ");
  }

  function detalle(e) {
    var det = [];
    det.push("<dt>Quién la enseñó</dt><dd>" + quienes(e) + "</dd>");
    if (e.variantes && e.variantes.escrituras) {
      det.push('<dt>Formas de escribirla</dt><dd class="formas">' + e.variantes.escrituras.map(function (x) {
        return '<span class="forma-chip"><i lang="miq">' + esc(x.forma) + "</i>" + (x.quien.length ? " <small>· " + esc(x.quien.join(", ")) + "</small>" : "") + "</span>";
      }).join("") + "</dd>");
    }
    if (e.variantes && e.variantes.otras) {
      det.push('<dt>También se dice</dt><dd class="formas">' + e.variantes.otras.map(function (x) {
        return '<a class="forma-chip" href="#' + esc(x.id) + '" data-ir="' + esc(x.id) + '"><i lang="miq">' + esc(x.forma) + "</i> <small>· " + esc(x.quien.join(", ")) + "</small></a>";
      }).join("") + "</dd>");
    }
    if (e.viene_de) det.push("<dt>De dónde viene</dt><dd>Del " + esc(e.viene_de.lengua) + ": <i>" + esc(e.viene_de.palabra) + "</i></dd>");
    return '<details><summary>Más sobre esta palabra</summary><dl class="detalle">' + det.join("") + "</dl>" +
      '<button class="compartir" type="button" data-compartir="' + esc(e.id) + '" data-forma="' + esc(e.forma) + '">' + icono("enlace") + "<span>Compartir esta palabra</span></button></details>";
  }

  function tarjeta(e) {
    var t = TEMAS[e.tema] || [e.tema, "#97C137"];
    return (
      '<article class="palabra" id="' + esc(e.id) + '" style="--tema:' + t[1] + '">' +
      '<div class="palabra__tope"><span class="palabra__tema"><i></i>' + esc(t[0]) + "</span></div>" +
      '<div class="palabra__fila"><h3 class="palabra__forma" lang="miq">' + esc(e.forma) + "</h3>" + botonVoz(e) + "</div>" +
      '<p class="palabra__es">' + esc(e.es) + "</p>" +
      insignias(e, false) +
      detalle(e) +
      "</article>"
    );
  }

  // ---------- Palabra del día ----------
  function destacada() {
    // Una palabra dicha por alguien de Raiti, corta, para el día.
    var buenas = datos.entradas.filter(function (e) {
      return e.forma.length < 22 && e.fuentes.some(function (id) { var f = fuente(id); return f && f.tipo === "encuesta"; });
    });
    if (!buenas.length) return;
    var hoy = new Date();
    var dia = Math.floor((hoy - new Date(hoy.getFullYear(), 0, 0)) / 864e5);
    var e = buenas[(dia * 7919) % buenas.length];
    $("destacada").innerHTML =
      '<div><p class="destacada__etiqueta">Palabra del día</p>' +
      '<p class="destacada__forma" lang="miq">' + esc(e.forma) + "</p>" +
      '<p class="destacada__es">' + esc(e.es) + "</p>" + insignias(e, true) + "</div>" +
      '<div class="destacada__acciones">' + botonVoz(e) + '<a href="#' + esc(e.id) + '" data-ir="' + esc(e.id) + '">Ver todo sobre ella</a></div>';
    $("destacada").hidden = false;
    if (anim().animar) {
      gsap.from("#destacada", { y: 40, opacity: 0, duration: .9, delay: .3 });
      gsap.from("#destacada .destacada__forma", { scale: .85, opacity: 0, duration: .9, delay: .5, ease: "back.out(1.6)" });
    }
  }

  // ---------- Búsqueda y filtros ----------
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
    return 0;
  }

  function mostrar() {
    var q = llano($("q").value.trim());
    var lista = datos.entradas
      .filter(function (e) {
        if (tema && e.tema !== tema) return false;
        if (variante === "cualquiera" && !e.variantes) return false;
        if (variante && variante !== "cualquiera" && !(e.variantes && e.variantes.etiquetas.indexOf(variante) >= 0)) return false;
        return true;
      })
      .map(function (e) { return { e: e, p: puntaje(e, q) }; })
      .filter(function (x) { return x.p > 0; });
    lista.sort(function (a, b) { return (q ? b.p - a.p : 0) || a.e.forma.localeCompare(b.e.forma, "es"); });

    $("destacada").hidden = !!(q || tema || variante) || !$("destacada").innerHTML;
    actual = lista.map(function (x) { return x.e; });
    limite = PASO;
    $("palabras").innerHTML = lista.length
      ? actual.slice(0, limite).map(tarjeta).join("") + botonMas()
      : '<div class="vacio"><img src="../assets/img/piko.svg" alt="" width="110" height="180">No encontramos «' + esc($("q").value) + '». Probá en español o en miskito, o con otra forma de escribirla.<br>¿La conocés? <a href="../aporta/">Aportala</a>.</div>';
    var total = datos.entradas.length;
    $("cuenta").innerHTML = lista.length === total ? "<b>" + total + "</b> palabras y frases" : "<b>" + lista.length + "</b> de " + total + " palabras y frases";
    var info = $("info");
    var filtrado = !!(q || tema || variante);
    info.hidden = !filtrado;
    info.textContent = lista.length === 1 ? "1 palabra" : lista.length + " palabras";
    animadas.forEach(function (t) { t.kill(); });
    animadas = anim().aparecer($("palabras").children, { stagger: .04, duracion: .5, y: 24 });
  }

  /** «Ver más»: cuántas quedan sin dibujar. */
  function botonMas() {
    var quedan = actual.length - limite;
    return quedan > 0
      ? '<button class="ver-mas" type="button" id="ver-mas">Ver ' + Math.min(PASO, quedan) + " más <small>(quedan " + quedan + ")</small></button>"
      : "";
  }

  /** Dibuja más tarjetas, hasta `hasta` (o una tanda más). */
  function dibujarMas(hasta) {
    var desde = limite;
    limite = Math.max(hasta || 0, limite + PASO);
    var boton = $("ver-mas");
    if (boton) boton.remove();
    $("palabras").insertAdjacentHTML("beforeend", actual.slice(desde, limite).map(tarjeta).join("") + botonMas());
    var nuevas = Array.prototype.slice.call($("palabras").children, desde, limite);
    animadas = animadas.concat(anim().aparecer(nuevas, { stagger: .03, duracion: .45, y: 18 }) || []);
  }

  /** Compartir el enlace de una palabra: el menú del teléfono, o copiarlo. */
  function compartir(boton) {
    var url = location.origin + location.pathname + "#" + boton.getAttribute("data-compartir");
    var texto = boton.querySelector("span");
    var aviso = function (m) {
      texto.textContent = m;
      setTimeout(function () { texto.textContent = "Compartir esta palabra"; }, 2200);
    };
    var copiar = function () {
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { aviso("Enlace copiado"); }, function () { aviso(url); });
      else aviso(url);
    };
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      // Si la persona cierra el menú (AbortError) no pasa nada; si falla, se copia.
      navigator.share({ title: boton.getAttribute("data-forma") + " · Diccionario miskito de Piko", url: url })
        .catch(function (e) { if (!e || e.name !== "AbortError") copiar(); });
    } else {
      copiar();
    }
  }

  function chip(atributos, texto, activo, icon) {
    return '<button class="filtro" type="button" ' + atributos + ' aria-pressed="' + activo + '">' + (icon ? icono(icon) : "") + texto + "</button>";
  }

  function filtros() {
    var cuenta = {}, porVariante = { cualquiera: 0 };
    datos.entradas.forEach(function (e) {
      cuenta[e.tema] = (cuenta[e.tema] || 0) + 1;
      if (e.variantes) {
        porVariante.cualquiera++;
        e.variantes.etiquetas.forEach(function (t) { porVariante[t] = (porVariante[t] || 0) + 1; });
      }
    });
    var temas = Object.keys(TEMAS).filter(function (t) { return cuenta[t]; });
    Object.keys(cuenta).forEach(function (t) { if (temas.indexOf(t) < 0) temas.push(t); });
    $("filtros").innerHTML = '<span class="filtros__nombre">Tema</span>' +
      chip('data-tema=""', "Todo", true) +
      temas.map(function (t) { return chip('data-tema="' + esc(t) + '"', esc((TEMAS[t] || [t])[0]) + " <small>" + cuenta[t] + "</small>", false); }).join("");
    $("filtros-variantes").innerHTML = '<span class="filtros__nombre">Variantes</span>' +
      chip('data-variante=""', "Todas", true) +
      chip('data-variante="cualquiera"', "Con alguna variante <small>" + porVariante.cualquiera + "</small>", false) +
      ["sistemas", "region", "hablantes", "escrituras", "sinonimo"].filter(function (t) { return porVariante[t]; }).map(function (t) {
        return chip('data-variante="' + t + '"', esc(VARIANTES[t].corto) + " <small>" + porVariante[t] + "</small>", false, t);
      }).join("");
  }

  function leyenda() {
    var cuenta = {};
    datos.entradas.forEach(function (e) { if (e.variantes) e.variantes.etiquetas.forEach(function (t) { cuenta[t] = (cuenta[t] || 0) + 1; }); });
    $("leyenda").innerHTML = ["sistemas", "region", "hablantes", "escrituras", "sinonimo"].filter(function (t) { return cuenta[t]; }).map(function (t) {
      var v = VARIANTES[t];
      return '<div class="tarjeta tarjeta--viva"><span class="insignia insignia--' + t + '">' + icono(t) + esc(v.corto) + "</span>" +
        "<p>" + esc(v.largo) + "</p>" +
        '<button type="button" data-ver-variante="' + t + '">Ver las ' + cuenta[t] + " palabras</button></div>";
    }).join("");
    anim().aparecer($("leyenda").children);
  }

  function fuentes() {
    $("fuentes").innerHTML = datos.fuentes.map(function (f) {
      var n = datos.entradas.filter(function (e) { return e.fuentes.indexOf(f.id) >= 0; }).length;
      var nombre = f.enlace ? '<a href="' + esc(f.enlace) + '" target="_blank" rel="noopener">' + esc(f.nombre) + "</a>" : esc(f.nombre);
      var inicial = f.tipo === "publicacion" ? icono("libro").replace("<svg", '<svg width="22" height="22" fill="#fff"') : esc(f.nombre.charAt(0));
      return '<li class="tarjeta"><span class="avatar' + (f.tipo === "publicacion" ? " avatar--libro" : "") + '">' + inicial + "</span>" +
        "<div><b>" + nombre + "</b>" + (f.fecha ? " · " + esc(f.fecha.slice(0, 4)) : "") +
        "<small>" + esc(f.detalle) + "</small><small><b style=\"font-size:.9rem\">" + n + "</b> palabras</small></div></li>";
    }).join("");
    anim().aparecer($("fuentes").children);
  }

  function cifras() {
    var conVariantes = datos.entradas.filter(function (e) { return e.variantes; }).length;
    [["n-palabras", datos.entradas.length], ["n-variantes", conVariantes], ["n-fuentes", datos.fuentes.length]].forEach(function (c) {
      var el = $(c[0]);
      if (el && el.getAttribute("data-contar") !== String(c[1])) { el.setAttribute("data-contar", c[1]); el.textContent = c[1]; }
    });
  }

  /** Las correcciones pendientes del último salto a una palabra. */
  var correcciones = [];
  function cancelarCorrecciones() {
    correcciones.forEach(clearTimeout);
    correcciones = [];
  }
  // Si la persona se mueve por su cuenta, el salto ya no la reubica.
  ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (ev) {
    window.addEventListener(ev, cancelarCorrecciones, { passive: true });
  });

  function ir(id) {
    cancelarCorrecciones();
    var el = document.getElementById(id);
    var donde = function () { return actual.findIndex(function (e) { return e.id === id; }); };
    if (!el && donde() < 0) {
      // Puede estar oculta por un filtro: se limpian y se vuelve a dibujar.
      $("q").value = ""; tema = ""; variante = ""; filtros(); mostrar();
    }
    if (!document.getElementById(id) && donde() >= 0) dibujarMas(donde() + 1); // todavía sin dibujar
    el = document.getElementById(id);
    if (!el) return;
    history.replaceState(null, "", "#" + id);
    var d = el.querySelector("details"); if (d) d.open = true;
    // Las tarjetas lejanas no se dibujan hasta acercarse (content-visibility) y
    // cambian de alto al hacerlo: se salta sin animación y se corrige al llegar.
    el.scrollIntoView({ block: "start" });
    correcciones = [80, 250, 600].map(function (ms) {
      return setTimeout(function () {
        var arriba = el.getBoundingClientRect().top;
        var margen = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        if (Math.abs(arriba - margen) > 4) el.scrollIntoView({ block: "start" });
      }, ms);
    });
    el.classList.add("palabra--brilla");
    setTimeout(function () { el.classList.remove("palabra--brilla"); }, 1800);
  }

  // ---------- El buscador: chico, y se abre al tocarlo ----------
  var panel = $("panel");
  var mas = $("panel-mas");
  var conGsap = function () { return anim().animar && window.gsap; };
  var animando = null;

  /** Una onda de luz desde donde se tocó el vidrio. */
  function onda(ev) {
    if (!conGsap() || !ev || ev.clientX == null) return;
    var r = panel.getBoundingClientRect();
    var o = document.createElement("span");
    o.className = "onda";
    o.style.left = (ev.clientX - r.left) + "px";
    o.style.top = (ev.clientY - r.top) + "px";
    panel.appendChild(o);
    gsap.fromTo(o, { scale: 0, opacity: 1 }, { scale: 40, opacity: 0, duration: .9, ease: "power2.out", onComplete: function () { o.remove(); } });
  }

  function abrir() {
    if (panel.classList.contains("panel--abierto")) return;
    ultimoY = window.scrollY;
    mas.removeAttribute("inert");
    $("q").setAttribute("aria-expanded", "true");
    if (!conGsap()) { panel.classList.add("panel--abierto"); return; }
    if (animando) animando.kill();
    var antes = panel.getBoundingClientRect().width;
    panel.classList.add("panel--abierto");
    var despues = panel.getBoundingClientRect().width;
    var chips = mas.querySelectorAll(".filtro, .filtros__nombre, .cuenta");
    animando = gsap.timeline({ onComplete: function () { gsap.set(panel, { clearProps: "width" }); animando = null; } })
      .fromTo(panel, { width: antes }, { width: despues, duration: .7, ease: "elastic.out(1, .75)" }, 0)
      .fromTo(panel, { scaleY: .94 }, { scaleY: 1, duration: .6, ease: "elastic.out(1.1, .5)", transformOrigin: "50% 0%" }, 0)
      .fromTo(mas, { height: 0 }, { height: "auto", duration: .55, ease: "power3.out" }, .08)
      .fromTo(chips, { y: 10, opacity: 0, scale: .9 }, { y: 0, opacity: 1, scale: 1, duration: .45, stagger: .018, ease: "back.out(2)", clearProps: "transform,opacity" }, .18)
      .fromTo(panel.querySelector(".brillo"), { xPercent: -120, opacity: 1 }, { xPercent: 260, opacity: 0, duration: .9, ease: "power2.inOut" }, .05);
  }

  function cerrar() {
    if (!panel.classList.contains("panel--abierto")) return;
    mas.setAttribute("inert", "");
    $("q").setAttribute("aria-expanded", "false");
    if (!conGsap()) { panel.classList.remove("panel--abierto"); return; }
    if (animando) animando.kill();
    var antes = panel.getBoundingClientRect().width;
    animando = gsap.timeline({ onComplete: function () {
      panel.classList.remove("panel--abierto");
      var despues = panel.getBoundingClientRect().width;
      gsap.fromTo(panel, { width: antes }, { width: despues, duration: .5, ease: "power3.inOut", clearProps: "width" });
      animando = null;
    } })
      .to(mas.querySelectorAll(".filtro, .filtros__nombre, .cuenta"), { opacity: 0, y: -6, duration: .18, stagger: .006, ease: "power1.in" }, 0)
      .to(mas, { height: 0, duration: .35, ease: "power3.inOut" }, .1)
      .set(mas.querySelectorAll(".filtro, .filtros__nombre, .cuenta"), { clearProps: "transform,opacity" });
  }

  if (conGsap()) { panel.classList.add("panel--gsap"); gsap.set(mas, { height: 0 }); }
  panel.addEventListener("focusin", abrir);
  panel.addEventListener("pointerdown", onda);
  panel.addEventListener("click", abrir);
  document.addEventListener("click", function (ev) {
    if (!panel.contains(ev.target) && !ev.target.closest("[data-ver-variante]")) cerrar();
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && panel.classList.contains("panel--abierto")) { cerrar(); $("q").blur(); }
  });
  // Al bajar por los resultados, el buscador vuelve a ser chico.
  var ultimoY = window.scrollY;
  var sinCerrarHasta = 0; // mientras la página baja sola hasta el buscador
  window.addEventListener("scroll", function () {
    if (Date.now() < sinCerrarHasta) { ultimoY = window.scrollY; return; }
    if (Math.abs(window.scrollY - ultimoY) > 160 && document.activeElement !== $("q")) cerrar();
    if (!panel.classList.contains("panel--abierto")) ultimoY = window.scrollY;
  }, { passive: true });

  // ---------- Eventos ----------
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest(".filtro");
    if (b) {
      if (b.hasAttribute("data-tema")) {
        tema = b.getAttribute("data-tema");
        document.querySelectorAll(".filtro[data-tema]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      } else if (b.hasAttribute("data-variante")) {
        variante = b.getAttribute("data-variante");
        document.querySelectorAll(".filtro[data-variante]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      }
      return mostrar();
    }
    if (ev.target.closest("#ver-mas")) return dibujarMas();
    var c = ev.target.closest("[data-compartir]");
    if (c) return compartir(c);
    var v = ev.target.closest(".escuchar");
    if (v) return decir(v.getAttribute("data-voz"), v);
    var a = ev.target.closest("[data-ir]");
    if (a) { ev.preventDefault(); return ir(a.getAttribute("data-ir")); }
    var l = ev.target.closest("[data-ver-variante]");
    if (l) {
      variante = l.getAttribute("data-ver-variante");
      document.querySelectorAll(".filtro[data-variante]").forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-variante") === variante)); });
      mostrar();
      abrir();
      sinCerrarHasta = Date.now() + 1500;
      $("panel").scrollIntoView({ behavior: anim().animar ? "smooth" : "auto", block: "start" });
    }
  });
  // Un enlace a otra palabra (#id) con la página ya abierta.
  window.addEventListener("hashchange", function () {
    if (datos && location.hash) ir(decodeURIComponent(location.hash.slice(1)));
  });
  var espera;
  $("q").addEventListener("input", function () { clearTimeout(espera); espera = setTimeout(mostrar, 140); });
  $("azar").addEventListener("click", function () {
    var e = datos.entradas[Math.floor(Math.random() * datos.entradas.length)];
    $("q").value = e.forma; mostrar();
    var el = document.getElementById(e.id); if (el) { var d = el.querySelector("details"); if (d) d.open = true; }
  });

  fetch("../datos/diccionario-miq.json")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) {
      datos = d;
      var buscado = new URLSearchParams(location.search).get("q");
      if (buscado) $("q").value = buscado;
      cifras();
      filtros();
      destacada();
      leyenda();
      fuentes();
      mostrar();
      if (location.hash) setTimeout(function () { ir(decodeURIComponent(location.hash.slice(1))); }, 200);
    })
    .catch(function () {
      $("palabras").insertAdjacentHTML("afterbegin", '<p class="vacio">No se pudo cargar el buscador. Abajo está la lista de palabras.</p>');
    });
})();
