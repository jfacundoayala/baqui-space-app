"""Lluvia desde la pasada del radar, por tramo, con la grilla diaria de IMERG (0,1°, unos 10 km).

`bajar_capas.imerg` guarda solo la media y el máximo del corredor. Acá se guarda la grilla
de cada día para que cada tramo use la celda que le toca: la lluvia del 9/10 cargó más al norte.

Uso: python -m baqui.lluvia [desde] [hasta]     (por defecto, 2026-09-25 a 2026-11-15)
Salida: datos/imerg/grilla/<AAAA-MM-DD>.npz con lon, lat y p (mm del día UTC; filas = lat, columnas = lon).

Límite: IMERG diario va de 0 a 24 h UTC y NISAR pasa cerca de las 10 UTC. "Desde la pasada" se cuenta
desde el día siguiente al de la pasada hasta el día de la consulta, los dos incluidos.
"""
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np

from baqui.descarga.bajar_capas import BBOX, RAIZ

CARPETA = RAIZ / "imerg" / "grilla"


def bajar(desde="2026-09-25", hasta="2026-11-15"):
    import earthaccess
    import h5py
    earthaccess.login(strategy="netrc")
    CARPETA.mkdir(parents=True, exist_ok=True)
    res = earthaccess.search_data(short_name="GPM_3IMERGDL", version="07", bounding_box=BBOX,
                                  temporal=(desde, hasta))
    dia = lambda g: g["umm"]["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"][:10]
    pendientes = [g for g in res if not (CARPETA / f"{dia(g)}.npz").exists()]
    print(f"IMERG: {len(res)} días, faltan {len(pendientes)}", flush=True)
    for g, f in zip(pendientes, earthaccess.open(pendientes)):
        with h5py.File(f, "r") as h:
            lon, lat = h["lon"][:], h["lat"][:]
            i = np.where((lon >= BBOX[0] - 0.1) & (lon <= BBOX[2] + 0.1))[0]
            j = np.where((lat >= BBOX[1] - 0.1) & (lat <= BBOX[3] + 0.1))[0]
            p = h["precipitation"][0, i[0]:i[-1] + 1, j[0]:j[-1] + 1].T   # el archivo trae (lon, lat)
        p = np.where(p < 0, np.nan, p).astype("float32")
        np.savez_compressed(CARPETA / f"{dia(g)}.npz", lon=lon[i], lat=lat[j], p=p)
        print(dia(g), f"media {np.nanmean(p):.1f} mm, máx {np.nanmax(p):.1f} mm", flush=True)


class Lluvia:
    """Suma la lluvia de la celda IMERG más cercana entre dos fechas."""

    def __init__(self, carpeta=CARPETA):
        self.dias = {}
        for f in sorted(Path(carpeta).glob("*.npz")):
            z = np.load(f)
            self.dias[f.stem] = (z["lon"], z["lat"], z["p"])

    def faltan(self, pasada: date, hoy: date):
        return [d.isoformat() for d in _dias(pasada, hoy) if d.isoformat() not in self.dias]

    def desde_pasada(self, lon, lat, pasada: date, hoy: date):
        """mm desde el día siguiente a la pasada hasta hoy. Si falta un día, error: no se inventa lluvia."""
        falta = self.faltan(pasada, hoy)
        if falta:
            raise LookupError(f"falta la grilla IMERG de {', '.join(falta)}: correr python -m baqui.lluvia")
        total = 0.0
        for d in _dias(pasada, hoy):
            lo, la, p = self.dias[d.isoformat()]
            v = p[np.abs(la - lat).argmin(), np.abs(lo - lon).argmin()]
            total += 0.0 if np.isnan(v) else float(v)
        return round(total, 1)


def _dias(pasada, hoy):
    return [pasada + timedelta(days=k) for k in range(1, (hoy - pasada).days + 1)]


if __name__ == "__main__":
    bajar(*sys.argv[1:3])
