# INSTRUCCIONES: Desarrollador 1 (View 1 - Visor de Caminos)

## Tu Objetivo
Crear la pantalla que muestra el mapa del camino rural y la demostración de cómo el **Radar SAR** 've' el agua a través de las nubes (inspirado en la vista de PUNA).

## Dónde trabajas
* Tu código va aquí: web/src/views/1-visor/
* Tus imágenes/iconos van en: web/public/assets-view1/
* **Importante:** No toques las carpetas 2-operaciones ni 3-impacto.

## Elementos Clave que debe tener tu vista:
1. **Un mapa interactivo o visualizador:** Que muestre un camino rural (ej. RP-13 Chaco).
2. **Switch / Botón de Sensor:**
   - Modo 'Óptico': Se ve todo tapado por nubes grises / tormenta.
   - Modo 'Radar SAR (Sentinel-1)': El radar penetra las nubes y resalta en azul/rojo el tramo anegado del camino.
3. **Tarjeta de Estado:**
   - Estado: 🔴 CORTADO (64.2% anegamiento).
   - Datos leídos de: sample-data/caminos.json.
