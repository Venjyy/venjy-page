// Prueba del Estudio, fase 6a (evaluador de gestos y lectura del juego): node mundo/tests/estudio-poses.mjs
// Paridad exacta de los gestos de poses.json (evaluador del juego, mundo/datos/gestos.js) con GESTOS y GESTOS_AMISTAD,
// misma salida que la referencia estudio/evaluar.mjs, sin memoria por cuadro, variantes, ciclo, relojes, reemplazo y
// vuelta al código en las tablas del juego, poses como gestos quietos, reglas de validar y el mensaje `datos` del puente.
// Lo que necesita navegador (el juego lee poses.json y el puente lo cambia en vivo): estudio-poses-navegador.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluarGesto, funcionGesto, aplicarPoses, gestosDeDatos, reglasPoses } from '../datos/gestos.js';
import { evaluarGesto as evaluarReferencia } from '../../estudio/evaluar.mjs';
import { crearManejador, DATOS_VIVOS } from '../../estudio/puente-protocolo.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const datos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'mundo', 'datos', 'poses.json'), 'utf8'));

// moldes.js trae cuerpo.js, que escucha eventos de `window`, y amigos.js, que pide posiciones.json con fetch (en Node falla y avisa)
globalThis.window ??= { addEventListener() {} };
const aviso = console.warn;
console.warn = (...m) => { if (!String(m[0]).startsWith('[datos]')) aviso(...m); };
const { GESTOS } = await import('../supervivencia/escenas-skin.js');
const { GESTOS_AMISTAD } = await import('../supervivencia/escena-amistad-datos.js');
const { molde, MOLDES } = await import('../supervivencia/moldes.js');
console.warn = aviso;
const ORIG = { ...GESTOS }, ORIG_AM = { ...GESTOS_AMISTAD };

// Instantes: reloj de escena 0..8 s y progreso u que no coincide con t (para que un reloj cambiado se note)
const instantes = [];
for (let i = 0; i <= 400; i++) instantes.push([((i * 37) % 101) / 100, i * 0.02]);
const casos = [[false, false], [true, false], [false, true], [true, true]];

// ---------- 1. Paridad exacta con las funciones del código, con la firma del juego ----------
// Los gestos nuevos que solo están en poses.json (CLAUDE.md: «gestos nuevos van a poses.json») no tienen con qué
// compararse: entran a GESTOS como nuevos (sección 5)
let comparaciones = 0, maxDif = 0;
const soloJson = [];
for (const [nombre, def] of Object.entries(datos.gestos)) {
    const amistad = !!ORIG_AM[nombre];
    const codigo = amistad ? ORIG_AM[nombre] : ORIG[nombre];
    if (!codigo) { soloJson.push(nombre); continue; }
    const f = funcionGesto(def, amistad ? 'amistad' : 'skin');
    for (const [s, j] of casos) for (const [u, t] of instantes) {
        const a = amistad ? codigo(u, t, { s, j }) : codigo(u, t, s, j);
        const b = amistad ? f(u, t, { s, j }) : f(u, t, s, j);
        ok(Object.keys(a).sort().join() === Object.keys(b).sort().join(), `${nombre}: mismos canales (${Object.keys(a)} / ${Object.keys(b)})`);
        for (const k of Object.keys(a)) { comparaciones++; maxDif = Math.max(maxDif, Math.abs(a[k] - b[k])); if (a[k] !== b[k]) ok(false, `${nombre}.${k} u ${u} t ${t}: ${a[k]} != ${b[k]}`); }
    }
}
ok(comparaciones > 10000, `comparaciones: ${comparaciones}`);
console.log(`paridad: ${Object.keys(datos.gestos).length} gestos, ${comparaciones} comparaciones, diferencia máxima ${maxDif}`);

// ---------- 2. Igual que la referencia legible (estudio/evaluar.mjs) ----------
for (const [nombre, def] of Object.entries(datos.gestos)) for (const [u, t] of instantes) {
    const a = evaluarReferencia(def, t, u), b = evaluarGesto(def, u, t, null, {});
    for (const k of Object.keys(a)) if (a[k] !== b[k]) { ok(false, `referencia ${nombre}.${k}: ${a[k]} != ${b[k]}`); break; }
}

// ---------- 3. Sin memoria por cuadro: el mismo objeto por caso, sin claves de otro caso ----------
{
    const def = { reloj: 't', canales: { bDx: -1, cx: { base: 0.1, osc: [{ forma: 'sin', amp: 0.2, frec: 3 }] } }, variantes: { sentado: { pDx: -1.5 }, jugador: { cz: 0.2 } } };
    const f = funcionGesto(def, 'skin');
    const a = f(0.1, 0.5, false, false), b = f(0.2, 0.9, false, false);
    ok(a === b, 'misma salida en llamadas seguidas (sin reservar memoria)');
    const s = f(0.2, 0.9, true, false);
    ok(s !== a && s.pDx === -1.5 && !('pDx' in a), 'sentado: su propio objeto, sin ensuciar el de pie');
    const jj = f(0.2, 0.9, true, true);
    ok(jj.pDx === -1.5 && jj.cz === 0.2 && jj.bDx === -1, 'sentado y jugador: las dos variantes encima de la base');
    const salida = {};
    ok(evaluarGesto(def, 0, 1, { s: true }, salida) === salida && salida.pDx === -1.5, 'evaluarGesto escribe en la salida que recibe');
    const g = funcionGesto(def, 'amistad');
    ok(g(0, 1, { s: false, j: true }).cz === 0.2, 'firma amistad: info { s, j }');
}

// ---------- 4. Relojes, ciclo e interpolación ----------
{
    const k = [[0, 0], [1, 1]];
    const dU = { reloj: 'u', canales: { bDx: { k, interp: 'lineal' } } };
    ok(evaluarGesto(dU, 0.25, 7).bDx === 0.25, 'reloj u: las claves van con u');
    const dT = { reloj: 't', canales: { bDx: { k, interp: 'lineal' } } };
    ok(evaluarGesto(dT, 0.25, 0.5).bDx === 0.5 && evaluarGesto(dT, 0.25, 9).bDx === 1, 'reloj t y valor del extremo');
    const dL = { reloj: 'local', canales: { bDx: { k: [[0, 0], [4, 4]], interp: 'lineal' } } };
    ok(evaluarGesto(dL, 0.5, 9, { d: 4 }).bDx === 2 && evaluarGesto(dL, 0.5, 3, {}).bDx === 3, 'reloj local: u * d, y sin d, t');
    const dC = { reloj: 't', ciclo: 1.3, canales: { bDx: { k: [[0, 0], [1.3, 1.3]], interp: 'lineal' } } };
    ok(Math.abs(evaluarGesto(dC, 0, 1.3 + 0.65).bDx - 0.65) < 1e-12 && Math.abs(evaluarGesto(dC, 0, -0.65).bDx - 0.65) < 1e-12, 'ciclo: se repite (también con t negativo)');
    const dP = { reloj: 'u', canales: { bDx: { k: [[0, 1], [0.5, 2], [1, 3]], interp: 'paso' } } };
    ok(evaluarGesto(dP, 0.4, 0).bDx === 1 && evaluarGesto(dP, 0.6, 0).bDx === 2, 'interp paso');
    const dS = { reloj: 'u', canales: { bDx: { k, interp: 'suave' } } };
    ok(Math.abs(evaluarGesto(dS, 0.25, 0).bDx - 0.15625) < 1e-12, 'interp suave (smoothstep, como ruta())');
    const dF = { reloj: 't', canales: { cx: { osc: [{ forma: 'neg', amp: 1, frec: 1 }] }, cy: { osc: [{ forma: 'abs', amp: 1, frec: 1, fase: Math.PI }] } } };
    const r = evaluarGesto(dF, 0, Math.PI / 2);
    ok(r.cx === 0 && Math.abs(r.cy - 1) < 1e-12, 'formas neg y abs, con fase');
}

// ---------- 5. Conexión con el juego: reemplaza, agrega y devuelve ----------
{
    // Los gestos del archivo: cada uno reemplaza al suyo en su tabla; puno en GESTOS_AMISTAD, no en GESTOS
    const r = aplicarPoses(datos);
    ok(r.reemplazados.length === Object.keys(datos.gestos).length - soloJson.length, `reemplazados: ${r.reemplazados.join(',')}`);
    ok(soloJson.every(k => typeof GESTOS[k] === 'function' && r.nuevos.includes(k)), `los gestos solo de poses.json entran a GESTOS como nuevos (${soloJson.join(', ') || 'ninguno'})`);
    ok(GESTOS.habla !== ORIG.habla && GESTOS_AMISTAD.puno !== ORIG_AM.puno && !('puno' in GESTOS), 'habla en GESTOS y puno en GESTOS_AMISTAD');
    ok(GESTOS.baile === ORIG.baile && GESTOS_AMISTAD.abrazo === ORIG_AM.abrazo, 'lo que no está en el JSON sigue con su código');
    const poses = Object.keys(datos.poses);
    ok(poses.every(k => typeof GESTOS[k] === 'function') && r.nuevos.length === poses.length + soloJson.length, 'las poses fijas entran a GESTOS como gestos quietos');
    ok(GESTOS.doblarse(0.5, 3, false, false).inc === 0.6, 'doblarse: los canales de la pose');
    ok(molde('doblarse') && molde('doblarse')(0.5, 3, {}).inc === 0.6, 'moldes.js también los encuentra (molde por nombre)');
    // El dueño cambia saluda y agrega uno nuevo; puno sale del archivo
    const editado = JSON.parse(JSON.stringify(datos));
    editado.gestos.saluda.canales.bDx = -2.2;
    editado.gestos.aplaude = { reloj: 't', canales: { bDx: -1.4, bIx: -1.4, bDz: { base: -0.3, osc: [{ forma: 'sin', amp: 0.25, frec: 14 }] }, bIz: { base: 0.3, osc: [{ forma: 'sin', amp: -0.25, frec: 14 }] } } };
    delete editado.gestos.puno;
    aplicarPoses(editado);
    ok(GESTOS.saluda(0, 1, false, false).bDx === -2.2, 'el cambio se ve en la próxima llamada (en vivo)');
    ok(typeof GESTOS.aplaude === 'function' && GESTOS.aplaude(0, 0, false, false).bDx === -1.4, 'gesto nuevo en GESTOS');
    ok(GESTOS_AMISTAD.puno === ORIG_AM.puno, 'puno salió del JSON: vuelve a su código');
    // Sin datos: todo como antes
    aplicarPoses(null);
    ok(Object.keys(GESTOS).sort().join() === Object.keys(ORIG).sort().join() && Object.keys(ORIG).every(k => GESTOS[k] === ORIG[k]), 'sin datos: GESTOS igual que el código');
    ok(Object.keys(ORIG_AM).every(k => GESTOS_AMISTAD[k] === ORIG_AM[k]), 'sin datos: GESTOS_AMISTAD igual que el código');
    // Un gesto roto no tumba a los demás
    aplicarPoses({ version: 1, gestos: { malo: { reloj: 't' }, habla: datos.gestos.habla } });
    ok(!('malo' in GESTOS) && GESTOS.habla !== ORIG.habla, 'un gesto sin canales se ignora');
    aplicarPoses(null);
}

// ---------- 6. Nombres para las pistas y reglas de validar ----------
{
    const nombres = gestosDeDatos(datos).map(([k]) => k);
    ok(nombres.length === Object.keys(datos.gestos).length + Object.keys(datos.poses).length && nombres.includes('doblarse') && nombres.includes('puno'), `nombres: ${nombres.length}`);
    ok(gestosDeDatos(null).length === 0, 'sin datos, sin nombres');
    ok(reglasPoses(datos, { codigo: new Set([...Object.keys(ORIG), ...Object.keys(ORIG_AM)]), moldes: new Set(Object.keys(MOLDES)) }).length === 0, 'poses.json de hoy: sin reglas rotas');
    // B4b (DISENO §40, decisión 13): extiende apunta a un gesto que existe y no vuelve a sí mismo
    const ctx = { codigo: new Set(Object.keys(ORIG)), moldes: new Set(Object.keys(MOLDES)) };
    const conGestos = gestos => ({ version: 1, gestos });
    ok(reglasPoses(conGestos({ a: { reloj: 't', extiende: { gesto: 'nada' }, canales: {} } }), ctx).some(r => r.texto.includes('«nada» no es un gesto')), 'extiende: gesto que no existe');
    ok(reglasPoses(conGestos({ a: { reloj: 't', extiende: { gesto: 'b' }, canales: {} }, b: { reloj: 't', extiende: { gesto: 'a' }, canales: {} } }), ctx).some(r => r.texto.includes('vuelve a sí mismo')), 'extiende: ciclo');
    // apoya: piernas rectas y cadera baja con el inc final; pot y en = 'u'
    const ap = evaluarGesto({ reloj: 't', apoya: true, canales: { inc: 0.4 } }, 0, 0, null, {});
    ok(ap.pDx === -0.4 && ap.pIx === -0.4 && Math.abs(ap.y - 0.75 * (1 - Math.cos(0.4))) < 1e-15, 'apoya: pies en el suelo');
    const po = evaluarGesto({ reloj: 'u', canales: { cx: { base: 0, osc: [{ forma: 'sin', amp: 1, frec: Math.PI, en: 'u', pot: 3 }] } } }, 0.5, 99, null, {});
    ok(Math.abs(po.cx - 1) < 1e-15, 'oscilador con en u y pot');
    const malo = { version: 1, poses: { habla: { canales: { cx: 0 } }, risa: { canales: {} } }, gestos: {
        a: { reloj: 'local', canales: { bDx: { k: [[0, 0], [0, 1]], base: 1 } } },
        b: { reloj: 't', canales: { cx: { osc: [{ forma: 'sin', amp: 1, frec: 1, env: [0.5, 0.2] }] } } },
        risa: { reloj: 't', canales: { cx: 0 } } } };
    const r = reglasPoses(malo, { codigo: new Set(['habla']), moldes: new Set(['b']) });
    const hay = (tipo, txt) => r.some(x => x.tipo === tipo && x.texto.includes(txt));
    ok(hay('error', '$.gestos.a.canales.bDx.k[1]'), 'error: claves fuera de orden');
    ok(hay('aviso', '$.gestos.a.canales.bDx.base'), 'aviso: base con k');
    ok(hay('aviso', '$.gestos.a.reloj'), 'aviso: reloj local');
    ok(hay('error', '$.gestos.b.canales.cx.osc[0].env'), 'error: env al revés');
    ok(hay('aviso', '$.gestos.b: MOLDES'), 'aviso: lo tapa un molde');
    ok(hay('aviso', '$.poses.risa: hay un gesto'), 'aviso: pose y gesto con el mismo nombre');
    ok(hay('aviso', '$.poses.habla: el juego tiene'), 'aviso: pose que reemplaza un gesto del código');
}

// ---------- 7. Puente: poses se aplica en vivo ----------
{
    ok(DATOS_VIVOS.includes('poses'), 'poses está en DATOS_VIVOS');
    const aplicados = [];
    const responder = crearManejador({ idioma: () => 'es', aplicarDatos: (n, d) => aplicados.push([n, d]) });
    const r = await responder({ de: 'estudio', tipo: 'datos', id: 1, nombre: 'poses', datos });
    ok(r && r.tipo === 'ok' && aplicados.length === 1 && aplicados[0][0] === 'poses', `datos poses: ${JSON.stringify(r)}`);
}

// ---------- 8. CLI: validar y resumen ----------
{
    const cli = (...a) => { try { return { out: execFileSync('node', ['estudio/cli.mjs', ...a], { cwd: RAIZ, encoding: 'utf8' }), codigo: 0 }; } catch (e) { return { out: String(e.stdout), codigo: e.status }; } };
    const v = cli('validar', 'poses', 'escenas');
    // (salida 2 solo por textos «sin revisar»: la marca la pone el dueño)
    const soloRevisar = v.codigo === 2 && v.out.split('\n').filter(l => /\$\./.test(l)).every(l => /sin revisar/.test(l));
    ok((v.codigo === 0 || soloRevisar) && /OK \d de 2/.test(v.out), 'validar poses escenas: ' + v.out.trim());
    const s = cli('resumen');
    ok(new RegExp(`poses\\s+${Object.keys(datos.poses).length} poses, ${Object.keys(datos.gestos).length} gestos · lee gestos\\.js`).test(s.out), 'resumen: poses lo lee gestos.js');
}

if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('OK estudio-poses');
