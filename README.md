# DETO · Rappi Turbo

Sitio estático (HTML, CSS y JS, sin servidor) del MVP de DETO, la plataforma para detectar e incorporar productos en tendencia al surtido de Rappi Turbo.

- **Pantallas:** Inicio, Tendencias, LAB, Calendario y Catálogo.
- **Publicación:** Cloudflare Pages conectado a este repositorio. Cada cambio en la rama `main` se publica solo.
- **Probar en local:** `python3 -m http.server 8765` y abrir http://localhost:8765. Se necesita un servidor, porque el sidebar y el header se cargan con `fetch`.

El detalle de los datos, el modelo de puntaje y los límites conocidos está en [LEEME.md](LEEME.md).

> Repositorio privado: `data/` contiene agregados de ventas de Rappi Turbo. No lo hagan público sin autorización.
