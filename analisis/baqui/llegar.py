"""¿Se puede llegar al destino?

Los caminos ya están definidos (OpenStreetMap): Baqui no inventa rutas. Busca, entre
los caminos que existen, el recorrido cuyo PEOR tramo sea el mejor posible (el
eslabón más débil del viaje), y desempata por distancia.

    llegás              -> hay un recorrido todo verde
    llegás con barro    -> el mejor recorrido tiene algún tramo amarillo
    no llegás           -> todos los recorridos pasan por un tramo rojo
    sin dato            -> el mejor recorrido depende de un tramo sin dato
"""
import networkx as nx

GRAVEDAD = {"transitable": 0, "con barro": 1, "sin dato": 2, "dato viejo": 2, "intransitable": 3}
RESPUESTA = {0: "llegás", 1: "llegás con barro", 2: "sin dato", 3: "no llegás"}


def _gravedad(color):
    """Un color desconocido cuenta como 'sin dato': nunca como transitable."""
    return GRAVEDAD.get(color, GRAVEDAD["sin dato"])


def mejor_recorrido(G: nx.Graph, origen, destino):
    """G: grafo con atributos 'color' y 'largo_m' en cada tramo (arista)."""
    if origen not in G or destino not in G:
        raise ValueError("el origen o el destino no están en el mapa de caminos")
    for nivel in range(4):
        H = nx.subgraph_view(G, filter_edge=lambda u, v, *k: _gravedad(_dato(G, u, v, k)["color"]) <= nivel)
        try:
            camino = nx.shortest_path(H, origen, destino, weight="largo_m")
        except nx.NetworkXNoPath:
            continue
        tramos = list(zip(camino, camino[1:]))
        peor = max(tramos, key=lambda t: _gravedad(_dato(G, *t, ())["color"]))
        largo = sum(_dato(G, *t, ())["largo_m"] for t in tramos)
        return {"respuesta": RESPUESTA[nivel], "nodos": camino, "largo_m": largo,
                "tramo_peor": peor, "color_peor": _dato(G, *peor, ())["color"]}
    return {"respuesta": "no llegás", "nodos": [], "largo_m": 0,
            "tramo_peor": None, "color_peor": None, "motivo": "no hay caminos que lleguen"}


def _dato(G, u, v, k):
    d = G.get_edge_data(u, v)
    if G.is_multigraph():
        if k:
            return d[k[0]]
        return min(d.values(), key=lambda e: _gravedad(e["color"]))
    return d
