"""Baja los caminos de OpenStreetMap que usa la medición y los guarda en datos/osm/roads.json.

Trae los caminos rurales (highway = unclassified, tertiary o track) que tocan el cuadrado del MVP,
con la geometría completa de cada uno. Usa la API pública de OpenStreetMap, sin cuenta.

Uso: python -m baqui.descarga.bajar_osm
"""
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

BBOX = (-59.60, -26.80, -59.10, -26.30)  # oeste, sur, este, norte: el cuadrado del MVP
CLASES = {"unclassified", "tertiary", "track"}
PASO = 0.25  # grados por pedido: la API rechaza recuadros grandes
API = "https://api.openstreetmap.org/api/0.6/map.json"
SALIDA = Path(__file__).resolve().parents[2] / "datos" / "osm" / "roads.json"


def _pedir(o, s, e, n):
    pedido = urllib.request.Request(f"{API}?bbox={o},{s},{e},{n}", headers={"User-Agent": "baqui/1.0"})
    with urllib.request.urlopen(pedido, timeout=120) as r:
        return json.load(r)["elements"]


def _recuadro(o, s, e, n, caminos, nivel=0):
    try:
        elementos = _pedir(o, s, e, n)
    except urllib.error.HTTPError as err:
        if err.code != 400 or nivel >= 3:  # 400 = demasiados datos: se parte en cuatro
            raise
        mx, my = (o + e) / 2, (s + n) / 2
        for b in ((o, s, mx, my), (mx, s, e, my), (o, my, mx, n), (mx, my, e, n)):
            _recuadro(*b, caminos, nivel + 1)
        return
    nodos = {x["id"]: x for x in elementos if x["type"] == "node"}
    for x in elementos:
        if x["type"] != "way" or x["id"] in caminos or x.get("tags", {}).get("highway") not in CLASES:
            continue
        if all(i in nodos for i in x["nodes"]):
            caminos[x["id"]] = {"type": "way", "id": x["id"], "tags": x["tags"], "nodes": x["nodes"],
                                "geometry": [{"lat": nodos[i]["lat"], "lon": nodos[i]["lon"]} for i in x["nodes"]]}
    time.sleep(1)  # sin apurar a la API


def main():
    caminos = {}
    o = BBOX[0]
    while o < BBOX[2]:
        s = BBOX[1]
        while s < BBOX[3]:
            _recuadro(o, s, min(o + PASO, BBOX[2]), min(s + PASO, BBOX[3]), caminos)
            s += PASO
        o += PASO
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    fuente = {"datos": "OpenStreetMap (ODbL). https://www.openstreetmap.org/copyright",
              "descarga": "API de OpenStreetMap, " + time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "clases": sorted(CLASES), "bbox": BBOX}
    SALIDA.write_text(json.dumps({"_fuente": fuente, "elements": list(caminos.values())}), encoding="utf-8")
    print(f"{len(caminos)} caminos -> {SALIDA}")


if __name__ == "__main__":
    main()
