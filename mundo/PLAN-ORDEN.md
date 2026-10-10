# Plan de orden (fase A escrita · B y C por ejecutar)

Propuesta, no ejecutada. Números de línea medidos sobre `main` (`cc03834`); recalcular con
`grep -n "^#" mundo/PENDIENTES.md` y `grep -nE "^    // ----" mundo/supervivencia/main.js` antes de
mover nada. Cada parte, en su propio chat y PR, con la skill `ahorro`.

**Orden y conflictos.** C (conectar la skill) es la más barata y la que ahorra desde el día 1: va
primero. A (archivar PENDIENTES) es mecánica. B (partir `main.js`) toca el archivo que otras ramas
modifican (`amistad-6c-grupos` lo cambia): hacerla **después de fusionar** esa rama, nunca en paralelo.

## a) Archivar `PENDIENTES.md` (1085 líneas → < 250)

Se crea `mundo/historial/` (no se lee salvo que haga falta). Secciones, por título y rango:

| Rango | Sección | Destino |
|---|---|---|
| 1-17 | Objetivo, Cómo ejecutar | queda |
| 18-44 | Arquitectura | queda |
| 45-61 | Modo online (Supabase) | queda; líneas «Estado»/hechos → `historial/online.md` |
| 62-111 | Modo supervivencia | queda condensada (~30 líneas); el «Estado» de la línea 81 en adelante → `historial/supervivencia.md` |
| 112-187 | Bloque 5 · cooperativo | → `historial/bloque5-coop.md`; quedan solo las líneas «Pendiente / límites» (141, 163, 184) |
| 188-202 | Bloque 6 · principios | queda |
| 203-352 | 6a y 6b, incluidos «Estado 6a» (215), «Estado 6b-1» (268) y «Estado 6b-2» (305) | → `historial/bloque6-6a-6b.md` |
| 353-443 | 6c: descripción y tabla de relaciones (363-440) | tabla → `historial/bloque6-relaciones.md`; queda la parte de 6c-2 pendiente (~40 líneas). Si 6c-2 la necesita, enlazar a `mundo/DISENO-6c.md` |
| 444-489 | «Estado 6c-1» (hecho) | → `historial/bloque6-6c1.md` |
| 490-514 | 6d · vida entre amigos | queda |
| 515-838 | Bloque 7 (planificación, 324 líneas) | → `mundo/PLAN-BLOQUE7.md` (no es historial: es lo vivo, pero largo); en PENDIENTES queda un índice de 7a-7i y el orden recomendado (779-791) |
| 839-861 | Portafolio interactivo | → `historial/portafolio.md` (deja 1 línea con el «Pendiente» de la 860) |
| 862-893 | Vida en el mundo | → `historial/vida-en-el-mundo.md` |
| 894-902 | Estado actual (Fase 1) | → `historial/fase1.md` |
| 903-945 | Por hacer: Fase 2, Gatas, Fase 3, Técnico | queda lo no marcado como hecho; lo hecho → `historial/fase1.md` |
| 946-958 | Notas para depurar, Convenciones | queda |
| 959-1085 | Bitácora de cambios | → `historial/bitacora.md`; en PENDIENTES, una línea de puntero |

Cuenta aproximada de lo que queda: 17+27+17+30+10+15+40+25+25+43+13+ índices ≈ 240 líneas.
**Verificar con `wc -l`**; si pasa de 250, condensar «Por hacer» antes de mover más.

Pasos: (1) crear los archivos con `sed -n 'A,Bp'` (copia literal, sin reescribir); (2) borrar esos
rangos de `PENDIENTES.md`, de abajo hacia arriba, para no correr las líneas; (3) dejar en cada hueco
una línea `→ historial/<archivo>.md`; (4) corregir referencias: `grep -rn "PENDIENTES.md" CLAUDE.md
.claude mundo/*.md` (el CLAUDE.md menciona «Modo supervivencia», «Modo online» y «Bloque 5»: ajustar los
punteros); (5) añadir regla: al cerrar una parte, su «Estado» y su bitácora se mueven al historial.

## b) Partir `mundo/supervivencia/main.js` (1160 líneas) sin cambiar comportamiento

Obstáculo: `arrancar` (408-1160) es una sola clausura con ~60 constantes compartidas. No se puede
cortar por líneas a ciegas. Técnica: cada bloque pasa a un módulo `crearX(ctx)` que recibe en `ctx` lo
ya construido (`mundo`, `jugador`, `vida`, `inventario`, `hud`…) y devuelve lo que otros usan. Se
extraen primero los bloques **hoja** (nadie usa sus nombres internos) y el bucle al final.

| Orden | Líneas | Bloque | Destino |
|---|---|---|---|
| 1 | 72-152 | Idioma y textos (`aplicarIdioma:82`) | `idioma.js` (exporta `idioma`, `tx`) |
| 2 | 186-372 | Menús: `mostrar`, `pintarMenu:199`, nombre, `hospedarMundo:271`, panel QR | `menu.js` |
| 3 | 1066-1077 y 1047-1065 | Depuración y ajustes de la pausa (`sincronizarAjustes:1048`) | `main-ajustes.js` |
| 4 | 925-955 | Guardado: `estadoActual:926`, `guardarYa:944`, autoguardado | `main-guardado.js` (`ctx` con vida, inventario, misiones…) |
| 5 | 826-924 | Sala cooperativa: `pintarCoop:844`, `invitarQR:861`, `terminarCoop:902`, `guardarCopia:913` | `main-coop.js` |
| 6 | 956-1046 | Entrada: puntero, pausa y teclas (`pedirPuntero:980`) | `main-entrada.js` |
| 7 | 632-739 | Cámaras y escenas: gatas, caricias, ronda, minijuegos, `cargarEscenaAmistad:713` | `main-escenas.js` |
| 8 | 1078-1160 | `bucle:1087` | `main-bucle.js` (recibe `ctx` con todos los sistemas) |

`main.js` queda con imports, renderer (153-185), `jugar`/`iniciarJuego:397` y `arrancar` reducido a
crear los sistemas centrales (435-631) y llamar a los instaladores. Lo que no se toca: el **orden** de
creación (hay `const` que dependen de otros: TDZ) ni las firmas de `crearX` de los demás módulos.

Seguridad: un bloque por commit; tras cada uno, `node --check` del archivo, las pruebas
(`node mundo/tests/*.mjs`), carga sin interfaz con errores de consola y 1 captura de la partida
(refactor, según `ahorro` §3). Al final, comparar `estadoActual()` antes y después en una partida
nueva (mismo JSON), y probar `supervivencia.html?disp=2` (cooperativo). Actualizar `mundo/MAPA.md`
(líneas de `main.js` y los archivos nuevos) en el mismo PR. Modelo: Opus decide el `ctx` de cada
bloque; Sonnet ejecuta los bloques 1-6 una vez fijado.

## c) Conectar la skill `ahorro`

**Líneas para `CLAUDE.md`** (sección «Convenciones»; añadir, no reemplazar):

```
- **Al empezar cualquier tarea**: usar la skill `ahorro` (`.claude/skills/ahorro/`, con `proyecto-venjy.md`).
- **Leer primero `mundo/MAPA.md`**; de `mundo/PENDIENTES.md`, solo la sección en curso (`grep -n "^#"`).
  Lo terminado está en `mundo/historial/`: no se lee salvo que haga falta.
```

**Skill `traspaso-chat`** (`SKILL.md`):

- *Pasos 1* (leer el plan): cambiar «ver dónde quedó el plan en `PENDIENTES.md`» por «leer solo el
  índice y la sección de la parte que sigue (`grep -n "^#"`), nunca el archivo entero».
- *Plantilla del prompt* (37-55): la línea «qué leer primero» pasa a listar **secciones** (`MAPA.md`,
  «Bloque X» de `PENDIENTES.md`), nunca archivos completos de más de 200 líneas.
- Añadir al prompt un bloque de **estado en 5-10 líneas** (hecho, rama/PR, decisiones, lo no tocado).
- *Reglas* (56-61): añadir «no pegar diffs ni bitácora; mover el estado terminado a `historial/`».

**Skill `animaciones-minecraft`**: añadir al final de §2 «Flujo de trabajo» un subapartado
«Ahorrar sin perder calidad» con, **sin quitar ni suavizar nada** de lo que hoy exigen §2 y §5:

- capturas a escala 0.5 y zoom a la zona de interés, no a la pantalla completa;
- capturar solo los tiempos nuevos o cambiados; no recapturar lo ya aprobado ni reabrir capturas viejas;
- hojas de varios tiempos en una sola imagen (`capturar.mjs`);
- preferir texto (medidas, posiciones, consola) cuando alcance, e imagen para lo que solo se ve;
- empezar por los tiempos clave (contactos, saltos, cambios de plano) y **agregar todas las capturas
  que hagan falta** hasta que pose, contacto y cámara se vean bien; video cuando el dueño lo revise.

Y en §0.4 («Reglas para cualquier encargo») una línea: «la verificación es la de la tabla de `ahorro`
§3, fila Animaciones/escenas».

**Fuera de alcance de este PR**: ninguno de los cambios de c) se aplicó; este chat solo crea archivos
nuevos para no chocar con `amistad-6c-grupos`.
