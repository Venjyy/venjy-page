// =========================================================
// VENJY · Supervivencia · Salonas: partitura, juicio, puntaje y estrellas (puro: no toca el navegador)
// Diseño en mundo/SALONAS.md §4-6. La partitura sale sola de la capa `bajo` de una canción de musica.json
// (canciones.<clave>, formato en estudio/DISENO.md §24) y usa los mismos segundos que el audio (mapaTiempo).
// Contrato: mundo/tests/salonas.mjs (S2). Lo implementa el PR S2b sin cambiar las firmas ni REGLAS_BASE.
// Los valores de REGLAS_BASE pasan a mundo/datos/salonas.json en S9 (el juego llamará reglasDe(json)).
// =========================================================
import { mapaTiempo, acordeEn } from './musica-motor.js';

export const DIFICULTADES = ['facil', 'normal', 'dificil', 'experto'];

// Reglas por defecto (segundos, pasos y puntos). Cualquier función recibe `reglas` ya completas (reglasDe).
// rejilla: en qué pasos del compás puede caer una nota. Un número N = los pasos múltiplos de N; una lista = esos
// pasos. La clave es los pasos por compás de la sección (16 = 4/4, 12 = 6/8, 14 = 7/8) y si no está, `defecto`.
export const REGLAS_BASE = {
    dificultades: {
        // recortar: quita notas hasta que ninguna quede a menos de minSep de la anterior (en las otras solo se revisa)
        facil: { carriles: 2, rejilla: { defecto: 4, 12: [0, 6], 14: [0, 4, 8] }, fantasma: false, largas: false, acordes: false, recortar: true, minSep: 0.35, maxNotasSeg: 3 },
        normal: { carriles: 3, rejilla: { defecto: 2 }, fantasma: false, largas: false, acordes: false, recortar: false, minSep: 0.12, maxNotasSeg: 6 },
        dificil: { carriles: 4, rejilla: { defecto: 1 }, fantasma: false, largas: false, acordes: false, recortar: false, minSep: 0.07, maxNotasSeg: 9 },
        experto: { carriles: 4, rejilla: { defecto: 1 }, fantasma: true, largas: true, acordes: true, recortar: false, minSep: 0.05, maxNotasSeg: 12 }
    },
    largaPasos: 4,               // una nota dura ≥ este número de pasos → nota larga (solo si la dificultad tiene largas)
    brillantes: ['coro'],        // secciones (por nivel o por nombre) cuyas notas cargan el Modo Primus
    ventanas: { perfecto: 0.045, bien: 0.09, ok: 0.135, marcada: 0.7 },  // ± segundos; slap y pop usan × marcada
    puntos: { perfecto: 100, bien: 60, ok: 30, marcada: 1.5, larga: 50 }, // marcada = × a slap y pop; larga = por segundo mantenido
    combo: { paso: 10, max: 4 },  // ×1 las primeras `paso` notas seguidas, ×2 las siguientes `paso`… hasta ×max
    primus: { seg: 8, factor: 2 },
    estrellas: { umbrales: [0, 0.35, 0.55, 0.75, 0.92] } // fracción del puntaje máximo para 1, 2, 3, 4 y 5 estrellas
};

const FALTA = nombre => new Error(`salonas-partitura: falta implementar ${nombre} (PR S2b)`);

const clona = x => Array.isArray(x) ? x.map(clona) : x && typeof x === 'object'
    ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, clona(v)])) : x;
const mezcla = (base, parcial) => {
    const salida = clona(base);
    if (!parcial || typeof parcial !== 'object' || Array.isArray(parcial)) return salida;
    for (const [k, v] of Object.entries(parcial)) {
        salida[k] = v && typeof v === 'object' && !Array.isArray(v) && salida[k] && typeof salida[k] === 'object' && !Array.isArray(salida[k])
            ? mezcla(salida[k], v) : clona(v);
    }
    return salida;
};

// REGLAS_BASE con lo que traiga `parcial` encima (mezcla profunda de objetos; listas y números se reemplazan).
// No cambia REGLAS_BASE. reglasDe() o reglasDe(null) = una copia de REGLAS_BASE.
export function reglasDe(parcial) { return mezcla(REGLAS_BASE, parcial); }

// Partitura de una canción para una dificultad → { dificultad, carriles, duracion, secciones, notas }
//  · duracion y secciones: las de mapaTiempo(cancion, tempo) (tempo = factor de Práctica, 0.5-1).
//  · De qué nota sale cada paso del mapa ({ t, n, k, i, s }): de las capas con `bajo` que suenan en el nivel de la
//    sección (como en tocarPaso de musica-motor.js: sin `mudo`, `niveles` incluye el nivel o no hay `niveles`, y
//    `segunda` solo en los compases 4-7, 12-15…), la primera (en el orden de `capas`) que tiene alguna nota en el
//    índice (k % compases) * pasos + i, y de ella la primera nota de ese índice. Un paso da como mucho una nota.
//  · Filtros de la dificultad, en este orden: sin fantasma ('g') si fantasma es false; solo los pasos de la rejilla;
//    con recortar, en orden de tiempo, se salta toda nota a menos de minSep s de la última que quedó.
//  · Carril por contorno, dentro de la frase (una vuelta de la capa: misma sección y mismo floor(k / compases)):
//    las alturas distintas de las notas que quedaron se ordenan de grave a aguda; rango r de D alturas →
//    carril = Math.round(r * (carriles - 1) / (D - 1)); si D = 1, Math.floor((carriles - 1) / 2).
//    La altura es la nota MIDI del bajo más la `octava` de la capa.
//  · Acorde: rasgueo ('r') con acordes → carriles [a, a + 1] con a = Math.min(carril, carriles - 2). Si no, un carril.
//  · Nota larga: con largas y duración ≥ largaPasos pasos → dur = duración * s (segundos); si no, dur = 0.
// Cada nota: { t, dur, carril, carriles, tipo, nota, marcada, brillante, clave, n }
//   carril = carriles[0]; marcada = tipo 's' o 'p'; brillante = nivel o nombre de la sección en reglas.brillantes;
//   clave = 'compás:paso', con el compás contado desde 0 en toda la canción; n = índice de la sección.
// Orden: por t y después por carril. Determinista; no cambia `cancion`. Sin capa de bajo → notas vacías.
// opciones.ajustes = { clave: carril | null } de esta dificultad (pestaña Ritmo): un número cambia el carril de esa
// nota (acotado a 0..carriles-1, y en un acorde se vuelve a aplicar la regla de arriba); null la quita. Las claves
// que no existen se ignoran (revisarPartitura las avisa). Nunca cambian el tiempo de una nota.
export function partitura(cancion, dificultad, reglas = REGLAS_BASE, { tempo = 1, ajustes = null } = {}) {
    const r = reglas.dificultades[dificultad], mapa = mapaTiempo(cancion, tempo), P = mapa.secciones[0]?.pasos || cancion.pasos || 16;
    const datos = [];
    for (const p of mapa.pasos) {
        const sec = mapa.secciones[p.n], compases = sec.compases, j = (p.k % (cancion.capas || []).find(x => x.bajo)?.compases || 1) * sec.pasos + p.i;
        let elegida = null;
        for (const capa of cancion.capas || []) {
            if (!capa.bajo || capa.mudo || (capa.niveles && !capa.niveles.includes(sec.nivel)) || (capa.segunda && Math.floor(p.k / 4) % 2 === 0)) continue;
            const idx = (p.k % (capa.compases || 1)) * sec.pasos + p.i;
            const nota = (capa.bajo || []).find(x => x[0] === idx);
            if (nota) { elegida = { capa, nota }; break; }
        }
        if (!elegida) continue;
        const { capa, nota } = elegida, [paso, tipo, midi, largo] = nota;
        if (!r.fantasma && tipo === 'g') continue;
        const rejilla = r.rejilla[sec.pasos] ?? r.rejilla.defecto;
        if (Array.isArray(rejilla) ? !rejilla.includes(p.i) : p.i % rejilla !== 0) continue;
        datos.push({ t: p.t, s: p.s, duracion: largo || 1, tipo, nota: midi + (capa.octava || 0), clave: `${mapa.secciones.slice(0, p.n).reduce((a, x) => a + x.compases, 0) + p.k}:${p.i}`, n: p.n, nivel: sec.nivel, frase: Math.floor(p.k / (capa.compases || 1)), capa, paso: paso, extra: nota[4] });
    }
    let elegidas = datos;
    if (r.recortar) {
        elegidas = [];
        for (const x of datos) if (!elegidas.length || x.t - elegidas[elegidas.length - 1].t >= r.minSep) elegidas.push(x);
    }
    const porFrase = new Map();
    for (const x of elegidas) {
        const k = `${x.n}:${x.frase}`;
        if (!porFrase.has(k)) porFrase.set(k, []);
        porFrase.get(k).push(x);
    }
    for (const lista of porFrase.values()) {
        const alturas = [...new Set(lista.map(x => x.nota))].sort((a, b) => a - b), D = alturas.length;
        for (const x of lista) x.carril = D === 1 ? Math.floor((r.carriles - 1) / 2) : Math.round(alturas.indexOf(x.nota) * (r.carriles - 1) / (D - 1));
    }
    const notas = [];
    for (const x of elegidas) {
        const ajuste = ajustes && Object.prototype.hasOwnProperty.call(ajustes, x.clave) ? ajustes[x.clave] : undefined;
        if (ajuste === null) continue;
        let carril = ajuste === undefined ? x.carril : Math.max(0, Math.min(r.carriles - 1, Math.round(ajuste)));
        const acorde = x.tipo === 'r' && r.acordes;
        const carriles = acorde ? [Math.min(carril, r.carriles - 2), Math.min(carril, r.carriles - 2) + 1] : [carril];
        const brillante = reglas.brillantes.includes(x.nivel) || reglas.brillantes.includes(mapa.secciones[x.n].seccion);
        notas.push({ t: x.t, dur: r.largas && x.duracion >= reglas.largaPasos ? x.duracion * x.s : 0, carril: carriles[0], carriles,
            tipo: x.tipo, nota: x.nota, marcada: x.tipo === 's' || x.tipo === 'p', brillante, clave: x.clave, n: x.n });
    }
    notas.sort((a, b) => a.t - b.t || a.carril - b.carril);
    return { dificultad, carriles: r.carriles, duracion: mapa.duracion, secciones: mapa.secciones, notas };
}

// Juicio de una pulsación: dt = segundo de la pulsación - nota.t (ya con latencia y calibración restadas).
// → 'perfecto' | 'bien' | 'ok' | null (fuera). Bordes incluidos. Si nota.marcada, cada ventana × ventanas.marcada.
export function juicio(dt, nota, reglas = REGLAS_BASE) {
    const f = nota.marcada ? reglas.ventanas.marcada : 1, d = Math.abs(dt);
    if (d <= reglas.ventanas.perfecto * f) return 'perfecto';
    if (d <= reglas.ventanas.bien * f) return 'bien';
    if (d <= reglas.ventanas.ok * f) return 'ok';
    return null;
}

// Nota que toca una pulsación en `carril` en el segundo t → { idx, juicio, dt } o null.
// Candidatas: no están en `hechas` (Set de índices), tienen `carril` en sus carriles, juicio no null y todos sus
// carriles están en `pulsadas` (los carriles apretados en ese momento; un acorde pide los dos). Gana la de menor |dt|.
export function golpe(notas, t, carril, hechas, reglas = REGLAS_BASE, pulsadas = [carril]) {
    let mejor = null;
    notas.forEach((nota, idx) => {
        if (hechas.has(idx) || !nota.carriles.includes(carril) || !nota.carriles.every(c => pulsadas.includes(c))) return;
        const dt = t - nota.t, j = juicio(dt, nota, reglas);
        if (j && (!mejor || Math.abs(dt) < Math.abs(mejor.dt))) mejor = { idx, juicio: j, dt };
    });
    return mejor;
}

// Índices (en orden) de las notas que ya no se pueden tocar en el segundo t: no están en `hechas` y
// nota.t + ventana ok (× marcada si corresponde) < t. El juego las cuenta como fallo.
export function vencidas(notas, t, hechas, reglas = REGLAS_BASE) {
    return notas.map((n, i) => [n, i]).filter(([n, i]) => !hechas.has(i) && n.t + reglas.ventanas.ok * (n.marcada ? reglas.ventanas.marcada : 1) < t).map(([, i]) => i);
}

// Multiplicador del combo: min(combo.max, 1 + floor((combo - 1) / combo.paso)); con combo 0, 1.
export function multiplicador(combo, reglas = REGLAS_BASE) { return Math.min(reglas.combo.max, 1 + Math.floor(Math.max(0, combo - 1) / reglas.combo.paso)); }

// Estado del puntaje → { puntos: 0, combo: 0, comboMax: 0, mult: 1, conteo: { perfecto: 0, bien: 0, ok: 0, fallo: 0 } }
export function puntajeInicial() { return { puntos: 0, combo: 0, comboMax: 0, mult: 1, conteo: { perfecto: 0, bien: 0, ok: 0, fallo: 0 } }; }

// Suma un evento y devuelve un estado nuevo (no cambia `estado`):
//  · { juicio: 'perfecto' | 'bien' | 'ok', marcada?, primus? }: combo + 1, comboMax, mult = multiplicador(combo nuevo),
//    conteo, puntos += Math.round(puntos[juicio] × (marcada ? puntos.marcada : 1) × mult × (primus ? primus.factor : 1)).
//  · { juicio: 'fallo' }: combo 0, mult 1, conteo.fallo + 1, sin puntos.
//  · { mantener: segundos, primus? } (nota larga sostenida): puntos += Math.round(puntos.larga × segundos × mult ×
//    (primus ? factor : 1)), con el mult actual; no cambia el combo.
export function sumar(estado, evento, reglas = REGLAS_BASE) {
    const e = { ...estado, conteo: { ...estado.conteo } };
    if (evento.juicio === 'fallo') { e.combo = 0; e.mult = 1; e.conteo.fallo++; return e; }
    if (evento.juicio) {
        e.combo++; e.comboMax = Math.max(e.comboMax, e.combo); e.mult = multiplicador(e.combo, reglas); e.conteo[evento.juicio]++;
        e.puntos += Math.round(reglas.puntos[evento.juicio] * (evento.marcada ? reglas.puntos.marcada : 1) * e.mult * (evento.primus ? reglas.primus.factor : 1));
    } else if (evento.mantener !== undefined) e.puntos += Math.round(reglas.puntos.larga * evento.mantener * e.mult * (evento.primus ? reglas.primus.factor : 1));
    return e;
}

// Puntaje con todas las notas en Perfecto, en orden, sin fallos ni Modo Primus y con cada nota larga mantenida
// entera (su `dur`) justo después de tocarla. Es igual a pasar esos eventos por sumar().
export function puntajeMaximo(part, reglas = REGLAS_BASE) {
    let e = puntajeInicial();
    for (const n of part.notas) { e = sumar(e, { juicio: 'perfecto', marcada: n.marcada }, reglas); if (n.dur > 0) e = sumar(e, { mantener: n.dur }, reglas); }
    return e.puntos;
}

// Estrellas (1-5): cuántos umbrales alcanza puntos / maximo (al menos 1). Con maximo ≤ 0, 0.
export function estrellas(puntos, maximo, reglas = REGLAS_BASE) {
    if (maximo <= 0) return 0;
    const f = puntos / maximo, u = reglas.estrellas.umbrales;
    let n = 0;
    for (let i = 0; i < u.length; i++) if (f >= u[i]) n = i + 1;
    return Math.max(1, Math.min(5, n));
}

// «Revisar partitura» (pestaña Ritmo) → lista de { tipo, grave, dificultad, n, texto } (texto en español):
//  · Por dificultad y sección (n), uno por tipo como mucho:
//    'vacia' (grave): la sección no tiene notas en esa dificultad;
//    'densidad' (grave): más de maxNotasSeg notas con t en algún intervalo [t de una nota, ese t + 1 s);
//    'separacion' (grave): dos notas seguidas a menos de minSep s (en Fácil no pasa: se recortan).
//  · 'huerfano' (no grave; n: null): una clave de opciones.ajustes[dificultad] que no es de ninguna nota generada.
//  · 'escala' (no grave; dificultad: null): uno por sección con notas de Experto (sin las fantasma) fuera de la escala
//    del acorde del compás (acordeEn(cancion, k, nivel)): escala mayor de la raíz, o menor natural si la tercera del
//    acorde está a 3 semitonos, más las notas del propio acorde. Puede ser a propósito: solo avisa.
// Los acordes en Fácil o Normal no se revisan: la partitura no los genera ahí.
export function revisarPartitura(cancion, reglas = REGLAS_BASE, { tempo = 1, ajustes = {} } = {}) {
    const avisos = [];
    const agrega = (tipo, grave, dificultad, n, texto) => avisos.push({ tipo, grave, dificultad, n, texto });
    const experto = partitura(cancion, 'experto', reglas, { tempo });
    for (const dificultad of DIFICULTADES) {
        const r = reglas.dificultades[dificultad], part = partitura(cancion, dificultad, reglas, { tempo });
        for (const sec of experto.secciones) {
            const ns = part.notas.filter(x => x.n === sec.n), local = ns.filter(x => x.t >= sec.t0 && x.t < sec.t1);
            if (!local.length) agrega('vacia', true, dificultad, sec.n, `La sección ${sec.seccion} no tiene notas en ${dificultad}.`);
            if (local.some(x => local.filter(y => y.t >= x.t && y.t <= x.t + 1).length > r.maxNotasSeg)) agrega('densidad', true, dificultad, sec.n, `La sección ${sec.seccion} supera ${r.maxNotasSeg} notas por segundo en ${dificultad}.`);
            if (local.some((x, i) => i > 0 && x.t - local[i - 1].t < r.minSep)) agrega('separacion', true, dificultad, sec.n, `La sección ${sec.seccion} tiene notas separadas por menos de ${r.minSep} s en ${dificultad}.`);
        }
        for (const clave of Object.keys(ajustes[dificultad] || {})) if (!part.notas.some(x => x.clave === clave)) agrega('huerfano', false, dificultad, null, `El ajuste ${clave} ya no corresponde a una nota.`);
    }
    const p = partitura(cancion, 'experto', reglas, { tempo });
    for (const sec of p.secciones) {
        const ns = p.notas.filter(x => x.n === sec.n && x.tipo !== 'g');
        let fuera = false;
        for (const x of ns) {
            const ac = acordeEn(cancion, (x.clave.split(':')[0] | 0), sec.nivel), raiz = ac[0];
            const menor = ac.some(y => ((y - raiz + 12) % 12) === 3), escala = new Set((menor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]).map(y => (raiz + y) % 12));
            for (const y of ac) escala.add(y % 12);
            if (!escala.has(x.nota % 12)) { fuera = true; break; }
        }
        if (fuera) agrega('escala', false, null, sec.n, `La sección ${sec.seccion} tiene notas fuera de la escala del acorde.`);
    }
    return avisos;
}
