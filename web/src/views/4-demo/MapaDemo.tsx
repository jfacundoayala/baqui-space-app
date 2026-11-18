"use client";
// Mapa satelital de la demo (Leaflet). Se carga solo en el cliente desde Demo.tsx (import() en un efecto, sin SSR ni next/dynamic): ver useMapa en Demo.tsx.
// Abajo va el estado real de todos los caminos medidos por el radar (verde, ámbar, rojo, gris); el recorrido va arriba, en blanco.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Fragment, memo, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  type MapContainerProps,
} from "react-leaflet";
import Estado from "@/components/Estado";
import type { Camino, Datos, Destino, EstadoRadar } from "./datos";
import type { LatLon } from "./logica";
import { T4 } from "./textos";
import s from "./demo.module.css";

// Mosaicos Sentinel-2 cloudless 2023 de EOX (WMTS en EPSG:3857). Sin internet, queda el fondo oscuro.
const SATELITE = "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg";

const NEGRO = "#05080f";
const CAMINO = "#e8edf5";
const CAMINO_SECUNDARIO = "#aeb7c6";
const AGUA = "#2f7fd1";
const AGUA_BORDE = "#a8d8ff";

/** Estilos fijos (mismo objeto en cada render: react-leaflet no vuelve a aplicar el estilo). */
const ESTILO = {
  brillo: { color: "#ffffff", weight: 18, opacity: 0.16, lineCap: "round", lineJoin: "round" },
  bordePrincipal: { color: NEGRO, weight: 9, opacity: 0.85, lineCap: "round", lineJoin: "round" },
  bordeNormal: { color: NEGRO, weight: 7, opacity: 0.85, lineCap: "round", lineJoin: "round" },
  bordeSecundario: { color: NEGRO, weight: 7, opacity: 0.55, lineCap: "round", lineJoin: "round" },
  caminoPrincipal: { color: CAMINO, weight: 5, opacity: 1, lineCap: "round", lineJoin: "round" },
  caminoNormal: { color: CAMINO, weight: 3, opacity: 1, lineCap: "round", lineJoin: "round" },
  caminoSecundario: {
    color: CAMINO_SECUNDARIO,
    weight: 3,
    opacity: 0.75,
    dashArray: "2 8",
    lineCap: "round",
    lineJoin: "round",
  },
  radarBorde: { color: NEGRO, weight: 5, opacity: 0.55, lineCap: "round", lineJoin: "round" },
  transitable: { color: "#34d399", weight: 2.5, opacity: 0.95, lineCap: "round", lineJoin: "round" },
  "con barro": { color: "#fbbf24", weight: 2.5, opacity: 0.95, lineCap: "round", lineJoin: "round" },
  intransitable: { color: "#f87171", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round" },
  "sin dato": { color: "#94a3b8", weight: 2, opacity: 0.7, dashArray: "3 6", lineCap: "round", lineJoin: "round" },
  puntoAgua: { color: AGUA_BORDE, weight: 2, fillColor: AGUA, fillOpacity: 1 },
  ancla: { color: NEGRO, weight: 2, fillColor: "#ffffff", fillOpacity: 1 },
} satisfies Record<string, L.PathOptions>;

/* ------------------------------------------------------------------------------------------------
 * Contenedor del mapa a prueba de StrictMode y recarga en caliente.
 *
 * react-leaflet 5 (MapContainer) borra el mapa con map.remove() en la limpieza de un efecto. Si las capas
 * se montan en la misma pasada que el mapa y React vuelve a correr los efectos sin desmontar, las capas se
 * agregan a un mapa borrado: "appendChild" en TileLayer y "Map container is being reused".
 *
 * Acá, sin tocar nada de Leaflet:
 * 1. El MapContainer se monta recién después de montar en el cliente, con una key propia: useId + número de
 *    montaje (estado de este componente). Si React vuelve a correr el efecto (StrictMode, recarga en
 *    caliente), sube el número: sale un MapContainer nuevo, en un <div> nuevo, y el viejo se desmonta entero.
 * 2. Las capas (hijos) se montan recién cuando ese mapa avisa que está listo (whenReady), en otra pasada.
 * 3. Los panes propios (caminos, agua, carteles) se crean en whenReady, no con <Pane>.
 * ---------------------------------------------------------------------------------------------- */

/** Capas propias del mapa, de abajo hacia arriba. */
const CAPAS = { radar: 405, caminos: 410, agua: 430, carteles: 620 } as const;

function MapaSeguro({ children, ...props }: MapContainerProps & { children: ReactNode }) {
  const id = useId();
  /** Número de montaje: 0 = todavía no se montó en el cliente. */
  const [montaje, setMontaje] = useState(0);
  /** Montaje cuyo mapa ya está listo para recibir capas. */
  const [listo, setListo] = useState(0);

  useEffect(() => {
    setMontaje((n) => n + 1);
    return () => setListo(0);
  }, []);

  if (montaje === 0) return null;
  const alListo = (e: L.LeafletEvent) => {
    const m = e.target as L.Map;
    for (const [nombre, z] of Object.entries(CAPAS)) {
      if (!m.getPane(nombre)) m.createPane(nombre).style.zIndex = String(z);
    }
    setListo(montaje);
  };
  return (
    <MapContainer key={`${id}-${montaje}`} whenReady={alListo as () => void} {...props}>
      {listo === montaje ? children : null}
    </MapContainer>
  );
}

/* ---------------------------------------------------------------------------------------------- */

type Props = {
  datos: Datos;
  destino: Destino;
  /** Caminos que se dibujan (camino 1 siempre; el 2 solo si hay alternativa real). */
  caminos: Camino[];
  /** Por camino: ¿lo tapa el agua? */
  tapados: boolean[];
  /** Camino por el que conviene ir (1 o 2), o null si ninguno. */
  recomendado: number | null;
  /** Estado de todos los tramos medidos por el radar (null mientras carga). */
  radar: EstadoRadar | null;
  /** Tramos intransitables sobre los caminos dibujados: se marcan con un punto y un rótulo. */
  aguaSobreCamino: { n: number; centro: LatLon }[];
  menosMovimiento: boolean;
  onElegir: (id: string) => void;
};

function esEscritorio() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

/** Rótulo "Agua sobre el camino" en el celular (va a la derecha del agua): lugar que se le deja a la derecha. */
const LUGAR_ROTULO_AGUA_PX = 150;

/**
 * Margen para encuadrar: en escritorio el panel tapa la izquierda del mapa.
 * `derecha`: px de más a la derecha en el celular (para el rótulo del agua, que si no queda cortado por el borde).
 */
function margenes(derecha = 0): L.FitBoundsOptions {
  return esEscritorio()
    ? // Escritorio: buscador centrado arriba (~85 px) y respuesta centrada abajo (hasta ~230 px): la ruta va en el medio.
      { paddingTopLeft: [72, 108], paddingBottomRight: [72, 250] }
    : { paddingTopLeft: [28, 72], paddingBottomRight: [28 + derecha, 28] };
}

function limites(datos: Datos, d: Destino): L.LatLngBounds {
  const pts: LatLon[] = [[datos.origen.lat, datos.origen.lon], [d.lat, d.lon]];
  for (const c of d.caminos) pts.push(...c.coords);
  return L.latLngBounds(pts);
}

/** Reencuadra al cambiar de destino. */
function Encuadre({ bounds, menos, derecha }: { bounds: L.LatLngBounds; menos: boolean; derecha: number }) {
  const map = useMap();
  // El encuadre inicial lo hace el MapContainer (y el ResizeObserver de abajo): acá solo se vuela si cambió el
  // destino. Se compara con los límites anteriores (no con una marca de "primera vez"), así el doble efecto de
  // StrictMode no vuela al montar.
  const anterior = useRef(bounds);
  useEffect(() => {
    if (anterior.current === bounds) return;
    anterior.current = bounds;
    if (menos) map.fitBounds(bounds, margenes(derecha));
    else map.flyToBounds(bounds, { ...margenes(derecha), duration: 0.9, easeLinearity: 0.2 });
  }, [bounds, map, menos, derecha]);
  // Encuadre inicial y cada vez que cambia el tamaño del mapa (por ejemplo, si el mapa se creó antes de tener
  // tamaño, o al rotar el celular): sin esto Leaflet calcula el zoom con un tamaño viejo.
  const actual = useRef({ bounds, derecha });
  useEffect(() => {
    actual.current = { bounds, derecha };
  }, [bounds, derecha]);
  useEffect(() => {
    let ancho = 0;
    let alto = 0;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (!width || !height || (width === ancho && height === alto)) return;
      ancho = width;
      alto = height;
      map.invalidateSize({ animate: false });
      map.fitBounds(actual.current.bounds, { ...margenes(actual.current.derecha), animate: false });
    });
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function icono(nombre: string, clase: string): L.DivIcon {
  const limpio = nombre.replace(/[<>&"]/g, "");
  return L.divIcon({
    className: `${s.lugar} ${clase}`,
    html: `<span class="${s.punto}"></span><span class="${s.nombre}">${limpio}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const ORDEN_RADAR = ["sin dato", "transitable", "con barro", "intransitable"] as const;

/** Estado de todos los caminos medidos por el radar. Una sola capa por estado: no se vuelve a dibujar al cambiar de destino. */
const CapaRadar = memo(function CapaRadar({ radar }: { radar: EstadoRadar }) {
  return (
    <>
      <Polyline pane="radar" positions={ORDEN_RADAR.flatMap((e) => radar.lineas[e])} pathOptions={ESTILO.radarBorde} interactive={false} />
      {ORDEN_RADAR.map((e) => (
        <Polyline key={e} pane="radar" positions={radar.lineas[e]} pathOptions={ESTILO[e]} interactive={false} />
      ))}
    </>
  );
});

export default function MapaDemo({
  datos,
  destino,
  caminos,
  tapados,
  recomendado,
  radar,
  aguaSobreCamino,
  menosMovimiento,
  onElegir,
}: Props) {
  const bounds = useMemo(() => limites(datos, destino), [datos, destino]);
  // En el celular, si hay rótulo de agua sobre el camino, se le deja lugar a la derecha.
  const derecha = !esEscritorio() && aguaSobreCamino.length > 0 ? LUGAR_ROTULO_AGUA_PX : 0;
  const [inicial] = useState(() => ({ bounds, opciones: margenes(derecha) }));
  // En pantallas táctiles el mapa no se arrastra con un dedo, así la página sigue bajando.
  const [movil] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const [escritorio] = useState(esEscritorio);

  const iconoOrigen = useMemo(() => icono(T4.mapa.origen, s.lugarOrigen), []);
  const iconos = useMemo(
    () =>
      Object.fromEntries(
        datos.destinos.map((d) => [
          d.id,
          { elegido: icono(d.nombre, s.lugarElegido), otro: icono(d.nombre, s.lugarOtro) },
        ]),
      ),
    [datos],
  );

  return (
    <MapaSeguro
      bounds={inicial.bounds}
      boundsOptions={inicial.opciones}
      zoomSnap={0.25}
      zoomDelta={0.5}
      minZoom={8}
      maxZoom={17}
      scrollWheelZoom={false}
      dragging={!movil}
      zoomControl={false}
      attributionControl={false}
      keyboard
      className="size-full"
    >
      {/* La atribución (EOX y OpenStreetMap) va abajo del mapa, en el pie de la sección, a 12 px. */}
      <TileLayer url={SATELITE} maxNativeZoom={15} maxZoom={17} />
      {/* En pantallas táctiles el mapa se encuadra solo y se acerca con dos dedos: sin botones de zoom. */}
      {!movil && <ZoomControl position="bottomright" />}
      <Encuadre bounds={bounds} menos={menosMovimiento} derecha={derecha} />

      {radar && <CapaRadar radar={radar} />}

      {/* Recorrido: blanco, el recomendado más grueso y con brillo. */}
      <>
        {[...caminos]
          .sort((a, b) => (a.n === recomendado ? 1 : 0) - (b.n === recomendado ? 1 : 0))
          .map((c) => {
            const principal = c.n === recomendado;
            const secundario = recomendado !== null && !principal;
            return (
              <Fragment key={`${destino.id}-${c.n}-${principal ? "p" : "s"}`}>
                {principal && (
                  <Polyline pane="caminos" positions={c.coords} pathOptions={ESTILO.brillo} interactive={false} />
                )}
                <Polyline
                  pane="caminos"
                  positions={c.coords}
                  pathOptions={
                    principal ? ESTILO.bordePrincipal : secundario ? ESTILO.bordeSecundario : ESTILO.bordeNormal
                  }
                  interactive={false}
                />
                <Polyline
                  pane="caminos"
                  positions={c.coords}
                  pathOptions={
                    principal ? ESTILO.caminoPrincipal : secundario ? ESTILO.caminoSecundario : ESTILO.caminoNormal
                  }
                  interactive={false}
                />
              </Fragment>
            );
          })}
      </>

      {/* Tramos intransitables sobre el recorrido: un punto y un rótulo que lo señala. */}
      <>
        {aguaSobreCamino.map((a, i) => (
          <CircleMarker
            pane="carteles"
            key={`sobre-${destino.id}-${i}`}
            center={a.centro}
            radius={5}
            interactive={false}
            pathOptions={ESTILO.puntoAgua}
          >
            {i === 0 && (
              <Tooltip
                permanent
                direction={escritorio ? "bottom" : "right"}
                offset={escritorio ? [0, 4] : [4, 0]}
                opacity={1}
                className={s.cartel}
                pane="tooltipPane"
              >
                <div className={`flex items-center ${escritorio ? "flex-col" : "flex-row"}`}>
                  <span aria-hidden className={escritorio ? "h-5 w-px bg-[#a8d8ff]" : "h-px w-4 bg-[#a8d8ff]"} />
                  <span className={s.rotuloAgua}>{T4.mapa.aguaSobreCamino}</span>
                </div>
              </Tooltip>
            )}
          </CircleMarker>
        ))}
      </>

      {/* Carteles, uno por camino. En el celular el mapa es chico: con un solo camino no van (la respuesta está justo
          arriba del mapa y el cartel taparía el destino y el agua) y con dos caminos solo dicen "Camino 1" / "Camino 2";
          el estado con ícono y palabra está en la respuesta.
          Con dos caminos, el cartel del camino 2 va al costado opuesto al corte (lo elige generar_estado_radar.py) y el
          del camino 1 arriba: así no se pisan entre ellos ni con el rótulo del corte. En el celular, uno arriba y otro abajo.
          Con un solo camino, el ancla está antes del tramo único y el cartel va al costado (derecha o izquierda, el lado que
          elige generar_estado_radar.py): así no tapa el tramo que muestra que no hay otro camino. */}
      <>
        {caminos.map((c, i) => {
          const tapado = tapados[i];
          const solo = caminos.length === 1;
          const alCostado = solo || (escritorio && c.cartel_lado !== undefined);
          const abajo = !alCostado && caminos.some((otro) => otro.ancla[0] > c.ancla[0]);
          const lado = c.cartel_lado ?? "right";
          const direccion = alCostado ? lado : abajo ? "bottom" : "top";
          const desplazamiento: [number, number] = alCostado ? [lado === "right" ? 8 : -8, 0] : abajo ? [0, 8] : [0, -8];
          const orden = alCostado ? (lado === "right" ? "flex-row-reverse" : "flex-row") : abajo ? "flex-col-reverse" : "flex-col";
          return (
            <CircleMarker
              pane="carteles"
              key={`cartel-${destino.id}-${c.n}-${tapado ? "t" : "l"}`}
              center={c.ancla}
              radius={4}
              interactive={false}
              pathOptions={ESTILO.ancla}
            >
              <Tooltip
                permanent
                direction={direccion}
                offset={desplazamiento}
                opacity={1}
                className={`${s.cartel} ${solo ? s.cartelSolo : ""}`}
                pane="tooltipPane"
              >
                <div className={`flex items-center ${orden}`}>
                  <div className="flex items-center gap-2.5 rounded-full border border-white/15 bg-[#070c16]/85 px-2.5 py-0.5 shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)] backdrop-blur-md opaco:bg-[#070c16] lg:py-1 lg:pl-3.5 lg:pr-1">
                    <span className="text-xs font-medium text-ink-2">
                      {T4.mapa.cartel(c.n)}
                      <span className="hidden lg:inline">{T4.mapa.cartelKm(c.km)}</span>
                    </span>
                    <span className="hidden lg:inline-flex">
                      {tapado ? <Estado tono="peligro" /> : c.radar_km.con_barro > 0 ? <Estado tono="cuidado" texto={T4.mapa.leyendaBarro} /> : <Estado tono="ok" />}
                    </span>
                  </div>
                  <span aria-hidden className={alCostado ? "h-px w-2.5 bg-white/50" : "h-2.5 w-px bg-white/50"} />
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </>

      {/* Lugares: origen, destino elegido y los otros destinos (tocar para elegir). */}
      <Marker
        position={[datos.origen.lat, datos.origen.lon]}
        icon={iconoOrigen}
        interactive={false}
        keyboard={false}
        zIndexOffset={500}
      />
      {datos.destinos.map((d) => {
        const elegido = d.id === destino.id;
        return (
          <Marker
            key={`${d.id}-${elegido ? "si" : "no"}`}
            position={[d.lat, d.lon]}
            icon={elegido ? iconos[d.id].elegido : iconos[d.id].otro}
            title={elegido ? d.nombre : T4.mapa.elegirMarcador(d.nombre)}
            alt={d.nombre}
            interactive={!elegido}
            keyboard={!elegido}
            zIndexOffset={elegido ? 800 : 0}
            eventHandlers={elegido ? undefined : { click: () => onElegir(d.id) }}
          />
        );
      })}
    </MapaSeguro>
  );
}
