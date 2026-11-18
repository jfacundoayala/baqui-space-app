// Pruebas de logica.ts. Correr con:  node src/views/4-demo/logica.test.ts
// (Node 24 corre TypeScript directo.)
import { readFileSync } from "node:fs";
import type * as LogicaTipos from "./logica";
import type { Datos, EstadoRadar } from "./datos";

// Import con extensión .ts para node; tsc no revisa la ruta porque es dinámica.
const L = (await import("./logica" + ".ts")) as typeof LogicaTipos;
const { AGUA_SEGUIDA_MAX_M, caminoTapado, tramoTapadoMaxM, tramoTapadoMasLargo, veredicto, muestrear, largoM } = L;

let fallas = 0;
function prueba(nombre: string, ok: boolean, detalle = "") {
  if (!ok) fallas++;
  console.log(`${ok ? "ok   " : "FALLA"} ${nombre}${detalle ? ` (${detalle})` : ""}`);
}

// Camino recto de 1 km hacia el este, en la latitud de Gral. San Martín.
const LAT = -26.537;
const LON0 = -59.342;
const M_POR_GRADO_LON = (Math.PI / 180) * 6371008.8 * Math.cos((LAT * Math.PI) / 180);
const lon = (m: number) => LON0 + m / M_POR_GRADO_LON;
const lat = (m: number) => LAT + m / ((Math.PI / 180) * 6371008.8);
const camino: LogicaTipos.LatLon[] = [
  [LAT, lon(0)],
  [LAT, lon(1000)],
];
/** Rectángulo de agua que cruza el camino entre los metros desde y hasta. */
const agua = (desde: number, hasta: number): LogicaTipos.Poligono => [
  [lat(-40), lon(desde)],
  [lat(-40), lon(hasta)],
  [lat(40), lon(hasta)],
  [lat(40), lon(desde)],
];

prueba("umbral es 50 m", AGUA_SEGUIDA_MAX_M === 50);
const muestras = muestrear(camino);
prueba("muestreo cada 5 m", muestras.length === 201, `${muestras.length} muestras en ${largoM(camino).toFixed(1)} m`);

// 1. Sin agua: transitable.
prueba("sin agua → transitable", !caminoTapado(camino, []));

// 2. 30 m de agua: sigue verde.
const m30 = tramoTapadoMaxM(camino, [agua(400, 430)]);
prueba("30 m de agua → sigue transitable", !caminoTapado(camino, [agua(400, 430)]), `${m30} m tapados`);

// 3. 60 m de agua: rojo.
const m60 = tramoTapadoMaxM(camino, [agua(400, 460)]);
prueba("60 m de agua → intransitable", caminoTapado(camino, [agua(400, 460)]), `${m60} m tapados`);

// 4. Dos charcos de 30 m separados no se suman.
prueba("dos charcos de 30 m separados → transitable", !caminoTapado(camino, [agua(100, 130), agua(600, 630)]));

// 5. Laguna de siempre de 200 m: no cuenta.
const laguna = agua(200, 400);
prueba("laguna de siempre de 200 m → no cuenta", !caminoTapado(camino, [laguna], [laguna]));
prueba("la misma agua, si fuera nueva → intransitable", caminoTapado(camino, [laguna]));

// 6. Veredicto del viaje.
prueba("veredicto: camino 1 libre → llegás", veredicto([false, true]) === "llegas");
prueba("veredicto: solo camino 2 libre → alternativo", veredicto([true, false]) === "alternativo");
prueba("veredicto: los dos tapados → no llegás", veredicto([true, true]) === "no-llegas");
// Sin camino alternativo (lo más común en el campo): un solo camino, tapado → no llegás.
prueba("veredicto: sin camino alternativo y tapado → no llegás", veredicto([true]) === "no-llegas");
prueba("veredicto: sin camino alternativo y libre → llegás", veredicto([false]) === "llegas");

// 7. Escenarios de la demo (rutas.json): caminos de OSM + estado real medido por el radar.
const datos = JSON.parse(readFileSync(new URL("./rutas.json", import.meta.url), "utf8")) as Datos;
type Estado = "transitable" | "con barro" | "desvío" | "sin salida";
const esperado: Record<string, Estado> = {
  "el-fiscal": "con barro",
  "siete-arboles": "con barro",
  "capitan-solari": "desvío",
  "campo-sur": "sin salida",
};
const ids = datos.destinos.map((d) => d.id);
prueba("están todos los destinos esperados", ids.length === Object.keys(esperado).length && ids.every((id) => id in esperado), ids.join(", "));
// Con la pasada del 11/10 ningún lugar con nombre tiene todo su camino medido sin barro: la demo abre con uno al que se llega.
prueba("la demo abre con un destino al que se llega", ["transitable", "con barro"].includes(esperado[datos.destino_inicial]), datos.destino_inicial);
prueba("el que abre es el primero de la lista", datos.destinos[0].id === datos.destino_inicial);
prueba("la pasada del radar tiene fecha AAAA-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(datos.radar.fecha) && datos.radar.pasada.startsWith("NISAR_L2_"), datos.radar.fecha);
for (const d of datos.destinos) {
  const c1 = d.caminos[0];
  const cortado = d.alternativa.existe ? "desvío" : "sin salida";
  const da: Estado = c1.cortes.length > 0 ? cortado : c1.radar_km.con_barro > 0 ? "con barro" : "transitable";
  prueba(`${d.nombre}: camino 1 → ${esperado[d.id]}`, da === esperado[d.id], JSON.stringify(c1.radar_km));
  for (const c of d.caminos) {
    const suma = Object.values(c.radar_km).reduce((a, b) => a + b, 0);
    prueba(`${d.nombre}, camino ${c.n}: los km por estado suman el largo`, Math.abs(suma - c.km) <= 0.3, `${suma.toFixed(1)} contra ${c.km} km`);
    prueba(`${d.nombre}, camino ${c.n}: hay corte si y solo si hay km intransitables`, c.cortes.length > 0 === c.radar_km.intransitable > 0);
    prueba(`${d.nombre}, camino ${c.n}: el largo coincide con la geometría`, Math.abs(L.largoM(c.coords) / 1000 - c.km) <= 0.2);
  }
  prueba(`${d.nombre}: los datos dicen lo mismo que la lógica`, d.alternativa.existe === (d.caminos.length > 1));
  if (da === "sin salida") {
    prueba(`${d.nombre}: veredicto → no llegás`, veredicto(d.caminos.map((c) => c.cortes.length > 0)) === "no-llegas");
    prueba(`${d.nombre}: no hay otro camino`, d.alternativa.motivo === "sin_otro_camino", d.alternativa.motivo);
  }
  if (d.caminos[1]) {
    prueba(`${d.nombre}: el camino 2 no es más del doble`, d.caminos[1].km <= 2 * c1.km, `${d.caminos[1].km} km contra ${c1.km} km`);
    prueba(`${d.nombre}: el camino 2 no pisa tramos intransitables`, d.caminos[1].cortes.length === 0);
    prueba(`${d.nombre}: veredicto → alternativo`, veredicto(d.caminos.map((c) => c.cortes.length > 0)) === "alternativo");
  }
}
// La capa del mapa trae todos los tramos medidos.
const capa = JSON.parse(readFileSync(new URL("./estado_radar.json", import.meta.url), "utf8")) as EstadoRadar;
for (const e of ["transitable", "con barro", "intransitable", "sin dato"] as const) {
  prueba(`capa del radar: ${e} tiene tantas líneas como tramos`, capa.lineas[e].length === capa.tramos[e] && capa.tramos[e] > 0, `${capa.tramos[e]}`);
}

console.log(fallas === 0 ? "\nTodo bien." : `\n${fallas} prueba(s) fallaron.`);
if (fallas) process.exit(1);
