// Prueba de las facilidades de misión (7d-2): node mundo/tests/facilidades.mjs
// Tabla de facilidades contra las misiones; pesca con multiplicadores; monstruo garantizado por noche (una vez
// por noche, reintentos, guardado); pistas contra el subsuelo REAL (llenarSubsuelo) y contra el mapa real;
// huerto, grava y horno en el mapa real; corrales extra de animales.
import { B } from '../texturas.js';
import { O } from '../supervivencia/objetos.js';
import { MISIONES } from '../supervivencia/misiones-datos.js';
import {
    FACILIDADES, facilidadDe, RADIO_PISTA, PESOS_PESCA, PESO_TESORO, botinPesca, probsPesca, rumbo8, textoPista, TXT, buscarArena,
    crearGarantia, REINTENTO_S, elegirSitio, HUERTO, GRAVA, planoHuerto, planoGrava, planoHorno
} from '../supervivencia/facilidades-datos.js';
import { buscarSubsuelo, llenarSubsuelo } from '../supervivencia/subsuelo.js';
import { levantarGatera } from '../portafolio/bloques.js';
import { generarDatos } from '../mundo-datos.js';
import * as V from '../voxeles.js';
// animales.js trae cuerpo.js, que escucha eventos de `window`: basta un objeto mínimo
globalThis.window ??= { addEventListener() {} };
const { CORRALES_EXTRA, sitiosExtra } = await import('../criaturas/animales.js');

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };
const MOBS = new Set(['zombi', 'esqueleto', 'arana', 'creeper', 'trauco']);

// ---------- 1 · la tabla ----------
const noJefes = MISIONES.map(m => m.id);
ok(Object.keys(FACILIDADES).every(k => noJefes.includes(k)), 'FACILIDADES con una misión que no existe');
const ESPERADAS = {
    pesca: ['pony2'], pista: ['salonas2', 'salonas3', 'hadad3', 'nacho2', 'moises2', 'moises3', 'boris3', 'braulio3'],
    noche: ['hadad2', 'andy3', 'lalo3', 'lucho1', 'lucho3', 'braulio1'], marcas: ['braulio2']
};
for (const [tipo, ids] of Object.entries(ESPERADAS)) {
    const reales = Object.keys(FACILIDADES).filter(k => FACILIDADES[k][tipo]);
    ok(JSON.stringify(reales.sort()) === JSON.stringify([...ids].sort()), `${tipo}: ${reales} ≠ tabla de 7d ${ids}`);
}
for (const m of MISIONES) {
    const f = facilidadDe(m.id);
    if (f && f.noche) {
        ok(MOBS.has(f.noche.mob), `${m.id}: monstruo desconocido ${f.noche.mob}`);
        if (m.tipo === 'matar') ok(m.mob === f.noche.mob, `${m.id}: el monstruo garantizado (${f.noche.mob}) no es el que pide la misión (${m.mob})`);
        else ok(m.id === 'braulio1' && f.noche.mob === 'esqueleto' && m.pide.some(([p]) => p === O.HUESO), `${m.id}: noche garantizada en una misión que ni mata ni pide lo que suelta el monstruo`);
    }
    if (f && f.pista) {
        ok(f.pista.arena || f.pista.id, `${m.id}: pista sin objetivo`);
        ok(f.pista.nombre && f.pista.nombre.es && f.pista.nombre.en, `${m.id}: la pista necesita nombre ES/EN`);
    }
}
// conejeros3 («10 monstruos de noche») y andy2 no llevan facilidad de monstruos: la tabla pone «—»
ok(!facilidadDe('conejeros3') && !facilidadDe('andy2'), 'conejeros3 y andy2 no llevan facilidad');

// ---------- 2 · pesca ----------
const base = probsPesca();
ok(Math.abs(base[O.BACALAO] - 0.6) < 1e-9 && Math.abs(base[O.SALMON] - 0.25) < 1e-9 && Math.abs(base[O.PEZ_GLOBO] - 0.13) < 1e-9 && Math.abs(base.tesoro - 0.02) < 1e-9, 'sin misión la pesca es la de siempre');
const m2 = facilidadDe('pony2').pesca, con = probsPesca(m2);
ok(Math.abs(con[O.PEZ_GLOBO] / con[O.BACALAO] - 0.13 * 3 / 0.6) < 1e-9 && Math.abs(con[O.SALMON] / con[O.BACALAO] - 0.25 * 1.5 / 0.6) < 1e-9, 'globo ×3 y salmón ×1,5 respecto del bacalao');
ok(Math.abs(Object.values(con).reduce((a, b) => a + b, 0) - 1) < 1e-9, 'las probabilidades suman 1');
// Barrido del azar: lo que sale coincide con las probabilidades
const N = 200000, cuenta = new Map();
for (let i = 0; i < N; i++) { const id = botinPesca((i + 0.5) / N, m2); cuenta.set(id, (cuenta.get(id) || 0) + 1); }
ok(Math.abs(cuenta.get(O.PEZ_GLOBO) / N - con[O.PEZ_GLOBO]) < 1e-3 && Math.abs((cuenta.get(0) || 0) / N - con.tesoro) < 1e-3, 'el barrido da las probabilidades');
for (let i = 0; i < N; i++) { const id = botinPesca((i + 0.5) / N); cuenta.set('b' + id, (cuenta.get('b' + id) || 0) + 1); }
ok(Math.abs(cuenta.get('b' + O.BACALAO) / N - 0.6) < 1e-3, 'sin multiplicadores sale como antes');
ok(botinPesca(0.9999999) === 0 || PESOS_PESCA.some(([id]) => id === botinPesca(0.9999999)), 'r≈1 sale un resultado válido');

// ---------- 3 · monstruo garantizado ----------
{
    const g = crearGarantia(), def = { mob: 'zombi' };
    ok(g.tocar(1, def, false, 0) === null, 'de día no hay intento');
    ok(g.tocar(1, null, true, 0) === null, 'sin misión de matar no hay intento');
    ok(g.tocar(1, def, true, 0) === def, 'al anochecer toca de inmediato');
    ok(g.tocar(1, def, true, 0) === null && g.tocar(2, def, true, 0) === null, 'espera entre intentos');
    ok(g.tocar(REINTENTO_S, def, true, 0) === def, 'si no apareció, reintenta');
    g.confirmar();
    ok(g.tocar(100, def, true, 0) === null, 'una vez aparecido no hay más esa noche');
    const g2 = crearGarantia(); g2.cargar(JSON.parse(JSON.stringify(g.serializar())));
    ok(g2.tocar(100, def, true, 0) === null, 'tras guardar y cargar no repite la misma noche');
    ok(g2.tocar(100, def, true, 1) === def, 'la noche siguiente vuelve a tocar');
    // Una noche entera de 240 s con un intento fallido cada 4 s: nunca más de 1 aparición confirmada
    const g3 = crearGarantia(); let intentos = 0, aparecidos = 0;
    for (let t = 0; t < 240; t++) { if (g3.tocar(1, def, true, 3)) { intentos++; if (intentos === 3) { g3.confirmar(); aparecidos++; } } }
    ok(intentos === 3 && aparecidos === 1, `intentos de la noche: ${intentos}`);
}

// ---------- 4 · textos ----------
ok(rumbo8(0, -10) === 0 && rumbo8(10, 0) === 2 && rumbo8(0, 10) === 4 && rumbo8(-10, 0) === 6 && rumbo8(10, -10) === 1, 'rumbos: norte es -Z, este es +X');
{
    const pista = { x: 140, y: 31, z: 100 }, nombre = { es: 'hierro', en: 'iron' };
    const es = textoPista(pista, nombre, 100, 100, 'es'), en = textoPista(pista, nombre, 100, 100, 'en');
    ok(es === 'Pista: hierro a 40 m al este (y 31)' && en === 'Hint: iron 40 m to the east (y 31)', `texto de la pista: ${es} / ${en}`);
    ok(textoPista({ nada: true }, nombre, 0, 0, 'es') === TXT.es.sinPista && TXT.en.sinPista, 'sin pista: aviso ES/EN');
    ok(!/[^\x20-\x7eÀ-ÿ·¿¡«»]/.test(es + en + TXT.es.sinPista + TXT.en.sinPista + TXT.es.lugares + TXT.en.lugares), 'sin emojis ni símbolos raros');
    ok(!textoPista({ x: 5, z: 0, arena: true, y: 9 }, nombre, 0, 0, 'es').includes('(y'), 'la arena no lleva y');
}

// ---------- 5 · pistas contra el subsuelo real ----------
{
    const BW = 300, BD = 300, dy = 48;
    const HT = new Uint8Array(BW * BD).fill(30), ES = new Uint8Array(BW * BD);
    const T = { BW, BD, HT, ES, SUP: new Uint8Array(BW * BD), dy };
    const alto = 128;
    // Genera con llenarSubsuelo la ventana de 129×129 alrededor de (cx, cz), con piedra hasta la superficie
    function ventana(cx, cz) {
        const ancho = RADIO_PISTA * 2 + 1, wx0 = cx - RADIO_PISTA, wz0 = cz - RADIO_PISTA, NN = ancho * ancho;
        const vox = new Uint8Array(NN * alto);
        for (let c = 0; c < NN; c++) for (let y = 0; y < HT[0] + dy; y++) vox[y * NN + c] = B.PIEDRA;
        llenarSubsuelo(T, vox, wx0, wz0, ancho);
        return { vox, ancho, wx0, wz0, NN };
    }
    const w = ventana(150, 150), en = (x, y, z) => w.vox[y * w.NN + (z - w.wz0) * w.ancho + (x - w.wx0)];
    const sup = 30 + dy;
    for (const [id, f] of Object.entries(FACILIDADES)) {
        if (!f.pista || f.pista.arena) continue;
        const p = f.pista, r = buscarSubsuelo(T, p, 150, 150, RADIO_PISTA);
        ok(!!r, `${id}: sin pista a ${RADIO_PISTA} bloques del centro del mapa de prueba`);
        if (!r) continue;
        ok(en(r.x, r.y, r.z) === p.id, `${id}: en (${r.x}, ${r.y}, ${r.z}) hay ${en(r.x, r.y, r.z)}, no ${p.id}`);
        ok(r.d <= RADIO_PISTA, `${id}: a ${r.d.toFixed(1)} bloques, más del radio`);
        const y0 = p.y0 ?? 5, y1 = p.y1 ?? 110;
        ok(r.y >= y0 && r.y <= y1, `${id}: y ${r.y} fuera de ${y0}-${y1}`);
        if (p.cerca != null) ok(r.y >= sup - p.cerca, `${id}: carbón a ${sup - r.y} bloques bajo la superficie, más de ${p.cerca}`);
        // Fuerza bruta: nadie más cerca en horizontal con las mismas reglas
        let mejor = Infinity;
        for (let z = 150 - RADIO_PISTA; z <= 150 + RADIO_PISTA; z++) for (let x = 150 - RADIO_PISTA; x <= 150 + RADIO_PISTA; x++) {
            const d = Math.hypot(x - 150, z - 150);
            if (d > RADIO_PISTA || d >= mejor) continue;
            for (let y = y0; y <= y1; y++) {
                if (p.id === B.PIEDRA_LUMINOSA ? y >= sup - 8 || y > 35 : y > sup - 4) break;
                if (p.id === B.PIEDRA_LUMINOSA && y < 12) continue;
                if (p.cerca != null && y < sup - p.cerca) continue;
                if (en(x, y, z) === p.id) { mejor = d; break; }
            }
        }
        ok(Math.abs(mejor - r.d) < 1e-9, `${id}: la búsqueda dio ${r.d.toFixed(2)} y la fuerza bruta ${mejor.toFixed(2)}`);
    }
    // Sin nada cerca: una caja de radio 0 sin esa mena
    ok(buscarSubsuelo(T, { id: B.MENA_ESMERALDA, y0: 100, y1: 101 }, 150, 150, 3) === null, 'sin mena a la vista devuelve null');
    ok(buscarSubsuelo(T, { id: B.PIEDRA }, 150, 150, 8) === null, 'un bloque que no es mena no se busca');
    // Arena
    const SUP = new Uint8Array(BW * BD); SUP[100 * BW + 120] = B.ARENA; SUP[120 * BW + 100] = B.ARENA;
    const a = buscarArena({ ...T, SUP }, 110, 112, 64);
    ok(a && a.x === 100 && a.z === 120 && a.arena, 'arena más cercana');
    ok(buscarArena({ ...T, SUP }, 250, 250, 20) === null, 'sin arena a 20 bloques');
}

// ---------- 6 · el mapa real ----------
{
    const datos = generarDatos('h');
    const terreno = V.prepararTerreno(datos, { supervivencia: true });
    const { BW, HT, dy } = terreno;
    const alturaDe = (x, z) => HT[z * BW + x] + dy;
    const lugar = c => terreno.lugares.find(l => l.clave === c);
    ok(['iglu', 'atalaya', 'campamento'].every(c => lugar(c)) && terreno.gatera && terreno.escenario, 'el mapa trae iglú, atalaya, campamento, gatera y escenario');
    ok(terreno.lugares.length === 6, `braulio2 pide 6 lugares y el mapa trae ${terreno.lugares.length}`);

    // Huerto de Lalo junto al iglú
    const s = elegirSitio(terreno, lugar('iglu'), HUERTO.w, HUERTO.d);
    ok(!!s, 'sitio para el huerto de Lalo junto al iglú');
    ok(JSON.stringify(s) === JSON.stringify(elegirSitio(terreno, lugar('iglu'), HUERTO.w, HUERTO.d)), 'el sitio es determinista');
    if (s) {
        const h = s.h + dy, plano = planoHuerto(s.x0, s.z0, h, alturaDe);
        const celdas = new Map();
        for (const [x, y, z, id] of plano.bloques) celdas.set(`${x},${y},${z}`, id); // el último gana
        const cult = id => [...celdas].filter(([k, v]) => v === id).length;
        const trigo = cult(B.TRIGO_2), zanahoria = cult(B.ZANAHORIA_1), papa = cult(B.PAPA_1);
        ok(trigo >= 12 && zanahoria >= 6 && papa >= 12 + 0, `huerto: ${trigo} trigo, ${zanahoria} zanahoria, ${papa} papa (lalo1 pide 12 trigo; lalo2, 6 y 6)`);
        ok(plano.cultivos.length === trigo + zanahoria + papa, 'cada cultivo se registra para crecer');
        const agua = [...celdas].filter(([, v]) => v === B.AGUA).map(([k]) => k.split(',').map(Number));
        ok(agua.length === 1 && agua[0][1] === h, 'un solo bloque de agua, a la altura de la tierra');
        let regados = 0, secos = 0;
        for (const [k, v] of celdas) {
            if (v !== B.TIERRA_LABRADA_HUMEDA) continue;
            const [x, y, z] = k.split(',').map(Number);
            if (y !== h) secos++;
            else if (Math.abs(x - agua[0][0]) <= 4 && Math.abs(z - agua[0][2]) <= 4) regados++; else secos++;
        }
        ok(regados === HUERTO.w * HUERTO.d - 1 && !secos, `toda la tierra a ≤ 4 bloques del agua (${regados} regadas, ${secos} fuera)`);
        for (const [x, y, z] of plano.cultivos) ok(celdas.get(`${x},${y - 1},${z}`) === B.TIERRA_LABRADA_HUMEDA, `cultivo ${x},${y},${z} sin tierra labrada debajo`);
        // Terreno nivelado: nada flotando (bajo la tierra todo es sólido) ni techo encima
        let huecos = 0;
        for (let j = 0; j < HUERTO.d; j++) for (let i = 0; i < HUERTO.w; i++) {
            const x = s.x0 + i, z = s.z0 + j;
            for (let y = alturaDe(x, z) + 1; y < h; y++) if (!celdas.has(`${x},${y},${z}`)) huecos++;
            for (let y = h + 2; y <= Math.max(alturaDe(x, z), h) + 8; y++) if (celdas.get(`${x},${y},${z}`) !== B.AIRE) huecos++;
        }
        ok(huecos === 0, `${huecos} huecos o bloques sin despejar en el huerto`);
        for (let j = -1; j <= HUERTO.d; j++) for (let i = -1; i <= HUERTO.w; i++) ok(!terreno.ES[(s.z0 + j) * BW + s.x0 + i], 'el huerto no pisa estructuras');
        const l = lugar('iglu');
        console.log(`  huerto: ${s.x0},${s.z0} a ${Math.hypot(s.x0 + 4 - l.bx, s.z0 + 2 - l.bz).toFixed(0)} bloques del iglú, y ${h}; ${plano.bloques.length} ediciones`);
    }

    // Parche de grava junto a la atalaya
    const sg = elegirSitio(terreno, lugar('atalaya'), GRAVA.w, GRAVA.d, { dMin: 8, dMax: 20 });
    ok(!!sg, 'sitio para la grava junto a la atalaya');
    if (sg) {
        const pg = planoGrava(sg.x0, sg.z0, alturaDe);
        ok(pg.bloques.length === GRAVA.w * GRAVA.d * GRAVA.capas && pg.bloques.every(b => b[3] === B.GRAVA), 'parche de grava completo');
        ok(pg.bloques.every(([x, y, z]) => y <= alturaDe(x, z) && y > alturaDe(x, z) - GRAVA.capas), 'la grava sustituye la superficie, no flota');
        const pedernal = pg.bloques.length * 0.1;
        ok(pedernal >= 4, `el parche da ~${pedernal} pedernales y lucho2 necesita 4 (16 flechas)`);
    }

    // Horno de la gatera
    const g = terreno.gatera, hn = planoHorno(g, dy).bloques[0], ocupado = new Set();
    levantarGatera((x, y, z) => ocupado.add(`${x},${y},${z}`), g, g.base + 1);
    ok(hn[3] === B.HORNO && hn[0] === g.maxx - 1 && hn[1] === g.base + 1 + dy, 'horno en el piso de la gatera');
    ok(!ocupado.has(`${hn[0]},${hn[1] - dy},${hn[2]}`) && !ocupado.has(`${hn[0]},${hn[1] - dy + 1},${hn[2]}`), 'el horno no pisa ningún mueble de la gatera');
    ok(hn[2] > g.minz && hn[2] < g.maxz, 'el horno queda dentro de la gatera');

    // Animales extra junto al escenario y la atalaya
    const extra = sitiosExtra(terreno);
    const faltan = CORRALES_EXTRA.filter(c => !extra.some(e => e.lugar === c.lugar && e.tipo === c.tipo));
    ok(!faltan.length, `sin sitio para: ${faltan.map(c => c.tipo + '/' + c.lugar)}`);
    const ovejas = extra.filter(e => e.tipo === 'oveja').reduce((s, e) => s + e.n, 0), gallinas = extra.filter(e => e.tipo === 'gallina').reduce((s, e) => s + e.n, 0);
    ok(ovejas >= 4, `corral de ${ovejas} ovejas (salonas1 pide 8 lanas; 4 ovejas dan 8-16 con tijeras)`);
    ok(gallinas >= 3, `${gallinas} gallinas`);
    const esc = terreno.escenario;
    for (const e of extra) {
        const ref = e.lugar === 'escenario' ? { x: esc.x, z: esc.z } : lugar(e.lugar);
        ok(Math.hypot(e.x - ref.x, e.z - ref.z) <= 30, `${e.tipo} a ${Math.hypot(e.x - ref.x, e.z - ref.z).toFixed(0)} bloques de ${e.lugar}`);
    }

    // Pistas desde donde se acepta cada misión: el amigo o, si no, el campamento. Debe haber algo a ≤ 64 bloques
    // para la mayoría (si no, el juego reintenta al alejarse 32: ver facilidades.js)
    const desde = {
        salonas2: terreno.escenario, salonas3: terreno.escenario, hadad3: lugar('campamento'), nacho2: lugar('campamento'),
        moises2: lugar('iglu'), moises3: lugar('iglu'), boris3: lugar('atalaya'), braulio3: lugar('campamento')
    };
    for (const [id, p] of Object.entries(desde)) {
        const def = facilidadDe(id).pista, t0 = performance.now();
        const radio = def.radio || RADIO_PISTA;
        const r = def.arena ? buscarArena(terreno, p.x, p.z, radio) : buscarSubsuelo(terreno, def, p.x, p.z, radio);
        const ms = performance.now() - t0;
        console.log(`  pista ${id}: ${r ? `${r.d.toFixed(0)} bloques, y ${r.y}` : 'nada a 64 bloques'} (${ms.toFixed(0)} ms)`);
        ok(!!r, `${id}: sin pista a ${radio} bloques de donde se acepta (${p.clave || 'escenario'})`);
        ok(ms < 400, `${id}: la búsqueda tardó ${ms.toFixed(0)} ms`);
    }
}

// ---------- 7 · el cableado (facilidades.js) con un mundo de mentira ----------
{
    const { crearFacilidades } = await import('../supervivencia/facilidades.js');
    const terreno = V.prepararTerreno(generarDatos('h'), { supervivencia: true });
    const dy = terreno.dy, iglu = terreno.lugares.find(l => l.clave === 'iglu');
    const ediciones = [], cultivos = [];
    let cargado = false, apariciones = 0, aparecer = false;
    const mundo = { bloque: () => (cargado ? 0 : -1), editarLote: l => ediciones.push(...l) };
    const jugador = { pos: { x: iglu.x, y: 100, z: iglu.z } };
    const dia = { esNoche: false, dias: 0 };
    const misiones = { estado: { fac: { deco: new Set(), pista: null, noche: null }, visitados: new Set() }, activa: null };
    const f = crearFacilidades({
        mundo, terreno, dy, jugador, dia, misiones, agricultura: { registrar: (x, y, z) => cultivos.push([x, y, z]) },
        enemigos: { garantizar: def => { apariciones++; return aparecer; } }
    });
    f.cargar();
    f.actualizar(2);
    ok(!ediciones.length, 'con el chunk sin cargar no se coloca nada');
    cargado = true; f.actualizar(1);
    ok(misiones.estado.fac.deco.has('huerto') && !misiones.estado.fac.deco.has('horno') && !misiones.estado.fac.deco.has('grava'), 'junto al iglú solo se pone el huerto (el resto queda lejos)');
    ok(cultivos.length === HUERTO.w * HUERTO.d - 1, `${cultivos.length} cultivos registrados`);
    const n = ediciones.length; f.actualizar(1); f.actualizar(1);
    ok(ediciones.length === n, 'el huerto se pone una sola vez');
    const g = terreno.gatera; jugador.pos.x = g.minx + 10; jugador.pos.z = g.minz + 10; f.actualizar(1);
    ok(misiones.estado.fac.deco.has('horno') && ediciones.some(e => e[3] === B.HORNO), 'junto a la gatera se pone el horno');
    const ata = terreno.lugares.find(l => l.clave === 'atalaya'); jugador.pos.x = ata.x; jugador.pos.z = ata.z; f.actualizar(1);
    ok(misiones.estado.fac.deco.has('grava') && ediciones.filter(e => e[3] === B.GRAVA).length === GRAVA.w * GRAVA.d * GRAVA.capas, 'junto a la atalaya se pone la grava');
    const fac2 = JSON.parse(JSON.stringify({ deco: [...misiones.estado.fac.deco], pista: misiones.estado.fac.pista, noche: misiones.estado.fac.noche }));
    ok(fac2.deco.length === 3, 'lo puesto se guarda');

    // Pista: se busca una vez al aceptar y se limpia al terminar
    const camp = terreno.lugares.find(l => l.clave === 'campamento'); jugador.pos.x = camp.x; jugador.pos.z = camp.z;
    misiones.activa = { id: 'hadad3' }; f.actualizar(1);
    const p = misiones.estado.fac.pista;
    ok(p && p.id === 'hadad3' && !p.nada && /^Pista: hierro a \d+ m al/.test(f.textoSeguimiento()), `pista de hadad3: ${f.textoSeguimiento()}`);
    ok(f.marcas().length === 1 && f.marcas()[0].tipo === 'pista', 'una marca de pista en el minimapa');
    jugador.pos.x += 3; f.actualizar(1);
    ok(misiones.estado.fac.pista === p, 'la pista se busca una sola vez');
    misiones.activa = { id: 'hadad1' }; f.actualizar(1);
    ok(misiones.estado.fac.pista === null && f.textoSeguimiento() === '' && f.marcas().length === 0, 'sin facilidad no hay pista ni marcas');
    // braulio2: los lugares sin visitar
    misiones.activa = { id: 'braulio2' }; f.actualizar(1);
    ok(f.marcas().length === 6 && f.marcas().every(m => m.tipo === 'lugar'), 'braulio2: 6 lugares con «?»');
    misiones.estado.visitados.add('portal'); ok(f.marcas().length === 5, 'al visitar uno se quita su «?»');
    // Pesca
    misiones.activa = { id: 'pony2' }; ok(f.multiplicadores()[O.PEZ_GLOBO] === 3, 'pony2 sube el pez globo');
    misiones.activa = { id: 'pony1' }; ok(f.multiplicadores() === null, 'pony1 pesca como siempre');
    // Monstruo de la noche: reintenta hasta que aparece y luego se calla
    misiones.activa = { id: 'hadad2' }; dia.esNoche = true;
    for (let t = 0; t < 12; t++) f.actualizar(1);
    ok(apariciones === 3 && misiones.estado.fac.noche.h === 0, `sin éxito reintenta cada ${REINTENTO_S} s (${apariciones} intentos en 12 s)`);
    aparecer = true; for (let t = 0; t < 8; t++) f.actualizar(1);
    const tras = apariciones;
    ok(misiones.estado.fac.noche.h === 1, 'aparece y queda anotado');
    for (let t = 0; t < 60; t++) f.actualizar(1);
    ok(apariciones === tras, 'una vez por noche');
    dia.dias = 1; for (let t = 0; t < 5; t++) f.actualizar(1);
    ok(apariciones > tras && misiones.estado.fac.noche.n === 1, 'la noche siguiente vuelve');
    dia.esNoche = false; misiones.activa = { id: 'hadad2' }; const a2 = apariciones; for (let t = 0; t < 30; t++) f.actualizar(1);
    ok(apariciones === a2, 'de día no hay intentos');
}

console.log(`facilidades · ${pruebas} comprobaciones · ${fallos ? fallos + ' fallas' : 'OK'}`);
process.exit(fallos ? 1 : 0);
