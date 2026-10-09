// =========================================================
// VENJY · Supervivencia · Consola de comandos
// Una línea de comandos al estilo del chat de Minecraft (T o /). Es local: no habla con
// ningún servidor ni cambia el resto del juego, solo da unos atajos para recorrer el mapa:
//   /fly     activa o desactiva el vuelo (doble Espacio para subir, como en creativo)
//   /dia     pone la mañana · /noche pone la noche
//   /ayuda   lista los comandos
//   /gamemode devenjy   activa (o apaga) el modo de desarrollo: muestra los comandos y habilita los de `dev`
// `extra` agrega comandos de otros módulos: { '/nombre': { fn(args), ayuda: { es, en } } }
// `dev` es lo mismo pero solo funciona tras /gamemode devenjy (teletransportes, objetos, jefes…).
// Con ese modo activo, al escribir se sugieren comandos y argumentos (`sugerir()` de cada comando dev); Tab/↑/↓ completan.
// =========================================================
const TXT = {
    es: {
        pista: 'Escribe un comando (por ejemplo /fly) y Enter · Esc para cerrar',
        flyOn: 'Vuelo activado: toca Espacio dos veces para volar (Shift baja)',
        flyOff: 'Vuelo desactivado',
        dia: 'Ahora es de día', noche: 'Ahora es de noche',
        ayuda: 'Comandos: /fly (volar), /dia, /noche, /ayuda',
        desconocido: c => `Comando desconocido: ${c}. Escribe /ayuda`,
        devOn: 'Modo devenjy activado', devOff: 'Modo devenjy desactivado',
        devNecesita: c => `${c} es de desarrollo: escribe /gamemode devenjy`,
        modoUso: 'Uso: /gamemode devenjy',
        tituloAyuda: 'Comandos', tituloDev: 'Modo devenjy · Tab completa las sugerencias'
    },
    en: {
        pista: 'Type a command (for example /fly) and press Enter · Esc to close',
        flyOn: 'Flight on: double-tap Space to fly (Shift goes down)',
        flyOff: 'Flight off',
        dia: "It's daytime now", noche: "It's night now",
        ayuda: 'Commands: /fly (flight), /dia (day), /noche (night), /ayuda (help)',
        desconocido: c => `Unknown command: ${c}. Type /ayuda`,
        devOn: 'devenjy mode on', devOff: 'devenjy mode off',
        devNecesita: c => `${c} is a dev command: type /gamemode devenjy`,
        modoUso: 'Usage: /gamemode devenjy',
        tituloAyuda: 'Commands', tituloDev: 'devenjy mode · Tab completes suggestions'
    }
};

export function crearConsola({ jugador, dia, hud, idioma = 'es', alAbrir, alCerrar, extra = {}, dev = {} }) {
    const t = TXT[idioma] || TXT.es;
    const caja = document.createElement('form');
    caja.className = 'consola';
    caja.hidden = true;
    const entrada = document.createElement('input');
    entrada.id = 'consola-entrada';
    entrada.type = 'text';
    entrada.autocomplete = 'off';
    entrada.spellcheck = false;
    entrada.maxLength = 60;
    entrada.setAttribute('aria-label', t.pista);
    entrada.placeholder = t.pista;
    caja.appendChild(entrada);
    document.body.appendChild(caja);
    // Sugerencias (solo en modo devenjy): lista sobre la línea, con Tab/flechas para completar
    const lista = document.createElement('div');
    lista.className = 'consola-sugerencias';
    lista.hidden = true;
    caja.insertBefore(lista, entrada);
    let opciones = [], sel = -1;
    const norm = x => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    function calcular() {
        if (!modoDev) return [];
        const v = entrada.value.replace(/^\/?/, '/'), sp = v.search(/\s/);
        if (sp < 0) {
            const nombres = ['/gamemode', '/fly', '/dia', '/noche', '/ayuda', ...Object.keys(extra), ...Object.keys(dev)];
            return nombres.filter(n => n.startsWith(v.toLowerCase()) && n !== v.toLowerCase()).map(n => ({ texto: n, completo: n + ' ' }));
        }
        const c = v.slice(0, sp).toLowerCase(), arg = v.slice(sp).trim();
        if (/\s/.test(arg)) return [];
        const fuente = c === '/gamemode' ? ['devenjy'] : dev[c] && dev[c].sugerir ? dev[c].sugerir() : [];
        const q = norm(arg);
        const sale = fuente.filter(o => norm(o) !== q);
        return [...sale.filter(o => norm(o).startsWith(q)), ...sale.filter(o => !norm(o).startsWith(q) && norm(o).includes(q))]
            .slice(0, 40).map(o => ({ texto: o, completo: `${c} ${o}` }));
    }
    function pintarSugerencias() {
        lista.textContent = '';
        lista.hidden = !opciones.length;
        opciones.forEach((o, i) => {
            const f = document.createElement('div');
            f.textContent = o.texto;
            if (i === sel) f.className = 'sel';
            f.addEventListener('mousedown', e => { e.preventDefault(); entrada.value = o.completo; renovarSugerencias(); entrada.focus(); });
            lista.appendChild(f);
        });
        const activa = lista.querySelector('.sel');
        if (activa) activa.scrollIntoView({ block: 'nearest' });
    }
    function renovarSugerencias() { opciones = calcular(); sel = -1; pintarSugerencias(); }
    function moverSugerencia(d) {
        if (!opciones.length) return false;
        sel = (sel + d + opciones.length) % opciones.length;
        entrada.value = opciones[sel].completo;
        pintarSugerencias();
        return true;
    }
    let vuelo = false, modoDev = false, relojAyuda = 0;
    const panel = document.createElement('div');
    panel.className = 'consola-ayuda';
    panel.hidden = true;
    document.body.appendChild(panel);
    const ocultarAyuda = () => { clearTimeout(relojAyuda); panel.hidden = true; };
    // Panel con todos los comandos (los de siempre y, en modo devenjy, los de desarrollo)
    function mostrarAyuda() {
        const fila = (c, x) => { const f = document.createElement('div'); f.textContent = x.ayuda[idioma] || x.ayuda.es; return f; };
        panel.textContent = '';
        const h1 = document.createElement('b'); h1.textContent = t.tituloAyuda; panel.appendChild(h1);
        const base = document.createElement('div'); base.textContent = t.ayuda.replace(/^[^:]+:\s*/, ''); panel.appendChild(base);
        for (const [c, x] of Object.entries(extra)) panel.appendChild(fila(c, x));
        if (modoDev) {
            const h2 = document.createElement('b'); h2.textContent = t.tituloDev; panel.appendChild(h2);
            panel.appendChild(Object.assign(document.createElement('div'), { textContent: '/gamemode devenjy (apagar)' }));
            for (const [c, x] of Object.entries(dev)) panel.appendChild(fila(c, x));
        }
        panel.hidden = false;
        clearTimeout(relojAyuda);
        relojAyuda = setTimeout(ocultarAyuda, 25000);
    }

    function ejecutar(texto) {
        const partes = texto.trim().replace(/^\/?/, '/').split(/\s+/), c = partes[0].toLowerCase();
        if (c === '/' || !texto.trim()) return;
        if (c === '/fly' || c === '/volar') {
            vuelo = !vuelo;
            jugador.sinVuelo = !vuelo;
            if (vuelo) { jugador.vuela = true; jugador.vel.y = 0; jugador.yMaxAire = null; }
            else if (jugador.vuela) { jugador.vuela = false; jugador.yMaxAire = jugador.pos.y; }
            hud.mensaje(vuelo ? t.flyOn : t.flyOff, 4);
        } else if (c === '/dia' || c === '/day') { dia.amanecer(); hud.mensaje(t.dia); }
        else if (c === '/noche' || c === '/night') { dia.t = 370; hud.mensaje(t.noche); }
        else if (c === '/ayuda' || c === '/help') mostrarAyuda();
        else if (c === '/gamemode') {
            if ((partes[1] || '').toLowerCase() !== 'devenjy') { hud.mensaje(t.modoUso, 4); return; }
            modoDev = !modoDev;
            if (!modoDev) { opciones = []; pintarSugerencias(); }
            hud.mensaje(modoDev ? t.devOn : t.devOff, 3);
            if (modoDev) mostrarAyuda(); else ocultarAyuda();
        }
        else if (extra[c]) extra[c].fn(partes.slice(1).join(' '));
        else if (dev[c]) { if (modoDev) dev[c].fn(partes.slice(1).join(' ')); else hud.mensaje(t.devNecesita(c), 4); }
        else hud.mensaje(t.desconocido(c));
    }

    function abrir(con = '') {
        if (!caja.hidden) return;
        caja.hidden = false;
        ocultarAyuda();
        alAbrir && alAbrir();
        entrada.value = con;
        renovarSugerencias();
        setTimeout(() => entrada.focus(), 0);
    }
    function cerrar() {
        if (caja.hidden) return;
        caja.hidden = true;
        opciones = []; sel = -1; pintarSugerencias();
        entrada.blur();
        alCerrar && alCerrar();
    }
    caja.addEventListener('submit', e => { e.preventDefault(); const v = entrada.value; cerrar(); ejecutar(v); });
    entrada.addEventListener('input', renovarSugerencias);
    entrada.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
        else if (e.key === 'Tab') { e.preventDefault(); if (!opciones.length) renovarSugerencias(); moverSugerencia(e.shiftKey ? -1 : 1); }
        else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && opciones.length) { e.preventDefault(); moverSugerencia(e.key === 'ArrowDown' ? 1 : -1); }
    });

    return {
        abrir, cerrar, ejecutar,
        get abierta() { return !caja.hidden; },
        get vuelo() { return vuelo; },
        get modoDev() { return modoDev; }
    };
}
