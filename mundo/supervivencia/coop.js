// =========================================================
// VENJY · Supervivencia online cooperativa (Supabase Realtime)
// Un jugador hospeda uno de sus mundos y hasta 3 amigos entran con el código de sala.
//
// Quién manda en qué:
//  · Anfitrión: el mundo guardado (su IndexedDB), la hora, los cultivos, los hornos y quién se lleva
//    cada objeto tirado (el primero que lo pide). Al entrar alguien, sube una «foto» del mundo
//    (el mismo formato del guardado, con gzip) a la tabla `salas_coop` y el invitado la baja.
//  · Cada jugador: los monstruos que aparecen junto a él (cada equipo solo tiene cargados los chunks
//    que lo rodean). Persiguen al jugador más cercano de la sala y su dueño valida los golpes que le
//    llegan con tolerancia (acepta si el monstruo estuvo al alcance hace poco). El jefe lo simula
//    quien lo invocó.
//  · Cada uno: su vida, su inventario, sus misiones, sus escenas y minijuegos (todo local).
//
// Mensajes (evento `m` del canal, campo `e`): p posición (y, si hay, monstruos y jefe) · b bloques · c contenedor · o objeto
// soltado · ot pedir objeto · ok objeto concedido · m monstruos y jefe sueltos (sin uso: van dentro de p) · mf monstruo fuera ·
// g golpe a monstruo · gj golpe a jefe · d daño a jugador · x explosión · pr proyectil · mk muerte
// para misiones · jv jefe vencido · ry rayo · h hora · z en cama · am amanecer · pf perfil ·
// pf? pedir foto · fl foto lista · fin el anfitrión cierra · pc cofre de compañero editado.
//
// Gasto (plan gratis ~100 mensajes/s por proyecto; Supabase cobra 1 por enviar + 1 por cada
// cliente que lo recibe): posición a 5 Hz con interpolación (1 latido/s si estás quieto);
// monstruos dentro del mismo mensaje de posición (un solo mensaje por tick de 200 ms y jugador,
// así cada uno manda como mucho 5 por segundo más los eventos): los que están a menos de 10 bloques de algún
// jugador en cada tick (5 Hz) y los demás juntos cada 3 ticks (≈1,7 Hz: alineados con los de 5 Hz
// para no sumar mensajes aparte), sin repetir lo que no cambió (salvo un refresco cada 2 s); jefe
// a 5 Hz; si no hay nada cerca de otro jugador, no se manda nada. Los eventos van cuando ocurren.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { Sala } from '../online/red.js';
import { B } from '../texturas.js';
import { crearModelo } from './skin.js';
import { caminar } from '../criaturas/cuerpo.js';
import { infoBloque } from './objetos.js';
import { etapasDe } from './agricultura.js';
import { Bufer, RETRASO, mezclar, mezclarAngulo } from './interpolacion.js';
import { sonidos } from './sonidos.js';

export const MAX_COOP = 4;
export const HZ_POS = 5;
const TOLERANCIA = 250;            // ms de margen al validar un golpe…
const VENTANA_GOLPE = RETRASO + 150 + TOLERANCIA; // …sobre lo que el atacante ve (200 ms en el pasado) y la red
const ALCANCE_GOLPE = 3.6 + 1.2;   // alcance del combate (3,6) + medio cuerpo + margen

// ---------------------------------------------------------
// Identidad del dispositivo (para el perfil de cada jugador y los cofres de compañero)
// ---------------------------------------------------------
// Para probar con dos pestañas del mismo navegador: supervivencia.html?disp=2 usa otra identidad
export function idDispositivo() {
    const extra = new URLSearchParams(location.search).get('disp');
    return idBase() + (extra ? '-' + extra.replace(/[^a-z0-9]/gi, '').slice(0, 8) : '');
}
function idBase() {
    try {
        let d = localStorage.getItem('venjy-dispositivo');
        if (!d) { d = 'd' + Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('venjy-dispositivo', d); }
        return d;
    } catch (e) { return 'd' + Math.random().toString(16).slice(2, 14); }
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para dictarlo sin dudas
function codigoAzar() { return Array.from(crypto.getRandomValues(new Uint8Array(6)), b => ALFABETO[b % ALFABETO.length]).join(''); }
function claveAzar() { return Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); }

// ---------------------------------------------------------
// Foto del mundo: JSON + gzip + base64
// ---------------------------------------------------------
async function aBase64(obj) {
    const texto = JSON.stringify(obj);
    let bytes;
    if (typeof CompressionStream !== 'undefined') {
        const flujo = new Blob([texto]).stream().pipeThrough(new CompressionStream('gzip'));
        bytes = new Uint8Array(await new Response(flujo).arrayBuffer());
    } else bytes = new TextEncoder().encode(texto);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
}
async function deBase64(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        const flujo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        return JSON.parse(await new Response(flujo).text());
    }
    return JSON.parse(new TextDecoder().decode(bytes));
}

const esperar = ms => new Promise(r => setTimeout(r, ms));
function fallo(codigo, mensaje) { return Object.assign(new Error(mensaje), { codigo }); }

// Conexión previa al juego: los mensajes que llegan antes de que el mundo exista quedan en cola
function conexionBase(sala, rol, extra) {
    const cx = { sala, rol, cola: [], manejar: null, presentes: new Map(), ...extra };
    const TIPOS = ['p', 'b', 'c', 'o', 'ot', 'ok', 'm', 'mf', 'g', 'gj', 'd', 'x', 'pr', 'mk', 'jv', 'ry', 'h', 'z', 'am', 'pf', 'pf?', 'fl', 'fin', 'pc'];
    for (const t of TIPOS) sala.en(t, m => (cx.manejar ? cx.manejar(t, m) : cx.cola.push([t, m])));
    sala.en('entra', m => { cx.presentes.set(m.id, m); cx.alEntrar && cx.alEntrar(m); });
    sala.en('actualiza', m => { cx.presentes.set(m.id, m); cx.alActualizar && cx.alActualizar(m); });
    sala.en('sale', m => { const p = cx.presentes.get(m.id); cx.presentes.delete(m.id); cx.alSalir && cx.alSalir(m.id, p); });
    sala.en('estado', m => cx.alEstado && cx.alEstado(m.estado));
    return cx;
}

// El anfitrión abre la sala con un código nuevo
export async function hospedar({ nombre, skin }) {
    const disp = idDispositivo();
    for (let intento = 0; intento < 4; intento++) {
        const sala = new Sala();
        const codigo = codigoAzar(), clave = claveAzar();
        const cx = conexionBase(sala, 'anfitrion', { codigo, clave, disp, nombre });
        await sala.entrar({ codigo, nombre, coop: true, max: MAX_COOP, meta: { disp, skin, anf: 1 } });
        const r = await sala.cliente.rpc('crear_sala_coop', { p_codigo: codigo, p_clave: clave });
        if (!r.error && r.data === true && !sala.jugadores.size) return cx;
        await sala.salir();
    }
    throw fallo('codigo', 'no se pudo crear la sala');
}

// Un invitado entra: espera al anfitrión, le pide la foto del mundo y la baja
export async function unirse({ codigo, nombre, skin, alAvance }) {
    const disp = idDispositivo();
    const sala = new Sala();
    const cx = conexionBase(sala, 'invitado', { codigo, disp, nombre });
    await sala.entrar({ codigo, nombre, coop: true, max: MAX_COOP, meta: { disp, skin } });
    const anfitrion = () => [...sala.jugadores.entries()].find(([, m]) => m.anf);
    for (let t = 0; t < 40 && !anfitrion(); t++) await esperar(250);
    const a = anfitrion();
    if (!a) { await sala.salir(); throw fallo('sin-anfitrion', 'no hay anfitrión'); }
    cx.anfitrion = a[0];
    for (const [id, m] of sala.jugadores) cx.presentes.set(id, { id, ...m });
    alAvance && alAvance('foto');
    // La foto la pide el invitado; la respuesta llega como 'fl' (se busca en la cola)
    sala.enviar('pf?', { para: cx.anfitrion });
    let lista = false;
    for (let t = 0; t < 120 && !lista; t++) {
        await esperar(250);
        lista = cx.cola.some(([tipo, m]) => tipo === 'fl' && m.para === sala.id);
        if (sala.estado === 'error') break;
    }
    if (!lista) { await sala.salir(); throw fallo('foto', 'el anfitrión no respondió'); }
    const r = await sala.cliente.rpc('bajar_foto', { p_codigo: codigo });
    if (r.error || !r.data) { await sala.salir(); throw fallo('foto', r.error ? r.error.message : 'sin foto'); }
    cx.foto = await deBase64(r.data);
    return cx;
}

// La partida guardada con la que arranca un invitado: el mundo del anfitrión con sus propios datos
export function guardadoDeInvitado(cx) {
    const f = cx.foto;
    const yo = (f.jugadores || {})[cx.disp] || null;
    return {
        ...f, id: 'coop-' + cx.codigo, spawnCama: null, jugado: 0,
        jugador: yo ? yo.pos : null, vida: yo ? yo.vida : null, inventario: yo ? yo.inv : null, misiones: yo ? yo.mis : null,
        jugadores: f.jugadores || {}, idDueno: f.idDueno
    };
}

// ---------------------------------------------------------
// Durante el juego
// ---------------------------------------------------------
export function crearCoop(cx, ctx) {
    const { scene, mundo, jugador, vida, dia, inventario, entidades, contenedores, agricultura, enemigos, jefes, proyectiles, misiones, hud, particulas, idioma = 'es' } = ctx;
    const sala = cx.sala;
    const yoId = sala.id;
    const esAnfitrion = cx.rol === 'anfitrion';
    const corto = yoId.slice(0, 6);
    const ahora = () => performance.now();
    const L = (es, en) => (idioma === 'en' ? en : es);

    // Prefijos para los uid: así los de cada jugador no chocan
    enemigos.api.prefijo = 'm' + corto + '.';
    entidades.api.prefijo = 'o' + corto + '.';

    // ---------- Jugadores remotos ----------
    const remotos = new Map(); // id de sala -> { nombre, disp, skin, modelo, nombreSp, bufer, objetivo, fase, previo }
    function nombreSprite(texto) {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 40;
        const x = c.getContext('2d');
        const tex = new THREE.CanvasTexture(c);
        tex.magFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
        const dibujar = () => {
            x.clearRect(0, 0, 256, 40);
            x.font = '24px PixelCraft, monospace';
            const ancho = Math.min(248, x.measureText(texto).width + 16);
            x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect((256 - ancho) / 2, 4, ancho, 32);
            x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
            x.fillText(texto, 128, 21);
            tex.needsUpdate = true;
        };
        dibujar();
        try { document.fonts.load('24px PixelCraft').then(dibujar, () => {}); } catch (e) { /* sin fuentes */ }
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, fog: false }));
        sp.scale.set(1.6, 0.25, 1);
        sp.renderOrder = 10;
        scene.add(sp);
        return sp;
    }
    function agregarRemoto(id, m) {
        if (id === yoId) return null;
        let r = remotos.get(id);
        const skinTxt = JSON.stringify(m.skin || null);
        if (r && r.skinTxt === skinTxt) { r.nombre = m.nombre; return r; }
        if (r) scene.remove(r.modelo.g);
        const modelo = crearModelo(m.skin || { piel: [220, 180, 150], pelo: { color: [40, 30, 20], estilo: 'corto' }, ojos: [60, 40, 30], ropa: { tipo: 'polera', color: [60, 100, 200] }, pantalon: [40, 50, 90], zapatillas: 'blancas' }, 9100 + remotos.size * 37);
        modelo.g.visible = false;
        scene.add(modelo.g);
        if (!r) {
            r = { id, bufer: new Bufer(), fase: 0, previo: null, vivo: true, nombreSp: nombreSprite(m.nombre || '?') };
            r.objetivo = { id, pos: new THREE.Vector3(), get vivo() { return r.vivo && !r.bufer.vacio; } };
            remotos.set(id, r);
        }
        Object.assign(r, { nombre: m.nombre, disp: m.disp, skin: m.skin, skinTxt, modelo, anf: !!m.anf });
        return r;
    }
    function quitarRemoto(id) {
        const r = remotos.get(id);
        if (!r) return;
        scene.remove(r.modelo.g); scene.remove(r.nombreSp);
        remotos.delete(id);
        camas.delete(id);
    }
    for (const [id, m] of sala.jugadores) agregarRemoto(id, m);
    cx.alEntrar = m => {
        const r = agregarRemoto(m.id, m);
        if (r && !r.saludado) { r.saludado = true; hud.mensaje(L(`${m.nombre} entró a la sala`, `${m.nombre} joined`), 3); }
        enviarPerfil();
        ctx.alCambiarJugadores && ctx.alCambiarJugadores();
    };
    cx.alActualizar = m => agregarRemoto(m.id, m); // cambió su skin: se rehace el modelo
    cx.alSalir = (id, p) => {
        const r = remotos.get(id);
        if (r) hud.mensaje(L(`${r.nombre} salió de la sala`, `${r.nombre} left`), 3);
        quitarRemoto(id);
        // Sus monstruos y su jefe desaparecen con él
        for (const g of [...enemigos.fantasmas.values()]) if (g.dueno === id) enemigos.quitarFantasma(g.uid);
        if (jefeRed && jefeRed.dueno === id) { jefes.quitarFantasma(); jefeRed = null; }
        if (!esAnfitrion && id === cx.anfitrion) ctx.alCerrar && ctx.alCerrar('anfitrion');
        ctx.alCambiarJugadores && ctx.alCambiarJugadores();
    };
    cx.alEstado = estado => { if (estado === 'error') ctx.alCerrar && ctx.alCerrar('conexion'); };

    const remotoPorId = id => remotos.get(id) || null;

    // ---------- Posición propia (y monstruos y jefe propios en el mismo mensaje) ----------
    let ultimoTick = 0, ultimoPos = 0, ultimaPos = null;
    function enviarPosicion() {
        const t = ahora();
        if (t - ultimoTick < 1000 / HZ_POS) return;
        ultimoTick = t;
        const r = n => Math.round(n * 100) / 100;
        const m = { t: Math.round(t), x: r(jugador.pos.x), y: r(jugador.pos.y), z: r(jugador.pos.z), a: r(jugador.yaw), b: r(jugador.pitch), f: (jugador.agachado ? 1 : 0) | (vida.muerto ? 2 : 0) };
        const u = ultimaPos;
        const igual = u && Math.abs(u.x - m.x) < 0.02 && Math.abs(u.y - m.y) < 0.02 && Math.abs(u.z - m.z) < 0.02 && Math.abs(u.a - m.a) < 0.02 && Math.abs(u.b - m.b) < 0.02 && u.f === m.f;
        const mobs = mobsDelTick(t);
        if (igual && !mobs && t - ultimoPos < 1000) return;
        if (mobs) Object.assign(m, mobs);
        ultimoPos = t; ultimaPos = m;
        sala.enviar('p', m);
    }

    // ---------- Bloques ----------
    // Toda edición local (romper, poner, explosiones, cultivos, el barco del Caleuche…) pasa por
    // editarLote: se junta en el cuadro y sale en un solo mensaje
    let aplicandoRemoto = false;
    let bloquesPend = [];
    const editarOriginal = mundo.editarLote.bind(mundo);
    mundo.editarLote = (lista, inmediato) => {
        if (!aplicandoRemoto) for (const [x, y, z, id] of lista) bloquesPend.push(x, y, z, id);
        return editarOriginal(lista, inmediato);
    };
    const CRECEN = new Set([B.BROTE, B.BROTE_ABEDUL, B.BROTE_PINO, B.TIERRA_LABRADA, B.TIERRA_LABRADA_HUMEDA]);
    function aplicarBloques(l) {
        const lote = [];
        for (let i = 0; i + 3 < l.length; i += 4) {
            const x = l[i], y = l[i + 1], z = l[i + 2], id = l[i + 3];
            const k = x + ',' + y + ',' + z;
            const inf = id > 0 ? infoBloque(id) : null;
            if (!(inf && inf.contenedor) && contenedores.estados.has(k)) contenedores.olvidar(k);
            if (id === B.COFRE || id === B.BARRIL) contenedores.marcarPuesto(x, y, z);
            if (CRECEN.has(id) || etapasDe(id)) agricultura.registrar(x, y, z);
            lote.push([x, y, z, id]);
        }
        if (!lote.length) return;
        aplicandoRemoto = true;
        try { editarOriginal(lote, lote.length <= 8); } finally { aplicandoRemoto = false; }
        if (lote.length > 8) mundo.procesarRemallado(8);
    }

    // ---------- Contenedores ----------
    const enviadoCont = new Map(); // k -> JSON enviado o recibido por última vez
    let relojCont = 0;
    function enviarCont(k) {
        const s = contenedores.serializarUno(k);
        if (!s) return;
        const j = JSON.stringify(s);
        if (enviadoCont.get(k) === j) return;
        enviadoCont.set(k, j);
        sala.enviar('c', { s });
    }
    function claveDe(estado) {
        for (const [k, e] of contenedores.estados) if (e === estado) return k;
        return null;
    }
    // El anfitrión funde en los hornos: avisa el progreso (como mucho cada 0,5 s por horno)
    const relojHorno = new Map();
    if (esAnfitrion) contenedores.alCambiar = k => { const t = ahora(); if (t - (relojHorno.get(k) || 0) > 500) { relojHorno.set(k, t); enviarCont(k); } };

    // ---------- Objetos tirados ----------
    const r2 = n => Math.round(n * 100) / 100;
    entidades.api.red = {
        soltado(e) {
            sala.enviar('o', { u: e.uid, i: e.id, n: e.n, d: e.d, x: r2(e.pos.x), y: r2(e.pos.y), z: r2(e.pos.z), vx: r2(e.vel.x), vy: r2(e.vel.y), vz: r2(e.vel.z), de: e.demora });
        },
        // El anfitrión recoge directo; el invitado lo pide y espera la respuesta
        puedeTomar(e) {
            if (esAnfitrion) return !e.reservado;
            const t = ahora();
            if (!e.pedido || t - e.pedido > 1500) { e.pedido = t; sala.enviar('ot', { u: e.uid }); }
            return false;
        },
        tomado(e, resto) {
            if (!esAnfitrion) return;
            if (resto === 0) sala.enviar('ok', { u: e.uid, a: yoId });
            else sala.enviar('ok', { u: e.uid, n: resto });
        }
    };

    // ---------- Proyectiles y explosiones ----------
    proyectiles.api.red = {
        disparo(p) {
            sala.enviar('pr', { x: r2(p.pos.x), y: r2(p.pos.y), z: r2(p.pos.z), vx: r2(p.vel.x), vy: r2(p.vel.y), vz: r2(p.vel.z), k: p.tipo === 'bola' ? 1 : 0, j: p.deJugador ? 1 : 0, n: p.dano });
        }
    };

    // ---------- Monstruos ----------
    const finPend = new Set();
    let tickMobs = 0;
    enemigos.api.red = {
        jugadores: () => [...remotos.values()].map(r => r.objetivo),
        danar(id, n, causa, op = {}, aturde = 0) {
            const o = op.origen || null;
            sala.enviar('d', { a: id, n, c: causa, ox: o ? r2(o.x) : null, oz: o ? r2(o.z) : null, fz: op.fuerza ?? null, at: aturde || 0 });
        },
        mobFin(uid) { finPend.add(uid); },
        creditoMuerte(id, tipo) { sala.enviar('mk', { a: id, k: tipo }); },
        golpearMob(uid, n, origen = {}) {
            const g = enemigos.fantasmas.get(uid);
            sala.enviar('g', {
                u: uid, para: g ? g.dueno : null, n, ox: r2(origen.x ?? jugador.pos.x), oz: r2(origen.z ?? jugador.pos.z), fz: origen.fuerza ?? 0.45,
                pr: origen.proyectil ? 1 : 0, fu: origen.fuego ? 1 : 0, ax: r2(jugador.pos.x), ay: r2(jugador.pos.y), az: r2(jugador.pos.z),
                ix: g ? r2(g.pos.x) : null, iy: g ? r2(g.pos.y) : null, iz: g ? r2(g.pos.z) : null
            });
        },
        explosion(x, y, z, p, c) { sala.enviar('x', { x: r2(x), y: r2(y), z: r2(z), p, c }); }
    };

    // Distancia del punto al jugador remoto más cercano (los monstruos lejos de todos no se mandan)
    function distRemotos(x, z, y = null) {
        let dm = Infinity;
        for (const r of remotos.values()) { const u = r.bufer.ultimo; if (u) dm = Math.min(dm, Math.hypot(u.x - x, u.z - z, y == null ? 0 : u.y - y)); }
        return dm;
    }
    // Distancia al jugador más cercano (con y: en 3D, para que un monstruo en la cueva de abajo no cuente como cerca)
    function distTodos(x, z, y = null) { return Math.min(distRemotos(x, z, y), Math.hypot(jugador.pos.x - x, jugador.pos.z - z, y == null ? 0 : jugador.pos.y - y)); }

    // Monstruos y jefe propios de este tick: { l, j } o null si no hay nada que mandar
    function mobsDelTick(t) {
        const tocaLejos = tickMobs++ % 3 === 0;
        const l = [];
        for (const e of enemigos.lista) {
            if (distRemotos(e.pos.x, e.pos.z) > 72) continue;
            const cerca = distTodos(e.pos.x, e.pos.z, e.pos.y) < 10;
            const ult = e.red || null;
            if (!cerca && !tocaLejos) continue;
            const f = (e.persigue ? 1 : 0) | (e.rojo > 0 ? 2 : 0) | (e.mecha > 0 ? 4 : 0) | (e.fuego > 0 ? 8 : 0) | (e.golpeAnim > 0 ? 16 : 0);
            const x = r2(e.pos.x), y = r2(e.pos.y), z = r2(e.pos.z), w = r2(e.yaw);
            const refresco = !ult || t - ult.k >= 2000;
            const cambio = !ult || ult.x !== x || ult.y !== y || ult.z !== z || ult.w !== w || ult.f !== f;
            if (!cambio && !refresco) continue;
            const fila = [e.uid, x, y, z, w, f];
            if (refresco) fila.push(e.tipo);
            l.push(fila);
            e.red = { t, k: refresco ? t : ult.k, x, y, z, w, f };
        }
        const j = jefes.estadoRed();
        const jefeCerca = j && distRemotos(j.x, j.z) < 100;
        if (!l.length && !jefeCerca) return null;
        const m = {};
        if (l.length) m.l = l;
        if (jefeCerca) m.j = { ...j, x: r2(j.x), y: r2(j.y), z: r2(j.z), w: r2(j.w) };
        return m;
    }
    // Historial del jefe propio (para validar golpes)
    const histJefe = [];
    let jefeRed = null; // fantasma del jefe ajeno { dueno, bufer, visto }

    function enRango(hist, px, py, pz, radio, ancho = 0, ventana = VENTANA_GOLPE) {
        const desde = ahora() - ventana;
        for (const h of hist) {
            if (h.t < desde) continue;
            if (Math.hypot(h.x - px, h.z - pz) <= radio + ancho / 2 && Math.abs(h.y - py) < 4 + radio * 0.5) return true;
        }
        return false;
    }
    // ¿El golpe que llegó es creíble? Cuerpo a cuerpo: el atacante a menos del alcance del monstruo en
    // los últimos ~600 ms; flecha: el monstruo cerca del punto donde el atacante lo vio
    function golpeValido(hist, m, ancho) {
        const n = Number(m.n);
        if (!(n > 0 && n <= 24)) return false;
        // Flecha: el atacante pudo ver un monstruo lejano (a 2 Hz) con hasta ~800 ms de retraso
        if (m.pr) return m.ix != null && enRango(hist, m.ix, m.iy, m.iz, 2.5, ancho, VENTANA_GOLPE + 600);
        const r = remotoPorId(m.de);
        const puntos = [[m.ax, m.ay, m.az]];
        if (r) for (const s of r.bufer.recientes(VENTANA_GOLPE)) puntos.push([s.x, s.y, s.z]);
        return puntos.some(([x, y, z]) => x != null && enRango(hist, x, y, z, ALCANCE_GOLPE, ancho));
    }

    // ---------- Jefes ----------
    jefes.api.red = {
        golpearJefe(n, origen = {}) {
            const j = jefeRed;
            sala.enviar('gj', { para: j ? j.dueno : null, n, ox: r2(origen.x ?? jugador.pos.x), oz: r2(origen.z ?? jugador.pos.z), fz: origen.fuerza ?? 0.45, pr: origen.proyectil ? 1 : 0, ax: r2(jugador.pos.x), ay: r2(jugador.pos.y), az: r2(jugador.pos.z), ix: j && j.ult ? j.ult.x : null, iy: j && j.ult ? j.ult.y : null, iz: j && j.ult ? j.ult.z : null });
        },
        jefeVencido(tipo, c) { sala.enviar('jv', { k: tipo, x: r2(c.x), z: r2(c.z) }); },
        rayo(x, y, z) { sala.enviar('ry', { x: r2(x), y: r2(y), z: r2(z) }); }
    };

    // ---------- Hora y camas ----------
    const camas = new Map(); // id -> momento en que se acostó (lo lleva el anfitrión)
    let relojHora = 0;
    function revisarCamas() {
        if (!esAnfitrion || !camas.size) return;
        const t = ahora();
        for (const [id, c] of camas) if (t - c > 8000) camas.delete(id);
        const total = 1 + remotos.size;
        if (camas.size >= total && dia.puedeDormir) {
            camas.clear();
            sala.enviar('am', {});
            ctx.amanecerLocal && ctx.amanecerLocal();
            sala.enviar('h', { t: +dia.t.toFixed(1), d: dia.dias });
        }
    }
    // Clic en la cama: online la noche se salta solo cuando todos están acostados
    function acostarse() {
        hud.mensaje(L('Te acostaste. La noche pasa cuando todos estén en cama.', 'You lay down. The night skips once everyone is in bed.'), 4);
        if (esAnfitrion) { camas.set(yoId, ahora()); revisarCamas(); }
        else sala.enviar('z', {});
    }

    // ---------- Perfiles (inventario y misiones de cada jugador, para guardarlos con el mundo) ----------
    const perfiles = new Map(Object.entries(ctx.jugadoresGuardados || {})); // disp -> perfil
    let compartido = false, relojPerfil = 0;
    function perfilPropio() {
        const p = jugador.pos;
        return {
            nombre: cx.nombre, skin: ctx.skin(), inv: inventario.serializar(), mis: misiones.serializar(), vida: vida.serializar(),
            pos: { x: r2(p.x), y: r2(p.y), z: r2(p.z), yaw: r2(jugador.yaw), pitch: r2(jugador.pitch) }, comp: compartido ? 1 : 0, visto: Date.now()
        };
    }
    function enviarPerfil() { sala.enviar('pf', { disp: cx.disp, p: perfilPropio() }); }
    // Los jugadores para guardar con el mundo (todos menos el dueño de este guardado)
    function jugadoresParaGuardar(incluirme = false) {
        const o = {};
        for (const [d, p] of perfiles) if (d !== cx.disp) o[d] = p;
        if (incluirme) o[cx.disp] = perfilPropio();
        return o;
    }
    const conectados = () => new Set([...remotos.values()].map(r => r.disp));

    // ---------- Foto para quien entra (anfitrión) ----------
    let subiendo = Promise.resolve();
    function mandarFoto(para) {
        subiendo = subiendo.then(async () => {
            try {
                const estado = ctx.estadoActual();
                estado.jugadores = jugadoresParaGuardar(true);
                estado.idDueno = cx.disp;
                const foto = await aBase64(estado);
                const r = await sala.cliente.rpc('subir_foto', { p_codigo: cx.codigo, p_clave: cx.clave, p_foto: foto });
                if (r.error || r.data !== true) throw new Error(r.error ? r.error.message : 'rechazada');
                sala.enviar('fl', { para, kb: Math.round(foto.length / 1024) });
            } catch (e) { console.warn('no se pudo subir la foto del mundo:', e.message); }
        });
    }

    // ---------- Recibir ----------
    const manejadores = {
        p(m) {
            const r = remotoPorId(m.de);
            if (!r) return;
            r.bufer.agregar(m.t, { x: m.x, y: m.y, z: m.z, yaw: m.a, pit: m.b, f: m.f });
            r.vivo = !(m.f & 2);
            r.objetivo.pos.set(m.x, m.y, m.z);
            if (m.l || m.j) manejadores.m(m);
        },
        b(m) { aplicarBloques(m.l || []); },
        c(m) {
            if (!m.s) return;
            contenedores.cargarUno(m.s);
            enviadoCont.set(m.s[0], JSON.stringify(m.s));
            const v = ctx.ventanasBase.abierta;
            if (v && v.estado && claveDe(v.estado) === m.s[0]) ctx.ventanasBase.refrescar();
        },
        o(m) { if (!entidades.porUid(m.u)) entidades.soltar(m.i, m.n, m.d, m.x, m.y, m.z, new THREE.Vector3(m.vx, m.vy, m.vz), m.de ?? 0.5, m.u); },
        ot(m) {
            if (!esAnfitrion) return;
            const e = entidades.porUid(m.u);
            if (!e || e.reservado) return;
            e.reservado = true;
            entidades.quitar(e);
            sala.enviar('ok', { u: m.u, a: m.de, i: e.id, n: e.n, d: e.d });
        },
        ok(m) {
            const e = entidades.porUid(m.u);
            if (m.a == null) { if (e && m.n != null) e.n = m.n; return; }
            if (e) entidades.quitar(e);
            if (m.a !== yoId || m.i == null) return;
            const resto = inventario.agregar(m.i, m.n, m.d);
            sonidos.recoger();
            if (resto > 0) entidades.soltar(m.i, resto, m.d, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z, new THREE.Vector3(), 1.5);
        },
        m(m) {
            for (const f of m.l || []) {
                const [u, x, y, z, w, fl, tipo] = f;
                let g = enemigos.fantasmas.get(u);
                if (!g) { if (!tipo) continue; g = enemigos.fantasma(u, tipo); if (!g) continue; g.bufer = new Bufer(); }
                g.dueno = m.de; g.visto = ahora();
                g.bufer.agregar(m.t, { x, y, z, yaw: w, f: fl });
            }
            if (m.j) {
                if (!jefeRed || jefeRed.dueno !== m.de) jefeRed = { dueno: m.de, bufer: new Bufer() };
                jefeRed.visto = ahora();
                jefeRed.bufer.agregar(m.t, m.j);
            }
        },
        mf(m) { for (const u of m.l || []) enemigos.quitarFantasma(u); },
        g(m) {
            const e = enemigos.lista.find(x => x.uid === m.u);
            if (!e) return;
            if (!golpeValido(e.hist, m, e.ancho)) return;
            enemigos.golpear(e, Math.min(24, m.n), { x: m.ox, z: m.oz, fuerza: Math.min(1, m.fz ?? 0.45), por: m.de, proyectil: !!m.pr, fuego: !!m.fu });
        },
        gj(m) {
            if (!jefes.propio) return;
            const j = jefes.posJefe();
            if (!j || !golpeValido(histJefe, m, j.ancho + (j.chonchon ? 2 : 0))) return;
            jefes.golpeRemoto(Math.min(24, m.n), { x: m.ox, z: m.oz, fuerza: Math.min(1, m.fz ?? 0.45), por: m.de });
        },
        d(m) {
            if (m.a !== yoId) return;
            const op = { fuerza: m.fz ?? 0.42 };
            if (m.ox != null) op.origen = { x: m.ox, z: m.oz };
            const hizo = vida.danar(m.n, m.c || 'golpe', op);
            if (hizo && m.at) vida.aturdido = Math.max(vida.aturdido, m.at);
        },
        x(m) { enemigos.explotar(m.x, m.y, m.z, m.p, m.c || 'explosion', true); },
        pr(m) {
            proyectiles.disparar({ tipo: m.k ? 'bola' : 'flecha', pos: new THREE.Vector3(m.x, m.y, m.z), vel: new THREE.Vector3(m.vx, m.vy, m.vz), dano: m.n, deJugador: !!m.j, remoto: true });
        },
        mk(m) { if (m.a === yoId) misiones.alMatar(m.k); },
        jv(m) {
            jefes.quitarFantasma(); jefeRed = null;
            if (Math.hypot(jugador.pos.x - m.x, jugador.pos.z - m.z) < 90) jefes.premiar(m.k);
        },
        ry(m) {
            for (let n = 0; n < 12; n++) particulas.critico(m.x, m.y + n * 0.6, m.z);
            setTimeout(() => jefes.rayoCae(m.x, m.y, m.z), 1000);
        },
        h(m) {
            if (esAnfitrion) return;
            const dif = Math.abs(dia.t - m.t) + (dia.dias !== m.d ? 1000 : 0);
            if (dif > 2) { dia.t = m.t; dia.dias = m.d; }
        },
        z(m) { if (esAnfitrion) { camas.set(m.de, ahora()); revisarCamas(); } },
        am() { ctx.amanecerLocal && ctx.amanecerLocal(); },
        pf(m) {
            if (!m.disp || !m.p) return;
            perfiles.set(m.disp, m.p);
            ctx.alPerfil && ctx.alPerfil(m.disp, m.p);
        },
        'pf?'(m) { if (esAnfitrion) mandarFoto(m.de); },
        fl() { /* lo usa unirse() */ },
        fin() { if (!esAnfitrion) ctx.alCerrar && ctx.alCerrar('anfitrion'); },
        pc(m) {
            const p = perfiles.get(m.disp);
            if (p && m.inv) { p.inv = m.inv; ctx.alPerfil && ctx.alPerfil(m.disp, p); }
        }
    };
    function manejar(tipo, m) {
        const f = manejadores[tipo];
        if (!f) return;
        try { f(m); } catch (e) { console.warn('coop: error con el mensaje', tipo, e); }
    }
    cx.manejar = manejar;
    // Lo que llegó mientras se cargaba el mundo (bloques, cofres, objetos…) se aplica ahora
    for (const [t, m] of cx.cola.splice(0)) manejar(t, m);
    enviarPerfil();

    // ---------- Cada cuadro ----------
    function dibujarRemotos(dt) {
        const t = ahora();
        for (const r of remotos.values()) {
            const s = r.bufer.muestra(t);
            const visible = !!s && r.vivo;
            r.modelo.g.visible = visible; r.nombreSp.visible = visible;
            if (!visible) continue;
            const { a, b, k } = s;
            const x = mezclar(a.x, b.x, k), y = mezclar(a.y, b.y, k), z = mezclar(a.z, b.z, k);
            const yaw = mezclarAngulo(a.yaw, b.yaw, k), pit = mezclar(a.pit, b.pit, k);
            const agachado = !!(b.f & 1);
            const mov = r.previo ? Math.hypot(x - r.previo.x, z - r.previo.z) / Math.max(dt, 1e-3) : 0;
            r.previo = { x, z };
            r.fase += Math.min(8, mov) * dt * 2.6;
            const c = r.modelo;
            c.g.position.set(x, y - (agachado ? 0.2 : 0), z);
            c.g.rotation.y = yaw + Math.PI;
            caminar(c, r.fase, Math.min(0.8, mov * 0.18));
            c.cuello.rotation.x = Math.max(-0.8, Math.min(0.8, -pit * 0.8));
            c.cuerpo.rotation.x = agachado ? 0.35 : 0;
            ctx.iluminar(c.tinte, x, y, z);
            r.nombreSp.position.set(x, y + 2.2, z);
            const d = Math.hypot(jugador.pos.x - x, jugador.pos.z - z);
            const esc = Math.max(1, Math.min(4, d / 14));
            r.nombreSp.scale.set(1.6 * esc, 0.25 * esc, 1);
        }
    }
    function dibujarFantasmas(dt) {
        const t = ahora();
        for (const g of [...enemigos.fantasmas.values()]) {
            if (t - (g.visto || 0) > 3500) { enemigos.quitarFantasma(g.uid); continue; }
            const s = g.bufer && g.bufer.muestra(t);
            if (!s) continue;
            const { a, b, k } = s;
            enemigos.moverFantasma(g, { x: mezclar(a.x, b.x, k), y: mezclar(a.y, b.y, k), z: mezclar(a.z, b.z, k), yaw: mezclarAngulo(a.yaw, b.yaw, k), f: b.f }, dt);
        }
        if (jefeRed) {
            if (t - jefeRed.visto > 1500) { jefes.quitarFantasma(); jefeRed = null; }
            else {
                const s = jefeRed.bufer.muestra(t);
                if (s) {
                    const { a, b, k } = s;
                    const e = { ...b, x: mezclar(a.x, b.x, k), y: mezclar(a.y, b.y, k), z: mezclar(a.z, b.z, k), w: mezclarAngulo(a.w, b.w, k) };
                    jefeRed.ult = { x: r2(e.x), y: r2(e.y), z: r2(e.z) };
                    jefes.recibirFantasma(e, dt);
                }
            }
        }
    }

    function actualizar(dt) {
        if (!sala.activa) return;
        enviarPosicion();
        // Bloques del cuadro en un mensaje (los lotes grandes, como el barco, se parten)
        if (bloquesPend.length) {
            for (let i = 0; i < bloquesPend.length; i += 4 * 1500) sala.enviar('b', { l: bloquesPend.slice(i, i + 4 * 1500) });
            bloquesPend = [];
        }
        if (finPend.size) { sala.enviar('mf', { l: [...finPend] }); finPend.clear(); }
        const pj = jefes.posJefe();
        if (pj && (!histJefe.length || ahora() - histJefe[histJefe.length - 1].t >= 50)) { histJefe.push({ t: ahora(), x: pj.pos.x, y: pj.pos.y, z: pj.pos.z }); if (histJefe.length > 30) histJefe.shift(); }
        // Contenedor abierto: si cambió, se manda
        relojCont += dt;
        const v = ctx.ventanasBase.abierta;
        if (relojCont >= 0.25 && v && v.estado) { relojCont = 0; const k = claveDe(v.estado); if (k) enviarCont(k); }
        if (v && v.estado) cx.ultimoCont = claveDe(v.estado);
        else if (cx.ultimoCont) { enviarCont(cx.ultimoCont); cx.ultimoCont = null; }
        // Hora (anfitrión) y perfiles
        relojHora += dt;
        if (esAnfitrion && relojHora >= 10) { relojHora = 0; sala.enviar('h', { t: +dia.t.toFixed(1), d: dia.dias }); }
        relojPerfil += dt;
        if (relojPerfil >= 30) { relojPerfil = 0; enviarPerfil(); }
        if (esAnfitrion) revisarCamas();
        dibujarRemotos(dt);
        dibujarFantasmas(dt);
    }

    async function salir() {
        try {
            enviarPerfil();
            if (esAnfitrion) {
                sala.enviar('fin', {});
                await esperar(150);
                await sala.cliente.rpc('cerrar_sala_coop', { p_codigo: cx.codigo, p_clave: cx.clave });
            } else await esperar(150);
        } catch (e) { /* sin red */ }
        await sala.salir();
    }

    return {
        esAnfitrion, codigo: cx.codigo, perfiles, actualizar, salir, acostarse, jugadoresParaGuardar, conectados, enviarPerfil,
        get total() { return 1 + remotos.size; },
        get remotos() { return remotos; },
        get compartido() { return compartido; },
        set compartido(v) { compartido = !!v; enviarPerfil(); },
        // El inventario de un compañero ausente cambió (cofre compartido)
        cofreEditado(disp, inv) { const p = perfiles.get(disp); if (p) p.inv = inv; sala.enviar('pc', { disp, inv }); },
        anunciarSkin(skin) { sala.anunciar({ skin }); },
        estadisticas: (reiniciar = false) => sala.estadisticas(reiniciar),
        set medirBytes(v) { sala.medirBytes = v; }
    };
}
