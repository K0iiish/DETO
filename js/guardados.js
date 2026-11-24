/* Estado compartido de "productos guardados" (Tendencias escribe, LAB lee y también puede guardar).
   - Se guarda en localStorage (clave "deto-guardados"). Sin backend.
   - Si localStorage no está disponible (modo privado, bloqueado, cuota), cae a memoria y NO se rompe: la sesión sigue funcionando, solo no persiste.
   - Cada elemento: { key, name, brand, category, image, source, savedAt }. `key` es el identificador estable del producto.
   API: DETO.guardados.list() · has(key) · add(item) · remove(key) · toggle(item) · onChange(fn) → función para desuscribirse */
(function () {
  "use strict";
  var DETO = (window.DETO = window.DETO || {});
  if (DETO.guardados) return;

  var STORE_KEY = "deto-guardados";
  var memory = [];           /* respaldo cuando no hay localStorage */
  var listeners = [];

  function read() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw === null) return null;
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data.filter(function (x) { return x && typeof x.key === "string"; }) : [];
    } catch (e) { return null; }
  }
  function write(list) {
    memory = list.slice();
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* sin almacenamiento: queda en memoria */ }
  }
  function list() {
    var stored = read();
    if (stored === null) return memory.slice();
    memory = stored.slice();
    return stored;
  }
  function notify() { listeners.slice().forEach(function (fn) { try { fn(list()); } catch (e) { console.error("[guardados]", e); } }); }

  function has(key) { return list().some(function (x) { return x.key === key; }); }
  function add(item) {
    var current = list();
    if (!item || typeof item.key !== "string" || current.some(function (x) { return x.key === item.key; })) return false;
    current.push({
      key: item.key, name: item.name || "", brand: item.brand || "", category: item.category || "",
      image: item.image || "", source: item.source || "", savedAt: Date.now()
    });
    write(current); notify(); return true;
  }
  function remove(key) {
    var current = list(), next = current.filter(function (x) { return x.key !== key; });
    if (next.length === current.length) return false;
    write(next); notify(); return true;
  }
  /* Devuelve true si quedó guardado, false si se quitó */
  function toggle(item) { if (has(item.key)) { remove(item.key); return false; } add(item); return true; }
  function onChange(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  /* Cambios hechos en otra pestaña */
  window.addEventListener("storage", function (e) { if (e.key === STORE_KEY || e.key === null) notify(); });

  DETO.guardados = { list: list, has: has, add: add, remove: remove, toggle: toggle, onChange: onChange };
})();
