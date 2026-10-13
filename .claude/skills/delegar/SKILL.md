---
name: delegar
description: Cómo encargar una parte del trabajo de venjy-page a un subagente Haiku o Sonnet (o a otro agente como Codex o Antigravity) para que salga bien a la primera y barata. Úsala siempre antes de lanzar un subagente o de escribir un encargo para otro agente: qué partes se delegan y a qué modelo, la plantilla del encargo, qué skill de datos le corresponde y cómo revisar lo que devuelve.
---

# Delegar a Haiku o Sonnet

Quien delega (normalmente Opus) **define, revisa y decide**. El subagente parte en frío: no ve el chat,
no conoce las decisiones del dueño y vuelve a leer todo lo que no le digas. Un encargo vago sale caro
dos veces: lo que lee de más y lo que hay que rehacer.

## 1. ¿Se delega?

| Caso | Quién |
|---|---|
| Menos de ~15 min de trabajo o 1-2 ediciones | Nadie: hacerlo uno mismo (explicarlo cuesta más). |
| Mecánico y fácil de verificar: buscar usos, pasar un valor a N archivos, agregar claves a un JSON siguiendo un patrón, un objeto con receta e ícono igual a los existentes | **Haiku** |
| Grande pero no trivial: escena con guion, un PR completo para revisar, varios objetos con lógica, un bug con el error a la vista en un archivo grande | **Sonnet** |
| Haiku ya falló o devolvió algo flojo | **Sonnet**, con lo que salió mal anotado en el encargo |
| Diseño, arquitectura, decidir con el dueño, varios módulos que hay que pensar | Nadie: queda en Opus |

Animaciones: la regla propia está en `.claude/skills/animaciones-minecraft/` §0 (Haiku primero, escalar a Sonnet).

## 2. Plantilla del encargo

Copiar y llenar. Todo lo que diga «ver X» tiene que ser una sección o un rango de líneas, no un archivo entero.

```
Tarea: <una frase con el resultado esperado>.
Proyecto: venjy-page (sitio estático, sin build). Reglas: AGENTS.md (léelo primero, es corto).
Skill a seguir: .claude/skills/<datos-json | objetos-supervivencia | animaciones-minecraft>/SKILL.md
Lee solo: <archivo:líneas o sección>, <archivo:líneas>. No abras <lo que no hace falta>.
Patrón a copiar: <un ejemplo que ya existe, con archivo:línea>.
Cambia: <archivos permitidos>. No toques: <archivos o claves prohibidos>.
Decisiones ya tomadas: <lo que el dueño decidió y no se discute>.
Hecho cuando: <criterio verificable> y pasan: <comandos exactos>.
Devuelve: lista de archivos cambiados, salida resumida de las pruebas y dudas (sin pegar diffs).
No hagas commit ni push.
```

Reglas del encargo:

- **Un solo resultado** por encargo. Si hay dos cosas independientes, dos encargos (o hacer una uno mismo).
- **Siempre un patrón a copiar** con archivo y línea: es lo que más baja el error en Haiku.
- **Los comandos de verificación exactos** (ver §3). Si no hay prueba para el caso, decir cuál agregar.
- **Lo prohibido explícito**: valores que el dueño editó a mano, textos marcados `revisado`, posiciones,
  `estudio/hoja-de-ruta.html`, documentos privados.
- Pedir que **no haga commit**: el commit lo hace quien delega, después de revisar.

## 3. Verificación que se le pide

Según lo que toque (las skills de datos traen el detalle):

- Cualquier JSON de `mundo/datos/`: `node estudio/cli.mjs validar --contra HEAD` y `node mundo/tests/estudio.mjs`.
- Objetos, recetas, íconos: `node mundo/tests/recetas.mjs` y `node mundo/tests/inventario.mjs`.
- Diálogos o amistad: `node mundo/tests/amistad.mjs`.
- Lo demás: la prueba de `mundo/tests/` con el nombre del módulo (`ls mundo/tests`).

Navegador y capturas: solo si el cambio se ve y la tarea lo pide; si no, se anota como «pendiente del dueño».

## 4. Revisar lo que vuelve

1. `git diff --stat`: ¿tocó solo lo permitido?
2. Correr uno mismo las pruebas del encargo (no confiar en el resumen).
3. Leer el diff de lo nuevo, buscando: textos sin par `es`/`en`, emojis, valores existentes cambiados,
   números mágicos fuera del patrón, lógica metida en un JSON.
4. Si falla algo chico, arreglarlo uno mismo. Si falla lo central, escalar (Haiku a Sonnet) con lo que
   salió mal en el encargo; no repetir el mismo encargo al mismo modelo.
5. Anotar en `mundo/PENDIENTES.md` (bitácora) qué se hizo y con qué modelo, en una línea.

## 5. Encargos para Codex o Antigravity

Mismo formato. Ellos leen `AGENTS.md` y no cargan skills solos: en el encargo poner la ruta de la
skill como archivo a leer. El dueño pega el encargo; quien lo escribe deja claro qué rama usar y que el
PR va sin atribución.
