// =========================================================
// VENJY · Estudio · B4a: los 16 reencuentros de reencuentros.js pasan a mundo/datos/escenas.json
// node estudio/migrar-reencuentros.mjs [--escribir]      (sin --escribir solo cuenta qué haría)
// Corre reencuentro(a, b) de cada pareja de REENCUENTROS y guarda el guion ya calculado como una escena «guion» con
// dispara { tipo: 'reencuentro', personas: [a, b] } (estudio/DISENO.md §40, decisión 3). Los tramos ya vienen ordenados;
// los gestos puno/secreto/abrazo corridos (punoR, secretoR, abrazoR) pasan a opciones del tramo (reloj, escala), y tu clon
// es el actor `c` con clave 'j'. Solo añade escenas: si la clave ya existe no la toca. Los textos no llevan `revisado`.
// Prueba: node mundo/tests/escenas-reencuentros.mjs (paridad cuadro a cuadro con el JS, en las dos direcciones).
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatear } from './formato.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVO = path.join(aqui, '..', 'mundo', 'datos', 'escenas.json');

const r10 = x => Math.round(x * 1e10) / 1e10; // 2.0500000000000003 -> 2.05 (el gesto sigue igual a menos de 1e-9)

// Tramo del JS -> tramo del JSON. `H` = instante del choque de puños (solo el reencuentro corto lo usa)
function tramo([g, a, b], H) {
    if (g === 'punoR') return ['puno', a, b, { reloj: r10(H - 1.45) }];
    if (g === 'secretoR') return ['secreto', a, b, { reloj: r10(a - 0.4) }];
    if (g === 'abrazoR') return ['abrazo', a, b, { reloj: r10(a - 0.4), escala: { pz: 1.7 } }];
    return [g, a, b];
}

export async function escenaDeReencuentro(clave, { reencuentro, durLinea, REENCUENTROS }) {
    const [a, b] = clave.split('-');
    const g = reencuentro(a, b);
    if (!g) throw new Error(`reencuentro(${a}, ${b}) no dio guion (¿cambió la relación?)`);
    // Choque de puños de `corto`: s = 0.5 al empezar, H = s + d + 0.5 (reencuentros.js)
    const H = 0.5 + durLinea(g.lineas[0].texto) + 0.5;
    const pista = {};
    for (const q of [a, b, 'c']) pista[q] = g.pista[q].map(t => tramo(t, H));
    return {
        tipo: 'guion',
        dispara: { tipo: 'reencuentro', personas: [a, b] },
        T: g.T,
        r: g.r,
        lineas: g.lineas.map(l => ({ q: l.q, a: l.a, texto: l.texto })),
        pista,
        golpes: g.golpes,
        actores: { c: { clave: 'j', radio: g.actores.c.radio } }
    };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    globalThis.window ??= { addEventListener() {} };
    const aviso = console.warn;
    console.warn = (...m) => { if (!String(m[0]).startsWith('[datos]')) aviso(...m); };
    const { reencuentro, durLinea, REENCUENTROS } = await import('../mundo/supervivencia/reencuentros.js');
    console.warn = aviso;
    const datos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
    let nuevas = 0, ya = 0;
    for (const clave of Object.keys(REENCUENTROS)) {
        const nombre = 'reencuentro-' + clave;
        if (datos.escenas[nombre]) { ya++; continue; }
        datos.escenas[nombre] = await escenaDeReencuentro(clave, { reencuentro, durLinea, REENCUENTROS });
        nuevas++;
    }
    if (process.argv.includes('--escribir')) { fs.writeFileSync(ARCHIVO, formatear(datos)); console.log(`escenas.json: ${nuevas} reencuentros añadidos (${ya} ya estaban)`); }
    else console.log(`${nuevas} reencuentros por añadir (${ya} ya estaban); --escribir para guardar`);
}
