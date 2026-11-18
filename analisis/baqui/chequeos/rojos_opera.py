"""Chequea los tramos rojos (R2) con la polarización y con OPERA; lagunas por OPERA; anillo de campo. Solo lectura."""
from pathlib import Path
import json, glob, os
import numpy as np
from scipy.ndimage import median_filter
import rasterio
from rasterio.features import rasterize
from rasterio.transform import from_origin
from rasterio.warp import reproject, Resampling
from pyproj import Transformer
from shapely.geometry import LineString, shape as shp
from shapely.ops import transform as stransform

# Carpeta datos/ al lado de baqui/ (se llena con los scripts de descarga; no va a git).
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "datos")
OUT = {}


def a_db(lin, valido):
    v = np.where(valido & (lin > 0), lin, np.nan).astype("float32")
    v = 10 * np.log10(v)
    ok = np.isfinite(v)
    f = median_filter(np.where(ok, v, np.nanmedian(v)), 3)
    f[~ok] = np.nan
    return f


z0 = np.load(f"{R}/nisar/20260929_161A164_corredor.npz"); z1 = np.load(f"{R}/nisar/20261011_161A164_corredor.npz")
x, y, epsg = z0["x"], z0["y"], int(z0["epsg"])
val = (z0["mask"] > 0) & (z0["mask"] < 255) & (z1["mask"] > 0) & (z1["mask"] < 255)
hh0, hh1, hv0, hv1 = (a_db(z[k], val) for z, k in ((z0, "HHHH"), (z1, "HHHH"), (z0, "HVHV"), (z1, "HVHV")))
del z0, z1
ok = np.isfinite(hh0) & np.isfinite(hh1) & np.isfinite(hv0) & np.isfinite(hv1)
dH, dV = hh1 - hh0, hv1 - hv0
T = from_origin(x[0] - 10, y[0] + 10, 20, 20); S = hh0.shape
monte = ok & (hv0 >= -15.76)
siempre = ok & (hh0 < -18)
tr = Transformer.from_crs(4326, epsg, always_xy=True).transform


def opera(fecha):
    acc = np.full(S, 255, "uint8")
    for f in sorted(glob.glob(f"{R}/opera/*_{fecha}T*_WTR.tif")):
        with rasterio.open(f) as s:
            a = np.full(S, 255, "uint8")
            reproject(s.read(1), a, src_transform=s.transform, src_crs=s.crs, dst_transform=T, dst_crs=f"EPSG:{epsg}",
                      resampling=Resampling.nearest, src_nodata=255, dst_nodata=255)
            m = (acc == 255) & (a != 255); acc[m] = a[m]
    return acc
op0, op1 = opera("20261001"), opera("20261013")

g = json.loads(Path(f"{R}/nisar/tramos_20261011_161A164.geojson").read_text(encoding="utf-8"))
rojos, todos = [], []
for f in g["features"]:
    geo = stransform(lambda a, b, c=None: tr(a, b), shp(f["geometry"]))
    todos.append(geo)
    if f["properties"]["color"] == "intransitable":
        rojos.append(geo)
ras = lambda gs, d: rasterize([(q.buffer(d), 1) for q in gs], out_shape=S, transform=T, dtype="uint8").astype(bool)
fr = ras(rojos, 30) & ok
bm = fr & monte & ~siempre & (dH >= 3)
OUT["rojos_franja_px"] = int(fr.sum())
OUT["rojos_px_bajo_monte_dHH>=3"] = int(bm.sum())
OUT["rojos_franja_toda_dHH_mediana"] = round(float(np.median(dH[fr])), 2)
OUT["rojos_franja_toda_dHV_mediana"] = round(float(np.median(dV[fr])), 2)
OUT["rojos_franja_pct_monte"] = round(100 * float(monte[fr].mean()), 1)
OUT["rojos_bajo_monte_dHH_mediana"] = round(float(np.median(dH[bm])), 2)
OUT["rojos_bajo_monte_dHV_mediana"] = round(float(np.median(dV[bm])), 2)
OUT["rojos_bajo_monte_dHH-dHV_mediana"] = round(float(np.median((dH - dV)[bm])), 2)
OUT["rojos_pct_bajo_monte_con_dHH-dHV>=3"] = round(100 * float(((dH - dV)[bm] >= 3).mean()), 1)
OUT["rojos_pct_bajo_monte_con_dHV>=3"] = round(100 * float((dV[bm] >= 3).mean()), 1)
OUT["rojos_opera_1310_valores_franja"] = {int(k): int(v) for k, v in zip(*np.unique(op1[fr], return_counts=True))}
OUT["rojos_opera_0110_valores_franja"] = {int(k): int(v) for k, v in zip(*np.unique(op0[fr], return_counts=True))}
ft = ras(todos, 30) & ok
OUT["todos_tramos_opera_1310_valores_franja"] = {int(k): int(v) for k, v in zip(*np.unique(op1[ft], return_counts=True))}
OUT["todos_tramos_opera_0110_valores_franja"] = {int(k): int(v) for k, v in zip(*np.unique(op0[ft], return_counts=True))}
nv = ft & (op1 == 3) & (op0 != 3) & (op0 != 255)
OUT["todos_tramos_opera_veg_inundada_nueva_px"] = int(nv.sum())
if nv.any():
    OUT["opera_veg_inundada_nueva_franja_dHH_dHV"] = [round(float(np.median(dH[nv])), 2), round(float(np.median(dV[nv])), 2)]

# agua abierta nueva según OPERA en toda la escena: agua el 13/10 donde el 01/10 había tierra (las dos con dato)
from scipy.ndimage import label
ambos = np.isin(op0, (0, 1, 3)) & np.isin(op1, (0, 1, 3)) & ok
nueva = ambos & (op1 == 1) & (op0 == 0)
lab, nlab = label(nueva, structure=np.ones((3, 3)))
tam = np.bincount(lab.ravel())[1:] if nlab else np.array([0])
OUT["opera_agua_nueva_escena"] = {"px_con_dato_ambas": int(ambos.sum()), "px_nueva": int(nueva.sum()),
                                  "pct_nueva": round(100 * float(nueva.sum()) / max(1, ambos.sum()), 3),
                                  "km2_nueva": round(nueva.sum() * 400 / 1e6, 2),
                                  "mancha_mayor_km2": round(float(tam.max()) * 400 / 1e6, 2),
                                  "px_agua_0110": int((ambos & (op0 == 1)).sum()), "px_agua_1310": int((ambos & (op1 == 1)).sum())}

# lagunas de siempre según OPERA (agua abierta el 01/10 y el 13/10): selección que no depende de NISAR
lag = ok & (op0 == 1) & (op1 == 1)
OUT["laguna_opera_ambas_fechas"] = {"px": int(lag.sum()), "km2": round(lag.sum() * 400 / 1e6, 2),
                                    "HH_seco": round(float(np.median(hh0[lag])), 2), "HH_lluvia": round(float(np.median(hh1[lag])), 2),
                                    "HV_seco": round(float(np.median(hv0[lag])), 2), "HV_lluvia": round(float(np.median(hv1[lag])), 2),
                                    "dHH": round(float(np.median(dH[lag])), 2), "dHV": round(float(np.median(dV[lag])), 2),
                                    "pct_dHH_baja_3": round(100 * float((dH[lag] <= -3).mean()), 1),
                                    "pct_dHH_sube_3": round(100 * float((dH[lag] >= 3).mean()), 1),
                                    "pct_en_franja_caminos": round(100 * float((lag & ft).sum()) / max(1, ft.sum()), 3)}
# sesgo de selección: agua elegida con la misma imagen seca
OUT["agua_por_hh0<-18_y_no_opera"] = round(float(np.median(dH[siempre & (op0 == 0)])), 2)

# anillo de campo 300-1000 m dentro de la zona de caminos, para comparar con el eje
rd = json.loads(Path(f"{R}/osm/roads.json").read_text(encoding="utf-8"))
ln = [LineString([tr(p["lon"], p["lat"]) for p in w["geometry"]]) for w in rd["elements"]
      if w.get("type") == "way" and len(w.get("geometry", [])) > 1]
an = ras(ln, 1000) & ~ras(ln, 300) & ok
OUT["campo_300a1000m_corredor"] = {"px": int(an.sum()), "dHH": round(float(np.median(dH[an])), 2), "dHV": round(float(np.median(dV[an])), 2),
                                   "dHH_abierto": round(float(np.median(dH[an & ~monte])), 2),
                                   "dHV_abierto": round(float(np.median(dV[an & ~monte])), 2),
                                   "pct_dHH_baja_3_y_hh1<-18": round(100 * float(((dH <= -3) & (hh1 < -18))[an].mean()), 3)}
os.makedirs(f"{R}/chequeos", exist_ok=True)
Path(f"{R}/chequeos/salida_rojos.json").write_text(json.dumps(OUT, indent=1), encoding="utf-8")
print(json.dumps(OUT, indent=1))
