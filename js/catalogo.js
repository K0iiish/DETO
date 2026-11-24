/* Pantalla Catálogo — JS vanilla (lógica traducida de Figma Make: src/pages/CatalogPage.tsx y CatalogAdvancedFilters.tsx).
   - Taxonomía (macro → categoría → subcategoría): data/taxonomia.js (compartida con Tendencias y Calendario).
   - Estados de la vista: "overview" (resumen + tabla), "selected" (tabla + detalle) y "expanded" (solo tabla = "Catálogo solo").
   - Estados de los componentes por aria-pressed / .is-selected / .is-active (sin copias de markup). */
DETO.page("catalogo", function () {
  "use strict";

  var TAX = DETO.taxonomia;
  var MACROS = TAX.macros;
  var PLACEHOLDER = "assets/img/catalogo-producto-placeholder.svg"; /* TODO: reemplazar por assets/img/catalogo-chocolate-con-leche-250g.png cuando llegue la imagen */

  /* ---------------- Datos reales (data/deto-catalogo.js: BBDD Ventas agregada por producto, 1–14 oct 2026) ---------------- */
  var C = window.DETO_CATALOGO, N_STORES = 9;
  var PRODUCTS = C.rows.map(function (r, i) {
    return { id: i + 1, sku: r[0], name: r[1], brand: r[2] || "Sin marca", macro: r[3], category: r[4], subcategory: r[5],
      price: r[6] || 0, margin: r[7] === null ? 0 : Math.round(r[7]), units: r[8], trend: r[9] === null ? 0 : Math.round(r[9]), trendKnown: r[9] !== null,
      stock: r[10], image: DETO.img.src(r[0]), weekly: r[11] };
  });
  var INITIAL = { macro: "despensa-y-productos-secos", category: "Snacks y confitería" };
  var PRICE_MAX = Math.ceil(Math.max.apply(null, PRODUCTS.map(function (p) { return p.price; })) / 1000) * 1000;
  var UNITS_MAX = Math.ceil(Math.max.apply(null, PRODUCTS.map(function (p) { return p.units; })) / 100) * 100;
  /* Surtido y crecimiento de la categoría activa (se recalculan con los datos) */
  function assortment() {
    var list = PRODUCTS.filter(function (p) { return p.macro === state.macro && p.category === state.category; });
    var by = {}, total = 0;
    list.forEach(function (p) { by[p.subcategory] = by[p.subcategory] || { label: p.subcategory, sku: 0, units: 0 }; by[p.subcategory].sku++; by[p.subcategory].units += p.units; total += p.units; });
    var rows = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.units - a.units; });
    if (rows.length > 5) {
      var rest = rows.slice(4).reduce(function (a, r) { a.sku += r.sku; a.units += r.units; return a; }, { label: "Otras", sku: 0, units: 0 });
      rows = rows.slice(0, 4).concat([rest]);
    }
    var acc = 0;
    rows.forEach(function (r, i) { r.share = i === rows.length - 1 ? Math.max(0, 100 - acc) : Math.round(100 * r.units / Math.max(1, total)); acc += r.share; });
    return { rows: rows, sku: list.length };
  }
  function growing() {
    var list = PRODUCTS.filter(function (p) { return p.macro === state.macro && p.category === state.category; });
    var by = {};
    list.forEach(function (p) {
      var w1 = p.weekly.slice(0, 7).reduce(function (a, b) { return a + b; }, 0), w2 = p.weekly.slice(7).reduce(function (a, b) { return a + b; }, 0);
      by[p.subcategory] = by[p.subcategory] || { label: p.subcategory, w1: 0, w2: 0, icon: "catalogo-20" };
      by[p.subcategory].w1 += w1; by[p.subcategory].w2 += w2;
    });
    return Object.keys(by).map(function (k) { var g = by[k]; g.growth = g.w1 >= 10 ? Math.round(100 * (g.w2 - g.w1) / g.w1) : null; return g; })
      .filter(function (g) { return g.growth !== null; }).sort(function (a, b) { return b.growth - a.growth; }).slice(0, 3);
  }
  var COLUMNS = [
    { key: "sku", label: "SKU" }, { key: "name", label: "Producto" }, { key: "brand", label: "Proveedor" }, { key: "subcategory", label: "Categoría" },
    { key: "price", label: "Precio" }, { key: "margin", label: "Margen" }, { key: "units", label: "Unid. 14 días" }, { key: "trend", label: "% Tendencia" }, { key: "stock", label: "Tiendas" }
  ];
  var DEFAULT_FILTERS = { brands: [], salesTrend: "all", marginMin: 0, stock: "all", priceMin: 0, priceMax: PRICE_MAX, unitsMin: 0, unitsMax: UNITS_MAX };
  var SAVED_KEY = "deto-catalogo-guardados";

  /* ---------------- Utilidades ---------------- */
  var root = document.getElementById("contenido");
  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { try { return n.toLocaleString("es-CL"); } catch (e) { return String(n); } }
  function money(n) { return "$" + fmt(n); }
  function ico(name) { return '<span class="ico ico--cat-' + name + '" aria-hidden="true"></span>'; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  /* "Stock" no viene en los datos: se muestra la cobertura (tiendas que vendieron el producto, de 9) */
  function stockTone(s) { return s >= 7 ? "high" : s > 0 ? "low" : "none"; }
  function stockPct(s) { return Math.min(100, (s / N_STORES) * 100); }
  function macroById(id) { return TAX.macro(id) || MACROS[0]; }
  function loadSaved() { try { var r = localStorage.getItem(SAVED_KEY); return r ? JSON.parse(r) : []; } catch (e) { return []; } }
  function persistSaved() { try { localStorage.setItem(SAVED_KEY, JSON.stringify(state.saved)); } catch (e) { /* sin almacenamiento */ } }

  /* ---------------- Estado ---------------- */
  var firstMacro = macroById(INITIAL.macro);
  var state = {
    macro: firstMacro.id, category: INITIAL.category, subcategory: "Todas", filters: clone(DEFAULT_FILTERS),
    query: "", selectedId: null, expanded: false, sort: { key: "units", dir: "desc" }, saved: loadSaved(), notice: false
  };
  var searchInput = document.getElementById("busqueda-global");
  if (searchInput) state.query = searchInput.value || "";

  /* ---------------- Derivados ---------------- */
  function currentMacro() { return macroById(state.macro); }
  function currentCategory() { return currentMacro().categories.filter(function (c) { return c.label === state.category; })[0] || currentMacro().categories[0]; }
  function categoryProducts() { return PRODUCTS.filter(function (p) { return p.macro === state.macro && p.category === state.category; }); }
  function activeCount() {
    var f = state.filters;
    return f.brands.length + Number(f.salesTrend !== "all") + Number(f.marginMin > 0) + Number(f.stock !== "all") +
      Number(f.priceMin > 0 || f.priceMax < PRICE_MAX) + Number(f.unitsMin > 0 || f.unitsMax < UNITS_MAX);
  }
  function visibleProducts() {
    var f = state.filters, q = state.query.trim().toLowerCase();
    return categoryProducts().filter(function (p) {
      var okSub = state.subcategory === "Todas" || p.subcategory === state.subcategory;
      var okQ = !q || (p.sku + " " + p.name + " " + p.brand + " " + p.subcategory).toLowerCase().indexOf(q) >= 0;
      var okBrand = !f.brands.length || f.brands.indexOf(p.brand) >= 0;
      var okTrend = f.salesTrend === "all" || (f.salesTrend === "growing" ? p.trend >= 0 : p.trend < 0);
      var okStock = f.stock === "all" || (f.stock === "high" && p.stock >= 7) || (f.stock === "low" && p.stock > 0 && p.stock < 7) || (f.stock === "none" && p.stock === 0);
      return okSub && okQ && okBrand && okTrend && okStock && (f.marginMin === 0 || p.margin >= f.marginMin) && p.price >= f.priceMin && p.price <= f.priceMax && p.units >= f.unitsMin && p.units <= f.unitsMax;
    });
  }
  function isInitialOverview() {
    return state.macro === INITIAL.macro && state.category === INITIAL.category && state.subcategory === "Todas" && activeCount() === 0 && !state.query.trim();
  }
  function sorted(list) {
    var k = state.sort.key, d = state.sort.dir === "asc" ? 1 : -1;
    return list.slice().sort(function (a, b) {
      var x = a[k], y = b[k];
      var c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "es");
      return c * d;
    });
  }

  /* ---------------- Desplegable de selección única (reutiliza .filter-dropdown de Tendencias) ---------------- */
  var dropdowns = [];
  function closeAll(except) { dropdowns.forEach(function (d) { if (d !== except) d.close(); }); if (advApi && advApi !== except) advApi.close(true); }
  function Select(host, cfg) {
    var self = this;
    host.innerHTML = '<button class="filter-trigger tap" type="button" aria-expanded="false" aria-haspopup="listbox" aria-labelledby="' + cfg.labelId + '" aria-label="' + esc(cfg.label) + '"><span></span><span class="ico ico--chevron-abajo" aria-hidden="true"></span></button><div class="filter-menu" role="listbox" aria-label="' + esc(cfg.label) + '" hidden></div>';
    var trigger = $(".filter-trigger", host), menu = $(".filter-menu", host), value = cfg.value, options = cfg.options;
    trigger.removeAttribute("aria-labelledby");
    function paint() {
      menu.innerHTML = "";
      options.forEach(function (o) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "filter-option"; b.setAttribute("role", "option"); b.dataset.value = o;
        b.innerHTML = '<i><span class="ico ico--check" aria-hidden="true"></span></i><span></span>'; b.lastElementChild.textContent = o;
        b.addEventListener("click", function () { self.close(); trigger.focus(); if (o !== value) cfg.onChange(o); });
        menu.appendChild(b);
      });
      self.set(value);
    }
    self.set = function (v) {
      value = v; trigger.firstElementChild.textContent = v;
      $$(".filter-option", menu).forEach(function (b) { var on = b.dataset.value === v; b.classList.toggle("is-selected", on); b.setAttribute("aria-selected", String(on)); });
    };
    self.update = function (opts, v) { options = opts; value = v; paint(); };
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
    paint(); dropdowns.push(self);
  }

  /* ---------------- Carrusel de macrocategorías ---------------- */
  var track = $("[data-macro-track]");
  track.innerHTML = MACROS.map(function (m) {
    return '<button class="cat-macro" type="button" data-macro="' + m.id + '" aria-pressed="false">' + ico(m.icon) + "<span>" + esc(m.label) + "</span></button>";
  }).join("");
  function scrollTrack(dir) { track.scrollBy({ left: dir * 330, behavior: "smooth" }); }
  $("[data-macro-prev]").addEventListener("click", function () { scrollTrack(-1); });
  $("[data-macro-next]").addEventListener("click", function () { scrollTrack(1); });
  track.addEventListener("click", function (e) {
    var b = e.target.closest("[data-macro]");
    if (!b) return;
    selectMacro(b.dataset.macro);
  });
  function syncMacros() { $$(".cat-macro", track).forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.macro === state.macro)); }); }

  /* ---------------- Filtros principales ---------------- */
  var categorySelect = new Select($('[data-select="category"]'), {
    label: "Categoría", labelId: "cat-lbl-categoria", value: state.category,
    options: currentMacro().categories.map(function (c) { return c.label; }),
    onChange: function (v) { state.category = v; state.subcategory = "Todas"; state.filters = clone(DEFAULT_FILTERS); state.selectedId = null; syncAdv(); syncSelects(); render(); }
  });
  var subSelect = new Select($('[data-select="subcategory"]'), {
    label: "Subcategoría", labelId: "cat-lbl-subcategoria", value: state.subcategory, options: ["Todas"].concat(currentCategory().subcategories),
    onChange: function (v) { state.subcategory = v; syncSelects(); render(); }
  });
  function syncSelects() {
    categorySelect.update(currentMacro().categories.map(function (c) { return c.label; }), state.category);
    subSelect.update(["Todas"].concat(currentCategory().subcategories), state.subcategory);
  }

  /* ---------------- Filtros avanzados ---------------- */
  var advHost = $("[data-adv]"), advApi = null, draft = clone(state.filters), advOpen = false;
  advHost.innerHTML =
    '<button class="cat-adv__btn tap" type="button" aria-expanded="false" aria-haspopup="dialog" aria-controls="cat-adv-panel"><span class="ico ico--filtros" aria-hidden="true"></span>Filtros<i data-dot></i><b data-count hidden></b></button>' +
    '<div class="cat-panel" id="cat-adv-panel" role="dialog" aria-label="Filtros avanzados" hidden></div>';
  var advBtn = $(".cat-adv__btn", advHost), advPanel = $(".cat-panel", advHost);

  function renderPanel() {
    var f = draft, brands = Array.from ? Array.from(new Set(categoryProducts().map(function (p) { return p.brand; }))) : [];
    function seg(items, cur, name) { return items.map(function (it) { return '<button type="button" data-seg="' + name + '" data-v="' + it[0] + '" class="' + (cur === it[0] ? "is-selected" : "") + '" aria-pressed="' + (cur === it[0]) + '">' + it[1] + "</button>"; }).join(""); }
    advPanel.innerHTML =
      '<header class="cat-panel__head"><div><strong>Filtros avanzados</strong><span>Refina los productos visibles</span></div><button class="cat-panel__close tap" type="button" data-adv-close aria-label="Cerrar filtros">' + ico("cerrar-18") + "</button></header>" +
      '<section><strong>Proveedor</strong><div class="cat-checks">' + (brands.length ? brands.map(function (b) {
        var on = f.brands.indexOf(b) >= 0;
        return '<button type="button" data-brand="' + esc(b) + '" class="' + (on ? "is-selected" : "") + '" role="checkbox" aria-checked="' + on + '"><i>' + ico("check") + "</i>" + esc(b) + "</button>";
      }).join("") : '<span class="cat-note">Sin marcas disponibles</span>') + "</div></section>" +
      '<section><strong>Tendencia de ventas</strong><div class="cat-seg">' + seg([["all", "Todas"], ["growing", "En crecimiento"], ["declining", "En descenso"]], f.salesTrend, "salesTrend") + "</div></section>" +
      '<section><label class="cat-range"><span><strong>Margen mínimo</strong><b data-margin-out>' + f.marginMin + '%</b></span><input type="range" min="0" max="50" value="' + f.marginMin + '" data-range="marginMin"></label></section>' +
      '<section><strong>Cobertura (tiendas que lo vendieron)</strong><div class="cat-seg cat-seg--4">' + seg([["all", "Todas"], ["high", "7–9"], ["low", "1–6"], ["none", "0"]], f.stock, "stock") + "</div></section>" +
      '<section><strong>Precio</strong><div class="cat-nums"><label>Mínimo<input type="number" min="0" value="' + f.priceMin + '" data-num="priceMin"></label><label>Máximo<input type="number" min="0" value="' + f.priceMax + '" data-num="priceMax"></label></div></section>' +
      '<section><strong>Unidades vendidas (14 días)</strong><div class="cat-nums"><label>Mínimo<input type="number" min="0" value="' + f.unitsMin + '" data-num="unitsMin"></label><label>Máximo<input type="number" min="0" value="' + f.unitsMax + '" data-num="unitsMax"></label></div></section>' +
      '<footer class="cat-panel__foot"><button type="button" data-adv-clear>Limpiar filtros</button><button type="button" data-adv-apply>Aplicar filtros</button></footer>';
  }
  function syncAdv() {
    var n = activeCount();
    $("[data-dot]", advHost).hidden = n > 0;
    var c = $("[data-count]", advHost); c.hidden = n === 0; c.textContent = n;
  }
  function openAdv() { closeAll(advApi); draft = clone(state.filters); renderPanel(); advPanel.hidden = false; advHost.classList.add("is-open"); advBtn.setAttribute("aria-expanded", "true"); advOpen = true; }
  function closeAdv(silent) { if (!advOpen) return; advPanel.hidden = true; advHost.classList.remove("is-open"); advBtn.setAttribute("aria-expanded", "false"); advOpen = false; draft = clone(state.filters); if (!silent) advBtn.focus(); }
  advApi = { close: closeAdv };
  advBtn.addEventListener("click", function () { advOpen ? closeAdv() : openAdv(); });
  advPanel.addEventListener("click", function (e) {
    var t = e.target;
    if (t.closest("[data-adv-close]")) return closeAdv();
    var br = t.closest("[data-brand]");
    if (br) { var b = br.dataset.brand, i = draft.brands.indexOf(b); if (i >= 0) draft.brands.splice(i, 1); else draft.brands.push(b); return renderPanelKeepFocus('[data-brand="' + b.replace(/"/g, '\\"') + '"]'); }
    var sg = t.closest("[data-seg]");
    if (sg) { draft[sg.dataset.seg] = sg.dataset.v; return renderPanelKeepFocus('[data-seg="' + sg.dataset.seg + '"][data-v="' + sg.dataset.v + '"]'); }
    if (t.closest("[data-adv-clear]")) { draft = clone(DEFAULT_FILTERS); return renderPanelKeepFocus("[data-adv-clear]"); }
    if (t.closest("[data-adv-apply]")) { state.filters = clone(draft); closeAdv(true); advBtn.focus(); syncAdv(); render(); }
  });
  function renderPanelKeepFocus(sel) { renderPanel(); var el = $(sel, advPanel); if (el) el.focus(); }
  advPanel.addEventListener("input", function (e) {
    var t = e.target;
    if (t.dataset.range) { draft[t.dataset.range] = Number(t.value); $("[data-margin-out]", advPanel).textContent = t.value + "%"; }
  });
  advPanel.addEventListener("change", function (e) {
    var t = e.target, k = t.dataset.num;
    if (!k) return;
    var v = Math.max(0, Number(t.value) || 0);
    if (k === "priceMin") v = Math.min(v, draft.priceMax);
    if (k === "priceMax") v = Math.max(v, draft.priceMin);
    if (k === "unitsMin") v = Math.min(v, draft.unitsMax);
    if (k === "unitsMax") v = Math.max(v, draft.unitsMin);
    draft[k] = v; t.value = v;
  });
  advHost.addEventListener("keydown", function (e) { if (e.key === "Escape" && advOpen) { e.stopPropagation(); closeAdv(); } });

  /* Cierre al hacer clic fuera (como el Make: pointerdown) */
  function onPointerDown(e) {
    if (!e.target.closest(".filter-dropdown")) dropdowns.forEach(function (d) { d.close(); });
    if (advOpen && !e.target.closest(".cat-adv")) closeAdv(true);
  }
  document.addEventListener("pointerdown", onPointerDown);

  /* ---------------- Vista (resumen / tabla / detalle) ---------------- */
  var viewEl = $("[data-view]"), lastMode = null, hoveredSeg = null;
  function mode() { return state.selectedId ? "selected" : state.expanded ? "expanded" : "overview"; }

  function overviewHtml() {
    var AS = assortment(), ASSORTMENT = AS.rows, hasData = ASSORTMENT.length > 0;
    var cum = 0, body;
    if (hasData) {
      body =
        '<div class="cat-ov__content"><div class="cat-donut" data-donut><svg viewBox="0 0 150 150" role="group" aria-label="Composición del surtido"><circle cx="75" cy="75" r="54" class="cat-donut__bg"/>' +
        ASSORTMENT.map(function (it, i) {
          var off = -cum; cum += it.share;
          return '<circle class="cat-donut__seg tone-' + (i + 1) + (state.subcategory === it.label ? " is-selected" : "") + '" cx="75" cy="75" r="54" pathLength="100" stroke-dasharray="' + it.share + " " + (100 - it.share) + '" stroke-dashoffset="' + off + '" tabindex="0" role="button" aria-pressed="' + (state.subcategory === it.label) + '" data-sub="' + esc(it.label) + '" data-i="' + i + '" aria-label="' + esc(it.label) + ": " + it.sku + " SKU, " + it.share + '%"/>';
        }).join("") + '</svg><div class="cat-donut__center"><strong>' + fmt(AS.sku) + '</strong><span>SKU</span></div><div class="cat-tip" role="tooltip" data-tip hidden></div></div>' +
        '<div class="cat-breakdown"><div class="cat-breakdown__head"><span>Subcategoría</span><span>SKU</span><span>Participación</span></div>' +
        ASSORTMENT.map(function (it, i) {
          return '<button type="button" class="cat-breakdown__row' + (state.subcategory === it.label ? " is-selected" : "") + '" data-sub="' + esc(it.label) + '" aria-pressed="' + (state.subcategory === it.label) + '"><i class="tone-' + (i + 1) + '"></i><strong>' + esc(it.label) + "</strong><span>" + it.sku + '</span><div><i class="tone-' + (i + 1) + '" style="width:' + it.share + '%"></i></div><b>' + it.share + "%</b></button>";
        }).join("") + "</div></div>";
    } else {
      body = '<div class="cat-empty-mini">' + ico("catalogo-28") + "<strong>Sin datos de surtido disponibles</strong><span>No existen registros para esta familia en los datos actuales.</span></div>";
    }
    return '<section class="cat-card cat-ov" aria-labelledby="cat-ov-title"><header><h2 id="cat-ov-title">Surtido actual</h2><p>Composición del surtido y cantidad de SKU en ' + esc(state.category) + ".</p></header>" + body + "</section>";
  }
  function summaryHtml() {
    var init = true, list = visibleProducts(), GROWING = growing();
    var sku = list.length, brands = new Set(list.map(function (p) { return p.brand; })).size;
    var margin = list.length ? Math.round(list.reduce(function (a, p) { return a + p.margin; }, 0) / list.length) : 0;
    var weekly = Math.round(list.reduce(function (a, p) { return a + p.units; }, 0) / 2);
    return '<section class="cat-card cat-sum" aria-labelledby="cat-sum-title"><header><span aria-hidden="true">' + ico("catalogo-23") + '</span><h2 id="cat-sum-title">Resumen del surtido</h2></header>' +
      '<div class="cat-kpis"><div><strong>' + fmt(sku) + "</strong><span>SKU</span></div><div><strong>" + brands + "</strong><span>Proveedores</span></div><div><strong>" + margin + "%</strong><span>Margen prom.</span></div><div><strong>" + fmt(weekly) + " u.</strong><span>Unidades / semana</span></div></div>" +
      '<div class="cat-grow"><h3>' + ico("tendencia-20") + " Lo que más crece</h3>" +
      (GROWING.length ? GROWING.map(function (g) { return '<button type="button" class="cat-grow__item" data-sub="' + esc(g.label) + '">' + ico(g.icon) + "<span>" + esc(g.label) + "</span><b>" + (g.growth > 0 ? "+" : "") + g.growth + "%</b></button>"; }).join("")
        : '<div class="cat-grow__note"><span>Indicadores actualizados según los filtros activos.</span></div>') + "</div></section>";
  }
  function tableHtml(withBack) {
    var list = sorted(visibleProducts()), total = list.length, exp = state.expanded;
    var cls = "cat-card cat-table" + (withBack ? " has-back" : "") + (exp ? " is-expanded" : "");
    var head = "<header>" + (withBack || exp ? '<button type="button" class="cat-back tap" data-back aria-label="Volver a la vista general">' + ico("izq-21") + "</button>" : "") +
      '<div><h2 id="cat-table-title">Productos del subcatálogo</h2><p>Detalle del surtido en ' + esc(state.category) + " (" + fmt(total) + " SKU).</p></div>" +
      (exp ? "" : '<button type="button" class="cat-viewall" data-viewall>Ver todo el catálogo ' + ico("der-17") + "</button>") + "</header>";
    var body;
    if (list.length) {
      body = '<div class="cat-scroll" role="table" aria-labelledby="cat-table-title" aria-rowcount="' + (list.length + 1) + '"><div class="cat-grid cat-grid--head" role="row">' +
        COLUMNS.map(function (c) {
          var on = state.sort.key === c.key;
          return '<span role="columnheader" aria-sort="' + (on ? (state.sort.dir === "asc" ? "ascending" : "descending") : "none") + '"><button type="button" class="cat-sort" data-sort="' + c.key + '">' + c.label + (on ? '<span class="cat-sort__ico' + (state.sort.dir === "asc" ? " is-asc" : "") + '">' + ico("orden") + "</span>" : "") + "</button></span>";
        }).join("") + "</div><div>" +
        list.map(function (p) {
          return '<article class="cat-grid cat-row' + (state.selectedId === p.id ? " is-selected" : "") + '" role="row" tabindex="0" data-id="' + p.id + '" aria-label="Ver detalle de ' + esc(p.name) + '" aria-selected="' + (state.selectedId === p.id) + '">' +
            '<span role="cell">' + esc(p.sku) + '</span><strong role="cell" class="cat-pname"><img class="cat-thumb" src="' + p.image + '" alt="" width="24" height="24"><span>' + esc(p.name) + '</span></strong><span role="cell" class="cat-brand">' + esc(p.brand) + '</span><span role="cell">' + esc(p.subcategory) + "</span>" +
            '<strong role="cell">' + money(p.price) + '</strong><strong role="cell">' + p.margin + '%</strong><span role="cell">' + fmt(p.units) + ' u.</span>' +
            '<span role="cell" class="cat-trend' + (p.trend < 0 ? " is-negative" : "") + '">' + (p.trendKnown ? ico("tendencia") + (p.trend > 0 ? "+" : "") + p.trend + "%" : "s/d") + "</span>" +
            '<span role="cell" class="cat-stock"><span class="cat-bar"><b class="' + stockTone(p.stock) + '" style="width:' + stockPct(p.stock) + '%"></b></span>' + p.stock + "/" + N_STORES + (state.selectedId ? ico("der-17") : "") + "</span></article>";
        }).join("") + "</div></div>";
    } else {
      body = '<div class="cat-empty">' + ico("busqueda") + "<strong>No encontramos productos con estos filtros</strong><span>Prueba ajustando la categoría o limpiando los filtros aplicados.</span><button type=\"button\" data-clear>Limpiar filtros</button></div>";
    }
    return '<section class="' + cls + '">' + head + body + "</section>";
  }
  function detailHtml(p) {
    var max = Math.max.apply(null, p.weekly), neg = p.trend < 0, saved = state.saved.indexOf(p.id) >= 0;
    var bars = p.weekly.map(function (v, i) {
      return '<button type="button" class="' + (i === p.weekly.length - 1 ? "is-current" : "") + '" data-bar="' + i + '" aria-label="' + (i + 1) + ' de octubre: ' + v + ' unidades vendidas" data-v="' + v + '" style="height:' + Math.max(18, (v / max) * 100) + '%"></button>';
    }).join("");
    return '<aside class="cat-card cat-detail" aria-label="Detalle de ' + esc(p.name) + '"><button type="button" class="cat-detail__close" data-close aria-label="Cerrar detalle">' + ico("cerrar") + "</button>" +
      '<section class="cat-hero"><div class="cat-hero__img"><img src="' + p.image + '" alt="' + esc(p.name) + '" width="135" height="112"></div><div><span class="cat-in">' + ico("check") + ' En el catálogo</span><h2>' + esc(p.name) + "</h2><p>" + esc(p.brand) + " · " + esc(p.subcategory) + '</p><span class="cat-store">' + ico("tienda") + "Vendido en " + p.stock + " de " + N_STORES + " tiendas</span></div>" +
      '<button type="button" class="cat-save" data-save aria-pressed="' + saved + '" aria-label="' + (saved ? "Quitar de guardados" : "Guardar producto") + '">' + ico("guardar") + "</button></section>" +
      '<section class="cat-dkpis"><div><span>SKU</span><strong>' + esc(p.sku) + "</strong></div><div><span>Precio</span><strong>" + money(p.price) + "</strong></div><div><span>Margen</span><strong>" + p.margin + "%</strong></div><div><span>U. 14 días</span><strong>" + fmt(p.units) + " u.</strong></div></section>" +
      '<section class="cat-chart"><header><h3>' + ico("tendencia-20") + " Tendencia " + ico("info") + '</h3><span class="' + (neg ? "is-negative" : "") + '">' + ico("tendencia") + (p.trendKnown ? (p.trend > 0 ? "+" : "") + p.trend + "%" : "s/d") + " <small>semana 2 vs semana 1</small></span></header>" +
      '<div class="cat-bars" data-bars>' + bars + '</div><div class="cat-axis"><span>1 oct</span><span>4 oct</span><span>7 oct</span><span>11 oct</span><span>14 oct</span></div><small class="cat-demo">Unidades vendidas por día · BBDD Ventas.</small></section>' +
      '<section class="cat-dstock"><header><h3>' + ico("catalogo-20") + " Cobertura</h3><strong>" + p.stock + " de " + N_STORES + ' tiendas</strong></header><div class="cat-bar"><b class="' + stockTone(p.stock) + '" style="width:' + stockPct(p.stock) + '%"></b></div></section>' +
      (state.notice ? '<div class="cat-notice" role="status">' + ico("info") + "Ya está en el catálogo Turbo. Las oportunidades nuevas se evalúan en Tendencias y LAB.</div>" : "") +
      '<footer class="cat-actions"><button type="button" data-eval>Evaluar oportunidad ' + ico("flecha") + "</button></footer></aside>";
  }

  function render(opts) {
    opts = opts || {};
    var m = mode(), sel = state.selectedId ? PRODUCTS.filter(function (p) { return p.id === state.selectedId; })[0] : null;
    if (!sel && state.selectedId) { state.selectedId = null; m = mode(); }
    var focusRow = opts.focusRow;
    if (m === "selected") viewEl.innerHTML = '<div class="cat-selected">' + tableHtml(true) + detailHtml(sel) + "</div>";
    else if (m === "expanded") viewEl.innerHTML = tableHtml(false);
    else viewEl.innerHTML = '<div class="cat-overview">' + overviewHtml() + summaryHtml() + "</div>" + tableHtml(false);
    /* Animación de entrada solo al cambiar de modo (como el Make: catalog-detail-enter) */
    if (m !== lastMode) {
      if (m === "selected") $(".cat-selected", viewEl).classList.add("is-entering");
      if (m === "expanded") $(".cat-table", viewEl).classList.add("is-entering");
    }
    lastMode = m;
    syncMacros(); syncAdv();
    if (opts.focus) { var f = $(opts.focus, viewEl); if (f) f.focus(); }
  }

  /* ---------------- Acciones ---------------- */
  function selectMacro(id) {
    var m = macroById(id);
    state.macro = m.id; state.category = m.categories[0].label; state.subcategory = "Todas"; state.filters = clone(DEFAULT_FILTERS); state.selectedId = null; state.expanded = false; state.notice = false;
    syncSelects(); closeAdv(true); render();
  }
  function selectProduct(id) { state.selectedId = id; state.notice = false; render({ focus: '.cat-row[data-id="' + id + '"]' }); }
  function setSub(label) { state.subcategory = state.subcategory === label ? "Todas" : label; syncSelects(); render(); }
  function back() { state.selectedId = null; state.expanded = false; state.notice = false; render({ focus: "[data-viewall]" }); }
  function clearFilters() {
    state.subcategory = "Todas"; state.filters = clone(DEFAULT_FILTERS); state.query = ""; if (searchInput) searchInput.value = "";
    syncSelects(); render();
  }

  viewEl.addEventListener("click", function (e) {
    var t = e.target, el;
    if ((el = t.closest("[data-sort]"))) {
      var k = el.dataset.sort; state.sort = { key: k, dir: state.sort.key === k && state.sort.dir === "asc" ? "desc" : "asc" };
      return render({ focus: '[data-sort="' + k + '"]' });
    }
    if (t.closest("[data-viewall]")) { state.expanded = true; state.selectedId = null; return render({ focus: "[data-back]" }); }
    if (t.closest("[data-back]")) return back();
    if (t.closest("[data-clear]")) return clearFilters();
    if (t.closest("[data-close]")) { state.selectedId = null; state.notice = false; return render(); }
    if ((el = t.closest("[data-save]"))) {
      var id = state.selectedId, i = state.saved.indexOf(id);
      if (i >= 0) state.saved.splice(i, 1); else state.saved.push(id);
      persistSaved();
      var on = state.saved.indexOf(id) >= 0;
      el.setAttribute("aria-pressed", String(on)); el.setAttribute("aria-label", on ? "Quitar de guardados" : "Guardar producto");
      return;
    }
    if (t.closest("[data-eval]")) { state.notice = true; return render({ focus: "[data-eval]" }); }
    if ((el = t.closest("[data-sub]"))) return setSub(el.dataset.sub);
    if ((el = t.closest(".cat-row"))) return selectProduct(Number(el.dataset.id));
  });
  viewEl.addEventListener("keydown", function (e) {
    var row = e.target.closest && e.target.closest(".cat-row");
    if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectProduct(Number(row.dataset.id)); return; }
    var seg = e.target.closest && e.target.closest(".cat-donut__seg");
    if (seg && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setSub(seg.dataset.sub); return; }
    if (e.key === "Escape" && state.selectedId) { state.selectedId = null; state.notice = false; render(); }
  });

  /* Tooltips: donut (hover/foco) y barras semanales */
  function showTip(seg) {
    var tip = $("[data-tip]", viewEl); if (!tip) return;
    if (!seg) { tip.hidden = true; return; }
    var it = assortment().rows[Number(seg.dataset.i)];
    tip.innerHTML = "<strong>" + esc(it.label) + "</strong><span>" + it.sku + " SKU · " + it.share + "%</span>"; tip.hidden = false;
  }
  viewEl.addEventListener("pointerover", function (e) {
    var seg = e.target.closest(".cat-donut__seg"); if (seg) showTip(seg);
    var bar = e.target.closest("[data-bar]"); if (bar) showBar(bar);
  });
  viewEl.addEventListener("pointerout", function (e) {
    if (e.target.closest(".cat-donut__seg")) showTip(null);
    if (e.target.closest("[data-bar]")) showBar(null);
  });
  viewEl.addEventListener("focusin", function (e) {
    var seg = e.target.closest(".cat-donut__seg"); if (seg) showTip(seg);
    var bar = e.target.closest("[data-bar]"); if (bar) showBar(bar);
  });
  viewEl.addEventListener("focusout", function (e) {
    if (e.target.closest(".cat-donut__seg")) showTip(null);
    if (e.target.closest("[data-bar]")) showBar(null);
  });
  function showBar(bar) {
    $$("[data-bar]", viewEl).forEach(function (b) { b.classList.remove("is-active"); var s = b.querySelector("span"); if (s) s.remove(); });
    if (!bar) return;
    bar.classList.add("is-active");
    bar.insertAdjacentHTML("beforeend", '<span role="tooltip">Semana ' + (Number(bar.dataset.bar) + 1) + "<b>" + bar.dataset.v + " u.</b></span>");
  }

  /* Búsqueda global del header (el Make la pasa como query a la página) */
  function onSearch(e) { if (e.target && e.target.id === "busqueda-global") { state.query = e.target.value; render(); } }
  document.addEventListener("input", onSearch);

  /* ---------------- Inicio ---------------- */
  syncAdv();
  render();

  return function destroy() {
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("input", onSearch);
  };
});
