// =========================================================
// VENJY · Worker de chunks
// Genera y malla chunks fuera del hilo principal (llenado, luz y mallado).
// Cada worker calcula su propio terreno con la misma semilla, así que no hay
// que transferir los mapas de alturas: solo llegan los arreglos del chunk.
// =========================================================
import { generarDatos } from './mundo-datos.js';
import { prepararTerreno, llenarChunk, mallarChunkCrudo } from './voxeles.js';

let terreno = null;

function buffersDe(g) {
    const lista = [];
    for (const parte of [g.solido, g.agua]) {
        if (parte) lista.push(parte.p.buffer, parte.u.buffer, parte.c.buffer, parte.l.buffer, parte.i.buffer);
    }
    return lista;
}

self.onmessage = e => {
    const m = e.data;
    try {
        if (m.t === 'init') {
            terreno = prepararTerreno(generarDatos(m.orient));
            self.postMessage({ t: 'listo' });
        } else if (m.t === 'chunk' && terreno) {
            const relleno = llenarChunk(terreno, m.x, m.z);
            const g = mallarChunkCrudo(m.x, m.z, relleno);
            self.postMessage(
                { t: 'chunk', k: m.k, x: m.x, z: m.z, g, vox: relleno.vox, luz: relleno.luz },
                [...buffersDe(g), relleno.vox.buffer, relleno.luz.buffer]
            );
        }
    } catch (err) {
        self.postMessage({ t: 'error', mensaje: String(err && err.message || err) });
    }
};
