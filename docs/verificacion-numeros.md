# Verificación de los números publicados

Los números que muestra la web ([`web/src/data/resultados.json`](../web/src/data/resultados.json)) se volvieron a calcular desde cero el 18/11/2026: se bajaron otra vez las pasadas de NISAR desde NASA Earthdata y se corrieron los mismos scripts.

## Resultado

| Número | Publicado | Recalculado | ¿Coincide? |
|---|---|---|---|
| Kilómetros de camino sin pavimento | 1201,7 | 1201,3 | Casi (ver nota) |
| Píxeles sobre el eje del camino | 53 611 | 53 600 | Casi (ver nota) |
| Suba mediana del eco HH | 1,35 dB | 1,35 dB | Sí |
| Píxeles del eje que suben de 1 a 3 dB | 49,9 % | 49,9 % | Sí |
| Píxeles del eje que suben más de 3 dB | 11,0 % | 11,0 % | Sí |
| Campo lejos, suben de 1 a 3 dB | 24,0 % | 24,0 % | Sí |
| Campo lejos, suben más de 3 dB | 3,2 % | 3,2 % | Sí |
| Zona abierta, eje del camino | 1,63 dB | 1,63 dB | Sí |
| Zona abierta, campo | 1,57 dB | 1,57 dB | Sí |
| Píxeles con agua abierta nueva | 3 | 3 | Sí |
| Porcentaje con agua abierta nueva | 0,006 % | 0,006 % | Sí |
| Media vida del secado | 5,7 días | 5,7 días | Sí |
| Pares de pasadas usados en el secado | 3 | 3 | Sí |

**Nota.** Las dos diferencias (0,4 km y 11 píxeles, menos del 0,05 %) vienen de OpenStreetMap, no del radar: el mapa de caminos se bajó de nuevo tres días después y OSM cambia con las ediciones de sus usuarios. No cambian ningún otro número.

## Cómo repetirla

Desde `analisis/`, con una cuenta de NASA Earthdata (ver [`analisis/README.md`](../analisis/README.md)):

```bash
python -m baqui.descarga.bajar_nisar     # pasadas del 29/09 y 11/10, órbita 161A164
python -m baqui.descarga.bajar_osm       # caminos de OpenStreetMap
python -m baqui.descarga.bajar_capas dem opera imerg
python -m baqui.descarga.serie_nisar     # las 7 pasadas del secado
python -m baqui.medir 20261011_161A164 20260929_161A164 --zona corredor
python -m baqui.chequeos.caminos_sar     # datos/chequeos/salida_corredor.json
python -m baqui.chequeos.rojos_opera     # datos/chequeos/salida_rojos.json
python -m baqui.secado                   # datos/nisar/secado.json
```

## Lo que conviene saber al leer los números

- **Los caminos medidos son los del cuadrado del MVP** (de −59,60 a −59,10 de longitud y de −26,80 a −26,30 de latitud), no los de toda la ventana del radar, que es más grande.
- **"Campo lejos" no compara lo mismo con lo mismo.** Se mide sobre toda la ventana del radar, y el 77 % de esos píxeles cae fuera del cuadrado donde están los caminos, donde el eco casi no cambió (mediana −0,01 dB). Dentro del mismo cuadrado, el campo a más de 300 m de un camino sube de 1 a 3 dB en el 38,3 % de los píxeles y más de 3 dB en el 5,4 % (contra 24,0 % y 3,2 %). La web no muestra estos dos números; la comparación que sí muestra (zona abierta: 1,63 contra 1,57 dB) está hecha alrededor de los caminos y no tiene este problema.
