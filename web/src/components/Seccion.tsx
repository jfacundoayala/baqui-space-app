import type { ReactNode } from "react";

/** Contenedor de cada sección: ocupa una pantalla y se engancha al bajar. */
export default function Seccion({
  id,
  titulo,
  children,
  className = "",
}: {
  id: string;
  /** Nombre de la sección para lectores de pantalla. */
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-label={titulo}
      className={`relative isolate flex min-h-[100svh] snap-start flex-col justify-center overflow-hidden px-4 py-16 sm:px-8 ${className}`}
    >
      {children}
    </section>
  );
}
