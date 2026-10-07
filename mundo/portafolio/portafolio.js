// =========================================================
// VENJY · Portafolio interactivo dentro del mundo 3D
// Puntos de interés (atriles, carteles, cuadros…) con un cartel flotante encima y un panel
// que se abre al acercarse (unos 4 bloques) y se cierra al alejarse.
//   · Escritorio: clic izquierdo = página siguiente, clic derecho = anterior (apuntando al
//     objeto), E = abrir el recurso real, G = agrandar. También ← y → .
//   · Celular: botones del panel; tocar el texto lo agranda a pantalla completa.
// El idioma sale de ?lang= y se puede cambiar con la tecla L.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { crearCarteles } from './carteles.js';
import { crearCuadros } from './cuadros.js';

const RADIO_ABRIR = 4.5;      // bloques en horizontal
const HISTERESIS = 1.5;       // para no parpadear en el borde
const ALTO_MAX = 5;           // diferencia vertical máxima
const RADIO_APUNTAR = 2.0;    // tolerancia al apuntar al objeto (bloques)

const TXT = {
    es: {
        siguiente: 'Siguiente', anterior: 'Anterior', agrandar: 'Agrandar', reducir: 'Reducir', cerrar: 'Cerrar',
        teclas: 'Clic: siguiente · Clic der.: anterior · E: abrir · G: agrandar · L: idioma',
        pagina: 'Página'
    },
    en: {
        siguiente: 'Next', anterior: 'Back', agrandar: 'Enlarge', reducir: 'Shrink', cerrar: 'Close',
        teclas: 'Click: next · Right click: back · E: open · G: enlarge · L: language',
        pagina: 'Page'
    }
};

const esTactil = () => (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;

function el(tag, clase, padre, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    if (padre) padre.appendChild(e);
    return e;
}

export function crearPortafolio({ scene, camara, jugador, hudEl, materiales, idioma: idiomaInicial = 'es', alAbrir = null }) {
    let idioma = idiomaInicial;
    const carteles = crearCarteles(scene, camara, idioma);
    const cuadros = crearCuadros({ scene, camara, materiales });
    const pois = [];
    let activo = null, pagina = 0, paginas = [], grande = false;
    const tactil = esTactil();

    // ---- DOM del panel ----
    const panel = el('section', 'pf-panel', document.body);
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    const cab = el('header', 'pf-cab', panel);
    const tituloEl = el('h2', 'pf-titulo', cab);
    const numEl = el('span', 'pf-num', cab);
    const cuerpo = el('div', 'pf-cuerpo', panel);
    const pie = el('footer', 'pf-pie', panel);
    const bAnt = el('button', 'pf-boton', pie); bAnt.type = 'button';
    const bSig = el('button', 'pf-boton', pie); bSig.type = 'button';
    const enlace = el('a', 'pf-boton pf-recurso', pie);
    enlace.target = '_blank'; enlace.rel = 'noopener noreferrer';
    const bGrande = el('button', 'pf-boton', pie); bGrande.type = 'button';
    const teclasEl = el('p', 'pf-teclas', panel);

    const t = () => TXT[idioma] || TXT.es;
    const loc = v => (v && typeof v === 'object' ? (v[idioma] ?? v.es ?? '') : (v ?? ''));

    function pintar() {
        if (!activo) return;
        const p = paginas[pagina] || {};
        tituloEl.textContent = p.titulo || loc(activo.titulo);
        numEl.textContent = paginas.length > 1 ? `${pagina + 1}/${paginas.length}` : '';
        cuerpo.replaceChildren();
        if (p.imagen) {
            const im = el('img', 'pf-imagen', cuerpo);
            im.src = p.imagen; im.alt = p.titulo || '';
            im.loading = 'lazy';
        }
        for (const s of p.sub || []) {
            const f = el('p', 'pf-sub', cuerpo);
            if (s.cab) el('b', '', f, s.cab + ' ');
            f.appendChild(document.createTextNode(s.texto || ''));
        }
        for (const x of p.parrafos || []) el('p', 'pf-parrafo', cuerpo, x);
        if (p.items && p.items.length) {
            const ul = el('ul', 'pf-lista', cuerpo);
            for (const x of p.items) el('li', '', ul, x);
        }
        if (p.pie) el('p', 'pf-nota', cuerpo, p.pie);
        cuerpo.scrollTop = 0;
        bAnt.textContent = '‹ ' + t().anterior;
        bSig.textContent = t().siguiente + ' ›';
        bAnt.disabled = pagina <= 0;
        bSig.disabled = pagina >= paginas.length - 1;
        bAnt.hidden = bSig.hidden = paginas.length <= 1;
        const r = activo.recurso ? activo.recurso(idioma) : null;
        enlace.hidden = !r;
        if (r) { enlace.href = r.url; enlace.textContent = loc(r.etiqueta) + (tactil ? '' : ' (E)'); }
        bGrande.textContent = grande ? t().reducir : t().agrandar;
        teclasEl.textContent = t().teclas;
        teclasEl.hidden = tactil;
        panel.classList.toggle('pf-grande', grande);
        panel.setAttribute('aria-label', tituloEl.textContent);
    }

    function abrir(poi) {
        activo = poi; pagina = 0; grande = false;
        paginas = poi.paginas(idioma);
        panel.hidden = false;
        pintar();
        alAbrir && alAbrir(poi);
    }
    function cerrar() {
        activo = null;
        panel.hidden = true;
        grande = false;
    }
    function ir(delta) {
        if (!activo) return;
        const n = Math.max(0, Math.min(paginas.length - 1, pagina + delta));
        if (n !== pagina) { pagina = n; pintar(); }
    }
    function alternarGrande() { grande = !grande; pintar(); }

    bAnt.addEventListener('click', () => ir(-1));
    bSig.addEventListener('click', () => ir(1));
    bGrande.addEventListener('click', alternarGrande);
    // En celular, tocar el texto agranda el panel
    cuerpo.addEventListener('click', () => { if (tactil && !grande) alternarGrande(); });
    panel.addEventListener('contextmenu', e => e.preventDefault());

    // ---- Apuntar al objeto activo (para que el clic pase la página y no rompa un bloque) ----
    const dir = new THREE.Vector3();
    function apuntando() {
        if (!activo) return false;
        camara.getWorldDirection(dir);
        const o = camara.position;
        const vx = activo.x - o.x, vy = activo.y - o.y, vz = activo.z - o.z;
        const along = vx * dir.x + vy * dir.y + vz * dir.z;
        if (along <= 0) return false;
        const px = vx - dir.x * along, py = vy - dir.y * along, pz = vz - dir.z * along;
        return Math.hypot(px, py, pz) < RADIO_APUNTAR;
    }
    window.addEventListener('mousedown', e => {
        if (!activo || !jugador.activo || !apuntando()) return;
        if (e.button === 0) ir(1);
        else if (e.button === 2) ir(-1);
        else return;
        e.preventDefault();
        e.stopImmediatePropagation(); // el clic no debe romper ni poner bloques
    }, true);
    document.addEventListener('keydown', e => {
        if (!activo || !jugador.activo || e.repeat) return;
        if (e.code === 'ArrowRight' || e.code === 'KeyF') ir(1);
        else if (e.code === 'ArrowLeft') ir(-1);
        else if (e.code === 'KeyG') alternarGrande();
        else if (e.code === 'KeyE') {
            const r = activo.recurso ? activo.recurso(idioma) : null;
            if (r) window.open(r.url, '_blank', 'noopener');
        }
    });

    // ---- Puntos de interés ----
    // poi: { id, x, y, z, radio?, cartel: { texto, dy?, ancho?, color?, distancia? }, titulo, paginas(idioma), recurso?(idioma) }
    function agregarPOI(poi) {
        poi.radio = poi.radio || RADIO_ABRIR;
        if (poi.cartel) {
            carteles.agregar({
                x: poi.x, y: poi.y + (poi.cartel.dy ?? 1.6), z: poi.z, texto: poi.cartel.texto,
                ancho: poi.cartel.ancho || 4, color: poi.cartel.color, tamano: poi.cartel.tamano, distancia: poi.cartel.distancia
            });
        }
        pois.push(poi);
        return poi;
    }

    // Cuadro con imagen (ver cuadros.js); si lleva `poi`, también abre un panel al acercarse
    function agregarCuadro(op) {
        const c = cuadros.agregar(op);
        if (op.poi) agregarPOI({ x: op.x, y: op.y, z: op.z, ...op.poi });
        return c;
    }

    function actualizar() {
        carteles.actualizar();
        cuadros.actualizar();
        panel.hidden = !activo || !jugador.activo; // en pausa se oculta
        if (!pois.length) return;
        const p = camara.position, pies = jugador.pos;
        let mejor = null, dm = Infinity;
        for (const poi of pois) {
            const d = Math.hypot(pies.x - poi.x, pies.z - poi.z);
            const lim = poi === activo ? poi.radio + HISTERESIS : poi.radio;
            if (d < lim && Math.abs(p.y - poi.y) < ALTO_MAX && d < dm) { dm = d; mejor = poi; }
        }
        if (mejor !== activo) { if (mejor) abrir(mejor); else cerrar(); }
    }

    function setIdioma(l) {
        idioma = l;
        carteles.setIdioma(l);
        if (activo) { const n = pagina; paginas = activo.paginas(idioma); pagina = Math.min(n, paginas.length - 1); pintar(); }
    }

    return { pois, agregarPOI, agregarCuadro, actualizar, setIdioma, carteles, cerrar, get idioma() { return idioma; }, get activo() { return activo; } };
}
