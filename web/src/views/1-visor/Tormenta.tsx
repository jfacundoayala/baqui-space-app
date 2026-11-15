"use client";
// Fondo de tormenta (escena ilustrativa): nubes que se mueven lento, lluvia en diagonal
// y relámpagos suaves. Por fotosensibilidad: un destello cada 6 a 11 s como mínimo, sin parpadeo.
// Con menos movimiento queda un cuadro quieto, sin lluvia ni relámpagos.

import { useEffect, useRef } from "react";

type Capa = { img: HTMLCanvasElement; velocidad: number; alto: number; alfa: number };
type Gota = { x: number; y: number; largo: number; vel: number; z: number };

const TILE_W = 1024;
const TILE_H = 512;
const VIENTO = 0.27; // corrimiento horizontal por cada píxel que cae
const ENTRE_DESTELLOS_MIN = 6000;
const ENTRE_DESTELLOS_EXTRA = 5000;

/** Números pseudoaleatorios repetibles, para que las nubes salgan siempre iguales. */
function azar(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function crearCapa(
  semilla: number,
  cantidad: number,
  color: [number, number, number],
  alfa: number,
  techo: number,
  tamano: number,
  cortinas: number,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TILE_W;
  c.height = TILE_H;
  const ctx = c.getContext("2d")!;
  const r = azar(semilla);
  const [cr, cg, cb] = color;

  // Techo de nubes cerrado arriba.
  const techoGrad = ctx.createLinearGradient(0, 0, 0, TILE_H * techo);
  techoGrad.addColorStop(0, `rgba(${cr},${cg},${cb},${alfa})`);
  techoGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.fillStyle = techoGrad;
  ctx.fillRect(0, 0, TILE_W, TILE_H * techo);

  // Cortinas de lluvia que cuelgan de las nubes.
  for (let i = 0; i < cortinas; i++) {
    const x = r() * TILE_W;
    const w = 40 + r() * 90;
    const y0 = TILE_H * (0.25 + r() * 0.2);
    const g = ctx.createLinearGradient(0, y0, 0, TILE_H);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},${alfa * 0.35})`);
    g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = g;
    for (const dx of [-TILE_W, 0, TILE_W]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y0);
      ctx.lineTo(x + dx + w, y0);
      ctx.lineTo(x + dx + w + w * 0.6, TILE_H);
      ctx.lineTo(x + dx + w * 0.4, TILE_H);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Masas de nube: manchas suaves, más densas arriba. Se dibujan repetidas a los costados
  // para que la capa empalme sin corte al desplazarse.
  for (let i = 0; i < cantidad; i++) {
    const x = r() * TILE_W;
    const y = Math.pow(r(), 1.7) * TILE_H * techo * 1.15;
    const rad = (50 + r() * 120) * tamano;
    const a = alfa * (0.5 + r() * 0.5);
    for (const dx of [-TILE_W, 0, TILE_W]) {
      const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
      g.addColorStop(0.55, `rgba(${cr},${cg},${cb},${a * 0.45})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2);
    }
  }
  return c;
}

export default function Tormenta({ activo, menos }: { activo: boolean; menos: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const control = useRef<{ arrancar: () => void; frenar: () => void; quieto: () => void } | null>(null);
  const estado = useRef({ activo, menos });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const capas: Capa[] = [
      { img: crearCapa(11, 70, [30, 41, 64], 0.7, 0.72, 1.3, 0), velocidad: 5, alto: 0.78, alfa: 1 },
      { img: crearCapa(23, 55, [52, 66, 94], 0.5, 0.62, 1.0, 5), velocidad: 11, alto: 0.9, alfa: 1 },
      { img: crearCapa(37, 34, [78, 92, 122], 0.32, 0.5, 1.15, 3), velocidad: 19, alto: 0.7, alfa: 1 },
    ];

    let W = 1;
    let H = 1;
    let gotas: Gota[] = [];

    function nuevaGota(arriba: boolean): Gota {
      const z = 0.45 + Math.random() * 0.55;
      return {
        x: Math.random() * (W + H * VIENTO) - H * VIENTO,
        y: arriba ? -Math.random() * H * 0.3 : Math.random() * H,
        largo: (12 + Math.random() * 16) * z,
        vel: (700 + Math.random() * 450) * z,
        z,
      };
    }

    function ajustar() {
      // En el celular la lluvia se dibuja a densidad 1: se ve igual y pesa menos.
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 1024 ? 1 : 1.5);
      W = Math.max(1, canvas!.clientWidth);
      H = Math.max(1, canvas!.clientHeight);
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cantidad = Math.round(Math.min(240, Math.max(50, (W * H) / 6500)));
      gotas = Array.from({ length: cantidad }, () => nuevaGota(false));
    }

    // Relámpago: sube en 140 ms y se apaga despacio. Nunca más de uno cada 6 s.
    let proximo = performance.now() + 2500 + Math.random() * 2000;
    let destello = { inicio: -1e9, x: 0.5, y: 0.12 };
    function intensidad(ahora: number): number {
      const dt = ahora - destello.inicio;
      if (dt < 0 || dt > 1800) return 0;
      if (dt < 140) return dt / 140;
      return Math.exp(-(dt - 140) / 380);
    }

    let corrida = 0; // segundos de animación acumulados (no avanza en pausa)

    function dibujarNubes(composicion: GlobalCompositeOperation, alfaExtra: number, desde: number) {
      ctx!.globalCompositeOperation = composicion;
      for (let i = desde; i < capas.length; i++) {
        const c = capas[i];
        const dw = Math.max(W, 900) * 1.25;
        const dh = H * c.alto;
        const off = (corrida * c.velocidad) % dw;
        ctx!.globalAlpha = c.alfa * alfaExtra;
        ctx!.drawImage(c.img, -off, 0, dw, dh);
        ctx!.drawImage(c.img, dw - off, 0, dw, dh);
        if (dw * 2 - off < W) ctx!.drawImage(c.img, dw * 2 - off, 0, dw, dh);
      }
      ctx!.globalAlpha = 1;
      ctx!.globalCompositeOperation = "source-over";
    }

    function dibujar(ahora: number, conLluvia: boolean) {
      ctx!.clearRect(0, 0, W, H);
      dibujarNubes("source-over", 1, 0);

      const I = conLluvia ? intensidad(ahora) : 0;
      if (I > 0.001) {
        // La luz del rayo ilumina las nubes desde adentro (solo donde hay nube).
        dibujarNubes("lighter", I * 0.55, 1);
        ctx!.globalCompositeOperation = "lighter";
        const gx = destello.x * W;
        const gy = destello.y * H;
        const g = ctx!.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * 0.55);
        g.addColorStop(0, `rgba(170,200,255,${0.22 * I})`);
        g.addColorStop(1, "rgba(170,200,255,0)");
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, W, H);
        ctx!.globalCompositeOperation = "source-over";
      }

      if (conLluvia) {
        // Lluvia en tres tandas por profundidad, una sola ruta por tanda.
        const tandas: [number, number, number][] = [
          [0.45, 0.65, 0.1],
          [0.65, 0.85, 0.17],
          [0.85, 1.01, 0.26],
        ];
        ctx!.lineCap = "round";
        for (const [zMin, zMax, a] of tandas) {
          ctx!.beginPath();
          for (const g of gotas) {
            if (g.z < zMin || g.z >= zMax) continue;
            ctx!.moveTo(g.x, g.y);
            ctx!.lineTo(g.x + g.largo * VIENTO, g.y + g.largo);
          }
          ctx!.strokeStyle = `rgba(190,214,245,${a + I * 0.15})`;
          ctx!.lineWidth = zMax > 0.9 ? 1.2 : 1;
          ctx!.stroke();
        }
      }
    }

    let raf = 0;
    let previo = 0;
    function cuadro(ahora: number) {
      raf = requestAnimationFrame(cuadro);
      const dt = previo ? Math.min(0.05, (ahora - previo) / 1000) : 0;
      previo = ahora;
      corrida += dt;
      for (const g of gotas) {
        g.y += g.vel * dt;
        g.x += g.vel * dt * VIENTO;
        if (g.y > H + g.largo) Object.assign(g, nuevaGota(true));
      }
      if (ahora >= proximo) {
        destello = { inicio: ahora, x: 0.15 + Math.random() * 0.7, y: 0.06 + Math.random() * 0.16 };
        proximo = ahora + ENTRE_DESTELLOS_MIN + Math.random() * ENTRE_DESTELLOS_EXTRA;
      }
      dibujar(ahora, true);
    }

    control.current = {
      arrancar() {
        if (raf) return;
        previo = 0;
        // Si estuvo en pausa, el próximo destello espera de nuevo (nunca dos seguidos al volver).
        proximo = Math.max(proximo, performance.now() + 2500);
        raf = requestAnimationFrame(cuadro);
      },
      frenar() {
        cancelAnimationFrame(raf);
        raf = 0;
      },
      quieto() {
        dibujar(performance.now(), false);
      },
    };

    const ro = new ResizeObserver(() => {
      ajustar();
      if (!raf) dibujar(performance.now(), !estado.current.menos);
    });
    ro.observe(canvas);
    ajustar();

    const { activo: a0, menos: m0 } = estado.current;
    if (m0) control.current.quieto();
    else if (a0) control.current.arrancar();
    else dibujar(performance.now(), true);

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      control.current = null;
      for (const c of capas) {
        c.img.width = 0;
        c.img.height = 0;
      }
    };
  }, []);

  useEffect(() => {
    estado.current = { activo, menos };
    const c = control.current;
    if (!c) return;
    if (menos) {
      c.frenar();
      c.quieto();
    } else if (activo) c.arrancar();
    else c.frenar();
  }, [activo, menos]);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}
