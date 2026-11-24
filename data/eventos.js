/* Eventos comerciales 2026 (compartidos por Inicio y Calendario).
   "category" usa las macrocategorías reales de data/taxonomia.js. "En N días" se calcula con la fecha de hoy. */
(function () {
  "use strict";
  var DETO = (window.DETO = window.DETO || {});
  if (DETO.eventos) return;

  var DULCES = "Despensa y productos secos";
  var EVENTS = [
    { id: "new-year-2026", name: "Año Nuevo", date: "2026-01-01", description: "Inicio de temporada y renovación de ocasiones de consumo.", type: "commercial", category: "Bebidas" },
    { id: "valentines-2026", name: "San Valentín", date: "2026-02-14", description: "Alta intención de compra en regalos, flores y confitería.", type: "commercial", category: DULCES },
    { id: "yellow-flowers-2026", name: "Día de la Flor Amarilla", date: "2026-04-21", description: "Oportunidad express en flores, regalos y consumo de ocasión.", type: "express", category: "Otros" },
    { id: "mothers-day-2026", name: "Día de la Madre", date: "2026-05-10", description: "Campaña de regalos, belleza y productos premium.", type: "commercial", category: DULCES },
    { id: "fathers-day-2026", name: "Día del Padre", date: "2026-06-21", description: "Campaña de regalos y consumo familiar.", type: "commercial", category: "Bebidas" },
    { id: "rappi-day-2026", name: "Rappi Day", date: "2026-08-08", description: "Evento propio con promociones exclusivas en múltiples categorías.", type: "rappi", category: DULCES },
    { id: "national-day-2026", name: "Fiestas Patrias", date: "2026-09-18", description: "Alta demanda en parrilla, bebidas y reuniones.", type: "commercial", category: "Bebidas" },
    { id: "halloween-2026", name: "Halloween", date: "2026-10-31", description: "Ocasión clave para confitería, snacks y disfraces. Incluye las promociones capturadas en Líder y Jumbo.", type: "commercial", category: DULCES },
    { id: "singles-day-2026", name: "Single's Day (Cyberday)", date: "2026-11-11", description: "Campaña digital con foco en descuentos y novedades.", type: "commercial", category: "Tecnología" },
    { id: "rappi-november-2026", name: "Rappi Day", date: "2026-11-24", description: "Promociones exclusivas para usuarios de Rappi.", type: "rappi", category: DULCES },
    { id: "black-friday-2026", name: "Black Friday", date: "2026-11-27", description: "Evento de alto volumen de compra, con foco en descuentos y promociones.", type: "commercial", category: DULCES },
    { id: "christmas-2026", name: "Navidad", date: "2026-12-25", description: "Temporada de regalos, celebraciones y compras de último minuto.", type: "commercial", category: DULCES }
  ];

  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function daysUntil(dateStr) { return Math.round((new Date(dateStr + "T00:00:00") - today()) / 86400000); }
  function whenLabel(dateStr) {
    var n = daysUntil(dateStr);
    if (n < 0) return "Finalizado";
    if (n === 0) return "Hoy";
    return "En " + n + (n === 1 ? " día" : " días");
  }
  function upcoming(list) { return (list || EVENTS).filter(function (e) { return daysUntil(e.date) >= 0; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }

  DETO.eventos = { list: EVENTS, daysUntil: daysUntil, whenLabel: whenLabel, upcoming: upcoming, USER_KEY: "deto-eventos-calendario" };
})();
