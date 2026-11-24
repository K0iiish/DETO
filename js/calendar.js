/* Calendario comercial: grilla de 6 semanas (lunes a domingo) con navegación de mes.
   Los días con evento se marcan en naranja (en los frames: 11 y 27 de noviembre de 2026). */
DETO.page("inicio", function () {
  "use strict";

  var root = document.querySelector(".calendar");
  if (!root) return;
  var gridEl = root.querySelector('[data-calendar="grid"]');
  var titleEl = root.querySelector('[data-calendar="title"]');

  var MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  /* Eventos: data/eventos.js + los que el usuario agregó en Calendario (localStorage) */
  var E = DETO.eventos;
  var EVENTS = E.list.slice();
  try {
    (JSON.parse(localStorage.getItem(E.USER_KEY) || "[]") || []).forEach(function (u) {
      if (u && u.id && u.date && !EVENTS.some(function (e) { return e.id === u.id; })) EVENTS.push(u);
    });
  } catch (e) { /* sin almacenamiento */ }

  var now = new Date();
  var view = { year: now.getFullYear(), month: now.getMonth() }; // mes actual

  /* Próximos eventos (3) con "En N días" calculado hoy */
  var listEl = document.querySelector("[data-events]");
  if (listEl) {
    var fmt = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" });
    listEl.innerHTML = E.upcoming(EVENTS).slice(0, 3).map(function (ev) {
      var date = fmt.format(new Date(ev.date + "T12:00:00")); date = date.charAt(0).toUpperCase() + date.slice(1);
      return '<li><a class="event" href="calendario.html?evento=' + encodeURIComponent(ev.id) + '">' +
        '<span class="event__icon"><img src="assets/icons/evento-icono.svg" alt="" width="20" height="20"></span>' +
        '<span class="event__text"><span class="event__name"></span><span class="event__date">' + date + "</span></span>" +
        '<span class="event__badge">' + E.whenLabel(ev.date) + "</span>" +
        '<img class="event__arrow" src="assets/icons/evento-flecha.svg" alt="" width="16" height="16"></a></li>';
    }).join("");
    Array.prototype.forEach.call(listEl.querySelectorAll(".event__name"), function (n, i) { n.textContent = E.upcoming(EVENTS)[i].name; });
  }

  function key(y, m, d) { return y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); }
  function eventFor(y, m, d) { var k = key(y, m, d); return EVENTS.filter(function (e) { return e.date === k; })[0]; }

  function render() {
    var y = view.year, m = view.month;
    titleEl.textContent = MONTHS[m].charAt(0).toUpperCase() + MONTHS[m].slice(1) + " de " + y;

    var first = new Date(y, m, 1);
    var offset = (first.getDay() + 6) % 7;        // lunes = 0
    var start = new Date(y, m, 1 - offset);
    var html = WEEKDAYS.map(function (d) { return '<span class="cal-head">' + d + "</span>"; }).join("");

    for (var i = 0; i < 42; i++) {
      var date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var inMonth = date.getMonth() === m;
      var ev = eventFor(date.getFullYear(), date.getMonth(), date.getDate());
      var label = date.getDate() + " de " + MONTHS[date.getMonth()] + " de " + date.getFullYear() + (ev ? ": " + ev.name : "");
      var cls = "cal-day" + (inMonth ? "" : " cal-day--out") + (ev ? " cal-day--event" : "");
      html += '<button class="' + cls + '" type="button"' + (ev ? ' data-evento="' + ev.id + '"' : "") + ' aria-label="' + label.replace(/"/g, "&quot;") + '">' +
        (ev ? '<span class="cal-day__mark">' + date.getDate() + "</span>" : date.getDate()) + "</button>";
    }
    gridEl.innerHTML = html;
  }

  function shift(delta) {
    var d = new Date(view.year, view.month + delta, 1);
    view.year = d.getFullYear(); view.month = d.getMonth();
    render();
  }

  /* Día marcado → Calendario con ese evento seleccionado */
  function open(href) { if (window.DETO && DETO.navigate) DETO.navigate(href); else window.location.assign(href); }
  gridEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".cal-day--event");
    if (btn && btn.dataset.evento) open("calendario.html?evento=" + btn.dataset.evento);
  });
  /* "Agregar evento" → misma acción que en Calendario (modal) */
  var addBtn = root.querySelector(".add-event");
  if (addBtn) addBtn.addEventListener("click", function () { open("calendario.html?agregar=1"); });

  root.querySelector('[data-calendar="prev"]').addEventListener("click", function () { shift(-1); });
  root.querySelector('[data-calendar="next"]').addEventListener("click", function () { shift(1); });
  render();
});
