// =========================================================
// VENJY · Supervivencia · Marco de los minijuegos
// Un minijuego es una escena de cine con tres fases: «intro» (guion con globos), «juego» (un solo
// botón: ESPACIO, el botón grande de la pantalla o un toque) y «final» (escena según el resultado).
// Se lanza desde el panel de un amigo (botón extra que pinta misiones.js) y este módulo se encarga
// de lo común: bloquear y liberar al jugador, la cámara de cine (planos propios de cada juego), la
// pose suavizada de tu cuerpo, los globos de cada actor, el tablero (barras, ritmo y botón), el
// premio, «Saltar»/Esc y restaurar todo al terminar.
//   · «Saltar» en la intro pasa al juego; en el juego es «Rendirse» (sin premio); en el final, termina.
//   · Los juegos viven en sus módulos (minijuego-lena.js, minijuego-pesca.js, minijuego-asado.js) y
//     devuelven { amigos, nombre, boton, disponible, empezar, actualizar, accion, pose, ui, restaurar }.
//   · Lo jugado se guarda en misiones.estado.minijuegos (claves de juego y marcas como 'mj-boris').
// Depuración: __venjy.minijuegos.forzar(clave[, final]), pausar(v), irA(seg), fase(f[, final]), saltar().
// =========================================================
import { crearGlobo, COLOR_GLOBO, crearTinte } from '../criaturas/cuerpo.js';
import { nombreDe } from './objetos.js';
import { sonidos } from './sonidos.js';
import { TXT_MJ } from './minijuegos-datos.js';
import { crearLena } from './minijuego-lena.js';
import { crearPescaPony } from './minijuego-pesca.js';
import { crearAsado } from './minijuego-asado.js';

// Pose neutra del cuerpo del jugador (nombres cortos de la skill: referencia/rig.md)
const N = { y: 0, inc: 0, rz: 0, pDx: 0, pIx: 0, bDx: 0, bDz: 0.05, bIx: 0, bIz: -0.05, cx: 0, cy: 0, cz: 0 };

export function crearMinijuegos(ctx) {
    const { grupo, dy, jugador, camara, camaras, misiones, amigos, npcs, inventario, entidades, hud, tinteMundo, puede, bloquear, liberar } = ctx;
    let L = ctx.idioma || 'es';
    const tx = () => TXT_MJ[L] || TXT_MJ.es;
    const etiq = o => (o ? o[L] || o.es : '');

    // ---- Tablero (DOM) ----
    const tablero = document.createElement('div');
    tablero.className = 'mj-tablero';
    const titulo = document.createElement('div'); titulo.className = 'mj-titulo';
    const barras = document.createElement('div'); barras.className = 'mj-barras';
    const ritmo = document.createElement('div'); ritmo.className = 'mj-ritmo';
    const zona = document.createElement('div'); zona.className = 'mj-zona';
    const zona2 = document.createElement('div'); zona2.className = 'mj-zona otra';
    const cursor = document.createElement('div'); cursor.className = 'mj-cursor';
    ritmo.append(zona, zona2, cursor);
    const pista = document.createElement('div'); pista.className = 'mj-pista';
    const accionB = document.createElement('button');
    accionB.type = 'button'; accionB.className = 'boton mj-accion'; accionB.tabIndex = -1;
    // pointerdown (no click): responde al instante, sirve con mouse y con el dedo, y no deja el foco en el botón
    accionB.addEventListener('pointerdown', e => { e.preventDefault(); accion(); });
    tablero.append(titulo, barras, ritmo, pista, accionB);
    document.body.appendChild(tablero);
    const saltarB = document.createElement('button');
    saltarB.type = 'button'; saltarB.className = 'boton saltar-minijuego';
    saltarB.addEventListener('click', e => { e.preventDefault(); saltar(); });
    document.body.appendChild(saltarB);

    // ---- Globos: uno por actor, achicados como en las escenas con gatas ----
    const globos = new Map(); // quien -> { globo, texto }
    function globoDe(quien) {
        if (!globos.has(quien)) {
            const g = crearGlobo(grupo, { color: COLOR_GLOBO[quien] || COLOR_GLOBO.j });
            g.sp.scale.set(1.5, 0.62, 1);
            globos.set(quien, { globo: g, texto: null });
        }
        return globos.get(quien);
    }
    const personaDe = quien => [...amigos.lista, ...npcs.lista].find(n => n.clave === quien) || null;

    // ---- Lo que comparten los juegos ----
    const tinte = crearTinte();
    const api = {
        ...ctx, tinte, etiq,
        get idioma() { return L; },
        personaDe,
        hecho: k => misiones.estado.minijuegos.has(k),
        marcar: k => misiones.estado.minijuegos.add(k)
    };
    const JUEGOS = { lena: crearLena(api), pesca: crearPescaPony(api), asado: crearAsado(api) };
    const juegoDe = clave => Object.keys(JUEGOS).find(k => JUEGOS[k] && JUEGOS[k].amigos.includes(clave)) || null;

    // ---------------------------------------------------------
    // Estado
    // ---------------------------------------------------------
    let e = null, pausada = false;
    const cur = {};

    function iniciar(clave, finalForzado = null) {
        const j = JUEGOS[clave];
        if (!j || e) return false;
        bloquear();
        e = { clave, j, fase: 'intro', t: 0, total: 0, final: null, lineas: [], sueltas: [], premio: null, datos: {}, P: null };
        e.pasar = (fase, final = null) => {
            e.fase = fase; e.t = 0;
            if (fase === 'final') {
                e.final = final;
                e.premio = j.premio ? j.premio(e) : null;
                darPremio(e.premio);
                misiones.estado.minijuegos.add(clave);
                if (misiones.alMinijuego) misiones.alMinijuego(clave, final); // amistad (bloque 6a)
            }
            if (j.alPasar) j.alPasar(e, fase);
            camaras.nuevaLinea();
            pintarSaltar();
        };
        e.decir = (quien, texto, dur = 2.8) => { e.sueltas = e.sueltas.filter(s => s.quien !== quien); e.sueltas.push({ quien, texto, hasta: e.total + dur }); };
        // Guion [desde, hasta, quien, texto]: las líneas que tocan en el segundo `t` (por defecto, el de la fase)
        e.guion = (lista, t = e.t) => { for (const [a, b, quien, texto] of lista) if (t >= a && t < b) e.lineas.push([quien, texto]); };
        e.dice = (lista, quien, t = e.t) => lista.some(([a, b, q]) => q === quien && t >= a && t < b);
        e.fin = () => terminar();
        const cine = j.empezar(e);
        for (const k in cur) delete cur[k];
        Object.assign(cur, N, j.pose(e) || {}); // la pose empieza ya puesta (bajo el fundido)
        camaras.iniciarCine(cine.ancla, { escena: true, fundido: 0.5, evitar: cine.evitar || [], visibles: cine.visibles, planos: cine.planos });
        camaras.enfocar(cine.foco ?? 0.5);
        camaras.pose = (c, dt) => poseJugador(dt);
        misiones.ocultarMarcas = true;
        document.body.classList.add('en-minijuego');
        pintarSaltar();
        if (finalForzado) e.pasar('final', finalForzado);
        return true;
    }

    function terminar() {
        if (!e) return;
        const x = e; e = null;
        x.j.restaurar(x);
        const c = camaras.cuerpo;
        c.cuerpo.position.y = 0; c.cuerpo.rotation.x = 0; c.cuerpo.rotation.z = 0;
        for (const h of [c.brazoD, c.brazoI, c.piernaD, c.piernaI, c.cuello]) { h.rotation.x = 0; h.rotation.z = 0; }
        c.cuello.rotation.y = 0;
        camaras.terminarCine();
        misiones.ocultarMarcas = false;
        document.body.classList.remove('en-minijuego');
        liberar();
    }

    function saltar() {
        if (!e) return;
        if (e.fase === 'intro') e.pasar('juego');
        else terminar(); // en el juego es rendirse: sin premio
    }
    function pintarSaltar() { if (e) saltarB.textContent = e.fase === 'juego' ? tx().rendirse : tx().saltar; }

    function accion() {
        if (!e || e.fase !== 'juego' || pausada) return;
        e.j.accion(e);
    }

    function darPremio(lista) {
        if (!lista || !lista.length) { hud.mensaje(tx().nada, 3); return; }
        for (const [id, n] of lista) {
            const resto = inventario.agregar(id, n);
            if (resto) entidades.soltar(id, resto, 0, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z);
        }
        hud.mensaje(`${tx().recibes} ${lista.map(([id, n]) => `${n > 1 ? n + ' × ' : ''}${nombreDe(id, L)}`).join(', ')}`, 4);
        sonidos.nivel();
    }

    // Pose del jugador: metas del juego sobre la neutra, suavizadas (rapidez 10) y escritas en los huesos
    function poseJugador(dt) {
        if (!e) return;
        const meta = Object.assign({}, N, e.j.pose(e));
        const r = Math.min(1, dt * 10);
        for (const k in meta) cur[k] = (cur[k] ?? meta[k]) + (meta[k] - (cur[k] ?? meta[k])) * r;
        const c = camaras.cuerpo;
        c.cuerpo.position.y = cur.y;
        c.cuerpo.rotation.x = cur.inc; c.cuerpo.rotation.z = cur.rz;
        c.piernaD.rotation.x = cur.pDx; c.piernaI.rotation.x = cur.pIx;
        c.brazoD.rotation.x = cur.bDx; c.brazoD.rotation.z = cur.bDz;
        c.brazoI.rotation.x = cur.bIx; c.brazoI.rotation.z = cur.bIz;
        c.cuello.rotation.x = cur.cx; c.cuello.rotation.y = cur.cy; c.cuello.rotation.z = cur.cz;
        if (e.j.poseExtra) e.j.poseExtra(e, c, dt);
    }

    // ---- Tablero: lo que pide el juego en este cuadro ----
    let firmaBarras = '';
    function pintarTablero() {
        const u = e && e.fase === 'juego' ? e.j.ui(e) : null;
        tablero.classList.toggle('visible', !!u);
        if (!u) return;
        titulo.textContent = etiq(u.titulo);
        // Barras: [{ nombre, v, max, texto }]
        const lista = u.barras || [];
        const firma = lista.map(b => b.nombre).join('|');
        if (firma !== firmaBarras) {
            firmaBarras = firma;
            barras.textContent = '';
            for (const b of lista) {
                const f = document.createElement('div'); f.className = 'mj-fila';
                const n = document.createElement('span'); n.className = 'mj-nombre';
                const m = document.createElement('div'); m.className = 'mj-medidor';
                const r = document.createElement('div'); r.className = 'mj-relleno';
                const v = document.createElement('span'); v.className = 'mj-valor';
                m.appendChild(r); f.append(n, m, v); barras.appendChild(f);
            }
        }
        lista.forEach((b, i) => {
            const f = barras.children[i];
            f.children[0].textContent = b.nombre;
            f.children[1].firstChild.style.width = `${Math.max(0, Math.min(1, b.v / b.max)) * 100}%`;
            f.children[2].textContent = b.texto ?? `${b.v}/${b.max}`;
        });
        // Ritmo: cursor 0..1 y zonas [a, b] (la segunda es opcional)
        ritmo.hidden = u.cursor == null;
        if (u.cursor != null) {
            cursor.style.left = `${Math.max(0, Math.min(1, u.cursor)) * 100}%`;
            const z = (el, r) => { el.hidden = !r; if (r) { el.style.left = `${r[0] * 100}%`; el.style.width = `${(r[1] - r[0]) * 100}%`; } };
            z(zona, u.zona); z(zona2, u.zona2);
            ritmo.classList.toggle('apagado', !!u.apagado);
        }
        pista.textContent = etiq(u.pista);
        accionB.textContent = `${etiq(u.boton)}`;
        accionB.disabled = !!u.inactivo;
        accionB.classList.toggle('urgente', !!u.urgente);
    }

    // ---------------------------------------------------------
    // Bucle
    // ---------------------------------------------------------
    function actualizar(dt) {
        if (e) {
            if (!pausada) { e.t += dt; e.total += dt; }
            const x = e;
            if (x.P) { jugador.pos.x = x.P.x; jugador.pos.z = x.P.z; } // te quedas en tu sitio
            x.lineas = [];
            x.j.actualizar(x, pausada ? 0 : dt);
            if (!e) return; // el juego terminó solo
            x.sueltas = x.sueltas.filter(s => s.hasta > x.total);
        }
        // Globos: guion de la fase + reacciones sueltas (la más nueva manda)
        const activos = new Map();
        if (e) {
            for (const [quien, texto] of e.lineas) activos.set(quien, texto);
            for (const s of e.sueltas) activos.set(s.quien, s.texto);
        }
        for (const [quien, gl] of globos) {
            const texto = activos.has(quien) ? etiq(activos.get(quien)) : null;
            if (texto && texto !== gl.texto) { gl.globo.decir(texto); camaras.nuevaLinea(); }
            gl.texto = texto;
            const p = texto ? posGlobo(quien) : null;
            gl.globo.actualizar(dt, !!p, p ? p.x : 0, p ? p.y : 0, p ? p.z : 0, camara);
        }
        for (const quien of activos.keys()) if (!globos.has(quien)) globoDe(quien); // aparece desde el cuadro siguiente
        pintarTablero();
        tinte.aplicar(tinteMundo);
    }
    // Encima de la cabeza de cada uno (coordenadas de `grupo`)
    function posGlobo(quien) {
        if (e && e.j.posGlobo) { const p = e.j.posGlobo(e, quien); if (p) return p; }
        if (quien === 'j') return { x: jugador.pos.x, y: jugador.pos.y - dy + (cur.y || 0) + 2.35, z: jugador.pos.z };
        const n = personaDe(quien);
        return n ? { x: n.x, y: n.y + 2.15 * (n.escala || 1) + 0.45, z: n.z } : null;
    }

    // Esc salta/rinde; ESPACIO es la acción
    document.addEventListener('keydown', ev => {
        if (!e) return;
        if (ev.code === 'Escape' && !ev.repeat) { ev.preventDefault(); saltar(); }
        else if (ev.code === 'Space') { ev.preventDefault(); if (!ev.repeat) accion(); }
    });

    // Botón del panel de un amigo: { texto, motivo (si no se puede), f }
    function botonPara(clave) {
        const k = juegoDe(clave);
        if (!k) return null;
        const j = JUEGOS[k];
        const motivo = j.disponible ? j.disponible() : null;
        return { texto: etiq(j.boton), motivo: motivo ? etiq(motivo) : null, juego: k };
    }

    return {
        actualizar, botonPara,
        intentar(clave) { return puede() ? iniciar(clave) : false; },
        get activo() { return !!e; },
        setIdioma(l) { L = l; pintarSaltar(); },
        // Depuración (capturas)
        forzar(clave, final = null) { return iniciar(clave, final); },
        pausar(v = true) { pausada = v; },
        irA(s) { if (e) { e.t = s; if (e.j.irA) e.j.irA(e, s); } },
        fase(f, final = null) { if (e) e.pasar(f, final); },
        saltar: () => saltar(),
        terminar: () => terminar(),
        get estado() { return e; },
        juegos: JUEGOS
    };
}
