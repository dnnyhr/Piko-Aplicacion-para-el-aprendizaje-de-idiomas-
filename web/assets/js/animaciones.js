/*
 * Movimiento de las páginas interiores, con GSAP (el mismo de la portada).
 *
 *   <div class="cabeza__escena" data-escena></div>   el paisaje animado del encabezado
 *   data-aparece                                     entra al llegar con el scroll
 *   data-aparece="grupo"                             sus hijos entran uno tras otro
 *   data-contar="269"                                cuenta desde 0 al verse
 *   data-barra="62"                                  una barra que se llena hasta ese %
 *
 * Todo se ve igual sin JavaScript o con «reducir movimiento»: las animaciones
 * sólo parten de un estado oculto si GSAP está y el movimiento está permitido.
 * Las páginas que dibujan contenido después (el diccionario) llaman a
 * `PikoAnim.aparecer(nodos)` y `PikoAnim.contar(raiz)`.
 */
(function () {
  "use strict";

  var quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animar = !!(window.gsap && window.ScrollTrigger) && !quieto;
  // La ruta hasta web/ ("../" en las páginas interiores), en <body data-raiz>.
  var raiz = document.body.getAttribute("data-raiz") || "";

  if (animar) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: "power3.out" });
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /** Lo que se repite sin fin sólo corre mientras se ve. */
  function enPausaFuera(tweens, disparador) {
    if (!tweens.length || !disparador) return;
    ScrollTrigger.create({
      trigger: disparador, start: "top bottom", end: "bottom top",
      onToggle: function (st) { tweens.forEach(function (t) { st.isActive ? t.resume() : t.pause(); }); },
    });
  }

  /* ---------- El paisaje del encabezado ---------- */
  var lugar = document.querySelector("[data-escena]");
  function capa(nombre) { return lugar ? lugar.querySelector("[id='" + nombre + "']") : null; }

  function animarEscena() {
    var entrada = gsap.timeline({ defaults: { duration: 1.2 } });
    var nubes = [capa("Cumulo de nubes"), capa("Nube")];
    if (nubes[0]) entrada.from(nubes[0], { x: -70, opacity: 0, duration: 1.8, ease: "power2.out" }, 0);
    if (nubes[1]) entrada.from(nubes[1], { x: 70, opacity: 0, duration: 1.8, ease: "power2.out" }, 0);
    [["Volvan", .1, .94], ["Vapor de volcan", .35, .6], ["Bosque", .15, .9], ["Arbustos", .3, .88]].forEach(function (c) {
      var el = capa(c[0]);
      if (el) entrada.from(el, { opacity: 0, scaleY: c[2], transformOrigin: "50% 100%" }, c[1]);
    });
    entrada.eventCallback("onComplete", function () {
      var bucles = [];
      if (nubes[0]) bucles.push(gsap.to(nubes[0], { x: 34, duration: 16, ease: "sine.inOut", repeat: -1, yoyo: true }));
      if (nubes[1]) bucles.push(gsap.to(nubes[1], { x: -26, duration: 13, ease: "sine.inOut", repeat: -1, yoyo: true }));
      var vapor = capa("Vapor de volcan");
      if (vapor) bucles.push(gsap.to(vapor, { opacity: .6, x: 8, duration: 4.5, ease: "sine.inOut", repeat: -1, yoyo: true }));
      enPausaFuera(bucles, lugar.closest(".cabeza"));
    });
    // Parallax suave: cada capa a su ritmo al bajar.
    var cabeza = lugar.closest(".cabeza");
    [["Cumulo de nubes", 70], ["Nube", 55], ["Vapor de volcan", 40], ["Volvan", 22], ["Bosque", -10], ["Arbustos", -18]].forEach(function (p) {
      var el = capa(p[0]);
      if (el) gsap.to(el, { y: p[1], ease: "none", scrollTrigger: { trigger: cabeza, start: "top top", end: "bottom top", scrub: .5 } });
    });
  }

  if (lugar) {
    fetch(raiz + "assets/img/escena.svg")
      .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
      .then(function (svg) {
        lugar.innerHTML = svg;
        var dibujo = lugar.querySelector("svg");
        if (dibujo) { dibujo.setAttribute("aria-hidden", "true"); dibujo.setAttribute("focusable", "false"); }
        if (animar) animarEscena();
      })
      .catch(function () { /* queda el degradado de cielo y pasto */ });
  }

  /* ---------- Entrada del encabezado ---------- */
  if (animar && document.querySelector(".cabeza")) {
    var t = gsap.timeline({ delay: .1 });
    t.from(".cabeza .etiqueta", { y: 16, opacity: 0, duration: .6 })
      .from(".cabeza h1", { y: 30, opacity: 0, duration: .9 }, "-=.35")
      .from(".cabeza__bajada", { y: 22, opacity: 0, duration: .8 }, "-=.6")
      .from(".cabeza [data-entra]", { y: 20, opacity: 0, duration: .65, stagger: .09 }, "-=.5");
    var piko = document.querySelector(".cabeza__piko");
    if (piko) {
      t.from(piko, { y: 90, opacity: 0, rotate: -6, duration: 1.1, ease: "back.out(1.5)" }, .35);
      t.eventCallback("onComplete", function () {
        enPausaFuera([gsap.to(piko, { yPercent: -4, rotate: 1.5, duration: 2.4, ease: "sine.inOut", repeat: -1, yoyo: true })], piko.closest(".cabeza") || piko);
      });
      // Piko saluda si le pasan el mouse.
      piko.addEventListener("mouseenter", function () {
        gsap.fromTo(piko, { rotate: 0 }, { keyframes: [{ rotate: -8 }, { rotate: 6 }, { rotate: -4 }, { rotate: 0 }], duration: .7, ease: "sine.inOut" });
      });
    }
    var parallaxTexto = document.querySelector(".cabeza__texto");
    if (parallaxTexto) gsap.to(parallaxTexto, { y: -30, ease: "none", scrollTrigger: { trigger: ".cabeza", start: "top top", end: "bottom top", scrub: .5 } });
  }

  /* ---------- Apariciones y contadores ---------- */
  /**
   * Hace entrar los nodos cuando llegan a la pantalla. Usa un solo
   * IntersectionObserver (no un ScrollTrigger por nodo: el diccionario dibuja
   * 251 tarjetas en cada búsqueda). Devuelve algo con `kill()` para descartarlo.
   */
  function aparecer(nodos, opciones) {
    if (!animar || !nodos || !nodos.length || !("IntersectionObserver" in window)) return [];
    var o = opciones || {};
    var lista = Array.prototype.slice.call(nodos);
    gsap.set(lista, { opacity: 0, y: o.y || 34 });
    var cola = [], pendiente = false;
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { if (e.isIntersecting) { cola.push(e.target); io.unobserve(e.target); } });
      if (cola.length && !pendiente) {
        pendiente = true;
        requestAnimationFrame(function () {
          gsap.to(cola, { opacity: 1, y: 0, duration: o.duracion || .7, stagger: o.stagger || .08, overwrite: true, clearProps: "transform" });
          cola = []; pendiente = false;
        });
      }
    }, { rootMargin: "0px 0px -6% 0px" });
    lista.forEach(function (n) { io.observe(n); });
    return [{ kill: function () { io.disconnect(); } }];
  }

  function contar(raizNodo) {
    var nodos = (raizNodo || document).querySelectorAll("[data-contar]");
    Array.prototype.forEach.call(nodos, function (el) {
      var fin = parseFloat(el.getAttribute("data-contar"));
      if (isNaN(fin)) return;
      if (!animar) { el.textContent = fin.toLocaleString("es"); return; }
      var reloj = { v: 0 };
      el.textContent = "0";
      gsap.to(reloj, {
        v: fin, duration: 1.5, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 95%", once: true },
        onUpdate: function () { el.textContent = Math.round(reloj.v).toLocaleString("es"); },
      });
    });
    var barras = (raizNodo || document).querySelectorAll("[data-barra]");
    Array.prototype.forEach.call(barras, function (el) {
      var pct = Math.max(1.5, parseFloat(el.getAttribute("data-barra")) || 0);
      if (!animar) { el.style.width = pct + "%"; return; }
      gsap.fromTo(el, { width: "0%" }, { width: pct + "%", duration: 1.4, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 95%", once: true } });
    });
  }

  aparecer(document.querySelectorAll("[data-aparece]:not([data-aparece='grupo'])"));
  Array.prototype.forEach.call(document.querySelectorAll("[data-aparece='grupo']"), function (g) { aparecer(g.children, { stagger: .1 }); });
  contar(document);

  // Las fuentes y la escena cambian el alto de la página: volver a medir.
  if (animar) {
    var medir = function () { ScrollTrigger.refresh(); };
    window.addEventListener("load", function () { setTimeout(medir, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
  }

  window.PikoAnim = { animar: animar, aparecer: aparecer, contar: contar };
})();
