// =========================================================
// VENJY · Supervivencia · /medir romper (modo devenjy, bloque 7b-1)
// Rompe un volumen de 6×6×3 bloques a 4 bloques/s en tres sitios (campo abierto, junto al
// campamento y una base con antorchas puestas para la prueba) con el mismo camino que el jugador
// (minado.romperBloque: edición, botín, partículas, sonido). Mide la duración del bucle de cada
// cuadro (p50/p95/p99) y los ms por fase que marcan voxeles.js y los sistemas (marcar()).
// Al terminar cada sitio deja los bloques como estaban y quita lo que se soltó.
// Se carga con import() solo al usar el comando. Resultado también en window.__medicion.
// `/medir romper captura`: antes de dejar cada sitio como estaba, espera (window.__medirCaptura) para
// sacar una captura con el camino rápido, otra tras rehacer todos los chunks desde cero y comparar.
// =========================================================
import { medicion, CHUNK, ALTO } from '../voxeles.js';
import { TIPO } from '../texturas.js';

const TXT = {
    es: {
        inicio: 'Medición: 3 sitios, unos 30 s cada uno. No te muevas.',
        sitio: (n, i) => `Midiendo ${n} (${i}/3)…`,
        sinSitio: n => `No encontré dónde medir ${n}`,
        fin: 'Medición lista: resultados en la consola (F12) y en window.__medicion',
        res: (n, r) => `${n}: cuadro p50 ${r.p50} · p95 ${r.p95} · p99 ${r.p99} ms · remallado ${r.remallado} ms/edición`,
        uso: 'Uso: /medir romper [captura]',
        ocupado: 'Ya hay una medición en curso',
        nombres: { campo: 'campo abierto', campamento: 'junto al campamento', base: 'base con antorchas' }
    },
    en: {
        inicio: 'Benchmark: 3 places, about 30 s each. Do not move.',
        sitio: (n, i) => `Measuring ${n} (${i}/3)…`,
        sinSitio: n => `Could not find where to measure ${n}`,
        fin: 'Benchmark done: results in the console (F12) and in window.__medicion',
        res: (n, r) => `${n}: frame p50 ${r.p50} · p95 ${r.p95} · p99 ${r.p99} ms · remesh ${r.remallado} ms/edit`,
        uso: 'Usage: /medir romper [captura]',
        ocupado: 'A benchmark is already running',
        nombres: { campo: 'open field', campamento: 'next to the campsite', base: 'base with torches' }
    }
};

const ROMPER_CADA = 250; // ms: 4 bloques por segundo
const FASES_REMALLADO = ['llenar', 'luz', 'mallar', 'instalar', 'luzInc', 'seccion'];
const esperar = ms => new Promise(r => setTimeout(r, ms));
const pct = (a, p) => a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(2) : 0;

let enCurso = false;

export async function medirRomper(ctx, arg = 'romper') {
    const { mundo, jugador, minado, entidades, terreno, irA, hud, B, DY, idioma = 'es', chunkForzado } = ctx;
    const t = TXT[idioma] || TXT.es;
    const partes = (arg || '').trim().split(/\s+/);
    if (partes[0] !== 'romper') { hud.mensaje(t.uso, 4); return null; }
    const captura = partes.includes('captura');
    if (enCurso) { hud.mensaje(t.ocupado, 3); return null; }
    enCurso = true;
    hud.mensaje(t.inicio, 5);

    const superficie = (x, z) => {
        for (let y = ALTO - 2; y > 1; y--) { const id = mundo.bloque(x, y, z); if (id > 0 && TIPO[id] === 1) return y; }
        return -1;
    };
    // Chunk de pasto, lejos de zonas con luz (la luz se calcula solo dentro del chunk)
    const buscarCampo = (x0, z0, lejosDe = null) => {
        for (let r = 0; r < 40; r++) {
            for (let k = 0; k < 8 * Math.max(1, r); k++) {
                const a = k / (8 * Math.max(1, r)) * Math.PI * 2;
                const x = Math.round(x0 + Math.cos(a) * r * CHUNK), z = Math.round(z0 + Math.sin(a) * r * CHUNK);
                const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
                if (x < 64 || z < 64 || x > terreno.BW - 64 || z > terreno.BD - 64) continue;
                if (lejosDe && Math.hypot(x - lejosDe.x, z - lejosDe.z) < 6 * CHUNK) continue;
                let libre = true;
                for (let dz = -2; dz <= 2 && libre; dz++) for (let dx = -2; dx <= 2 && libre; dx++) if (chunkForzado(terreno, cx + dx, cz + dz)) libre = false;
                const o = Math.floor(z) * terreno.BW + Math.floor(x);
                if (!libre || terreno.SUP[o] !== B.PASTO || terreno.HT[o] < 16) continue;
                return { x: cx * CHUNK + 4, z: cz * CHUNK + 8 };
            }
        }
        return null;
    };
    const esperarCarga = async () => {
        for (let i = 0; i < 300; i++) {
            if (!mundo.cola.length && !mundo.enVuelo.size && !mundo.remallado.size && !(mundo.pendientes && mundo.pendientes())) break;
            await esperar(50);
        }
        await esperar(1000);
    };

    const campo = buscarCampo(jugador.pos.x, jugador.pos.z);
    const camp = terreno.lugares.find(l => l.clave === 'campamento');
    const sitios = [
        { k: 'campo', p: campo },
        { k: 'campamento', p: camp && { x: Math.floor(camp.x) + camp.radio - 4, z: Math.floor(camp.z) } },
        { k: 'base', p: buscarCampo(jugador.pos.x + 300, jugador.pos.z, campo), antorchas: true }
    ];
    const resultados = [];
    const vuelta = { x: jugador.pos.x, y: jugador.pos.y, z: jugador.pos.z, yaw: jugador.yaw, pitch: jugador.pitch };
    try {
        for (let i = 0; i < sitios.length; i++) {
            const s = sitios[i], nombre = t.nombres[s.k];
            if (!s.p) { hud.mensaje(t.sinSitio(nombre), 4); continue; }
            hud.mensaje(t.sitio(nombre, i + 1), 4);
            irA(s.p.x + 0.5, undefined, s.p.z + 0.5);
            jugador.yaw = -Math.PI / 2; jugador.pitch = -0.45; // mira al volumen (hacia +x)
            await esperarCarga();
            const bx = Math.floor(jugador.pos.x) + 2, bz = Math.floor(jugador.pos.z) - 3;
            // Copia de lo que había (para dejarlo igual) y antorchas alrededor si es la base
            const copia = [];
            const guardar = (x, y, z) => copia.push([x, y, z, mundo.bloque(x, y, z)]);
            for (let z = bz - 2; z < bz + 8; z++) for (let x = bx - 2; x < bx + 8; x++) {
                const top = superficie(x, z);
                for (let y = top - 3; y <= top + 2; y++) guardar(x, y, z);
            }
            if (s.antorchas) {
                const lote = [];
                for (const [dx, dz] of [[-2, -2], [3, -2], [8, -2], [-2, 3], [8, 3], [-2, 8], [3, 8], [8, 8]]) {
                    const x = bx + dx, z = bz + dz, y = superficie(x, z) + 1;
                    lote.push([x, y, z, B.ANTORCHA]);
                }
                mundo.editarLote(lote, true);
                await esperarCarga();
            }
            const antes = new Set(entidades.lista);
            // Volumen 6×6×3 desde la superficie de cada columna, capa por capa
            const objetivo = [];
            const tops = new Map();
            for (let z = bz; z < bz + 6; z++) for (let x = bx; x < bx + 6; x++) tops.set(x + ',' + z, superficie(x, z));
            for (let k = 0; k < 3; k++) for (let z = bz; z < bz + 6; z++) for (let x = bx; x < bx + 6; x++) objetivo.push([x, tops.get(x + ',' + z) - k, z]);

            medicion.fases = {}; medicion.cuadros = []; medicion.activa = true;
            performance.clearMeasures();
            let ediciones = 0;
            const t0 = performance.now();
            for (let n = 0; n < objetivo.length; n++) {
                const [x, y, z] = objetivo[n];
                const id = mundo.bloque(x, y, z);
                if (id > 0 && id !== B.ROCA_MADRE && TIPO[id] !== 3) { minado.romperBloque(x, y, z, id, 0); ediciones++; }
                const espera = t0 + (n + 1) * ROMPER_CADA - performance.now();
                if (espera > 0) await esperar(espera);
            }
            await esperar(500); // lo que quede en cola o en los workers
            medicion.activa = false;

            const c = medicion.cuadros.slice().sort((a, b) => a - b);
            const fases = {};
            for (const [f, v] of Object.entries(medicion.fases)) fases[f] = { ms: +v.ms.toFixed(1), n: v.n, max: +v.max.toFixed(2), porEdicion: +(v.ms / Math.max(1, ediciones)).toFixed(2) };
            const remallado = FASES_REMALLADO.reduce((a, f) => a + (medicion.fases[f] ? medicion.fases[f].ms : 0), 0) / Math.max(1, ediciones);
            const r = { sitio: s.k, x: bx, z: bz, cuadros: c.length, ediciones, p50: pct(c, 0.5), p95: pct(c, 0.95), p99: pct(c, 0.99), max: pct(c, 1), remallado: +remallado.toFixed(2), fases };
            resultados.push(r);
            console.log('[medir] ' + s.k, r);
            console.table(fases);
            hud.mensaje(t.res(nombre, r), 8);

            if (captura) {
                await new Promise(seguir => {
                    window.__medirCaptura = {
                        sitio: s.k, seguir,
                        // Rehace desde cero todos los chunks cargados (la imagen de referencia)
                        rehacer: () => { for (const [k, ch] of mundo.chunks) mundo.invalidar(k, ch); },
                        listo: () => !mundo.pendientes()
                    };
                });
                window.__medirCaptura = null;
            }
            // Deja todo como estaba
            for (const e of entidades.lista.slice()) if (!antes.has(e)) entidades.quitar(e);
            const restaurar = copia.filter(([x, y, z, id]) => id >= 0 && mundo.bloque(x, y, z) !== id);
            if (s.antorchas) {
                for (const [dx, dz] of [[-2, -2], [3, -2], [8, -2], [-2, 3], [8, 3], [-2, 8], [3, 8], [8, 8]]) {
                    const x = bx + dx, z = bz + dz;
                    for (let y = superficie(x, z) + 1; y < superficie(x, z) + 3; y++) if (mundo.bloque(x, y, z) === B.ANTORCHA) restaurar.push([x, y, z, 0]);
                }
            }
            if (restaurar.length) mundo.editarLote(restaurar, false);
            await esperarCarga();
        }
    } finally {
        medicion.activa = false; medicion.cuadros = null;
        enCurso = false;
        irA(vuelta.x, vuelta.y, vuelta.z);
        jugador.yaw = vuelta.yaw; jugador.pitch = vuelta.pitch;
    }
    window.__medicion = resultados;
    hud.mensaje(t.fin, 6);
    return resultados;
}
