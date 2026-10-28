// =========================================================
// VENJY · Estudio · B4b: bienvenidas de bienvenidas/*.js a mundo/datos/escenas.json (y sus gestos a poses.json)
// node estudio/migrar-bienvenidas.mjs [--escribir]      (sin --escribir solo cuenta qué haría)
// Corre bienvenida() de cada módulo de TABLA y guarda el guion ya calculado como escena «guion» `bienvenida-<clave>` con
// dispara { tipo: 'bienvenida', skin: <clave> } (estudio/DISENO.md §40, decisión 3). secretoB, abrazoB, parejaB y punoM pasan
// a opciones del tramo (reloj, escala) y los gestos propios a poses.json con el nombre de la escena delante (`lalo-botas`).
// Solo añade claves: lo que ya existe no se toca. Los textos no llevan `revisado`.
// Migradas las 12. Las 8 últimas usan las piezas de DISENO §40, decisiones 13 a 19 (extiende, en/pot de los osciladores,
// apoya, yaw relativo, efectos de PIX, caja con PIX y sonido con nota). L (abajo) da a(i), d(i) y f(i) = fin de la frase i.
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
const clave = (k, interp) => ({ k, ...(interp ? { interp } : {}) });
const PI = Math.PI;
// Saltito que sube y baja una vez dentro del tramo: max(0, amp · sen(π·u))
const saltito = amp => osc(0, { forma: 'pos', amp, frec: PI, en: 'u' });
// Mano en la frente mirando lejos de un lado a otro (Boris y Pony)
const busca = { reloj: 't', canales: { bDx: -2.35, bDz: 0.8, bIx: -0.1, cy: osc(0, seno(0.7, 1.6)), cx: -0.2 } };

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
    },
    boris: {
        gestos: {
            busca,
            // maneja (o ventana en espejo) con un saltito en el bache
            manejaB: { reloj: 'u', extiende: { gesto: 'maneja' }, canales: { salto: saltito(0.3) } },
            ventanaB: { reloj: 'u', extiende: { gesto: 'ventana', espejo: true }, canales: { salto: saltito(0.3) } }
        },
        // Venjy de copiloto: el brazo derecho afuera (ventana en espejo)
        cambia: { copiloto: () => ['ventana', { espejo: true }] },
        // En el auto miran los dos adelante (±π/2 con rampas de 0,9 s al subir y 0,7 s al bajar)
        yaw: L => {
            const k = s => clave([[L.a(1), 0], [L.a(1) + 0.9, s * PI / 2], [L.a(3) - 0.2, s * PI / 2], [L.a(3) + 0.5, 0]].map(([t, v]) => [r10(t), v]));
            return { n: k(-1), j: k(1) };
        },
        sonidos: L => [[Math.round((L.a(2) + 0.3) * 100) / 100, 'golpe']]
    },
    conejeros: {
        gestos: {
            // orejitas con un paso hacia Venjy (pz sube y baja en el tramo)
            orejitasJ: { reloj: 'u', extiende: { gesto: 'orejitas' }, canales: { pz: osc(0, { forma: 'sin', amp: 0.4, frec: PI, en: 'u' }) } }
        },
        objetos: L => [
            { id: 'celular', dibujo: { caja: [0.22, 0.3, 0.04], pix: 'celular' }, en: { q: 'n', hueso: 'brazoD', mas: [0, -0.7, 0.12] }, desde: L.f(0) + 0.1, hasta: L.f(2) + 0.4 },
            { id: 'oreja-i', dibujo: { caja: [0.1, 0.34, 0.06], color: '#f4eded' }, en: { q: 'n', hueso: 'cabeza', mas: [-0.14, 0.42, 0] }, desde: L.a(1) + 1.4 },
            { id: 'oreja-d', dibujo: { caja: [0.1, 0.34, 0.06], color: '#f4eded' }, en: { q: 'n', hueso: 'cabeza', mas: [0.14, 0.42, 0] }, desde: L.a(1) + 1.4 }
        ],
        // FL = flash de la foto, justo después de «Sonríe»
        efectos: L => [[L.f(1) + 0.1, 'flash', { en: 'n', alto: 1.6, mas: [0, 0, 0.3], tam: 0.9, vida: 0.35 }]],
        sonidos: L => [[L.f(1) + 0.1, 'foto']]
    },
    hadad: {
        gestos: {
            recibe: { reloj: 't', canales: { bIx: -1.35, bIz: -0.1, cx: 0.1 } },
            pulgar: { reloj: 't', canales: { bIx: osc(-1.6, seno(0.04, 6)), bIz: -0.2, bDx: -0.5, bDz: 0.35, cy: 0.2 } }
        },
        // P = el pase de la bolsa de papas (frase 3 + 0,6)
        objetos: L => {
            const P = L.a(2) + 0.6, bolsa = { caja: [0.32, 0.42, 0.12], pix: 'bolsa' };
            return [
                { id: 'bolsa-venjy', dibujo: bolsa, en: { q: 'n', hueso: 'brazoD', mas: [0, -0.7, 0.12] }, desde: P - 0.6, hasta: P + 0.3 },
                { id: 'bolsa-tuya', dibujo: bolsa, en: { q: 'j', hueso: 'brazoI', mas: [0, -0.7, 0.12] }, desde: P + 0.3 }
            ];
        },
        efectos: L => [[L.a(2) + 1.6, 'visto', { en: 'j', alto: 1.9, mas: [0.5, 0, 0], tam: 0.3, vida: 1 }]],
        sonidos: L => [[L.a(2) + 1.6, 'visto']]
    },
    lona: {
        gestos: {
            // Tomados de la mano: la derecha de cada uno llega a la de la otra persona (r 0.9)
            ofrece: { reloj: 'u', canales: { bDx: clave([[0, -0.4], [1, -0.75]]), bDz: 0.15, cx: 0.05 } },
            toma: { reloj: 'u', canales: { bDx: clave([[0, -0.4], [1, -0.75]]), bDz: 0.15, cx: 0.05 } },
            mece: { reloj: 't', canales: { bDx: osc(-0.75, seno(0.05, 2.2)), bDz: osc(0.15, seno(0.05, 1.1)), cx: 0.05, rz: osc(0, seno(0.05, 1.1)) } }
        },
        // Paso de baile: ±0,25 rad, una vuelta de seno entre 8,9 y 14,3, en fase para los dos
        yaw: () => { const g = osc(0, { forma: 'sin', amp: 0.25, frec: 1, en: clave([[8.9, 0], [14.3, 2 * PI]], 'lineal') }); return { n: g, j: g }; }
    },
    lucho: {
        gestos: {},
        // Venjy dibuja el árbol en el aire (un trazo cada 0,2 s en la punta del dedo) y tú lo borras (se encogen)
        efectos: () => [[3.4, 'trazo', { en: { q: 'n', mano: 'D' }, tam: 0.55, cada: 0.2, hasta: 8.4, encoge: [8.8, 10.9] }]]
    },
    nacho: {
        gestos: {
            // Doblado de risa: cintura con las piernas rectas (apoya) y temblor de la carcajada
            doblaRisa: { reloj: 't', apoya: true, canales: { inc: osc(0.35, seno(0.04, 15)), bDx: osc(-0.9, seno(0.1, 15)), bDz: 0.3, bIx: osc(-0.9, seno(-0.1, 15)), bIz: -0.3, cx: 0.3 } },
            seca: { reloj: 't', canales: { bDx: osc(-2.1, seno(0.08, 10)), bDz: 0.45, bIx: -0.2, cx: 0.1 } }
        },
        efectos: L => ['n', 'j'].map(q => [L.f(3) + 0.3, 'gota', { en: q, alto: 1.6, mas: [0.2, 0, 0], tam: 0.22, vida: 0.9, vy: -0.4 }])
    },
    pony: {
        gestos: {
            busca,
            miraAbajo: { reloj: 't', canales: { cx: 0.45, cy: osc(0, seno(0.05, 2)), bDx: -0.3, bDz: 0.2 } },
            // Se inclina (apoya) y estira el puño de 6b más largo mientras se agacha (choque en 7,4)
            punoBajo: {
                reloj: 't', apoya: true,
                extiende: { gesto: 'puno', reloj: r10(7.4 - 1.45), por: { bDx: clave([[5.6, 1], [6.2, 1.34], [8.0, 1.34], [8.4, 1]]) } },
                canales: { inc: clave([[5.6, 0], [6.2, 0.25], [8.0, 0.25], [8.4, 0]]), cx: clave([[5.6, 0.1], [6.2, 0.4], [8.0, 0.4], [8.4, 0.1]]) }
            },
            // Empujoncito con paso largo: la media onda avanza con la curva (llega al hombro y vuelve)
            empujonLargo: (() => {
                const o = amp => ({ forma: 'sin', amp, frec: PI, en: clave([[0, 0], [0.2, 0], [0.55, 1], [1, 1]]) });
                return { reloj: 'u', canales: { bDx: osc(-0.4, o(-1.15)), bDz: 0.2, inc: osc(0, o(0.14)), pz: osc(0, o(0.5)), cx: 0.05 } };
            })()
        },
        puno: { punoJ: () => ({ reloj: r10(7.4 - 1.45) }) },
        sonidos: () => [[9.1, 'golpe']]
    },
    salonas: {
        gestos: {
            // Cabeceo al ritmo del bajo: |sen|³ (seco arriba, lento abajo)
            cabecea: { reloj: 't', canales: { cx: osc(0.05, { forma: 'abs', amp: 0.4, frec: 2 * PI, pot: 3 }), bIx: -1.05, bIz: -0.55, bDx: osc(-0.6, { forma: 'abs', amp: -0.4, frec: 2 * PI, pot: 3 }), bDz: 0.3 } },
            bajoJ: { reloj: 't', canales: { bIx: -0.25, bIz: 0.75, bDx: osc(-0.45, seno(0.12, 16)), bDz: 0.1, cx: 0.1 } }
        },
        // «enter»: visto bueno sobre los dos; luego 6 notas del bajo de aire cada 0,4 s
        efectos: () => [[8.9, 'visto', { alto: 2.3, tam: 0.5, vida: 1.6, vy: 0.2 }]],
        sonidos: () => [[8.9, 'visto'], ...[0, 1, 2, 3, 4, 5].map(k => [9.2 + k * 0.4, 'bajo', { nota: k }])]
    }
};
export const BIENVENIDAS = Object.keys(TABLA);

// Tramo del JS -> tramo del JSON
function tramo(k, cfg, g, tr) {
    const [nombre, a, b] = tr;
    const t0 = r10(a), t1 = r10(b);
    if (nombre === 'secretoB') return ['secreto', t0, t1, { reloj: r10(a - 0.4) }];
    if (nombre === 'abrazoB') return ['abrazo', t0, t1, { reloj: r10(a - 0.4), escala: { pz: 1.7 } }];
    if (nombre === 'parejaB') return ['pareja', t0, t1, { reloj: r10(a - 0.4) }];
    if (cfg.cambia && cfg.cambia[nombre]) { const [g2, op] = cfg.cambia[nombre](g); return [g2, t0, t1, ...(op ? [op] : [])]; }
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
    // L.a y L.d: listas (como las usan lalo y andy) que también sirven como funciones a(i), d(i); f(i) = fin de la frase i
    const A = mod.LINEAS.map(l => l.a), D = mod.LINEAS.map(l => l.d);
    const L = { a: Object.assign(i => A[i], A), d: Object.assign(i => D[i], D), f: i => A[i] + D[i] };
    const tiempos = o => ({ ...o, ...(o.desde !== undefined ? { desde: r10(o.desde) } : {}), ...(o.hasta !== undefined ? { hasta: r10(o.hasta) } : {}) });
    const escena = {
        tipo: 'guion',
        dispara: { tipo: 'bienvenida', skin: k },
        T: g.T,
        r: g.r,
        lineas: g.lineas.map(l => ({ q: l.q, a: l.a, texto: l.texto })),
        pista: Object.fromEntries(Object.entries(g.pista).map(([q, tr]) => [q, tr.map(x => tramo(k, cfg, g, x))])),
        ...(g.golpes ? { golpes: g.golpes } : {}),
        ...(g.corazones ? { corazones: g.corazones } : {}),
        ...(cfg.sonidos ? { sonidos: cfg.sonidos(L).map(([t, ...x]) => [r10(t), ...x]) } : {}),
        ...(cfg.efectos ? { efectos: cfg.efectos(L).map(([t, ...x]) => [r10(t), ...x]) } : {}),
        ...(cfg.objetos ? { objetos: cfg.objetos(L).map(tiempos) } : {}),
        ...(cfg.yaw ? { yaw: cfg.yaw(L) } : {})
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
