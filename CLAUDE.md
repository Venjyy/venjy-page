@AGENTS.md

# Venjy · portafolio

Sitio estático sin build: `index.html`, `style.css`, `script.js`. Español por defecto, inglés vía atributos `data-es` / `data-en`.

## Ejecutar

- Servidor local: `python -m http.server 5510` (configurado en `.claude/launch.json` como `venjy`).

## Mapa del proyecto

- `script.js` genera en canvas el mapa de Minecraft, las texturas, los íconos pixelados y los estandartes. No hay imágenes para eso.
- `PRODUCT.md`: audiencia, contenido y datos de ProcedimientoSeguro. `DESIGN.md`: tokens y reglas visuales. Léelos antes de cambiar contenido o diseño.
- `images/`: fotos, GIFs y CVs. Los GIFs pesan varios MB; no los abras, refiérete a ellos por nombre.
- No leer salvo que se pida: `respaldo-2026-10-06/` (versión anterior), `.impeccable/review/` (capturas), `centroeventostest/` (demo aparte).

## Convenciones

- Todo texto visible lleva su par `data-es` / `data-en`.
- Solo fuente `PixelCraft`; sin emojis como íconos (se dibujan en `ICONOS` de `script.js`).
