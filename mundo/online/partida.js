// =========================================================
// VENJY · Partida Skywars
// Estados: lobby (mundo normal) -> cuenta -> jugando -> fin -> lobby.
// Cada cliente decide su propio daño y su muerte (solo amigos, sin antitrampas);
// el resto de los clientes solo se entera por Broadcast ('golpe', 'muerte').
// El final de la ronda lo calcula cada cliente igual, a partir de los mismos mensajes.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { B } from '../texturas.js';
import { crearTerrenoArena, botinDe, ARMAS, VACIO_Y, TAM_ARENA } from './arena.js';

const VIDA_MAX = 20;
const ALCANCE_GOLPE = 3.6;
const ENFRIAMIENTO = 0.5;
const INVULNERABLE = 0.4;
const CUENTA = 5;
const PAUSA_FIN = 7;
const MIN_JUGADORES = 2;

const TXT = {
    es: {
        iniciar: 'Iniciar partida Skywars', necesitas: 'Necesitas al menos 2 jugadores en la sala.', enJuego: 'Partida en curso',
        preparados: 'Prepárense', pelea: '¡A pelear!', gana: 'Gana', empate: 'Empate', ronda: 'Ronda',
        vacio: 'Caíste al vacío', mato: 'Te eliminó', eliminaste: 'Eliminaste a', espectador: 'Eres espectador hasta la próxima ronda',
        cofre: 'Cofre', armadura: 'Armadura', vida: 'Vida', volver: 'Volviendo al mundo…', mejora: 'Mejora', curacion: 'curación',
        nuevaArma: 'Nueva arma', nuevaArmadura: 'Armadura'
    },
    en: {
        iniciar: 'Start Skywars match', necesitas: 'You need at least 2 players in the room.', enJuego: 'Match in progress',
        preparados: 'Get ready', pelea: 'Fight!', gana: 'Winner:', empate: 'Draw', ronda: 'Round',
        vacio: 'You fell into the void', mato: 'Eliminated by', eliminaste: 'You eliminated', espectador: 'You are a spectator until next round',
        cofre: 'Chest', armadura: 'Armor', vida: 'Health', volver: 'Returning to the world…', mejora: 'Upgrade', curacion: 'healing',
        nuevaArma: 'New weapon', nuevaArmadura: 'Armor'
    }
};

export function iniciarPartida(api) {
    const { sala, avatares, edicion, ctx } = api;
    const { mundo, jugador, camara, hudEl, idioma, gatas } = ctx;
    const t = TXT[idioma] || TXT.es;

    const p = {
        fase: 'lobby', ronda: sala.ronda || 0, participantes: [], vivos: new Set(), iniciador: null,
        espectador: false, muerto: false, vida: VIDA_MAX, arma: 0, armadura: 0,
        victorias: new Map(), enfriamiento: 0, invulnerable: 0, reloj: 0, cuentaLista: false,
        terrenoLibre: mundo.terreno, terrenoArena: null, posLibre: null, ultimoEstado: 0, avisoHasta: 0
    };
    api.partida = p;
    api.enArena = false;

    // ---- HUD ----
    const aviso = document.createElement('div');
    aviso.className = 'aviso-partida';
    aviso.hidden = true;
    const avisoTitulo = document.createElement('span');
    const avisoSub = document.createElement('small');
    aviso.append(avisoTitulo, avisoSub);
    const barra = document.createElement('div');
    barra.className = 'barra-vida';
    barra.hidden = true;
    const relleno = document.createElement('i');
    barra.appendChild(relleno);
    const equipo = document.createElement('div');
    equipo.className = 'estado-combate';
    equipo.hidden = true;
    hudEl.append(aviso, barra, equipo);

    const mostrarAviso = (titulo, sub = '', segundos = 0) => {
        avisoTitulo.textContent = titulo;
        avisoSub.textContent = sub;
        aviso.hidden = !titulo;
        p.avisoHasta = segundos ? performance.now() + segundos * 1000 : 0;
    };
    const pintarEquipo = () => {
        relleno.style.width = Math.max(0, p.vida / VIDA_MAX * 100) + '%';
        equipo.textContent = `${ARMAS[p.arma].nombre[idioma] || ARMAS[p.arma].nombre.es} · ${t.armadura} ${p.armadura} · ${t.vida} ${Math.max(0, Math.ceil(p.vida))}`;
    };
    const destello = () => {
        const d = document.createElement('div');
        d.className = 'destello-dano';
        hudEl.appendChild(d);
        setTimeout(() => d.remove(), 400);
    };
    const nombreDe = id => (id === sala.id ? sala.nombre : (sala.jugadores.get(id) || {}).nombre || '?');

    // ---- Botón del lobby ----
    const caja = document.createElement('div');
    caja.className = 'partida-caja';
    caja.hidden = true;
    const btnIniciar = document.createElement('button');
    btnIniciar.type = 'button';
    btnIniciar.className = 'boton';
    btnIniciar.textContent = t.iniciar;
    btnIniciar.setAttribute('data-es', TXT.es.iniciar);
    btnIniciar.setAttribute('data-en', TXT.en.iniciar);
    const nota = document.createElement('p');
    nota.className = 'estado';
    caja.append(btnIniciar, nota);
    api.extra.appendChild(caja);
    const refrescarBoton = () => {
        const n = sala.jugadores.size + 1;
        const lobby = p.fase === 'lobby';
        btnIniciar.disabled = !lobby || n < MIN_JUGADORES;
        nota.textContent = !lobby ? t.enJuego : (n < MIN_JUGADORES ? t.necesitas : '');
    };
    sala.en('jugadores', refrescarBoton);

    // ---- Mundo: cambiar a la arena y volver ----
    function ocultarMundoNormal(oculto) {
        for (const g of (gatas && gatas.gatas) || []) {
            if (g.g) g.g.visible = !oculto;
            if (g.nombreSprite) g.nombreSprite.visible = !oculto && g.nombreSprite.visible;
        }
        const mm = hudEl.querySelector('.mm-pequeno');
        if (mm) mm.hidden = oculto;
        const zona = document.getElementById('zona');
        if (zona && oculto) zona.hidden = true;
        api.enArena = oculto;
    }
    function ajustarOcultos() {
        for (const a of avatares.lista.values()) a.oculto = (a.mu || 'libre') !== api.mundoActual;
    }

    function entrarArena({ espectador }) {
        p.posLibre = { x: jugador.pos.x, y: jugador.pos.y, z: jugador.pos.z, yaw: jugador.yaw, pitch: jugador.pitch, vuela: jugador.vuela };
        p.terrenoArena = crearTerrenoArena();
        mundo.cambiarTerreno(p.terrenoArena);
        jugador.limites = { x: p.terrenoArena.BW, z: p.terrenoArena.BD };
        api.mundoActual = 'arena';
        ocultarMundoNormal(true);
        ajustarOcultos();
        jugador.vacio = { y: VACIO_Y, alCaer: () => morir('vacio', null) };
        p.espectador = espectador;
        p.muerto = false;
        p.vida = VIDA_MAX; p.arma = 0; p.armadura = 0;
        p.enfriamiento = 0; p.invulnerable = 0;
        if (jugador.vuela) jugador.alternarVuelo();
        jugador.sinVuelo = !espectador;
        if (espectador) { jugador.colocar(TAM_ARENA / 2, 75, TAM_ARENA / 2); jugador.alternarVuelo(); }
        else {
            const slot = Math.max(0, p.participantes.indexOf(sala.id)) % p.terrenoArena.arena.spawns.length;
            const s = p.terrenoArena.arena.spawns[slot];
            jugador.colocar(s.x, s.y, s.z);
            jugador.yaw = Math.atan2(-Math.cos(s.mira), -Math.sin(s.mira));
            jugador.pitch = -0.15;
            jugador.congelado = true;
        }
        const ok = () => p.fase === 'jugando' && !p.espectador && !p.muerto;
        edicion.permitirRomper = o => ok() && o.id !== B.COFRE && o.y > 0;
        edicion.permitirPoner = o => ok() && o.y < 72;
        barra.hidden = equipo.hidden = espectador;
        pintarEquipo();
        refrescarBoton();
        api.pintarLista();
    }

    function salirArena() {
        p.fase = 'lobby';
        p.espectador = p.muerto = false;
        p.cuentaLista = false;
        mundo.cambiarTerreno(p.terrenoLibre);
        jugador.limites = { x: p.terrenoLibre.BW, z: p.terrenoLibre.BD };
        jugador.vacio = null;
        jugador.sinVuelo = false;
        jugador.congelado = false;
        if (jugador.vuela) jugador.alternarVuelo();
        const l = p.posLibre;
        if (l) { jugador.colocar(l.x, l.y, l.z); jugador.yaw = l.yaw; jugador.pitch = l.pitch; if (l.vuela) jugador.alternarVuelo(); }
        api.mundoActual = 'libre';
        if (api.libreDiferido.length) mundo.editarLote(api.libreDiferido.splice(0)); // bloques que otros pusieron mientras yo estaba en la arena
        ocultarMundoNormal(false);
        ajustarOcultos();
        for (const a of avatares.lista.values()) a.ponerVivo(true);
        edicion.permitirRomper = () => true;
        edicion.permitirPoner = null;
        barra.hidden = equipo.hidden = true;
        mostrarAviso('');
        p.vivos = new Set(); p.participantes = [];
        refrescarBoton();
        api.pintarLista();
    }

    // ---- Flujo de la partida ----
    function empezar(ronda, lista, iniciador, reiniciando = false) {
        if (reiniciando) salirArena();
        p.ronda = ronda;
        p.participantes = lista.slice();
        const presentes = id => id === sala.id || sala.jugadores.has(id);
        p.vivos = new Set(lista.filter(presentes));
        p.iniciador = iniciador;
        p.fase = 'cuenta';
        p.cuentaLista = false;
        entrarArena({ espectador: !lista.includes(sala.id) });
        mostrarAviso(t.preparados, `${t.ronda} ${ronda}`);
    }

    function iniciarMia() {
        if (p.fase !== 'lobby' || sala.jugadores.size + 1 < MIN_JUGADORES) return;
        const ronda = p.ronda + 1;
        const lista = [sala.id, ...sala.jugadores.keys()].sort();
        sala.reiniciarBloques('arena');
        sala.enviar('inicio', { r: ronda, p: lista, ini: sala.id });
        sala.guardarRonda(ronda, 'skywars');
        empezar(ronda, lista, sala.id);
    }
    btnIniciar.addEventListener('click', iniciarMia);

    function revisarFin() {
        if (p.fase !== 'jugando' || p.vivos.size > 1) return;
        p.fase = 'fin';
        p.reloj = PAUSA_FIN;
        const ganador = [...p.vivos][0] || null;
        if (ganador) p.victorias.set(ganador, (p.victorias.get(ganador) || 0) + 1);
        mostrarAviso(ganador ? `${t.gana} ${nombreDe(ganador)}` : t.empate, t.volver);
        jugador.congelado = false;
        refrescarBoton();
        api.pintarLista();
    }

    function procesarMuerte(id, por) {
        if (!['jugando', 'cuenta'].includes(p.fase) || !p.vivos.delete(id)) return;
        const a = avatares.lista.get(id);
        if (a) a.ponerVivo(false);
        if (por === sala.id && id !== sala.id) mostrarAviso(`${t.eliminaste} ${nombreDe(id)}`, '', 2.5);
        revisarFin();
        api.pintarLista();
    }

    function morir(causa, por) {
        if (p.espectador || p.muerto || p.fase !== 'jugando') {
            // Cayó antes de empezar (cuenta) o ya estaba fuera: vuelve a su isla
            if (p.fase === 'cuenta' && !p.espectador) {
                const s = p.terrenoArena.arena.spawns[Math.max(0, p.participantes.indexOf(sala.id)) % p.terrenoArena.arena.spawns.length];
                jugador.colocar(s.x, s.y, s.z);
            }
            return;
        }
        p.muerto = true;
        sala.enviar('muerte', { por: por || null, c: causa });
        procesarMuerte(sala.id, por);
        // Pasa a mirar la pelea en vuelo libre
        jugador.vacio = null;
        jugador.sinVuelo = false;
        jugador.colocar(TAM_ARENA / 2, 75, TAM_ARENA / 2);
        if (!jugador.vuela) jugador.alternarVuelo();
        barra.hidden = equipo.hidden = true;
        if (p.fase === 'jugando') mostrarAviso(causa === 'vacio' ? t.vacio : `${t.mato} ${nombreDe(por)}`, t.espectador);
    }

    // ---- Combate ----
    const dirTmp = new THREE.Vector3();
    function avatarApuntado() {
        const d = camara.getWorldDirection(dirTmp);
        const o = camara.position;
        let mejor = null, mejorT = ALCANCE_GOLPE;
        for (const a of avatares.lista.values()) {
            if (!a.recibido || a.oculto || !a.vivo || !p.vivos.has(a.id)) continue;
            const min = [a.pos.x - 0.4, a.pos.y, a.pos.z - 0.4], max = [a.pos.x + 0.4, a.pos.y + 1.85, a.pos.z + 0.4];
            const orig = [o.x, o.y, o.z], dir = [d.x, d.y, d.z];
            let t0 = 0, t1 = mejorT, fuera = false;
            for (let i = 0; i < 3 && !fuera; i++) {
                if (Math.abs(dir[i]) < 1e-6) { if (orig[i] < min[i] || orig[i] > max[i]) fuera = true; continue; }
                let a0 = (min[i] - orig[i]) / dir[i], a1 = (max[i] - orig[i]) / dir[i];
                if (a0 > a1) [a0, a1] = [a1, a0];
                t0 = Math.max(t0, a0); t1 = Math.min(t1, a1);
                if (t0 > t1) fuera = true;
            }
            if (!fuera && t0 < mejorT) { mejorT = t0; mejor = a; }
        }
        return mejor ? { a: mejor, t: mejorT } : null;
    }

    edicion.interceptarClicIzquierdo = () => {
        if (!api.enArena) return false;
        if (p.fase !== 'jugando' || p.espectador || p.muerto) return true; // en la arena fuera de combate no se rompe nada
        const hit = avatarApuntado();
        if (!hit) return false;
        const o = edicion.objetivo;
        if (o) {
            const dc = Math.hypot(o.x + 0.5 - camara.position.x, o.y + 0.5 - camara.position.y, o.z + 0.5 - camara.position.z) - 0.6;
            if (dc < hit.t) return false; // hay un bloque delante
        }
        if (p.enfriamiento > 0) return true;
        const dx = hit.a.pos.x - jugador.pos.x, dz = hit.a.pos.z - jugador.pos.z, n = Math.hypot(dx, dz) || 1;
        sala.enviar('golpe', { a: hit.a.id, d: ARMAS[p.arma].dano, kx: Math.round(dx / n * 100) / 100, kz: Math.round(dz / n * 100) / 100 });
        hit.a.golpeado();
        p.enfriamiento = ENFRIAMIENTO;
        return true;
    };

    sala.en('golpe', m => {
        if (m.a !== sala.id || p.fase !== 'jugando' || p.espectador || p.muerto || p.invulnerable > 0) return;
        const dano = Math.max(1, Math.round(m.d * (1 - 0.06 * p.armadura)));
        p.vida -= dano;
        p.invulnerable = INVULNERABLE;
        jugador.vel.x = m.kx * 9; jugador.vel.z = m.kz * 9; jugador.vel.y = Math.max(jugador.vel.y, 6.5);
        jugador.enSuelo = false;
        destello();
        pintarEquipo();
        if (p.vida <= 0) morir('golpe', m.de);
    });
    sala.en('muerte', m => procesarMuerte(m.de, m.por));

    // ---- Cofres ----
    edicion.interceptarClicDerecho = o => {
        if (!api.enArena) return false;
        if (!o || o.id !== B.COFRE) return false;
        if (p.fase !== 'jugando' || p.espectador || p.muerto) return true;
        const c = p.terrenoArena.arena.cofres.find(k => k.x === o.x && k.y === o.y && k.z === o.z);
        if (!c) return true;
        const b = botinDe(p.ronda, c.indice, c.central);
        const partes = [];
        if (b.arma > p.arma) { p.arma = b.arma; partes.push(`${t.nuevaArma}: ${ARMAS[b.arma].nombre[idioma] || ARMAS[b.arma].nombre.es}`); }
        if (b.armadura > p.armadura) { p.armadura = b.armadura; partes.push(`${t.nuevaArmadura} ${b.armadura}`); }
        if (b.cura) { p.vida = Math.min(VIDA_MAX, p.vida + b.cura); partes.push(`+${b.cura} ${t.curacion}`); }
        mostrarAviso(t.cofre, partes.join(' · ') || '—', 2.2);
        mundo.editar(o.x, o.y, o.z, B.AIRE);
        sala.cambiarBloque(o.x, o.y, o.z, B.AIRE, 'arena');
        pintarEquipo();
        return true;
    };

    // ---- Eventos de la sala ----
    sala.en('inicio', m => {
        if (!Array.isArray(m.p)) return;
        if (p.fase === 'lobby') empezar(m.r, m.p, m.ini);
        else if (p.fase === 'cuenta' && m.r === p.ronda && m.ini < p.iniciador) empezar(m.r, m.p, m.ini, true); // dos iniciaron a la vez: gana el menor id
    });
    // Quien entra a mitad de una partida la mira como espectador
    sala.en('hola', () => {
        if (!['cuenta', 'jugando', 'fin'].includes(p.fase) || p.espectador) return;
        const presentes = p.participantes.filter(id => id === sala.id || sala.jugadores.has(id)).sort();
        if (presentes[0] !== sala.id || performance.now() - p.ultimoEstado < 1500) return;
        p.ultimoEstado = performance.now();
        sala.enviar('situacion', { r: p.ronda, p: p.participantes, v: [...p.vivos], f: p.fase });
    });
    sala.en('situacion', async m => {
        if (p.fase !== 'lobby' || !Array.isArray(m.p) || m.p.includes(sala.id) || m.f === 'fin') return;
        empezar(m.r, m.p, m.p[0]);
        p.vivos = new Set(m.v);
        p.fase = 'jugando';
        mostrarAviso(t.espectador, `${t.ronda} ${m.r}`, 3);
        jugador.congelado = false;
        try { mundo.editarLote(await sala.leerCambios('arena')); } catch (e) { /* sin cambios */ }
        api.pintarLista();
    });
    sala.en('sale', m => {
        if (['jugando', 'cuenta'].includes(p.fase)) procesarMuerte(m.id, null);
    });
    api.ganchos.push({
        entro() { caja.hidden = false; refrescarBoton(); },
        lista(listaEl) {
            for (const f of listaEl.children) {
                const id = f.dataset.id;
                if (!id) continue;
                const n = p.victorias.get(id);
                if (n) f.textContent = `${f.textContent} (${n})`;
                if (p.fase !== 'lobby' && p.participantes.includes(id) && !p.vivos.has(id)) f.classList.add('muerto');
            }
        },
        cuadro(dt) {
            if (p.enfriamiento > 0) p.enfriamiento -= dt;
            if (p.invulnerable > 0) p.invulnerable -= dt;
            if (p.avisoHasta && performance.now() > p.avisoHasta) { p.avisoHasta = 0; if (['jugando'].includes(p.fase)) aviso.hidden = true; }
            if (p.fase === 'cuenta') {
                if (!p.cuentaLista) {
                    // La cuenta empieza cuando el suelo de la isla ya está cargado
                    const base = mundo.bloque(jugador.pos.x, jugador.pos.y - 1, jugador.pos.z);
                    if (p.espectador || base > 0) { p.cuentaLista = true; p.reloj = CUENTA; }
                    return;
                }
                p.reloj -= dt;
                mostrarAviso(String(Math.max(1, Math.ceil(p.reloj))), `${t.preparados} · ${t.ronda} ${p.ronda}`);
                if (p.reloj <= 0) {
                    p.fase = 'jugando';
                    jugador.congelado = false;
                    mostrarAviso(t.pelea, '', 1.5);
                    refrescarBoton();
                    revisarFin(); // por si alguien salió durante la cuenta
                }
            } else if (p.fase === 'fin') {
                p.reloj -= dt;
                if (p.reloj <= 0) salirArena();
            }
            if (api.enArena) pintarEquipo();
        }
    });
    api.extraPosicion = () => ({ mu: api.mundoActual, h: Math.round(p.vida) });
    return p;
}
