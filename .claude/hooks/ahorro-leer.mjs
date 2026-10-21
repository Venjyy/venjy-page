// PreToolUse(Read): frena lecturas caras. Bloquea medios pesados, carpetas que no se leen y archivos de texto
// de más de MAX_LINEAS líneas leídos enteros (sin offset ni limit). Todo lo demás pasa.
import fs from 'node:fs';
const MAX_LINEAS = 200;
const MEDIOS = /\.(gif|mp4|webm|mov|mp3|wav|ogg|zip|ttf|woff2?)$/i;
const SIN_LIMITE = /\.(png|jpe?g|webp|pdf|ipynb|svg)$/i; // las ve la herramienta con sus propias reglas
const CARPETAS = /(^|\/)(vendor|node_modules|respaldo-2026-10-06|centroeventostest|\.impeccable\/review)(\/|$)/;
let entrada = '';
process.stdin.on('data', d => { entrada += d; });
process.stdin.on('end', () => {
    let ti = {};
    try { ti = JSON.parse(entrada).tool_input || {}; } catch (e) { return; }
    const ruta = String(ti.file_path || '').replaceAll('\\', '/');
    const negar = razon => process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: razon } }));
    if (!ruta) return;
    if (MEDIOS.test(ruta)) return negar(`Ahorro: no se abren medios pesados (${ruta}). Refiérete a él por nombre.`);
    if (CARPETAS.test(ruta)) return negar('Ahorro: esa carpeta (vendor, respaldo, capturas viejas, demo aparte) no se lee salvo que el dueño lo pida. Si lo pidió, dile que lo autorice.');
    if (SIN_LIMITE.test(ruta) || ti.offset != null || ti.limit != null || ti.allow_large) return;
    let lineas = 0;
    try { lineas = fs.readFileSync(ruta, 'utf8').split('\n').length; } catch (e) { return; }
    if (lineas > MAX_LINEAS) negar(`Ahorro: ${ruta} tiene ${lineas} líneas. Usa Grep para ubicar el símbolo y Read con offset y limit (30-80 líneas). Si de verdad necesitas el archivo entero, repite el Read con allow_large: true.`);
});
