// =========================================================
// VENJY · Supervivencia · Ruleta de gestos (7c-2, punto 18)
// Mantener B (o el botón GESTOS en el celular) abre una rueda de 8 gestos; soltar sobre uno lo hace.
// Mientras la rueda está abierta el mouse elige (no mueve la cámara). Al hacer el gesto el cuerpo queda
// congelado en su sitio y la cámara orbita libre (camaras.js `congelado`), en cualquier vista; termina al
// acabar, con una tecla de movimiento o un clic (cancela), al recibir daño o al abrir una ventana o la pausa.
// Al terminar vuelven la mirada y la vista de antes. Los datos y el ciclo están en gestos-jugador.js; los
// demás jugadores lo ven con el evento `em` (coop.js).
// =========================================================
import { RULETA, TECLAS_MOVER, crearControl, entradaGesto, avanzarGesto, soltarGesto, sector, cargarMoldes, resolverListo } from './gestos-jugador.js';

const TX = {
    es: { boton: 'GESTOS', soltar: 'Suelta B sobre un gesto', soltarT: 'Suelta sobre un gesto', suelo: 'Los gestos se hacen en el suelo',
        lista: l => `Gestos (/gesto <nombre> o /gesto todos): ${l}`, no: n => `No existe el gesto «${n}». Escribe /gesto`, cola: n => `${n} gesto(s) en cola: cierra la consola` },
    en: { boton: 'EMOTES', soltar: 'Release B over an emote', soltarT: 'Release over an emote', suelo: 'Emotes only work on the ground',
        lista: l => `Emotes (/gesto <name> or /gesto todos): ${l}`, no: n => `No emote «${n}». Type /gesto`, cola: n => `${n} emote(s) queued: close the console` }
};
const RADIO_MOUSE = 120; // px de mouse acumulados como mucho (cambiar de casilla responde rápido)

// otroManda(): una escena, panel o minijuego tomó el control (main.js: uiAbierta). Entonces no se toca
// `jugador.congelado`, que es de ellos.
export function crearRuleta({ jugador, camaras, vida, hud, idioma = 'es', coop = () => null, puede = () => true, otroManda = () => false, tactil = null }) {
    const tx = TX[idioma] || TX.es;
    const control = crearControl();
    let saliendo = null;   // gesto cancelado que todavía vuelve suave al cuerpo quieto
    let congeleYo = false, vidaAntes = 0, clic = false;

    // ---------- La rueda ----------
    const el = document.createElement('div');
    el.className = 'ruleta';
    el.hidden = true;
    const casillas = RULETA.map((g, i) => {
        const c = document.createElement('div');
        c.className = 'ruleta-casilla';
        c.style.setProperty('--a', `${i * 360 / RULETA.length}deg`);
        c.textContent = g[idioma] || g.es;
        el.appendChild(c);
        return c;
    });
    const centro = document.createElement('div');
    centro.className = 'ruleta-centro';
    el.appendChild(centro);
    document.body.appendChild(el);

    let abierta = false, elegido = -1, dx = 0, dy = 0, quiteMirar = false, tactilAbierta = false;
    function pintar() {
        casillas.forEach((c, i) => c.classList.toggle('elegida', i === elegido));
        centro.textContent = elegido >= 0 ? (RULETA[elegido][idioma] || RULETA[elegido].es) : tactilAbierta ? tx.soltarT : tx.soltar;
    }
    function abrir(conDedo = false) {
        if (abierta || !puede()) return;
        cargarMoldes().then(r => control.resolver(r)).catch(() => {});
        abierta = true; tactilAbierta = conDedo; elegido = -1; dx = dy = 0;
        jugador.teclas.clear();
        if (!jugador.sinMirar) { jugador.sinMirar = true; quiteMirar = true; }
        el.hidden = false;
        pintar();
    }
    function cerrar(hacer) {
        if (!abierta) return;
        abierta = false;
        el.hidden = true;
        if (quiteMirar) { jugador.sinMirar = false; quiteMirar = false; }
        if (hacer && elegido >= 0) empezar(RULETA[elegido].k);
    }
    function mover(mx, my) {
        dx += mx; dy += my;
        const d = Math.hypot(dx, dy);
        if (d > RADIO_MOUSE) { dx *= RADIO_MOUSE / d; dy *= RADIO_MOUSE / d; }
        const s = sector(dx, dy);
        if (s !== elegido) { elegido = s; pintar(); }
    }
    document.addEventListener('mousemove', e => { if (abierta && !tactilAbierta) mover(e.movementX, e.movementY); });
    document.addEventListener('keydown', e => {
        if (e.code !== 'KeyB' || e.repeat) return;
        if (!abierta && jugador.activo) { abrir(); e.preventDefault(); }
    });
    document.addEventListener('keyup', e => { if (e.code === 'KeyB' && abierta && !tactilAbierta) cerrar(true); });
    document.addEventListener('mousedown', () => { if (control.activo) clic = true; });

    // Celular: botón GESTOS (mantener y deslizar el dedo hacia el gesto)
    let boton = null;
    if (tactil) {
        boton = tactil.agregarAccion('sv-gestos', tx.boton, () => abrir(true), () => cerrar(true));
        boton.hidden = false;
        let x0 = 0, y0 = 0;
        boton.addEventListener('touchstart', e => { const t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; });
        boton.addEventListener('touchmove', e => {
            if (!abierta) return;
            const t = e.changedTouches[0];
            dx = dy = 0;
            mover((t.clientX - x0) * 1.6, (t.clientY - y0) * 1.6);
        });
    }

    // ---------- El gesto ----------
    let vistaYaw = 0, vistaPitch = 0; // mirada de antes (vuelve al terminar)
    function empezar(k) {
        if (!puede()) return;
        if (!jugador.enSuelo || jugador.vuela || jugador.enAgua()) { if (hud) hud.mensaje(tx.suelo, 2); return; }
        if (!control.listo) return; // tope de la red: 1 por segundo
        let yaw = jugador.yaw, pitch = jugador.pitch;
        if (control.gesto) { yaw = control.fijo.yaw; pitch = control.pitchAntes; control.cancelar('cambio', false); }
        if (!control.iniciar(k, yaw, pitch, resolverListo())) return;
        if (!resolverListo()) cargarMoldes().then(r => control.resolver(r)).catch(() => {});
        saliendo = null;
        vistaYaw = yaw; vistaPitch = pitch;
        if (!jugador.congelado) { jugador.congelado = true; congeleYo = true; }
        jugador.teclas.clear();
        clic = false;
        vidaAntes = vida.vida;
        // La cámara empieza de frente y en diagonal (se ve la cara); luego el jugador la mueve
        jugador.yaw = yaw + Math.PI + 0.5;
        jugador.pitch = -0.22;
    }
    function terminar() {
        jugador.yaw = vistaYaw; jugador.pitch = vistaPitch;
        if (congeleYo && !otroManda()) jugador.congelado = false;
        congeleYo = false;
    }
    // /gesto (consola): los gestos en cola empiezan al volver al juego, uno tras otro
    let cola = [], esperaCola = 0;
    function actualizar(dt) {
        if (abierta && (!jugador.activo || !puede())) cerrar(false);
        if (cola.length && !control.gesto && !saliendo && !abierta && puede() && control.listo) {
            esperaCola -= dt;
            if (esperaCola <= 0) { empezar(cola.shift()); esperaCola = 0.8; }
        }
        if (saliendo && !avanzarGesto(saliendo, dt)) saliendo = null;
        const g = control.gesto;
        const mueve = clic || TECLAS_MOVER.some(t => jugador.teclas.has(t));
        const dano = vida.muerto || vida.vida < vidaAntes;
        vidaAntes = vida.vida;
        const ventana = !jugador.activo || otroManda() || camaras.enCine;
        clic = false;
        // Sin gesto también se llama: suelta el aviso `em` que esperaba su segundo
        const motivo = control.paso(dt, g ? { mueve, dano, ventana } : {});
        for (const m of control.mensajes()) { const c = coop(); if (c) c.gesto(m.k); }
        if (!g || !motivo) return;
        if (motivo !== 'fin') { soltarGesto(g); saliendo = g; cola = []; } // moverse corta también la cola de /gesto
        terminar();
    }

    return {
        actualizar,
        get abierta() { return abierta; },
        get activo() { return !!control.gesto; },
        // camaras.congelado: { yaw, pitch } del cuerpo mientras dura el gesto
        congelado: () => control.fijo,
        // Para entradaPose (cuerpo propio y mensaje `p`): el gesto, sin objetos en las manos y mirando al frente
        entrada() {
            const g = control.gesto || saliendo;
            if (!g) return null;
            const e = entradaGesto(g);
            const f = control.fijo;
            return { ...e, objeto: 0, objeto2: 0, golpe: false, ...(f ? { yawFijo: f.yaw, pitchFijo: f.pitch } : {}) };
        },
        // Comando /gesto [clave|nombre|todos]: sin argumento lista; con uno lo deja en cola (sale al cerrar la consola)
        comando(arg = '') {
            const a = String(arg).trim().toLowerCase();
            const nombre = g => (g[idioma] || g.es).toLowerCase();
            if (!a) { hud && hud.mensaje(tx.lista(RULETA.map(g => `${g.k} (${nombre(g)})`).join(', ')), 8); return; }
            const lista = a === 'todos' || a === 'all' ? RULETA.map(g => g.k) : RULETA.filter(g => g.k === a || nombre(g) === a || g.es.toLowerCase() === a || g.en.toLowerCase() === a).map(g => g.k);
            if (!lista.length) { hud && hud.mensaje(tx.no(a), 4); return; }
            cola = lista; esperaCola = 0.5;
            hud && hud.mensaje(tx.cola(lista.length), 3);
        },
        // Depuración y capturas (consola): hace un gesto por su clave
        hacer(k) { empezar(k); return control.gesto ? control.gesto.k : null; },
        cancelar() { if (control.gesto) { const g = control.gesto; control.cancelar('consola'); soltarGesto(g); saliendo = g; terminar(); } },
        boton
    };
}
