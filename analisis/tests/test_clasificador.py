from baqui.clasificador import Tramo, clasificar, ROJO, AMARILLO, VERDE, SIN_DATO, GRIS


def c(**kw):
    base = dict(N=100, E=2)
    base.update(kw)
    return clasificar(Tramo(**base))


def test_seco_es_verde():
    assert c().regla == "V"


def test_pozo_de_50_m_corta_el_camino():
    # eslabón más débil: 60 m de agua en un tramo de 500 m es rojo, aunque sea el 4 %
    r = c(agua_seguida_m=60, agua_pct=4)
    assert (r.color, r.regla) == (ROJO, "R1")


def test_agua_bajo_el_monte_es_rojo():
    assert c(monte_seguido_m=80).regla == "R2"


def test_charco_corto_es_amarillo():
    assert c(agua_seguida_m=25).color == AMARILLO


def test_prudencia_cerca_del_corte():
    assert c(agua_seguida_m=46).color == ROJO  # 46 m está a menos del 10 % de 50 m


def test_rojo_viejo_sigue_rojo():
    assert c(E=8, agua_seguida_m=100, lluvia_mm=30).color == ROJO


def test_llovio_mucho_despues_es_gris():
    r = c(E=6, lluvia_mm=30)
    assert (r.color, r.regla) == (GRIS, "G")


def test_dato_fresco_con_lluvia_usa_hand():
    assert c(E=2, lluvia_mm=20, hand_m=1.4).regla == "A3"  # bajo: aguanta 15 mm
    assert c(E=2, lluvia_mm=20, hand_m=8).color == VERDE   # alto: aguanta 50 mm


def test_sin_hand_usa_25_mm():
    assert c(E=2, lluvia_mm=24).color == AMARILLO  # 24 está a menos del 10 % de 25
    assert c(E=2, lluvia_mm=10).color == VERDE


def test_suelo_mojado_es_amarillo():
    assert c(suelo_mojado_pct=40, dM=0.08).regla == "A2"


def test_suelo_mojado_sin_lluvia_ni_zona_mojada_es_sospechoso():
    r = c(suelo_mojado_pct=40, dM=0.0, lluvia_mm=0)
    assert (r.regla, r.confianza) == ("A2b", "baja")


def test_asfalto_no_se_pinta_por_barro():
    assert c(T="asfalto", suelo_mojado_pct=80, lluvia_mm=40).color == VERDE


def test_asfalto_con_agua_es_rojo():
    assert c(T="asfalto", agua_seguida_m=70).color == ROJO


def test_ripio_aguanta_mas():
    assert c(T="ripio", E=2, lluvia_mm=20, hand_m=1.4).color == VERDE  # 15 x 1,5 = 22,5 mm


def test_sin_dato_por_calidad():
    assert c(N=5, agua_seguida_m=100).color == SIN_DATO
    assert c(misma_orbita=False).color == SIN_DATO
    assert c(E=15).color == SIN_DATO


def test_laguna_de_siempre_avisa():
    assert c(Wp=40).avisos


def test_motivo_explica_numeros():
    r = c(E=2, lluvia_mm=35, hand_m=1.4, fecha_pasada="11/10")
    assert "35 mm" in r.motivo and "15 mm" in r.motivo and "11/10" in r.motivo


def test_confianza():
    assert c(agua_seguida_m=60, otra_pasada_coincide=True).confianza == "alta"
    assert c(agua_seguida_m=60).confianza == "media"
    assert c(E=6, agua_seguida_m=60).confianza == "baja"


def test_nunca_verde_con_agua_seguida_o_lluvia_alta_en_bajo():
    for agua in (0, 20, 50, 200):
        for lluvia in (0, 14, 40):
            for E in (1, 3, 6, 10):
                r = c(agua_seguida_m=agua, lluvia_mm=lluvia, E=E, hand_m=1)
                if agua >= 50:
                    assert r.color == ROJO
                if r.color == VERDE:
                    assert agua < 18 and lluvia < 13.5, (agua, lluvia, E, r)
