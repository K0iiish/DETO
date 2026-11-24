/* DETO · Emociones del consumidor (MOCKUP con IA simulada)
   Muestra cómo se vería una IA que lee comentarios y reseñas (TikTok, Instagram, reseñas de Líder/Jumbo) y
   clasifica las emociones de los consumidores sobre cada oportunidad.
   IMPORTANTE: no hay IA ni comentarios reales. Los resultados se generan de forma determinista a partir del nombre
   y la categoría del producto (misma entrada → mismo resultado) y la pantalla lo dice explícitamente.
   No modifica el puntaje DETO: se muestra cómo entraría a E (Evidencia externa) si se conectara. */
(function () {
  "use strict";
  var DETO = (window.DETO = window.DETO || {});
  if (DETO.emociones) return;

  var EMOTIONS = [
    { key: "entusiasmo", label: "Entusiasmo", color: "#15803d", positive: true },
    { key: "antojo", label: "Antojo", color: "#b45309", positive: true },
    { key: "curiosidad", label: "Curiosidad", color: "#1d4ed8", positive: true },
    { key: "frustracion", label: "Frustración", color: "#b91c1c", positive: false },
    { key: "desconfianza", label: "Desconfianza", color: "#4b5563", positive: false }
  ];

  /* Sesgos por tipo de producto (supuestos del mockup) */
  var PROFILES = [
    { re: /halloween|chocolate|gomit|caramel|alfajor|galleta|helado|queque|brownie|dulce|snack|papas|chubi|confit/i, w: [22, 40, 14, 14, 10] },
    { re: /zero|sin az[uú]car|light|diet/i, w: [30, 12, 16, 12, 30] },
    { re: /prote[ií]n|keto|vegan|org[aá]nic|integral|matcha|kombucha|saludable/i, w: [26, 10, 38, 12, 14] },
    { re: /cerveza|vino|pisco|licor|c[oó]ctel|gaseosa|coca|sprite|bebida|energ/i, w: [34, 26, 10, 18, 12] },
    { re: /verdura|fruta|br[oó]coli|zanahori|palta|tomate|cebol|pl[aá]tano|lechuga|pan |marraqueta/i, w: [16, 14, 8, 40, 22] },
    { re: /.*/, w: [28, 20, 20, 18, 14] }
  ];

  var COMMENTS = {
    entusiasmo: ["Lo probé y quedé fan de {p}, lo voy a comprar siempre", "Por fin llegó {p} a Chile, lo estaba esperando", "{p} está buenísimo, se los recomiendo"],
    antojo: ["Necesito {p} ahora mismo 😋", "Viendo series a medianoche y se me antojó {p}", "Si lo tuvieran en delivery rápido pediría {p} todos los días"],
    curiosidad: ["¿Alguien probó {p}? ¿Vale la pena?", "Vi {p} en TikTok, ¿dónde lo venden?", "¿{p} es igual al original o cambia el sabor?"],
    frustracion: ["Fui a tres supermercados y no había {p}", "{p} subió mucho de precio, ya no conviene", "Siempre está agotado {p}"],
    desconfianza: ["No sé qué tiene {p}, ¿es muy procesado?", "{p} no se parece a la foto", "¿{p} tiene muchos endulzantes?"]
  };

  var INSIGHTS = {
    entusiasmo: "Hay entusiasmo genuino: la conversación es positiva y se recomienda entre pares. Conviene priorizarlo antes de que la competencia sature la categoría.",
    antojo: "Predomina el antojo: es compra por impulso. En Turbo encaja con entregas rápidas, horario nocturno y ubicación en «Antojos».",
    curiosidad: "Predomina la curiosidad: es un producto que la gente quiere probar. Conviene un piloto acotado con buena descripción y foto.",
    frustracion: "Predomina la frustración por precio o falta de stock en otros canales. Es una oportunidad si Turbo asegura disponibilidad.",
    desconfianza: "Predomina la desconfianza (ingredientes, calidad, parecido con la foto). Antes de incorporarlo, mejora la información del producto."
  };

  function seed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  function shortName(name) {
    var n = name.replace(/\s+-\s+.*$|,.*$/, "").replace(/\b(pack|bolsa|botella|lata|caja|desechable|retornable|un\.?|unidades?)\b/gi, "").replace(/\s+\d+([.,]\d+)?\s*(g|gr|kg|ml|cc|l|lt)\b.*$/i, "").trim();
    n = n.replace(/\s+/g, " ").replace(/^(de|del|con|y)\s+/i, "").replace(/^bebida\s+/i, "");
    n = n || name;
    if (n.length <= 28) return n;
    var out = "";
    n.split(/\s+/).some(function (w) { if ((out + " " + w).trim().length > 28) return true; out = (out + " " + w).trim(); return false; });
    out = out.replace(/(\s+(sin|con|de|del|y|en|la|el|los|las|al|para|sabor))+$/i, "");
    return out || n.slice(0, 28);
  }

  function analyze(t) {
    var rnd = seed(t.slug || t.name);
    var prof = PROFILES.filter(function (p) { return p.re.test(t.name + " " + (t.subcategory || "")); })[0];
    var raw = prof.w.map(function (w) { return Math.max(2, w * (0.7 + rnd() * 0.6)); });
    var sum = raw.reduce(function (a, b) { return a + b; }, 0);
    var pcts = raw.map(function (v) { return Math.round(100 * v / sum); });
    pcts[0] += 100 - pcts.reduce(function (a, b) { return a + b; }, 0);
    var rows = EMOTIONS.map(function (e, i) { return { key: e.key, label: e.label, color: e.color, positive: e.positive, pct: pcts[i] }; });
    var dominant = rows.slice().sort(function (a, b) { return b.pct - a.pct; })[0];
    var pos = rows.filter(function (r) { return r.positive; }).reduce(function (a, r) { return a + r.pct; }, 0);
    var mentions = Math.round(80 + rnd() * 520 + (t.sources && t.sources.indexOf("Novedades") >= 0 ? 120 : 0));
    var split = [0.45 + rnd() * 0.15, 0.25 + rnd() * 0.1];
    var tiktok = Math.round(mentions * split[0]), ig = Math.round(mentions * split[1]), rev = Math.max(0, mentions - tiktok - ig);
    var name = shortName(t.name);
    var order = rows.slice().sort(function (a, b) { return b.pct - a.pct; });
    var third = order.filter(function (r, i) { return i > 1 && r.positive !== order[0].positive; })[0] || order[2];
    var comments = [order[0], order[1], third].map(function (r, i) {
      var list = COMMENTS[r.key];
      return { emotion: r, text: list[Math.floor(rnd() * list.length)].replace("{p}", name), source: ["TikTok", "Instagram", "Reseña " + (t.retailer || "Líder")][i] };
    });
    var trend = Math.round((rnd() - 0.3) * 40);
    return { rows: rows, dominant: dominant, index: pos, mentions: mentions, bySource: [["TikTok", tiktok], ["Instagram", ig], ["Reseñas", rev]], comments: comments, trend: trend };
  }

  var cache = {};
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function resultHtml(a, t) {
    var bars = a.rows.map(function (r) {
      return '<li><span class="emo-row__label"><i style="background:' + r.color + '"></i>' + r.label + "</span>" +
        '<span class="emo-row__track"><b style="--w:' + r.pct + "%;background:" + r.color + '"></b></span><strong>' + r.pct + "%</strong></li>";
    }).join("");
    var comments = a.comments.map(function (c) {
      return '<li class="emo-comment"><span class="emo-chip" style="--c:' + c.emotion.color + '">' + c.emotion.label + "</span><p>«" + esc(c.text) + "»</p><small>" + esc(c.source) + "</small></li>";
    }).join("");
    return '<div class="emo-kpis">' +
      '<div><span>Emoción dominante</span><strong style="color:' + a.dominant.color + '">' + a.dominant.label + "</strong></div>" +
      '<div><span>Índice emocional positivo</span><strong>' + a.index + '<small>/100</small></strong></div>' +
      '<div><span>Menciones analizadas</span><strong>' + a.mentions.toLocaleString("es-CL") + "</strong><small>" + (a.trend >= 0 ? "+" : "") + a.trend + "% vs. mes anterior</small></div></div>" +
      '<ul class="emo-bars" aria-label="Distribución de emociones">' + bars + "</ul>" +
      '<p class="emo-sources">' + a.bySource.map(function (s) { return "<span>" + s[0] + " · " + s[1] + "</span>"; }).join("") + "</p>" +
      '<div class="emo-insight"><strong>Qué significa para Turbo</strong><p>' + INSIGHTS[a.dominant.key] + "</p></div>" +
      '<h4 class="emo-sub">Comentarios representativos</h4><ul class="emo-comments">' + comments + "</ul>" +
      '<p class="emo-score">Si se conecta, el índice emocional entraría a <b>E · Evidencia externa</b> del puntaje DETO. En este mockup no cambia el puntaje.</p>' +
      '<button type="button" class="emo-again" data-emo-again>Volver a analizar</button>';
  }

  function render(container, t) {
    if (!container || !t) return;
    var key = t.slug || t.name;
    container.innerHTML =
      '<header class="emo-head"><div><h3 class="tab-title">Emociones del consumidor</h3><p>La IA lee comentarios y reseñas y detecta qué sienten los consumidores sobre este producto.</p></div>' +
      '<span class="emo-demo" title="Mockup: IA y comentarios simulados">IA simulada · demo</span></header>' +
      '<div class="emo-body" data-emo-body aria-live="polite"></div>';
    var body = container.querySelector("[data-emo-body]");

    function showResult(animate) {
      body.innerHTML = resultHtml(cache[key], t);
      if (animate) { body.classList.remove("is-revealed"); void body.offsetWidth; body.classList.add("is-revealed"); }
      else body.classList.add("is-revealed");
      body.querySelector("[data-emo-again]").addEventListener("click", function () { run(); });
    }
    function run() {
      var a = analyze(t);
      var steps = ["Recolectando " + a.mentions.toLocaleString("es-CL") + " comentarios de TikTok, Instagram y reseñas…", "Clasificando emociones con IA…", "Resumiendo hallazgos…"];
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      body.innerHTML = '<div class="emo-loading"><span class="emo-spinner" aria-hidden="true"></span><p data-emo-step>' + steps[0] + "</p></div>";
      var i = 0, stepEl = body.querySelector("[data-emo-step]");
      var timer = setInterval(function () { i++; if (i < steps.length) stepEl.textContent = steps[i]; }, reduce ? 60 : 550);
      setTimeout(function () { clearInterval(timer); cache[key] = a; if (container.isConnected) showResult(!reduce); }, reduce ? 200 : 1700);
    }

    if (cache[key]) return showResult(false);
    body.innerHTML = '<div class="emo-empty"><p>Analiza lo que se dice de <b>' + esc(shortName(t.name)) + "</b> en redes y reseñas.</p>" +
      '<button type="button" class="emo-run" data-emo-run><span aria-hidden="true">✦</span> Analizar emociones con IA</button></div>';
    body.querySelector("[data-emo-run]").addEventListener("click", run);
  }

  DETO.emociones = { render: render, analyze: analyze };
})();
