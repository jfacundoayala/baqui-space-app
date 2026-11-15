"use client";
// Fondo de tormenta (escena ilustrativa): nubes que se mueven lento, lluvia fuerte en diagonal,
// rayos con su re-golpe, relámpagos lejanos y el temblor del trueno.
// Por fotosensibilidad (WCAG 2.3.1, nunca más de 3 destellos por segundo): un rayo cada 4,5 a 8,5 s
// (con un solo re-golpe a los 0,23 s) y, en el medio, un relámpago lejano tenue. Sin parpadeo rápido.
// Con menos movimiento queda un cuadro quieto, sin lluvia, rayos ni temblor.

import { useEffect, useRef } from "react";

type Capa = { img: HTMLCanvasElement; velocidad: number; alto: number; alfa: number };
type Gota = { x: number; y: number; largo: number; vel: number; z: number };
type Punto = [number, number];
/** Un destello: rayo (con dibujo y re-golpe) o relámpago lejano (solo luz entre las nubes). */
type Destello = { inicio: number; x: number; y: number; fuerza: number; rayo: Punto[][] | null };

const TILE_W = 1024;
const TILE_H = 512;
const VIENTO = 0.27; // corrimiento horizontal por cada píxel que cae
const ENTRE_RAYOS_MIN = 4500;
const ENTRE_RAYOS_EXTRA = 4000;
const RE_GOLPE = 230; // ms entre el rayo y su re-golpe
const TRUENO_DESDE = 650; // ms: el trueno llega después de la luz
const TRUENO_DURA = 1000;

/** Luz de un destello: sube en 90 ms y se apaga despacio. */
function pulso(dt: number): number {
  if (dt < 0 || dt > 2200) return 0;
  if (dt < 90) return dt / 90;
  return Math.exp(-(dt - 90) / 340);
}

/** Luz del cielo para un destello; el rayo suma su re-golpe, más suave. */
function luz(e: Destello, ahora: number): number {
  const dt = ahora - e.inicio;
  const p = e.rayo ? Math.max(pulso(dt), 0.7 * pulso(dt - RE_GOLPE)) : pulso(dt);
  return p * e.fuerza;
}

/** Brillo del trazo del rayo: casi instantáneo, se apaga en ~0,3 s y vuelve una vez con el re-golpe. */
function brilloRayo(e: Destello, ahora: number): number {
  const dt = ahora - e.inicio;
  if (dt < 0 || dt > 700) return 0;
  const golpe = dt < 60 ? 1 : Math.exp(-(dt - 60) / 110);
  const re = dt >= RE_GOLPE ? 0.85 * Math.exp(-(dt - RE_GOLPE) / 130) : 0;
  return Math.max(golpe, re);
}

/** Línea quebrada que baja desde (x0, y0) con la inclinación `ang`. */
function quebrar(x0: number, y0: number, ang: number, largo: number, pasos: number, desvio: number): Punto[] {
  const pts: Punto[] = [[x0, y0]];
  let x = x0;
  let y = y0;
  const paso = largo / pasos;
  for (let i = 0; i < pasos; i++) {
    x += Math.sin(ang) * paso + (Math.random() - 0.5) * desvio;
    y += Math.cos(ang) * paso * (0.7 + Math.random() * 0.6);
    pts.push([x, y]);
  }
  return pts;
}

/** Rayo: un tronco quebrado y dos o tres ramas que salen hacia los costados. */
function crearRayo(x0: number, y0: number, largo: number): Punto[][] {
  const ang = (Math.random() - 0.5) * 0.5;
  const tronco = quebrar(x0, y0, ang, largo, 16, largo * 0.09);
  const ramas = [tronco];
  const n = 2 + Math.floor(Math.random() * 2);
  for (let k = 0; k < n; k++) {
    const [bx, by] = tronco[3 + Math.floor(Math.random() * (tronco.length - 7))];
    const lado = Math.random() < 0.5 ? -1 : 1;
    const giro = ang + lado * (0.5 + Math.random() * 0.5);
    ramas.push(quebrar(bx, by, giro, largo * (0.18 + Math.random() * 0.22), 6, largo * 0.06));
  }
  return ramas;
}

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

  // Abajo la capa se desvanece de a poco: así las nubes no terminan en una línea recta.
  ctx.globalCompositeOperation = "destination-out";
  const fin = ctx.createLinearGradient(0, TILE_H * 0.55, 0, TILE_H);
  fin.addColorStop(0, "rgba(0,0,0,0)");
  fin.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = fin;
  ctx.fillRect(0, TILE_H * 0.55, TILE_W, TILE_H * 0.45);
  ctx.globalCompositeOperation = "source-over";
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
      { img: crearCapa(11, 70, [30, 41, 64], 0.7, 0.72, 1.3, 0), velocidad: 5, alto: 0.95, alfa: 1 },
      { img: crearCapa(23, 55, [52, 66, 94], 0.5, 0.62, 1.0, 5), velocidad: 11, alto: 1, alfa: 1 },
      { img: crearCapa(37, 34, [78, 92, 122], 0.32, 0.5, 1.15, 3), velocidad: 19, alto: 0.85, alfa: 1 },
    ];

    let W = 1;
    let H = 1;
    let dpr = 1;
    let gotas: Gota[] = [];

    function nuevaGota(arriba: boolean): Gota {
      const z = 0.45 + Math.random() * 0.55;
      return {
        x: Math.random() * (W + H * VIENTO) - H * VIENTO,
        y: arriba ? -Math.random() * H * 0.3 : Math.random() * H,
        largo: (18 + Math.random() * 24) * z,
        vel: (950 + Math.random() * 550) * z,
        z,
      };
    }

    function ajustar() {
      // En el celular la lluvia se dibuja a densidad 1: se ve igual y pesa menos.
      dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 1024 ? 1 : 1.5);
      W = Math.max(1, canvas!.clientWidth);
      H = Math.max(1, canvas!.clientHeight);
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Lluvia fuerte: unas 500 gotas en una pantalla grande, 120 en el celular.
      const cantidad = Math.round(Math.min(520, Math.max(120, (W * H) / 2500)));
      gotas = Array.from({ length: cantidad }, () => nuevaGota(false));
    }

    // Rayo cada 4,5 a 8,5 s; entre dos rayos, un relámpago lejano (a 1,9 s o más de cada rayo).
    let proximoRayo = performance.now() + 1500 + Math.random() * 1500;
    let proximoLejano = Infinity;
    let destellos: Destello[] = [];

    function lanzar(ahora: number, rayo: boolean) {
      if (rayo) {
        const x = 0.2 + Math.random() * 0.65;
        const y = 0.05 + Math.random() * 0.08;
        const largo = H * (0.4 + Math.random() * 0.3);
        destellos.push({ inicio: ahora, x, y, fuerza: 1, rayo: crearRayo(x * W, y * H, largo) });
      } else {
        const x = 0.05 + Math.random() * 0.9;
        const y = 0.04 + Math.random() * 0.1;
        destellos.push({ inicio: ahora, x, y, fuerza: 0.45, rayo: null });
      }
    }

    /** Desplazamiento vertical del trueno (en px): un temblor corto que se apaga. */
    function trueno(ahora: number): number {
      let y = 0;
      for (const e of destellos) {
        if (!e.rayo) continue;
        const dt = ahora - e.inicio - TRUENO_DESDE;
        if (dt < 0 || dt > TRUENO_DURA) continue;
        const k = 1 - dt / TRUENO_DURA;
        y += 1.8 * k * k * Math.sin(dt * 0.11) * Math.cos(dt * 0.047);
      }
      return y;
    }

    function dibujarRayo(ramas: Punto[][], b: number) {
      const trazos: [number, string][] = [
        [12, `rgba(120,160,255,${0.08 * b})`],
        [5, `rgba(160,195,255,${0.2 * b})`],
        [2.2, `rgba(210,228,255,${0.6 * b})`],
        [1, `rgba(255,255,255,${0.95 * b})`],
      ];
      ramas.forEach((pts, k) => {
        const w = k === 0 ? 1 : 0.55;
        ctx!.beginPath();
        ctx!.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx!.lineTo(pts[i][0], pts[i][1]);
        for (const [ancho, color] of trazos) {
          ctx!.lineWidth = ancho * w;
          ctx!.strokeStyle = color;
          ctx!.stroke();
        }
      });
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
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, W, H);
      if (conLluvia) ctx!.setTransform(dpr, 0, 0, dpr, 0, trueno(ahora) * dpr);
      dibujarNubes("source-over", 1, 0);

      let I = 0;
      if (conLluvia) for (const e of destellos) I += luz(e, ahora);
      I = Math.min(1.2, I);
      if (I > 0.001) {
        // La luz ilumina las nubes desde adentro (solo donde hay nube) y aclara un poco todo el cielo.
        dibujarNubes("lighter", I * 0.75, 1);
        ctx!.globalCompositeOperation = "lighter";
        for (const e of destellos) {
          const Ie = luz(e, ahora);
          if (Ie < 0.001) continue;
          const gx = e.x * W;
          const gy = e.y * H;
          const g = ctx!.createRadialGradient(gx, gy, 0, gx, gy, Math.max(W, H) * (e.rayo ? 0.6 : 0.4));
          g.addColorStop(0, `rgba(170,200,255,${0.36 * Ie})`);
          g.addColorStop(1, "rgba(170,200,255,0)");
          ctx!.fillStyle = g;
          ctx!.fillRect(0, 0, W, H);
        }
        ctx!.fillStyle = `rgba(150,180,240,${0.05 * I})`;
        ctx!.fillRect(0, 0, W, H);
        ctx!.lineJoin = "round";
        ctx!.lineCap = "round";
        for (const e of destellos) {
          if (!e.rayo) continue;
          const b = brilloRayo(e, ahora);
          if (b > 0.01) dibujarRayo(e.rayo, b);
        }
        ctx!.globalCompositeOperation = "source-over";
      }

      if (conLluvia) {
        // Lluvia en tres tandas por profundidad, una sola ruta por tanda.
        const tandas: [number, number, number, number][] = [
          [0.45, 0.65, 0.16, 1],
          [0.65, 0.85, 0.27, 1.25],
          [0.85, 1.01, 0.42, 1.7],
        ];
        ctx!.lineCap = "round";
        for (const [zMin, zMax, a, ancho] of tandas) {
          ctx!.beginPath();
          for (const g of gotas) {
            if (g.z < zMin || g.z >= zMax) continue;
            ctx!.moveTo(g.x, g.y);
            ctx!.lineTo(g.x + g.largo * VIENTO, g.y + g.largo);
          }
          ctx!.strokeStyle = `rgba(190,214,245,${Math.min(0.8, a + I * 0.2)})`;
          ctx!.lineWidth = ancho;
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
      if (ahora >= proximoRayo) {
        lanzar(ahora, true);
        proximoRayo = ahora + ENTRE_RAYOS_MIN + Math.random() * ENTRE_RAYOS_EXTRA;
        // El lejano cae a 1,9 s o más del rayo y a 1,4 s o más del siguiente.
        proximoLejano = ahora + 1900 + Math.random() * Math.max(0, proximoRayo - ahora - 3300);
      }
      if (ahora >= proximoLejano) {
        lanzar(ahora, false);
        proximoLejano = Infinity;
      }
      destellos = destellos.filter((e) => ahora - e.inicio < 2300);
      dibujar(ahora, true);
    }

    control.current = {
      arrancar() {
        if (raf) return;
        previo = 0;
        // Si estuvo en pausa, el próximo rayo espera de nuevo (nunca dos seguidos al volver).
        proximoRayo = Math.max(proximoRayo, performance.now() + 1500);
        proximoLejano = Infinity;
        destellos = [];
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
