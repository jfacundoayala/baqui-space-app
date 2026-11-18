# Cómo contribuir

1. Creá una rama desde `main`.
2. Hacé cambios chicos y con un mensaje de commit que diga qué cambia y por qué.
3. Antes de abrir el pull request, corré lo mismo que corre la revisión automática:

```bash
# Web
cd web
pnpm install
pnpm typecheck && pnpm test && pnpm build

# Análisis
cd analisis
pip install -r requirements.txt ruff   # Python 3.12 o más nuevo
ruff check .
python -m pytest -q tests
```

## Reglas del proyecto

- **Nunca mostrar un dato que falta como "transitable".** Si no hay medición, el estado es "sin dato".
- **Todo número de la web tiene su fuente** anotada en `web/src/data/resultados.json`.
- **Lo simulado se rotula como simulado** en pantalla.
- **Sin datos pesados ni secretos en el repo.** Los datos de la NASA se bajan con los scripts de `analisis/`.

La documentación está en [`docs/`](docs/README.md).
