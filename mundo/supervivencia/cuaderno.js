// =========================================================
// VENJY · Supervivencia · Cuaderno de los Tomatitos (7f-3, parte 6)
// 12 páginas sueltas escondidas por el mapa (posiciones: mundo/paginas-cuaderno.js, textos y premio:
// cuaderno-datos.js). Se recogen al pasar a menos de 1,6 bloques. La primera página trae el Cuaderno
// (objeto); clic derecho con él en la mano abre las páginas que llevas. Al juntar las 12, premio.
// Qué páginas lleva cada jugador: `inventario.cuaderno` (bits 0-11 páginas, bit 12 premio cobrado); viaja
// con el inventario, así que es por jugador y el cooperativo lo guarda sin cambios en coop.js.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { O } from './objetos.js';
import { icono } from './iconos.js';
import { PAGINAS, PREMIO, TEXTOS } from './cuaderno-datos.js';

export const MAX = PAGINAS.length;
export const BIT_PREMIO = 1 << MAX;
export const RADIO_RECOGER = 1.6;

export const tiene = (q, i) => !!(q & (1 << i));
export const cuenta = q => { let n = 0; for (let i = 0; i < MAX; i++) if (tiene(q, i)) n++; return n; };

// Recoge la página `i` para este inventario (lógica pura, sin DOM). `soltar(id, n)` recibe lo que no cupo.
// Devuelve null si ya la tenía, o { n, cuenta, completo, premio } (premio = se cobró ahora).
export function recogerPagina(inventario, i, soltar = null) {
    if (i < 0 || i >= MAX || tiene(inventario.cuaderno, i)) return null;
    inventario.cuaderno |= 1 << i;
    const dar = (id, n) => { const resto = inventario.agregar(id, n); if (resto && soltar) soltar(id, resto); };
    if (!inventario.contar(O.CUADERNO)) dar(O.CUADERNO, 1); // la primera trae el cuaderno; si lo perdiste, vuelve con la siguiente
    const n = cuenta(inventario.cuaderno);
    const completo = n === MAX;
    let premio = false;
    if (completo && !(inventario.cuaderno & BIT_PREMIO)) {
        inventario.cuaderno |= BIT_PREMIO;
        premio = true;
        dar(O.TOMATE_BIGOTE, PREMIO.tomates);
        dar(O.ESMERALDA, PREMIO.esmeraldas);
    }
    inventario.cambio();
    return { n: i + 1, cuenta: n, completo, premio };
}

export function crearCuaderno({ scene, jugador, inventario, vida, hud, entidades, terreno, dy, idioma = 'es', abrirPanel, cerrarPanel }) {
    const tx = TEXTOS[idioma] || TEXTOS.es;
    const lista = terreno.paginas || [];
    const sprites = new Map();
    let reloj = 0, t = 0;
    const material = () => new THREE.SpriteMaterial({ map: textura(), transparent: true, depthWrite: false });
    let tex = null;
    function textura() {
        if (!tex) { tex = new THREE.CanvasTexture(icono(O.PAPEL)); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; }
        return tex;
    }
    // Sprite flotando sobre el suelo; solo se crea al acercarse a 40 bloques y se quita al recogerla
    function mostrar(p) {
        const s = new THREE.Sprite(material());
        s.scale.set(0.8, 0.8, 1);
        s.position.set(p.x + 0.5, p.y + 1.6 + dy, p.z + 0.5);
        s.userData.y0 = s.position.y;
        scene.add(s);
        sprites.set(p.i, s);
    }
    function quitar(i) {
        const s = sprites.get(i);
        if (!s) return;
        scene.remove(s); s.material.dispose(); sprites.delete(i);
    }
    const soltar = (id, n) => entidades.soltar(id, n, 0, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z);

    function alRecoger(p) {
        const r = recogerPagina(inventario, p.i, soltar);
        if (!r) return;
        quitar(p.i);
        hud.mensaje(tx.encontrada(r.n, MAX, PAGINAS[p.i].t[idioma] || PAGINAS[p.i].t.es), 5);
        if (r.premio) { hud.mensaje(tx.completo, 6); hud.mensaje(tx.premio, 6); }
    }

    function abrir() {
        const el = document.createElement('section');
        el.className = 'cuaderno';
        const h = document.createElement('h1'); h.textContent = tx.titulo;
        const sub = document.createElement('p'); sub.className = 'sub'; sub.textContent = tx.sub;
        const n = cuenta(inventario.cuaderno);
        const c = document.createElement('p'); c.className = 'cuenta'; c.textContent = tx.cuenta(n, MAX);
        const hojas = document.createElement('div'); hojas.className = 'hojas';
        PAGINAS.forEach((pg, i) => {
            const hoja = document.createElement('article');
            const titulo = document.createElement('h2');
            const cuerpo = document.createElement('p');
            if (tiene(inventario.cuaderno, i)) {
                titulo.textContent = `${tx.pagina(i + 1)} · ${pg.t[idioma] || pg.t.es}`;
                cuerpo.textContent = pg.x[idioma] || pg.x.es;
            } else {
                hoja.className = 'falta';
                titulo.textContent = tx.pagina(i + 1);
                cuerpo.textContent = tx.faltante;
            }
            hoja.append(titulo, cuerpo);
            hojas.appendChild(hoja);
        });
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'boton'; b.textContent = tx.cerrar;
        b.addEventListener('click', () => cerrarPanel());
        el.append(h, sub, c, hojas, b);
        abrirPanel(el);
        return true;
    }

    return {
        total: lista.length,
        abrir,
        // Clic derecho con el cuaderno en la mano
        usar: p => (p && p.id === O.CUADERNO ? abrir() : false),
        visibles: () => sprites.size,
        actualizar(dt) {
            t += dt; reloj -= dt;
            for (const [, s] of sprites) s.position.y = s.userData.y0 + Math.sin(t * 2.2 + s.position.x) * 0.12; // sube y baja un poco
            if (reloj > 0) return;
            reloj = 0.2;
            const p = jugador.pos;
            for (const pg of lista) {
                if (tiene(inventario.cuaderno, pg.i)) { quitar(pg.i); continue; }
                const d = Math.hypot(p.x - (pg.x + 0.5), p.z - (pg.z + 0.5));
                if (d > 40) { quitar(pg.i); continue; }
                if (!sprites.has(pg.i)) mostrar(pg);
                if (!vida.muerto && d < RADIO_RECOGER && Math.abs(p.y - (pg.y + dy + 1)) < 2.5) alRecoger(pg);
            }
        }
    };
}
