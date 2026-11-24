/* Navegación tipo app (sin recargar): el sidebar y el header se quedan fijos y solo cambia el contenido <main id="contenido">.
   - Intercepta los enlaces internos a páginas .html, trae la página destino, cambia el <main> y actualiza título, ítem activo e historial.
   - Los CSS/JS propios de cada página se marcan con data-page-css / data-page-js y se precargan en segundo plano (el CSS queda desactivado con media="not all" hasta que se usa).
   - Cada página registra su lógica con DETO.page("nombre", function () { ...; return function destroy() {}; }) y se monta/desmonta al entrar/salir.
   - Si algo falla (sin <main>, error de red) cae a la navegación normal del navegador, así que cada página sigue funcionando sola. */
(function () {
  "use strict";

  var DETO = (window.DETO = window.DETO || {});
  var pages = {};          // nombre de página -> [funciones de montaje]
  var destroyers = [];     // limpiadores de la página actual
  var cssLinks = {};       // href absoluto -> <link> de CSS de página
  var jsLoaded = {};       // src absoluto -> true
  var prepared = {};       // pathname -> Promise con la página lista
  var navToken = 0;
  var announcer = null;

  DETO.page = function (name, mount) { (pages[name] = pages[name] || []).push(mount); };
  /* Navegación desde JS (botones que no son <a>): DETO.navigate("calendario.html?evento=black-friday-2026") */
  DETO.navigate = function (href) { var u = new URL(href, location.href); if (u.href !== location.href) go(u.href, true); };

  function abs(href, base) { return new URL(href, base || document.baseURI).href; }
  function key(u) { return u.origin + u.pathname; }

  /* Registro inicial de los assets de página ya cargados */
  Array.prototype.forEach.call(document.querySelectorAll("link[data-page-css]"), function (l) { cssLinks[l.href] = l; });

  function setActiveNav() {
    var page = document.body.dataset.page;
    Array.prototype.forEach.call(document.querySelectorAll(".nav-item"), function (item) {
      if (item.dataset.nav === page) item.setAttribute("aria-current", "page"); else item.removeAttribute("aria-current");
    });
  }

  function mount(name) {
    destroyers = (pages[name] || []).map(function (fn) { return fn(); }).filter(function (d) { return typeof d === "function"; });
  }
  function unmount() {
    destroyers.forEach(function (d) { try { d(); } catch (e) { console.error("[app] destroy", e); } });
    destroyers = [];
  }

  /* ---------- Carga de assets de página ---------- */
  function preloadImages(urls, base) {
    urls.forEach(function (u) { var i = new Image(); i.src = abs(u, base); });
  }
  function ensureCss(href) {
    if (cssLinks[href]) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = href; l.media = "not all"; l.setAttribute("data-page-css", "");
      l.onload = function () {
        cssLinks[href] = l; resolve();
        /* Precarga los íconos/imágenes referenciados con url(...) en el CSS de la página */
        fetch(href).then(function (r) { return r.text(); }).then(function (t) {
          var re = /url\(\s*["']?([^"')]+)["']?\s*\)/g, m, list = [];
          while ((m = re.exec(t))) if (!/^data:|\.woff2?$/.test(m[1])) list.push(m[1]);
          preloadImages(list, href);
        }).catch(function () {});
      };
      l.onerror = function () { l.remove(); reject(new Error("css " + href)); };
      document.head.appendChild(l);
    });
  }
  function ensureJs(src) {
    if (jsLoaded[src]) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = false; s.setAttribute("data-page-js", "");
      s.onload = function () { jsLoaded[src] = true; resolve(); };
      s.onerror = function () { s.remove(); reject(new Error("js " + src)); };
      document.head.appendChild(s);
    });
  }

  /* Trae el HTML de la página y deja listos sus CSS y JS (sin aplicarlos todavía) */
  function prepare(u) {
    var k = key(u);
    if (prepared[k]) return prepared[k];
    prepared[k] = fetch(u.pathname, { credentials: "same-origin" })
      .then(function (res) { if (!res.ok) throw new Error(res.status + " " + u.pathname); return res.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        var base = u.href;
        var css = Array.prototype.map.call(doc.querySelectorAll("link[data-page-css]"), function (l) { return abs(l.getAttribute("href"), base); });
        var js = Array.prototype.map.call(doc.querySelectorAll("script[data-page-js]"), function (s) { return abs(s.getAttribute("src"), base); });
        var main = doc.getElementById("contenido");
        if (main) preloadImages(Array.prototype.map.call(main.querySelectorAll("img[src]"), function (i) { return i.getAttribute("src"); }).concat((main.getAttribute("data-preload") || "").split(/\s+/).filter(Boolean)), base);
        return Promise.all(css.map(ensureCss)).then(function () { return Promise.all(js.map(ensureJs)); }).then(function () {
          return { doc: doc, name: doc.body.dataset.page, css: css };
        });
      });
    prepared[k].catch(function () { delete prepared[k]; });
    return prepared[k];
  }

  /* ---------- Cambio de página ---------- */
  function go(href, push) {
    var u = new URL(href, location.href), token = ++navToken;
    prepare(u).then(function (prep) {
      if (token !== navToken) return;
      var oldMain = document.getElementById("contenido"), newMain = prep.doc.getElementById("contenido");
      if (!oldMain || !newMain || !pages[prep.name]) throw new Error("sin contenido");

      unmount();
      if (push) history.pushState({}, "", u.href);
      document.title = prep.doc.title;
      document.body.dataset.page = prep.name;

      var fresh = document.importNode(newMain, true);
      fresh.classList.add("page-enter");
      Object.keys(cssLinks).forEach(function (h) { cssLinks[h].media = prep.css.indexOf(h) >= 0 ? "all" : "not all"; });
      oldMain.replaceWith(fresh);
      setActiveNav();
      window.scrollTo(0, 0);
      mount(prep.name);
      if (announcer) announcer.textContent = document.title;
    }).catch(function (err) {
      console.warn("[app] navegación completa:", err.message || err);
      location.assign(u.href);
    });
  }

  function internalPage(a) {
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#") return null;
    var u = new URL(a.href);
    if (u.origin !== location.origin || !/(\.html|\/)$/.test(u.pathname)) return null;
    return u;
  }

  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var u = internalPage(e.target.closest && e.target.closest("a[href]"));
    if (!u) return;
    e.preventDefault();
    if (u.href !== location.href) go(u.href, true);
  });
  window.addEventListener("popstate", function () { go(location.href, false); });

  /* Precarga al acercar el mouse o enfocar un enlace */
  function warm(e) { var u = internalPage(e.target.closest && e.target.closest("a[href]")); if (u) prepare(u).catch(function () {}); }
  document.addEventListener("pointerover", warm);
  document.addEventListener("focusin", warm);

  /* ---------- Arranque ---------- */
  document.addEventListener("components:ready", function () {
    /* Los scripts de página iniciales ya se ejecutaron (van después de app.js), se registran aquí para no cargarlos dos veces */
    Array.prototype.forEach.call(document.querySelectorAll("script[data-page-js]"), function (s) { jsLoaded[s.src] = true; });
    announcer = document.createElement("p");
    announcer.className = "sr-only"; announcer.setAttribute("role", "status"); announcer.setAttribute("aria-live", "polite");
    document.body.appendChild(announcer);

    setActiveNav();
    mount(document.body.dataset.page);

    /* Precarga en segundo plano el resto de páginas del sidebar */
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 600); };
    idle(function () {
      Array.prototype.forEach.call(document.querySelectorAll(".nav-item[href]"), function (a) {
        var u = internalPage(a);
        if (u && key(u) !== key(new URL(location.href))) prepare(u).catch(function () {});
      });
    });
  });
})();
