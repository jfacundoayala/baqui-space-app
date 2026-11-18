// Datos de la demo, tipados. Vienen de rutas.json y estado_radar.json (se arman con Python: generar_estado_radar.py).
//
// Origen de cada dato:
// - Estado de los caminos: REAL, medido por el radar NISAR. Sale de analisis/baqui/medir.py: tramos de 1 km de los
//   caminos rurales de OSM, cada uno con su estado. La pasada y su fecha están en `radar`.
// - Caminos y lugares: OpenStreetMap (ODbL), osm/caminos_osm.json.
//   Camino 1 = el más corto por la red.
//   Camino 2 = el más corto que no pisa tramos intransitables. Solo existe si el camino 1 está cortado y el desvío
//   no es más del doble de largo.
// - Lo que el radar no midió (rutas pavimentadas, calles, caminos fuera de la zona) figura como "sin medir".
import rutas from "./rutas.json";
import type { LatLon } from "./logica";

/** Kilómetros del camino por estado del radar. */
export type RadarKm = {
  transitable: number;
  con_barro: number;
  intransitable: number;
  sin_dato: number;
  /** El radar no midió ese camino (pavimento, calles o fuera de la zona). */
  sin_medir: number;
};

/** Tramo intransitable sobre el camino. */
export type Corte = { centro: LatLon; motivo: string; regla: string };

export type Camino = {
  n: number;
  km: number;
  /** Km del camino con estado medido por el radar (sin contar "sin dato" ni lo que no midió). */
  medido_km: number;
  radar_km: RadarKm;
  cortes: Corte[];
  /** Punto del camino donde va el cartel. */
  ancla: LatLon;
  /** De qué lado del ancla va el cartel cuando hay un solo camino. */
  cartel_lado?: "right" | "left";
  coords: LatLon[];
};

export type Alternativa = {
  existe: boolean;
  /** camino_2_libre · sin_otro_camino · desvio_mas_del_doble (no cuenta como alternativa) · no_hace_falta */
  motivo: "camino_2_libre" | "sin_otro_camino" | "desvio_mas_del_doble" | "no_hace_falta";
  km: number | null;
};

export type Destino = {
  id: string;
  /** Nombre tal cual está en OpenStreetMap. Si place_osm es "sin_nombre", el lugar no tiene nombre en el mapa. */
  nombre: string;
  /** Tag place de OSM (hamlet, village...) o "sin_nombre". El texto que se muestra está en textos.ts. */
  place_osm: string;
  osm_nodo: number;
  lat: number;
  lon: number;
  alternativa: Alternativa;
  /** Camino 1 siempre; camino 2 solo si hay alternativa real. */
  caminos: Camino[];
};

export type Datos = {
  /** Pasada del radar de la que sale el estado. fecha = AAAA-MM-DD. */
  radar: { fecha: string; pasada: string; referencia: string };
  /** Destino con el que abre la demo (primero de la lista). */
  destino_inicial: string;
  origen: { lat: number; lon: number; osm_nodo: number };
  destinos: Destino[];
};

/** Capa del mapa: todos los tramos medidos, agrupados por estado. */
export type EstadoRadar = {
  tramos: Record<"transitable" | "con barro" | "intransitable" | "sin dato", number>;
  lineas: Record<"transitable" | "con barro" | "intransitable" | "sin dato", LatLon[][]>;
};

export const DATOS = rutas as unknown as Datos;
export const DESTINO_INICIAL = DATOS.destino_inicial;
