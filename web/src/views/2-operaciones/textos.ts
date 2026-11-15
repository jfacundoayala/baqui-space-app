// Todos los textos visibles de la sección 2 (quiénes salen a ciegas y sus 3 problemas).
// Para traducir al inglés, alcanza con cambiar este archivo.

import type { Tono } from "@/components/Estado";

export const textos = {
  seccion: "Quiénes salen a ciegas",
  titulo: "Salen sin saber si el camino da paso.",
  /** Los mismos organismos que la consola (Cruz Roja, Protección Civil y Cáritas), más Vialidad. */
  bajada: "Le pasa a Cruz Roja, Protección Civil, Cáritas y Vialidad cada vez que llueve en el campo.",

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
    prefijo: "Advertencia:",
    resto: " Se desconoce el estado del camino. Despacho a ciegas…",
  },

  dolores: {
    lista: [
      {
        numero: "01",
        titulo: "No saben el estado del camino",
        texto: "Tienen que ir hasta ahí para comprobarlo.",
      },
      {
        numero: "02",
        titulo: "Arriesgan vehículos",
        texto: "Un vehículo encajado o roto es plata y tiempo perdidos.",
      },
      {
        numero: "03",
        titulo: "Despachan a ciegas",
        texto: "Salen sin saber si van a llegar ni por dónde.",
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
    codigo: "CRZ-04",
    nombre: "Ambulancia de Cruz Roja",
    detalle: "No sabe si el camino da paso",
    tono: "peligro",
    estado: "Demorada",
    hora: "06:42",
    icono: "ambulancia",
    esperando: true,
  },
  {
    codigo: "PCV-01",
    nombre: "Camioneta de Protección Civil",
    detalle: "Tiene que ir a ver el camino",
    tono: "cuidado",
    estado: "No sale",
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
