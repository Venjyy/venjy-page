// Prueba-contrato de Salonas (S2): node mundo/tests/salonas.mjs
// Partitura que sale del bajo (por dificultad, 6/8, cambios de tempo, Práctica, ajustes a mano), juicio, golpe,
// notas vencidas, puntaje y combo, estrellas y «Revisar partitura». Diseño en mundo/SALONAS.md §4-6.
// La escribió Claude antes de la implementación (S2b): las firmas y REGLAS_BASE no se cambian para que pase.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapaTiempo } from '../supervivencia/musica-motor.js';
import * as S from '../supervivencia/salonas-partitura.js';
import * as Z from '../supervivencia/salonas-reloj.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const casi = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const bloque = (nombre, fn) => { try { fn(); } catch (e) { fallos++; console.log(`FALLA: ${nombre}: ${e.message}`); } };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MUSICA = JSON.parse(fs.readFileSync(path.join(RAIZ, 'mundo', 'datos', 'musica.json'), 'utf8'));
const clon = o => JSON.parse(JSON.stringify(o));
const congelar = o => { Object.values(o).forEach(v => { if (v && typeof v === 'object') congelar(v); }); return Object.freeze(o); };
const R = S.REGLAS_BASE;

// ---------- Canciones de prueba ----------
// A: 4/4 a 120 bpm (s = 0.125) y un coro a 60 bpm (s = 0.25). Bajo de 1 compás por nivel.
const A = {
    bpm: 120, pasos: 16, prog: ['E'],
    estructura: [{ seccion: 'verso', compases: 2 }, { seccion: 'coro', compases: 1, bpm: 60 }],
    capas: [
        { nombre: 'bombo', inst: 'kick', ritmo: 'x...x...x...x...', vol: 0.7 },
        { nombre: 'bajo', inst: 'bajoSlap', vol: 1, compases: 1, niveles: ['verso'],
          bajo: [[0, 's', 28, 1], [2, 'g', 28, 1], [4, 'p', 40, 1], [6, 's', 31, 1], [8, 'r', 28, 2, [28, 35, 40]], [10, 's', 33, 1], [12, 's', 28, 4]] },
        { nombre: 'bajo (coro)', inst: 'bajoSlap', vol: 1, compases: 1, niveles: ['coro'], bajo: [[0, 's', 40, 1], [4, 's', 28, 1]] }
    ]
};
// B: vals en 6/8 (12 pasos) a 90 bpm (s = 1/6), bajo de 2 compases: D, A, E, A
const B = {
    bpm: 90, pasos: 16, prog: ['D'],
    estructura: [{ seccion: 'vals', compases: 2, pasos: 12 }],
    capas: [{ nombre: 'bajo', inst: 'bajoSlap', vol: 1, compases: 2, bajo: [[0, 's', 26, 6], [6, 's', 33, 6], [12, 's', 28, 6], [18, 's', 33, 6]] }]
};
const PESCADOR = MUSICA.canciones && MUSICA.canciones.pescador;

// ---------- Reglas ----------
bloque('reglas', () => {
    ok(iguales(S.DIFICULTADES, ['facil', 'normal', 'dificil', 'experto']), 'DIFICULTADES');
    const copia = S.reglasDe();
    ok(iguales(copia, R) && copia !== R, 'reglasDe() = copia de REGLAS_BASE');
    ok(iguales(S.reglasDe(null), R), 'reglasDe(null)');
    const r = S.reglasDe({ ventanas: { perfecto: 0.03 }, dificultades: { facil: { carriles: 3, rejilla: { 12: [0] } } }, estrellas: { umbrales: [0, 0.5] } });
    ok(r.ventanas.perfecto === 0.03 && r.ventanas.bien === 0.09, 'reglasDe mezcla en profundidad');
    ok(r.dificultades.facil.carriles === 3 && r.dificultades.facil.minSep === 0.35 && r.dificultades.normal.carriles === 3, 'reglasDe: dificultades');
    ok(iguales(r.dificultades.facil.rejilla, { defecto: 4, 12: [0], 14: [0, 4, 8] }), 'reglasDe: rejilla');
    ok(iguales(r.estrellas.umbrales, [0, 0.5]), 'reglasDe: las listas se reemplazan');
    ok(R.ventanas.perfecto === 0.045 && R.dificultades.facil.carriles === 2, 'reglasDe no cambia REGLAS_BASE');
});

// ---------- Partitura ----------
const resumen = p => p.notas.map(x => [+x.t.toFixed(4), x.carriles.join('+'), x.tipo]);
bloque('partitura experto', () => {
    const cong = congelar(clon(A));
    const p = S.partitura(cong, 'experto');
    ok(p.dificultad === 'experto' && p.carriles === 4, 'experto: dificultad y 4 carriles');
    const m = mapaTiempo(A);
    ok(casi(p.duracion, 8) && casi(p.duracion, m.duracion), `duración = mapaTiempo (${p.duracion})`);
    ok(iguales(p.secciones, m.secciones), 'secciones = las de mapaTiempo');
    const compas = d => [[d, '0', 's'], [d + 0.25, '0', 'g'], [d + 0.5, '3', 'p'], [d + 0.75, '1', 's'], [d + 1, '0+1', 'r'], [d + 1.25, '2', 's'], [d + 1.5, '0', 's']];
    const esperado = [...compas(0), ...compas(2), [4, '3', 's'], [5, '0', 's']];
    ok(iguales(resumen(p), esperado), `experto: tiempos, carriles y tipos\n  ${JSON.stringify(resumen(p))}`);
    const n0 = p.notas[0], larga = p.notas[6], acorde = p.notas[4];
    ok(n0.carril === 0 && n0.nota === 28 && n0.dur === 0 && n0.marcada && !n0.brillante && n0.clave === '0:0' && n0.n === 0, 'experto: campos de la primera nota');
    ok(casi(larga.dur, 0.5) && larga.clave === '0:12', `experto: nota larga dur = 4 pasos × 0.125 (${larga.dur})`);
    ok(acorde.carril === 0 && !acorde.marcada && p.notas[1].marcada === false && p.notas[2].marcada === true, 'experto: marcadas solo slap y pop');
    ok(p.notas[7].clave === '1:0' && p.notas[14].clave === '2:0' && p.notas[15].clave === '2:4', 'experto: clave compás:paso en toda la canción');
    ok(p.notas.slice(14).every(x => x.brillante && x.n === 1) && p.notas.slice(0, 14).every(x => !x.brillante), 'experto: el coro es brillante');
    ok(iguales(cong, A), 'partitura no cambia la canción');
    ok(iguales(S.partitura(A, 'experto'), p), 'determinista');
    ok(p.notas.every(x => m.pasos.some(q => casi(q.t, x.t))), 'cada nota cae en un paso del mapa');
});
bloque('partitura difícil, normal y fácil', () => {
    const d = S.partitura(A, 'dificil');
    const sinG = x => [[x, '0', 's'], [x + 0.5, '3', 'p'], [x + 0.75, '1', 's'], [x + 1, '0', 'r'], [x + 1.25, '2', 's'], [x + 1.5, '0', 's']];
    ok(iguales(resumen(d), [...sinG(0), ...sinG(2), [4, '3', 's'], [5, '0', 's']]), `difícil: sin fantasma, sin acorde\n  ${JSON.stringify(resumen(d))}`);
    ok(d.notas.every(x => x.dur === 0), 'difícil: sin notas largas');
    const n = S.partitura(A, 'normal');
    ok(n.carriles === 3, 'normal: 3 carriles');
    ok(iguales(n.notas.map(x => x.carril), [0, 2, 1, 0, 1, 0, 0, 2, 1, 0, 1, 0, 2, 0]), `normal: contorno en 3 carriles ${JSON.stringify(n.notas.map(x => x.carril))}`);
    const f = S.partitura(A, 'facil');
    const fac = x => [[x, '0', 's'], [x + 0.5, '1', 'p'], [x + 1, '0', 'r'], [x + 1.5, '0', 's']];
    ok(f.carriles === 2 && iguales(resumen(f), [...fac(0), ...fac(2), [4, '1', 's'], [5, '0', 's']]), `fácil: solo tiempos fuertes, 2 carriles\n  ${JSON.stringify(resumen(f))}`);
    // Normal hasta corcheas: un paso impar no entra
    const impar = clon(A); impar.capas[1].bajo.push([3, 's', 35, 1]);
    ok(!S.partitura(impar, 'normal').notas.some(x => x.clave === '0:3') && S.partitura(impar, 'dificil').notas.some(x => x.clave === '0:3'), 'normal: sin semicorcheas');
});
bloque('fácil recorta por minSep', () => {
    const rap = { bpm: 200, pasos: 16, prog: ['E'], estructura: [{ seccion: 'verso', compases: 1 }],
        capas: [{ nombre: 'bajo', inst: 'bajoSlap', vol: 1, bajo: [[0, 's', 28, 1], [4, 's', 31, 1], [8, 's', 33, 1], [12, 's', 35, 1]] }] };
    const f = S.partitura(rap, 'facil'); // pasos fuertes cada 0.3 s < 0.35 → queda uno sí y uno no
    ok(iguales(f.notas.map(x => x.clave), ['0:0', '0:8']), `fácil: recorte ${JSON.stringify(f.notas.map(x => x.clave))}`);
    ok(S.partitura(rap, 'normal').notas.length === 4, 'normal no recorta');
});
bloque('6/8 y frase de 2 compases', () => {
    const f = S.partitura(B, 'facil'), e = S.partitura(B, 'experto');
    ok(iguales(f.notas.map(x => [+x.t.toFixed(4), x.clave]), [[0, '0:0'], [1, '0:6'], [2, '1:0'], [3, '1:6']]), `6/8: pasos 0 y 6 son fuertes ${JSON.stringify(f.notas.map(x => [x.t, x.clave]))}`);
    ok(iguales(f.notas.map(x => x.carril), [0, 1, 1, 1]), `6/8 fácil: contorno de la frase de 2 compases ${JSON.stringify(f.notas.map(x => x.carril))}`);
    ok(iguales(e.notas.map(x => x.carril), [0, 3, 2, 3]), `6/8 experto: contorno ${JSON.stringify(e.notas.map(x => x.carril))}`);
    ok(e.notas.every(x => casi(x.dur, 1)), 'experto: 6 pasos × 1/6 s = notas largas de 1 s');
    const otra = S.reglasDe({ dificultades: { facil: { rejilla: { 12: [0] } } } });
    ok(S.partitura(B, 'facil', otra).notas.length === 2, 'la rejilla de 6/8 se cambia por reglas');
});
bloque('capas: niveles, mudo, segunda, octava', () => {
    const C = { bpm: 120, pasos: 16, prog: ['E'], estructura: [{ seccion: 'verso', compases: 8 }],
        capas: [
            { nombre: 'callado', inst: 'bajoSlap', vol: 1, mudo: true, bajo: [[0, 's', 50, 1]] },
            { nombre: 'b2', inst: 'bajoSlap', vol: 1, segunda: true, bajo: [[0, 's', 40, 1]] },
            { nombre: 'b1', inst: 'bajoSlap', vol: 1, octava: 12, bajo: [[0, 's', 28, 1], [0, 'p', 30, 1], [8, 's', 31, 1]] }
        ] };
    const p = S.partitura(C, 'experto');
    const en = k => p.notas.filter(x => x.clave.startsWith(`${k}:`));
    ok(en(0).length === 2 && en(0)[0].nota === 40 && en(0)[0].tipo === 's', `segunda no suena en los compases 0-3; octava suma (${en(0).map(x => x.nota)})`);
    ok(en(4)[0].nota === 40 && en(4).length === 2 && en(4)[1].nota === 43, 'segunda suena en los compases 4-7 y gana por orden');
    ok(p.notas.length === 16 && !p.notas.some(x => x.nota === 50), 'una nota por paso; la capa muda no cuenta');
    ok(S.partitura({ ...A, capas: [A.capas[0]] }, 'experto').notas.length === 0, 'sin bajo → sin notas');
});
bloque('tempo de Práctica', () => {
    const a = S.partitura(A, 'experto'), b = S.partitura(A, 'experto', R, { tempo: 0.5 });
    ok(a.notas.length === b.notas.length && a.notas.every((x, i) => casi(b.notas[i].t, x.t * 2) && casi(b.notas[i].dur, x.dur * 2)), 'tempo 0.5: todo dura el doble');
    ok(casi(b.duracion, 16), 'tempo 0.5: duración');
});
bloque('ajustes a mano', () => {
    const p = S.partitura(A, 'experto', R, { ajustes: { '0:2': 0, '0:4': 9, '0:8': null, '1:8': 3, '7:7': 2 } });
    const de = c => p.notas.find(x => x.clave === c);
    ok(p.notas.length === 15 && !de('0:8'), 'null quita la nota');
    ok(de('0:2').carril === 0 && casi(de('0:2').t, 0.25), 'ajuste mueve el carril y no el tiempo');
    ok(de('0:4').carril === 3, 'ajuste acotado a los carriles');
    ok(iguales(de('1:8').carriles, [2, 3]), 'ajuste en un acorde lo deja en 2 carriles');
});
bloque('pescador (musica.json)', () => {
    ok(PESCADOR, 'existe canciones.pescador');
    const m = mapaTiempo(PESCADOR);
    for (const dif of S.DIFICULTADES) {
        const p = S.partitura(PESCADOR, dif);
        ok(p.notas.length > 0 && p.notas.every(x => x.carril >= 0 && x.carril < p.carriles), `pescador ${dif}: notas en sus carriles`);
        ok(p.notas.every((x, i) => i === 0 || x.t > p.notas[i - 1].t - 1e-9), `pescador ${dif}: en orden`);
        ok(p.notas.every(x => m.pasos.some(q => casi(q.t, x.t))), `pescador ${dif}: tiempos del mapa`);
    }
    const n = S.DIFICULTADES.map(d => S.partitura(PESCADOR, d).notas.length);
    ok(n[0] < n[1] && n[1] < n[2] && n[2] < n[3], `pescador: más notas a más dificultad (${n})`);
    ok(S.partitura(PESCADOR, 'experto').notas.some(x => x.carriles.length === 2) && S.partitura(PESCADOR, 'dificil').notas.every(x => x.carriles.length === 1), 'pescador: acordes solo en experto');
});

// ---------- Juicio ----------
bloque('juicio', () => {
    const n = { marcada: false }, mk = { marcada: true };
    ok(S.juicio(0, n) === 'perfecto' && S.juicio(0.045, n) === 'perfecto' && S.juicio(-0.045, n) === 'perfecto', 'perfecto ±45 ms con borde');
    ok(S.juicio(-0.08, n) === 'bien' && S.juicio(0.09, n) === 'bien', 'bien');
    ok(S.juicio(0.13, n) === 'ok' && S.juicio(-0.135, n) === 'ok' && S.juicio(0.14, n) === null, 'ok y fuera');
    ok(S.juicio(0.04, mk) === 'bien' && S.juicio(0.09, mk) === 'ok' && S.juicio(0.1, mk) === null, 'slap y pop: ventana × 0.7');
    ok(S.juicio(0.04, n, S.reglasDe({ ventanas: { perfecto: 0.03 } })) === 'bien', 'ventanas por reglas');
});
bloque('golpe y vencidas', () => {
    const notas = S.partitura(A, 'experto').notas;
    const g = S.golpe(notas, 0.51, 3, new Set());
    ok(g && g.idx === 2 && g.juicio === 'perfecto' && casi(g.dt, 0.01), `golpe en el carril 3 (${JSON.stringify(g)})`);
    ok(S.golpe(notas, 0.51, 2, new Set()) === null, 'carril equivocado → null');
    ok(S.golpe(notas, 0.51, 3, new Set([2])) === null, 'nota ya hecha → null');
    ok(S.golpe(notas, 1.0, 0, new Set()) === null, 'acorde con un solo carril apretado → null');
    const ac = S.golpe(notas, 1.02, 1, new Set(), R, [0, 1]);
    ok(ac && ac.idx === 4 && ac.juicio === 'perfecto', 'acorde con los dos carriles');
    const cerca = S.golpe(notas, 0.13, 0, new Set(), R); // nota 0 (t 0, marcada) fuera; la 1 (t .25, carril 0) a 0.12: ok
    ok(cerca && cerca.idx === 1 && cerca.juicio === 'ok', `la de menor |dt| dentro de su ventana (${JSON.stringify(cerca)})`);
    ok(iguales(S.vencidas(notas, 0.3, new Set([0])), []), 'vencidas: aún a tiempo');
    ok(iguales(S.vencidas(notas, 0.7, new Set([0])), [1, 2]), 'vencidas: fantasma y pop pasados');
});

// ---------- Puntaje ----------
bloque('puntaje y combo', () => {
    ok(iguales(S.puntajeInicial(), { puntos: 0, combo: 0, comboMax: 0, mult: 1, conteo: { perfecto: 0, bien: 0, ok: 0, fallo: 0 } }), 'puntajeInicial');
    ok([0, 1, 10, 11, 20, 21, 31, 41, 100].map(c => S.multiplicador(c)).join() === '1,1,1,2,2,3,4,4,4', 'multiplicador ×1 → ×4 cada 10');
    let e = S.puntajeInicial();
    const antes = e;
    for (let i = 0; i < 10; i++) e = S.sumar(e, { juicio: 'perfecto' });
    ok(antes.puntos === 0 && antes.combo === 0, 'sumar no cambia el estado');
    ok(e.puntos === 1000 && e.combo === 10 && e.mult === 1, `10 perfectos = 1000 (${e.puntos})`);
    e = S.sumar(e, { juicio: 'perfecto' });
    ok(e.puntos === 1200 && e.mult === 2, 'la nota 11 ya va ×2');
    e = S.sumar(e, { juicio: 'bien', marcada: true });
    ok(e.puntos === 1380 && e.conteo.bien === 1, 'bien marcado ×2 = 60 × 1.5 × 2');
    e = S.sumar(e, { mantener: 0.5 });
    ok(e.puntos === 1430 && e.combo === 12, 'mantener una larga: 50 × 0.5 × 2, sin cambiar el combo');
    e = S.sumar(e, { juicio: 'ok', primus: true });
    ok(e.puntos === 1550, 'Modo Primus dobla: 30 × 2 × 2');
    e = S.sumar(e, { juicio: 'fallo' });
    ok(e.combo === 0 && e.mult === 1 && e.comboMax === 13 && e.conteo.fallo === 1 && e.puntos === 1550, 'fallo corta el combo');
    e = S.sumar(e, { juicio: 'perfecto' });
    ok(e.puntos === 1650 && e.combo === 1 && e.comboMax === 13, 'después del fallo vuelve a ×1');
});
bloque('puntaje máximo y estrellas', () => {
    ok(S.puntajeMaximo(S.partitura(A, 'facil')) === 1400, `máximo de A en fácil = 1400 (${S.puntajeMaximo(S.partitura(A, 'facil'))})`);
    for (const c of [A, B, PESCADOR]) for (const dif of S.DIFICULTADES) {
        const p = S.partitura(c, dif);
        let e = S.puntajeInicial();
        for (const x of p.notas) { e = S.sumar(e, { juicio: 'perfecto', marcada: x.marcada }); if (x.dur > 0) e = S.sumar(e, { mantener: x.dur }); }
        ok(S.puntajeMaximo(p) === e.puntos && e.puntos > 0, `máximo = todo perfecto (${dif})`);
    }
    ok(S.estrellas(0, 1400) === 1 && S.estrellas(490, 1400) === 2 && S.estrellas(489, 1400) === 1, 'estrellas 1 y 2');
    ok(S.estrellas(1288, 1400) === 5 && S.estrellas(1287, 1400) === 4 && S.estrellas(2000, 1400) === 5, 'estrellas 4 y 5 (y Primus por encima del máximo)');
    ok(S.estrellas(10, 0) === 0, 'sin máximo, 0');
    ok(S.estrellas(700, 1400, S.reglasDe({ estrellas: { umbrales: [0, 0.6] } })) === 1, 'umbrales por reglas');
});

// ---------- Revisar partitura ----------
bloque('revisar partitura', () => {
    const tipos = (l, dif) => l.filter(a => a.dificultad === dif).map(a => a.tipo).sort();
    const bien = S.revisarPartitura(PESCADOR);
    ok(!bien.some(a => a.grave), `pescador sin errores graves: ${JSON.stringify(bien.filter(a => a.grave))}`);
    ok(bien.some(a => a.tipo === 'escala' && !a.grave && a.dificultad === null), 'pescador: aviso suave de escala (F y C sobre Mi mayor)');
    ok(bien.every(a => typeof a.texto === 'string' && a.texto.length > 0 && 'n' in a), 'cada aviso trae texto y sección');
    ok(!S.revisarPartitura(B).some(a => a.tipo === 'escala'), 'vals: D-A-E-A sobre Re mayor sin aviso de escala');
    // Muy rápido: 240 bpm en semicorcheas = 16 notas/s y 0.0625 s entre notas
    const rapida = { bpm: 240, pasos: 16, prog: ['E'], estructura: [{ seccion: 'verso', compases: 2 }],
        capas: [{ nombre: 'bajo', inst: 'bajoSlap', vol: 1, bajo: Array.from({ length: 16 }, (_, i) => [i, 's', 28, 1]) }] };
    const r = S.revisarPartitura(rapida);
    ok(iguales(tipos(r, 'experto'), ['densidad']), `rápida experto: densidad ${JSON.stringify(tipos(r, 'experto'))}`);
    ok(iguales(tipos(r, 'dificil'), ['densidad', 'separacion']), `rápida difícil: densidad y separación ${JSON.stringify(tipos(r, 'dificil'))}`);
    ok(iguales(tipos(r, 'normal'), ['densidad']), `rápida normal: 8 notas/s ${JSON.stringify(tipos(r, 'normal'))}`);
    ok(iguales(tipos(r, 'facil'), []), 'rápida fácil: el recorte la deja jugable');
    ok(r.filter(a => a.grave).every(a => a.n === 0), 'avisos con su sección');
    // Ska: el bajo solo a contratiempo → en Fácil la sección queda vacía
    const ska = { bpm: 90, pasos: 16, prog: ['E'], estructura: [{ seccion: 'verso', compases: 1 }, { seccion: 'coro', compases: 1 }],
        capas: [{ nombre: 'bajo', inst: 'bajoSlap', vol: 1, niveles: ['verso'], bajo: [[2, 's', 28, 1], [6, 's', 35, 1], [10, 's', 28, 1], [14, 's', 35, 1]] },
                { nombre: 'bajo (coro)', inst: 'bajoSlap', vol: 1, niveles: ['coro'], bajo: [[0, 's', 28, 1]] }] };
    const k = S.revisarPartitura(ska);
    ok(k.filter(a => a.tipo === 'vacia').map(a => `${a.dificultad}:${a.n}`).join() === 'facil:0', `ska: vacía solo en fácil, sección 0 ${JSON.stringify(k.filter(a => a.tipo === 'vacia'))}`);
    ok(k.find(a => a.tipo === 'vacia').grave === true, 'vacía es grave');
    const sinBajo = S.revisarPartitura({ ...A, capas: [A.capas[0]] });
    ok(sinBajo.filter(a => a.tipo === 'vacia').length === 8, 'sin bajo: vacía en 2 secciones × 4 dificultades');
    // Ajustes huérfanos
    const h = S.revisarPartitura(A, R, { ajustes: { facil: { '0:0': 1, '9:9': 0 }, experto: { '0:2': null } } });
    const hu = h.filter(a => a.tipo === 'huerfano');
    ok(hu.length === 1 && hu[0].dificultad === 'facil' && hu[0].grave === false && hu[0].n === null && hu[0].texto.includes('9:9'), `huérfano ${JSON.stringify(hu)}`);
});

// ---------- S3: reloj, calibración y ajustes del jugable (salonas-reloj.js) ----------
bloque('reloj', () => {
    const ctx = { currentTime: 10, outputLatency: 0.05, baseLatency: 0.01 };
    ok(casi(Z.horaAudio(ctx, 1000, 1000), 9.94), 'sin getOutputTimestamp: currentTime - outputLatency - baseLatency');
    ok(casi(Z.horaAudio(ctx, 900, 1000), 9.84), 'sin getOutputTimestamp: un evento 100 ms antes');
    ok(casi(Z.horaAudio(ctx, 1200, 1300, { contextTime: 9.9, performanceTime: 1100 }), 10.0), 'con getOutputTimestamp: contextTime corrido');
    ok(casi(Z.horaAudio(ctx, 1000, 1000, { contextTime: 0, performanceTime: 0 }), 9.94), 'getOutputTimestamp sin datos: como sin él');
    ok(Z.mediana([]) === null && Z.mediana([3, 1, 2]) === 2 && Z.mediana([4, 1, 3, 2]) === 2.5, 'mediana');
    // Clics cada 0.6 s desde 1.0; los 4 primeros no cuentan
    const clic = i => 1 + i * 0.6, toques = [4, 5, 6, 7, 8, 9, 10, 11].map((i, k) => clic(i) + [0.03, 0.05, 0.04, 0.2, 0.04, 0.05, 0.03, 0.04][k]);
    ok(casi(Z.calibrar(toques, 1, 0.6, { desde: 4, minimo: 5 }), 0.04), `calibrar: mediana ${Z.calibrar(toques, 1, 0.6, { desde: 4 })}`);
    ok(casi(Z.calibrar([clic(5) - 0.02], 1, 0.6, { desde: 4 }), -0.02), 'calibrar: temprano es negativo');
    ok(Z.calibrar(toques.slice(0, 3), 1, 0.6, { desde: 4, minimo: 5 }) === null, 'calibrar: pocos toques → null');
    ok(Z.calibrar([clic(1)], 1, 0.6, { desde: 4 }) === null, 'calibrar: un toque en los clics de entrada no cuenta');
    const mem = new Map(), alm = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
    ok(Z.leerCalibracion(alm) === 0, 'sin calibración guardada: 0');
    ok(Z.guardarCalibracion(alm, 0.0423) === 0.0423 && Z.leerCalibracion(alm) === 0.042, 'guarda en ms redondeados');
    ok(Z.guardarCalibracion(alm, 9) === Z.AJUSTES_SALONAS.calibracion.rango, 'acota al rango');
    const roto = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
    ok(Z.leerCalibracion(roto) === 0 && Z.guardarCalibracion(roto, 0.01) === 0.01 && Z.leerCalibracion(null) === 0, 'almacenamiento roto o ausente: no falla');
    const a = Z.ajustesDe({ carriles: { velocidad: 12 }, teclas: ['KeyA'] });
    ok(a.carriles.velocidad === 12 && a.carriles.ancho === Z.AJUSTES_SALONAS.carriles.ancho && a.teclas.length === 1 && Z.AJUSTES_SALONAS.teclas.length === 4, 'ajustesDe mezcla sin cambiar la base');
    ok(Z.AJUSTES_SALONAS.teclas.length === 4 && Z.AJUSTES_SALONAS.carriles.colores.length === 4, '4 teclas y 4 colores');
    ok(MUSICA.canciones && MUSICA.canciones[Z.AJUSTES_SALONAS.cancion], 'la canción de prueba existe en musica.json');
});

console.log(fallos ? `\n${fallos} fallos` : 'salonas: todo bien');
process.exit(fallos ? 1 : 0);
