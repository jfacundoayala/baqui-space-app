"use client";
// La demo: una consulta de hoy. [Gral. San Martín] → [¿Hacia dónde?] → respuesta.
// La consulta corre sola al elegir destino (abre con el destino TRANSITABLE); "Consultar" la vuelve a correr (el agua aparece de nuevo).
import { Check, Radar, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ComponentType, type RefObject } from "react";
import Fuente from "@/components/Fuente";
import Reveal from "@/components/Reveal";
import Encabezado from "@/components/Encabezado";
import { useMenosMovimiento } from "@/components/hooks";
import Buscador from "./Buscador";
import type MapaDemoTipo from "./MapaDemo";
import { DATOS, DESTINO_INICIAL, type EstadoRadar } from "./datos";
import { veredicto } from "./logica";
import { T4, fechaCorta } from "./textos";
import s from "./demo.module.css";


const FECHA = fechaCorta(DATOS.radar.fecha);

/** Agua sobre el camino más corta que esto (en metros) casi no se ve al zoom del recorrido: lleva aro y rótulo. */
const AGUA_CORTA_M = 400;

/**
 * El mapa (Leaflet usa window) se carga solo en el cliente: import() dinámico en un efecto, sin next/dynamic.
 * Con next/dynamic, cada recarga en caliente de este archivo o de textos.ts creaba un componente perezoso nuevo y
 * React desconectaba y volvía a conectar los efectos del mapa: react-leaflet borraba el mapa y las capas se volvían
 * a agregar al mapa borrado ("appendChild" en TileLayer, "Map container is being reused"). Así no hay componente
 * perezoso ni Suspense: el componente es el mismo de siempre y la recarga en caliente lo actualiza en su lugar.
 */
/** La capa con el estado de todos los caminos (100 kB) se baja junto con el mapa, no con la página. */
function useRadar() {
  const [radar, setRadar] = useState<EstadoRadar | null>(null);
  useEffect(() => {
    let vivo = true;
    import("./estado_radar.json").then((m) => {
      if (vivo) setRadar(m.default as unknown as EstadoRadar);
    });
    return () => {
      vivo = false;
    };
  }, []);
  return radar;
}

function useMapa() {
  const [Mapa, setMapa] = useState<ComponentType<ComponentProps<typeof MapaDemoTipo>> | null>(null);
  useEffect(() => {
    let vivo = true;
    import("./MapaDemo").then((m) => {
      if (vivo) setMapa(() => m.default);
    });
    return () => {
      vivo = false;
    };
  }, []);
  return Mapa;
}

/**
 * ¿La demo se ve? A diferencia de useEnPantalla (components/hooks), arranca en false: hasta que el
 * IntersectionObserver confirma que la demo está en pantalla, se la toma como fuera de pantalla.
 * `vista` queda en true desde la primera vez que se ve.
 */
function useVisibilidad(ref: RefObject<Element | null>) {
  const [visible, setVisible] = useState(false);
  const [vista, setVista] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setVista(true);
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return { visible, vista };
}

const LEYENDA = [
  ["bg-[#e8edf5] ring-2 ring-[#05080f]", T4.mapa.leyendaRecorrido],
  ["bg-[#34d399]", T4.mapa.leyendaTransitable],
  ["bg-[#fbbf24]", T4.mapa.leyendaBarro],
  ["bg-[#f87171]", T4.mapa.leyendaIntransitable],
  ["bg-[#94a3b8]", T4.mapa.leyendaSinDato],
] as const;

function Leyenda({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2 ${className}`}>
      {LEYENDA.map(([color, texto]) => (
        <li key={texto} className="flex items-center gap-2">
          <span aria-hidden className={`h-1 w-5 rounded-full ${color}`} />
          {texto}
        </li>
      ))}
    </ul>
  );
}

export default function Demo() {
  const [destinoId, setDestinoId] = useState(DESTINO_INICIAL);
  /** Cada consulta suma uno: la respuesta se vuelve a anunciar. */
  const [vuelta, setVuelta] = useState(0);
  const menos = useMenosMovimiento();
  const raiz = useRef<HTMLDivElement>(null);
  const { vista } = useVisibilidad(raiz);
  const radar = useRadar();
  const MapaDemo = useMapa();

  const destino = DATOS.destinos.find((d) => d.id === destinoId) ?? DATOS.destinos[0];

  // Todo sale de la medición del radar: un camino está cortado si pisa algún tramo intransitable.
  const calculo = useMemo(() => {
    const tapados = destino.caminos.map((c) => c.cortes.length > 0);
    const v = veredicto(tapados);
    const libre = destino.caminos.find((c, i) => i > 0 && !tapados[i]);
    const recomendado = v === "llegas" ? destino.caminos[0] : v === "alternativo" ? (libre ?? null) : null;
    const aguaSobreCamino = destino.caminos.flatMap((c) => c.cortes.map((k) => ({ n: c.n, centro: k.centro })));
    return { tapados, v, recomendado, aguaSobreCamino };
  }, [destino]);

  const elegir = (id: string) => {
    setDestinoId(id);
    setVuelta((n) => n + 1);
  };

  const ok = calculo.v !== "no-llegas";
  const barroKm = calculo.recomendado?.radar_km.con_barro ?? 0;
  const barro = calculo.v === "llegas" && barroKm > 0;
  const tono = !ok
    ? { caja: "border-danger/45 bg-danger-bg text-danger", icono: "bg-danger/20" }
    : barro
      ? { caja: "border-warn/45 bg-warn-bg text-warn", icono: "bg-warn/20" }
      : { caja: "border-ok/45 bg-ok-bg text-ok", icono: "bg-ok/20" };
  const Icono = !ok ? X : barro ? TriangleAlert : Check;
  const medido = calculo.recomendado ?? destino.caminos[0];
  const sinOtro = !destino.alternativa.existe && calculo.v === "no-llegas";
  const resumen = T4.mapa.resumen(destino.nombre, [
    ...destino.caminos.map((c, i) => T4.mapa.resumenCamino(c.n, c.km, calculo.tapados[i])),
    ...(sinOtro ? [T4.mapa.resumenSinOtro] : []),
  ]);

  return (
    <div ref={raiz} className="mx-auto w-full max-w-6xl">
      {/* Encabezado */}
      <Reveal className="grid gap-4 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-end">
        <Encabezado titulo={T4.titulo} />
        <div className="hidden sm:block">
          <p className="text-base leading-snug text-ink-2 sm:text-lg">{T4.bajada}</p>
          <p className="mt-1.5 hidden text-sm text-ink-3 lg:block">
            {T4.bajadaNota(FECHA)} {T4.regla}
          </p>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-3 flex flex-col gap-2 sm:mt-6 sm:gap-3 lg:relative lg:mt-7 lg:block lg:h-[min(62svh,720px)] lg:min-h-[548px]">
          {/* Consulta: desde → hacia + Consultar */}
          {/* En escritorio: una barra centrada arriba del mapa, buscador y Consultar en la misma fila (pedido de Facundo, 15/11). */}
          <div className="relative z-20 order-1 flex flex-col gap-2 lg:absolute lg:left-1/2 lg:top-4 lg:grid lg:-translate-x-1/2 lg:grid-cols-[576px_auto]">
            <Buscador destinos={DATOS.destinos} elegido={destino} onElegir={elegir} />
            <button
              type="button"
              onClick={() => setVuelta((n) => n + 1)}
              aria-label={T4.consultar.accesible(destino.nombre)}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-base font-semibold text-[#06121f] transition-[background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#a5d6ff] motion-safe:active:scale-[0.97]"
            >
              <Radar aria-hidden className="size-5" strokeWidth={2.25} />
              {T4.consultar.boton}
            </button>
          </div>

          {/* Respuesta. En el celular: arriba del mapa. En escritorio: centrada abajo, sobre el mapa. */}
          <div className={`contents lg:absolute lg:bottom-4 lg:left-1/2 lg:z-10 lg:block lg:w-[456px] lg:-translate-x-1/2 ${s.panel} ${s.contenedor}`}>
            <div className={`order-2 ${s.tarjeta} max-lg:flex max-lg:flex-col max-lg:justify-center max-sm:min-h-[194px] sm:max-lg:min-h-[206px]`}>
              {/* Respuesta centrada, como el buscador de arriba (pedido de Facundo, 15/11). */}
              <div role="status" aria-live="polite" aria-atomic="true" className="text-center">
                <p className="text-xs font-medium text-ink-3">{T4.respuesta.titulo(destino.nombre)}</p>
                <p
                  key={`cartel-${destino.id}-${vuelta}`}
                  className={`${s.veredicto} mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-2xl border px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 ${tono.caja}`}
                >
                  <span
                    aria-hidden
                    className={`flex size-7 shrink-0 items-center justify-center justify-self-end rounded-full sm:size-9 ${tono.icono}`}
                  >
                    <Icono className="size-4 sm:size-5" strokeWidth={3} />
                  </span>
                  <span className="flex min-w-0 flex-col items-center">
                    <span className="whitespace-nowrap text-[22px] font-semibold leading-none tracking-[0.03em] min-[400px]:text-2xl sm:text-3xl sm:tracking-[0.04em]">
                      {!ok ? T4.respuesta.intransitable : barro ? T4.respuesta.conBarro : T4.respuesta.transitable}
                    </span>
                    {calculo.v === "alternativo" && calculo.recomendado && (
                      <span className="mt-1 text-sm font-medium text-ink">
                        {T4.respuesta.conDesvio(calculo.recomendado.n, calculo.recomendado.km)}
                      </span>
                    )}
                  </span>
                </p>
                <p
                  key={`frase-${destino.id}-${vuelta}`}
                  className={`${s.veredicto} mt-2.5 text-balance text-lg font-medium leading-snug tracking-[-0.01em] text-ink sm:mt-3 sm:text-[1.35rem] lg:mt-2.5 lg:text-xl`}
                  style={{ animationDelay: "60ms" }}
                >
                  {barro ? T4.frases.barro(barroKm) : T4.frases[calculo.v]}
                </p>
              </div>
              {sinOtro && <p className="mt-1.5 text-center text-sm text-ink-2">{T4.unSoloCamino}</p>}
              <p className="mt-1.5 text-center text-xs text-ink-3">
                {T4.medido(medido.medido_km, medido.km, FECHA)}
              </p>
            </div>
          </div>

          {/* Mapa */}
          <figure
            aria-label={T4.mapa.region}
            data-hoy={vista ? "si" : "no"}
            className={`${s.mapa} relative isolate z-0 order-3 m-0 h-[29svh] min-h-[220px] overflow-hidden rounded-3xl border border-line shadow-[0_30px_80px_-30px_rgb(20_60_120/0.55)] sm:h-[38svh] lg:absolute lg:inset-0 lg:h-auto lg:min-h-0`}
          >
            {/* Mientras carga el mapa se ve esto; el mapa lo tapa al cargar. */}
            <div aria-hidden className="absolute inset-0 -z-10 flex items-center justify-center text-sm text-ink-3">
              {T4.mapa.cargando}
            </div>
            <div className="absolute inset-0 z-0">
              {MapaDemo && (
                <MapaDemo
                  datos={DATOS}
                  destino={destino}
                  caminos={destino.caminos}
                  tapados={calculo.tapados}
                  recomendado={calculo.recomendado?.n ?? null}
                  radar={vista ? radar : null}
                  aguaSobreCamino={calculo.aguaSobreCamino}
                  menosMovimiento={menos}
                  onElegir={elegir}
                />
              )}
            </div>

            {/* Profundidad: borde oscuro alrededor */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(130%_100%_at_60%_45%,transparent_55%,rgb(6_10_19/0.6))]"
            />

            {/* Aviso: de qué pasada del radar sale el estado (siempre visible) */}
            <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col items-start gap-2 lg:bottom-3 lg:top-auto">
              <p className="inline-flex items-center gap-2 rounded-full border border-ok/45 bg-[#07140f]/85 px-3 py-1.5 text-xs font-semibold text-ok shadow-[0_8px_24px_-8px_rgb(0_0_0/0.7)] backdrop-blur-md opaco:bg-[#07140f]">
                <Radar aria-hidden className="size-3.5" strokeWidth={2.25} />
                {T4.mapa.datosReales}
                <span className="font-normal text-[#a7f3d0]/85">· {T4.mapa.datosRealesDetalle(FECHA)}</span>
              </p>
              <Leyenda className="hidden flex-col rounded-2xl border border-line bg-[#070c16]/80 px-3.5 py-2.5 backdrop-blur-md opaco:bg-[#070c16] lg:flex" />
            </div>

            <figcaption className="sr-only">{resumen}</figcaption>
          </figure>

          <Leyenda className="order-5 -mt-0.5 lg:hidden" />
        </div>
      </Reveal>

      {/* Fuentes y atribución del mapa (12 px, siempre visible) */}
      <p className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-xs leading-snug text-ink-3 sm:mt-4 sm:gap-x-3">
        <span>
          {T4.pie.caminos}{" "}
          <Fuente href={T4.pie.caminosUrl}>
            {T4.pie.caminosFuente}
            <span className="sr-only"> {T4.pie.nuevaPestana}</span>
          </Fuente>{" "}
          {T4.pie.caminosLicencia}
        </span>
        <span aria-hidden>·</span>
        <span>
          {T4.pie.satelite}{" "}
          <Fuente href={T4.pie.sateliteUrl}>
            {T4.pie.sateliteFuente}
            <span className="sr-only"> {T4.pie.nuevaPestana}</span>
          </Fuente>{" "}
          {T4.pie.sateliteDetalle}
        </span>
        <span aria-hidden>·</span>
        <Fuente href={T4.pie.nisarUrl}>
          {T4.pie.nisar}
          <span className="sr-only"> {T4.pie.nuevaPestana}</span>
        </Fuente>
      </p>
    </div>
  );
}
