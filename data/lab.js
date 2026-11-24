/* Datos de LAB construidos con datos reales (data/deto-real.js):
   - Tiendas: las 9 tiendas Turbo de BBDD Ventas (pedidos, unidades por semana, categorías con mayor rotación,
     subcategorías que más crecen y producto destacado).
   - Productos: las 6 oportunidades con mayor puntaje DETO + las que el usuario guarda en Tendencias (clave = slug).
   - Afinidad producto × tienda (0–100) con los factores del Make. Sin datos de horario ni de demanda no atendida:
     esos factores quedan "Sin datos" y su peso se reparte entre los demás (misma regla que el puntaje DETO). */
(function () {
  "use strict";
  var DETO = (window.DETO = window.DETO || {});
  if (DETO.lab) return;
  var R = window.DETO_REAL;
  if (!R) return;

  var PLACEHOLDER = "assets/img/catalogo-producto-placeholder.svg";
  var S = R.summary;

  function trendLabel(t) {
    if (t.trend === "Emergente") return "Novedad";
    if (t.growth !== null && t.growth < 0) return "Bajando";
    return "En alza";
  }
  function toProduct(t) {
    return {
      id: t.slug, key: t.slug, name: t.name, brand: t.brand || t.retailer, category: t.subcategory, macro: t.macro,
      trend: trendLabel(t), projectedSales: Math.round(t.sales), score: t.score, image: DETO.img ? DETO.img.src(t.ean, t.img, t.slug) : PLACEHOLDER,
      price: t.price ? Math.round(t.price) : (t.analogPrice ? t.analogPrice.avg : 0),
      margin: t.analogMargin === null ? 0 : Math.round(t.analogMargin), catalogStatus: t.status, trendRef: t
    };
  }

  var BY_SLUG = {};
  R.trends.forEach(function (t) { BY_SLUG[t.slug] = t; });

  /* Top 6 + guardados de Tendencias (se recalcula al entrar a LAB: DETO.lab.sync()) */
  var PRODUCTS = [];
  function sync() {
    var list = R.trends.slice(0, 6).map(toProduct);
    var saved = DETO.guardados ? DETO.guardados.list() : [];
    saved.forEach(function (it) {
      var key = it && it.key;
      if (BY_SLUG[key] && !list.some(function (p) { return p.id === key; })) list.push(toProduct(BY_SLUG[key]));
    });
    PRODUCTS.length = 0;
    Array.prototype.push.apply(PRODUCTS, list);
  }
  sync();

  var STORES = R.stores.map(function (s) {
    return {
      id: s.id, name: s.name, orders: s.orders, weeklyUnits: s.weeklyUnits, categories: s.categories,
      signals: s.signals, status: "Activa", highlight: s.highlight, raw: s
    };
  });

  var FACTORS = [
    { key: "rotation", label: "Rotación de la categoría", weight: 35, description: "Unidades por SKU y semana de la subcategoría en la tienda, comparada con las otras tiendas (BBDD Ventas)." },
    { key: "schedule", label: "Coincidencia horaria", weight: 20, description: "Sin datos: el archivo de ventas no trae la hora del pedido." },
    { key: "trend", label: "Tendencia de la categoría", weight: 15, description: "Crecimiento de la subcategoría en la tienda, semana 2 vs semana 1 (1–14 oct)." },
    { key: "unmet", label: "Demanda no atendida", weight: 30, description: "Sin datos: no hay archivo de búsquedas sin resultado." }
  ];

  function percentileAmongStores(sub, store) {
    var vals = STORES.map(function (s) { return s.raw.subRotation[sub] || 0; });
    var mine = store.raw.subRotation[sub] || 0;
    var below = vals.filter(function (v) { return v < mine; }).length, equal = vals.filter(function (v) { return v === mine; }).length;
    return Math.round(100 * (below + 0.5 * (equal - 1)) / Math.max(1, vals.length - 1));
  }
  function scaleGrowth(g) {
    if (g === undefined || g === null) return null;
    var x = (g / 100 - S.growthP10) / (S.growthP90 - S.growthP10);
    return Math.max(0, Math.min(100, Math.round(100 * x)));
  }

  var cache = {};
  function evaluation(productId, storeId) {
    var k = productId + "|" + storeId;
    if (cache[k]) return cache[k];
    var p = product(productId), s = store(storeId), t = p.trendRef, sub = t.subcategory;
    var values = [s.raw.subRotation[sub] !== undefined ? percentileAmongStores(sub, s) : null, null, scaleGrowth(s.raw.subGrowth[sub]), null];
    var num = 0, den = 0;
    FACTORS.forEach(function (f, i) { if (values[i] !== null) { num += values[i] * f.weight; den += f.weight; } });
    var affinity = den ? Math.round(num / den) : 0;
    var storeSub = s.raw.subUnits[sub] || 0, share = t.netSubUnits ? storeSub / t.netSubUnits : 0;
    var projected = t.sales * share; /* venta proyectada de la red × participación de la tienda en la subcategoría */
    var daily = s.raw.subDaily[sub] || [];
    var ev = {
      productId: productId, storeId: storeId, affinity: affinity, projectedStore: Math.round(projected * 10) / 10,
      suggestedLot: affinity >= 50 && projected > 0 ? Math.max(6, Math.ceil(projected * 2 / 6) * 6) : null,
      factors: FACTORS.map(function (f, i) { return { key: f.key, label: f.label, weight: f.weight, description: f.description, value: values[i] }; }),
      storeGrowth: s.raw.subGrowth[sub] === undefined ? null : s.raw.subGrowth[sub],
      bars: daily.map(function (v, i) { return { label: S.dayLabels[i], value: v }; }),
      weeklyUnits: daily
    };
    cache[k] = ev;
    return ev;
  }
  function affinityLabel(v) { return v >= 65 ? "Alta" : v >= 45 ? "Media" : "Baja"; }
  function recommendation(ev, product, store) {
    var label = affinityLabel(ev.affinity), short = store.name.replace("Turbo, ", "");
    var lot = ev.suggestedLot ? " Lote sugerido: " + ev.suggestedLot + " u. para 2 semanas." : "";
    if (label === "Alta") return product.name + " muestra afinidad alta en " + short + ": su subcategoría rota y crece más que en otras tiendas. Es un buen candidato para un piloto acotado." + lot;
    if (label === "Media") return "El potencial es moderado en " + short + ". Conviene validar con un lote pequeño antes de ampliar." + lot;
    return "La afinidad es baja en " + short + ": la subcategoría rota o crece menos que en otras tiendas. Prioriza otra tienda para el piloto.";
  }
  function product(id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0] || null; }
  function store(id) { return STORES.filter(function (s) { return s.id === id; })[0] || null; }

  /* Mejores combinaciones producto × tienda (para "Pilotos sugeridos" en Inicio) */
  function bestPairs(n) {
    var out = [];
    PRODUCTS.forEach(function (p) {
      STORES.forEach(function (s) { out.push({ product: p, store: s, ev: evaluation(p.id, s.id) }); });
    });
    out.sort(function (a, b) { return b.ev.affinity - a.ev.affinity || b.product.score - a.product.score; });
    var used = {}, picked = [];
    out.forEach(function (x) { if (picked.length < n && !used[x.product.id]) { used[x.product.id] = 1; picked.push(x); } });
    return picked;
  }

  DETO.lab = {
    products: PRODUCTS, stores: STORES, product: product, store: store, sync: sync,
    evaluation: evaluation, affinityLabel: affinityLabel, recommendation: recommendation, bestPairs: bestPairs
  };
})();
