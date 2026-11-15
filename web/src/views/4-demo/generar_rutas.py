# Genera rutas.json para la demo (sección 4): "¿llegás hoy?".
# Correr (desde la carpeta web):
#   C:/Users/Usuario/envs/nasa/Scripts/python.exe -I src/views/4-demo/generar_rutas.py
#
# Origen de cada dato:
# - Caminos y lugares: OpenStreetMap (ODbL), en osm/caminos_osm.json (esta carpeta). Es una descarga de
#   Overpass con TODAS las clases de camino para autos (primary, secondary, tertiary, unclassified,
#   residential, track, service...), en un recuadro más grande que la zona de la demo, así no aparecen
#   "callejones sin salida" falsos en el borde. Las consultas exactas y la fecha están en ese archivo (_fuente).
#   (datos/osm/roads.json, la descarga anterior, traía solo unclassified/tertiary/track: con esa red,
#   lugares que tienen varios accesos parecían de un solo camino. Por eso no se usa más acá.)
# - Grafo: nodos OSM compartidos = cruces; peso = largo en metros (haversine).
# - Camino 1: el más corto por la red.
# - Camino 2 (alternativo): el más corto que NO pisa el agua nueva de hoy (se sacan del grafo los tramos que
#   toca una mancha de agua nueva). Si no existe, o es más del doble de largo que el camino 1, el destino
#   queda "sin camino alternativo" y no se dibuja camino 2.
# - Tramo único: el tramo más largo del camino 1 hecho de "puentes" del grafo (tramos que, si se cortan,
#   dejan al destino sin conexión con el origen). Si mide 500 m o más, el destino es de "un solo camino".
#   Ojo: es "un solo camino según OpenStreetMap". Una huella o un camino interno de un campo que no esté
#   cargado en OSM no se ve acá.
# - AGUA: SIMULADA para la demo. No es una medición. Una sola capa de agua "de hoy" para todos los destinos.
#   Cada mancha solo puede tocar caminos con surface de tierra en OSM (TIERRA, abajo): el script frena si
#   toca un camino pavimentado o sin dato de superficie.
import json, math, os
import networkx as nx
from shapely.geometry import LineString, Polygon
from shapely.affinity import translate
from shapely.strtree import STRtree
from pyproj import Transformer

AQUI = os.path.dirname(os.path.abspath(__file__))
OSM = os.path.join(AQUI, "osm", "caminos_osm.json")
OUT = os.path.join(AQUI, "rutas.json")
ORIGEN = (-26.537, -59.342)  # centro de General San Martín (Chaco), aprox.
TIERRA = {"unpaved", "dirt", "ground", "earth", "mud", "sand"}  # surface de OSM que cuenta como camino de tierra
UN_SOLO_CAMINO_MIN_M = 500   # tramo único desde el que se dice "un solo camino"
DESVIO_MAX = 2.0             # un desvío de más del doble del camino 1 no se cuenta como camino alternativo

# Destinos: nodos place=* de OSM (el nombre y el tipo salen del archivo de OSM, no se escriben acá).
# Orden de la lista en la demo: el que abre (TRANSITABLE), el del camino 2 y después los que no tienen otro camino.
# Qué tiene que dar cada uno con el agua de hoy (el script frena si no da):
DESTINOS = [
    ("villa-jardin", 2064863686, "llegas"),        # hamlet. Un solo camino al final (0,6 km de puentes), hoy sin agua.
    ("siete-arboles", 7501783098, "alternativo"),  # hamlet. El agua corta la RP3 bis (tierra); hay desvío.
    ("laguna-el-lobo", 7501796917, "no-llegas"),   # hamlet. Un solo camino: los últimos 4,6 km son puentes del grafo.
]
DESTINO_INICIAL = DESTINOS[0][0]  # la demo abre con el destino TRANSITABLE
# Buscados y descartados para "no hay otro camino" (15/11, con la red completa): se recorrieron todos los lugares
# place=* de OSM a menos de 70 km. El único con un tramo único (puentes del grafo) de 500 m o más que además tenga
# un pedazo de tierra según OSM (surface) donde poner el agua es Laguna El Lobo. Lote 20 (2,4 km de tramo único) y
# Colonia Villa Jardín (0,6 km) tienen tramo único, pero sin dato de superficie: el agua no se puede poner ahí.
# Campo La Aurora y Puerto El Zapallar: con todas las clases de camino tienen otros accesos.
# Revisado otra vez (15/11): (a) cortando de a uno cada puente de tierra del grafo, el único lugar place=* que queda
# aislado es Laguna El Lobo; (b) contar como tierra los highway=track sin surface no suma ninguno: ningún tramo único
# de los lugares tiene tracks (Lote 16, Villa Jardín, Rincon de Luna, Laguna Gobernador y Lote 20 son todos
# unclassified sin dato). Por eso hay un solo INTRANSITABLE: para tener dos habría que aceptar "unclassified sin
# dato de superficie" como tierra, y eso lo decide el equipo, no el script.

fw = Transformer.from_crs(4326, 32721, always_xy=True)  # UTM 21S, metros
bw = Transformer.from_crs(32721, 4326, always_xy=True)
def to_m(lat, lon): return fw.transform(lon, lat)
def to_ll(x, y):
    lon, lat = bw.transform(x, y); return lat, lon
def hav(a, b):
    R = 6371008.8
    la1, lo1 = map(math.radians, a); la2, lo2 = map(math.radians, b)
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 2*R*math.asin(math.sqrt(h))
def r6(v): return round(v, 6)

# --- Grafo de caminos ---
osm = json.load(open(OSM, encoding="utf8"))
G = nx.Graph(); pos = {}
for wid, hw, surf, nombre, nodos, geo in osm["ways"]:
    for n, (la, lo) in zip(nodos, geo): pos[n] = (la, lo)
    for a, b in zip(nodos, nodos[1:]):
        G.add_edge(a, b, w=hav(pos[a], pos[b]), surf=surf, way=wid)
comp = max(nx.connected_components(G), key=len)
G = G.subgraph(comp).copy()
PUENTES = set(frozenset(x) for x in nx.bridges(G))
XY = {n: to_m(*pos[n]) for n in comp}
nearest = lambda p: min(comp, key=lambda n: hav(p, pos[n]))
o = nearest(ORIGEN)
LUGARES = {lid: (place, nombre, lat, lon) for lid, place, nombre, lat, lon in osm["lugares"]}

# Índice de todos los tramos, para saber qué caminos toca cada mancha de agua.
ARISTAS = list(G.edges())
LINEAS = [LineString([XY[a], XY[b]]) for a, b in ARISTAS]
ARBOL = STRtree(LINEAS)
def tocados(P):
    """Tramos del grafo que toca el polígono P."""
    return [ARISTAS[i] for i in ARBOL.query(P) if LINEAS[i].intersects(P)]

def linea(p): return LineString([XY[x] for x in p])
def edges(p): return list(zip(p, p[1:]))

def mancha(L, s, a, b, semilla, ruido=0.18, n=44):
    """Agua SIMULADA: elipse orientada al camino (a = semieje a lo largo, b = a lo ancho) con borde irregular."""
    p = L.interpolate(s); q = L.interpolate(min(L.length, s+30)); r = L.interpolate(max(0, s-30))
    ang = math.atan2(q.y-r.y, q.x-r.x)
    pts = []
    for i in range(n):
        t = 2*math.pi*i/n
        f = 1 + ruido*(0.6*math.sin(3*t+semilla) + 0.3*math.sin(5*t+2*semilla) + 0.25*math.sin(7*t+0.5*semilla))
        x = a*f*math.cos(t); y = b*f*math.sin(t)
        pts.append((p.x + x*math.cos(ang) - y*math.sin(ang), p.y + x*math.sin(ang) + y*math.cos(ang)))
    return Polygon(pts), ang

def max_seguido(L, nuevas, siempre, paso=5.0):
    """Misma regla que logica.ts: metros seguidos tapados por agua nueva (lagunas de siempre no cuentan)."""
    mejor = cur = 0.0; s = 0.0
    while s <= L.length:
        pt = L.interpolate(s)
        tap = any(P.contains(pt) for P in nuevas) and not any(P.contains(pt) for P in siempre)
        cur = cur+paso if tap else 0.0; mejor = max(mejor, cur); s += paso
    return mejor

def tramo_unico(p):
    """Tramo más largo del camino 1 hecho de puentes del grafo: (desde_m, hasta_m) medidos desde el origen."""
    mejor = (0.0, 0.0); ini = None; s = 0.0
    for a, b in edges(p):
        if frozenset((a, b)) in PUENTES:
            if ini is None: ini = s
        elif ini is not None:
            if s - ini > mejor[1] - mejor[0]: mejor = (ini, s)
            ini = None
        s += G[a][b]["w"]
    if ini is not None and s - ini > mejor[1] - mejor[0]: mejor = (ini, s)
    return mejor

def tramo_de_tierra(p, desde_m, hasta_m):
    """Pedazos [ini, fin] (m) del camino p, dentro de [desde_m, hasta_m], hechos solo de tramos de tierra."""
    out = []; ini = None; s = 0.0
    for a, b in edges(p):
        w = G[a][b]["w"]; dentro = desde_m <= s and s + w <= hasta_m + 1
        if dentro and G[a][b]["surf"] in TIERRA:
            if ini is None: ini = s
        elif ini is not None:
            out.append((ini, s)); ini = None
        s += w
    if ini is not None: out.append((ini, s))
    return out

def tramo_de_way(p, way_id):
    """[ini, fin] (m) del camino p que va por el way de OSM way_id."""
    s = 0.0; ini = fin = None
    for a, b in edges(p):
        if G[a][b]["way"] == way_id:
            if ini is None: ini = s
            fin = s + G[a][b]["w"]
        s += G[a][b]["w"]
    assert ini is not None, f"el camino no pasa por el way {way_id}"
    return ini, fin

# --- Rutas más cortas (camino 1) ---
nodo = {did: nearest(LUGARES[lid][2:4]) for did, lid, _ in DESTINOS}
P1 = {did: nx.shortest_path(G, o, n, weight="w") for did, n in nodo.items()}
L1 = {did: linea(p) for did, p in P1.items()}

# --- Agua de hoy (SIMULADA), una sola capa para todos los destinos ---
agua = []
# 1) Laguna El Lobo: agua nueva que cruza el camino en su tramo único, donde OSM dice que es de tierra
#    (way 802013124, surface=unpaved). Es una franja angosta a lo largo del camino y ancha de costado:
#    un bajo inundado que corta el camino entrando al paraje.
d_, h_ = tramo_unico(P1["laguna-el-lobo"])
ini, fin = max(tramo_de_tierra(P1["laguna-el-lobo"], d_, h_), key=lambda t: t[1] - t[0])
#    La tierra (según OSM) son solo los últimos 240 m antes del paraje: el agua va lo más lejos del paraje que se
#    pueda sin salir de la tierra (empieza en el comienzo del tramo de tierra), así en el mapa no queda abajo del
#    marcador del paraje y se ve que lo inundado es el camino.
a_lobo = min(55, (fin - ini) / 2 - 20)
P = None
for s in range(int(ini + a_lobo + 5), int((ini + fin) / 2) + 1, 5):
    Q, _ = mancha(L1["laguna-el-lobo"], s, a_lobo, 200, 1.7, ruido=0.12)
    if all(G[x][y]["surf"] in TIERRA for x, y in tocados(Q)):
        P = Q; break
assert P is not None, "no hay lugar de tierra para el agua de Laguna El Lobo"
agua.append(("agua-1", "agua_nueva", P))
# 2) Siete Árboles: agua nueva sobre la RP3 bis (tertiary, surface=unpaved). Ese tramo no es paso obligado:
#    hay desvío por otros caminos (camino 2).
#    Se busca el lugar y el tamaño más grande (empezando por el medio del tramo) que toque solo caminos de tierra.
RP3_BIS = 117754286  # way de OSM: tertiary, ref "RP3 bis", surface=unpaved
tierra_sa = tramo_de_way(P1["siete-arboles"], RP3_BIS)
medio = (tierra_sa[0] + tierra_sa[1]) / 2
P = None
for a_, b_ in [(520, 380), (420, 300), (320, 240), (240, 180)]:
    for s in sorted(range(int(tierra_sa[0]) + a_ + 100, int(tierra_sa[1]) - a_ - 100, 50), key=lambda x: abs(x - medio)):
        Q, _ = mancha(L1["siete-arboles"], s, a_, b_, 2.1, ruido=0.18)
        if all(G[a][b]["surf"] in TIERRA for a, b in tocados(Q)):
            P = Q; break
    if P is not None: break
assert P is not None, "no hay lugar de tierra para el agua de Siete Árboles"
agua.append(("agua-2", "agua_nueva", P))
# 3) Laguna de siempre (simulada) al costado de la RP32 (tierra), camino 1 de Siete Árboles: la toca, pero no cuenta.
tierra_rp32 = tramo_de_tierra(P1["siete-arboles"], 0, 9000)
ini, fin = max(tierra_rp32, key=lambda t: t[1] - t[0])
#    Tiene que tocar el camino (si contara, lo taparía 50 m o más) y solo caminos de tierra.
P = None
for s in sorted(range(int(ini) + 700, int(fin) - 700, 50), key=lambda x: abs(x - (ini + fin) / 2)):
    Q, ang = mancha(L1["siete-arboles"], s, 600, 400, 2.3, ruido=0.12)
    Q = translate(Q, math.sin(ang)*370, -math.cos(ang)*370)
    if all(G[a][b]["surf"] in TIERRA for a, b in tocados(Q)) and max_seguido(L1["siete-arboles"], [Q], []) >= 50:
        P = Q; break
assert P is not None, "no hay lugar de tierra para la laguna de siempre"
agua.append(("laguna-1", "laguna_siempre", P))

GRANDES = [P for _, t, P in agua if t == "agua_nueva"]
# Grafo sin los tramos que pisa el agua nueva (para buscar el camino alternativo).
H = G.copy()
H.remove_edges_from([e for P in GRANDES for e in tocados(P)])

# 4) Charco chico sobre el camino 2 de Siete Árboles, en un tramo de tierra lejos del camino 1:
#    lo cruza unos 30 m (no llega a 50 m), se pasa igual.
p2_sa = nx.shortest_path(H, o, nodo["siete-arboles"], weight="w"); L2_sa = linea(p2_sa)
charco = None
cands = []
for ini, fin in tramo_de_tierra(p2_sa, 0, L2_sa.length):
    s = ini + 150
    while s < fin - 150:
        if L2_sa.interpolate(s).distance(L1["siete-arboles"]) > 1200: cands.append(s)
        s += 100
for s in sorted(cands, key=lambda x: abs(x - L2_sa.length / 2)):
    P, _ = mancha(L2_sa, s, 15.5, 110, 0.7, ruido=0.04, n=36)
    if all(G[a][b]["surf"] in TIERRA for a, b in tocados(P)) and 20 <= max_seguido(L2_sa, [P], []) < 50:
        charco = P; break
assert charco is not None, "no hay lugar de tierra para el charco"
agua.append(("charco-1", "charco", charco))

NUEVAS = [P for _, t, P in agua if t != "laguna_siempre"]
SIEMPRE = [P for _, t, P in agua if t == "laguna_siempre"]

# Ninguna mancha toca un camino que no sea de tierra.
for aid, _, P in agua:
    malos = {(G[a][b]["way"], G[a][b]["surf"]) for a, b in tocados(P) if G[a][b]["surf"] not in TIERRA}
    assert not malos, f"{aid} toca caminos que no son de tierra: {malos}"

res = {"_fuentes": {
    "caminos": "OpenStreetMap (ODbL), " + osm["_fuente"]["descarga"] + ", todas las clases de camino para autos (osm/caminos_osm.json).",
    "lugares": "OpenStreetMap (ODbL), nodos place=* (osm/caminos_osm.json).",
    "camino_2": f"Alternativo: el más corto que no pisa el agua nueva. Si no hay, o es más de {DESVIO_MAX:g} veces el camino 1, no hay camino alternativo.",
    "tramo_unico_km": "[desde, hasta] del tramo más largo del camino 1 hecho de puentes del grafo de OSM: ahí no hay otra forma de llegar (según OSM).",
    "un_solo_camino": f"true si el tramo único mide {UN_SOLO_CAMINO_MIN_M} m o más.",
    "agua": "SIMULADA para la demo. No es una medición. Cada mancha toca solo caminos de tierra (surface de OSM en superficies_tierra).",
    "generador": "src/views/4-demo/generar_rutas.py"},
    "superficies_tierra": sorted(TIERRA),
    "destino_inicial": DESTINO_INICIAL,
    "origen": {"lat": r6(pos[o][0]), "lon": r6(pos[o][1]), "osm_nodo": o},
    "destinos": [], "agua": []}

def stats(p):
    t = {"tierra": 0, "pavimento": 0, "sin_dato": 0}
    for a, b in edges(p):
        s = G[a][b]["surf"]
        t["tierra" if s in TIERRA else "sin_dato" if s is None else "pavimento"] += G[a][b]["w"]
    return {k: round(v/1000, 1) for k, v in t.items()}

def camino(k, L, p, ancla_m):
    a = L.interpolate(ancla_m); al = to_ll(a.x, a.y)
    # Douglas-Peucker a 3 m: los caminos del Chaco son rectos, quedan pocos puntos sin perder forma.
    coords = [[r6(la), r6(lo)] for la, lo in (to_ll(x, y) for x, y in L.simplify(3.0).coords)]
    return {"n": k, "km": round(L.length/1000, 1), "km_por_superficie_osm": stats(p),
            "ancla": [r6(al[0]), r6(al[1])], "coords": coords}

# Mapa de escritorio (1440x900): 1280x558 px, con el panel de la izquierda (margen de 484 px) y 72/56 px de borde.
MAPA_PX = (1280 - 484 - 72, 558 - 2*56)
CARTEL_PX = (290, 48)   # cartel "Camino 1 · 34,2 km · Transitable" con su raya, en px (con margen)

def ancla_cartel_solo(L, unico, extra_xy):
    """Destino con un solo camino: el cartel va ANTES del tramo único (lo que muestra que no hay otro camino no se
    tapa) y del lado (derecha o izquierda del ancla) donde no tapa el camino, el origen ni el destino.
    Se estima la escala del mapa de escritorio con el encuadre del recorrido. Devuelve (metros, "right"|"left")."""
    xs = [x for x, _ in L.coords] + [x for x, _ in extra_xy]; ys = [y for _, y in L.coords] + [y for _, y in extra_xy]
    mpp = 1.15 * max((max(xs) - min(xs)) / MAPA_PX[0], (max(ys) - min(ys)) / MAPA_PX[1])  # metros por px (+ redondeo del zoom)
    muestras = [L.interpolate(s) for s in range(0, int(L.length), 20)]
    marcas = [p for p in extra_xy]
    mejor = None
    for s in range(int(0.15 * unico[0]), int(0.85 * unico[0]), 100):
        a = L.interpolate(s)
        for lado in ("right", "left"):
            x0, x1 = (a.x + 8*mpp, a.x + CARTEL_PX[0]*mpp) if lado == "right" else (a.x - CARTEL_PX[0]*mpp, a.x - 8*mpp)
            y0, y1 = a.y - CARTEL_PX[1]/2*mpp, a.y + CARTEL_PX[1]/2*mpp
            if lado == "left" and (a.x - min(xs)) / mpp < CARTEL_PX[0] + 20: continue  # quedaría abajo del panel
            dentro = sum(1 for p in muestras if x0 <= p.x <= x1 and y0 <= p.y <= y1)
            # Origen y destino: cuentan con su nombre (unos 200 x 50 px alrededor del punto).
            dentro += 50 * sum(1 for x, y in marcas if x0 - 100*mpp <= x <= x1 + 100*mpp and y0 - 40*mpp <= y <= y1 + 25*mpp)
            clave = (dentro, abs(s - unico[0] / 2), lado != "right")
            if mejor is None or clave < mejor[0]: mejor = (clave, s, lado)
    assert mejor is not None
    print("  cartel de un solo camino: km", round(mejor[1]/1000, 1), mejor[2], "| puntos tapados:", mejor[0][0])
    return mejor[1], mejor[2]

def ancla_cartel(L):
    """Cartel antes de la primera agua que tapa el camino (así no la tapa); si no hay agua, a un tercio.
    Si el agua está en el último 20 % del camino (llegando al paraje), el cartel va a mitad de camino entre el origen
    y el agua, así no tapa el agua ni el nombre del destino.
    Si el destino tiene tramo único (un solo camino), el cartel va antes de ese tramo (a mitad de camino entre el
    origen y donde empieza): el tramo único es lo que muestra que no hay otro camino y no se tiene que tapar.
    (Ese caso lo resuelve ancla_cartel_solo.)"""
    s = 0.0; inicio = None
    while s <= L.length:
        pt = L.interpolate(s)
        tap = any(P.contains(pt) for P in NUEVAS) and not any(P.contains(pt) for P in SIEMPRE)
        if tap and inicio is None: inicio = s
        if not tap: inicio = None
        if inicio is not None and s - inicio + 5 >= 50:
            if inicio > 0.8 * L.length: return max(L.length / 5, min(inicio - 1500, inicio / 2))
            return max(L.length / 5, inicio - max(1500, L.length * 0.3))
        s += 5
    return L.length / 3

for did, lid, esperado in DESTINOS:
    place, nombre, lat, lon = LUGARES[lid]
    n = nodo[did]; p1 = P1[did]; La = L1[did]
    tap1 = max_seguido(La, NUEVAS, SIEMPRE)
    unico = tramo_unico(p1)
    if unico[1] - unico[0] >= UN_SOLO_CAMINO_MIN_M and unico[0] > 1000:
        s_, lado_ = ancla_cartel_solo(La, unico, [XY[o], to_m(lat, lon)])
        caminos = [camino(1, La, p1, s_)]; caminos[0]["cartel_lado"] = lado_
    else:
        caminos = [camino(1, La, p1, ancla_cartel(La))]
    alternativa = {"existe": False, "motivo": "no_hace_falta", "km": None}
    if tap1 >= 50:
        try:
            p2 = nx.shortest_path(H, o, n, weight="w")
            L2 = linea(p2)
            if L2.length > DESVIO_MAX * La.length:
                alternativa = {"existe": False, "motivo": "desvio_mas_del_doble", "km": round(L2.length/1000, 1)}
            else:
                assert max_seguido(L2, NUEVAS, SIEMPRE) < 50, "el camino 2 no puede pisar el agua"
                alternativa = {"existe": True, "motivo": "camino_2_libre", "km": round(L2.length/1000, 1)}
                # Cartel del camino 2 en su tramo propio (lejos del camino 1).
                s = 0.0; mejor = (0.0, 0.0); ini = None
                while s <= L2.length:
                    lejos = L2.interpolate(s).distance(La) > 450
                    if lejos and ini is None: ini = s
                    if not lejos and ini is not None:
                        if s - ini > mejor[1] - mejor[0]: mejor = (ini, s)
                        ini = None
                    s += 25
                if ini is not None and L2.length - ini > mejor[1] - mejor[0]: mejor = (ini, L2.length)
                caminos.append(camino(2, L2, p2, (mejor[0] + mejor[1]) / 2))
        except nx.NetworkXNoPath:
            alternativa = {"existe": False, "motivo": "sin_otro_camino", "km": None}
    v ="llegas" if tap1 < 50 else "alternativo" if alternativa["existe"] else "no-llegas"
    assert v == esperado, f"{did}: da {v}, se esperaba {esperado}"
    print(did, nombre, place, "km", round(La.length/1000, 1), "| tapado seguido camino 1:", tap1,
          "| alternativa:", alternativa, "| tramo único km:", [round(x/1000, 1) for x in unico],
          "| laguna si contara:", max_seguido(La, SIEMPRE, []))
    res["destinos"].append({"id": did, "nombre": nombre, "place_osm": place, "osm_nodo": lid, "lat": lat, "lon": lon,
                            "tramo_unico_km": [round(x/1000, 1) for x in unico],
                            "un_solo_camino": unico[1] - unico[0] >= UN_SOLO_CAMINO_MIN_M,
                            "alternativa": alternativa, "caminos": caminos})

for aid, t, P in agua:
    c = P.centroid; cl = to_ll(c.x, c.y)
    ways = sorted({(G[a][b]["way"], G[a][b]["surf"]) for a, b in tocados(P)}, key=lambda x: x[0])
    res["agua"].append({"id": aid, "tipo": t, "simulado": True, "centro": [r6(cl[0]), r6(cl[1])],
                        "caminos_osm_tocados": [{"way": w, "surface": s} for w, s in ways],
                        "coords": [[r6(la), r6(lo)] for la, lo in (to_ll(x, y) for x, y in list(P.exterior.coords)[:-1])]})
    print(aid, t, "toca:", ways)

with open(OUT, "w", encoding="utf8") as f:
    json.dump(res, f, ensure_ascii=False, separators=(",", ":"))
print("escrito", OUT, os.path.getsize(OUT), "bytes")
