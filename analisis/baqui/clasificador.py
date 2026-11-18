"""Semáforo de Baqui (versión 2).

Base: docs/algoritmo.md (5 variables, eslabón más débil, umbral de lluvia
por HAND). Se le suman las reglas de seguridad de docs/clasificacion-semaforo.md
(calidad del dato, prudencia cerca de los cortes, contradicciones, asfalto).
Orden: sin dato -> rojo -> gris -> amarillo -> verde. La primera que se cumple decide.
"""
from dataclasses import dataclass, field

SIN_DATO, ROJO, GRIS, AMARILLO, VERDE = "sin dato", "intransitable", "dato viejo", "con barro", "transitable"


@dataclass
class Umbrales:
    """Valores de arranque. Se calibran con un evento y se prueban con otro."""
    min_pixeles: int = 20
    max_dias: int = 12                # más que una vuelta completa de NISAR: no se usa
    dias_frescos: int = 4
    agua_seguida_rojo: float = 50.0   # m seguidos de agua sobre el camino
    agua_seguida_amarillo: float = 20.0
    agua_pct_amarillo: float = 3.0    # % de la franja con agua nueva
    lluvia_gris: float = 20.0         # mm desde la pasada, con dato no fresco
    suelo_mojado_pct: float = 30.0    # % de la franja con el eco 1 a 3 dB más alto
    dm_contradice: float = 0.02       # la zona (CYGNSS/SMAP) casi no se mojó
    agua_siempre: float = 30.0        # % de laguna en la franja: revisar el mapa
    margen: float = 0.10              # a menos del 10 % de un corte, el color más grave
    factor_ripio: float = 1.5
    lluvia_sin_hand: float = 25.0     # mm, si todavía no hay HAND

    def aguanta(self, hand_m):
        """Lluvia que aguanta el tramo según qué tan alto está (la esponja)."""
        if hand_m is None:
            return self.lluvia_sin_hand
        if hand_m < 2:
            return 15.0
        if hand_m <= 5:
            return 30.0
        return 50.0


@dataclass
class Tramo:
    N: int                         # píxeles válidos en la franja
    E: float                       # días desde la pasada del radar
    agua_seguida_m: float = 0.0    # var. 1: tramo seguido más largo con agua nueva
    monte_seguido_m: float = 0.0   # var. 2: tramo seguido más largo con agua bajo el monte
    agua_pct: float = 0.0          # % de la franja con agua nueva
    suelo_mojado_pct: float = 0.0  # var. 3
    lluvia_mm: float = 0.0         # var. 4: lluvia desde la pasada
    hand_m: float | None = None    # var. 5
    dM: float | None = None        # humedad de zona (CYGNSS/SMAP) desde la fecha seca
    Wp: float = 0.0                # % agua de siempre
    T: str = "tierra"              # tierra, ripio o asfalto
    misma_orbita: bool = True
    misma_version: bool = True
    referencia_seca: bool = True
    otra_pasada_coincide: bool | None = None
    fecha_pasada: str = ""


@dataclass
class Resultado:
    color: str
    regla: str
    motivo: str
    confianza: str = ""
    avisos: list = field(default_factory=list)


def _supera(valor, corte, u):
    """Prudencia: cuenta como superado si queda a menos del margen del corte."""
    return valor is not None and valor >= corte * (1 - u.margen)


def clasificar(t: Tramo, u: Umbrales = Umbrales()) -> Resultado:
    avisos = []
    if t.Wp >= u.agua_siempre:
        avisos.append("posible error del mapa de caminos: el tramo cruza agua de siempre")
    pasada = f" del {t.fecha_pasada}" if t.fecha_pasada else ""

    # Sin dato: la calidad no alcanza para decir nada
    faltan = []
    if not t.misma_orbita:
        faltan.append("órbita distinta")
    if not t.misma_version:
        faltan.append("versión distinta")
    if not t.referencia_seca:
        faltan.append("la fecha de referencia no es seca")
    if t.N < u.min_pixeles:
        faltan.append(f"pocos píxeles ({t.N})")
    if t.E > u.max_dias:
        faltan.append(f"radar de hace {t.E:g} días")
    if faltan:
        return Resultado(SIN_DATO, "S", "; ".join(faltan), "—", avisos)

    def res(color, regla, motivo, contradiccion=False):
        return Resultado(color, regla, motivo, _confianza(t, u, contradiccion), avisos)

    # Rojo: el eslabón más débil
    if _supera(t.agua_seguida_m, u.agua_seguida_rojo, u):
        return res(ROJO, "R1", f"{t.agua_seguida_m:g} m seguidos con agua (radar{pasada})")
    if _supera(t.monte_seguido_m, u.agua_seguida_rojo, u):
        return res(ROJO, "R2", f"{t.monte_seguido_m:g} m seguidos con agua bajo el monte (radar{pasada})")

    # Gris: el radar ya no vale
    if t.E > u.dias_frescos and _supera(t.lluvia_mm, u.lluvia_gris, u):
        return res(GRIS, "G", f"llovieron {t.lluvia_mm:g} mm después del radar{pasada}: preguntá antes de salir")

    k = u.factor_ripio if t.T == "ripio" else 1.0
    # Amarillo
    if (_supera(t.agua_seguida_m, u.agua_seguida_amarillo, u)
            or _supera(t.monte_seguido_m, u.agua_seguida_amarillo, u)
            or _supera(t.agua_pct, u.agua_pct_amarillo, u)):
        return res(AMARILLO, "A1", "agua cerca del camino")
    if t.T != "asfalto":
        if _supera(t.suelo_mojado_pct, u.suelo_mojado_pct * k, u):
            if t.dM is not None and t.dM < u.dm_contradice and t.lluvia_mm < 5:
                return res(AMARILLO, "A2b", f"el radar ve {t.suelo_mojado_pct:g} % de suelo mojado pero la zona"
                           " no se mojó: puede ser un campo arado. Verificar", True)
            return res(AMARILLO, "A2", f"{t.suelo_mojado_pct:g} % del tramo con suelo mojado: barro probable")
        tope = u.aguanta(t.hand_m) * k
        if _supera(t.lluvia_mm, tope, u):
            alto = f"a {t.hand_m:g} m del bajo" if t.hand_m is not None else "sin dato de altura"
            return res(AMARILLO, "A3", f"llovieron {t.lluvia_mm:g} mm desde la pasada{pasada};"
                       f" este tramo ({alto}) aguanta {tope:g} mm")
    return res(VERDE, "V", f"sin agua ni barro detectados (radar{pasada})")


def _confianza(t, u, contradiccion):
    if contradiccion or t.E > u.dias_frescos or t.otra_pasada_coincide is False:
        return "baja"
    if t.otra_pasada_coincide or (t.dM is not None and t.dM >= u.dm_contradice):
        return "alta"
    return "media"
