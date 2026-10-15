// =========================================================
// VENJY · Supervivencia · Rutinas y visitas de los amigos (6d etapa 2, PR 2; incluye 7j-1 «acompañando»)
// Con la hora del mundo (reloj.js) cada amigo con visitas en mundo/datos/rutinas.json deja su sitio en su horario,
// camina (paseos.js, que busca camino sobre el terreno) a ver a otra persona o a un lugar, saluda al llegar con un
// gesto y una frase (y quien lo recibe contesta), se queda hasta que termina el tramo y vuelve a su sitio.
//
// Estados por persona: 'en-sitio' → 'yendo' → 'visitando' → 'volviendo' → 'en-sitio', más 'acompanando' (7j-1:
// cortado por el jugador, lo usará 7i). retomar(clave) suelta ese estado y sigue en el tramo que toca según la hora
// (si a esa hora tenía visita, va directo allá; si no, vuelve a su sitio). Lo que decide se mira cada
// `revisar` segundos, no en cada cuadro; el saludo solo se dibuja cerca del jugador (`radioSaludo`).
// Choques: una escena (`n.escena`: «Hablar», misiones, tienda, amistad, skin) no lo deja salir y paseos.js lo deja
// quieto donde va; `libre(n)` (main.js: ronda del iglú, minijuegos, jefes) tampoco; si la persona que iba a
// visitar no está en su sitio, espera. Si otro lo movió (/caminar, el Estudio) no lo pelea: espera a que vuelva.
// Te incluyen (PR 3): con amistad alta (`nivelIncluir`), quien anda de visita te saluda al pasar (gesto, mirada y frase
// de `incluir`), una vez cada `esperaIncluir` s. Cooperativo (PR 3): el anfitrión decide (sale, vuelve, no lo encontró)
// y lo manda con `red`; el invitado no mira la hora, solo aplica lo que llega (`recibir`) y su llegada y su saludo los
// dibuja él, porque cada equipo camina a sus amigos con sus propios chunks.
// crearRutinas() no usa three.js ni DOM (lo prueba mundo/tests/rutinas.mjs). Valores: rutinas-datos.js.
// =========================================================
import { ajustesRutinas, visitasRutinas, textosRutinas, ausenteRutinas, incluirRutinas, fijarRutinas } from './rutinas-datos.js';
import { enTramo } from './reloj.js';
import { ajustesNavegacion } from '../navegacion.js';
import { HORARIOS, LUGARES } from './horarios-datos.js';
export { fijarRutinas } from './rutinas-datos.js';

export const ESTADOS = ['en-sitio', 'yendo', 'visitando', 'volviendo', 'acompanando'];
// Texto del panel de cada amigo (Hablar, Misión y Tienda) según su estado; {quien} = a quien visita, {lugar} = dónde
export const TEXTOS_RUTINA = {
    yendo: { es: 'Va a ver a {quien}, {lugar}.', en: 'On the way to see {quien}, {lugar}.' },
    yendoLugar: { es: 'Va camino {lugar}.', en: 'On the way, {lugar}.' },
    visitando: { es: 'Está de visita donde {quien}, {lugar}.', en: 'Visiting {quien}, {lugar}.' },
    visitandoLugar: { es: 'Está de visita {lugar}.', en: 'Visiting, {lugar}.' },
    volviendo: { es: 'Va de vuelta, {lugar}.', en: 'Heading back, {lugar}.' },
    acompanando: { es: 'Te está acompañando.', en: 'Keeping you company.' }
};
const PARTES = { cx: ['cuello', 'x'], cy: ['cuello', 'y'], cz: ['cuello', 'z'], bDx: ['brazoD', 'x'], bDz: ['brazoD', 'z'], bIx: ['brazoI', 'x'], bIz: ['brazoI', 'z'], inc: ['cuerpo', 'x'], rz: ['cuerpo', 'z'] };
const suave = u => u * u * (3 - 2 * u);
const lim01 = v => Math.max(0, Math.min(1, v));
// Gesto encima de la pose que ya tiene (solo de la cintura para arriba: sirve sentado o de pie). El giro del cuello
// del gesto (cy) va sobre `cyBase` (hacia dónde mira: a quien visita o a quien lo visita).
export function ponerGesto(p, meta, w, cyBase = 0) {
    if (!meta || w <= 0) return;
    for (const [k, [parte, eje]] of Object.entries(PARTES)) {
        if (meta[k] === undefined || !p[parte]) continue;
        const r = p[parte].rotation, obj = k === 'cy' ? cyBase + meta[k] : meta[k];
        r[eje] += (obj - r[eje]) * w;
    }
}
// Giro del cuello (relativo a su cuerpo) para mirar de n a o, con tope para no torcerse
export function mirarA(n, o, tope = 1.1) {
    const a = Math.atan2(o.x - n.x, o.z - n.z) - (n.yaw || 0);
    return Math.max(-tope, Math.min(tope, Math.atan2(Math.sin(a), Math.cos(a))));
}
// Peso del gesto: entra y sale en 0,3 s (o un sexto del tramo si es corto)
const peso = (t, T) => { if (t < 0 || t > T) return 0; const r = Math.min(0.3, T / 6); return suave(lim01(Math.min(t / r, (T - t) / r))); };

// La visita que toca a esa hora para esa persona (la primera activa cuyo tramo incluye la hora). viaje(v): horas de
// camino; sale ese tanto antes de `de` para llegar a la hora.
export function visitaDeHora(visitas, quien, h, viaje = () => 0) {
    for (const v of Object.values(visitas)) {
        if (!v.activa || v.quien !== quien) continue;
        const sale = (((v.de - viaje(v)) % 24) + 24) % 24;
        if (enTramo(h, sale, v.a)) return v;
    }
    return null;
}
// Horas de camino para d bloques en línea recta (lejos del jugador, que es lo normal en un viaje largo)
export function horasDeViaje(d, A = ajustesRutinas(), N = ajustesNavegacion()) {
    if (!A.anticipar || !(d > 0)) return 0;
    return Math.min(12, (d * A.rodeo) / (N.velocidad * (N.rapidezLejos || 1)) / A.segundosHora * A.anticipar);
}

// ctx: { paseos (paseos.js), persona(clave) → n, hora() → 0-24, libre(n) → bool, jugador: { pos }, idioma() → 'es'|'en',
//        nombre(clave) → texto, cargarGestos() → Promise<(nombre) → (u, t, info) → meta> (moldes.js; opcional),
//        nivel(clave) → nivel de amistad con el jugador (0-4; opcional: sin él no te saludan al pasar) }
export function crearRutinas(ctx) {
    const { paseos, persona, jugador } = ctx;
    const R = {}; // clave → { estado, v (clave de la visita), t (s desde que llegó), forzada }
    let reloj = 0, gestoDe = null, cargando = null, tiempo = 0;
    // Cooperativo: null = solo; { enviar(m) } = anfitrión (manda lo que decide); 'seguir' = invitado (no decide solo)
    let red = null;
    const avisar = m => { if (red && red.enviar) red.enviar(m); };
    const idioma = () => (ctx.idioma ? ctx.idioma() : 'es');
    const L = o => (o ? o[idioma()] || o.es : '');
    const estadoDe = c => (R[c] ||= { estado: 'en-sitio', v: null, t: 0, ausente: NaN });
    // Qué hace si no encuentra a quien visita: lo de la visita (`ausente`) o lo general de rutinas.json / el código
    const ausenteDe = v => { const g = ausenteRutinas(), a = v.ausente || {}; return { gesto: a.gesto || g.gesto, texto: a.texto || g.texto }; };
    const dJ = n => (jugador ? Math.hypot(n.x - jugador.pos.x, n.z - jugador.pos.z) : 0);
    const visitas = () => visitasRutinas();
    const distancias = {}; // clave de visita → bloques en línea recta desde su sitio (se mide con la persona en su sitio)
    function viaje(v) {
        if (!(v.clave in distancias) || !Number.isFinite(distancias[v.clave])) {
            const n = persona(v.quien);
            if (!n || paseos.fuera(v.quien) || (v.visita && paseos.fuera(v.visita))) return 0;
            const o = v.visita ? persona(v.visita) : paseos.resolverDestino ? paseos.resolverDestino(v.lugar, n) : null;
            if (!o || !Number.isFinite(o.x)) return 0;
            distancias[v.clave] = Math.hypot(o.x - n.x, o.z - n.z);
        }
        return horasDeViaje(distancias[v.clave]);
    }

    function cargar() {
        if (!ctx.cargarGestos || cargando) return;
        cargando = Promise.resolve(ctx.cargarGestos()).then(f => { gestoDe = f; }).catch(() => { cargando = null; });
    }
    // La visita que quiere hacer ahora (la forzada por el Estudio manda sobre la hora)
    function deseada(c) {
        const r = estadoDe(c), V = visitas();
        if (r.forzada) return V[r.forzada] || null;
        const v = visitaDeHora(V, c, ctx.hora(), viaje);
        // No encontró a quien iba a ver: esa visita no se repite hasta que termine su tramo
        if (r.descartada) { if (v && v.clave === r.descartada) return null; r.descartada = null; }
        return v;
    }
    // ¿Puede salir ahora? Sin escena, sin minijuego ni ronda, sin que nadie venga a verlo, y con quien visita en el mundo
    function puede(n, v) {
        if (n.escena || (ctx.libre && !ctx.libre(n)) || lovisitan(n.clave)) return false;
        if (v.visita) {
            const o = persona(v.visita);
            // Va a la persona donde esté (paseos.js la sigue); no si no existe o si se la llevó el jugador
            if (!o || (R[v.visita] && R[v.visita].estado === 'acompanando')) return false;
        }
        return true;
    }
    function salir(c, v) {
        const destino = v.visita ? { persona: v.visita } : v.lugar;
        if (!paseos.ir(c, destino, { mirar: v.visita || null })) return false;
        const r = estadoDe(c);
        r.estado = 'yendo'; r.v = v.clave; r.t = 0; r.saludado = false; r.sinSaludo = false;
        avisar({ c, a: 'sale', v: v.clave });
        return true;
    }
    function volver(c) {
        const r = estadoDe(c);
        r.ausente = NaN;
        terminarSaludo(c);
        r.v = null; r.forzada = null;
        if (paseos.fuera(c)) { paseos.volver(c); r.estado = 'volviendo'; } else r.estado = 'en-sitio';
        avisar({ c, a: 'vuelve' });
    }

    // ---- Saludo al llegar: gesto y frase de quien llega; después contesta quien recibe ----
    function terminarSaludo(c) {
        const r = R[c], v = r && r.v && visitas()[r.v];
        const n = persona(c);
        if (r) r.inc = NaN;
        if (n && n.paseo) n.paseo.texto = '';
        paseos.adornar && paseos.adornar(c, null);
        // Quien recibía deja de mirarlo de a poco (el gancho se saca solo al terminar la salida)
        if (v && v.visita) { const o = persona(v.visita); if (o && o.visita && o.visita.de === c) { o.visita.fin = true; o.visita.texto = ''; } }
    }
    // saludar = false: lo alcanzó de nuevo después de que se alejara; se queda con él sin repetir el saludo
    function empezarSaludo(c, v, saludar = true) {
        const A = ajustesRutinas(), n = persona(c);
        if (!n) return;
        estadoDe(c).sinSaludo = !saludar;
        const cerca = dJ(n) < A.radioSaludo;
        if (!cerca && !A.saludoLejos) return;
        if (cerca) cargar();
        const r = estadoDe(c);
        // Quien llega: su gesto va encima de la animación de paseo (paseos.js → adornar)
        if (saludar && paseos.adornar) paseos.adornar(c, (dt, p) => {
            const g = v.llegada.gesto && gestoDe && gestoDe(v.llegada.gesto);
            if (g) ponerGesto(p, g(lim01(r.t / A.gesto), r.t, { s: false, j: false, esc: n.escala || 1 }), peso(r.t, A.gesto));
        });
        // Quien recibe: gancho n.visita mientras dure la visita (amigos.js lo dibuja encima de su animación de siempre y
        // usa su texto de globo): gira la cabeza hacia quien llegó, contesta con su gesto y su frase y lo sigue mirando
        const o = v.visita && persona(v.visita);
        if (o) {
            const h = {
                de: c, texto: '', w: 0, fin: false, base: 0, escrito: NaN,
                animar(dt = 1 / 60) {
                    h.w = lim01(h.w + (h.fin ? -dt : dt) / A.girar);
                    const cu = o.p.cuello && o.p.cuello.rotation;
                    // Giro de su animación de siempre: si no tocó el cuello desde el cuadro anterior, el que tenía antes de mirarlo
                    if (cu && cu.y !== h.escrito) h.base = cu.y;
                    if (h.fin && h.w <= 0) { if (cu) cu.y = h.base; if (o.visita === h) delete o.visita; return; }
                    if (!cu) return;
                    const cy = mirarA(o, n, A.cuello);
                    cu.y = h.base + (cy - h.base) * suave(h.w);
                    const t = r.t - A.respuesta;
                    const g = !h.fin && !r.sinSaludo && v.respuesta.gesto && gestoDe && gestoDe(v.respuesta.gesto);
                    if (g && t >= 0) ponerGesto(o.p, g(lim01(t / A.gesto), t, { s: false, j: false, esc: o.escala || 1 }), peso(t, A.gesto), cy);
                    h.escrito = cu.y;
                }
            };
            o.visita = h;
        }
    }
    // Globos del saludo según el tiempo desde que llegó
    function avanzarSaludo(c, dt) {
        const r = R[c], v = visitas()[r.v], n = persona(c);
        if (!v || !n) return;
        const A = ajustesRutinas();
        r.t += dt;
        const cerca = dJ(n) < A.radioSaludo;
        if (n.paseo) n.paseo.texto = !r.sinSaludo && cerca && v.llegada.texto && r.t < A.frase ? L(v.llegada.texto) : '';
        const o = v.visita && persona(v.visita);
        if (o && o.visita && o.visita.de === c && !r.sinSaludo) {
            const t = r.t - A.respuesta;
            o.visita.texto = cerca && v.respuesta.texto && t >= 0 && t < A.frase ? L(v.respuesta.texto) : '';
        }
        // La prueba del Estudio termina sola; si a esa hora le tocaba la misma visita, no la repite (no saluda dos veces)
        if (r.forzada && r.t > A.respuesta + Math.max(A.frase, A.gesto) + 4) { const k = r.v; volver(c); r.descartada = k; }
    }

    // ---- No encontró a quien venía a ver: se da cuenta, lo dice (si el jugador está cerca) con un gesto y vuelve ----
    function noEsta(c, v) {
        const r = estadoDe(c), n = persona(c), A = ajustesRutinas();
        terminarSaludo(c);
        r.ausente = 0;
        avisar({ c, a: 'noesta', v: v.clave });
        const acc = ausenteDe(v);
        if (dJ(n) < A.radioSaludo) cargar();
        if (paseos.adornar) paseos.adornar(c, (dt, p) => {
            const g = acc.gesto && gestoDe && gestoDe(acc.gesto);
            if (g) ponerGesto(p, g(lim01(r.ausente / A.gesto), r.ausente, { s: false, j: false, esc: n.escala || 1 }), peso(r.ausente, A.gesto));
        });
    }
    function avanzarAusente(c, dt) {
        const r = R[c], n = persona(c), A = ajustesRutinas();
        r.ausente += dt;
        const v = r.v && visitas()[r.v], acc = v ? ausenteDe(v) : null;
        if (n && n.paseo) n.paseo.texto = acc && acc.texto && dJ(n) < A.radioSaludo && r.ausente < A.frase
            ? L(acc.texto).replace('{quien}', ctx.nombre ? ctx.nombre(v.visita) : v.visita || '') : '';
        if (r.ausente >= A.esperaAusente) { r.ausente = NaN; const k = r.v; volver(c); r.descartada = k; }
    }
    // ¿Alguien viene a verlo o lo está visitando? Entonces no sale (que no lo encuentren vacío)
    const lovisitan = c => Object.values(R).some(r => (r.estado === 'yendo' || r.estado === 'visitando') && r.v && visitas()[r.v] && visitas()[r.v].visita === c);

    // ---- Te incluyen: con amistad alta, al pasar junto al jugador te mira, saluda y dice algo según lo que hace ----
    function fraseIncluir(c) {
        const r = R[c], I = incluirRutinas(), v = r.v && visitas()[r.v];
        const quien = v && v.visita ? (ctx.nombre ? ctx.nombre(v.visita) : v.visita) : '';
        const k = r.estado === 'volviendo' ? 'volviendo' : !quien ? 'paseo' : r.estado === 'visitando' ? 'visitando' : 'yendo';
        return L(I[k]).replace('{quien}', quien);
    }
    function quiereIncluir(c, n, r, A) {
        if (!ctx.nivel || !jugador || n.escena || Number.isFinite(r.inc) || Number.isFinite(r.ausente)) return false;
        if (r.estado !== 'yendo' && r.estado !== 'visitando' && r.estado !== 'volviendo') return false;
        // De visita, después del saludo con quien recibe (que no se pisen los globos)
        if (r.estado === 'visitando' && r.t < A.respuesta + A.frase) return false;
        if (tiempo - (r.incluido ?? -Infinity) < A.esperaIncluir) return false;
        if (dJ(n) > A.radioIncluir || Math.abs((jugador.pos.y ?? n.y) - n.y) > 4) return false;
        return ctx.nivel(c) >= A.nivelIncluir;
    }
    function empezarIncluir(c, n, r, A) {
        r.inc = 0; r.incluido = tiempo;
        cargar();
        const I = incluirRutinas();
        if (paseos.adornar) paseos.adornar(c, (dt, p) => {
            if (!Number.isFinite(r.inc)) return;
            const T = Math.max(A.frase, A.gesto), w = peso(r.inc, T), cy = mirarA(n, jugador.pos, A.cuello);
            if (p.cuello) p.cuello.rotation.y += (cy - p.cuello.rotation.y) * w;
            const g = I.gesto && gestoDe && gestoDe(I.gesto);
            if (g) ponerGesto(p, g(lim01(r.inc / A.gesto), r.inc, { s: false, j: false, esc: n.escala || 1 }), peso(r.inc, A.gesto), cy);
        });
    }
    function avanzarIncluir(c, dt) {
        const r = R[c], n = persona(c), A = ajustesRutinas();
        r.inc += dt;
        if (r.inc >= Math.max(A.frase, A.gesto)) {
            r.inc = NaN;
            if (n && n.paseo) n.paseo.texto = '';
            if (paseos.adornar) paseos.adornar(c, null);
            return;
        }
        if (n && n.paseo) n.paseo.texto = r.inc < A.frase ? fraseIncluir(c) : '';
    }
    function revisarIncluir() {
        if (!ctx.nivel || !jugador) return;
        const A = ajustesRutinas();
        for (const c of Object.keys(R)) {
            const n = persona(c), r = R[c];
            if (n && quiereIncluir(c, n, r, A)) empezarIncluir(c, n, r, A);
        }
    }

    // Llegó (paseos.js dice «allá»): si la persona está, saluda (o se queda sin repetir el saludo si ya la había
    // saludado) y devuelve true; si no está, false
    function llegar(c, n, r, v) {
        const o = v.visita && persona(v.visita);
        if (o && Math.hypot(o.x - n.x, o.z - n.z) > ajustesRutinas().radioEncuentro) return false;
        r.estado = 'visitando';
        if (!r.saludado) r.t = 0;
        empezarSaludo(c, v, !r.saludado);
        r.saludado = true;
        return true;
    }
    // Invitado del cooperativo: lo que decide el anfitrión llega por `recibir`; aquí solo lo que depende de cómo
    // caminan sus amigos en este equipo (llegar, seguir a quien se alejó, terminar de volver)
    function decidirInvitado() {
        for (const c of Object.keys(R)) {
            const n = persona(c), r = R[c];
            if (!n || r.estado === 'acompanando' || Number.isFinite(r.ausente)) continue;
            const v = r.v && visitas()[r.v], fuera = paseos.fuera(c);
            if (r.estado === 'yendo' && v && fuera && paseos.estado(c).estado === 'alla') llegar(c, n, r, v);
            else if (r.estado === 'visitando' && v) {
                const o = v.visita && persona(v.visita);
                if (o && Math.hypot(o.x - n.x, o.z - n.z) > ajustesRutinas().radioEncuentro * 1.5) { terminarSaludo(c); r.estado = 'yendo'; }
            } else if (r.estado === 'volviendo' && !fuera) r.estado = 'en-sitio';
        }
    }
    // Invitado: aplica un mensaje del anfitrión ({ c, a: 'sale' | 'vuelve' | 'noesta', v, ya }; no «e»: es el tipo del mensaje en la sala)
    function aplicar(m) {
        if (!m || typeof m.c !== 'string') return;
        const n = persona(m.c), r = estadoDe(m.c);
        if (!n || r.estado === 'acompanando') return; // a quien te acompaña lo maneja tu equipo
        const v = m.v && visitas()[m.v];
        if (m.a === 'sale' && v) {
            if (r.v === m.v && (r.estado === 'yendo' || r.estado === 'visitando')) return; // ya va (o ya está)
            terminarSaludo(m.c); r.ausente = NaN;
            if (salir(m.c, v) && m.ya) r.saludado = true; // entró a la sala con la visita empezada: llega sin saludar
        } else if (m.a === 'vuelve') {
            if (r.estado !== 'en-sitio' && r.estado !== 'volviendo') volver(m.c);
        } else if (m.a === 'noesta' && v && r.v === m.v && !Number.isFinite(r.ausente)) noEsta(m.c, v);
    }

    function decidir() {
        if (red === 'seguir') { decidirInvitado(); return; }
        const quienes = new Set([...Object.values(visitas()).map(v => v.quien), ...Object.keys(R)]);
        for (const c of quienes) {
            const n = persona(c);
            if (!n) continue;
            const r = estadoDe(c);
            if (r.estado === 'acompanando') continue;
            const v = deseada(c);
            const fuera = paseos.fuera(c);
            if (r.estado === 'en-sitio') {
                if (fuera) continue; // otro lo movió (/caminar, el Estudio): no lo pelea
                if (v && puede(n, v)) salir(c, v);
            } else if (Number.isFinite(r.ausente)) {
                continue; // está reaccionando a que no encontró a quien venía a ver (avanzarAusente lo devuelve)
            } else if ((r.estado === 'yendo' || r.estado === 'visitando') && v && v.visita && (!persona(v.visita) || (R[v.visita] && R[v.visita].estado === 'acompanando'))) {
                // A quien iba a ver se lo llevó el jugador (o ya no está en el mundo): de visita, se despide y vuelve; yendo,
                // se da cuenta («¿Y Braulio?») y vuelve
                if (r.estado === 'visitando') volver(c); else noEsta(c, v);
            } else if (r.estado === 'yendo') {
                if (!fuera) { r.estado = 'en-sitio'; r.v = null; } // lo mandaron a su sitio de golpe (volverTodos)
                else if (!v || v.clave !== r.v) { if (v && puede(n, v)) { terminarSaludo(c); salir(c, v); } else volver(c); }
                else if (paseos.estado(c).estado === 'atascado') noEsta(c, v); // no puede llegar hasta la persona
                // Llegó: ¿está la persona? (paseos.js la sigue si se mueve, pero puede no alcanzarla)
                else if (paseos.estado(c).estado === 'alla' && !llegar(c, n, r, v)) noEsta(c, v);
            } else if (r.estado === 'visitando') {
                const o = v && v.clave === r.v && v.visita && persona(v.visita);
                if (!fuera) { terminarSaludo(c); r.estado = 'en-sitio'; r.v = null; }
                else if (o && Math.hypot(o.x - n.x, o.z - n.z) > ajustesRutinas().radioEncuentro * 1.5) {
                    // Se le fue (lo mandaron a otra parte, salió caminando): deja de saludar y lo sigue (paseos.js);
                    // al alcanzarlo se queda con él sin repetir el saludo; si no puede, «¿Y Braulio?»
                    terminarSaludo(c); r.estado = 'yendo';
                }
                else if (!v || v.clave !== r.v) { if (v && puede(n, v)) { terminarSaludo(c); salir(c, v); } else volver(c); }
            } else if (r.estado === 'volviendo') {
                if (!fuera) r.estado = 'en-sitio';
                else if (v && puede(n, v)) salir(c, v);
            }
        }
    }

    return {
        actualizar(dt) {
            if (dt <= 0) return;
            tiempo += dt;
            for (const c of Object.keys(R)) {
                if (Number.isFinite(R[c].ausente)) avanzarAusente(c, dt);
                else if (R[c].estado === 'visitando') avanzarSaludo(c, dt);
                if (Number.isFinite(R[c].inc)) avanzarIncluir(c, dt); // después del saludo: su globo manda mientras dura
            }
            if ((reloj += dt) < ajustesRutinas().revisar) return;
            reloj = 0;
            decidir();
            revisarIncluir();
        },
        // Cooperativo (main.js): anfitrión → red({ enviar }), invitado → red('seguir'), sin sala → red(null)
        red(modo) { red = modo || null; },
        recibir(m) { if (red !== 'seguir' || !m) return; if (Array.isArray(m.l)) m.l.forEach(aplicar); else aplicar(m); },
        // Lo que va haciendo cada uno, para quien entra a la sala (el anfitrión se lo manda; el invitado lo pasa a `recibir`)
        foto: () => Object.entries(R).filter(([, r]) => r.v && (r.estado === 'yendo' || r.estado === 'visitando'))
            .map(([c, r]) => ({ c, a: 'sale', v: r.v, ...(r.estado === 'visitando' ? { ya: 1 } : {}) })),
        estado(c) {
            const r = R[c] || { estado: 'en-sitio', v: null };
            return { estado: r.estado, visita: r.v, forzada: !!r.forzada, paseo: paseos.estado(c) };
        },
        // 7j-1: el jugador se lo lleva (7i lo mueve con paseos.js). La rutina queda en pausa hasta retomar().
        acompanar(c) {
            const n = persona(c);
            if (!n) return false;
            const r = estadoDe(c);
            terminarSaludo(c);
            r.estado = 'acompanando'; r.v = null; r.forzada = null; r.ausente = NaN;
            // Quienes venían a verlo se devuelven (en el próximo `revisar`); quien lo visitaba deja de mirarlo
            if (n.visita) { n.visita.fin = true; n.visita.texto = ''; }
            return true;
        },
        // Retoma la rutina en el tramo que toca según la hora: si a esta hora tenía visita va directo allá; si no, a su sitio
        retomar(c) {
            const n = persona(c), r = estadoDe(c);
            if (!n) return false;
            r.estado = paseos.fuera(c) ? 'volviendo' : 'en-sitio';
            const v = deseada(c);
            if (v && puede(n, v)) salir(c, v);
            else if (r.estado === 'volviendo') paseos.volver(c);
            return true;
        },
        // Estudio (pestaña Vida → «Probar»): hace esa visita ahora, sin mirar la hora; null la corta y vuelve
        probar(claveVisita) {
            const v = visitas()[claveVisita];
            if (!v || !persona(v.quien)) return false;
            if (v.visita && R[v.visita] && R[v.visita].estado === 'acompanando') return false; // a quien va a ver lo tiene el jugador
            const r = estadoDe(v.quien);
            terminarSaludo(v.quien); // también saca de «acompanando»: lo pidió el dueño (Estudio o /rutina)
            r.forzada = claveVisita;
            if (!salir(v.quien, v)) { r.forzada = null; return false; }
            return true;
        },
        cortar(c) { if (R[c]) volver(c); },
        // Línea del panel de cada amigo («Está de visita donde Braulio, en el naufragio»); '' si está en su sitio
        texto(c, lengua) {
            const r = R[c];
            if (!r || r.estado === 'en-sitio') return '';
            const T = { ...TEXTOS_RUTINA, ...textosRutinas() };
            const Lx = o => (o ? o[lengua || idioma()] || o.es : '');
            if (r.estado === 'acompanando') return Lx(T.acompanando);
            const v = r.v && visitas()[r.v];
            const casa = HORARIOS[c] && LUGARES[HORARIOS[c].ancla];
            if (r.estado === 'volviendo' || !v) return Lx(T.volviendo).replace('{lugar}', Lx(casa) || '');
            const destino = v.visita ? HORARIOS[v.visita] && LUGARES[HORARIOS[v.visita].ancla] : LUGARES[v.lugar] || { es: v.lugar, en: v.lugar };
            const quien = v.visita ? (ctx.nombre ? ctx.nombre(v.visita) : v.visita) : '';
            const k = (r.estado === 'yendo' ? 'yendo' : 'visitando') + (v.visita ? '' : 'Lugar');
            return Lx(T[k]).replace('{quien}', quien).replace('{lugar}', Lx(destino) || '').replace(/,\s*\./, '.');
        },
        // Depuración (__venjy.rutinas): todo de un vistazo
        visitas: () => Object.keys(visitas()),
        quienDe: k => (visitas()[k] ? visitas()[k].quien : null),
        resumen: () => Object.fromEntries(Object.entries(R).map(([c, r]) => [c, `${r.estado}${r.v ? ' · ' + r.v : ''}`])),
        // Aplica rutinas.json (el juego al cargar, el Estudio en vivo) y vuelve a medir las distancias
        fijar(d) { fijarRutinas(d); for (const k of Object.keys(distancias)) delete distancias[k]; }
    };
}
