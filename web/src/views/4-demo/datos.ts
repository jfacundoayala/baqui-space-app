// Datos de la demo, tipados. Vienen de rutas.json (se arma con Python: generar_rutas.py en esta carpeta).
//
// Origen de cada dato:
// - Caminos y lugares: OpenStreetMap (ODbL), osm/caminos_osm.json: descarga Overpass con todas las clases de
//   camino para autos, en un recuadro más grande que la zona de la demo (la consulta y la fecha están adentro).
//   Camino 1 = el más corto por la red.
//   Camino 2 = el más corto que no pisa el agua. Solo existe si no es más del doble de largo que el camino 1.
// - Destinos: nodos place=* de OpenStreetMap (los tres son place=hamlet: parajes).
// - Tramo único: tramo del camino 1 hecho de "puentes" del grafo de OSM (si se corta, no hay otra forma de llegar).
//   Alcance: "un solo camino" quiere decir "un solo camino cargado en OpenStreetMap".
// - Agua: SIMULADA para la demo, una sola capa "de hoy" para todos los destinos. No es una medición del radar.
//   Cada mancha toca solo caminos de tierra según OSM (surface=unpaved); el generador frena si no.
import rutas from "./rutas.json";
import type { LatLon, Poligono } from "./logica";

export type TipoAgua = "agua_nueva" | "charco" | "laguna_siempre";

export type Agua = {
  id: string;
  tipo: TipoAgua;
  simulado: boolean;
  centro: LatLon;
  /** Ways de OSM que toca la mancha, con su surface (para comprobar que son de tierra). */
  caminos_osm_tocados: { way: number; surface: string | null }[];
  coords: Poligono;
};

export type Camino = {
  n: number;
  km: number;
  km_por_superficie_osm: { tierra: number; pavimento: number; sin_dato: number };
  /** Punto del camino donde va el cartel. */
  ancla: LatLon;
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
  /** Nombre tal cual está en OpenStreetMap. */
  nombre: string;
  /** Tag place de OSM (hamlet, village...). El texto que se muestra está en textos.ts. */
  place_osm: string;
  osm_nodo: number;
  lat: number;
  lon: number;
  /** [desde, hasta] en km del tramo del camino 1 por el que se llega de una sola forma. */
  tramo_unico_km: [number, number];
  /** true si ese tramo único mide 500 m o más: se llega por un solo camino. */
  un_solo_camino: boolean;
  alternativa: Alternativa;
  /** Camino 1 siempre; camino 2 solo si hay alternativa real. */
  caminos: Camino[];
};

export type Datos = {
  /** Destino con el que abre la demo: el TRANSITABLE (primero de la lista). */
  destino_inicial: string;
  superficies_tierra: string[];
  origen: { lat: number; lon: number; osm_nodo: number };
  destinos: Destino[];
  /** Agua de hoy (simulada), la misma para todos los destinos. */
  agua: Agua[];
};

export const DATOS = rutas as unknown as Datos;

/** Destino con el que abre la demo: Colonia Villa Jardín, TRANSITABLE ("Llegás. Podés salir."). */
export const DESTINO_INICIAL = DATOS.destino_inicial;

/** Agua nueva de hoy (incluye charcos chicos que no alcanzan a cortar). */
export function aguaDeHoy(): Agua[] {
  return DATOS.agua.filter((a) => a.tipo !== "laguna_siempre");
}

/** Lagunas de siempre: están siempre y no cuentan. */
export function lagunasDeSiempre(): Agua[] {
  return DATOS.agua.filter((a) => a.tipo === "laguna_siempre");
}
