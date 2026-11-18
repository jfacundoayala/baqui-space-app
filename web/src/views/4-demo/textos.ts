// Todos los textos visibles de la sección 4 (la demo).
// Para traducir al inglés, alcanza con cambiar este archivo.

const km = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Cómo se muestra el tag place de OpenStreetMap de cada destino. */
const TIPOS: Record<string, string> = {
  hamlet: "paraje",
  locality: "paraje",
  village: "localidad",
  town: "pueblo",
  isolated_dwelling: "lugar rural (una casa)",
  farm: "lugar rural (un campo)",
  sin_nombre: "camino rural, sin nombre en el mapa",
};

/** "2026-10-11" → "11/10/2026". */
export const fechaCorta = (iso: string) => iso.split("-").reverse().join("/");

export const T4 = {
  tituloSeccion: "La demo: ¿llegás hoy?",
  titulo: "¿Llegás hoy?",
  bajada: "Elegí a dónde vas. BAQUI mira cómo está el camino hoy y te dice si podés salir.",
  bajadaNota: (fecha: string) => `El estado de cada camino es el que midió el radar NISAR el ${fecha}.`,

  buscador: {
    etiqueta: "Recorrido",
    desde: "Desde",
    origen: "Gral. San Martín",
    placeholder: "¿Hacia dónde?",
    abrir: "Elegir destino",
    lista: "Destinos de la demo",
    elegido: "elegido",
    tipo: (placeOsm: string) => TIPOS[placeOsm] ?? "lugar",
    opcionDetalle: (tipo: string, kmCamino1: number) => `${tipo} · ${km.format(kmCamino1)} km`,
  },

  consultar: {
    boton: "Consultar",
    accesible: (destino: string) => `Consultar cómo está hoy el camino a ${destino}`,
  },

  respuesta: {
    titulo: (destino: string) => `Hoy, a ${destino}`,
    transitable: "TRANSITABLE",
    conBarro: "CON BARRO",
    intransitable: "INTRANSITABLE",
    conDesvio: (n: number, valor: number) => `Por el camino ${n} · ${km.format(valor)} km`,
  },

  frases: {
    llegas: "Llegás. Podés salir.",
    barro: (valor: number) => `Llegás, pero hay barro probable en ${km.format(valor)} km. Andá despacio.`,
    alternativo: "Andá por el camino 2: es más largo, pero llegás.",
    "no-llegas": "No hay otro camino. Hoy no llegás: no salgas.",
  },

  /** Cuánto del camino midió el radar. */
  medido: (medidos: number, total: number, fecha: string) => `Medición del ${fecha}: el radar midió ${km.format(medidos)} de ${km.format(total)} km. El resto es pavimento o no tiene medición.`,

  /** Solo cuando no hay otro camino (respuesta "no salgas"). */
  unSoloCamino: "En el campo, casi siempre hay un solo camino.",

  regla: "Regla: 50 m seguidos de agua sobre el camino y no se pasa.",

  mapa: {
    region: "Mapa satelital del recorrido",
    cargando: "Cargando mapa…",
    datosReales: "Datos reales",
    datosRealesDetalle: (fecha: string) => `Radar NISAR · ${fecha}`,
    leyendaRecorrido: "Tu recorrido",
    leyendaTransitable: "Transitable",
    leyendaBarro: "Con barro probable",
    leyendaIntransitable: "Intransitable",
    leyendaSinDato: "Sin dato",
    aguaSobreCamino: "Agua sobre el camino",
    cartel: (n: number) => `Camino ${n}`,
    cartelKm: (valor: number) => ` · ${km.format(valor)} km`,
    origen: "Gral. San Martín",
    elegirMarcador: (nombre: string) => `Ir a ${nombre}`,
    resumen: (destino: string, partes: string[]) =>
      `Recorrido de Gral. San Martín a ${destino}. ${partes.join(" ")}`,
    resumenCamino: (n: number, valor: number, tapado: boolean) =>
      `Camino ${n}, ${km.format(valor)} km: ${tapado ? "cortado por el agua" : "sin cortes"}.`,
    resumenSinOtro: "No hay otro camino.",
  },

  /** Atribución del mapa (va abajo del mapa, a 12 px). */
  pie: {
    caminos: "Caminos y lugares ©",
    caminosFuente: "OpenStreetMap",
    caminosLicencia: "(ODbL)",
    caminosUrl: "https://www.openstreetmap.org/copyright",
    satelite: "Satélite:",
    sateliteFuente: "Sentinel-2 cloudless 2023",
    sateliteDetalle: "de EOX IT Services GmbH (datos modificados de Copernicus Sentinel 2023)",
    sateliteUrl: "https://s2maps.eu",
    nisar: "Radar NISAR",
    nisarUrl: "https://science.nasa.gov/mission/nisar/",
    nuevaPestana: "(abre en otra pestaña)",
  },
};
