// =========================================================
// VENJY · Supervivencia · Duelo de Cartas: armar tu mazo (etapa A, punto 3, PR 1)
// Clic derecho con el MAZO en la mano abre este panel: tu colección (cada carta con su arte), cuántas van
// en el mazo y los límites (25 cartas, máximo 2 copias; ajustables en el Estudio → Mesa → «Colección y mazo»).
// Arriba se elige con qué mazo juegas: el armado o uno al azar (+1 carta en la mano inicial).
// La lógica está en cartas-coleccion.js; main.js lo carga con import() la primera vez.
// =========================================================
import { CARTAS, FAMILIAS, TXT_CARTAS } from './cartas-datos.js';
import { arteCarta } from './cartas-arte.js';
import { reglasDe, coleccionDe, mazoArmado, juegaAlAzar, motivoMazo, mazoAzar, guardarMazo, ponerAzar, copiasPosibles, totalColeccion, jugables } from './cartas-coleccion.js';

const t = (es, en) => ({ es, en });
export const TXT_ARMAR = {
    titulo: t('Tu mazo de cartas', 'Your card deck'),
    sub: t('Elige {n} cartas de tu colección, máximo {k} copias de cada una.', 'Pick {n} cards from your collection, at most {k} copies of each.'),
    juegaCon: t('Juegas con:', 'You play with:'),
    armado: t('Mi mazo armado', 'My built deck'),
    azar: t('Mazo al azar (+{x} en la mano)', 'Random deck (+{x} in hand)'),
    azarNota: t('Al azar: cada duelo te toca un mazo distinto de {de}, y tu mano inicial trae {x} de más.', 'Random: every duel deals you a different deck from {de}, and your opening hand gets {x} extra.'),
    deTodas: t('todas las cartas', 'every card'),
    deTuya: t('tu colección', 'your collection'),
    cuenta: t('En el mazo: {n} de {max} · Criaturas {c} · Hechizos {h}', 'In the deck: {n} of {max} · Creatures {c} · Spells {h}'),
    coleccion: t('Colección: {n} cartas ({d} distintas de {t})', 'Collection: {n} cards ({d} different out of {t})'),
    tienes: t('Tienes {n}', 'You own {n}'),
    enMazo: t('En el mazo: {n}', 'In deck: {n}'),
    quitar: t('Quitar', 'Remove'),
    poner: t('Poner', 'Add'),
    rellenar: t('Completar al azar', 'Fill at random'),
    vaciar: t('Vaciar', 'Clear'),
    guardar: t('Guardar y cerrar', 'Save and close'),
    cerrar: t('Cerrar sin guardar', 'Close without saving'),
    guardado: t('Mazo guardado.', 'Deck saved.'),
    motivo: {
        largo: t('El mazo tiene que tener {max} cartas justas (lleva {n}).', 'The deck needs exactly {max} cards (it has {n}).'),
        copias: t('Hay una carta con más de {k} copias.', 'A card has more than {k} copies.'),
        falta: t('Hay una carta que no tienes en esa cantidad.', 'A card is in the deck more times than you own it.'),
        carta: t('Hay una carta que no se puede usar.', 'A card cannot be used.')
    }
};

const ORDEN = ['monstruo', 'mito', 'amigo', 'animal', 'hechizo'];
const familia = id => (CARTAS[id].tipo === 'hechizo' ? 'hechizo' : CARTAS[id].familia);
const contar = mazo => { const o = {}; for (const id of mazo) o[id] = (o[id] || 0) + 1; return o; };

// Carta en miniatura con su arte y los textos encima (mismas clases que el panel 2D); la usa también la tienda de cartas.
// L = texto en el idioma ({es, en} -> string)
export function miniCarta(id, L) {
    const d = CARTAS[id], c = document.createElement('div');
    c.className = 'carta-pixel';
    const img = arteCarta(id);
    c.innerHTML = '<span class="carta-nombre"></span><span class="carta-familia"></span><span class="carta-estadisticas"></span><span class="carta-texto"></span>';
    c.children[0].textContent = L(d.nombre);
    c.children[1].textContent = d.tipo === 'criatura' ? L(FAMILIAS[d.familia]) : L(TXT_CARTAS.hechizo);
    c.children[3].textContent = L(d.texto);
    if (img) {
        c.classList.add('con-arte', d.tipo === 'hechizo' ? 'es-hechizo' : 'es-criatura');
        if (L(d.nombre).length >= 26) c.classList.add('nombre-largo');
        c.style.backgroundImage = `url(${img})`;
        if (d.tipo === 'criatura') {
            const a = document.createElement('span'), b = document.createElement('span');
            a.className = 'carta-atk'; a.textContent = String(d.atk); b.className = 'carta-def'; b.textContent = String(d.def);
            c.children[2].append(a, b);
        }
    } else if (d.tipo === 'criatura') c.children[2].textContent = `${L(TXT_CARTAS.atk)} ${d.atk} / ${L(TXT_CARTAS.def)} ${d.def}`;
    c.title = `${L(d.nombre)} · ${L(d.texto)}`;
    return c;
}

export function crearArmarMazo(ctx) {
    const { inventario, abrirPanel, cerrarPanel } = ctx;
    let idioma = ctx.idioma || 'es', mazo = [], el = null, aviso = '';
    const datos = () => (ctx.datos ? ctx.datos() : null);
    const L = o => (o && (o[idioma] || o.es)) || '';
    const F = (o, v) => L(o).replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
    const boton = (texto, fn, clase = '', apagado = false) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = `boton cartas-boton ${clase}`; b.textContent = texto; b.disabled = apagado;
        b.addEventListener('click', ev => { ev.stopPropagation(); fn(); });
        return b;
    };
    const carta = id => miniCarta(id, L);

    function pintar() {
        if (!el) return;
        const D = datos(), R = reglasDe(D), col = coleccionDe(inventario, D), n = contar(mazo), azar = juegaAlAzar(inventario);
        el.textContent = '';
        const h = document.createElement('h1'); h.textContent = L(TXT_ARMAR.titulo);
        const sub = document.createElement('p'); sub.className = 'sub'; sub.textContent = F(TXT_ARMAR.sub, { n: R.largo, k: R.copias });
        // Con qué mazo juegas
        const modo = document.createElement('div'); modo.className = 'armar-modo';
        const et = document.createElement('span'); et.textContent = L(TXT_ARMAR.juegaCon);
        modo.append(et,
            boton(L(TXT_ARMAR.armado), () => { ponerAzar(inventario, false, D); pintar(); }, azar ? '' : 'elegido'),
            boton(F(TXT_ARMAR.azar, { x: R.azarExtra }), () => { ponerAzar(inventario, true, D); pintar(); }, azar ? 'elegido' : ''));
        const nota = document.createElement('p'); nota.className = 'sub';
        nota.textContent = azar ? F(TXT_ARMAR.azarNota, { de: L(R.azarTodas ? TXT_ARMAR.deTodas : TXT_ARMAR.deTuya), x: R.azarExtra }) : '';
        // Cuenta
        const hz = mazo.filter(id => CARTAS[id] && CARTAS[id].tipo === 'hechizo').length;
        const cuenta = document.createElement('p'); cuenta.className = 'cuenta' + (mazo.length === R.largo ? ' completo' : '');
        cuenta.textContent = F(TXT_ARMAR.cuenta, { n: mazo.length, max: R.largo, c: mazo.length - hz, h: hz });
        const ids = jugables().filter(id => col[id] >= 1).sort((a, b) => ORDEN.indexOf(familia(a)) - ORDEN.indexOf(familia(b)) || L(CARTAS[a].nombre).localeCompare(L(CARTAS[b].nombre)));
        const total = document.createElement('p'); total.className = 'sub';
        total.textContent = F(TXT_ARMAR.coleccion, { n: totalColeccion(Object.fromEntries(ids.map(id => [id, col[id]]))), d: ids.length, t: jugables().length });
        // Tu colección
        const rejilla = document.createElement('div'); rejilla.className = 'armar-rejilla';
        for (const id of ids) {
            const caja = document.createElement('div'); caja.className = 'armar-carta' + (n[id] ? ' en-mazo' : '');
            const k = n[id] || 0, max = copiasPosibles(id, col, R);
            const linea = document.createElement('p'); linea.textContent = `${F(TXT_ARMAR.enMazo, { n: k })} · ${F(TXT_ARMAR.tienes, { n: col[id] })}`;
            const fila = document.createElement('div'); fila.className = 'fila';
            fila.append(
                boton(L(TXT_ARMAR.quitar), () => { mazo.splice(mazo.lastIndexOf(id), 1); aviso = ''; pintar(); }, 'secundario', k === 0),
                boton(L(TXT_ARMAR.poner), () => { mazo.push(id); aviso = ''; pintar(); }, '', k >= max || mazo.length >= R.largo));
            caja.append(carta(id), linea, fila);
            rejilla.appendChild(caja);
        }
        const msg = document.createElement('p'); msg.className = 'armar-aviso'; msg.textContent = aviso; msg.setAttribute('role', 'status');
        const pie = document.createElement('div'); pie.className = 'fila armar-pie';
        pie.append(
            boton(L(TXT_ARMAR.rellenar), () => { mazo = mazoAzar(col, R, (Math.random() * 1e9) | 0, mazo); aviso = ''; pintar(); }, 'secundario', mazo.length >= R.largo),
            boton(L(TXT_ARMAR.vaciar), () => { mazo = []; aviso = ''; pintar(); }, 'secundario', !mazo.length),
            boton(L(TXT_ARMAR.guardar), guardar),
            boton(L(TXT_ARMAR.cerrar), () => cerrarPanel(), 'secundario'));
        el.append(h, sub, modo, nota, cuenta, total, rejilla, msg, pie);
    }
    function guardar() {
        const D = datos(), R = reglasDe(D), motivo = guardarMazo(inventario, mazo, D);
        if (!motivo) { if (ctx.hud) ctx.hud.mensaje(L(TXT_ARMAR.guardado), 3); cerrarPanel(); return; }
        // Un mazo a medias no se guarda: se avisa por qué (el que ya tenías sigue igual)
        aviso = F(TXT_ARMAR.motivo[motivo], { max: R.largo, n: mazo.length, k: R.copias });
        pintar();
    }

    function abrir() {
        const D = datos();
        mazo = mazoArmado(inventario, D);
        if (motivoMazo(mazo, coleccionDe(inventario, D), reglasDe(D))) mazo = [];
        aviso = '';
        el = document.createElement('section'); el.className = 'cartas-armar';
        pintar();
        abrirPanel(el);
        return true;
    }
    return {
        abrir,
        setIdioma(l) { idioma = l === 'en' ? 'en' : 'es'; pintar(); }
    };
}
