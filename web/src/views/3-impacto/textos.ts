/**
 * Textos visibles de la sección 3 (por qué ahora: El Niño).
 * Todo lo que se lee en pantalla está acá, para traducirlo al inglés después.
 * Datos verificados: cada uno con su fuente y fecha. No agregar cifras sin fuente.
 * Las fechas quedan solo como respaldo: no se muestran en pantalla.
 */

/** fecha = como se muestra; iso = la misma fecha para el atributo dateTime. */
export type Fuente3 = { texto: string; fecha: string; iso: string; url: string };

const NOTA_TECNICA: Fuente3 = {
  texto: "Gobierno del Chaco y APA, Nota Técnica N.º 3",
  fecha: "14/07/2026",
  iso: "2026-07-14",
  url: "https://chaco.gob.ar/noticia-el-gobierno-difundio-un-informe-tecnico-que-confirma-la-consolidacion-de-el-nino-y-llama-a-fortalecer-las-medidas-preventivas-2026-07-14-09-17",
};

const COMITE: Fuente3 = {
  texto: "Gobierno del Chaco",
  fecha: "25/09/2026",
  iso: "2026-09-25",
  url: "https://chaco.gob.ar/noticia-chaco-se-anticipa-a-la-emergencia-protocolos-monitoreo-y-trabajo-en-territorio-2026-09-25-14-06",
};

const CHARATA =
  "https://charatachaco.net/2026/11/14/sociedad/ranking-de-lluvias-en-chaco-charata-acumulo-75-mm-sabado-14-de-noviembre-2026/";

export const T3 = {
  tituloSeccion: "Por qué ahora: El Niño",
  nuevaPestana: "(se abre en otra pestaña)",

  aviso: {
    /** Lo que respaldan las fuentes: el fenómeno está establecido (no hay una "alerta" declarada). */
    estado: "Fenómeno en curso",
    respaldo: "Respaldo oficial del Gobierno del Chaco",
    /** El título se lee junto: "El Niño ya está establecido". */
    tituloResaltado: "El Niño",
    tituloResto: " ya está establecido",
    bajada: "Puede intensificarse hacia fin de año y comienzos del próximo.",
    /** Cifras: "previo" va chico arriba, "valor" grande, "texto" abajo. Fieles a la fuente. */
    datos: [
      {
        previo: "Probabilidad cercana al",
        valor: "100 %",
        texto: "de que siga hasta fin de año",
        fuente: NOTA_TECNICA,
      },
      {
        previo: "Comité Provincial de Emergencia",
        valor: "47",
        texto: "localidades convocadas",
        fuente: COMITE,
      },
    ],
  },

  /** Título de los recuadros, solo para lectores de pantalla. */
  recuadrosTitulo: "Qué está en juego",

  recuadros: [
    {
      clave: "salud",
      etiqueta: "Salud",
      dato: "Patrullas sanitarias móviles",
      complemento: "Por El Niño, en el Litoral y el norte",
      fuente: {
        texto: "Salud de la Nación, en TodoJujuy",
        fecha: "17/08/2026",
        iso: "2026-08-17",
        url: "https://www.todojujuy.com/argentina-activa-un-sistema-sanitario-la-llegada-el-nino-n294747",
      },
    },
    {
      clave: "logistica",
      etiqueta: "Logística",
      dato: "19 localidades",
      /** En el celular el complemento no va: esto queda para que el dato se entienda solo. */
      corto: "con caminos intransitables",
      complemento: "del Chaco con caminos intransitables tras las últimas lluvias",
      fuente: {
        texto: "Autoridades, en CharataChaco",
        fecha: "14/11/2026",
        iso: "2026-11-14",
        url: CHARATA,
      },
    },
    {
      clave: "tiempo",
      etiqueta: "Tiempo",
      dato: "Esperar a que escurra",
      complemento: "Sin vehículos pesados en caminos rurales",
      fuente: {
        texto: "Vialidad y municipios, en CharataChaco",
        fecha: "14/11/2026",
        iso: "2026-11-14",
        url: CHARATA,
      },
    },
    {
      clave: "dinero",
      etiqueta: "Dinero",
      dato: "Ganancia en riesgo",
      complemento: "si los caminos rurales quedan intransitables",
      fuente: {
        texto: "Informe IERAL-NEA, en Chaco Día por Día",
        fecha: "27/09/2026",
        iso: "2026-09-27",
        url: "https://chacodiapordia.com/en/el-supernino-amenaza-con-complicar-la-produccion-del-nea/",
      },
    },
  ],
} as const;

export type ClaveRecuadro = (typeof T3.recuadros)[number]["clave"];
