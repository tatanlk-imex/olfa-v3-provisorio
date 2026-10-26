/* Herramientas de las páginas nuevas (V3). Todo funciona en el navegador: no se guarda ni se envía nada, salvo los formularios. */
(function () {
  "use strict";
  var norm = function (t) { return (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
  var clave = function (t) { return norm(t).replace(/[^a-z0-9]/g, ""); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); };

  // Formularios nuevos: los campos x_* se agregan al mensaje antes de enviarlo
  Array.prototype.forEach.call(document.querySelectorAll("form.v3-form"), function (f) {
    f.addEventListener("submit", function () {
      var extra = [], m = f.elements.mensaje;
      Array.prototype.forEach.call(f.elements, function (e) {
        if (e.name && e.name.indexOf("x_") === 0 && e.value && !e.dataset.listo) { extra.push(e.getAttribute("aria-label") + ": " + e.value); }
      });
      if (m && extra.length && m.value.indexOf("\n---\n") < 0) { m.value = m.value + "\n---\n" + extra.join("\n"); }
    }, true);
  });

  // Videos: el reproductor de YouTube se carga solo al hacer clic
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[data-yt]") : null;
    if (!a || !a.classList.contains("v3-video")) { return; }
    e.preventDefault();
    var id = a.getAttribute("data-yt"), fr = document.createElement("iframe");
    fr.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
    fr.allow = "autoplay; encrypted-media; picture-in-picture"; fr.allowFullscreen = true; fr.title = "Video OLFA";
    a.replaceWith(fr);
    if (window.gtag) { window.gtag("event", "video_visto", { video_id: id }); }
  });

  // ¿Qué hoja usa mi cuchillo?
  var q = document.getElementById("hoja-q"), res = document.getElementById("hoja-res"), de = document.getElementById("datos-hojas");
  if (q && res && de) {
    var D = {}; try { D = JSON.parse(de.textContent); } catch (x) { D = {}; }
    var claves = Object.keys(D);
    var buscar = function () {
      var v = clave(q.value); res.innerHTML = "";
      if (v.length < 2) { return; }
      var ex = claves.filter(function (k) { return clave(k) === v; });
      var coin = ex.length ? ex : claves.filter(function (k) { return clave(k).indexOf(v) === 0; }).slice(0, 6);
      if (!coin.length) { res.innerHTML = "<p>No encontramos ese código. Revisa que esté bien escrito o escríbenos y te ayudamos.</p>"; return; }
      coin.forEach(function (k) {
        var d = D[k], tit = d.t === "cuchillo" ? "Hojas de repuesto compatibles" : "Esta hoja sirve para estos cuchillos";
        var lis = d.r.map(function (r) { return "<li><a href=\"" + r.u + "\" title=\"" + esc(r.n) + "\">" + esc(r.s) + (r.a ? " <small>(" + esc(r.a) + ")</small>" : "") + "</a></li>"; }).join("");
        var c = document.createElement("div"); c.className = "v3-caja";
        c.innerHTML = "<h3><a href=\"" + d.u + "\">" + esc(k) + "</a> <span class=\"v3-meta\">" + esc(d.n) + "</span></h3><p><strong>" + tit + ":</strong></p><ul class=\"v3-chips\">" + lis + "</ul>";
        res.appendChild(c);
      });
    };
    q.addEventListener("input", buscar);
    var qs = new URLSearchParams(window.location.search); if (qs.get("modelo")) { q.value = qs.get("modelo"); buscar(); }
  }

  // ¿Qué cuchillo necesito?
  var sel = document.getElementById("sim-material");
  if (sel) {
    var mats = Array.prototype.slice.call(document.querySelectorAll("#sim-resultado .v3-material"));
    var vacio = document.createElement("p"); vacio.textContent = "Elige un material arriba para ver los cuchillos que te pueden servir."; document.getElementById("sim-resultado").appendChild(vacio);
    var mostrar = function () {
      mats.forEach(function (m) { m.hidden = sel.value === "" || m.getAttribute("data-material") !== sel.value; });
      vacio.hidden = sel.value !== "";
    };
    sel.addEventListener("change", function () { mostrar(); if (window.gtag) { window.gtag("event", "simulador_material", { material: sel.options[sel.selectedIndex].text }); } });
    var pm = new URLSearchParams(window.location.search).get("material"); if (pm) { sel.value = pm; }
    mostrar();
  }

  // Calculadora del costo de un accidente por corte
  var f = document.getElementById("calc-accidentes");
  if (f) {
    var dias = document.getElementById("calc-dias"), costo = document.getElementById("calc-costo"), n = document.getElementById("calc-n"), out = document.getElementById("calc-res");
    var clp = function (x) { return "$" + Math.round(x).toLocaleString("es-CL"); };
    var calcular = function () {
      var d = parseFloat(dias.value), c = parseFloat(costo.value), k = parseFloat(n.value);
      if (!(d >= 0) || !(c >= 0) || dias.value === "" || costo.value === "") { out.hidden = true; return; }
      if (!(k >= 0)) { k = 1; }
      var por = d * c;
      out.innerHTML = "<p>Cada accidente por corte cuesta, solo en días de licencia: <strong>" + clp(por) + "</strong></p><p>Con " + k + (k === 1 ? " accidente" : " accidentes") + " al año: <strong>" + clp(por * k) + "</strong> al año</p><p class=\"v3-meta\" style=\"color:#333\">" + d + (d === 1 ? " día" : " días") + " × " + clp(c) + " por día × " + k + ". Referencial.</p>";
      out.hidden = false;
    };
    [dias, costo, n].forEach(function (i) { i.addEventListener("input", calcular); });
    f.addEventListener("submit", function (e) { e.preventDefault(); calcular(); });
  }

  // Autodiagnóstico de la guía
  var fd = document.getElementById("form-autodiagnostico");
  if (fd) {
    fd.addEventListener("submit", function (e) {
      e.preventDefault();
      var pend = [], resp = 0, r = document.getElementById("diag-resultado");
      Array.prototype.forEach.call(fd.querySelectorAll(".v3-preg"), function (p) {
        var ch = p.querySelector("input:checked");
        if (ch) { resp++; if (ch.value === "no") { pend.push(p.getAttribute("data-t")); } }
      });
      if (resp < 6) { r.innerHTML = "<p>Responde las seis preguntas para ver tu resultado.</p>"; r.hidden = false; return; }
      r.innerHTML = pend.length ? "<p><strong>Tienes " + pend.length + (pend.length === 1 ? " punto" : " puntos") + " por resolver:</strong></p><ul>" + pend.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul><p>Un ejecutivo de Imex puede ayudarte: <a href=\"" + ((window.OLFA || {}).raiz || "/") + "agenda-tu-visita/\">agenda una visita</a>.</p>" : "<p><strong>Buen trabajo:</strong> tienes controlados los seis puntos. Revisa la pauta mensual para mantenerlos.</p>";
      r.hidden = false;
      if (window.gtag) { window.gtag("event", "autodiagnostico", { pendientes: pend.length }); }
    });
  }

  // Carrusel de novedades (botones)
  var nov = document.querySelector(".v3-novedades");
  if (nov) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-nov]"), function (b) {
      b.hidden = false;
      b.addEventListener("click", function () { nov.scrollBy({ left: (b.getAttribute("data-nov") === "sig" ? 1 : -1) * 320, behavior: "smooth" }); });
    });
  }
})();
