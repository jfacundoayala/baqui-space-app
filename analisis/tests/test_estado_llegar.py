import networkx as nx
from baqui.estado import evolucionar, desde_radar, manana_sin_lluvia, Parametros, ROJO, AMARILLO, VERDE, SIN_DATO
from baqui.llegar import mejor_recorrido

F = [f"{d}/10" for d in range(11, 21)]


def test_radar_manda_el_dia_de_la_pasada():
    s = evolucionar(F[:1], [0], {"11/10": desde_radar(3.4)})
    assert s.hoy.color == ROJO and s.hoy.indice == 100


def test_si_sale_el_sol_se_seca():
    s = evolucionar(F, [0] * 10, {"11/10": desde_radar(2.4)})  # índice 80
    colores = [d.color for d in s.dias]
    assert colores[0] == ROJO and colores[-1] == VERDE
    assert all(a.indice >= b.indice for a, b in zip(s.dias, s.dias[1:]))   # nunca sube sin lluvia


def test_si_sigue_lloviendo_empeora():
    s = evolucionar(F[:4], [0, 10, 10, 10], {"11/10": desde_radar(1.2)})   # arranca en 40
    assert s.dias[0].color == AMARILLO and s.hoy.color == ROJO


def test_bajo_se_seca_mas_lento_que_loma():
    lluvia = [0] * 10
    bajo = evolucionar(F, lluvia, {"11/10": 80.0}, hand_m=1)
    loma = evolucionar(F, lluvia, {"11/10": 80.0}, hand_m=8)
    assert bajo.dias[4].indice > loma.dias[4].indice


def test_manana_si_no_llueve():
    s = evolucionar(F[:3], [0, 0, 0], {"11/10": 72.0})
    assert manana_sin_lluvia(s.hoy) in (AMARILLO, VERDE)


def test_sin_radar_mucho_tiempo_es_sin_dato():
    fechas = [str(i) for i in range(15)]
    s = evolucionar(fechas, [0] * 15, {"0": 50.0})
    assert s.hoy.color == SIN_DATO


def test_antes_del_primer_radar_es_sin_dato():
    s = evolucionar(F[:2], [0, 0], {"12/10": 10.0})
    assert s.dias[0].color == SIN_DATO and s.dias[1].color == VERDE


def test_agua_es_barro_100():
    assert desde_radar(0.5, agua_seguida_m=80) == 100


def red(colores):
    """Ruta 'R' (asfalto) -> A -> destino 'D' por dos caminos: corto (A-D) y largo (A-B-D)."""
    G = nx.Graph()
    G.add_edge("R", "A", color="transitable", largo_m=5000)
    G.add_edge("A", "D", color=colores[0], largo_m=2000)
    G.add_edge("A", "B", color=colores[1], largo_m=4000)
    G.add_edge("B", "D", color=colores[2], largo_m=4000)
    return G


def test_llegas_por_el_corto_si_todo_verde():
    r = mejor_recorrido(red(["transitable"] * 3), "R", "D")
    assert r["respuesta"] == "llegás" and r["largo_m"] == 7000


def test_si_el_corto_esta_cortado_va_por_el_largo():
    r = mejor_recorrido(red(["intransitable", "transitable", "transitable"]), "R", "D")
    assert r["respuesta"] == "llegás" and r["nodos"] == ["R", "A", "B", "D"]


def test_prefiere_largo_verde_a_corto_con_barro():
    r = mejor_recorrido(red(["con barro", "transitable", "transitable"]), "R", "D")
    assert r["respuesta"] == "llegás" and r["largo_m"] == 13000


def test_llegas_con_barro():
    r = mejor_recorrido(red(["con barro", "intransitable", "transitable"]), "R", "D")
    assert r["respuesta"] == "llegás con barro" and r["tramo_peor"] == ("A", "D")


def test_no_llegas_si_todos_cortados():
    r = mejor_recorrido(red(["intransitable", "intransitable", "transitable"]), "R", "D")
    assert r["respuesta"] == "no llegás"


def test_cuando_voy_a_poder_pasar():
    from baqui.estado import dias_hasta_pasar
    s = evolucionar(F[:1], [0], {"11/10": 90.0})
    bajo = dias_hasta_pasar(s.hoy, hand_m=1)
    loma = dias_hasta_pasar(s.hoy, hand_m=8)
    assert bajo > loma > 0
    assert dias_hasta_pasar(evolucionar(F[:1], [0], {"11/10": 10.0}).hoy) == 0


def test_un_solo_camino_vale_su_peor_tramo():
    G = nx.path_graph(["ruta", "t1", "t2", "campo"])
    for (u, v), c in zip(G.edges, ["transitable", "con barro", "transitable"]):
        G[u][v].update(color=c, largo_m=1000)
    r = mejor_recorrido(G, "ruta", "campo")
    assert r["respuesta"] == "llegás con barro" and r["tramo_peor"] == ("t1", "t2")
