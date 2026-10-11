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
   subagente (animaciones: Haiku primero, §0 de la skill `animaciones-minecraft`). Añade siempre el
   **effort** (low | medium | high | xhigh | max; ver la skill `ahorro` §2): el mínimo que alcance, porque gasta menos.
3. **Revisar el estado de git**: rama actual, PR abierto o fusionado (número y enlace) y si `main` local
   está al día con `origin/main`. Si el siguiente chat debe partir de `main` actualizado, dilo en el prompt.
4. **Artifact** solo si este chat fusionó una fase completa o el dueño lo pidió (cierre liviano, `CLAUDE.md`
   «Convenciones»): camino corto de `.claude/artifacts/GUIA.md`, enlazado en el PR y en el mensaje final.
5. **Escribir el prompt** (plantilla abajo) dentro de un bloque de código para copiar, en español. **Máximo ~10 líneas.**
6. Si cambió algo del plan en este chat, confirmar que ya está en `PENDIENTES.md` (el prompt no reemplaza
   al archivo: solo apunta a él).

## Plantilla del prompt

````
Modelo recomendado: <Opus | Sonnet | Haiku> [con subagente <Haiku | Sonnet>] · Effort: <low | medium | high | xhigh | max> — <por qué, en una línea>.

venjy-page. Sigue <parte> (`mundo/PENDIENTES.md` «<sección>»).
Rama: <rama base o PR sin fusionar>.
Falta: <lista corta>.
Lee: <archivo:función o rango de líneas>, <archivo:función>… (no archivos enteros).
Entrega: PR en `<rama>`, pruebas de Node + `node estudio/cli.mjs validar --contra HEAD`, cierre liviano (`CLAUDE.md` «Convenciones»).
Ojo: <decisiones del dueño o qué no tocar, una línea>.
````

## Reglas

- El prompt es autosuficiente: no supone que el siguiente chat vio esta conversación.
- Rutas y nombres exactos; nada de «lo que hablamos».
- Sin enlaces de sesión (`claude.ai/code/session…`) ni la línea «Generated with Claude Code».
- Si la parte que sigue es grande, el prompt lo dice y propone dividirla en varios PR.
