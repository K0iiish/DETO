/* Pantalla Tendencias — JS vanilla.
   Una sola card y una sola fila (plantillas <template>), estados por data-state / data-saved.
   Un solo panel de detalle compartido por la vista card y la vista fila. */
DETO.page("tendencias", function () {
  "use strict";

  /* ---------------- Datos reales (data/deto-real.js, generado por build_data.py) ---------------- */
  var R = window.DETO_REAL, SUM = R.summary;
  var PLACEHOLDER = "assets/img/catalogo-producto-placeholder.svg";
  var PRODUCTS = R.trends.map(function (t) {
    return {
      id: t.id, slug: t.slug, name: t.name, brand: t.brand || t.retailer, category: t.subcategory, macro: t.macro,
      status: t.status, sources: t.sources, trend: t.trend, sales: Math.round(t.sales), quantity: t.quantity,
      score: t.score, growth: t.growth === null ? 0 : Math.round(t.growth), growthKnown: t.growth !== null, image: DETO.img.src(t.ean, t.img, t.slug), ref: t
    };
  });
  var SALES_MAX = Math.max(50, Math.ceil(Math.max.apply(null, PRODUCTS.map(function (p) { return p.sales; })) / 50) * 50);

  var STATUS_OPTIONS = ["Fuera del catálogo"];
  var CATEGORY_OPTIONS = DETO.taxonomia.macroNames().filter(function (m) { return PRODUCTS.some(function (p) { return p.macro === m; }); });
  var SOURCE_OPTIONS = ["Líder", "Jumbo", "Novedades", "Más vendidos", "Promociones", "Ventas Turbo (análogos)"];
  var TREND_OPTIONS = ["En alza", "Creciendo", "Emergente", "Estable"];
  var TREND_ICON = { "En alza": "↑", "Creciendo": "↗", "Emergente": "✦", "Estable": "→" };
  var DEFAULT_ADV = { scoreMin: 0, scoreMax: 100, salesMin: 0, salesMax: SALES_MAX, trends: [], growthMin: 0 };
  var STORE_KEY = "deto-tendencias-guardadas";

  /* ---------------- Utilidades ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function byId(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0] || null; }
  function bySlug(slug) { return PRODUCTS.filter(function (p) { return p.slug === slug; })[0] || null; }
  function trendClass(t) { return "badge" + (t === "En alza" ? "" : " badge--" + t.toLowerCase()); }
  function fmt(n) { try { return n.toLocaleString("es-CL"); } catch (e) { return String(n); } }
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  /* Guardados: la fuente de verdad es el módulo compartido js/guardados.js (lo lee LAB). Aquí solo se traduce a ids de Tendencias. */
  var G = DETO.guardados;
  function toSavedItem(p) { return { key: p.slug, name: p.name, brand: p.brand, category: p.category, image: p.image, source: "tendencias" }; }
  function loadSaved() {
    /* Migración única de la clave anterior (ids numéricos) al estado compartido */
    try {
      var legacy = localStorage.getItem(STORE_KEY);
      if (legacy) {
        JSON.parse(legacy).forEach(function (id) { var p = byId(id); if (p && !G.has(p.slug)) G.add(toSavedItem(p)); });
        localStorage.removeItem(STORE_KEY);
      }
    } catch (e) { /* sin almacenamiento */ }
    return G.list().map(function (it) { var p = bySlug(it.key); return p ? p.id : null; }).filter(function (id) { return id !== null; });
  }

  /* ---------------- Estado ---------------- */
  var params = new URLSearchParams(window.location.search);
  var fromUrl = bySlug(params.get("tendencia"));
  var state = {
    selectedId: fromUrl ? fromUrl.id : (PRODUCTS[0] ? PRODUCTS[0].id : null),
    view: "grid",
    scope: "todas",
    saved: loadSaved(),
    query: "",
    statuses: [], categories: [], sources: [],
    adv: clone(DEFAULT_ADV),
    tab: "senales"
  };

  /* ---------------- Referencias al DOM ---------------- */
  var layout = $("[data-layout]");
  var gridEl = $("[data-grid]");
  var listEl = $("[data-list]");
  var listBody = $("[data-list-body]");
  var emptyEl = $("[data-empty]");
  var countEl = $("[data-count]");
  var filtersEl = $("[data-filters]");
  var chipsEl = $("[data-active-filters]");
  var detailEl = $("[data-detail]");
  var detailBody = $("[data-detail-body]");
  var cards = {}, rows = {};

  /* ---------------- Construcción de cards y filas (una plantilla cada una) ---------------- */
  function fillCommon(node, p) {
    node.dataset.id = String(p.id);
    $(".badge", node).className = trendClass(p.trend);
    $(".badge", node).textContent = TREND_ICON[p.trend] + " " + p.trend;
    $(".select", node).textContent = p.name;
    $(".brand", node).textContent = p.brand;
    $(".category", node).textContent = p.category;
    $(".sales", node).textContent = p.sales;
    $(".score", node).textContent = p.score;
    var img = $("img", node);
    img.src = p.image;
    img.alt = p.name;
    var bar = $(".progress span, .row-t__progress span", node);
    if (bar) bar.style.width = p.score + "%";
  }

  function buildCard(p) {
    var node = document.getElementById("tpl-card").content.firstElementChild.cloneNode(true);
    fillCommon(node, p);
    $(".save", node).setAttribute("aria-label", "Guardar " + p.name);
    $(".detail-btn", node).setAttribute("aria-label", "Ver detalle de " + p.name);
    $(".select", node).addEventListener("click", function () { toggleSelect(p.id); });
    $(".detail-btn", node).addEventListener("click", function () { select(p.id); });
    $(".save", node).addEventListener("click", function () { toggleSaved(p.id); });
    return node;
  }

  function buildRow(p) {
    var node = document.getElementById("tpl-row").content.firstElementChild.cloneNode(true);
    fillCommon(node, p);
    $(".row-t__qty", node).textContent = fmt(p.quantity);
    $(".row-t__arrow", node).setAttribute("aria-label", "Ver detalle de " + p.name);
    $(".select", node).addEventListener("click", function () { toggleSelect(p.id); });
    $(".row-t__arrow", node).addEventListener("click", function () { select(p.id); });
    return node;
  }

  PRODUCTS.forEach(function (p) {
    cards[p.id] = buildCard(p); gridEl.appendChild(cards[p.id]);
    rows[p.id] = buildRow(p); listBody.appendChild(rows[p.id]);
  });

  /* ---------------- Filtros: desplegables ---------------- */
  var dropdowns = [];
  function closeAllMenus(except) {
    dropdowns.forEach(function (d) { if (d !== except) d.close(); });
    if (except !== adv) adv.close(true);
  }

  function Dropdown(cfg) {
    var self = this;
    var wrap = document.createElement("div");
    wrap.className = "filter-dropdown";
    wrap.innerHTML =
      '<button class="filter-trigger tap" type="button" aria-expanded="false" aria-haspopup="true"><span></span><b hidden></b><span class="ico ico--chevron-abajo" aria-hidden="true"></span></button>' +
      '<div class="filter-menu" role="group" hidden></div>';
    var trigger = $(".filter-trigger", wrap), menu = $(".filter-menu", wrap);
    $("span", trigger).textContent = cfg.label;
    if (cfg.helper) menu.insertAdjacentHTML("beforeend", '<span class="filter-menu-note"></span>'), $(".filter-menu-note", menu).textContent = cfg.helper;
    menu.setAttribute("aria-label", cfg.label);

    function option(label, isAll) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "filter-option"; b.setAttribute("role", "checkbox");
      b.innerHTML = '<i><span class="ico ico--check" aria-hidden="true"></span></i><span></span>';
      b.lastElementChild.textContent = label;
      b.addEventListener("click", function () {
        var cur = state[cfg.key];
        if (isAll) state[cfg.key] = [];
        else state[cfg.key] = cur.indexOf(label) >= 0 ? cur.filter(function (x) { return x !== label; }) : cur.concat(label);
        render();
      });
      menu.appendChild(b);
      return b;
    }
    var allBtn = option(cfg.allLabel, true);
    var optBtns = cfg.options.map(function (o) { return option(o, false); });
    var clearBtn = document.createElement("button");
    clearBtn.type = "button"; clearBtn.className = "filter-menu-clear"; clearBtn.textContent = "Limpiar selección";
    clearBtn.addEventListener("click", function () { state[cfg.key] = []; render(); });
    menu.appendChild(clearBtn);

    self.el = wrap;
    self.sync = function () {
      var sel = state[cfg.key];
      trigger.classList.toggle("has-value", sel.length > 0);
      var badge = $("b", trigger);
      badge.hidden = sel.length === 0; badge.textContent = sel.length;
      allBtn.classList.toggle("is-selected", sel.length === 0); allBtn.setAttribute("aria-checked", String(sel.length === 0));
      optBtns.forEach(function (b, i) {
        var on = sel.indexOf(cfg.options[i]) >= 0;
        b.classList.toggle("is-selected", on); b.setAttribute("aria-checked", String(on));
      });
      clearBtn.hidden = sel.length === 0;
    };
    self.open = function () { closeAllMenus(self); menu.hidden = false; wrap.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true"); };
    self.close = function () { menu.hidden = true; wrap.classList.remove("is-open"); trigger.setAttribute("aria-expanded", "false"); };
    trigger.addEventListener("click", function () { menu.hidden ? self.open() : self.close(); });
    wrap.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { self.close(); trigger.focus(); }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !menu.hidden) {
        var items = $$(".filter-option", menu), i = items.indexOf(document.activeElement);
        e.preventDefault();
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
      }
    });
    dropdowns.push(self);
  }

  var advEl = $("[data-adv]");
  [
    { key: "statuses", label: "Estado de catálogo", allLabel: "Todos los estados", options: STATUS_OPTIONS },
    { key: "categories", label: "Categoría", allLabel: "Todas las categorías", options: CATEGORY_OPTIONS },
    { key: "sources", label: "Fuente", allLabel: "Todas las fuentes", options: SOURCE_OPTIONS, helper: "Capturas de Líder y Jumbo + ventas Turbo" }
  ].forEach(function (cfg) { filtersEl.insertBefore(new Dropdown(cfg).el, advEl); });

  /* ---------------- Filtros avanzados ---------------- */
  var adv = (function () {
    var panel = $(".adv-panel", advEl), toggle = $("[data-adv-toggle]", advEl);
    var draft = clone(DEFAULT_ADV);
    var trendBox = $("[data-adv-trends]", advEl);
    var trendBtns = TREND_OPTIONS.map(function (t) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("role", "checkbox");
      b.innerHTML = '<i><span class="ico ico--check" aria-hidden="true"></span></i><span></span>';
      b.lastElementChild.textContent = t;
      b.addEventListener("click", function () {
        draft.trends = draft.trends.indexOf(t) >= 0 ? draft.trends.filter(function (x) { return x !== t; }) : draft.trends.concat(t);
        paint();
      });
      trendBox.appendChild(b);
      return b;
    });
    var inputs = {};
    $$('[data-adv="salesMin"], [data-adv="salesMax"]', advEl).forEach(function (inp) { inp.max = SALES_MAX; if (inp.dataset.adv === "salesMax") inp.value = SALES_MAX; });
    $$("[data-adv]", advEl).forEach(function (inp) {
      if (inp.tagName !== "INPUT") return;
      inputs[inp.dataset.adv] = inp;
      inp.addEventListener("input", function () {
        var k = inp.dataset.adv, v = Number(inp.value);
        if (k === "scoreMin") v = Math.min(v, draft.scoreMax);
        if (k === "scoreMax") v = Math.max(v, draft.scoreMin);
        if (k === "salesMin") v = Math.max(0, Math.min(v, draft.salesMax));
        if (k === "salesMax") v = Math.min(SALES_MAX, Math.max(v, draft.salesMin));
        draft[k] = v; paint();
      });
    });
    function paint() {
      Object.keys(inputs).forEach(function (k) { if (document.activeElement !== inputs[k] || inputs[k].type === "range") inputs[k].value = draft[k]; });
      $('[data-adv-out="score"]', advEl).textContent = draft.scoreMin + "–" + draft.scoreMax;
      $('[data-adv-out="growth"]', advEl).textContent = "Mín. +" + draft.growthMin + "%";
      trendBtns.forEach(function (b, i) { var on = draft.trends.indexOf(TREND_OPTIONS[i]) >= 0; b.classList.toggle("is-selected", on); b.setAttribute("aria-checked", String(on)); });
    }
    var api = {
      count: function () {
        var a = state.adv;
        return Number(a.scoreMin !== 0 || a.scoreMax !== 100) + Number(a.salesMin !== 0 || a.salesMax !== SALES_MAX) + a.trends.length + Number(a.growthMin !== 0);
      },
      open: function () { closeAllMenus(api); draft = clone(state.adv); paint(); panel.hidden = false; advEl.classList.add("is-open"); toggle.setAttribute("aria-expanded", "true"); },
      close: function (reset) { if (panel.hidden) return; panel.hidden = true; advEl.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); if (reset) draft = clone(state.adv); },
      sync: function () {
        var n = api.count();
        toggle.classList.toggle("has-value", n > 0);
        $("[data-adv-count]", advEl).hidden = n === 0; $("[data-adv-count]", advEl).textContent = n;
        $("[data-adv-dot]", advEl).hidden = n > 0;
      }
    };
    toggle.addEventListener("click", function () { panel.hidden ? api.open() : api.close(true); });
    $("[data-adv-close]", advEl).addEventListener("click", function () { api.close(true); toggle.focus(); });
    $("[data-adv-clear]", advEl).addEventListener("click", function () { draft = clone(DEFAULT_ADV); paint(); });
    $("[data-adv-apply]", advEl).addEventListener("click", function () { state.adv = clone(draft); api.close(); render(); });
    advEl.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { api.close(true); toggle.focus(); } });
    return api;
  })();

  function onDocPointerDown(e) {
    dropdowns.forEach(function (d) { if (!d.el.contains(e.target)) d.close(); });
    if (!advEl.contains(e.target)) adv.close(true);
  }
  document.addEventListener("pointerdown", onDocPointerDown);

  /* ---------------- Alcance, vista y búsqueda ---------------- */
  $$("[data-scope]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.scope = b.dataset.scope;
      $$("[data-scope]").forEach(function (x) { var on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-pressed", String(on)); });
      render();
    });
  });
  $$("[data-view]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.view = b.dataset.view;
      $$("[data-view]").forEach(function (x) { var on = x === b; x.classList.toggle("is-active", on); x.setAttribute("aria-pressed", String(on)); });
      render();
    });
  });
  /* El header es persistente: se conecta su buscador al entrar y se suelta al salir */
  var searchInput = document.getElementById("busqueda-global");
  function onSearchInput() { state.query = searchInput.value; render(); }
  if (searchInput) { searchInput.value = ""; searchInput.addEventListener("input", onSearchInput); }
  $("[data-clear-all]").addEventListener("click", clearAll);

  function clearAll() {
    state.query = ""; state.statuses = []; state.categories = []; state.sources = []; state.adv = clone(DEFAULT_ADV);
    var input = document.getElementById("busqueda-global"); if (input) input.value = "";
    render();
  }

  /* ---------------- Selección y guardado ---------------- */
  function updateUrl() {
    try {
      var p = byId(state.selectedId), url = new URL(window.location.href);
      if (p) url.searchParams.set("tendencia", p.slug); else url.searchParams.delete("tendencia");
      window.history.replaceState(window.history.state, "", url);
    } catch (e) { /* file:// o entorno sin history */ }
  }
  function select(id) { state.selectedId = id; updateUrl(); render(true); }
  function toggleSelect(id) { state.selectedId = state.selectedId === id ? null : id; updateUrl(); render(true); }
  function isSaved(id) { return state.saved.indexOf(id) >= 0; }
  function toggleSaved(id) {
    var p = byId(id);
    if (isSaved(id)) G.remove(p.slug); else G.add(toSavedItem(p));
    state.saved = loadSaved(); render();
  }
  $$("[data-save]").forEach(function (b) { b.addEventListener("click", function () { if (state.selectedId) toggleSaved(state.selectedId); }); });
  $("[data-close]").addEventListener("click", function () {
    var prev = state.selectedId;
    state.selectedId = null; updateUrl(); render(true);
    var back = rows[prev] && state.view === "list" ? $(".select", rows[prev]) : $(".select", cards[prev]);
    if (back) back.focus();
  });

  /* ---------------- Visibilidad ---------------- */
  function visibleProducts() {
    var q = state.query.trim().toLowerCase(), a = state.adv;
    return PRODUCTS.filter(function (p) {
      var matchQ = !q || (p.name + " " + p.brand + " " + p.category + " " + p.macro).toLowerCase().indexOf(q) >= 0;
      var matchS = !state.statuses.length || state.statuses.indexOf(p.status) >= 0;
      var matchC = !state.categories.length || state.categories.indexOf(p.macro) >= 0;
      var matchF = !state.sources.length || p.sources.some(function (s) { return state.sources.indexOf(s) >= 0; });
      var matchT = !a.trends.length || a.trends.indexOf(p.trend) >= 0;
      return (state.scope === "todas" || isSaved(p.id)) && matchQ && matchS && matchC && matchF && matchT &&
        p.score >= a.scoreMin && p.score <= a.scoreMax && p.sales >= a.salesMin && p.sales <= a.salesMax && (a.growthMin === 0 || p.growth >= a.growthMin);
    });
  }
  function hasActiveFilters() {
    return !!state.query || state.statuses.length || state.categories.length || state.sources.length || adv.count() > 0;
  }

  function renderChips() {
    var chips = [], a = state.adv;
    if (state.query) chips.push(["Búsqueda: " + state.query, function () { state.query = ""; var i = document.getElementById("busqueda-global"); if (i) i.value = ""; }]);
    [["statuses"], ["categories"], ["sources"]].forEach(function (k) {
      state[k[0]].forEach(function (v) { chips.push([v, function () { state[k[0]] = state[k[0]].filter(function (x) { return x !== v; }); }]); });
    });
    if (a.scoreMin !== 0 || a.scoreMax !== 100) chips.push(["Puntaje " + a.scoreMin + "–" + a.scoreMax, function () { a.scoreMin = 0; a.scoreMax = 100; }]);
    if (a.salesMin !== 0 || a.salesMax !== SALES_MAX) chips.push(["Venta " + a.salesMin + "–" + a.salesMax + " u./sem", function () { a.salesMin = 0; a.salesMax = SALES_MAX; }]);
    a.trends.forEach(function (t) { chips.push([t, function () { a.trends = a.trends.filter(function (x) { return x !== t; }); }]); });
    if (a.growthMin !== 0) chips.push(["Crecimiento mín. +" + a.growthMin + "%", function () { a.growthMin = 0; }]);

    chipsEl.hidden = chips.length === 0;
    chipsEl.innerHTML = "<span>Filtros activos</span><div></div>";
    var box = $("div", chipsEl);
    chips.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "filter-chip";
      b.innerHTML = '<span></span><span class="ico ico--cerrar" aria-hidden="true"></span>';
      $("span", b).textContent = c[0];
      b.setAttribute("aria-label", "Quitar filtro " + c[0]);
      b.addEventListener("click", function () { c[1](); render(); });
      box.appendChild(b);
    });
    var clear = document.createElement("button");
    clear.type = "button"; clear.className = "clear-all-filters"; clear.textContent = "Limpiar todos";
    clear.addEventListener("click", clearAll);
    chipsEl.appendChild(clear);
  }

  /* ---------------- Render principal ---------------- */
  function render(selectionChanged) {
    var vis = visibleProducts(), visIds = vis.map(function (p) { return p.id; });

    PRODUCTS.forEach(function (p) {
      var sel = state.selectedId === p.id, sv = isSaved(p.id), show = visIds.indexOf(p.id) >= 0;
      [cards[p.id], rows[p.id]].forEach(function (n) {
        n.dataset.state = sel ? "selected" : "default";
        n.dataset.saved = String(sv);
        n.hidden = !show;
        $(".select", n).setAttribute("aria-pressed", String(sel));
      });
      var saveBtn = $(".save", cards[p.id]);
      saveBtn.setAttribute("aria-pressed", String(sv));
    });

    $("[data-add]").classList.toggle("is-ghost", state.scope !== "guardados");
    countEl.textContent = vis.length + " " + (vis.length === 1 ? "oportunidad visible" : "oportunidades visibles");
    gridEl.hidden = !(vis.length && state.view === "grid");
    listEl.hidden = !(vis.length && state.view === "list");
    emptyEl.hidden = vis.length > 0;
    if (!vis.length) {
      var f = hasActiveFilters();
      $("[data-empty-title]", emptyEl).textContent = f ? "No encontramos oportunidades con estos filtros" : "No hay oportunidades guardadas todavía.";
      $("[data-empty-hint]", emptyEl).hidden = !f;
      $("[data-clear-all]", emptyEl).hidden = !f;
    }

    dropdowns.forEach(function (d) { d.sync(); });
    adv.sync();
    renderChips();

    var sel = byId(state.selectedId);
    layout.classList.toggle("is-panel-closed", !sel);
    detailEl.hidden = !sel;
    if (sel) renderDetail(sel, selectionChanged);
  }

  /* ---------------- Panel de detalle ---------------- */
  var lastDetailId = null;
  function money(n) { return n === null || n === undefined ? "s/d" : "$" + fmt(Math.round(n)); }
  function pts(v) { return v === null || v === undefined ? "Sin datos" : v + " /100"; }
  function shortDate(d) { return d ? d.split("-").reverse().slice(0, 2).join("/") : ""; }
  function renderDetail(p, animate) {
    var t = p.ref;
    $$("[data-d]", detailEl).forEach(function (n) {
      var k = n.dataset.d;
      if (k === "name") n.textContent = p.name;
      else if (k === "meta") n.textContent = p.brand + " · " + p.category;
      else if (k === "status") n.textContent = p.status;
      else if (k === "score") n.textContent = p.score;
      else if (k === "sales") n.textContent = p.sales;
      else if (k === "growth") n.textContent = p.growthKnown ? (p.growth > 0 ? "+" : "") + p.growth + "%" : "s/d";
      else if (k === "growth-pill") n.textContent = p.growthKnown ? (p.growth > 0 ? "+" : "") + p.growth + "%" : "s/d";
      else if (k === "badge") { n.className = trendClass(p.trend); n.textContent = TREND_ICON[p.trend] + " " + p.trend; }
      else if (k === "image") { n.src = p.image; n.alt = p.name; }
    });

    var sv = isSaved(p.id);
    $$("[data-save]", detailEl).forEach(function (b) { b.setAttribute("aria-pressed", String(sv)); });
    $("[data-save-label]", detailEl).textContent = sv ? "Guardado" : "Guardar";
    $(".hero__save", detailEl).setAttribute("aria-label", sv ? "Quitar de guardados" : "Guardar producto");

    // Recomendación (nivel + motivo principal)
    var parts = t.parts, best = ["D", "T", "O", "E"].filter(function (k) { return parts[k] !== null; }).sort(function (a, b) { return parts[b] - parts[a]; })[0];
    var why = { D: "Sus productos análogos venden mucho en Turbo.", T: "Sus análogos crecen más que el resto del catálogo.", O: "Está presente y destacado en la competencia.", E: "Aparece en varias fuentes externas." }[best];
    $(".reco__text strong", detailEl).textContent = "Recomendación " + t.level.toLowerCase();
    $(".reco__text div span", detailEl).textContent = why + (t.variantInCatalog ? " Turbo ya vende otro formato: " + t.variantInCatalog + "." : "");

    // Señales (reales)
    var present = t.retailers.join(" y ");
    var rowsSig = [
      ["tienda", "Presencia en competencia", "Detectado en " + present + " (capturas al " + shortDate(t.lastSeen) + ").", t.detail.P + "/100"],
      ["busqueda", "Novedad", t.detail.N ? "Primera captura: " + shortDate(t.firstSeen) + (t.sources.indexOf("Novedades") >= 0 ? " · lista de novedades." : ".") : "Ya estaba en la primera captura (" + shortDate(t.firstSeen) + ").", t.detail.N + "/100"],
      ["conversacion", "Subida en listas", t.detail.S === null ? "Una sola captura en la misma lista: sin variación de posición." : "Cambio de posición entre la primera y la última captura.", t.detail.S === null ? "s/d" : t.detail.S + "/100"],
      ["carrito", "Ventas de análogos en Turbo", t.nDirect + " directos y " + t.nNear + " cercanos · semana 2 vs semana 1.", t.growth === null ? "s/d" : (t.growth > 0 ? "+" : "") + Math.round(t.growth) + "%"]
    ];
    var ul = $("[data-signals]", detailEl);
    ul.innerHTML = "";
    rowsSig.forEach(function (r) {
      var li = document.createElement("li");
      li.className = "signal";
      li.innerHTML = '<span class="signal__icon"><span class="ico ico--' + r[0] + '" aria-hidden="true"></span></span><span class="signal__copy"><strong></strong><small></small></span><b></b>';
      $("strong", li).textContent = r[1]; $("small", li).textContent = r[2]; $("b", li).textContent = r[3];
      ul.appendChild(li);
    });

    // Emociones del consumidor (mockup con IA simulada)
    if (DETO.emociones) DETO.emociones.render($("[data-emociones]", detailEl), t);

    // Mercado (capturas + análogos Turbo)
    var mk = $("[data-market]", detailEl), ap = t.analogPrice;
    var compRow = function (name, cls, letter) {
      var on = t.retailers.indexOf(name) >= 0, price = on && t.retailer === name ? money(t.price) : on ? "Presente" : "—";
      return '<div class="competitor"><i class="' + cls + '" aria-hidden="true">' + letter + "</i><span>" + name + "</span><b>" + (on ? "Presente" : "No detectado") + "</b><strong>" + (on && t.retailer === name ? money(t.price) : "") + "</strong></div>";
    };
    mk.innerHTML =
      '<div class="mstats"><div><span class="ico ico--etiqueta-precio" aria-hidden="true"></span><span>Precio en ' + esc(t.retailer) + "<strong>" + money(t.price) + ' <small>CLP</small></strong></span></div>' +
      '<div><span class="ico ico--tienda" aria-hidden="true"></span><span>Cadenas detectadas<strong>' + t.retailers.length + " de 2</strong></span></div>" +
      '<div><span class="ico ico--usuarios" aria-hidden="true"></span><span>Análogos en Turbo<strong>' + (t.nDirect + t.nNear) + "</strong></span></div></div>" +
      '<div class="mmiddle"><section class="mbox competitors"><h4>Presencia en competidores</h4>' + compRow("Jumbo", "jumbo", "J") + compRow("Líder", "lider", "✦") + "</section>" +
      '<section class="mbox price-range"><h4>Precio de análogos en Turbo</h4>' + (ap ? '<b class="price-range__avg">Prom. ' + money(ap.avg) + '</b><div class="range-track" aria-hidden="true"><i></i><i></i><i></i></div><div class="price-range__ends"><span>' + money(ap.min) + "<small>Mín.</small></span><span>" + money(ap.max) + "<small>Máx.</small></span></div>" : "<p>Sin precio de lista para los análogos.</p>") + "</section></div>" +
      '<section class="mbox similar"><h4>Productos análogos en Turbo</h4>' + t.analogs.slice(0, 4).map(function (a, i) {
        return '<div class="similar-row"><i class="' + ["green", "yellow", "olive", "green"][i] + '" aria-hidden="true"></i><strong>' + esc(a.name) + "</strong><span>" + esc(a.class) + " · " + fmt(a.uSem) + " u./sem</span><b>" + money(a.price) + "</b></div>";
      }).join("") + "</section>" +
      '<div class="mnote"><span class="mnote__check" aria-hidden="true"><span class="ico ico--check"></span></span><span>' +
      esc(t.variantInCatalog ? "Turbo ya vende otro formato (" + t.variantInCatalog + "). Evalúa si este formato suma demanda." : "No está en el surtido de Rappi Turbo y sí en la competencia: puede evaluarse para su incorporación.") + "</span></div>";

    // Incorporación (desglose real del puntaje)
    var bd = $("[data-breakdown]", detailEl);
    bd.innerHTML = "";
    [["D", "Demanda potencial", 40], ["E", "Evidencia externa", 20], ["T", "Tendencia de análogos", 30], ["O", "Oferta competitiva", 10]].forEach(function (x) {
      var v = parts[x[0]], row = document.createElement("div");
      row.className = "breakdown-row";
      row.innerHTML = '<div><span></span><b></b></div><div class="breakdown-track"><i></i></div>';
      $("span", row).textContent = x[1] + " (" + x[2] + "%)";
      $("b", row).textContent = pts(v);
      var bar = $("i", row);
      if (v === null) bar.remove(); else bar.style.width = Math.max(2, v) + "%";
      bd.appendChild(row);
    });
    var note = document.createElement("p");
    note.className = "breakdown-note";
    note.textContent = "Puntaje = 0,40·D + 0,20·E + 0,30·T + 0,10·O. Cobertura " + t.coverage + " %. E solo usa fuentes (Google Trends/Ads sin conectar). Escenarios: " + Math.round(t.salesPes) + "–" + Math.round(t.salesOpt) + " u./sem.";
    bd.appendChild(note);
    $(".confidence", detailEl).textContent = t.confidence;

    drawChart(p);
    setTab(state.tab, false);

    if (animate && lastDetailId !== p.id) {
      detailBody.classList.remove("detail__body-anim");
      void detailBody.offsetWidth;
      detailBody.classList.add("detail__body-anim");
    }
    lastDetailId = p.id;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* Pestañas (role=tablist) */
  var tabBtns = $$("[data-tab]", detailEl);
  function setTab(name, focus) {
    state.tab = name;
    tabBtns.forEach(function (b) {
      var on = b.dataset.tab === name;
      b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(b.getAttribute("aria-controls"));
      panel.hidden = !on;
      if (on && focus) b.focus();
    });
  }
  tabBtns.forEach(function (b, i) {
    b.addEventListener("click", function () { if (state.tab !== b.dataset.tab) setTab(b.dataset.tab, false); });
    b.addEventListener("keydown", function (e) {
      var n = tabBtns.length, j = -1;
      if (e.key === "ArrowRight") j = (i + 1) % n;
      else if (e.key === "ArrowLeft") j = (i - 1 + n) % n;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = n - 1;
      if (j >= 0) { e.preventDefault(); setTab(tabBtns[j].dataset.tab, true); }
    });
  });

  /* ---------------- Gráfico: unidades diarias ponderadas de los análogos (1–14 oct) ---------------- */
  var chart = { y: [], x: [], demand: [], p: null };
  var svg = $("[data-chart-svg]", detailEl), plot = $("[data-chart-plot]", detailEl), tip = $("[data-chart-tip]", detailEl);
  var hoverG = $("[data-chart-hover]", detailEl);

  function drawChart(p) {
    chart.p = p;
    var vals = p.ref.series, n = vals.length, min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), rng = Math.max(1, max - min);
    chart.demand = vals;
    chart.x = vals.map(function (v, i) { return 8 + (i / (n - 1)) * 400; });
    chart.y = vals.map(function (v) { return Number((116 - ((v - min) / rng) * 84).toFixed(1)); });
    var d = chart.y.map(function (y, i) { return (i === 0 ? "M " : "L ") + chart.x[i].toFixed(1) + " " + y; }).join(" ");
    $("[data-chart-line]", svg).setAttribute("d", d);
    $("[data-chart-area]", svg).setAttribute("d", d + " L 408 130 L 8 130 Z");
    var fy = chart.y[n - 1];
    $("[data-chart-end]", svg).setAttribute("cy", fy);
    $("[data-chart-end-ring]", svg).setAttribute("cy", fy);
    svg.setAttribute("aria-label", "Unidades diarias de productos análogos de " + p.name + " en Turbo, " + SUM.dayLabels[0] + " a " + SUM.dayLabels[n - 1] + ". Venta proyectada: " + p.sales + " unidades por semana");
    resetTip();
  }
  function resetTip() {
    var p = chart.p; if (!p) return;
    hoverG.setAttribute("hidden", "");
    tip.className = "chart-tooltip is-final";
    tip.style.left = ""; tip.style.top = Math.max(0, chart.y[chart.y.length - 1] - 28) + "px";
    $("[data-chart-tip-week]", tip).hidden = true;
    $("[data-chart-tip-value]", tip).textContent = p.sales + " u./sem";
  }
  svg.addEventListener("pointermove", function (e) {
    var b = svg.getBoundingClientRect(), ratio = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width));
    var i = Math.round(ratio * (chart.x.length - 1)), cx = chart.x[i], y = chart.y[i];
    hoverG.removeAttribute("hidden");
    $("[data-hover-guide]", svg).setAttribute("x1", cx); $("[data-hover-guide]", svg).setAttribute("x2", cx);
    ["[data-hover-ring]", "[data-hover-point]"].forEach(function (s) { $(s, svg).setAttribute("cx", cx); $(s, svg).setAttribute("cy", y); });
    tip.className = "chart-tooltip is-interactive" + (ratio < 0.13 ? " edge-start" : "") + (ratio > 0.87 ? " edge-end" : "");
    tip.style.top = Math.max(0, y - 42) + "px"; tip.style.left = (10 + ratio * (plot.clientWidth - 20)) + "px";
    var wkEl = $("[data-chart-tip-week]", tip); wkEl.hidden = false; wkEl.textContent = SUM.dayLabels[i];
    $("[data-chart-tip-value]", tip).textContent = chart.demand[i] + " u./día";
  });
  svg.addEventListener("pointerleave", resetTip);

  /* "Evaluar incorporación": guarda la oportunidad y abre LAB para elegir tienda */
  var evalBtn = $(".actions__primary", detailEl);
  function onEval() {
    var p = byId(state.selectedId); if (!p) return;
    if (!isSaved(p.id)) toggleSaved(p.id);
    if (window.DETO && DETO.navigate) DETO.navigate("lab.html"); else window.location.assign("lab.html");
  }
  if (evalBtn) evalBtn.addEventListener("click", onEval);

  /* ---------------- Inicio ---------------- */
  render(false);
  return function destroy() {
    document.removeEventListener("pointerdown", onDocPointerDown);
    if (searchInput) { searchInput.removeEventListener("input", onSearchInput); searchInput.value = ""; }
  };
});
