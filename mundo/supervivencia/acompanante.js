// =========================================================
// VENJY · Supervivencia · Amigos acompañantes (7i)
// En «Hablar», con amistad `nivelAcompanar` o más: «¿Me acompañas?». El amigo corta su rutina (rutinas.acompanar; si
// iba a ver a alguien, lo dice), te sigue por tu rastro (paseos.seguir → mundo/seguir.js), espera si te alejas o no
// puede llegar («¡Espérame!») y aparece detrás de ti fuera de la vista si te alejas mucho. «Puedes volver»: se despide y
// retoma su rutina (vuelve a su sitio o va a la visita que le toca a esa hora). Uno a la vez por jugador: invitar a otro
// despide al anterior. No se guarda: al salir del mundo todos están en su sitio.
//
// Capas (mundo/NPC-VIDA.md §3): esto decide; paseos.js lo lleva y lo anima; seguir.js y navegacion.js lo mueven.
// Lo que depende de su lugar (su minijuego) sale con motivo (`motivoLugar`); el panel, misiones y tienda viajan con él.
// 7i PR 2: pelea con los monstruos cerca de ti, recibe órdenes en «Hablar» (Sígueme / Espérame aquí / No pelees) y
// si «perdería» se sienta a descansar (acompanante-pelea.js); arma su propia torre si te subes a un pilar (seguir.js).
// 7i PR 3: su mochila (`ajustes.mochila` casillas). En «Hablar», «Su mochila» la abre como un cofre: le das y le pides
// cosas. Sus torres, puentes y desatascos usan los bloques que lleva ahí (el que más tiene) y guardan lo que rompe. La
// primera vez que te acompaña trae `torreBloques` de tierra. Al despedirlo **se la queda** (con lo que le diste): se
// abre igual en «Hablar» y se guarda con el mundo (serializar / cargar; el invitado del cooperativo no guarda la suya).
//
// Cooperativo («decide uno y los demás dibujan»): el anfitrión lleva la lista de quién acompaña a quién y la manda a
// todos (`co { a: 'lista', l: { clave: id } }`); el invitado pide (`co { a: 'pide', k }`) y espera la lista para
// empezar; soltar es `co { a: 'suelta', k }`. Tu acompañante lo simula tu equipo y viaja dentro de tu `p` (`npc`); en
// los demás lo mueve la red (paseos.remoto / posar) y su panel dice «Está acompañando a …». Si su jugador sale de la
// sala, el anfitrión lo suelta y vuelve en todos; al cerrar la sala, todos vuelven.
// crearAcompanante() no usa three.js ni DOM (lo prueba mundo/tests/acompanante.mjs). Textos: rutinas.json → acompanar.
// =========================================================
import { ajustesRutinas, acompanarRutinas } from './rutinas-datos.js';
import { HORARIOS, LUGARES } from './horarios-datos.js';
import { crearPeleaAcompanante, ORDENES } from './acompanante-pelea.js';
import { ajustesSeguir } from '../seguir.js';

const r2 = v => Math.round(v * 100) / 100;

// ctx: paseos, rutinas, persona(c), nivel(c) (amistad), nombre(c), idioma(), libre(n) (sin minijuego, ronda ni jefe),
// pausa() (el jugador está en un minijuego o una escena: el acompañante espera donde está), avisar(texto) (HUD),
// monstruos(x, z, r) y jugadorPos() (para pelear, en las coordenadas de los amigos), torre { poner, quitar, romper },
// mochila: { esBloque(id) (se puede poner en torres y puentes), apila(id), inicial (id del bloque con que parte),
// abrir(c, casillas, titulo), soltar(id, n, persona) (lo que no le cabe) }
export function crearAcompanante(ctx) {
    const { paseos, rutinas, persona } = ctx;
    let mio = null;            // clave del amigo que te acompaña (lo simula este equipo)
    let pedido = null;         // invitado: { k, t } esperando la lista del anfitrión
    const ajenos = new Map();  // clave → id del jugador al que acompaña (cooperativo; lo mueve la red)
    const mochilas = new Map(); // clave → casillas ({ id, n, d } o null): se la queda al despedirlo
    let lista = {};            // anfitrión: clave → id de quien acompaña (incluye los suyos)
    let red = null;            // null = solo; { yo, anfitrion, enviar(m), nombre(id) }
    const idioma = () => (ctx.idioma ? ctx.idioma() : 'es');
    const L = o => (o ? o[idioma()] || o.es : '');
    const T = () => acompanarRutinas();
    const nombre = c => (ctx.nombre ? ctx.nombre(c) : c);
    const lugarDe = c => L(HORARIOS[c] && LUGARES[HORARIOS[c].ancla]);
    const con = (o, vars) => L(o).replace('{quien}', vars.quien || '').replace('{lugar}', vars.lugar || '');
    const pelea = crearPeleaAcompanante({ monstruos: ctx.monstruos || (() => []), jugador: ctx.jugadorPos || (() => ({ x: 0, y: 0, z: 0 })) });
    // Botón y respuesta de cada orden (rutinas.json → acompanar)
    const ORDEN_TX = { sigue: ['ordenSigue', 'diceSigue'], quieto: ['ordenQuieto', 'diceQuieto'], tranquilo: ['ordenTranquilo', 'diceTranquilo'] };

    // ¿Por qué no puede acompañarte ahora? null = puede. { nivel } = le falta amistad (Hablar lo muestra con su nombre)
    function motivo(c) {
        const n = persona(c);
        if (!n) return { texto: L(T().ahoraNo) };
        if (mio === c) return null;
        if (ajenos.has(c)) return { texto: con(T().ocupado, { quien: red ? red.nombre(ajenos.get(c)) : '' }) };
        const nv = ajustesRutinas().nivelAcompanar;
        if (ctx.nivel && ctx.nivel(c) < nv) return { nivel: nv };
        if (ctx.libre && !ctx.libre(n)) return { texto: L(T().ahoraNo) };
        return null;
    }
    // ---- Su mochila ----
    const MO = ctx.mochila || {};
    const esBloque = id => (MO.esBloque ? MO.esBloque(id) : id > 0 && id < 256);
    const apila = id => (MO.apila ? MO.apila(id) : 64);
    function mochila(c) {
        const n = Math.max(1, ajustesRutinas().mochila | 0);
        let m = mochilas.get(c);
        if (!m) {
            m = new Array(n).fill(null);
            // La primera vez trae sus bloques de tierra para torres y puentes
            let resto = (ajustesSeguir().torreBloques | 0), k = 0;
            if (MO.inicial) while (resto > 0 && k < n) { const q = Math.min(resto, apila(MO.inicial)); m[k++] = { id: MO.inicial, n: q, d: 0 }; resto -= q; }
            mochilas.set(c, m);
        }
        while (m.length < n) m.push(null); // (si la achican no pierde nada: las de más quedan hasta que se vacíen)
        return m;
    }
    const vacia = m => !m || m.every(p => !p);
    // Lo que usa el seguidor: cuántos bloques lleva, sacar uno (del que más tiene) y guardar lo que rompe o recupera
    function mochilaSeguidor(c) {
        return {
            cuantos() { let n = 0; for (const p of mochila(c)) if (p && esBloque(p.id)) n += p.n; return n; },
            sacar() {
                const m = mochila(c), tot = new Map();
                for (const p of m) if (p && esBloque(p.id)) tot.set(p.id, (tot.get(p.id) || 0) + p.n);
                let id = 0;
                for (const [k, v] of tot) if (!id || v > tot.get(id)) id = k;
                if (!id) return 0;
                for (let k = m.length - 1; k >= 0; k--) if (m[k] && m[k].id === id) { if (--m[k].n <= 0) m[k] = null; break; }
                return id;
            },
            guardar(id, n = 1) {
                const m = mochila(c), max = apila(id);
                for (const p of m) if (n > 0 && p && p.id === id && !p.p && !p.d && p.n < max) { const q = Math.min(n, max - p.n); p.n += q; n -= q; }
                for (let k = 0; k < m.length && n > 0; k++) if (!m[k]) { const q = Math.min(n, max); m[k] = { id, n: q, d: 0 }; n -= q; }
                if (n > 0 && MO.soltar) MO.soltar(id, n, persona(c)); // no le cabe: lo deja en el suelo
            }
        };
    }

    // Empieza a seguirte en este equipo (ya decidido: solo, anfitrión o con la lista del anfitrión)
    function empezar(c) {
        if (mio && mio !== c) soltarLocal(mio, 'cambia', c);
        const e = rutinas.estado(c);
        const iba = (e.estado === 'yendo' || e.estado === 'visitando') && e.visita && rutinas.destinoDe ? rutinas.destinoDe(e.visita) : null;
        rutinas.acompanar(c);
        pelea.reiniciar();
        const seguir = {
            pausa: ctx.pausa, torre: { ...(ctx.torre || {}), mochila: mochilaSeguidor(c) },
            mando: (dt, seg, cuerpo, detalle) => pelea.paso(dt, seg, cuerpo, detalle),
            marcas: () => (pelea.golpe ? 1 : 0) | (pelea.sentado ? 2 : 0)
        };
        if (!paseos.seguir(c, seguir)) return false;
        mio = c;
        const t = T();
        rutinas.decir(c, iba ? con(t.corta, { quien: nombre(iba) }) : L(t.acepta), t.gestoAcepta || null);
        return true;
    }
    // Deja de seguirte en este equipo y retoma su rutina. porque: 'despide' | 'cambia' (otro toma su lugar) | '' (sin frase)
    function soltarLocal(c, porque = 'despide', nuevo = null) {
        if (mio !== c) return false;
        mio = null;
        rutinas.retomar(c); // con visita a esta hora va directo allá; si no, paseos.volver (suelta el seguidor)
        if (paseos.siguiendo(c)) paseos.volver(c);
        const t = T();
        const frase = porque === 'cambia' ? con(t.cambia, { quien: nombre(nuevo) }) : porque === 'despide' ? con(t.despide, { lugar: lugarDe(c) }) : '';
        if (frase) rutinas.decir(c, frase, t.gestoDespide || null);
        return true;
    }

    // ---- Cooperativo ----
    function difundir() { if (red && red.anfitrion) red.enviar({ a: 'lista', l: { ...lista } }); }
    // La lista de quién acompaña a quién (la manda el anfitrión; él la aplica igual)
    function aplicarLista(l) {
        l = l || {};
        // Los que ya no están (o ahora son de otro): la red deja de moverlos y retoman su rutina
        for (const [k, id] of [...ajenos]) {
            if (l[k] === id) continue;
            ajenos.delete(k);
            paseos.remoto(k, false);
            if (l[k] !== red.yo) { rutinas.retomar(k); if (paseos.fuera(k) && !paseos.siguiendo(k) && !paseos.enRed(k)) paseos.volver(k); }
        }
        for (const [k, id] of Object.entries(l)) {
            if (!persona(k)) continue;
            if (id === red.yo) {
                if (pedido && pedido.k === k) { pedido = null; empezar(k); }
                continue;
            }
            if (ajenos.get(k) === id) continue;
            if (mio === k) { mio = null; paseos.remoto(k, true); } // (no debería pasar: el anfitrión lo dio a otro)
            ajenos.set(k, id);
            paseos.remoto(k, true);
            rutinas.acompanar(k, red.nombre(id));
        }
        // Mi pedido lo tomó otro antes
        if (pedido && l[pedido.k] && l[pedido.k] !== red.yo) {
            const k = pedido.k; pedido = null;
            if (ctx.avisar) ctx.avisar(`${nombre(k)}: ${con(T().ocupado, { quien: red.nombre(l[k]) })}`);
        }
        // Me lo quitaron (el anfitrión ya no me lo tiene): deja de seguirme
        if (mio && l[mio] !== red.yo) soltarLocal(mio, '');
    }

    const api = {
        get mio() { return mio; },
        pelea,
        // 'yo' si te acompaña a ti, el id del jugador si acompaña a otro, o null
        de: c => (mio === c ? 'yo' : ajenos.get(c) || null),
        motivo,
        // Para «Hablar»: { mio, texto del botón, motivo { texto } | { nivel } | null }
        hablar(c) {
            const t = T();
            // Su mochila: mientras te acompaña o si se quedó con algo tuyo (no si acompaña a otro jugador)
            const mo = (mio === c || (!ajenos.has(c) && !vacia(mochilas.get(c)))) ? { texto: L(t.mochila) } : null;
            if (mio === c) return { mio: true, texto: L(t.soltar), motivo: null, mochila: mo, ordenes: ORDENES.map(o => ({ orden: o, texto: L(t[ORDEN_TX[o][0]]), activa: pelea.orden === o })) };
            return { mio: false, texto: L(t.boton), motivo: pedido && pedido.k === c ? { texto: '…' } : motivo(c), mochila: mo };
        },
        // opciones.forzar: sin mirar la amistad ni si está libre (/rutina <persona> acompanar)
        invitar(c, opciones = {}) {
            if (!persona(c)) return false;
            if (mio === c) return true;
            const m = motivo(c);
            if (m && !(opciones.forzar && !ajenos.has(c))) return false;
            if (red && !red.anfitrion) { pedido = { k: c, t: 0 }; red.enviar({ a: 'pide', k: c }); return true; }
            if (red && red.anfitrion) {
                if (mio) delete lista[mio];
                lista[c] = red.yo; difundir();
            }
            return empezar(c);
        },
        soltar(c = mio, porque = 'despide') {
            if (!c || mio !== c) return false;
            if (red) {
                if (red.anfitrion) { delete lista[c]; difundir(); } else red.enviar({ a: 'suelta', k: c });
            }
            return soltarLocal(c, porque);
        },
        // Órdenes (7i PR 2): 'sigue' (lo básico) · 'quieto' («Espérame aquí») · 'tranquilo' («No pelees»)
        ordenar(orden, c = mio) {
            if (!c || mio !== c) return false;
            const antes = pelea.orden;
            if (!pelea.ordenar(orden, persona(c))) return false;
            const s = paseos.seguidor(c);
            if (antes === 'quieto' && s) s.dejar();
            const t = T();
            rutinas.decir(c, L(t[ORDEN_TX[orden][1]]), orden === 'quieto' ? null : t.gestoAcepta || null);
            return true;
        },
        // Su mochila (7i PR 3): las casillas, para darle y pedirle cosas (MO.abrir la muestra como un cofre)
        mochila,
        abrirMochila(c = mio) {
            if (!c || !persona(c) || ajenos.has(c)) return null;
            const m = mochila(c), t = T();
            rutinas.decir(c, L(t.abreMochila));
            if (MO.abrir) MO.abrir(c, m, con(t.tituloMochila, { quien: nombre(c) }));
            return m;
        },
        // Para el guardado del mundo: { clave: casillas } (solo las que tienen algo)
        serializar() {
            const o = {};
            for (const [k, m] of mochilas) if (!vacia(m)) o[k] = m.map(p => (p ? { ...p } : null));
            return o;
        },
        cargar(o) {
            mochilas.clear();
            for (const [k, m] of Object.entries(o || {})) if (Array.isArray(m)) mochilas.set(k, m.map(p => (p && Number.isFinite(p.id) && p.n > 0 ? { ...p } : null)));
        },
        // Lo que depende de su lugar (su minijuego): el motivo para dejarlo apagado, o null
        motivoLugar(c) {
            if (mio === c) return con(T().lugar, { quien: nombre(c), lugar: lugarDe(c) });
            if (ajenos.has(c)) return con(T().ocupado, { quien: red ? red.nombre(ajenos.get(c)) : '' });
            return null;
        },
        // Cada cuadro, después de paseos.actualizar: lo que dice al esperar y si lo soltaron desde otra parte
        actualizar(dt) {
            if (pedido && (pedido.t += dt) > 4) pedido = null; // el anfitrión no contestó: se puede pedir de nuevo
            if (!mio) return;
            if (!paseos.siguiendo(mio)) {
                // Lo soltaron desde otra parte (volverTodos, /caminar, el Estudio): ya no te acompaña
                const c = mio; mio = null;
                if (red) { if (red.anfitrion) { delete lista[c]; difundir(); } else red.enviar({ a: 'suelta', k: c }); }
                if (rutinas.estado(c).estado === 'acompanando') rutinas.retomar(c);
                return;
            }
            const s = paseos.seguidor(mio), t = T();
            if (s && s.evento === 'espera') rutinas.decir(mio, L(t.espera));
            if (s && s.evento === 'sinBloques') rutinas.decir(mio, L(t.sinBloques));
            if (pelea.evento === 'cansado') rutinas.decir(mio, L(t.cansado));
            else if (pelea.evento === 'listo') rutinas.decir(mio, L(t.listo));
        },
        // Cooperativo (main.js): red({ yo, anfitrion, enviar, nombre }) al entrar a una sala; red(null) al salir (todos vuelven)
        red(modo) {
            if (!modo) {
                for (const k of [...ajenos.keys()]) { ajenos.delete(k); paseos.remoto(k, false); rutinas.retomar(k); if (paseos.fuera(k) && !paseos.siguiendo(k)) paseos.volver(k); }
                if (mio) soltarLocal(mio, '');
                red = null; lista = {}; pedido = null;
                return;
            }
            if (mio) soltarLocal(mio, ''); // al abrir o entrar a una sala se parte de cero (el anfitrión no lo tiene en su lista)
            red = modo; lista = {}; pedido = null;
        },
        // Mensaje `co` (coop.js pone `de`, el id de quien lo mandó)
        recibir(m) {
            if (!red || !m) return;
            if (m.a === 'lista') { aplicarLista(m.l); return; }
            if (!red.anfitrion || typeof m.k !== 'string' || !persona(m.k)) return;
            if (m.a === 'pide') {
                // Uno por amigo; uno por jugador (si ya tenía otro, el anterior queda libre)
                if (!lista[m.k]) { for (const [k, id] of Object.entries(lista)) if (id === m.de) delete lista[k]; lista[m.k] = m.de; }
                if (lista[m.k] === red.yo && mio !== m.k) delete lista[m.k]; // (no debería pasar)
            } else if (m.a === 'suelta' && lista[m.k] === m.de) delete lista[m.k];
            difundir();
            aplicarLista(lista);
        },
        // Anfitrión: entró alguien (le manda la lista) / salió (suelta los suyos en todos)
        entro() { difundir(); },
        salio(id) {
            if (!red || !red.anfitrion) return;
            let cambio = false;
            for (const [k, v] of Object.entries(lista)) if (v === id) { delete lista[k]; cambio = true; }
            if (cambio) { difundir(); aplicarLista(lista); }
        },
        // Lo que viaja dentro de tu `p`: [clave, x, y, z, yaw, marcas (1 golpea, 2 sentado)] en las coordenadas de los
        // amigos (o null)
        pose() {
            const n = mio && persona(mio);
            return n ? [mio, r2(n.x), r2(n.y), r2(n.z), r2(n.yaw), (pelea.golpe ? 1 : 0) | (pelea.sentado ? 2 : 0)] : null;
        },
        // El acompañante de otro jugador, ya interpolado (coop.js, cada cuadro)
        dibujar(id, k, o) { if (ajenos.get(k) === id) paseos.posar(k, o); }
    };
    return api;
}
