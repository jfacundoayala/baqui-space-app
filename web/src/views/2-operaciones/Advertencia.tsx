"use client";
import { useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { useMenosMovimiento } from "@/components/hooks";
import { textos } from "./textos";

const { prefijo, resto } = textos.advertencia;
const COMPLETO = prefijo + resto;
const PASO_MS = 34;

/** Cartel de advertencia: se escribe letra por letra al entrar en pantalla. */
export default function Advertencia() {
  const ref = useRef<HTMLDivElement>(null);
  const menos = useMenosMovimiento();
  const [visible, setVisible] = useState(false);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Escribe solo mientras se ve; queda completo y quieto con menos movimiento.
  useEffect(() => {
    if (menos || !visible || n >= COMPLETO.length) return;
    const t = window.setTimeout(() => setN((v) => v + 1), n === 0 ? 450 : PASO_MS);
    return () => window.clearTimeout(t);
  }, [menos, visible, n]);

  const largo = menos ? COMPLETO.length : n;
  const escrito = COMPLETO.slice(0, largo);
  const parteFuerte = escrito.slice(0, prefijo.length);
  const parteResto = escrito.slice(prefijo.length);
  const terminado = largo >= COMPLETO.length;

  return (
    <div
      ref={ref}
      className="flex items-start gap-3 rounded-2xl border border-warn/40 bg-warn-bg px-4 py-3.5 text-warn sm:items-center sm:px-5"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-warn/40 bg-warn/10">
        <TriangleAlert
          aria-hidden
          className={`size-5 ${terminado && visible && !menos ? "animate-pulse" : ""}`}
          strokeWidth={2.4}
        />
      </span>
      <p className="relative min-w-0 font-mono text-sm leading-snug sm:text-[0.95rem]">
        <span className="sr-only">{COMPLETO}</span>
        {/* Copia invisible: reserva el lugar para que no salte el diseño mientras se escribe. */}
        <span aria-hidden className="invisible">
          <strong className="font-semibold tracking-wide">{prefijo}</strong>
          <span>{resto}</span>
          {/* Reserva también el ancho del cursor. */}
          <span className="ml-0.5 inline-block h-[1.05em] w-[0.5ch]" />
        </span>
        <span aria-hidden className="absolute inset-0">
          <strong className="font-semibold tracking-wide">{parteFuerte}</strong>
          <span className="text-warn/90">{parteResto}</span>
          {!terminado && (
            <span className="ml-0.5 inline-block h-[1.05em] w-[0.5ch] translate-y-[0.15em] bg-warn/80" />
          )}
        </span>
      </p>
    </div>
  );
}
