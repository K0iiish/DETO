/* "Generar informe" (sidebar): descarga un CSV con las oportunidades DETO, su puntaje y su desglose.
   Se abre bien en Excel (separador ";" y BOM UTF-8). Si los datos aún no están cargados, los carga. */
(function () {
  "use strict";
  function withData(cb) {
    if (window.DETO_REAL) return cb(window.DETO_REAL);
    var s = document.createElement("script");
    s.src = "data/deto-real.js";
    s.onload = function () { cb(window.DETO_REAL); };
    document.head.appendChild(s);
  }
  function cell(v) {
    if (v === null || v === undefined) return "";
    var t = String(v).replace(/"/g, '""');
    return /[;"\n]/.test(t) ? '"' + t + '"' : t;
  }
  function download(R) {
    var S = R.summary;
    var head = ["Ranking", "Producto", "Marca", "Cadena", "Macrocategoría", "Categoría", "Subcategoría", "Estado", "Tendencia", "Puntaje DETO", "Nivel",
      "D Demanda", "E Evidencia", "T Tendencia", "O Oferta", "Cobertura %", "Confianza", "Venta proyectada u/sem", "Pesimista u/sem", "Optimista u/sem",
      "Crecimiento análogos %", "Precio competencia CLP", "Análogos directos", "Análogos cercanos", "Formato similar en Turbo", "Primera captura", "Última captura", "Link"];
    var rows = R.trends.map(function (t, i) {
      return [i + 1, t.name, t.brand, t.retailers.join(" y "), t.macro, t.category, t.subcategory, t.status, t.trend, t.score, t.level,
        t.parts.D, t.parts.E, t.parts.T, t.parts.O, t.coverage, t.confidence, t.sales, t.salesPes, t.salesOpt,
        t.growth, t.price, t.nDirect, t.nNear, t.variantInCatalog || "", t.firstSeen, t.lastSeen, t.link];
    });
    var meta = [["DETO · Informe de oportunidades"], ["Ventas Turbo", S.salesFrom + " a " + S.salesTo, S.stores + " tiendas", S.products + " productos"],
      ["Capturas Líder/Jumbo", S.captureDates.join(", ")], ["Fórmula", "0,40·D + 0,20·E + 0,30·T + 0,10·O (dato faltante reparte su peso)"], []];
    var csv = "﻿" + meta.concat([head]).concat(rows).map(function (r) { return r.map(cell).join(";"); }).join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "DETO_informe_oportunidades_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(".sidebar__report");
    if (!btn) return;
    e.preventDefault();
    withData(download);
  });
})();
