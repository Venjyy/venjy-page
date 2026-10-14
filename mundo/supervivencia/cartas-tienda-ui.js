// =========================================================
// VENJY · Supervivencia · Duelo de Cartas: sección «Cartas del Duelo» en la pestaña Tienda (etapa A, punto 3, PR 2)
// La pinta tienda.js dentro del panel del amigo que vende cartas (`cartas: true` en tienda-datos.js), con import()
// la primera vez. Sobres (se abren al comprarlos y muestran lo que salió) y cartas sueltas.
// Lógica y precios en cartas-tienda.js; el dueño los ajusta en el Estudio (pestaña Mesa).
// =========================================================
import { CARTAS } from './cartas-datos.js';
import { miniCarta } from './cartas-armar.js';
import { reglasTienda, catalogo, comprarSobre, comprarSuelta } from './cartas-tienda.js';
import { coleccionDe, totalColeccion } from './cartas-coleccion.js';

const t = (es, en) => ({ es, en });
export const TXT_TIENDA_CARTAS = {
    titulo: t('Cartas del Duelo', 'Duel cards'),
    sub: t('Lo que compras va a tu colección. Ármala con el MAZO en la mano (clic derecho).', 'What you buy goes to your collection. Build it with the DECK in hand (right click).'),
    coleccion: t('Tu colección: {n} cartas ({d} distintas)', 'Your collection: {n} cards ({d} different)'),
    sobre: t('Sobre de {n} cartas', 'Pack of {n} cards'),
    sobreNota: t('{k} que no tienes, si quedan', '{k} you do not own, if any are left'),
    esm: t('{n} esmeraldas', '{n} emeralds'),
    esm1: t('1 esmeralda', '1 emerald'),
    precioAmigo: t('Precio de amigo', 'Friend price'),
    abrir: t('Comprar y abrir', 'Buy and open'),
    comprar: t('Comprar', 'Buy'),
    sueltas: t('Cartas sueltas', 'Single cards'),
    tienes: t('Tienes {n}', 'You own {n}'),
    tope: t('Ya tienes las que caben en un mazo', 'You already own as many as a deck allows'),
    salio: t('Salió del sobre:', 'From the pack:'),
    nueva: t('Nueva', 'New')
};

// ctx: idioma, inventario, datos (cartas-mesa.json o lo del Estudio), esm (id de la esmeralda),
// precio(n) -> { n, rebaja } (descuento de amistad), ultimo (ids del último sobre, para mostrarlo),
// alComprar(res, tipo) (tipo = 'sobre' | 'suelta'; res = { ok, motivo, cartas } de cartas-tienda.js)
export function seccionCartas(ctx) {
    const { inventario, datos, esm } = ctx;
    const idioma = ctx.idioma || 'es';
    const L = o => (o && (o[idioma] || o.es)) || '';
    const F = (o, v) => L(o).replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
    const precio = n => (ctx.precio ? ctx.precio(n) : { n, rebaja: false });
    const esmeraldas = n => (n === 1 ? L(TXT_TIENDA_CARTAS.esm1) : F(TXT_TIENDA_CARTAS.esm, { n }));
    const T = reglasTienda(datos);
    const el = document.createElement('div');
    el.className = 'tienda-cartas';
    if (!T.activa) return el;

    const col = coleccionDe(inventario, datos);
    const h = document.createElement('p'); h.className = 'titulo-mision'; h.textContent = L(TXT_TIENDA_CARTAS.titulo);
    const sub = document.createElement('p'); sub.className = 'tienda-cartas-sub';
    sub.textContent = `${L(TXT_TIENDA_CARTAS.sub)} ${F(TXT_TIENDA_CARTAS.coleccion, { n: totalColeccion(col), d: Object.values(col).filter(n => n > 0).length })}`;
    el.append(h, sub);

    function fila(texto, nota, p, boton, f, apagado, bloqueo) {
        const r = document.createElement('div');
        r.className = 'tienda-fila' + (bloqueo ? ' bloqueada' : '') + (p.rebaja ? ' rebaja' : '');
        const a = document.createElement('span'); a.className = 'tienda-carta-nombre'; a.textContent = texto;
        r.appendChild(a);
        if (nota) { const s = document.createElement('small'); s.textContent = nota; r.appendChild(s); }
        const pr = document.createElement('span'); pr.className = 'tienda-flecha'; pr.textContent = esmeraldas(p.n);
        r.appendChild(pr);
        if (p.rebaja) { const e = document.createElement('em'); e.className = 'tienda-rebaja'; e.textContent = L(TXT_TIENDA_CARTAS.precioAmigo); r.appendChild(e); }
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'boton'; b.textContent = boton; b.disabled = !!apagado;
        b.addEventListener('click', f);
        r.appendChild(b);
        if (bloqueo) { const s = document.createElement('small'); s.textContent = bloqueo; r.appendChild(s); }
        return r;
    }

    // Sobre
    const lista = document.createElement('div'); lista.className = 'tienda-lista';
    const ps = precio(T.sobrePrecio);
    lista.appendChild(fila(F(TXT_TIENDA_CARTAS.sobre, { n: T.sobreCartas }), T.sobreNuevas ? F(TXT_TIENDA_CARTAS.sobreNota, { k: T.sobreNuevas }) : '', ps,
        L(TXT_TIENDA_CARTAS.abrir), () => ctx.alComprar(comprarSobre(inventario, datos, esm, ps.n), 'sobre')));
    el.appendChild(lista);

    // Lo que salió en el último sobre
    if (ctx.ultimo && ctx.ultimo.length) {
        const s = document.createElement('p'); s.className = 'tienda-cartas-sub'; s.textContent = L(TXT_TIENDA_CARTAS.salio);
        const rej = document.createElement('div'); rej.className = 'tienda-sobre';
        for (const id of ctx.ultimo) {
            if (!CARTAS[id]) continue;
            const caja = document.createElement('div'); caja.className = 'tienda-sobre-carta';
            caja.appendChild(miniCarta(id, L));
            if ((col[id] || 0) <= ctx.ultimo.filter(x => x === id).length) {
                const n = document.createElement('em'); n.textContent = L(TXT_TIENDA_CARTAS.nueva); caja.appendChild(n);
            }
            rej.appendChild(caja);
        }
        el.append(s, rej);
    }

    // Sueltas
    const ts = document.createElement('p'); ts.className = 'titulo-mision'; ts.textContent = L(TXT_TIENDA_CARTAS.sueltas);
    const sueltas = document.createElement('div'); sueltas.className = 'tienda-lista';
    const orden = o => (CARTAS[o.id].tipo === 'hechizo' ? 1 : 0);
    for (const o of catalogo(inventario, datos).sort((a, b) => orden(a) - orden(b) || L(CARTAS[a.id].nombre).localeCompare(L(CARTAS[b.id].nombre)))) {
        const p = precio(o.precio);
        sueltas.appendChild(fila(L(CARTAS[o.id].nombre), F(TXT_TIENDA_CARTAS.tienes, { n: o.tienes }), p, L(TXT_TIENDA_CARTAS.comprar),
            () => ctx.alComprar(comprarSuelta(inventario, datos, o.id, esm, p.n), 'suelta'), o.tope, o.tope ? L(TXT_TIENDA_CARTAS.tope) : ''));
    }
    el.append(ts, sueltas);
    return el;
}
