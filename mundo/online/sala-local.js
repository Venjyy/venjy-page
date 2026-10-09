// =========================================================
// VENJY · SalaLocal · supervivencia cooperativa sin internet (misma red, con QR)
// Misma interfaz que SalaDirecta, pero sin Supabase (no se descarga nada de él):
// - Señalización: el anfitrión muestra la oferta en un QR (o texto) con un id de puesto que el
//   invitado adopta como su id; el invitado responde con otro QR que el anfitrión escanea. Un ida y
//   vuelta por invitado (senal-qr.js: ~110 bytes, QR versión 10-11 con corrección H).
// - Presence: el invitado se presenta con `_hola` por el canal fiable `f` y el anfitrión reparte la
//   lista completa (`_lista`, con el código de la sala) cada vez que alguien entra, sale o cambia de skin.
// - Sin STUN: solo candidatos de la red local (en Chrome y Firefox son nombres mDNS `*.local`).
// - Sin respaldo: si el canal de un invitado se cae, para él la sala termina (estado 'error') y para
//   los demás sale de la lista. Para volver hace falta una invitación nueva.
// =========================================================
import { SalaDirecta, idAleatorio, fallo, normalizarNombre } from './red.js';
import { codificar, decodificar } from './senal-qr.js';

const ESPERA_CANALES = 15000;  // ms para abrir los canales después de leer la respuesta
const ESPERA_CAIDA = 8000;     // ms en 'disconnected' antes de dar la conexión por perdida
const esperar = ms => new Promise(r => setTimeout(r, ms));

export class SalaLocal extends SalaDirecta {
    constructor() {
        super();
        this.local = true;
        this.forzarRespaldo = false;
        this.configIce = { iceServers: [] };
        this.invitacion = null;    // (anfitrión) id del puesto con la oferta en pantalla
        this.listaRecibida = false;
    }

    // Anfitrión: la sala existe desde ya. Invitado: queda «conectando» hasta abrir los canales.
    async entrar({ codigo = '', nombre, aspecto = null, max, meta = {} }) {
        this.nombre = normalizarNombre(nombre);
        if (!this.nombre) throw fallo('nombre', 'nombre vacío');
        Object.assign(this, { codigo, aspecto, max, meta, coop: true, publica: true });
        this.esAnfitrion = !!meta.anf;
        this.estado = this.esAnfitrion ? 'conectado' : 'conectando';
        return { cambios: [] };
    }
    metaPublica() { return { nombre: this.nombre, aspecto: this.aspecto, entro: Date.now(), ...this.meta }; }

    // ---------- Anfitrión ----------
    // Oferta para un invitado nuevo: { texto, bytes, compacto }. Solo hay una pendiente a la vez.
    async invitar() {
        if (this.jugadores.size + 1 >= this.max) throw fallo('llena', 'sala llena');
        this.cancelarInvitacion();
        const s = idAleatorio();
        this.invitacion = s;
        const sdp = await this.crearOferta(s);
        if (this.invitacion !== s) throw fallo('cancelada', 'invitación cancelada');
        return codificar({ t: 'oferta', h: this.id, s, sdp });
    }
    cancelarInvitacion() {
        if (this.invitacion) this.cerrarPar(this.invitacion);
        this.invitacion = null;
    }
    // Lee la respuesta del invitado y espera a que se presente. Devuelve su id.
    async recibirRespuesta(texto) {
        const r = await decodificar(texto).catch(() => { throw fallo('qr-ilegible', 'código ilegible'); });
        if (r.t !== 'respuesta') throw fallo('qr-tipo', 'eso es una invitación, no una respuesta');
        const par = this.pares.get(r.s);
        if (!par || r.s !== this.invitacion) throw fallo('qr-otra', 'la respuesta es de otra invitación');
        await this.aceptarRespuesta(r.s, r.sdp);
        this.invitacion = null;
        const fin = performance.now() + ESPERA_CANALES;
        while (performance.now() < fin && !this.jugadores.has(r.s) && !par.caido) await esperar(100);
        if (!this.jugadores.has(r.s)) { this.cerrarPar(r.s); throw fallo('qr-conexion', 'no se abrió la conexión'); }
        return r.s;
    }
    recibirHola(par, m) {
        if (!m || typeof m !== 'object' || this.pares.get(par.id) !== par) return;
        const meta = {
            nombre: normalizarNombre(m.nombre) || '?', aspecto: m.aspecto ?? null, entro: Number(m.entro) || Date.now(),
            disp: String(m.disp || '').slice(0, 40), skin: m.skin && typeof m.skin === 'object' ? m.skin : null
        };
        const nuevos = new Map(this.jugadores);
        nuevos.set(par.id, meta);
        this.ponerJugadores(nuevos);
        this.repartirLista();
    }
    repartirLista() {
        const l = { [this.id]: this.metaPublica() };
        for (const [id, m] of this.jugadores) l[id] = m;
        const texto = JSON.stringify({ e: '_lista', de: this.id, c: this.codigo, l });
        for (const par of this.pares.values()) if (par.abierto) this.mandarPar(par, '_lista', texto);
    }

    // ---------- Invitado ----------
    // Lee la invitación y devuelve la respuesta para mostrar: { texto, bytes, compacto }
    async aceptarInvitacion(texto) {
        const r = await decodificar(texto).catch(() => { throw fallo('qr-ilegible', 'código ilegible'); });
        if (r.t !== 'oferta') throw fallo('qr-tipo', 'eso es una respuesta, no una invitación');
        this.id = r.s;
        this.idAnfitrion = r.h;
        const sdp = await this.aceptarOferta(r.h, r.sdp);
        return codificar({ t: 'respuesta', s: r.s, sdp });
    }
    // Espera a que el anfitrión lea la respuesta y mande la lista de jugadores
    async esperarAnfitrion(ms, cancelado = () => false) {
        const fin = performance.now() + ms;
        while (performance.now() < fin && !this.listaRecibida && !cancelado()) await esperar(100);
        if (!this.listaRecibida) throw fallo(cancelado() ? 'cancelada' : 'qr-conexion', 'el anfitrión no conectó');
    }
    recibirLista(m) {
        if (!m.l || typeof m.l !== 'object') return;
        if (typeof m.c === 'string') this.codigo = m.c;
        const nuevos = new Map();
        for (const [id, meta] of Object.entries(m.l)) if (id !== this.id && meta) nuevos.set(id, meta);
        this.listaRecibida = true;
        this.ponerJugadores(nuevos);
    }

    // ---------- Conexiones ----------
    nuevoPar(id, iniciador) {
        const par = super.nuevoPar(id, iniciador);
        // 'disconnected' a veces se arregla solo; si dura, se da por perdida (Chrome tarda ~30 s en 'failed')
        let plazo = null;
        par.pc.addEventListener('connectionstatechange', () => {
            clearTimeout(plazo);
            if (par.pc.connectionState === 'disconnected') plazo = setTimeout(() => this.parCaido(par), ESPERA_CAIDA);
        });
        return par;
    }
    revisarPar(par) {
        if (par.abierto || par.caido || !par.f || !par.r || par.f.readyState !== 'open' || par.r.readyState !== 'open') return;
        par.abierto = true;
        if (!this.esAnfitrion) {
            this.estado = 'conectado';
            this.mandarPar(par, '_hola', JSON.stringify({ e: '_hola', de: this.id, m: this.metaPublica() }));
        }
    }
    parCaido(par) {
        if (par.caido) return;
        par.caido = true;
        par.abierto = false;
        if (this.pares.get(par.id) === par) this.pares.delete(par.id);
        try { par.pc.close(); } catch (e) { /* ya cerrada */ }
        if (this.esAnfitrion) {
            if (this.invitacion === par.id) this.invitacion = null;
            if (!this.jugadores.has(par.id)) return;
            const nuevos = new Map(this.jugadores);
            nuevos.delete(par.id);
            this.ponerJugadores(nuevos);
            this.repartirLista();
        } else if (this.estado === 'conectado') {
            this.estado = 'error';
            this.emitir('estado', { estado: 'error' });
        }
    }
    recibirDirecto(par, data) {
        if (typeof data === 'string' && (data.startsWith('{"e":"_hola"') || data.startsWith('{"e":"_lista"'))) {
            let m;
            try { m = JSON.parse(data); } catch (e) { return; }
            if (m.e === '_hola' && this.esAnfitrion) this.recibirHola(par, m.m);
            else if (m.e === '_lista' && !this.esAnfitrion && par.id === this.idAnfitrion) this.recibirLista(m);
            return;
        }
        super.recibirDirecto(par, data);
    }

    // Cambió la skin: el anfitrión reparte la lista; el invitado se vuelve a presentar
    async anunciar(meta) {
        this.meta = { ...this.meta, ...meta };
        if (this.esAnfitrion) this.repartirLista();
        else {
            const par = this.pares.get(this.idAnfitrion);
            if (par && par.abierto) this.mandarPar(par, '_hola', JSON.stringify({ e: '_hola', de: this.id, m: this.metaPublica() }));
        }
    }

    // Sin Supabase no hay nada que contar ahí
    abrirRespaldo() { return Promise.resolve(); }
    programarReintento() {}
    enviarSenal() {}
    async salir() {
        this.invitacion = null;
        await super.salir();
    }
}
