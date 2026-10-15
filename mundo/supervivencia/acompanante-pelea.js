// =========================================================
// VENJY · Supervivencia · Peleas y órdenes del acompañante (7i PR 2)
// El amigo que te acompaña pelea solo con los monstruos a menos de `radio` de ti (con «Espérame aquí», de él), con el
// daño y el ritmo de una espada de piedra. Es invulnerable (los monstruos persiguen jugadores, no amigos), pero tiene
// `aguante`: cada monstruo pegado a él (a menos de `apretado`) se lo gasta como si le pegara; sin aguante «perdería» y se
// sienta `descanso` s a recuperarse («¡Son muchos! Me siento un rato.»). Sin monstruos cerca lo recupera de a poco.
//
// Órdenes (en «Hablar»): 'sigue' (lo básico: te sigue y decide solo cuándo pelear) · 'quieto' («Espérame aquí»: se queda
// donde se lo dijiste y defiende ese lugar) · 'tranquilo' («No pelees»: te sigue sin pelear).
//
// Cooperativo: el golpe a un monstruo de otro jugador va por la red con la posición del amigo (`atacante`) y su dueño lo
// valida con el historial del acompañante (coop.js, como los golpes del jugador).
// crearPeleaAcompanante() no usa three.js ni DOM (lo prueba mundo/tests/acompanante.mjs).
// Valores: PELEA_BASE + mundo/datos/navegacion.json → `pelea` (pestaña Vida del Estudio).
// =========================================================

export const PELEA_BASE = {
    radio: 6,           // pelea con monstruos a menos de esto de ti (con «Espérame aquí», de él) (bloques)
    alcance: 2.2,       // les pega desde esto (bloques, de centro a centro)
    dano: 5,            // daño por golpe (espada de piedra: 5)
    cadencia: 0.625,    // un golpe cada esto (s) (espada: 0,625)
    empuje: 0.45,       // cuánto empuja el golpe (el del jugador sin correr: 0,45)
    repensar: 0.5,      // persiguiendo: corrige hacia el monstruo cada esto (s)
    rendirse: 4,        // sin poder llegar a un monstruo durante esto (s), lo deja
    creepers: 0,        // 1 = también pelea con creepers (0: como los lobos, no se les acerca)
    aguante: 20,        // aguante (como la vida del jugador)
    apretado: 1.8,      // un monstruo a menos de esto se lo gasta (su daño por segundo)
    recupera: 1,        // sin monstruos cerca lo recupera a esto por segundo
    descanso: 10        // sin aguante se sienta esto (s) y vuelve con todo
};
let ajustesP = { ...PELEA_BASE };
// navegacion.json → `pelea` (ignora lo que no sea número finito)
export function fijarPelea(d) {
    ajustesP = { ...PELEA_BASE };
    if (d) for (const k of Object.keys(PELEA_BASE)) if (Number.isFinite(d[k])) ajustesP[k] = d[k];
    return ajustesP;
}
export const ajustesPelea = () => ajustesP;

export const ORDENES = ['sigue', 'quieto', 'tranquilo'];

// ctx: monstruos(x, z, r) → [{ tipo, x, y, z, dano, golpear(dano, origen) }] (coordenadas de los amigos),
// jugador → { x, y, z } (la posición del jugador, se lee cada cuadro), ajustes() (por defecto los de navegacion.json)
export function crearPeleaAcompanante(ctx) {
    const P = () => (ctx.ajustes ? ctx.ajustes() : ajustesP);
    const st = { orden: 'sigue', punto: null, aguante: P().aguante, sentado: 0, golpe: 0, objetivo: null, relojGolpe: 0, sinLlegar: 0, evento: null };

    function elegir(centro, cuerpo) {
        const A = P();
        let mejor = null, dm = Infinity;
        for (const o of ctx.monstruos(centro.x, centro.z, A.radio + 2)) {
            if (o.tipo === 'creeper' && !A.creepers) continue;
            if (Math.hypot(o.x - centro.x, o.z - centro.z) > A.radio || Math.abs(o.y - centro.y) > 4) continue;
            const d = Math.hypot(o.x - cuerpo.x, o.z - cuerpo.z);
            if (d < dm) { dm = d; mejor = o; }
        }
        return mejor;
    }

    const api = {
        get orden() { return st.orden; },
        get aguante() { return st.aguante; },
        get sentado() { return st.sentado > 0; },
        get golpe() { return st.golpe > 0; },
        get objetivo() { return st.objetivo; },
        get evento() { return st.evento; },
        estado: () => ({ orden: st.orden, aguante: Math.round(st.aguante * 10) / 10, sentado: st.sentado > 0, peleando: !!st.objetivo }),
        // Cambia la orden. cuerpo: dónde está (para «Espérame aquí»). false si ya era esa
        ordenar(orden, cuerpo) {
            if (!ORDENES.includes(orden) || orden === st.orden) return false;
            st.orden = orden;
            st.punto = orden === 'quieto' && cuerpo ? { x: cuerpo.x, y: cuerpo.y, z: cuerpo.z } : null;
            st.objetivo = null;
            return true;
        },
        // Al empezar a acompañarte: lo básico y con todo el aguante
        reiniciar() { st.orden = 'sigue'; st.punto = null; st.aguante = P().aguante; st.sentado = 0; st.golpe = 0; st.objetivo = null; st.evento = null; },
        // Un cuadro, antes de que te siga (paseos → mando). seg: su seguidor (mundo/seguir.js); cuerpo: { x, y, z, yaw }.
        // true = este cuadro lo mueve la pelea, la orden o el descanso (no te sigue). Deja en `evento` lo que hay que
        // decir: 'cansado' (se sienta) · 'listo' (se para) · 'pelea' (empieza a pelear)
        paso(dt, seg, cuerpo, detalle = true) {
            const A = P();
            st.evento = null;
            st.golpe = Math.max(0, st.golpe - dt);
            st.relojGolpe = Math.max(0, st.relojGolpe - dt);
            const yo = ctx.jugador();
            // Aguante: los monstruos pegados a él se lo gastan; sin ninguno lo recupera
            let gasto = 0;
            for (const o of ctx.monstruos(cuerpo.x, cuerpo.z, A.apretado + 1)) {
                if (Math.hypot(o.x - cuerpo.x, o.z - cuerpo.z) < A.apretado && Math.abs(o.y - cuerpo.y) < 2) gasto += o.dano || 0;
            }
            if (st.sentado > 0) {
                st.sentado -= dt;
                seg.quedarse(dt, null);
                if (st.sentado <= 0) { st.sentado = 0; st.aguante = A.aguante; st.evento = 'listo'; seg.dejar(); }
                return true;
            }
            st.aguante = gasto > 0 ? st.aguante - gasto * dt : Math.min(A.aguante, st.aguante + A.recupera * dt);
            if (st.aguante <= 0) {
                st.aguante = 0; st.sentado = A.descanso; st.objetivo = null; st.evento = 'cansado';
                seg.quedarse(dt, null);
                return true;
            }
            // ¿Con quién pelea? (con «No pelees», con nadie)
            const centro = st.orden === 'quieto' && st.punto ? st.punto : yo;
            if (st.orden !== 'tranquilo') {
                const sigue = st.objetivo && ctx.monstruos(st.objetivo.x, st.objetivo.z, 1).find(o => (o.mob || o.fantasma) === (st.objetivo.mob || st.objetivo.fantasma));
                const o = sigue && Math.hypot(sigue.x - centro.x, sigue.z - centro.z) <= A.radio + 1 ? sigue : elegir(centro, cuerpo);
                if (o) {
                    if (!st.objetivo) { st.evento = 'pelea'; st.sinLlegar = 0; }
                    st.objetivo = o;
                    const r = seg.perseguir(dt, o, { alcance: A.alcance, repensar: A.repensar, detalle });
                    if (r === 'torre') { st.objetivo = null; return false; }
                    if (r === 'alcance') {
                        st.sinLlegar = 0;
                        if (st.relojGolpe <= 0) {
                            st.relojGolpe = A.cadencia; st.golpe = 0.3;
                            o.golpear(A.dano, { x: cuerpo.x, z: cuerpo.z, fuerza: A.empuje, atacante: { x: cuerpo.x, y: cuerpo.y, z: cuerpo.z } });
                        }
                    } else if ((st.sinLlegar += dt) > A.rendirse) { st.objetivo = null; seg.dejar(); return false; }
                    return true;
                }
            }
            if (st.objetivo) { st.objetivo = null; seg.dejar(); }
            // «Espérame aquí»: vuelve a su lugar y se queda mirándote
            if (st.orden === 'quieto' && st.punto) {
                if (seg.irA(dt, st.punto, detalle)) seg.quedarse(dt, yo);
                return true;
            }
            return false;
        }
    };
    return api;
}
