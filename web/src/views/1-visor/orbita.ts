// Cálculo de la órbita de NISAR con satellite.js (SGP4), sin nada de three.js.
// Escala de la escena: 1 unidad = radio de la Tierra (6.371 km).
// Ejes de la escena (los de three.js): Y = eje de la Tierra (norte arriba),
// X = hacia longitud 0 y -Z = hacia longitud 90° E. Así encaja con la textura equirectangular.

import { degreesLat, degreesLong, eciToGeodetic, gstime, propagate, twoline2satrec } from "satellite.js";
import { NISAR_TLE } from "./nisarTle";

export const RADIO_TIERRA_KM = 6371;
export const ACELERACION = 120; // el tiempo de la escena corre 120 veces más rápido

export type Vec3 = { x: number; y: number; z: number };

const satrec = twoline2satrec(NISAR_TLE.linea1, NISAR_TLE.linea2);

/** Minutos que tarda una vuelta (sale del movimiento medio del TLE, en rad/min). */
export const PERIODO_MIN = (2 * Math.PI) / satrec.no;

/** Pasa coordenadas inerciales (ECI, km) a la escena, en radios terrestres. */
function eciAEscena(p: Vec3): Vec3 {
  return { x: p.x / RADIO_TIERRA_KM, y: p.z / RADIO_TIERRA_KM, z: -p.y / RADIO_TIERRA_KM };
}

/** Latitud y longitud (grados) a un punto sobre la Tierra sin girar, con radio r. */
export function latLonAEscena(lat: number, lon: number, r = 1): Vec3 {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return { x: r * Math.cos(la) * Math.cos(lo), y: r * Math.sin(la), z: -r * Math.cos(la) * Math.sin(lo) };
}

/** Ángulo de giro de la Tierra (GMST, radianes) en un instante. */
export function giroTierra(fecha: Date): number {
  return gstime(fecha);
}

export type EstadoSat = {
  /** Posición en la escena (inercial), en radios terrestres. */
  pos: Vec3;
  alturaKm: number;
  lat: number;
  lon: number;
  velocidadKmS: number;
};

/** Posición de NISAR en un instante, o null si SGP4 falla. */
export function posicionNisar(fecha: Date): EstadoSat | null {
  const pv = propagate(satrec, fecha) as ReturnType<typeof propagate> | null | false;
  if (!pv || !pv.position || typeof pv.position === "boolean") return null;
  const geo = eciToGeodetic(pv.position, gstime(fecha));
  const v = pv.velocity;
  return {
    pos: eciAEscena(pv.position),
    alturaKm: geo.height,
    lat: degreesLat(geo.latitude),
    lon: degreesLong(geo.longitude),
    velocidadKmS: Math.hypot(v.x, v.y, v.z),
  };
}

/** Puntos de la órbita entre dos instantes (para dibujar la línea). */
export function trazoOrbita(desde: Date, minutos: number, puntos: number): Vec3[] {
  const salida: Vec3[] = [];
  for (let i = 0; i <= puntos; i++) {
    const t = new Date(desde.getTime() + (i / puntos) * minutos * 60_000);
    const e = posicionNisar(t);
    if (e) salida.push(e.pos);
  }
  return salida;
}
