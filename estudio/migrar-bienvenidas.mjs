// =========================================================
// VENJY · Estudio · B4b: bienvenidas de bienvenidas/*.js a mundo/datos/escenas.json (y sus gestos a poses.json)
// node estudio/migrar-bienvenidas.mjs [--escribir]      (sin --escribir solo cuenta qué haría)
// Corre bienvenida() de cada módulo de TABLA y guarda el guion ya calculado como escena «guion» `bienvenida-<clave>` con
// dispara { tipo: 'bienvenida', skin: <clave> } (estudio/DISENO.md §40, decisión 3). secretoB, abrazoB, parejaB y punoM pasan
// a opciones del tramo (reloj, escala) y los gestos propios a poses.json con el nombre de la escena delante (`lalo-botas`).
// Solo añade claves: lo que ya existe no se toca. Los textos no llevan `revisado`.
// Migradas: lalo, andy, braulio, moises. Las demás (DISENO §40, «B4b») piden piezas que el catálogo aún no tiene.
// Prueba: node mundo/tests/escenas-bienvenidas.mjs (paridad cuadro a cuadro con el JS).
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatear } from './formato.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const DATOS = path.join(aqui, '..', 'mundo', 'datos');
const r10 = x => Math.round(x * 1e10) / 1e10;
const seno = (amp, frec, fase) => ({ forma: 'sin', amp, frec, ...(fase !== undefined ? { fase } : {}) });
const osc = (base, ...o) => ({ base, osc: o });
const clave = k => ({ k });

// Gestos propios por bienvenida (formato de poses.json; los valores son los de la función de JS)
const TABLA = {
    lalo: {
        gestos: {
            frotaM: { reloj: 't', canales: { bDx: osc(-1.0, seno(0.06, 14)), bDz: 0.6, bIx: osc(-1.0, seno(-0.06, 14)), bIz: -0.6, cx: 0.2 } },
            sopla: { reloj: 't', canales: { bDx: -1.8, bDz: 0.5, bIx: -1.8, bIz: -0.5, cx: osc(0.25, seno(0.03, 6)) } },
            // Saltitos: dos botes en 1.5 s; el reloj del tramo es su inicio, así no depende de dónde empieza
            salta: { reloj: 't', canales: { bDx: -0.15, bDz: 0.1, bIx: -0.15, bIz: -0.1, salto: osc(0, { forma: 'abs', amp: 0.28, frec: 2 * Math.PI / 1.5 }) } },
            botas: { reloj: 'u', canales: { pDx: clave([[0, 0], [0.3, -1.3], [0.47, -1.0], [0.6, -1.0], [1, 0]]), bDx: -0.3, bDz: 0.2, bIx: -0.3, bIz: -0.2, rz: clave([[0, 0], [0.3, -0.08], [0.6, -0.08], [1, 0]]), cx: 0.05 } }
        },
        opciones: { salta: tr => ({ reloj: tr[1] }) },
        sonidos: L => [[L.a[2] + 2.4, 'golpe']].map(([t, n]) => [Math.round(t * 100) / 100, n])
    },
    andy: {
        gestos: {
            // Baile de victoria desfasado: brazos a destiempo y el cuerpo se ladea de más
            baileMal: { reloj: 't', canales: { bDx: osc(-2.2, seno(0.5, 7)), bDz: 0.2, bIx: osc(-1.4, seno(0.6, 5.3, 1)), bIz: -0.3, rz: osc(0, seno(0.12, 3)), cx: -0.1, cy: osc(0, seno(0.2, 2.1)) } }
        },
        sonidos: L => [[L.a[3] + 0.5, 'bajo']]
    },
    braulio: {
        gestos: {
            toma: { reloj: 't', canales: { bDx: -1.05, bDz: 0.5, cx: 0.05 } },
            cuenta: { reloj: 't', canales: { bDx: -1.05, bDz: 0.5, bIx: osc(-1.6, seno(0.1, 9)), bIz: 0.3, cx: 0.05 } },
            asombra: { reloj: 't', canales: { bDx: -1.05, bDz: 0.5, bIx: -2.4, bIz: 0.3, cx: -0.35 } },
            // Palmada: sube la mano, la baja de golpe y choca al centro en u = 0.47
            palma: { reloj: 'u', canales: { bDx: clave([[0, -1.05], [0.3, -1.55], [0.47, -1.05], [0.6, -1.05], [1, -0.3]]), bDz: clave([[0, 0.5], [0.3, 0.4], [0.47, 0.5], [0.6, 0.5], [1, 0.2]]), cx: 0.05 } }
        }
    },
    moises: {
        gestos: {
            tiembla: { reloj: 't', canales: { cz: osc(0, seno(0.05, 23)), rz: osc(0, seno(0.03, 31)), cx: 0.15, bDz: 0.05, bIz: -0.05 } },
            // Frota los hombros del otro (el molde `frota` de 6c) con un paso adelante para llegar a ~0.9 de Venjy
            frotaJ: { reloj: 't', canales: { bDx: osc(-1.5, seno(0.09, 12)), bDz: 0.3, bIx: osc(-1.5, seno(-0.09, 12)), bIz: -0.3, cx: 0.1, inc: 0.08, pz: 0.4 } }
        },
        // punoM = desplazar('puno', H - 1.45), con H = el choque de puños (golpes[0])
        puno: { punoM: g => ({ reloj: r10(g.golpes[0] - 1.45) }) }
    }
};
export const BIENVENIDAS = Object.keys(TABLA);

// Tramo del JS -> tramo del JSON
function tramo(k, cfg, g, tr) {
    const [nombre, a, b] = tr;
    const t0 = r10(a), t1 = r10(b);
    if (nombre === 'secretoB') return ['secreto', t0, t1, { reloj: r10(a - 0.4) }];
    if (nombre === 'abrazoB') return ['abrazo', t0, t1, { reloj: r10(a - 0.4), escala: { pz: 1.7 } }];
    if (cfg.puno && cfg.puno[nombre]) return ['puno', t0, t1, cfg.puno[nombre](g)];
    if (cfg.gestos[nombre]) {
        const op = cfg.opciones && cfg.opciones[nombre];
        return [`${k}-${nombre}`, t0, t1, ...(op ? [op([nombre, t0, t1])] : [])];
    }
    return [nombre, t0, t1];
}

// Guion de bienvenida del módulo -> { escena, gestos }
export function escenaDeBienvenida(k, mod) {
    const cfg = TABLA[k];
    const g = mod.bienvenida({ idioma: 'es' });
    const L = { a: mod.LINEAS.map(l => l.a), d: mod.LINEAS.map(l => l.d) };
    const escena = {
        tipo: 'guion',
        dispara: { tipo: 'bienvenida', skin: k },
        T: g.T,
        r: g.r,
        lineas: g.lineas.map(l => ({ q: l.q, a: l.a, texto: l.texto })),
        pista: Object.fromEntries(Object.entries(g.pista).map(([q, tr]) => [q, tr.map(x => tramo(k, cfg, g, x))])),
        ...(g.golpes ? { golpes: g.golpes } : {}),
        ...(g.corazones ? { corazones: g.corazones } : {}),
        ...(cfg.sonidos ? { sonidos: cfg.sonidos(L).map(([t, n]) => [r10(t), n]) } : {})
    };
    return { escena, gestos: Object.fromEntries(Object.entries(cfg.gestos).map(([n, d]) => [`${k}-${n}`, d])) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    globalThis.window ??= { addEventListener() {} };
    const aviso = console.warn;
    console.warn = (...m) => { if (!String(m[0]).startsWith('[datos]')) aviso(...m); };
    const escenas = JSON.parse(fs.readFileSync(path.join(DATOS, 'escenas.json'), 'utf8'));
    const poses = JSON.parse(fs.readFileSync(path.join(DATOS, 'poses.json'), 'utf8'));
    let nuevas = 0, ya = 0, gnuevos = 0;
    for (const k of BIENVENIDAS) {
        const nombre = 'bienvenida-' + k;
        if (escenas.escenas[nombre]) { ya++; continue; }
        const { escena, gestos } = escenaDeBienvenida(k, await import(`../mundo/supervivencia/bienvenidas/${k}.js`));
        escenas.escenas[nombre] = escena;
        for (const [n, d] of Object.entries(gestos)) if (!poses.gestos[n]) { poses.gestos[n] = d; gnuevos++; }
        nuevas++;
    }
    console.warn = aviso;
    if (process.argv.includes('--escribir')) {
        fs.writeFileSync(path.join(DATOS, 'escenas.json'), formatear(escenas));
        fs.writeFileSync(path.join(DATOS, 'poses.json'), formatear(poses));
        console.log(`escenas.json: ${nuevas} bienvenidas añadidas (${ya} ya estaban) · poses.json: ${gnuevos} gestos`);
    } else console.log(`${nuevas} bienvenidas por añadir (${ya} ya estaban), ${gnuevos} gestos; --escribir para guardar`);
}
