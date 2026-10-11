// =========================================================
// VENJY · Estudio · puente del lado del juego (supervivencia.html?estudio)
// supervivencia.html lo carga con un import() de una línea solo si la URL trae ?estudio; sin eso el
// juego no descarga nada de esto. Abre el mundo «Estudio» (Pacífico), espera window.__venjy y atiende
// el canal 'venjy-estudio'. Además escucha /api/eventos (SSE) para recargar los JSON guardados: así
// llega también al celular en la red local (--lan), donde el BroadcastChannel no alcanza.
// Contrato: estudio/DISENO.md §6. Mensajes: estudio/puente-protocolo.js.
// =========================================================
import { CANAL, DATOS_VIVOS, crearManejador } from './puente-protocolo.js';
import { aplicarDatosVivos } from '../mundo/supervivencia/tactil-supervivencia.js';

const MUNDO = 'Estudio';

// ui-layout y textos los aplica tactil-supervivencia.js; dialogos, la fachada de «Hablar» (con ?estudio el
// módulo se carga aquí si todavía no estaba: hablar.js lee sus objetos al usarlos, así que ve el cambio)
// posiciones: amigos.js ubica a las personas (y el gizmo, si está puesto, sigue al que quedó en otro sitio)
let gizmo = null; // estudio/gizmo-juego.js, solo después del primer `elegir`
async function aplicar(nombre, datos) {
    if (nombre === 'dialogos') {
        const m = await import('../mundo/supervivencia/dialogos-datos.js');
        m.aplicarDatosVivos(datos);
    } else if (nombre === 'posiciones') {
        const v = window.__venjy;
        if (!v || !v.amigos || !v.amigos.posiciones) throw new Error('el juego todavía no está listo');
        v.amigos.posiciones.aplicar(datos);
        if (gizmo) gizmo.sincronizar();
    } else aplicarDatosVivos(nombre, datos);
}
const canal = new BroadcastChannel(CANAL);
const decir = m => canal.postMessage({ de: 'juego', ...m });

// Gizmo de posiciones: TransformControls (vendor/three-addons) se descarga la primera vez que se elige a alguien
async function elegir(o) {
    if (!juegoListo()) throw new Error('el juego todavía no está listo');
    if (!gizmo) {
        if (o.clave === null) return null;
        const m = await import('./gizmo-juego.js');
        gizmo = m.crearGizmo(window.__venjy, (clave, punto) => decir({ tipo: 'cambio', nombre: 'posiciones', ruta: `personas.${clave}`, valor: punto }));
        window.__venjy.estudioGizmo = gizmo; // depuración y pruebas
    }
    return gizmo.elegir(o);
}
const dormir = ms => new Promise(r => setTimeout(r, ms));

async function esperar(cond, tope, paso = 100) {
    const fin = Date.now() + tope;
    for (;;) {
        const v = cond();
        if (v) return v;
        if (Date.now() > fin) return null;
        await dormir(paso);
    }
}

// Crea el mundo «Estudio» en Pacífico o abre el que ya existe (como capturar.mjs, pero por el DOM del menú).
async function abrirMundo() {
    if (window.__venjy && window.__venjy.jugador) return;
    decir({ tipo: 'estado', fase: 'abriendo' });
    const ul = await esperar(() => { const e = document.getElementById('lista-mundos'); return e && !e.hidden ? e : null; }, 30000);
    if (!ul) throw new Error('el menú de mundos no apareció');
    const tarjeta = [...ul.querySelectorAll('.tarjeta-mundo')].find(li => {
        const b = li.querySelector('.info-mundo b');
        return b && b.textContent === MUNDO;
    });
    if (tarjeta) { tarjeta.querySelector('button').click(); return; }
    const nuevo = document.getElementById('nuevo-mundo');
    if (nuevo.disabled) throw new Error(`hay 5 mundos: borra uno o crea a mano uno llamado «${MUNDO}» en Pacífico`);
    nuevo.click();
    document.getElementById('nombre-mundo').value = MUNDO;
    document.querySelector('input[name="dificultad"][value="0"]').checked = true;
    document.getElementById('crear').click();
}

// /tp con el modo devenjy prendido solo el tiempo que dura la orden (el panel de ayuda no se queda en pantalla).
async function teletransportar(d) {
    const v = window.__venjy;
    const c = v.consola;
    const p = v.jugador.pos;
    const antes = [p.x, p.y, p.z].join();
    const yaDev = c.modoDev;
    if (!yaDev) c.ejecutar('/gamemode devenjy');
    c.ejecutar(d.destino ? '/tp ' + d.destino : `/tp ${d.x} ${d.y === undefined ? '' : d.y} ${d.z}`.replace(/\s+/g, ' '));
    if (!yaDev) c.ejecutar('/gamemode devenjy');
    if ([p.x, p.y, p.z].join() === antes) throw new Error('el jugador no se movió: ¿existe el destino? (en el juego, /tp lista los destinos)');
    const r = n => Math.round(n * 10) / 10;
    return { x: r(p.x), y: r(p.y), z: r(p.z) };
}

const juegoListo = () => !!(window.__venjy && window.__venjy.jugador && window.__venjy.consola);
const responder = crearManejador({
    listo: juegoListo,
    idioma: () => document.documentElement.lang === 'en' ? 'en' : 'es',
    aplicarDatos: aplicar,
    // Vista previa de un texto: el globo especial de misiones.js (el mismo de los diálogos únicos)
    globo(persona, texto) {
        const m = window.__venjy && window.__venjy.misiones;
        if (!m || !m.decir) throw new Error('el juego todavía no está listo');
        m.decir(persona, texto);
    },
    teletransportar,
    elegir
});

canal.onmessage = async e => {
    const r = await responder(e.data);
    if (r) canal.postMessage(r);
};

// Cambios guardados en disco (el Estudio, o un agente): se vuelven a leer y se aplican
function escucharDisco() {
    if (typeof EventSource === 'undefined') return;
    const fuente = new EventSource(new URL('../api/eventos', import.meta.url));
    fuente.addEventListener('cambio', async e => {
        const nombre = String(e.data || '').trim();
        if (!DATOS_VIVOS.includes(nombre)) return;
        try {
            const r = await fetch(new URL(`../mundo/datos/${nombre}.json`, import.meta.url), { cache: 'no-cache' });
            if (r.ok) await aplicar(nombre, await r.json());
        } catch (err) { console.warn('[estudio] no se pudo recargar', nombre, err); }
    });
}

escucharDisco();
decir({ tipo: 'estado', fase: 'esperando' });
try {
    await abrirMundo();
    if (!await esperar(juegoListo, 120000, 200)) throw new Error('el juego no terminó de cargar en 2 minutos');
    // el juego ya pidió y aplicó los JSON al importar tactil-supervivencia.js; esto avisa que se puede hablar con él
    decir({ tipo: 'listo', version: 1, idioma: document.documentElement.lang === 'en' ? 'en' : 'es' });
    document.documentElement.dataset.estudio = 'listo';
} catch (err) {
    document.documentElement.dataset.estudio = 'error';
    decir({ tipo: 'error', mensaje: String((err && err.message) || err) });
    console.warn('[estudio]', err);
}
