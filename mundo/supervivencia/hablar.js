// =========================================================
// VENJY · Supervivencia · Pestaña «Hablar» (bloque 6a)
// misiones.js lo carga con import() dinámico la primera vez que abres «Hablar» (junto con
// dialogos-datos.js): no suma nada a la carga inicial.
// · Temas como botones (los bloqueados se ven con su requisito), «¿Qué opinas de...?» con la lista de
//   quienes conoce, y «Regalar» si llevas su objeto favorito. La respuesta sale en el panel y en su globo.
// · Hablar no corta el juego: sin cámara de cine ni pausa (el panel solo libera el puntero, como el inventario).
// · El amigo te mira (cabeza y un poco el cuerpo) y mezcla gestos de escenas-skin.js (asiente, habla, risa,
//   rasca...) sobre su animación normal con el gancho `n.escena`; si caminaba, se queda en su sitio.
//   Al cerrar, el gesto se desvanece en ~0,4 s y se suelta el gancho.
// =========================================================
import { TEMAS, OPINIONES, SALUDOS, REGALOS, GESTO_REGALO } from './dialogos-datos.js';
import { NIVELES, FAVORITOS, relacion, cumple } from './amistad.js';
import { GESTOS } from './escenas-skin.js';

const TXT = {
    es: { cerrar: 'Cerrar', volver: 'Volver', opinaDe: n => `¿Qué opinas de ${n}?`, regalar: n => `Regalar: ${n}`, leGusta: l => `Le gusta: ${l}`, o: ' o ',
        yaRegalo: 'Ya le regalaste algo hoy. Vuelve mañana.', amistad: 'Amistad', bloqueado: '???',
        req: { nivel: n => `Amistad: ${n}`, mision: t => `Misión: ${t}`, mj: t => t, jefe: t => `Jefe: ${t}` }, sinConocidos: 'No conoce a nadie más por aquí.' },
    en: { cerrar: 'Close', volver: 'Back', opinaDe: n => `What do you think of ${n}?`, regalar: n => `Give: ${n}`, leGusta: l => `Likes: ${l}`, o: ' or ',
        yaRegalo: 'You already gave a gift today. Come back tomorrow.', amistad: 'Friendship', bloqueado: '???',
        req: { nivel: n => `Friendship: ${n}`, mision: t => `Quest: ${t}`, mj: t => t, jefe: t => `Boss: ${t}` }, sinConocidos: 'Knows nobody else around here.' }
};
const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const angulo = a => Math.atan2(Math.sin(a), Math.cos(a));
const CAMPOS = ['cx', 'cy', 'cz', 'bDx', 'bDz', 'bIx', 'bIz', 'inc', 'rz'];
const MAX_DIST = 7; // más lejos, el panel se cierra solo

// ctx: amistad, hechos() -> { hechas, minijuegos, jefes }, personaDe(clave) -> n, jugador, dy, nombres, base() (clave de tu skin),
// pestanas(clave), abrirPanel, cerrarPanel, decir(clave, texto), inventario, hud, sonidos, nombreDe(id, idioma), tituloDe(id) -> {es,en}
export function crearHablar(ctx) {
    const { amistad, jugador, dy, nombres, inventario, sonidos } = ctx;
    let idioma = ctx.idioma || 'es';
    const tx = () => TXT[idioma];
    const L = o => (o ? o[idioma] || o.es : '');

    // ---------------------------------------------------------
    // Gestos sobre la animación normal
    // ---------------------------------------------------------
    let charla = null; // { clave, n, hook, w, t, cola, g, yawLibre, off, cur, ultimo }
    let elActual = null, claveActual = null;
    const vivo = c => !!(elActual && elActual.isConnected && claveActual === c.clave);
    function leer(p) {
        return { cx: p.cuello.rotation.x, cy: p.cuello.rotation.y, cz: p.cuello.rotation.z, bDx: p.brazoD.rotation.x, bDz: p.brazoD.rotation.z,
            bIx: p.brazoI.rotation.x, bIz: p.brazoI.rotation.z, inc: p.cuerpo.rotation.x, rz: p.cuerpo.rotation.z };
    }
    function escribir(p, v) {
        p.cuello.rotation.x = v.cx; p.cuello.rotation.y = v.cy; p.cuello.rotation.z = v.cz;
        p.brazoD.rotation.x = v.bDx; p.brazoD.rotation.z = v.bDz; p.brazoI.rotation.x = v.bIx; p.brazoI.rotation.z = v.bIz;
        p.cuerpo.rotation.x = v.inc; p.cuerpo.rotation.z = v.rz;
    }
    // Cola de gestos: [{ g, dur }]; el primero suena ya
    function gesticular(lista) {
        if (!charla) return;
        charla.cola = lista.map(x => ({ ...x }));
        charla.g = null;
    }
    function enganchar(clave) {
        const n = ctx.personaDe(clave);
        if (!n) return;
        if (charla && charla.n === n && n.escena === charla.hook) { charla.clave = clave; return; }
        soltar();
        if (n.escena) return; // otra escena (skin, minijuego) lo tiene: no se toca
        // Sentado (piernas adelante, como en escenas-skin.js): gira poco el cuerpo; de pie, casi de frente
        const sentado = n.p.piernaD.rotation.x < -0.4;
        const c = { clave, n, w: 0, t: 0, cola: [], g: null, yawLibre: n.yaw, off: 0, cur: null, ultimo: performance.now(), giro: sentado ? 0.4 : 0.85, topeGiro: sentado ? 0.6 : 1.6 };
        c.hook = (dt, base) => {
            c.ultimo = performance.now();
            c.t += dt;
            // La animación normal sigue, pero sin caminar ni girar por su cuenta
            n.yaw = c.yawLibre;
            const x0 = n.x, z0 = n.z;
            const r = base();
            if (n.x !== x0 || n.z !== z0) { n.x = x0; n.z = z0; }
            c.yawLibre = n.yaw;
            const objetivo = vivo(c) ? 1 : 0;
            c.w += (objetivo - c.w) * Math.min(1, dt * 6);
            aplicar(c, dt);
            if (!objetivo && c.w < 0.03) cerrarCharla(c);
            return r;
        };
        n.escena = c.hook;
        charla = c;
    }
    function aplicar(c, dt) {
        const n = c.n, p = n.p;
        // Gesto actual de la cola (rampa de 0,25 s a cada lado)
        if (!c.g && c.cola.length) { c.g = c.cola.shift(); c.g.t = 0; }
        let meta = {}, wg = 0;
        if (c.g) {
            c.g.t += dt;
            const u = lim(c.g.t / c.g.dur, 0, 1);
            meta = GESTOS[c.g.g] ? GESTOS[c.g.g](u, c.t, false, false) : {};
            wg = suave(Math.min(lim(c.g.t / 0.25, 0, 1), lim((c.g.dur - c.g.t) / 0.25, 0, 1)));
            if (c.g.t >= c.g.dur) c.g = null;
        }
        // Mirada hacia el jugador: la cabeza hasta ±1,1 rad y el cuerpo gira el resto (poco si está sentado)
        const J = jugador.pos, esc = n.escala || 1;
        const ang = angulo(Math.atan2(J.x - n.x, J.z - n.z) - c.yawLibre);
        const offObj = lim(ang * c.giro, -c.topeGiro, c.topeGiro) * c.w;
        c.off += (offObj - c.off) * Math.min(1, dt * 4);
        n.yaw = c.yawLibre + c.off;
        const d = Math.hypot(J.x - n.x, J.z - n.z) || 1;
        const mira = {
            cy: lim(angulo(ang - c.off), -1.1, 1.1),
            cx: lim(-Math.atan2(J.y + 1.6 - ((n.y ?? 0) + dy + 1.6 * esc), d), -0.45, 0.45)
        };
        const ahora = leer(p);
        const meta2 = {};
        for (const k of CAMPOS) {
            let v = ahora[k];
            if (k === 'cx' || k === 'cy') v = lerp(v, mira[k], 0.9);
            if (meta[k] !== undefined) v = lerp(v, k === 'cy' ? v + meta.cy : meta[k], wg);
            meta2[k] = v;
        }
        if (!c.cur) c.cur = { ...ahora };
        const r = Math.min(1, dt * 9);
        const fin = {};
        for (const k of CAMPOS) { c.cur[k] += (meta2[k] - c.cur[k]) * r; fin[k] = lerp(ahora[k], c.cur[k], c.w); }
        escribir(p, fin);
    }
    function cerrarCharla(c) {
        c.n.yaw = c.yawLibre;
        if (c.n.escena === c.hook) delete c.n.escena;
        if (charla === c) charla = null;
    }
    // Suelta el gancho ya (al cambiar de amigo); el desvanecido normal lo hace el propio gancho
    function soltar() { if (charla) cerrarCharla(charla); }

    // ---------------------------------------------------------
    // Panel
    // ---------------------------------------------------------
    const hechos = () => ctx.hechos();
    const nivelDe = clave => amistad.nivel(clave);
    function temaTexto(tema, base) { return L((tema.skin && base && tema.skin[base]) || tema.r); }
    function motivo(req) {
        const r = tx().req;
        if (!req) return '';
        if (req.nivel !== undefined && nivelDeActual < req.nivel) return r.nivel(L(NIVELES[req.nivel]));
        const h = hechos();
        if (req.mision && !h.hechas.has(req.mision)) return r.mision(L(ctx.tituloDe(req.mision)));
        if (req.mj && !h.minijuegos.has(req.mj)) return r.mj(L(ctx.tituloDe(req.mj)));
        if (req.jefe && !h.jefes.has(req.jefe)) return r.jefe(L(ctx.tituloDe(req.jefe)));
        return '';
    }
    let nivelDeActual = 0;
    const conocidos = clave => Object.keys(OPINIONES[clave] || {}).filter(o => relacion(clave, o) > 0);

    function barra(clave) {
        const d = document.createElement('div');
        d.className = 'amistad';
        const n = nivelDe(clave), pts = amistad.puntos(clave);
        const b = document.createElement('b'); b.textContent = `${tx().amistad}: ${L(NIVELES[n])}`;
        const s = document.createElement('small'); s.textContent = `${pts}/100`;
        const barra = document.createElement('span'); barra.className = 'amistad-barra';
        // 5 tramos, uno por nivel; cada uno se llena según el avance dentro del nivel
        for (let i = 0; i < NIVELES.length; i++) {
            const a = NIVELES[i].min, z = i + 1 < NIVELES.length ? NIVELES[i + 1].min : 100;
            const tramo = document.createElement('i');
            const k = lim((pts - a) / (z - a), 0, 1);
            tramo.style.setProperty('--lleno', `${Math.round(k * 100)}%`);
            if (pts >= z || (i === NIVELES.length - 1 && pts >= 100)) tramo.className = 'lleno';
            barra.appendChild(tramo);
        }
        d.append(b, barra, s);
        return d;
    }
    function boton(texto, f, clase = '') {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'boton ' + clase; b.textContent = texto;
        if (f) b.addEventListener('click', f); else b.disabled = true;
        return b;
    }

    // vista: 'temas' | 'opina'
    function abrir(clave, frase = null, vista = 'temas') {
        const temas = TEMAS[clave];
        if (!temas) return false;
        const base = ctx.base();
        const saludo = !frase;
        nivelDeActual = nivelDe(clave);
        const el = document.createElement('section');
        el.className = 'panel-mision panel-hablar';
        const h = document.createElement('h2'); h.textContent = nombres[clave];
        el.append(h, ctx.pestanas(clave), barra(clave));
        // Saludo según el nivel (o la skin)
        if (!frase) {
            const s = SALUDOS[clave];
            frase = L((s.skin && base && s.skin[base]) || (nivelDeActual >= 2 ? s.alto : s.bajo));
            ctx.decir(clave, frase);
        }
        const p = document.createElement('p'); p.className = 'dialogo'; p.textContent = frase;
        el.appendChild(p);

        const lista = document.createElement('div');
        lista.className = 'temas-hablar';
        if (vista === 'opina') {
            const otros = conocidos(clave);
            if (!otros.length) lista.appendChild(Object.assign(document.createElement('p'), { className: 'objetivo', textContent: tx().sinConocidos }));
            for (const o of otros) lista.appendChild(boton(tx().opinaDe(nombres[o]), () => decirTema(clave, `opina:${o}`, OPINIONES[clave][o], 'habla', 'opina'), 'tema'));
            lista.appendChild(boton(tx().volver, () => abrir(clave, p.textContent), 'secundario tema'));
        } else {
            for (const tema of temas) {
                const ok = cumple(tema.req, nivelDeActual, hechos());
                if (!ok) {
                    const b = boton(tx().bloqueado, null, 'tema bloqueado');
                    const m = motivo(tema.req);
                    b.title = m;
                    const fila = document.createElement('div'); fila.className = 'tema-bloqueado';
                    const s = document.createElement('small'); s.textContent = m;
                    fila.append(b, s);
                    lista.appendChild(fila);
                    continue;
                }
                if (tema.id === 'opina') { lista.appendChild(boton(L(tema.p), () => abrir(clave, p.textContent, 'opina'), 'tema')); continue; }
                lista.appendChild(boton(L(tema.p), () => decirTema(clave, tema.id, (tema.skin && base && tema.skin[base]) || tema.r, tema.g), 'tema'));
            }
        }
        el.appendChild(lista);

        // Regalo: solo su objeto favorito, uno al día
        const favs = FAVORITOS[clave] || [];
        const tiene = favs.find(id => inventario.contar(id) > 0);
        const regalo = document.createElement('div');
        regalo.className = 'regalo-hablar';
        if (tiene !== undefined && !amistad.regaloHoy(clave)) regalo.appendChild(boton(tx().regalar(ctx.nombreDe(tiene, idioma)), () => regalar(clave, tiene), 'boton-regalo'));
        else if (tiene !== undefined) regalo.appendChild(Object.assign(document.createElement('small'), { textContent: tx().yaRegalo }));
        else regalo.appendChild(Object.assign(document.createElement('small'), { textContent: tx().leGusta(favs.map(id => ctx.nombreDe(id, idioma)).join(tx().o)) }));
        el.appendChild(regalo);

        const fila = document.createElement('div'); fila.className = 'botones-mision';
        fila.appendChild(boton(tx().cerrar, () => ctx.cerrarPanel(), 'secundario'));
        el.appendChild(fila);

        elActual = el; claveActual = clave;
        ctx.abrirPanel(el, { hablar: true });
        enganchar(clave);
        if (saludo) gesticular([{ g: 'asiente', dur: 1.4 }]);
        const primero = lista.querySelector('button:not(:disabled)');
        if (primero) primero.focus({ preventScroll: true });
        return true;
    }

    // Dice un tema: respuesta en el panel y en su globo, gesto del tema y luego «habla»; suma amistad (tope diario)
    function decirTema(clave, id, texto, g = 'habla', vista = 'temas') {
        const frase = L(texto);
        ctx.decir(clave, frase);
        amistad.hablar(clave, id);
        sonidos.clic();
        abrir(clave, frase, vista);
        const dur = lim(frase.length / 16, 2, 6);
        gesticular(g && g !== 'habla' ? [{ g, dur: 1.8 }, { g: 'habla', dur: Math.max(1, dur - 1.8) }] : [{ g: 'habla', dur }]);
    }
    function regalar(clave, id) {
        if (amistad.regaloHoy(clave) || inventario.contar(id) <= 0) return;
        inventario.quitar(id, 1);
        amistad.sumar(clave, 'regalo');
        sonidos.nivel();
        const frase = L(REGALOS[clave]);
        ctx.decir(clave, frase);
        abrir(clave, frase);
        gesticular([{ g: GESTO_REGALO[clave] || 'risa', dur: 2 }, { g: 'asiente', dur: 1.2 }]);
    }

    function actualizar() {
        if (!charla) return;
        const c = charla;
        // Otra escena le quitó el gancho, o ya no se dibuja (lejos): se suelta
        if (c.n.escena !== c.hook) { charla = null; return; }
        if (!vivo(c) && performance.now() - c.ultimo > 600) cerrarCharla(c);
        // Si el jugador se alejó (empujado, teletransporte), el panel se cierra
        if (vivo(c) && Math.hypot(c.n.x - jugador.pos.x, c.n.z - jugador.pos.z) > MAX_DIST) ctx.cerrarPanel();
    }

    return {
        abrir, actualizar, soltar,
        get charla() { return charla; },
        setIdioma(l) { idioma = l; }
    };
}
