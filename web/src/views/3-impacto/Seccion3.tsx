import { Coins, HeartPulse, Hourglass, Landmark, Truck, type LucideIcon } from "lucide-react";
import Seccion from "@/components/Seccion";
import Estado from "@/components/Estado";
import Fuente from "@/components/Fuente";
import Reveal from "@/components/Reveal";
import { CLASE_H2 } from "@/components/Encabezado";
import Lienzo, { Pulso } from "./Lienzo";
import { T3, type ClaveRecuadro, type Fuente3 } from "./textos";
import s from "./Seccion3.module.css";

const ICONOS: Record<ClaveRecuadro, LucideIcon> = {
  salud: HeartPulse,
  logistica: Truck,
  tiempo: Hourglass,
  dinero: Coins,
};

/** Escalonado corto y no uniforme para los 4 recuadros (ms). */
const DEMORAS = [120, 165, 200, 225];

/** Línea de fuente: organismo, con link. Sin fecha a la vista (pedido de Facundo, 15/11). */
function LineaFuente({ f }: { f: Fuente3 }) {
  return (
    <p className="text-xs leading-snug text-ink-3">
      <Fuente href={f.url}>
        {f.texto}
        <span className="sr-only"> {T3.nuevaPestana}</span>
      </Fuente>
    </p>
  );
}

/** Sección 3 · Por qué ahora: El Niño. Se lee en 4 segundos: aviso oficial + 4 recuadros. */
export default function Seccion3() {
  const { aviso } = T3;
  return (
    <Seccion id="s3" titulo={T3.tituloSeccion} className="bg-bg">
      <Lienzo>
        <div className="mx-auto w-full max-w-6xl">
          {/* Aviso grande: título a la izquierda, dos cifras en fila a la derecha. */}
          <Reveal delay={80}>
            <article className="glass relative overflow-hidden rounded-3xl !border-warn/25">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-warn/70 to-transparent"
              />
              <span aria-hidden className="pointer-events-none absolute -left-24 -top-28 size-80 rounded-full bg-warn/10 blur-3xl" />

              <div className="relative grid gap-4 p-4 sm:gap-6 sm:p-7 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-8 lg:p-8">
                <div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="relative inline-flex">
                      <Pulso />
                      <Estado tono="cuidado" texto={aviso.estado} />
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm text-ink-2">
                      <Landmark aria-hidden className="size-4 shrink-0 text-ink-3" strokeWidth={2} />
                      {aviso.respaldo}
                    </span>
                  </div>

                  <h2 className={`mt-3 sm:mt-5 ${CLASE_H2}`}>
                    <span className={s.tituloDegrade}>{aviso.tituloResaltado}</span>
                    {aviso.tituloResto}
                  </h2>
                  <p className="mt-3 hidden max-w-xl text-xl leading-snug text-ink-2 sm:block">{aviso.bajada}</p>
                </div>

                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line">
                  {aviso.datos.map((d) => (
                    <div key={d.valor} className="flex flex-col bg-bg-2/85 p-3.5 sm:p-4">
                      <p className="hidden text-xs leading-snug text-ink-3 sm:block">{d.previo}</p>
                      <p className="text-3xl sm:mt-1 font-semibold tabular-nums tracking-[-0.03em] text-ink sm:text-4xl">
                        {d.valor}
                      </p>
                      <p className="mt-1 text-sm leading-snug text-ink-2">{d.texto}</p>
                      <div className="mt-auto pt-3">
                        <LineaFuente f={d.fuente} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>

          {/* Los 4 recuadros: etiqueta, un dato corto y su fuente. */}
          <h3 className="sr-only">{T3.recuadrosTitulo}</h3>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:mt-6 lg:grid-cols-4 lg:gap-4">
            {T3.recuadros.map((r, i) => {
              const Icono = ICONOS[r.clave];
              return (
                <li key={r.clave}>
                  <Reveal delay={DEMORAS[i] ?? 225} className="h-full">
                    <article className="glass flex h-full flex-col rounded-2xl p-3.5 transition-[border-color] duration-200 ease-[ease] hover:!border-warn/35 sm:p-5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-warn/30 bg-warn-bg text-warn sm:size-9 sm:rounded-xl">
                          <Icono aria-hidden className="size-4 sm:size-[18px]" strokeWidth={2} />
                        </span>
                        <h4 className="text-sm font-medium text-ink-2">{r.etiqueta}</h4>
                      </div>
                      <p className="mt-2.5 text-base font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-2xl">{r.dato}</p>
                      {"corto" in r && <p className="mt-1 text-xs leading-snug text-ink-2 sm:hidden">{r.corto}</p>}
                      <p className="mt-1.5 hidden text-sm leading-snug text-ink-2 sm:block">{r.complemento}</p>
                      <div className="mt-auto pt-3">
                        <div className="border-t border-line pt-2.5">
                          <LineaFuente f={r.fuente} />
                        </div>
                      </div>
                    </article>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </Lienzo>
    </Seccion>
  );
}
