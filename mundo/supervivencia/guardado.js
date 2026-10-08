// =========================================================
// VENJY · Supervivencia · Guardado
// Hasta 5 mundos en IndexedDB (base 'venjy-supervivencia', almacén 'mundos'). Cada mundo es
// un objeto plano: { id, version, nombre, dificultad, creado, actualizado, jugado, ...estado }.
// Exportar / importar: el mismo objeto como JSON comprimido con gzip (archivo .venjy).
// =========================================================
export const MAX_MUNDOS = 5;
export const VERSION = 1;
const BASE = 'venjy-supervivencia', ALMACEN = 'mundos';

let conexion = null;
function abrir() {
    if (conexion) return conexion;
    conexion = new Promise((resolver, rechazar) => {
        let pedido;
        try { pedido = indexedDB.open(BASE, 1); } catch (e) { rechazar(e); return; }
        pedido.onupgradeneeded = () => {
            const db = pedido.result;
            if (!db.objectStoreNames.contains(ALMACEN)) db.createObjectStore(ALMACEN, { keyPath: 'id' });
        };
        pedido.onsuccess = () => resolver(pedido.result);
        pedido.onerror = () => rechazar(pedido.error);
    });
    conexion.catch(() => { conexion = null; });
    return conexion;
}

function transaccion(modo, f) {
    return abrir().then(db => new Promise((resolver, rechazar) => {
        const tx = db.transaction(ALMACEN, modo);
        const almacen = tx.objectStore(ALMACEN);
        let resultado;
        const r = f(almacen);
        if (r) r.onsuccess = () => { resultado = r.result; };
        tx.oncomplete = () => resolver(resultado);
        tx.onerror = () => rechazar(tx.error);
        tx.onabort = () => rechazar(tx.error || new Error('transacción abortada'));
    }));
}

// Lista de mundos (solo los datos de la tarjeta), del más reciente al más antiguo
export async function listarMundos() {
    const todos = await transaccion('readonly', a => a.getAll());
    return (todos || [])
        .map(m => ({ id: m.id, nombre: m.nombre, dificultad: m.dificultad, creado: m.creado, actualizado: m.actualizado, jugado: m.jugado || 0, completado: !!m.completado, dias: m.dias || 0 }))
        .sort((a, b) => b.actualizado - a.actualizado);
}

export const cargarMundo = id => transaccion('readonly', a => a.get(id));
export const guardarMundo = mundo => transaccion('readwrite', a => a.put({ ...mundo, version: VERSION, actualizado: Date.now() }));
export const borrarMundo = id => transaccion('readwrite', a => a.delete(id));

export function nuevoId() {
    return 'm' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

// ---------------------------------------------------------
// Ediciones de bloques: Map('cx,cz' -> Map(índice -> id)) <-> [[clave, [índice, id, índice, id…]], …]
// ---------------------------------------------------------
export function serializarEdiciones(ediciones) {
    const lista = [];
    for (const [k, m] of ediciones) {
        if (!m.size) continue;
        const plano = new Array(m.size * 2);
        let i = 0;
        for (const [indice, id] of m) { plano[i++] = indice; plano[i++] = id; }
        lista.push([k, plano]);
    }
    return lista;
}

export function cargarEdiciones(lista, ediciones) {
    ediciones.clear();
    for (const [k, plano] of lista || []) {
        const m = new Map();
        for (let i = 0; i < plano.length; i += 2) m.set(plano[i], plano[i + 1]);
        ediciones.set(k, m);
    }
}

// ---------------------------------------------------------
// Exportar / importar (.venjy = JSON + gzip)
// ---------------------------------------------------------
async function comprimir(texto) {
    if (typeof CompressionStream === 'undefined') return new Blob([texto], { type: 'application/json' });
    const flujo = new Blob([texto]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(flujo).blob();
}

async function descomprimir(blob) {
    const cabeza = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
    if (cabeza[0] !== 0x1f || cabeza[1] !== 0x8b) return blob.text(); // JSON sin comprimir
    if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador no puede leer archivos comprimidos');
    return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();
}

export async function exportarMundo(id) {
    const m = await cargarMundo(id);
    if (!m) throw new Error('No existe el mundo');
    const blob = await comprimir(JSON.stringify({ formato: 'venjy-supervivencia', ...m }));
    const a = document.createElement('a');
    const seguro = (m.nombre || 'mundo').replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 30) || 'mundo';
    a.href = URL.createObjectURL(blob);
    a.download = `${seguro}.venjy`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// Lee un archivo .venjy y lo guarda como un mundo nuevo (no pisa ninguno existente)
export async function importarMundo(archivo) {
    if (archivo.size > 50 * 1024 * 1024) throw new Error('Archivo demasiado grande');
    const texto = await descomprimir(archivo);
    let m;
    try { m = JSON.parse(texto); } catch (e) { throw new Error('El archivo no es una partida válida'); }
    if (!m || m.formato !== 'venjy-supervivencia' || typeof m.version !== 'number') throw new Error('El archivo no es una partida de Venjy');
    if (m.version > VERSION) throw new Error('La partida es de una versión más nueva del juego');
    const lista = await listarMundos();
    if (lista.length >= MAX_MUNDOS) throw new Error(`Ya tienes ${MAX_MUNDOS} mundos: borra uno para importar`);
    delete m.formato;
    m.id = nuevoId();
    m.nombre = String(m.nombre || 'Mundo').slice(0, 24);
    await guardarMundo(m);
    return m.id;
}
