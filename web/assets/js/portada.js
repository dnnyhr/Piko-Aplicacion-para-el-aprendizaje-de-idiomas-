/* Animaciones y datos vivos de la portada (index.html). */
(function(){
  "use strict";

  var quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var animar = !!(window.gsap && window.ScrollTrigger) && !quieto;

  /* ============================================================
     1. Animaciones
     ============================================================ */
  if (animar) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ease:"power3.out"});
    /* En el teléfono la barra del navegador aparece y desaparece al hacer scroll:
       sin esto cada cambio de alto recalcula todo y el parallax da saltos. */
    ScrollTrigger.config({ignoreMobileResize:true});

    var capa = function(nombre){ return ".escena [id='" + nombre + "']"; };

    /* ---- Entrada del hero: primero el paisaje, después el texto ---- */
    var entrada = gsap.timeline({defaults:{duration:.9}});
    entrada
      .from(capa("Cumulo de nubes"), {x:-80, opacity:0, duration:1.8, ease:"power2.out"}, 0)
      .from(capa("Nube"),            {x:80,  opacity:0, duration:1.8, ease:"power2.out"}, 0)
      .from(capa("Volvan"),          {opacity:0, scaleY:.94, transformOrigin:"50% 100%", duration:1.4}, .1)
      .from(capa("Vapor de volcan"), {opacity:0, scaleY:.6,  transformOrigin:"50% 100%", duration:1.4}, .35)
      .from(capa("Bosque"),          {opacity:0, scaleY:.9,  transformOrigin:"50% 100%", duration:1.3}, .15)
      .from(capa("Arbustos"),        {opacity:0, scaleY:.88, transformOrigin:"50% 100%", duration:1.2}, .3)
      .from(".hero .eyebrow",  {y:18, opacity:0, duration:.7}, .2)
      .from(".marca",          {y:26, opacity:0, duration:.9}, .35)
      .from(".hero h1",        {y:32, opacity:0}, .5)
      .from(".hero__bajada",   {y:24, opacity:0, duration:.8}, .65)
      .from(".lenguas li",     {y:16, opacity:0, scale:.9, duration:.55, stagger:.07}, .8)
      .from(".hero__texto .acciones .btn", {y:18, opacity:0, duration:.6, stagger:.09}, 1)
      .from(".hero__piko .piko-fig", {y:80, opacity:0, duration:1.2, ease:"back.out(1.4)"}, .55);

    /* ---- Vida propia: arranca cuando la entrada termina, para no pelearse con ella ---- */
    entrada.eventCallback("onComplete", function(){
      gsap.to(capa("Cumulo de nubes"), {x:36,  duration:16, ease:"sine.inOut", repeat:-1, yoyo:true});
      gsap.to(capa("Nube"),            {x:-28, duration:13, ease:"sine.inOut", repeat:-1, yoyo:true});
      gsap.to(capa("Vapor de volcan"), {opacity:.6, x:8, duration:4.5, ease:"sine.inOut", repeat:-1, yoyo:true});
      gsap.to(".hero__piko .piko-fig", {yPercent:-4, duration:2.4, ease:"sine.inOut", repeat:-1, yoyo:true});
    });

    /* ---- Parallax del paisaje: cada capa a su ritmo ---- */
    var scrubHero = function(){
      return {trigger:".hero", start:"top top", end:"bottom top", scrub:.5};
    };
    var parallax = [
      [capa("Cumulo de nubes"),  90],
      [capa("Nube"),             75],
      [capa("Vapor de volcan"),  55],
      [capa("Volvan"),           30],
      [capa("Bosque"),          -18],
      [capa("Arbustos"),        -28],
      [capa("Suelo"),           -40],
      [".hero__piko",           -55]
    ];
    parallax.forEach(function(par){
      if (document.querySelector(par[0])) {
        gsap.to(par[0], {y:par[1], ease:"none", scrollTrigger:scrubHero()});
      }
    });
    gsap.to(".hero__texto", {y:-50, opacity:.25, ease:"none", scrollTrigger:scrubHero()});

    /* ---- Encabezado de cada sección ---- */
    gsap.utils.toArray(".seccion__cabeza").forEach(function(cabeza){
      gsap.from(cabeza.children, {y:30, opacity:0, duration:.85, stagger:.12,
        scrollTrigger:{trigger:cabeza, start:"top 85%", once:true}});
    });

    /* ---- Problema: la foto entra por un lado, las cifras por el otro ---- */
    gsap.from(".problema__grid .foto", {x:-45, opacity:0, scale:.97, duration:1,
      scrollTrigger:{trigger:".problema__grid", start:"top 82%", once:true}});
    gsap.from(".cifras .cifra", {x:45, opacity:0, duration:.8, stagger:.14,
      scrollTrigger:{trigger:".cifras", start:"top 85%", once:true}});
    gsap.from(".nota", {y:20, opacity:0, duration:.7,
      scrollTrigger:{trigger:".nota", start:"top 92%", once:true}});

    /* ---- Los números cuentan hacia arriba (sirve para "36" y para "71–89%") ---- */
    gsap.utils.toArray(".cifra b").forEach(function(el){
      var original = el.textContent;
      var partes = original.split(/(\d[\d.,]*)/);
      var destinos = partes.map(function(p){ return /^\d/.test(p) ? parseFloat(p.replace(/,/g,"")) : null; });
      var reloj = {p:0};
      gsap.to(reloj, {
        p:1, duration:1.4, ease:"power2.out",
        scrollTrigger:{trigger:el, start:"top 88%", once:true},
        onUpdate:function(){
          el.textContent = partes.map(function(txt, i){
            return destinos[i] === null ? txt : Math.round(destinos[i] * reloj.p);
          }).join("");
        },
        onComplete:function(){ el.textContent = original; }
      });
    });

    /* ---- La bifurcación se dibuja sola y después las líneas quedan caminando ---- */
    gsap.utils.toArray(".bifurcacion path").forEach(function(camino, i){
      var largo = camino.getTotalLength();
      gsap.set(camino, {strokeDasharray:largo, strokeDashoffset:largo});
      gsap.to(camino, {
        strokeDashoffset:0, duration:1.1, ease:"power2.inOut", delay:i * .15,
        scrollTrigger:{trigger:".rutas", start:"top 95%", once:true},
        onComplete:function(){
          gsap.set(camino, {strokeDasharray:"8 8", strokeDashoffset:0});
          gsap.to(camino, {strokeDashoffset:-16, duration:.9, ease:"none", repeat:-1});
        }
      });
    });

    gsap.from(".pregunta", {scale:.85, opacity:0, duration:.7, ease:"back.out(1.7)",
      scrollTrigger:{trigger:".pregunta", start:"top 90%", once:true}});
    gsap.from(".rutas .ruta", {y:55, opacity:0, duration:.9, stagger:.16,
      scrollTrigger:{trigger:".rutas", start:"top 82%", once:true}});
    gsap.from(".principios .principio", {y:40, opacity:0, duration:.8, stagger:.14,
      scrollTrigger:{trigger:".principios", start:"top 85%", once:true}});

    /* ---- Mascota y proceso ---- */
    gsap.from(".mascota__grid > div:first-child > *", {y:30, opacity:0, duration:.8, stagger:.1,
      scrollTrigger:{trigger:".mascota__grid", start:"top 78%", once:true}});
    gsap.from(".par figure", {y:55, opacity:0, scale:.95, duration:.9, stagger:.16,
      scrollTrigger:{trigger:".par", start:"top 85%", once:true}});
    gsap.from(".proceso__grid > div:first-child > *", {y:30, opacity:0, duration:.8, stagger:.1,
      scrollTrigger:{trigger:".proceso__grid", start:"top 78%", once:true}});
    gsap.from(".bocetos .foto", {
      y:60, opacity:0, duration:.95, stagger:.16,
      rotate:function(i){ return i ? 4 : -4; },
      scrollTrigger:{trigger:".bocetos", start:"top 85%", once:true}
    });

    /* ---- Sección de código abierto ---- */
    gsap.from(".codigo__puntos li", {x:-30, opacity:0, duration:.8, stagger:.13,
      scrollTrigger:{trigger:".codigo__puntos", start:"top 85%", once:true}});
    gsap.from(".codigo__texto .acciones .btn", {y:20, opacity:0, duration:.6, stagger:.1,
      scrollTrigger:{trigger:".codigo__texto .acciones", start:"top 92%", once:true}});
    gsap.from(".repo", {y:55, opacity:0, scale:.97, duration:1,
      scrollTrigger:{trigger:".repo", start:"top 86%", once:true}});
    gsap.from(".repo__stats li", {y:18, opacity:0, duration:.6, stagger:.1,
      scrollTrigger:{trigger:".repo__stats", start:"top 90%", once:true}});
    gsap.from(".repo__relleno", {scaleX:0, duration:1.2, ease:"power2.out",
      scrollTrigger:{trigger:".repo__avance", start:"top 92%", once:true}});

    /* ---- Pie ---- */
    gsap.from(".marca-neg", {y:30, opacity:0, duration:.9,
      scrollTrigger:{trigger:".pie__grid", start:"top 88%", once:true}});
    gsap.from(".pie__grid > div:last-child > *", {y:26, opacity:0, duration:.8, stagger:.12,
      scrollTrigger:{trigger:".pie__grid", start:"top 88%", once:true}});
    gsap.from(".pie__meta span", {y:16, opacity:0, duration:.6, stagger:.09,
      scrollTrigger:{trigger:".pie__meta", start:"top 95%", once:true}});

    /* Las fotos y las tipografías llegan después del HTML: si ScrollTrigger mide
       antes de que el layout asiente, el hero se queda congelado a media
       animación. Recalcular en cada hito de carga. */
    var recalcular = function(){ ScrollTrigger.refresh(); };
    window.addEventListener("load", function(){ setTimeout(recalcular, 100); });
    window.addEventListener("orientationchange", function(){ setTimeout(recalcular, 300); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(recalcular);
  }

  /* ============================================================
     2. Copiar el git clone
     ============================================================ */
  document.querySelectorAll("[data-copiar]").forEach(function(boton){
    boton.addEventListener("click", function(){
      var origen = document.querySelector(boton.getAttribute("data-copiar"));
      if (!origen) return;
      var texto = origen.textContent.trim();

      var avisar = function(){
        boton.textContent = "¡Copiado!";
        boton.setAttribute("data-listo", "si");
        setTimeout(function(){
          boton.textContent = "Copiar";
          boton.removeAttribute("data-listo");
        }, 1800);
      };

      var aLaAntigua = function(){
        var caja = document.createElement("textarea");
        caja.value = texto;
        caja.setAttribute("readonly", "");
        caja.style.cssText = "position:fixed;top:-999px;opacity:0";
        document.body.appendChild(caja);
        caja.select();
        try { document.execCommand("copy"); avisar(); } catch (e) {}
        document.body.removeChild(caja);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(avisar, aLaAntigua);
      } else {
        aLaAntigua();
      }
    });
  });

  /* ============================================================
     3. Datos vivos del repositorio (si hay internet; si no, no pasa nada)
     ============================================================ */
  var REPO = "dnnyhr/Piko-Aplicacion-para-el-aprendizaje-de-idiomas-";

  var COLOR_LENGUAJE = {
    HTML:"#E34C26", CSS:"#563D7C", SCSS:"#C6538C", JavaScript:"#F1E05A",
    TypeScript:"#3178C6", Python:"#3572A5", Dart:"#00B4AB", Kotlin:"#A97BFF",
    Java:"#B07219", Swift:"#F05138", "C++":"#F34B7D", C:"#555555",
    Arduino:"#BD79D1", Shell:"#89E051", Rust:"#DEA584", Go:"#00ADD8"
  };

  function ranura(nombre){ return document.querySelector('[data-gh="' + nombre + '"]'); }

  var datos = null;
  var alaVista = !animar;   /* sin animación, se pinta apenas llegan los datos */

  function contarHasta(el, valor){
    if (!el) return;
    if (!animar) { el.textContent = valor; return; }
    var reloj = {v:0};
    gsap.to(reloj, {
      v:valor, duration:1.1, ease:"power2.out",
      onUpdate:function(){ el.textContent = Math.round(reloj.v); }
    });
  }

  function pintarStats(){
    if (!datos || !alaVista) return;
    contarHasta(ranura("stars"), datos.stargazers_count || 0);
    contarHasta(ranura("forks"), datos.forks_count || 0);
    contarHasta(ranura("watchers"), datos.subscribers_count || 0);
  }

  function pintarLenguajes(mapa){
    var nombres = Object.keys(mapa || {});
    if (!nombres.length) return;

    var total = nombres.reduce(function(suma, k){ return suma + mapa[k]; }, 0);
    if (!total) return;

    var pista = ranura("pista-lang");
    var lista = ranura("langs");
    if (!pista || !lista) return;

    nombres.sort(function(a, b){ return mapa[b] - mapa[a]; });
    pista.innerHTML = "";
    lista.innerHTML = "";

    nombres.forEach(function(nombre){
      var pct = (mapa[nombre] / total) * 100;
      var color = COLOR_LENGUAJE[nombre] || "#97C137";

      var tramo = document.createElement("span");
      tramo.style.width = pct.toFixed(1) + "%";
      tramo.style.background = color;
      pista.appendChild(tramo);

      var item = document.createElement("li");
      var punto = document.createElement("i");
      punto.style.background = color;
      item.appendChild(punto);
      item.appendChild(document.createTextNode(nombre + " " + pct.toFixed(1) + " %"));
      lista.appendChild(item);
    });

    if (animar) {
      gsap.from(pista.children, {scaleX:0, duration:.9, ease:"power2.out", stagger:.08});
    }
  }

  if (animar) {
    ScrollTrigger.create({
      trigger:".repo__stats", start:"top 92%", once:true,
      onEnter:function(){ alaVista = true; pintarStats(); }
    });
  }

  if (window.fetch) {
    fetch("https://api.github.com/repos/" + REPO)
      .then(function(r){ return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function(json){ datos = json; pintarStats(); })
      .catch(function(){ /* sin conexión o límite de la API: quedan los guiones */ });

    fetch("https://api.github.com/repos/" + REPO + "/languages")
      .then(function(r){ return r.ok ? r.json() : Promise.reject(r.status); })
      .then(pintarLenguajes)
      .catch(function(){ /* se queda la barra de respaldo */ });
  }
})();
