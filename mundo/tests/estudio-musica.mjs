// Prueba de la pestaña Música del Estudio (lo puro): node mundo/tests/estudio-musica.mjs
// Lista de temas, plantillas, ediciones de capa (ritmo, piano roll, acorde, arpegio, largo, pasos por compás),
// acordes del selector, niveles, renombrar; y que todo lo que sale de aquí cumpla el esquema y revisarTema.
// La interfaz (rejilla, sonido, guardar) la prueba el dueño a mano: ver «qué mirar» en el PR.
import { validar } from '../../estudio/validar.mjs';
import * as MM from '../../estudio/musica-modelo.mjs';
import { revisarTema, acordeDe, USOS, TIPOS_CAPA, INSTRUMENTOS } from '../supervivencia/musica-motor.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const cumple = (temas, instrumentos = {}) => {
    const e = validar({ version: 1, instrumentos, temas }, 'musica');
    for (const [k, T] of Object.entries(temas)) e.push(...revisarTema(T, instrumentos).map(x => `${k}: ${x}`));
    return e;
};

// ---------- Lista y plantillas ----------
{
    const l = MM.listaTemas({ temas: { living: { bpm: 100, prog: ['C'], capas: [], borrador: true }, mio: { bpm: 90, prog: ['C'], capas: [] } } });
    const de = k => l.find(x => x.clave === k);
    ok(de('living').origen === 'json' && de('living').borrador && de('living').reemplaza === 'carrera', 'living del JSON, borrador, reemplaza a la carrera');
    ok(de('mio').reemplaza === null, 'una clave nueva no reemplaza a nada');
    ok(de('cocina').origen === 'carrera' && de('pony').origen === 'mundo', 'los del código que faltan aparecen');
    ok(l.filter(x => x.clave === 'living').length === 1, 'living no se repite');
    ok(l.length === 2 + USOS.carrera.temas.length - 1 + Object.keys(USOS.mundo.temas).length, 'cuenta de la lista');
}
for (const k of [...USOS.carrera.temas, ...Object.keys(USOS.mundo.temas)]) {
    const T = MM.temaDelCodigo(k);
    ok(T && T.borrador === true, `${k}: del código sale como borrador`);
    ok(cumple({ [k]: T }).length === 0, `${k}: la plantilla no cumple: ${cumple({ [k]: T })}`);
}
ok(MM.temaDelCodigo('pony').pasos === 12, 'pony parte en 3/4');
ok(MM.temaDelCodigo('nada') === null, 'clave desconocida: null');
ok(cumple({ nuevo: MM.temaNuevo() }).length === 0, 'tema nuevo cumple: ' + cumple({ nuevo: MM.temaNuevo() }));
ok(MM.claveLibre({ temas: { tema1: {}, tema2: {} } }) === 'tema3', 'claveLibre');

// ---------- Capas nuevas y cambio de tipo, en 16 y 12 pasos ----------
for (const P of [16, 12]) for (const tipo of TIPOS_CAPA) {
    const tema = { bpm: 100, pasos: P, prog: ['C'], capas: [MM.capaNueva(tipo, P)] };
    ok(cumple({ t: tema }).length === 0, `capa ${tipo} en ${P}: ${cumple({ t: tema })}`);
    ok(MM.tipoDe(tema.capas[0]) === tipo, `tipoDe ${tipo}`);
    for (const otro of TIPOS_CAPA) {
        const c = MM.cambiarTipo({ ...tema.capas[0], nombre: 'x', niveles: ['corre'], mudo: true }, otro, P);
        ok(MM.tipoDe(c) === otro && c.nombre === 'x' && c.mudo && c.niveles[0] === 'corre', `cambiar ${tipo} a ${otro} conserva marcas`);
        ok(cumple({ t: { ...tema, capas: [c] } }).length === 0, `cambiar ${tipo} a ${otro} en ${P}: ${cumple({ t: { ...tema, capas: [c] } })}`);
    }
}
ok(MM.cambiarTipo({ inst: 'kick', ritmo: 'x...', vol: 1 }, 'notas').inst === 'chip', 'de batería a melodía cambia el instrumento');
ok(MM.cambiarTipo({ inst: 'hat', ritmo: 'x...', vol: 1 }, 'ritmo').inst === 'hat', 'batería a ritmo lo conserva');

// ---------- Ediciones ----------
{
    const c = MM.capaNueva('ritmo', 16, 'hat');
    MM.ciclarGolpe(c, 3); ok(c.ritmo[3] === 'x', '. → x');
    MM.ciclarGolpe(c, 3); ok(c.ritmo[3] === 'o', 'x → o');
    MM.ciclarGolpe(c, 3); ok(c.ritmo[3] === '.', 'o → .');
    MM.ciclarGolpe(c, 0);
    MM.ponerCompases(c, 4, 16); ok(c.ritmo.length === 64 && c.ritmo.slice(48) === c.ritmo.slice(0, 16), '1 → 4 compases copia');
    ok(MM.compasesDe(c, 16) === 4, 'compasesDe 4');
    MM.ciclarGolpe(c, 50);
    MM.ponerCompases(c, 1, 16); ok(c.ritmo.length === 16 && c.ritmo[0] === 'x', '4 → 1 deja el primero');

    const n = MM.capaNueva('notas', 16);
    MM.ponerNota(n, 5, 67); ok(n.notas[5] === 67, 'poner nota');
    MM.ponerNota(n, 5, 69); ok(n.notas[5] === 69, 'cambiar nota del mismo paso');
    MM.ponerNota(n, 5, 69); ok(n.notas[5] === 0, 'la misma nota la borra');
    const r = MM.capaNueva('rel', 16);
    MM.ponerNota(r, 3, -5); ok(r.rel[3] === -5, 'rel negativo');
    MM.ponerNota(r, 0, 0); ok(r.rel[0] === null, 'rel 0 otra vez = silencio');

    const a = MM.capaNueva('acorde', 16);
    MM.alternarPasoAcorde(a, 8); MM.alternarPasoAcorde(a, 4); ok(JSON.stringify(a.pasos) === '[0,4,8]', 'pasos del acorde ordenados');
    MM.alternarPasoAcorde(a, 0); ok(JSON.stringify(a.pasos) === '[4,8]', 'quitar paso del acorde');

    const p = MM.capaNueva('arpegio', 16);
    MM.ponerArpegio(p, 1, 3); ok(p.arpegio[1] === 3, 'arpegio');
    MM.ponerArpegio(p, 1, 3); ok(p.arpegio[1] === null, 'arpegio: otra vez = silencio');
    MM.ponerArpegio(p, 6, 2); ok(p.arpegio.length === 7 && p.arpegio[5] === null, 'arpegio crece');
    MM.largoArpegio(p, 3); ok(p.arpegio.length === 3, 'largo del arpegio');
}

// ---------- Pasos por compás ----------
{
    const T = MM.temaNuevo();
    MM.ponerCompases(T.capas[2], 4, 16);
    T.capas.push({ ...MM.capaNueva('acorde', 16), pasos: [0, 8, 14] });
    MM.cambiarPasos(T, 12);
    ok(T.pasos === 12 && T.capas[0].ritmo.length === 12 && T.capas[2].rel.length === 48, '16 → 12 corta cada compás');
    ok(JSON.stringify(T.capas[4].pasos) === '[0,8]', 'pasos del acorde fuera del compás se van');
    ok(cumple({ t: T }).length === 0, '16 → 12 cumple: ' + cumple({ t: T }));
    MM.cambiarPasos(T, 16);
    ok(T.capas[0].ritmo.length === 16 && T.capas[0].ritmo.slice(12) === '....', '12 → 16 rellena');
}

// ---------- Acordes del selector ----------
for (const r of MM.RAICES_ACORDE) for (const q of MM.CALIDADES_ACORDE) {
    const p = MM.partirAcorde(r + q);
    ok(p && p.raiz === r && p.calidad === q && acordeDe(p.raiz + p.calidad), `partirAcorde ${r + q}`);
}
ok(MM.partirAcorde('Db7').raiz === 'C#' && MM.partirAcorde('A#m').raiz === 'Bb', 'alias de raíces');
ok(MM.partirAcorde('Am').calidad === 'm' && MM.partirAcorde('Dm7').calidad === 'm7', 'acordes de AC');
ok(MM.partirAcorde('Hola') === null, 'nombre raro');

// ---------- Niveles, renombrar, notas ----------
ok(MM.nivelesDe({ uso: 'carrera', capas: [] }).includes('ultima'), 'niveles de la carrera');
ok(MM.nivelesDe({ uso: 'libre', capas: [] }, 'pony').includes('noche'), 'pony: niveles del mundo por su clave');
ok(MM.nivelesDe({ uso: 'libre', capas: [{ niveles: ['a', 'b'] }, { niveles: ['b'] }] }, 'mio').join() === 'a,b', 'libre: los de sus capas');
ok(MM.nivelesDe({ uso: 'libre', capas: [] }, 'mio').join() === 'todo', 'libre sin niveles');
{
    const d = { temas: { a: { x: 1 }, b: { x: 2 } } };
    MM.renombrar(d, 'a', 'living');
    ok(JSON.stringify(Object.keys(d.temas)) === '["living","b"]' && d.temas.living.x === 1, 'renombrar conserva el orden');
    let error = '';
    try { MM.renombrar(d, 'living', 'b'); } catch (e) { error = e.message; }
    ok(error.includes('ya hay'), 'no pisa otro tema');
    try { MM.renombrar(d, 'living', 'Mal'); error = ''; } catch (e) { error = e.message; }
    ok(error.includes('no válida'), 'clave no válida');
}
ok(MM.nombreNota(60) === 'C4' && MM.nombreNota(69) === 'A4' && MM.nombreNota(61) === 'C#4', 'nombres de nota');
ok(validar({ version: 1, instrumentos: { s: MM.sinteNuevo() }, temas: {} }, 'musica').length === 0, 'sintetizador nuevo cumple');

// ---------- Vista simple (B0-M): estilos con base y perillas ----------
{
    const S = await import('../../estudio/musica-simple.mjs');
    const claves = Object.keys(S.ESTILOS);
    ok(claves.length >= 5, 'hay al menos cinco estilos');
    for (const k of claves) {
        const T = S.temaDeEstilo(k), E = S.ESTILOS[k];
        ok(cumple({ [k]: T }).length === 0, `estilo ${k} cumple el esquema y revisarTema: ${cumple({ [k]: T }).join(' · ')}`);
        ok(T.borrador === true && T.uso === 'libre', `${k}: nace como borrador libre`);
        ok(E.nombre[0] && E.nombre[1] && T.nombre.es && T.nombre.en, `${k}: nombre ES/EN`);
        const tipos = new Set(T.capas.map(MM.tipoDe));
        ok(tipos.has('ritmo') && tipos.has('rel') && (tipos.has('acorde') || tipos.has('arpegio')) && tipos.has('notas'), `${k}: base con ritmo, bajo, acordes y melodía`);
        ok(T.capas.every(c => INSTRUMENTOS.includes(c.inst)), `${k}: solo instrumentos del código`);
        T.capas[0].vol = 9; ok(S.ESTILOS[k].capas[0].vol !== 9, `${k}: el tema es una copia`);
        // perillas: siguen cumpliendo
        const U = S.temaDeEstilo(k);
        S.ponerRapidez(U, 999); ok(U.bpm === S.BPM_MAX, `${k}: rapidez con tope`);
        S.ponerAnimo(U, 'triste'); ok(S.animoDe(U.prog) === 'triste', `${k}: triste`);
        S.ponerAnimo(U, 'alegre'); ok(S.animoDe(U.prog) === 'alegre', `${k}: alegre`);
        S.ponerFuerza(U, 1); ok(Math.abs(S.fuerzaDe(U) - 1) < 0.01, `${k}: fuerza al máximo`);
        S.ponerFuerza(U, 0);
        S.transponer(U, 5); S.transponer(U, -17);
        ok(cumple({ [k]: U }).length === 0, `${k}: tras las perillas sigue cumpliendo: ${cumple({ [k]: U }).join(' · ')}`);
    }
    // Ánimo: rotar la vuelta; sin acordes menores, los mayores pasan a menor y vuelven
    const A = { prog: ['C', 'G', 'Am', 'F'] };
    S.ponerAnimo(A, 'triste'); ok(A.prog.join() === 'Am,F,C,G', 'triste parte en el acorde menor (mismos acordes)');
    S.ponerAnimo(A, 'alegre'); ok(A.prog.join() === 'F,C,G,Am', 'alegre parte en un acorde mayor');
    const B = { prog: ['C', 'F', 'G7'] };
    S.ponerAnimo(B, 'triste'); ok(B.prog.join() === 'Cm,Fm,Gm7', 'todo mayor → menor');
    S.ponerAnimo(B, 'alegre'); ok(B.prog.join() === 'C,F,G7', 'y vuelve');
    ok(S.esMenor('Am7') && S.esMenor('Bdim') && !S.esMenor('Cmaj7') && !S.esMenor('G7'), 'qué acorde es menor');
    // Tono: acordes y melodía; los acordes propios del tema se quedan; ida y vuelta
    const C = { prog: ['C', 'Am', 'Bb', 'raro'], progs: { dia: ['F#m7'] }, acordes: { raro: [60, 64] }, capas: [{ inst: 'chip', notas: [60, 0, 72], vol: 0.2 }] };
    S.transponer(C, 2);
    ok(C.prog.join() === 'D,Bm,C,raro' && C.progs.dia[0] === 'G#m7'.replace('G#', 'Ab') && C.capas[0].notas.join() === '62,0,74', 'transponer sube acordes, niveles y melodía: ' + C.prog + ' ' + C.progs.dia);
    S.transponer(C, -2); ok(C.prog.join() === 'C,Am,Bb,raro' && C.capas[0].notas.join() === '60,0,72', 'y baja de vuelta');
    ok(S.tonalidadDe({ prog: ['Am', 'F'] }).join() === 'La menor,A minor' && S.tonalidadDe({ prog: ['Bb'] })[0] === 'Sib mayor', 'tonalidad leída');
    ok(S.compasDe({ pasos: 16 })[0] === '4/4' && S.compasDe({ pasos: 12 })[0] === '3/4', 'compás leído');
    ok(S.palabraRapidez(70)[0] === 'lenta' && S.palabraRapidez(140)[0] === 'rápida', 'palabras de rapidez');
    // Fuerza: la batería sube más que el tema y vuelve
    const F = S.temaDeEstilo('rock'), kick0 = F.capas[0].vol, bajo0 = F.capas.find(c => c.rel).vol;
    S.ponerFuerza(F, 1); ok(F.capas[0].vol > kick0 && F.capas.find(c => c.rel).vol === bajo0, 'fuerte: sube la batería, no el bajo');
    S.ponerFuerza(F, S.fuerzaDe({ vol: 0.09 })); ok(Math.abs(F.capas[0].vol - kick0) < 0.01 && F.vol === 0.09, 'y vuelve al original');
}

if (fallos) { console.error(`\n${fallos} fallos`); process.exit(1); }
console.log('estudio-musica: todo bien');
