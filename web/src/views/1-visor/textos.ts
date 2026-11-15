// Todos los textos visibles de la sección 1 (qué es BAQUI).
// Para traducir al inglés, alcanza con cambiar este archivo.

import type { Tono } from "@/components/Estado";

export const textos = {
  seccion: "Qué es BAQUI",

  chip: {
    radar: "Radar NISAR",
    agencias: "NASA-ISRO",
    detalle: "ve a través de las nubes",
  },

  nombre: "BAQUI",
  // Frase del ticket LANDING-1 (#9), confirmada por Facundo el 15/11.
  frase: "Después de la lluvia, nadie sabe si los caminos rurales están transitables.",
  remate: "BAQUI te lo dice.",

  estadosEtiqueta: "Cada camino, en una palabra:",
  estados: [
    { tono: "ok", texto: "Transitable" },
    { tono: "peligro", texto: "Intransitable" },
  ] satisfies { tono: Tono; texto: string }[],

  bajar: "Para quién es",

  globo: {
    descripcion:
      "La Tierra girando con el satélite NISAR en su órbita real. Un punto que late marca General San Martín, en el Chaco.",
    lugar: "General San Martín, Chaco",
    satelite: "NISAR",
    sinWebgl: "Tu navegador no puede mostrar el globo 3D.",
    cargando: "…",
  },

  hud: {
    titulo: "NISAR, órbita calculada",
    altura: "Altura",
    velocidad: "Velocidad",
    sobre: "Pasa sobre",
    acelerado: "Tiempo acelerado ×120",
    // Con movimiento reducido la escena queda fija en un instante cercano con NISAR a la vista.
    quieto: "Imagen fija, sin animación",
  },

  creditos: {
    tierra: "Tierra: NASA Blue Marble",
    tierraUrl: "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/",
    orbita: "Órbita: TLE de Celestrak",
    orbitaUrl: "https://celestrak.org/NORAD/elements/gp.php?NAME=NISAR&FORMAT=TLE",
    escala: "satélite fuera de escala",
    tormenta: "Tormenta: escena ilustrativa",
    nuevaPestana: "(se abre en otra pestaña)",
  },

  unidades: {
    km: "km",
    kmS: "km/s",
    norte: "N",
    sur: "S",
    este: "E",
    oeste: "O",
  },
};
