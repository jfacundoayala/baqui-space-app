import numpy as np
from shapely.geometry import LineString

from baqui.clasificador import Tramo, clasificar, ROJO, AMARILLO, VERDE
from baqui.medir import Cortes, clases, cortar, medir_tramo, otsu, tipo

# Grilla de 20 m como la de NISAR: x crece al este, y baja al sur
X = np.arange(0, 2000, 20.0)
Y = np.arange(1000, 0, -20.0)
CAMINO = LineString([(100, 500), (1900, 500)])


def mapas_vacios():
    forma = (len(Y), len(X))
    m = {k: np.zeros(forma, bool) for k in ("siempre", "nueva", "bajo_monte", "mojado")}
    m["ok"] = np.ones(forma, bool)
    return m


def zona(m, clave, x0, x1, y0=440, y1=560):
    cx = (X >= x0) & (X <= x1)
    fy = (Y >= y0) & (Y <= y1)
    m[clave][np.ix_(fy, cx)] = True


def test_otsu_separa_dos_grupos():
    rng = np.random.default_rng(1)
    v = np.r_[rng.normal(-22, 1, 3000), rng.normal(-8, 1, 7000)]
    assert -20 < otsu(v) < -10


def test_charco_de_100_m_da_rojo():
    m = mapas_vacios()
    zona(m, "nueva", 800, 900)
    med = medir_tramo(CAMINO, m, X, Y)
    assert 100 <= med["agua_seguida_m"] <= 120
    assert med["N"] > 0 and med["agua_pct"] > 0
    assert clasificar(Tramo(E=0, **med)).color == ROJO


def test_agua_lejos_del_camino_no_cuenta():
    m = mapas_vacios()
    zona(m, "nueva", 800, 1200, y0=700, y1=900)   # a 200 m del eje
    med = medir_tramo(CAMINO, m, X, Y)
    assert med["agua_seguida_m"] == 0 and med["agua_pct"] == 0
    assert clasificar(Tramo(E=0, **med)).color == VERDE


def test_pintitas_sueltas_no_suman_metros_seguidos():
    m = mapas_vacios()
    for x0 in range(200, 1800, 200):              # un píxel cada 200 m
        zona(m, "nueva", x0, x0, 500, 500)
    assert medir_tramo(CAMINO, m, X, Y)["agua_seguida_m"] == 20


def test_barro_en_media_franja_da_amarillo():
    m = mapas_vacios()
    zona(m, "mojado", 100, 1000)
    med = medir_tramo(CAMINO, m, X, Y)
    assert med["suelo_mojado_pct"] >= 30
    assert clasificar(Tramo(E=0, **med)).color == AMARILLO


def test_pixeles_invalidos_no_cuentan():
    m = mapas_vacios()
    m["ok"][:] = False
    assert medir_tramo(CAMINO, m, X, Y)["N"] == 0


def test_tramo_fuera_de_la_imagen():
    lejos = LineString([(5000, 5000), (6000, 5000)])
    assert medir_tramo(lejos, mapas_vacios(), X, Y)["N"] == 0


def test_clases_de_pixeles():
    forma = (4, 4)
    tierra = np.full(forma, -8.0)
    antes = {"hh": tierra.copy(), "hv": np.full(forma, -20.0)}
    antes["hh"][0, 0] = -24                         # laguna de siempre
    antes["hv"][3, :] = -10                         # fila de monte
    despues = {"hh": tierra.copy()}
    despues["hh"][0, 0] = -24
    despues["hh"][1, 1] = -24                       # agua nueva
    despues["hh"][2, 2] = -6                        # +2 dB en suelo abierto: mojado
    despues["hh"][3, 3] = -4                        # +6 dB en monte: doble rebote
    m, info = clases(antes, despues, Cortes(limpiar=False))
    assert m["siempre"][0, 0] and not m["nueva"][0, 0]
    assert m["nueva"][1, 1] and m["mojado"][2, 2] and m["bajo_monte"][3, 3]
    assert m["nueva"].sum() == 1 and m["mojado"].sum() == 1 and m["bajo_monte"].sum() == 1
    assert info["corte_agua_despues"] <= Cortes().tope_agua


def test_cortar_y_tipo():
    piezas = cortar(LineString([(0, 0), (2500, 0)]), 1000)
    assert [round(p.length) for p in piezas] == [1000, 1000, 500]
    assert [round(p.length) for p in cortar(LineString([(0, 0), (2300, 0)]), 1000)] == [1000, 1300]
    assert tipo({"surface": "asphalt"}) == "asfalto"
    assert tipo({"surface": "gravel"}) == "ripio"
    assert tipo({}) == "tierra"


def test_limpieza_borra_pixel_suelto_y_deja_charco():
    forma = (12, 12)
    antes = {"hh": np.full(forma, -8.0), "hv": np.full(forma, -20.0)}
    antes["hv"][:, :2] = -10                        # algo de monte para que Otsu de HV tenga dos grupos
    despues = {"hh": np.full(forma, -8.0)}
    despues["hh"][1, 9] = -24                       # píxel suelto
    despues["hh"][5:9, 5:9] = -24                   # charco de 4 × 4
    m, _ = clases(antes, despues)
    assert not m["nueva"][1, 9]
    assert m["nueva"][6, 6] and m["nueva"].sum() >= 4
