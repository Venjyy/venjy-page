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
// escenas: escena-amistad.js (se carga aquí si todavía no estaba; la próxima escena que se juegue ya usa los datos nuevos)
// poses: mundo/datos/gestos.js cambia GESTOS y GESTOS_AMISTAD en el lugar (el próximo cuadro ya usa el gesto nuevo)
let gizmo = null; // estudio/gizmo-juego.js, solo después del primer `elegir`
async function aplicar(nombre, datos) {
    if (nombre === 'dialogos') {
        const m = await import('../mundo/supervivencia/dialogos-datos.js');
        m.aplicarDatosVivos(datos);
    } else if (nombre === 'escenas') {
        const m = await import('../mundo/supervivencia/escena-amistad.js');
        m.aplicarDatosVivos(datos);
    } else if (nombre === 'poses') {
        const m = await import('../mundo/datos/gestos.js');
        m.aplicarPoses(datos);
    } else if (nombre === 'posiciones') {
        const v = window.__venjy;
        if (!v || !v.amigos || !v.amigos.posiciones) throw new Error('el juego todavía no está listo');
        v.amigos.posiciones.aplicar(datos);
        if (gizmo) gizmo.sincronizar();
    } else if (nombre === 'cartas-mesa') {
        // La mesa del duelo: si ya se abrió alguna vez la rearma; si no, la próxima vez que se abra lee el archivo
        const v = window.__venjy;
        if (v && v.mesaCartas) v.mesaCartas.aplicarDatos(datos);
        else if (v) v.datosMesa = datos;
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

// Escenas de amistad (fase 5, pestaña Escenas): juega una de escenas.json (o de ANIMACIONES), la pausa, salta a un
// instante o la detiene. El editor manda antes los datos vivos (`datos`), así la escena que se juega es la que se ve.
let pausada = false, punteroEditor = false, escenaPropia = null; // escenaPropia: la clave de escenas.json que el editor lanzó
async function escena(o) {
    if (!juegoListo()) throw new Error('el juego todavía no está listo');
    if (o.accion === 'puntero') {
        // El juego captura el mouse al abrir el mundo y al empezar o terminar una escena: con la línea de tiempo abierta
        // eso se comería los clics del editor. puntero-libre.js (con cuenta, lo comparte con el gizmo) lo evita.
        const pl = await import('./puntero-libre.js');
        if (o.v === false) { if (punteroEditor) { punteroEditor = false; pl.devolver(window.__venjy); } }
        else if (!punteroEditor) { punteroEditor = true; pl.liberar(window.__venjy); }
        return { puntero: punteroEditor ? 'libre' : 'juego' };
    }
    const ea = await window.__venjy.cargarAmistad();
    if (!ea) throw new Error('no se pudo cargar el motor de escenas');
    if (o.accion === 'jugar') {
        if (ea.activa) ea.saltar();
        pausada = false;
        ea.pausar(false);
        let ok;
        if (ea.guiones().includes(o.clave)) ok = await ea.jugarGuion(o.clave, o.persona || null);
        else {
            if (!o.persona) throw new Error('esta escena necesita una persona');
            ok = ea.jugar(o.persona, o.clave);
        }
        if (!ok) throw new Error('la escena no pudo empezar (¿la persona está a la vista? ¿hay otra escena en curso?)');
        escenaPropia = o.clave;
        return { clave: o.clave, activa: true };
    }
    if (o.accion === 'pausa') {
        pausada = o.v !== false;
        ea.pausar(pausada);
        return { pausada };
    }
    if (!ea.activa) throw new Error('no hay una escena en curso');
    if (o.accion === 'ir') { ea.irA(o.t); return { t: o.t }; }
    ea.saltar(); // parar
    return { activa: false };
}

// El cabezal del editor: 10 veces por segundo mientras corre una escena, y un último aviso al terminar
let escenaViva = false;
setInterval(() => {
    const ea = window.__venjy && window.__venjy.amistadEscena;
    const s = ea && ea.escena;
    // clave = la escena (la que lanzó el editor, o el nombre de la animación); persona = con quién se juega
    if (s) { escenaViva = true; decir({ tipo: 'escenaT', clave: escenaPropia || s.tipo || s.clave, persona: s.clave, t: Math.round(s.t * 100) / 100, T: s.T, pausada }); }
    else if (escenaViva) { escenaViva = false; pausada = false; escenaPropia = null; decir({ tipo: 'escenaT', clave: null }); }
}, 100);

// Poses del editor (fase 6b, pestaña Poses): deja quieta a una persona con los canales que manda el editor. Usa n.escena
// (el gancho de las escenas de la supervivencia en criaturas/amigos.js: reemplaza la animación de ese cuadro) con una
// función propia, y la suelta con canales null. Si la persona ya está en otra escena, no la toca.
// Devuelve dónde quedó la punta de cada mano (en el marco de la persona, desde los pies), como `capturar.mjs --medir`.
const posadas = new Map(); // clave -> { canales, f }
const NEUTRO = { cx: 0, cy: 0, cz: 0, bDx: 0, bDz: 0, bIx: 0, bIz: 0, pDx: 0, pIx: 0, inc: 0, rz: 0, y: 0, salto: 0, pz: 0 };
function escribirPose(p, v) {
    p.cuello.rotation.set(v.cx, v.cy, v.cz);
    p.brazoD.rotation.x = v.bDx; p.brazoD.rotation.z = v.bDz; p.brazoI.rotation.x = v.bIx; p.brazoI.rotation.z = v.bIz;
    p.piernaD.rotation.x = v.pDx; p.piernaI.rotation.x = v.pIx;
    p.cuerpo.rotation.x = v.inc; p.cuerpo.rotation.z = v.rz; p.cuerpo.position.y = v.y + v.salto; p.cuerpo.position.z = v.pz;
}
async function pose(o) {
    if (!juegoListo()) throw new Error('el juego todavía no está listo');
    const v = window.__venjy;
    const n = v.amigos && v.amigos.lista.find(q => q.clave === o.clave);
    if (!n) throw new Error(`no hay una persona «${o.clave}» en este mundo`);
    const previa = posadas.get(o.clave);
    if (o.canales === null) {
        if (previa && n.escena === previa.f) { n.escena = null; escribirPose(n.p, NEUTRO); }
        posadas.delete(o.clave);
        return { clave: o.clave, quieta: false };
    }
    if (n.escena && !(previa && n.escena === previa.f)) throw new Error(`${o.clave} está en una escena: espera a que termine o párala`);
    const reg = previa || { canales: null, f: null };
    reg.canales = { ...NEUTRO, ...o.canales };
    if (!reg.f) reg.f = () => { escribirPose(n.p, reg.canales); };
    n.escena = reg.f;
    posadas.set(o.clave, reg);
    // Se escribe ya (sin esperar al cuadro) para medir
    const THREE = await import('../vendor/three.module.js');
    escribirPose(n.p, reg.canales);
    n.p.g.updateMatrixWorld(true);
    const r3 = x => Math.round(x * 1000) / 1000;
    const punta = b => { const w = n.p.g.worldToLocal(b.localToWorld(new THREE.Vector3(0, -0.75, 0))); return { adelante: r3(w.z), altura: r3(w.y), lado: r3(w.x) }; };
    return { clave: o.clave, quieta: true, manoD: punta(n.p.brazoD), manoI: punta(n.p.brazoI) };
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
    elegir,
    escena,
    pose
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
