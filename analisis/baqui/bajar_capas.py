"""Baja las fuentes que acompañan a NISAR, sobre el corredor Resistencia–San Martín.

- OPERA DSWx-S1: mapa de agua ya hecho por la NASA (solo la banda de agua, B01_WTR).
- IMERG: lluvia diaria (versión "Late", unas 14 h de atraso). Se lee solo la ventana.
- NASADEM (NASA, 30 m): altura del terreno, para saber si un tramo está en un bajo o en una loma (HAND).
  Es la fuente de altura por defecto: así todos los datos del análisis son de NASA.
- Copernicus DEM GLO-30 (ESA, 30 m): la misma altura, como alternativa y para comparar ("dem").
- SMAP: humedad del suelo (microondas banda L, 9 km, diaria).

Uso: python -m baqui.bajar_capas [opera|imerg|nasadem|dem|smap ...]  (sin nada, baja todo)
"""
import json
import sys
from pathlib import Path

import numpy as np

BBOX = (-59.70, -27.55, -58.80, -26.20)  # lon_min, lat_min, lon_max, lat_max
DESDE, HASTA = "2026-09-25", "2026-11-15"
RAIZ = Path(__file__).resolve().parent.parent / "datos"


def opera():
    import earthaccess
    earthaccess.login(strategy="netrc")
    out = RAIZ / "opera"
    out.mkdir(parents=True, exist_ok=True)
    res = earthaccess.search_data(short_name="OPERA_L3_DSWX-S1_V1",
                                  bounding_box=BBOX, temporal=(DESDE, HASTA))
    urls = [l for g in res for l in g.data_links() if l.endswith("_B01_WTR.tif")]
    print(f"OPERA: {len(res)} escenas, {len(urls)} archivos de agua")
    nuevos = [u for u in urls if not (out / u.rsplit("/", 1)[-1]).exists()]
    if nuevos:
        earthaccess.download(nuevos, str(out))
    print("OPERA listo:", len(list(out.glob("*_B01_WTR.tif"))), "archivos")


def imerg():
    import earthaccess
    import h5py
    earthaccess.login(strategy="netrc")
    out = RAIZ / "imerg"
    out.mkdir(parents=True, exist_ok=True)
    res = earthaccess.search_data(short_name="GPM_3IMERGDL", version="07",
                                  bounding_box=BBOX, temporal=(DESDE, HASTA))
    print(f"IMERG: {len(res)} días")
    serie = {}
    archivo = out / "lluvia_diaria_corredor.json"
    if archivo.exists():
        serie = json.loads(archivo.read_text())
    pendientes = [g for g in res if g["umm"]["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"][:10] not in serie]
    for g, f in zip(pendientes, earthaccess.open(pendientes)):
        dia = g["umm"]["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"][:10]
        with h5py.File(f, "r") as h:
            lon = h["lon"][:]
            lat = h["lat"][:]
            i = np.where((lon >= BBOX[0]) & (lon <= BBOX[2]))[0]
            j = np.where((lat >= BBOX[1]) & (lat <= BBOX[3]))[0]
            p = h["precipitation"][0, i[0]:i[-1] + 1, j[0]:j[-1] + 1]  # (lon, lat), mm/día
            p = np.where(p < 0, np.nan, p)
        serie[dia] = {"media_mm": round(float(np.nanmean(p)), 2),
                      "max_mm": round(float(np.nanmax(p)), 2),
                      "celdas": int(p.size)}
        print(dia, serie[dia])
        archivo.write_text(json.dumps(dict(sorted(serie.items())), indent=1))
    print("IMERG listo:", archivo)


def _altura(coleccion, carpeta, asset):
    """Baja las hojas de altura del terreno que tocan BBOX desde Planetary Computer (sin cuenta)."""
    import planetary_computer
    import pystac_client
    import urllib.request
    out = RAIZ / carpeta
    out.mkdir(parents=True, exist_ok=True)
    cat = pystac_client.Client.open("https://planetarycomputer.microsoft.com/api/stac/v1",
                                    modifier=planetary_computer.sign_inplace)
    items = list(cat.search(collections=[coleccion], bbox=BBOX).items())
    print(f"{coleccion}: {len(items)} hojas")
    for it in items:
        destino = out / f"{it.id}.tif"
        if not destino.exists():
            parcial = destino.with_suffix(".part")
            urllib.request.urlretrieve(it.assets[asset].href, parcial)
            parcial.rename(destino)  # solo queda .tif si bajó entero
        print("  ", destino.name, round(destino.stat().st_size / 1e6, 1), "MB")


def nasadem():
    # NASADEM: SRTM reprocesado por NASA (cubre de 56° S a 60° N; el corredor son 4 hojas de 1°).
    _altura("nasadem", "nasadem", "elevation")


def dem():
    # Copernicus GLO-30 (ESA): alternativa a NASADEM. Los chequeos de 15/11 se corrieron con este.
    _altura("cop-dem-glo-30", "dem", "data")


def _ventana_ease9():
    """Filas y columnas de la grilla EASE-2 de 9 km (EPSG 6933) que caen en BBOX."""
    from rasterio.warp import transform
    x0, y0, celda = -17367530.44516138, 7314540.830638, 9008.055210146
    xs, ys = transform("EPSG:4326", "EPSG:6933", [BBOX[0], BBOX[2]], [BBOX[3], BBOX[1]])
    c = [int((x - x0) // celda) for x in xs]
    f = [int((y0 - y) // celda) for y in ys]
    return slice(f[0], f[1] + 1), slice(c[0], c[1] + 1)


def _dias_utiles_smap(recientes_desde="2026-11-01"):
    """Días de SMAP que usa Baqui: los recientes (estimación de hoy) y el día de cada pasada de NISAR
    (para comparar el radar con la humedad de ese momento). El resto de la temporada no hace falta."""
    from datetime import date, timedelta
    dias = set()
    d, fin = date.fromisoformat(recientes_desde), date.fromisoformat(HASTA)
    while d <= fin:
        dias.add(d.isoformat())
        d += timedelta(days=1)
    for npz in (RAIZ / "nisar").glob("*_caminos.npz"):
        p = date(int(npz.name[:4]), int(npz.name[4:6]), int(npz.name[6:8]))
        dias.update((p + timedelta(days=k)).isoformat() for k in (0,))
    return dias


def _leer_smap(url):
    """Lee un día de SMAP (archivo remoto) y devuelve la media del corredor, mañana y tarde."""
    import earthaccess
    import h5py
    earthaccess.login(strategy="netrc")
    filas, cols = _ventana_ease9()
    fila = {}
    with h5py.File(earthaccess.open([url], show_progress=False)[0], "r") as h:
        for pasada, grupo, suf in (("am", "Soil_Moisture_Retrieval_Data_AM", ""),
                                   ("pm", "Soil_Moisture_Retrieval_Data_PM", "_pm")):
            sm = h[grupo]["soil_moisture" + suf][filas, cols].astype(float)
            sm[sm < 0] = np.nan  # -9999 = sin dato
            validas = int(np.isfinite(sm).sum())
            fila[pasada] = round(float(np.nanmean(sm)), 3) if validas else None
            fila[f"celdas_{pasada}"] = validas
    return fila


def smap(procesos=6):
    """Humedad del suelo SMAP L3 mejorada (9 km, diaria, ~2 días de atraso).

    Guarda por día la media del corredor en m³/m³ (pasada de la mañana y de la tarde).
    Cada archivo pesa ~650 MB, pero se lee solo la ventana; varios días en paralelo.
    """
    from concurrent.futures import ProcessPoolExecutor, as_completed
    import earthaccess
    earthaccess.login(strategy="netrc")
    out = RAIZ / "smap"
    out.mkdir(parents=True, exist_ok=True)
    archivo = out / "humedad_diaria_corredor.json"
    serie = json.loads(archivo.read_text()) if archivo.exists() else {}
    res = earthaccess.search_data(short_name="SPL3SMP_E", version="006",
                                  bounding_box=BBOX, temporal=(DESDE, HASTA))
    print(f"SMAP: {len(res)} días, {len(serie)} ya bajados")
    dia_de = lambda g: g["umm"]["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"][:10]
    utiles = _dias_utiles_smap()
    # Primero los días más nuevos: son los que usa la estimación de hoy.
    pendientes = sorted((g for g in res if dia_de(g) not in serie and dia_de(g) in utiles),
                        key=dia_de, reverse=True)
    print(f"SMAP: bajo {len(pendientes)} de los {len(utiles)} días útiles")
    urls = {dia_de(g): next(l for l in g.data_links() if l.endswith(".h5")) for g in pendientes}
    with ProcessPoolExecutor(procesos) as pool:
        futuros = {pool.submit(_leer_smap, u): d for d, u in urls.items()}
        for fut in as_completed(futuros):
            dia = futuros[fut]
            try:
                serie[dia] = fut.result()
            except Exception as e:  # un día que falla no frena a los demás
                print(dia, "ERROR", type(e).__name__, e)
                continue
            print(dia, serie[dia])
            archivo.write_text(json.dumps(dict(sorted(serie.items())), indent=1))
    print("SMAP listo:", archivo, len(serie), "días")


if __name__ == "__main__":
    pedidos = sys.argv[1:] or ["nasadem", "opera", "imerg", "smap"]
    for p in pedidos:
        try:
            {"opera": opera, "imerg": imerg, "nasadem": nasadem, "dem": dem, "smap": smap}[p]()
        except Exception as e:  # que una fuente caída no frene a las otras
            print(f"ERROR en {p}: {type(e).__name__}: {e}")
