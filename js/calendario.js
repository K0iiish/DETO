/* Pantalla Calendario (DETO).
   Lógica traducida de CalendarPage.tsx (Figma Make) a JS vanilla: vistas Año / Bimestral / Mensual, leyenda con filtros por tipo,
   filtro por categoría, selección de día/evento, panel de detalle con acordeón (Métricas, Competencia, Brechas), listas completas
   con paginación, carrusel "Productos para el próximo hito" y modal "Agregar evento".
   Parámetros de URL: ?evento=<id> (selecciona ese evento), ?dia=AAAA-MM-DD (abre ese mes) y ?agregar=1 (abre el modal).
   Los eventos nuevos se guardan en localStorage ("deto-eventos-calendario"). */
DETO.page("calendario", function () {
  "use strict";

  var root = document.getElementById("contenido");
  var bodyEl = root.querySelector("[data-body]");
  var modalSlot = root.querySelector("[data-modal]");
  var categoryEl = root.querySelector("[data-category]");
  if (!bodyEl) return;

  /* ---------- Datos (src/data/calendar.ts del Make) ---------- */
  var MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  var WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  var SHORT_WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
  var TYPE_LABELS = { commercial: "Hito comercial", express: "Evento express", rappi: "Evento Rappi" };
  var TYPE_ICON = { commercial: "objetivo", express: "rayo", rappi: "bolsa" };
  var TYPES = ["commercial", "express", "rappi"];
  var CATEGORIES = ["Todas las categorías"].concat(DETO.taxonomia.macroNames()); /* data/taxonomia.js (macros reales) */
  var BASE_DAY = (function () { var d = new Date(); d.setHours(12, 0, 0, 0); return d; })(); /* hoy */
  var R = window.DETO_REAL, SUM = R.summary, HW = R.halloween;
  var STORE_KEY = "deto-eventos-calendario";

  var EVENTS = DETO.eventos.list.map(function (e) {
    var d = Math.round((new Date(e.date + "T12:00:00").getTime() - BASE_DAY.getTime()) / 86400000);
    return { id: e.id, name: e.name, date: e.date, description: e.description, type: e.type, category: e.category, daysAway: Math.max(0, d), past: d < 0 };
  });

  function series(v) { return [-35, -28, -21, -14, -7, 0].map(function (d, i) { return { day: d, value: v[i] }; }); }
  var DEMAND = {
    "new-year-2026": series([62, 68, 74, 91, 124, 146]),
    "valentines-2026": series([54, 61, 72, 98, 143, 188]),
    "yellow-flowers-2026": series([28, 32, 39, 54, 91, 126]),
    "mothers-day-2026": series([71, 83, 102, 137, 194, 238]),
    "fathers-day-2026": series([58, 67, 79, 108, 156, 184]),
    "rappi-day-2026": series([84, 92, 104, 131, 179, 216]),
    "national-day-2026": series([96, 112, 127, 169, 224, 261]),
    "halloween-2026": series([63, 78, 101, 146, 207, 245]),
    "singles-day-2026": series([88, 97, 118, 158, 219, 278]),
    "rappi-november-2026": series([78, 91, 109, 142, 196, 232]),
    "black-friday-2026": series([104, 121, 148, 196, 284, 348]),
    "christmas-2026": series([118, 136, 167, 218, 302, 376])
  };
  var DEMO_DEMAND = series([40, 46, 55, 72, 96, 118]);

  /* Oportunidades reales (data/deto-real.js): productos fuera del catálogo Turbo detectados en Líder y Jumbo */
  var PRODUCTS = R.trends.map(function (t) {
    return { slug: t.slug, name: t.name, brand: t.brand || t.retailer, category: t.macro, sub: t.subcategory, sources: [t.retailers.join(" y ")].concat(t.sources),
      growth: t.growth === null ? 0 : Math.round(t.growth), quantity: t.quantity, sales: Math.round(t.sales), score: t.score, event: t.event,
      badge: t.trend === "Emergente" ? "Novedad" : "En alza", image: DETO.img.src(t.ean, t.img, t.slug) };
  });
  function forEvent(ev) {
    var list = ev.id === "halloween-2026" ? PRODUCTS.filter(function (p) { return p.event.indexOf("Halloween") >= 0; }) : [];
    var cat = PRODUCTS.filter(function (p) { return p.category === ev.category && list.indexOf(p) < 0; });
    return list.concat(cat);
  }
  var SOURCE_ICON = new Proxy({}, { get: function () { return "tienda"; } });

  /* ---------- Utilidades ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function ico(name) { return '<span class="ico ico--cal-' + name + '" aria-hidden="true"></span>'; }
  function dateKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function evDate(e) { return new Date(e.date + "T12:00:00"); }
  function monthDays(y, m, fixedRows) {
    var first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7;
    var start = new Date(y, m, 1 - offset), last = new Date(y, m + 1, 0);
    var length = fixedRows ? 42 : Math.ceil((offset + last.getDate()) / 7) * 7, out = [];
    for (var i = 0; i < length; i++) { var d = new Date(start); d.setDate(start.getDate() + i); out.push({ date: d, current: d.getMonth() === m }); }
    return out;
  }
  function longDate(d) { var t = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(d); return t.charAt(0).toUpperCase() + t.slice(1); }
  function go(href) { if (window.DETO && DETO.navigate) DETO.navigate(href); else window.location.assign(href); }

  function loadUserEvents() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(function (e) { return e && e.id && e.name && e.date; }) : [];
    } catch (e) { return []; }
  }
  function saveUserEvents(list) { try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* sin almacenamiento */ } }
  function normalize(e) {
    return { id: e.id, name: e.name, date: e.date, description: e.description || "", type: e.type || "commercial", category: e.category || "Otros",
      daysAway: Math.max(0, Math.round((evDate(e).getTime() - BASE_DAY.getTime()) / 86400000)) };
  }

  /* ---------- Estado ---------- */
  var userEvents = loadUserEvents();
  var state = {
    view: "monthly", y: 2026, m: 10, category: CATEGORIES[0], selectedId: "black-friday-2026",
    openSection: "metrics", panel: "event", page: 1, types: TYPES.slice(), offset: 0
  };
  var paused = false, timer = null, lastTrigger = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function allEvents() {
    var byId = {};
    EVENTS.forEach(function (e) { byId[e.id] = e; });
    userEvents.forEach(function (e) { if (!byId[e.id]) byId[e.id] = normalize(e); });
    return Object.keys(byId).map(function (k) { return byId[k]; }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }
  function filteredEvents() { return allEvents().filter(function (e) { return state.category === CATEGORIES[0] || e.category === state.category; }); }
  function visibleEvents() { return filteredEvents().filter(function (e) { return state.types.indexOf(e.type) >= 0; }); }
  function selected() {
    var all = allEvents();
    return all.filter(function (e) { return e.id === state.selectedId; })[0] || filteredEvents()[0] || all.filter(function (e) { return e.id === "black-friday-2026"; })[0];
  }
  function byDate(list, key) { return list.filter(function (e) { return e.date === key; })[0]; }

  /* ---------- Plantillas ---------- */
  function legendHtml() {
    return '<div class="cal-legend" role="group" aria-label="Tipos de evento">' + TYPES.map(function (t) {
      return '<button class="cal-legend__item cal-legend__item--' + t + ' tap" type="button" data-act="type" data-type="' + t + '" aria-pressed="' + (state.types.indexOf(t) >= 0) + '">' + ico(TYPE_ICON[t]) + TYPE_LABELS[t] + "</button>";
    }).join("") + "</div>";
  }

  function pillHtml(e, compact) { return '<span class="cal-pill is-' + e.type + '">' + ico(TYPE_ICON[e.type]) + "<span>" + esc(e.name) + "</span></span>"; }

  function monthGridHtml(y, m, compact) {
    var vis = visibleEvents(), occ = filteredEvents(), sel = selected();
    var heads = (compact ? SHORT_WEEKDAYS : WEEKDAYS).map(function (d) { return '<span class="cal-weekday">' + d + "</span>"; }).join("");
    var cells = monthDays(y, m, !compact).map(function (c) {
      var key = dateKey(c.date), ev = byDate(vis, key), hidden = !ev && !!byDate(occ, key);
      var cls = "cal-day" + (c.current ? "" : " is-outside") + (ev ? " has-event is-" + ev.type : "") + (ev && sel && ev.id === sel.id ? " is-selected" : "") + (!ev && !hidden ? " is-addable" : "");
      var label = c.date.getDate() + (ev ? ", " + ev.name : hidden ? ", evento oculto por filtros" : ", agregar evento") + " de " + MONTHS[c.date.getMonth()].toLowerCase();
      var act = ev ? 'data-act="select" data-id="' + ev.id + '"' : hidden ? "" : 'data-act="add-day" data-date="' + key + '"';
      return '<button class="' + cls + '" type="button" ' + act + (hidden ? " disabled" : "") + ' aria-label="' + esc(label) + '"' + (ev && sel && ev.id === sel.id ? ' aria-pressed="true"' : "") + "><b>" + c.date.getDate() + "</b>" + (ev ? pillHtml(ev, compact) : "") + "</button>";
    }).join("");
    return '<div class="cal-month' + (compact ? " is-compact" : "") + '">' + (compact ? '<h3 class="cal-month__title">' + MONTHS[m] + " " + y + "</h3>" : "") + '<div class="cal-month-grid">' + heads + cells + "</div></div>";
  }

  function periodLabel() {
    if (state.view === "year") return "Calendario anual " + state.y;
    if (state.view === "bimonthly") return MONTHS[state.m].slice(0, 3) + " – " + MONTHS[(state.m + 1) % 12].slice(0, 3) + " " + state.y;
    return MONTHS[state.m] + " " + state.y;
  }

  /* Rampa de demanda */
  var X_POINTS = [8, 88, 168, 248, 328, 408];
  function rampModel(ev) {
    var s = DEMAND[ev.id] || DEMO_DEMAND, values = s.map(function (p) { return p.value; });
    var min = Math.min.apply(null, values) * 0.88, max = Math.max.apply(null, values) * 1.05;
    var ys = values.map(function (v) { return 96 - ((v - min) / (max - min)) * 72; });
    return { s: s, values: values, ys: ys };
  }
  function rampHtml(ev) {
    var r = rampModel(ev), uid = "cal-ramp-" + ev.id.replace(/[^a-z0-9]/gi, "");
    var line = X_POINTS.map(function (x, i) { return (i ? "L " : "M ") + x + " " + r.ys[i].toFixed(2); }).join(" ");
    var area = line + " L 408 103 L 8 103 Z", last = r.values.length - 1;
    return '<div class="cal-chart"><div class="cal-chart__title"><strong>Rampa de demanda</strong>' + ico("info") + "<small>Curva demostrativa (no hay ventas del hito en los datos) · " + esc(ev.name) + "</small></div>" +
      '<div class="cal-chart__plot" data-ramp="' + esc(ev.id) + '"><div class="cal-tip is-end" style="left:100%;top:' + Math.max(0, r.ys[last] - 36).toFixed(1) + 'px"><small>Día del hito</small><b>' + r.values[last] + " índice</b></div>" +
      '<svg viewBox="0 0 420 110" role="img" aria-label="Rampa de demanda de ' + esc(ev.name) + '. Índice al día del hito: ' + r.values[last] + '"><defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9be95f" stop-opacity=".55"/><stop offset="1" stop-color="#9be95f" stop-opacity=".04"/></linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + uid + ')"/><path class="cal-line" d="' + line + '"/><line class="cal-guide" x1="0" x2="0" y1="8" y2="103" hidden/>' +
      '<circle class="cal-point-ring" cx="408" cy="' + r.ys[last].toFixed(2) + '" r="6"/><circle class="cal-point" cx="408" cy="' + r.ys[last].toFixed(2) + '" r="3.7"/></svg>' +
      '<div class="cal-axis"><span>-35 días</span><span>-28 días</span><span>-21 días</span><span>-14 días</span><span>-7 días</span><span>Hito</span></div></div>' +
      '<p class="cal-chart__note">' + ico("info") + "La demanda comienza a acelerarse 14 días antes del hito y alcanza su mayor impulso durante la semana previa.</p></div>";
  }

  function kpisHtml(items) {
    return '<div class="cal-kpis">' + items.map(function (k) { return "<span><small>" + k[0] + "</small><b" + (k[2] ? ' class="is-positive"' : "") + ">" + k[1] + "</b></span>"; }).join("") + "</div>";
  }
  function fmtN(n) { return Number(n).toLocaleString("es-CL"); }
  function marketRows(ev) {
    var list = forEvent(ev).slice(0, 3);
    if (!list.length) return '<p class="cal-empty-note">Sin oportunidades detectadas en ' + esc(ev.category) + ".</p>";
    return list.map(function (p, i) {
      return '<div class="cal-row"><i>' + (i + 1) + "</i><span><b>" + esc(p.name) + "</b><small>" + esc(p.sources[0]) + " · " + p.sales + " u./sem proyectadas</small></span><strong>" + p.score + "/100</strong></div>";
    }).join("");
  }
  function hwRows() {
    return HW.topProducts.slice(0, 3).map(function (p, i) {
      return '<div class="cal-row"><i>' + (i + 1) + "</i><span><b>" + esc(p.name) + "</b><small>" + esc(p.retailer) + (p.brand ? " · " + esc(p.brand) : "") + "</small></span><strong>$" + fmtN(p.price) + "</strong></div>";
    }).join("");
  }
  function accordionContent(id, ev) {
    var opps = forEvent(ev), macroSku = SUM.skuByMacro[ev.category] || 0, macroUnits = SUM.unitsWeekByMacro[ev.category] || 0;
    if (id === "metrics") return kpisHtml([["SKU Turbo en " + ev.category, fmtN(macroSku)], ["Unidades / semana", fmtN(macroUnits)], ["Oportunidades", fmtN(opps.length)]]) + rampHtml(ev);
    if (id === "competition") {
      if (ev.id === "halloween-2026") {
        var first = HW.byRetailer.filter(function (r) { return r.date === HW.captures[0]; });
        var total = first.reduce(function (a, r) { return a + r.products; }, 0), food = first.reduce(function (a, r) { return a + r.food; }, 0);
        var avg = Math.round(first.reduce(function (a, r) { return a + r.priceAvg * r.products; }, 0) / Math.max(1, total));
        return kpisHtml([["Cadenas revisadas", String(first.length)], ["Productos Halloween (" + food + " dulces)", fmtN(total)], ["Precio promedio", "$" + fmtN(avg)]]) +
          '<div class="cal-market"><h4>Lo que empujó la competencia (captura ' + HW.captures[0].split("-").reverse().slice(0, 2).join("/") + ") " + ico("info") + "</h4>" + hwRows() +
          '<p class="cal-empty-note">Turbo vendió ' + fmtN(HW.turbo.candy) + " u. de productos Halloween del 1 al 14 oct (" + HW.turbo.skus + " SKU de decoración Halloween).</p>" +
          '<button class="cal-viewall" type="button" data-act="list" data-kind="competition">Ver todas ' + ico("flecha") + "</button></div>";
      }
      return kpisHtml([["Cadenas monitoreadas", "Líder, Jumbo"], ["Capturas", String(SUM.captureDates.length)], ["Última captura", SUM.lastCapture.split("-").reverse().slice(0, 2).join("/")]]) +
        '<div class="cal-market"><h4>Productos de la competencia en ' + esc(ev.category) + " " + ico("info") + "</h4>" + marketRows(ev) +
        '<p class="cal-empty-note">Aún no hay capturas de promociones específicas para este evento.</p>' +
        '<button class="cal-viewall" type="button" data-act="list" data-kind="competition">Ver todas ' + ico("flecha") + "</button></div>";
    }
    var pot = opps.reduce(function (a, p) { return a + p.sales; }, 0);
    return kpisHtml([["Productos detectados", fmtN(opps.length)], ["No vendidos por Turbo", fmtN(opps.length)], ["Venta proyectada", fmtN(pot) + " u./sem", true]]) +
      '<div class="cal-note">' + ico("info") + "Productos que Líder o Jumbo venden y Rappi Turbo no tiene en surtido (capturas al " + SUM.lastCapture.split("-").reverse().slice(0, 2).join("/") + ").</div>" +
      '<div class="cal-market"><h4>Principales brechas detectadas ' + ico("info") + "</h4>" + marketRows(ev) +
      '<button class="cal-viewall" type="button" data-act="list" data-kind="gaps">Ver todas ' + ico("flecha") + "</button></div>";
  }
  function eventPanelHtml(ev) {
    var sections = [["metrics", "Métricas del evento", "barras"], ["competition", "Competencia en la campaña", "trofeo"], ["gaps", "Brechas de catálogo", "catalogo"]];
    return '<aside class="cal-panel" aria-label="Detalle del evento ' + esc(ev.name) + '"><header class="cal-ev-head"><div class="cal-ev-head__icon">' + ico("carrito") + "</div>" +
      "<div><small>" + esc(longDate(evDate(ev))) + "</small><h2>" + esc(ev.name) + '</h2></div><b class="cal-ev-head__when">' + DETO.eventos.whenLabel(ev.date) + "</b><p>" + esc(ev.description) + "</p></header>" +
      '<div class="cal-acc">' + sections.map(function (s) {
        var open = state.openSection === s[0];
        return '<section class="cal-acc__item"><h3 style="margin:0"><button class="cal-acc__btn tap" type="button" data-act="section" data-section="' + s[0] + '" aria-expanded="' + open + '" aria-controls="cal-acc-' + s[0] + '">' + ico(s[2]) + "<span>" + s[1] + "</span>" + ico("abajo") + "</button></h3>" +
          (open ? '<div class="cal-acc__content" id="cal-acc-' + s[0] + '">' + accordionContent(s[0], ev) + "</div>" : "") + "</section>";
      }).join("") + "</div></aside>";
  }
  function listPanelHtml(ev, kind) {
    var LIST = forEvent(ev).length ? forEvent(ev) : PRODUCTS;
    var size = 5, count = Math.max(1, Math.ceil(LIST.length / size)), page = Math.min(state.page, count);
    var title = kind === "competition" ? "Movimientos de la competencia" : "Brechas de catálogo detectadas";
    var rows = LIST.slice((page - 1) * size, page * size).map(function (p) {
      return '<article class="cal-lrow"><div class="cal-lrow__name"><img src="' + p.image + '" alt=""><span><strong>' + esc(p.name) + "</strong><small><i>" + ico(SOURCE_ICON[p.sources[0]]) + "</i>" + esc(p.sources[0]) + "</small></span></div>" +
        '<span class="cal-lrow__spec"><b>' + esc(p.sub) + "</b><small>" + p.sales.toLocaleString("es-CL") + " u./sem proyectadas</small></span><strong class=\"cal-lrow__value\">" + p.score + "/100</strong></article>";
    }).join("");
    var pages = ""; for (var i = 1; i <= count; i++) pages += '<button class="cal-pager__page tap' + (i === page ? " is-active" : "") + '" type="button" data-act="page" data-page="' + i + '"' + (i === page ? ' aria-current="page"' : "") + ">" + i + "</button>";
    return '<aside class="cal-panel is-list" aria-label="' + title + '"><header class="cal-listhead"><button class="cal-back" type="button" data-act="back" aria-label="Volver al detalle del evento">' + ico("izq") + "</button><div><small>" + esc(ev.name) + "</small><h2>" + title + "</h2></div></header>" +
      '<div class="cal-cols"><span>Producto y fuente</span><span>Especificación</span><span>' + "Puntaje DETO" + '</span></div><div class="cal-list">' + rows + "</div>" +
      '<nav class="cal-pager" aria-label="Paginación de ' + title + '"><button class="cal-pager__btn" type="button" data-act="page-prev"' + (page === 1 ? " disabled" : "") + ">" + ico("izq") + " Anterior</button><div class=\"cal-pager__pages\">" + pages +
      '</div><button class="cal-pager__btn" type="button" data-act="page-next"' + (page === count ? " disabled" : "") + ">Siguiente " + ico("der") + "</button></nav></aside>";
  }
  function panelHtml() {
    var ev = selected();
    if (state.panel === "competition-list") return listPanelHtml(ev, "competition");
    if (state.panel === "gaps-list") return listPanelHtml(ev, "gaps");
    return eventPanelHtml(ev);
  }

  /* Productos para el próximo hito */
  function recommended(ev) {
    var f = forEvent(ev).filter(function (p) { return state.category === CATEGORIES[0] || p.category === state.category; });
    return (f.length ? f : PRODUCTS).slice(0, 12);
  }
  function trackHtml(ev) {
    var list = recommended(ev), n = Math.min(4, list.length), out = "";
    for (var i = 0; i < n; i++) {
      var p = list[(state.offset + i) % list.length], isNew = p.badge === "Novedad";
      out += '<button class="cal-product" type="button" data-act="product" data-slug="' + p.slug + '" aria-label="Ver detalle de ' + esc(p.name) + '">' +
        '<span class="cal-product__badge' + (isNew ? " is-new" : "") + '">' + ico(isNew ? "chispas" : "en-alza") + esc(p.badge) + "</span>" +
        '<span class="cal-product__img"><img src="' + p.image + '" alt=""></span><strong class="cal-product__name">' + esc(p.name) + '</strong><small class="cal-product__meta">' + esc(p.brand) + " · " + esc(p.sub) + "</small>" +
        '<b class="cal-product__growth">' + ico("tendencia") + p.score + "/100</b></button>";
    }
    return '<div class="cal-track">' + out + "</div>";
  }
  function productsHtml(ev) {
    return '<section class="cal-products" aria-labelledby="cal-products-title"><header class="cal-products__head"><div class="cal-products__icon">' + ico("calendario") + "</div>" +
      '<div><h2 id="cal-products-title">Productos para el próximo hito</h2><p>Oportunidades fuera del catálogo con mayor puntaje DETO para ' + esc(ev.name) + " en <b>" + esc(ev.category) + ".</b></p></div>" +
      '<button class="cal-products__more" type="button" data-act="more">Ver más productos ' + ico("flecha") + "</button></header>" +
      '<div class="cal-carousel" aria-roledescription="carrusel" aria-label="Productos recomendados"><button class="cal-side cal-side--prev" type="button" data-act="car-prev" aria-label="Productos anteriores">' + ico("izq") + "</button>" + trackHtml(ev) +
      '<button class="cal-side cal-side--next" type="button" data-act="car-next" aria-label="Productos siguientes">' + ico("der") + "</button></div></section>";
  }

  /* Vista anual */
  function yearHtml() {
    var vis = visibleEvents(), occ = filteredEvents(), sel = selected(), y = state.y;
    var upcoming = vis.filter(function (e) { return !e.past; }).slice(0, 3);
    var months = MONTHS.map(function (name, mi) {
      var monthEv = vis.filter(function (e) { return evDate(e).getMonth() === mi && evDate(e).getFullYear() === y; })[0];
      var cells = monthDays(y, mi, false).map(function (c) {
        var key = dateKey(c.date), ev = byDate(vis, key), hidden = !ev && !!byDate(occ, key);
        var cls = (c.current ? "" : "is-outside ") + (ev ? "has-event is-" + ev.type + " " : "") + (ev && sel && ev.id === sel.id ? "is-selected " : "") + (c.current && !ev && !hidden ? "is-addable" : "");
        var label = c.date.getDate() + (ev ? ", " + ev.name : hidden ? ", evento oculto por filtros" : ", agregar evento") + " de " + MONTHS[c.date.getMonth()].toLowerCase();
        var act = ev ? 'data-act="select" data-id="' + ev.id + '"' : 'data-act="add-day" data-date="' + key + '"';
        return '<button class="' + cls.trim() + '" type="button" ' + act + (!c.current || hidden ? " disabled" : "") + ' aria-label="' + esc(label) + '">' + c.date.getDate() + "</button>";
      }).join("");
      return '<article class="cal-amonth"><header class="cal-amonth__head"><h3>' + name + "</h3>" + (monthEv ? '<button class="cal-amonth__event is-' + monthEv.type + '" type="button" data-act="select" data-id="' + monthEv.id + '">' + ico(TYPE_ICON[monthEv.type]) + esc(monthEv.name) + "</button>" : "") + "</header>" +
        '<div class="cal-amonth__grid">' + SHORT_WEEKDAYS.map(function (d) { return "<b>" + d + "</b>"; }).join("") + cells + "</div></article>";
    }).join("");
    var miles = upcoming.map(function (e) {
      var d = evDate(e);
      return '<div class="cal-milestone"><b>' + d.getDate() + " " + MONTHS[d.getMonth()].slice(0, 3).toLowerCase() + "</b><strong>" + esc(e.name) + "</strong><span>" + DETO.eventos.whenLabel(e.date) + '</span><button class="cal-link" type="button" data-act="open-detail" data-id="' + e.id + '">Ver detalle ' + ico("flecha") + "</button></div>";
    }).join("");
    return '<section class="cal-annual cal-surface"><header class="cal-annual__head"><div>' + ico("calendario") + "<h2>Calendario anual " + y + "</h2></div>" + legendHtml() + '</header><div class="cal-annual__grid">' + months + "</div></section>" +
      '<div class="cal-year-footer"><section class="cal-milestones cal-surface"><header class="cal-milestones__head">' + ico("calendario") + "<h2>Próximos hitos</h2><span>Dentro de los próximos 50 días</span></header>" + miles + "</section>" + productsHtml(sel) + "</div>";
  }

  /* ---------- Render ---------- */
  function keyOf(el) { var d = el.dataset; return [d.act, d.id, d.date, d.type, d.section, d.kind, d.page, d.slug, d.view].join("|"); }
  function render() {
    var active = document.activeElement, fk = active && bodyEl.contains(active) && active.dataset && active.dataset.act ? keyOf(active) : null;
    var sel = selected(), html;
    if (state.view === "year") {
      html = state.panel === "event" ? yearHtml() : '<div class="cal-year-panel"><div>' + yearHtml() + "</div>" + panelHtml() + "</div>";
    } else {
      var grid = state.view === "monthly" ? monthGridHtml(state.y, state.m, false)
        : '<div class="cal-bimonthly">' + monthGridHtml(state.y, state.m, true) + monthGridHtml(new Date(state.y, state.m + 1, 1).getFullYear(), new Date(state.y, state.m + 1, 1).getMonth(), true) + "</div>";
      html = '<div class="cal-layout"><div class="cal-left"><section class="cal-main cal-surface" aria-label="' + periodLabel() + '"><header class="cal-main__head"><div class="cal-nav">' +
        '<button class="cal-nav__btn tap" type="button" data-act="nav" data-dir="-1" aria-label="Periodo anterior">' + ico("izq") + '</button><h2 class="cal-nav__title" aria-live="polite">' + periodLabel() + "</h2>" +
        '<button class="cal-nav__btn tap" type="button" data-act="nav" data-dir="1" aria-label="Periodo siguiente">' + ico("der") + "</button></div>" + legendHtml() + "</header>" + grid + "</section>" + productsHtml(sel) + "</div>" + panelHtml() + "</div>";
    }
    bodyEl.innerHTML = html;
    Array.prototype.forEach.call(root.querySelectorAll("[data-view]"), function (b) {
      var on = b.dataset.view === state.view; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on));
    });
    if (fk) { var els = bodyEl.querySelectorAll("[data-act]"); for (var i = 0; i < els.length; i++) if (keyOf(els[i]) === fk && !els[i].disabled) { els[i].focus(); break; } }
    schedule();
  }
  function renderTrack() {
    var carousel = bodyEl.querySelector(".cal-carousel"), track = carousel && carousel.querySelector(".cal-track");
    if (!track) return;
    var tmp = document.createElement("div"); tmp.innerHTML = trackHtml(selected());
    track.replaceWith(tmp.firstChild); /* un elemento nuevo reinicia la animación de entrada */
  }

  /* ---------- Autoplay del carrusel (8 s; pausa con mouse/foco; no corre con movimiento reducido) ---------- */
  function schedule() {
    clearTimeout(timer);
    if (reduceMotion || paused) return;
    timer = setTimeout(function () {
      var n = recommended(selected()).length; state.offset = (state.offset + 1) % n; renderTrack(); schedule();
    }, 8000);
  }

  /* ---------- Acciones ---------- */
  function selectEvent(ev) { state.selectedId = ev.id; state.openSection = "metrics"; state.panel = "event"; state.offset = 0; }
  function showMonthOf(ev) { var d = evDate(ev); state.y = d.getFullYear(); state.m = d.getMonth(); }

  function onClick(e) {
    var t = e.target.closest("[data-act], [data-view], [data-add]");
    if (!t || !root.contains(t)) return;
    if (t.hasAttribute("data-add") && !t.dataset.act) { lastTrigger = t; openModal(""); return; }
    if (t.dataset.view) { state.view = t.dataset.view; state.panel = "event"; render(); return; }
    var d = t.dataset, ev;
    switch (d.act) {
      case "nav": var step = state.view === "bimonthly" ? 2 : 1, nd = new Date(state.y, state.m + Number(d.dir) * step, 1); state.y = nd.getFullYear(); state.m = nd.getMonth(); render(); break;
      case "type": var i = state.types.indexOf(d.type); if (i >= 0) state.types.splice(i, 1); else state.types.push(d.type); render(); break;
      case "select": ev = allEvents().filter(function (x) { return x.id === d.id; })[0]; if (ev) { selectEvent(ev); render(); } break;
      case "open-detail": ev = allEvents().filter(function (x) { return x.id === d.id; })[0]; if (ev) { selectEvent(ev); showMonthOf(ev); state.view = "monthly"; render(); } break;
      case "add-day": lastTrigger = t; openModal(d.date); break;
      case "section": state.openSection = state.openSection === d.section ? null : d.section; render(); break;
      case "list": state.openSection = d.kind; state.panel = d.kind === "competition" ? "competition-list" : "gaps-list"; state.page = 1; render(); break;
      case "back": state.panel = "event"; render(); break;
      case "page": state.page = Number(d.page); render(); break;
      case "page-prev": state.page = Math.max(1, state.page - 1); render(); break;
      case "page-next": state.page = state.page + 1; render(); break;
      case "car-prev": var n1 = recommended(selected()).length; state.offset = (state.offset - 1 + n1) % n1; renderTrack(); schedule(); break;
      case "car-next": var n2 = recommended(selected()).length; state.offset = (state.offset + 1) % n2; renderTrack(); schedule(); break;
      case "product": go("tendencias.html?tendencia=" + encodeURIComponent(d.slug)); break;
      case "more": go("tendencias.html"); break;
    }
  }
  root.addEventListener("click", onClick);

  /* Pausa del carrusel con mouse / foco */
  function inCarousel(el) { return el && el.closest && el.closest(".cal-carousel"); }
  function onOver(e) { if (inCarousel(e.target)) { paused = true; clearTimeout(timer); } }
  function onOut(e) { if (inCarousel(e.target) && !inCarousel(e.relatedTarget)) { paused = false; schedule(); } }
  root.addEventListener("pointerover", onOver); root.addEventListener("pointerout", onOut);
  root.addEventListener("focusin", onOver); root.addEventListener("focusout", onOut);

  /* Rampa de demanda interactiva (mouse y toque) */
  function rampMove(e) {
    var svg = e.target.closest && e.target.closest(".cal-chart__plot svg");
    if (!svg) return;
    var plot = svg.parentNode, ev = allEvents().filter(function (x) { return x.id === plot.dataset.ramp; })[0];
    if (!ev) return;
    var r = rampModel(ev), b = svg.getBoundingClientRect();
    var ratio = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)), cx = 8 + ratio * 400;
    var seg = 0; for (var i = 0; i < X_POINTS.length; i++) if (X_POINTS[i] >= cx) { seg = i - 1; break; }
    seg = Math.max(0, Math.min(X_POINTS.length - 2, seg));
    var sr = (cx - X_POINTS[seg]) / (X_POINTS[seg + 1] - X_POINTS[seg]);
    setRamp(plot, r, cx, r.ys[seg] + (r.ys[seg + 1] - r.ys[seg]) * sr, Math.round(r.values[seg] + (r.values[seg + 1] - r.values[seg]) * sr), Math.round(r.s[seg].day + (r.s[seg + 1].day - r.s[seg].day) * sr), ratio, true);
  }
  function setRamp(plot, r, x, y, value, day, ratio, hover) {
    var tip = plot.querySelector(".cal-tip"), guide = plot.querySelector(".cal-guide");
    var circles = plot.querySelectorAll("circle");
    Array.prototype.forEach.call(circles, function (c) { c.setAttribute("cx", x); c.setAttribute("cy", y); });
    if (hover) { guide.setAttribute("x1", x); guide.setAttribute("x2", x); guide.removeAttribute("hidden"); } else guide.setAttribute("hidden", "");
    tip.style.left = ratio * 100 + "%"; tip.style.top = Math.max(0, y - 36) + "px";
    tip.classList.toggle("is-start", ratio < 0.13); tip.classList.toggle("is-end", ratio > 0.87);
    tip.querySelector("small").textContent = day === 0 ? "Día del hito" : day + " días";
    tip.querySelector("b").textContent = value + " índice";
  }
  function rampLeave(e) {
    var svg = e.target.closest && e.target.closest(".cal-chart__plot svg");
    if (!svg || (e.relatedTarget && svg.contains(e.relatedTarget))) return;
    var plot = svg.parentNode, ev = allEvents().filter(function (x) { return x.id === plot.dataset.ramp; })[0];
    if (!ev) return;
    var r = rampModel(ev), last = r.values.length - 1;
    setRamp(plot, r, 408, r.ys[last], r.values[last], 0, 1, false);
  }
  root.addEventListener("pointermove", rampMove); root.addEventListener("pointerout", rampLeave);

  /* ---------- Desplegable de selección única (reutiliza .filter-dropdown de Tendencias) ---------- */
  var dropdowns = [];
  function closeAll(except) { dropdowns.forEach(function (d) { if (d !== except) d.close(); }); }
  function SelectDropdown(host, cfg) {
    var self = this;
    host.innerHTML = '<button class="filter-trigger tap" type="button" aria-expanded="false" aria-haspopup="listbox" aria-label="' + esc(cfg.label) + '"><span></span><span class="ico ico--chevron-abajo" aria-hidden="true"></span></button><div class="filter-menu" role="listbox" aria-label="' + esc(cfg.label) + '" hidden></div>';
    var trigger = host.querySelector(".filter-trigger"), menu = host.querySelector(".filter-menu"), value = cfg.value;
    cfg.options.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "filter-option"; b.setAttribute("role", "option"); b.dataset.value = o.value;
      b.innerHTML = '<i><span class="ico ico--check" aria-hidden="true"></span></i><span></span>'; b.lastElementChild.textContent = o.label;
      b.addEventListener("click", function () { self.set(o.value); self.close(); trigger.focus(); cfg.onChange(o.value); });
      menu.appendChild(b);
    });
    self.set = function (v) {
      value = v;
      var o = cfg.options.filter(function (x) { return x.value === v; })[0];
      trigger.firstElementChild.textContent = o ? o.label : "";
      Array.prototype.forEach.call(menu.children, function (b) { var on = b.dataset.value === v; b.classList.toggle("is-selected", on); b.setAttribute("aria-selected", String(on)); });
    };
    self.open = function () { closeAll(self); menu.hidden = false; host.classList.add("is-open"); trigger.setAttribute("aria-expanded", "true"); };
    self.close = function () { menu.hidden = true; host.classList.remove("is-open"); trigger.setAttribute("aria-expanded", "false"); };
    trigger.addEventListener("click", function () { menu.hidden ? self.open() : self.close(); });
    host.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { e.stopPropagation(); self.close(); trigger.focus(); }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !menu.hidden) {
        var items = Array.prototype.slice.call(menu.children), i = items.indexOf(document.activeElement);
        e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
      }
    });
    self.set(value); dropdowns.push(self);
  }
  function onDocClick(e) { if (!e.target.closest(".filter-dropdown")) closeAll(); }
  document.addEventListener("click", onDocClick);

  new SelectDropdown(categoryEl, {
    label: "Filtrar por categoría", value: state.category,
    options: CATEGORIES.map(function (c) { return { value: c, label: c }; }),
    onChange: function (v) { state.category = v; state.offset = 0; render(); }
  });

  /* ---------- Modal "Agregar evento" ---------- */
  var modalEl = null, modalDropdowns = [];
  function openModal(date) {
    closeModal(true);
    var form = { type: "commercial", category: CATEGORIES[1] };
    modalSlot.innerHTML =
      '<div class="cal-backdrop"><div class="cal-modal" role="dialog" aria-modal="true" aria-labelledby="cal-modal-title"><header class="cal-modal__head"><h2 id="cal-modal-title">Agregar evento</h2>' +
      '<button class="cal-modal__close" type="button" data-close aria-label="Cerrar">' + ico("cerrar") + "</button></header>" +
      '<form class="cal-form" novalidate><label>Nombre<input name="name" required placeholder="Ej. Semana de snacks" autocomplete="off"></label>' +
      '<div class="cal-form__row"><label>Fecha<input name="date" type="date" required value="' + esc(date || "") + '"></label><div class="cal-field"><span>Tipo de evento</span><div class="filter-dropdown" data-f="type"></div></div></div>' +
      '<div class="cal-field"><span>Categoría</span><div class="filter-dropdown" data-f="category"></div></div>' +
      '<label>Descripción<textarea name="description" rows="3" placeholder="Describe brevemente el objetivo del evento"></textarea></label>' +
      '<p class="cal-form__error" role="alert" hidden style="margin:0;color:#b42318;font-size:10px">Completa el nombre y la fecha del evento.</p>' +
      '<div class="cal-form__actions"><button class="cal-cancel" type="button" data-close>Cancelar</button><button class="cal-submit" type="submit">Guardar evento</button></div></form></div></div>';
    modalEl = modalSlot.firstElementChild;
    var f = modalEl.querySelector("form"), dropdownsBefore = dropdowns.length;
    new SelectDropdown(f.querySelector('[data-f="type"]'), { label: "Tipo de evento", value: form.type, options: TYPES.map(function (t) { return { value: t, label: TYPE_LABELS[t] }; }), onChange: function (v) { form.type = v; } });
    new SelectDropdown(f.querySelector('[data-f="category"]'), { label: "Categoría del evento", value: form.category, options: CATEGORIES.slice(1).map(function (c) { return { value: c, label: c }; }), onChange: function (v) { form.category = v; } });
    modalDropdowns = dropdowns.splice(dropdownsBefore);
    modalEl.addEventListener("click", function (e) { if (e.target === modalEl || e.target.closest("[data-close]")) closeModal(); else if (!e.target.closest(".filter-dropdown")) modalDropdowns.forEach(function (d) { d.close(); }); });
    modalEl.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeModal(); return; }
      if (e.key !== "Tab") return;
      var f2 = Array.prototype.filter.call(modalEl.querySelectorAll("button, input, textarea"), function (x) { return !x.disabled && x.offsetParent !== null; });
      if (!f2.length) return;
      var first = f2[0], last = f2[f2.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = f.elements.name.value.trim(), dt = f.elements.date.value;
      if (!name || !dt) { f.querySelector(".cal-form__error").hidden = false; (name ? f.elements.date : f.elements.name).focus(); return; }
      var ev = { id: "event-" + Date.now(), name: name, date: dt, type: form.type, category: form.category, description: f.elements.description.value.trim() };
      userEvents.push(ev); saveUserEvents(userEvents);
      var n = normalize(ev); showMonthOf(n); selectEvent(n); state.view = "monthly";
      if (state.types.indexOf(n.type) < 0) state.types.push(n.type);
      closeModal(true); render();
      var sel = bodyEl.querySelector(".cal-day.is-selected"); if (sel) sel.focus();
    });
    f.elements.name.focus();
  }
  function closeModal(silent) {
    if (!modalEl) return;
    modalDropdowns.forEach(function (d) { var i = dropdowns.indexOf(d); if (i >= 0) dropdowns.splice(i, 1); });
    modalDropdowns = []; modalSlot.innerHTML = ""; modalEl = null;
    if (!silent && lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }

  /* ---------- Arranque con parámetros de URL ---------- */
  var params = new URLSearchParams(window.location.search), opened = false;
  var evId = params.get("evento"), day = params.get("dia");
  var target = evId && allEvents().filter(function (x) { return x.id === evId; })[0];
  if (target) { selectEvent(target); showMonthOf(target); }
  else if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
    var dd = new Date(day + "T12:00:00");
    if (!isNaN(dd)) { state.y = dd.getFullYear(); state.m = dd.getMonth(); var de = byDate(allEvents(), day); if (de) selectEvent(de); }
  }
  render();
  if (params.get("agregar") === "1") {
    opened = true; lastTrigger = root.querySelector("[data-add]"); openModal("");
    params.delete("agregar");
    try { history.replaceState(history.state, "", window.location.pathname + (params.toString() ? "?" + params.toString() : "")); } catch (e) { /* sin historial */ }
  }

  return function destroy() {
    clearTimeout(timer);
    document.removeEventListener("click", onDocClick);
  };
});
