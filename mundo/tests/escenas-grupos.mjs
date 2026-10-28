// =========================================================
// Prueba de B4d (estudio/DISENO.md §40): las escenas de grupo migradas a escenas.json (y sus gestos a poses.json) dan el mismo
// cuadro que grupos/<grupo>.js: node mundo/tests/escenas-grupos.mjs
// Cada 1/120 s compara frases, tramo de cada actor (u, peso y metas de cada canal), T y r. Lo que el JS hacía en `extra` se
// compara con el catálogo: mismas chispas y sonidos por cuadro y en los mismos puntos, mismos objetos visibles. También el
// lugar (centro y dónde te paras), el paseo de Braulio (que vuelva a su sitio), el esquema, las reglas y el `dispara`.
// Hecho: Tomatitos (7 skins) y Coyhaique (3). Falta la atalaya.
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validar } from '../../estudio/validar.mjs';
import { guionDeDatos, reglasEscenas, escenaQueDispara, amigoDeEscena, repartoDe, repartirGuion, tramoEn, metaTramo, eventosEn, objetoEn, sonidosDeEscena, caminoEn } from '../datos/escenas.js';
import { funcionGesto } from '../datos/gestos.js';
import { GRUPOS_MIGRADOS, escenaDeGrupo, nombreEscena } from '../../estudio/migrar-grupos.mjs';

globalThis.window ??= { addEventListener() {} };
const aviso = console.warn;
console.warn = (...m) => { if (!String(m[0]).startsWith('[datos]')) aviso(...m); };
const { GESTOS } = await import('../supervivencia/escenas-skin.js');
const { GESTOS_AMISTAD } = await import('../supervivencia/escena-amistad-datos.js');
const { MOLDES, SONIDOS, PIX } = await import('../supervivencia/moldes.js');
const { GESTOS_GRUPO: GESTOS_GRUPO_JS } = await import('../supervivencia/grupos/comun.js');
const { durLinea } = await import('../supervivencia/reencuentros.js');
const { PERSONAJES, GRUPOS } = await import('../supervivencia/amistad.js');
const { CODIGO_ESCENAS } = await import('../supervivencia/codigo-escenas.js');
const { sonidos } = await import('../supervivencia/sonidos.js');
console.warn = aviso;

const aqui = path.dirname(fileURLToPath(import.meta.url));
const leer = f => JSON.parse(fs.readFileSync(path.join(aqui, '..', 'datos', f), 'utf8'));
const datos = leer('escenas.json'), poses = leer('poses.json');
let fallos = 0, pruebas = 0;
const ok = (c, m) => { pruebas++; if (!c) { fallos++; console.error('✗ ' + m); } };
const cerca = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

ok(validar(datos, 'escenas').length === 0, 'escenas.json cumple el esquema ' + JSON.stringify(validar(datos, 'escenas').slice(0, 3)));
ok(validar(poses, 'poses').length === 0, 'poses.json cumple el esquema ' + JSON.stringify(validar(poses, 'poses').slice(0, 3)));
const cat = sonidosDeEscena(SONIDOS, sonidos);
const nombres = { gestos: new Set([...Object.keys(GESTOS), ...Object.keys(GESTOS_AMISTAD), ...Object.keys(MOLDES), ...Object.keys(poses.gestos || {})]), animaciones: new Set(), durLinea,
    personas: new Set(PERSONAJES), grupos: new Set(Object.keys(GRUPOS)), iconos: new Set(), pix: new Set(Object.keys(PIX)), sonidos: new Set(Object.keys(cat)), codigos: new Set(Object.keys(CODIGO_ESCENAS)) };
const errores = reglasEscenas(datos, nombres).filter(p => p.tipo === 'error');
ok(errores.length === 0, 'escenas.json: sin errores de reglas ' + JSON.stringify(errores.slice(0, 3)));

const posesFn = Object.fromEntries(Object.entries(poses.gestos).map(([k, d]) => [k, funcionGesto(d, 'skin')]));
const deSkin = f => (u, t, i) => f(u, t, i.s, i.j);
const buscador = gestos => g => (gestos && gestos[g]) || GESTOS_AMISTAD[g] || (posesFn[g] && deSkin(posesFn[g])) || (GESTOS[g] && deSkin(GESTOS[g])) || null;

// ---- Mundo de mentira: la gente en puntos distintos; registra objetos, chispas y sonidos ----
function mundo(g) {
    const sitios = { n: { x: 1, y: 0, z: 2 }, hadad: { x: 3, y: 0, z: 1 }, nacho: { x: -1, y: 0, z: 4 }, j: { x: 0.5, y: 0, z: -2 } };
    const registro = [], efectos = [], estado = { sonidos: 0, mensaje: 0, visto: 0, mar: 0 };
    const nuevo = () => ({ visible: true, material: { map: {} }, userData: {}, position: { set() {} }, scale: { set() {} }, add() {}, position2: null });
    const api = {
        e: { t: 0, T: g.T, hechos: new Set() }, posG: q => sitios[q], actor: q => (sitios[q] ? { p: {} } : null), origen: q => sitios[q], mover() {}, girar() {}, camara() {},
        sprite: nuevo, caja: nuevo, pegar: o => { if (!registro.includes(o)) registro.push(o); return o; },
        efecto: (tipo, x, y, z, op = {}) => { efectos.push({ x, y, z, tam: op.tam ?? null }); return nuevo(); },
        sonidos: { golpe() { estado.sonidos++; } }
    };
    api.e.centro = g.centro(api);
    return { api, sitios, registro, efectos, estado };
}

let cuadros = 0;

// ---- Coyhaique: pista y frases contra el JS, el paseo (caminos) contra api.mover, la cámara y la bola contra el código ----
async function pruebaCoyhaique(mod, skin) {
    const grupo = 'coyhaique', nombre = nombreEscena(grupo, skin), def = datos.escenas[nombre];
    ok(!!def, `${nombre}: está en escenas.json`);
    if (!def) return;
    const { escena } = await escenaDeGrupo(grupo, skin, mod, SONIDOS);
    const { revisado, ...guardada } = def;
    if (JSON.stringify(guardada) !== JSON.stringify(escena)) console.log(`  aviso: ${nombre} ya no es el que da el script (¿lo ajustó el dueño?)`);
    const amigo = amigoDeEscena(def, def.dispara, skin, GRUPOS[grupo].miembros);
    ok(escenaQueDispara(datos.escenas, { tipo: 'grupo', grupo, skin }) === nombre, `${nombre}: la elige su dispara`);
    ok(amigo === (skin === 'moises' ? 'lalo' : 'moises'), `${nombre}: el amigo (n) es ${amigo}`);
    const js = mod.grupo(skin);
    let d = guionDeDatos(def, { durLinea, moldes: MOLDES, personajes: PERSONAJES });
    const r = repartoDe(d.personas, amigo, skin, d.actores);
    d = repartirGuion({ ...d, reparto: r.reparto, actores: r.actores });
    const persona = q => (q === 'n' ? amigo : q);
    ok(js.T === d.T && js.r === d.r, `${nombre}: T y r`);
    ok(JSON.stringify(Object.keys(js.pista).sort()) === JSON.stringify(Object.keys(d.pista).map(persona).sort()), `${nombre}: los mismos actores en la pista`);
    ok(cerca(js.extra ? 1 : 0, 1) && def.codigo === 'grupo-coyhaique' && !!CODIGO_ESCENAS[def.codigo], `${nombre}: su código está registrado`);
    // Sitios por persona; el JS los llama por papel (Moisés es 'n'), los datos por persona o 'n' (el amigo)
    const sitios = { moises: { x: 1, y: 0, z: 2 }, lalo: { x: 3, y: 0, z: 1 }, v: { x: 40, y: 0, z: 30 }, j: { x: 0.5, y: 0, z: -2 } };
    const mundoDe = (conRol, T) => {
        const registro = [], movs = {}, ef = [];
        const nuevo = () => ({ visible: true, material: { map: {} }, userData: {}, position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } }, scale: { set() {} } });
        const api = { e: { t: 0, T, hechos: new Set() }, posG: q => sitios[conRol(q)], origen: q => sitios[conRol(q)], actor: q => (conRol(q) ? { p: {} } : null),
            mover(q, x, y, z) { movs[q] = { x, y, z }; }, girar(q, yaw) { (movs.giros ||= {})[q] = yaw; }, camara(f) { api.fcamara = f; },
            sprite: nuevo, caja: nuevo, pegar: o => { registro.push(o); return o; }, efecto() { ef.push(1); return nuevo(); }, sonidos: { golpe() {} } };
        return { api, registro, movs, ef };
    };
    // JS: papeles moises→n, lalo, v, j. Datos: n→amigo; 'moises' solo existe como actor si tu skin es la suya
    const A = mundoDe(q => ({ n: 'moises', lalo: 'lalo', v: 'v', j: 'j' })[q], js.T);
    const B = mundoDe(q => (q === 'n' ? amigo : q === 'moises' ? (skin === 'moises' ? 'moises' : null) : q === 'lalo' ? (skin === 'moises' ? null : 'lalo') : sitios[q] ? q : null), d.T);
    A.api.e.centro = js.centro(A.api);
    js.extra.iniciar(A.api);
    const extraD = (await CODIGO_ESCENAS[def.codigo]()).default(d.marcas);
    extraD.iniciar(B.api);
    const bJS = buscador(js.gestos), bD = buscador(d.gestos);
    const origen = q => sitios[q === 'sitio' ? 'moises' : q];
    // El punto { desde, mas } de los caminos: desde Moisés (su asiento)
    const punto = (q, a) => { if (a === 'sitio') return q === 'v' ? { x: 40, y: 0, z: 30 } : sitios[q]; return { x: sitios.moises.x + a.mas[0], y: sitios.moises.y + a.mas[1], z: sitios.moises.z + a.mas[2] }; };
    let malos = 0;
    const malo = m => { if (malos++ < 5) console.error(`  ${nombre}: ${m}`); };
    for (let n = 0; n / 120 < js.T; n++) {
        const t = n / 120; cuadros++;
        A.api.e.t = B.api.e.t = t;
        const frases = (g, f) => g.lineas.filter(l => t >= l.a && t < l.a + l.d).map(l => f(l.q) + ':' + l.texto.es).join('|');
        if (frases(js, x => x) !== frases(d, persona)) malo(`t=${t.toFixed(3)} frases`);
        for (const q of Object.keys(js.pista)) {
            const qd = q === amigo ? 'n' : q;
            const x = tramoEn(js.pista[q], t), y = tramoEn(d.pista[qd], t);
            if (!x !== !y) { malo(`t=${t.toFixed(3)} ${q}: tramo ${x && x.g} ≠ ${y && y.g}`); continue; }
            if (!x) continue;
            if (!cerca(x.u, y.u) || !cerca(x.w, y.w)) malo(`t=${t.toFixed(3)} ${q}: u/w`);
            const i = { s: false, otroS: false, j: q === 'j', esc: 1 };
            const ma = metaTramo(x, t, i, bJS), mb = metaTramo(y, t, i, bD);
            for (const k of new Set([...Object.keys(ma), ...Object.keys(mb)])) if (!(ma[k] === mb[k] || cerca(ma[k], mb[k]))) malo(`t=${t.toFixed(3)} ${q} ${x.g}/${y.g}.${k}: ${ma[k]} ≠ ${mb[k]}`);
        }
        js.extra.cuadro(A.api);
        extraD.cuadro(B.api);
        // La bola: misma visibilidad y posición; la cámara: mismo plano
        const bj = A.registro[0], bd = B.registro[0];
        if (bj.visible !== bd.visible || (bj.visible && !(cerca(bj.position.x, bd.position.x) && cerca(bj.position.y, bd.position.y) && cerca(bj.position.z, bd.position.z)))) malo(`t=${t.toFixed(3)} bola`);
        const cj = A.api.fcamara(), cd = B.api.fcamara();
        if (![...cj.pos, ...cj.mira].every((v, k) => cerca(v, [...cd.pos, ...cd.mira][k]))) malo(`t=${t.toFixed(3)} cámara`);
        // El paseo: lo que movía el JS (menos el último 0,1 s, que ahora es la vuelta al sitio) contra los caminos
        if (t < js.T - 0.15) for (const [qd, qjs] of [['moises', 'n'], ['v', 'v']]) {
            const p = caminoEn(def.caminos[qd], t, a => punto(qd, a));
            const m = A.movs[qjs];
            if (m && p && !(cerca(m.x, p.x, 1e-7) && cerca(m.y, p.y, 1e-7) && cerca(m.z, p.z, 1e-7))) malo(`t=${t.toFixed(3)} paseo de ${qd}`);
        }
    }
    ok(malos === 0, `${nombre}: mismo cuadro que el JS cada 1/120 s`);
    // Los copos: los mismos que soltaba el JS (8 al llegar el Venjy y 6 por bola), cada uno en el instante de su golpe
    ok(A.ef.length === def.efectos.length && def.efectos.every(e => e[1] === 'copo'), `${nombre}: los mismos copos de nieve (${A.ef.length} / ${def.efectos.length})`);
    ok(def.sonidos.length === 2 && def.sonidos.every(([t, n], i) => n === 'bolaNieve' && cerca(t, def.marcas[i ? 'tiro2' : 'tiro1'] + 0.5, 1e-9)), `${nombre}: un golpe de nieve por bola`);
}

for (const { grupo, skins } of GRUPOS_MIGRADOS) {
    const mod = await import(`../supervivencia/grupos/${grupo}.js`);
    for (const skin of skins) {
        if (grupo === 'coyhaique') { await pruebaCoyhaique(mod, skin); continue; }
        const nombre = nombreEscena(grupo, skin);
        const def = datos.escenas[nombre];
        ok(!!def, `${nombre}: está en escenas.json`);
        if (!def) continue;
        const { escena } = await escenaDeGrupo(grupo, skin, mod, SONIDOS);
        const { revisado, ...guardada } = def;
        if (JSON.stringify(guardada) !== JSON.stringify(escena)) console.log(`  aviso: ${nombre} ya no es el que da el script (¿lo ajustó el dueño?)`);
        const amigo = amigoDeEscena(def, def.dispara, skin, GRUPOS[grupo].miembros);
        ok(escenaQueDispara(datos.escenas, { tipo: 'grupo', grupo, skin }) === nombre, `${nombre}: la elige su dispara`);
        ok(amigo === (skin === 'hadad' ? 'andy' : 'hadad'), `${nombre}: el amigo (n) es ${amigo}`);

        const js = mod.grupo(skin);
        let d = guionDeDatos(def, { durLinea, moldes: MOLDES, personajes: PERSONAJES });
        const r = repartoDe(d.personas, amigo, skin, d.actores);
        d = repartirGuion({ ...d, reparto: r.reparto, actores: r.actores });
        // 'n' de los datos es el amigo; en el JS, quien dice 'andy' es el ancla. Se compara por persona.
        const persona = q => (q === 'n' ? amigo : q);
        ok(js.T === d.T && js.r === d.r, `${nombre}: T y r`);
        ok(JSON.stringify(Object.keys(js.pista).sort()) === JSON.stringify(Object.keys(d.pista).map(persona).sort()), `${nombre}: los mismos actores en la pista`);

        const A = mundo(js), B = mundo(js);
        void B;
        if (js.extra.iniciar) js.extra.iniciar(A.api);
        // lugar: dónde queda el centro y dónde te paras, contra centro() y colocar() del JS
        const sit = s => { const b = s.desde === 'centro' ? A.api.e.centro : A.sitios[s.desde === 'hadad' ? 'hadad' : s.desde]; return { x: b.x + s.mas[0], y: b.y + s.mas[1], z: b.z + s.mas[2] }; };
        const c = sit(def.lugar.centro), cJS = A.api.e.centro, jJS = js.colocar(A.api);
        ok(cerca(c.x, cJS.x) && cerca(c.y, cJS.y) && cerca(c.z, cJS.z), `${nombre}: el centro del lugar`);
        const j2 = { x: cJS.x + def.lugar.jugador.mas[0], y: cJS.y + def.lugar.jugador.mas[1], z: cJS.z + def.lugar.jugador.mas[2] };
        ok(cerca(j2.x, jJS.x) && cerca(j2.y, jJS.y) && cerca(j2.z, jJS.z), `${nombre}: dónde te paras`);

        const bJS = buscador(js.gestos), bD = buscador(d.gestos);
        const hechos = new Set();
        const catEf = [];
        // Sonidos del JS por cuadro (SONIDOS.mensaje / visto / mar y el golpe del api)
        const orig = { mensaje: SONIDOS.mensaje, visto: SONIDOS.visto, mar: SONIDOS.mar };
        for (const k of Object.keys(orig)) SONIDOS[k] = () => { A.estado.sonidos++; };
        let malos = 0, t0 = 0, sJS = 0, sD = 0, peorS = 0, peorE = 0, efJS = 0, efD = 0;
        const malo = m => { if (malos++ < 5) console.error(`  ${nombre}: ${m}`); };
        const quien = q => (q === 'andy' ? 'n' : q); // el rol del JS
        for (let n = 0; n / 120 < js.T; n++) {
            const t = n / 120; cuadros++;
            A.api.e.t = t;
            const frases = (g, f) => g.lineas.filter(l => t >= l.a && t < l.a + l.d).map(l => f(l.q) + ':' + l.texto.es).join('|');
            if (frases(js, x => x) !== frases(d, persona)) malo(`t=${t.toFixed(3)} frases`);
            for (const q of Object.keys(js.pista)) {
                const qd = q === amigo ? 'n' : q;
                const x = tramoEn(js.pista[q], t), y = tramoEn(d.pista[qd], t);
                if (!x !== !y) { malo(`t=${t.toFixed(3)} ${q}: tramo ${x && x[0]} ≠ ${y && y[0]}`); continue; }
                if (!x) continue;
                if (!cerca(x.u, y.u) || !cerca(x.w, y.w)) malo(`t=${t.toFixed(3)} ${q}: u/w`);
                const i = { s: false, otroS: false, j: q === 'j', esc: 1 };
                const ma = metaTramo(x, t, i, bJS), mb = metaTramo(y, t, i, bD);
                for (const k of new Set([...Object.keys(ma), ...Object.keys(mb)])) if (!(ma[k] === mb[k] || cerca(ma[k], mb[k]))) malo(`t=${t.toFixed(3)} ${q} ${x.g}/${y.g}.${k}: ${ma[k]} ≠ ${mb[k]}`);
            }
            const e0 = A.efectos.length, s0 = A.estado.sonidos;
            js.extra.cuadro(A.api);
            const evEf = eventosEn(d.efectos, t0, t, hechos, 'e'), evSo = eventosEn(d.sonidos, t0, t, hechos, 's');
            for (const i of evEf) {
                const [, , op = {}] = d.efectos[i];
                const q = op.en === 'centro' ? null : op.en;
                const b = q ? A.sitios[quien(persona(q))] : cJS;
                const mas = op.mas || [0, 0, 0];
                catEf.push({ x: b.x + mas[0], y: b.y + (op.alto ?? 1.8) + mas[1], z: b.z + mas[2], tam: op.tam ?? null });
            }
            sJS += A.estado.sonidos - s0; sD += evSo.length;
            efJS += A.efectos.length - e0; efD += evEf.length;
            peorS = Math.max(peorS, Math.abs(sJS - sD)); peorE = Math.max(peorE, Math.abs(efJS - efD));
            // Objetos visibles (el tomate gigante lleva sus hojas aparte en los datos: un objeto más)
            const visJS = A.registro.filter(o => o.visible).length + (skin === 'venjy' && t >= (def.objetos.find(o => o.id === 'tomate-gigante') || {}).desde ? 1 : 0);
            const visD = (d.objetos || []).filter(o => objetoEn(o, t).visible).length;
            if (visJS !== visD) malo(`t=${t.toFixed(3)} objetos visibles ${visJS} ≠ ${visD}`);
            t0 = t;
        }
        Object.assign(SONIDOS, orig);
        // El mensaje se cuenta como sonido del JS también (ya está en `orig` parchado)
        ok(sJS === sD && peorS <= 1, `${nombre}: los mismos sonidos (${sJS} / ${sD}, desfase máximo ${peorS})`);
        ok(efJS === efD && peorE <= 1, `${nombre}: las mismas chispas (${efJS} / ${efD}, desfase máximo ${peorE})`);
        const clave = e => [e.x.toFixed(6), e.y.toFixed(6), e.z.toFixed(6), e.tam].join('|');
        const delJS = A.efectos.map(clave).sort(), delD = catEf.map(clave).sort();
        ok(JSON.stringify(delJS) === JSON.stringify(delD), `${nombre}: las chispas salen en los mismos puntos` + (JSON.stringify(delJS) === JSON.stringify(delD) ? '' : `\n    JS: ${delJS.slice(0, 3)}\n    datos: ${delD.slice(0, 3)}`));
        ok(malos === 0, `${nombre}: mismo cuadro que el JS cada 1/120 s`);
        // El paseo de Braulio vuelve a su sitio y mira a Nacho
        if (def.caminos) {
            const cm = def.caminos.j;
            ok(cm[0][1] === 'sitio' && cm[cm.length - 1][1] === 'sitio' && cm[cm.length - 1][0] < def.T, `${nombre}: el paseo vuelve a su sitio antes de T`);
            ok(def.giros.j[0][1] === 'nacho', `${nombre}: mira a Nacho`);
        }
    }
}
// Los gestos de los datos son los de GESTOS_GRUPO del JS
ok(Object.keys(GESTOS_GRUPO_JS).length > 10, 'GESTOS_GRUPO del JS sigue ahí');
console.log(`escenas-grupos: ${pruebas - fallos}/${pruebas} bien (${cuadros} cuadros)`);
if (fallos) process.exit(1);
