import { MapPinOff, CarFront, EyeOff, type LucideIcon } from "lucide-react";
import Seccion from "@/components/Seccion";
import Reveal from "@/components/Reveal";
import Encabezado from "@/components/Encabezado";
import Consola from "./Consola";
import { textos } from "./textos";

const ICONOS_DOLOR: LucideIcon[] = [MapPinOff, CarFront, EyeOff];

/** Sección 2: quién es el cliente ideal y qué le duele hoy. */
export default function Seccion2() {
  return (
    <Seccion id="s2" titulo={textos.seccion} className="bg-bg">
      <Fondo />

      <div className="mx-auto w-full max-w-6xl">
        <Reveal>
          <header className="mb-3 max-w-4xl sm:mb-8 lg:mb-6">
            <Encabezado titulo={textos.titulo} />
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-2 sm:mt-4 sm:text-lg">{textos.bajada}</p>
          </header>
        </Reveal>

        <div className="grid gap-3 sm:gap-6 lg:grid-cols-12 lg:gap-8">
          <Reveal delay={80} className="glass relative overflow-hidden rounded-3xl lg:col-span-7">
            <Consola />
          </Reveal>

          <div className="lg:col-span-5">
            <ol className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-1">
              {textos.dolores.lista.map((d, i) => {
                const Icono = ICONOS_DOLOR[i];
                return (
                  <li key={d.numero}>
                    <Reveal delay={160 + ([0, 60, 100][i] ?? 100)} className="glass relative h-full overflow-hidden rounded-2xl">
                      <article className="h-full p-2.5 sm:p-5">
                        <div className="flex flex-col items-start gap-2 sm:gap-3 lg:flex-row lg:gap-4">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-danger/30 bg-danger-bg sm:size-11 sm:rounded-xl">
                            <Icono aria-hidden className="size-4 text-danger sm:size-5" strokeWidth={2} />
                          </span>
                          <div className="min-w-0">
                            {/* Sin el rótulo "0N · tipo": era de la guía, no para el visitante (pedido de Facundo, 15/11). */}
                            <h3 className="text-xs font-semibold leading-snug tracking-tight text-ink sm:text-base lg:text-lg">
                              {d.titulo}
                            </h3>
                            <p className="mt-1 hidden text-sm leading-relaxed text-ink-2 sm:block">{d.texto}</p>
                          </div>
                        </div>
                      </article>
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </Seccion>
  );
}

/** Fondo con profundidad: luz fría arriba, resplandor de alerta abajo y una grilla tenue. */
function Fondo() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 0%, rgb(124 196 255 / 0.10), transparent 70%), radial-gradient(45% 40% at 85% 95%, rgb(248 113 113 / 0.08), transparent 70%), linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 30%, transparent 75%)",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
    </div>
  );
}
