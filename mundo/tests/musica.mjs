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
import { aplicarMusica, temaMusica, cancionMusica, instrumentosPropios, enPrueba, ponerPrueba } from '../supervivencia/musica-datos.js';
import { VOZ_BAJO, vozDe, tocarBajo, TECNICAS_BAJO } from '../supervivencia/musica-bajo.js';

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
        createWaveShaper() { return nodo({ curve: null }); },
        createBiquadFilter() { cuenta.filtro++; return nodo({ type: 'lowpass', frequency: param(350), Q: param(1), gain: param(0) }); },
        createBufferSource() { cuenta.ruido++; return nodo({ buffer: null, start() {}, stop() {} }); },
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
    const src = fs.readFileSync(path.join(RAIZ, 'mundo', 'supervivencia', 'musica.js'), 'utf8').replace(/\r\n/g, '\n'); // (con core.autocrlf la copia trae CRLF)
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

// ---------- 9. Canciones (Salonas, S1): esquema, mapa de tiempo, determinismo, bajo con técnicas y revisión ----------
{
    malo(d => { delete d.canciones.pescador.estructura; }, 'estructura');
    malo(d => { d.canciones.pescador.capas[0].bajo[0][1] = 'x'; }, 'bajo[0][1]');
    malo(d => { d.canciones.pescador.estructura[0].compases = 0; }, 'compases');
    malo(d => { d.canciones.pescador.vozBajo = { tecnicas: { s: { brillo: 1 } } }; }, 'brillo');
    const pescador = DATOS.canciones.pescador;
    ok(MO.revisarCancion(pescador, DATOS.instrumentos).length === 0, 'pescador: ' + MO.revisarCancion(pescador, DATOS.instrumentos).join(' · '));
    // Mapa de tiempo: 2 compases de 16 a 120 bpm (0,125 s por paso) y 1 de 12 a 60 bpm (0,25 s por paso)
    const C = {
        bpm: 120, pasos: 16, prog: ['E'],
        estructura: [{ seccion: 'intro', compases: 2 }, { seccion: 'puente', compases: 1, bpm: 60, pasos: 12, nivel: 'intro' }],
        capas: [{ inst: 'bajoSlap', vol: 1, bajo: [[0, 's', 28, 1], [4, 'p', 40, 1], [8, 'r', 28, 2, [28, 35, 40]], [11, 'd', 33, 1, 36]] }, { inst: 'kick', ritmo: 'x...x...x...', vol: 1, niveles: ['nada'] }]
    };
    const M = MO.mapaTiempo(C);
    const cerca = (a, b) => Math.abs(a - b) < 1e-9;
    ok(M.pasos.length === 44 && cerca(M.duracion, 7), `mapa: ${M.pasos.length} pasos, ${M.duracion} s (quería 44 y 7)`);
    ok(cerca(M.pasos[32].t, 4) && M.pasos[32].n === 1 && M.pasos[32].k === 0 && M.pasos[32].i === 0 && cerca(M.pasos[33].t - M.pasos[32].t, 0.25), 'mapa: el cambio de tempo y de compás');
    ok(M.secciones[1].nivel === 'intro' && M.secciones[0].nivel === 'intro' && cerca(M.secciones[1].t0, 4) && M.secciones[1].desde === 32, 'mapa: secciones y nivel');
    ok(M.pasos[17].k === 1 && M.pasos[17].i === 1, 'mapa: compás y paso dentro de la sección');
    ok(cerca(MO.mapaTiempo(C, 1.1).duracion, 7 / 1.1), 'mapa: el tempo del dueño escala todo');
    const Msw = MO.mapaTiempo({ ...C, swing: 0.5 });
    ok(cerca(Msw.pasos[1].t, 0.125 * 1.5) && cerca(Msw.pasos[2].t, 0.25) && cerca(Msw.duracion, 7), 'mapa: el swing atrasa los impares sin mover el resto');
    ok(MO.pasoEnTiempo(M, -0.01) === -1 && MO.pasoEnTiempo(M, 0) === 0 && MO.pasoEnTiempo(M, 4.1) === 32 && MO.pasoEnTiempo(M, 99) === 43, 'pasoEnTiempo');
    ok(JSON.stringify(MO.mapaTiempo(C)) === JSON.stringify(MO.mapaTiempo(clon(C))), 'mapa: puro');
    // Determinista: dos pasadas con azar distinto suenan igual (prob se ignora; Math.random solo elige el punto del ruido)
    const tocarTodo = cancion => {
        const traza = [], c = ctxFalso();
        const I2 = new Proxy({}, { get: (_, inst) => (...a) => traza.push(JSON.stringify([inst, ...a.slice(2)])) });
        const mapa = MO.mapaTiempo(cancion);
        for (let x = 0; x < mapa.pasos.length; x++) MO.tocarPasoCancion(I2, cancion, c, {}, mapa.pasos[x].t, mapa, x, DATOS.instrumentos);
        return traza.join('\n') + JSON.stringify(c.cuenta);
    };
    const conProb = clon(pescador); conProb.capas[3].prob = 0.5;
    const rnd = Math.random;
    Math.random = () => 0.99;
    const a1 = tocarTodo(conProb);
    Math.random = () => 0.01;
    const a2 = tocarTodo(conProb);
    Math.random = rnd;
    ok(a1 === a2, 'una canción suena distinto según el azar');
    ok(a1.includes('"kick"'), 'la batería de la canción suena');
    ok(MO.revisarCancion(conProb).some(e => e.includes('prob')), 'revisarCancion avisa de prob');
    // Bajo: cada técnica arma nodos válidos (ctxFalso revisa las rampas); el slap = 2 osciladores + chasquido
    for (const tipo of TECNICAS_BAJO) {
        const c = ctxFalso();
        tocarBajo(c, {}, 0.5, tipo, 33, 0.3, tipo === 'd' ? 40 : tipo === 'r' ? [28, 35, 40] : null, 1, VOZ_BAJO);
        ok(c.cuenta.osc > 0, `técnica ${tipo}: no sonó`);
        if (tipo === 's') ok(c.cuenta.osc === 2 && c.cuenta.ruido === 1, `slap: ${JSON.stringify(c.cuenta)}`);
        if (tipo === 'r') ok(c.cuenta.osc === 18, `rasgueo: 3 golpes × 3 cuerdas × 2 osciladores (${c.cuenta.osc})`);
    }
    const v = vozDe({ nasal: { frec: 900 }, tecnicas: { p: { brillo: 6000 } } });
    ok(v.nasal.frec === 900 && v.nasal.q === VOZ_BAJO.nasal.q && v.tecnicas.p.brillo === 6000 && v.tecnicas.p.chasquido.frec === 3800 && v.tecnicas.s.brillo === VOZ_BAJO.tecnicas.s.brillo, 'vozDe mezcla los cambios con la base');
    ok(vozDe(null) === VOZ_BAJO && vozDe(v) !== VOZ_BAJO, 'vozDe sin cambios = VOZ_BAJO');
    // El bajo suena en su paso del patrón (2 compases) y vuelve al compás 1 en cada sección
    {
        const c = ctxFalso(), m = MO.mapaTiempo(pescador);
        const oscEn = idx => { const antes = c.cuenta.osc; MO.tocarPasoCancion(I, pescador, c, {}, 1, m, idx, null); return c.cuenta.osc - antes; };
        const verso = m.secciones[1].desde, coro = m.secciones[2].desde;
        ok(oscEn(verso + 1) === 2 && oscEn(verso + 5) === 0 && oscEn(verso + 7) === 2, 'bajo del verso: paso 1 suena, 5 no, 7 sí (impares: sin batería)');
        ok(oscEn(verso + 32 + 10) > 2 && oscEn(coro + 5) === 2, 'bajo: el patrón de 2 compases se repite y el coro usa su capa');
    }
    // Con otro instrumento, una capa bajo toca notas simples (el rasgueo, cada nota del acorde)
    {
        const traza = [], I2 = new Proxy({}, { get: (_, inst) => (...a) => traza.push([inst, a[3]]) });
        const C2 = { ...C, capas: [{ ...C.capas[0], inst: 'piano' }] }, m = MO.mapaTiempo(C2);
        MO.tocarPasoCancion(I2, C2, null, null, 0, m, 8, null);
        ok(traza.length === 3 && traza.every(x => x[0] === 'piano'), 'capa bajo con piano: rasgueo = 3 notas');
    }
    // Revisión
    const err = cambia => { const x = clon(C); cambia(x); return MO.revisarCancion(x).join(' · '); };
    ok(MO.revisarCancion(C).length === 0, 'canción de prueba: ' + MO.revisarCancion(C).join(' · '));
    ok(err(x => { x.capas[0].bajo.push([16, 's', 28, 1]); }).includes('fuera del patrón'), 'revisar: paso fuera del patrón');
    ok(err(x => { x.capas[0].bajo.push([0, 'd', 28, 1]); }).includes('glissando'), 'revisar: glissando sin nota final');
    ok(err(x => { x.capas[0].niveles = ['coro']; }).includes('no suena ninguna capa'), 'revisar: sección muda');
    ok(err(x => { x.estructura = []; }).includes('estructura'), 'revisar: sin estructura');
    ok(err(x => { x.prog = ['Hm']; }).includes('acorde desconocido'), 'revisar: acorde');
    ok(err(x => { x.capas[1].niveles = ['intro']; }).includes('en 16 pasos'), 'revisar: un ritmo de 12 en una sección de 16');
    ok(MO.revisarTema({ bpm: 100, prog: ['C'], capas: [C.capas[0]] }).some(e => e.includes('un solo tipo')), 'la capa bajo es solo de canciones');
    // Reproductor: programa a su hora, salta lo atrasado y termina
    {
        const c = ctxFalso(), R = MO.crearReproductorCancion(), I2 = new Proxy({}, { get: () => () => {} });
        const m = R.empezar(c, C, { desde: 4 });
        ok(cerca(R.segundoEn(c.currentTime + 0.1), 4), 'reproductor: empieza en el segundo pedido');
        let vueltas = 0;
        while (R.avanzar({ I: I2, ctx: c, salida: {} }) && vueltas++ < 100) c.currentTime += 0.1;
        ok(vueltas > 20 && vueltas < 40 && m.pasos.length === 44, `reproductor: termina (${vueltas} vueltas)`);
        ok(R.avanzar({ I: I2, ctx: c, salida: {} }) === false, 'reproductor: después del final no hace nada');
    }
    // El juego: borrador no
    aplicarMusica(DATOS);
    ok(cancionMusica('pescador') === null, 'una canción borrador no se usa');
    const sin = clon(DATOS); delete sin.canciones.pescador.borrador; aplicarMusica(sin);
    ok(cancionMusica('pescador') && cancionMusica('nada') === null, 'cancionMusica');
    aplicarMusica(null);
    ok(typeof I.bajoSlap === 'function', 'bajoSlap está en los instrumentos');
}

if (fallos) { console.error(`\n${fallos} fallos`); process.exit(1); }
console.log('OK: música (formato, motor, sintetizadores, secuenciador, juego y puente)');
