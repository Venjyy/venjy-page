// =========================================================
// VENJY · Supervivencia · Consola de comandos
// Una línea de comandos al estilo del chat de Minecraft (T o /). Es local: no habla con
// ningún servidor ni cambia el resto del juego, solo da unos atajos para recorrer el mapa:
//   /fly     activa o desactiva el vuelo (doble Espacio para subir, como en creativo)
//   /dia     pone la mañana · /noche pone la noche
//   /ayuda   lista los comandos
// `extra` agrega comandos de otros módulos: { '/nombre': { fn(args), ayuda: { es, en } } }
// =========================================================
const TXT = {
    es: {
        pista: 'Escribe un comando (por ejemplo /fly) y Enter · Esc para cerrar',
        flyOn: 'Vuelo activado: toca Espacio dos veces para volar (Shift baja)',
        flyOff: 'Vuelo desactivado',
        dia: 'Ahora es de día', noche: 'Ahora es de noche',
        ayuda: 'Comandos: /fly (volar), /dia, /noche, /ayuda',
        desconocido: c => `Comando desconocido: ${c}. Escribe /ayuda`
    },
    en: {
        pista: 'Type a command (for example /fly) and press Enter · Esc to close',
        flyOn: 'Flight on: double-tap Space to fly (Shift goes down)',
        flyOff: 'Flight off',
        dia: "It's daytime now", noche: "It's night now",
        ayuda: 'Commands: /fly (flight), /dia (day), /noche (night), /ayuda (help)',
        desconocido: c => `Unknown command: ${c}. Type /ayuda`
    }
};

export function crearConsola({ jugador, dia, hud, idioma = 'es', alAbrir, alCerrar, extra = {} }) {
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
    let vuelo = false;

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
        else if (c === '/ayuda' || c === '/help') hud.mensaje([t.ayuda, ...Object.values(extra).map(x => x.ayuda[idioma] || x.ayuda.es)].join(' · '), 8);
        else if (extra[c]) extra[c].fn(partes.slice(1).join(' '));
        else hud.mensaje(t.desconocido(c));
    }

    function abrir(con = '') {
        if (!caja.hidden) return;
        caja.hidden = false;
        alAbrir && alAbrir();
        entrada.value = con;
        setTimeout(() => entrada.focus(), 0);
    }
    function cerrar() {
        if (caja.hidden) return;
        caja.hidden = true;
        entrada.blur();
        alCerrar && alCerrar();
    }
    caja.addEventListener('submit', e => { e.preventDefault(); const v = entrada.value; cerrar(); ejecutar(v); });
    entrada.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); cerrar(); } });

    return {
        abrir, cerrar, ejecutar,
        get abierta() { return !caja.hidden; },
        get vuelo() { return vuelo; }
    };
}
