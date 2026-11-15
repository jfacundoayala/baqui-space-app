# BAQUI — Monitoreo Satelital SAR de Caminos Rurales

> **NASA Space Apps Challenge 2026** · Track: *Dancing with the SARs*  
> **One-liner:** Baqui es un sistema de alerta temprana que utiliza radar de apertura sintética (SAR) para prevenir daños frente al fenómeno de El Niño, permitiendo saber si un camino rural está transitable antes de salir al barro.

---

## 🎯 El Problema y el 'Why Now' (El Niño)
Durante el fenómeno de El Niño, el Noreste Argentino (NEA) sufre precipitaciones extremas que anegan caminos rurales de tierra.
* **La falla de los satélites convencionales:** Las tormentas traen semanas continuas de nubosidad total, cegando por completo a los sensores ópticos (Sentinel-2, Landsat).
* **La solución SAR:** El Radar de Apertura Sintética (SAR) emite pulsos de microondas que **atraviesan las nubes día y noche**, detectando el agua acumulada sobre la traza vial por su comportamiento especular.

---

## 👥 Cliente Ideal (ICP) y Dolores Críticos
* **Organismos del Estado:** Protección Civil, Vialidad Provincial, Municipios rurales.
* **Organizaciones Humanitarias y ONGs:** Cáritas, Cruz Roja, Bomberos Voluntarios.

### Los 3 Dolores Clave:
1. **Salud:** Ambulancias volcadas o atascadas en el lodo; aislamiento de puestos sanitarios.
2. **Logística Humanitaria:** Camiones con donaciones y víveres que no llegan a los evacuados.
3. **Tiempo y Dinero:** Productores agropecuarios sin poder sacar la cosecha ni la leche; maestros y escuelas rurales incomunicadas.

---

## 🖥️ Estructura de la Solución (3 Vistas)

| Vista | Responsable | Propósito |
|---|---|---|
| **View 1: Visor de Caminos** (web/src/views/1-visor) | Dev 1 | Mapa interactivo estilo Puna con trazado del camino rural y capa de Radar SAR que 've' el agua a través de las nubes. |
| **View 2: Panel de Operaciones** (web/src/views/2-operaciones) | Dev 2 | Consola para Protección Civil y ONGs que ejemplifica el problema actual: despacho de vehículos a ciegas sin datos de transitabilidad. |
| **View 3: El Niño e Impacto** (web/src/views/3-impacto) | Dev 3 | Pantalla con los 3 recuadros de dolor (Salud, Donaciones, Pérdidas Económicas) y el disparador de urgencia. |

---

## 🚀 Cómo Ejecutar el Proyecto
`ash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd baqui-space-app

# 2. Navegar a la carpeta web
cd web

# 3. Instalar dependencias y levantar el servidor
npm install
npm run dev
`

---

## 👥 Equipo y Distribución de Tareas
* **Coordinación General:** Tomas Skarp
* **Desarrollo View 1 (Visor SAR):** Asignado a Dev 1
* **Desarrollo View 2 (Operaciones Estado/ONG):** Asignado a Dev 2
* **Desarrollo View 3 (Impacto El Niño & Nav):** Asignado a Dev 3
