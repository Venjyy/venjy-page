// Prueba de la pestaña Combate del Estudio (bloque 8 · N6a): node mundo/tests/estudio-combate.mjs
// Modelo puro estudio/combate-modelo.mjs sobre los estilos reales: lista de acciones, marcas ancladas a la fase (estirar
// una fase mueve las ventanas que vienen después y no las de antes), ida y vuelta cuadro -> marca, barras, arrastre de
// bordes y barras, rapidez, mínimos, bases para partir (solo añade), que los JSON tocados sigan pasando las reglas de
// validar y que el puente acepte los archivos del combate en vivo. Lo del navegador (arrastrar en la línea) lo mira el dueño.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as M from '../../estudio/combate-modelo.mjs';
import { marca, largoFases, faseEn } from '../supervivencia/combate/datos.js';
import { reglasEstilo, reglasCombate } from '../supervivencia/combate/reglas.js';
import { DATOS_VIVOS } from '../../estudio/puente-protocolo.js';
import * as V from '../../estudio/combate-visor-modelo.mjs';
import { fk, punto } from '../supervivencia/combate/cinematica.js';
// N6c: paneles, peso, arena en práctica y el mensaje combate del puente
import * as P from '../../estudio/combate-paneles-modelo.mjs';
import * as W from '../supervivencia/combate/peso.js';
import * as D from '../supervivencia/combate/datos.js';
import * as A from '../supervivencia/arena/modelo.js';
import { LIMITES as LIM } from '../datos/limites.js';
import { crearManejador } from '../../estudio/puente-protocolo.js';

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = n => JSON.parse(fs.readFileSync(path.join(RAIZ, 'mundo', 'datos', n + '.json'), 'utf8'));
const clonar = o => JSON.parse(JSON.stringify(o));
const combate = leer('combate'), limites = leer('poses').limites;
const indice = leer('indice');
const ESTILOS = Object.keys(indice.archivos).filter(k => indice.archivos[k].esquema === 'estilo');
const errores = (estilo, c = combate) => reglasEstilo(estilo, { combate: c, limites }).filter(r => r.tipo === 'error');

// ---------- 1. Lista de acciones ----------
for (const n of ESTILOS) {
    const e = leer(n), g = M.accionesDe(e, combate);
    ok(g.length >= 2, `${n}: al menos ataques y otro grupo`);
    ok(g.find(x => x.grupo === 'ataques').claves.length === Object.keys(e.ataques).length, `${n}: todos los ataques en la lista`);
    const com = g.find(x => x.grupo === 'comunes');
    ok(com && com.archivo === 'combate' && com.claves.length === Object.keys(combate.reacciones).length, `${n}: reacciones comunes de combate.json`);
    for (const x of g) for (const k of x.claves) ok(M.defDe(x.archivo === 'combate' ? combate : e, x.grupo, k), `${n}: defDe ${x.grupo}.${k}`);
}
ok(M.nombreDe({ nombre: { es: 'Tajo', en: 'Slash' } }, 'tajo', 'en') === 'Slash' && M.nombreDe(null, 'x') === 'x', 'nombreDe');

// ---------- 2. Cuadro -> marca -> cuadro (ida y vuelta) en todas las acciones reales ----------
let idas = 0;
for (const n of ESTILOS) {
    const e = leer(n);
    for (const grupo of ['ataques', 'acciones', 'reacciones']) for (const def of Object.values(e[grupo] || {})) {
        if (!def.fases) continue;
        const total = largoFases(def.fases);
        for (let c = 0; c <= total + 2; c++) {
            const m = M.aMarca(c, def.fases);
            idas++;
            if (marca(m, def.fases) !== c) ok(false, `${n}: aMarca(${c}) = ${m} no vuelve`);
            if (c < total) ok(m.startsWith(faseEn(def.fases, c).fase), `${n}: ${m} en la fase de c${c}`);
        }
    }
}
ok(M.aMarca(0, { anticipacion: 0, activo: 11, recuperacion: 8 }) === 'activo+0', 'fase vacía: la marca cae en la siguiente');
ok(M.aMarca(19, { anticipacion: 0, activo: 11, recuperacion: 8 }) === 'fin', 'el final es «fin»');

// ---------- 3. Estirar una fase: las marcas siguen a su fase ----------
{
    const e = leer('estilo-sekiro'), def = e.ataques.tajo1;
    const antes = M.barrasDe(def).map(b => [b.desde, b.hasta]);
    ok(antes.length >= 3, 'tajo1 trae cancelaciones y avance');
    ok(M.estirarFase(def, 'anticipacion', def.fases.anticipacion + 5, true), 'estirar la anticipación');
    const despues = M.barrasDe(def).map(b => [b.desde, b.hasta]);
    // las cancelaciones de tajo1 empiezan en el activo o después: se corren 5
    ok(despues[0][0] === antes[0][0] + 5 && despues[0][1] === antes[0][1] + 5, 'la cancelación al tajo 2 se corre con la fase');
    ok(despues[1][0] === antes[1][0] + 5, 'la cancelación al desvío se corre');
    ok(M.estirarFase(def, 'activo', 0, true) && def.fases.activo === 1, 'un ataque no baja de 1 cuadro activo');
    ok(!M.estirarFase(def, 'activo', 1, true), 'sin cambio = false');
    ok(M.estirarFase(def, 'recuperacion', 9999) && def.fases.recuperacion === M.MAX_FASE, 'tope de la fase');
    ok(!M.estirarFase(def, 'otra', 3) && !M.estirarFase(null, 'activo', 3), 'fase inexistente');
}
// La animación sigue a la fase: sus claves se anclan con «fase» y reloj «fases» (no hay cuadros sueltos que mover)
{
    const e = leer('estilo-sekiro'), a = e.anim.tajo1;
    ok(a && a.reloj === 'fases', 'la animación de tajo1 usa el reloj de fases');
}

// ---------- 4. Arrastrar bordes y barras ----------
{
    const e = leer('estilo-sekiro'), def = e.acciones.esquiva; // iframes [activo+0, activo+8]
    const i = M.barrasDe(def).find(b => b.tipo === 'iframes');
    ok(i && i.desde === 2 && i.hasta === 10, 'i-frames de la esquiva en c2-10');
    ok(M.moverBorde(def, i.ref, 'desde', 4) && def.iframes[0][0] === 'activo+2', 'mover el borde izquierdo escribe la marca de su fase');
    ok(M.moverBorde(def, i.ref, 'hasta', 1) && marca(def.iframes[0][1], def.fases) === 4, 'el borde derecho no pasa al izquierdo');
    M.moverBorde(def, i.ref, 'hasta', 12);
    ok(def.iframes[0][1] === 'recuperacion+2', 'hasta en la recuperación');
    ok(M.moverBarra(def, i.ref, -100) && marca(def.iframes[0][0], def.fases) === 0 && def.iframes[0][1] === 'activo+6', 'mover la barra entera no sale del inicio y conserva su largo');
    ok(!M.moverBarra(def, i.ref, 0), 'delta 0 no cambia');
    const total = largoFases(def.fases);
    M.moverBarra(def, i.ref, 1000);
    ok(marca(def.iframes[0][1], def.fases) === total, 'ni del final');
    const av = M.barrasDe(def).find(b => b.tipo === 'avance');
    ok(av && av.fija && !M.moverBarra(def, av.ref, 2), 'el avance sigue a su fase: no se arrastra');
}
{
    // cancelación abierta (sin hasta) sigue abierta al estirar y al mover hacia atrás
    const e = leer('estilo-sekiro'), def = e.ataques.tajo1;
    const k = def.cancelar.findIndex(v => v.hasta === undefined);
    ok(k >= 0, 'tajo1 tiene una cancelación hasta el final');
    const b = M.barrasDe(def).find(x => x.ref.campo === 'cancelar' && x.ref.i === k);
    ok(b.abierta && b.hasta === largoFases(def.fases) - 1, 'abierta hasta el último cuadro');
    M.moverBarra(def, b.ref, -2);
    ok(def.cancelar[k].hasta === undefined, 'mover hacia atrás la deja abierta');
}

// ---------- 5. Rapidez ----------
{
    const e = leer('estilo-sekiro'), def = e.ataques.estocada, base = clonar(def.fases);
    M.escalarFases(def, 0.5, base, true);
    ok(def.fases.anticipacion === Math.round(base.anticipacion * 0.5) && def.fases.activo >= 1, 'rapidez 0,5 parte de la base');
    M.escalarFases(def, 1, base, true);
    ok(JSON.stringify(def.fases) === JSON.stringify(base), 'volver a 1 deja las fases como estaban (sin redondeos acumulados)');
    // un peligro con menos de 24 c de anticipación lo avisa la revisión
    M.escalarFases(def, 0.5, base, true);
    ok(errores(e).some(r => r.texto.includes('estocada') && r.texto.includes('anticipación')), 'la revisión avisa del peligro apurado');
}

// ---------- 6. Agregar y borrar ventanas ----------
{
    const e = leer('estilo-sekiro'), def = e.ataques.patada;
    const n0 = (def.cancelar || []).length;
    const i = M.agregarCancelacion(def, 'tajo1');
    ok(def.cancelar.length === n0 + 1 && def.cancelar[i].a[0] === 'tajo1', 'agregar cancelación');
    const j = M.agregarTramo(def, 'armadura');
    ok(Array.isArray(def.armadura[j]) && M.barrasDe(def).some(b => b.tipo === 'armadura'), 'agregar armadura');
    ok(M.agregarTramo(def, 'otro') === null, 'tramo inexistente');
    ok(!errores(e).some(r => r.texto.includes('patada')), 'patada con lo agregado pasa las reglas');
    M.borrarTramo(def, 'armadura', j);
    ok(def.armadura === undefined, 'borrar el último tramo quita la clave');
    M.borrarCancelacion(def, i);
    ok((def.cancelar || []).length === n0, 'borrar cancelación');
    ok(!M.borrarCancelacion(def, 99) && !M.borrarTramo(def, 'iframes', 0), 'borrar lo que no hay');
}

// ---------- 7. Bases para partir: duplicar solo añade ----------
{
    const e = leer('estilo-sekiro'), antes = JSON.stringify(e.ataques.tajo1);
    ok(M.duplicarAccion(e, 'ataques', 'tajo1', 'tajo1_b'), 'duplicar');
    ok(JSON.stringify(e.ataques.tajo1) === antes, 'el original no cambia');
    ok(e.ataques.tajo1_b.anim === 'tajo1' && e.ataques.tajo1_b.nombre.es.endsWith('(copia)'), 'la copia usa la misma animación');
    ok(!M.duplicarAccion(e, 'ataques', 'tajo1', 'tajo2'), 'no pisa una clave existente');
    ok(!M.duplicarAccion(e, 'ataques', 'tajo1', 'Mal Nombre'), 'clave inválida');
    ok(!M.duplicarAccion(e, 'ataques', 'nada', 'x'), 'origen inexistente');
    ok(!errores(e).length, 'el estilo con la copia pasa las reglas');
    const c = clonar(combate), k = Object.keys(c.reacciones)[0];
    ok(M.duplicarAccion(c, 'comunes', k, k + '_b') && c.reacciones[k + '_b'], 'duplicar una reacción común (combate.json)');
    ok(!reglasCombate(c, { limites }).filter(r => r.tipo === 'error').length, 'combate.json con la copia pasa las reglas');
}

// ---------- 8. Los estilos reales siguen limpios y el puente acepta los archivos ----------
for (const n of ESTILOS) ok(!errores(leer(n)).length, `${n}: sin errores`);
for (const n of ['combate', ...ESTILOS]) ok(DATOS_VIVOS.includes(n), `el puente aplica ${n} en vivo`);
ok(M.CASILLAS_MOTOR.some(([r]) => r.join('.') === 'motor.suelo'), 'el suelo automático está en la pestaña');
for (const [k, , , min, max] of [...M.CAMPOS_ATAQUE.simple, ...M.CAMPOS_ATAQUE.avanzado]) ok(min < max && typeof k === 'string', `campo ${k}`);

// ---------- 9. Visor (N6b): simulación con el motor del juego, punta del arma y hoja de cuadros ----------
let simuladas = 0;
for (const n of ESTILOS) {
    const e = leer(n);
    for (const grupo of ['ataques', 'acciones', 'reacciones']) for (const [k, def] of Object.entries(e[grupo] || {})) {
        if (!def.fases) continue;
        const s = V.simular(e, combate, k);
        simuladas++;
        if (!s) { ok(false, `${n}.${k}: sin simulación`); continue; }
        const total = largoFases(def.fases);
        ok(s.total === total && s.cuadros.length >= V.BUCLE.antes + total + V.BUCLE.despues, `${n}.${k}: largo del bucle`);
        ok(s.cuadros[V.indiceDe(s, 0)].c === 0 && s.cuadros[V.indiceDe(s, total - 1)].c === total - 1, `${n}.${k}: indiceDe`);
        let finitos = true, salto = 0;
        s.cuadros.forEach(q => { for (const v of Object.values(q.A)) if (!Number.isFinite(v)) finitos = false; });
        // al entrar a la acción y al volver a la guardia, la mezcla del motor no da saltos (dentro de la acción, un golpe
        // puede ser tan rápido como su velocidadMax: eso es de la animación)
        for (const i of [V.indiceDe(s, 0), V.indiceDe(s, total - 1) + 1]) for (const c of ['bDx', 'bDz', 'pDx', 'pIx', 'ry', 'pY', 'codoD']) salto = Math.max(salto, Math.abs(s.cuadros[i].A[c] - s.cuadros[i - 1].A[c]));
        ok(finitos, `${n}.${k}: poses finitas`);
        ok(salto < 0.8, `${n}.${k}: sin saltos al entrar y al salir (máx ${salto.toFixed(2)} rad por cuadro)`);
        if (grupo === 'ataques' && def.fases.activo) {
            ok(s.golpe === def.fases.anticipacion && s.reaccion && s.cuadros[V.indiceDe(s, s.golpe)].rc === 0, `${n}.${k}: el rival reacciona en el primer cuadro del golpe`);
            ok(s.cuadros[V.indiceDe(s, s.golpe) - 1].rc === null, `${n}.${k}: no antes`);
            ok(s.zR > s.cuadros[V.indiceDe(s, s.golpe)].raizA.z, `${n}.${k}: el rival queda adelante`);
        }
        const h = V.cuadrosHoja(def.fases, 8);
        ok(h.length <= 8 && h.every((x, i) => !i || x.c > h[i - 1].c) && h[0].c === 0, `${n}.${k}: hoja de cuadros ordenada`);
        if (def.fases.activo) ok(h.some(x => x.c === def.fases.anticipacion || (!def.fases.anticipacion && x.c === 0)), `${n}.${k}: la hoja trae el primer cuadro del golpe`);
    }
}
{
    // Punta del arma: la de la katana está al largo de la hoja desde la muñeca; sin arma, la mano o el pie que golpea
    const e = leer('estilo-sekiro'), s = V.simular(e, combate, 'tajo1'), q = s.cuadros[V.indiceDe(s, s.golpe)];
    const m = fk(q.A, q.raizA), mu = punto(m.munecaD, 0, 0, 0), a = e.arma.caja;
    const largo = Math.hypot(a.centro[0], a.centro[1], a.centro[2] + a.medidas[2] / 2);
    ok(Math.abs(Math.hypot(...q.punta.map((v, i) => v - mu[i])) - largo) < 1e-6, 'punta de la katana al largo de la hoja');
    const u = leer('estilo-urbano'), k = Object.keys(u.ataques).find(x => u.ataques[x].golpea === 'manoI');
    if (k) {
        const su = V.simular(u, combate, k), qu = su.cuadros[V.indiceDe(su, su.golpe)];
        const mi = punto(fk(qu.A, qu.raizA).munecaI, 0, 0, 0);
        ok(qu.punta.every((v, i) => Math.abs(v - mi[i]) < 1e-9), 'sin arma: la punta es la mano que golpea');
    }
    ok(V.simular(e, combate, 'no_existe') === null, 'acción que no existe: null');
}

// ---------- 10. Claves ancladas a la fase (puntos sobre la línea y curva) ----------
let claves = 0;
for (const n of ESTILOS) {
    const e = leer(n);
    for (const grupo of ['ataques', 'acciones', 'reacciones']) for (const [k, def] of Object.entries(e[grupo] || {})) {
        const info = def.fases && V.animDeAccion(e, combate, def, k);
        if (!info || !V.usaFases(info.anim)) continue;
        for (const { canal, puntos } of V.clavesDe(info.anim, def.fases)) for (const p of puntos) {
            claves++;
            const q = V.claveDeCuadro(p.c, def.fases);
            if (Math.abs(V.cuadroDeClave(q, def.fases) - p.c) > 0.05) ok(false, `${n}.${k}.${canal}[${p.i}]: c${p.c} no vuelve`);
        }
    }
}
ok(claves > 500, `claves revisadas (${claves})`);
{
    const e = leer('estilo-sekiro'), def = e.ataques.tajo1, anim = e.anim[def.anim || 'tajo1'], f = def.fases;
    const k = anim.canales.bDx.k, n0 = k.length;
    // mover una clave: queda en la fase donde cae y no pasa a sus vecinas
    const i = k.findIndex(q => q[0] === 'g');
    ok(V.moverClave(anim, 'bDx', i, f.anticipacion + 1, f) && k[i][0] === 'g' && V.cuadroDeClave(k[i], f) === f.anticipacion + 1, 'mover una clave dentro del golpe');
    const antes = V.cuadroDeClave(k[i - 1], f);
    V.moverClave(anim, 'bDx', i, 0, f);
    ok(V.cuadroDeClave(k[i], f) === antes, 'no pasa a la clave de antes');
    V.moverClave(anim, 'bDx', i, f.anticipacion + 2, f);
    // estirar la anticipación corre la clave del golpe con su fase
    const c0 = V.cuadroDeClave(k[i], f);
    M.estirarFase(def, 'anticipacion', f.anticipacion + 6, true);
    ok(V.cuadroDeClave(k[i], def.fases) === c0 + 6, 'estirar la preparación corre las claves del golpe');
    // valor dentro del límite duro
    ok(V.fijarValor(anim, 'bDx', i, -99) && k[i][2] === limites.bDx[0], 'el valor queda en el límite del canal');
    // agregar y borrar
    const j = V.agregarClave(anim, 'bDx', 3, -1.2, def.fases);
    ok(j >= 0 && k.length === n0 + 1 && k.every((q, x) => !x || V.cuadroDeClave(q, def.fases) >= V.cuadroDeClave(k[x - 1], def.fases)), 'agregar en orden');
    ok(Math.abs(V.valorEn(anim, 'bDx', V.cuadroDeClave(k[j], def.fases), def.fases) - -1.2) < 1e-9, 'la curva pasa por la clave nueva');
    ok(V.borrarClave(anim, 'bDx', j) && k.length === n0, 'borrar');
    const m = V.muestras(anim, 'bDx', def.fases, 60);
    ok(m.length === 61 && m[60][0] === largoFases(def.fases) && m.every(([, v]) => Number.isFinite(v)), 'muestras de la curva');
    const [ra, rb] = V.rangoCanal(anim, 'bDx', def.fases);
    ok(ra < rb, 'rango de la curva');
    ok(!errores(e).length, 'el estilo con claves editadas pasa las reglas');
    const s = V.simular(e, combate, 'tajo1');
    ok(s.total === largoFases(def.fases), 'la simulación usa las fases nuevas');
    // una sola clave no se borra
    const solo = { reloj: 'fases', canales: { cx: { k: [['a', 0, 0.1]] } } };
    ok(!V.borrarClave(solo, 'cx', 0) && V.canalesConClaves(solo).includes('cx'), 'siempre queda una clave');
    ok(!V.canalesConClaves({ reloj: 't', canales: { cx: { k: [[0, 1]] } } }).length, 'otro reloj: sin puntos de fase');
}
// La pestaña trae el visor, la curva y los botones
{
    const html = fs.readFileSync(path.join(RAIZ, 'estudio', 'index.html'), 'utf8');
    for (const id of ['co-vista', 'co-hoja', 'co-play', 'co-vel', 'co-ver-claves', 'co-curva', 'co-valor', 'co-llega']) ok(html.includes(`id="${id}"`), `index.html trae #${id}`);
}

// ---------- N6c: pausa del golpe y empuje en el visor, rival de otro estilo, canal nuevo ----------
{
    const e = leer('estilo-sekiro'), u = leer('estilo-urbano');
    for (const [nombre, est] of [['estilo-sekiro', e], ['estilo-urbano', u]]) for (const clave of Object.keys(est.ataques)) {
        const s = V.simular(est, combate, clave), s0 = V.simular(est, combate, clave, { peso: false });
        if (!s || s.golpe === null || !s.reaccion) continue;
        const pg = W.pesoDe(W.nivelDe(s.def));
        ok(s.hitstop === Math.round(pg.hitstop || 0), `${nombre}.${clave}: hitstop del peso de su nivel`);
        ok(s.cuadros.length === s0.cuadros.length + s.hitstop, `${nombre}.${clave}: el hitstop suma cuadros al bucle`);
        const quietos = s.cuadros.filter(q => q.hs !== null);
        ok(quietos.length === s.hitstop && quietos.every(q => q.c === s.golpe && q.rc === 0), `${nombre}.${clave}: congelados en el cuadro del golpe`);
        for (const c of [0, s.golpe, s.golpe + 1, s.total - 1]) ok(s.cuadros[V.indiceDe(s, c)].c === c && s.cuadros[V.indiceDe(s, c)].hs === (c === s.golpe && s.hitstop ? 0 : null), `${nombre}.${clave}: indiceDe(${c})`);
        const emp = s.def.empuje != null ? s.def.empuje : pg.empuje || 0;
        ok(Math.abs(s.empuje - Math.round(emp * 1000) / 1000) < 1e-9, `${nombre}.${clave}: empuje del ataque o de su nivel`);
        const ultimo = s.cuadros[s.cuadros.length - 1];
        ok(Math.abs(ultimo.raizR.z - s.zR - emp) < Math.max(0.02, emp * 0.05), `${nombre}.${clave}: el rival termina corrido el empuje (${ultimo.raizR.z - s.zR} de ${emp})`);
        ok(s.cuadros.every(q => q.c >= s.golpe || q.raizR.z === s.zR),`${nombre}.${clave}: nada de empuje antes del golpe`);
        ok(s0.hitstop === 0 && s0.cuadros.every(q => q.raizR.z === s0.zR), `${nombre}.${clave}: sin peso, sin pausa ni empuje`);
    }
    // con temblor: el rival se mueve durante el hitstop
    const s = V.simular(e, combate, 'tajo1');
    if (s.hitstop > 1 && combate.impacto.temblor.amplitud > 0) ok(new Set(s.cuadros.filter(q => q.hs !== null).map(q => q.raizR.z)).size > 1, 'el rival tiembla en la pausa');
    // rival de otro estilo: su reacción y su animador
    const r = V.simular(e, combate, 'tajo1', { estiloR: u });
    ok(r && r.reaccion && r.cuadros.every(q => Object.values(q.R).every(v => typeof v !== 'number' || Number.isFinite(v))), 'rival de Urban Reign contra un tajo de Sekiro');
    // canal nuevo
    const ec = clonar(e), def = ec.ataques.tajo1, anim = V.animDeAccion(ec, combate, def, 'tajo1').anim;
    const libres = V.canalesLibres(anim, Object.keys(LIM));
    ok(libres.length > 0 && libres.every(k => !(k in anim.canales)), 'canales libres: los que no tiene');
    const k0 = libres[0];
    ok(V.agregarCanal(anim, k0, def.fases), 'agregar canal');
    ok(anim.canales[k0].k.length === 2 && V.clavesDe(anim, def.fases).some(x => x.canal === k0), 'el canal nuevo tiene dos claves de fase');
    const lim = LIM[k0];
    ok(!lim || anim.canales[k0].k.every(q => q[2] >= lim[0] && q[2] <= lim[1]), 'dentro del límite');
    ok(!V.agregarCanal(anim, k0, def.fases) && !V.agregarCanal(anim, Object.keys(anim.canales)[0], def.fases), 'un canal que ya existe no se toca');
    ok(!V.canalesLibres(anim, Object.keys(LIM)).includes(k0), 'ya no está libre');
    ok(!errores(ec).length, 'el estilo con el canal nuevo pasa las reglas');
    ok(!V.agregarCanal({ reloj: 't', canales: {} }, 'cx', def.fases), 'otro reloj: no agrega');
}
// ---------- N6c: paneles (modelo) ----------
{
    const c = clonar(combate);
    // leer / fijar crea lo que falta
    const o = {}; P.fijar(o, ['a', 'b', 0], 3);
    ok(Array.isArray(o.a.b) && P.leer(o, ['a', 'b', 0]) === 3 && P.leer(o, ['x', 'y']) === undefined, 'leer y fijar por ruta');
    // Los rangos de cada campo cubren los valores de hoy (el control no los recorta al mostrarlos)
    const dentro = (v, min, max) => v === undefined || (v >= min && v <= max);
    for (const n of P.NIVELES) for (const [k, , , min, max] of P.CAMPOS_PESO) ok(dentro(P.leer(c, ['peso', n, k]), min, max), `peso.${n}.${k} en rango`);
    for (const n of P.NIVELES) for (const [k, , , min, max] of P.CAMPOS_LENTA) ok(dentro(P.leer(c, ['peso', n, 'camaraLenta', k]), min, max), `peso.${n}.camaraLenta.${k} en rango`);
    for (const [r, , , min, max] of P.CAMPOS_IMPACTO) ok(dentro(P.leer(c, ['impacto', ...r]), min, max), `impacto.${r.join('.')} en rango`);
    for (const [r, , , min, max] of P.CAMPOS_SONIDO) ok(dentro(P.leer(c, ['sonidos', ...r]), min, max), `sonidos.${r.join('.')} en rango`);
    for (const [r, , , min, max] of P.CAMPOS_TACTIL) ok(dentro(P.leer(c, r), min, max), `${r.join('.')} en rango`);
    for (const [k, , , min, max] of P.CAMPOS_PARED) ok(dentro(P.leer(c, ['elegir', 'pared', k]), min, max), `elegir.pared.${k} en rango`);
    for (const capa of ['aire', 'cuerpo']) for (const v of P.leer(c.sonidos, P.rutaVoces(capa)) || []) for (const [k, , , min, max] of P.CAMPOS_VOZ[v.tipo]) ok(dentro(v[k], min, max), `voz de ${capa}.${k} en rango`);
    for (const m of P.MATERIALES) for (const v of P.leer(c.sonidos, P.rutaVoces('impacto', m[0])) || []) for (const [k, , , min, max] of P.CAMPOS_VOZ[v.tipo]) ok(dentro(v[k], min, max), `voz de impacto.${m[0]}.${k} en rango`);
    for (const n of ESTILOS) {
        const cpu = leer(n).cpu || {};
        for (const [r, , , min, max] of P.camposCpuDe(cpu)) {
            const v = P.leer(cpu, r);
            ok(Array.isArray(v) ? v.every(x => dentro(x, min, max)) : dentro(v, min, max), `${n}: cpu.${r.join('.')} en rango`);
        }
        for (const [r] of P.porDificultadDe(cpu)) for (const [d] of P.DIFICULTADES) ok(dentro(P.leer(cpu, [...r, d]), 0, 1), `${n}: cpu.${r.join('.')}.${d} en rango`);
    }
    ok(P.camposCpuDe(leer('estilo-sekiro').cpu).length >= 10 && P.porDificultadDe(leer('estilo-urbano').cpu).length === 3, 'campos de la CPU de cada estilo');
    // «oír»: cada capa sola, y el juego queda como estaba
    const antes = JSON.stringify(W.capasSonido('fuerte', { material: 'metal' }));
    for (const n of P.NIVELES) {
        const aire = P.vocesDe(c, n, 'aire'), imp = P.vocesDe(c, n, 'impacto', 'metal'), cue = P.vocesDe(c, n, 'cuerpo'), todo = P.vocesDe(c, n, 'todo', 'carne');
        ok(aire.length === c.sonidos.aire.voces.length, `${n}: aire solo`);
        ok(imp.length === c.sonidos.impacto.metal.length && imp.every(v => !v.retardo), `${n}: impacto solo y sin eco`);
        ok(cue.length === (n === 'desvio' || n === 'perfecto' ? 0 : c.sonidos.cuerpo.voces.length), `${n}: cuerpo solo (no suena en un desvío)`);
        ok(todo.length > imp.length && todo.some(v => v.retardo > 0), `${n}: golpe entero con eco`);
        ok([...aire, ...imp, ...cue, ...todo].every(v => v.vol >= 0 && v.dur > 0), `${n}: voces tocables`);
    }
    D.fijarCombate(combate);
    ok(JSON.stringify(W.capasSonido('fuerte', { material: 'metal' })) === antes, 'oír no cambia el sonido del juego');
    // un cambio en el volumen del nivel se oye
    const c2 = clonar(c); c2.sonidos.niveles.fuerte = 0.5;
    ok(P.vocesDe(c2, 'fuerte', 'impacto', 'metal')[0].vol < P.vocesDe(c, 'fuerte', 'impacto', 'metal')[0].vol, 'el volumen del nivel cambia lo que se oye');
    D.fijarCombate(combate);
    // Reacciones
    const rt = P.reaccionesDeTabla(c.elegir);
    ok(rt.includes('alto_leve') && rt.includes('derribo') && rt.every(k => c.reacciones[k]), 'reacciones de la tabla');
    // Teclas
    const T = clonar(c.teclas);
    ok(!Object.keys(P.choques(T, 'raton')).length && !Object.keys(P.choques(T, 'teclado')).length, 'los perfiles de hoy no repiten teclas');
    ok(P.ponerTecla(T, 'raton', 'atacar', 0, 'KeyF') && T.arena.raton.atacar[0] === 'KeyF', 'cambiar una tecla');
    ok(P.ponerTecla(T, 'raton', 'atacar', 1, 'Mouse1') && T.arena.raton.atacar.length === 2, 'agregar otra tecla');
    ok(!P.ponerTecla(T, 'raton', 'atacar', 2, 'KeyF'), 'la misma tecla dos veces en una acción, no');
    ok(P.ponerTecla(T, 'raton', 'defensa', 0, 'KeyF') && P.choques(T, 'raton').KeyF.length === 2, 'choque de teclas');
    ok(P.quitarTecla(T, 'raton', 'atacar', 0) && T.arena.raton.atacar.join() === 'Mouse1' && !P.quitarTecla(T, 'raton', 'atacar', 0), 'quitar (queda una)');
    ok(!P.ponerTecla(T, 'nada', 'atacar', 0, 'KeyF'), 'perfil que no existe');
    ok(P.codigoDe({ type: 'keydown', code: 'KeyJ' }) === 'KeyJ' && P.codigoDe({ type: 'mousedown', button: 2 }) === 'Mouse2' && P.codigoDe({ type: 'keydown', code: 'Escape' }) === null, 'código de un evento');
    ok(P.nombreTecla('KeyA') === 'A' && P.nombreTecla('Mouse0') === 'Clic izquierdo' && P.nombreTecla('Mouse0', 'en') === 'Left click' && P.nombreTecla('Digit3') === '3', 'nombres de teclas');
    for (const [k] of P.ACCIONES_TECLA) ok(Array.isArray(c.teclas.arena.raton[k]), `la acción ${k} está en el perfil`);
    // Probar
    ok(JSON.stringify(P.mensajeProbar('estilo-sekiro', 'ataques', 'tajo1', 'dificil')) === JSON.stringify({ accion: 'probar', estilo: 'sekiro', ataque: 'tajo1', reaccion: false, dificultad: 'dificil' }), 'mensaje probar (ataque)');
    ok(P.mensajeProbar('estilo-urbano', 'comunes', 'derribo').reaccion === true && P.mensajeProbar('estilo-urbano', 'reacciones', 'cojera').reaccion === true, 'mensaje probar (reacción)');
    // Los JSON editados por los paneles siguen pasando las reglas
    P.fijar(c, ['peso', 'remate', 'empuje'], 0.8); P.fijar(c, ['elegir', 'acumular', 'leves'], 4); c.teclas = T; c.teclas.arena.raton.defensa = ['Mouse2'];
    ok(!reglasCombate(c, { limites }).filter(r => r.tipo === 'error').length, 'combate.json editado pasa las reglas');
}
// ---------- N6c: «Probar en el juego» (arena y puente) ----------
{
    const ARENA = leer('arena'), R = A.reglasArena(ARENA);
    const R2 = A.reglasProbar(R, 'tajo1');
    ok(R2 !== R && R2.practica.patron.length === 1 && R2.practica.patron[0].accion === 'tajo1' && !R2.practica.peligroCada && !R2.practica.desviaCada, 'reglas de probar un ataque');
    ok(R.practica.patron.length === ARENA.practica.patron.length, 'probar no toca las reglas de la arena');
    ok(A.reglasProbar(R, 'derribo', true).muneco.reacciones.join() === 'derribo' && !R.muneco.reacciones.length, 'reglas de probar una reacción');
    // El rival (Lalo, Sekiro) repite el ataque elegido
    const estilos = { sekiro: leer('estilo-sekiro'), urbano: leer('estilo-urbano'), prueba: leer('estilo-prueba') };
    for (const ataque of ['tajo1', 'estocada']) {
        const Pp = A.nuevaPelea(R, { estilos, semilla: 7, yo: 'moises', rival: 'lalo', sinAnimar: true });
        Pp.R = A.reglasProbar(R, ataque);
        let n = 0; while (!Pp.listaEntrada && n++ < 2000) A.pasoPelea(Pp, []);
        A.empezarRondas(Pp);
        let vistos = 0, otros = 0, ultimo = -1;
        for (let i = 0; i < 60 * 30 && Pp.fase !== 'final'; i++) {
            A.pasoPelea(Pp, [{}, A.intencionPractica(Pp, 1)]);
            const p = Pp.f[1].p;
            if (p.estado === 'ataque' && p.cambio.n !== ultimo) { ultimo = p.cambio.n; if (p.clave === ataque) vistos++; else otros++; }
        }
        ok(vistos >= 3 && !otros, `probar: el rival repite ${ataque} (${vistos} veces, ${otros} otros)`);
    }
    // Puente: el mensaje combate
    const llamadas = [];
    const responder = crearManejador({ idioma: () => 'es', aplicarDatos() {}, combate: o => { llamadas.push(o); } });
    const r1 = await responder({ de: 'estudio', id: 1, tipo: 'combate', accion: 'probar', estilo: 'sekiro', ataque: 'tajo1', dificultad: 'dificil' });
    ok(r1.tipo === 'ok' && llamadas[0].estilo === 'sekiro' && llamadas[0].ataque === 'tajo1' && llamadas[0].reaccion === false && llamadas[0].dificultad === 'dificil', 'puente: probar');
    const r2 = await responder({ de: 'estudio', id: 2, tipo: 'combate', accion: 'probar', estilo: 'urbano', ataque: 'derribo', reaccion: true });
    ok(r2.tipo === 'ok' && llamadas[1].reaccion === true && llamadas[1].dificultad === 'normal', 'puente: probar una reacción');
    ok((await responder({ de: 'estudio', id: 3, tipo: 'combate', accion: 'terminar' })).tipo === 'ok' && llamadas[2].accion === 'terminar', 'puente: terminar');
    for (const [m, que] of [[{ accion: 'otra' }, 'acción'], [{ accion: 'probar', estilo: 'Sekiro!', ataque: 'tajo1' }, 'estilo'], [{ accion: 'probar', estilo: 'sekiro', ataque: '' }, 'ataque'], [{ accion: 'probar', estilo: 'sekiro', ataque: 'tajo1', dificultad: 'imposible' }, 'dificultad']]) {
        ok((await responder({ de: 'estudio', id: 9, tipo: 'combate', ...m })).tipo === 'error', `puente: rechaza ${que} no válida`);
    }
    ok((await crearManejador({ idioma: () => 'es', aplicarDatos() {} })({ de: 'estudio', id: 4, tipo: 'combate', accion: 'terminar' })).tipo === 'error', 'puente: sin arena, error');
    ok(typeof ARENA.textos.probando.es === 'string' && ARENA.textos.probando.en, 'texto «probando» ES/EN');
}
{
    const html = fs.readFileSync(path.join(RAIZ, 'estudio', 'index.html'), 'utf8');
    for (const id of ['co-rival', 'co-peso', 'co-canal-nuevo', 'co-probar', 'co-probar-dif', 'co-terminar', 'co-paneles']) ok(html.includes(`id="${id}"`), `index.html trae #${id}`);
}

console.log(fallos ? `${fallos} de ${pruebas} fallaron` : `estudio-combate: ${pruebas} pruebas bien (${idas} idas y vueltas de marcas, ${simuladas} acciones simuladas, ${claves} claves)`);
process.exit(fallos ? 1 : 0);
