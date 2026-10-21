// =========================================================
// VENJY · Combate · motor de animación (bloque 8 · N3, mundo/COMBATE.md §15.6 y §1)
// Puro: sin Three.js. Arma la pose de cada cuadro lógico (60 Hz) de un peleador (estados.js) por capas, con los
// canales del rig de §15.5. El resultado va directo a aplicarAngulos (supervivencia/pose-jugador.js); el dibujo
// interpola entre los dos últimos cuadros con interpolar().
//   1 · base        guardia del estilo, mezclada con la caminata en guardia según la velocidad
//   2 · acción      ataque, esquiva, desvío o reacción (reemplaza los canales que define; reloj «fases»)
//   5 · secundario  respiración del estilo (se suma en los estados libres)
//   inercialización: al cambiar de estado, la diferencia entre lo que se veía y la pose nueva se suma y se apaga
//                    con un resorte crítico en `mezcla` cuadros (o más, si la diferencia es grande), conservando
//                    `inercia` de la velocidad que traía: nunca da un salto
//   4 · mirada      cuello y pecho hacia el objetivo (se suma; la cabeza llega primero, el pecho después)
//   choques         si un antebrazo entra en el torso o la cabeza (al mezclar dos poses), el hombro se abre lo justo
//   suelo           el pie más bajo toca el suelo (doblar las rodillas baja el cuerpo solo)
//   pasos           en guardia (quieto, caminando o girando) cada pie queda plantado y da un paso cuando se aleja de
//                   donde lo pone la guardia (IK de las piernas): nunca patina, a ninguna velocidad
//   pies            en una acción, el pie apoyado no se mueve en el mundo: IK de la pierna mientras está en el suelo
//   espejo          (N5) una reacción con espejo: true recibida por la derecha (p.espejo) se refleja
// La capa 3 (reacción sobre una acción, p. ej. la leve con armadura) sigue pendiente; el temblor del hitstop lo pone
// arena/modelo.js con combate/peso.js (desplaza al cuerpo entero, no a la pose).
//   crearAnimador(estilo)                  estado del motor para un peleador
//   animar(an, p, { t, raiz, mirada })     pose del cuadro: t = reloj en s (respiración), raiz = { x, z, yaw } en el
//                                          mundo (para anclar los pies), mirada = ángulo al objetivo respecto del frente
//                                          (+ = a su izquierda) o null
//   interpolar(a, b, alfa, salida)         pose intermedia para el dibujo
// =========================================================
import { COMBATE, animDe } from './datos.js';
import { LIBRES } from './estados.js';
import { evaluarGesto } from '../../datos/gestos.js';
import { curva } from '../../datos/curvas.js';
import { LIMITES } from '../../datos/limites.js';
import { fk, cajas, penetracion, ajusteSuelo, alturaPie, tobillo, resolverPierna, local, punto } from './cinematica.js';

export const CANALES = ['cx', 'cy', 'cz', 'bDx', 'bDy', 'bDz', 'bIx', 'bIy', 'bIz', 'pDx', 'pIx', 'pDz', 'pIz', 'inc', 'ry', 'rz',
    'codoD', 'codoI', 'rodD', 'rodI', 'pX', 'pY', 'pZ', 'armaX', 'armaZ', 'y', 'salto', 'pz'];
const LADOS = [['D'], ['I']];
const PIERNA = { D: ['pDx', 'rodD', 'pDz'], I: ['pIx', 'rodI', 'pIz'] };

export function crearAnimador(estilo) {
    const cero = () => Object.fromEntries(CANALES.map(k => [k, 0]));
    return {
        estilo, serial: -1, t: 0, mezcla: 0,
        visible: cero(), previa: cero(), off: cero(), vel: cero(),
        wPaso: 0, wLibre: 1, recorrido: 0, mirada: { cabeza: 0, pecho: 0 },
        pies: { D: { fijo: null }, I: { fijo: null }, listos: false },
        pasos: { D: { pos: null, desde: null }, I: { pos: null, desde: null }, listos: false },
        tobillo: { D: null, I: null }, raizPrev: null, piernas: null, cuerpoPrev: null,
        salida: cero(), tmp: {}, cuadros: 0
    };
}

const acercar = (v, meta, k) => v + (meta - v) * k;
const acotar = (v, t) => (v < -t ? -t : v > t ? t : v);
function limitar(o) { for (const k in LIMITES) { const l = LIMITES[k], v = o[k]; if (v < l[0]) o[k] = l[0]; else if (v > l[1]) o[k] = l[1]; } }

export function animar(an, p, { t = 0, raiz = null, mirada = null } = {}) {
    const M = COMBATE.motor, est = an.estilo, o = an.salida, tmp = an.tmp;
    // Hitstop: el cuerpo queda congelado (animación y avance), el resto del mundo sigue
    if (p.quieto) return o;
    an.cuadros++;
    // ---- 1 · base: guardia y caminata en guardia ----
    const libre = LIBRES.has(p.estado);
    const velPaso = (est.paso && est.paso.velocidad) || 1;
    an.wPaso = acercar(an.wPaso, p.estado === 'paso' ? Math.min(1, p.velocidad / velPaso) : 0, M.paso.rapidez);
    // El balanceo de la caminata sigue a la distancia real recorrida
    if (libre) an.recorrido += Math.hypot(p.mov[0], p.mov[1]);
    const raw = an.raw || (an.raw = {});
    for (const k of CANALES) raw[k] = 0;
    const g = animDe(est, est.guardia && est.guardia.anim);
    if (g) { for (const k in tmp) delete tmp[k]; evaluarGesto(g, 0, t, null, tmp); for (const k in tmp) raw[k] = tmp[k]; }
    const pa = animDe(est, est.paso && est.paso.anim);
    if (pa && an.wPaso > 1e-4) {
        for (const k in tmp) delete tmp[k];
        evaluarGesto(pa, 0, an.recorrido, null, tmp);
        for (const k in tmp) raw[k] += (tmp[k] - raw[k]) * an.wPaso;
    }
    if (p.estado === 'bloqueo') {
        const b = animDe(est, est.bloqueo && est.bloqueo.anim);
        if (b) { for (const k in tmp) delete tmp[k]; evaluarGesto(b, 0, t, null, tmp); for (const k in tmp) raw[k] = tmp[k]; }
    }
    // ---- 2 · acción (reloj «fases»: las claves siguen a la fase aunque el dueño la estire) ----
    if (p.def) {
        const a = animDe(est, p.def.anim || p.clave);
        if (a) {
            const f = p.def.fases, total = (f.anticipacion || 0) + (f.activo || 0) + (f.recuperacion || 0);
            for (const k in tmp) delete tmp[k];
            evaluarGesto(a, total ? p.c / total : 0, p.c / M.hz, { fases: f, c: p.c }, tmp);
            if (p.espejo && p.def.espejo) espejar(tmp);
            for (const k in tmp) raw[k] = tmp[k];
        }
        // Carga (S7): la hoja vibra mientras carga (estilo-*.json → ataques.<x>.carga.temblor)
        const tb = p.cargando && p.def.carga.temblor;
        if (tb && tb.canal in raw) raw[tb.canal] += (tb.amp || 0) * Math.sin(2 * Math.PI * (tb.frec || 0) * an.cuadros / M.hz);
    }
    // ---- 5 · secundario: respiración en los estados libres ----
    an.wLibre = acercar(an.wLibre, libre ? 1 : 0, 0.15);
    const r = animDe(est, est.guardia && est.guardia.respiracion);
    if (r && an.wLibre > 1e-4) { for (const k in tmp) delete tmp[k]; evaluarGesto(r, 0, t, null, tmp); for (const k in tmp) raw[k] += tmp[k] * an.wLibre; }
    // ---- Inercialización ----
    if (p.cambio.n !== an.serial) {
        let mayor = 0;
        if (an.serial >= 0) for (const k of CANALES) {
            an.off[k] = an.visible[k] - raw[k]; an.vel[k] = (an.visible[k] - an.previa[k]) * M.inercia;
            if (k !== 'y' && k !== 'salto' && k !== 'pz') mayor = Math.max(mayor, Math.abs(an.off[k]));
        }
        // La mezcla nunca va más rápido que saltoMax: con una diferencia grande dura más (sin saltos)
        an.serial = p.cambio.n; an.t = 0; an.mezcla = Math.max(p.cambio.mezcla, Math.ceil(M.mezclaPorRad * mayor / M.saltoMax));
    }
    const primero = an.cuadros === 1;
    an.t++;
    const w = an.mezcla > 0 ? 6 / an.mezcla : 0, e = w ? Math.exp(-w * an.t) : 0;
    for (const k of CANALES) {
        an.previa[k] = an.visible[k];
        const x0 = an.off[k];
        an.visible[k] = raw[k] + (w && (x0 || an.vel[k]) ? (x0 + (an.vel[k] + w * x0) * an.t) * e : 0);
        o[k] = an.visible[k];
        if (primero) an.previa[k] = an.visible[k]; // el primer cuadro no trae velocidad
    }
    limitar(o);
    // ---- 4 · mirada: la cabeza llega primero (rápido) y el pecho después (lento) ----
    const mi = M.mirada, peso = p.def && p.def.sinMirada ? 0 : 1, phi = mirada === null ? 0 : mirada * peso;
    an.mirada.pecho = acercar(an.mirada.pecho, acotar(phi, mi.pecho.tope), mi.pecho.rapidez);
    an.mirada.cabeza = acercar(an.mirada.cabeza, acotar(phi - an.mirada.pecho, mi.cabeza.tope), mi.cabeza.rapidez);
    o.pY += an.mirada.pecho; o.cy += an.mirada.cabeza;
    limitar(o);
    // ---- Choques: el antebrazo no entra en el torso ni en la cabeza (sobre todo al mezclar dos poses) ----
    if (M.choques && M.choques.tope >= 0) separarBrazos(an, o);
    // ---- Suelo automático: el salto se suma a y y el pie más bajo queda en el suelo ----
    o.y = (o.y || 0) + (o.salto || 0);
    if (M.suelo) o.y += ajusteSuelo(o);
    // ---- Pies: en guardia dan pasos solos; en una acción, el apoyado queda anclado ----
    if (raiz && M.pies.anclar) {
        if (libre) pasosLibres(an, o, raiz, est); else anclarPies(an, o, raiz);
        const m = fk(o, raiz);
        an.tobillo.D = tobillo(m, 'D'); an.tobillo.I = tobillo(m, 'I');
        an.piernas = { D: PIERNA.D.map(c => o[c]), I: PIERNA.I.map(c => o[c]) }; an.cuerpoPrev = m.cuerpo;
        an.raizPrev = [raiz.x || 0, raiz.z || 0];
    }
    return o;
}

// Pasos en guardia (procedurales: los pies no patinan a ninguna velocidad, al girar ni al frenar). Cada pie queda
// plantado donde está hasta que se aleja más de `umbral` de donde lo pone la guardia; entonces da un paso de `cuadros`
// en arco (`altura`) hasta ese lugar, adelantado `adelanto` pasos según la velocidad (cae adelante y el cuerpo lo pasa).
// Da un paso a la vez (el otro puede salir cuando el primero va en el 40 %, o al tiro si su pierna se quedó casi
// estirada). Las piernas se resuelven con IK.
function pasosLibres(an, o, raiz, est) {
    const pa = est.paso || {}, umbral = pa.umbral ?? 0.12, dur = Math.max(2, pa.cuadros ?? 9), alto = pa.altura ?? 0.06, adelanto = pa.adelanto ?? 0.5;
    const m = fk(o, raiz), ps = an.pasos;
    // Velocidad de la raíz, suavizada: al arrancar o frenar, el lugar donde cae el pie no salta
    const vr = an.raizPrev ? [(raiz.x || 0) - an.raizPrev[0], (raiz.z || 0) - an.raizPrev[1]] : [0, 0];
    const v = an.vPasos = an.vPasos ? [acercar(an.vPasos[0], vr[0], 0.2), acercar(an.vPasos[1], vr[1], 0.2)] : vr;
    // Donde la guardia pone cada pie (el tobillo, con la esquina más baja en el suelo)
    const lugar = {};
    for (const [lado] of LADOS) { const t = tobillo(m, lado); t[1] -= alturaPie(m, lado); lugar[lado] = t; }
    if (!ps.listos) {
        // Viene de una acción (o recién empieza): cada pie parte de donde se veía
        for (const [lado] of LADOS) {
            const t = an.tobillo[lado] || lugar[lado];
            ps[lado] = { pos: [t[0], t[1], t[2]], desde: null };
            // Si quedó en el aire, baja con un paso
            if (t[1] > lugar[lado][1] + 0.01) Object.assign(ps[lado], { desde: [...ps[lado].pos], t: 0, f: 0, dur });
        }
        ps.listos = true; an.pies.listos = false;
    }
    const lejos = lado => Math.hypot(ps[lado].pos[0] - lugar[lado][0], ps[lado].pos[2] - lugar[lado][2]);
    const libre = l => !ps[l].desde || (ps[l].f || 0) > 0.4;
    // La pierna que se va quedando estirada también pide su paso (aunque el pie no esté tan lejos)
    const estirada = l => an.piernas && an.piernas[l][1] < COMBATE.motor.pies.rodillaMin;
    // Un pie con la pierna casi estirada da su paso aunque el otro todavía vaya en el aire
    for (const [l] of LADOS) if (!ps[l].desde && estirada(l)) Object.assign(ps[l], { desde: [...ps[l].pos], t: 0, f: 0, dur });
    if (libre('D') && libre('I')) {
        const cual = [['D', lejos('D')], ['I', lejos('I')]].filter(([l]) => !ps[l].desde).sort((a, b) => b[1] - a[1])[0];
        if (cual && cual[1] > umbral) Object.assign(ps[cual[0]], { desde: [...ps[cual[0]].pos], t: 0, f: 0, dur });
    }
    for (const [lado] of LADOS) {
        const s = ps[lado];
        if (!s.desde) {
            resolverPierna(o, lado, s.pos, raiz);
            apoyar(o, lado, s.pos, raiz); // la esquina más baja del pie, en el suelo
            ceder(an, o, lado, COMBATE.motor);
            continue;
        }
        // En el paso: avanza `1 / dur` del camino por cuadro, o menos si la pierna giraría más rápido que saltoMax
        // (un paso que sale con la pierna casi estirada va más lento al principio en vez de saltar)
        const base = PIERNA[lado].map(k => o[k]), prev = an.piernas && an.piernas[lado], tope = 0.9 * COMBATE.motor.saltoMax;
        s.t++;
        let df = 1 / s.dur, f, obj, arco;
        for (let intento = 0; intento < 5; intento++, df /= 2) {
            f = Math.min(1, (s.f || 0) + df);
            PIERNA[lado].forEach((k, i) => { o[k] = base[i]; });
            const e = curva('suave', f), resto = Math.max(0, s.dur - s.t) + s.dur * adelanto, L = lugar[lado];
            const hasta = [L[0] + v[0] * resto, L[1], L[2] + v[1] * resto];
            obj = [s.desde[0] + (hasta[0] - s.desde[0]) * e, s.desde[1] + (hasta[1] - s.desde[1]) * f, s.desde[2] + (hasta[2] - s.desde[2]) * e];
            arco = alto * Math.sin(Math.PI * f);
            resolverPierna(o, lado, obj, raiz);
            apoyar(o, lado, obj, raiz, arco); // la esquina del pie a la altura del arco
            if (!prev || PIERNA[lado].every((k, i) => Math.abs(o[k] - prev[i]) <= tope)) break;
        }
        ceder(an, o, lado, COMBATE.motor);
        s.f = f; s.pos = obj; s.pos[1] -= arco; // pos guarda el camino a ras de suelo; el arco se suma cada cuadro
        if (f >= 1 || s.t > 4 * s.dur) { s.desde = null; s.f = 0; }
    }
}

// Deja la esquina más baja del pie a `altura` del suelo: el tobillo no se mueve de lado, solo sube o baja lo que la
// canilla inclinada lo hundiría o lo levantaría (pos queda con la altura del tobillo que lo logra)
function apoyar(o, lado, pos, raiz, altura = 0) {
    for (let i = 0; i < 3; i++) {
        const h = alturaPie(fk(o, raiz), lado) - altura;
        if (Math.abs(h) < 1e-4) return;
        pos[1] -= h;
        resolverPierna(o, lado, pos, raiz);
    }
}

// Un pie se ancla cuando la pose lo apoya en el suelo: al aterrizar, o si ya estaba en el suelo y casi quieto en el
// mundo (el que avanza va rápido aunque roce el suelo). Anclado, la IK de la pierna lo deja donde quedó. Se suelta
// cuando la pose lo levanta, cuando la pierna ya no alcanza o si se aleja demasiado (ver soltar).
function anclarPies(an, o, raiz) {
    const M = COMBATE.motor, P = M.pies, m0 = fk(o, raiz), ps = an.pasos;
    // Soltar, de dos maneras (nunca más rápido que la mitad de saltoMax ni que `velocidad` por cuadro):
    //  · al despegar (la pose levanta el pie): el pie sube primero y avanza después hacia el de la pose; de lado parte de
    //    donde estaba en el mundo y en altura lo lleva el cuerpo (si el cuerpo salta, el pie sube con él);
    //    también si la pierna ya no alcanza (el pie se arrastra con un paso corto);
    //  · si no se sabe dónde estaba el pie: la pierna pasa en ángulos de cómo se veía a la pose.
    const soltar = (st, lado, aire, tb) => {
        if (st.suelta) return;
        const k = PIERNA[lado], prev = an.piernas && an.piernas[lado];
        st.ang = prev ? [...prev] : k.map(c => o[c]);
        const dif = Math.max(...k.map((c, i) => Math.abs(o[c] - st.ang[i])));
        let r = Math.ceil(dif / (0.5 * M.saltoMax));
        st.aire = aire && !!an.cuerpoPrev && !!an.tobillo[lado];
        if (st.aire) {
            st.local = local(an.cuerpoPrev, an.tobillo[lado]);
            const t = an.tobillo[lado];
            st.inicio = [...t];
            r = Math.max(r, Math.ceil(Math.hypot(tb[0] - t[0], tb[2] - t[2]) / P.velocidad));
        }
        st.suelta = true; st.r0 = st.r = Math.min(6 * P.soltar, Math.max(P.soltar, r)); st.f = 0; st.cuadros = 0;
    };
    if (!an.pies.listos) {
        // Viene de la guardia: los pies parten de donde estaban (el que iba dando un paso, soltándose hacia la pose)
        for (const [lado] of LADOS) {
            const st = an.pies[lado], t = an.tobillo[lado];
            Object.assign(st, { fijo: t ? [...t] : null, suelta: false, enPaso: !!(ps[lado] && ps[lado].desde) });
        }
        an.pies.listos = true; ps.listos = false;
    }
    for (const [lado] of LADOS) {
        const st = an.pies[lado];
        const h = alturaPie(m0, lado), tb = tobillo(m0, lado);
        const vel = st.prev ? Math.hypot(tb[0] - st.prev[0], tb[2] - st.prev[2]) : 0;
        const aterriza = st.h !== undefined && h <= st.h; // bajando (o quieto en altura): está aterrizando
        st.prev = tb; st.h = h;
        const apoyado = h <= P.apoyo;
        if (!st.fijo) {
            // Se ancla al aterrizar (aunque la pose todavía lo traiga avanzando) o si está quieto en el suelo; no al despegar
            if (apoyado && (aterriza || vel <= P.velocidad)) { st.fijo = tb; st.suelta = false; }
            continue;
        }
        if (st.enPaso) { st.enPaso = false; soltar(st, lado, true, tb); }
        if (!apoyado) soltar(st, lado, true, tb);
        else if (Math.hypot(tb[0] - st.fijo[0], tb[2] - st.fijo[2]) > P.distanciaMax) soltar(st, lado, true, tb);
        if (st.suelta) {
            if (st.aire) {
                // Parte de donde quedó en el mundo (no patina) y, a medida que sube, lo lleva el cuerpo (si salta, va con
                // él). Si la pierna giraría más rápido que saltoMax, el pie avanza menos este cuadro (sigue su camino).
                const base = PIERNA[lado].map(k => o[k]), prev = an.piernas && an.piernas[lado], tope = 0.9 * M.saltoMax;
                const b = punto(m0.cuerpo, ...st.local), i0 = st.inicio;
                let df = 1 / Math.max(1, st.r0), f;
                for (let intento = 0; intento < 5; intento++, df /= 2) {
                    f = Math.min(1, st.f + df);
                    PIERNA[lado].forEach((k, i) => { o[k] = base[i]; });
                    const e = curva('suave', f), c = curva('salida', f);
                    const p0 = [i0[0] + (b[0] - i0[0]) * c, b[1], i0[2] + (b[2] - i0[2]) * c];
                    const obj = [p0[0] + (tb[0] - p0[0]) * e, p0[1] + (tb[1] - p0[1]) * f, p0[2] + (tb[2] - p0[2]) * e];
                    resolverPierna(o, lado, obj, raiz);
                    // Sube al menos el arco (si la pose ya lo levanta menos, hasta donde la pose lo tenga cerca del final)
                    const arco = P.alzar * Math.sin(Math.PI * f), minimo = h > P.apoyo ? Math.min(arco, h) : arco;
                    if (alturaPie(fk(o, raiz), lado) < minimo) apoyar(o, lado, obj, raiz, minimo);
                    if (!prev || PIERNA[lado].every((k, i) => Math.abs(o[k] - prev[i]) <= tope)) break;
                }
                ceder(an, o, lado, M);
                st.f = f;
                if (f >= 1 || ++st.cuadros > 6 * P.soltar) { st.fijo = null; st.suelta = false; }
                // La pose ya lo apoyó y va pasada la mitad del camino: aterriza donde está (no llega patinando)
                else if (h <= P.apoyo && f > 0.5) {
                    st.fijo = tobillo(fk(o, raiz), lado); st.suelta = false;
                    apoyar(o, lado, st.fijo, raiz); ceder(an, o, lado, M);
                    st.fijo = tobillo(fk(o, raiz), lado); // donde quedó de verdad (después baja derecho al suelo)
                }
            } else {
                const w = st.r0 ? st.r / st.r0 : 0;
                PIERNA[lado].forEach((c, i) => { o[c] += (st.ang[i] - o[c]) * w; });
                if (st.r <= 0) { st.fijo = null; st.suelta = false; } // ya es la pose: queda libre
                else st.r--;
            }
            continue;
        }
        const error = resolverPierna(o, lado, st.fijo, raiz);
        if (error < P.alcance) apoyar(o, lado, st.fijo, raiz);
        ceder(an, o, lado, M);
        // La pierna que no llega (o casi estirada: ahí la IK gira rápido) se suelta
        if (error > P.alcance || o[PIERNA[lado][1]] < P.rodillaMin) soltar(st, lado, true, tb);
    }
}

// Si un antebrazo entra más de `tope` en el torso o la cabeza, el hombro se abre hacia afuera (bDz / bIz) de a
// `paso` radianes hasta que sale; la corrección se suaviza para no saltar y se apaga sola cuando ya no hace falta.
const BRAZOS = [['antebrazoD', 'bDz', -1], ['antebrazoI', 'bIz', 1]];
function separarBrazos(an, o) {
    const C = COMBATE.motor.choques, corr = an.choque || (an.choque = { bDz: 0, bIz: 0 });
    for (const [caja, k, signo] of BRAZOS) {
        const v0 = o[k];
        let falta = 0;
        for (let i = 0; i < 8; i++) {
            o[k] = v0 + signo * falta;
            const c = cajas(fk(o));
            if (Math.max(penetracion(c[caja], c.torso), penetracion(c[caja], c.cabeza)) <= C.tope) break;
            falta += C.paso;
        }
        // Sube al tiro (el choque crece de a poco) y baja suave
        corr[k] = falta > corr[k] ? falta : acercar(corr[k], falta, C.rapidez);
        o[k] = v0 + signo * corr[k];
    }
    limitar(o);
}

// Si la IK pide girar una articulación de la pierna más rápido que saltoMax (la pierna casi estirada, un cuerpo que se
// aleja del pie), cede el camino del pie: nunca salta la pierna
function ceder(an, o, lado, M) {
    const prev = an.piernas && an.piernas[lado], tope = 0.9 * M.saltoMax;
    if (prev) PIERNA[lado].forEach((k, i) => { o[k] = prev[i] + Math.max(-tope, Math.min(tope, o[k] - prev[i])); });
}

// Reacción en espejo (N5): el golpe llegó por la derecha del que recibe. Los pares derecha/izquierda se cambian (los
// giros laterales, y y z, cambian de signo) y los giros del cuello y del pecho hacia los lados también. El arma no.
const PARES = [['bDx', 'bIx', 1], ['bDy', 'bIy', -1], ['bDz', 'bIz', -1], ['pDx', 'pIx', 1], ['pDz', 'pIz', -1], ['codoD', 'codoI', 1], ['rodD', 'rodI', 1]];
const LATERALES = ['cy', 'cz', 'pY', 'pZ', 'ry', 'rz'];
export function espejar(o) {
    for (const [d, i, s] of PARES) {
        const hd = d in o, hi = i in o, vd = o[d], vi = o[i];
        delete o[d]; delete o[i];
        if (hi) o[d] = vi * s;
        if (hd) o[i] = vd * s;
    }
    for (const k of LATERALES) if (k in o) o[k] = -o[k];
    return o;
}
export function interpolar(a, b, alfa, salida = {}) {
    for (const k in b) salida[k] = a[k] === undefined ? b[k] : a[k] + (b[k] - a[k]) * alfa;
    return salida;
}
