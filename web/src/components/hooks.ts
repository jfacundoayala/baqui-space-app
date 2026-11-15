"use client";
import { useEffect, useState, type RefObject } from "react";

/** true si la persona pidió menos movimiento. */
export function useMenosMovimiento(): boolean {
  const [menos, setMenos] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMenos(mq.matches);
    const cambio = () => setMenos(mq.matches);
    mq.addEventListener("change", cambio);
    return () => mq.removeEventListener("change", cambio);
  }, []);
  return menos;
}

/** true mientras el elemento se ve en pantalla (para pausar animaciones que no se ven). */
export function useEnPantalla(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return visible;
}
