// Prueba de la música como datos: node mundo/tests/musica.mjs
// Formato de mundo/datos/musica.json (esquema y revisión), motor (acordes, capas, sintetizadores propios, secuenciador),
// que los temas de la carrera suenen igual como JSON, qué tema usa el juego (borradores no) y el mensaje `musica` del puente.
// Cómo suena de verdad lo prueba el dueño en la pestaña Música.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validar } from '../../estudio/validar.mjs';
import { crearManejador } from '../../estudio/puente-protocolo.js';
import * as MO from '../supervivencia/musica-motor.js';
import { I } from '../supervivencia/musica-instrumentos.js';
import { TEMAS_CARRERA, LISTA_TEMAS } from '../supervivencia/carrera-musica-datos.js';
import { aplicarMusica, temaMusica, instrumentosPropios, enPrueba, ponerPrueba } from '../supervivencia/musica-datos.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'mundo', 'datos', 'musica.json'), 'utf8'));
const clon = o => JSON.parse(JSON.stringify(o));

// ---------- WebAudio de mentira: cuenta nodos y revisa que las rampas tengan valores válidos ----------
function ctxFalso() {
    const cuenta = { osc: 0, ruido: 0, filtro: 0, gain: 0 };
    const param = v => ({
        value: v,
        setValueAtTime(x, t) { ok(Number.isFinite(x) && Number.isFinite(t), 'setValueAtTime con NaN'); this.value = x; },
        linearRampToValueAtTime(x, t) { ok(Number.isFinite(x) && Number.isFinite(t), 'rampa lineal con NaN'); },
        exponentialRampToValueAtTime(x, t) { ok(x > 0 && Number.isFinite(t), `rampa exponencial a ${x}`); },
        setTargetAtTime() {}
    });
    const nodo = extra => ({ connect: d => d, ...extra });
    return {
        cuenta, currentTime: 0, sampleRate: 8000, state: 'running',
        createGain() { cuenta.gain++; return nodo({ gain: param(1) }); },
        createOscillator() { cuenta.osc++; return nodo({ type: 'sine', frequency: param(440), detune: param(0), start() {}, stop() {} }); },
        createBiquadFilter() { cuenta.filtro++; return nodo({ type: 'lowpass', frequency: param(350), Q: param(1) }); },
        createBufferSource() { cuenta.ruido++; return nodo({ buffer: null, start() {} }); },
        createBuffer(c, n, sr) { return { sampleRate: sr, getChannelData: () => new Float32Array(n) }; }
    };
}

// ---------- 1. Esquema ----------
ok(validar(DATOS, 'musica').length === 0, 'musica.json no cumple su esquema: ' + validar(DATOS, 'musica').slice(0, 2).join(' · '));
const malo = (cambia, quiere) => {
    const d = clon(DATOS); cambia(d);
    const e = validar(d, 'musica');
    ok(e.length > 0 && e.some(x => x.includes(quiere)), `el esquema debía rechazar ${quiere} (salió ${JSON.stringify(e)})`);
};
malo(d => { d.instrumentos.campana.onda = 'cuadrada'; }, 'cuadrada');
malo(d => { d.temas.ejemplo.capas[1].ritmo = 'x..y'; }, 'ritmo');
malo(d => { d.temas.ejemplo.bpm = 5; }, 'bpm');
malo(d => { d.temas.ejemplo.capas[0].sonido = 1; }, 'sonido');
malo(d => { d.temas['Mal Nombre'] = clon(d.temas.ejemplo); }, 'Mal Nombre');
// Los temas de la carrera, tal cual, también cumplen el esquema (así el Estudio puede copiarlos al JSON)
for (const [k, def] of Object.entries(TEMAS_CARRERA)) {
    const e = validar({ version: 1, temas: { [k]: clon(def) } }, 'musica');
    ok(e.length === 0, `el tema ${k} de la carrera no cabe en el esquema: ${e.slice(0, 2).join(' · ')}`);
}

// ---------- 2. Revisión de temas ----------
for (const [k, def] of Object.entries(DATOS.temas)) ok(MO.revisarTema(def, DATOS.instrumentos).length === 0, `musica.json → ${k}: ${MO.revisarTema(def, DATOS.instrumentos)}`);
for (const [k, def] of Object.entries(TEMAS_CARRERA)) ok(MO.revisarTema(def).length === 0, `carrera → ${k}: ${MO.revisarTema(def)}`);
const revisa = (cambia, quiere) => {
    const d = clon(DATOS.temas.ejemplo); cambia(d);
    const e = MO.revisarTema(d, DATOS.instrumentos);
    ok(e.some(x => x.includes(quiere)), `revisarTema debía avisar «${quiere}» (salió ${JSON.stringify(e)})`);
};
revisa(d => { d.capas[0].inst = 'tuba'; }, 'instrumento desconocido');
revisa(d => { d.prog[1] = 'Hm'; }, 'acorde desconocido');
revisa(d => { d.capas[1].ritmo = 'x.......x.'; }, 'dura 10 pasos');
revisa(d => { d.capas[2].notas = [60, 0, 0, 0]; }, 'un solo tipo');
ok(MO.revisarTema(DATOS.temas.ejemplo, {}).some(x => x.includes('campana')), 'sin sus instrumentos, campana es desconocido');

// ---------- 3. Acordes ----------
ok(JSON.stringify(MO.acordeDe('Am')) === '[45,48,52]', 'Am sale de AC');
ok(JSON.stringify(MO.acordeDe('F#m7')) === '[42,45,49,52]', 'F#m7 armado: ' + MO.acordeDe('F#m7'));
ok(JSON.stringify(MO.acordeDe('Bbmaj7')) === '[46,50,53,57]', 'Bbmaj7 armado: ' + MO.acordeDe('Bbmaj7'));
ok(JSON.stringify(MO.acordeDe('Dsus4')) === '[50,55,57]', 'Dsus4 armado: ' + MO.acordeDe('Dsus4'));
ok(MO.acordeDe('Hm') === null && MO.acordeDe('Cxyz') === null, 'nombres raros dan null');
ok(JSON.stringify(MO.acordeDe('Am', { Am: [57, 60, 64] })) === '[57,60,64]', 'los acordes del tema mandan');
for (const r of MO.RAICES) for (const q of Object.keys(MO.CALIDADES)) {
    const a = MO.acordeDe(r + q);
    ok(a && a.every(m => m >= 35 && m <= 70), `acorde ${r + q}: ${a}`);
}
ok(JSON.stringify(MO.acordeEn({ prog: ['C', 'G'], progs: { noche: ['Am'] }, acordePor: 2 }, 2, 'dia')) === JSON.stringify(MO.acordeDe('G')), 'acordePor 2: compás 2 es el segundo acorde');
ok(JSON.stringify(MO.acordeEn({ prog: ['C', 'G'], progs: { noche: ['Am'] } }, 1, 'noche')) === JSON.stringify(MO.acordeDe('Am')), 'progs por nivel');

// ---------- 4. Los temas de la carrera suenan igual leídos como JSON, y cada instrumento del código existe ----------
{
    const traza = [];
    const P = new Proxy({}, { get: (_, inst) => (...a) => traza.push(JSON.stringify([inst, ...a.slice(2)])) });
    const tocar = def => { traza.length = 0; for (const nivel of MO.USOS.carrera.niveles) for (let k = 0; k < 8; k++) for (let i = 0; i < 16; i++) MO.tocarPaso(P, def, null, null, k * 16 + i, i, k, 0.1, nivel); return traza.join('\n'); };
    for (const [k, def] of Object.entries(TEMAS_CARRERA)) ok(tocar(def) === tocar(clon(def)), `${k}: como JSON suena distinto`);
    ok(JSON.stringify(LISTA_TEMAS) === JSON.stringify(MO.USOS.carrera.temas), 'USOS.carrera.temas no coincide con carrera-musica-datos.js');
    for (const n of MO.INSTRUMENTOS) ok(typeof I[n] === 'function' || ['platillo', 'cajaGrande'].includes(n), `instrumento ${n} no está en musica-instrumentos.js`);
}
// USOS.mundo: las claves, bpm, pasos y vol de los temas de musica.js
{
    const src = fs.readFileSync(path.join(RAIZ, 'mundo', 'supervivencia', 'musica.js'), 'utf8');
    const vistos = [...src.matchAll(/^ {4}(\w+): \{(?: \/\/.*)?\n {8}bpm: (\d+), pasos: (\d+), vol: ([\d.]+),/gm)].map(m => [m[1], { bpm: +m[2], pasos: +m[3], vol: +m[4] }]);
    ok(JSON.stringify(Object.fromEntries(vistos)) === JSON.stringify(MO.USOS.mundo.temas), 'USOS.mundo no coincide con TEMAS de musica.js: ' + JSON.stringify(vistos.map(v => v[0])));
}

// ---------- 5. Capas: niveles, segunda vuelta, mudo, probabilidad, swing, pasos de 12 ----------
{
    const golpes = [];
    const P = new Proxy({}, { get: (_, inst) => (c, o, t, a) => golpes.push([inst, t, a]) });
    const def = { bpm: 120, pasos: 12, prog: ['C'], swing: 0.5, capas: [
        { inst: 'kick', ritmo: 'x.x.x.x.x.x.', vol: 1, niveles: ['noche'] },
        { inst: 'hat', ritmo: 'xxxxxxxxxxxx', vol: 1, prob: 0.5 },
        { inst: 'caja', ritmo: 'x...........', vol: 1, segunda: true },
        { inst: 'madera', ritmo: 'xxxxxxxxxxxx', vol: 1, mudo: true }
    ] };
    let n = 0; const azar = () => (n++ % 2 ? 0.9 : 0.1);
    for (let k = 0; k < 8; k++) for (let i = 0; i < 12; i++) MO.tocarPaso(P, def, null, null, 0, i, k, 1, 'dia', null, azar);
    const de = x => golpes.filter(g => g[0] === x);
    ok(de('kick').length === 0, 'el bombo es solo de noche');
    ok(de('hat').length === 48, `prob 0,5 con azar alterno: 48 de 96 (salieron ${de('hat').length})`);
    ok(de('caja').length === 4, `segunda: solo los compases 4 a 7 (salieron ${de('caja').length})`);
    ok(de('madera').length === 0, 'una capa muda no suena');
    ok(de('hat').every(g => g[1] === 0 || g[1] === 0.5), 'swing: los impares se atrasan medio paso');
}

// ---------- 6. Sintetizadores propios y los del código, con WebAudio de mentira ----------
{
    const c = ctxFalso();
    MO.tocarSinte(c, {}, 0, DATOS.instrumentos.campana, 60, 0.2, 0.5);
    ok(c.cuenta.osc === 3, `campana: 1 voz + 2 armónicos (salieron ${c.cuenta.osc})`);
    const c2 = ctxFalso();
    MO.tocarSinte(c2, {}, 0, { onda: 'sawtooth', voces: 3, desafino: 12, filtro: { tipo: 'lowpass', frec: 800, hasta: 200, q: 4 }, vibrato: { frec: 5, cents: 20 }, tono: { desde: 12, tiempo: 0.05 }, curva: 'lineal' }, 48, 0.5, 0.3);
    ok(c2.cuenta.osc === 6 && c2.cuenta.filtro === 1, `3 voces con vibrato (6 osciladores) y un filtro (salieron ${c2.cuenta.osc}, ${c2.cuenta.filtro})`);
    const c3 = ctxFalso();
    MO.tocarSinte(c3, {}, 0, { onda: 'ruido', filtro: { tipo: 'highpass', frec: 6000 } }, 60, 0.1, 0.4);
    ok(c3.cuenta.ruido === 1 && c3.cuenta.osc === 0, 'onda ruido usa ruido, sin osciladores');
    MO.tocarSinte(ctxFalso(), {}, 0, { vol: 0 }, 60, 0.1, 0); // volumen 0 no rompe la rampa exponencial
    // Una capa de ritmo con un instrumento propio suena en su `golpe`
    const c4 = ctxFalso();
    MO.tocarPaso(I, { bpm: 120, prog: ['C'], capas: [{ inst: 'zap', ritmo: 'x...', vol: 1 }] }, c4, {}, 0, 0, 0, 0.1, 'x', { zap: { onda: 'square', golpe: 72 } });
    ok(c4.cuenta.osc === 1, 'ritmo con instrumento propio');
    // Todos los instrumentos del código con el tema de ejemplo de cada tipo
    const c5 = ctxFalso();
    for (const [k, def] of Object.entries(TEMAS_CARRERA)) for (let i = 0; i < 16; i++) MO.tocarPaso(I, def, c5, {}, 0, i, 4, 0.1, 'ultima');
    ok(c5.cuenta.osc > 50 && c5.cuenta.ruido > 20, `los temas de la carrera crean nodos (osc ${c5.cuenta.osc}, ruido ${c5.cuenta.ruido})`);
    MO.tocarPaso(I, { bpm: 90, prog: ['C'], capas: [{ inst: 'colchon', rel: [0, null, null, null], vol: 0.2 }] }, c5, {}, 0, 0, 0, 0.1, 'x'); // colchon con una nota suelta
}

// ---------- 7. Secuenciador ----------
{
    const c = ctxFalso(), sec = MO.crearSecuenciador();
    const golpes = [];
    const P = new Proxy({}, { get: () => (c, o, t) => golpes.push(t) });
    const def = { bpm: 120, prog: ['C'], capas: [{ inst: 'kick', ritmo: 'xxxxxxxxxxxxxxxx', vol: 1 }] };
    for (let t = 0; t <= 1.001; t += 0.05) { c.currentTime = t; sec.avanzar({ I: P, ctx: c, salida: {}, def, clave: 'a', nivel: 'corre' }); }
    // 120 bpm en semicorcheas = 8 pasos por segundo; programa hasta 0,2 s adelante y parte a los 0,05 s
    ok(golpes.length === 10, `120 bpm durante 1 s: 10 pasos programados (salieron ${golpes.length})`);
    ok(Math.abs(golpes[1] - golpes[0] - 0.125) < 1e-9, 'un paso dura 0,125 s');
    const p = sec.pasoEn(0.5);
    ok(p && p.i === 3 && p.k === 0, `a los 0,5 s suena el paso 3 (salió ${JSON.stringify(p)})`);
    c.currentTime = 1.05; sec.avanzar({ I: P, ctx: c, salida: {}, def, clave: 'b', nivel: 'corre' });
    ok(sec.pasoEn(1.05) === null, 'otra clave vuelve al primer compás');
}

// ---------- 8. Qué tema usa el juego ----------
aplicarMusica(clon(DATOS));
ok(temaMusica('ejemplo') === null, 'un borrador no suena en el juego');
const aplicado = clon(DATOS); aplicado.temas.living = { ...clon(aplicado.temas.ejemplo), borrador: false };
aplicarMusica(aplicado);
ok(temaMusica('living') && temaMusica('living').bpm === 100, 'un tema aplicado con la clave living reemplaza al de la carrera');
ok(instrumentosPropios() && instrumentosPropios().campana, 'instrumentos propios del archivo');
ok(temaMusica('nada') === null, 'una clave que no está da null');
aplicarMusica(null);
ok(temaMusica('living') === null, 'sin archivo, el código');
ponerPrueba(true); ok(enPrueba(), 'vista previa encendida'); ponerPrueba(false);

// ---------- 9. Mensaje `musica` del puente ----------
{
    const llamadas = [];
    const responder = crearManejador({ idioma: () => 'es', aplicarDatos: () => {}, musica: o => llamadas.push(o) });
    const pide = m => responder({ de: 'estudio', id: 1, tipo: 'musica', ...m });
    ok((await pide({ accion: 'tocar', tema: DATOS.temas.ejemplo, instrumentos: DATOS.instrumentos, nivel: 'corre' })).tipo === 'ok', 'tocar un tema');
    ok((await pide({ accion: 'parar' })).tipo === 'ok', 'parar');
    ok((await pide({ accion: 'tocar' })).tipo === 'error', 'tocar sin tema da error');
    ok((await pide({ accion: 'tocar', tema: { bpm: 0, capas: [] } })).tipo === 'error', 'bpm 0 da error');
    ok((await pide({ accion: 'tocar', tema: DATOS.temas.ejemplo, nivel: 'Malo!' })).tipo === 'error', 'nivel raro da error');
    ok((await pide({ accion: 'bailar' })).tipo === 'error', 'accion desconocida');
    ok(llamadas.length === 2 && llamadas[0].nivel === 'corre', 'el juego recibe tocar y parar');
    const r = await responder({ de: 'estudio', id: 2, tipo: 'datos', nombre: 'musica', datos: DATOS });
    ok(r.tipo === 'ok', 'musica.json se aplica en vivo');
}

if (fallos) { console.error(`\n${fallos} fallos`); process.exit(1); }
console.log('OK: música (formato, motor, sintetizadores, secuenciador, juego y puente)');
