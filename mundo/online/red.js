// =========================================================
// VENJY · Red del modo online (Supabase Realtime)
// - Presence: quién está en la sala (nombre, aspecto).
// - Broadcast: posiciones, bloques, golpes y estado de la partida.
// - Postgres: salas y cambios de bloques, para quien entra tarde (solo por funciones, ver schema.sql).
// - Sala cooperativa de supervivencia (`coop`): solo el canal; la foto del mundo va por coop.js.
// - SalaDirecta (supervivencia): el juego viaja por WebRTC y Supabase solo conecta (ver más abajo).
// Supabase se carga solo al entrar a una sala: sin ella, nada de esto se descarga.
// =========================================================
import { CONFIG_ONLINE, ONLINE_ACTIVO, HZ_POSICION, MAX_JUGADORES } from './config.js';

export const CODIGO_VALIDO = /^[A-Z0-9]{3,12}$/;
export function normalizarCodigo(t) { return String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
export function normalizarNombre(t) { return String(t || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 14); }

export function idAleatorio() {
    const a = new Uint8Array(6);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

export function fallo(codigo, mensaje) { return Object.assign(new Error(mensaje), { codigo }); }

export class Sala {
    constructor() {
        this.id = idAleatorio();
        this.cliente = null;
        this.canal = null;
        this.codigo = '';
        this.nombre = '';
        this.aspecto = null;
        this.estado = 'desconectado'; // desconectado | conectando | conectado | error
        this.jugadores = new Map();   // id -> { nombre, aspecto } (sin incluirme)
        this.escuchas = new Map();    // evento -> [fn]
        this.pendientes = new Map();  // 'mundo|x,y,z' -> fila por guardar
        this.temporizador = null;
        this.ultimoEnvio = 0;
        this.modoSala = 'libre';
        this.ronda = 0;
        this.max = MAX_JUGADORES;
        // Contadores para medir el gasto de mensajes (ver estadisticas())
        this.cuenta = { enviados: 0, recibidos: 0, bytesEnviados: 0, desde: performance.now() };
    }

    get activa() { return this.estado === 'conectado'; }
    get llena() { return this.jugadores.size + 1 > this.max; }

    en(evento, fn) {
        if (!this.escuchas.has(evento)) this.escuchas.set(evento, []);
        this.escuchas.get(evento).push(fn);
    }
    emitir(evento, dato) { for (const fn of this.escuchas.get(evento) || []) fn(dato); }

    // Entra a una sala. Devuelve { cambios } con los bloques ya editados; lanza Error con .codigo
    // coop: sala de supervivencia (canal propio, sin tablas del creativo); meta: datos extra de Presence
    async entrar({ codigo, nombre, aspecto, modo = 'libre', publica = false, coop = false, max = MAX_JUGADORES, meta = {} }) {
        if (!ONLINE_ACTIVO) throw fallo('sin-config', 'sin configurar');
        codigo = normalizarCodigo(codigo);
        nombre = normalizarNombre(nombre);
        if (!CODIGO_VALIDO.test(codigo)) throw fallo('codigo', 'código inválido');
        if (!nombre) throw fallo('nombre', 'nombre vacío');
        this.codigo = codigo; this.nombre = nombre; this.aspecto = aspecto;
        this.publica = publica || coop; // sala pública: solo Realtime, no se guarda nada
        this.coop = coop; this.max = max; this.meta = meta;
        this.estado = 'conectando';
        try {
            const { createClient } = await import('../../vendor/supabase.js');
            this.cliente = createClient(CONFIG_ONLINE.url, CONFIG_ONLINE.clave, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
                realtime: { params: { eventsPerSecond: 40 } }
            });
            if (!this.publica) { // ni la sala pública ni la cooperativa usan las tablas del creativo
                // La sala se crea si no existe (sin pisar una existente)
                const r = await this.cliente.rpc('entrar_sala', { p_codigo: codigo, p_modo: modo });
                if (r.error) throw fallo('base', r.error.message);
                const sala = r.data && r.data[0];
                this.modoSala = sala ? sala.modo : modo;
                this.ronda = sala ? sala.ronda : 0;
            }

            await this.conectarCanal();
            if (this.llena) throw fallo('llena', 'sala llena');
            const cambios = this.publica ? [] : await this.leerCambios('libre');
            this.estado = 'conectado';
            return { cambios };
        } catch (e) {
            this.estado = 'error';
            await this.salir();
            throw e;
        }
    }

    conectarCanal() {
        return new Promise((ok, mal) => {
            const canal = this.cliente.channel((this.coop ? 'venjy-sv:' : 'venjy:') + this.codigo, {
                config: { broadcast: { self: false }, presence: { key: this.id } }
            });
            this.canal = canal;
            canal.on('presence', { event: 'sync' }, () => this.sincronizarPresencia());
            if (this.prepararCanal) this.prepararCanal(canal); // escuchas extra (SalaDirecta: señalización)
            canal.on('broadcast', { event: 'm' }, ({ payload }) => {
                if (!payload || payload.de === this.id) return;
                this.cuenta.recibidos++;
                this.emitir(payload.e, payload);
            });
            const plazo = setTimeout(() => mal(fallo('tiempo', 'tiempo agotado conectando')), 10000);
            canal.subscribe(async estado => {
                if (estado === 'SUBSCRIBED') {
                    clearTimeout(plazo);
                    await canal.track({ nombre: this.nombre, aspecto: this.aspecto, entro: Date.now(), ...this.meta });
                    ok();
                } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
                    clearTimeout(plazo);
                    if (this.estado === 'conectando') mal(fallo('canal', 'no se pudo abrir el canal'));
                    else { this.estado = 'error'; this.emitir('estado', { estado: 'error' }); }
                } else if (estado === 'CLOSED' && this.estado === 'conectado') {
                    this.estado = 'error';
                    this.emitir('estado', { estado: 'error' });
                }
            });
        });
    }

    sincronizarPresencia() {
        const e = this.canal.presenceState();
        const nuevos = new Map();
        for (const [id, metas] of Object.entries(e)) {
            if (id === this.id || !metas.length) continue;
            nuevos.set(id, metas[metas.length - 1]);
        }
        this.ponerJugadores(nuevos);
    }
    // Reemplaza la lista de jugadores y avisa quién entró, cambió o salió (SalaLocal la usa sin Presence)
    ponerJugadores(nuevos) {
        const antes = this.jugadores;
        this.jugadores = nuevos;
        for (const [id, m] of nuevos) {
            if (!antes.has(id)) this.emitir('entra', { id, ...m });
            else if (JSON.stringify(antes.get(id)) !== JSON.stringify(m)) this.emitir('actualiza', { id, ...m }); // p. ej. cambió su skin
        }
        for (const id of antes.keys()) if (!nuevos.has(id)) this.emitir('sale', { id });
        this.emitir('jugadores', { total: nuevos.size + 1 });
    }

    // Envía un evento a todos los demás. Los datos deben ser pequeños.
    enviar(evento, dato = {}) {
        if (!this.activa || !this.canal) return;
        const payload = { e: evento, de: this.id, ...dato };
        this.cuenta.enviados++;
        if (this.medirBytes) this.cuenta.bytesEnviados += JSON.stringify(payload).length;
        this.canal.send({ type: 'broadcast', event: 'm', payload });
    }

    // Mensajes por segundo desde el último reinicio. Supabase cobra cada broadcast como 1 enviado
    // + 1 por cada cliente que lo recibe: el gasto de la sala es la suma de `cobrados` de todos.
    estadisticas(reiniciar = false) {
        const c = this.cuenta, s = Math.max(0.001, (performance.now() - c.desde) / 1000);
        const r = {
            segundos: +s.toFixed(1), enviadosPorSeg: +(c.enviados / s).toFixed(2), recibidosPorSeg: +(c.recibidos / s).toFixed(2),
            cobradosPorSeg: +((c.enviados * (1 + this.jugadores.size)) / s).toFixed(2), bytesPorMensaje: c.enviados ? Math.round(c.bytesEnviados / c.enviados) : 0
        };
        if (reiniciar) this.cuenta = { enviados: 0, recibidos: 0, bytesEnviados: 0, desde: performance.now() };
        return r;
    }

    // Actualiza los datos extra de Presence (p. ej. la skin)
    async anunciar(meta) {
        this.meta = { ...this.meta, ...meta };
        if (this.canal) await this.canal.track({ nombre: this.nombre, aspecto: this.aspecto, entro: Date.now(), ...this.meta });
    }

    // Posición a ~HZ_POSICION: se llama cada cuadro y se limita sola
    enviarPosicion(j, extra = {}) {
        const t = performance.now();
        if (t - this.ultimoEnvio < 1000 / HZ_POSICION) return;
        const r = n => Math.round(n * 100) / 100;
        const m = { x: r(j.pos.x), y: r(j.pos.y), z: r(j.pos.z), yaw: r(j.yaw), pit: r(j.pitch), v: j.vuela ? 1 : 0, ...extra };
        // Quieto: solo un latido por segundo, para gastar pocos mensajes
        const u = this.ultimaPos;
        const igual = u && Math.abs(u.x - m.x) < 0.02 && Math.abs(u.y - m.y) < 0.02 && Math.abs(u.z - m.z) < 0.02
            && Math.abs(u.yaw - m.yaw) < 0.02 && Math.abs(u.pit - m.pit) < 0.02 && u.v === m.v && u.mu === m.mu && u.h === m.h;
        if (igual && t - this.ultimoEnvio < 1000) return;
        this.ultimoEnvio = t;
        this.ultimaPos = m;
        this.enviar('pos', m);
    }

    // ---- Bloques ----
    async leerCambios(mundo) {
        const todos = [];
        for (let desde = 0; ; desde += 1000) {
            const { data, error } = await this.cliente.rpc('leer_cambios', { p_codigo: this.codigo, p_mundo: mundo, p_desde: desde });
            if (error) throw fallo('base', error.message);
            for (const f of data) todos.push([f.x, f.y, f.z, f.bloque]);
            if (data.length < 1000) break;
        }
        return todos;
    }

    // Cambio de bloque: se avisa a todos al instante y se guarda en lote (gana el último por posición)
    cambiarBloque(x, y, z, id, mundo = 'libre') {
        this.enviar('bloque', { x, y, z, b: id, mu: mundo });
        if (this.publica) return;
        this.pendientes.set(mundo + '|' + x + ',' + y + ',' + z, [mundo, x, y, z, id]);
        if (!this.temporizador) this.temporizador = setTimeout(() => this.guardarPendientes(), 400);
    }

    async guardarPendientes() {
        this.temporizador = null;
        if (!this.cliente || !this.pendientes.size) return;
        const filas = Array.from(this.pendientes.values());
        this.pendientes.clear();
        for (let i = 0; i < filas.length; i += 500) {
            const r = await this.cliente.rpc('guardar_cambios', { p_codigo: this.codigo, p_filas: filas.slice(i, i + 500) });
            if (r.error) console.warn('no se guardaron bloques:', r.error.message);
        }
    }

    async reiniciarBloques(mundo) {
        this.pendientes.clear();
        if (this.cliente && !this.publica) await this.cliente.rpc('reiniciar_sala', { p_codigo: this.codigo, p_mundo: mundo });
    }

    async guardarRonda(ronda, modo) {
        if (this.cliente && !this.publica) await this.cliente.rpc('guardar_ronda', { p_codigo: this.codigo, p_ronda: ronda, p_modo: modo });
    }

    async salir() {
        clearTimeout(this.temporizador);
        try { await this.guardarPendientes(); } catch (e) { /* sin red */ }
        try { if (this.canal && this.cliente) await this.cliente.removeChannel(this.canal); } catch (e) { /* ya cerrado */ }
        this.canal = null;
        this.cliente = null;
        this.jugadores = new Map();
        if (this.estado !== 'error') this.estado = 'desconectado';
    }
}

// =========================================================
// SalaDirecta · supervivencia cooperativa por WebRTC (misma interfaz que Sala)
// - Supabase (canal `venjy-sv:CODIGO`) solo hace tres cosas: Presence (quién está), la señalización
//   (evento `rtc`: oferta y respuesta con el SDP completo, sin trickle ICE: 2 mensajes por invitado)
//   y las funciones de la sala (crear_sala_coop, foto de respaldo).
// - El juego viaja directo en estrella: cada invitado tiene un RTCPeerConnection con el anfitrión y
//   dos canales de datos: `r` (sin orden ni reintentos) para las posiciones `p` y `f` (fiable y en
//   orden) para todo lo demás y la foto del mundo en trozos binarios. El anfitrión reparte lo que
//   llega a los demás (a uno solo si trae `para`) y pone el `de` real: nadie se hace pasar por otro.
// - Respaldo: si la conexión directa no se abre (NAT simétrico, Wi-Fi que aísla equipos) el invitado
//   juega por un segundo canal Realtime (`venjy-svr:CODIGO`) donde solo están el anfitrión y los
//   invitados de respaldo; el anfitrión les reenvía lo que llega directo y viceversa. Los invitados
//   directos no lo escuchan, así no pagan mensajes que no usan. Si el canal directo se corta en
//   medio de la partida se sigue por respaldo y se reintenta (3 s, 10 s, 30 s y luego cada 60 s).
// - Sin internet (QR): SalaLocal en online/sala-local.js reemplaza la señalización por el QR y
//   Presence por una lista que reparte el anfitrión.
// - Pruebas: `?directo=0` fuerza el respaldo (ICE sin servidores y solo relay: nunca conecta);
//   `cortarDirecto()` corta el canal como si fallara la red.
// =========================================================
const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
const ESPERA_ICE = 2000;      // ms máximos juntando candidatos antes de mandar el SDP
const ESPERA_DIRECTO = 6000;  // ms máximos para que se abran los canales
const TROZO = 16 * 1024;      // bytes por trozo binario (seguro en todos los navegadores)
const REINTENTOS = [3000, 10000, 30000, 60000];
const esperar = ms => new Promise(r => setTimeout(r, ms));

function cuentaNueva() {
    return { enviados: 0, recibidos: 0, bytesEnviados: 0, dirEnv: 0, dirRec: 0, supaEnv: 0, supaRec: 0, desde: performance.now() };
}

export class SalaDirecta extends Sala {
    constructor() {
        super();
        this.pares = new Map();     // id -> { id, pc, f, r, abierto, caido, binario }
        this.respaldo = new Set();  // (anfitrión) invitados que juegan por Supabase
        this.canalResp = null;
        this.idAnfitrion = null;
        this.bytesListos = [];      // binarios completos recibidos (la foto del mundo)
        this.intentos = 0;
        this.reintento = null;
        this.forzarRespaldo = new URLSearchParams(location.search).get('directo') === '0';
        this.configIce = null;      // SalaLocal: sin STUN (solo la red local)
        this.cuenta = cuentaNueva();
        this.en('sale', ({ id }) => { this.respaldo.delete(id); this.cerrarPar(id); });
    }

    // Invitado: hay canal directo abierto con el anfitrión
    get directo() {
        if (this.esAnfitrion) return false;
        const p = this.pares.get(this.idAnfitrion);
        return !!(p && p.abierto);
    }

    // op como Sala.entrar + maxRespaldo: tope de la sala si este invitado no logra conexión directa
    async entrar(op) {
        this.esAnfitrion = !!(op.meta && op.meta.anf);
        this.maxRespaldo = op.maxRespaldo || 4;
        const r = await super.entrar(op);
        try {
            if (this.esAnfitrion) await this.abrirRespaldo();
            else {
                for (let t = 0; t < 40 && !this.buscarAnfitrion(); t++) await esperar(250);
                if (this.idAnfitrion) {
                    const ok = await this.intentarDirecto().catch(e => { console.warn('rtc:', e.message); return false; });
                    if (!ok) {
                        if (this.jugadores.size + 1 > this.maxRespaldo) throw fallo('llena-respaldo', 'sin conexión directa y la sala pasa del tope de respaldo');
                        await this.abrirRespaldo();
                        this.programarReintento();
                    }
                }
            }
        } catch (e) {
            this.estado = 'error';
            await this.salir();
            throw e;
        }
        return r;
    }

    buscarAnfitrion() {
        for (const [id, m] of this.jugadores) if (m.anf) return (this.idAnfitrion = id);
        return null;
    }

    // ---------- Señalización (Supabase; en el PR C la reemplaza el QR) ----------
    prepararCanal(canal) {
        canal.on('broadcast', { event: 'rtc' }, ({ payload }) => {
            if (!payload || payload.para !== this.id) return;
            this.cuenta.supaRec++;
            this.senal(payload).catch(e => console.warn('rtc:', e.message));
        });
    }
    enviarSenal(para, datos) {
        if (!this.canal) return;
        this.cuenta.supaEnv++;
        this.canal.send({ type: 'broadcast', event: 'rtc', payload: { de: this.id, para, ...datos } });
    }
    async senal(m) {
        if (m.t === 'oferta' && this.esAnfitrion) {
            // La oferta puede llegar antes que el Presence del invitado: se espera un poco
            for (let t = 0; t < 30 && !this.jugadores.has(m.de); t++) await esperar(100);
            if (!this.jugadores.has(m.de)) return;
            const sdp = await this.aceptarOferta(m.de, m.sdp);
            this.enviarSenal(m.de, { t: 'respuesta', sdp });
        } else if (m.t === 'respuesta' && !this.esAnfitrion) await this.aceptarRespuesta(m.de, m.sdp);
    }

    // ---------- Conexiones ----------
    nuevoPar(id, iniciador) {
        this.cerrarPar(id);
        const pc = new RTCPeerConnection(this.configIce || (this.forzarRespaldo ? { iceServers: [], iceTransportPolicy: 'relay' } : { iceServers: STUN }));
        const par = { id, pc, f: null, r: null, abierto: false, caido: false, binario: null };
        this.pares.set(id, par);
        const preparar = canal => {
            canal.binaryType = 'arraybuffer';
            if (canal.label === 'r') par.r = canal; else par.f = canal;
            canal.onopen = () => this.revisarPar(par);
            canal.onclose = () => this.parCaido(par);
            canal.onmessage = ev => this.recibirDirecto(par, ev.data);
        };
        if (iniciador) {
            preparar(pc.createDataChannel('f'));
            preparar(pc.createDataChannel('r', { ordered: false, maxRetransmits: 0 }));
        } else pc.ondatachannel = ev => preparar(ev.channel);
        pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') this.parCaido(par); };
        return par;
    }
    // Espera a juntar los candidatos ICE: el SDP sale completo (sirve igual para un QR)
    async sdpCompleto(pc) {
        await new Promise(ok => {
            if (pc.iceGatheringState === 'complete') return ok();
            const plazo = setTimeout(ok, ESPERA_ICE);
            pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(plazo); ok(); } });
        });
        return pc.localDescription.sdp;
    }
    async crearOferta(id) {
        const par = this.nuevoPar(id, true);
        await par.pc.setLocalDescription(await par.pc.createOffer());
        return this.sdpCompleto(par.pc);
    }
    async aceptarOferta(id, sdp) {
        const par = this.nuevoPar(id, false);
        await par.pc.setRemoteDescription({ type: 'offer', sdp });
        await par.pc.setLocalDescription(await par.pc.createAnswer());
        return this.sdpCompleto(par.pc);
    }
    async aceptarRespuesta(id, sdp) {
        const par = this.pares.get(id);
        if (par && par.pc.signalingState === 'have-local-offer') await par.pc.setRemoteDescription({ type: 'answer', sdp });
    }

    // Invitado: oferta al anfitrión y espera a que se abran los canales
    async intentarDirecto() {
        const id = this.idAnfitrion;
        const sdp = await this.crearOferta(id);
        const par = this.pares.get(id);
        this.enviarSenal(id, { t: 'oferta', sdp });
        const fin = performance.now() + ESPERA_DIRECTO;
        while (performance.now() < fin && !par.abierto && !par.caido) await esperar(100);
        if (!par.abierto) { if (this.pares.get(id) === par) this.cerrarPar(id); return false; }
        return true;
    }
    programarReintento() {
        if (this.reintento || this.esAnfitrion || this.estado !== 'conectado' || !this.idAnfitrion) return;
        const espera = REINTENTOS[Math.min(this.intentos, REINTENTOS.length - 1)];
        this.reintento = setTimeout(async () => {
            this.reintento = null;
            this.intentos++;
            if (this.estado !== 'conectado' || this.directo) return;
            const ok = await this.intentarDirecto().catch(() => false);
            if (ok) this.intentos = 0; else this.programarReintento();
        }, espera);
    }

    revisarPar(par) {
        if (par.abierto || par.caido || !par.f || !par.r || par.f.readyState !== 'open' || par.r.readyState !== 'open') return;
        par.abierto = true;
        if (this.esAnfitrion) this.respaldo.delete(par.id);
        else this.cerrarRespaldo(); // ya no hace falta: todo llega por el canal directo
        this.emitir('via', { directo: true, id: par.id });
    }
    // El canal se cerró o la conexión falló
    parCaido(par) {
        if (par.caido) return;
        par.caido = true;
        const estaba = par.abierto;
        par.abierto = false;
        if (this.pares.get(par.id) === par) this.pares.delete(par.id);
        try { par.pc.close(); } catch (e) { /* ya cerrada */ }
        if (!estaba || this.estado !== 'conectado') return;
        if (this.esAnfitrion) { if (this.jugadores.has(par.id)) this.respaldo.add(par.id); }
        else { this.abrirRespaldo(); this.programarReintento(); }
        this.emitir('via', { directo: false, id: par.id });
    }
    // Cierre a propósito (sin pasar al respaldo)
    cerrarPar(id) {
        const par = this.pares.get(id);
        if (!par) return;
        par.caido = true;
        this.pares.delete(id);
        try { par.pc.close(); } catch (e) { /* ya cerrada */ }
    }
    // Para probar el respaldo: corta como si fallara la red
    cortarDirecto() { for (const par of [...this.pares.values()]) this.parCaido(par); }

    // ---------- Respaldo por Supabase ----------
    abrirRespaldo() {
        if (this.canalResp || !this.cliente) return Promise.resolve();
        return new Promise(ok => {
            const canal = this.cliente.channel('venjy-svr:' + this.codigo, { config: { broadcast: { self: false } } });
            this.canalResp = canal;
            canal.on('broadcast', { event: 'm' }, ({ payload }) => this.recibirRespaldo(payload));
            const plazo = setTimeout(ok, 5000);
            canal.subscribe(estado => {
                if (estado !== 'SUBSCRIBED') return;
                clearTimeout(plazo);
                if (!this.esAnfitrion && this.canalResp === canal) this.mandarRespaldo({ e: '_rh', de: this.id }); // «estoy en el respaldo»
                ok();
            });
        });
    }
    async cerrarRespaldo() {
        const c = this.canalResp;
        this.canalResp = null;
        if (c && this.cliente) { try { await this.cliente.removeChannel(c); } catch (e) { /* ya cerrado */ } }
    }
    mandarRespaldo(m) {
        if (!this.canalResp) return;
        this.cuenta.supaEnv++;
        this.canalResp.send({ type: 'broadcast', event: 'm', payload: m });
    }
    recibirRespaldo(m) {
        if (!m || m.de === this.id || typeof m.e !== 'string') return;
        this.cuenta.supaRec++;
        if (this.esAnfitrion) {
            if (!this.jugadores.has(m.de)) return;
            this.respaldo.add(m.de);
            if (m.e === '_rh') return;
            if (m.para !== this.id) this.repartir(m, m.de, false); // a los directos (los de respaldo ya lo oyeron)
            if (!m.para || m.para === this.id) this.emitir(m.e, m);
        } else {
            if (this.directo || m.e[0] === '_' || (m.para && m.para !== this.id)) return;
            this.emitir(m.e, m);
        }
    }

    // ---------- Enviar y recibir ----------
    enviar(evento, dato = {}) {
        if (!this.activa) return;
        const m = { e: evento, de: this.id, ...dato };
        const texto = JSON.stringify(m);
        this.cuenta.enviados++;
        if (this.medirBytes) this.cuenta.bytesEnviados += texto.length;
        if (this.esAnfitrion) this.repartir(m, null, true, texto);
        else if (this.directo) this.mandarPar(this.pares.get(this.idAnfitrion), evento, texto);
        else this.mandarRespaldo(m);
    }
    // Anfitrión: manda m a los directos (menos `excepto`) y, si hace falta, al respaldo
    repartir(m, excepto, aRespaldo, texto = JSON.stringify(m)) {
        for (const par of this.pares.values()) {
            if (!par.abierto || par.id === excepto || (m.para && m.para !== par.id)) continue;
            this.mandarPar(par, m.e, texto);
        }
        if (aRespaldo && this.respaldo.size && (!m.para || this.respaldo.has(m.para))) this.mandarRespaldo(m);
    }
    mandarPar(par, evento, texto) {
        const c = evento === 'p' ? par.r : par.f;
        if (!c || c.readyState !== 'open') return;
        if (evento === 'p' && c.bufferedAmount > 64 * 1024) return; // congestionado: se salta una posición
        c.send(texto);
        this.cuenta.dirEnv++;
    }
    recibirDirecto(par, data) {
        if (typeof data !== 'string') { this.recibirTrozo(par, data); return; }
        let m;
        try { m = JSON.parse(data); } catch (e) { return; }
        if (!m || typeof m.e !== 'string') return;
        this.cuenta.dirRec++;
        if (m.e === '_fb') { par.binario = { n: m.n | 0, partes: [], llevo: 0 }; return; }
        if (this.esAnfitrion) {
            m.de = par.id; // el anfitrión sabe por qué conexión llegó
            if (m.para !== this.id) this.repartir(m, par.id, true);
            if (!m.para || m.para === this.id) this.emitir(m.e, m);
        } else {
            if (m.para && m.para !== this.id) return;
            this.emitir(m.e, m);
        }
    }

    // ---------- Binarios (la foto del mundo) ----------
    // Anfitrión: manda bytes a un invitado directo por el canal fiable. false si no hay canal directo.
    async enviarBytes(para, bytes) {
        const par = this.pares.get(para);
        if (!par || !par.abierto) return false;
        const c = par.f;
        c.bufferedAmountLowThreshold = 256 * 1024;
        c.send(JSON.stringify({ e: '_fb', n: bytes.length }));
        for (let i = 0; i < bytes.length; i += TROZO) {
            if (c.bufferedAmount > 1024 * 1024) await new Promise(ok => c.addEventListener('bufferedamountlow', ok, { once: true }));
            if (c.readyState !== 'open') return false;
            c.send(bytes.subarray(i, i + TROZO));
        }
        return true;
    }
    recibirTrozo(par, buf) {
        const b = par.binario;
        if (!b) return;
        b.partes.push(new Uint8Array(buf));
        b.llevo += buf.byteLength;
        if (b.llevo < b.n) return;
        par.binario = null;
        const todo = new Uint8Array(b.n);
        let o = 0;
        for (const p of b.partes) { todo.set(p.subarray(0, b.n - o), o); o += p.length; }
        this.bytesListos.push(todo);
    }
    // Invitado: el último binario completo que llegó (o null)
    tomarBytes() { return this.bytesListos.shift() || null; }

    // Mensajes por segundo. `cobradosPorSeg` = lo que este equipo gasta en Supabase (enviados + recibidos,
    // sin Presence): el gasto de la sala es la suma de todos los equipos.
    estadisticas(reiniciar = false) {
        const c = this.cuenta, s = Math.max(0.001, (performance.now() - c.desde) / 1000);
        const ps = n => +(n / s).toFixed(2);
        const r = {
            segundos: +s.toFixed(1),
            via: this.esAnfitrion ? { directos: [...this.pares.values()].filter(p => p.abierto).length, respaldo: this.respaldo.size } : (this.directo ? 'directo' : 'respaldo'),
            enviadosPorSeg: ps(c.enviados),
            directoEnviadosPorSeg: ps(c.dirEnv), directoRecibidosPorSeg: ps(c.dirRec),
            supabaseEnviadosPorSeg: ps(c.supaEnv), supabaseRecibidosPorSeg: ps(c.supaRec),
            cobradosPorSeg: ps(c.supaEnv + c.supaRec),
            bytesPorMensaje: c.enviados ? Math.round(c.bytesEnviados / c.enviados) : 0
        };
        if (reiniciar) this.cuenta = cuentaNueva();
        return r;
    }

    async salir() {
        clearTimeout(this.reintento);
        this.reintento = null;
        for (const id of [...this.pares.keys()]) this.cerrarPar(id);
        this.respaldo.clear();
        await this.cerrarRespaldo();
        await super.salir();
    }
}
