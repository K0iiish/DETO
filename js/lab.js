/* Pantalla LAB — JS vanilla (lógica traducida de Figma Make: LabPage.tsx; textos y medidas de los frames 568:36, 568:1175, 568:3499, 568:1818, 568:2249).
   - Taxonomía (macro → categoría): data/taxonomia.js. Datos demostrativos: data/lab.js. Productos guardados: js/guardados.js (compartido con Tendencias).
   - Dos recorridos: "stores" (tienda → producto guardado) y "products" (producto → tienda). Estados por aria-pressed / .is-selected.
   - GRID_SOURCE decide qué muestra la grilla "Productos": "all" = los 6 productos de LAB con marcador de guardado (Make);
     "saved" = solo los guardados. PENDIENTE de decisión del cliente (el frame es ambiguo: muestra los 6, todos guardados). */
DETO.page("lab", function () {
  "use strict";

  var GRID_SOURCE = "all";
  var LAB = DETO.lab, TAX = DETO.taxonomia, G = DETO.guardados;
  if (LAB.sync) LAB.sync(); /* incorpora lo guardado en Tendencias */
  var root = document.querySelector("main.lab");
  var view = root.querySelector("[data-view]");
  var toastHost = root.querySelector("[data-toast]");
  var flowBtns = Array.prototype.slice.call(root.querySelectorAll("[data-flow]"));
  var HIGH_ORDERS = (function () { var o = LAB.stores.map(function (s) { return s.orders; }).sort(function (a, b) { return a - b; }); return o[Math.floor(o.length / 2)] || 0; })(); /* "Filtros": tiendas con pedidos sobre la mediana */

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, ctx) { return (ctx || view).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || view).querySelectorAll(sel)); }
  function num(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function dec(n) { return n.toFixed(1).replace(".", ","); }
  function slug(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "-"); }
  function ico(name, extra) { return '<span class="ico ico--' + name + (extra ? " " + extra : "") + '" aria-hidden="true"></span>'; }

  /* ---------------- Estado ---------------- */
  var state = {
    flow: "stores", storeId: null, productId: null,
    storeFilters: { macro: "Todas", category: "Todas", status: "Todos", adv: false },
    productFilters: { category: "Todas", brand: "Todas", trend: "Todos" },
    rankDir: "desc"
  };
  var savedAnalyses = {}; /* "productId|storeId" → true (en memoria, como el Make) */
  var focusKey = null, toastTimer = null, selects = [];

  /* ---------------- Datos derivados ---------------- */
  function savedProducts() { return LAB.products.filter(function (p) { return G.has(p.key); }); }
  function isSaved(p) { return G.has(p.key); }
  function toItem(p) { return { key: p.key, name: p.name, brand: p.brand, category: p.category, image: p.image, source: "lab" }; }
  function macroCategories(label) {
    var m = TAX.macros.filter(function (x) { return x.label === label; })[0];
    return m ? m.categories.map(function (c) { return c.label; }) : [];
  }
  function allStoreCategories() {
    var out = [];
    TAX.macros.forEach(function (m) { m.categories.forEach(function (c) { out.push(c.label); }); });
    return out;
  }
  function visibleStores() {
    var f = state.storeFilters, inMacro = f.macro === "Todas" ? null : macroCategories(f.macro);
    return LAB.stores.filter(function (s) {
      var names = s.categories.map(function (c) { return c.name; });
      return (!inMacro || names.some(function (n) { return inMacro.indexOf(n) >= 0; })) &&
        (f.category === "Todas" || names.indexOf(f.category) >= 0) &&
        (f.status === "Todos" || s.status === f.status) &&
        (!f.adv || s.orders >= HIGH_ORDERS);
    });
  }
  function productCategoryOptions() {
    var present = LAB.products.map(function (p) { return p.category; }), order = [];
    TAX.macros.forEach(function (m) { m.categories.forEach(function (c) { c.subcategories.forEach(function (s) { if (order.indexOf(s) < 0) order.push(s); }); }); });
    var list = present.filter(function (c, i) { return present.indexOf(c) === i; });
    list.sort(function (a, b) { var x = order.indexOf(a), y = order.indexOf(b); return (x < 0 ? 999 : x) - (y < 0 ? 999 : y); });
    return ["Todas"].concat(list);
  }
  function brandOptions() {
    var b = LAB.products.map(function (p) { return p.brand; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(function (a, c) { return a.localeCompare(c, "es"); });
    return ["Todas"].concat(b);
  }
  function visibleProducts() {
    var f = state.productFilters;
    return LAB.products.filter(function (p) {
      return (GRID_SOURCE === "all" || isSaved(p)) && (f.category === "Todas" || p.category === f.category) &&
        (f.brand === "Todas" || p.brand === f.brand) && (f.trend === "Todos" || p.trend === f.trend);
    });
  }

  /* ---------------- Desplegable (mismo patrón que Catálogo; reutiliza .filter-dropdown de Tendencias) ---------------- */
  function closeAll(except) { selects.forEach(function (d) { if (d !== except) d.close(); }); }
  function Select(host, cfg) {
    var self = this, value = cfg.value;
    host.innerHTML = '<button class="filter-trigger tap" type="button" aria-expanded="false" aria-haspopup="listbox" data-focus="' + cfg.id + '"><span></span><span class="ico ico--chevron-abajo" aria-hidden="true"></span></button><div class="filter-menu" role="listbox" aria-label="' + esc(cfg.label) + '" hidden></div>';
    var trigger = $(".filter-trigger", host), menu = $(".filter-menu", host);
    trigger.firstElementChild.textContent = value;
    trigger.setAttribute("aria-label", cfg.label + ": " + value);
    cfg.options.forEach(function (o) {
      var b = document.createElement("button"), on = o === value;
      b.type = "button"; b.className = "filter-option" + (on ? " is-selected" : ""); b.setAttribute("role", "option"); b.setAttribute("aria-selected", String(on)); b.dataset.value = o;
      b.innerHTML = '<i><span class="ico ico--check" aria-hidden="true"></span></i><span></span>'; b.lastElementChild.textContent = o;
      b.addEventListener("click", function () { self.close(); if (o !== value) { focusKey = cfg.id; cfg.onChange(o); } else trigger.focus(); });
      menu.appendChild(b);
    });
    self.open = function () { closeAll(self); menu.hidden = false; host.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true"); };
    self.close = function () { menu.hidden = true; host.classList.remove("is-open"); trigger.setAttribute("aria-expanded", "false"); };
    trigger.addEventListener("click", function () { menu.hidden ? self.open() : self.close(); });
    host.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { e.stopPropagation(); self.close(); trigger.focus(); }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !menu.hidden) {
        var items = $$(".filter-option", menu), i = items.indexOf(document.activeElement);
        e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
      }
    });
    selects.push(self);
  }
  function field(id, label) { return '<div class="lab-field"><span class="lab-field__label">' + esc(label) + '</span><div class="filter-dropdown" data-select="' + id + '"></div></div>'; }
  function mount(id, label, value, options, onChange) { new Select($('[data-select="' + id + '"]'), { id: id, label: label, value: value, options: options, onChange: onChange }); }
  function onPointerDown(e) { if (!e.target.closest || !e.target.closest(".filter-dropdown")) closeAll(); }
  document.addEventListener("pointerdown", onPointerDown);

  /* ---------------- Piezas de interfaz ---------------- */
  function trendChip(t) {
    var cls = t === "Novedad" ? " lab-trend--novedad" : t === "Bajando" ? " lab-trend--bajando" : "", g = t === "Novedad" ? "✦ " : t === "Bajando" ? "↓ " : "↑ ";
    return '<span class="lab-trend' + cls + '"><span aria-hidden="true">' + g + "</span>" + esc(t) + "</span>";
  }
  function tooltip(text, size) { return '<span class="lab-tooltip lab-tooltip--' + (size || "sm") + '" tabindex="0" role="img" aria-label="' + esc(text) + '">' + ico("lab-info") + '<i aria-hidden="true">' + esc(text) + "</i></span>"; }
  function statusChip(st) { return '<span class="lab-status' + (st === "Activa" ? " lab-status--activa" : st === "En análisis" ? " lab-status--en-analisis" : "") + '">' + esc(st) + "</span>"; }
  function bookmark(p, label) {
    var on = isSaved(p);
    return '<button class="lab-bookmark tap" type="button" data-bookmark="' + p.id + '" aria-pressed="' + on + '" aria-label="' + (on ? "Quitar de guardados: " : "Guardar: ") + esc(p.name) + '">' + ico("") + "</button>";
  }
  function ring(v) { return '<div class="lab-ring" style="--affinity:' + v + '" role="img" aria-label="Afinidad ' + v + ' de 100"><strong>' + v + "</strong><small>/100</small></div>"; }
  function progress(v) { return '<div class="progress" role="presentation"><span style="width:' + v + '%"></span></div>'; }
  function toTendencias(label) { return '<a class="lab-cta" href="tendencias.html">' + label + "</a>"; }
  function emptyPanel(title, text, extra) {
    return '<div class="lab-card lab-empty"><span class="lab-empty__ico">' + ico("tienda") + "</span><h2>" + title + "</h2><p>" + text + "</p>" + (extra || "") + "</div>";
  }
  function saveBtn(p, s) {
    var on = !!savedAnalyses[p.id + "|" + s.id];
    return '<button class="lab-save tap' + (on ? " is-saved" : "") + '" type="button" data-save-analysis aria-pressed="' + on + '">' + (on ? ico("check") + "Análisis guardado" : "Guardar análisis") + "</button>";
  }

  /* ---------------- Vista Tiendas ---------------- */
  function storeCard(s) {
    return '<button class="lab-store tap" type="button" data-store="' + s.id + '">' +
      '<span class="lab-store__top"><span><span class="lab-store__name">' + esc(s.name) + '</span><span class="lab-store__units">' + num(s.weeklyUnits) + ' u./semana</span></span><span class="lab-store__orders">' + num(s.orders) + " pedidos</span></span>" +
      '<span class="lab-store__perf"><span class="lab-cats">' + s.categories.map(function (c) { return "<span>" + esc(c.name) + "</span>"; }).join("") + "</span>" +
      '<span class="lab-rots">' + s.categories.map(function (c) { return '<span class="lab-rot"><i><b style="width:' + c.rotation * 20 + '%"></b></i><strong>' + dec(c.rotation) + "x</strong></span>"; }).join("") + "</span>" +
      statusChip(s.status) + ico("chevron-derecha", "lab-store__go") + "</span>" +
      '<span class="lab-signals">' + s.signals.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</span>" +
      '<span class="lab-store__hl">' + esc(s.highlight) + "</span></button>";
  }
  function renderStores() {
    var f = state.storeFilters, list = visibleStores();
    var catOpts = ["Todas"].concat(f.macro === "Todas" ? allStoreCategories() : macroCategories(f.macro));
    var count = function (st) { return list.filter(function (s) { return s.status === st; }).length; };
    view.innerHTML =
      '<section class="lab-filters" aria-label="Filtros de tiendas"><div class="lab-filters__row lab-filters__row--stores">' +
      field("macro", "Macro categoría") + field("category", "Categoría") + field("status", "Estado del piloto") +
      '<button class="filter-button lab-adv tap' + (f.adv ? " has-value" : "") + '" type="button" data-adv aria-pressed="' + f.adv + '" data-focus="adv">' + ico("filtros") + "Filtros" + (f.adv ? "<i></i>" : "") + "</button></div></section>" +
      '<div class="lab-stats" role="list" aria-label="Resumen de tiendas">' +
      '<div class="lab-stat" role="listitem">' + ico("tienda") + "<strong>" + list.length + "</strong><span>tiendas</span></div>" +
      '<div class="lab-stat lab-stat--pilot" role="listitem">' + ico("lab-matraz") + "<strong>" + count("En piloto") + "</strong><span>en piloto</span></div>" +
      '<div class="lab-stat lab-stat--analysis" role="listitem">' + ico("lab-barras") + "<strong>" + count("En análisis") + "</strong><span>en análisis</span></div>" +
      '<div class="lab-stat lab-stat--active" role="listitem">' + ico("check") + "<strong>" + count("Activa") + "</strong><span>activas</span></div></div>" +
      (list.length ? '<div class="lab-stores">' + list.map(storeCard).join("") + "</div>"
        : '<div class="lab-listempty" role="status">' + ico("tienda") + "<h2>No hay tiendas con estos filtros</h2><p>Ajusta los filtros para ver más tiendas.</p>" + '<button class="lab-cta lab-cta--ghost" type="button" data-clear-stores>Limpiar filtros</button></div>');
    mount("macro", "Macro categoría", f.macro, ["Todas"].concat(TAX.macroNames()), function (v) { f.macro = v; f.category = "Todas"; render(); });
    mount("category", "Categoría", f.category, catOpts, function (v) { f.category = v; render(); });
    mount("status", "Estado del piloto", f.status, ["Todos", "En piloto", "En análisis", "Activa"], function (v) { f.status = v; render(); });
  }

  function savedPanel(store) {
    var list = savedProducts();
    if (!list.length) {
      return '<aside class="lab-saved lab-empty" aria-label="Productos guardados para pilotear"><span class="lab-empty__ico">' + ico("lab-caja") + "</span><h2>No tienes productos guardados</h2><p>Guarda productos desde Tendencias para evaluarlos en LAB.</p>" + toTendencias("Ir a Tendencias") + "</aside>";
    }
    return '<aside class="lab-saved" aria-label="Productos guardados para pilotear"><header class="lab-saved__head"><div><h2>Productos guardados para pilotear</h2><p>Selecciona un producto para evaluar su potencial en la tienda.</p></div><span class="lab-saved__count">' + list.length + " guardados</span></header>" +
      '<ul class="lab-saved__list">' + list.map(function (p) {
        var on = state.productId === p.id;
        return '<li><button class="lab-sp tap' + (on ? " is-selected" : "") + '" type="button" data-pick-product="' + p.id + '" aria-pressed="' + on + '">' + trendChip(p.trend) +
          '<img class="lab-sp__img" src="' + p.image + '" alt="">' +
          '<span class="lab-sp__txt"><span class="lab-sp__name">' + esc(p.name) + "</span><small>" + esc(p.brand) + " · " + esc(p.category) + "</small><span>Venta proyectada</span><b>" + num(p.projectedSales) + " u./mes</b></span>" +
          '<span class="lab-sp__score"><small>Puntaje DETO</small><strong>' + p.score + "/100</strong>" + (on ? ico("check") : "") + "</span>" + progress(p.score) + "</button></li>";
      }).join("") + "</ul></aside>";
  }

  function storeProductAnalysis(p, s) {
    var ev = LAB.evaluation(p.id, s.id), label = LAB.affinityLabel(ev.affinity);
    return '<section class="lab-card lab-analysis" aria-label="Análisis de ' + esc(p.name) + '">' +
      '<header class="lab-analysis__head"><img src="' + p.image + '" alt=""><div><h2>' + esc(p.name) + "</h2><span>" + esc(p.brand) + " · " + esc(p.category) + '</span></div><span class="lab-catalog-chip">' + esc(p.catalogStatus) + "</span></header>" +
      '<div class="lab-overview"><div class="lab-affinity">' + ring(ev.affinity) + '<div class="lab-affinity__txt"><span>Afinidad</span><b>' + label + "</b></div></div>" +
      '<div class="lab-lot"><span>Lote sugerido</span><strong>' + (ev.suggestedLot ? ev.suggestedLot + " unidades" : "Por determinar") + "</strong><small>Estimación para validación inicial.</small></div></div>" +
      '<div class="lab-factors">' + ev.factors.map(function (f) {
        return '<div class="lab-factor"><div class="lab-factor__row"><strong>' + esc(f.label) + "</strong>" + tooltip(f.description, "md") + '<span class="lab-factor__w">' + f.weight + '%</span><span class="lab-factor__v">' + (f.value === null ? "—" : f.value + "/100") + '</span></div><div class="lab-factor__bar"><span style="width:' + (f.value || 0) + '%"></span></div></div>';
      }).join("") + "</div>" +
      '<div class="lab-reco">' + ico("lab-chispas") + "<div><strong>Recomendación</strong><span>" + esc(LAB.recommendation(ev, p, s)) + "</span></div></div>" + saveBtn(p, s) + "</section>";
  }

  function renderStoreDetail() {
    var s = LAB.store(state.storeId), p = state.productId ? LAB.product(state.productId) : null;
    if (p && !isSaved(p)) { p = null; state.productId = null; }
    view.innerHTML =
      '<div class="lab-detail"><button class="lab-back tap" type="button" data-back-stores>' + ico("lab-izq") + "Volver a tiendas</button>" +
      '<div class="lab-store-grid"><div class="lab-col">' +
      '<section class="lab-card lab-summary" aria-label="' + esc(s.name) + '"><div class="lab-summary__top"><div><h2 class="lab-summary__name">' + esc(s.name) + '</h2><span class="lab-summary__units">' + num(s.weeklyUnits) + ' u./semana</span></div><span class="lab-summary__orders">' + num(s.orders) + " pedidos</span></div>" +
      '<div class="lab-summary__perf"><div class="lab-cats">' + s.categories.map(function (c) { return "<span>" + esc(c.name) + "</span>"; }).join("") + '</div><div class="lab-rots">' + s.categories.map(function (c) { return '<span class="lab-rot"><i><b style="width:' + c.rotation * 20 + '%"></b></i><strong>' + dec(c.rotation) + "x</strong></span>"; }).join("") + "</div></div>" +
      '<div class="lab-signals">' + s.signals.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div></section>" +
      (p ? storeProductAnalysis(p, s) : emptyPanel("Selecciona un producto", "Elige un producto guardado para evaluar su potencial en esta tienda.", "")) +
      "</div>" + savedPanel(s) + "</div></div>";
  }

  /* ---------------- Vista Productos ---------------- */
  function productCard(p) {
    return '<article class="lab-pcard"><button class="lab-pcard__open" type="button" data-product="' + p.id + '" aria-label="Ver análisis de ' + esc(p.name) + '"></button>' +
      '<div class="lab-pcard__top">' + trendChip(p.trend) + bookmark(p) + "</div>" +
      '<div class="lab-pcard__body"><img class="lab-pcard__img" src="' + p.image + '" alt=""><div class="lab-pcard__text"><h3 class="lab-pcard__name">' + esc(p.name) + '</h3><div class="lab-pcard__meta">' + esc(p.brand) + " · " + esc(p.category) + '</div><span class="lab-chip">' + esc(p.category) + "</span></div></div>" +
      '<div class="lab-metrics"><div><span>Venta proyectada</span><strong>' + num(p.projectedSales) + " <small>u./mes</small></strong></div><div><span>Puntaje DETO</span><strong>" + p.score + " <small>/100</small></strong></div></div>" + progress(p.score) + "</article>";
  }
  function renderProducts() {
    var f = state.productFilters, list = visibleProducts();
    view.innerHTML =
      '<section class="lab-filters" aria-label="Filtros de productos"><div class="lab-filters__row">' + field("pcat", "Categoría") + field("pbrand", "Marca") + field("ptrend", "Estado") + "</div></section>" +
      (list.length ? '<div class="lab-products">' + list.map(productCard).join("") + "</div>"
        : '<div class="lab-listempty" role="status">' + ico("lab-caja") + "<h2>No hay productos disponibles</h2><p>Explora Tendencias para encontrar nuevas oportunidades.</p>" + toTendencias("Ir a Tendencias") + "</div>");
    mount("pcat", "Categoría", f.category, productCategoryOptions(), function (v) { f.category = v; render(); });
    mount("pbrand", "Marca", f.brand, brandOptions(), function (v) { f.brand = v; render(); });
    mount("ptrend", "Estado", f.trend, ["Todos", "En alza", "Novedad", "Bajando"], function (v) { f.trend = v; render(); });
  }

  function commercialAnalysis(p, s) {
    var ev = LAB.evaluation(p.id, s.id), label = LAB.affinityLabel(ev.affinity), bars = ev.bars || [], max = Math.max.apply(null, bars.map(function (b) { return b.value; }).concat([1]));
    var g = ev.storeGrowth;
    var kpis = [["bolsa", num(ev.projectedStore) + " u.", "Venta proyectada / semana en tienda"], ["objetivo", p.price ? "$" + num(p.price) : "s/d", "Precio (competencia)"],
      ["chispas", p.margin ? p.margin + "%" : "s/d", "Margen de análogos"], ["tendencia", g === null ? "s/d" : (g > 0 ? "+" : "") + Math.round(g) + "%", "Tendencia subcategoría"]];
    var factors = '<ul class="lab-factors">' + ev.factors.map(function (f) {
      return "<li><span>" + esc(f.label) + " <small>(" + f.weight + "%)</small></span><b>" + (f.value === null ? "Sin datos" : f.value + "/100") + "</b></li>";
    }).join("") + "</ul>";
    return '<section class="lab-card lab-comm" aria-label="Análisis comercial en ' + esc(s.name) + '">' +
      '<header class="lab-comm__head">' + ico("tienda") + "<div><span>Tienda seleccionada</span><h2>" + esc(s.name) + "</h2></div></header>" +
      '<div class="lab-kpis">' + kpis.map(function (k) { return '<div class="lab-kpi">' + ico("lab-" + k[0]) + "<strong>" + esc(k[1]) + "</strong><span>" + esc(k[2]) + "</span></div>"; }).join("") + "</div>" +
      '<div class="lab-chartrow"><div class="lab-chart"><div class="lab-chart__head"><strong>Unidades de ' + esc(p.category) + "</strong>" + tooltip("Unidades diarias vendidas de la subcategoría en esta tienda (BBDD Ventas, 1–14 oct 2026).", "sm") + "<small>Por día · 1–14 oct</small></div>" +
      '<div class="lab-bars lab-bars--daily" role="list">' + bars.map(function (b) {
        return '<div role="listitem" tabindex="0" aria-label="' + esc(b.label) + ": " + b.value + ' unidades" data-bar><span class="lab-bartip" hidden><strong>' + b.value + " u.</strong>" + esc(b.label) + '</span><i style="height:' + Math.max(6, b.value / max * 100) + '%"></i><small>' + esc(b.label.split(" ")[0]) + "</small></div>";
      }).join("") + "</div></div>" +
      '<div class="lab-affinity">' + ring(ev.affinity) + '<div class="lab-affinity__txt"><span>Afinidad</span><b>' + label + "</b></div></div></div>" + factors +
      '<div class="lab-reco" style="margin-top:12px">' + ico("lab-chispas") + "<div><strong>Recomendación de pilotaje</strong><span>" + esc(LAB.recommendation(ev, p, s)) + "</span></div></div>" + saveBtn(p, s) + "</section>";
  }
  function renderProductDetail() {
    var p = LAB.product(state.productId), sel = state.storeId ? LAB.store(state.storeId) : null;
    var rows = LAB.stores.map(function (s) { return { s: s, a: LAB.evaluation(p.id, s.id).affinity }; });
    rows.sort(function (x, y) { return state.rankDir === "desc" ? y.a - x.a : x.a - y.a; });
    var on = isSaved(p);
    view.innerHTML =
      '<div class="lab-product-grid"><section class="lab-card lab-rankcard" aria-label="Afinidad por tienda"><header class="lab-phead"><button class="lab-phead__back tap" type="button" data-back-products aria-label="Volver a productos">' + ico("lab-izq") + "</button>" +
      '<img src="' + p.image + '" alt=""><div class="lab-phead__txt"><h2>' + esc(p.name) + "</h2><span>" + esc(p.brand) + " · " + esc(p.category) + "</span></div>" + bookmark(p) + "</header>" +
      '<div class="lab-rank"><div class="lab-rank__title"><div><h2>Afinidad por tienda</h2><p>Potencial de desempeño del producto en cada tienda Turbo.</p></div></div>' +
      '<div class="lab-rank__head"><span>Tienda</span><button class="lab-rank__sort tap" type="button" data-sort aria-label="Ordenar por afinidad, ' + (state.rankDir === "desc" ? "mayor a menor" : "menor a mayor") + '">Afinidad ' + (state.rankDir === "desc" ? "↓" : "↑") + "</button></div>" +
      '<div class="lab-rank__list">' + rows.map(function (r) {
        var cur = sel && sel.id === r.s.id;
        return '<button class="lab-row tap' + (cur ? " is-selected" : "") + '" type="button" data-pick-store="' + r.s.id + '" aria-pressed="' + !!cur + '"><strong>' + esc(r.s.name) + '</strong><i><b style="width:' + r.a + '%"></b></i><span>' + r.a + "</span>" + (cur ? ico("check") : "<span></span>") + "</button>";
      }).join("") + "</div></div></section>" +
      (sel ? commercialAnalysis(p, sel) : emptyPanel("Selecciona una tienda", "Elige una tienda del listado para ver el alcance y potencial de este producto.", "")) + "</div>";
    void on;
  }

  /* ---------------- Render ---------------- */
  function render() {
    selects = [];
    flowBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.flow === state.flow)); b.classList.toggle("is-active", b.dataset.flow === state.flow); });
    if (state.flow === "stores") (state.storeId ? renderStoreDetail : renderStores)();
    else (state.productId ? renderProductDetail : renderProducts)();
    if (focusKey) { var el = view.querySelector('[data-focus="' + focusKey + '"]'); if (el) el.focus(); focusKey = null; }
  }

  function toast(text) {
    clearTimeout(toastTimer);
    toastHost.innerHTML = '<div class="lab-toast">' + ico("check") + esc(text) + "</div>";
    toastTimer = setTimeout(function () { toastHost.innerHTML = ""; }, 2400);
  }

  /* ---------------- Eventos (delegados) ---------------- */
  flowBtns.forEach(function (b) { b.addEventListener("click", function () { state.flow = b.dataset.flow; render(); }); });
  view.addEventListener("click", function (e) {
    var t = e.target.closest("[data-store],[data-pick-product],[data-product],[data-pick-store],[data-bookmark],[data-back-stores],[data-back-products],[data-sort],[data-save-analysis],[data-adv],[data-clear-stores]");
    if (!t) return;
    if (t.dataset.store) { state.storeId = t.dataset.store; state.productId = null; render(); window.scrollTo(0, 0); }
    else if (t.dataset.pickProduct) { state.productId = t.dataset.pickProduct; focusKey = null; render(); }
    else if (t.dataset.product) { state.productId = t.dataset.product; state.storeId = null; render(); }
    else if (t.dataset.pickStore) { state.storeId = t.dataset.pickStore; render(); }
    else if (t.dataset.bookmark) { var p = LAB.product(t.dataset.bookmark); G.toggle(toItem(p)); }
    else if ("backStores" in t.dataset) { state.storeId = null; state.productId = null; render(); }
    else if ("backProducts" in t.dataset) { state.productId = null; state.storeId = null; render(); }
    else if ("sort" in t.dataset) { state.rankDir = state.rankDir === "desc" ? "asc" : "desc"; focusKey = null; render(); }
    else if ("saveAnalysis" in t.dataset) {
      if (state.productId && state.storeId && !savedAnalyses[state.productId + "|" + state.storeId]) {
        savedAnalyses[state.productId + "|" + state.storeId] = true; render(); toast("Análisis guardado correctamente");
      }
    }
    else if ("adv" in t.dataset) { state.storeFilters.adv = !state.storeFilters.adv; focusKey = "adv"; render(); }
    else if ("clearStores" in t.dataset) { state.storeFilters = { macro: "Todas", category: "Todas", status: "Todos", adv: false }; render(); }
  });
  view.addEventListener("pointerover", function (e) {
    var bar = e.target.closest && e.target.closest("[data-bar]");
    $$("[data-bar]").forEach(function (b) { var on = b === bar; b.classList.toggle("is-active", on); b.firstElementChild.hidden = !on; });
  });
  view.addEventListener("pointerleave", function () { $$("[data-bar]").forEach(function (b) { b.classList.remove("is-active"); b.firstElementChild.hidden = true; }); });
  view.addEventListener("focusin", function (e) { var b = e.target.closest && e.target.closest("[data-bar]"); if (b) { b.classList.add("is-active"); b.firstElementChild.hidden = false; } });
  view.addEventListener("focusout", function (e) { var b = e.target.closest && e.target.closest("[data-bar]"); if (b) { b.classList.remove("is-active"); b.firstElementChild.hidden = true; } });

  var off = G.onChange(function () {
    if (state.productId && state.flow === "stores" && !isSaved(LAB.product(state.productId))) state.productId = null;
    var k = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.bookmark;
    render();
    if (k) { var el = view.querySelector('[data-bookmark="' + k + '"]'); if (el) el.focus(); }
  });

  render();

  return function destroy() {
    document.removeEventListener("pointerdown", onPointerDown);
    clearTimeout(toastTimer);
    off();
  };
});
