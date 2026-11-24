# DETO · MVP con datos reales (12 nov 2026)

Sitio estático (HTML/CSS/JS, sin servidor). Para publicarlo, arrastra la carpeta completa a Netlify con «Deploy manually». Para probarlo en local, abre una terminal en la carpeta y ejecuta `python3 -m http.server 8765`; luego abre http://localhost:8765.

## Datos
| Archivo del sitio | De dónde sale | Qué contiene |
|---|---|---|
| `data/deto-real.js` | Excel «Información UDD» (BBDD Ventas, Productos, Lista de compras) + `capturas.csv` + `capturas_promos.csv` | Resumen, 9 tiendas, 150 oportunidades con puntaje D·E·T·O, competencia Halloween |
| `data/deto-catalogo.js` | BBDD Ventas | 4.231 productos Turbo: unidades, precio de lista, margen, tendencia y ventas diarias |
| `data/taxonomia.js` | BBDD Ventas | Macro → categoría → subcategoría reales |
| `data/eventos.js` | Calendario 2026 | Hitos; «En N días» se calcula con la fecha de hoy |

Solo se publican **agregados** por producto, tienda y día. No van ID de orden, filas de venta ni costos por fila. El Excel no se sube al sitio.

**Para actualizar** con datos nuevos:
`python3 herramientas/build_data.py <Excel> <capturas.csv> <capturas_promos.csv> <carpeta del sitio>` (≈30 s). El script regenera los tres archivos de `data/`.

## Modelo (igual al acordado)
Puntaje DETO = 0,40·D + 0,20·E + 0,30·T + 0,10·O. Si falta un dato, su peso se reparte.
- **Candidatos**: productos de Líder/Jumbo que **no** están en Turbo. Primero se cruza el EAN (en Líder viene en el link); si no hay EAN, se compara nombre y tamaño, de modo que «4 un de 35 g» = «140 g» y «sin azúcar» = «zero». Se excluyen decoración y artículos que no son de consumo.
- **Análogos**: productos Turbo parecidos por nombre (TF-IDF). Directo = misma subcategoría (peso 1) · Cercano = misma categoría (0,5) · Diferente = misma macro (0,25). Si no hay ni directos ni cercanos, la evidencia es insuficiente y el producto no se puntúa.
- **D**: venta semanal ponderada de los análogos (ln, P10–P90 entre candidatos). **T**: crecimiento de los análogos de la semana 2 respecto de la 1 (P10–P90 de las subcategorías). **O**: 0,40 presencia en Líder y Jumbo + 0,35 subida de posición + 0,25 novedad. **E**: solo usa las fuentes con datos ÷ 3, porque Google Trends/Ads no está conectado.
- **LAB**: la afinidad por tienda usa la rotación de la subcategoría (percentil entre tiendas) y su tendencia en esa tienda. «Horario» y «demanda no atendida» quedan como «Sin datos».

## Qué funciona
Inicio (KPIs, top 3, pilotos sugeridos, próximos eventos), Tendencias (filtros, detalle con señales, mercado y desglose, guardar, «Evaluar incorporación» → LAB), LAB (tiendas reales, afinidad por tienda, lote sugerido), Calendario (Halloween con capturas reales, brechas de catálogo por categoría), Catálogo (4.231 productos con filtros y detalle) y **Generar informe** (descarga un CSV de las oportunidades).

## Emociones del consumidor (mockup · IA simulada)
En Tendencias → detalle → pestaña **Señales**, bloque «Emociones del consumidor». El botón «Analizar emociones con IA» simula que una IA lee comentarios de TikTok, Instagram y reseñas y muestra: emoción dominante, índice emocional positivo, distribución (Entusiasmo, Antojo, Curiosidad, Frustración, Desconfianza), comentarios representativos y qué significa para Turbo.
- **No hay IA ni comentarios reales**: todo se genera en `js/emociones.js` a partir del nombre y la categoría (mismo producto → mismo resultado). La pantalla lo indica con la etiqueta «IA simulada · demo».
- No cambia el puntaje DETO. Si se conecta una fuente real, el índice entraría a E (Evidencia externa).

## Fotos de productos
Todas las pantallas (Inicio, Tendencias, LAB, Calendario y Catálogo, con miniatura en cada fila) muestran la foto real cuando existe. El orden de búsqueda (`js/imagenes.js`) es:
1. **Columna `imagen`** del scraper (`radar_scraper_con_fotos.py` ya la guarda) o archivo `assets/productos/<EAN>.jpg` (listado en `data/imagenes.js`).
2. **Fotos de Jumbo** (`data/fotos-jumbo.js`): 99 de 150 tendencias y 2.099 de 4.231 productos del catálogo. Se encontraron el 12 nov buscando cada producto por nombre en jumbo.cl y aceptando solo el mismo producto (nombre + tamaño). El detalle está en `herramientas/fotos_jumbo.md`.
3. **Código de barras** en Open Food Facts y sus bases hermanas, para lo que Jumbo no tiene. Lo hace el navegador del visitante y lo guarda en caché.
4. Si no hay nada, queda el placeholder gris. Si una foto no carga, se pasa sola al paso 3.

## Límites conocidos
- Ventas solo del 1 al 14 oct 2026: la tendencia compara 2 semanas.
- Sin stock: la columna «Stock» muestra la cobertura (tiendas que vendieron el producto, de 9). Las fotos se buscan por EAN (ver «Fotos de productos»).
- En `capturas_promos.csv`, la columna `precio_antes` de Líder es el precio por kg/L, no el precio sin descuento, y `descuento_pct` viene vacía. Por eso no se calculan descuentos.
- La rampa de demanda de cada hito es una curva demostrativa, porque los datos no traen ventas de los hitos.
- La clasificación automática de subcategoría puede fallar en nombres ambiguos (se corrige con la palabra inicial).

---

# DETO · Home + Tendencias (HTML/CSS/JS puro)

Rehecho desde cero a partir de los 3 frames de Figma (archivo `jMTJf5GwQrOq6TN9D632rz`: 506:11 Snacks, 506:1056 Yogurt, 506:2100 Matcha). Sin React ni dependencias. La lógica del carrusel sigue la copia de Figma Make del usuario (`dato--copia-`); en lo visual mandan los frames.

## Cómo correrlo
Los componentes (sidebar y header) se cargan con `fetch`, por lo que **hay que servirlo por HTTP** (no sirve abrir `index.html` con doble clic):

```bash
cd deto-home
python3 -m http.server 8765      # o: npx serve .
# abrir http://localhost:8765/index.html        (Home)
# abrir http://localhost:8765/tendencias.html   (Tendencias)
```

## Estructura
```
index.html               Shell: sidebar + header (includes) y contenido del Home
tendencias.html         Pantalla Tendencias (misma shell; una card y una fila en <template>)
components/sidebar.html Sidebar reutilizable (fijo, logo DETO en todos los estados)
components/header.html  Header reutilizable (fijo)
css/tokens.css          Colores, radios, sombras, tipografía y foco (valores de Figma)
css/base.css            Reset, layout app (sidebar/header fijos), utilidades (.tap, .status)
css/sidebar.css · header.css · home.css · tendencias.css
js/include.js           Carga los componentes (sidebar y header) y avisa con "components:ready"
js/app.js               Navegación sin recarga: cambia solo el <main id="contenido">, marca el ítem activo y monta/desmonta cada página
js/carousel.js          Datos de las 3 tendencias + carrusel
js/calendar.js          Calendario comercial (navegación por mes)
js/tendencias.js        Datos, filtros, card/fila, panel de detalle, pestañas y gráfico
assets/icons            SVG con nombres descriptivos
assets/img              Imágenes de producto, blob, logo DETO
assets/fonts            Montserrat (latin 400–800), local
assets/MANIFIESTO.md    Origen de cada asset
```

## Decisiones
- **Sidebar y header `position: fixed`**; solo `.app-main` hace scroll (verificado con Playwright: posición idéntica antes y después de scrollear 380 px).
- **Carrusel**: flechas anterior/siguiente (`aria-label`), dots (activo alargado, `aria-current`), loop infinito, transición 0,38 s ease, tarjeta lateral = siguiente tendencia (1→Yogurt, 2→Matcha, 3→Snacks). Autoplay 5 s que se pausa con hover, foco, interacción con el gráfico y tras un clic (7 s); se desactiva con `prefers-reduced-motion`. Teclado: ←/→ sobre la sección. Tooltip del gráfico con puntero y teclado (←/→/Home/End).
- **Accesibilidad**: HTML semántico, áreas clickeables ≥44×44 (clase `.tap`), estados hover/focus/active, contraste AA, región `aria-live` que anuncia la diapositiva.
- Textos "Radaro" → **DETO**.
- La flecha ↗ de los badges es un SVG (Montserrat no incluye ese glifo en el subset latino).
- Las sombras rectangulares de los productos (yogurt/matcha/peek) se reproducen como en Figma (rectángulo relleno desfocado), no como `drop-shadow` del PNG.

## Excepciones / diferencias conocidas
- Dots del carrusel (8 px visibles) y días del calendario (celdas 50×26): el área clickeable queda en ~14–26 × 44 / 51×27 para no solaparse con vecinos.
- Botones y enlaces sin destino (`href="#"`, "Ver detalle", "Ver más", etc.): el alcance es solo el Home.
- Textos "En 3 / 19 / 47 días" estáticos, como en los frames.
- Logo DETO del sidebar: resolución baja (125×40 px); se puede reemplazar por una exportación 2× desde Figma.
- Desviaciones de ≤1 px por redondeo de texto Chrome vs Figma (compensadas con `translateY(1px)` en algunos textos).

## Tendencias
Rehecha desde cero tomando el **Figma Make como fuente principal** (estructura, íconos, estilos, lógica) y los frames/capturas para afinar detalle.
- **Una sola card y una sola fila** (`<template id="tpl-card">` / `tpl-row`); estados con `data-state="default|selected"` y `data-saved="true|false"`. Un solo panel de detalle compartido por la vista card y la vista fila.
- **Pestañas** Demanda / Señales / Mercado / Incorporación: `role="tablist/tab/tabpanel"`, `aria-selected`, teclado ←/→/Home/End, transición 240 ms (fundido + desplazamiento 6 px). La pestaña elegida se mantiene al cambiar de producto.
- **Selección**: clic en la card/fila (o Enter/Espacio sobre el nombre) selecciona; otro clic deselecciona; "Ver detalle" y la flecha de la fila seleccionan sin alternar. El panel entra con un deslizamiento de 260 ms.
- **Guardar**: marcador de la card, marcador del panel y botón "Guardar/Guardado" comparten estado (persiste en `localStorage`). Pestaña **Guardados** filtra; "Agregar oportunidad" solo aparece ahí.
- **Filtros** (Estado de catálogo, Categoría, Fuente, Filtros avanzados), chips de filtros activos, búsqueda del header (filtra por nombre/marca/categoría) y estados vacíos.
- **Vínculos con el Home**: ítem "Tendencias" del sidebar (estado activo por `aria-current`), "Ver detalle" de cada slide y tarjeta lateral → `tendencias.html?tendencia=<slug>` (slugs: `matcha-latte`, `oreo-halloween`, `electrolit-uva`, `takis-fuego`, `chocolate-sahne-nuss`, `yogurt-griego`). El slide "Snacks proteicos" no existe en Tendencias: abre la pantalla sin parámetro (queda seleccionado Matcha, el valor por defecto).
- Accesibilidad: auditoría axe-core (WCAG 2 A/AA) sin violaciones en cuadrícula, fila, deseleccionada, 4 pestañas y panel de filtros.

## Navegación fluida (sin recargar)
El sidebar y el header **no se recargan**: al hacer clic en un enlace interno, `js/app.js` trae la página destino, cambia solo `<main id="contenido">`, actualiza título, ítem activo e historial (atrás/adelante funcionan) y aplica una entrada suave de 240 ms. Las páginas, el CSS y el JS de las otras secciones se precargan en segundo plano. Si algo falla, cae a la navegación normal del navegador, y cada `.html` sigue funcionando solo.

**Cómo agregar una pantalla nueva** (ejemplo: `catalogo.html`):
1. Copiar la estructura de `tendencias.html`: `<body data-page="catalogo">`, sidebar/header como `data-include`, y todo el contenido dentro de `<main id="contenido">` (las `<template>` también van dentro del `<main>`).
2. Marcar el CSS propio con `data-page-css` y el JS propio con `data-page-js`. Cargar `include.js` y `app.js` antes de los scripts de página.
3. El JS de la página se escribe como `DETO.page("catalogo", function () { ...; return function destroy() { /* quitar listeners de document/window y timers */ }; });`.
4. Enlazar el ítem del sidebar (`components/sidebar.html`) a `catalogo.html`. El valor de `data-nav` debe coincidir con `data-page`.
5. Opcional: `data-preload="img1.png img2.svg"` en el `<main>` para precargar imágenes que se pintan por JS.


## Calendario (`calendario.html`)
- Archivos: `calendario.html`, `css/calendario.css`, `js/calendario.js`, íconos `assets/icons/cal-*.svg` (rutas del Make; el frame no se pudo exportar desde Figma). Reutiliza de Tendencias (cargando `css/tendencias.css`): `.ico`, `.btn-add` y el desplegable `.filter-*`.
- Vistas Año / Bimestral / Mensual, leyenda con filtros por tipo, categoría, panel de detalle con acordeón, listas completas con paginación, carrusel de productos y modal "Agregar evento" (los eventos nuevos se guardan en `localStorage`, clave `deto-eventos-calendario`).
- Parámetros de URL: `?evento=<id>` (ej. `black-friday-2026`, `singles-day-2026`, `christmas-2026`), `?dia=AAAA-MM-DD`, `?agregar=1`.
- Cambios del frame sobre el Make: imágenes pequeñas dentro de cada tarjeta de producto; Evento Rappi = naranja y Evento express = morado.
- Desde JS se navega con `DETO.navigate("calendario.html?evento=...")` (sin recargar).
- "Marcas" se eliminó del sidebar y de los estilos/íconos.

## Catálogo (`catalogo.html`)
- Archivos: `catalogo.html`, `css/catalogo.css`, `js/catalogo.js`, `data/taxonomia.js`. Reutiliza sidebar/header, `tokens.css`, `.ico` y el desplegable (`.filter-*`) de `tendencias.css` (se carga como `data-page-css`).
- Fuentes: frames 516:9766 (empty state), 519:13492 (full data), 522:3 (producto seleccionado), 519:17632 (catálogo solo) y Figma Make `CatalogPage.tsx` / `CatalogAdvancedFilters.tsx` / `data/catalog.ts`. Los frames están a 1280 px, por eso se aplican las reglas `max-width:1280px` del Make.
- Tres modos de vista en `js/catalogo.js`: `overview` (resumen + tabla), `selected` (tabla + detalle) y `expanded` (solo tabla, "Ver todo el catálogo"). La animación `cat-enter` solo se dispara al cambiar de modo; `prefers-reduced-motion` la desactiva.
- **Taxonomía compartida** (`data/taxonomia.js`): 9 macros del Make, "Despensa y productos" primero y "Otros" último. Catálogo, Tendencias (filtro "Categoría") y Calendario (filtro de categoría y categoría del formulario) leen de ahí. Cada página que la usa la carga con `<script src="data/taxonomia.js" data-page-js>`.
- Imagen del producto: pendiente. Todos los productos usan `assets/img/catalogo-producto-placeholder.svg`; para reemplazarla cambiar `PLACEHOLDER` (o `image` por producto) en `js/catalogo.js`.
- Pendientes anotados (NO implementados): "Evaluar oportunidad →" hacia Tendencias; "Fuera del catálogo" (Tendencias) → ficha en Catálogo.
- Diferencias menores: contraste AA (tendencia positiva `#0b7a2f`, negativa `#c9202e`, botón "Evaluar oportunidad" `#d04a05`, cifra del slider `#087d31`); tipografías de 6 px del Make en el gráfico del detalle pasan a 7 px; el donut se dibuja bien (en el frame sale partido por un artefacto de exportación).

## LAB (`lab.html`)
- Archivos: `lab.html`, `css/lab.css`, `js/lab.js`, `data/lab.js` (datos demostrativos del Make), `js/guardados.js` (estado compartido de guardados), ícono `assets/icons/lab-matraz.svg`. Reutiliza sidebar/header, `tokens.css`, `data/taxonomia.js` y de `tendencias.css`: `.ico`, `.scope`, el desplegable `.filter-*`, `.filter-button` y `.progress`.
- Fuentes: frames 568:36 (tiendas), 568:1175 (productos), 568:3499 (tienda → producto seleccionado), 568:1818 (producto, tienda por seleccionar), 568:2249 (producto → tienda seleccionada) y Figma Make `LabPage.tsx`. Etiqueta "Puntaje Radaro" → **"Puntaje DETO"**.
- Dos recorridos (toggle Tiendas / Productos); la selección se conserva al cambiar de pestaña.
- **Estado compartido** `DETO.guardados` (`localStorage`, clave `deto-guardados`; cae a memoria si no hay localStorage). Tendencias escribe con su slug; LAB lee/escribe. Vinculados a LAB: solo **Takis Fuego** (`takis-fuego`) y **Yogurt Griego Protein** (`yogurt-griego`). El resto de guardados de Tendencias se conserva pero LAB no los evalúa (sin datos de piloto). Arranca vacío.
- `GRID_SOURCE` (inicio de `js/lab.js`): `"all"` = grilla Productos con los 6 productos de LAB y marcador de guardado (Make); `"saved"` = solo guardados. **Pendiente de decisión** (el frame muestra los 6, todos guardados).
- "Guardar análisis" solo se guarda en memoria (como el Make) y muestra un aviso de 2,4 s.
- Imágenes: chocolate 250 g, Takis y Yogurt reales; Gomitas, Galletas y Papas usan `catalogo-producto-placeholder.svg` (el Make reutiliza imágenes de otros productos).
- Enlaces: sidebar → LAB y "Ir a Tendencias" (×2). Propuestas NO implementadas: chip "En el catálogo / Fuera del catálogo" → Catálogo; acceso a LAB desde Home/Tendencias.
- Diferencias menores: chip "Novedad" `#b23f02` (AA); "activas" `#057a39` (AA); íconos reconstruidos desde `Icon.tsx` (las URLs de assets de Figma dan 403); categorías de tienda "Vinos y espumantes" y "Bebidas sin alcohol" del Make no existen en la taxonomía (no coinciden con el filtro Categoría); texto de "Selecciona un producto" en el detalle de tienda no está en los frames (derivado del texto de "Selecciona una tienda").
- Accesibilidad: axe-core (WCAG 2 A/AA) 0 violaciones en los 7 estados.
