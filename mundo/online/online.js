// =========================================================
// VENJY · Modo online: integra la sala, los avatares y la edición con el mundo
// Si no hay configuración, no se dibuja nada y el mundo funciona offline como siempre.
// =========================================================
import { ONLINE_ACTIVO, CODIGO_PUBLICO } from './config.js';
import { Sala, normalizarCodigo, normalizarNombre } from './red.js';
import { Avatares, aspectoDe } from './avatares.js';
import { crearEdicion } from './edicion.js';
import { iniciarPartida } from './partida.js';

const CLAVE = 'venjy-mundo-online';

const TXT = {
    es: {
        amigos: 'Entrar a la sala de amigos', titulo: 'Jugar con amigos', nombre: 'Tu nombre', codigo: 'Código de sala',
        entrar: 'Entrar con este código', publica: 'Sala pública', conectando: 'Conectando…',
        salir: 'Salir de la sala', sala: 'Sala', jugadores: 'jugadores', jugador: 'jugador', invitado: 'Jugador',
        ayuda: 'Todos ven el mismo mundo. Quien tenga el mismo código entra a tu sala. La sala pública es abierta (máx. 8) y no guarda los bloques.',
        romper: 'ROMPER', poner: 'PONER',
        errores: {
            nombre: 'Escribe un nombre.', codigo: 'El código usa 3 a 12 letras o números.', llena: 'La sala está llena (máximo 8).',
            tiempo: 'No se pudo conectar (¿red bloqueada?).', canal: 'No se pudo abrir el canal en tiempo real.', base: 'Error con la base de datos.',
            'sin-config': 'El modo online no está configurado.', otro: 'No se pudo entrar a la sala.'
        },
        perdida: 'Se perdió la conexión con la sala.'
    },
    en: {
        amigos: 'Join the friends room', titulo: 'Play with friends', nombre: 'Your name', codigo: 'Room code',
        entrar: 'Join with this code', publica: 'Public room', conectando: 'Connecting…',
        salir: 'Leave room', sala: 'Room', jugadores: 'players', jugador: 'player', invitado: 'Player',
        ayuda: 'Everyone sees the same world. Anyone with the same code joins your room. The public room is open (max 8) and does not save blocks.',
        romper: 'BREAK', poner: 'PLACE',
        errores: {
            nombre: 'Enter a name.', codigo: 'The code uses 3 to 12 letters or numbers.', llena: 'The room is full (max 8).',
            tiempo: 'Could not connect (network blocked?).', canal: 'Could not open the realtime channel.', base: 'Database error.',
            'sin-config': 'Online mode is not configured.', otro: 'Could not join the room.'
        },
        perdida: 'Lost connection to the room.'
    }
};

function leer() { try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; } }
function guardar(v) { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }

export function iniciarOnline(ctx) {
    if (!ONLINE_ACTIVO) return null;
    const { idioma, mundo, jugador, camara, scene, materiales, hudEl, panelEl, atlasLienzo } = ctx;
    const t = TXT[idioma] || TXT.es;
    const sala = new Sala();
    const avatares = new Avatares(scene, materiales);
    const edicion = crearEdicion({
        mundo, jugador, camara, scene, hud: hudEl, atlasLienzo, idioma,
        alCambiar: (x, y, z, id) => sala.cambiarBloque(x, y, z, id, api.mundoActual)
    });
    const api = { sala, avatares, edicion, ctx, mundoActual: 'libre', ganchos: [], libreDiferido: [] };
    const posPendientes = new Map(); // posiciones que llegaron antes que la presencia del jugador

    // ---- Lobby (en el panel de inicio, justo bajo «Jugar») ----
    const params = new URLSearchParams(location.search);
    const guardado = leer();
    const seccion = document.createElement('section');
    seccion.className = 'online amigos';
    seccion.innerHTML = `
        <button id="on-abrir" class="boton grande" type="button" data-es="${TXT.es.amigos}" data-en="${TXT.en.amigos}">${t.amigos}</button>
        <div class="formulario" id="on-form" hidden>
            <h2 data-es="${TXT.es.titulo}" data-en="${TXT.en.titulo}">${t.titulo}</h2>
            <p class="ayuda" data-es="${TXT.es.ayuda}" data-en="${TXT.en.ayuda}">${t.ayuda}</p>
            <div class="campos">
                <label><span data-es="${TXT.es.nombre}" data-en="${TXT.en.nombre}">${t.nombre}</span>
                    <input id="on-nombre" type="text" maxlength="14" autocomplete="off" spellcheck="false"></label>
                <label><span data-es="${TXT.es.codigo}" data-en="${TXT.en.codigo}">${t.codigo}</span>
                    <input id="on-codigo" type="text" maxlength="12" autocomplete="off" spellcheck="false"></label>
            </div>
            <div class="fila-botones" id="on-botones">
                <button id="on-entrar" class="boton" type="button" data-es="${TXT.es.entrar}" data-en="${TXT.en.entrar}">${t.entrar}</button>
                <button id="on-publica" class="boton" type="button" data-es="${TXT.es.publica}" data-en="${TXT.en.publica}">${t.publica}</button>
            </div>
            <button id="on-salir" class="boton secundario" type="button" hidden data-es="${TXT.es.salir}" data-en="${TXT.en.salir}">${t.salir}</button>
            <p id="on-estado" class="estado" role="status"></p>
            <div id="on-extra"></div>
        </div>`;
    const botonJugar = panelEl.querySelector('#jugar');
    if (botonJugar) botonJugar.after(seccion); else panelEl.appendChild(seccion);
    const $ = id => seccion.querySelector(id);
    const btnAbrir = $('#on-abrir'), form = $('#on-form'), inNombre = $('#on-nombre'), inCodigo = $('#on-codigo');
    const btnEntrar = $('#on-entrar'), btnPublica = $('#on-publica'), btnSalir = $('#on-salir'), estadoEl = $('#on-estado');
    inNombre.value = normalizarNombre(params.get('nombre') || guardado.nombre || '');
    inCodigo.value = normalizarCodigo(params.get('sala') || (guardado.codigo !== CODIGO_PUBLICO ? guardado.codigo : '') || '');
    if (params.get('sala')) form.hidden = false;
    btnAbrir.addEventListener('click', () => { form.hidden = !form.hidden; if (!form.hidden) (inNombre.value ? inCodigo : inNombre).focus(); });
    inCodigo.addEventListener('input', () => { inCodigo.value = normalizarCodigo(inCodigo.value); });
    // Escribir en los campos no debe mover al jugador ni activar atajos
    for (const el of [inNombre, inCodigo]) el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') btnEntrar.click(); });

    const mostrar = (texto, error = false) => { estadoEl.textContent = texto; estadoEl.classList.toggle('error', error); };
    api.extra = $('#on-extra');
    api.mostrar = mostrar;

    // ---- Lista de jugadores en el HUD ----
    const listaEl = document.createElement('div');
    listaEl.className = 'jugadores-lista';
    listaEl.hidden = true;
    hudEl.appendChild(listaEl);
    const pintarLista = () => {
        const n = sala.jugadores.size + 1;
        listaEl.replaceChildren();
        const cab = document.createElement('div');
        cab.className = 'cab';
        cab.textContent = `${t.sala} ${sala.codigo} · ${n} ${n === 1 ? t.jugador : t.jugadores}`;
        listaEl.appendChild(cab);
        const yo = document.createElement('div');
        yo.textContent = sala.nombre;
        yo.className = 'yo';
        yo.dataset.id = sala.id;
        listaEl.appendChild(yo);
        for (const [id, j] of sala.jugadores) {
            const f = document.createElement('div');
            f.textContent = j.nombre;
            f.dataset.id = id;
            listaEl.appendChild(f);
        }
        for (const g of api.ganchos) g.lista && g.lista(listaEl);
    };
    api.pintarLista = pintarLista;

    // ---- Eventos de la sala ----
    const aplicarPos = (a, m) => { a.recibir(m); a.mu = m.mu || 'libre'; a.oculto = a.mu !== api.mundoActual; };
    sala.en('entra', m => {
        const a = avatares.agregar(m.id, m.nombre, m.aspecto);
        const pendiente = posPendientes.get(m.id);
        if (pendiente) { aplicarPos(a, pendiente); posPendientes.delete(m.id); }
        for (const g of api.ganchos) g.entra && g.entra(a, m);
        sala.enviar('hola'); // para que el recién llegado reciba mi posición enseguida
        pintarLista();
    });
    sala.en('sale', m => {
        for (const g of api.ganchos) g.sale && g.sale(m.id);
        avatares.quitar(m.id);
        posPendientes.delete(m.id);
        pintarLista();
    });
    sala.en('hola', () => { sala.ultimoEnvio = 0; });
    sala.en('pos', m => {
        const a = avatares.lista.get(m.de);
        // El mensaje puede llegar antes que la presencia: se guarda y se aplica cuando aparece el jugador
        if (a) aplicarPos(a, m); else posPendientes.set(m.de, m);
    });
    sala.en('bloque', m => {
        const mu = m.mu || 'libre';
        if (mu === api.mundoActual) mundo.editar(m.x, m.y, m.z, m.b, false);
        else if (mu === 'libre') api.libreDiferido.push([m.x, m.y, m.z, m.b]);
    });
    sala.en('estado', () => { mostrar(t.perdida, true); });

    // ---- Entrar y salir ----
    let entrando = false;
    async function unirse(publica) {
        if (entrando || sala.activa) return;
        entrando = true;
        btnEntrar.disabled = btnPublica.disabled = true;
        mostrar(t.conectando);
        let nombre = normalizarNombre(inNombre.value);
        if (publica && !nombre) nombre = t.invitado + (100 + Math.floor(Math.random() * 900));
        const codigo = publica ? CODIGO_PUBLICO : normalizarCodigo(inCodigo.value);
        try {
            const { cambios } = await sala.entrar({ codigo, nombre, aspecto: aspectoDe(nombre), publica });
            guardar({ nombre: normalizarNombre(inNombre.value), codigo: publica ? '' : codigo });
            mundo.editarLote(cambios);
            edicion.activa = true;
            // Los que ya estaban en la sala
            for (const [id, j] of sala.jugadores) {
                const a = avatares.agregar(id, j.nombre, j.aspecto);
                const p = posPendientes.get(id);
                if (p) { aplicarPos(a, p); posPendientes.delete(id); }
            }
            sala.enviar('hola');
            form.hidden = false;
            seccion.classList.add('dentro');
            btnAbrir.hidden = true;
            $('#on-botones').hidden = true; btnSalir.hidden = false;
            form.querySelectorAll('input, .ayuda').forEach(e => { if (e.tagName === 'INPUT') e.disabled = true; });
            mostrar(`${t.sala} ${sala.codigo}`);
            listaEl.hidden = false;
            pintarLista();
            for (const g of api.ganchos) g.entro && g.entro();
            if (api.botonesTactiles) api.botonesTactiles.forEach(b => { b.hidden = false; });
        } catch (e) {
            console.warn('entrar a la sala:', e);
            mostrar(t.errores[e.codigo] || t.errores.otro, true);
            btnEntrar.disabled = btnPublica.disabled = false;
        }
        entrando = false;
    }
    btnEntrar.addEventListener('click', () => unirse(false));
    btnPublica.addEventListener('click', () => unirse(true));
    btnSalir.addEventListener('click', async () => {
        btnSalir.disabled = true;
        await sala.salir();
        window.removeEventListener('beforeunload', avisarAlCerrar);
        location.reload(); // vuelve al mundo original sin ediciones locales
    });
    window.addEventListener('pagehide', () => { if (sala.activa) sala.guardarPendientes(); });
    // Ctrl+W o cerrar sin querer: el navegador pide confirmación mientras estás en una sala
    function avisarAlCerrar(e) {
        if (!sala.activa) return;
        e.preventDefault();
        e.returnValue = '';
    }
    window.addEventListener('beforeunload', avisarAlCerrar);

    // ---- Celular: botones de romper y poner junto a los controles táctiles ----
    api.conTactil = tactil => {
        if (!tactil) return;
        const romper = tactil.agregarAccion('tactil-romper', t.romper, () => edicion.abajo(0), () => edicion.arriba(0));
        const poner = tactil.agregarAccion('tactil-poner', t.poner, () => edicion.abajo(2), () => edicion.arriba(2));
        api.botonesTactiles = [romper, poner];
        if (sala.activa) api.botonesTactiles.forEach(b => { b.hidden = false; });
    };

    iniciarPartida(api);

    // ---- Bucle ----
    api.actualizar = dt => {
        edicion.actualizar(dt);
        if (!sala.activa) return;
        avatares.actualizar(dt, jugador.pos);
        sala.enviarPosicion(jugador, api.extraPosicion ? api.extraPosicion() : {});
        for (const g of api.ganchos) g.cuadro && g.cuadro(dt);
    };
    return api;
}
