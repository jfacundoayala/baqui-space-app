"use client";
// Mapa satelital de la demo (Leaflet). Se carga solo en el cliente desde Demo.tsx (import() en un efecto, sin SSR ni next/dynamic): ver useMapa en Demo.tsx.
// El camino se dibuja neutro (blanco con borde oscuro); el agua lo tapa; el color va en el cartel.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  type MapContainerProps,
} from "react-leaflet";
import Estado from "@/components/Estado";
import type { Agua, Camino, Datos, Destino } from "./datos";
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
const LAGUNA = "#1b4a7d";
const LAGUNA_BORDE = "#cfd8e6";

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
  laguna: { color: LAGUNA_BORDE, weight: 1.5, dashArray: "5 5", fillColor: LAGUNA, fillOpacity: 0.5 },
  aro: { color: AGUA_BORDE, weight: 2, fillColor: AGUA, fillOpacity: 0.55 },
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
const CAPAS = { caminos: 410, agua: 430, carteles: 620 } as const;

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
  /** Agua de hoy que se muestra (vacía hasta que la demo se ve por primera vez). */
  aguaNueva: Agua[];
  lagunas: Agua[];
  /** Metros tapados por cada charco sobre los caminos dibujados (id → metros). 0 = no toca. */
  metrosCharco: Record<string, number>;
  /** Lagunas que tocan los caminos dibujados (para el rótulo "no cuenta"). */
  lagunasQueTocan: Set<string>;
  /** Agua corta sobre un camino tapado (no se ve al zoom del recorrido): se marca con un aro y un rótulo. */
  aguaSobreCamino: { n: number; centro: LatLon }[];
  /** Número de consulta: cada consulta nueva hace aparecer el agua de nuevo. */
  vuelta: number;
  menosMovimiento: boolean;
  /** false: la sección no se ve, se cortan las animaciones. */
  visible: boolean;
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

/** 0 → 1 cuando aparece el agua (en cada consulta). Corta: ~0,8 s; instantánea con menos movimiento. */
function useCrecida(objetivo: number, clave: string, menos: boolean, visible: boolean): number {
  const [t, setT] = useState(objetivo);
  const actual = useRef(objetivo);
  const claveAnterior = useRef(clave);
  useEffect(() => {
    let desde = actual.current;
    if (claveAnterior.current !== clave) {
      claveAnterior.current = clave;
      desde = 0; // consulta nueva: el agua aparece desde cero
    }
    // Menos movimiento, fuera de pantalla o nada que animar (por ejemplo, al cargar, antes de que el agua aparezca):
    // sin requestAnimationFrame.
    if (menos || !visible || desde === objetivo) {
      actual.current = objetivo;
      setT(objetivo);
      return;
    }
    const dur = objetivo > desde ? 800 : 300;
    const t0 = performance.now();
    let raf = 0;
    const paso = (ahora: number) => {
      const k = Math.min(1, (ahora - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = desde + (objetivo - desde) * e;
      actual.current = v;
      setT(v);
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, clave, menos, visible]);
  return t;
}

/** Achica el polígono hacia su centro (factor 0..1). */
function escalar(a: Agua, f: number): LatLon[] {
  const [cy, cx] = a.centro;
  return a.coords.map(([y, x]) => [cy + (y - cy) * f, cx + (x - cx) * f]);
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

/**
 * Agua de hoy que aparece en cada consulta. Es el único componente que escucha la animación (t cambia en cada
 * cuadro durante ~0,8 s): el resto del mapa (caminos, lagunas, carteles, marcadores) no se vuelve a dibujar.
 */
function AguaAnimada({
  aguaNueva,
  metrosCharco,
  aguaSobreCamino,
  clave,
  menos,
  visible,
  escritorio,
}: {
  aguaNueva: Agua[];
  metrosCharco: Record<string, number>;
  aguaSobreCamino: { n: number; centro: LatLon }[];
  clave: string;
  menos: boolean;
  visible: boolean;
  escritorio: boolean;
}) {
  const t = useCrecida(aguaNueva.length > 0 ? 1 : 0, clave, menos, visible);
  const factor = 0.18 + 0.82 * t;
  return (
    <>
      {t > 0.001 &&
        aguaNueva.map((a) => (
          <Polygon
            pane="agua"
            key={`${a.id}-${clave}`}
            positions={escalar(a, factor)}
            interactive={false}
            pathOptions={{
              color: AGUA_BORDE,
              weight: 1.5,
              opacity: Math.min(1, t * 1.4),
              fillColor: AGUA,
              fillOpacity: 0.72 * t,
            }}
          />
        ))}
      {/* El charco chico es pequeño para el zoom: un aro lo señala (solo si toca el recorrido). */}
      {t > 0.6 &&
        aguaNueva
          .filter((a) => a.tipo === "charco" && (metrosCharco[a.id] ?? 0) > 0)
          .map((a) => (
            <CircleMarker
              pane="agua"
              key={`aro-${a.id}-${clave}`}
              center={a.centro}
              radius={11}
              interactive={false}
              pathOptions={ESTILO.aro}
            >
              <Tooltip permanent direction={escritorio ? "left" : "right"} offset={[escritorio ? -12 : 12, 0]} opacity={1} className={s.rotulo} pane="tooltipPane">
                {T4.mapa.charco(metrosCharco[a.id] ?? 0)}
              </Tooltip>
            </CircleMarker>
          ))}
      {/* Agua corta sobre el camino (por ejemplo, 150 m entrando a un paraje): no se ve al zoom del recorrido.
          Un punto chico sobre el agua y un rótulo abajo, con una línea que lo señala. No es un aro: si el agua está
          pegada al paraje, un aro rodearía el marcador y parecería que el inundado es el paraje. El nombre del
          destino va arriba del marcador; el rótulo del agua, abajo (en el celular, a la derecha: el mapa es chico y
          abajo taparía el camino). */}
      {t > 0.6 &&
        aguaSobreCamino.map((a) => (
          <CircleMarker
            pane="carteles"
            key={`sobre-${clave}-${a.n}`}
            center={a.centro}
            radius={4}
            interactive={false}
            pathOptions={ESTILO.puntoAgua}
          >
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
          </CircleMarker>
        ))}
    </>
  );
}

export default function MapaDemo({
  datos,
  destino,
  caminos,
  tapados,
  recomendado,
  aguaNueva,
  lagunas,
  metrosCharco,
  lagunasQueTocan,
  aguaSobreCamino,
  vuelta,
  menosMovimiento,
  visible,
  onElegir,
}: Props) {
  const bounds = useMemo(() => limites(datos, destino), [datos, destino]);
  // En el celular, si hay rótulo de agua sobre el camino, se le deja lugar a la derecha.
  const derecha = !esEscritorio() && aguaSobreCamino.length > 0 ? LUGAR_ROTULO_AGUA_PX : 0;
  const [inicial] = useState(() => ({ bounds, opciones: margenes(derecha) }));
  // En pantallas táctiles el mapa no se arrastra con un dedo, así la página sigue bajando.
  const [movil] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  // En escritorio el rótulo del charco va a la izquierda (a la derecha choca con el cartel del camino 1).
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

      {/* Caminos: neutros, el recomendado más grueso y con brillo blanco. */}
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

      {/* Agua: arriba del camino, lo tapa. */}
      <>
        {lagunas.map((a) => (
          <Polygon
            pane="agua"
            key={`${a.id}-${lagunasQueTocan.has(a.id) ? "r" : "s"}`}
            positions={a.coords}
            interactive={false}
            pathOptions={ESTILO.laguna}
          >
            {lagunasQueTocan.has(a.id) && (
              <Tooltip permanent direction="right" offset={[24, 0]} opacity={1} className={s.rotulo} pane="tooltipPane">
                {T4.mapa.laguna}
              </Tooltip>
            )}
          </Polygon>
        ))}
        <AguaAnimada
          aguaNueva={aguaNueva}
          metrosCharco={metrosCharco}
          aguaSobreCamino={aguaSobreCamino}
          clave={`${destino.id}-${vuelta}`}
          menos={menosMovimiento}
          visible={visible}
          escritorio={escritorio}
        />
      </>

      {/* Carteles, uno por camino. En el celular el mapa es chico: con un solo camino no van (la respuesta está justo
          arriba del mapa y el cartel taparía el destino y el agua) y con dos caminos solo dicen "Camino 1" / "Camino 2";
          el estado con ícono y palabra está en la respuesta.
          Con dos caminos, el cartel del camino tapado va abajo del camino: arriba choca con el otro cartel y el charco.
          Con un solo camino, el ancla está antes del tramo único y el cartel va al costado (derecha o izquierda, el lado que
          elige generar_rutas.py): así no tapa el tramo que muestra que no hay otro camino. */}
      <>
        {caminos.map((c, i) => {
          const tapado = tapados[i];
          const solo = caminos.length === 1;
          const abajo = !solo && tapado;
          const lado = c.cartel_lado ?? "right";
          const direccion = solo ? lado : abajo ? "bottom" : "top";
          const desplazamiento: [number, number] = solo ? [lado === "right" ? 8 : -8, 0] : abajo ? [0, 8] : [0, -8];
          const orden = solo ? (lado === "right" ? "flex-row-reverse" : "flex-row") : abajo ? "flex-col-reverse" : "flex-col";
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
                      <Estado tono={tapado ? "peligro" : "ok"} />
                    </span>
                  </div>
                  <span aria-hidden className={solo ? "h-px w-2.5 bg-white/50" : "h-2.5 w-px bg-white/50"} />
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
