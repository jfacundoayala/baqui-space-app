import csv, io
from baqui.auditoria import auditar, piso, casos_necesarios, informe
from baqui.sensibilidad import sensibilidad
from baqui.clasificador import Tramo

def casos(filas):
    return [dict(zip(["tramo", "fecha", "evento", "baqui", "real", "confianza"], f)) for f in filas]

def test_piso_20_de_20():
    assert round(piso(20, 20), 2) == 0.86

def test_casos_necesarios():
    assert casos_necesarios(0.95) == 59
    assert casos_necesarios(0.90) == 29

def test_escapado_se_cuenta_aparte():
    r = auditar(casos([
        ("1", "11/10", "A", "transitable", "no pasé", "media"),
        ("2", "11/10", "A", "intransitable", "no pasé", "alta"),
        ("3", "11/10", "A", "transitable", "pasé", "alta"),
    ]))
    assert r["escapados"] == 1 and r["no_pase"] == 2 and len(r["errores"]) == 1

def test_evento_de_calibracion_no_cuenta():
    r = auditar(casos([
        ("1", "11/10", "cal", "transitable", "pasé", "alta"),
        ("2", "19/10", "prueba", "con barro", "con dificultad", "alta"),
    ]), excluir_evento="cal")
    assert r["n"] == 1

def test_sin_dato_baja_la_cobertura_no_el_acierto():
    r = auditar(casos([
        ("1", "11/10", "A", "sin dato", "no pasé", "—"),
        ("2", "11/10", "A", "transitable", "pasé", "alta"),
    ]))
    assert r["acierto"] == 1 and r["cobertura"] == 0.5

def test_informe_dice_garantia():
    r = auditar(casos([(str(i), "11/10", "A", "transitable", "pasé", "alta") for i in range(20)]))
    assert "al menos 86 %" in informe(r)

def test_sensibilidad_detecta_umbral_fragil():
    tramos = [Tramo(N=100, E=2, suelo_mojado_pct=30)] * 5 + [Tramo(N=100, E=2)] * 5
    s = sensibilidad(tramos)
    assert s["suelo_mojado_pct"] > 0 and s["agua_siempre"] == 0
