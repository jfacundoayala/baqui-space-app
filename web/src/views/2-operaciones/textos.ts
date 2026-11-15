// Todos los textos visibles de la sección 2 (cliente ideal y los 3 dolores).
// Para traducir al inglés, alcanza con cambiar este archivo.

import type { Tono } from "@/components/Estado";

export const textos = {
  seccion: "Cliente ideal y los 3 dolores",
  etiqueta: "02 · Cliente ideal",
  titulo: "No les llegan sus donaciones.",
  bajada:
    "Cuando llueve, Protección Civil, Vialidad, Cáritas y Cruz Roja salen sin saber si el camino da paso.",

  consola: {
    codigo: "Consola de despacho",
    titulo: "Organismos del Estado y ONG",
    ilustrativa: "Escena ilustrativa",
    ilustrativaDetalle: "No son datos reales",
    columnas: { unidad: "Unidad", estado: "Estado", hora: "Hora" },
    listaEtiqueta: "Unidades esperando para salir",
    esperando: "Esperando datos del camino",
    pie: "Estado del camino",
    pieFuente: "Fuente: ninguna. Hay que ir a ver.",
    pieEstado: "Sin dato",
  },

  advertencia: {
    prefijo: "ADVERTENCIA:",
    resto: " Se desconoce el estado del camino. Despacho a ciegas…",
  },

  dolores: {
    titulo: "Los 3 dolores",
    lista: [
      {
        numero: "01",
        titulo: "No saben el estado del camino",
        texto: "Tienen que ir hasta ahí para comprobarlo.",
        tipo: "Falta de información",
      },
      {
        numero: "02",
        titulo: "Arriesgan vehículos",
        texto: "Un vehículo encajado o roto es plata y tiempo perdidos.",
        tipo: "Riesgo económico",
      },
      {
        numero: "03",
        titulo: "Despachan a ciegas",
        texto: "Salen sin saber si van a llegar ni por dónde.",
        tipo: "Problema logístico",
      },
    ],
  },
} as const;

export type IconoUnidad = "ambulancia" | "camioneta" | "camion";

export type Unidad = {
  codigo: string;
  nombre: string;
  detalle: string;
  tono: Tono;
  estado: string;
  hora: string;
  icono: IconoUnidad;
  /** Si sigue esperando, el indicador pulsa suave. */
  esperando: boolean;
};

// Escena ilustrativa: códigos y horas son de ejemplo, no datos reales.
export const unidades: Unidad[] = [
  {
    codigo: "AMB-04",
    nombre: "Ambulancia #04",
    detalle: "Salida demorada por camino intransitable",
    tono: "peligro",
    estado: "Demorada",
    hora: "06:42",
    icono: "ambulancia",
    esperando: true,
  },
  {
    codigo: "DSO-01",
    nombre: "Camionetas de Desarrollo Social",
    detalle: "No llegan con la mercadería",
    tono: "cuidado",
    estado: "No llegan",
    hora: "07:10",
    icono: "camioneta",
    esperando: true,
  },
  {
    codigo: "CAR-01",
    nombre: "Camión de Cáritas",
    detalle: "Esperando para salir con las donaciones",
    tono: "sindato",
    estado: "Esperando",
    hora: "07:25",
    icono: "camion",
    esperando: true,
  },
];
