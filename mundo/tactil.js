// =========================================================
// VENJY · Controles táctiles del mundo 3D
// Joystick virtual, mirar con el dedo, saltar/subir/bajar y pausa.
// Escribe en jugador.teclas / yaw / pitch, igual que el teclado.
// =========================================================
const SENSIBILIDAD = 0.005;
const LIMITE_PITCH = Math.PI / 2 - 0.01;
const ZONA_MUERTA = 0.22;
const UMBRAL_CORRER = 0.88;
const DOBLE_TOQUE_MS = 300;
const SONDEO_MS = 150;

const TEXTOS = {
    es: { saltar: 'SALTAR', subir: 'SUBIR', bajar: 'BAJAR', pausa: 'Pausa' },
    en: { saltar: 'JUMP', subir: 'UP', bajar: 'DOWN', pausa: 'Pause' }
};

function cargarCSS() {
    const href = new URL('./tactil.css', import.meta.url).href;
    if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(l => l.href === href)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
}

function el(tag, clase, padre) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (padre) padre.appendChild(e);
    return e;
}

export function iniciarTactil(jugador, { alEntrar } = {}) {
    const esTactil = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
    if (!esTactil) return null;

    cargarCSS();

    const raiz = el('div', 'tactil');
    raiz.hidden = true;
    const mirar = el('div', 'tactil-mirar', raiz);
    const base = el('div', 'tactil-joy', raiz);
    const palanca = el('div', 'tactil-joy-palanca', base);
    const bSaltar = el('button', 'tactil-boton tactil-saltar', raiz);
    const bBajar = el('button', 'tactil-boton tactil-bajar', raiz);
    const bPausa = el('button', 'tactil-boton tactil-pausa', raiz);
    for (const b of [bSaltar, bBajar, bPausa]) b.type = 'button';
    el('i', 'tactil-icono-pausa', bPausa);
    document.body.appendChild(raiz);

    const api = { activo: false, activar, desactivar };
    let idJoy = null, idMirar = null, idSaltar = null, idBajar = null;
    let ultimoMirarX = 0, ultimoMirarY = 0, ultimoSalto = 0;
    let sondeo = 0;
    const dirs = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];

    const idioma = () => (document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';

    function etiquetas() {
        const t = TEXTOS[idioma()];
        bSaltar.textContent = jugador.vuela ? t.subir : t.saltar;
        bBajar.textContent = t.bajar;
        bPausa.setAttribute('aria-label', t.pausa);
        bBajar.hidden = !jugador.vuela;
    }

    const buscar = (lista, id) => {
        for (const t of lista) if (t.identifier === id) return t;
        return null;
    };

    // ---------- Joystick ----------
    function soltarDirs() {
        for (const c of [...dirs, 'ControlLeft']) jugador.teclas.delete(c);
        jugador.corre = false;
    }

    function fijarTecla(codigo, on) {
        if (on) jugador.teclas.add(codigo); else jugador.teclas.delete(codigo);
    }

    function moverJoy(t) {
        const r = base.getBoundingClientRect();
        const radio = r.width / 2;
        let dx = t.clientX - (r.left + radio);
        let dy = t.clientY - (r.top + radio);
        const dist = Math.hypot(dx, dy);
        const max = radio * 0.8;
        if (dist > max) { dx = dx / dist * max; dy = dy / dist * max; }
        palanca.style.transform = `translate(${dx}px, ${dy}px)`;

        const nx = dx / max, ny = dy / max; // -1..1, y negativo = adelante
        const mag = Math.hypot(nx, ny);
        const fuera = mag < ZONA_MUERTA;
        const adelante = !fuera && ny < -ZONA_MUERTA;
        fijarTecla('KeyW', adelante);
        fijarTecla('KeyS', !fuera && ny > ZONA_MUERTA);
        fijarTecla('KeyA', !fuera && nx < -ZONA_MUERTA);
        fijarTecla('KeyD', !fuera && nx > ZONA_MUERTA);
        const correr = adelante && -ny >= UMBRAL_CORRER;
        fijarTecla('ControlLeft', correr);
        jugador.corre = correr;
        base.classList.toggle('corre', correr);
    }

    function resetJoy() {
        idJoy = null;
        palanca.style.transform = '';
        base.classList.remove('corre');
        soltarDirs();
    }

    base.addEventListener('touchstart', e => {
        e.preventDefault();
        if (idJoy !== null) return;
        const t = e.changedTouches[0];
        idJoy = t.identifier;
        moverJoy(t);
    }, { passive: false });
    base.addEventListener('touchmove', e => {
        e.preventDefault();
        const t = buscar(e.changedTouches, idJoy);
        if (t) moverJoy(t);
    }, { passive: false });
    const finJoy = e => {
        e.preventDefault();
        if (buscar(e.changedTouches, idJoy)) resetJoy();
    };
    base.addEventListener('touchend', finJoy, { passive: false });
    base.addEventListener('touchcancel', finJoy, { passive: false });

    // ---------- Mirar ----------
    mirar.addEventListener('touchstart', e => {
        e.preventDefault();
        if (idMirar !== null) return;
        const t = e.changedTouches[0];
        idMirar = t.identifier;
        ultimoMirarX = t.clientX;
        ultimoMirarY = t.clientY;
    }, { passive: false });
    mirar.addEventListener('touchmove', e => {
        e.preventDefault();
        const t = buscar(e.changedTouches, idMirar);
        if (!t) return;
        jugador.yaw -= (t.clientX - ultimoMirarX) * SENSIBILIDAD;
        jugador.pitch -= (t.clientY - ultimoMirarY) * SENSIBILIDAD;
        jugador.pitch = Math.max(-LIMITE_PITCH, Math.min(LIMITE_PITCH, jugador.pitch));
        ultimoMirarX = t.clientX;
        ultimoMirarY = t.clientY;
    }, { passive: false });
    const finMirar = e => {
        e.preventDefault();
        if (buscar(e.changedTouches, idMirar)) idMirar = null;
    };
    mirar.addEventListener('touchend', finMirar, { passive: false });
    mirar.addEventListener('touchcancel', finMirar, { passive: false });

    // ---------- Botones mantenibles ----------
    function botonMantener(boton, codigo, alPulsar, obtenerId, fijarId) {
        boton.addEventListener('touchstart', e => {
            e.preventDefault();
            if (obtenerId() !== null) return;
            fijarId(e.changedTouches[0].identifier);
            boton.classList.add('pulsado');
            if (alPulsar) alPulsar();
            jugador.teclas.add(codigo);
        }, { passive: false });
        boton.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
        const fin = e => {
            e.preventDefault();
            if (!buscar(e.changedTouches, obtenerId())) return;
            fijarId(null);
            boton.classList.remove('pulsado');
            jugador.teclas.delete(codigo);
        };
        boton.addEventListener('touchend', fin, { passive: false });
        boton.addEventListener('touchcancel', fin, { passive: false });
    }

    botonMantener(bSaltar, 'Space', () => {
        const ahora = performance.now();
        if (ahora - ultimoSalto < DOBLE_TOQUE_MS) { jugador.alternarVuelo(); ultimoSalto = 0; etiquetas(); }
        else ultimoSalto = ahora;
    }, () => idSaltar, v => { idSaltar = v; });
    botonMantener(bBajar, 'ShiftLeft', null, () => idBajar, v => { idBajar = v; });

    // ---------- Pausa ----------
    bPausa.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    bPausa.addEventListener('touchend', e => { e.preventDefault(); desactivar(); }, { passive: false });
    bPausa.addEventListener('click', e => { e.preventDefault(); if (api.activo) desactivar(); });

    // ---------- Ciclo ----------
    function soltarTodo() {
        resetJoy();
        idMirar = idSaltar = idBajar = null;
        bSaltar.classList.remove('pulsado');
        bBajar.classList.remove('pulsado');
    }

    function activar() {
        if (api.activo) return;
        api.activo = true;
        jugador.activo = true;
        raiz.hidden = false;
        etiquetas();
        sondeo = setInterval(etiquetas, SONDEO_MS);
        alEntrar && alEntrar(true);
    }

    function desactivar() {
        if (!api.activo) return;
        api.activo = false;
        clearInterval(sondeo);
        soltarTodo();
        raiz.hidden = true;
        jugador.activo = false;
        jugador.teclas.clear();
        alEntrar && alEntrar(false);
    }

    return api;
}
