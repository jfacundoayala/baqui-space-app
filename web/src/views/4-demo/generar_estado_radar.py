# Genera rutas.json y estado_radar.json para la demo (sección 4) con el estado REAL de los caminos medido por el radar.
# Correr (desde la carpeta web), después de `python -m baqui.medir 20261011_161A164 20260929_161A164 --zona corredor`:
#   python src/views/4-demo/generar_estado_radar.py
#
# Origen de cada dato:
# - Estado de cada tramo: analisis/datos/nisar/tramos_<pasada>.geojson (baqui/medir.py). Tramos de 1 km de los caminos
#   rurales de OSM (unclassified, tertiary, track) del cuadrado del MVP, con el estado que da el clasificador.
# - Caminos y lugares: OpenStreetMap (ODbL), osm/caminos_osm.json. Grafo con todas las clases de camino para autos.
# - Camino 1: el más corto por la red. Camino 2: el más corto que no pisa ningún tramo intransitable; solo existe si
#   el camino 1 está cortado y el desvío no es más del doble de largo.
# - Lo que el radar no midió (rutas pavimentadas, calles, caminos fuera del cuadrado) queda como "sin medir".
import collections, json, math, os
import networkx as nx
from shapely.geometry import LineString, Point
from pyproj import Transformer

AQUI = os.path.dirname(os.path.abspath(__file__))
OSM = os.path.join(AQUI, "osm", "caminos_osm.json")
TRAMOS = os.path.join(AQUI, "..", "..", "..", "..", "analisis", "datos", "nisar", "tramos_20261011_161A164.geojson")
ORIGEN = (-26.537, -59.342)  # centro de General San Martín (Chaco), aprox.
DESVIO_MAX = 2.0
CERCA_M = 40  # un tramo del grafo toma el estado del tramo medido del mismo way de OSM si está a menos de esto
ESTADOS = ["transitable", "con barro", "intransitable", "sin dato"]

# Destinos: nodos place=* de OSM. Qué da cada uno con la pasada del 11/10 (el script frena si no da).
# "desvío" = camino 1 cortado y hay camino 2. "sin salida" = camino 1 cortado y no hay otro.
DESTINOS = [
    ("el-fiscal", 7501506407, "transitable"),
    ("siete-arboles", 7501783098, "con barro"),
    ("capitan-solari", 497261005, "desvío"),
    ("campo-sur", None, "sin salida"),
]
# Ningún lugar con nombre quedó sin salida el 11/10. El caso "sin salida" es el final de un camino rural (track de OSM,
# sin nombre en el mapa) que ese día quedó aislado: nodo de OSM, nombre que se muestra y tipo (ver TIPOS en textos.ts).
SIN_NOMBRE = {"campo-sur": (1320839185, "Campo al sur", "sin_nombre")}

fw = Transformer.from_crs(4326, 32721, always_xy=True)
bw = Transformer.from_crs(32721, 4326, always_xy=True)
def hav(a, b):
    la1, lo1 = map(math.radians, a); la2, lo2 = map(math.radians, b)
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 2*6371008.8*math.asin(math.sqrt(h))
def r5(v): return round(v, 5)
def ll(x, y):
    lon, lat = bw.transform(x, y); return [r5(lat), r5(lon)]

osm = json.load(open(OSM, encoding="utf8"))
G = nx.Graph(); pos = {}
for wid, hw, surf, nombre, nodos, geo in osm["ways"]:
    for n, (la, lo) in zip(nodos, geo): pos[n] = (la, lo)
    for a, b in zip(nodos, nodos[1:]): G.add_edge(a, b, w=hav(pos[a], pos[b]), surf=surf, way=wid)
comp = max(nx.connected_components(G), key=len); G = G.subgraph(comp).copy()
XY = {n: fw.transform(pos[n][1], pos[n][0]) for n in comp}
nearest = lambda p: min(comp, key=lambda n: hav(p, pos[n]))
o = nearest(ORIGEN)
LUGARES = {lid: (place, nombre, lat, lon) for lid, place, nombre, lat, lon in osm["lugares"]}

medido = json.load(open(TRAMOS, encoding="utf8"))
F = medido["features"]
LIN = [LineString([fw.transform(*c) for c in f["geometry"]["coordinates"]]) for f in F]
por_way = collections.defaultdict(list)
for i, f in enumerate(F): por_way[f["properties"]["way"]].append(i)
for a, b in G.edges():
    m = Point((XY[a][0]+XY[b][0])/2, (XY[a][1]+XY[b][1])/2)
    cand = por_way.get(G[a][b]["way"], [])
    i = min(cand, key=lambda i: LIN[i].distance(m)) if cand else None
    ok = i is not None and LIN[i].distance(m) <= CERCA_M
    G[a][b]["tramo"] = i if ok else None
    G[a][b]["estado"] = F[i]["properties"]["color"] if ok else None

H = G.copy()
H.remove_edges_from([(a, b) for a, b, d in G.edges(data=True) if d["estado"] == "intransitable"])

def camino(k, p, ancla_frac):
    L = LineString([XY[x] for x in p])
    km = collections.Counter(); cortes = {}
    for a, b in zip(p, p[1:]):
        d = G[a][b]; km[d["estado"]] += d["w"]
        if d["estado"] == "intransitable" and d["tramo"] not in cortes:
            pr = F[d["tramo"]]["properties"]; c = LIN[d["tramo"]].interpolate(0.5, normalized=True)
            cortes[d["tramo"]] = {"centro": ll(c.x, c.y), "motivo": pr["motivo"], "regla": pr["regla"]}
    a = L.interpolate(ancla_frac, normalized=True)
    return {"n": k, "km": round(L.length/1000, 1),
            "radar_km": {"transitable": round(km["transitable"]/1000, 1), "con_barro": round(km["con barro"]/1000, 1),
                         "intransitable": round(km["intransitable"]/1000, 1), "sin_dato": round(km["sin dato"]/1000, 1),
                         "sin_medir": round(km[None]/1000, 1)},
            "cortes": list(cortes.values()), "ancla": ll(a.x, a.y),
            "coords": [ll(x, y) for x, y in L.simplify(3.0).coords]}, L

res = {"_fuentes": {
    "estado": "Radar NISAR (GCOV, banda L). Estado de cada tramo de 1 km según analisis/baqui/medir.py.",
    "caminos": "OpenStreetMap (ODbL), " + osm["_fuente"]["descarga"] + " (osm/caminos_osm.json).",
    "camino_2": f"El más corto que no pisa tramos intransitables. Si es más de {DESVIO_MAX:g} veces el camino 1, no cuenta.",
    "generador": "src/views/4-demo/generar_estado_radar.py"},
    "radar": {"fecha": medido["baqui"]["hoy"], "pasada": medido["baqui"]["despues"], "referencia": medido["baqui"]["referencia"]},
    "destino_inicial": DESTINOS[0][0],
    "origen": {"lat": r5(pos[o][0]), "lon": r5(pos[o][1]), "osm_nodo": o},
    "destinos": []}

for did, lid, esperado in DESTINOS:
    if did in SIN_NOMBRE:
        lid, nombre, place = SIN_NOMBRE[did]; n = lid; lat, lon = pos[n]
    else:
        place, nombre, lat, lon = LUGARES[lid]
        n = nearest((lat, lon))
    p1 = nx.shortest_path(G, o, n, weight="w")
    c1, L1 = camino(1, p1, 1/3)
    caminos = [c1]; alternativa = {"existe": False, "motivo": "no_hace_falta", "km": None}
    if c1["cortes"]:
        try:
            p2 = nx.shortest_path(H, o, n, weight="w")
            c2, L2 = camino(2, p2, 0.5)
            if L2.length > DESVIO_MAX * L1.length:
                alternativa = {"existe": False, "motivo": "desvio_mas_del_doble", "km": c2["km"]}
            else:
                # Cartel del camino 2 en su tramo propio (lejos del camino 1).
                lejos = [s for s in range(0, int(L2.length), 250) if L2.interpolate(s).distance(L1) > 1500]
                a = L2.interpolate(lejos[len(lejos)//2] if lejos else L2.length/2); c2["ancla"] = ll(a.x, a.y)
                # El cartel del camino 2 va del lado opuesto al corte, para no tapar su rótulo.
                c2["cartel_lado"] = "left" if c1["cortes"][0]["centro"][1] > c2["ancla"][1] else "right"
                alternativa = {"existe": True, "motivo": "camino_2_libre", "km": c2["km"]}; caminos.append(c2)
        except nx.NetworkXNoPath:
            alternativa = {"existe": False, "motivo": "sin_otro_camino", "km": None}
    da = (("desvío" if alternativa["existe"] else "sin salida") if c1["cortes"]
          else "con barro" if c1["radar_km"]["con_barro"] > 0 else "transitable")
    assert da == esperado, f"{did}: da {da}, se esperaba {esperado}"
    print(did, nombre, place, [(c["km"], c["radar_km"], len(c["cortes"])) for c in caminos], alternativa)
    res["destinos"].append({"id": did, "nombre": nombre, "place_osm": place, "osm_nodo": lid, "lat": lat, "lon": lon,
                            "alternativa": alternativa, "caminos": caminos})

json.dump(res, open(os.path.join(AQUI, "rutas.json"), "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))

# Capa del mapa: todos los tramos medidos, agrupados por estado.
capa = {e: [] for e in ESTADOS}
for f, L in zip(F, LIN):
    capa[f["properties"]["color"]].append([ll(x, y) for x, y in L.simplify(5.0).coords])
out = os.path.join(AQUI, "estado_radar.json")
json.dump({"radar": res["radar"], "tramos": {e: len(v) for e, v in capa.items()}, "lineas": capa},
          open(out, "w", encoding="utf8"), ensure_ascii=False, separators=(",", ":"))
print({e: len(v) for e, v in capa.items()}, os.path.getsize(out), "bytes")
