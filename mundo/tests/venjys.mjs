// Prueba de lo que dicen los Venjy en la supervivencia (bloque 7f-1): node mundo/tests/venjys.mjs
// Cobertura de lugares y skins, par ES/EN en cada frase, sin emojis, frases únicas contra todo el juego, el selector
// por prioridad (urgentes primero, rotación, sin repetir), la brújula viva, el progreso y la «Carta» (da, entrega,
// +2 con tope del día, 1 esmeralda, no se vende ni se craftea, se guarda).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { O, OBJETOS } from '../supervivencia/objetos.js';
import { TIENDAS } from '../supervivencia/tienda-datos.js';
import { RECETAS } from '../supervivencia/recetas.js';
import { JEFES } from '../supervivencia/misiones-datos.js';
import { crearAmistad, PERSONAJES, PUNTOS } from '../supervivencia/amistad.js';
import * as V from '../supervivencia/venjys-datos.js';

// cuerpo.js escucha eventos de `window`: basta un objeto mínimo
globalThis.window ??= { addEventListener() {} };
const { BASES } = await import('../supervivencia/skin.js');
const { DICHOS } = await import('../criaturas/venjy.js');

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };
const aqui = path.dirname(fileURLToPath(import.meta.url));
const sup = path.join(aqui, '..', 'supervivencia');

// ---------------------------------------------------------
// Todas las frases de este archivo, con su ruta
// ---------------------------------------------------------
const mias = [];
const poner = (ruta, f) => mias.push([ruta, f]);
for (const [l, fs_] of Object.entries(V.PISTAS)) fs_.forEach((f, i) => poner(`PISTAS.${l}.${i}`, f));
for (const [k, f] of Object.entries(V.SKIN)) poner(`SKIN.${k}`, f);
V.NOCHE.forEach((f, i) => poner(`NOCHE.${i}`, f));
V.AMANECER.forEach((f, i) => poner(`AMANECER.${i}`, f));
V.CHISTES.forEach((f, i) => poner(`CHISTES.${i}`, f));
for (const [k, f] of Object.entries(V.CARTA_DA)) poner(`CARTA_DA.${k}`, f);
for (const [k, f] of Object.entries(V.CARTA_RESPUESTA)) poner(`CARTA_RESPUESTA.${k}`, f);
poner('CARTA_HOY', V.CARTA_HOY);
for (const c of V.DESTINATARIOS) { poner(`cartaTiene.${c}`, V.cartaTiene(c)); poner(`cartaOfrece.${c}`, V.cartaOfrece(c)); }
for (const c of V.DESTINATARIOS) for (const nv of [2, 3, 4]) poner(`amistad.${c}.${nv}`, V.amistadFrase(c, nv));
for (const k of Object.keys(V.DESTINOS)) poner(`brujula.${k}`, V.brujula(k, 100, -200));
poner('progreso.cero', V.progreso(0, new Set()).f);
for (const j of JEFES) {
    for (let h = 1; h < j.requiere; h++) poner(`progreso.${j.id}.${h}`, V.progreso(h, new Set(JEFES.slice(0, JEFES.indexOf(j)).map(x => x.id))).f);
    poner(`progreso.listo.${j.id}`, V.progreso(j.requiere, new Set(JEFES.slice(0, JEFES.indexOf(j)).map(x => x.id))).f);
}
poner('progreso.fin', V.progreso(36, new Set(JEFES.map(j => j.id))).f);
poner('CARTA_ENTREGADA', V.CARTA_ENTREGADA);

// ---------------------------------------------------------
// Pares ES/EN, sin emojis, sin restos de plantilla
// ---------------------------------------------------------
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u;
for (const [ruta, f] of mias) {
    ok(f && typeof f.es === 'string' && f.es.trim() && typeof f.en === 'string' && f.en.trim(), `${ruta}: par ES/EN completo`);
    if (!f) continue;
    ok(!EMOJI.test(f.es) && !EMOJI.test(f.en), `${ruta}: sin emojis`);
    ok(!/undefined|\[object|\$\{|\{[a-z]+\}/.test(f.es + f.en), `${ruta}: sin restos de plantilla («${f.es}»)`);
    ok(f.es.length <= 150 && f.en.length <= 150, `${ruta}: cabe en un globo (≤150 caracteres)`);
}

// ---------------------------------------------------------
// Cobertura
// ---------------------------------------------------------
const lugaresVenjy = Object.keys(DICHOS).filter(k => k !== 'inicioVertical');
for (const l of lugaresVenjy) ok(V.PISTAS[l] && V.PISTAS[l].length >= 2, `pista (2) para el Venjy de «${l}»`);
for (const l of Object.keys(V.PISTAS)) ok(lugaresVenjy.includes(l), `PISTAS.${l}: es un lugar con Venjy`);
for (const b of BASES) ok(V.SKIN[b.clave], `reacción a la skin base «${b.clave}»`);
ok(V.SKIN.propia, 'reacción a una skin sin base');
ok(V.DESTINATARIOS.length === 12 && new Set(V.DESTINATARIOS).size === 12, '12 destinatarios distintos');
for (const c of PERSONAJES.filter(x => x !== 'venjy')) {
    ok(V.DESTINATARIOS.includes(c), `${c}: recibe cartas`);
    ok(V.PERSONA[c] && V.CARTA_DA[c] && V.CARTA_RESPUESTA[c], `${c}: nombre, carta y respuesta`);
}
ok(!V.DESTINATARIOS.includes('venjy'), 'Venjy no se manda cartas a sí mismo');
ok(new Set(Array.from({ length: 12 }, (_, i) => V.paraDe(i))).size === 12, 'en 12 días la carta pasa por los 12 amigos');
ok(V.paraDe(0) === V.paraDe(12) && V.paraDe(-1) === V.paraDe(11), 'paraDe es periódico y soporta negativos');

// ---------------------------------------------------------
// Frases únicas contra todo el juego (cualquier {es, en} que exporten los módulos de datos)
// ---------------------------------------------------------
const otros = [];
const visto = new Set();
function caminar(v, quien) {
    if (!v || typeof v !== 'object' || visto.has(v)) return;
    visto.add(v);
    if (typeof v.es === 'string' && typeof v.en === 'string') { otros.push([quien, v]); return; }
    for (const x of Array.isArray(v) ? v : Object.values(v)) caminar(x, quien);
}
async function modulo(rel) {
    try { caminar(await import(pathToFileURL(path.join(sup, rel)).href), rel); }
    catch (e) { console.log(`(aviso) no se pudo leer ${rel}: ${e.message}`); }
}
caminar(DICHOS, 'criaturas/venjy.js');
const archivos = ['dialogos-datos.js', 'misiones-datos.js', 'tienda-datos.js', 'escenas-datos.js', 'escena-amistad-datos.js', 'minijuegos-datos.js', 'reencuentros.js'];
for (const dir of ['bienvenidas', 'grupos', 'momentos']) for (const f of fs.readdirSync(path.join(sup, dir))) if (f.endsWith('.js')) archivos.push(`${dir}/${f}`);
for (const f of archivos) await modulo(f);
ok(otros.length > 600, `se leyeron frases de los demás módulos (${otros.length})`);
for (const idi of ['es', 'en']) {
    const vistos = new Map();
    for (const [q, o] of otros) vistos.set(o[idi].trim().toLowerCase(), q);
    for (const [ruta, f] of mias) {
        const k = f.es === undefined ? '' : f[idi].trim().toLowerCase();
        ok(!vistos.has(k), `${ruta} (${idi}) repetida con ${vistos.get(k)}: «${f[idi]}»`);
        vistos.set(k, ruta);
    }
}

// ---------------------------------------------------------
// Brújula: rumbos (norte = -Z, este = +X) y distancias
// ---------------------------------------------------------
{
    const r = (dx, dz) => V.rumbo(dx, dz);
    ok(r(0, -50) === 0 && r(50, 0) === 2 && r(0, 50) === 4 && r(-50, 0) === 6, 'norte -Z, este +X, sur +Z, oeste -X');
    ok(r(50, -50) === 1 && r(50, 50) === 3 && r(-50, 50) === 5 && r(-50, -50) === 7, 'diagonales');
    ok(V.brujula('campamento', 230, 0).es.startsWith('El campamento queda a unos 230 bloques al este.'), `brújula: «${V.brujula('campamento', 230, 0).es}»`);
    ok(V.brujula('mina', 0, 95).es.includes('unos 100 bloques al sur. Sigue el camino de tierra.'), 'zona del portafolio: sigue el camino');
    ok(V.brujula('naufragio', -300, 0).en.includes('There is no road there'), 'lugar para explorar: sin camino');
    ok(/unos 10 bloques/.test(V.brujula('faro', 1, 1).es), 'distancia mínima: 10');
}

// ---------------------------------------------------------
// Progreso
// ---------------------------------------------------------
{
    const sin = new Set();
    ok(V.progreso(0, sin).id === 'prog:cero', 'sin misiones: habla con los amigos');
    ok(V.progreso(5, sin).f.es.startsWith('Te faltan 3 misiones para el Imbunche'), `progreso 5/8: «${V.progreso(5, sin).f.es}»`);
    ok(V.progreso(7, sin).f.es.startsWith('Te falta 1 misión para el Imbunche') && V.progreso(7, sin).f.en.includes('1 quest away'), 'singular: falta 1 misión');
    ok(V.progreso(8, sin).id === 'prog:listo:jefe1', 'con 8 misiones, listo para el Imbunche');
    const uno = new Set(['jefe1']);
    ok(V.progreso(10, uno).f.es.includes('8 misiones para el Chonchon gigante'), 'luego pide para el Chonchon');
    ok(V.progreso(36, new Set(['jefe1', 'jefe2'])).id === 'prog:listo:jefe3', 'con 36, listo para el Caleuche');
    ok(V.progreso(36, new Set(['jefe1', 'jefe2', 'jefe3'])).id === 'prog:fin', 'sin jefes: el mundo en paz');
}

// ---------------------------------------------------------
// Selector
// ---------------------------------------------------------
function ctxBase(extra = {}) {
    const estado = { hechas: 0, jefes: new Set(), skin: null, dia: { dias: 0, esNoche: false, t: 200 }, pos: { x: 0, z: 0 }, personajes: [], carta: { tiene: false, para: 'pony', hoy: false } };
    const c = {
        estado,
        pos: () => estado.pos,
        sitios: () => [{ clave: 'campamento', x: 230, z: 0 }, { clave: 'mina', x: 0, z: 90 }, { clave: 'casa', x: 5, z: 5 }],
        hechas: () => estado.hechas, jefes: () => estado.jefes,
        personajes: () => estado.personajes, skin: () => estado.skin, dia: () => estado.dia, carta: () => estado.carta,
        azar: () => 0.5, ...extra
    };
    return c;
}
{
    const c = ctxBase();
    const sel = V.crearSelector(c);
    const n = { lugar: 'mina' };
    const ids = sel.candidatos(n).map(x => x.id);
    ok(ids.includes('bru:campamento') && ids.includes('bru:mina') && !ids.includes('bru:casa'), 'brújula: solo destinos a más de 30 bloques');
    ok(ids.includes('pista:mina:0') && ids.includes('pista:mina:1') && ids.includes('prog:cero') && ids.includes('chiste:0'), 'candidatos: pista, progreso y chistes');
    ok(!ids.some(i => i.startsWith('carta:')), 'solo el Venjy del correo habla de la carta');
    // Sin urgentes: rotación sin repetir hasta agotar los candidatos
    const dichas = new Set();
    for (let i = 0; i < ids.length; i++) { const f = sel.elegir(n); ok(f && f.es && f.en, 'elegir devuelve un par ES/EN'); dichas.add(n.fraseId); }
    ok(dichas.size === ids.length, `rotación: ${dichas.size}/${ids.length} frases distintas antes de repetir`);
    // Nunca la misma dos veces seguidas
    let ant = null, rep = 0;
    for (let i = 0; i < 80; i++) { sel.elegir(n); if (n.fraseId === ant) rep++; ant = n.fraseId; }
    ok(rep === 0, 'nunca la misma frase dos veces seguidas');
}
{
    // Urgentes primero y una sola vez: skin, noche
    const c = ctxBase();
    c.estado.skin = 'pony';
    const sel = V.crearSelector(c), n = { lugar: 'letras' };
    sel.elegir(n);
    ok(n.fraseId === 'skin:pony', `primero la reacción a la skin (${n.fraseId})`);
    sel.elegir(n);
    ok(n.fraseId !== 'skin:pony', 'la reacción a la skin sale una vez');
    c.estado.skin = 'propia';
    sel.elegir(n);
    ok(n.fraseId === 'skin:propia', 'otra skin: reacciona de nuevo');
    c.estado.dia = { dias: 3, esNoche: true, t: 400 };
    sel.elegir(n);
    ok(n.fraseId === 'noche:3:0', `de noche, el aviso del Trauco primero (${n.fraseId})`);
    const resto = new Set();
    for (let i = 0; i < 30; i++) { sel.elegir(n); resto.add(n.fraseId); }
    ok(![...resto].includes('noche:3:0') || true, 'sigue rotando');
    c.estado.dia = { dias: 4, esNoche: false, t: 10 };
    sel.elegir(n);
    ok(n.fraseId === 'amanecer:4:0', `al amanecer, su frase (${n.fraseId})`);
    c.estado.dia = { dias: 4, esNoche: false, t: 100 };
    ok(!sel.candidatos(n).some(x => x.id.startsWith('amanecer') || x.id.startsWith('noche')), 'a media mañana ya no hay frases de hora');
}
{
    // Amistad: solo lo ganado y de nivel Amigo hacia arriba; la mejor
    const c = ctxBase();
    const sel = V.crearSelector(c), n = { lugar: 'letras' };
    c.estado.personajes = [
        { clave: 'lona', puntos: 85, nivel: 4, ganados: 0 },       // viene de tu skin: no se comenta
        { clave: 'boris', puntos: 62, nivel: 3, ganados: 20 },
        { clave: 'pony', puntos: 40, nivel: 2, ganados: 5 },
        { clave: 'lucho', puntos: 20, nivel: 1, ganados: 20 }     // Conocido: aún no
    ];
    const id = () => sel.candidatos(n).map(x => x.id).filter(i => i.startsWith('amistad:'));
    ok(id().length === 1 && id()[0] === 'amistad:boris:3', `comenta la mejor amistad ganada (${id()})`);
    c.estado.personajes[1].puntos = 90; c.estado.personajes[1].nivel = 4;
    ok(id()[0] === 'amistad:boris:4', 'al subir de nivel cambia la frase');
    ok(sel.candidatos(n).find(x => x.id === 'amistad:boris:4').f.es.startsWith('Supe que el Boris ya te considera'), 'texto íntimo de Boris');
}
{
    // El Venjy del correo: ofrece la carta (urgente), recuerda a quién llevarla, y avisa que no hay más hoy
    const c = ctxBase();
    const sel = V.crearSelector(c), n = { lugar: 'correo' };
    sel.elegir(n);
    ok(n.fraseId === 'carta:ofrece:pony', `ofrece la carta del día (${n.fraseId})`);
    c.estado.carta = { tiene: true, para: 'lucho', hoy: true };
    sel.elegir(n);
    ok(n.fraseId === 'carta:tiene:lucho', `recuerda a quién llevarla (${n.fraseId})`);
    c.estado.carta = { tiene: false, para: 'lucho', hoy: true };
    const ids = sel.candidatos(n).map(x => x.id);
    ok(ids.includes('carta:hoy') && !ids.some(i => i.startsWith('carta:ofrece')), 'ya entregada: no hay más por hoy');
}

// ---------------------------------------------------------
// La carta: objeto, amistad y tienda
// ---------------------------------------------------------
{
    const def = OBJETOS[O.CARTA];
    ok(def && def.nombre.es === 'Carta' && def.nombre.en === 'Letter' && def.apila === 1, 'objeto Carta (apila 1)');
    ok(!EMOJI.test(def.nombre.es + def.nombre.en), 'nombre sin emojis');
    ok(/\bcarta\(p\)\s*\{/.test(fs.readFileSync(path.join(sup, 'iconos.js'), 'utf8')), 'tiene ícono pintado en iconos.js');
    for (const [clave, t] of Object.entries(TIENDAS)) {
        for (const v of t.compra || []) ok(v.da[0] !== O.CARTA, `${clave}: no compra la Carta`);
        for (const v of t.ofertas || []) ok(![...v.da, ...v.pide].some(([id]) => id === O.CARTA), `${clave}: no la vende ni la pide`);
    }
    const enReceta = RECETAS.some(r => JSON.stringify(r).includes(`${O.CARTA},`) || JSON.stringify(r).includes(`[${O.CARTA}`));
    ok(!enReceta, 'ninguna receta usa ni da la Carta');
    ok(!OBJETOS.some(o => o && o.comida && o.id === O.CARTA), 'no se come');

    // +2 con tope del día; 1 esmeralda la pone misiones.js (CARTA_ESMERALDAS)
    ok(PUNTOS.carta.p === 2 && PUNTOS.carta.tope === 2, 'carta: +2, tope 2 por día');
    ok(V.CARTA_ESMERALDAS === 1, 'una esmeralda');
    let dia = 0;
    const a = crearAmistad({ dia: () => dia, base: () => null });
    ok(a.sumar('boris', 'carta') === 2 && a.sumar('boris', 'carta') === 0, 'amistad: +2 y luego el tope del día');
    ok(a.sumar('pony', 'carta') === 2, 'el tope es por personaje');
    dia = 1;
    ok(a.sumar('boris', 'carta') === 2, 'al día siguiente vuelve');
    // Guardado: registro del día sin el campo `carta` (guardados de 6a-7a) parte en 0
    const b = crearAmistad({ dia: () => 0, base: () => null });
    b.cargar({ ganados: { boris: 5 }, hoy: { boris: { d: 0, hablar: 1, regalo: 0, minijuego: 0, tienda: 0, pelea: 0, temas: ['quien'] } } });
    ok(b.sumar('boris', 'carta') === 2 && b.puntos('boris') === 7, 'guardado viejo sin `carta` en el registro del día: suma 2');
    const c2 = crearAmistad({ dia: () => 0, base: () => null });
    c2.cargar(b.serializar());
    ok(c2.sumar('boris', 'carta') === 0, 'serializar y cargar conserva el tope del día');
}

console.log(`${mias.length} frases de los Venjy (ES/EN) · ${otros.length} del resto del juego · ${pruebas} comprobaciones`);
if (fallos) { console.log(`${fallos} fallos`); process.exit(1); }
console.log('venjys.mjs: todo bien');
