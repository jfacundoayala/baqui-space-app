# BAQUI · Web

La página de [baqui-nasa.vercel.app](https://baqui-nasa.vercel.app): una sola pantalla con cinco secciones (Next.js, React, Three.js y Leaflet).

## Cómo correrla

Hace falta Node 24 y pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Comando | Qué hace |
|---|---|
| `pnpm typecheck` | Revisa los tipos |
| `pnpm test` | Prueba la lógica de la demo de rutas |
| `pnpm build` | Arma la versión de producción |

## Carpetas

- `src/app/`: página, metadatos, ícono, imagen al compartir, robots y sitemap.
- `src/views/`: una carpeta por sección (1 a 5), cada una con su `textos.ts`.
- `src/components/`: piezas compartidas entre secciones.
- `src/data/resultados.json`: los números reales, cada uno con su fuente (campos `_fuente`).
- `public/`: imágenes.

La dirección pública del sitio se puede cambiar con la variable `NEXT_PUBLIC_SITE_URL`.
