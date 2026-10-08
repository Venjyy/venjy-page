// =========================================================
// VENJY · Supervivencia · Agricultura
// Registro de lo que crece (cultivos, brotes y tierra labrada) en vez de ticks aleatorios por
// todo el mapa: cada segundo se revisa la lista. Ritmo pensado para runs cortas: un cultivo
// regado madura en ~6 minutos (el doble sin agua) y un brote se vuelve árbol en ~3.
// Solo crece lo que está en chunks cargados (como Minecraft).
// =========================================================
import { B, TIPO } from '../texturas.js';

const ETAPAS = {
    trigo: [B.TRIGO_0, B.TRIGO_1, B.TRIGO_2, B.TRIGO_3, B.TRIGO],
    zanahoria: [B.ZANAHORIA_0, B.ZANAHORIA_1, B.ZANAHORIA_2, B.ZANAHORIA_3],
    papa: [B.PAPA_0, B.PAPA_1, B.PAPA_2, B.PAPA_3]
};
const CULTIVO_DE = new Map();
for (const [nombre, lista] of Object.entries(ETAPAS)) lista.forEach((id, i) => CULTIVO_DE.set(id, { nombre, etapa: i, ultima: i === lista.length - 1 }));
const BROTES = new Map([[B.BROTE, 0], [B.BROTE_ABEDUL, 1], [B.BROTE_PINO, 2]]);
const TIERRAS_CULTIVO = [B.TIERRA_LABRADA, B.TIERRA_LABRADA_HUMEDA, B.CULTIVO];
export const esTierraCultivo = id => TIERRAS_CULTIVO.includes(id);
export const esSueloBrote = id => id === B.PASTO || id === B.TIERRA || id === B.PODZOL;
export const etapasDe = id => CULTIVO_DE.get(id);

// Seg. promedio por etapa (regado / seco) y para que un brote crezca
const SEG_ETAPA = 75, SEG_ETAPA_SECO = 150, SEG_BROTE = 180;

export function crearAgricultura({ mundo }) {
    const lista = new Map(); // 'x,y,z' -> true
    const clave = (x, y, z) => x + ',' + y + ',' + z;
    let reloj = 0;

    function registrar(x, y, z) { lista.set(clave(x, y, z), true); }

    // ¿Hay agua a 4 bloques en horizontal (al mismo nivel o uno más arriba)?
    function regada(x, y, z) {
        for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) {
            if (mundo.bloque(x + dx, y, z + dz) === B.AGUA || mundo.bloque(x + dx, y + 1, z + dz) === B.AGUA) return true;
        }
        return false;
    }

    // Árbol: tronco y copa como los del mapa (roble, abedul, pino), solo si hay espacio
    function arbol(x, y, z, tipo) {
        const h = tipo === 2 ? 6 + Math.floor(Math.random() * 3) : 4 + Math.floor(Math.random() * 2) + tipo;
        for (let k = 1; k <= h + 1; k++) { const b = mundo.bloque(x, y + k, z); if (b !== 0 && TIPO[b] !== 4) return false; }
        const tronco = [B.TRONCO, B.TRONCO_ABEDUL, B.TRONCO_PINO][tipo], hoja = [B.HOJAS, B.HOJAS_ABEDUL, B.HOJAS_PINO][tipo];
        const lote = [];
        const hojaEn = (xx, yy, zz) => { const b = mundo.bloque(xx, yy, zz); if (b === 0 || TIPO[b] === 4) lote.push([xx, yy, zz, hoja]); };
        const tope = y + h;
        if (tipo === 2) {
            for (let yy = y + 2; yy <= tope + 1; yy++) {
                const k = yy - (y + 2);
                const r = yy >= tope ? 0 : Math.max(1, 2 - Math.floor(k * 3 / (h + 1)) + (k % 2 === 0 ? 1 : 0));
                for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dz) <= r + (r > 1 ? 1 : 0)) hojaEn(x + dx, yy, z + dz);
            }
        } else {
            for (let yy = tope - 2; yy <= tope + 1; yy++) {
                const r = yy >= tope ? 1 : 2;
                for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
                    if (r === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && Math.random() < 0.5) continue;
                    if (yy === tope + 1 && Math.abs(dx) + Math.abs(dz) > 1) continue;
                    hojaEn(x + dx, yy, z + dz);
                }
            }
        }
        for (let yy = y; yy < tope + (tipo === 2 ? 1 : 0); yy++) lote.push([x, yy, z, tronco]);
        if (mundo.bloque(x, y - 1, z) === B.PASTO) lote.push([x, y - 1, z, B.TIERRA]);
        mundo.editarLote(lote);
        return true;
    }

    // Un paso de crecimiento para la posición; devuelve false si ya no hay que seguirla
    function crecer(x, y, z, forzado = false) {
        const id = mundo.bloque(x, y, z);
        if (id === -1) return true; // sin cargar: se revisa después
        const c = CULTIVO_DE.get(id);
        if (c) {
            const suelo = mundo.bloque(x, y - 1, z);
            if (!esTierraCultivo(suelo)) return false;
            if (c.ultima) return false;
            const prob = forzado ? 1 : 1 / (suelo === B.TIERRA_LABRADA ? SEG_ETAPA_SECO : SEG_ETAPA);
            if (Math.random() < prob) mundo.editar(x, y, z, ETAPAS[c.nombre][c.etapa + 1]);
            return true;
        }
        if (BROTES.has(id)) {
            if (forzado ? Math.random() < 0.45 : Math.random() < 1 / SEG_BROTE) {
                mundo.editar(x, y, z, 0, false);
                if (!arbol(x, y, z, BROTES.get(id))) { mundo.editar(x, y, z, id); return true; }
                return false;
            }
            return true;
        }
        if (id === B.TIERRA_LABRADA || id === B.TIERRA_LABRADA_HUMEDA) {
            // Riego: se humedece cerca del agua y se seca lejos; seca y sin cultivo, vuelve a ser tierra
            const r = regada(x, y, z);
            if (r && id === B.TIERRA_LABRADA) mundo.editar(x, y, z, B.TIERRA_LABRADA_HUMEDA, false);
            else if (!r && id === B.TIERRA_LABRADA_HUMEDA && Math.random() < 0.1) mundo.editar(x, y, z, B.TIERRA_LABRADA, false);
            else if (!r && id === B.TIERRA_LABRADA && !CULTIVO_DE.has(mundo.bloque(x, y + 1, z)) && Math.random() < 0.02) { mundo.editar(x, y, z, B.TIERRA, false); return false; }
            return true;
        }
        return false;
    }

    function actualizar(dt) {
        reloj += dt;
        if (reloj < 1) return;
        reloj -= 1;
        for (const k of [...lista.keys()]) {
            const [x, y, z] = k.split(',').map(Number);
            if (!crecer(x, y, z)) lista.delete(k);
        }
    }

    // Harina de huesos: adelanta un cultivo 2-4 etapas o intenta crecer un brote
    function abonar(x, y, z) {
        const id = mundo.bloque(x, y, z);
        const c = CULTIVO_DE.get(id);
        if (c) {
            if (c.ultima) return false;
            const etapas = ETAPAS[c.nombre];
            mundo.editar(x, y, z, etapas[Math.min(etapas.length - 1, c.etapa + 2 + Math.floor(Math.random() * 3))]);
            registrar(x, y, z);
            return true;
        }
        if (BROTES.has(id)) { crecer(x, y, z, true); return true; }
        if (id === B.PASTO && mundo.bloque(x, y + 1, z) === 0) {
            // Pasto y flores alrededor
            const lote = [];
            for (let i = 0; i < 14; i++) {
                const xx = x + Math.round((Math.random() - 0.5) * 6), zz = z + Math.round((Math.random() - 0.5) * 6);
                if (mundo.bloque(xx, y, zz) === B.PASTO && mundo.bloque(xx, y + 1, zz) === 0) {
                    const r = Math.random();
                    lote.push([xx, y + 1, zz, r < 0.75 ? B.PASTO_ALTO : r < 0.85 ? B.FLOR_ROJA : r < 0.95 ? B.FLOR_AMARILLA : B.FLOR_AZUL]);
                }
            }
            mundo.editarLote(lote);
            return true;
        }
        return false;
    }

    return {
        registrar, actualizar, abonar,
        serializar: () => [...lista.keys()],
        cargar(arr) { lista.clear(); for (const k of arr || []) lista.set(k, true); }
    };
}
