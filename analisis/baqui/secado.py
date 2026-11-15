"""Mide cómo se secan los caminos después de la lluvia del 9/10/2026 con pasadas NISAR.

Cada pasada se compara con una referencia seca DE SU MISMA ÓRBITA.
Uso: python -m baqui.secado
"""
import json, os
import numpy as np
from scipy.ndimage import median_filter
from pyproj import Transformer
from shapely.geometry import LineString
from rasterio.features import geometry_mask
from rasterio.transform import from_origin

D = "datos/nisar"
CAMINOS = {1: 746343006, 2: 118260612, 3: 1084701978}
# (días desde la lluvia, después, referencia, aviso)
PARES = [
    (2, "20261011_161A164", "20260929_161A164", ""),
    (7, "20261016_060A164", "20261004_060A164", ""),
    (10, "20261019_111D102", "20261007_111D102", ""),
    (14, "20261023_161A164", "20260929_161A164", "versión distinta (P05036 vs P05023) y 7 mm de lluvia el 21-23/10"),
]


def cargar(nombre):
    z = np.load(f"{D}/{nombre}_caminos.npz")
    hh = z["HHHH"].astype("float64")
    return median_filter(10 * np.log10(np.where(hh > 0, hh, np.nan)), 3), z["x"], z["y"], int(z["epsg"])


def caminos_osm():
    rd = json.load(open("datos/osm/roads.json", encoding="utf-8"))
    return {e["id"]: e["geometry"] for e in rd["elements"] if e.get("type") == "way" and "geometry" in e}


def main():
    geo = caminos_osm()
    filas = []
    for dias, despues, ref, aviso in PARES:
        h1, x, y, epsg = cargar(despues)
        h0, x0, y0, _ = cargar(ref)
        assert h0.shape == h1.shape and np.allclose(x, x0) and np.allclose(y, y0), "grillas distintas"
        T = from_origin(x[0] - 10, y[0] + 10, abs(x[1] - x[0]), abs(y[1] - y[0]))
        tr = Transformer.from_crs(4326, epsg, always_xy=True)
        d = h1 - h0
        fila = {"dias": dias, "par": f"{despues} - {ref}", "zona": float(np.nanmedian(d)), "aviso": aviso}
        for k, i in CAMINOS.items():
            ln = LineString([tr.transform(p["lon"], p["lat"]) for p in geo[i]])
            m = ~geometry_mask([ln.buffer(50)], out_shape=d.shape, transform=T)
            fila[k] = float(np.nanmedian(d[m]))
        filas.append(fila)
    print("días | zona | camino 1 | camino 2 | camino 3 | par")
    for f in filas:
        print(f"{f['dias']:>4} | {f['zona']:+.2f} | {f[1]:+.2f} | {f[2]:+.2f} | {f[3]:+.2f} | {f['par']} {f['aviso']}")
    # media vida: ajuste log-lineal con las pasadas de la misma versión (sin la de 14 días)
    for etiqueta, sel in (("sin 23/10", filas[:3]), ("con 23/10", filas)):
        t = np.array([f["dias"] for f in sel for k in CAMINOS])
        v = np.array([f[k] for f in sel for k in CAMINOS])
        ok = v > 0.05
        pend = np.polyfit(t[ok], np.log(v[ok]), 1)[0]
        print(f"media vida ({etiqueta}): {np.log(0.5) / pend:.1f} días" if pend < 0 else f"{etiqueta}: no baja")
    json.dump(filas, open(f"{D}/secado.json", "w"), indent=1)


if __name__ == "__main__":
    main()
