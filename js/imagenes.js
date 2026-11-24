/* DETO · Fotos de productos.
   Cada pantalla pide la imagen con DETO.img.src(ean, url):
   1. Si hay una URL conocida se usa directo: columna «imagen» del scraper, archivo en assets/productos/ (data/imagenes.js)
      o foto de Jumbo encontrada para ese producto (data/fotos-jumbo.js, herramientas/fotos_jumbo.md).
   2. Si no, se deja el placeholder marcado con el EAN («…placeholder.svg#ean=780…») y este script busca la foto real
      por código de barras en Open Food Facts (y sus bases hermanas Open Beauty Facts / Open Products Facts) cuando la
      imagen entra en pantalla. El resultado (foto o «sin foto») queda en caché en el navegador.
   Si no hay foto, se mantiene el placeholder. No se descarga nada al sitio: las fotos se cargan desde esas bases públicas. */
(function () {
  "use strict";
  var DETO = (window.DETO = window.DETO || {});
  if (DETO.img) return;

  var PLACEHOLDER = "assets/img/catalogo-producto-placeholder.svg";
  var LOCAL = window.DETO_IMAGENES || {};
  var JUMBO = window.DETO_FOTOS_JUMBO || { base: "", size: "", ean: {}, slug: {} };
  function jumbo(id) { return id ? JUMBO.base + id + JUMBO.size : ""; }
  var CACHE_KEY = "deto-fotos-v1";
  var MISS_TTL = 7 * 24 * 3600 * 1000; // reintentar los «sin foto» después de 7 días
  var SOURCES = [
    "https://world.openfoodfacts.org/api/v2/product/",
    "https://world.openbeautyfacts.org/api/v2/product/",
    "https://world.openproductsfacts.org/api/v2/product/"
  ];
  var FIELDS = "?fields=image_front_small_url,image_front_url,image_small_url,image_url";

  var cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") || {}; } catch (e) { cache = {}; }
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* sin almacenamiento: solo memoria */ } }, 400);
  }

  function norm(ean) {
    var s = String(ean || "").replace(/\D/g, "").replace(/^0+/, "");
    if (s.length < 8) return "";
    return s.length < 13 ? ("0000000000000" + s).slice(-13) : s;
  }

  /* URL para el <img>: foto conocida, o placeholder marcado con el EAN para resolverlo al mostrarse */
  function src(ean, url, slug) {
    var e = norm(ean);
    if (url) return url;
    if (e && LOCAL[e]) return LOCAL[e];
    var tag = e ? "#ean=" + e : "";  // si la foto falla, el EAN permite buscar otra
    if (slug && JUMBO.slug[slug]) return jumbo(JUMBO.slug[slug]) + tag;
    if (e && JUMBO.ean[e]) return jumbo(JUMBO.ean[e]) + tag;
    if (e && cache[e] && cache[e].u) return cache[e].u;
    return e ? PLACEHOLDER + "#ean=" + e : PLACEHOLDER;
  }

  /* --------- búsqueda por EAN (máx. 3 en paralelo) --------- */
  var pending = {}, queue = [], running = 0;
  function pick(p) { return p && (p.image_front_small_url || p.image_small_url || p.image_front_url || p.image_url) || ""; }
  function fetchEan(e) {
    var i = 0, answered = false;
    function next() {
      if (i >= SOURCES.length) return Promise.resolve(answered ? "" : null); // null = sin conexión: no se guarda como «sin foto»
      var url = SOURCES[i++] + e + ".json" + FIELDS;
      return fetch(url, { headers: { Accept: "application/json" } })
        .then(function (r) { answered = true; return r.ok ? r.json() : null; })
        .then(function (j) { var u = j && j.status === 1 ? pick(j.product) : ""; return u || next(); })
        .catch(function () { return next(); });
    }
    return next();
  }
  function pump() {
    while (running < 3 && queue.length) {
      (function (e) {
        running++;
        fetchEan(e).then(function (u) {
          if (u === null) u = "";
          else { cache[e] = u ? { u: u } : { u: "", t: Date.now() }; save(); }
          (pending[e] || []).forEach(function (cb) { cb(u); });
          delete pending[e];
        }).finally(function () { running--; pump(); });
      })(queue.shift());
    }
  }
  function resolve(e, cb) {
    var c = cache[e];
    if (c && (c.u || Date.now() - (c.t || 0) < MISS_TTL)) return cb(c.u);
    if (pending[e]) return pending[e].push(cb);
    pending[e] = [cb];
    queue.push(e);
    pump();
  }

  /* --------- aplicar a los <img> marcados --------- */
  function eanOf(img) {
    var s = img.getAttribute("src") || "";
    var m = s.match(/#ean=(\d{8,14})$/);
    return m ? m[1] : "";
  }
  function setPhoto(img, u) {
    if (!u) return;
    var marked = img.getAttribute("src");
    var probe = new Image();
    probe.onload = function () {
      if (img.getAttribute("src") !== marked) return; // la imagen ya cambió de producto
      img.src = u;
      img.classList.add("is-photo");
    };
    probe.src = u;
  }
  function handle(img) {
    var s = img.getAttribute("src") || "";
    if (s.indexOf(PLACEHOLDER) !== 0) {  // foto directa (Jumbo, scraper o archivo local)
      if (/^https?:|^assets\/productos\//.test(s)) img.classList.add("is-photo");
      return;
    }
    img.classList.remove("is-photo");
    var e = eanOf(img);
    if (!e) return;
    var c = cache[e];
    if (c && c.u) return setPhoto(img, c.u);
    if (c && Date.now() - (c.t || 0) < MISS_TTL) return;
    if (io) io.observe(img);
    else resolve(e, function (u) { setPhoto(img, u); });
  }
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var img = en.target;
      io.unobserve(img);
      var e = eanOf(img);
      if (e) resolve(e, function (u) { if (eanOf(img) === e) setPhoto(img, u); });
    });
  }, { rootMargin: "200px" }) : null;

  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.tagName === "IMG") return handle(root);
    Array.prototype.forEach.call(root.querySelectorAll("img"), handle);
  }
  function start() {
    // foto directa que no carga → placeholder (y búsqueda por EAN si se conoce)
    document.addEventListener("error", function (ev) {
      var img = ev.target;
      if (!img || img.tagName !== "IMG") return;
      var s = img.getAttribute("src") || "";
      if (s.indexOf(PLACEHOLDER) === 0 || !/^https?:|^assets\/productos\//.test(s)) return;
      var e = eanOf(img);
      img.classList.remove("is-photo");
      img.src = e ? PLACEHOLDER + "#ean=" + e : PLACEHOLDER;
    }, true);
    scan(document.body);
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        if (m.type === "attributes") handle(m.target);
        else Array.prototype.forEach.call(m.addedNodes, scan);
      });
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  DETO.img = { src: src, placeholder: PLACEHOLDER, norm: norm };
})();
