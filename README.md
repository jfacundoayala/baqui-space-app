# BAQUI — Monitoreo Satelital SAR de Caminos Rurales

> **NASA Space Apps Challenge 2026** · Track: *Dancing with the SARs*  
> **Repositorio Oficial:** [github.com/thomasskarp/baqui-space-app](https://github.com/thomasskarp/baqui-space-app)

---

## 1. ¿Qué es y qué problema resuelve?
> **"Baqui es un sistema que da información para prevenir daños frente al fenómeno de El Niño. Te dice cómo está el camino rural, para que decidas si salir sin tener que ir hasta ahí a mirar."**

* **El desafío físico:** Durante El Niño, la nubosidad y tormentas son constantes. Los satélites ópticos tradicionales (Sentinel-2, Landsat) quedan **completamente ciegos** ante las nubes.
* **La tecnología SAR:** El Radar de Apertura Sintética (SAR, Sentinel-1) emite pulsos de microondas que **atraviesan la cobertura nubosa día y noche**, detectando el agua acumulada sobre la calzada rural gracias a su baja retrodispersión especular.
* **Desarrollo asociado (View 1):** Visor interactivo de caminos (diseño limpio: mapa oscuro, paneles de vidrio y estado con ícono + palabra) con selector de capa óptica vs. Radar SAR y estado de transitabilidad en tiempo real.

---

## 2. El Cliente Ideal y los 3 Dolores Reales
Nuestros clientes y usuarios clave son los organismos públicos y las organizaciones que deben responder ante emergencias:
* **Organismos del Estado:** Protección Civil provincial y municipal, Direcciones de Vialidad Provincial, Ministerios de Salud.
* **Organizaciones Humanitarias y ONGs:** Cáritas Argentina, Cruz Roja Argentina, Bomberos Voluntarios.

### Los 3 Dolores Críticos:
1. **Despacho a ciegas:** No tienen forma de saber si un camino de tierra está cortado antes de enviar una unidad.
2. **Pérdida y daño de vehículos:** Ambulancias y camiones de auxilio volcados o varados en el lodo.
3. **Incertidumbre en tiempos de respuesta:** Desvíos imprevistos que retrasan la asistencia médica y humanitaria en momentos críticos.
* **Desarrollo asociado (View 2):** Consola de despacho y gestión de contingencia para Protección Civil y ONGs que ejemplifica el riesgo operativo actual.

---

## 3. El "Why Now" / Disparador de Urgencia - EL NIÑO
> **"El Fenómeno El Niño llega a su pico crítico entre noviembre y diciembre sobre el NEA, con lluvias récord (+209%) y caminos rurales anegados. Las provincias están actualizando sus planes de contingencia hoy. BAQUI llega cuando más se necesita para prevenir desastres en Salud, Logística, Tiempo y Dinero."**

### Las 3 Crisis que Atacamos (Recuadros de Dolor):
1. **SALUD (Recuadro 1):** Ambulancias volcadas o atascadas en el fango; puestos sanitarios y parajes aislados sin auxilio.
2. **LOGÍSTICA HUMANITARIA (Recuadro 2):** Camiones con víveres y donaciones de Cáritas/Cruz Roja detenidos por cortes de agua. La ayuda no llega a los evacuados.
3. **TIEMPO Y DINERO / ECONOMÍA (Recuadro 3):** Productores de soja, algodón y tambos lácteos sin poder sacar su producción; maestros y escuelas rurales incomunicadas con pérdidas millonarias.
* **Desarrollo asociado (View 3):** Pantalla de impacto con los 3 recuadros de dolor, alertas de El Niño y la barra de navegación general entre vistas.

---

## 🗺️ Mapa de Desarrollo y Responsables

| Punto del Pitch | Vista | Responsable | Carpeta de Trabajo |
|---|---|---|---|
| **1. ¿Qué es y qué resuelve?** | View 1: Visor SAR | Dev 1 | `web/src/views/1-visor/` |
| **2. Cliente Ideal y 3 Dolores** | View 2: Operaciones | Dev 2 | `web/src/views/2-operaciones/` |
| **3. Why Now: El Niño** | View 3: Impacto & Nav | Dev 3 | `web/src/views/3-impacto/` |

---

## 🚀 Cómo Empezar

```bash
# 1. Clonar el repositorio
git clone https://github.com/thomasskarp/baqui-space-app.git
cd baqui-space-app

# 2. Navegar a la app web
cd web

# 3. Instalar y correr
npm install
npm run dev
```

---

## 📄 Guión del Pitch
El guión cronometrado para la presentación de 3 minutos se encuentra documentado en [`docs/guion-pitch.md`](docs/guion-pitch.md).

---

## 🤖 Uso de IA (lo que NASA llama "SI")

Las reglas de Space Apps 2026 piden contar cómo usamos la IA. Esto es lo que hicimos.

### Qué hizo la IA

| Herramienta | Para qué la usamos |
|---|---|
| **Claude Code** (Anthropic) | Escribió la mayor parte del código de la web: Next.js, el globo con three.js y la demo con Leaflet. También los scripts de Python que bajan y miden los datos de NISAR, y los documentos técnicos, como la hipótesis física. Los commits que hizo llevan la línea `Co-Authored-By: Claude`. |
| **Claude Code con varios agentes** | Revisaron el diseño y la exactitud de los textos. Cada problema que encontraba un agente lo confirmaba otro antes de aplicar el cambio. |
| **Modelos gratuitos** (vía FreeLLMAPI) | Leer y resumir fuentes públicas: noticias del SMN, informes de IERAL-NEA y documentación de NASA. Nunca recibieron datos privados. |

### Qué hicimos las personas

- Elegimos el desafío, la idea (si el camino rural está transitable o no) y a quién le sirve (Estado y ONG).
- Decidimos cada texto y cada cambio de diseño. La IA proponía; el equipo aprobaba o pedía otra cosa.
- Pedimos que cada número se cotejara contra su archivo de origen y cada fuente se abriera antes de citarla. Ese chequeo lo hizo la IA y nosotros lo revisamos.

### Lo que no sale de la IA

- **Los números** de la página (+1,35 dB de eco extra, 6 de cada 10 puntos del camino, 0,006 % con agua abierta) salen de correr nuestros scripts sobre datos reales de NISAR (ASF), SMAP, IMERG y OPERA. Cada uno tiene su origen anotado en [`web/src/data/resultados.json`](web/src/data/resultados.json), en los campos `_fuente`.
- **La imagen de la Tierra** es Blue Marble de NASA. No hay imágenes generadas con IA.
- **Los caminos y lugares de la demo** son reales, de OpenStreetMap. **El agua de la demo es simulada**, y la página lo dice.

### AI use (English summary)

- **Claude Code (Anthropic)** wrote most of the web code (Next.js, three.js globe, Leaflet demo), the Python scripts that download and measure NISAR data, and the technical docs. Commits it made carry `Co-Authored-By: Claude`.
- **Several Claude agents** reviewed design and text accuracy. Each issue was confirmed by a second agent before it was applied.
- **Free models (via FreeLLMAPI)** read and summarized public sources only. No private data was sent to them.
- **The team** chose the challenge, the idea and the audience, approved every text and design change, and required every number and source to be checked against its origin (done by AI, reviewed by the team).
- **Not AI-generated:** the numbers come from running our scripts on real NISAR, SMAP, IMERG and OPERA data (sources noted in `web/src/data/resultados.json`). The Earth image is NASA Blue Marble. The roads and places come from OpenStreetMap. The water in the demo is simulated, and the page says so.
