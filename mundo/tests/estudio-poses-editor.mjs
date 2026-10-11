// Prueba del Estudio, fase 6b (editor de poses): node mundo/tests/estudio-poses-editor.mjs
// El modelo puro de la pestaña Poses (estudio/poses-modelo.mjs): lectura, slider, claves (agregar, mover con topes,
// borrar), interpolación, osciladores, variantes, reloj y ciclo, entradas nuevas, lista con lo «en código», instante y
// muestras (iguales al evaluador del juego), la punta de la mano contra la tabla de rig.md, que mover una clave cambia
// una sola línea del JSON formateado y que todo resultado sigue siendo válido (esquema y reglasPoses). Y el mensaje
// `pose` del puente (protocolo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatear } from '../../estudio/formato.mjs';
import { validar } from '../../estudio/validar.mjs';
import { evaluarGesto, reglasPoses } from '../datos/gestos.js';
import * as M from '../../estudio/poses-modelo.mjs';
import { crearManejador, CANALES_POSE } from '../../estudio/puente-protocolo.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const cerca = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const crudo = fs.readFileSync(path.join(RAIZ, 'mundo', 'datos', 'poses.json'), 'utf8').replace(/\r\n/g, '\n');
const datos = JSON.parse(crudo);
const congelado = JSON.stringify(datos);
const valido = (d, msg) => {
    const e = validar(d, 'poses');
    ok(!e.length, `${msg}: esquema ${e.slice(0, 2).join(' · ')}`);
    const r = reglasPoses(d).filter(x => x.tipo === 'error');
    ok(!r.length, `${msg}: reglas ${r.map(x => x.texto).join(' · ')}`);
};

// ---------- Canales ----------
ok(M.NOMBRES_CANAL.length === 14 && M.NOMBRES_CANAL.join() === CANALES_POSE.join(), 'los 14 canales, iguales a los del puente');
const esquema = JSON.parse(fs.readFileSync(path.join(RAIZ, 'estudio', 'esquemas', 'poses.schema.json'), 'utf8'));
ok(esquema.$defs.nombreCanal.enum.join() === M.NOMBRES_CANAL.join(), 'los canales son los del esquema, en su orden');
ok(M.RANGO.bDx[0] === -2.9 && M.RANGO.bDx[1] === 0.6 && M.RANGO.cx[0] === -0.45 && M.RANGO.inc[1] === 0.7, 'rangos de rig.md');
ok(M.rangoDe('bDx', -3.2)[0] === -3.2, 'el rango se ensancha si el archivo trae algo fuera');

// ---------- Lectura ----------
const G = c => ({ tipo: 'gesto', clave: c });
const P = c => ({ tipo: 'pose', clave: c });
ok(M.tipoCanal(M.canalDe(datos, G('habla'), 'bDx')) === 'base', 'habla.bDx: base + osc');
ok(M.tipoCanal(M.canalDe(datos, G('habla'), 'bIz')) === 'fijo', 'habla.bIz: fijo');
ok(M.tipoCanal(M.canalDe(datos, G('habla'), 'pDx')) === 'ninguno', 'habla.pDx: ninguno');
ok(M.valorSlider(M.canalDe(datos, G('habla'), 'bDx')) === -0.9, 'slider de una base');
const conK = Object.entries(datos.gestos).find(([, g]) => Object.values(g.canales).some(v => v && v.k));
ok(conK, 'poses.json tiene algún gesto con claves k');
const [gk, defK] = conK;
const ck = Object.keys(defK.canales).find(c => defK.canales[c] && defK.canales[c].k);
ok(M.tipoCanal(defK.canales[ck]) === 'claves', 'canal con claves');

// ---------- Lista ----------
const codigo = new Map([['habla', 'skin'], ['baile', 'skin'], ['cabecea', 'skin'], ['puno', 'amistad']]);
const ent = M.entradas(datos, codigo);
ok(ent.filter(e => e.tipo === 'gesto').length === Object.keys(datos.gestos).length, 'todos los gestos del JSON');
ok(ent.filter(e => e.tipo === 'pose').length === Object.keys(datos.poses).length, 'todas las poses del JSON');
ok(ent.find(e => e.clave === 'habla').reemplaza === true, 'habla reemplaza al del código');
ok(ent.filter(e => e.origen === 'codigo').map(e => e.clave).sort().join() === 'baile,cabecea', 'en código: solo los que el JSON no trae');

// ---------- Instante y muestras = evaluador del juego ----------
for (const [k, def] of Object.entries(datos.gestos)) {
    for (const [s, j] of [[false, false], [true, false], [false, true]]) {
        for (const t of [0, 0.37, 1.2, 2.9]) {
            const T = 3, u = t / T;
            const a = M.instante(datos, G(k), t, T, { s, j });
            const b = evaluarGesto(def, u, t, { s, j, d: T }, {});
            for (const c of Object.keys(b)) ok(a[c] === b[c], `instante ${k}.${c} t=${t} s=${s} j=${j}`);
            ok(Object.keys(a).length === 14, `instante trae los 14 canales (${k})`);
        }
    }
}
const pi = M.instante(datos, P('doblarse'), 5);
ok(pi.inc === 0.6 && pi.cy === 0, 'instante de una pose: sus canales y el resto neutral');
const mu = M.muestras(datos, G('habla'), 'bDx', 30, 3);
ok(mu.length === 31 && mu[0][0] === 0 && cerca(mu[30][0], 3), 'muestras de reloj t: de 0 a T');
ok(mu.every(([x, v]) => cerca(v, -0.9 + 0.3 * Math.sin(x * 5))), 'muestras de habla.bDx = base + osc');
ok(M.rangoReloj({ reloj: 'u', canales: {} })[1] === 1 && M.rangoReloj({ reloj: 't', ciclo: 0.8, canales: {} })[1] === 0.8, 'rango del reloj (u, ciclo)');
ok(M.tDeX({ reloj: 'u' }, 0.5, 4) === 2 && M.xDeT({ reloj: 'u' }, 2, 4) === 0.5 && M.tDeX({ reloj: 't' }, 0.5, 4) === 0.5, 'tDeX y xDeT');

ok(M.xActual({ reloj: 'u' }, 1.5, 3) === 0.5 && cerca(M.xActual({ reloj: 't', ciclo: 0.8 }, 1.0, 3), 0.2), 'xActual (u y ciclo)');
ok(M.valorClaves({ k: [[0, 0], [1, 1]], interp: 'lineal', osc: [{ forma: 'sin', amp: 9, frec: 1 }] }, 0.25) === 0.25 && M.valorClaves(-0.3, 5) === -0.3 && M.valorClaves({ base: 0.2 }, 1) === 0.2, 'valorClaves sin osciladores');

// ---------- Slider ----------
let r = M.ponerValor(datos, G('habla'), 'bDx', -1.23456);
ok(r.cambio && r.datos.gestos.habla.canales.bDx.base === -1.235 && r.datos.gestos.habla.canales.bDx.osc.length === 1, 'slider sobre una base: cambia la base y conserva el osc');
ok(JSON.stringify(datos) === congelado, 'los datos de entrada no se tocan');
r = M.ponerValor(datos, G('habla'), 'pDx', -0.4);
ok(r.datos.gestos.habla.canales.pDx === -0.4, 'slider sobre un canal ausente: número');
r = M.ponerValor(datos, P('doblarse'), 'inc', 0.65);
ok(r.datos.poses.doblarse.canales.inc === 0.65, 'slider de pose');
ok(!M.ponerValor(datos, P('doblarse'), 'inc', 0.6).cambio, 'mismo valor: sin cambio');
ok(!M.ponerValor(datos, P('doblarse'), 'zz', 1).cambio && !M.ponerValor(datos, P('doblarse'), 'inc', NaN).cambio, 'canal o valor inválido: sin cambio');
r = M.ponerValor(datos, G(gk), ck, 0.111, 1);
ok(r.i === 1 && r.datos.gestos[gk].canales[ck].k[1][1] === 0.111 && r.datos.gestos[gk].canales[ck].k[1][0] === defK.canales[ck].k[1][0], 'slider sobre claves: cambia el valor de la clave elegida');
r = M.quitarCanal(datos, G('habla'), 'cx');
ok(r.cambio && !('cx' in r.datos.gestos.habla.canales), 'quitar canal');

// ---------- Claves ----------
r = M.agregarClave(datos, G('habla'), 'bIz', 0.5, -0.4);
ok(JSON.stringify(r.datos.gestos.habla.canales.bIz) === JSON.stringify({ k: [[0, -0.15], [0.5, -0.4]] }) && r.i === 1, 'agregar clave a un fijo: [0, previo] + nueva');
r = M.agregarClave(datos, G('habla'), 'bDx', 1, -1.2);
ok(JSON.stringify(Object.keys(r.datos.gestos.habla.canales.bDx)) === '["k","osc"]' && r.datos.gestos.habla.canales.bDx.k.length === 2, 'agregar clave a una base con osc: k primero, osc se queda');
ok(!M.agregarClave(datos, P('doblarse'), 'inc', 1, 0).cambio, 'una pose no tiene claves');
const k0 = defK.canales[ck].k;
r = M.agregarClave(datos, G(gk), ck, k0[0][0], 0.42);
ok(r.datos.gestos[gk].canales[ck].k.length === k0.length && r.datos.gestos[gk].canales[ck].k[0][1] === 0.42, 'clave en un tiempo que ya existe: cambia su valor');
const medio = (k0[0][0] + k0[1][0]) / 2;
r = M.agregarClave(datos, G(gk), ck, medio, 0.3);
ok(r.i === 1 && r.datos.gestos[gk].canales[ck].k.length === k0.length + 1, 'clave nueva entre dos: en orden');
valido(r.datos, 'agregar clave');
// mover: encaja y se detiene a un paso de la vecina
const p = M.pasoReloj(defK);
r = M.moverClave(datos, G(gk), ck, 0, 999, 0.2);
if (k0.length > 1) ok(cerca(r.datos.gestos[gk].canales[ck].k[0][0], k0[1][0] - p, 1e-9), 'mover clave: tope contra la vecina');
r = M.moverClave(datos, G(gk), ck, k0.length - 1, -999);
ok(cerca(r.datos.gestos[gk].canales[ck].k[k0.length - 1][0], k0.length > 1 ? k0[k0.length - 2][0] + p : 0), 'mover la última hacia atrás: tope');
valido(r.datos, 'mover clave');
r = M.moverClave(datos, G(gk), ck, 0, k0[0][0], k0[0][1]);
ok(!r.cambio, 'mover a donde estaba: sin cambio');
// una línea
const mov = M.moverClave(datos, G(gk), ck, 0, k0[0][0], k0[0][1] + 0.05);
const a1 = formatear(datos).split('\n'), a2 = formatear(mov.datos).split('\n');
ok(a1.length === a2.length && a1.filter((l, i) => l !== a2[i]).length === 1, 'mover una clave cambia una sola línea del JSON');
ok(formatear(datos) === crudo, 'poses.json ya está en formato estable');
// borrar
let d = M.agregarClave(datos, G('habla'), 'bIz', 0.5, -0.4).datos;
d = M.borrarClave(d, G('habla'), 'bIz', 1).datos;
d = M.borrarClave(d, G('habla'), 'bIz', 0).datos;
ok(d.gestos.habla.canales.bIz === -0.15, 'borrar las claves vuelve a un número');
d = M.agregarClave(datos, G('habla'), 'bDx', 1, -1.2).datos;
d = M.borrarClave(d, G('habla'), 'bDx', 1).datos;
d = M.borrarClave(d, G('habla'), 'bDx', 0).datos;
ok(JSON.stringify(d.gestos.habla.canales.bDx) === JSON.stringify({ base: -0.9, osc: datos.gestos.habla.canales.bDx.osc }), 'borrar las claves con osc deja base + osc');
r = M.cambiarInterp(datos, G(gk), ck, 'lineal');
ok(r.datos.gestos[gk].canales[ck].interp === 'lineal', 'interp lineal');
ok(!('interp' in M.cambiarInterp(r.datos, G(gk), ck, 'suave').datos.gestos[gk].canales[ck]), 'suave se escribe sin interp (es el valor por defecto)');

// ---------- Osciladores ----------
r = M.agregarOsc(datos, G('habla'), 'bIz');
ok(JSON.stringify(r.datos.gestos.habla.canales.bIz) === JSON.stringify({ base: -0.15, osc: [{ forma: 'sin', amp: 0.1, frec: 5 }] }), 'agregar osc a un fijo');
r = M.cambiarOsc(r.datos, G('habla'), 'bIz', 0, { forma: 'pos', amp: 0.25, fase: 1.5, env: [0.2, 0.8] });
ok(JSON.stringify(r.datos.gestos.habla.canales.bIz.osc[0]) === JSON.stringify({ forma: 'pos', amp: 0.25, frec: 5, fase: 1.5, env: [0.2, 0.8] }), 'cambiar osc: orden estable de campos');
valido(r.datos, 'osc');
r = M.cambiarOsc(r.datos, G('habla'), 'bIz', 0, { fase: 0, env: null });
ok(!('fase' in r.datos.gestos.habla.canales.bIz.osc[0]) && !('env' in r.datos.gestos.habla.canales.bIz.osc[0]), 'fase 0 y env null se quitan');
r = M.borrarOsc(r.datos, G('habla'), 'bIz', 0);
ok(r.datos.gestos.habla.canales.bIz === -0.15, 'borrar el único osc vuelve a número');
r = M.cambiarOsc(datos, G('habla'), 'bIz', 0, { amp: 1 });
ok(!r.cambio, 'osc que no existe: sin cambio');

// ---------- Variantes ----------
const SV = { tipo: 'gesto', clave: 'habla', variante: 'sentado' };
r = M.ponerValor(datos, SV, 'bDx', -0.5);
ok(r.datos.gestos.habla.variantes.sentado.bDx === -0.5, 'variante sentado');
ok(M.instante(r.datos, G('habla'), 1, 3, { s: true }).bDx === -0.5, 'la variante reemplaza el canal sentado');
ok(M.instante(r.datos, G('habla'), 1, 3, { s: false }).bDx !== -0.5, 'de pie sigue el de siempre');
ok(Object.keys(M.canalesDe(datos, SV)).length === 0, 'variante vacía: {}');
r = M.quitarCanal(r.datos, SV, 'bDx');
ok(!('variantes' in r.datos.gestos.habla), 'quitar el último canal de una variante borra variantes');
valido(M.ponerValor(datos, { ...SV, variante: 'jugador' }, 'cy', 0.3).datos, 'variante jugador');

// ---------- Reloj, ciclo, nota ----------
r = M.cambiarReloj(datos, 'habla', 'u');
ok(r.datos.gestos.habla.reloj === 'u' && !M.cambiarReloj(datos, 'habla', 'x').cambio, 'reloj');
ok(M.pasoReloj(r.datos.gestos.habla) === 0.01 && M.pasoReloj(datos.gestos.habla) === 0.05, 'paso del reloj');
r = M.cambiarCiclo(datos, 'habla', 0.8);
ok(r.datos.gestos.habla.ciclo === 0.8 && !('ciclo' in M.cambiarCiclo(r.datos, 'habla', null).datos.gestos.habla), 'ciclo y sin ciclo');
r = M.cambiarNota(datos, G('habla'), '  probando ');
ok(r.datos.gestos.habla.nota === 'probando', 'nota');

// ---------- Entradas nuevas ----------
ok(M.claveLibre(datos, 'habla') === 'habla2' && M.claveLibre(datos, 'nuevo', new Set(['nuevo'])) === 'nuevo2', 'clave libre');
ok(!M.claveValida('Mala clave') && M.claveValida('poseNueva'), 'clave válida');
r = M.nuevaPose(datos, 'saludo', { ...M.NEUTRAL, bDx: -2.5, bDz: -0.3 });
ok(JSON.stringify(r.datos.poses.saludo) === JSON.stringify({ canales: { bDx: -2.5, bDz: -0.3 } }), 'pose nueva: solo lo que no es neutral');
ok(!M.nuevaPose(datos, 'doblarse').cambio, 'pose con nombre usado: no');
r = M.nuevoGesto(r.datos, 'agita', { bDx: -2.5 });
ok(r.datos.gestos.agita.reloj === 'u' && r.datos.gestos.agita.canales.bDx === -2.5, 'gesto nuevo');
valido(r.datos, 'entradas nuevas');
ok(M.cambios(datos, r.datos).join() === 'poses.saludo,gestos.agita', 'cambios');
r = M.borrarEntrada(r.datos, 'pose', 'saludo');
ok(!r.datos.poses.saludo && M.cambios(datos, r.datos).join() === 'gestos.agita', 'borrar entrada');

// ---------- Sentado y grabación ----------
ok(M.instante(datos, G('habla'), 1, 3, { s: true }).pDx === -1.5 && M.instante(datos, G('habla'), 1, 3, {}).pDx === 0, 'sentado: piernas de silla bajo el gesto');
ok(M.instante(datos, P('doblarse'), 1, 3, { s: true }).pDx === -0.6, 'una pose no cambia sentada');
ok(M.CANAL_HUESO.brazoD.x === 'bDx' && M.CANAL_HUESO.cuerpo.z === 'rz', 'hueso -> canal');
const muestrasG = []; for (let x = 0.5; x <= 1.5001; x += 0.02) muestrasG.push([x, -x]);
r = M.grabarClaves(datos, G('habla'), 'bIz', muestrasG);
let kk = r.datos.gestos.habla.canales.bIz.k;
ok(kk[0][0] === 0 && kk[0][1] === -0.15 && kk[1][0] === 0.5 && kk[kk.length - 1][0] === 1.5 && kk[kk.length - 1][1] === -1.5, 'grabar sobre un fijo: [0, previo] + muestras: ' + JSON.stringify(kk.slice(0, 3)));
ok(kk.every((q, i) => !i || q[0] > kk[i - 1][0]) && kk.length === 12, 'grabación ordenada, una clave cada 0,1 s: ' + kk.length);
valido(r.datos, 'grabar');
const r2 = M.grabarClaves(r.datos, G('habla'), 'bIz', [[0.8, 1], [0.9, 1], [1.0, 1]]);
kk = r2.datos.gestos.habla.canales.bIz.k;
ok(kk.filter(q => q[1] === 1).length === 3 && kk.some(q => q[0] === 0.5) && kk.some(q => q[0] === 1.5) && !kk.some(q => q[0] === 0.8 && q[1] !== 1), 'regrabar un tramo deja lo de antes y después');
r = M.grabarClaves(datos, G('habla'), 'bDx', [[0, -1], [0.3, -2]]);
ok(r.datos.gestos.habla.canales.bDx.osc.length === 1 && r.datos.gestos.habla.canales.bDx.k[0][0] === 0, 'grabar conserva los osciladores');
ok(!M.grabarClaves(datos, P('doblarse'), 'inc', [[0, 1]]).cambio, 'una pose no se graba');

// ---------- Medir: tabla de rig.md (inc 0) ----------
for (const [a, adelante, altura] of [[-0.4, 0.29, 0.81], [-0.8, 0.54, 0.98], [-1.2, 0.70, 1.23], [-1.6, 0.75, 1.52], [-2.0, 0.68, 1.81]]) {
    const m = M.puntaMano({ bDx: a });
    ok(cerca(m.adelante, adelante, 0.006) && cerca(m.altura, altura, 0.006) && m.lado === -0.375, `mano con bDx ${a}: ${m.adelante}/${m.altura}`);
}
const mi = M.puntaMano({ bIx: -1.6 }, 'I');
ok(mi.lado === 0.375 && mi.adelante === M.puntaMano({ bDx: -1.6 }).adelante, 'mano izquierda: espejo');
ok(M.puntaMano({ bDz: 0.5 }).lado > -0.375 && M.puntaMano({ bIz: 0.5 }, 'I').lado > 0.375, 'bDz + al pecho, bIz + afuera');
ok(cerca(M.puntaMano({ inc: 0.3 }).adelante, 0.75 * Math.sin(0.3), 1e-3), 'inc lleva la mano adelante');
ok(M.puntaMano({ y: 0.2, salto: 0.1, pz: 0.3 }).altura === 0.75 + 0.3 && M.puntaMano({ pz: 0.3 }).adelante === 0.3, 'y, salto y pz');

// ---------- Puente: pose ----------
const llamadas = [];
const responder = crearManejador({ idioma: () => 'es', aplicarDatos() {}, pose: o => { llamadas.push(o); return { quieta: o.canales !== null }; } });
const enviar = m => responder({ de: 'estudio', id: 1, ...m });
let resp = await enviar({ tipo: 'pose', clave: 'andy', canales: { bDx: -1.5, inc: 0.2 } });
ok(resp.tipo === 'ok' && resp.pose.quieta && llamadas[0].canales.bDx === -1.5, 'pose ok');
resp = await enviar({ tipo: 'pose', clave: 'andy', canales: null });
ok(resp.tipo === 'ok' && llamadas[1].canales === null, 'pose null suelta');
ok((await enviar({ tipo: 'pose', clave: 'andy', canales: { zz: 1 } })).tipo === 'error', 'canal desconocido');
ok((await enviar({ tipo: 'pose', clave: 'andy', canales: { bDx: 'a' } })).tipo === 'error', 'canal no numérico');
ok((await enviar({ tipo: 'pose', clave: '', canales: {} })).tipo === 'error', 'clave inválida');
ok((await enviar({ tipo: 'pose', clave: 'andy', canales: [1] })).tipo === 'error', 'canales no objeto');
ok((await crearManejador({ idioma: () => 'es', aplicarDatos() {} })({ de: 'estudio', tipo: 'pose', clave: 'andy', canales: {} })).tipo === 'error', 'juego sin pose: error');

console.log(fallos ? `estudio-poses-editor: ${fallos} falla(s)` : 'estudio-poses-editor: todo bien');
process.exit(fallos ? 1 : 0);
