AHORRO FORZADO (venjy-page; detalle en .claude/skills/ahorro/SKILL.md, sin bajar la calidad):
1. Leer: MAPA.md, luego Grep del símbolo, luego Read con offset/limit. Un hook bloquea Read de archivos >200 líneas sin limit y de GIF, video, audio, vendor/, respaldo-2026-10-06/, .impeccable/review/, centroeventostest/.
2. Verificar: CLI y pruebas de Node primero (`node estudio/cli.mjs resumen|validar --contra HEAD`, mundo/tests/*.mjs). Navegador solo para lo nuevo o directamente afectado, sin capturas salvo cambio visual; lo visual lo prueba el dueño.
3. Shell: nada de `node -e` ni `python -c` con comillas o backticks. Escribe un script a $TEMP con heredoc 'E' y ejecútalo. Edita archivos con Edit; los CRLF se respetan.
4. No cargar skills pesadas para cambios chicos (update-config: editar el JSON directo y validar con node). Cargar solo las que la tarea pide.
5. Subagentes: solo Haiku y para partes grandes y mecánicas; si es chico, hazlo tú.
6. Cierre: al abrir o fusionar un PR invoca la skill traspaso-chat y entrega el prompt en un bloque de código. Salida corta: qué cambió, qué se verificó, qué falta.
