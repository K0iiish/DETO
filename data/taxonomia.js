/* Taxonomía compartida (macrocategoría → categoría → subcategoría), generada desde BBDD Ventas por build_data.py.
   Orden: macros por unidades vendidas ("Otros" al final). Catálogo, Tendencias, LAB y Calendario leen de aquí. */
(function () {
  "use strict";
  var DETO = (window.DETO = window.DETO || {});
  if (DETO.taxonomia) return;
  var MACROS = [
 {
  "id": "despensa-y-productos-secos",
  "label": "Despensa y productos secos",
  "icon": "catalogo",
  "categories": [
   {
    "label": "Snacks y confitería",
    "subcategories": [
     "Galletas",
     "Chocolates",
     "Snacks salados",
     "Gomitas y caramelos",
     "Alfajores",
     "Pochoclos",
     "Frutos secos y semillas",
     "Barras de cereal y granola",
     "Dulces tipicos",
     "Otros Snacks y confitería",
     "Dips"
    ]
   },
   {
    "label": "Panadería y pastelería",
    "subcategories": [
     "Panaderia salada",
     "Panaderia dulce",
     "Tortillas, tostadas y totopos",
     "Pastelitos",
     "Tortas y ponques"
    ]
   },
   {
    "label": "Condimentos y salsas",
    "subcategories": [
     "Salsa de tomate",
     "Mayonesa",
     "Especies",
     "Otras salsas",
     "Salsa de soja",
     "Mostaza",
     "Sal",
     "Pimienta"
    ]
   },
   {
    "label": "Conservas",
    "subcategories": [
     "Vegetales enlatadas",
     "Pescado enlatado",
     "Frutas enlatadas",
     "Otras conservas"
    ]
   },
   {
    "label": "Café, infusiones y modificadores de leche",
    "subcategories": [
     "Café",
     "Tés",
     "Mates",
     "Modificadores de leche",
     "Infusiones"
    ]
   },
   {
    "label": "Cereales, avenas y granola",
    "subcategories": [
     "Cereales",
     "Granolas",
     "Avenas"
    ]
   },
   {
    "label": "Arroz, granos y pastas",
    "subcategories": [
     "Pastas",
     "Arroz",
     "Granos",
     "Otros Arroz, granos y pastas"
    ]
   },
   {
    "label": "Mermeladas y pastas para untar",
    "subcategories": [
     "Dulce de leche",
     "Mermeladas",
     "Otros Mermeladas y pastas para untar",
     "Miel",
     "Pasta dulce para untar"
    ]
   },
   {
    "label": "Caldos y sopas",
    "subcategories": [
     "Sopas y cremas",
     "Caldos"
    ]
   },
   {
    "label": "Aceites y vinagres",
    "subcategories": [
     "Aceite",
     "Vinagre"
    ]
   },
   {
    "label": "Azúcar y endulzantes",
    "subcategories": [
     "Azucar",
     "Endulzante",
     "Otros Azúcar y endulzantes"
    ]
   },
   {
    "label": "Harina y mezclas para preparar",
    "subcategories": [
     "Harina",
     "Mezclas dulces",
     "Otras harinas y mezclas"
    ]
   },
   {
    "label": "Repostería",
    "subcategories": [
     "Esencias y colorantes",
     "Polvos de hornear",
     "Salsas y coberturas",
     "Gelatina",
     "Otros repostería",
     "Decoración comestible",
     "Postres en polvo"
    ]
   }
  ]
 },
 {
  "id": "comida-fresca",
  "label": "Comida fresca",
  "icon": "canasta",
  "categories": [
   {
    "label": "Frutas y verduras",
    "subcategories": [
     "Verduras",
     "Frutas",
     "Papas, yucas y tuberculos",
     "Hierbas y aromáticas",
     "Pulpa de Fruta",
     "Brotes"
    ]
   },
   {
    "label": "Yogurt y bebidas lácteas",
    "subcategories": [
     "Yogurt",
     "Postres refrigerados",
     "Bebidas lácteas",
     "Otros Yogurt y bebidas lácteas"
    ]
   },
   {
    "label": "Leche",
    "subcategories": [
     "Leche natural",
     "Leche saborizada",
     "Otros leches",
     "Leche vegetal",
     "Leche en polvo"
    ]
   },
   {
    "label": "Quesos",
    "subcategories": [
     "Quesos maduros",
     "Quesos frescos",
     "Quesos semiduros",
     "Quesos esparcibles",
     "Otros quesos"
    ]
   },
   {
    "label": "Charcutería",
    "subcategories": [
     "Jamones",
     "Embutidos",
     "Salames",
     "Patés",
     "Carnes maduras y ahumadas",
     "Otros Charcutería"
    ]
   },
   {
    "label": "Carnes",
    "subcategories": [
     "Pollo y aves",
     "Res",
     "Otras carnes",
     "Cerdo",
     "Carnes vegetarianas"
    ]
   },
   {
    "label": "Huevos",
    "subcategories": [
     "Huevos"
    ]
   },
   {
    "label": "Crema y derivados",
    "subcategories": [
     "Crema",
     "Leche condensada",
     "Chantilly",
     "Otras cremas"
    ]
   },
   {
    "label": "Mantequillas y margarinas",
    "subcategories": [
     "Mantequilla",
     "Margarina"
    ]
   },
   {
    "label": "Pescados y Mariscos",
    "subcategories": [
     "Pescados",
     "Mariscos"
    ]
   },
   {
    "label": "Pastas frescas y masas",
    "subcategories": [
     "Pastas frescas"
    ]
   }
  ]
 },
 {
  "id": "bebidas",
  "label": "Bebidas",
  "icon": "botella",
  "categories": [
   {
    "label": "Gaseosas",
    "subcategories": [
     "Gaseosas"
    ]
   },
   {
    "label": "Aguas",
    "subcategories": [
     "Agua Natural Gasificada",
     "Agua Natural",
     "Agua saborizada",
     "Otras aguas"
    ]
   },
   {
    "label": "Energéticas e isotónicas",
    "subcategories": [
     "Energizantes",
     "Isotónicos"
    ]
   },
   {
    "label": "Jugos y néctares",
    "subcategories": [
     "Néctares",
     "Jugos",
     "Otros Jugos y néctares"
    ]
   },
   {
    "label": "Cervezas y sidras",
    "subcategories": [
     "Cervezas"
    ]
   },
   {
    "label": "Vinos",
    "subcategories": [
     "Espumantes",
     "Vino tinto",
     "Vino blanco",
     "Vino rosado",
     "Otros vinos"
    ]
   },
   {
    "label": "Refrescos en polvo y jarabe",
    "subcategories": [
     "Refrescos en polvo"
    ]
   },
   {
    "label": "Licores y aperitivos",
    "subcategories": [
     "Pisco",
     "Whiskys",
     "Aperitivos",
     "Ginebras",
     "Vodkas",
     "Bases para cócteles",
     "Rones",
     "Tequilas",
     "Aguardientes",
     "Cremas de licor"
    ]
   },
   {
    "label": "Cafés y tés listos para beber",
    "subcategories": [
     "Té listo",
     "Café listo"
    ]
   },
   {
    "label": "Ready to Drink",
    "subcategories": [
     "Cocteles"
    ]
   }
  ]
 },
 {
  "id": "cigarrillos",
  "label": "Cigarrillos",
  "icon": "cigarrillo",
  "categories": [
   {
    "label": "Cigarrillos",
    "subcategories": [
     "Cigarrillos"
    ]
   },
   {
    "label": "Vaporizadores y dispositivos",
    "subcategories": [
     "Vaporizadores y dispositivos"
    ]
   },
   {
    "label": "Accesorios de cigarrillos",
    "subcategories": [
     "Papel",
     "Filtros"
    ]
   }
  ]
 },
 {
  "id": "comida-preparada",
  "label": "Comida preparada",
  "icon": "panaderia",
  "categories": [
   {
    "label": "Helados y postres",
    "subcategories": [
     "Helados",
     "Otros Helados y postres",
     "Postres"
    ]
   },
   {
    "label": "Hielo",
    "subcategories": [
     "Hielo"
    ]
   },
   {
    "label": "Panadería fresca",
    "subcategories": [
     "Pan salado fresco"
    ]
   },
   {
    "label": "Sandwiches y empanadas",
    "subcategories": [
     "Hamburguesas",
     "Sandwiches y empanadas"
    ]
   },
   {
    "label": "Complementos",
    "subcategories": [
     "Complementos"
    ]
   },
   {
    "label": "Platos listos",
    "subcategories": [
     "Listos para cocinar",
     "Listos para comer",
     "Platos listos"
    ]
   },
   {
    "label": "Pizas y tartas saladas",
    "subcategories": [
     "Pizas y tartas saladas"
    ]
   },
   {
    "label": "Bebidas listas",
    "subcategories": [
     "Jugos naturales"
    ]
   }
  ]
 },
 {
  "id": "cuidado-y-limpieza-del-hogar",
  "label": "Cuidado y limpieza del hogar",
  "icon": "gota",
  "categories": [
   {
    "label": "Limpieza",
    "subcategories": [
     "Limpiadores multiusos",
     "Ustensilios de aseo",
     "Otros limpiadores",
     "Detergente Vajillas",
     "Paños multiusos",
     "Cloro",
     "Limpiador de vidrios",
     "Ceras y retauradores"
    ]
   },
   {
    "label": "Desechables",
    "subcategories": [
     "Bolsas para basura",
     "Vajilla desechable",
     "Papel aluminio",
     "Papel film",
     "Bolsas para hornear",
     "Otros desechables"
    ]
   },
   {
    "label": "Articulos de papel",
    "subcategories": [
     "Papel higiénico",
     "Toallas de cocina",
     "Servilletas",
     "Pañuelos desechables"
    ]
   },
   {
    "label": "Cuidado de la ropa",
    "subcategories": [
     "Detergentes",
     "Quitamancha",
     "Suavizantes"
    ]
   },
   {
    "label": "Ambientadores y velas",
    "subcategories": [
     "Ambientadores",
     "Desinfectantes de ambiente",
     "Difusores de aroma",
     "Velas"
    ]
   },
   {
    "label": "Control de plagas",
    "subcategories": [
     "Insecticidas"
    ]
   }
  ]
 },
 {
  "id": "cuidado-del-bebe",
  "label": "Cuidado del bebé",
  "icon": "caja",
  "categories": [
   {
    "label": "Fórmulas y alimentos",
    "subcategories": [
     "Alimentos infantiles",
     "Formulas infantiles"
    ]
   },
   {
    "label": "Pañales y toallitas",
    "subcategories": [
     "Toallitas humedas",
     "Otros Pañales y toallitas",
     "Pañales"
    ]
   },
   {
    "label": "Higiene y cuidado",
    "subcategories": [
     "Shampoo y jabón",
     "Crema, loción y gel",
     "Pomadas y ungüentos",
     "Talco y Aceite"
    ]
   }
  ]
 },
 {
  "id": "mascotas",
  "label": "Mascotas",
  "icon": "huella",
  "categories": [
   {
    "label": "Alimento para mascotas",
    "subcategories": [
     "Alimento para perros",
     "Alimento para gatos",
     "Snacks para Mascotas"
    ]
   },
   {
    "label": "Aseo para mascotas",
    "subcategories": [
     "Arena para gatos",
     "Bolsas plásticas para Mascotas"
    ]
   }
  ]
 },
 {
  "id": "cuidado-personal",
  "label": "Cuidado personal",
  "icon": "caja",
  "categories": [
   {
    "label": "Protección femenina",
    "subcategories": [
     "Toallas higiénicas",
     "Tampones"
    ]
   },
   {
    "label": "Cuidado del cabello",
    "subcategories": [
     "Shampoo",
     "Acondicionador",
     "Reparación y tratamiento",
     "Modelado y peinado",
     "Coloración"
    ]
   },
   {
    "label": "Cuidado corporal",
    "subcategories": [
     "Jabones y exfoliantes corporales",
     "Bronceadores",
     "Humectantes corporales"
    ]
   },
   {
    "label": "Cuidado oral",
    "subcategories": [
     "Crema dental",
     "Cepillos dentales",
     "Enjuague bucal"
    ]
   },
   {
    "label": "Desodorantes",
    "subcategories": [
     "Desodorantes"
    ]
   },
   {
    "label": "Depilación y afeitado",
    "subcategories": [
     "Preparación y afeitado",
     "Cremas, ceras y bandas"
    ]
   },
   {
    "label": "Cuidado facial",
    "subcategories": [
     "Agua micelar y bifásicos",
     "Otros cuidados faciales",
     "Humectantes faciales",
     "Limpiadores faciales"
    ]
   },
   {
    "label": "Electro belleza",
    "subcategories": [
     "Afeitadoras"
    ]
   },
   {
    "label": "Cuidado de los pies",
    "subcategories": [
     "Desodorantes y talcos"
    ]
   },
   {
    "label": "Accesorios de belleza",
    "subcategories": [
     "Peines y cepillos para el cabello",
     "Pinzas, brochas y perfiladores",
     "Coleros, hebillas y diademas"
    ]
   }
  ]
 },
 {
  "id": "farmacia",
  "label": "Farmacia",
  "icon": "caja",
  "categories": [
   {
    "label": "Salud digestiva",
    "subcategories": [
     "Suero",
     "Probióticos"
    ]
   },
   {
    "label": "Salud sexual",
    "subcategories": [
     "Preservativos",
     "Prueba de embarazo",
     "Lubricantes",
     "Anticonceptivos",
     "Accesorios sexuales"
    ]
   },
   {
    "label": "Salud nutricional",
    "subcategories": [
     "Suplementos alimenticios",
     "Vitaminas y multivitamínicos"
    ]
   },
   {
    "label": "Botiquín y primeros auxilios",
    "subcategories": [
     "Parches y Telas Adhesivas",
     "Algodón y Pads"
    ]
   },
   {
    "label": "Mundo COVID",
    "subcategories": [
     "Tapabocas y Accesorios"
    ]
   },
   {
    "label": "Equipo y material médico",
    "subcategories": [
     "Termómetros"
    ]
   },
   {
    "label": "Cuidado dermatológico",
    "subcategories": [
     "Tratamiento de cicatrices y heridas"
    ]
   }
  ]
 },
 {
  "id": "fiestas-y-pinatas",
  "label": "Fiestas y piñatas",
  "icon": "caja",
  "categories": [
   {
    "label": "Decoración para fiestas",
    "subcategories": [
     "Otros Decoración para fiestas",
     "Bombas y Globos",
     "Halloween",
     "Navidad"
    ]
   },
   {
    "label": "Empaques y Tarjetas",
    "subcategories": [
     "Empaques"
    ]
   },
   {
    "label": "Disfraces",
    "subcategories": [
     "Disfraces"
    ]
   }
  ]
 },
 {
  "id": "tecnologia",
  "label": "Tecnología",
  "icon": "rayo",
  "categories": [
   {
    "label": "Cargadores, Cables y Pilas",
    "subcategories": [
     "Pilas",
     "Cables",
     "Cargadores y Cables de Celular"
    ]
   },
   {
    "label": "Accesorios de Tecnología",
    "subcategories": [
     "Adaptadores y Convertidores"
    ]
   },
   {
    "label": "Soportes y Tripodes",
    "subcategories": [
     "Soportes Celular y Tablet"
    ]
   },
   {
    "label": "Computadores",
    "subcategories": [
     "Otros Computadores"
    ]
   }
  ]
 },
 {
  "id": "ferreteria-y-jardin",
  "label": "Ferretería y jardín",
  "icon": "caja",
  "categories": [
   {
    "label": "Aire Libre",
    "subcategories": [
     "Carbón, Leña y chispa"
    ]
   },
   {
    "label": "Ferretería",
    "subcategories": [
     "Herramientas",
     "Extensiones y adaptadores",
     "Otros ferretería"
    ]
   },
   {
    "label": "Iluminación y eléctricos",
    "subcategories": [
     "Focos",
     "Linternas y reflectores"
    ]
   }
  ]
 },
 {
  "id": "papeleria-y-oficina",
  "label": "Papelería y oficina",
  "icon": "caja",
  "categories": [
   {
    "label": "Útiles escolares",
    "subcategories": [
     "Lápices y portaminas",
     "Pegantes y Cintas",
     "Marcadores y resaltadores",
     "Otros Útiles escolares",
     "Implementos de corte",
     "Bolígrafos, plumas y micropuntas",
     "Colores y Crayolas"
    ]
   },
   {
    "label": "Suministros de oficina",
    "subcategories": [
     "Accesorios De Escritorio",
     "Artículos De Archivo-Oficina"
    ]
   },
   {
    "label": "Papelería",
    "subcategories": [
     "Papeles",
     "Cartulinas"
    ]
   },
   {
    "label": "Cuadernos y Apuntes",
    "subcategories": [
     "Cuadernos"
    ]
   }
  ]
 },
 {
  "id": "moda",
  "label": "Moda",
  "icon": "caja",
  "categories": [
   {
    "label": "Ropa interior",
    "subcategories": [
     "Medias y calcetines"
    ]
   },
   {
    "label": "Calzados",
    "subcategories": [
     "Tacones"
    ]
   }
  ]
 },
 {
  "id": "jugueteria",
  "label": "Juguetería",
  "icon": "caja",
  "categories": [
   {
    "label": "Vehículos",
    "subcategories": [
     "Pistas"
    ]
   },
   {
    "label": "Juegos de Mesa",
    "subcategories": [
     "Otros Juegos de mesa",
     "Juegos de familia"
    ]
   },
   {
    "label": "Muñecas, Muñecos y Peluches",
    "subcategories": [
     "Otros Muñecas, Muñecos y Peluches"
    ]
   },
   {
    "label": "Juguetes para Bebé",
    "subcategories": [
     "Juguetes didácticos",
     "Otros Juguetes para Bebé"
    ]
   },
   {
    "label": "Juegos al aire libre",
    "subcategories": [
     "Otros Juegos al Aire Libre",
     "Arcos y Flechas",
     "Juegos de Piscina y Playa",
     "Pistolas de Juguete y lanzadores"
    ]
   }
  ]
 },
 {
  "id": "decoracion-y-hogar",
  "label": "Decoración y hogar",
  "icon": "caja",
  "categories": [
   {
    "label": "Cocina",
    "subcategories": [
     "Utensilios de Cocina",
     "Utensilios de repostería",
     "Otros Cocina"
    ]
   },
   {
    "label": "Organizadores",
    "subcategories": [
     "Bolsas al vacío y Selladores"
    ]
   }
  ]
 },
 {
  "id": "sex-shop",
  "label": "Sex Shop",
  "icon": "caja",
  "categories": [
   {
    "label": "Juguetes Sexuales",
    "subcategories": [
     "Vibradores",
     "Dildos",
     "Plugs Anales",
     "Juguetes Masculinos"
    ]
   },
   {
    "label": "Estimulantes sexuales",
    "subcategories": [
     "Femeninos",
     "Estimulantes Masculinos",
     "Otros Estimulantes sexuales"
    ]
   }
  ]
 },
 {
  "id": "maquillaje",
  "label": "Maquillaje",
  "icon": "caja",
  "categories": [
   {
    "label": "Maquillaje Para Labios",
    "subcategories": [
     "Protectores labiales-balsamos",
     "Labial"
    ]
   }
  ]
 },
 {
  "id": "deportes-y-fitness",
  "label": "Deportes y fitness",
  "icon": "caja",
  "categories": [
   {
    "label": "Otros Deportes",
    "subcategories": [
     "Otros Otros Deportes"
    ]
   },
   {
    "label": "Camping Y Outdoor",
    "subcategories": [
     "Accesorios Camping"
    ]
   },
   {
    "label": "Natación y Náuticos",
    "subcategories": [
     "Herramientas de natación"
    ]
   }
  ]
 },
 {
  "id": "auto-partes",
  "label": "Auto partes",
  "icon": "caja",
  "categories": [
   {
    "label": "Productos de limpieza",
    "subcategories": [
     "Ambientadores",
     "Otros Cuidados Para Automovil"
    ]
   },
   {
    "label": "Accesorios para vehículos",
    "subcategories": [
     "Otros Accesorios para vehículos"
    ]
   }
  ]
 },
 {
  "id": "otros",
  "label": "Otros",
  "icon": "caja",
  "categories": [
   {
    "label": "Otros",
    "subcategories": [
     "Otros"
    ]
   }
  ]
 }
];
  DETO.taxonomia = {
    macros: MACROS,
    macroNames: function () { return MACROS.map(function (m) { return m.label; }); },
    macro: function (id) { return MACROS.filter(function (m) { return m.id === id; })[0] || null; },
    byLabel: function (label) { return MACROS.filter(function (m) { return m.label === label; })[0] || null; }
  };
})();
