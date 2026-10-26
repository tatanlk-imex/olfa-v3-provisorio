/* OLFA Chile - comportamiento del sitio. El contenido ya viene en el HTML: este archivo solo agrega menús, carrusel, búsqueda y formulario. */
(function () {
  "use strict";
  var O = window.OLFA || {}, RAIZ = O.raiz || "/";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var norm = function (s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var wait = 0;

  /* ---------- cookies: el visitante elige qué activa; las etiquetas de Google se cargan solo si acepta (Ley 21.719) ---------- */
  var COOKIE = "olfa_cookies";
  function leerEleccion() {                       // {m: medición (Analytics), p: publicidad (Ads)} o null si aún no decidió (o si debe volver a preguntarse)
    try {
      var v = sessionStorage.getItem(COOKIE);      // rechazo hecho en esta visita
      if (v) { var r = JSON.parse(v); return { m: !!r.m, p: !!r.p }; }
      v = localStorage.getItem(COOKIE); if (!v) { return null; }
      if (v === "si") { return { m: true, p: true }; } if (v === "no") { return { m: false, p: false }; }
      var o = JSON.parse(v), rechazo = !o.m && !o.p;
      if (rechazo && O.ck_rep === "visita") { return null; }                                   // volver a preguntar en cada visita
      if (rechazo && O.ck_rep === "90" && o.t && (Date.now() - o.t) > 90 * 86400000) { return null; }   // o a los 90 días
      return { m: !!o.m, p: !!o.p };
    } catch (e) { return null; }
  }
  function guardarEleccion(m, p) {
    var d = JSON.stringify({ m: m, p: p, t: Date.now() });
    try {
      localStorage.removeItem(COOKIE); sessionStorage.removeItem(COOKIE);
      if (!m && !p && O.ck_rep === "visita") { sessionStorage.setItem(COOKIE, d); } else { localStorage.setItem(COOKIE, d); }
    } catch (e) {}
  }
  var cargadas = { m: false, p: false }, gtmCargado = false;
  function idDe(tipo) { return tipo === "m" ? O.ga4 : O.ads; }
  function cargarEtiquetas(el) {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) { window.gtag = function () { window.dataLayer.push(arguments); }; }
    ["m", "p"].forEach(function (t) {
      var id = idDe(t); if (!el[t] || !id || cargadas[t]) { return; }
      if (!gtmCargado) { var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id); document.head.appendChild(s); window.gtag("js", new Date()); gtmCargado = true; }
      window.gtag("config", id); cargadas[t] = true;
    });
    if (window.OLFA_GRACIAS_PENDIENTE && cargadas.p) { window.OLFA_GRACIAS_PENDIENTE(); }
  }
  function borrarCookiesGoogle() {
    var hosts = [location.hostname, "." + location.hostname, "." + location.hostname.split(".").slice(-2).join(".")];
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (/^(_ga|_gid|_gat|_gcl|FPLC|_dc_gtm)/.test(n)) { hosts.forEach(function (h) { document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + h; }); document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; }
    });
  }
  var aviso = document.getElementById("aviso-cookies"), panel = document.getElementById("panel-cookies");
  function ocultarTodo() { if (aviso) { aviso.hidden = true; } if (panel) { panel.hidden = true; } }
  function decidir(m, p) {
    guardarEleccion(m, p); ocultarTodo();
    if ((cargadas.m && !m) || (cargadas.p && !p)) { borrarCookiesGoogle(); location.reload(); return; }   // se quita lo que ya estaba activo
    cargarEtiquetas({ m: m, p: p });
  }
  function abrirPanel() {
    if (!panel) { return; }
    var e = leerEleccion() || { m: O.ck_pre !== false, p: O.ck_pre !== false };   // sin decisión previa: activados o no según el ajuste
    var cm = panel.querySelector("[data-cookie=m]"), cp = panel.querySelector("[data-cookie=p]");
    if (cm) { cm.checked = e.m; } if (cp) { cp.checked = e.p; }
    if (aviso) { aviso.hidden = true; } panel.hidden = false; var b = panel.querySelector(".pc-todas"); if (b) { b.focus(); }
  }
  function cerrarPanel() { panel.hidden = true; if (!leerEleccion() && aviso) { aviso.hidden = false; } }
  if (aviso && panel) {
    var e0 = leerEleccion();
    if (e0) { cargarEtiquetas(e0); } else { aviso.hidden = false; }
    aviso.querySelector(".ac-si").addEventListener("click", function () { decidir(true, true); });
    aviso.querySelector(".ac-admin").addEventListener("click", abrirPanel);
    panel.querySelector(".pc-todas").addEventListener("click", function () { decidir(true, true); });
    panel.querySelector(".pc-ninguna").addEventListener("click", function () { decidir(false, false); });
    panel.querySelector(".pc-seleccion").addEventListener("click", function () {
      var cm = panel.querySelector("[data-cookie=m]"), cp = panel.querySelector("[data-cookie=p]"); decidir(!!(cm && cm.checked), !!(cp && cp.checked));
    });
    panel.addEventListener("click", function (e) { if (e.target === panel) { cerrarPanel(); } });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { cerrarPanel(); } });
  }
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(".cambiar-cookies"); if (b) { abrirPanel(); } });

  /* ---------- medición (Google Analytics 4 y Google Ads) ---------- */
  window.dataLayer = window.dataLayer || [];
  function ev(nombre, datos, conv) {
    datos = datos || {};
    var o = { event: nombre }; for (var k in datos) { o[k] = datos[k]; }
    window.dataLayer.push(o);
    if (typeof window.gtag === "function") {
      window.gtag("event", nombre, datos);
      if (conv && O.ads && cargadas.p) { window.gtag("event", "conversion", { send_to: O.ads + "/" + conv }); }
    }
  }
  try {
    var q = new URLSearchParams(location.search), g = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid"].forEach(function (k) { if (q.get(k)) { g[k] = q.get(k); } });
    if (Object.keys(g).length) { sessionStorage.setItem("olfa_utm", JSON.stringify(g)); }
  } catch (e) {}
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a"); if (!a) { return; }
    var h = a.getAttribute("href") || "";
    if (h.indexOf("tel:") === 0) { ev("click_llamar", { numero: h.slice(4) }, O.conv_llamada); }
    else if (h.indexOf("wa.me") > -1 || h.indexOf("api.whatsapp.com") > -1) { ev("click_whatsapp", {}, O.conv_wsp); }
    else if (h.indexOf("mailto:") === 0) { ev("click_correo", {}); }
    else if (h.indexOf("issuu.com") > -1) { ev("ver_catalogo", {}); }
  });
  function conversionFormulario() {
    try { if (sessionStorage.getItem("olfa_lead_ok")) { return; } sessionStorage.setItem("olfa_lead_ok", "1"); } catch (e) {}
    ev("generate_lead", { form: "contacto" }, O.conv_form);
  }
  if (window.OLFA_GRACIAS) { if (typeof window.gtag === "function" && cargadas.p) { conversionFormulario(); } else { window.OLFA_GRACIAS_PENDIENTE = conversionFormulario; } }

  /* ---------- cabecera ---------- */
  var cab = $(".main-header");
  if (cab) {
    var sc = function () { cab.classList.toggle("scrolled", window.scrollY > 20); }; window.addEventListener("scroll", sc, { passive: true }); sc();
  }
  var drawer = $(".drawer-backdrop"), drawerPanel = $(".drawer-categorias");
  function abrirDrawer() { if (drawer) { drawer.classList.add("open"); drawerPanel.classList.add("open"); } }
  function cerrarDrawer() { if (drawer) { drawer.classList.remove("open"); drawerPanel.classList.remove("open"); } }
  if (drawer) {
    drawer.addEventListener("click", cerrarDrawer); drawerPanel.addEventListener("click", function (e) { e.stopPropagation(); });
    $(".drawer-close", drawer).addEventListener("click", cerrarDrawer);
    $$(".drawer-link", drawer).forEach(function (b) {
      b.addEventListener("click", function () {
        var ul = b.nextElementSibling, abierto = !ul.hidden;
        $$(".drawer-subcategorias", drawer).forEach(function (x) { x.hidden = true; x.previousElementSibling.style.fontWeight = "normal"; x.previousElementSibling.lastChild.textContent = "▼"; });
        if (!abierto) { ul.hidden = false; b.style.fontWeight = "bold"; b.lastChild.textContent = "▲"; }
      });
    });
    $$("a", drawer).forEach(function (a) { a.addEventListener("click", cerrarDrawer); });
  }
  // menú de escritorio: se arma a partir del mismo listado del menú móvil
  var menu = $$(".drawer-link", drawer || document).map(function (b) {
    var ul = b.nextElementSibling;
    return { titulo: b.childNodes[0].textContent, href: b.getAttribute("data-ver"), cols: $$(":scope > li", ul).map(function (li) {
      return { titulo: $(".drawer-subtitulo", li).textContent, items: $$("a", li).map(function (a) { return { nombre: a.textContent, href: a.getAttribute("href") }; }) };
    }) };
  });
  var popup = null, sub = null;
  function cerrarPopup() { if (popup) { popup.remove(); popup = null; } cerrarSub(); }
  function cerrarSub() { if (sub) { sub.remove(); sub = null; } }
  function abrirPopup() {
    cerrarPopup();
    popup = document.createElement("div"); popup.className = "popup-overlay";
    popup.innerHTML = '<div class="popup-content popup-left"><button class="popup-close" type="button" aria-label="Cerrar">×</button><h3>Categorías</h3><ul>' + menu.map(function (m, i) { return '<li data-i="' + i + '" style="cursor:pointer">' + esc(m.titulo) + "</li>"; }).join("") + "</ul></div>";
    popup.addEventListener("click", cerrarPopup);
    popup.firstChild.addEventListener("click", function (e) { e.stopPropagation(); });
    $(".popup-close", popup).addEventListener("click", cerrarPopup);
    $$("li", popup).forEach(function (li) {
      li.addEventListener("click", function () { $$("li", popup).forEach(function (x) { x.classList.remove("active-category"); }); li.classList.add("active-category"); abrirSub(+li.getAttribute("data-i")); });
    });
    document.body.appendChild(popup);
  }
  function abrirSub(i) {
    cerrarSub(); var m = menu[i]; sub = document.createElement("div");
    sub.innerHTML = '<div class="subpopup-backdrop"></div><div class="subpopup-content modelo-seguridad" ><button class="subpopup-close" type="button" aria-label="Cerrar">×</button>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0">' + esc(m.titulo) + '</h3><a class="ver-todo-link" href="' + m.href + '">Ver todo ' + esc(m.titulo) + '</a></div>' +
      '<div class="lista-subcategorias">' + m.cols.map(function (c) {
        return "<div><h4 class=\"titulo-lista\">" + esc(c.titulo) + "</h4><ul>" + c.items.map(function (it) { return '<li><a class="link-button" href="' + it.href + '">' + esc(it.nombre) + "</a></li>"; }).join("") + "</ul></div>";
      }).join("") + "</div></div>";
    $(".subpopup-backdrop", sub).addEventListener("click", cerrarPopup); $(".subpopup-close", sub).addEventListener("click", cerrarSub);
    document.body.appendChild(sub);
  }
  var ham = $(".hamburger-button");
  if (ham) { ham.addEventListener("click", function () { if (window.innerWidth <= 900) { abrirDrawer(); } else { abrirPopup(); } }); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { cerrarPopup(); cerrarDrawer(); cerrarBusqueda(); } });

  /* ---------- búsqueda ---------- */
  var indice = null;
  function cargarIndice(cb) {
    if (indice) { return cb(indice); }
    fetch(RAIZ + "buscar-indice.json").then(function (r) { return r.json(); }).then(function (d) { indice = d; cb(d); }).catch(function () { indice = []; cb([]); });
  }
  function buscar(txt, d, max) {
    var t = norm(txt).split(" ").filter(Boolean); if (!t.length) { return []; }
    var r = d.filter(function (p) { return t.every(function (w) { return p.k.indexOf(w) > -1; }); }); return max ? r.slice(0, max) : r;
  }
  var bc = $(".searchbar-container"), caja = null;
  function cerrarBusqueda() { if (caja) { caja.remove(); caja = null; } }
  if (bc) {
    $(".search-icon-btn", bc).addEventListener("click", function () {
      if (caja) { return cerrarBusqueda(); }
      caja = document.createElement("div"); caja.className = "searchbar-dropdown";
      caja.innerHTML = '<input type="text" placeholder="Buscar productos..." class="searchbar-input" style="width:220px;padding:6px" aria-label="Buscar productos"><div class="searchbar-extra"></div>';
      bc.appendChild(caja); var inp = $("input", caja), extra = $(".searchbar-extra", caja); inp.focus();
      var t = null;
      inp.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () {
          if (inp.value.length < 2) { extra.innerHTML = ""; return; }
          cargarIndice(function (d) {
            var r = buscar(inp.value, d, 5);
            extra.innerHTML = r.length ? '<ul class="searchbar-results">' + r.map(function (p) { return '<li class="searchbar-result-item" style="padding:0"><a href="' + p.u + '" style="display:flex;align-items:center;padding:6px;color:inherit;text-decoration:none"><img src="' + p.t + '" alt="" width="40" height="40" style="width:40px;height:40px;object-fit:cover;margin-right:8px;border-radius:4px"><span>' + esc(p.n) + "</span></a></li>"; }).join("") + "</ul>" : '<div class="searchbar-no-results">Sin resultados</div>';
          });
        }, 150);
      });
      inp.addEventListener("keydown", function (e) { if (e.key === "Enter" && inp.value.trim()) { location.href = RAIZ + "buscar/?q=" + encodeURIComponent(inp.value.trim()); } });
    });
    document.addEventListener("click", function (e) { if (caja && !bc.contains(e.target)) { cerrarBusqueda(); } });
  }
  var rb = $("#buscar-resultados");
  if (rb) {
    var qq = new URLSearchParams(location.search).get("q") || "";
    $("#buscar-titulo").textContent = qq ? "Resultados para “" + qq + "”" : "Resultados de búsqueda";
    cargarIndice(function (d) {
      var r = buscar(qq, d);
      rb.innerHTML = r.map(function (p) { return '<div class="product-card"><a class="product-link" href="' + p.u + '"><img alt="' + esc(p.n) + '" loading="lazy" src="' + p.t + '" width="400" height="400"><h3>' + esc(p.n) + "</h3></a></div>"; }).join("");
      $("#buscar-vacio").hidden = r.length > 0;
    });
  }

  /* ---------- carrusel de la portada ---------- */
  var hero = $(".hero-container[data-slides]");
  if (hero) {
    var slides = JSON.parse(hero.getAttribute("data-slides")); if (window.innerWidth <= 900) { slides.sort(function (a, b) { return a.om - b.om; }); } var img = $(".hero-image", hero), pic = img.parentNode, fuente = $("source", pic), dots = $$(".dot", hero), i = 0, timer = null;
    function ir(n) {
      i = (n + slides.length) % slides.length; var s = slides[i];
      if (fuente) { fuente.srcset = s.m; }
      img.srcset = s.d1 + " 1280w, " + s.d2 + " 2560w"; img.src = s.d1; img.alt = s.alt || ""; img.removeAttribute("fetchpriority");
      dots.forEach(function (d, k) { d.classList.toggle("active", k === i); }); auto();
    }
    function auto() { clearInterval(timer); timer = setInterval(function () { ir(i + 1); }, 5000); }
    $(".nav-button.left", hero).addEventListener("click", function () { ir(i - 1); }); $(".nav-button.right", hero).addEventListener("click", function () { ir(i + 1); });
    dots.forEach(function (d, k) { d.addEventListener("click", function () { ir(k); }); d.addEventListener("keydown", function (e) { if (e.key === "Enter") { ir(k); } }); });
    // los demás banners se cargan después de que la página termina de pintarse
    window.addEventListener("load", function () { slides.slice(1).forEach(function (s) { (new Image()).src = window.innerWidth <= 900 ? s.m : s.d1; }); auto(); });
  }

  /* ---------- ficha de producto ---------- */
  var gal = $(".producto-gallery");
  if (gal) {
    var main = $(".main-image", gal), th = $$(".thumbnail", gal), k = 0;
    function mostrar(n) { if (!th.length) { return; } k = (n + th.length) % th.length; main.src = th[k].getAttribute("data-grande"); main.alt = th[k].alt; th.forEach(function (t, j) { t.classList.toggle("active", j === k); }); }
    th.forEach(function (t, j) { t.addEventListener("click", function () { mostrar(j); }); t.addEventListener("keydown", function (e) { if (e.key === "Enter") { mostrar(j); } }); });
    var pv = $(".nav-button.prev", gal), nx = $(".nav-button.next", gal);
    if (pv) { pv.addEventListener("click", function () { mostrar(k - 1); }); nx.addEventListener("click", function () { mostrar(k + 1); }); }
  }
  $$(".tabs-header button").forEach(function (b) {
    b.addEventListener("click", function () {
      var cont = b.closest(".producto-detalle-tabs"), t = b.getAttribute("data-tab");
      $$(".tabs-header button", cont).forEach(function (x) { x.classList.toggle("active", x === b); });
      $$("[data-panel]", cont).forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t; });
    });
  });

  /* ---------- formulario de contacto ---------- */
  $$("form.formulario").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var u = ""; try { u = sessionStorage.getItem("olfa_utm") || ""; } catch (x) {}
      f.elements.utm.value = u; var btn = $("button[type=submit]", f); btn.disabled = true; btn.textContent = "ENVIANDO…";
      fetch(f.action, { method: "POST", body: new FormData(f), headers: { "X-Requested-With": "fetch" } })
        .then(function (r) { return r.json(); })
        .then(function (r) { if (r && r.ok) { location.href = RAIZ + "gracias/"; } else { throw new Error("x"); } })
        .catch(function () {
          // sin servidor de formularios (por ejemplo, en pruebas estáticas): se abre el correo del visitante con el mensaje listo
          var d = new FormData(f), cuerpo = "Nombre: " + d.get("nombre") + "\nCorreo: " + d.get("email") + "\nTeléfono: " + d.get("telefono") + "\nEmpresa: " + d.get("empresa") + "\n\n" + d.get("mensaje");
          location.href = "mailto:contacto@olfa.cl?subject=" + encodeURIComponent("Contacto desde el sitio OLFA") + "&body=" + encodeURIComponent(cuerpo);
          btn.disabled = false; btn.textContent = "ENVIAR";
        });
    });
  });
})();
