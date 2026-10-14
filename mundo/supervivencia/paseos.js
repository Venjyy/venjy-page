// =========================================================
// VENJY · Supervivencia · Paseos: los amigos dejan su sitio y caminan a otro punto (6d etapa 2)
// Mueve a las personas de amigos.js con la navegación de mundo/navegacion.js (buscar camino sobre el terreno,
// no rutas fijas). No decide adónde ir: eso lo piden las rutinas y visitas (rutinas.js), los comandos de depuración
// (/caminar) y el Estudio (pestaña Vida → «Probar»). Aquí solo: ir, quedarse de pie allá mirando a alguien y volver.
//
// Mientras una persona está fuera de su sitio lleva el gancho `n.paseo` (amigos.js): su animación de siempre
// (sentado, el bong, el hacha…) no corre; camina o queda de pie. Al volver, se acomoda en su sitio exacto, recupera
// su giro y suelta el gancho. Una escena (`n.escena`: «Hablar», amistad, skin) la deja quieta donde va y sigue al
// terminar. Rendimiento: el camino se busca por tramos con tope de nodos por cuadro (navegacion.js); lejos del
// jugador avanza a saltos (sin mirar bloques ni animar), y si no hay camino y nadie la ve, aparece allá.
// Valores: paseos-datos.js (PASEO_BASE) + mundo/datos/navegacion.json (`paseo`; `caminar` va a navegacion.js).
// =========================================================
import { consultaMundo, crearNavegador, crearCaminante, ajustesNavegacion, cercaPisable } from '../navegacion.js';
import { fijarPaseo, ajustesPaseo } from './paseos-datos.js';
import { TIPO } from '../texturas.js';
import { NIVEL_AGUA } from '../voxeles.js';
import { caminar, RADIO_VISIBLE } from '../criaturas/cuerpo.js';
import { cargarDatos } from '../datos/cargador.js';
import { resolverAncla } from '../datos/posiciones.js';
export { fijarPaseo } from './paseos-datos.js';

const k = (dt, v) => 1 - Math.exp(-v * dt);
const ir = (o, eje, v, f) => { o[eje] += (v - o[eje]) * f; };
// Pose de la persona al salir (algunas, como los sentados, se ponen una sola vez al crearlas): se devuelve al volver
const PARTES = ['cuerpo', 'torso', 'cuello', 'cabeza', 'brazoD', 'brazoI', 'piernaD', 'piernaI'];
function fotoPose(p) {
    const f = {};
    for (const k of PARTES) if (p[k]) f[k] = [p[k].position.x, p[k].position.y, p[k].position.z, p[k].rotation.x, p[k].rotation.y, p[k].rotation.z];
    return f;
}
function ponerPose(p, f) {
    for (const k of Object.keys(f)) { const v = f[k]; p[k].position.x = v[0]; p[k].position.y = v[1]; p[k].position.z = v[2]; p[k].rotation.x = v[3]; p[k].rotation.y = v[4]; p[k].rotation.z = v[5]; }
}
const sinTildes = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// ctx: { amigos, terreno, mundo (en las coordenadas de los amigos), jugador (ídem) }
export function crearPaseos({ amigos, terreno, mundo, jugador }) {
    const consulta = consultaMundo({ mundo, terreno, tipos: TIPO, dy: 0, nivelAgua: NIVEL_AGUA });
    const nav = crearNavegador(consulta);
    const activos = new Map(); // clave → estado del paseo
    cargarDatos('navegacion').then(d => { if (d) fijarPaseo(d); });
    const persona = c => amigos.lista.find(n => n.clave === c);
    let paseo = ajustesPaseo();

    // Destino a partir de un texto: 'aqui' (junto al jugador), 'sitio' (vuelve), una persona o un lugar (ancla)
    function resolverDestino(texto, desde) {
        const q = sinTildes(texto);
        if (q === 'aqui') return { x: jugador.pos.x, y: Math.round(jugador.pos.y), z: jugador.pos.z, mirar: 'jugador' };
        if (q === 'sitio' || q === 'casa') return { sitio: true };
        const otra = amigos.lista.find(n => n.clave === q || (q.length > 2 && n.clave.startsWith(q)));
        if (otra && otra !== desde) return { persona: otra.clave };
        const A = resolverAncla(terreno, q);
        if (A) return { x: A.x, z: A.z, y: Number.isFinite(A.y) ? A.y + 1 : undefined };
        return null;
    }
    // Punto junto a otra persona: del lado de quien llega, a `distanciaVisita`
    function junto(n, otra) {
        const dx = n.x - otra.x, dz = n.z - otra.z, d = Math.hypot(dx, dz) || 1;
        const r = ajustesPaseo().distanciaVisita;
        // Sin su altura todavía (Braulio y Conejeros buscan su suelo al cargarse su chunk: `cargado` false): sin y,
        // cercaPisable usa el mapa de alturas
        return { x: otra.x + dx / d * r, y: otra.cargado === false ? undefined : otra.y, z: otra.z + dz / d * r };
    }

    function soltar(a) {
        a.w.parar();
        ponerPose(a.n.p, a.pose);
        a.n.paseo = null;
        activos.delete(a.n.clave);
    }

    // Lleva a `clave` a `destino` (texto como resolverDestino, o { x, y?, z } o { persona }). opciones.mirar: clave de
    // persona, 'jugador' o null. Devuelve false si no existe la persona o el destino.
    function llevar(clave, destino, opciones = {}) {
        const n = persona(clave);
        if (!n) return false;
        if (typeof destino === 'string') destino = resolverDestino(destino, n);
        if (!destino) return false;
        let a = activos.get(clave);
        if (destino.sitio) {
            if (!a) return true; // ya está en su sitio
            a.vuelta = true; a.mirar = null; a.fallos = 0; a.espera = 0;
            a.w.ir({ x: a.casa.x, y: a.casa.y, z: a.casa.z });
            return true;
        }
        if (!a) {
            a = { n, casa: { x: n.x, y: n.y, z: n.z, yaw: n.yaw }, pose: fotoPose(n.p), cuerpo: { x: n.x, y: n.y, z: n.z, yaw: n.yaw }, amp: 0, espera: 0, acomoda: 0 };
            a.w = crearCaminante(nav, a.cuerpo);
            n.paseo = { animar: dt => animar(a, dt), texto: '' };
            activos.set(clave, a);
        }
        a.vuelta = false;
        a.mirar = opciones.mirar !== undefined ? opciones.mirar : destino.mirar || destino.persona || null;
        let p = destino;
        if (destino.persona) { const otra = persona(destino.persona); if (!otra) return false; p = junto(a.cuerpo, otra); }
        // El destino tiene que poder pisarse: el centro de un lugar suele estar dentro de la construcción
        const pis = cercaPisable(consulta, p.x, p.y, p.z, ajustesNavegacion());
        if (pis) p = pis;
        a.destino = p; a.fallos = 0; a.espera = 0;
        a.w.ir(p);
        return true;
    }

    // Animación mientras está fuera: de pie (sin la pose de sentado), caminando o quieto mirando a alguien
    function animar(a, dt) {
        const { n } = a, p = n.p;
        a.amp += ((a.w.moviendo ? paseo.amplitud : 0) - a.amp) * k(dt, 8);
        const f = k(dt, 10);
        ir(p.cuerpo.position, 'y', 0, f);
        ir(p.cuerpo.rotation, 'x', 0, f); ir(p.cuerpo.rotation, 'z', 0, f);
        ir(p.brazoD.rotation, 'z', 0, f); ir(p.brazoI.rotation, 'z', 0, f);
        ir(p.brazoD.rotation, 'y', 0, f); ir(p.brazoI.rotation, 'y', 0, f);
        ir(p.piernaD.rotation, 'z', 0, f); ir(p.piernaI.rotation, 'z', 0, f);
        ir(p.cuello.rotation, 'x', 0, f); ir(p.cuello.rotation, 'z', 0, f);
        if (a.amp > 0.01) caminar(p, a.w.fase, a.amp);
        else {
            ir(p.piernaD.rotation, 'x', 0, f); ir(p.piernaI.rotation, 'x', 0, f);
            ir(p.brazoD.rotation, 'x', Math.sin(n.t * 1.7) * 0.04, f); ir(p.brazoI.rotation, 'x', -Math.sin(n.t * 1.7) * 0.04, f);
        }
        // Cuello: hacia quien mira (de pie), o al frente caminando
        let cy = 0;
        if (!a.w.moviendo && a.mirarYaw !== undefined) {
            cy = Math.atan2(Math.sin(a.mirarYaw - n.yaw), Math.cos(a.mirarYaw - n.yaw));
            cy = Math.max(-0.9, Math.min(0.9, cy));
        }
        ir(p.cuello.rotation, 'y', cy, k(dt, 5));
        // Encima, de pie: el saludo al llegar de una visita (rutinas.js → adornar)
        if (a.adorno && !a.w.moviendo) a.adorno(dt, p);
        return true;
    }

    function actualizar(dt) {
        if (!activos.size || dt <= 0) { nav.actualizar(); return; }
        nav.actualizar();
        paseo = ajustesPaseo();
        const A = ajustesNavegacion();
        for (const a of [...activos.values()]) {
            const { n, w, cuerpo } = a;
            if (n.escena) { a.w.moviendo = false; continue; } // una escena lo tiene: espera donde está
            const dJ = Math.hypot(n.x - jugador.pos.x, n.z - jugador.pos.z);
            const antes = w.estado;
            const estado = w.actualizar(dt, { detalle: dJ < Math.min(A.radioDetalle, RADIO_VISIBLE) });
            if (estado === 'sin-camino') {
                // Nadie lo ve: aparece allá (como los lobos de Minecraft). Si lo ven, reintenta pocas veces y cada vez más
                // espaciado (`reintento`, el doble, …); de ida, al agotarlos se queda donde llegó; de vuelta espera a
                // que nadie lo vea para aparecer en su sitio. Nunca busca sin parar.
                if (dJ > RADIO_VISIBLE * 0.5) { const d = a.vuelta ? a.casa : a.destino; cuerpo.x = d.x; cuerpo.z = d.z; if (Number.isFinite(d.y)) cuerpo.y = d.y; w.estado = 'llego'; }
                else if (a.fallos >= paseo.reintentosVista) { if (!a.vuelta) w.estado = 'llego'; }
                else if ((a.espera += dt) > paseo.reintento * 2 ** a.fallos) { a.espera = 0; a.fallos++; w.ir(a.vuelta ? a.casa : a.destino); }
            }
            if (w.estado === 'llego' && antes !== 'llego') a.acomoda = 0;
            if (w.estado === 'llego' && a.vuelta) {
                // Se acomoda en su sitio exacto y suelta el gancho: vuelve su animación de siempre
                a.acomoda += dt;
                const u = Math.min(1, a.acomoda / Math.max(0.01, paseo.acomodar));
                cuerpo.x += (a.casa.x - cuerpo.x) * u; cuerpo.z += (a.casa.z - cuerpo.z) * u; cuerpo.y += (a.casa.y - cuerpo.y) * u;
                cuerpo.yaw += Math.atan2(Math.sin(a.casa.yaw - cuerpo.yaw), Math.cos(a.casa.yaw - cuerpo.yaw)) * u;
                if (u >= 1) { n.x = a.casa.x; n.y = a.casa.y; n.z = a.casa.z; n.yaw = a.casa.yaw; soltar(a); continue; }
            } else if (w.estado === 'llego' || w.estado === 'quieto') {
                // De pie allá: con piso bajo los pies (si llegó a saltos, lejos, puede haber quedado en el aire)
                if (dJ < Math.min(A.radioDetalle, RADIO_VISIBLE)) w.asentar(dt);
                // Gira hacia quien mira
                const o = a.mirar === 'jugador' ? (dJ < paseo.mirarJugador * 3 ? jugador.pos : null) : a.mirar ? persona(a.mirar) : (dJ < paseo.mirarJugador ? jugador.pos : null);
                if (o) {
                    a.mirarYaw = Math.atan2(o.x - cuerpo.x, o.z - cuerpo.z);
                    cuerpo.yaw += Math.atan2(Math.sin(a.mirarYaw - cuerpo.yaw), Math.cos(a.mirarYaw - cuerpo.yaw)) * k(dt, 3);
                } else a.mirarYaw = undefined;
            } else a.mirarYaw = undefined;
            n.x = cuerpo.x; n.y = cuerpo.y; n.z = cuerpo.z; n.yaw = cuerpo.yaw;
        }
    }

    return {
        nav, activos, resolverDestino,
        personas: () => amigos.lista.map(n => n.clave),
        // Lugares a los que se puede mandar a alguien (las anclas de posiciones.json que tiene este mundo)
        lugares: () => [...(terreno.lugares || []).map(l => l.clave), ...(terreno.escenario ? ['escenario'] : []), ...(terreno.faro ? ['faro'] : [])],
        ir: llevar,
        volver: clave => llevar(clave, { sitio: true }),
        // Todos a su sitio al tiro (al salir del mundo o para depurar)
        volverTodos() { for (const a of [...activos.values()]) { const { n } = a; n.x = a.casa.x; n.y = a.casa.y; n.z = a.casa.z; n.yaw = a.casa.yaw; soltar(a); } },
        fuera: clave => activos.has(clave),
        // Algo que se dibuja encima mientras está de pie allá (rutinas.js: el gesto al llegar); null lo saca
        adornar(clave, f) { const a = activos.get(clave); if (a) a.adorno = f || null; },
        estado(clave) {
            const a = activos.get(clave);
            if (!a) return { estado: 'en-sitio' };
            return { estado: a.vuelta ? (a.w.estado === 'llego' ? 'acomodando' : 'volviendo') : a.w.estado === 'llego' ? 'alla' : a.w.estado, restante: Math.round(a.w.restante), x: Math.round(a.cuerpo.x), z: Math.round(a.cuerpo.z), nodos: a.w.busqueda ? a.w.busqueda.nodos : 0 };
        },
        actualizar
    };
}
