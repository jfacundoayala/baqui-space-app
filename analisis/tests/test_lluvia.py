from datetime import date

import numpy as np
import pytest

from baqui.lluvia import Lluvia


def grilla(carpeta, dia, norte, sur):
    """Dos celdas: la del norte (-26,5) y la del sur (-27,5)."""
    np.savez(carpeta / f"{dia}.npz", lon=np.array([-59.3]), lat=np.array([-27.5, -26.5]),
             p=np.array([[sur], [norte]], dtype="float32"))


def test_suma_desde_el_dia_siguiente_y_por_celda(tmp_path):
    grilla(tmp_path, "2026-10-11", 99, 99)   # día de la pasada: no cuenta
    grilla(tmp_path, "2026-10-12", 10, 1)
    grilla(tmp_path, "2026-10-13", 5, np.nan)
    ll = Lluvia(tmp_path)
    assert ll.desde_pasada(-59.3, -26.55, date(2026, 10, 11), date(2026, 10, 13)) == 15
    assert ll.desde_pasada(-59.3, -27.4, date(2026, 10, 11), date(2026, 10, 13)) == 1
    assert ll.desde_pasada(-59.3, -26.5, date(2026, 10, 11), date(2026, 10, 11)) == 0


def test_si_falta_un_dia_no_inventa(tmp_path):
    grilla(tmp_path, "2026-10-12", 10, 1)
    ll = Lluvia(tmp_path)
    assert ll.faltan(date(2026, 10, 11), date(2026, 10, 13)) == ["2026-10-13"]
    with pytest.raises(LookupError):
        ll.desde_pasada(-59.3, -26.5, date(2026, 10, 11), date(2026, 10, 13))
