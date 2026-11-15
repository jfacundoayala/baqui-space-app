import type { ReactNode } from "react";

/** Escala única del título de cada sección (de la 2 a la 5). */
export const CLASE_H2 = "text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl";

/** Título (h2) con la misma escala en las secciones 2 a 5. Sin antetítulo "0N · Nombre": eso era la estructura de
 *  la guía de la hackatón, no texto para el visitante (pedido de Facundo, 15/11). */
export default function Encabezado({ titulo, className = "" }: { titulo: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h2 className={CLASE_H2}>{titulo}</h2>
    </div>
  );
}
