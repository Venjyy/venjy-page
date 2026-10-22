// =========================================================
// VENJY · Supervivencia · Tienda
// Pestaña «Tienda» del panel de cada amigo (misiones.js): comprar con esmeraldas o por trueque
// y vender cosas a cambio de esmeraldas. Los datos y los diálogos únicos viven en tienda-datos.js.
// Un amigo con `cartas: true` (Lucho) vende además cartas del Duelo: cartas-tienda-ui.js con import() la primera vez.
// =========================================================
import { TIENDAS, fijarTienda } from './tienda-datos.js';
import { O, nombreDe } from './objetos.js';
import { icono } from './iconos.js';
import { sonidos } from './sonidos.js';
import { cargarDatos } from '../datos/cargador.js';

const TXT = {
    es: { hablar: 'Hablar', mision: 'Misión', tienda: 'Tienda', precioAmigo: 'Precio de amigo', comprar: 'Comprar', vender: 'Vender', por: 'por', cerrar: 'Cerrar', tienes: 'Esmeraldas:', compras: 'Comprar', ventas: 'Vender',
        bloqueada: t => `Se desbloquea al completar: ${t}`, comprado: 'Compraste', vendido: 'Vendiste', cartas: n => (n === 1 ? 'Nueva carta en tu colección' : `${n} cartas nuevas en tu colección`),
        tope: 'Ya tienes las que caben en un mazo.', cargando: 'Cargando cartas…', lleno: 'No te cabe en el inventario.', mesa: 'Compraste la mesa de duelo' },
    en: { hablar: 'Talk', mision: 'Quest', tienda: 'Shop', precioAmigo: 'Friend price', comprar: 'Buy', vender: 'Sell', por: 'for', cerrar: 'Close', tienes: 'Emeralds:', compras: 'Buy', ventas: 'Sell',
        bloqueada: t => `Unlocks after completing: ${t}`, comprado: 'You bought', vendido: 'You sold', cartas: n => (n === 1 ? 'New card in your collection' : `${n} new cards in your collection`),
        tope: 'You already own as many as a deck allows.', cargando: 'Loading cards…', lleno: 'Your inventory is full.', mesa: 'You bought the duel table' }
};

// ctx: deVisita(clave) -> texto (opcional, rutinas.js), inventario, hud, hechas() -> Set de ids, tituloDe(id) -> {es,en}, nombres (NOMBRES_AMIGO), dar(lista),
// decir(clave, texto), abrirPanel, volver(clave) (vuelve al panel de misión), conversar(clave) (pestaña «Hablar»),
// precio(clave, oferta) -> { da, pide, rebaja } (descuento por amistad), alComprar(clave), alAbrir(clave, el), cerrarPanel
export function crearTienda(ctx) {
    cargarDatos('tienda').then(d => { if (d) fijarTienda(d); });
    const { inventario, hud, hechas, tituloDe, nombres, dar, decir, abrirPanel, volver, cerrarPanel } = ctx;
    const precio = (clave, o) => (ctx.precio ? ctx.precio(clave, o) : { da: o.da, pide: o.pide, rebaja: false });
    let idioma = ctx.idioma || 'es';
    const tx = () => TXT[idioma];
    const L = o => (o ? o[idioma] || o.es : '');

    const tiene = clave => !!TIENDAS[clave];
    const desbloqueada = o => !o.req || hechas().has(o.req);
    const alcanza = pide => pide.every(([id, n]) => inventario.contar(id) >= n);

    // ---- Cartas del Duelo (amigo con `cartas: true`): datos de cartas-mesa.json o lo último del Estudio ----
    let cartas = null, cargandoCartas = null, ultimoSobre = null;
    const datosMesa = () => (typeof window !== 'undefined' && window.__venjy && window.__venjy.datosMesa) || (cartas && cartas.datos);
    function cargarCartas() {
        if (!cargandoCartas) cargandoCartas = Promise.all([import('./cartas-tienda-ui.js'), cargarDatos('cartas-mesa')])
            .then(([m, datos]) => (cartas = { m, datos }))
            .catch(err => { cargandoCartas = null; console.error('No se pudo cargar la tienda de cartas', err); return null; });
        return cargandoCartas;
    }
    // Descuento de amistad igual que una oferta de un objeto (precio en esmeraldas por 1 carta)
    const precioCartas = clave => n => { const pr = precio(clave, { da: [['carta-duelo', 1]], pide: [[O.ESMERALDA, n]] }); return { n: pr.pide[0][1], rebaja: pr.rebaja }; };
    function seccionCartas(clave, caja) {
        caja.appendChild(cartas.m.seccionCartas({
            idioma, inventario, datos: datosMesa(), esm: O.ESMERALDA, mesa: O.MESA_DUELO, precio: precioCartas(clave), ultimo: ultimoSobre,
            alComprar: (res, tipo) => compraCartas(clave, res, tipo)
        }));
    }
    function compraCartas(clave, res, tipo) {
        const def = TIENDAS[clave];
        if (!res.ok) {
            const txt = res.motivo === 'tope' ? tx().tope : res.motivo === 'lleno' ? tx().lleno : L(def.noAlcanza);
            sonidos.danio(); decir(clave, txt); abrir(clave, txt); return;
        }
        ultimoSobre = tipo === 'sobre' ? res.cartas : null;
        decir(clave, L(def.compraOk));
        hud.mensaje(tipo === 'mesa' ? tx().mesa : tx().cartas(res.cartas.length));
        if (ctx.alComprar) ctx.alComprar(clave);
        // Sobre: lo rasgas tú y salen las cartas (cartas-sobre.js); al terminar vuelves a la tienda con lo que salió
        const D = datosMesa();
        const escena = tipo === 'sobre' && cartas.m.escenaSobre({ cartas: res.cartas, col: (inventario.cartas && inventario.cartas.c) || null, datos: D, idioma, alTerminar: () => abrir(clave, L(def.compraOk)) });
        if (escena) {
            abrirPanel(escena);
            if (ctx.alAbrir) ctx.alAbrir(clave, escena);
            return;
        }
        sonidos.nivel();
        abrir(clave, L(def.compraOk));
    }

    // Fila con iconos: [icono ×n] ...
    function pila(lista) {
        const d = document.createElement('span');
        d.className = 'tienda-pila';
        for (const [id, n] of lista) {
            const s = document.createElement('span');
            s.title = nombreDe(id, idioma);
            const c = document.createElement('canvas'); c.width = c.height = 32; c.getContext('2d').drawImage(icono(id), 0, 0);
            s.append(c, document.createTextNode(`${n} × ${nombreDe(id, idioma)}`));
            d.appendChild(s);
        }
        return d;
    }
    function fila(da, pide, textoBoton, f, bloqueo, rebaja) {
        const r = document.createElement('div');
        r.className = 'tienda-fila' + (bloqueo ? ' bloqueada' : '') + (rebaja ? ' rebaja' : '');
        const flecha = document.createElement('span'); flecha.className = 'tienda-flecha'; flecha.textContent = tx().por;
        r.append(pila(da), flecha, pila(pide));
        if (rebaja) { const e = document.createElement('em'); e.className = 'tienda-rebaja'; e.textContent = tx().precioAmigo; r.appendChild(e); }
        if (bloqueo) { const p = document.createElement('small'); p.textContent = bloqueo; r.appendChild(p); return r; }
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'boton'; b.textContent = textoBoton;
        b.addEventListener('click', f);
        r.appendChild(b);
        return r;
    }

    // Barra Hablar | Misión | Tienda; `activa` es 'hablar', 'mision' o 'tienda' (true/false = tienda/misión)
    function pestanas(clave, activa) {
        if (typeof activa === 'boolean') activa = activa ? 'tienda' : 'mision';
        const d = document.createElement('div');
        d.className = 'pestanas-mision';
        const lista = [['hablar', tx().hablar, () => ctx.conversar(clave)], ['mision', tx().mision, () => volver(clave)]];
        if (tiene(clave)) lista.push(['tienda', tx().tienda, () => abrir(clave)]);
        for (const [k, texto, f] of lista) {
            if (k === 'hablar' && !ctx.conversar) continue;
            const esta = k === activa;
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'boton pestana' + (esta ? ' activa' : ''); b.textContent = texto;
            if (!esta) b.addEventListener('click', f);
            d.appendChild(b);
        }
        // De visita, yendo o volviendo (rutinas.js): el panel sigue funcionando donde esté y lo dice bajo las pestañas
        const visita = ctx.deVisita ? ctx.deVisita(clave) : '';
        if (!visita) return d;
        const f = document.createDocumentFragment(), p = document.createElement('p');
        p.className = 'horario-amigo'; p.textContent = visita;
        f.append(d, p);
        return f;
    }

    function abrir(clave, frase) {
        const def = TIENDAS[clave];
        if (!def) return;
        if (!frase) ultimoSobre = null; // el sobre abierto se muestra solo justo después de comprarlo
        const el = document.createElement('section');
        el.className = 'panel-mision panel-tienda';
        const h = document.createElement('h2'); h.textContent = nombres[clave];
        el.append(h, pestanas(clave, 'tienda'));
        const dialogo = document.createElement('p'); dialogo.className = 'dialogo'; dialogo.textContent = frase || L(def.saludo);
        const saldo = document.createElement('p'); saldo.className = 'objetivo'; saldo.textContent = `${tx().tienes} ${inventario.contar(O.ESMERALDA)}`;
        el.append(dialogo, saldo);

        const compras = document.createElement('div'); compras.className = 'tienda-lista';
        for (const o of def.ofertas) {
            const libre = desbloqueada(o);
            const pr = precio(clave, o);
            compras.appendChild(fila(pr.da, pr.pide, tx().comprar, () => comprar(clave, o), libre ? null : tx().bloqueada(L(tituloDe(o.req))), libre && pr.rebaja));
        }
        el.appendChild(compras);

        if (def.cartas) {
            const caja = document.createElement('div');
            el.appendChild(caja);
            if (cartas) seccionCartas(clave, caja);
            else {
                caja.textContent = tx().cargando;
                cargarCartas().then(c => { caja.textContent = ''; if (c && caja.isConnected) seccionCartas(clave, caja); });
            }
        }

        if (def.compra && def.compra.length) {
            const t = document.createElement('p'); t.className = 'titulo-mision'; t.textContent = tx().ventas; el.appendChild(t);
            const ventas = document.createElement('div'); ventas.className = 'tienda-lista';
            for (const v of def.compra) ventas.appendChild(fila([[O.ESMERALDA, v.esm]], [v.da], tx().vender, () => vender(clave, v)));
            el.appendChild(ventas);
        }
        const cerrar = document.createElement('div'); cerrar.className = 'botones-mision';
        const b = document.createElement('button'); b.type = 'button'; b.className = 'boton secundario'; b.textContent = tx().cerrar;
        b.addEventListener('click', () => cerrarPanel());
        cerrar.appendChild(b); el.appendChild(cerrar);
        abrirPanel(el, { lado: true });
        if (ctx.alAbrir) ctx.alAbrir(clave, el); // el amigo se queda quieto mientras compras
    }

    function comprar(clave, o) {
        const def = TIENDAS[clave];
        if (!desbloqueada(o)) return;
        const pr = precio(clave, o); // con el descuento de amistad (amistad.js)
        if (!alcanza(pr.pide)) { sonidos.danio(); decir(clave, L(def.noAlcanza)); abrir(clave, L(def.noAlcanza)); return; }
        for (const [id, n] of pr.pide) inventario.quitar(id, n);
        dar(pr.da);
        sonidos.nivel();
        decir(clave, L(def.compraOk));
        hud.mensaje(`${tx().comprado}: ${pr.da.map(([id, n]) => `${n} × ${nombreDe(id, idioma)}`).join(', ')}`);
        if (ctx.alComprar) ctx.alComprar(clave);
        abrir(clave, L(def.compraOk));
    }
    function vender(clave, v) {
        const def = TIENDAS[clave];
        const [id, n] = v.da;
        if (inventario.contar(id) < n) { sonidos.danio(); decir(clave, L(def.noAlcanza)); abrir(clave, L(def.noAlcanza)); return; }
        inventario.quitar(id, n);
        dar([[O.ESMERALDA, v.esm]]);
        sonidos.nivel();
        decir(clave, L(def.ventaOk));
        hud.mensaje(`${tx().vendido}: ${n} × ${nombreDe(id, idioma)}`);
        abrir(clave, L(def.ventaOk));
    }

    return { tiene, abrir, pestanas, setIdioma(l) { idioma = l; } };
}
