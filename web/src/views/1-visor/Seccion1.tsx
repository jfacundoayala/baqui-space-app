"use client";
// Sección 1 · Qué es BAQUI. Abre la página: nombre, frase, globo con NISAR y la tormenta de fondo.

import dynamic from "next/dynamic";
import { useRef } from "react";
import { ChevronDown, Radar } from "lucide-react";
import Seccion from "@/components/Seccion";
import Estado from "@/components/Estado";
import Fuente from "@/components/Fuente";
import { useEnPantalla, useMenosMovimiento } from "@/components/hooks";
import { textos } from "./textos";

// WebGL y canvas solo en el cliente.
const Globo = dynamic(() => import("./Globo"), { ssr: false });
const Tormenta = dynamic(() => import("./Tormenta"), { ssr: false });

const t = textos;

export default function Seccion1() {
  const fondoRef = useRef<HTMLDivElement>(null);
  const visible = useEnPantalla(fondoRef);
  const menos = useMenosMovimiento();

  function irA(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: menos ? "auto" : "smooth", block: "start" });
    // Lleva el foco a la sección para que el teclado siga desde ahí.
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }

  const pausa = { animationPlayState: visible ? "running" : "paused" } as const;

  return (
    <Seccion id="s1" titulo={t.seccion} className="bg-bg justify-start! lg:justify-center!">
      <style>{`
        @keyframes s1-bajar { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(5px); } }
        @keyframes s1-latido { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.6); opacity: 0; } }
      `}</style>

      {/* Fondo: cielo de tormenta con profundidad. */}
      <div ref={fondoRef} aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_70%_-10%,#1a2740_0%,#0c1424_45%,#060a13_80%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_78%_55%,rgb(47_127_209/0.16),transparent_70%)]" />
        <Tormenta activo={visible} menos={menos} />
      </div>

      {/* Globo: abajo en el celular, a la derecha en pantallas grandes. */}
      <div
        className="absolute bottom-[-10svh] left-1/2 z-0 h-[56svh] w-[150vw] max-w-[1000px] -translate-x-1/2
          lg:bottom-auto lg:left-auto lg:right-[-3vw] lg:top-1/2 lg:h-[min(100svh,64vw)] lg:w-[58vw] lg:max-w-none lg:translate-x-0 lg:-translate-y-1/2"
      >
        <Globo activo={visible} menos={menos} />
      </div>

      {/* Velo inferior: funde el globo con la sección siguiente y deja leer los créditos. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[18svh] bg-linear-to-t from-bg via-bg/60 to-transparent lg:h-[16svh]"
      />

      {/* Contenido. */}
      {/* pointer-events-none afuera y auto en el texto: así el arrastre llega al globo que queda debajo. */}
      <div className="pointer-events-none relative z-10 mx-auto w-full max-w-6xl pt-2 lg:pt-0">
        <div className="pointer-events-auto max-w-xl lg:max-w-[min(36rem,46vw)]">
          <p
            className="glass rise inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl px-3.5 sm:rounded-full py-1.5 text-xs font-medium text-ink-2 sm:text-sm"
            style={{ animationDelay: "0ms" }}
          >
            <span aria-hidden className="relative inline-flex size-4 items-center justify-center text-accent">
              <span
                className="absolute inset-0 rounded-full bg-accent/40"
                style={{ animation: "s1-latido 2.4s ease-out infinite", ...pausa }}
              />
              <Radar className="relative size-4" strokeWidth={2.25} />
            </span>
            <span className="text-ink">{t.chip.radar}</span>
            <span aria-hidden className="text-ink-3">
              ·
            </span>
            <span>{t.chip.agencias}</span>
            <span aria-hidden className="text-ink-3">
              ·
            </span>
            <span>{t.chip.detalle}</span>
          </p>

          <h1
            className="rise mt-6 bg-linear-to-b from-white via-[#e6eefb] to-[#9db4d6] bg-clip-text pb-2 text-[clamp(4.75rem,26vw,10.5rem)] font-semibold leading-[0.86] tracking-[-0.045em] text-transparent lg:mt-8 lg:text-[min(10.5rem,13vw)]"
            style={{ animationDelay: "80ms" }}
          >
            {t.nombre}
          </h1>

          <p
            className="rise mt-4 max-w-[30ch] lg:max-w-[32ch] text-xl leading-snug text-ink-2 [text-wrap:pretty] sm:text-2xl lg:mt-6 lg:text-[1.7rem] lg:leading-[1.3]"
            style={{ animationDelay: "160ms" }}
          >
            {t.frase}{" "}
            {/* "BAQUI te lo dice." va junto, en su propia línea (pedido de Facundo). */}
            <strong className="block whitespace-nowrap font-semibold text-ink">{t.remate}</strong>
          </p>

          <div className="rise mt-6 max-lg:[@media(max-height:719px)]:hidden lg:mt-8" style={{ animationDelay: "240ms" }}>
            <p className="text-sm text-ink-3">{t.estadosEtiqueta}</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {t.estados.map((e) => (
                <li key={e.tono}>
                  <Estado tono={e.tono} texto={e.texto} />
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Pie: créditos a la izquierda e indicación para bajar al centro. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-4 pb-4 sm:px-8 sm:pb-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 lg:flex-row lg:items-end lg:justify-between">
          <button
            type="button"
            onClick={() => irA("s2")}
            className="pointer-events-auto order-1 inline-flex flex-col items-center gap-0.5 rounded-full px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:text-ink lg:order-2 lg:absolute lg:left-1/2 lg:-translate-x-1/2"
          >
            {t.bajar}
            <ChevronDown
              aria-hidden
              className="size-4"
              style={{ animation: "s1-bajar 2.6s ease-in-out infinite", ...pausa }}
            />
          </button>
          <p className="pointer-events-auto order-2 max-w-full text-center text-xs leading-relaxed text-ink-3 lg:order-1 lg:max-w-[46%] lg:text-left">
            <Fuente href={t.creditos.tierraUrl}>
              {t.creditos.tierra}
              <span className="sr-only"> {t.creditos.nuevaPestana}</span>
            </Fuente>
            <span aria-hidden> · </span>
            <Fuente href={t.creditos.orbitaUrl}>
              {t.creditos.orbita}
              <span className="sr-only"> {t.creditos.nuevaPestana}</span>
            </Fuente>
            <span aria-hidden> · </span>
            {t.creditos.escala}
            <span aria-hidden> · </span>
            {t.creditos.tormenta}
          </p>
        </div>
      </div>
    </Seccion>
  );
}
