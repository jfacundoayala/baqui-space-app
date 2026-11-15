"use client";
import { useRef, type ReactNode } from "react";
import { useEnPantalla, useMenosMovimiento } from "@/components/hooks";
import s from "./Seccion3.module.css";

/** Ondas abstractas (no son datos): alto de referencia 400, ancho 2880 = dos tramos de 1440. */
type Ola = { y: number; a: number; largo: number; color: string; opacidad: number; ancho: number; seg: number; inversa?: boolean };

const OLAS: Ola[] = [
  { y: 170, a: 10, largo: 360, color: "var(--warn)", opacidad: 0.12, ancho: 1, seg: 58, inversa: true },
  { y: 215, a: 24, largo: 720, color: "var(--warn)", opacidad: 0.3, ancho: 1.25, seg: 64 },
  { y: 255, a: 16, largo: 480, color: "var(--warn)", opacidad: 0.18, ancho: 1, seg: 46, inversa: true },
  { y: 295, a: 30, largo: 1440, color: "var(--danger)", opacidad: 0.14, ancho: 1, seg: 80 },
  { y: 335, a: 14, largo: 360, color: "var(--water)", opacidad: 0.32, ancho: 1.25, seg: 40 },
];

/** Onda periódica con curvas Q/T y números enteros (mismo resultado en servidor y cliente). */
function trazo({ y, a, largo }: Ola): string {
  const medio = largo / 2;
  let d = `M0 ${y} Q${largo / 4} ${y - a} ${medio} ${y}`;
  for (let x = medio * 2; x <= 2880; x += medio) d += ` T${x} ${y}`;
  return d;
}

/** Fondo de la sección (resplandor + ondas) y contenido; pausa todo fuera de pantalla. */
export default function Lienzo({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useEnPantalla(ref);
  const menos = useMenosMovimiento();
  const estado = `${visible ? "" : s.pausado} ${menos ? s.quieto : ""}`;

  return (
    <>
      <div ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 -z-10 ${s.fondo} ${estado}`}>
        <div className={`absolute inset-0 ${s.brillo}`} />
        <div className={`absolute inset-x-0 bottom-0 h-[55%] overflow-hidden ${s.olas}`}>
          {OLAS.map((o, i) => (
            <div
              key={i}
              className={`absolute inset-y-0 left-0 w-[200%] ${s.ola}`}
              style={{ animationDuration: `${o.seg}s`, animationDirection: o.inversa ? "reverse" : "normal" }}
            >
              <svg viewBox="0 0 2880 400" preserveAspectRatio="none" className="h-full w-full">
                <path
                  d={trazo(o)}
                  fill="none"
                  stroke={o.color}
                  strokeOpacity={o.opacidad}
                  strokeWidth={o.ancho}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          ))}
        </div>
        {/* Viñeta: oscurece los bordes para que el texto respire. */}
        <div className={`absolute inset-0 ${s.vineta}`} />
      </div>
      <div className={`relative w-full ${estado}`}>{children}</div>
    </>
  );
}

/** Anillo que late detrás del aviso (decorativo). */
export function Pulso() {
  return <span aria-hidden className={`pointer-events-none absolute inset-0 rounded-full border border-warn/60 ${s.pulso}`} />;
}
