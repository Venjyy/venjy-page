# Cómo se aplica la skill `ahorro` en venjy-page

Complemento de `SKILL.md`: las reglas generales son las de ese archivo; aquí solo lo propio de este
proyecto.

## Leer poco

- **Mapa**: `mundo/supervivencia/MAPA.md` (una línea por módulo de `mundo/supervivencia/` y `mundo/criaturas/`, con
  funciones y líneas, más los flujos clave). Léelo primero; después grep; después tramos.
- **Pendientes**: `mundo/PENDIENTES.md`, **solo la sección en curso** (se encuentra con
  `grep -n "^#" mundo/PENDIENTES.md`). Lo terminado vive en `mundo/supervivencia/historial/`: no se lee salvo que
  haga falta.
- No leer sin que se pida: `respaldo-2026-10-06/`, `.impeccable/review/`, `centroeventostest/`,
  `images/` (los GIFs pesan varios MB: se citan por nombre), `vendor/`.
- `mundo/DIALOGOS.md` y `mundo/DISENO-6c.md` son largos: grep por el personaje o la clave.

## Verificar

La tabla de verificación es la de `SKILL.md` §3. En este proyecto:

- **Lógica**: `node mundo/tests/recetas.mjs`, `inventario.mjs`, `amistad.mjs`, `senal-qr.mjs`.
- **Animaciones y escenas**: capturas y Playwright con la skill `animaciones-minecraft`:
  `capturar.mjs` (hojas de tiempos), `planos.mjs` (cámara de cine) y `grabar.mjs` (video, solo
  cuando el dueño lo vaya a revisar). Servidor local: `node estudio/servidor.mjs` (`venjy` en
  `.claude/launch.json`).
- **Chromium en Windows solo arranca desde PowerShell**; desde Bash da «spawn UNKNOWN».
- Capturas a escala 0.5 y hojas de varios tiempos en una imagen; carpeta de salida
  `mundo/capturas/<bloque>/` (solo lo nuevo; no recapturar lo aprobado).

## Cerrar un chat

- **Artifact obligatorio**, en su versión más corta: camino corto de `.claude/artifacts/GUIA.md`
  (copiar `.claude/artifacts/contenido-6c1.mjs`, cambiar el contenido, generar con
  `.claude/artifacts/plantilla.mjs`; contenido mínimo; enlazarlo en el PR).
- **Traspaso**: skill `traspaso-chat`, con lectura mínima (secciones de `PENDIENTES.md` y `MAPA.md`,
  estado en 5-10 líneas).
- **Actualizar** `mundo/PENDIENTES.md` (marcar hecho; la entrada de bitácora va al historial) y
  `mundo/supervivencia/MAPA.md` si se movieron módulos.

## Reglas del proyecto que se mantienen

- Español por defecto; todo texto visible con par `data-es` / `data-en`; solo fuente `PixelCraft`,
  sin emojis como íconos.
- Nada de enlaces de sesión ni «Generated with Claude Code» en commits, PR, comentarios o archivos.
- Pedido grande: avisarlo y proponer un chat dedicado.
- Subagentes: solo Haiku y con moderación; Sonnet si Haiku falla (§0 de `animaciones-minecraft`).
