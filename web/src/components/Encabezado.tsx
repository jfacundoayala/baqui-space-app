import type { ReactNode } from "react";

/** Escala única del título de cada sección (de la 2 a la 5). */
export const CLASE_H2 = "text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl";

/** Antetítulo de sección: raya + "0N · Nombre", igual en todas. */
export function Antetitulo({ numero, children }: { numero: number; children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-xs tracking-[0.14em] text-accent">
      <span aria-hidden className="h-px w-8 bg-accent/60" />
      <span>
        {String(numero).padStart(2, "0")} · {children}
      </span>
    </p>
  );
}

/** Antetítulo + título (h2) con la misma escala en las secciones 2 a 5. */
export default function Encabezado({
  numero,
  antetitulo,
  titulo,
  className = "",
}: {
  numero: number;
  antetitulo: ReactNode;
  titulo: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Antetitulo numero={numero}>{antetitulo}</Antetitulo>
      <h2 className={`mt-2 sm:mt-3 ${CLASE_H2}`}>{titulo}</h2>
    </div>
  );
}
