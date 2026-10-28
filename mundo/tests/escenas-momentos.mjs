// =========================================================
// Prueba de B4c (estudio/DISENO.md §40): los momentos especiales migrados a escenas.json (y sus gestos a poses.json) dan el
// mismo cuadro que momentos/<clave>.js: node mundo/tests/escenas-momentos.mjs
// Cada 1/120 s compara frases que se ven, tramo de cada actor (u, peso y metas de cada canal), giro relativo, y T, r, rapidez,
// golpes y corazones. Lo que el JS hacía en `extra` se compara con lo que ahora hacen el catálogo (objetos, efectos y sonidos
// de la escena) y el módulo de codigo-escenas/: mismas chispas y sonidos por cuadro, mismos objetos visibles y, para los que
// corre el código, la misma matriz de mundo, visibilidad y opacidad en cada cuadro. Además: esquema, reglas y `dispara`.
// =========================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from '../../vendor/three.module.js';
import { validar } from '../../estudio/validar.mjs';
import { guionDeDatos, reglasEscenas, escenaQueDispara, amigoDeEscena, repartoDe, repartirGuion, tramoEn, metaTramo, eventosEn, objetoEn, sonidosDeEscena } from '../datos/escenas.js';
import { funcionGesto } from '../datos/gestos.js';
import { MOMENTOS, escenaDeMomento } from '../../estudio/migrar-momentos.mjs';

globalThis.window ??= { addEventListener() {} };
const aviso = console.warn;
console.warn = (...m) => { if (!String(m[0]).startsWith('[datos]')) aviso(...m); };
const { GESTOS } = await import('../supervivencia/escenas-skin.js');
const { GESTOS_AMISTAD } = await import('../supervivencia/escena-amistad-datos.js');
const { MOLDES, SONIDOS, PIX } = await import('../supervivencia/moldes.js');
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

// ---- Un mundo de mentira con THREE de verdad: dos actores con cuerpo, cuello y brazos que se mueven con el tiempo ----
function mundo() {
    const grupo = new THREE.Group();
    const actor = (x, z, yaw) => {
        const g = new THREE.Group(); g.position.set(x, 0, z); grupo.add(g);
        const cuerpo = new THREE.Group(); g.add(cuerpo);
        const cuello = new THREE.Group(); cuello.position.set(0, 1.5, 0); cuerpo.add(cuello);
        for (const y of [0.5, 0.56, 0.62]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), new THREE.MeshBasicMaterial()); p.position.set(0, y, 0); cuello.add(p); }
        const brazoD = new THREE.Group(), brazoI = new THREE.Group();
        brazoD.position.set(-0.4, 1.4, 0); brazoI.position.set(0.4, 1.4, 0); cuerpo.add(brazoD, brazoI);
        return { p: { g, cuerpo, cuello, brazoD, brazoI }, n: { yaw }, x, z };
    };
    const actores = { n: actor(1, 2, 0.4), j: actor(-0.5, 3.5, 3.5) };
    const jugador = { pos: { x: -0.5, y: 0, z: 3.5 } };
    const registro = [], efectos = [], estado = { sonidos: 0 };
    const posG = q => { const a = actores[q]; return { x: a.x, y: 0, z: a.z }; };
    const punta = (a, lado, v) => { a.p.g.updateMatrixWorld(true); return grupo.worldToLocal((lado === 'I' ? a.p.brazoI : a.p.brazoD).localToWorld(v.set(0, -0.75, 0))); };
    const mover = t => {
        actores.n.p.brazoD.rotation.x = -1 + 0.5 * Math.sin(3 * t); actores.n.p.brazoI.rotation.x = -0.7 + 0.4 * Math.sin(2 * t + 1);
        actores.j.p.brazoD.rotation.x = -0.9 + 0.5 * Math.sin(2.5 * t); actores.j.p.brazoI.rotation.x = -0.6 + 0.4 * Math.sin(3.5 * t + 2);
        grupo.updateMatrixWorld(true);
    };
    const efecto = (tipo, x, y, z, op = {}) => { efectos.push({ tipo, x, y, z, tam: op.tam ?? null, vida: op.vida ?? null }); return new THREE.Sprite(new THREE.SpriteMaterial()); };
    const api = {
        e: { t: 0, hechos: new Set() }, grupo, jugador, THREE, actor: q => actores[q], posG, punta, efecto,
        golpe: donde => { const p = donde || punta(actores.n, 'D', new THREE.Vector3()).lerp(punta(actores.j, 'D', new THREE.Vector3()), 0.5); efecto('chispa', p.x, p.y, p.z); estado.sonidos++; },
        sonidos: { golpe() { estado.sonidos++; } },
        caja: (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial()),
        sprite: (filas, colores, tam) => { const s = new THREE.Sprite(new THREE.SpriteMaterial()); s.scale.set(tam, tam, 1); return s; },
        pegar: (o, q, hueso, pos = [0, 0, 0], rot = [0, 0, 0]) => {
            if (o.parent) o.parent.remove(o);
            (q ? actores[q].p[hueso] : grupo).add(o);
            o.position.set(...pos); o.rotation.set(...rot);
            if (!registro.includes(o)) registro.push(o);
            return o;
        },
        soltar: o => { if (o.parent) o.parent.remove(o); grupo.add(o); },
        prestar: o => { if (!registro.includes(o)) registro.push(o); }
    };
    return { api, registro, efectos, estado, mover, grupo };
}
const mismaMatriz = (a, b) => a.matrixWorld.elements.every((v, i) => cerca(v, b.matrixWorld.elements[i], 1e-7));

// Quién en el catálogo (JS) y quién en el código: la creación en orden (pegar) de los objetos del JS que ahora son del catálogo
const EN_CATALOGO = { nacho: [0, 1, 4, 5], pony: [0] };

let cuadros = 0;
for (const v of MOMENTOS) {
    const nombre = v.nombre;
    const def = datos.escenas[nombre];
    ok(!!def, `${nombre}: está en escenas.json`);
    if (!def) continue;
    const mod = await import(`../supervivencia/momentos/${v.k}.js`);
    const { escena } = escenaDeMomento(v, mod);
    const { revisado, ...guardada } = def;
    if (JSON.stringify(guardada) !== JSON.stringify(escena)) console.log(`  aviso: ${nombre} ya no es el que da el script (¿lo ajustó el dueño?)`);
    const skin = v.base || (v.k === 'andy' ? 'hadad' : 'andy');
    ok(escenaQueDispara(datos.escenas, { tipo: 'momento', persona: v.k, skin }) === nombre && amigoDeEscena(def, def.dispara, skin) === v.k, `${nombre}: la elige su dispara`);

    const js = mod.momento({ base: v.base, idioma: 'es' });
    let d = guionDeDatos(def, { durLinea, moldes: MOLDES, personajes: PERSONAJES });
    const r = repartoDe(d.personas, v.k, skin, d.actores);
    d = repartirGuion({ ...d, reparto: r.reparto, actores: r.actores });
    ok(js.T === d.T && js.r === d.r && (js.rapidez || 0) === (d.rapidez || 0), `${nombre}: T, r y rapidez`);
    ok(JSON.stringify(js.golpes || []) === JSON.stringify(d.golpes || []) && JSON.stringify(js.corazones || []) === JSON.stringify(d.corazones || []), `${nombre}: golpes y corazones`);
    ok(!d.giros && !d.caminos && !js.yaw === !d.yaw, `${nombre}: sin giros ni caminos; yaw relativo en los dos o en ninguno`);

    // Dos mundos de mentira: uno corre el `extra` del JS; el otro, el catálogo (objetos, efectos, sonidos) y el código de la escena
    const A = mundo(), B = mundo();
    if (js.extra && js.extra.iniciar) js.extra.iniciar(A.api);
    let extraD = null;
    if (d.codigo) {
        ok(!!CODIGO_ESCENAS[d.codigo], `${nombre}: ${d.codigo} está en CODIGO_ESCENAS`);
        extraD = (await CODIGO_ESCENAS[d.codigo]()).default(d.marcas || {});
        if (extraD.iniciar) extraD.iniciar(B.api);
    } else ok(!(js.extra && js.extra.iniciar && A.registro.length) || (d.objetos || []).length === A.registro.length, `${nombre}: sin código, todos los objetos son del catálogo`);
    const enCat = new Set(EN_CATALOGO[v.k] || (d.codigo ? [] : A.registro.map((_, i) => i)));
    const parejas = A.registro.map((o, i) => [o, i]).filter(([, i]) => !enCat.has(i)).map(([o]) => o);
    ok(parejas.length === B.registro.length, `${nombre}: el código crea los mismos objetos (${parejas.length} / ${B.registro.length})`);
    ok((d.objetos || []).length === enCat.size, `${nombre}: el catálogo tiene los objetos que faltan (${enCat.size} / ${(d.objetos || []).length})`);

    const bJS = buscador(js.gestos), bD = buscador(d.gestos);
    // Un tramo del JS que se pisaba con el siguiente (Nacho) termina en los datos donde empieza el otro: solo cambia su
    // entrada y su salida suaves, 0,3 s alrededor del cruce (DISENO §40, decisión 22)
    const ventanas = Object.values(js.pista).flatMap(tr => tr.flatMap((x, i) => (tr[i + 1] && x[2] > tr[i + 1][1] ? [[tr[i + 1][1] - 0.3, x[2] + 0.3]] : [])));
    const recortados = new Set(Object.values(js.pista).flatMap(tr => tr.filter((x, i) => tr[i + 1] && x[2] > tr[i + 1][1]).map(x => x[0])));
    const hechos = new Set();
    const catEf = []; // chispas del catálogo (posición de la fórmula del motor, sin `en`)
    let malos = 0, t0 = 0, sJS = 0, sD = 0, peorS = 0, peorE = 0, efJS = 0, efD = 0;
    const malo = m => { if (malos++ < 5) console.error(`  ${nombre}: ${m}`); };
    for (let n = 0; n / 120 < js.T; n++) {
        const t = n / 120; cuadros++;
        A.api.e.t = B.api.e.t = t;
        A.mover(t); B.mover(t);
        const frases = g => g.lineas.filter(l => t >= l.a && t < l.a + l.d).map(l => l.q + ':' + l.texto.es).join('|');
        if (frases(js) !== frases(d)) malo(`t=${t.toFixed(3)} frases`);
        for (const q of Object.keys(js.pista)) {
            if (ventanas.some(([a, b]) => t >= a && t <= b)) continue;
            const x = tramoEn(js.pista[q], t), y = tramoEn(d.pista[q], t);
            const borde = (tr, p) => tr && (p[q] || []).some(z => (cerca(z[1], t) || cerca(z[2], t)));
            if (!x !== !y) { if (!borde(x, js.pista) && !borde(y, d.pista)) malo(`t=${t.toFixed(3)} ${q}: tramo ${x && x.g} ≠ ${y && y.g}`); continue; }
            if (!x) continue;
            if (!recortados.has(x.g) && (!cerca(x.u, y.u) || !cerca(x.w, y.w))) malo(`t=${t.toFixed(3)} ${q}: u/w`);
            const i = { s: false, otroS: false, j: q === 'j', esc: 1 };
            const ma = metaTramo(x, t, i, bJS), mb = metaTramo(y, t, i, bD);
for (const c of new Set([...Object.keys(ma), ...Object.keys(mb)])) {
                if (ma[c] === mb[c] || cerca(ma[c], mb[c])) continue;
                // Un peldaño de floor(t / 0,4) que el redondeo corre un cuadro (4.8 / 0.4 = 11.999999999999998): vale si los datos
                // dan lo que da el JS un instante antes o después
                const vecino = [-1e-6, 1e-6].some(dt => { const x2 = tramoEn(js.pista[q], t + dt); return x2 && cerca(metaTramo(x2, t + dt, i, bJS)[c], mb[c], 1e-4); });
                if (!vecino) malo(`t=${t.toFixed(3)} ${q} ${x.g}/${y.g}.${c}: ${ma[c]} ≠ ${mb[c]}`);
            }
        }
        for (const q of ['n', 'j']) {
            const a = js.yaw && js.yaw[q] ? js.yaw[q](t) : 0, b = d.yaw && d.yaw[q] ? d.yaw[q](t) : 0;
            if (!cerca(a, b)) malo(`t=${t.toFixed(3)} yaw ${q}: ${a} ≠ ${b}`);
        }
        // Lo que hacía el extra del JS, contra catálogo + código
        const e0 = A.efectos.length, s0 = A.estado.sonidos, ec0 = B.efectos.length, sc0 = B.estado.sonidos;
        if (js.extra && js.extra.cuadro) js.extra.cuadro(A.api);
        if (extraD && extraD.cuadro) extraD.cuadro(B.api);
        const evEf = eventosEn(d.efectos, t0, t, hechos, 'e'), evSo = eventosEn(d.sonidos, t0, t, hechos, 's');
        for (const i of evEf) {
            const [, tipo, op = {}] = d.efectos[i], N = op.n ?? 1;
            let b;
            if (op.en && typeof op.en === 'object') b = A.api.punta(A.api.actor(op.en.q), op.en.mano === 'I' ? 'I' : 'D', new THREE.Vector3());
            else { const pa = A.api.posG('n'), pj = A.api.posG('j'); b = { x: (pa.x + pj.x) / 2, y: Math.max(pa.y, pj.y), z: (pa.z + pj.z) / 2 }; }
            const mas = op.mas || [0, 0, 0], y = b.y + (op.alto ?? (op.en && typeof op.en === 'object' ? 0 : 1.8)) + mas[1];
            for (let k = 0; k < N; k++) catEf.push({ tipo: tipo === 'chispa' ? 'chispa' : tipo, x: b.x + mas[0] + (k - (N - 1) / 2) * 0.3, y: y + k * 0.12, z: b.z + mas[2], tam: op.tam ?? null, vida: op.vida ?? null });
        }
        sJS += A.estado.sonidos - s0; sD += evSo.length + (B.estado.sonidos - sc0);
        efJS += A.efectos.length - e0; efD += evEf.length + (B.efectos.length - ec0);
        peorS = Math.max(peorS, Math.abs(sJS - sD)); peorE = Math.max(peorE, Math.abs(efJS - efD));
        // Objetos visibles: catálogo + código contra los del JS
        const visJS = A.registro.filter(o => o.visible).length;
        const visD = (d.objetos || []).filter(o => objetoEn(o, t).visible).length + B.registro.filter(o => o.visible).length;
        if (A.registro.length && visJS !== visD) malo(`t=${t.toFixed(3)} objetos visibles ${visJS} ≠ ${visD}`);
        // Los que corre el código: igual visibilidad, opacidad y matriz de mundo
        parejas.forEach((o, i) => {
            const p = B.registro[i];
            if (!p) return;
            o.updateMatrixWorld(true); p.updateMatrixWorld(true);
            if (o.visible !== p.visible) malo(`t=${t.toFixed(3)} objeto ${i}: visible ${o.visible} ≠ ${p.visible}`);
            else if (o.visible && !mismaMatriz(o, p)) malo(`t=${t.toFixed(3)} objeto ${i}: matriz distinta`);
            if (o.material && p.material && !cerca(o.material.opacity, p.material.opacity)) malo(`t=${t.toFixed(3)} objeto ${i}: opacidad`);
        });
        t0 = t;
    }
    if (js.extra && js.extra.terminar) js.extra.terminar(A.api);
    if (extraD && extraD.terminar) extraD.terminar(B.api);
    ok(sJS === sD && peorS <= 1, `${nombre}: los mismos sonidos (${sJS} / ${sD}, desfase máximo ${peorS})`);
    ok(efJS === efD && peorE <= 1, `${nombre}: las mismas chispas (${efJS} / ${efD}, desfase máximo ${peorE})`);
    // Dónde salen: las del catálogo + las del código, contra las del JS (sin ordenar por tiempo)
    const clave = e => [e.tipo, e.x.toFixed(6), e.y.toFixed(6), e.z.toFixed(6), e.tam, e.vida].join('|');
    const delJS = A.efectos.map(clave).sort(), delD = [...catEf, ...B.efectos].map(clave).sort();
    ok(JSON.stringify(delJS) === JSON.stringify(delD), `${nombre}: las chispas salen en los mismos puntos` + (JSON.stringify(delJS) === JSON.stringify(delD) ? '' : `\n    JS: ${delJS.slice(0, 3)}\n    datos: ${delD.slice(0, 3)}`));
    ok(malos === 0, `${nombre}: mismo cuadro que el JS cada 1/120 s`);
}
console.log(`escenas-momentos: ${pruebas - fallos}/${pruebas} bien (${cuadros} cuadros)`);
if (fallos) process.exit(1);
