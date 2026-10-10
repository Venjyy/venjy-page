// =========================================================
// VENJY · Supervivencia · Vida entre amigos sin el jugador (bloque 6d, etapa 1)
// Los que ya están juntos (Hadad, Andy y Nacho en la fogata; Lalo y Moisés en el iglú) tienen de vez en cuando
// una «interacción»: charla corta con bromas y gestos propios (vida-amigos-datos.js), aparte de su charla de siempre.
// Reglas de «Rendimiento de la vida entre amigos» (mundo/PENDIENTES.md):
// · Detalle (gestos, globos) solo a menos de RADIO_DETALLE bloques y con los amigos dibujándose; más lejos la
//   interacción es solo un temporizador que avanza y termina. Si te acercas a la mitad, se ve desde donde va.
// · Lejos el planificador corre 1 de cada CADA_LEJOS cuadros (con el tiempo acumulado).
// · Como mucho MAX_DETALLE interacciones con detalle a la vez; si hay más cerca, las demás esperan su turno.
// · Los guiones se cargan con import() la primera vez que te acercas a un lugar (RADIO_CARGA).
// Cómo se dibuja: amigos.js llama n.vida.animar(dt) después de su animación normal y usa n.vida.texto como globo;
// mientras tanto su charla de siempre se calla y espera. Cualquier escena (n.escena: skin, amistad, «Hablar»,
// minijuegos, la ronda del iglú) manda sobre esto: la interacción se corta y el lugar vuelve a esperar.
// crearVida() es la lógica pura (la prueban mundo/tests/vida-amigos.mjs); crearVidaAmigos() la conecta al juego.
// =========================================================

export const RADIO_DETALLE = 24, MAX_DETALLE = 2, CADA_LEJOS = 4, RADIO_CARGA = 64;
// Ids de las interacciones (para /amistad vida-<id>; la prueba comprueba que coincidan con vida-amigos-datos.js)
export const INTERACCIONES = { fogata: ['informe', 'discord', 'papas', 'baile', 'malvaviscos'], iglu: ['loza', 'nevazon', 'encendedor', 'hermanos'] };
export const ESPERA = [18, 40]; // segundos entre una interacción y la siguiente en el mismo lugar
const RAMPA = 0.4;              // entrada y salida del detalle (s)

const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const suave = u => u * u * (3 - 2 * u);
const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));

// ---------------------------------------------------------
// Planificador (sin Three.js ni DOM)
// lugares: [{ clave, x, z }] · guiones: { clave: [{ id, T, ... }] }
// actualizar(dt, { jx, jz, visible, ocupado(clave), listo(clave) }):
//   ocupado: alguien del lugar está en otra escena (corta la interacción) · listo: se puede mostrar ya (no hay un pase en curso)
// ---------------------------------------------------------
export function crearVida({ lugares, guiones, rnd = Math.random, espera = ESPERA }) {
    const esperar = () => espera[0] + rnd() * (espera[1] - espera[0]);
    const L = lugares.map(l => ({ ...l, e: null, espera: esperar() * rnd(), bolsa: [], detalle: false, d: Infinity }));
    let cuadro = 0, acumulado = 0;
    // Siguiente guion del lugar: bolsa barajada, sin repetir el último al rearmarla
    function siguiente(l) {
        const lista = guiones[l.clave] || [];
        if (!lista.length) return null;
        if (!l.bolsa.length) {
            l.bolsa = lista.map((g, i) => i);
            for (let i = l.bolsa.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l.bolsa[i], l.bolsa[j]] = [l.bolsa[j], l.bolsa[i]]; }
            if (l.bolsa.length > 1 && lista[l.bolsa[0]].id === l.ultimo) l.bolsa.push(l.bolsa.shift());
        }
        const g = lista[l.bolsa.shift()];
        l.ultimo = g.id;
        return g;
    }
    function empezar(l, g) { l.e = { g, t: 0 }; }
    function terminar(l) { l.e = null; l.detalle = false; l.espera = esperar(); }
    const cerca = (l, c) => c.visible !== false && l.d < RADIO_DETALLE;

    return {
        lugares: L,
        // dt de este cuadro; devuelve false si lejos se saltó el cuadro
        actualizar(dt, c) {
            cuadro++;
            for (const l of L) l.d = Math.hypot(l.x - c.jx, l.z - c.jz);
            if (!L.some(l => cerca(l, c))) {
                acumulado += dt;
                if (cuadro % CADA_LEJOS) return false;
                dt = acumulado;
            }
            acumulado = 0;
            for (const l of L) {
                if (c.ocupado && c.ocupado(l.clave)) { if (l.e) terminar(l); else l.espera = Math.max(l.espera, 4); continue; }
                if (l.e) { l.e.t += dt; if (l.e.t >= l.e.g.T) terminar(l); }
                else l.espera -= dt;
            }
            // Turnos: primero los que ya se ven, después los más cercanos
            const turno = L.filter(l => l.e && cerca(l, c) && (!c.listo || c.listo(l.clave))).sort((a, b) => (b.detalle - a.detalle) || a.d - b.d);
            for (const l of L) l.detalle = false;
            turno.slice(0, MAX_DETALLE).forEach(l => { l.detalle = true; });
            let libres = MAX_DETALLE - Math.min(MAX_DETALLE, turno.length);
            // Empezar: lejos siempre (es solo un reloj); cerca solo con un turno libre (si no, espera)
            for (const l of [...L].sort((a, b) => a.d - b.d)) {
                if (l.e || l.espera > 0 || (c.ocupado && c.ocupado(l.clave))) continue;
                if (cerca(l, c)) {
                    if (!libres || (c.listo && !c.listo(l.clave))) { l.espera = 0; continue; }
                    const g = siguiente(l);
                    if (!g) continue;
                    empezar(l, g); l.detalle = true; libres--;
                } else { const g = siguiente(l); if (g) empezar(l, g); }
            }
            return true;
        },
        // Depuración y capturas: empieza ya esa interacción (o la siguiente) en el lugar
        forzar(clave, id, t = 0) {
            const l = L.find(x => x.clave === clave);
            if (!l) return false;
            const g = id ? (guiones[clave] || []).find(x => x.id === id) : siguiente(l);
            if (!g) return false;
            empezar(l, g); l.e.t = t; return true;
        },
        poner(clave, lista) { guiones[clave] = lista; },
        enDetalle: () => L.filter(l => l.detalle).length
    };
}

// Frases y gestos del guion en el segundo t
export const lineasEn = (g, t) => g.lineas.filter(l => t >= l.a && t < l.a + l.d);
export function gestoEn(g, q, t) {
    for (const [nombre, a, b] of (g.pista && g.pista[q]) || []) if (t >= a && t < b) {
        const r = Math.min(0.3, (b - a) / 3);
        return { nombre, u: (t - a) / (b - a), w: suave(Math.min(lim((t - a) / r, 0, 1), lim((b - t) / r, 0, 1))) };
    }
    return null;
}

// ---------------------------------------------------------
// Conexión con el juego
// ctx: { amigos, jugador, idioma: () => 'es'|'en', libre: () => bool (no hay escena, minijuego ni ronda del jugador) }
// ---------------------------------------------------------
const CAMPOS = ['cx', 'cy', 'cz', 'bDx', 'bDz', 'bIx', 'bIz', 'pDx', 'pIx', 'inc', 'rz', 'y'];
const PIERNAS = new Set(['pDx', 'pIx', 'y']); // sentados: no se tocan
function leer(p) {
    return { cx: p.cuello.rotation.x, cy: p.cuello.rotation.y, cz: p.cuello.rotation.z, bDx: p.brazoD.rotation.x, bDz: p.brazoD.rotation.z,
        bIx: p.brazoI.rotation.x, bIz: p.brazoI.rotation.z, pDx: p.piernaD.rotation.x, pIx: p.piernaI.rotation.x,
        inc: p.cuerpo.rotation.x, rz: p.cuerpo.rotation.z, y: p.cuerpo.position.y };
}
function escribir(p, v) {
    p.cuello.rotation.x = v.cx; p.cuello.rotation.y = v.cy; p.cuello.rotation.z = v.cz;
    p.brazoD.rotation.x = v.bDx; p.brazoD.rotation.z = v.bDz; p.brazoI.rotation.x = v.bIx; p.brazoI.rotation.z = v.bIz;
    p.piernaD.rotation.x = v.pDx; p.piernaI.rotation.x = v.pIx;
    p.cuerpo.rotation.x = v.inc; p.cuerpo.rotation.z = v.rz; p.cuerpo.position.y = v.y;
}

export function crearVidaAmigos(ctx) {
    const { amigos, jugador } = ctx;
    const camp = amigos.campamento, iglu = amigos.iglu;
    const lugares = [];
    if (camp) lugares.push({ clave: 'fogata', x: camp.fuego.x, z: camp.fuego.z, actores: { hadad: camp.hadad, andy: camp.andy, nacho: camp.nacho }, sentados: new Set(['hadad', 'nacho']) });
    if (iglu) lugares.push({ clave: 'iglu', x: (iglu.moises.x + iglu.lalo.x) / 2, z: (iglu.moises.z + iglu.lalo.z) / 2, actores: { moises: iglu.moises, lalo: iglu.lalo }, sentados: new Set(['moises']) });
    const porClave = Object.fromEntries(lugares.map(l => [l.clave, l]));
    let vida = null, datos = null, cargando = null, pausado = false;
    const estado = {}; // por lugar: { w, puestos }
    const idioma = () => (ctx.idioma ? ctx.idioma() : 'es');

    function cargar() {
        if (!cargando) cargando = import('./vida-amigos-datos.js').then(m => {
            datos = m;
            vida = crearVida({ lugares: lugares.map(({ clave, x, z }) => ({ clave, x, z })), guiones: m.guiones() });
        }).catch(err => { cargando = null; console.error('No se pudo cargar la vida entre amigos', err); });
        return cargando;
    }
    const ocupado = c => Object.values(porClave[c].actores).some(n => n.escena);
    const listo = c => !(c === 'iglu' && iglu && iglu.enPase);

    // Pone (o saca) los ganchos n.vida de los actores del lugar
    function poner(l) {
        for (const [q, n] of Object.entries(l.actores)) {
            if (n.vida) continue;
            n.vida = { q, texto: '', cur: null, animar: dt => animar(l, q, n, dt) };
        }
    }
    function sacar(l) { for (const n of Object.values(l.actores)) { if (n.vida && datos && datos.efectos) datos.efectos(n, null, 0, 0); delete n.vida; } }

    function animar(l, q, n, dt) {
        const s = estado[l.clave], v = vida.lugares.find(x => x.clave === l.clave), e = v.e;
        const ahora = leer(n.p);
        n.vida.texto = '';
        if (!e || !s || s.w <= 0.001) { n.vida.cur = null; if (datos.efectos) datos.efectos(n, null, 0, 0); return; }
        const g = e.g, t = e.t;
        // Globo: su frase (o la de 'ambos')
        const ls = lineasEn(g, t);
        const mia = ls.find(x => x.q === q || x.q === 'ambos');
        if (mia && s.w > 0.5) n.vida.texto = mia.texto[idioma()] || mia.texto.es;
        // Gesto de su pista
        const ge = gestoEn(g, q, t);
        const sentado = l.sentados.has(q);
        if (datos.efectos) datos.efectos(n, ge && ge.nombre, (ge ? ge.w : 0) * s.w, t); // la nube con «Z» de `ronca`
        let meta = {};
        if (ge) {
            // Moldes y gestos de grupo o propios: (u, t, info) · los de las escenas de skin: (u, t, sentado, jugador)
            const f = g.gestos && g.gestos[ge.nombre], fs = !f && datos.GESTOS_SKIN[ge.nombre];
            if (f) meta = f(ge.u, t, { s: sentado, otroS: false, j: false, esc: n.escala || 1 }) || {};
            else if (fs) meta = fs(ge.u, t, sentado, false) || {};
            if (meta.salto && !sentado) meta = { ...meta, y: (meta.y ?? ahora.y) + meta.salto };
        }
        // Mirada: a quien habla; quien habla mira a quien le contestó o le va a contestar
        const habla = ls.length ? ls[ls.length - 1].q : null;
        let otro = habla && habla !== q && habla !== 'ambos' ? habla : null;
        if (!otro && habla === q) {
            const i = g.lineas.indexOf(ls[ls.length - 1]);
            const vecino = [g.lineas[i - 1], g.lineas[i + 1]].find(x => x && x.q !== q && l.actores[x.q]);
            otro = vecino ? vecino.q : null;
        }
        const m = otro && l.actores[otro];
        const wg = ge ? ge.w : 0;
        const fin = {};
        if (!n.vida.cur) n.vida.cur = { ...ahora };
        const r = Math.min(1, dt * 10);
        for (const k of CAMPOS) {
            let obj = ahora[k];
            if (k === 'cy' && m) obj = lim(angulo(Math.atan2(m.x - n.x, m.z - n.z) - n.yaw), -1.1, 1.1);
            if (meta[k] !== undefined && !(sentado && PIERNAS.has(k))) obj = k === 'cy' ? obj + meta.cy * wg : lerp(obj, meta[k], wg);
            n.vida.cur[k] += (obj - n.vida.cur[k]) * r;
            fin[k] = lerp(ahora[k], n.vida.cur[k], s.w);
        }
        escribir(n.p, fin);
    }

    return {
        get cargado() { return !!vida; },
        actualizar(dt, oculto = false) {
            const jx = jugador.pos.x, jz = jugador.pos.z;
            if (!vida) {
                if (!oculto && lugares.some(l => Math.hypot(l.x - jx, l.z - jz) < RADIO_CARGA)) cargar();
                return;
            }
            vida.actualizar(pausado ? 0 : dt, { jx, jz, visible: !oculto && (!ctx.libre || ctx.libre()), ocupado, listo });
            for (const v of vida.lugares) {
                const l = porClave[v.clave], s = (estado[v.clave] ||= { w: 0 });
                if (ocupado(v.clave)) { s.w = 0; sacar(l); continue; }
                const meta = v.detalle && v.e ? 1 : 0;
                s.w = lim(s.w + (meta ? dt : -dt) / RAMPA, 0, 1);
                if (s.w > 0) poner(l); else sacar(l);
            }
        },
        // Depuración y capturas (__venjy.vida): forzar('fogata', 'papas', 3) empieza esa interacción en el segundo 3
        async forzar(clave, id, t = 0) { await cargar(); return vida ? vida.forzar(clave, id, t) : false; },
        // Capturas: pausar(true) congela los relojes (el detalle se sigue dibujando); irA('fogata', 6) salta a ese segundo
        pausar(v = true) { pausado = v; },
        irA(clave, t) { const l = vida && vida.lugares.find(x => x.clave === clave); if (l && l.e) l.e.t = t; },
        estado: () => (vida ? vida.lugares.map(l => ({ lugar: l.clave, id: l.e && l.e.g.id, t: l.e && Math.round(l.e.t * 10) / 10, T: l.e && l.e.g.T, detalle: l.detalle, espera: Math.round(l.espera) })) : null),
        lista: async () => { await cargar(); return datos ? Object.fromEntries(Object.entries(datos.guiones()).map(([k, v]) => [k, v.map(g => g.id)])) : null; }
    };
}
