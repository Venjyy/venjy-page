// =========================================================
// VENJY · Red del modo online (Supabase Realtime)
// - Presence: quién está en la sala (nombre, aspecto).
// - Broadcast: posiciones, bloques, golpes y estado de la partida.
// - Postgres: salas y cambios de bloques, para quien entra tarde.
// Supabase se carga solo al entrar a una sala: sin ella, nada de esto se descarga.
// =========================================================
import { CONFIG_ONLINE, ONLINE_ACTIVO, HZ_POSICION, MAX_JUGADORES } from './config.js';

export const CODIGO_VALIDO = /^[A-Z0-9]{3,12}$/;
export function normalizarCodigo(t) { return String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
export function normalizarNombre(t) { return String(t || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 14); }

function idAleatorio() {
    const a = new Uint8Array(6);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

function fallo(codigo, mensaje) { return Object.assign(new Error(mensaje), { codigo }); }

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
    }

    get activa() { return this.estado === 'conectado'; }
    get llena() { return this.jugadores.size + 1 > MAX_JUGADORES; }

    en(evento, fn) {
        if (!this.escuchas.has(evento)) this.escuchas.set(evento, []);
        this.escuchas.get(evento).push(fn);
    }
    emitir(evento, dato) { for (const fn of this.escuchas.get(evento) || []) fn(dato); }

    // Entra a una sala. Devuelve { cambios } con los bloques ya editados; lanza Error con .codigo
    async entrar({ codigo, nombre, aspecto, modo = 'libre' }) {
        if (!ONLINE_ACTIVO) throw fallo('sin-config', 'sin configurar');
        codigo = normalizarCodigo(codigo);
        nombre = normalizarNombre(nombre);
        if (!CODIGO_VALIDO.test(codigo)) throw fallo('codigo', 'código inválido');
        if (!nombre) throw fallo('nombre', 'nombre vacío');
        this.codigo = codigo; this.nombre = nombre; this.aspecto = aspecto;
        this.estado = 'conectando';
        try {
            const { createClient } = await import('../../vendor/supabase.js');
            this.cliente = createClient(CONFIG_ONLINE.url, CONFIG_ONLINE.clave, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
                realtime: { params: { eventsPerSecond: 40 } }
            });
            // La sala se crea si no existe (sin pisar una existente)
            const r = await this.cliente.from('salas').upsert({ codigo, modo }, { onConflict: 'codigo', ignoreDuplicates: true });
            if (r.error) throw fallo('base', r.error.message);
            const { data: sala } = await this.cliente.from('salas').select('modo, ronda').eq('codigo', codigo).single();
            this.modoSala = sala ? sala.modo : modo;
            this.ronda = sala ? sala.ronda : 0;

            await this.conectarCanal();
            if (this.llena) throw fallo('llena', 'sala llena');
            const cambios = await this.leerCambios('libre');
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
            const canal = this.cliente.channel('venjy:' + this.codigo, {
                config: { broadcast: { self: false }, presence: { key: this.id } }
            });
            this.canal = canal;
            canal.on('presence', { event: 'sync' }, () => this.sincronizarPresencia());
            canal.on('broadcast', { event: 'm' }, ({ payload }) => {
                if (!payload || payload.de === this.id) return;
                this.emitir(payload.e, payload);
            });
            const plazo = setTimeout(() => mal(fallo('tiempo', 'tiempo agotado conectando')), 10000);
            canal.subscribe(async estado => {
                if (estado === 'SUBSCRIBED') {
                    clearTimeout(plazo);
                    await canal.track({ nombre: this.nombre, aspecto: this.aspecto, entro: Date.now() });
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
        const antes = this.jugadores;
        this.jugadores = nuevos;
        for (const [id, m] of nuevos) if (!antes.has(id)) this.emitir('entra', { id, ...m });
        for (const id of antes.keys()) if (!nuevos.has(id)) this.emitir('sale', { id });
        this.emitir('jugadores', { total: nuevos.size + 1 });
    }

    // Envía un evento a todos los demás. Los datos deben ser pequeños.
    enviar(evento, dato = {}) {
        if (!this.activa || !this.canal) return;
        this.canal.send({ type: 'broadcast', event: 'm', payload: { e: evento, de: this.id, ...dato } });
    }

    // Posición a ~HZ_POSICION: se llama cada cuadro y se limita sola
    enviarPosicion(j, extra = {}) {
        const t = performance.now();
        if (t - this.ultimoEnvio < 1000 / HZ_POSICION) return;
        this.ultimoEnvio = t;
        const r = n => Math.round(n * 100) / 100;
        this.enviar('pos', { x: r(j.pos.x), y: r(j.pos.y), z: r(j.pos.z), yaw: r(j.yaw), pit: r(j.pitch), v: j.vuela ? 1 : 0, ...extra });
    }

    // ---- Bloques ----
    async leerCambios(mundo) {
        const todos = [];
        for (let desde = 0; ; desde += 1000) {
            const { data, error } = await this.cliente.from('cambios_bloques')
                .select('x,y,z,bloque').eq('sala', this.codigo).eq('mundo', mundo)
                .order('x').order('z').order('y').range(desde, desde + 999);
            if (error) throw fallo('base', error.message);
            for (const f of data) todos.push([f.x, f.y, f.z, f.bloque]);
            if (data.length < 1000) break;
        }
        return todos;
    }

    // Cambio de bloque: se avisa a todos al instante y se guarda en lote (gana el último por posición)
    cambiarBloque(x, y, z, id, mundo = 'libre') {
        this.enviar('bloque', { x, y, z, b: id, mu: mundo });
        this.pendientes.set(mundo + '|' + x + ',' + y + ',' + z, { sala: this.codigo, mundo, x, y, z, bloque: id });
        if (!this.temporizador) this.temporizador = setTimeout(() => this.guardarPendientes(), 400);
    }

    async guardarPendientes() {
        this.temporizador = null;
        if (!this.cliente || !this.pendientes.size) return;
        const filas = Array.from(this.pendientes.values());
        this.pendientes.clear();
        for (let i = 0; i < filas.length; i += 500) {
            const r = await this.cliente.from('cambios_bloques').upsert(filas.slice(i, i + 500), { onConflict: 'sala,mundo,x,y,z' });
            if (r.error) console.warn('no se guardaron bloques:', r.error.message);
        }
    }

    async reiniciarBloques(mundo) {
        this.pendientes.clear();
        if (this.cliente) await this.cliente.rpc('reiniciar_sala', { p_codigo: this.codigo, p_mundo: mundo });
    }

    async guardarRonda(ronda, modo) {
        if (this.cliente) await this.cliente.from('salas').update({ ronda, modo, actualizada: new Date().toISOString() }).eq('codigo', this.codigo);
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
