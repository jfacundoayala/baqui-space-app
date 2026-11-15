# Recursos solo de ondas de radio

14/11/2026. Pedido de Gastón: **usar solo lo que el satélite mide con ondas de radio** (microondas). Nada de fotos ni imágenes ópticas. Fechas verificadas en CMR (NASA) para el punto de San Martín (-26,54; -59,34) el 14/11.

## Qué entra y qué queda afuera

- **Entra:** radares que mandan su propia señal (NISAR, Sentinel-1, SAOCOM) y satélites que "escuchan" microondas: SMAP escucha la que emite el suelo y CYGNSS escucha la señal del GPS que rebota en el suelo.
- **Queda afuera:** MODIS, Sentinel-2, Landsat, HLS, OPERA DSWx-HLS y las capturas de Worldview. Son fotos: con nubes no ven nada.

## La lista, de más detalle a más frecuencia

| Recurso | Qué mide | Detalle | Cada cuánto en el Chaco | Último dato al 14/11 | Para qué lo usamos |
|---|---|---|---|---|---|
| **NISAR GCOV** (banda L) | Eco del radar en HH y HV | **10–20 m** | 3–5 días juntando las órbitas 060, 111 y 161 | 4/11 | **El principal:** agua y barro sobre cada tramo del camino |
| **NISAR GUNW** (coherencia) | Si la superficie cambió entre dos pasadas | ~80 m | 12 días por órbita | 4/11 | Extra: el agua o el barro "rompen" la coherencia. Solo si sobra tiempo |
| **NISAR SME2** | Humedad del suelo | 200 m | 12 días | 19/10 | Humedad cerca del camino. Es PROVISIONAL |
| **Sentinel-1 RTC** (banda C; OPERA RTC-S1) | Eco del radar en VV y VH | 20–30 m | 12 días | 6/11 | Más pasadas de radar entre las de NISAR |
| **OPERA DSWx-S1** | Mapa de agua hecho con Sentinel-1 | 30 m | 12 días | 11/11 | Agua ya calculada, lista para usar |
| **SAOCOM** (CONAE, banda L) | Eco del radar, como NISAR | ~10–30 m | 8 días con los dos satélites | — | Más pasadas en banda L. Pide registro y no sabemos cuánto tarda la aprobación |
| **CYGNSS** humedad (Univ. de Michigan) | Humedad del suelo con la señal del GPS rebotada | **9 km** | **Varias veces por día** (pasa cada ~3 h) | **11/11** | **El que más se refresca.** Dice si la zona se mojó después de la última pasada de radar |
| **CYGNSS** mapa de agua (UC Berkeley) | Agua en superficie | ~1 km | **Diario** | **11/11** | Avisa si apareció agua en la zona del camino |
| **SMAP** (radiómetro banda L) | Humedad del suelo (escucha las microondas del suelo) | 9 km | Cada 2–3 días | 12/11 | Segundo dato de humedad de la zona |

**El hallazgo:** CYGNSS es lo más parecido al "cada 24 horas". Son 8 microsatélites de la NASA que escuchan la señal del GPS rebotada en el suelo. El suelo mojado y el agua la reflejan más fuerte. Cubre del ecuador hasta ~38° de latitud, así que **el Chaco entra entero**. Tiene una contra: ve zonas de 9 km, no un camino, y el dato llega con 3 a 6 días de atraso.

## Cómo se combinan (todo radio, sin fotos)

1. **El estado del camino** sale del radar de detalle: NISAR, más Sentinel-1 y SAOCOM. Hay un dato nuevo cada 2–4 días.
2. **Entre una pasada y otra**, CYGNSS y SMAP dicen si **la zona** se mojó desde la última pasada. Si se mojó, el tramo se marca **"puede haber empeorado"** y queda a la espera de la próxima pasada.
3. Cada tramo muestra **de qué satélite viene el dato y cuántos días tiene**.

Esto reemplaza a la lluvia de IMERG (la opción B de antes) con un dato de ondas de radio. Así se respeta lo que pidió Gastón.

## Lo que sirve del StoryMap "Floods" (NISAR)

- **El agua abierta se ve oscura** porque el eco rebota lejos, como en un espejo.
- **El agua debajo de árboles o pastos altos se ve muy brillante:** el eco rebota dos veces, en el agua y en el tronco. **Al lado de un camino con monte, inundado puede ser "más brillante", no "más oscuro".** La fórmula tiene que mirar las dos cosas.
- **Para inundaciones conviene HH;** HV sirve más para la vegetación.
- **El método simple es poner umbrales** al brillo, y cada lugar tiene los suyos. Se calibran con nuestro caso.
- **Comparar varias fechas** separa el agua de siempre (lagunas) del agua nueva (inundación).
- **Fuentes para citar:**
  - NISAR White Paper "Timely Maps of Flooding".
  - Curso ARSET *Disaster Assessment Using SAR*.
  - Chapman et al. 2015, *Mapping regional inundation with spaceborne L-band SAR*.

## Cómo cambia la fórmula (propuesta solo radio)

En [MVP-caminos.md](MVP-caminos.md), la lluvia de IMERG (P3 y P7) se cambia por la **humedad de CYGNSS o SMAP**:

```
W   = % de agua en la franja (HH muy bajo, o HH muy alto si hay monte)    NISAR
ΔHH = cuánto subió el eco respecto de la fecha seca                       NISAR
ΔM  = cuánto subió la humedad de la zona desde la fecha seca (m3/m3)       CYGNSS / SMAP
E   = días desde la última pasada de radar                                 —

1) W ≥ 10 % → INUNDADO
2) R = 50·n(ΔHH; 0–3 dB) + 35·n(ΔM; 0–0,15) + 15·B
3) Igual que antes: 60 / 35 → rojo / amarillo / verde
4) Si E > 4 días y CYGNSS muestra que la zona se mojó → "PUEDE HABER EMPEORADO"
```

B (que el tramo esté en un bajo) sale del relieve, no de un satélite que mida el día a día. Es un dato fijo, así que se puede dejar. Si el equipo lo quiere 100 % radio, NASADEM viene del radar SRTM, que también es radio.

## Bajarlos

- Con `earthaccess` y la cuenta Earthdata:
  - `CYGNSS_L3_SOIL_MOISTURE_V3.2`
  - `CYGNSS_L3_UC_BERKELEY_WATERMASK_DAILY_V3.2`
  - `SPL3SMP_E`
  - `OPERA_L2_RTC-S1_V1`
  - `OPERA_L3_DSWX-S1_V1`
  - NISAR GCOV, GUNW y SME2
- Sentinel-1 RTC también está en Planetary Computer, sin cuenta.

## Confianza: cómo cruzar las señales de radio para no equivocarnos

La idea: **ningún color sale de una sola señal.** Cada tramo junta lo que dicen los radares y le pone una confianza.

### Los tres tipos de dato

| Dato | Señales | Qué aporta |
|---|---|---|
| **Detalle** (el camino) | NISAR GCOV (HH, HV); Sentinel-1 / OPERA DSWx-S1 | Agua y barro sobre el tramo, cada 2–4 días |
| **Zona** (9 km / 1 km) | CYGNSS humedad y agua; SMAP humedad | Si la zona se mojó o se secó, casi a diario |
| **Fijo** | Pasada seca de referencia (29/9); agua de siempre | Separa lagunas y bajos de siempre del agua nueva |

### Nivel de confianza

| Confianza | Cuándo |
|---|---|
| **Alta** | Dos radares de detalle coinciden (NISAR + Sentinel-1, o dos órbitas de NISAR) en los últimos 4 días **y** la zona (CYGNSS o SMAP) va para el mismo lado |
| **Media** | Un solo radar de detalle de los últimos 4 días, y la zona no lo contradice |
| **Baja / estimado (gris)** | El último radar de detalle tiene más de 6 días, o el radar y la zona se contradicen |

### Reglas contra errores (cada una evita una falsa alarma o un intransitable escapado)

1. **Agua de siempre ≠ inundación.** Si el píxel ya tenía agua en la referencia seca, es una laguna: no cuenta como agua nueva.
2. **Barro solo si la zona se mojó.** Si el eco del radar (ΔHH) sube pero CYGNSS y SMAP no muestran más humedad, puede ser un campo arado o un cultivo que creció → confianza baja, no amarillo.
3. **Agua solo si no es sombra.** Un píxel negro en todas las fechas, incluida la seca, es sombra de radar o una superficie lisa → se descarta.
4. **Monte inundado.** Si HH sube mucho (más de ~3 dB) al lado de un monte y la zona se mojó, es agua debajo de los árboles → cuenta como agua.
5. **Viento sobre el agua.** El agua con viento puede verse gris en vez de negra. Por eso se usa HH y se miran dos fechas.
6. **Siempre la misma órbita** para comparar antes y después.
7. **Nada de píxeles sueltos:** se usa la mediana de la franja y un mínimo de píxeles. Si hay pocos, no hay color.
8. **Ante la duda, el color más prudente.** Lo grave es decir verde a un camino cortado.

### Cómo se mide si la fórmula anda

En la tabla de validación se cuentan aparte:
- **intransitables que se escaparon** (la meta es cero);
- **falsas alarmas**.

Si una regla se ajusta para corregir un error, se anota cuál y por qué.

### Sobre el "cada 24 horas"

Lo único de ondas de radio que se renueva casi a diario es el dato de **zona**: CYGNSS, y SMAP cada 2–3 días. El dato de **detalle** (la que ve el camino) se renueva cada 2–4 días juntando NISAR y Sentinel-1, y hoy se baja con atraso. El sistema lo dice en cada tramo: "radar del camino: hace X días · zona: hace Y días".
