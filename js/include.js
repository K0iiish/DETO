/* Carga los componentes reutilizables (sidebar y header) en cada página.
   Uso: <div data-include="components/sidebar.html"></div>
   Avisa con el evento "components:ready"; js/app.js marca el ítem activo (<body data-page="...">) y monta la página. Requiere servir el proyecto por HTTP. */
(function () {
  const slots = Array.from(document.querySelectorAll("[data-include]"));

  Promise.all(
    slots.map((slot) =>
      fetch(slot.dataset.include)
        .then((res) => {
          if (!res.ok) throw new Error(res.status + " " + slot.dataset.include);
          return res.text();
        })
        .then((html) => {
          const tpl = document.createElement("template");
          tpl.innerHTML = html.trim();
          slot.replaceWith(tpl.content);
        })
        .catch((err) => console.error("[include]", err))
    )
  ).then(() => {
    document.dispatchEvent(new CustomEvent("components:ready"));
  });
})();
