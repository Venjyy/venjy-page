// =========================================================
// VENJY · Supervivencia · Cofres de compañero
// Cuando un amigo jugó en este mundo (sala online) y ahora no está, sus cosas quedan en un
// «Cofre de <nombre>» donde estuvo por última vez. El cofre guarda el id de su dispositivo y una
// copia de su skin (vienen en `jugadores` del guardado). No se borra nada: si el amigo vuelve a
// entrar a la sala, recupera su inventario y el cofre desaparece.
//  · Cofre compartido (el dueño marcó «mis cosas quedan compartidas» antes de irse): se abre como
//    un cofre normal (36 casillas, 4 de armadura y la otra mano); lo que saques sale de su perfil.
//  · Si no: escena del guardián (escena-guardian.js): tu amigo, medio translúcido, no te deja abrirlo.
// La protección se puede saltar editando el .venjy a mano; basta para un juego entre amigos.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { crearTinte, caja, texturaPixeles, crearNombre } from '../criaturas/cuerpo.js';
import { pila } from './inventario.js';
import { sonidos } from './sonidos.js';

const ALCANCE = 4.5;
const ANCHO = 0.875, ALTO_BASE = 0.625, ALTO_TAPA = 0.25;

// Madera de cofre pixelada: tablas con veta, borde oscuro y cerradura de hierro
function texturasCofre(semilla) {
    const madera = (x, y, r) => {
        if (x === 0 || x === 15 || y === 0 || y === 15) return [72, 46, 22];
        const veta = (y % 5 === 0) ? 0.78 : 1;
        const v = (0.86 + r() * 0.2) * veta;
        return [158 * v, 104 * v, 48 * v];
    };
    const frente = (x, y, r) => (x >= 7 && x <= 8 && y >= 2 && y <= 6 ? [196, 196, 204] : madera(x, y, r));
    return { madera: texturaPixeles(16, 16, semilla, madera), frente: texturaPixeles(16, 16, semilla + 1, frente) };
}

export function crearModeloCofre(semilla = 6100) {
    const tinte = crearTinte();
    const t = texturasCofre(semilla);
    const g = new THREE.Group();
    const base = caja(ANCHO, ALTO_BASE, ANCHO, tinte.caras(t.madera, { 4: t.frente }));
    base.position.y = ALTO_BASE / 2;
    g.add(base);
    // La tapa gira en la bisagra de atrás (rotation.x negativo = se abre)
    const tapa = new THREE.Group();
    tapa.position.set(0, ALTO_BASE, -ANCHO / 2);
    const lid = caja(ANCHO, ALTO_TAPA, ANCHO, tinte.caras(t.madera, { 4: t.frente }));
    lid.position.set(0, ALTO_TAPA / 2, ANCHO / 2);
    tapa.add(lid);
    g.add(tapa);
    return { g, tapa, base, tinte, ancho: ANCHO, alto: ALTO_BASE + ALTO_TAPA };
}

const tieneCosas = inv => !!inv && [...(inv.c || []), ...(inv.a || []), inv.m].some(Boolean);
const s = p => (p ? [p.id, p.n, p.d] : 0);
const l = v => (v ? pila(v[0], v[1], v[2] || 0) : null);

export function crearCofresCompaneros(ctx) {
    const { scene, mundo, jugador, camara, ventanas, hud, rayoCaja, iluminar } = ctx;
    let idioma = ctx.idioma || 'es';
    const cofres = new Map(); // disp -> { disp, perfil, m, nombre, x, y, z, yaw, colocado }
    let abierto = null, relojSync = 0;
    const dir = new THREE.Vector3();

    function texto(perfil) { return idioma === 'en' ? `${perfil.nombre || '?'}'s chest` : `Cofre de ${perfil.nombre || '?'}`; }

    function crearCofre(disp, perfil) {
        const m = crearModeloCofre(6100 + cofres.size * 7);
        m.g.visible = false;
        scene.add(m.g);
        const c = { disp, perfil, m, nombre: crearNombre(scene, texto(perfil)), colocado: false, yaw: ((perfil.pos && perfil.pos.yaw) || 0) + Math.PI };
        cofres.set(disp, c);
        return c;
    }
    function quitar(disp) {
        const c = cofres.get(disp);
        if (!c) return;
        scene.remove(c.m.g); scene.remove(c.nombre.sp);
        cofres.delete(disp);
    }
    // Apoya el cofre en el suelo bajo la última posición del dueño (cuando el chunk está cargado)
    function colocar(c) {
        const p = c.perfil.pos;
        if (!p) return;
        const bx = Math.floor(p.x), bz = Math.floor(p.z);
        let y = Math.floor(p.y);
        if (mundo.bloque(bx, y, bz) === -1) return;
        while (y > 1 && mundo.bloque(bx, y - 1, bz) <= 0) y--;
        while (y < 126 && mundo.bloque(bx, y, bz) > 0) y++;
        c.x = bx + 0.5; c.y = y; c.z = bz + 0.5;
        c.m.g.position.set(c.x, c.y, c.z);
        c.m.g.rotation.y = c.yaw;
        c.m.g.visible = true;
        c.colocado = true;
    }

    // Reparte cofres según quién está ausente
    function sincronizar() {
        const todos = ctx.jugadores();
        const presentes = ctx.conectados();
        for (const disp of [...cofres.keys()]) {
            const p = todos[disp];
            if (!p || presentes.has(disp) || !tieneCosas(p.inv)) quitar(disp);
        }
        for (const [disp, p] of Object.entries(todos)) {
            if (disp === ctx.miDisp || presentes.has(disp) || !tieneCosas(p.inv)) continue;
            const c = cofres.get(disp) || crearCofre(disp, p);
            c.perfil = p;
        }
    }

    // Ventana del cofre compartido: las casillas son el inventario guardado del amigo
    function abrirCompartido(c) {
        const inv = c.perfil.inv || {};
        const casillas = [...(inv.c || []).map(l), ...new Array(36).fill(null)].slice(0, 36)
            .concat([...(inv.a || []).map(l), ...new Array(4).fill(null)].slice(0, 4), [l(inv.m)]);
        const estado = { tipo: 'cofre', casillas };
        abierto = { c, estado, ultimo: JSON.stringify(casillas.map(s)) };
        ventanas.abrir('cofre', { estado, titulo: texto(c.perfil) });
        sonidos.puerta(true);
    }
    function guardarCompartido() {
        if (!abierto) return;
        const cs = abierto.estado.casillas;
        const j = JSON.stringify(cs.map(s));
        if (j === abierto.ultimo) return;
        abierto.ultimo = j;
        const inv = abierto.c.perfil.inv || {};
        abierto.c.perfil.inv = { c: cs.slice(0, 36).map(s), a: cs.slice(36, 40).map(s), m: s(cs[40]), e: inv.e || 0 };
        ctx.alEditar && ctx.alEditar(abierto.c.disp, abierto.c.perfil.inv);
    }

    function abrir(c) {
        const compartido = !!c.perfil.comp;
        const escena = ctx.escena && ctx.escena();
        if (escena && escena.iniciar({ ...c, g: c.m.g, tapa: c.m.tapa, base: c.m.base, compartido, alTerminar: compartido ? () => abrirCompartido(c) : null })) return true;
        if (compartido) abrirCompartido(c);
        else hud.mensaje(idioma === 'en' ? `${c.perfil.nombre} left this locked.` : `${c.perfil.nombre} lo dejó cerrado.`, 3);
        return true;
    }

    // Clic derecho: ¿apunta a un cofre de compañero?
    function interactuar() {
        camara.getWorldDirection(dir);
        const o = camara.position;
        let mejor = null, mejorT = ALCANCE;
        for (const c of cofres.values()) {
            if (!c.colocado) continue;
            const t = rayoCaja(o.x, o.y, o.z, dir.x, dir.y, dir.z, c.x, c.y, c.z, ANCHO, ANCHO + 0.1);
            if (t >= 0 && t < mejorT) { mejorT = t; mejor = c; }
        }
        return mejor ? abrir(mejor) : false;
    }

    let relojSinc = 0;
    function actualizar(dt) {
        relojSinc -= dt;
        if (relojSinc <= 0) { relojSinc = 1; sincronizar(); }
        for (const c of cofres.values()) {
            if (!c.colocado) colocar(c);
            if (!c.colocado) continue;
            iluminar(c.m.tinte, c.x, c.y, c.z);
            c.nombre.actualizar(dt, camara, mundo, true, c.x, c.y + 1.35, c.z, c.x, c.y + 0.5, c.z);
        }
        if (abierto) {
            relojSync += dt;
            if (relojSync >= 0.25) { relojSync = 0; guardarCompartido(); }
            const v = ctx.ventanasBase.abierta;
            if (!v || v.estado !== abierto.estado) { guardarCompartido(); abierto = null; }
        }
    }

    return {
        cofres, actualizar, interactuar, sincronizar,
        setIdioma(v) { idioma = v; },
        // Depuración: el primer cofre (o el de ese dispositivo)
        cofre(disp) { return disp ? cofres.get(disp) : cofres.values().next().value || null; },
        abrir(disp) { const c = disp ? cofres.get(disp) : cofres.values().next().value; return c ? abrir(c) : false; }
    };
}
