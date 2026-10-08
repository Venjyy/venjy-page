// =========================================================
// VENJY · Supervivencia · Inventario
// Datos puros (sin DOM): 36 casillas (0-8 = barra rápida), 4 de armadura y la mano secundaria.
// Una pila es { id, n, d } (d = desgaste acumulado de herramientas y armaduras).
// =========================================================
import { info, apilaDe } from './objetos.js';

export const pila = (id, n = 1, d = 0) => ({ id, n, d });
const durabilidadDe = id => (info(id) && info(id).durabilidad) || 0;
const iguales = (a, b) => a && b && a.id === b.id && !durabilidadDe(a.id);

export class Inventario {
    constructor() {
        this.casillas = new Array(36).fill(null);
        this.armadura = new Array(4).fill(null);
        this.mano2 = null;
        this.elegida = 0;
        this.alCambiar = null;
    }

    cambio() { this.alCambiar && this.alCambiar(); }

    // Agrega n del id: primero completa pilas existentes (barra rápida primero), luego casillas vacías.
    // Devuelve lo que no cupo.
    agregar(id, n = 1, d = 0) {
        const max = apilaDe(id);
        if (max > 1 && !durabilidadDe(id)) {
            for (let i = 0; i < 36 && n > 0; i++) {
                const p = this.casillas[i];
                if (p && p.id === id && p.n < max) { const k = Math.min(n, max - p.n); p.n += k; n -= k; }
            }
            if (this.mano2 && this.mano2.id === id && this.mano2.n < max) { const k = Math.min(n, max - this.mano2.n); this.mano2.n += k; n -= k; }
        }
        for (let i = 0; i < 36 && n > 0; i++) {
            if (!this.casillas[i]) { const k = Math.min(n, max); this.casillas[i] = pila(id, k, d); n -= k; }
        }
        this.cambio();
        return n;
    }

    cabe(id, n = 1) {
        const max = apilaDe(id);
        let libre = 0;
        for (const p of this.casillas) {
            if (!p) libre += max;
            else if (p.id === id && !durabilidadDe(id)) libre += max - p.n;
            if (libre >= n) return true;
        }
        return libre >= n;
    }

    contar(id) {
        let n = 0;
        for (const p of this.casillas) if (p && p.id === id) n += p.n;
        if (this.mano2 && this.mano2.id === id) n += this.mano2.n;
        return n;
    }

    // Quita n del id (de cualquier casilla). Devuelve false si no había suficiente (y no quita nada).
    quitar(id, n = 1) {
        if (this.contar(id) < n) return false;
        for (let i = 35; i >= 0 && n > 0; i--) {
            const p = this.casillas[i];
            if (p && p.id === id) { const k = Math.min(n, p.n); p.n -= k; n -= k; if (!p.n) this.casillas[i] = null; }
        }
        if (n > 0 && this.mano2 && this.mano2.id === id) { this.mano2.n -= n; if (this.mano2.n <= 0) this.mano2 = null; }
        this.cambio();
        return true;
    }

    enMano() { return this.casillas[this.elegida]; }
    idEnMano() { const p = this.casillas[this.elegida]; return p ? p.id : 0; }

    // Gasta n de la pila en la mano (comer, poner un bloque…)
    gastarMano(n = 1) {
        const p = this.casillas[this.elegida];
        if (!p) return;
        p.n -= n;
        if (p.n <= 0) this.casillas[this.elegida] = null;
        this.cambio();
    }

    // Reemplaza la pila en la mano (cubo lleno, etc.)
    ponerEnMano(p) { this.casillas[this.elegida] = p; this.cambio(); }

    // Desgasta la herramienta en la mano. Devuelve true si se rompió.
    desgastarMano(cantidad = 1) {
        const p = this.casillas[this.elegida];
        if (!p) return false;
        const max = durabilidadDe(p.id);
        if (!max) return false;
        p.d += cantidad;
        let roto = false;
        if (p.d >= max) { this.casillas[this.elegida] = null; roto = true; }
        this.cambio();
        return roto;
    }

    // Desgasta todas las piezas de armadura (al recibir daño). Devuelve las que se rompieron.
    desgastarArmadura(cantidad = 1) {
        const rotas = [];
        this.armadura.forEach((p, i) => {
            if (!p) return;
            p.d += cantidad;
            if (p.d >= durabilidadDe(p.id)) { rotas.push(p.id); this.armadura[i] = null; }
        });
        if (rotas.length || cantidad) this.cambio();
        return rotas;
    }

    defensa() {
        let d = 0;
        for (const p of this.armadura) { const i = p && info(p.id); if (i && i.armadura) d += i.armadura.def; }
        return d;
    }

    // Todo lo que lleva (para soltarlo al morir)
    vaciar() {
        const todo = [];
        for (let i = 0; i < 36; i++) if (this.casillas[i]) { todo.push(this.casillas[i]); this.casillas[i] = null; }
        for (let i = 0; i < 4; i++) if (this.armadura[i]) { todo.push(this.armadura[i]); this.armadura[i] = null; }
        if (this.mano2) { todo.push(this.mano2); this.mano2 = null; }
        this.cambio();
        return todo;
    }

    serializar() {
        const s = p => (p ? [p.id, p.n, p.d] : 0);
        return { c: this.casillas.map(s), a: this.armadura.map(s), m: s(this.mano2), e: this.elegida };
    }

    cargar(o) {
        const l = v => (v ? pila(v[0], v[1], v[2] || 0) : null);
        if (!o) return;
        this.casillas = (o.c || []).map(l).concat(new Array(36).fill(null)).slice(0, 36);
        this.armadura = (o.a || []).map(l).concat(new Array(4).fill(null)).slice(0, 4);
        this.mano2 = l(o.m);
        this.elegida = o.e || 0;
        this.cambio();
    }
}

// ---------------------------------------------------------
// Clic en una casilla, como en Minecraft. Devuelve [casilla, cursor] nuevos.
//  · izquierdo: toma, deja, junta o intercambia
//  · derecho: con cursor vacío toma la mitad; con cursor deja uno
// `acepta(p)` decide si la casilla admite esa pila (armadura, resultado…)
// ---------------------------------------------------------
export function clicCasilla(casilla, cursor, boton, acepta = () => true) {
    if (boton === 0) {
        if (!cursor) return [null, casilla];
        if (!acepta(cursor)) return [casilla, cursor];
        if (!casilla) return [cursor, null];
        if (iguales(casilla, cursor)) {
            const max = apilaDe(casilla.id), k = Math.min(cursor.n, max - casilla.n);
            casilla.n += k; cursor.n -= k;
            return [casilla, cursor.n ? cursor : null];
        }
        return [cursor, casilla];
    }
    // derecho
    if (!cursor) {
        if (!casilla) return [null, null];
        const mitad = Math.ceil(casilla.n / 2);
        const tomado = pila(casilla.id, mitad, casilla.d);
        casilla.n -= mitad;
        return [casilla.n ? casilla : null, tomado];
    }
    if (!acepta(cursor)) return [casilla, cursor];
    if (!casilla) { const una = pila(cursor.id, 1, cursor.d); cursor.n--; return [una, cursor.n ? cursor : null]; }
    if (iguales(casilla, cursor) && casilla.n < apilaDe(casilla.id)) { casilla.n++; cursor.n--; return [casilla, cursor.n ? cursor : null]; }
    return [cursor, casilla];
}
