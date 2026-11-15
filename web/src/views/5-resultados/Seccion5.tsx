"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Check, ChevronDown, Copy, Droplets, FlaskConical, Hourglass, Satellite } from "lucide-react";
import Seccion from "@/components/Seccion";
import Estado from "@/components/Estado";
import Fuente from "@/components/Fuente";
import Reveal from "@/components/Reveal";
import { useMenosMovimiento } from "@/components/hooks";
import datos from "@/data/resultados.json";
import { textos as t } from "./textos";

/* ---------- Formato (coma decimal, punto de miles; igual en servidor y navegador) ---------- */

function fmt(n: number, decimales = 1): string {
  const [entero, dec] = Math.abs(n).toFixed(decimales).split(".");
  const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "-" : ""}${miles}${dec ? `,${dec}` : ""}`;
}

/* ---------- Datos de la red (todo sale del JSON) ---------- */

const { radar, red, eco, secado } = datos;
const kmIntransitable = red.km.intransitable;
const decimalesPrincipal = Number.isInteger(kmIntransitable) ? 0 : 1;

/* ---------- Hooks locales ---------- */

/** true una sola vez, cuando el elemento (chico) entra bien en pantalla. */
function useAlEntrar(ref: RefObject<Element | null>, umbral = 0.3): boolean {
  const [entro, setEntro] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setEntro(true);
          io.disconnect();
        }
      },
      { threshold: umbral },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, umbral]);
  return entro;
}

/**
 * Cuenta de 0 al valor final al entrar en pantalla.
 * En el servidor y sin JS muestra el valor final; con menos movimiento no anima.
 */
function useContador(fin: number, activo: boolean, menos: boolean, duracion = 1600): number {
  const [valor, setValor] = useState(fin);
  const arranco = useRef(false);

  // Al montar: si la persona acepta movimiento y todavía no se vio, arranca en 0.
  useEffect(() => {
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!quieto && !arranco.current) setValor(0);
  }, []);

  useEffect(() => {
    if (!activo) return;
    arranco.current = true;
    if (menos) {
      setValor(fin);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const paso = (ahora: number) => {
      const p = Math.min(1, (ahora - t0) / duracion);
      const suave = 1 - Math.pow(1 - p, 4);
      setValor(fin * suave);
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [activo, menos, fin, duracion]);

  return valor;
}

/* ---------- Piezas ---------- */

function Fondo() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,var(--bg-2)_0%,var(--bg)_65%)]" />
      <div className="absolute -left-40 top-[8%] size-[36rem] rounded-full bg-danger/[0.07] blur-3xl" />
      <div className="absolute -right-48 bottom-[-18%] size-[44rem] rounded-full bg-water/[0.16] blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(70% 60% at 50% 40%, black, transparent)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 40%, black, transparent)",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
    </div>
  );
}

function Copiar({ texto, que }: { texto: string; que: string }) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const id = window.setTimeout(() => setCopiado(false), 2200);
    return () => window.clearTimeout(id);
  }, [copiado]);

  /** Respaldo sin Clipboard API: devuelve el foco a donde estaba la persona. */
  function copiarRespaldo(): boolean {
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.setAttribute("aria-hidden", "true");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    let ok = false;
    try {
      area.select();
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    area.remove();
    previo?.focus({ preventScroll: true });
    return ok;
  }

  async function copiar() {
    let ok = false;
    try {
      if (!navigator.clipboard) throw new Error("sin portapapeles");
      await navigator.clipboard.writeText(texto);
      ok = true;
    } catch {
      ok = copiarRespaldo();
    }
    if (ok) setCopiado(true);
  }

  const Icono = copiado ? Check : Copy;
  return (
    <>
      <button
        type="button"
        onClick={copiar}
        aria-label={t.copiarLector(que)}
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-200 ${
          copiado
            ? "border-ok/40 bg-ok-bg text-ok"
            : "border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
        }`}
      >
        <Icono aria-hidden className="size-3.5" strokeWidth={2.25} />
        <span aria-hidden>{copiado ? t.copiado : t.copiar}</span>
      </button>
      <span role="status" className="sr-only">
        {copiado ? t.copiadoLector : ""}
      </span>
    </>
  );
}

function NombreArchivo({ nombre, chico = false }: { nombre: string; chico?: boolean }) {
  return (
    <p
      translate="no"
      className={`select-all break-all font-mono text-xs leading-relaxed ${chico ? "text-ink-3" : "text-ink lg:text-[13px]"}`}
    >
      {nombre}
    </p>
  );
}

function Archivo({ titulo, nombre, que }: { titulo: string; nombre: string; que: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg/55 p-3">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs text-ink-2">{titulo}</span>
        <Copiar texto={nombre} que={que} />
      </div>
      <NombreArchivo nombre={nombre} />
    </div>
  );
}

/** La referencia seca va plegada: el archivo se abre a pedido. */
function ArchivoReferencia({ titulo, nombre, que }: { titulo: string; nombre: string; que: string }) {
  return (
    <details className="group rounded-2xl border border-line bg-bg/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-xs text-ink-3 transition-colors hover:text-ink-2 [&::-webkit-details-marker]:hidden">
        <span>{titulo}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-ink-2">
          {t.verArchivo}
          <ChevronDown
            aria-hidden
            className="size-3.5 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            strokeWidth={2.25}
          />
        </span>
      </summary>
      <div className="flex items-start gap-3 px-3 pb-3">
        <div className="min-w-0 flex-1">
          <NombreArchivo nombre={nombre} chico />
        </div>
        <Copiar texto={nombre} que={que} />
      </div>
    </details>
  );
}

function Apoyo({
  icono: Icono,
  valor,
  texto,
  color,
}: {
  icono: typeof Droplets;
  valor: string;
  texto: string;
  color: string;
}) {
  return (
    <div className="glass flex h-full min-w-0 flex-col rounded-2xl p-3 sm:rounded-3xl sm:p-4">
      <p className="flex items-center gap-2">
        <span
          className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-line sm:size-7 ${color}`}
        >
          <Icono aria-hidden className="size-3.5 sm:size-4" strokeWidth={2} />
        </span>
        <span className="font-mono text-lg font-semibold tracking-tight text-ink tabular-nums sm:text-2xl">
          {valor}
        </span>
      </p>
      <p className="mt-1.5 text-xs leading-snug text-ink-2 sm:mt-2 sm:text-sm">{texto}</p>
    </div>
  );
}

/* ---------- Sección ---------- */

export default function Seccion5() {
  const menos = useMenosMovimiento();
  const refNumero = useRef<HTMLElement>(null);
  const activo = useAlEntrar(refNumero);
  const contado = useContador(kmIntransitable, activo, menos);

  return (
    <Seccion id="s5" titulo={t.tituloSeccion} className="lg:py-10">
      <Fondo />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-6">
        {/* Encabezado */}
        <Reveal>
          <header className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-ink-2">
              <span aria-hidden className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />
              {t.etiqueta}
            </p>
            <h2 className="mt-3 text-balance text-[1.75rem] font-semibold leading-[1.05] tracking-tight text-ink sm:mt-4 sm:text-5xl lg:text-[3.25rem]">
              {t.titulo}
            </h2>
            <p className="mt-2 text-pretty text-base text-ink-2 sm:text-xl lg:text-2xl">{t.bajada}</p>
          </header>
        </Reveal>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Número grande. Sin la barra de la red por estados: la respuesta tiene solo 2 opciones
              (pedido de Facundo, 15/11) y no reclasificamos lo medido. */}
          <Reveal delay={80} className="lg:col-span-7">
            <article
              ref={refNumero}
              className="glass relative flex h-full flex-col justify-center overflow-hidden rounded-[1.75rem] p-5 sm:p-8 lg:p-10"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-danger/10 blur-3xl"
              />
              <div>
                <Estado tono="peligro" grande />
              </div>
              <p className="sr-only">{t.lectorPrincipal(fmt(kmIntransitable, decimalesPrincipal), fmt(red.km_total, 0))}</p>
              <div aria-hidden className="mt-4 flex items-end gap-3 sm:mt-6">
                <span className="text-[clamp(4.75rem,18vw,9rem)] font-semibold leading-[0.85] tracking-[-0.04em] text-ink tabular-nums">
                  {fmt(contado, decimalesPrincipal)}
                </span>
                <span className="pb-1 text-xl leading-tight text-ink-2 sm:pb-2 sm:text-2xl">
                  {t.unidadKm}
                  <br />
                  <span className="text-danger">{t.intransitables}</span>
                </span>
              </div>
              <p aria-hidden className="mt-3 text-sm text-ink-3 sm:mt-4 sm:text-lg">
                {t.deMedidos(fmt(red.km_total, 0))}
              </p>

            </article>
          </Reveal>

          <div className="flex flex-col gap-3 sm:gap-4 lg:col-span-5">
            {/* Datos de apoyo: 2 columnas compactas también en el celular */}
            <Reveal delay={160}>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Apoyo
                  icono={Droplets}
                  color="text-accent"
                  valor={t.ecoValor(fmt(eco.camino_1_db))}
                  texto={t.ecoTexto}
                />
                <Apoyo
                  icono={Hourglass}
                  color="text-warn"
                  valor={t.secadoValor(fmt(secado.media_vida_dias))}
                  texto={t.secadoTexto(fmt(secado.pasadas_usadas, 0))}
                />
              </div>
            </Reveal>

            {/* Fuente */}
            <Reveal delay={240} className="flex-1">
              <section aria-labelledby="s5-fuente" className="glass h-full rounded-[1.75rem] p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Satellite aria-hidden className="size-4 text-accent" strokeWidth={2} />
                  <h3 id="s5-fuente" className="text-sm font-medium text-ink-2">
                    {t.tituloFuente}
                  </h3>
                </div>
                <p className="mt-2 font-mono text-xs leading-relaxed text-ink">{t.lineaFuente(radar)}</p>
                <div className="mt-3 flex flex-col gap-2">
                  <Archivo titulo={t.archivo} nombre={radar.archivo} que={t.queArchivo} />
                  <ArchivoReferencia
                    titulo={t.archivoReferencia}
                    nombre={radar.archivo_referencia}
                    que={t.queReferencia}
                  />
                </div>
                <p className="mt-3 text-sm font-medium text-accent">
                  <Fuente href={radar.verificar_url}>
                    {t.verificar}
                    <span className="sr-only"> {t.nuevaPestana}</span>
                  </Fuente>
                </p>
              </section>
            </Reveal>
          </div>
        </div>

        {/* Cierre + pie */}
        <Reveal delay={320}>
          <footer className="flex flex-col gap-5 border-t border-line pt-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:order-last lg:flex-col lg:items-end">
              {/* Sin botón "Probá la demo" (pedido de Facundo, 15/11). */}
              <p className="text-base font-medium text-ink">{t.cierre}</p>
              <p className="flex items-baseline gap-2">
                <span className="text-sm font-semibold tracking-[0.32em] text-ink">{t.marca}</span>
                <span className="text-xs text-ink-3">{t.marcaBajada}</span>
              </p>
            </div>

            <div className="flex max-w-3xl flex-col gap-1.5 text-xs leading-relaxed text-ink-3">
              <p>
                <span className="mr-1.5 inline-flex items-center gap-1 font-semibold text-ok">
                  <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
                  {t.real}
                </span>
                {t.realTexto}{" "}
                <span className="ml-1 mr-1.5 inline-flex items-center gap-1 font-semibold text-warn">
                  <FlaskConical aria-hidden className="size-3.5" strokeWidth={2.25} />
                  {t.simulado}
                </span>
                {t.simuladoTexto}
              </p>
              <p>
                {t.hecho}
                <span aria-hidden className="mx-2 text-ink-3/60">
                  {t.separador}
                </span>
                {t.ia}
              </p>
            </div>
          </footer>
        </Reveal>
      </div>
    </Seccion>
  );
}
