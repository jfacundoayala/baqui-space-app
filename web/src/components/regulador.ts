// Mide cuánto tarda cada cuadro de una animación y avisa cuando el equipo no da abasto,
// para que la animación baje su calidad (equipos sin placa de video, celulares viejos).

const CUADRO_LENTO_MS = 40; // menos de 25 cuadros por segundo
const VENTANA = 45; // cuadros que se miran antes de decidir…
const VENTANA_MS = 1200; // …o este tiempo, lo que pase primero (un equipo lento junta pocos cuadros)
const CUADROS_MIN = 6;
const PARTE_LENTA = 0.6;

export type Regulador = { readonly nivel: number; medir(dtMs: number): void; reiniciar(): void };

/** `alBajar(nivel)` se llama cada vez que hay que bajar un escalón de calidad (1, 2, … hasta `niveles`). */
export function crearRegulador(alBajar: (nivel: number) => void, niveles = 2): Regulador {
  let nivel = 0;
  let cuadros = 0;
  let lentos = 0;
  let ms = 0;
  return {
    get nivel() {
      return nivel;
    },
    /** dtMs: tiempo real entre este cuadro y el anterior (0 en el primero después de una pausa). */
    medir(dtMs) {
      if (nivel >= niveles || dtMs <= 0) return;
      cuadros++;
      if (dtMs > CUADRO_LENTO_MS) lentos++;
      ms += dtMs;
      if (cuadros < VENTANA && (ms < VENTANA_MS || cuadros < CUADROS_MIN)) return;
      const lento = lentos > cuadros * PARTE_LENTA;
      cuadros = lentos = ms = 0;
      if (lento) alBajar(++nivel);
    },
    reiniciar() {
      cuadros = lentos = ms = 0;
    },
  };
}
