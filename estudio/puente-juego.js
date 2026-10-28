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
// personajes (B5): las personas nuevas se rehacen (supervivencia/personajes.js) y su «Hablar» se suma de nuevo; un cambio
// de apariencia de alguien del código se ve al recargar el juego (rehacer su cuerpo perdería sus accesorios)
let gizmo = null; // estudio/gizmo-juego.js, solo después del primer `elegir`
let gizmoMesa = null; // estudio/gizmo-mesa.js, solo después del primer «Mover la mesa»
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
    } else if (nombre === 'personajes') {
        const v = window.__venjy;
        if (!v || !v.personajes) throw new Error('el juego todavía no está listo');
        v.personajes.aplicar(datos);
        const m = await import('../mundo/supervivencia/dialogos-datos.js');
        m.aplicarPersonajes(datos);
        if (gizmo) gizmo.sincronizar();
    } else if (nombre === 'tienda') {
        // B6: ofertas nuevas y tiendas de personas nuevas; el panel de la tienda lee TIENDAS al abrirse
        const m = await import('../mundo/supervivencia/tienda-datos.js');
        m.fijarTienda(datos);
    } else if (nombre === 'posiciones') {
        const v = window.__venjy;
        if (!v || !v.amigos || !v.amigos.posiciones) throw new Error('el juego todavía no está listo');
        v.amigos.posiciones.aplicar(datos);
        if (gizmo) gizmo.sincronizar();
    } else if (nombre === 'cartas-mesa') {
        // La mesa del duelo: si ya se abrió alguna vez la rearma; si no, la próxima vez que se abra lee estos datos
        // (también el panel de armar mazo: reglas y colección inicial)
        const v = window.__venjy;
        if (v) v.datosMesa = datos;
        if (v && v.mesaCartas) v.mesaCartas.aplicarDatos(datos);
        if (gizmoMesa) gizmoMesa.sincronizar();
    } else if (nombre === 'objetos-mano') {
        const m = await import('../mundo/supervivencia/objetos-mano-datos.js');
        m.aplicarDatosVivos(datos); // mano.js y pose-jugador.js se reacomodan solos al notar la versión nueva
    } else if (nombre === 'iconos') {
        // iconos.js repinta los íconos ya entregados y el atlas; la mano rehace la malla del objeto que llevas
        const m = await import('../mundo/supervivencia/iconos.js');
        m.aplicarIconos(datos);
    } else if (nombre === 'formas') {
        // 7f-2: el mundo vuelve a mallar los chunks cargados (aquí y en los workers); el contorno y las grietas
        // y el choque leen formas.js al momento
        const v = window.__venjy;
        if (!v || !v.mundo) throw new Error('el juego todavía no está listo');
        v.mundo.aplicarFormas(datos);
    } else if (nombre === 'carrera') {
        // 7h-1: la carrera lee estos datos en cada cuadro (el circuito se vuelve a armar si cambió)
        const v = window.__venjy;
        if (!v) throw new Error('el juego todavía no está listo');
        v.datosCarrera = datos;
    } else if (nombre === 'arena') {
        // 8 · L1: la arena lee estos datos al abrirse y al recibirlos (aplicarDatos rehace lo que cambió)
        const v = window.__venjy;
        if (!v) throw new Error('el juego todavía no está listo');
        v.datosArena = datos;
        if (v.arena && v.arena.aplicarDatos) v.arena.aplicarDatos(datos);
    } else if (nombre === 'combate') {
        // N6: el motor lee COMBATE en cada paso (fijarCombate lo rehace en el lugar; el próximo cuadro ya usa lo nuevo)
        const m = await import('../mundo/supervivencia/combate/datos.js');
        m.fijarCombate(datos);
    } else if (nombre.startsWith('estilo-')) {
        // N6: el estilo se cambia en el lugar (la pelea en curso y la próxima ya lo usan); carga la arena si no estaba
        const v = window.__venjy;
        if (!v || !v.cargarArena) throw new Error('el juego todavía no está listo');
        if (!v.estilosArena) await v.cargarArena();
        const e = v.estilosArena && v.estilosArena[nombre.slice(7)];
        if (!e) throw new Error(`la arena no usa «${nombre}»`);
        for (const k of Object.keys(e)) delete e[k];
        Object.assign(e, JSON.parse(JSON.stringify(datos)));
    } else if (nombre === 'salonas') {
        // S9: salonas.js lee estos datos en cada cuadro y al abrir (ajustes, reglas y textos)
        const v = window.__venjy;
        if (!v) throw new Error('el juego todavía no está listo');
        v.datosSalonas = datos;
    } else if (nombre === 'cartas-arte') {
        const m = await import('../mundo/supervivencia/cartas-arte.js');
        m.aplicarArte(datos);
        const v = window.__venjy;
        if (v && v.mesaCartas) v.mesaCartas.refrescarArte();
    } else if (nombre === 'navegacion') {
        // 6d etapa 2: navegacion.js y paseos.js leen sus ajustes en cada paso (la próxima búsqueda ya usa los nuevos)
        const m = await import('../mundo/supervivencia/paseos-datos.js');
        m.fijarPaseo(datos);
    } else if (nombre === 'actividades') {
        // 7g-1: fogata.js lee sus datos en cada cuadro; las poses de sentarse se aplican al tiro (también a los demás jugadores que ves)
        const v = window.__venjy;
        if (!v) throw new Error('el juego todavía no está listo');
        v.datosActividades = datos;
        const m = await import('../mundo/supervivencia/pose-jugador.js');
        m.ajustarPoses(datos.poses || {});
    } else if (nombre === 'rutinas') {
        // 6d etapa 2: rutinas.js mira las visitas cada `revisar` s (la próxima decisión ya usa lo nuevo)
        const v = window.__venjy;
        if (!v || !v.rutinas) throw new Error('el juego todavía no está listo');
        v.rutinas.fijar(datos);
    } else if (nombre === 'musica') {
        // musica-datos.js: musica.js y carrera-musica.js lo consultan en cada paso (el próximo paso ya suena con lo nuevo)
        const m = await import('../mundo/supervivencia/musica-datos.js');
        m.aplicarMusica(datos);
    } else {
        if (nombre === 'ui-layout' && window.__venjy) window.__venjy.datosUiLayout = datos; // salonas.js aplica su página al abrir
        aplicarDatosVivos(nombre, datos);
    }
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
    const hecho = c.ejecutar(d.destino ? '/tp ' + d.destino : `/tp ${d.x} ${d.y === undefined ? '' : d.y} ${d.z}`.replace(/\s+/g, ' '));
    if (!yaDev) c.ejecutar('/gamemode devenjy');
    // /tp dice si encontró el destino; si ya estabas ahí (el spawn de un mundo nuevo) la posición no cambia y está bien
    if (hecho === false || (hecho === undefined && [p.x, p.y, p.z].join() === antes)) throw new Error('el jugador no se movió: ¿existe el destino? (en el juego, /tp lista los destinos)');
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
const NEUTRO = { cx: 0, cy: 0, cz: 0, bDx: 0, bDz: 0, bIx: 0, bIz: 0, pDx: 0, pIx: 0, inc: 0, rz: 0, y: 0, salto: 0, pz: 0,
    bDy: 0, bIy: 0, ry: 0, codoD: 0, codoI: 0, rodD: 0, rodI: 0, pX: 0, pY: 0, pZ: 0, pDz: 0, pIz: 0, armaX: 0, armaZ: 0 };
// Los mismos ángulos que el juego (aplicarAngulos de pose-jugador.js: con codos, rodillas y pecho, recortado a los límites duros)
let aplicarAngulos = null;
function escribirPose(p, v) {
    aplicarAngulos(p, { ...v, y: v.y + v.salto });
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
    if (!aplicarAngulos) aplicarAngulos = (await import('../mundo/supervivencia/pose-jugador.js')).aplicarAngulos;
    escribirPose(n.p, reg.canales);
    n.p.g.updateMatrixWorld(true);
    const r3 = x => Math.round(x * 1000) / 1000;
    // la punta de la mano: el origen de la muñeca (punta del antebrazo) o, sin rig articulado, el extremo del brazo
    const punta = (b, mu) => { const w = n.p.g.worldToLocal(mu ? mu.localToWorld(new THREE.Vector3(0, 0, 0)) : b.localToWorld(new THREE.Vector3(0, -0.75, 0))); return { adelante: r3(w.z), altura: r3(w.y), lado: r3(w.x) }; };
    return { clave: o.clave, quieta: true, manoD: punta(n.p.brazoD, n.p.munecaD), manoI: punta(n.p.brazoI, n.p.munecaI) };
}

const juegoListo = () => !!(window.__venjy && window.__venjy.jugador && window.__venjy.consola);
const responder = crearManejador({
    listo: juegoListo,
    idioma: () => document.documentElement.lang === 'en' ? 'en' : 'es',
    aplicarDatos: aplicar,
    async mesa({ accion }) {
        const v = window.__venjy;
        if (!v || !v.abrirMesa) throw new Error('el juego todavía no está listo');
        // Gizmo de la mesa (B0-V): una copia junto a Lucho con la mesa cerrada; TransformControls se baja la primera vez
        if (accion === 'mover' || accion === 'girar' || accion === 'soltar') {
            if (!gizmoMesa) {
                if (accion === 'soltar') return null;
                if (!juegoListo()) throw new Error('el juego todavía no está listo');
                const m = await import('./gizmo-mesa.js');
                gizmoMesa = m.crearGizmoMesa(v, valor => decir({ tipo: 'cambio', nombre: 'cartas-mesa', ruta: 'mesa', valor }));
                v.estudioGizmoMesa = gizmoMesa; // depuración y pruebas
            }
            return gizmoMesa.elegir(accion === 'soltar' ? null : accion);
        }
        if (gizmoMesa) gizmoMesa.quitar(); // abrir o probar algo de la mesa suelta la copia
        if (accion === 'abrir') {
            if (!(v.mesaCartas && v.mesaCartas.activo)) v.abrirMesa('facil');
        } else if (accion === 'tutorial') {
            if (v.mesaCartas && v.mesaCartas.activo) v.mesaCartas.iniciarTutorial(); else v.abrirMesa('tutorial');
        } else if (accion === 'cerrar') { if (v.mesaCartas) v.mesaCartas.cerrar(); }
        else if (accion === 'sobre') { if (v.mesaCartas && v.mesaCartas.activo) v.mesaCartas.cerrar(); await v.probarSobre(); }
        else if (!v.mesaCartas || !v.mesaCartas.activo) throw new Error('primero abre la mesa');
        else if (accion === 'animar') { if (!v.mesaCartas.repetirAnimacion()) throw new Error('primero haz una jugada en la mesa'); }
        else v.mesaCartas.cambiarVista();
    },
    async carrera({ accion, pista }) {
        const v = window.__venjy;
        if (!v || !v.cargarCarrera) throw new Error('el juego todavía no está listo');
        const k = await v.cargarCarrera();
        if (!k) throw new Error('no se pudo cargar la carrera');
        if (pista && k.usarPista) k.usarPista(pista); // la pista que se edita en el Estudio
        if (accion === 'terminar') { k.terminar(); return; }
        if (accion === 'ver') { if (!k.ver()) throw new Error('ahora no se puede: cierra lo que tengas abierto'); return; }
        k.elegir(accion, 'normal');
    },
    async salonas({ accion, cancion, dificultad, seccion }) {
        const v = window.__venjy;
        if (!v || !v.cargarSalonas) throw new Error('el juego todavía no está listo');
        const s = await v.cargarSalonas();
        if (!s) throw new Error('no se pudo cargar Salonas');
        if (accion === 'terminar') { s.terminar(); return; }
        const r = s.probar({ cancion, dificultad, seccion });
        const motivos = {
            ocupado: 'ahora no se puede: cierra lo que tengas abierto', audio: 'haz clic en el juego una vez para activar el sonido y vuelve a probar',
            cancion: 'esa canción no está en la gira o no se pudo tocar', dificultad: 'dificultad no válida', seccion: 'esa sección no existe en el juego'
        };
        if (r !== 'ok') throw new Error(motivos[r] || 'no se pudo probar');
    },
    async arena({ accion }) {
        const v = window.__venjy;
        if (!v || !v.cargarArena) throw new Error('el juego todavía no está listo');
        const a = await v.cargarArena();
        if (!a) throw new Error('no se pudo cargar la arena');
        if (accion === 'terminar') { a.terminar(); return; }
        if (accion === 'abrir') { a.abrir(); return; }
        a.elegir(accion, 'normal');
    },
    // Pestaña Combate (N6c): probar un ataque o una reacción en la arena, o cerrarla
    async combate({ accion, estilo, ataque, reaccion, dificultad }) {
        const v = window.__venjy;
        if (!v || !v.cargarArena) throw new Error('el juego todavía no está listo');
        const a = await v.cargarArena();
        if (!a) throw new Error('no se pudo cargar la arena');
        if (accion === 'terminar') { if (a.activa) a.terminar(); return; }
        if (!a.probar({ estilo, accion: ataque, reaccion, dificultad })) throw new Error(a.activa ? 'la arena ya está abierta en otra cosa: ciérrala y vuelve a probar' : `la arena no tiene el estilo «${estilo}» o ahora no se puede abrir`);
    },
    // Pestaña Objetos: deja en tu mano (barra rápida) el objeto o bloque pedido, dándotelo si no lo tienes
    objeto({ clave }) {
        const v = window.__venjy;
        if (!v || !v.inventario || !v.O) throw new Error('el juego todavía no está listo');
        const id = /^\d+$/.test(clave) ? Number(clave) : v.O[String(clave).toUpperCase()];
        if (!id) throw new Error(`no hay un objeto «${clave}»`);
        if (!v.inventario.contar(id)) v.dar(id, 1);
        const casilla = v.inventario.casillas.findIndex((c, i) => i < 9 && c && c.id === id);
        if (casilla < 0) throw new Error('la barra rápida está llena: libera una casilla');
        v.inventario.elegida = casilla;
        if (v.inventario.alCambiar) v.inventario.alCambiar();
        return { id };
    },
    // Vista previa de un texto: el globo especial de misiones.js (el mismo de los diálogos únicos)
    globo(persona, texto) {
        const m = window.__venjy && window.__venjy.misiones;
        if (!m || !m.decir) throw new Error('el juego todavía no está listo');
        m.decir(persona, texto);
    },
    // Pestaña Música: vista previa de un tema en el juego (estudio/musica-juego.js, se carga la primera vez)
    async musica(o) {
        const m = await import('./musica-juego.js');
        m.musicaPrueba(o);
    },
    // Pestaña Vida: un amigo camina a un destino buscando camino (supervivencia/paseos.js); sin destino, cómo va
    caminar({ persona, destino }) {
        const v = window.__venjy;
        if (!v || !v.paseos) throw new Error('el juego todavía no está listo');
        if (!v.paseos.personas().includes(persona)) throw new Error(`no hay nadie llamado «${persona}» en este mundo`);
        if (destino && !v.paseos.ir(persona, destino)) throw new Error(`no conozco el destino «${destino}»`);
        return v.paseos.estado(persona);
    },
    // Pestaña Vida → Rutinas: probar una visita ahora (sin mirar la hora), cortarla o preguntar cómo va
    rutina({ accion, visita, persona }) {
        const v = window.__venjy;
        if (!v || !v.rutinas) throw new Error('el juego todavía no está listo');
        let quien = persona;
        if (visita) {
            const datos = v.rutinas.visitas();
            if (!datos.includes(visita)) throw new Error(`no hay una visita «${visita}» en este juego (¿guardaste o aplicaste rutinas.json?)`);
            quien = quien || v.rutinas.quienDe(visita);
        }
        if (accion === 'probar' && !v.rutinas.probar(visita)) throw new Error(`«${visita}» no se pudo hacer ahora (¿están las dos personas en este mundo?)`);
        if (accion === 'cortar' && quien) v.rutinas.cortar(quien);
        // 7i: que te siga (sin mirar la amistad) o que deje de seguirte
        if (accion === 'acompanar' && quien && !(v.acompanante && v.acompanante.invitar(quien, { forzar: true }))) throw new Error(`${quien} no puede acompañarte ahora`);
        if (accion === 'soltar' && quien && v.acompanante) v.acompanante.soltar(quien);
        return quien ? v.rutinas.estado(quien) : v.rutinas.resumen();
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
    // Punto 14: el juego no atrapa el mouse (sin pausa al soltarlo; el chat se cierra al perder el foco)
    (await import('./suelto.js')).soltarSinPausa(window.__venjy);
    // el juego ya pidió y aplicó los JSON al importar tactil-supervivencia.js; esto avisa que se puede hablar con él
    decir({ tipo: 'listo', version: 1, idioma: document.documentElement.lang === 'en' ? 'en' : 'es' });
    document.documentElement.dataset.estudio = 'listo';
} catch (err) {
    document.documentElement.dataset.estudio = 'error';
    decir({ tipo: 'error', mensaje: String((err && err.message) || err) });
    console.warn('[estudio]', err);
}
