"""Secado en caminos (HH y HV por separado), lo que sale del geojson y datos de ruido. Solo lectura."""
from pathlib import Path
import json, os, glob
import numpy as np
import h5py
from scipy.ndimage import median_filter
from rasterio.features import rasterize
from rasterio.transform import from_origin
from pyproj import Transformer
from shapely.geometry import LineString

# Carpeta datos/ al lado de baqui/ (se llena con los scripts de descarga; no va a git).
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "datos")
OUT = {}


def tipo(tags):
    sup = (tags or {}).get("surface", "")
    return "asfalto" if sup in ("asphalt", "concrete", "paved", "paving_stones") else "tierra"


def a_db(lin, valido):
    v = np.where(valido & (lin > 0), lin, np.nan).astype("float32")
    v = 10 * np.log10(v)
    ok = np.isfinite(v)
    f = median_filter(np.where(ok, v, np.nanmedian(v)), 3)
    f[~ok] = np.nan
    return f


def cargar(n):
    z = np.load(f"{R}/nisar/{n}_caminos.npz")
    val = (z["mask"] > 0) & (z["mask"] < 255)
    return a_db(z["HHHH"], val), a_db(z["HVHV"], val), z["x"], z["y"], int(z["epsg"]), str(z["archivo"])


rd = json.loads(Path(f"{R}/osm/roads.json").read_text(encoding="utf-8"))
ways = [e for e in rd["elements"] if e.get("type") == "way" and len(e.get("geometry", [])) > 1]
lons = [p["lon"] for w in ways for p in w["geometry"]]; lats = [p["lat"] for w in ways for p in w["geometry"]]
OUT["bbox_caminos_osm"] = [round(min(lons), 3), round(min(lats), 3), round(max(lons), 3), round(max(lats), 3)]
CAMINOS3 = {1: 746343006, 2: 118260612, 3: 1084701978}

PARES = [(2, "20261011_161A164", "20260929_161A164"), (7, "20261016_060A164", "20261004_060A164"),
         (10, "20261019_111D102", "20261007_111D102"), (14, "20261023_161A164", "20260929_161A164")]
ref_orbita = {}
for dias, desp, ref in PARES:
    h1, v1, x, y, epsg, a1 = cargar(desp)
    h0, v0, x0, y0, _, a0 = cargar(ref)
    assert h0.shape == h1.shape and np.allclose(x, x0)
    T = from_origin(x[0] - 10, y[0] + 10, 20, 20)
    tr = Transformer.from_crs(4326, epsg, always_xy=True).transform
    lt = [LineString([tr(p["lon"], p["lat"]) for p in w["geometry"]]) for w in ways if tipo(w.get("tags")) == "tierra"]
    l3 = {k: LineString([tr(p["lon"], p["lat"]) for p in w["geometry"]]) for w in ways for k, i in CAMINOS3.items() if w["id"] == i}
    ras = lambda ls, d, h0=h0, T=T: rasterize([(l.buffer(d), 1) for l in ls], out_shape=h0.shape, transform=T, dtype="uint8").astype(bool)
    ok = np.isfinite(h0) & np.isfinite(h1) & np.isfinite(v0) & np.isfinite(v1)
    eje = ras(lt, 10) & ok
    franja = ras(lt, 30) & ok
    anillo = ras(lt, 1000) & ~ras(lt, 300) & ok
    monte = ok & (v0 >= -15.76)   # corte de monte del corredor (Otsu HV 29/09, medir.py)
    dH, dV = h1 - h0, v1 - v0
    md = lambda a, m: round(float(np.nanmedian(a[m])), 2) if m.any() else None
    fila = {"par": f"{desp} - {ref}", "dias_desde_lluvia": dias,
            "n_eje": int(eje.sum()),
            "eje_tierra_dHH": md(dH, eje), "eje_tierra_dHV": md(dV, eje),
            "eje_abierto_dHH": md(dH, eje & ~monte), "eje_abierto_dHV": md(dV, eje & ~monte),
            "eje_monte_dHH": md(dH, eje & monte), "eje_monte_dHV": md(dV, eje & monte),
            "campo_300a1000m_dHH": md(dH, anillo), "campo_300a1000m_dHV": md(dV, anillo),
            "zona_dHH": md(dH, ok), "zona_dHV": md(dV, ok),
            "pct_eje_sube_1a3": round(100 * float(((dH >= 1) & (dH <= 3))[eje].mean()), 1),
            "pct_eje_baja_3": round(100 * float((dH <= -3)[eje].mean()), 2)}
    for k, ln in l3.items():
        m = ras([ln], 50) & ok
        fila[f"camino{k}_50m_dHH"] = md(dH, m); fila[f"camino{k}_50m_dHV"] = md(dV, m)
    OUT[f"3_secado_{dias}d"] = fila
    ref_orbita[ref] = {"HH_eje_tierra_abierto": md(h0, eje & ~monte), "HV_eje_tierra_abierto": md(v0, eje & ~monte),
                       "HH_zona": md(h0, ok), "HV_zona": md(v0, ok), "version": a0.split("_")[-5]}
OUT["4_referencias_secas_por_orbita"] = ref_orbita

# media vida con HH y HV del eje de tierra (pares de misma versión: 2, 7, 10 días)
for pol in ("HH", "HV"):
    t = np.array([2, 7, 10]); v = np.array([OUT[f"3_secado_{d}d"][f"eje_tierra_d{pol}"] for d in (2, 7, 10)])
    if (v > 0).all():
        p = np.polyfit(t, np.log(v), 1)[0]
        OUT[f"3_media_vida_eje_tierra_{pol}_dias"] = round(float(np.log(0.5) / p), 1) if p < 0 else "no baja"

# lluvia IMERG en las celdas de los 3 caminos alrededor del 23/10
ll = {}
for d in ("2026-10-21", "2026-10-22", "2026-10-23"):
    z = np.load(f"{R}/imerg/grilla/{d}.npz")
    lon, lat, p = z["lon"], z["lat"], z["p"]
    i = (lon >= -59.40) & (lon <= -59.18); j = (lat >= -26.65) & (lat <= -26.28)
    ll[d] = round(float(np.nanmean(p[np.ix_(j, i)])), 2)
OUT["3_imerg_celdas_caminos_21a23oct_mm"] = ll

# geojson: qué disparó cada color
g = json.loads(Path(f"{R}/nisar/tramos_20261011_161A164.geojson").read_text(encoding="utf-8"))
km = {}
reg = {}
n_agua = n_monte = 0
km_agua = km_monte = 0.0
Ns = []
for f in g["features"]:
    p = f["properties"]
    km[p["color"]] = km.get(p["color"], 0) + p["largo_m"] / 1000
    reg[p["regla"]] = reg.get(p["regla"], 0) + p["largo_m"] / 1000
    if p["agua_seguida_m"] > 0:
        n_agua += 1; km_agua += p["largo_m"] / 1000
    if p["monte_seguido_m"] > 0:
        n_monte += 1; km_monte += p["largo_m"] / 1000
    if p["N"] > 0:
        Ns.append(p["N"])
OUT["2_geojson_km_por_color"] = {k: round(v, 1) for k, v in km.items()}
OUT["2_geojson_km_por_regla"] = {k: round(v, 1) for k, v in reg.items()}
OUT["2_geojson_tramos_con_agua_abierta_nueva"] = [n_agua, round(km_agua, 1)]
OUT["2_geojson_tramos_con_agua_bajo_monte"] = [n_monte, round(km_monte, 1)]
OUT["2_geojson_n_tramos"] = len(g["features"])
OUT["4_pixeles_por_tramo_1km_franja30m"] = {"mediana": int(np.median(Ns)), "p10": int(np.percentile(Ns, 10))}
rojos = [f["properties"] for f in g["features"] if f["properties"]["color"] == "intransitable"]
OUT["2_rojos_detalle"] = [{k: p[k] for k in ("way", "nombre", "tramo", "largo_m", "regla", "agua_seguida_m", "monte_seguido_m", "agua_pct", "suelo_mojado_pct", "N")} for p in rojos]
sd = [f["properties"] for f in g["features"] if f["properties"]["color"] == "sin dato"]
mot = {}
for p in sd:
    k = p["motivo"].split("(")[0].strip()
    mot[k] = mot.get(k, 0) + p["largo_m"] / 1000
OUT["4_sin_dato_motivos_km"] = {k: round(v, 1) for k, v in mot.items()}

# looks e incidencia en la zona (h5 del 11/10)
f = h5py.File(glob.glob(f"{R}/nisar/h5/*20261011T*.h5")[0], "r")
G = "science/LSAR/GCOV/"
gx, gy = f[G + "grids/frequencyA/xCoordinates"][:], f[G + "grids/frequencyA/yCoordinates"][:]
zc = np.load(f"{R}/nisar/20261011_161A164_corredor.npz")
c = np.where((gx >= zc["x"].min()) & (gx <= zc["x"].max()))[0]; r = np.where((gy >= zc["y"].min()) & (gy <= zc["y"].max()))[0]
nl = f[G + "grids/frequencyA/numberOfLooks"][r.min():r.max() + 1:10, c.min():c.max() + 1:10]
nl = nl[np.isfinite(nl) & (nl > 0)]
OUT["4_numero_de_looks_corredor"] = {"mediana": round(float(np.median(nl)), 2), "p5": round(float(np.percentile(nl, 5)), 2), "p95": round(float(np.percentile(nl, 95)), 2)}
inc = f[G + "metadata/radarGrid/incidenceAngle"]
ix, iy = f[G + "metadata/radarGrid/xCoordinates"][:], f[G + "metadata/radarGrid/yCoordinates"][:]
ci = np.where((ix >= zc["x"].min()) & (ix <= zc["x"].max()))[0]; ri = np.where((iy >= zc["y"].min()) & (iy <= zc["y"].max()))[0]
a = inc[:, ri.min():ri.max() + 1, ci.min():ci.max() + 1]
a = a[np.isfinite(a)]
OUT["4_incidencia_corredor_161A_grados"] = [round(float(a.min()), 1), round(float(a.max()), 1)]
os.makedirs(f"{R}/chequeos", exist_ok=True)
Path(f"{R}/chequeos/salida_secado.json").write_text(json.dumps(OUT, indent=1, ensure_ascii=False), encoding="utf-8")
print(json.dumps(OUT, indent=1, ensure_ascii=False))
