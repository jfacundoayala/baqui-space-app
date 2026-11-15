import Seccion from "@/components/Seccion";
import Demo from "./Demo";
import { T4 } from "./textos";

/** Sección 4 · La demo: elegís a dónde vas y BAQUI te dice cómo está el camino hoy. */
export default function Seccion4() {
  return (
    <Seccion id="s4" titulo={T4.tituloSeccion} className="bg-bg max-sm:py-5">
      {/* Fondo con profundidad: cielo de tormenta */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_70%_0%,rgb(47_127_209/0.16),transparent_70%)]" />
        <div className="absolute -left-40 top-1/3 size-[36rem] rounded-full bg-[#1d3b66]/25 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 size-[28rem] rounded-full bg-[#2f7fd1]/10 blur-[110px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
      </div>
      <Demo />
    </Seccion>
  );
}
