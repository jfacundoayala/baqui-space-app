"use client";
import { useRef } from "react";
import { Ambulance, Truck, Van, RadioTower, type LucideIcon } from "lucide-react";
import Estado from "@/components/Estado";
import Reveal from "@/components/Reveal";
import { useEnPantalla, useMenosMovimiento } from "@/components/hooks";
import Advertencia from "./Advertencia";
import { textos, unidades, type IconoUnidad } from "./textos";

const ICONOS: Record<IconoUnidad, LucideIcon> = {
  ambulancia: Ambulance,
  camioneta: Van,
  camion: Truck,
};

const t = textos.consola;

/** Mismas columnas para el encabezado y las filas, así los chips de estado quedan alineados. */
const COLUMNAS = "sm:grid-cols-[2.5rem_1fr_8.5rem_4.5rem]";

/** Punto que pulsa suave mientras la unidad espera. Quieto fuera de pantalla o con menos movimiento. */
function Pulso({ activo, clase, desfase = 0 }: { activo: boolean; clase: string; desfase?: number }) {
  return (
    <span aria-hidden className="relative inline-flex size-2">
      {activo && (
        <span
          className={`absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping ${clase}`}
          style={{ animationDuration: "2.4s", animationDelay: `-${desfase}s` }}
        />
      )}
      <span className={`relative inline-flex size-2 rounded-full ${clase}`} />
    </span>
  );
}

const PUNTO: Record<string, string> = {
  peligro: "bg-danger",
  cuidado: "bg-warn",
  sindato: "bg-nodata",
  ok: "bg-ok",
};

/** Consola de despacho ilustrativa: unidades que no pueden salir porque nadie sabe cómo está el camino. */
export default function Consola() {
  const ref = useRef<HTMLDivElement>(null);
  const enPantalla = useEnPantalla(ref);
  const menos = useMenosMovimiento();
  const activo = enPantalla && !menos;

  return (
    <div ref={ref}>
      {/* Brillo superior del vidrio */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />

      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface sm:grid">
            <RadioTower aria-hidden className="size-5 text-accent" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-xs tracking-wider text-ink-3">{t.codigo}</p>
            <h3 className="text-base font-semibold tracking-tight text-ink sm:text-xl">{t.titulo}</h3>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-2"
          title={t.ilustrativaDetalle}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-ink-3" />
          {t.ilustrativa}
          <span className="sr-only">: {t.ilustrativaDetalle}</span>
        </span>
      </div>

      <div className="space-y-2 px-3 py-2.5 sm:space-y-3 sm:px-6 sm:py-4">
        {/* En el celular la advertencia no va: el pie ya dice "Sin dato". */}
        <div className="hidden sm:block">
          <Advertencia />
        </div>

        {/* Columnas (solo en pantallas anchas) */}
        <div
          aria-hidden
          className={`hidden gap-x-4 border border-transparent px-3 font-mono text-xs text-ink-3 sm:grid ${COLUMNAS}`}
        >
          <span />
          <span>{t.columnas.unidad}</span>
          <span>{t.columnas.estado}</span>
          <span className="text-right">{t.columnas.hora}</span>
        </div>

        <ul aria-label={t.listaEtiqueta} className="space-y-2">
          {unidades.map((u, i) => {
            const Icono = ICONOS[u.icono];
            return (
              <li key={u.codigo}>
                <Reveal delay={[100, 160, 200][i] ?? 200}>
                  <div className={`grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 rounded-2xl border border-line bg-bg-2/60 px-3 py-2 sm:gap-x-4 sm:gap-y-2 sm:py-2.5 ${COLUMNAS}`}>
                    <span className="grid size-8 place-items-center rounded-xl border border-line bg-surface sm:size-9">
                      <Icono aria-hidden className="size-5 text-ink-2" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-medium text-ink sm:text-base">{u.nombre}</span>
                        <span className="hidden font-mono text-xs text-ink-3 sm:inline">{u.codigo}</span>
                      </p>
                      <p className="hidden text-sm text-ink-2 sm:block">{u.detalle}</p>
                    </div>
                    <div className="col-start-2 flex items-center justify-between gap-3 sm:col-start-auto sm:contents">
                      <span className="sm:justify-self-start">
                        <Estado tono={u.tono} texto={u.estado} />
                      </span>
                      <span className="flex items-center justify-end gap-2 font-mono text-sm tabular-nums text-ink-2">
                        {u.esperando && <Pulso activo={activo} clase={PUNTO[u.tono]} desfase={[0, 0.9, 1.6][i] ?? 0} />}
                        <time>{u.hora}</time>
                      </span>
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Pie: de dónde sale el estado del camino (de ningún lado) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-bg/40 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs text-ink-3">{t.pie}</span>
          <Estado tono="sindato" texto={t.pieEstado} />
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
          <Pulso activo={activo} clase="bg-accent" desfase={0.5} />
          <span className="hidden sm:inline">{t.esperando}</span>
          <span aria-hidden className="hidden text-line sm:inline">·</span>
          <span>{t.pieFuente}</span>
        </p>
      </div>
    </div>
  );
}
