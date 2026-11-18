# Hipótesis física de Baqui: El Niño y el camino cortado

Foco único: el camino de tierra del corredor de General San Martín (Chaco) que se embarra o queda tapado por agua. Pregunta de fondo: **¿qué le pasa al camino con la lluvia, cómo lo ve el radar y cómo eso dice si se puede pasar hoy?**

Términos que usamos:
- **Eco (retrodispersión):** la parte de la onda del radar que vuelve al satélite. Más eco = se ve más brillante.
- **dB (decibel):** la escala del eco. +3 dB es el doble de potencia; −3 dB, la mitad.
- **Polarización:** cómo sale y cómo vuelve la onda. HH: sale horizontal y vuelve horizontal. HV: sale horizontal y vuelve vertical ("cruzada").
- **Banda L:** la onda de NISAR, de 24 cm. Atraviesa nubes y, en parte, el monte.
- **Píxel:** el cuadradito más chico de la imagen; en nuestros datos mide 20 m.
- **Día de referencia:** la pasada de NISAR contra la que comparamos, de la misma órbita. No era un día del todo seco (ver sección 4).

## 1. La hipótesis en una frase

Con la lluvia de El Niño, el suelo del camino y de su entorno se moja y el eco **sube**; si el agua cubre el camino y sus alrededores en más de un píxel, el eco **cae** porque el agua quieta hace de espejo. Comparando cada pasada de NISAR con un día de referencia de la misma órbita se puede decir si la zona del camino está seca, mojada o con agua; **si eso corta el camino todavía hay que comprobarlo en el terreno.**

## 2. De El Niño al camino cortado

1. **Más lluvia de lo normal.** El SMN (Servicio Meteorológico Nacional) pronosticó lluvias superiores a lo normal para octubre-diciembre de 2026, con más probabilidad en el Litoral (Perfil, citando al SMN; la nota lo vincula a El Niño). IERAL-NEA espera "registros superiores a los normales en buena parte del NEA", con más probabilidad en Misiones, Corrientes y el este de Chaco y Formosa (Chaco Día por Día). *No tenemos una frase textual del SMN o la OMM sobre el estado de El Niño: falta agregarla. La lluvia que medimos en el corredor es un caso, no una prueba del efecto de El Niño.*
2. **El suelo se moja.** La humedad del suelo de SMAP (satélite de NASA que mide la humedad de los primeros centímetros) llegó a 0,339 m³/m³ después de la lluvia (`datos/smap/humedad_diaria_corredor.json`). No la comparamos con un umbral de saturación, así que no decimos "saturado". En esta lluvia no vimos que los bajos se mojaran más (sección 4).
3. **El camino puede quedar con barro o tapado.** IERAL-NEA lo plantea como riesgo: "si los caminos rurales quedan intransitables" (Chaco Día por Día).
4. **La onda del radar cambia.** El agua sube la **constante dieléctrica** del suelo (cuánto responde un material a la onda de radio): suelo seco ≈ 3, agua ≈ 80. Más alta = más eco (NISAR Handbook). Cuando el agua cubre todo pasa lo contrario: **reflexión especular**, el agua lisa desvía la onda lejos del satélite como un espejo y casi no vuelve eco (ARSET 2026, diap. 30-34). Ojo: el radar no separa humedad de aspereza (las huellas del barro también suben el eco), y un poco de agua entre pasto o cultivo **sube** HH en vez de bajarlo (ARSET diap. 35).
5. **Semáforo.** Eco como el día de referencia = transitable. Eco más alto = **zona mojada, probable barro**. Agua sobre el camino en 50 m seguidos o más (regla R1 de `baqui/clasificador.py`) = cortado. La curva "seco → mojado sube → inundado baja" es de la fuente (ARSET); aplicarla a caminos de tierra es nuestro. **Hoy el mapa también pinta rojo por otra regla (R2: eco que sube mucho bajo el monte); eso es una sospecha, no un corte (sección 3).**

## 3. Lo que vemos en nuestros caminos

Datos: NISAR GCOV (producto de NISAR con el eco calibrado por polarización), órbita 161 ascendente, día de referencia contra 2 días después de la lluvia. "Eje" = píxeles a 10 m o menos del centro del camino de OSM (OpenStreetMap, mapa libre de caminos). Las filas 1 a 5 usan el recorte grande del corredor (`*_corredor.npz`); la fila 6, el recorte chico de caminos (`*_caminos.npz`), por eso sus números no son iguales.

| Qué se ve | Número | Archivo | Física |
|---|---|---|---|
| 1. El eco del eje de tierra sube | HH +1,35 dB, HV +0,94 dB (mediana, 53.611 píxeles). Sin monte: HH +1,63, HV +1,28 | `datos/chequeos/salida_corredor.json` | Suelo mojado (sube la constante dieléctrica) o más áspero: el radar no los separa |
| 2. Se moja la zona, no solo el camino | Campo abierto a 300-1000 m de cualquier camino: HH +1,57 dB, casi lo mismo que el eje (+1,63) | `datos/chequeos/salida_rojos.json` | NISAR ve la zona mojada; "con barro" es una deducción |
| 3. Casi ningún camino con agua abierta | Agua abierta nueva en el eje: 3 de 53.611 píxeles (0,006 %). Un solo tramo (1 km de 1.387) tiene agua: 40 m seguidos, menos de los 50 m que pide R1, por eso quedó amarillo y no rojo | `salida_corredor.json`; `datos/nisar/tramos_20261011_161A164.geojson` (way 118261322, tramo 13) | No hubo espejo de agua sobre los caminos |
| 4. Los 23 km rojos **podrían** ser agua bajo el monte (sin confirmar) | Toda su franja (3.600 píxeles, 65 % con monte): HH +1,67, HV +0,94, como el resto del eje. Solo el 10 % (359 píxeles, elegidos por subir 3 dB o más) da HH +3,46 y HV +0,96, y de esos solo el 37,9 % tiene HH 3 dB por encima de HV. OPERA no marca agua abierta en la franja | `datos/chequeos/salida_rojos.json`; geojson (los 23 km salen de R2, con agua 0) | Bajo el monte HH ya sube con suelo húmedo, sin agua quieta (ARSET diap. 33). Rebote doble: solo hipótesis (H3) |
| 5. El agua nueva casi no existe en la zona | OPERA después de la lluvia contra antes (13/10 contra 01/10), en todo el recorte (10.124 km²): 2,03 km² de agua abierta nueva (0,02 %); mancha mayor 0,08 km² | `datos/chequeos/salida_rojos.json` (`opera_agua_nueva_escena`) | El suelo se mojó, no se inundó |
| 6. La humedad baja con los días | Zona: +1,11 dB a 2 días, +0,75 a 7, +0,64 a 10. Camino 1: +3,39, +1,12, +1,01. Media vida (días hasta bajar a la mitad): **5,7 días**, ajuste sobre los caminos 1 a 3. A 14 días la zona da −0,65 (por debajo de la referencia; versión de proceso distinta y lluvia previa) | `datos/nisar/secado.json`, `baqui/secado.py` | SMAP baja de 0,339 a 0,306 y 0,269 m³/m³ en esas pasadas. IMERG (lluvia satelital de NASA): 1,0 mm de media en los 8 días después de la pasada; el día de la pasada cayeron 2,0 mm (máx. 8,7) (`datos/imerg/lluvia_diaria_corredor.json`) |

**Cuidado con la fila 6:** cada punto es de una órbita distinta (161 y 060 ascendentes, 111 descendente), con su propia referencia y su propio ángulo de mirada. La diferencia entre órbitas (hasta 1,2 dB, sección 4) es parecida a la caída que medimos. La curva es indicativa; habría que medirla dentro de una sola órbita.

Semáforo del 11/10 (`tramos_20261011_161A164.geojson`), 1.231 km: 360,8 transitables, 714,8 en zona mojada (probable barro, no barro comprobado), 23 rojos por R2 (sospecha de agua bajo el monte al costado, no camino tapado), 132,4 sin dato.

## 4. Lo que no vemos y por qué

- **Los días de referencia no estaban del todo secos.** IMERG da 3,95 mm de media (máx. 16) el mismo día de la referencia de la órbita 161; la pasada fue a las 06:56 hora local y IMERG diario va por día UTC, así que no sabemos si llovió antes o después. La referencia de la órbita 060 viene un día después de 11,7 mm de media (máx. 45,5), y la de la 111, cuatro días después. SMAP no tiene dato en las dos primeras. Una referencia mojada achica la suba y hace parecer que se seca más rápido: por eso el camino 2 sube de +0,54 a +1,25 dB entre los días 7 y 10.
- **El camino casi no se separa del campo.** El píxel de 20 m mezcla calzada, banquina, cuneta y campo. En el día de referencia el eje es apenas 1,15 dB más brillante que su costado (`salida_corredor.json`).
- **El moteado.** El moteado del radar (speckle, granulado propio de la imagen) hace que el cambio de un píxel entre dos pasadas varíe ±2,2 dB (1,3-1,4 dB con filtro de 3x3). Por eso se lee por tramo (mediana de 157 píxeles por km), nunca píxel por píxel (`salida_corredor.json`, `salida_secado.json`).
- **Las órbitas no se mezclan en un mismo par.** El mismo eje en el día de referencia da HH −11,2 dB en la órbita 161 y −12,4 en la 111: 1,2 dB (`salida_secado.json`). Cada pasada se compara solo con su misma órbita.
- **El monte tapa.** El 38,1 % del eje de tierra tiene monte; ahí el eco sube la mitad (HH +0,92 dB). OPERA (mapas de agua de Sentinel-1, banda C de 5,5 cm) no puede confirmar agua bajo el monte porque esa onda no lo atraviesa.
- **Bajos contra lomas.** El eco no sube más en bajos que en lomas (HH +1,52 contra +1,79 dB); falta una mejor medida del terreno.
- **Sin control de campo.** No tenemos fotos ni reportes de caminos cortados en esta lluvia.

## 5. Qué polarización muestra qué en el camino

| Caso | HH | HV | De dónde sale |
|---|---|---|---|
| Zona mojada (probable barro) | Sube (+1,63 dB en abierto) | Sube un poco menos (+1,28) | Medido (`salida_corredor.json`) |
| Agua sobre el camino (cortado) | Cae | Cae | Según la fuente (ARSET); **no medido aquí**: no hubo caminos con agua |
| Posible agua bajo el monte al costado | Sube mucho (+3,46) | Casi no cambia (+0,96) | Medido en el 10 % de la franja roja que sube 3 dB o más; sin confirmar |
| Monte (para separarlo del camino) | — | Más brillante: −13,9 dB contra −18,8 en abierto (día de referencia) | Medido (`salida_corredor.json`) |

**Rebote doble:** la onda pega en el agua lisa, rebota contra los troncos y vuelve directo al satélite (ARSET diap. 32). Según NASA Earthdata se nota sobre todo en HH, mientras HV responde a hojas y ramas. La regla HH/HV la armamos nosotros a partir de esas fuentes. La relación HH/VV indica humedad (NASA, polarimetría NISAR), pero en el modo HH+HV no hay VV (vertical-vertical).

## 6. Tres hipótesis que se pueden comprobar

**H1. El eco del camino sigue a la humedad del suelo.**
- Esperamos: en cada pasada, HH sube contra la referencia de la misma órbita y baja a medida que SMAP baja.
- Dato: GCOV HH/HV + SMAP + IMERG, idealmente una serie de una sola órbita (pasa cada 12 días).
- Hoy: los 3 pares van en la misma dirección que SMAP, pero son de 3 órbitas distintas, uno con referencia mojada: sin valor estadístico.
- La refutaría: que SMAP marque suelo mojado y el eco no suba, o que el eco siga alto sin lluvia ni humedad.

**H2. Un camino tapado por agua se ve oscuro, si el agua cubre también su entorno.**
- Esperamos: HH baja 3 dB o más y queda por debajo de −18 dB en 50 m seguidos o más. Esos −3 dB y −18 dB son valores nuestros (`baqui/medir.py`) a calibrar: la receta de Earthdata para banda L usa −11 dB y avisa que el umbral cambia mucho según el lugar.
- Dato: GCOV + OPERA + un reporte de campo de camino cortado (Gobierno del Chaco/APA, productores).
- La refutaría: un camino con agua confirmada en el terreno donde el eco no cae (agua rizada por el viento, o agua entre pasto que sube HH, ARSET diap. 35). En esta lluvia no se pudo probar: agua abierta en el 0,006 % del eje.

**H3. El agua bajo el monte al costado sube HH mucho más que HV.**
- Esperamos: HH sube 3 dB o más y HV poco (en los 359 píxeles rojos que suben, la diferencia mediana es 2,62 dB).
- Dato: GCOV HH y HV; control de campo.
- La refutaría: que HV suba igual que HH (sería monte o suelo mojado, no agua) o que en el campo no haya agua. Hoy R2 solo pide que HH suba 3 dB bajo el monte; en el monte del costado apenas el 3,97 % de los píxeles tiene HH 3 dB por encima de HV (`salida_corredor.json`). **Propuesta: que R2 exija también HH bastante más alto que HV y que pinte "con barro, revisar" en vez de rojo, hasta tener control de campo.**

## 7. Aplicaciones futuras de NISAR para caminos

**Lo que dice la fuente:**
- NISAR pasa por el mismo lugar dos veces cada 12 días (JPL), de día y de noche y con nubes (ARSET diap. 52).
- Los datos son gratis y abiertos (ASF).
- Para desastres puede priorizar toma y proceso "con el mejor esfuerzo" (NISAR Handbook).
- El GCOV es el producto más adecuado para detectar agua (ARSET diap. 52).
- No damos un número de horas de demora: no hay una cifra oficial única.

**Propuesta nuestra (no de la fuente):**
- Un aviso en cada pasada que responda "¿llego o no?": verde, zona mojada o agua sobre el camino.
- Camino alternativo por tramos en verde, para ambulancias, escuelas y sacar la producción.
- Una lista de tramos que se mojan o se tapan en cada lluvia, para priorizar ripio o alcantarillas.
- Combinar órbitas, cada una contra su propia referencia: en el corredor tuvimos 7 pasadas de 3 órbitas en 24 días, una cada 3 a 5 días (`datos/nisar/`), más seguido que los 5,7 días de media vida.
- No encontramos en las fuentes citadas este uso para caminos de tierra embarrados o cortados: es nuestro.

## 8. Fuentes y qué es dato nuestro

**Fuentes externas:**
- NISAR Science Users' Handbook (2019), 17.4.24 y 17.4.12: https://assets.science.nasa.gov/content/dam/science/missions/nisar/nisar-jpl/pdf/NISAR_FINAL_9-6-19.pdf
- ARSET 2026, Monitoring Surface Water with SAR / Mapping Inundation with NISAR: https://www.earthdata.nasa.gov/s3fs-public/2026-10/arset-2026-surfacewater-part1.pdf
- NASA Earthdata, SAR basics: https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar
- NASA Earthdata, receta de inundación con banda L: https://www.earthdata.nasa.gov/learn/data-recipes/map-regional-inundation-spaceborne-l-band-sar-using-arcgis
- NISAR polarimetría: https://science.nasa.gov/mission/nisar/polarimetry/
- ASF, introducción a NISAR: https://nisar-docs.asf.alaska.edu/nisar-intro
- JPL, resumen de la misión: https://jpl.nasa.gov/press-kits/nisar/mission-overview
- Perfil, pronóstico del SMN: https://www.perfil.com/noticias/nea/el-nino-el-smn-anticipo-lluvias-superiores-a-lo-normal-para-octubre-noviembre-y-diciembre-de-2026.phtml
- Chaco Día por Día, IERAL-NEA: https://chacodiapordia.com/en/el-supernino-amenaza-con-complicar-la-produccion-del-nea/
- Perfil, monitoreo del Gobierno del Chaco y la APA: https://perfil.com/nea/chaco-monitorea-lluvias-rios-y-desagues-para-coordinar-la-respuesta-ante-emergencias-aBJ507m823qq

**Dato nuestro (todo real, del corredor):**
- `datos/nisar/` (GCOV HH/HV, recortes `.npz`, `secado.json`, `tramos_20261011_161A164.geojson`), `datos/osm/roads.json`.
- `datos/smap/humedad_diaria_corredor.json`, `datos/imerg/lluvia_diaria_corredor.json`, `datos/opera/`, `datos/dem/`.
- Chequeos de solo lectura: `baqui/chequeos/caminos_sar.py`, `secado_hhhv.py` y `rojos_opera.py`, con sus salidas en `datos/chequeos/salida_corredor.json`, `salida_secado.json` y `salida_rojos.json`.
- Sin respaldo verificado (no usar como dato): "suelos arcillosos del corredor", profundidad de penetración en centímetros y demora de NISAR en horas.
