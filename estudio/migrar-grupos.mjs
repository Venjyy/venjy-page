// =========================================================
// VENJY · Estudio · B4d: escenas de grupo de grupos/*.js a mundo/datos/escenas.json (y sus gestos a poses.json)
// node estudio/migrar-grupos.mjs [--escribir]      (sin --escribir solo cuenta qué haría)
// Corre grupo(base) de cada módulo y guarda el guion ya calculado como escena «guion» `grupo-<grupo>-<skin>` con
// dispara { tipo: 'grupo', grupo, skin } (estudio/DISENO.md §40, decisiones 2, 7 y 8). Los gestos nuevos de comun.js
// (GESTOS_GRUPO) van a poses.json como `grupo-<nombre>`; `centro` y `colocar` pasan a `lugar`; celulares, tomates, concha, el
// tomate gigante, las chispas y los sonidos, al catálogo (objetos, efectos y sonidos); el paseo de Braulio, a `caminos` y `giros`.
// Hecho: Tomatitos (7 escenas) y Coyhaique (3; la cámara manual y la bola de nieve van a `codigo`: grupo-coyhaique). Falta la
// atalaya: su centro se mide entre cuatro puntos (uno es el Venjy del mirador, que no está en datos) y pide una pieza nueva.
// Solo añade claves: lo que ya existe no se toca. Los textos no llevan `revisado`.
// Prueba: node mundo/tests/escenas-grupos.mjs (paridad con el JS).
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatear } from './formato.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const DATOS = path.join(aqui, '..', 'mundo', 'datos');
const r10 = x => Math.round(x * 1e10) / 1e10;
const r2 = x => Math.round(x * 100) / 100;
const seno = (amp, frec, fase) => ({ forma: 'sin', amp, frec, ...(fase !== undefined ? { fase } : {}) });
const osc = (base, ...o) => ({ base, osc: o });
const K = (k, interp) => ({ k, ...(interp ? { interp } : {}) });

// Los gestos de GESTOS_GRUPO (grupos/comun.js) que usan los Tomatitos, en formato de poses.json (reloj = segundos de la escena)
export const GESTOS_GRUPO = {
    camina: { reloj: 't', canales: { pDx: osc(0, seno(0.55, 9)), pIx: osc(0, seno(-0.55, 9)), bDx: osc(0, seno(-0.4, 9)), bIx: osc(0, seno(0.4, 9)), bDz: 0.08, bIz: -0.08, y: osc(0, { forma: 'abs', amp: 0.04, frec: 9 }) } },
    alto: { reloj: 't', canales: { bDx: osc(-2.55, seno(0.05, 4)), bDz: 0.12, bIx: -0.2, cx: -0.18 } },
    altoI: { reloj: 't', canales: { bIx: osc(-2.3, seno(0.05, 4)), bIz: -0.25, bDx: -0.3, cx: -0.12 } },
    baja: { reloj: 'u', canales: { bDx: K([[0, -2.55], [0.4, -1.3], [1, -1.3]]), bDz: 0.2, cx: 0.3, inc: 0.08 } },
    salta: { reloj: 't', canales: { bDx: -2.85, bDz: -0.1, bIx: -0.4, cx: -0.35, salto: osc(0, { forma: 'abs', amp: 0.5, frec: 6.5 }) } },
    reparte: { reloj: 't', canales: { bDx: -1.35, bDz: osc(0, seno(0.4, 3)), bIx: -0.9, bIz: -0.3, cx: 0.15 } },
    oreja: { reloj: 't', canales: { bDx: -2.0, bDz: 0.2, cx: -0.05, inc: 0.05 } },
    escucha: { reloj: 't', canales: { cz: 0.18, cx: 0.12, cy: osc(0, seno(0.1, 1.5)), bIx: -0.3 } },
    tapaOidos: { reloj: 't', canales: { bDx: -2.5, bDz: 0.6, bIx: -2.5, bIz: -0.6, cx: 0.2, rz: osc(0, seno(0.05, 8)) } },
    // Doblado de risa: cintura con las piernas rectas (apoya) y temblor de carcajada
    doblaRisa: { reloj: 't', apoya: true, canales: { inc: osc(0.35, seno(0.04, 15)), bDx: osc(-0.9, seno(0.1, 15)), bDz: 0.3, bIx: osc(-0.9, seno(-0.1, 15)), bIz: -0.3, cx: 0.3 } },
    // Camina con el pico al hombro (el Venjy de la mina llega por el túnel)
    caminaPico: { reloj: 't', canales: { pDx: osc(0, seno(0.55, 9)), pIx: osc(0, seno(-0.55, 9)), bDx: -2.6, bDz: 0.35, bIx: osc(0, seno(0.4, 9)), bIz: -0.08, y: osc(0, { forma: 'abs', amp: 0.04, frec: 9 }) } },
    mira: { reloj: 't', canales: {} }
};
const nombreGesto = n => (GESTOS_GRUPO[n] ? `grupo-${n}` : n);

// Tiempos que el JS no devuelve (ding, tomates, tomás, tomate gigante, mar, choque): se barre grupo().extra con un mundo de
// mentira cada milésima y se anota cuándo suena y brilla cada cosa. Todos salen de r2(), así que redondear a 0,01 es exacto.
async function tiemposDe(g, SONIDOS) {
    const sucesos = [];
    let t = 0;
    const orig = {};
    for (const k of ['mensaje', 'visto', 'mar']) { orig[k] = SONIDOS[k]; SONIDOS[k] = () => sucesos.push({ t, k }); }
    const pos = { x: 1, y: 0, z: 2 };
    const sprite = () => ({ visible: true, material: {}, userData: {}, position: { set() {} }, scale: { set() {} }, add() {} });
    const api = {
        e: { t: 0, T: g.T, hechos: new Set() }, posG: () => pos, actor: () => ({ p: {} }), origen: () => pos, mover() {}, girar() {}, camara() {},
        pegar: o => o, caja: sprite, sprite, efecto: (tipo, x, y, z, op = {}) => { sucesos.push({ t, k: 'efecto', tam: op.tam, vida: op.vida }); return sprite(); },
        sonidos: { golpe() { sucesos.push({ t, k: 'golpe' }); } }
    };
    api.e.centro = g.centro(api);
    if (g.extra.iniciar) g.extra.iniciar(api);
    for (let n = 0; n / 1000 < g.T; n++) { t = n / 1000; api.e.t = t; g.extra.cuadro(api); }
    Object.assign(SONIDOS, orig);
    const primero = k => { const s = sucesos.find(x => x.k === k); return s && r2(s.t); };
    const todos = k => sucesos.filter(x => x.k === k).map(x => r2(x.t));
    // Chispas y copos en lotes del mismo instante: [{ t, n, vida }]
    const lotes = [];
    for (const e of sucesos.filter(x => x.k === 'efecto')) { const t2 = r2(e.t), l = lotes.find(x => x.t === t2); if (l) l.n++; else lotes.push({ t: t2, n: 1, vida: e.vida }); }
    return { ding: primero('mensaje'), visto: todos('visto'), mar: primero('mar'), golpes: todos('golpe'), lotes };
}

// Guion de un grupo y una skin -> { escena, gestos }
export async function escenaDeGrupo(nombreGrupo, base, mod, SONIDOS) {
    if (nombreGrupo === 'coyhaique') return coyhaique(base, mod, SONIDOS);
    if (nombreGrupo !== 'tomatitos') throw new Error('B4d: falta ' + nombreGrupo);
    const g = mod.grupo(base);
    const { VARIANTES, COMUN, NPCS } = mod;
    const V = VARIANTES[base];
    const tiempos = await tiemposDe(g, SONIDOS);
    const linea = x => g.lineas.find(l => l.texto.es === x[1].es);
    const c2 = linea(COMUN[1]);
    const todos = [...NPCS, 'j'];
    const tomates = tiempos.visto[0], ding = tiempos.ding;
    const tomas = base === 'conejeros' ? tiempos.visto[1] : null;
    const gigante = base === 'venjy' ? tiempos.golpes[0] : null;
    const choque = tiempos.golpes[tiempos.golpes.length - 1];

    // ---- Objetos: celular de cada uno, y su tomate (Conejeros en la izquierda y se vuelve Tomás; Braulio, una concha) ----
    const objetos = [];
    for (const q of todos) {
        objetos.push({ id: `celular-${q}`, dibujo: 'celular', tam: 0.2, en: { q, hueso: 'brazoD', mas: [0, -0.8, 0.14] }, desde: r10(ding + 0.1), hasta: r10(c2.a + c2.d + 0.1) });
        const conejo = q === 'j' && base === 'conejeros', braulio = q === 'j' && base === 'braulio';
        objetos.push({ id: `${braulio ? 'concha' : 'tomate'}-${q}`, dibujo: braulio ? 'concha' : 'tomate', tam: braulio ? 0.3 : 0.34, en: { q, hueso: conejo ? 'brazoI' : 'brazoD', mas: [0, -0.86, 0.14] }, desde: tomates,
            ...(conejo ? { cambia: [[tomas, 'tomas']] } : {}) });
    }
    if (gigante !== null) {
        objetos.push({ id: 'tomate-gigante', dibujo: { caja: [0.95, 0.95, 0.95], pix: 'tomate-bloque' }, en: { desde: 'centro', mas: [0, 0.5, 0] }, desde: gigante });
        objetos.push({ id: 'tomate-gigante-hojas', dibujo: { caja: [0.7, 0.1, 0.7], pix: 'hojas' }, en: { desde: 'centro', mas: [0, 1.02, 0] }, desde: gigante });
    }

    // ---- Efectos y sonidos ----
    const efectos = [
        ...todos.map(q => [tomates, 'chispa', { en: q, alto: 1.6, tam: 0.22 }]),
        ...(tomas !== null ? [[tomas, 'chispa', { en: 'j', alto: 2.2 }]] : []),
        ...(gigante !== null ? [[gigante, 'chispa', { en: 'centro', alto: 1.2, tam: 0.5 }]] : []),
        ...[0, 1, 2].map(i => [choque, 'chispa', { en: 'centro', alto: r10(2.5 + i * 0.1), mas: [r10((i - 1) * 0.35), 0, 0], tam: 0.32 }])
    ];
    const sonidos = [[ding, 'mensaje'], [tomates, 'visto'], ...(tomas !== null ? [[tomas, 'visto']] : []), ...(gigante !== null ? [[gigante, 'golpe']] : []),
        ...(tiempos.mar !== undefined ? [[tiempos.mar, 'mar']] : []), [choque, 'golpe']].sort((a, b) => a[0] - b[0]);

    // ---- Braulio le acerca la concha a Nacho al oído: va, se queda y vuelve a su sitio ----
    let caminos = null, giros = null;
    if (base === 'braulio') {
        const b1 = linea(V.brindis[0]), b2 = linea(V.brindis[1]);
        const ida = r2(b1.a - 0.3), llega = r2(b1.a + 0.9), vuelta = r2(b2.a + b2.d - 0.2), fin = r2(b2.a + b2.d + 1.0);
        const junto = { hacia: 'nacho', dist: 1 };
        caminos = { j: [[ida, 'sitio'], [llega, junto], [vuelta, junto], [fin, 'sitio']] };
        giros = { j: [[ida, 'nacho'], [vuelta, null]] };
    }

    const pista = Object.fromEntries(Object.entries(g.pista).map(([q, tr]) => [q, tr.map(([n, a, b]) => [nombreGesto(n), r10(a), r10(b)])]));
    const escena = {
        tipo: 'guion',
        dispara: { tipo: 'grupo', grupo: nombreGrupo, skin: base },
        T: g.T,
        r: g.r,
        // Tu skin es de uno de ellos: su NPC es otro actor, no tu clon (si no, repartoDe lo cambiaría por 'j')
        ...(NPCS.includes(base) ? { actores: { [base]: base } } : {}),
        lineas: g.lineas.map(l => ({ q: l.q, a: l.a, d: l.d, texto: l.texto })),
        pista,
        lugar: { centro: { desde: 'hadad', mas: [2.65, 0, -0.5] }, jugador: { desde: 'centro', mas: [0, 0, -2.15] } },
        ...(caminos ? { caminos, giros } : {}),
        objetos,
        efectos,
        sonidos
    };
    const usados = new Set(Object.values(pista).flat().map(x => x[0]));
    const gestos = Object.fromEntries(Object.entries(GESTOS_GRUPO).filter(([n]) => usados.has(`grupo-${n}`)).map(([n, d]) => [`grupo-${n}`, d]));
    return { escena, gestos };
}

// ---- Coyhaique: Moisés es el ancla (el iglú se mide desde su asiento), Lalo actor extra y 'v' el Venjy de la mina ----
async function coyhaique(base, mod, SONIDOS) {
    const g = mod.grupo(base);
    const { NPCS, VENJY } = mod;
    const { lotes } = await tiemposDe(g, SONIDOS);
    const caminaPico = g.pista.v.find(x => x[0] === 'caminaPico');
    const entra = caminaPico[1];
    const llega = lotes.find(l => l.n === 8).t;
    const golpes = lotes.filter(l => l.n === 6).map(l => l.t); // el copo de las dos bolas: tiro + VUELO (0,5)
    const tiro = golpes.map(t => r2(t - 0.5));
    // Moisés se para un paso al norte y el Venjy entra por el túnel (todo medido desde el asiento de Moisés); al final los
    // dos vuelven a su sitio en un instante (lo que hacía el motor al terminar la escena)
    const desde = mas => ({ desde: 'moises', mas });
    const cola = [[r10(g.T - 0.1), 0], [r10(g.T - 0.05), 'sitio']];
    const moises = desde([-0.1, 0, -1.3]);
    const dentro = desde([1.2, 0, -1.9]);
    const caminos = {
        moises: [[0, moises], [cola[0][0], moises], cola[1]],
        v: [[entra, desde([1.1, 0, 6.6])], [llega, dentro], [cola[0][0], dentro], cola[1]]
    };
    const copos = (t, q, alto, n, mas0, vida, tam, vy) => Array.from({ length: n }, (_, i) => [t, 'copo', { en: q, alto: r10(alto(i)), mas: mas0(i).map(r10), tam, vida, vy }]);
    const efectos = [
        ...copos(llega, 'v', i => 1.2 + (i % 3) * 0.3, 8, i => [Math.sin(i * 2.1) * 0.35, 0, Math.cos(i * 2.1) * 0.35], 0.9, 0.14, -0.9),
        ...copos(golpes[0], 'j', () => 1.8, 6, i => [Math.sin(i) * 0.25, 0, Math.cos(i * 1.7) * 0.25], 0.7, 0.16, -0.6),
        ...copos(golpes[1], 'lalo', () => 2.1, 6, i => [Math.sin(i) * 0.25, 0, Math.cos(i * 1.7) * 0.25], 0.7, 0.16, -0.6)
    ];
    const pista = Object.fromEntries(Object.entries(g.pista).map(([q, tr]) => [q, tr.map(([n, a, b]) => [nombreGesto(n), r10(a), r10(b)])]));
    const escena = {
        tipo: 'guion',
        dispara: { tipo: 'grupo', grupo: 'coyhaique', skin: base },
        T: g.T,
        r: g.r,
        // El Venjy de la mina es otro actor; si tu skin es de uno de los dos, su NPC no es tu clon
        actores: { v: VENJY, ...(NPCS.includes(base) ? { [base]: base } : {}) },
        lineas: g.lineas.map(l => ({ q: l.q, a: l.a, d: l.d, texto: l.texto })),
        pista,
        lugar: { centro: desde([0.6, 0, 0.9]), jugador: desde([-1.1, 0, -0.8]) },
        caminos,
        efectos,
        sonidos: golpes.map(t => [t, 'bolaNieve']),
        marcas: { llega, tiro1: tiro[0], tiro2: tiro[1] },
        codigo: 'grupo-coyhaique'
    };
    const usados = new Set(Object.values(pista).flat().map(x => x[0]));
    const gestos = Object.fromEntries(Object.entries(GESTOS_GRUPO).filter(([n]) => usados.has(`grupo-${n}`)).map(([n, d]) => [`grupo-${n}`, d]));
    return { escena, gestos };
}

export const GRUPOS_MIGRADOS = [{ grupo: 'tomatitos', skins: ['venjy', 'pony', 'hadad', 'andy', 'nacho', 'braulio', 'conejeros'] }, { grupo: 'coyhaique', skins: ['venjy', 'lalo', 'moises'] }];
export const nombreEscena = (grupo, skin) => `grupo-${grupo}-${skin}`;

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    globalThis.window ??= { addEventListener() {} };
    const aviso = console.warn;
    console.warn = (...m) => { if (!String(m[0]).startsWith('[datos]')) aviso(...m); };
    const { SONIDOS } = await import('../mundo/supervivencia/moldes.js');
    const escenas = JSON.parse(fs.readFileSync(path.join(DATOS, 'escenas.json'), 'utf8'));
    const poses = JSON.parse(fs.readFileSync(path.join(DATOS, 'poses.json'), 'utf8'));
    let nuevas = 0, ya = 0, gnuevos = 0;
    for (const { grupo, skins } of GRUPOS_MIGRADOS) {
        const mod = await import(`../mundo/supervivencia/grupos/${grupo}.js`);
        for (const skin of skins) {
            const nombre = nombreEscena(grupo, skin);
            if (escenas.escenas[nombre]) { ya++; continue; }
            const { escena, gestos } = await escenaDeGrupo(grupo, skin, mod, SONIDOS);
            escenas.escenas[nombre] = escena;
            for (const [n, d] of Object.entries(gestos)) if (!poses.gestos[n]) { poses.gestos[n] = d; gnuevos++; }
            nuevas++;
        }
    }
    console.warn = aviso;
    if (process.argv.includes('--escribir')) {
        fs.writeFileSync(path.join(DATOS, 'escenas.json'), formatear(escenas));
        fs.writeFileSync(path.join(DATOS, 'poses.json'), formatear(poses));
        console.log(`escenas.json: ${nuevas} escenas de grupo añadidas (${ya} ya estaban) · poses.json: ${gnuevos} gestos`);
    } else console.log(`${nuevas} escenas de grupo por añadir (${ya} ya estaban), ${gnuevos} gestos; --escribir para guardar`);
}
