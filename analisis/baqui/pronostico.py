"""Pronóstico de lluvia para "¿cuándo voy a poder pasar?".

Usa Meteomatics si están las variables METEOMATICS_USER y METEOMATICS_PASS
(en el archivo .env de la raíz, que no se sube a git). Si no están o falla,
usa Open-Meteo, que es gratis y no pide cuenta.

Uso: python -m baqui.pronostico [lat lon dias]
"""
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

SAN_MARTIN = (-26.537, -59.342)


def _cargar_env():
    env = Path(__file__).resolve().parent.parent / ".env"
    if env.exists():
        for linea in env.read_text(encoding="utf-8").splitlines():
            if "=" in linea and not linea.strip().startswith("#"):
                k, v = linea.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def meteomatics(lat, lon, dias):
    usuario, clave = os.environ["METEOMATICS_USER"], os.environ["METEOMATICS_PASS"]
    hoy = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    fin = hoy + timedelta(days=dias)
    url = (f"https://api.meteomatics.com/{hoy:%Y-%m-%dT%H:%M:%SZ}--{fin:%Y-%m-%dT%H:%M:%SZ}:P1D/"
           f"precip_24h:mm/{lat},{lon}/json")
    r = requests.get(url, auth=(usuario, clave), timeout=30)
    r.raise_for_status()
    fechas = r.json()["data"][0]["coordinates"][0]["dates"]
    # precip_24h en la hora T es la lluvia de las 24 h anteriores: corresponde al día previo
    return {(datetime.fromisoformat(d["date"].replace("Z", "+00:00")) - timedelta(days=1)).date().isoformat():
            d["value"] for d in fechas[1:]}


def open_meteo(lat, lon, dias):
    r = requests.get("https://api.open-meteo.com/v1/forecast", timeout=30, params={
        "latitude": lat, "longitude": lon, "daily": "precipitation_sum,et0_fao_evapotranspiration",
        "forecast_days": dias, "timezone": "America/Argentina/Buenos_Aires"})
    r.raise_for_status()
    d = r.json()["daily"]
    return dict(zip(d["time"], d["precipitation_sum"]))


def pronostico(lat=SAN_MARTIN[0], lon=SAN_MARTIN[1], dias=7):
    """Devuelve (fuente, {fecha: mm de lluvia})."""
    _cargar_env()
    if os.environ.get("METEOMATICS_USER") and os.environ.get("METEOMATICS_PASS"):
        try:
            return "Meteomatics", meteomatics(lat, lon, dias)
        except Exception as e:
            print(f"Meteomatics falló ({type(e).__name__}); uso Open-Meteo.")
    return "Open-Meteo", open_meteo(lat, lon, dias)


if __name__ == "__main__":
    args = [float(a) for a in sys.argv[1:3]]
    dias = int(sys.argv[3]) if len(sys.argv) > 3 else 7
    fuente, lluvia = pronostico(*args, dias=dias) if args else pronostico(dias=dias)
    print("Fuente:", fuente)
    for f, mm in lluvia.items():
        print(f, mm, "mm")
