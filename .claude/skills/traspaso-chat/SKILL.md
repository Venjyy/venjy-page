---
name: traspaso-chat
description: Cierra un chat de trabajo en venjy-page dejando el traspaso (handoff) al siguiente. Úsala siempre al terminar de iterar, cuando ya se abrió o fusionó el PR de la parte en curso (o cuando el dueño pide «el prompt para el siguiente chat»). Entrega un prompt listo para copiar con el modelo recomendado, la parte del plan que sigue (bloques de mundo/PENDIENTES.md), el estado exacto en que queda todo y qué leer primero.
---

# Traspaso al siguiente chat

Cada parte del plan se hace en su propio chat y PR (regla de `mundo/PENDIENTES.md`). Para que el
siguiente chat no parta de cero, el chat que termina deja un **prompt de traspaso**.

## Cuándo

- Al terminar de iterar: el PR de la parte ya está abierto (o fusionado) y el dueño no pidió más cambios.
- Cuando el dueño lo pide («pásame el prompt para el siguiente chat»).
- En un chat solo de planificación, al terminar de escribir el plan.

No se usa en preguntas rápidas ni en charla.

## Pasos

1. **Ver dónde quedó el plan**: en `mundo/PENDIENTES.md`, el orden acordado de los bloques (por ejemplo
   «Orden: 6a → 6b → 6c → 6d» y la sección «Orden recomendado» del bloque 7) y qué partes están hechas
   (bitácora y «Estado …»). La siguiente es la primera pendiente según ese orden; si hay dos posibles
   (por ejemplo, el bloque 6 y el bloque 7 se intercalan), recomienda una y nombra la otra.
2. **Elegir el modelo** con la tabla «Elección de modelo» del CLAUDE.md global del dueño y la tabla
   «Parte | Modelo | Por qué» del bloque correspondiente. Di el modelo principal y, si aplica, el
   subagente (animaciones: Haiku primero, §0 de la skill `animaciones-minecraft`).
3. **Revisar el estado de git**: rama actual, PR abierto o fusionado (número y enlace) y si `main` local
   está al día con `origin/main`. Si el siguiente chat debe partir de `main` actualizado, dilo en el prompt.
4. **Artifact del trabajo** (obligatorio, antes del prompt): si este chat abrió un PR o escribió un plan y aún no
   publicó su Artifact, hazlo ahora con el camino corto de `.claude/artifacts/GUIA.md` (`plantilla.mjs` + un archivo
   de contenido copiado de `contenido-6c1.mjs`), enlázalo en el PR y pon el enlace en el mensaje final.
5. **Escribir el prompt** (plantilla abajo) dentro de un bloque de código para copiar, en español.
6. Si cambió algo del plan en este chat, confirmar que ya está en `PENDIENTES.md` (el prompt no reemplaza
   al archivo: solo apunta a él).

## Plantilla del prompt

````
Modelo recomendado: <Opus | Sonnet | Haiku> [con subagente <Haiku | Sonnet>] — <por qué, en una línea>.

Proyecto venjy-page (portafolio con Minecraft 3D jugable). Sigue <parte, p. ej. «6c · Mapa de relaciones y escenas de pareja»> de `mundo/PENDIENTES.md`.

Estado al empezar:
- Rama base: `main` actualizado (<último PR fusionado>). <Si hay algo sin fusionar: rama y PR.>
- Lo último hecho: <parte anterior, en una o dos líneas>.
- Pendiente de esta parte: <lista corta tomada del plan>.

Antes de programar lee: `CLAUDE.md`, `AGENTS.md`, en `mundo/PENDIENTES.md` <secciones exactas> y <skill o archivos clave, con ruta>.

Qué entregar: <PR(s) con nombre de rama sugerido>, el Artifact del trabajo (`.claude/artifacts/GUIA.md`, camino corto), medición antes/después (carga y cuadro mediano), pruebas en `mundo/tests/`, `PENDIENTES.md` actualizado (estado + bitácora) y, al final, el prompt de traspaso al siguiente chat (skill `traspaso-chat`).

Ojo: <decisiones del dueño que aplican, riesgos o cosas que no tocar>.
````

## Reglas

- El prompt es autosuficiente: no supone que el siguiente chat vio esta conversación.
- Rutas y nombres exactos; nada de «lo que hablamos».
- Sin enlaces de sesión (`claude.ai/code/session…`) ni la línea «Generated with Claude Code».
- Si la parte que sigue es grande, el prompt lo dice y propone dividirla en varios PR.
