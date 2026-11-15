// Todos los textos visibles de la sección 5 (resultados y cierre).
// Los números llegan ya formateados desde Seccion5.tsx (salen de src/data/resultados.json).

export const textos = {
  tituloSeccion: "Resultados y cierre",
  // Sin fechas a la vista: es lo que leyó el radar en la pasada que procesamos, no un histórico. No decir "última": puede haber una más nueva en ASF.
  etiqueta: "Lo que leyó el radar NISAR en la pasada que procesamos",
  titulo: "Caminos con agua y barro.",
  bajada: "Verificable gratis con el radar NISAR de NASA.",

  // Número principal
  unidadKm: "km",
  intransitables: "intransitables",
  deMedidos: (total: string) => `de ${total} km de caminos medidos en el corredor de San Martín`,
  lectorPrincipal: (km: string, total: string) => `${km} km intransitables de ${total} km medidos.`,

  // Datos de apoyo
  ecoValor: (db: string) => `+${db} dB`,
  ecoTexto: "Subió el eco del radar en el camino 1 comparado con un día seco: suelo empapado.",
  secadoValor: (dias: string) => `${dias} días`,
  secadoTexto: (n: string) =>
    `Si no llueve, el barro baja a la mitad en ese tiempo. Lo calculamos con ${n} pasadas de NISAR.`,

  // Fuente
  tituloFuente: "De dónde sale",
  lineaFuente: (r: { satelite: string; banda: string; orbita: string; frame: string }) =>
    `Radar ${r.satelite} · banda ${r.banda} · órbita ${r.orbita} · frame ${r.frame}`,
  archivo: "Archivo de la pasada procesada",
  archivoReferencia: "Referencia seca · misma órbita",
  verArchivo: "Ver archivo",
  copiar: "Copiar",
  copiado: "Copiado",
  copiarLector: (que: string) => `Copiar el nombre del ${que}`,
  copiadoLector: "Nombre de archivo copiado.",
  queArchivo: "archivo de la pasada procesada",
  queReferencia: "archivo de referencia seca",
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
