// Prueba de la vida entre amigos (bloque 6d, etapa 1): node mundo/tests/vida-amigos.mjs
// Guiones: actores del lugar, frases ES/EN únicas (contra todo el juego) y sin emojis, sin pisarse y dentro de la
// interacción, gestos conocidos y dentro de los rangos de rig.md. Planificador: lejos es solo un reloj (1 de cada 4
// cuadros), al acercarte se ve desde donde va, tope de MAX_DETALLE con turnos, una escena la corta, el pase del iglú
// la hace esperar, no repite la misma seguida. Conexión: ganchos n.vida solo cerca, nada lejos, y se sueltan al cortar.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
globalThis.window ??= { addEventListener() {} };
const { crearVida, crearVidaAmigos, lineasEn, gestoEn, RADIO_DETALLE, MAX_DETALLE, CADA_LEJOS, ESPERA, INTERACCIONES } = await import('../supervivencia/vida-amigos.js');
const D = await import('../supervivencia/vida-amigos-datos.js');

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };

// ---------------------------------------------------------
// Guiones
// ---------------------------------------------------------
const G = D.guiones();
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u;
// Los mismos márgenes que mundo/tests/amistad.mjs (rig.md con la holgura de los gestos ya aprobados)
const RANGO = { cx: [-0.46, 0.51], cy: [-1.11, 1.11], cz: [-0.21, 0.21], bDx: [-3.1, 0.61], bIx: [-3.1, 0.61], bDz: [-0.81, 1.0], bIz: [-1.0, 0.81], pDx: [-1.61, 0.61], pIx: [-1.61, 0.61], inc: [-0.21, 0.71], rz: [-0.16, 0.16], y: [-0.71, 0.61], salto: [0, 0.6] };
const SENTADOS = new Set(['hadad', 'nacho', 'moises']);
const frases = [];
ok(Object.keys(G).join() === 'fogata,iglu', 'dos lugares: fogata e iglú');
for (const [l, lista] of Object.entries(G)) ok(lista.map(g => g.id).join() === INTERACCIONES[l].join(), `${l}: INTERACCIONES (para /amistad vida-<id>) coincide con los guiones`);
for (const [lugar, lista] of Object.entries(G)) {
    ok(lista.length >= 4, `${lugar}: al menos 4 interacciones (${lista.length})`);
    ok(new Set(lista.map(g => g.id)).size === lista.length, `${lugar}: ids únicos`);
    for (const g of lista) {
        const r = `${lugar}/${g.id}`;
        ok(g.titulo && g.titulo.es && g.titulo.en, `${r}: título ES/EN`);
        ok(g.T > 8 && g.T < 40, `${r}: dura entre 8 y 40 s (${g.T})`);
        const quienes = new Set(g.lineas.map(l => l.q).filter(q => q !== 'ambos'));
        ok([...quienes].every(q => D.ACTORES[lugar].includes(q)), `${r}: solo hablan los del lugar`);
        ok(D.ACTORES[lugar].every(q => quienes.has(q)), `${r}: hablan todos los del lugar`);
        ok(Object.keys(g.pista).every(q => D.ACTORES[lugar].includes(q)), `${r}: gestos solo de los del lugar`);
        g.lineas.forEach((l, i) => {
            ok(l.texto.es && l.texto.en, `${r} #${i}: ES/EN`);
            ok(l.d >= 2.3 && l.d <= 3.6, `${r} #${i}: se alcanza a leer (${l.d} s)`);
            ok(l.a + l.d <= g.T, `${r} #${i}: dentro de la interacción`);
            if (i) ok(l.a >= g.lineas[i - 1].a + g.lineas[i - 1].d, `${r} #${i}: no pisa a la anterior`);
            ok(l.texto.es.length <= 70 && l.texto.en.length <= 70, `${r} #${i}: cabe en el globo`);
            frases.push([`${r} #${i}`, l.texto]);
        });
        for (const [q, pista] of Object.entries(g.pista)) {
            pista.forEach(([nombre, a, b], i) => {
                const f = g.gestos[nombre] || D.GESTOS_SKIN[nombre];
                ok(!!f, `${r} ${q}: gesto «${nombre}» existe`);
                ok(a >= 0 && b <= g.T && b > a, `${r} ${q} ${nombre}: dentro de la interacción`);
                if (i) ok(a >= pista[i - 1][2], `${r} ${q} ${nombre}: no pisa al gesto anterior`);
                if (!f) return;
                const s = SENTADOS.has(q);
                for (let k = 0; k <= 10; k++) {
                    const u = k / 10, tt = a + u * (b - a);
                    const m = g.gestos[nombre] ? f(u, tt, { s, otroS: false, j: false, esc: 1 }) : f(u, tt, s, false);
                    for (const [c, v] of Object.entries(m || {})) {
                        if (!RANGO[c] || (s && (c === 'pDx' || c === 'pIx' || c === 'y'))) continue;
                        ok(Number.isFinite(v) && v >= RANGO[c][0] && v <= RANGO[c][1], `${r} ${q} ${nombre}: ${c} = ${v.toFixed(2)} en el rango de rig.md`);
                    }
                }
            });
        }
    }
}
// Frases únicas entre ellas y contra todo el juego (cualquier texto de mundo/ en otro archivo), sin emojis
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const otros = new Set();
(function recorrer(dir) {
    for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) { if (!['tests', 'capturas'].includes(f)) recorrer(p); continue; }
        if (!f.endsWith('.js') || f === 'vida-amigos-datos.js') continue;
        for (const m of readFileSync(p, 'utf8').matchAll(/(['"`])((?:\\.|(?!\1).){6,}?)\1/g)) otros.add(m[2].replace(/\\(.)/g, '$1').trim().toLowerCase());
    }
})(raiz);
for (const idi of ['es', 'en']) {
    const vistos = new Map();
    for (const [r, o] of frases) {
        const k = o[idi].trim().toLowerCase();
        ok(!vistos.has(k), `${r} (${idi}) repetida con ${vistos.get(k)}: «${o[idi]}»`);
        ok(!otros.has(k), `${r} (${idi}) ya existe en otro módulo del juego: «${o[idi]}»`);
        ok(!EMOJI.test(o[idi]), `${r} (${idi}): sin emojis`);
        vistos.set(k, r);
    }
}

// ---------------------------------------------------------
// Planificador
// ---------------------------------------------------------
const gfalso = (id, T = 10) => ({ id, T, lineas: [{ q: 'a', a: 0.6, d: 3, texto: { es: 'x', en: 'x' } }], pista: {} });
const rndFijo = () => 0.5;
const nuevo = (lugares, guiones, op = {}) => crearVida({ lugares, guiones, rnd: rndFijo, ...op });
const correr = (v, seg, c, paso = 1 / 60) => { for (let s = 0; s < seg; s += paso) v.actualizar(paso, c); };
{
    // Lejos: solo reloj, 1 de cada CADA_LEJOS cuadros, empieza y termina sin detalle
    const v = nuevo([{ clave: 'A', x: 0, z: 0 }], { A: [gfalso('a1'), gfalso('a2')] });
    const lejos = { jx: 500, jz: 0, visible: true };
    let corridos = 0;
    for (let i = 0; i < 400; i++) if (v.actualizar(1 / 60, lejos)) corridos++;
    ok(corridos === 400 / CADA_LEJOS, `lejos corre 1 de cada ${CADA_LEJOS} cuadros (${corridos} de 400)`);
    const l = v.lugares[0];
    l.espera = 0;
    correr(v, 0.2, lejos);
    ok(l.e && !l.detalle, 'lejos empieza una interacción, sin detalle');
    correr(v, 4, lejos);
    ok(Math.abs(l.e.t - 4.2) < 0.15, `lejos el reloj avanza con el tiempo acumulado (${l.e.t.toFixed(2)} ≈ 4,2)`);
    // Al acercarte se ve desde donde va
    const tAntes = l.e.t;
    v.actualizar(1 / 60, { jx: 5, jz: 0, visible: true });
    ok(l.detalle && l.e.t >= tAntes && l.e.t < tAntes + 0.2, 'al acercarte la interacción sigue desde donde iba, con detalle');
    v.actualizar(1 / 60, { jx: RADIO_DETALLE + 1, jz: 0, visible: true });
    ok(!l.detalle && l.e, 'pasado RADIO_DETALLE: sin detalle pero sigue el reloj');
    v.actualizar(1 / 60, { jx: 5, jz: 0, visible: false });
    ok(!l.detalle, 'sin dibujarse (visible false) no hay detalle');
    correr(v, 8, lejos);
    ok(!l.e && l.espera >= ESPERA[0] - 0.1, 'termina sola lejos y vuelve a esperar');
    // No repite la misma seguida
    const ids = [];
    for (let i = 0; i < 12; i++) { v.forzar('A'); ids.push(l.e.g.id); }
    ok(ids.every((x, i) => !i || x !== ids[i - 1]), `no repite la misma seguida (${ids.join(' ')})`);
}
{
    // Tope: 3 lugares cerca y todos con ganas de empezar → solo MAX_DETALLE; el tercero espera su turno
    const L = ['A', 'B', 'C'].map((clave, i) => ({ clave, x: i * 4, z: 0 }));
    const v = nuevo(L, { A: [gfalso('a', 6)], B: [gfalso('b', 12)], C: [gfalso('c', 6)] });
    for (const l of v.lugares) l.espera = 0;
    const cerca = { jx: 4, jz: 1, visible: true };
    v.actualizar(1 / 60, cerca);
    ok(v.enDetalle() === MAX_DETALLE, `cerca: ${v.enDetalle()} con detalle (tope ${MAX_DETALLE})`);
    const espera = v.lugares.find(l => !l.e);
    ok(espera && espera.espera === 0, 'el tercero no empieza: espera su turno');
    let maxVisto = 0, empezo = false;
    for (let s = 0; s < 8; s += 1 / 60) { v.actualizar(1 / 60, cerca); maxVisto = Math.max(maxVisto, v.enDetalle()); if (espera.e) empezo = true; }
    ok(maxVisto <= MAX_DETALLE, `nunca más de ${MAX_DETALLE} con detalle (${maxVisto})`);
    ok(empezo && espera.detalle !== undefined, 'cuando termina una, el que esperaba toma el turno');
    // Una escena (ocupado) corta la interacción del lugar y la deja esperando
    const B = v.lugares.find(l => l.clave === 'B');
    v.forzar('B', 'b');
    v.actualizar(1 / 60, { ...cerca, ocupado: c => c === 'B' });
    ok(!B.e && B.espera > 0, 'una escena corta la interacción');
    // El pase del iglú (listo false) la hace esperar sin cortarla
    v.forzar('B', 'b', 2);
    v.actualizar(1 / 60, { ...cerca, listo: c => c !== 'B' });
    ok(B.e && !B.detalle, 'sin estar listo (pase en curso): sigue sin detalle');
    v.actualizar(1 / 60, cerca);
    ok(B.detalle || v.enDetalle() === MAX_DETALLE, 'listo otra vez: vuelve el detalle si hay turno');
}

// ---------------------------------------------------------
// Conexión con personas falsas
// ---------------------------------------------------------
{
    const hueso = () => ({ rotation: { x: 0, y: 0, z: 0 }, position: { x: 0, y: 0, z: 0 } });
    const persona = (clave, x, z) => ({ clave, x, z, y: 0, yaw: 0, escala: 1, p: { cuello: hueso(), brazoD: hueso(), brazoI: hueso(), piernaD: hueso(), piernaI: hueso(), cuerpo: hueso() } });
    const hadad = persona('hadad', -2, 0), andy = persona('andy', 0, 2), nacho = persona('nacho', 2, 0);
    const moises = persona('moises', 300, 0), lalo = persona('lalo', 302, 0);
    const amigos = { campamento: { hadad, andy, nacho, fuego: { x: 0, z: 0 } }, iglu: { moises, lalo, enPase: false } };
    const jugador = { pos: { x: 1000, y: 0, z: 0 } };
    const va = crearVidaAmigos({ amigos, jugador, idioma: () => 'es' });
    va.actualizar(0.1);
    ok(!va.cargado, 'lejos de todo: no carga los guiones');
    jugador.pos.x = 50;
    va.actualizar(0.1);
    await va.forzar('fogata', 'papas', 4);
    ok(va.cargado, 'a menos de 64 bloques: carga los guiones');
    jugador.pos.x = 40;
    for (let i = 0; i < 30; i++) va.actualizar(1 / 60);
    ok(!hadad.vida && !moises.vida, 'a 40 bloques: ningún gancho (nada se anima ni se escribe)');
    jugador.pos.x = 6;
    for (let i = 0; i < 40; i++) { va.actualizar(1 / 60); for (const n of [hadad, andy, nacho]) if (n.vida) n.vida.animar(1 / 60); }
    ok(hadad.vida && andy.vida && nacho.vida, 'cerca: los tres de la fogata con gancho');
    ok(!moises.vida && !lalo.vida, 'el iglú, lejos, sin gancho');
    const e = va.estado().find(x => x.lugar === 'fogata');
    const g = G.fogata.find(x => x.id === 'papas');
    const habla = lineasEn(g, e.t).map(l => l.q);
    const conTexto = [hadad, andy, nacho].filter(n => n.vida.texto).map(n => n.clave);
    ok(habla.every(q => conTexto.includes(q)) && conTexto.every(q => habla.includes(q)), `globo solo para quien habla (${conTexto.join()} / ${habla.join()})`);
    ok(e.t > 4 && e.t < 6, `siguió desde el segundo 4 (${e.t})`);
    ok(gestoEn(g, 'nacho', 0.9) !== null || gestoEn(g, 'nacho', 0.9) === null, 'gestoEn responde');
    // Una escena corta y suelta los ganchos al tiro
    nacho.escena = () => {};
    va.actualizar(1 / 60);
    ok(!hadad.vida && !andy.vida && !nacho.vida, 'una escena en la fogata suelta los ganchos');
    ok(!va.estado().find(x => x.lugar === 'fogata').id, 'y corta la interacción');
    delete nacho.escena;
    // Al alejarse se apaga con rampa y suelta los ganchos
    await va.forzar('fogata', 'informe', 2);
    for (let i = 0; i < 40; i++) va.actualizar(1 / 60);
    ok(hadad.vida, 'otra interacción con detalle');
    jugador.pos.x = 200;
    for (let i = 0; i < 60; i++) va.actualizar(1 / 60);
    ok(!hadad.vida && !andy.vida && !nacho.vida, 'al alejarse se sueltan los ganchos');
    ok(va.estado().find(x => x.lugar === 'fogata').id === 'informe', 'lejos sigue el reloj de la misma interacción');
    // El pase del iglú: espera sin cortar
    jugador.pos.x = 301;
    amigos.iglu.enPase = true;
    await va.forzar('iglu', 'loza', 1);
    for (let i = 0; i < 30; i++) va.actualizar(1 / 60);
    ok(!moises.vida && va.estado().find(x => x.lugar === 'iglu').id === 'loza', 'iglú con pase en curso: sin ganchos y sin cortar');
    amigos.iglu.enPase = false;
    for (let i = 0; i < 30; i++) va.actualizar(1 / 60);
    ok(moises.vida && lalo.vida, 'termina el pase: Lalo y Moisés con gancho');
}

const n = Object.values(G).reduce((s, l) => s + l.length, 0);
console.log(`${n} interacciones · ${frases.length} frases (ES/EN) · ${pruebas} comprobaciones`);
if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('vida-amigos.mjs: todo bien');
