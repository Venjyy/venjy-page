// =========================================================
// VENJY · Supervivencia · Ventanas de inventario
// Inventario (E) con rejilla 2×2 y armadura, mesa de crafteo 3×3, horno y cofre.
// Como Minecraft: clic izquierdo toma/deja, derecho divide o deja uno, Shift+clic manda al
// otro lado, 1-9 sobre una casilla la cambia con la barra rápida, clic fuera suelta.
// En pantallas táctiles: tocar = clic izquierdo, mantener = clic derecho.
// Libro de recetas: lista lo que se puede fabricar y llena la rejilla con un toque.
// =========================================================
import { icono } from './iconos.js';
import { info, nombreDe, apilaDe, combustibleDe } from './objetos.js';
import { buscarReceta, RECETAS, ingredientes, anchoDe, FUNDICION } from './recetas.js';
import { clicCasilla, pila } from './inventario.js';
import { sonidos } from './sonidos.js';

const TXT = {
    es: { inventario: 'Inventario', mesa: 'Mesa de crafteo', horno: 'Horno', cofre: 'Cofre', barril: 'Barril', crafteo: 'Fabricación', recetas: 'Recetas', nada: 'Nada que fabricar aún', cerrar: 'Cerrar', todas: 'Ver todas', disponibles: 'Disponibles' },
    en: { inventario: 'Inventory', mesa: 'Crafting Table', horno: 'Furnace', cofre: 'Chest', barril: 'Barrel', crafteo: 'Crafting', recetas: 'Recipes', nada: 'Nothing to craft yet', cerrar: 'Close', todas: 'Show all', disponibles: 'Craftable' }
};

const esTactil = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;

export function crearVentanas({ inventario, contenedores, idioma: idiomaIni = 'es', soltar, alCerrar, alFabricar }) {
    let idioma = idiomaIni;
    const t = () => TXT[idioma] || TXT.es;
    const raiz = document.getElementById('ventana');
    let cursor = null;          // pila tomada con el puntero
    let abierta = null;         // { tipo, casillas: [...], rejilla, ancho, contenedor, ... }
    const cursorEl = document.createElement('canvas');
    cursorEl.width = cursorEl.height = 32;
    cursorEl.className = 'cursor-pila';
    const cursorN = document.createElement('span');
    cursorN.className = 'cursor-cantidad';
    const tip = document.createElement('div');
    tip.className = 'tip-objeto';
    tip.hidden = true;
    document.body.append(cursorEl, cursorN, tip);
    cursorEl.hidden = cursorN.hidden = true;
    let px = 0, py = 0, hover = null;

    document.addEventListener('pointermove', e => {
        px = e.clientX; py = e.clientY;
        if (!abierta) return;
        moverCursor();
        if (!tip.hidden) { tip.style.left = (px + 14) + 'px'; tip.style.top = (py - 10) + 'px'; }
    });

    function moverCursor() {
        cursorEl.style.left = (px - 16) + 'px'; cursorEl.style.top = (py - 16) + 'px';
        cursorN.style.left = (px + 2) + 'px'; cursorN.style.top = (py + 2) + 'px';
    }

    function pintarCursor() {
        cursorEl.hidden = !cursor;
        cursorN.hidden = !cursor || cursor.n <= 1;
        if (!cursor) return;
        const ctx = cursorEl.getContext('2d');
        ctx.clearRect(0, 0, 32, 32);
        ctx.drawImage(icono(cursor.id), 0, 0);
        cursorN.textContent = cursor.n > 1 ? cursor.n : '';
        moverCursor();
    }

    // ---------------------------------------------------------
    // Casillas: cada una sabe leer y escribir su pila
    // ---------------------------------------------------------
    function crearCasilla(def) {
        const el = document.createElement('div');
        el.className = 'casilla' + (def.clase ? ' ' + def.clase : '');
        const c = document.createElement('canvas');
        c.width = c.height = 32;
        const n = document.createElement('span');
        n.className = 'cantidad';
        const d = document.createElement('i');
        d.className = 'desgaste';
        d.hidden = true;
        el.append(c, n, d);
        if (def.fondo) el.dataset.fondo = def.fondo;
        const cas = { ...def, el, c, n, d, firma: null };
        el.addEventListener('pointerdown', e => pulsar(e, cas));
        el.addEventListener('contextmenu', e => e.preventDefault());
        el.addEventListener('pointerenter', () => { hover = cas; mostrarTip(cas); });
        el.addEventListener('pointerleave', () => { if (hover === cas) { hover = null; tip.hidden = true; } });
        return cas;
    }

    function mostrarTip(cas) {
        const p = cas.get();
        if (!p || esTactil()) { tip.hidden = true; return; }
        const i = info(p.id);
        let texto = nombreDe(p.id, idioma);
        if (i && i.durabilidad) texto += `  ${i.durabilidad - p.d}/${i.durabilidad}`;
        tip.textContent = texto;
        tip.hidden = false;
        tip.style.left = (px + 14) + 'px'; tip.style.top = (py - 10) + 'px';
    }

    function pintarCasilla(cas) {
        const p = cas.get();
        const f = p ? p.id + ':' + p.n + ':' + p.d : '';
        if (f === cas.firma) return;
        cas.firma = f;
        const ctx = cas.c.getContext('2d');
        ctx.clearRect(0, 0, 32, 32);
        if (p) ctx.drawImage(icono(p.id), 0, 0);
        cas.el.classList.toggle('vacia', !p);
        cas.n.textContent = p && p.n > 1 ? p.n : '';
        const max = p && info(p.id) && info(p.id).durabilidad;
        if (max && p.d > 0) {
            const k = Math.max(0, 1 - p.d / max);
            cas.d.hidden = false;
            cas.d.style.setProperty('--k', k.toFixed(3));
            cas.d.style.setProperty('--color', `hsl(${Math.round(k * 120)} 90% 45%)`);
        } else cas.d.hidden = true;
    }

    // Toque largo = clic derecho en el celular
    let toqueLargo = 0, toqueConsumido = false;
    function pulsar(e, cas) {
        e.preventDefault();
        e.stopPropagation();
        if (e.pointerType === 'touch') {
            toqueConsumido = false;
            clearTimeout(toqueLargo);
            const el = cas.el;
            toqueLargo = setTimeout(() => { toqueConsumido = true; accion(cas, 1, false); }, 380);
            const fin = () => { clearTimeout(toqueLargo); el.removeEventListener('pointerup', fin); el.removeEventListener('pointercancel', fin); if (!toqueConsumido) accion(cas, 0, false); };
            el.addEventListener('pointerup', fin);
            el.addEventListener('pointercancel', fin);
            return;
        }
        accion(cas, e.button === 2 ? 1 : 0, e.shiftKey);
    }

    function accion(cas, boton, shift) {
        if (cas.resultado) return tomarResultado(cas, shift);
        if (shift) { moverRapido(cas); refrescar(); return; }
        const actual = cas.get();
        if (cas.soloSacar) {
            if (!actual) return;
            if (!cursor) { cursor = actual; cas.set(null); }
            else if (cursor.id === actual.id && cursor.n + actual.n <= apilaDe(cursor.id)) { cursor.n += actual.n; cas.set(null); }
        } else {
            const [nueva, nuevoCursor] = clicCasilla(actual ? { ...actual } : null, cursor ? { ...cursor } : null, boton, p => !cas.acepta || cas.acepta(p));
            cas.set(nueva); cursor = nuevoCursor;
        }
        sonidos.clic();
        refrescar();
    }

    // Shift+clic: del contenedor al inventario y viceversa; en el inventario, entre barra y mochila
    function moverRapido(cas) {
        const p = cas.get();
        if (!p) return;
        const destinos = cas.grupo === 'jugador'
            ? (abierta.casillas.filter(c => c.grupo === 'contenedor' && (!c.acepta || c.acepta(p))).length
                ? abierta.casillas.filter(c => c.grupo === 'contenedor' && (!c.acepta || c.acepta(p)))
                : abierta.casillas.filter(c => c.grupo === 'jugador' && (cas.indice < 9 ? c.indice >= 9 : c.indice < 9)))
            : abierta.casillas.filter(c => c.grupo === 'jugador').sort((a, b) => (a.indice < 9 ? 1 : 0) - (b.indice < 9 ? 1 : 0));
        // armaduras: van a su casilla
        const ia = info(p.id);
        if (cas.grupo === 'jugador' && ia && ia.armadura && abierta.tipo === 'inventario') {
            const ar = abierta.casillas.find(c => c.armadura === ia.armadura.ranura);
            if (ar && !ar.get()) { ar.set(p); cas.set(null); return; }
        }
        let resto = { ...p };
        const max = apilaDe(p.id);
        for (const c of destinos) {
            if (c === cas || c.soloSacar || c.resultado) continue;
            const q = c.get();
            if (q && q.id === resto.id && !info(q.id)?.durabilidad && q.n < max) {
                const k = Math.min(max - q.n, resto.n);
                c.set({ ...q, n: q.n + k }); resto.n -= k;
                if (!resto.n) break;
            }
        }
        if (resto.n) for (const c of destinos) {
            if (c === cas || c.soloSacar || c.resultado || c.get()) continue;
            c.set(resto); resto = { ...resto, n: 0 }; break;
        }
        cas.set(resto.n ? resto : null);
    }

    // ---------------------------------------------------------
    // Crafteo
    // ---------------------------------------------------------
    function recetaActual() {
        if (!abierta || !abierta.rejilla) return null;
        const ids = abierta.rejilla.map(p => (p ? p.id : 0));
        return buscarReceta(ids, abierta.ancho);
    }

    function consumirRejilla() {
        abierta.rejilla.forEach((p, i) => {
            if (!p) return;
            p.n--;
            if (!p.n) abierta.rejilla[i] = null;
        });
    }

    function tomarResultado(cas, shift) {
        const rec = recetaActual();
        if (!rec) return;
        const [id, n] = rec.da;
        if (shift) {
            // fabrica todo lo que se pueda directo al inventario
            let veces = 0;
            while (veces < 64) {
                const r = recetaActual();
                if (!r || r.da[0] !== id || !inventario.cabe(id, n)) break;
                inventario.agregar(id, n);
                consumirRejilla();
                veces++;
                alFabricar && alFabricar(id, n);
            }
        } else {
            if (cursor && (cursor.id !== id || cursor.n + n > apilaDe(id) || info(id)?.durabilidad)) return;
            cursor = cursor ? { ...cursor, n: cursor.n + n } : pila(id, n);
            consumirRejilla();
            alFabricar && alFabricar(id, n);
        }
        sonidos.clic();
        refrescar();
    }

    // Libro de recetas: ¿se puede fabricar con lo que hay (inventario + rejilla)?
    function disponibles() {
        const cuenta = new Map();
        const sumar = p => { if (p) cuenta.set(p.id, (cuenta.get(p.id) || 0) + p.n); };
        inventario.casillas.forEach(sumar);
        if (abierta.rejilla) abierta.rejilla.forEach(sumar);
        return RECETAS.filter(rec => {
            if (anchoDe(rec) > abierta.ancho) return false;
            const usado = new Map();
            for (const g of ingredientes(rec)) {
                let falta = g.n;
                for (const id of [].concat(g.pedido)) {
                    const hay = (cuenta.get(id) || 0) - (usado.get(id) || 0);
                    const k = Math.min(hay, falta);
                    if (k > 0) { usado.set(id, (usado.get(id) || 0) + k); falta -= k; }
                    if (!falta) break;
                }
                if (falta) return false;
            }
            return true;
        });
    }

    function devolverRejilla() {
        abierta.rejilla.forEach((p, i) => {
            if (!p) return;
            const resto = inventario.agregar(p.id, p.n, p.d);
            if (resto) soltar(p.id, resto, p.d);
            abierta.rejilla[i] = null;
        });
    }

    // Pone los ingredientes de una receta en la rejilla (tomándolos del inventario)
    function llenarCon(rec) {
        devolverRejilla();
        const tomar = pedido => {
            for (const id of [].concat(pedido)) if (inventario.contar(id) > 0) { inventario.quitar(id, 1); return pila(id, 1); }
            return null;
        };
        const A = abierta.ancho;
        if (rec.forma) {
            rec.forma.forEach((fila, y) => {
                for (let x = 0; x < fila.length; x++) if (fila[x] !== ' ') abierta.rejilla[y * A + x] = tomar(rec.clave[fila[x]]);
            });
        } else rec.sin.forEach((pedido, i) => { abierta.rejilla[i] = tomar(pedido); });
        refrescar();
    }

    // ---------------------------------------------------------
    // Armado de las ventanas
    // ---------------------------------------------------------
    function casillasJugador() {
        const lista = [];
        for (let i = 9; i < 36; i++) lista.push(crearCasilla({ grupo: 'jugador', indice: i, get: () => inventario.casillas[i], set: p => { inventario.casillas[i] = p; inventario.cambio(); } }));
        for (let i = 0; i < 9; i++) lista.push(crearCasilla({ grupo: 'jugador', indice: i, clase: 'rapida', get: () => inventario.casillas[i], set: p => { inventario.casillas[i] = p; inventario.cambio(); } }));
        return lista;
    }

    function rejillaHTML(casillas, columnas, clase = '') {
        const g = document.createElement('div');
        g.className = 'rejilla ' + clase;
        g.style.setProperty('--columnas', columnas);
        casillas.forEach(c => g.appendChild(c.el));
        return g;
    }

    function titulo(texto) { const h = document.createElement('h2'); h.textContent = texto; return h; }

    function seccionCrafteo(ancho) {
        abierta.rejilla = new Array(ancho * ancho).fill(null);
        abierta.ancho = ancho;
        const cas = abierta.rejilla.map((_, i) => crearCasilla({ grupo: 'rejilla', get: () => abierta.rejilla[i], set: p => { abierta.rejilla[i] = p; } }));
        const res = crearCasilla({ grupo: 'resultado', resultado: true, clase: 'grande', get: () => { const r = recetaActual(); return r ? pila(r.da[0], r.da[1]) : null; }, set: () => {} });
        const cont = document.createElement('div');
        cont.className = 'crafteo';
        const flecha = document.createElement('div');
        flecha.className = 'flecha-ui';
        cont.append(rejillaHTML(cas, ancho), flecha, res.el);
        abierta.casillas.push(...cas, res);
        return cont;
    }

    function libroRecetas() {
        const libro = document.createElement('div');
        libro.className = 'libro-recetas';
        const h = titulo(t().recetas);
        const lista = document.createElement('div');
        lista.className = 'lista-recetas';
        libro.append(h, lista);
        abierta.libro = { lista, firma: '' };
        return libro;
    }

    function pintarLibro() {
        const l = abierta.libro;
        if (!l) return;
        const recs = disponibles();
        const firma = recs.map(r => RECETAS.indexOf(r)).join(',');
        if (firma === l.firma) return;
        l.firma = firma;
        l.lista.textContent = '';
        if (!recs.length) { const p = document.createElement('p'); p.className = 'vacio'; p.textContent = t().nada; l.lista.appendChild(p); return; }
        const vistos = new Set();
        for (const rec of recs) {
            if (vistos.has(rec.da[0])) continue;
            vistos.add(rec.da[0]);
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'receta';
            b.title = nombreDe(rec.da[0], idioma);
            b.setAttribute('aria-label', b.title);
            const c = document.createElement('canvas');
            c.width = c.height = 32;
            c.getContext('2d').drawImage(icono(rec.da[0]), 0, 0);
            b.appendChild(c);
            if (rec.da[1] > 1) { const n = document.createElement('span'); n.textContent = rec.da[1]; b.appendChild(n); }
            b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); llenarCon(rec); });
            l.lista.appendChild(b);
        }
    }

    function abrir(tipo, extra = {}) {
        if (abierta) cerrar();
        abierta = { tipo, casillas: [], ...extra };
        raiz.textContent = '';
        const panel = document.createElement('div');
        panel.className = 'ventana-panel tipo-' + tipo;
        panel.addEventListener('pointerdown', e => e.stopPropagation());
        const cerrarB = document.createElement('button');
        cerrarB.type = 'button';
        cerrarB.className = 'cerrar-ventana';
        cerrarB.setAttribute('aria-label', t().cerrar);
        cerrarB.title = t().cerrar; // la X la dibuja el CSS (::before), sin texto
        cerrarB.addEventListener('click', () => cerrar(true));
        panel.appendChild(cerrarB);

        const arriba = document.createElement('div');
        arriba.className = 'ventana-arriba';
        if (tipo === 'inventario') {
            const armadura = [0, 1, 2, 3].map(r => crearCasilla({
                grupo: 'armadura', armadura: r, fondo: ['casco', 'peto', 'grebas', 'botas'][r],
                get: () => inventario.armadura[r], set: p => { inventario.armadura[r] = p; inventario.cambio(); },
                acepta: p => { const i = info(p.id); return !!(i && i.armadura && i.armadura.ranura === r) && p.n === 1; }
            }));
            const mano2 = crearCasilla({ grupo: 'mano2', fondo: 'escudo', get: () => inventario.mano2, set: p => { inventario.mano2 = p; inventario.cambio(); } });
            abierta.casillas.push(...armadura, mano2);
            const col = rejillaHTML(armadura, 1, 'armadura');
            const m2 = rejillaHTML([mano2], 1, 'mano2');
            const craft = document.createElement('div');
            craft.className = 'bloque-crafteo';
            craft.append(titulo(t().crafteo), seccionCrafteo(2));
            arriba.append(col, m2, craft);
        } else if (tipo === 'mesa') {
            const craft = document.createElement('div');
            craft.className = 'bloque-crafteo';
            craft.append(titulo(t().mesa), seccionCrafteo(3));
            arriba.append(craft);
        } else if (tipo === 'horno') {
            const e = extra.estado;
            const entrada = crearCasilla({ grupo: 'contenedor', get: () => e.entrada, set: p => { e.entrada = p; }, acepta: p => FUNDICION.has(p.id) });
            const comb = crearCasilla({ grupo: 'contenedor', get: () => e.combustible, set: p => { e.combustible = p; }, acepta: p => combustibleDe(p.id) > 0 });
            const salida = crearCasilla({ grupo: 'contenedor', clase: 'grande', soloSacar: true, get: () => e.salida, set: p => { e.salida = p; } });
            abierta.casillas.push(entrada, comb, salida);
            const h = document.createElement('div');
            h.className = 'horno-ui';
            const llama = document.createElement('div'); llama.className = 'llama-ui';
            const flecha = document.createElement('div'); flecha.className = 'flecha-ui progreso';
            const izq = document.createElement('div'); izq.className = 'horno-izq';
            izq.append(entrada.el, llama, comb.el);
            h.append(izq, flecha, salida.el);
            abierta.horno = { llama, flecha };
            const bloque = document.createElement('div');
            bloque.className = 'bloque-crafteo';
            bloque.append(titulo(t().horno), h);
            arriba.append(bloque);
        } else if (tipo === 'cofre') {
            const e = extra.estado;
            const cas = e.casillas.map((_, i) => crearCasilla({ grupo: 'contenedor', get: () => e.casillas[i], set: p => { e.casillas[i] = p; } }));
            abierta.casillas.push(...cas);
            const bloque = document.createElement('div');
            bloque.className = 'bloque-cofre';
            bloque.append(titulo(extra.titulo || (extra.barril ? t().barril : t().cofre)), rejillaHTML(cas, 9));
            arriba.append(bloque);
        }
        panel.appendChild(arriba);

        const jug = casillasJugador();
        abierta.casillas.push(...jug);
        const abajo = document.createElement('div');
        abajo.className = 'ventana-abajo';
        abajo.append(titulo(t().inventario), rejillaHTML(jug.slice(0, 27), 9, 'mochila'), rejillaHTML(jug.slice(27), 9, 'barra'));
        panel.appendChild(abajo);

        const cuerpo = document.createElement('div');
        cuerpo.className = 'ventana-cuerpo';
        cuerpo.appendChild(panel);
        if (tipo === 'inventario' || tipo === 'mesa') cuerpo.appendChild(libroRecetas());
        raiz.appendChild(cuerpo);
        raiz.hidden = false;
        refrescar();
    }

    // Clic fuera del panel: suelta lo que hay en el cursor
    raiz.addEventListener('pointerdown', e => {
        if (!abierta || !cursor) return;
        if (e.target.closest('.ventana-panel, .libro-recetas')) return;
        const n = e.button === 2 ? 1 : cursor.n;
        soltar(cursor.id, n, cursor.d);
        cursor.n -= n;
        if (!cursor.n) cursor = null;
        refrescar();
    });
    raiz.addEventListener('contextmenu', e => e.preventDefault());

    // 1-9 sobre una casilla: la cambia con la barra rápida
    document.addEventListener('keydown', e => {
        if (!abierta) return;
        const m = /^Digit([1-9])$/.exec(e.code);
        if (m && hover && !hover.resultado && !hover.soloSacar) {
            const i = Number(m[1]) - 1;
            const a = hover.get(), b = inventario.casillas[i];
            if (b && hover.acepta && !hover.acepta(b)) return;
            hover.set(b); inventario.casillas[i] = a; inventario.cambio();
            refrescar();
        }
    });

    function refrescar() {
        if (!abierta) return;
        for (const c of abierta.casillas) pintarCasilla(c);
        pintarCursor();
        pintarLibro();
        if (hover) mostrarTip(hover);
    }

    function cerrar(volver = false) {
        if (!abierta) return;
        if (abierta.rejilla) devolverRejilla();
        if (cursor) {
            const resto = inventario.agregar(cursor.id, cursor.n, cursor.d);
            if (resto) soltar(cursor.id, resto, cursor.d);
            cursor = null;
        }
        abierta = null;
        hover = null;
        tip.hidden = true;
        raiz.hidden = true;
        raiz.textContent = '';
        pintarCursor();
        alCerrar && alCerrar(volver);
    }

    return {
        abrir, cerrar,
        get abierta() { return abierta; },
        setIdioma(l) { idioma = l; },
        // Cada cuadro: el horno avanza aunque la ventana esté abierta
        actualizar() {
            if (!abierta) return;
            if (abierta.horno) {
                const e = abierta.estado;
                abierta.horno.llama.style.setProperty('--k', e.quemaMax ? Math.max(0, e.quema / e.quemaMax).toFixed(3) : 0);
                abierta.horno.flecha.style.setProperty('--k', (e.progreso / 10).toFixed(3));
                for (const c of abierta.casillas) if (c.grupo === 'contenedor') pintarCasilla(c);
            }
            for (const c of abierta.casillas) if (c.grupo === 'jugador') pintarCasilla(c);
        },
        refrescar
    };
}
