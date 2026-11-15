# GitHub de la NASA: lo que sirve para Baqui

15/11/2026. Revisado con `gh` (GitHub). La NASA publica el código de radar repartido en varias organizaciones: **opera-adt** (JPL, proyecto OPERA), **isce-framework** (procesador de NISAR), **ASFHyP3** y **ua-asf** (centro de datos ASF, el que distribuye NISAR) y **nasa-jpl**.

## Los que nos sirven

| Repo | Qué es | Para qué nos sirve | Licencia |
|---|---|---|---|
| **[opera-adt/DSWX-SAR](https://github.com/opera-adt/DSWX-SAR)** ⭐ | El algoritmo **oficial** de la NASA/JPL para detectar agua con radar. **Ya tiene un módulo para NISAR** (`src/dswx_sar/nisar/`, producto DSWx-NI) | Copiar **sus reglas y parámetros** en lugar de inventar los nuestros: umbral de agua, agua bajo la vegetación y uso del HAND. Le da Validez al proyecto ante el jurado | Apache-2.0 |
| **[ASFHyP3/hyp3-nisar-cv](https://github.com/ASFHyP3/hyp3-nisar-cv)** | Herramienta de ASF que calcula, con **varias fechas de NISAR GCOV**, cuánto varía cada píxel (coeficiente de variación) y dónde hay agua | Es la idea de "referencia con varias fechas secas" (la mejora que más acierto suma), ya hecha para NISAR. Trae parámetros de agua: -16,5 dB y 75 % de las fechas | BSD-3 |
| **[ua-asf/nisar-docs](https://github.com/ua-asf/nisar-docs)** | La documentación oficial de NISAR, de ASF | Referencia de los productos GCOV y SME2, de cómo se llaman los archivos y de sus niveles de calidad | — |
| [isce-framework/isce3](https://github.com/isce-framework/isce3) | El procesador que fabrica los productos de NISAR | Solo para citar de dónde salen los datos. No hace falta usarlo | Apache-2.0 |
| [opera-adt/bowser](https://github.com/opera-adt/bowser) | Visor web de datos de radar | Ideas para mostrar el radar en la web | — |

## Lo más valioso: los parámetros oficiales de DSWx-NI (agua con NISAR)

Sacados de `src/dswx_sar/defaults/algorithm_parameter_ni.yaml`:

| Qué | Lo que usa la NASA | Lo que usa hoy Baqui | Cambio sugerido |
|---|---|---|---|
| **Umbral de agua** | Lo **calcula solo** en cada imagen, por zonas, con el método Kittler-Illingworth (o Otsu), y solo en las zonas donde se ven bien el agua y la tierra | -18 dB fijo (Otsu como mejora) | Calcular el umbral por zonas, como DSWx |
| **Agua bajo el monte** | Relación **HH/HV mayor a 8 dB** (entre 7 y 12), con **HV por encima de -26 dB**, y solo donde el mapa de cobertura dice que hay vegetación | "HH sube más de 3 dB" | **Usar la regla oficial de HH/HV**. Es más sólida y se puede citar |
| **HAND (altura sobre el cauce)** | Lo usa para descartar agua imposible en lomas (variación de 2,5 m) | Lo usamos para "cuánto aguanta el tramo" | Sumar también su uso como filtro |
| **Agua con varias fechas** (hyp3-nisar-cv) | Es agua si está por debajo de -16,5 dB en el 75 % de las fechas | Agua "de siempre" = agua en la fecha seca | Usar varias fechas secas cuando las tengamos |

**Por qué conviene:** si el jurado pregunta "¿de dónde sacaron los números?", la respuesta pasa a ser *"de los parámetros del algoritmo oficial de agua de NISAR, del JPL de la NASA"*. Eso suma mucho en Validez.

## Para citar en la entrega

- OPERA DSWx-SAR, NASA/JPL: https://github.com/opera-adt/DSWX-SAR (Apache-2.0).
- HyP3 NISAR CV, Alaska Satellite Facility: https://github.com/ASFHyP3/hyp3-nisar-cv (BSD-3).
