// TLE real de NISAR (NORAD 65053, COSPAR 2025-163A).
// Fuente: Celestrak, https://celestrak.org/NORAD/elements/gp.php?NAME=NISAR&FORMAT=TLE
// Bajado el 15/11/2026. Época del elemento: día 319,24 de 2026 (15/11/2026, 05:45 UTC).
// Un TLE sirve bien unos días alrededor de su época; para una pasada exacta hay que volver a bajarlo.

export const NISAR_TLE = {
  nombre: "NISAR",
  linea1: "1 65053U 25163A   26319.24014874  .00000229  00000+0  82365-4 0  9997",
  linea2: "2 65053  98.4059 144.7287 0001264  90.3576 269.7759 14.42504413 68166",
  fuente: "https://celestrak.org/NORAD/elements/gp.php?NAME=NISAR&FORMAT=TLE",
  bajado: "15/11/2026",
} as const;
