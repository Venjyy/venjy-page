// =========================================================
// VENJY · Supervivencia · Duelo de Cartas: la tienda de cartas (etapa A, punto 3, PR 2)
// Lógica pura (sin DOM): sobres y cartas sueltas que vende un amigo (hoy Lucho, con `cartas: true` en
// tienda-datos.js). Lo comprado va a la colección del jugador (inventario.cartas, sumarCarta) y se paga
// con esmeraldas del inventario. El panel está en cartas-tienda-ui.js.
// Precios y contenido de los sobres: TIENDA_CARTAS y las fórmulas de aquí; el dueño los ajusta en el Estudio
// (pestaña Mesa, grupos «Tienda de cartas», «Precio de cada carta» y «Sobres: peso de cada carta»)
// → mundo/datos/cartas-mesa.json (tiendaCartas, preciosCartas, pesosSobre).
// =========================================================
import { CARTAS } from './cartas-datos.js';
import { jugables, coleccionDe, reglasDe, sumarCarta } from './cartas-coleccion.js';

// activa = 1: el amigo vende cartas; sobrePrecio = esmeraldas por sobre; sobreCartas = cartas por sobre;
// sobreNuevas = cuántas del sobre salen de las que no tienes (si quedan); sobreHechizos = hechizos mínimos por sobre;
// sueltaTope = 1: no vende una carta suelta si ya tienes las copias que caben en un mazo
export const TIENDA_CARTAS = { activa: 1, sobrePrecio: 3, sobreCartas: 3, sobreNuevas: 1, sobreHechizos: 0, sueltaTope: 1 };

const entero = (v, min, max, base) => (Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : base);

export function reglasTienda(datos) {
    const d = (datos && datos.tiendaCartas) || {}, B = TIENDA_CARTAS;
    const T = {
        activa: entero(d.activa, 0, 1, B.activa),
        sobrePrecio: entero(d.sobrePrecio, 1, 64, B.sobrePrecio),
        sobreCartas: entero(d.sobreCartas, 1, 10, B.sobreCartas),
        sobreNuevas: entero(d.sobreNuevas, 0, 10, B.sobreNuevas),
        sobreHechizos: entero(d.sobreHechizos, 0, 10, B.sobreHechizos),
        sueltaTope: entero(d.sueltaTope, 0, 1, B.sueltaTope)
    };
    T.sobreNuevas = Math.min(T.sobreNuevas, T.sobreCartas);
    T.sobreHechizos = Math.min(T.sobreHechizos, T.sobreCartas);
    return T;
}

// Precio base de una carta suelta (sin JSON): criaturas según ATK + DEF (1-3), hechizos 2 (rayo y revivir, 3)
export function precioBase(id) {
    const c = CARTAS[id];
    if (!c || c.ficha) return 0;
    if (c.tipo === 'hechizo') return id === 'rayo' || id === 'revivir' ? 3 : 2;
    return Math.min(3, 1 + Math.floor((c.atk + c.def) / 800));
}
// Precio de la carta suelta; 0 = no se vende suelta
export function precioCarta(id, datos) {
    if (!CARTAS[id] || CARTAS[id].ficha) return 0;
    const p = datos && datos.preciosCartas && datos.preciosCartas[id];
    return entero(p, 0, 64, precioBase(id));
}
// Peso de la carta en los sobres (más = sale más seguido); 0 = nunca sale en un sobre. Sin JSON: 1
export function pesoSobre(id, datos) {
    if (!CARTAS[id] || CARTAS[id].ficha) return 0;
    const p = datos && datos.pesosSobre && datos.pesosSobre[id];
    return Number.isFinite(p) ? Math.max(0, Math.min(20, p)) : 1;
}

// Cartas sueltas a la venta: [{ id, precio, tienes, tope }] (tope = ya tienes las que caben en un mazo)
export function catalogo(inv, datos) {
    const col = coleccionDe(inv, datos), R = reglasDe(datos), T = reglasTienda(datos);
    return jugables()
        .map(id => ({ id, precio: precioCarta(id, datos), tienes: col[id] || 0 }))
        .filter(o => o.precio > 0)
        .map(o => ({ ...o, tope: !!T.sueltaTope && o.tienes >= R.copias }));
}

// Sorteo ponderado sin dejar la lista vacía
function sortear(ids, datos, rnd) {
    const total = ids.reduce((s, id) => s + pesoSobre(id, datos), 0);
    if (!(total > 0)) return null;
    let r = rnd() * total;
    for (const id of ids) { r -= pesoSobre(id, datos); if (r < 0) return id; }
    return ids[ids.length - 1];
}

// Lo que trae un sobre con esta colección (no la cambia). Prioridades: primero `sobreNuevas` de las que no
// tienes, luego `sobreHechizos` hechizos, y el resto de las que todavía no llenan las copias de un mazo
// (si ya las tienes todas, de cualquiera). rnd = () => [0, 1)
export function sacarSobre(col, datos, rnd = Math.random) {
    const T = reglasTienda(datos), R = reglasDe(datos);
    const ids = jugables().filter(id => pesoSobre(id, datos) > 0);
    const lleva = { ...col }, out = [];
    const sumar = id => { out.push(id); lleva[id] = (lleva[id] || 0) + 1; };
    const de = filtro => { const l = ids.filter(filtro); return l.length ? sortear(l, datos, rnd) : null; };
    for (let i = 0; i < T.sobreNuevas && out.length < T.sobreCartas; i++) {
        const id = de(id => !(lleva[id] > 0));
        if (!id) break;
        sumar(id);
    }
    const hechizos = () => out.filter(id => CARTAS[id].tipo === 'hechizo').length;
    while (hechizos() < T.sobreHechizos && out.length < T.sobreCartas) {
        const id = de(id => CARTAS[id].tipo === 'hechizo' && (lleva[id] || 0) < R.copias) || de(id => CARTAS[id].tipo === 'hechizo');
        if (!id) break;
        sumar(id);
    }
    while (out.length < T.sobreCartas) {
        const id = de(id => (lleva[id] || 0) < R.copias) || de(() => true);
        if (!id) break;
        sumar(id);
    }
    return out;
}

// ---- Compras: inv = el inventario (contar, quitar, cartas); esm = id de la esmeralda; precio = lo que se cobra
// (la tienda le aplica el descuento de amistad antes). Devuelven { ok, motivo, cartas }.
//   motivo: 'cerrada' | 'carta' (no se vende) | 'tope' (ya tienes las que caben) | 'plata' (no alcanza)
export function comprarSobre(inv, datos, esm, precio, rnd = Math.random) {
    const T = reglasTienda(datos);
    if (!T.activa) return { ok: false, motivo: 'cerrada', cartas: [] };
    if (inv.contar(esm) < precio) return { ok: false, motivo: 'plata', cartas: [] };
    const cartas = sacarSobre(coleccionDe(inv, datos), datos, rnd);
    if (!cartas.length) return { ok: false, motivo: 'carta', cartas: [] };
    inv.quitar(esm, precio);
    for (const id of cartas) sumarCarta(inv, id, 1, datos);
    return { ok: true, motivo: null, cartas };
}
export function comprarSuelta(inv, datos, id, esm, precio) {
    const T = reglasTienda(datos);
    if (!T.activa) return { ok: false, motivo: 'cerrada', cartas: [] };
    const o = catalogo(inv, datos).find(o => o.id === id);
    if (!o) return { ok: false, motivo: 'carta', cartas: [] };
    if (o.tope) return { ok: false, motivo: 'tope', cartas: [] };
    if (inv.contar(esm) < precio) return { ok: false, motivo: 'plata', cartas: [] };
    inv.quitar(esm, precio);
    sumarCarta(inv, id, 1, datos);
    return { ok: true, motivo: null, cartas: [id] };
}
