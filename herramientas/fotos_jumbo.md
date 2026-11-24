# Fotos de Jumbo (data/fotos-jumbo.js)

Las fotos se obtuvieron el 12 nov 2026 desde jumbo.cl con un script en el navegador (pestaña abierta en www.jumbo.cl):

1. **Tendencias de Jumbo**: se abre el link del producto y se toma su `og:image`.
2. **Tendencias de Líder y productos del catálogo Turbo**: se busca el nombre en `jumbo.cl/busca?ft=…` y se toma el primer resultado
   que es el **mismo producto** según la regla de identidad de `build_data.py` (`same_product`: tokens del nombre + tamaño,
   «sin azúcar» = «zero», palabras discriminantes como light/zero/sin lactosa). Si no hay coincidencia, no se asigna foto.
3. Se guarda solo el id de imagen VTEX (`…/arquivos/ids/<id>-250-250/p.jpg`), por slug de tendencia y por EAN.

Lo que no se encontró en Jumbo (cigarrillos, pan a granel, productos que Jumbo no vende o ya retiró, como los de Halloween)
cae al buscador por código de barras de `js/imagenes.js` (Open Food Facts) y, si tampoco está, al placeholder.

Las fotos se cargan desde el CDN de Jumbo; son de uso referencial para el prototipo.
