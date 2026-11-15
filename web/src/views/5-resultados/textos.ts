// Todos los textos visibles de la sección 5 (cómo lo sabe BAQUI y cierre).
// Los números llegan ya formateados desde Seccion5.tsx (salen de src/data/resultados.json).
// BAQUI es una consulta de hoy, no un histórico: sin fechas a la vista.

export const textos = {
  tituloSeccion: "Cómo lo sabe BAQUI",
  /** El número (05) y la raya los pone el componente Encabezado. */
  etiqueta: "Cómo lo sabe BAQUI",
  // "Zona" y no "camino": el campo de alrededor subió casi lo mismo (+1,57 dB contra +1,63 dB en el eje), el radar no
  // separa el camino de su entorno (docs/HIPOTESIS-FISICA.md, sección 3). Elegido por Facundo, 15/11.
  titulo: "El radar ve la zona mojada.",
  bajada: "Medición real del radar NISAR de NASA sobre caminos de tierra. Verificable gratis.",

  // Hipótesis física, arriba del número: primero la causa, después la prueba (pedido de Facundo, 15/11).
  // Sale de docs/HIPOTESIS-FISICA.md, sección 1.
  hipotesis: {
    etiqueta: "Hipótesis física",
    titulo: "Por qué pasa",
    pasos: [
      { clave: "seco", nombre: "Seco", eco: "Eco normal", texto: "La tierra seca devuelve el eco de siempre." },
      { clave: "mojado", nombre: "Mojado", eco: "El eco sube", texto: "La tierra mojada refleja más señal." },
      { clave: "agua", nombre: "Con agua", eco: "El eco cae", texto: "Si el agua tapa la zona, hace de espejo: casi no vuelve." },
    ],
    // Texto de Facundo; "y su entorno" suma lo que mostró la medición (zona mojada).
    // En dos partes: en el celular la causa no se muestra porque los 3 pasos ya la dicen.
    fraseCausa:
      "Con la lluvia de El Niño, el suelo del camino y su entorno se mojan y el eco del radar sube. Si el agua tapa el camino y su entorno, el eco cae.",
    fraseComo:
      "Comparando cada pasada de NISAR con una de referencia de la misma órbita, BAQUI ve si la zona está seca, mojada o con agua, y responde transitable o intransitable.",
  },

  // Número principal: el eco extra del radar sobre los caminos de tierra (pedido de Facundo, 15/11).
  // Los "23 km intransitables" se sacaron: salían de una sospecha (eco que sube bajo el monte), no de un corte confirmado.
  estado: "Zona mojada",
  ecoValor: (db: string) => `+${db}`,
  unidadDb: "dB",
  // Sin "contra la tierra seca": la pasada de referencia no estaba del todo seca (ver _fuente en resultados.json).
  ecoRotulo: "de eco extra",
  principal: "El eco subió sobre los caminos de tierra y su entorno: la zona se mojó.",
  detallePrincipal: (km: string) => `Valor del medio sobre el centro de ${km} km de caminos de tierra de OpenStreetMap.`,
  lectorPrincipal: (db: string, km: string) =>
    `Sobre ${km} km de caminos de tierra y su entorno, el radar recibe ${db} decibeles de eco extra: la zona se mojó.`,

  // Datos de apoyo
  subenValor: (n: string) => `${n} de 10`,
  // Son puntos sueltos y el radar tiene moteado: el mismo cálculo en el campo lejos da la referencia.
  subenTexto: (campo: string) =>
    `puntos del camino con más de 1 dB extra. En el campo lejos, con monte: ${campo} de 10.`,
  aguaValor: (pct: string) => `${pct} %`,
  aguaTexto: (px: string, total: string) =>
    `con agua abierta: ${px} de ${total} puntos. Mojados, no inundados (bajo el monte no se puede confirmar).`,

  // Fuente (sin nombres de archivo a la vista: llevan la fecha de cada pasada)
  tituloFuente: "De dónde sale",
  lineaFuente: (r: { satelite: string; banda: string; orbita: string; frame: string }) =>
    `Radar ${r.satelite} · banda ${r.banda} · órbita ${r.orbita} · frame ${r.frame}`,
  medicion: "Medición: caminos de tierra de OpenStreetMap, mediana del eje",
  copiarId: "Copiar ID del archivo",
  copiado: "Copiado",
  copiarLector: "Copiar el identificador oficial del archivo NISAR, para buscarlo en ASF Vertex",
  copiadoLector: "Identificador copiado.",
  verificar: "Verificalo gratis en ASF Vertex",
  nuevaPestana: "(se abre en otra pestaña)",

  // Cierre
  cierre: "¿Llegás hoy? Consultá tu camino.",
  marca: "BAQUI",
  marcaBajada: "Caminos rurales leídos desde el espacio",

  // Pie
  real: "Real:",
  realTexto: "radar NISAR, caminos de OpenStreetMap y los resultados de esta sección.",
  simulado: "Simulado:",
  simuladoTexto: "el agua de la demo (sección 4) y la consola de la sección 2 (escena ilustrativa).",
  hecho: "Hecho para NASA Space Apps Challenge 2026 · General San Martín, Chaco",
  separador: "·",
  ia: "Se usó IA para programar y redactar; está declarado en la entrega.",
} as const;
