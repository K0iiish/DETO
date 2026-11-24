/* Carrusel "Tendencias destacadas" (Home DETO)
   Lógica traducida de TrendCarousel.tsx (Figma Make) a JS vanilla:
   - flechas prev/next y dots, loop infinito, transición 0.38s (desliza 24px + fundido)
   - la tarjeta lateral muestra siempre la siguiente tendencia
   - autoplay cada 5 s; se pausa con mouse/foco/gráfico y 7 s tras un clic (sin autoplay si el usuario pide menos movimiento)
   - gráfico interactivo con tooltip (mouse y teclado) */
DETO.page("inicio", function () {
  "use strict";

  var section = document.getElementById("tendencias-destacadas");
  if (!section) return;
  var bodyEl = section.querySelector('[data-carousel="body"]');
  var dotsEl = section.querySelector('[data-carousel="dots"]');
  var statusEl = section.querySelector('[data-carousel="status"]');

  /* ---------- Datos reales (data/deto-real.js): top 3 por puntaje DETO ---------- */
  var R = window.DETO_REAL, S = R.summary;
  var PERIODS = S.dayLabels;
  var PLACEHOLDER = "assets/img/catalogo-producto-placeholder.svg";

  var METRIC_TOPS_A = [
    { ti: 20, tv: 20, tl: 47, ts: 80 },
    { ti: 20, tv: 20, tl: 47, ts: 80 },
    { ti: 10, tv: 10, tl: 57, ts: 90 }
  ];
  var METRIC_TOPS_B = [
    { ti: 10, tv: 10, tl: 57, ts: 105 },
    { ti: 27.5, tv: 27.5, tl: 54.5, ts: 87.5 },
    { ti: 35, tv: 35, tl: 62, ts: 80 }
  ];
  function fmt(n) { return Number(n).toLocaleString("es-CL"); }
  function badgeLabel(t) { return t.trend === "Estable" ? "En evaluación" : t.trend; }

  var OPPORTUNITIES = R.trends.slice(0, 3).map(function (t) {
    var tags = [t.subcategory].concat(t.retailers.map(function (r) { return r; }));
    if (t.sources.indexOf("Novedades") >= 0) tags.push("Novedad");
    else if (t.sources.indexOf("Más vendidos") >= 0) tags.push("Más vendido");
    return {
      id: t.slug, variant: "b", tendencia: t.slug,
      name: t.name, status: badgeLabel(t), tags: tags.slice(0, 4),
      growth: t.growth === null ? "s/d" : (t.growth > 0 ? "+" : "") + Math.round(t.growth) + "%",
      growthLabel: "Crecimiento de análogos",
      image: DETO.img.src(t.ean, t.img, t.slug),
      values: t.series,
      metrics: [
        { value: fmt(Math.round(t.sales)) + " u.", label: "Venta proyectada semanal", sub: "red Turbo" },
        { value: fmt(t.quantity), label: "Cantidad proyectada", sub: "4 semanas" },
        { value: t.score + "/100", label: "Puntaje DETO", sub: "nivel " + t.level.toLowerCase() }
      ]
    };
  });

  /* ---------- KPIs, pilotos sugeridos y eventos ---------- */
  function setText(sel, v) { var el = document.querySelector(sel); if (el) el.textContent = v; }
  setText('[data-kpi="opportunities"]', fmt(S.opportunities));
  setText('[data-kpi="rising"]', fmt(S.rising));
  setText('[data-kpi="novelties"]', fmt(S.novelties));
  setText('[data-kpi="events"]', String(DETO.eventos ? DETO.eventos.upcoming().length : 0));
  setText("[data-source-note]", "Datos reales · ventas Turbo " + S.salesFrom.split("-").reverse().slice(0, 2).join("/") + "–" + S.salesTo.split("-").reverse().slice(0, 2).join("/") +
    " (" + S.stores + " tiendas) · capturas Líder y Jumbo al " + S.lastCapture.split("-").reverse().slice(0, 2).join("/"));

  var pilotsEl = document.querySelector("[data-pilots]");
  if (pilotsEl && DETO.lab) {
    pilotsEl.innerHTML = DETO.lab.bestPairs(2).map(function (x, i) {
      var p = x.product, st = x.store;
      return '<article class="pilot"><div class="pilot__img"><img src="' + p.image + '" alt="' + esc(p.name) + '"></div><div class="pilot__info">' +
        '<h3 class="pilot__title">' + esc(p.name) + "</h3>" +
        '<span class="status ' + (i === 0 ? "status--ok" : "status--warn") + '">' + (i === 0 ? "Sugerido" : "En análisis") + "</span>" +
        '<p class="pilot__row"><img src="assets/icons/lab-tienda.svg" alt="" width="14" height="14">' + esc(st.name.replace("Turbo, ", "Tienda ")) + "</p>" +
        '<p class="pilot__row"><img src="assets/icons/lab-calendario.svg" alt="" width="14" height="14">Afinidad ' + x.ev.affinity + "/100 · " + (x.ev.suggestedLot ? "lote " + x.ev.suggestedLot + " u." : "lote por definir") + "</p>" +
        '<a class="pilot__more tap" href="lab.html" aria-label="Ver más: ' + esc(p.name) + ' en LAB"><img src="assets/icons/lab-ojo.svg" alt="" width="14" height="14">Ver más<img src="assets/icons/lab-flecha.svg" alt="" width="12" height="12"></a>' +
        "</div></article>";
    }).join("");
  }
  var METRIC_ICONS = ["search", "cart", "users"];
  var METRIC_SRC = {
    search: "assets/icons/metrica-busqueda.svg",
    cart: "assets/icons/metrica-carrito.svg",
    users: "assets/icons/metrica-usuarios.svg"
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Gráfico: geometría tomada del frame (viewBox 181.227×100) ---------- */
  var CH = { w: 181.227, h: 100, x0: 5.57617, x1: 175.651, yTop: 20.8334, yBottom: 85.4167, yBase: 91.6667 };

  function chartPoints(values) {
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values), range = Math.max(1, max - min);
    var step = (CH.x1 - CH.x0) / (values.length - 1);
    return values.map(function (v, i) {
      return { x: CH.x0 + i * step, y: CH.yBottom - ((v - min) / range) * (CH.yBottom - CH.yTop), v: v, period: PERIODS[i] };
    });
  }

  var uid = 0;
  function chartMarkup(op) {
    var pts = chartPoints(op.values), gid = "g-trend-" + (++uid);
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p.x.toFixed(3) + " " + p.y.toFixed(3); }).join(" ");
    var area = line + " L" + CH.x1 + " " + CH.yBase + " L" + CH.x0 + " " + CH.yBase + " Z";
    return '<div class="chart" data-chart>' +
      '<div class="chart__tip" role="tooltip" hidden><small></small><strong></strong></div>' +
      '<div class="chart__point" hidden></div>' +
      '<svg class="chart__svg" viewBox="0 0 ' + CH.w + " " + CH.h + '" preserveAspectRatio="none" role="img" tabindex="0" ' +
        'aria-label="Evolución de ' + esc(op.name) + ' (unidades diarias de productos análogos, 1–14 oct). Usa las flechas izquierda y derecha para ver cada día.">' +
        '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9EE66B" stop-opacity=".5"/><stop offset="1" stop-color="#EAFBD5" stop-opacity=".05"/></linearGradient></defs>' +
        '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
        '<path class="chart__line" d="' + line + '"/>' +
        '<line class="chart__guide" x1="0" x2="0" y1="10" y2="90" hidden/>' +
      "</svg></div>";
  }

  function bindChart(root, op, onInteract) {
    var wrap = root.querySelector("[data-chart]");
    if (!wrap) return;
    var svg = wrap.querySelector(".chart__svg"), tip = wrap.querySelector(".chart__tip"),
        point = wrap.querySelector(".chart__point"), guide = wrap.querySelector(".chart__guide");
    var pts = chartPoints(op.values), last = pts.length - 1;

    function show(i) {
      var p = pts[i];
      guide.setAttribute("x1", p.x); guide.setAttribute("x2", p.x); guide.removeAttribute("hidden");
      var left = (p.x / CH.w) * 100 + "%";
      point.style.left = left; point.style.top = p.y + "px"; point.hidden = false;
      tip.style.left = left; tip.style.top = p.y + "px";
      tip.classList.toggle("chart__tip--start", i === 0);
      tip.classList.toggle("chart__tip--end", i === last);
      tip.querySelector("small").textContent = p.period;
      tip.querySelector("strong").textContent = p.v + " u.";
      tip.hidden = false;
      wrap.dataset.index = i;
    }
    function hide() { tip.hidden = true; point.hidden = true; guide.setAttribute("hidden", ""); delete wrap.dataset.index; }

    wrap.addEventListener("pointerenter", function () { onInteract(true); });
    wrap.addEventListener("pointerleave", function () { hide(); onInteract(false); });
    svg.addEventListener("pointermove", function (e) {
      var b = svg.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (e.clientX - b.left) / b.width));
      show(Math.round(ratio * last));
    });
    svg.addEventListener("focus", function () { show(last); onInteract(true); });
    svg.addEventListener("blur", function () { hide(); onInteract(false); });
    svg.addEventListener("keydown", function (e) {
      var i = wrap.dataset.index === undefined ? last : Number(wrap.dataset.index);
      if (e.key === "ArrowLeft") i = Math.max(0, i - 1);
      else if (e.key === "ArrowRight") i = Math.min(last, i + 1);
      else if (e.key === "Home") i = 0;
      else if (e.key === "End") i = last;
      else return;
      e.preventDefault(); e.stopPropagation(); show(i);
    });
  }

  /* ---------- Plantillas ---------- */
  function metricMarkup(m, i, op) {
    var tops = (op.variant === "a" ? METRIC_TOPS_A : METRIC_TOPS_B)[i], type = METRIC_ICONS[i];
    var cls = "metric" + (op.variant === "b" && i === 2 ? " metric--wide-sub metric--nowrap" : "");
    return '<div class="' + cls + '" style="--ti:' + tops.ti + "px;--tv:" + tops.tv + "px;--tl:" + tops.tl + "px;--ts:" + tops.ts + 'px">' +
      '<span class="metric__icon metric__icon--' + type + '"><span class="metric__icon-in"><img src="' + METRIC_SRC[type] + '" alt=""></span></span>' +
      '<p class="metric__value' + ((op.variant === "a" && i === 2) || (op.variant === "b" && i === 0) ? " metric__value--wrap" : "") + '">' + esc(m.value) + "</p>" +
      '<p class="metric__label">' + esc(m.label) + "</p>" +
      '<p class="metric__sub">' + esc(m.sub || "vs. período anterior") + "</p></div>";
  }

  /* Enlace a Tendencias con la tendencia seleccionada (?tendencia=slug). Sin equivalente en Tendencias: solo abre la pantalla. */
  function trendUrl(op) { return "tendencias.html" + (op.tendencia ? "?tendencia=" + encodeURIComponent(op.tendencia) : ""); }

  function slideMarkup(op, index, dir) {
    var anim = dir === "next" ? " slide--from-next" : dir === "prev" ? " slide--from-prev" : "";
    var art = op.secondaryImage
      ? '<img class="art__blob" src="assets/img/blob-verde.png" alt="">' +
        '<img class="art__product art__product--box" src="' + op.image + '" alt="' + esc(op.name) + '">' +
        '<div class="art__bar-wrap"><img class="art__bar" src="' + op.secondaryImage + '" alt=""></div>'
      : '<img class="art__blob" src="assets/img/blob-verde.png" alt="">' +
        '<span class="art__product art__product--single"><img src="' + op.image + '" alt="' + esc(op.name) + '"></span>';
    return '<article class="slide slide--' + op.variant + anim + '" role="group" aria-roledescription="diapositiva" aria-label="' + (index + 1) + " de " + OPPORTUNITIES.length + ": " + esc(op.name) + '">' +
      '<div class="slide__tags"><span class="badge-trend"><span class="arw" aria-hidden="true"></span>' + esc(op.status) + "</span>" +
        op.tags.map(function (t) { return '<span class="chip-glass">' + esc(t) + "</span>"; }).join("") + "</div>" +
      '<div class="slide__main">' +
        '<div class="slide__summary"><h3 class="slide__name">' + esc(op.name) + "</h3>" +
          '<div class="growth"><img class="growth__icon" src="assets/icons/tendencia-subida.svg" alt="" width="27" height="27">' +
          '<div><p class="growth__value">' + esc(op.growth) + '</p><p class="growth__label">' + esc(op.growthLabel) + '</p><p class="growth__note">(sem. 2 vs. sem. 1)</p></div></div></div>' +
        chartMarkup(op) +
        '<div class="art">' + art + "</div>" +
      "</div>" +
      '<div class="slide__footer"><div class="metrics">' + op.metrics.map(function (m, i) { return metricMarkup(m, i, op); }).join("") + "</div>" +
        '<div class="btn-detail-wrap"><a class="btn-detail tap" href="' + trendUrl(op) + '" aria-label="Ver detalle de ' + esc(op.name) + ' en Tendencias">Ver detalle <img src="assets/icons/flecha-derecha-blanca.svg" alt="" width="15" height="15"></a></div></div>' +
      "</article>";
  }

  function peekMarkup(op) {
    return '<a class="peek" href="' + trendUrl(op) + '" aria-label="Ver tendencia: ' + esc(op.name) + ' en Tendencias">' +
      '<span class="status status--ok"><span><span class="arw" aria-hidden="true"></span>' + esc(op.status) + "</span></span>" +
      '<span class="peek__art"><img class="peek__img" src="' + op.image + '" alt=""></span>' +
      '<strong class="peek__name">' + esc(op.name) + "</strong></a>";
  }

  /* ---------- Estado ---------- */
  var active = 0, timer = null;
  var pauses = { hover: false, focus: false, chart: false, press: false }, pressTimer = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isPaused() { return pauses.hover || pauses.focus || pauses.chart || pauses.press; }
  function schedule() {
    clearTimeout(timer);
    if (reduceMotion || isPaused()) return;
    timer = setTimeout(function () { go(active + 1, "next"); }, 5000);
  }
  function setPause(key, value) { pauses[key] = value; schedule(); }

  function render(dir) {
    var op = OPPORTUNITIES[active], next = OPPORTUNITIES[(active + 1) % OPPORTUNITIES.length];
    bodyEl.innerHTML = slideMarkup(op, active, dir) + peekMarkup(next);
    bindChart(bodyEl, op, function (on) { setPause("chart", on); });
    Array.prototype.forEach.call(dotsEl.children, function (dot, i) {
      if (i === active) dot.setAttribute("aria-current", "true"); else dot.removeAttribute("aria-current");
    });
    if (dir) statusEl.textContent = (active + 1) + " de " + OPPORTUNITIES.length + ": " + op.name;
  }

  function go(index, dir) {
    var n = OPPORTUNITIES.length;
    active = ((index % n) + n) % n; // loop infinito
    render(dir);
    schedule();
  }

  /* ---------- Dots ---------- */
  dotsEl.innerHTML = OPPORTUNITIES.map(function (op, i) {
    return '<button class="dot" type="button" data-index="' + i + '" aria-label="Mostrar tendencia ' + (i + 1) + ": " + esc(op.name) + '"></button>';
  }).join("");

  /* ---------- Eventos ---------- */
  section.addEventListener("click", function (e) {
    var arrow = e.target.closest("[data-carousel='prev'], [data-carousel='next']");
    var dot = e.target.closest(".dot");
    if (arrow) go(active + (arrow.dataset.carousel === "next" ? 1 : -1), arrow.dataset.carousel === "next" ? "next" : "prev");
    else if (dot) { var i = Number(dot.dataset.index); if (i !== active) go(i, i < active ? "prev" : "next"); }
  });
  section.addEventListener("pointerdown", function () {
    pauses.press = true; clearTimeout(pressTimer);
    pressTimer = setTimeout(function () { setPause("press", false); }, 7000); schedule();
  });
  section.addEventListener("mouseenter", function () { setPause("hover", true); });
  section.addEventListener("mouseleave", function () { setPause("hover", false); });
  section.addEventListener("focusin", function () { setPause("focus", true); });
  section.addEventListener("focusout", function (e) { if (!section.contains(e.relatedTarget)) setPause("focus", false); });
  section.addEventListener("keydown", function (e) {
    if (e.target.closest("input, textarea, select")) return;
    if (e.key === "ArrowRight") { go(active + 1, "next"); } else if (e.key === "ArrowLeft") { go(active - 1, "prev"); }
  });

  render(null);
  schedule();
  return function destroy() { clearTimeout(timer); clearTimeout(pressTimer); };
});
