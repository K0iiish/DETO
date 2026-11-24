"""
DETO · Construye los datos reales del MVP.

Entradas
  - Información UDD (Excel, interna): BBDD Ventas, Productos, Lista de compras, Tiendas.
  - capturas.csv y capturas_promos.csv (externa): scraping de Líder y Jumbo.

Salidas (solo agregados; no se publican ID de orden ni filas individuales)
  - data/deto-real.js       resumen, tiendas, candidatos (Tendencias), eventos, competencia Halloween
  - data/deto-catalogo.js   catálogo Turbo por producto (ventas, precio, margen, tendencia)
  - data/taxonomia.js       taxonomía real macro → categoría → subcategoría

Uso:  python3 build_data.py <excel> <capturas.csv> <capturas_promos.csv> <carpeta_sitio>
"""
import json
import math
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel

EXCEL, CAPTURAS, PROMOS, SITE = sys.argv[1:5]
PKL = len(sys.argv) > 5 and sys.argv[5] == "--pkl"  # usa los .pkl ya extraídos (más rápido)

# ------------------------------------------------------------------ utilidades
def norm(s):
    s = unicodedata.normalize("NFKD", str(s).lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def fix_mojibake(s):
    if isinstance(s, str) and "Ã" in s:
        try:
            return s.encode("latin1").decode("utf8")
        except Exception:
            return s
    return s


def slug(s):
    return re.sub(r"-+", "-", norm(s).replace(" ", "-")).strip("-")[:70]


def pct(values, q):
    return float(np.percentile(values, q)) if len(values) else 0.0


def scale(x, p10, p90):
    if x is None or p90 == p10:
        return None
    return max(0.0, min(100.0, 100.0 * (x - p10) / (p90 - p10)))


def clean_name(s):
    s = re.sub(r"\s+", " ", str(s)).strip()
    return s.replace(" .,", ",").replace("., ", ", ")


def wavg(vals, ws):
    sw = sum(ws)
    return sum(v * w for v, w in zip(vals, ws)) / sw if sw else None


def wpct(vals, ws, q):
    if not vals:
        return None
    if len(vals) < 4:
        return min(vals) if q < 50 else max(vals)
    order = np.argsort(vals)
    v = np.array(vals)[order]
    w = np.array(ws)[order]
    c = np.cumsum(w) / w.sum()
    return float(v[np.searchsorted(c, q / 100.0)])


def ean13_from_lider(link):
    m = re.search(r"/ip/[^/]+/(\d{8,14})", str(link))
    if not m:
        return None
    body = m.group(1).lstrip("0")
    if len(body) > 12 or len(body) < 7:
        return None
    b = body.zfill(12)
    s = sum(int(x) * (3 if i % 2 else 1) for i, x in enumerate(b))
    return body + str((10 - s % 10) % 10)


STOP = set("de del la el los las con y en para por al un una x pack botella bolsa caja frasco tarro lata doypack sabor unidad unidades und ud un u granel malla paquete film films envase bandeja pote sachet display mini feria".split())
UNIT = {"kg": ("g", 1000), "g": ("g", 1), "gr": ("g", 1), "grs": ("g", 1), "gramos": ("g", 1), "ml": ("ml", 1), "cc": ("ml", 1),
        "l": ("ml", 1000), "lt": ("ml", 1000), "lts": ("ml", 1000), "litro": ("ml", 1000), "litros": ("ml", 1000),
        "un": ("un", 1), "und": ("un", 1), "ud": ("un", 1), "u": ("un", 1), "unidades": ("un", 1), "m": ("m", 1), "mts": ("m", 1)}
SIZE_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(kg|grs|gramos|gr|g|ml|cc|litros|litro|lts|lt|l|unidades|und|ud|un|u|mts|m)\b")


def low(s):
    s = unicodedata.normalize("NFKD", str(s).lower())
    return "".join(c for c in s if not unicodedata.combining(c))


DISC = set("light zero sin diet lactosa protein proteina integral descremado descremada semidescremada organico vegano vegana picante original sugar free".split())


MULTI_RE = re.compile(r"(\d+)\s*(?:un|und|unidades|u)\.?\s*(?:de|x)\s*(\d+(?:[.,]\d+)?)\s*(g|gr|grs|ml|cc)\b")


def sizes(name):
    out = set()
    for n, num, u in MULTI_RE.findall(low(name)):  # "4 un de 35 g" = 140 g
        kind, f = UNIT[u]
        out.add((kind, round(int(n) * float(num.replace(",", ".")) * f, 1)))
    for num, u in SIZE_RE.findall(low(name)):
        kind, f = UNIT[u]
        out.add((kind, round(float(num.replace(",", ".")) * f, 1)))
    return out


def sing(w):
    if len(w) > 5 and w.endswith("es") and w[-3] not in "aeiou":
        return w[:-2]
    if len(w) > 4 and w.endswith("s"):
        return w[:-1]
    return w


def tokens(name, ordered=False):
    t = SIZE_RE.sub(" ", low(name)).replace("sin azucar", "zero").replace("sin azúcar", "zero")
    t = re.sub(r"[^a-z0-9 ]+", " ", t)
    words = [sing(w) for w in t.split() if w not in STOP and not w.isdigit() and len(w) > 1]
    return words if ordered else set(words)


def same_product(a, b):
    sa, sb = sizes(a), sizes(b)
    meas_a = {x for x in sa if x[0] != "un"}
    meas_b = {x for x in sb if x[0] != "un"}
    if meas_a and meas_b and not any(x[0] == y[0] and abs(x[1] - y[1]) <= 0.03 * max(x[1], y[1]) for x in meas_a for y in meas_b):
        return False
    ta, tb = tokens(a), tokens(b)
    if len(ta) < 1 or len(tb) < 1:
        return False
    if (ta ^ tb) & DISC:
        return False
    small, big = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    if small <= big and (len(small) >= 2 or (len(small) == 1 and len(big) <= 2)):
        return True
    first = tokens(b if len(ta) <= len(tb) else a, ordered=True)
    if len(small) == 1 and small <= big and first and first[0] in small:
        return True
    jac = len(ta & tb) / len(ta | tb)
    same_size = bool(meas_a and meas_b)
    return jac >= 0.75 or (same_size and jac >= 0.5)


# ------------------------------------------------------------------ datos internos
if PKL:
    ventas = pd.read_pickle("ventas.pkl")
    productos = pd.read_pickle("productos.pkl")
    lista = pd.read_pickle("lista.pkl")
else:
    sh = pd.read_excel(EXCEL, sheet_name=["BBDD Ventas", "Productos", "Lista de compras"])
    ventas, productos, lista = sh["BBDD Ventas"], sh["Productos"], sh["Lista de compras"]
    for df in (ventas, productos, lista):
        df.drop(columns=[c for c in df.columns if str(c).startswith("Unnamed")], inplace=True)

raw_rows = len(ventas)
v = ventas.rename(columns={
    "DÍA": "dia", "Nombre Comercial Proveedor": "marca", "Macrocategoría": "macro", "Categoría": "cat",
    "Subcategoría": "sub", "Nombre": "nombre", "Tienda": "tienda", "EAN": "ean", "ID de Orden": "orden",
    "Venta en CLP": "venta", "Costos en CLP": "costo", "Unidad": "u"})
v = v.dropna(subset=["dia", "tienda", "ean"])
v = v[v["u"] > 0].copy()
v["ean"] = v["ean"].astype("int64").astype(str)
for c in ("macro", "cat", "sub"):
    v[c] = v[c].fillna("Otros")
v["tienda"] = v["tienda"].map(fix_mojibake)
d0, d1 = v["dia"].min().normalize(), v["dia"].max().normalize()
n_days = (d1 - d0).days + 1
v["d"] = (v["dia"].dt.normalize() - d0).dt.days
v["w"] = np.where(v["d"] < 7, 1, 2)
clean_rows = len(v)

productos["ean"] = pd.to_numeric(productos["EAN"], errors="coerce").astype("Int64").astype(str)
list_price = productos.drop_duplicates("ean").set_index("ean")["Precio"].to_dict()
lista["Tienda"] = lista["Tienda"].map(fix_mojibake)
lista["ean"] = pd.to_numeric(lista["EAN"], errors="coerce").astype("Int64").astype(str)
assort_by_store = lista.groupby("Tienda")["ean"].nunique().to_dict()
catalog_eans = set(v["ean"]) | set(productos["ean"]) | set(lista["ean"])

STORES = sorted(v["tienda"].unique())
WEEKS = 2

# ---------- por producto
g = v.groupby("ean")
prod = pd.DataFrame({
    "nombre": g["nombre"].agg(lambda s: s.mode().iat[0]),
    "marca": g["marca"].agg(lambda s: s.mode().iat[0] if s.notna().any() else ""),
    "macro": g["macro"].agg(lambda s: s.mode().iat[0]),
    "cat": g["cat"].agg(lambda s: s.mode().iat[0]),
    "sub": g["sub"].agg(lambda s: s.mode().iat[0]),
    "u": g["u"].sum(), "venta": g["venta"].sum(), "costo": g["costo"].sum(),
    "ordenes": g["orden"].nunique(), "tiendas": g["tienda"].nunique(),
})
wk = v.pivot_table(index="ean", columns="w", values="u", aggfunc="sum", fill_value=0)
prod["u1"] = wk.get(1, 0)
prod["u2"] = wk.get(2, 0)
daily = v.pivot_table(index="ean", columns="d", values="u", aggfunc="sum", fill_value=0).reindex(columns=range(n_days), fill_value=0)
prod["u_sem"] = prod["u"] / WEEKS
prod["margen"] = np.where(prod["venta"] > 0, 100 * (prod["venta"] - prod["costo"]) / prod["venta"], np.nan)
prod["precio"] = [list_price.get(e) if pd.notna(list_price.get(e)) else None for e in prod.index]
prod["precio_real"] = 1.19 * prod["venta"] / prod["u"]  # venta viene neta de IVA
prod["tend"] = np.where(prod["u1"] >= 3, 100 * (prod["u2"] - prod["u1"]) / prod["u1"].clip(lower=1), np.nan)

# ---------- por subcategoría (red completa)
sub_w = v.pivot_table(index=["macro", "cat", "sub"], columns="w", values="u", aggfunc="sum", fill_value=0)
sub_w.columns = ["u1", "u2"]
sub_w["g"] = (sub_w["u2"] - sub_w["u1"]) / sub_w["u1"].clip(lower=1)
sub_ok = sub_w[sub_w["u1"] >= 20]
G_P10, G_P90 = pct(sub_ok["g"], 10), pct(sub_ok["g"], 90)

# ---------- taxonomía real
tax = defaultdict(lambda: defaultdict(Counter))
for (m, c, s), row in sub_w.iterrows():
    tax[m][c][s] += row["u1"] + row["u2"]
MACRO_ICON = {"Despensa y productos secos": "catalogo", "Bebidas": "botella", "Cigarrillos": "cigarrillo", "Comida fresca": "canasta",
              "Comida preparada": "panaderia", "Cuidado y limpieza del hogar": "gota", "Mascotas": "huella", "Tecnología": "rayo", "Otros": "caja"}
macro_units = {m: sum(sum(cs.values()) for cs in cats.values()) for m, cats in tax.items()}
macro_order = sorted(tax, key=lambda m: (m == "Otros", -macro_units[m]))
TAXONOMY = []
for m in macro_order:
    cats = sorted(tax[m], key=lambda c: -sum(tax[m][c].values()))
    TAXONOMY.append({"id": slug(m), "label": m, "icon": MACRO_ICON.get(m, "caja"),
                     "categories": [{"label": c, "subcategories": [s for s, _ in tax[m][c].most_common()]} for c in cats]})
macro_id = {t["label"]: t["id"] for t in TAXONOMY}

# ---------- por tienda
stores_out = []
net_sub_share = v.groupby("sub")["u"].sum() / v["u"].sum()
for t in STORES:
    vt = v[v["tienda"] == t]
    sub_t = vt.groupby(["cat", "sub"]).agg(u=("u", "sum"), skus=("ean", "nunique"))
    sub_t_w = vt.pivot_table(index="sub", columns="w", values="u", aggfunc="sum", fill_value=0)
    cat_t = vt.groupby("cat").agg(u=("u", "sum"), skus=("ean", "nunique"))
    cat_t["rot"] = cat_t["u"] / cat_t["skus"] / WEEKS
    top_cats = cat_t[cat_t["skus"] >= 3].sort_values("rot", ascending=False).head(3)
    growth = []
    for s, r in sub_t_w.iterrows():
        u1, u2 = r.get(1, 0), r.get(2, 0)
        if u1 >= 15:
            growth.append((s, 100 * (u2 - u1) / u1))
    growth.sort(key=lambda x: -x[1])
    pt = vt.pivot_table(index="ean", columns="w", values="u", aggfunc="sum", fill_value=0)
    pt = pt[(pt.get(1, 0) >= 10)]
    best = None
    if len(pt):
        gr = (pt.get(2, 0) - pt.get(1, 0)) / pt.get(1, 0)
        e = gr.idxmax()
        best = {"name": clean_name(prod.at[e, "nombre"]), "growth": round(100 * gr.max())}
    share = vt.groupby("sub")["u"].sum() / vt["u"].sum()
    stores_out.append({
        "id": slug(t.replace("Turbo,", "")), "name": t,
        "orders": int(vt["orden"].nunique()), "weeklyUnits": int(round(vt["u"].sum() / WEEKS)),
        "skus": int(vt["ean"].nunique()), "assortment": int(assort_by_store.get(t, 0)),
        "categories": [{"name": c, "rotation": round(float(r["rot"]), 1)} for c, r in top_cats.iterrows()],
        "signals": [f"{s} · {'+' if gv >= 0 else ''}{gv:.0f}%" for s, gv in growth[:3]],
        "highlight": (f"{best['name']} crece {'+' if best['growth'] >= 0 else ''}{best['growth']}% (semana 2 vs semana 1)." if best else ""),
        "subShare": {s: round(float(share.get(s, 0) / net_sub_share[s]), 3) for s in net_sub_share.index if share.get(s, 0) > 0},
        "subGrowth": {s: round(gv, 1) for s, gv in growth},
        "subRotation": {s: round(float(r["u"] / r["skus"] / WEEKS), 2) for (c, s), r in sub_t.iterrows()},
    })

# ------------------------------------------------------------------ datos externos
cap = pd.read_csv(CAPTURAS, sep=";", encoding="utf-8-sig", dtype=str)
pro = pd.read_csv(PROMOS, sep=";", encoding="utf-8-sig", dtype=str)
ext = pd.concat([cap, pro[[c for c in cap.columns if c in pro.columns] + ["evento"]]], ignore_index=True)
ext["evento"] = ext["evento"].fillna("")
if "imagen" not in ext.columns:  # columna opcional: URL de la foto del producto (si el scraper la trae)
    ext["imagen"] = ""
ext["imagen"] = ext["imagen"].fillna("")
ext["retailer"] = np.where(ext["url"].str.contains("lider", na=False), "Líder", np.where(ext["url"].str.contains("jumbo", na=False), "Jumbo", "Otro"))
ext["key"] = ext["link"].str.replace(r"\?.*$", "", regex=True)
ext["precio"] = pd.to_numeric(ext["precio"], errors="coerce")
ext["posicion"] = pd.to_numeric(ext["posicion"], errors="coerce")
ext["nombre"] = ext["nombre"].map(clean_name)
ext = ext[~ext["nombre"].str.contains("Revisar productos similares", na=False)]
ext = ext.drop_duplicates(["fecha", "fuente", "url", "key"])
CAPTURE_DATES = sorted(ext["fecha"].unique())
LAST_CAPTURE = CAPTURE_DATES[-1]
list_len = ext.groupby(["fecha", "fuente", "url"])["posicion"].max().to_dict()

# catálogo interno para coincidencias por nombre (Jumbo no trae EAN)
cat_names = prod["nombre"].map(norm)
vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=1, sublinear_tf=True)
X_cat = vec.fit_transform(cat_names)
vec_w = TfidfVectorizer(analyzer=lambda x: tokens(x, ordered=True), sublinear_tf=True)
X_cat_w = vec_w.fit_transform(prod["nombre"])


def hybrid(names):
    return 0.5 * linear_kernel(vec.transform([norm(n) for n in names]), X_cat) + 0.5 * linear_kernel(vec_w.transform(names), X_cat_w)

items = {}
for key, gk in ext.groupby("key"):
    r0 = gk.sort_values("fecha").iloc[-1]
    ean = ean13_from_lider(key) if r0["retailer"] == "Líder" else None
    positions = []
    for (fu, u), gg in gk.groupby(["fuente", "url"]):
        series = [[d, int(p)] for d, p in gg.sort_values("fecha")[["fecha", "posicion"]].values.tolist()]
        positions.append({"list": fu, "series": series, "len": int(max(list_len.get((d, fu, u), 1) for d, _ in series))})
    items[key] = {
        "key": key, "name": r0["nombre"], "brand": (r0["marca"] if isinstance(r0["marca"], str) else ""),
        "retailer": r0["retailer"], "price": float(r0["precio"]) if pd.notna(r0["precio"]) else None,
        "types": sorted(set(gk["tipo"])), "fuentes": sorted(set(gk["fuente"])), "evento": sorted(set(gk["evento"]) - {""}),
        "first": gk["fecha"].min(), "last": gk["fecha"].max(), "dates": sorted(set(gk["fecha"])),
        "positions": positions, "ean": ean, "link": key,
        "img": next((u for u in gk.sort_values("fecha", ascending=False)["imagen"] if isinstance(u, str) and u.startswith("http")), ""),
    }

ext_names = [norm(it["name"]) for it in items.values()]
X_ext = vec.transform(ext_names)
sim_ext_cat = linear_kernel(X_ext, X_cat)
keys = list(items)
for i, k in enumerate(keys):
    it = items[k]
    in_cat = (it["ean"] in catalog_eans) if it["ean"] else False
    match = it["ean"] if in_cat else None
    if not in_cat:  # mismo producto por nombre + tamaño (Jumbo no trae EAN; Líder puede no coincidir)
        for j in np.argsort(-sim_ext_cat[i])[:12]:
            if sim_ext_cat[i, j] < 0.3:
                break
            if same_product(it["name"], prod.iat[j, 0]):
                in_cat, match = True, prod.index[j]
                break
    it["in_catalog"] = in_cat
    it["catalog_match"] = match

# mismo producto en Líder y Jumbo (para presencia P)
sim_ext = linear_kernel(X_ext, X_ext)
for i, k in enumerate(keys):
    it = items[k]
    twins = [j for j in np.where(sim_ext[i] >= 0.45)[0] if j != i and same_product(it["name"], items[keys[j]]["name"])]
    it["twins"] = [keys[j] for j in twins]
    it["retailers"] = sorted({items[keys[j]]["retailer"] for j in twins} | {it["retailer"]})

# ------------------------------------------------------------------ candidatos y puntaje D·E·T·O
EXCLUDE = re.compile(r"televisor|smart tv|plato |vaso |frasco |canasta|canasto|totebag|bolsa totebag|sombrero|timbre|figura|portavelas|peluche|pelota|ropa kiboo|collar|bandana|juguete|mascara|máscara|tela de ara|limpiapies|vincha|sticker|mug |jaula|vela |pocillo|individual deco|molde|cinta peligro|esqueleto|calabaza glitter|calabaza 20|ramo de flores|extensi[oó]n de pelo|balde|murcielago|ara[nñ]a peluda|ara[nñ]a pack|set 4 vasos|calavera mohosa", re.I)
cand = [items[k] for k in keys if not items[k]["in_catalog"] and not EXCLUDE.search(items[k]["name"])]

u_sem = prod["u_sem"].to_dict()
u1d, u2d = prod["u1"].to_dict(), prod["u2"].to_dict()
eans_list = list(prod.index)
sim_c = hybrid([c["name"] for c in cand])

# Palabra inicial → subcategoría (corrige confusiones de nombres parecidos, p. ej. "Té Royal" ≠ cerveza "Royal Guard")
FIRST_WORD = {"te": "Tés", "cafe": "Café", "coctel": "Cocteles", "salsa": "Otras salsas", "aderezo": "Otras salsas", "pure": "Salsa de tomate",
              "cloro": "Cloro", "detergente": "Detergentes", "licor": "Aperitivos", "mayonesa": "Mayonesa", "ketchup": "Otras salsas",
              "yoghurt": "Yogurt", "yogurt": "Yogurt", "leche": "Leche natural", "cerveza": "Cervezas", "vino": "Vino tinto", "pisco": "Pisco",
              "galleta": "Galletas", "chocolate": "Chocolates", "gomita": "Gomitas y caramelos", "caramelo": "Gomitas y caramelos", "helado": "Helados",
              "cereal": "Cereales", "avena": "Avenas", "arroz": "Arroz", "aceite": "Aceite", "harina": "Harina", "azucar": "Azucar", "jugo": "Jugos",
              "nectar": "Néctares", "agua": "Agua Natural", "energetica": "Energizantes", "bebida": "Gaseosas", "papa": "Snacks salados",
              "shampoo": "Shampoo", "desodorante": "Desodorantes", "jabon": "Jabones y exfoliantes corporales", "pizza": "Pizas y tartas saladas"}
sub_path = {s: (m, c) + (s,) for (m, c, s) in sub_w.index}
results = []
for i, c in enumerate(cand):
    order = np.argsort(-sim_c[i])[:15]
    neigh = [(eans_list[j], float(sim_c[i, j])) for j in order if sim_c[i, j] >= 0.18]
    if not neigh:
        continue
    vote = Counter()
    for e, s in neigh[:5]:
        vote[(prod.at[e, "macro"], prod.at[e, "cat"], prod.at[e, "sub"])] += s
    macro, catg, sub = vote.most_common(1)[0][0]
    first = (tokens(c["name"], ordered=True) or [""])[0]
    if first in FIRST_WORD and FIRST_WORD[first] in sub_path:
        macro, catg, sub = sub_path[FIRST_WORD[first]]
    analogs = []
    for e, s in neigh:
        if prod.at[e, "sub"] == sub:
            cls, w = "Directo", 1.0
        elif prod.at[e, "cat"] == catg:
            cls, w = "Cercano", 0.5
        elif prod.at[e, "macro"] == macro:
            cls, w = "Diferente", 0.25
        else:
            continue
        analogs.append({"ean": e, "name": clean_name(prod.at[e, "nombre"]), "brand": str(prod.at[e, "marca"]).title(),
                        "class": cls, "w": w, "sim": round(s, 2), "uSem": round(u_sem[e], 1), "u1": int(u1d[e]), "u2": int(u2d[e]),
                        "price": prod.at[e, "precio"]})
    analogs = [a for a in analogs if a["class"] in ("Directo", "Cercano")] + [a for a in analogs if a["class"] == "Diferente"]
    analogs = ([a for a in analogs if a["class"] == "Directo"][:10] + [a for a in analogs if a["class"] == "Cercano"][:5] +
               [a for a in analogs if a["class"] == "Diferente"][:5])
    n_dir = sum(a["class"] == "Directo" for a in analogs)
    n_cer = sum(a["class"] == "Cercano" for a in analogs)
    if n_dir + n_cer == 0:
        continue  # evidencia insuficiente
    vals, ws = [a["uSem"] for a in analogs], [a["w"] for a in analogs]
    dp = wavg(vals, ws)
    v1 = sum(a["u1"] * a["w"] for a in analogs)
    v2 = sum(a["u2"] * a["w"] for a in analogs)
    gval = (v2 - v1) / v1 if v1 >= 3 else None
    # O: presencia, subida, novedad
    P = 100.0 * len(set(c["retailers"]) & {"Líder", "Jumbo"}) / 2
    rises = []
    for p in c["positions"]:
        if len(p["series"]) >= 2:
            first, last = p["series"][0][1], p["series"][-1][1]
            rises.append(max(0.0, min(100.0, 50 + 100 * (first - last) / max(p["len"], 1))))
    S = max(rises) if rises else None
    N = 100.0 if ("novedades" in c["types"] or c["first"] > CAPTURE_DATES[0]) else 0.0
    o_parts = [(P, 0.40), (S, 0.35), (N, 0.25)]
    O = wavg([x for x, _ in o_parts if x is not None], [w for x, w in o_parts if x is not None])
    # E: solo C (fuentes con datos ÷ 3); A y B (Google Trends / Ads) sin datos
    C = 100.0 * min(3, len(c["types"]) + (1 if len(c["retailers"]) > 1 else 0)) / 3
    results.append({"c": c, "macro": macro, "cat": catg, "sub": sub, "analogs": analogs, "dp": dp, "g": gval,
                    "pes": wpct(vals, ws, 25), "opt": wpct(vals, ws, 75), "n_dir": n_dir, "n_cer": n_cer,
                    "P": P, "S": S, "N": N, "O": O, "C": C})

ld = [math.log1p(r["dp"]) for r in results]
D_P10, D_P90 = pct(ld, 10), pct(ld, 90)
W = {"D": 0.40, "E": 0.20, "T": 0.30, "O": 0.10}
trends_out = []
for r in results:
    D = scale(math.log1p(r["dp"]), D_P10, D_P90)
    T = scale(r["g"], G_P10, G_P90) if r["g"] is not None else None
    E = r["C"]
    parts = {"D": D, "E": E, "T": T, "O": r["O"]}
    have = {k: x for k, x in parts.items() if x is not None}
    score = sum(have[k] * W[k] for k in have) / sum(W[k] for k in have)
    coverage = sum(W[k] for k in have)
    conf = "Alta" if r["n_dir"] >= 3 else ("Media" if r["n_dir"] >= 1 or r["n_cer"] >= 3 else "Baja")
    c = r["c"]
    g_pct = None if r["g"] is None else 100 * r["g"]
    if c["first"] == LAST_CAPTURE and LAST_CAPTURE != CAPTURE_DATES[0]:
        trend = "Emergente"
    elif g_pct is not None and g_pct >= 10:
        trend = "En alza"
    elif g_pct is not None and g_pct > 0:
        trend = "Creciendo"
    else:
        trend = "Estable"
    sources = sorted(set(c["retailers"]) | {"Novedades" if t == "novedades" else "Más vendidos" if t == "mas_vendidos" else "Promociones" for t in c["types"]}) + ["Ventas Turbo (análogos)"]
    prices = [a["price"] for a in r["analogs"] if a["price"]]
    sw = sum(a["w"] for a in r["analogs"])
    series = [round(sum(daily.at[a["ean"], d] * a["w"] for a in r["analogs"]) / sw, 1) for d in range(n_days)]
    tc = tokens(c["name"])
    variant = None
    for a in r["analogs"]:
        ta = tokens(a["name"])
        if a["sim"] >= 0.5 and tc and len(tc & ta) / len(tc | ta) >= 0.5 and not ((tc ^ ta) & DISC):
            variant = a["name"]
            break
    trends_out.append({
        "slug": slug(c["name"]) + "-" + ("l" if c["retailer"] == "Líder" else "j"),
        "name": c["name"], "brand": (c["brand"] or "").strip(), "retailer": c["retailer"], "link": c["link"],
        "macro": r["macro"], "macroId": macro_id.get(r["macro"], "otros"), "category": r["cat"], "subcategory": r["sub"],
        "status": "Fuera del catálogo", "trend": trend, "sources": sources,
        "price": c["price"], "event": c["evento"],
        "sales": round(r["dp"], 1), "salesPes": round(r["pes"], 1), "salesOpt": round(r["opt"], 1),
        "quantity": int(round(r["dp"] * 4)),  # 4 semanas
        "growth": None if g_pct is None else round(g_pct, 1),
        "score": round(score), "coverage": round(100 * coverage),
        "parts": {k: (None if x is None else round(x)) for k, x in parts.items()},
        "detail": {"P": round(r["P"]), "S": None if r["S"] is None else round(r["S"]), "N": round(r["N"]), "C": round(r["C"]),
                   "dp": round(r["dp"], 2), "g": None if r["g"] is None else round(r["g"], 4)},
        "confidence": conf, "nDirect": r["n_dir"], "nNear": r["n_cer"], "variantInCatalog": variant, "series": series,
        "analogs": r["analogs"][:8],
        "analogPrice": {"min": min(prices), "max": max(prices), "avg": round(sum(prices) / len(prices))} if prices else None,
        "firstSeen": c["first"], "lastSeen": c["last"], "seenDates": c["dates"], "retailers": c["retailers"],
        "positions": [{"list": p["list"], "series": p["series"], "len": p["len"]} for p in c["positions"]],
        # EAN para buscar la foto: el propio (Líder) o el del mismo producto capturado en Líder
        "ean": c["ean"] or next((items[tw]["ean"] for tw in items[c["link"]]["twins"] if items[tw]["ean"]), None),
        "img": c["img"] or next((items[tw]["img"] for tw in items[c["link"]]["twins"] if items[tw]["img"]), ""),
    })
trends_out.sort(key=lambda t: (-t["score"], -t["sales"]))
seen = set()
uniq = []
for t in trends_out:  # el mismo producto en Líder y Jumbo (o repetido) → una sola fila, la de mayor puntaje
    k = t["link"]
    if k in seen or norm(t["name"]) in seen:
        continue
    seen.update([k, norm(t["name"])] + items[k]["twins"])
    uniq.append(t)
trends_out = uniq
N_CANDIDATES = len(trends_out)
trends_out = trends_out[:150]
for i, t in enumerate(trends_out):
    t["id"] = i + 1
    t["level"] = "Muy alto" if t["score"] >= 80 else "Alto" if t["score"] >= 60 else "Medio" if t["score"] >= 40 else "Bajo"

# ------------------------------------------------------------------ competencia por campaña (Halloween)
hw = pro.copy()
hw["key"] = hw["link"].str.replace(r"\?.*$", "", regex=True)
hw["precio"] = pd.to_numeric(hw["precio"], errors="coerce")
hw = hw.drop_duplicates(["fecha", "fuente", "key"])
hw["retailer"] = np.where(hw["fuente"].str.contains("Lider"), "Líder", "Jumbo")
hw["nombre"] = hw["nombre"].map(clean_name)
hw = hw[~hw["nombre"].str.contains("Revisar productos similares")]
hw["food"] = ~hw["nombre"].str.contains(EXCLUDE)
hw_out = {"captures": sorted(hw["fecha"].unique()), "byRetailer": [], "topProducts": []}
for (ret, f), gg in hw.groupby(["retailer", "fecha"]):
    hw_out["byRetailer"].append({"retailer": ret, "date": f, "products": int(len(gg)), "food": int(gg["food"].sum()),
                                 "priceMin": int(gg["precio"].min()), "priceMax": int(gg["precio"].max()), "priceAvg": int(round(gg["precio"].mean()))})
hw_cur = hw[hw["fecha"] == hw["fecha"].min()]
brands = Counter(b for b in hw_cur["marca"].dropna() if b)
hw_out["brands"] = [{"brand": b, "n": n} for b, n in brands.most_common(6)]
for _, r in hw_cur[hw_cur["food"]].sort_values("posicion", key=lambda s: pd.to_numeric(s)).head(8).iterrows():
    hw_out["topProducts"].append({"name": r["nombre"], "retailer": r["retailer"], "price": int(r["precio"]), "brand": r["marca"] if isinstance(r["marca"], str) else ""})
hw_turbo = v[v["sub"] == "Halloween"]
hw_out["turbo"] = {"units": int(hw_turbo["u"].sum()), "skus": int(hw_turbo["ean"].nunique()),
                   "candy": int(v[v["nombre"].str.contains("hallow", case=False, na=False)]["u"].sum())}

# ------------------------------------------------------------------ resumen Home
promising = [t for t in uniq if t["score"] >= 60]
cat_growth = prod[(prod["u1"] >= 5) & (prod["tend"] >= 10)]
nuevos = [it for it in items.values() if it["first"] == LAST_CAPTURE]
nuevos_prev = [it for it in items.values() if it["first"] == CAPTURE_DATES[-2]] if len(CAPTURE_DATES) > 1 else []
u_w1, u_w2 = v.loc[v["w"] == 1, "u"].sum(), v.loc[v["w"] == 2, "u"].sum()
summary = {
    "salesFrom": d0.strftime("%Y-%m-%d"), "salesTo": d1.strftime("%Y-%m-%d"), "days": n_days,
    "rowsRaw": int(raw_rows), "rowsClean": int(clean_rows), "products": int(len(prod)), "stores": len(STORES),
    "orders": int(v["orden"].nunique()), "units": int(v["u"].sum()), "unitsW1": int(u_w1), "unitsW2": int(u_w2),
    "captureDates": CAPTURE_DATES, "lastCapture": LAST_CAPTURE, "externalItems": len(items),
    "externalInCatalog": sum(1 for it in items.values() if it["in_catalog"]),
    "candidates": N_CANDIDATES, "shown": len(trends_out), "opportunities": len(promising),
    "rising": int(len(cat_growth)), "risingShare": round(100 * len(cat_growth) / max(1, (prod["u1"] >= 5).sum())),
    "novelties": len(nuevos), "noveltiesPrev": len(nuevos_prev),
    "unitsGrowth": round(100 * (u_w2 - u_w1) / u_w1, 1),
    "weights": W, "growthP10": round(G_P10, 4), "growthP90": round(G_P90, 4),
    "dP10": round(D_P10, 4), "dP90": round(D_P90, 4),
    "built": date.today().isoformat(),
    "skuByMacro": {m: int(n) for m, n in prod.groupby("macro").size().items()},
    "unitsWeekByMacro": {m: int(round(u / WEEKS)) for m, u in prod.groupby("macro")["u"].sum().items()},
    "dayLabels": [(d0 + pd.Timedelta(days=i)).strftime("%-d %b").replace("Oct", "oct") for i in range(n_days)],
}

# ------------------------------------------------------------------ catálogo (archivo aparte)
catalog_out = []
for e, r in prod.sort_values("u", ascending=False).iterrows():
    catalog_out.append([
        e, clean_name(r["nombre"]), str(r["marca"]).title() if isinstance(r["marca"], str) else "",
        macro_id.get(r["macro"], "otros"), r["cat"], r["sub"],
        None if r["precio"] is None or (isinstance(r["precio"], float) and math.isnan(r["precio"])) else int(r["precio"]),
        None if np.isnan(r["margen"]) else round(float(r["margen"]), 1),
        int(r["u"]), None if np.isnan(r["tend"]) else round(float(r["tend"]), 1),
        int(r["tiendas"]), daily.loc[e].astype(int).tolist(),
    ])

# ------------------------------------------------------------------ escribir
def js(name, obj):
    return f"/* Generado por build_data.py ({date.today().isoformat()}). Solo agregados. */\nwindow.{name} = " + json.dumps(obj, ensure_ascii=False, separators=(",", ":"), default=lambda o: None if (isinstance(o, float) and math.isnan(o)) else (int(o) if isinstance(o, (np.integer,)) else float(o))) + ";\n"

cand_subs = sorted({t["subcategory"] for t in trends_out})
vs = v[v["sub"].isin(cand_subs)]
sd = vs.pivot_table(index=["tienda", "sub"], columns="d", values="u", aggfunc="sum", fill_value=0).reindex(columns=range(n_days), fill_value=0)
net_sub_u = vs.groupby("sub")["u"].sum().to_dict()
for st in stores_out:
    st["subDaily"] = {sub: sd.loc[(st["name"], sub)].astype(int).tolist() for sub in cand_subs if (st["name"], sub) in sd.index}
    st["subUnits"] = {sub: int(sum(x)) for sub, x in st["subDaily"].items()}
for t in trends_out:
    ms = [prod.at[a["ean"], "margen"] for a in t["analogs"] if not np.isnan(prod.at[a["ean"], "margen"])]
    t["analogMargin"] = round(float(np.mean(ms)), 1) if ms else None
    t["netSubUnits"] = int(net_sub_u.get(t["subcategory"], 0))
real = {"summary": summary, "stores": stores_out, "trends": trends_out, "halloween": hw_out,
        "taxonomyNote": "Macro → categoría → subcategoría tal como vienen en BBDD Ventas."}
open(f"{SITE}/data/deto-real.js", "w").write(js("DETO_REAL", real))
open(f"{SITE}/data/deto-catalogo.js", "w").write(js("DETO_CATALOGO", {
    "fields": ["ean", "name", "brand", "macroId", "category", "subcategory", "price", "margin", "units", "trend", "stores", "daily"],
    "from": summary["salesFrom"], "to": summary["salesTo"], "rows": catalog_out}))
open(f"{SITE}/data/taxonomia.js", "w").write(
    "/* Taxonomía compartida (macrocategoría → categoría → subcategoría), generada desde BBDD Ventas por build_data.py.\n"
    "   Orden: macros por unidades vendidas (\"Otros\" al final). Catálogo, Tendencias, LAB y Calendario leen de aquí. */\n"
    "(function () {\n  \"use strict\";\n  var DETO = (window.DETO = window.DETO || {});\n  if (DETO.taxonomia) return;\n  var MACROS = "
    + json.dumps(TAXONOMY, ensure_ascii=False, indent=1) + ";\n"
    "  DETO.taxonomia = {\n    macros: MACROS,\n    macroNames: function () { return MACROS.map(function (m) { return m.label; }); },\n"
    "    macro: function (id) { return MACROS.filter(function (m) { return m.id === id; })[0] || null; },\n"
    "    byLabel: function (label) { return MACROS.filter(function (m) { return m.label === label; })[0] || null; }\n  };\n})();\n")

# fotos locales opcionales: assets/productos/<EAN>.jpg|png|webp → data/imagenes.js (las demás se buscan por EAN en el navegador)
import os
fotos = {}
fdir = f"{SITE}/assets/productos"
if os.path.isdir(fdir):
    for f in sorted(os.listdir(fdir)):
        stem, extn = os.path.splitext(f)
        if extn.lower() in (".jpg", ".jpeg", ".png", ".webp") and stem.isdigit() and len(stem.lstrip("0")) >= 8:
            e = stem.lstrip("0")
            fotos[e.zfill(13) if len(e) < 13 else e] = f"assets/productos/{f}"
open(f"{SITE}/data/imagenes.js", "w").write(
    "/* Generado por build_data.py: fotos guardadas en assets/productos/<EAN>.jpg (opcional). */\nwindow.DETO_IMAGENES = "
    + json.dumps(fotos, ensure_ascii=False) + ";\n")

print(json.dumps(summary, ensure_ascii=False, indent=1))
print("top 10:")
for t in trends_out[:10]:
    print(t["score"], t["parts"], t["confidence"], t["sales"], t["growth"], "|", t["name"], "|", t["subcategory"], "|", t["retailers"], t["trend"])
