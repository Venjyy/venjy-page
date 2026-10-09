// =========================================================
// VENJY · Señal WebRTC para el QR (supervivencia sin internet)
// Una oferta o respuesta de canal de datos cabe en ~100 bytes si se guarda solo lo que cambia:
// ice-ufrag, ice-pwd, la huella SHA-256 del certificado, el rol DTLS y los candidatos UDP. El otro
// lado rearma el SDP con una plantilla. Si el SDP trae algo que no conocemos, se manda entero
// con deflate-raw (formato 2). El texto va en base45 (RFC 9285): es el alfabeto del modo
// alfanumérico del QR, el más denso para texto, y se puede copiar y pegar.
//
// Bytes (formato 1, compacto):
//   0 versión (1) · 1 banderas (bit 0 respuesta · bits 1-2 setup) · ids (6 bytes c/u: oferta h + s,
//   respuesta s) · ufrag y pwd (largo + 6 bits por carácter) · huella (32) · nº de candidatos ·
//   por candidato: tipo (bits 0-1 host/srflx/prflx/relay, bits 2-3 dirección mDNS/IPv4/IPv6/texto),
//   dirección (16 / 4 / 16 / largo + texto) y puerto (2)
// Formato 2 (respaldo): versión (2) · banderas · ids · SDP con deflate-raw
// No usa nada del navegador salvo CompressionStream (también existe en Node 18+): se prueba en
// mundo/tests/senal-qr.mjs.
// =========================================================

export const PREFIJO = 'VENJY:';   // envuelve el texto: así recortar espacios al pegar no rompe nada
const FIN = '/';
const COMPACTO = 1, ENTERO = 2;
const SETUP = ['actpass', 'active', 'passive'];
const TIPOS = ['host', 'srflx', 'prflx', 'relay'];
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; // = ice-char (RFC 8839)
const UUID_MDNS = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\.local$/;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// Líneas que se pueden ignorar porque la plantilla las pone (o no hacen falta para un canal de datos)
const IGNORABLES = /^(v=0|o=.*|s=.*|t=0 0|c=IN IP[46] .*|a=group:BUNDLE 0|a=extmap-allow-mixed|a=msid-semantic:.*|a=ice-options:trickle|a=sendrecv|a=end-of-candidates|a=max-message-size:\d+|a=sctp-port:5000|a=mid:0|m=application 9 UDP\/DTLS\/SCTP webrtc-datachannel)$/;

const sinSoporte = motivo => Object.assign(new Error('sdp: ' + motivo), { sinSoporte: true });

// ---------------------------------------------------------
// SDP → partes (lanza sinSoporte si hay algo desconocido)
// ---------------------------------------------------------
export function partesDeSdp(sdp) {
    const p = { ufrag: null, pwd: null, huella: null, setup: null, candidatos: [] };
    let medios = 0;
    for (const linea of sdp.split(/\r?\n/)) {
        if (!linea) continue;
        if (linea.startsWith('m=')) medios++;
        if (IGNORABLES.test(linea)) continue;
        let m;
        if ((m = /^a=ice-ufrag:([A-Za-z0-9+/]{4,63})$/.exec(linea))) p.ufrag = m[1];
        else if ((m = /^a=ice-pwd:([A-Za-z0-9+/]{22,63})$/.exec(linea))) p.pwd = m[1];
        else if ((m = /^a=fingerprint:sha-256 ((?:[0-9A-Fa-f]{2}:){31}[0-9A-Fa-f]{2})$/.exec(linea))) p.huella = m[1].split(':').map(h => parseInt(h, 16));
        else if ((m = /^a=setup:(actpass|active|passive)$/.exec(linea))) p.setup = m[1];
        else if (linea.startsWith('a=candidate:')) {
            const c = candidato(linea);
            if (c) p.candidatos.push(c);
        } else throw sinSoporte('línea desconocida: ' + linea);
    }
    if (medios !== 1) throw sinSoporte(medios + ' secciones m=');
    if (!p.ufrag || !p.pwd || !p.huella || !p.setup) throw sinSoporte('faltan ufrag, pwd, huella o setup');
    if (p.candidatos.length > 15) throw sinSoporte('demasiados candidatos');
    return p;
}
// a=candidate:<fundación> 1 udp <prioridad> <dirección> <puerto> typ <tipo> [...]
// Los candidatos TCP se descartan (el juego solo usa UDP); los raros (otro componente) son error
function candidato(linea) {
    const t = linea.slice(12).split(' ');
    if (t.length < 8 || t[6] !== 'typ') throw sinSoporte('candidato raro: ' + linea);
    const transporte = t[2].toLowerCase();
    if (transporte === 'tcp') return null;
    if (transporte !== 'udp' || t[1] !== '1') throw sinSoporte('candidato raro: ' + linea);
    const tipo = TIPOS.indexOf(t[7]), puerto = Number(t[5]);
    if (tipo < 0 || !(puerto > 0 && puerto < 65536)) throw sinSoporte('candidato raro: ' + linea);
    return { dir: t[4], puerto, tipo };
}

// Partes → SDP (la plantilla acepta Chrome, Edge, Firefox y Safari)
export function sdpDePartes(p) {
    const huella = p.huella.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(':');
    const l = [
        'v=0', 'o=- ' + (1e15 + Math.floor(Math.random() * 8e15)) + ' 2 IN IP4 127.0.0.1', 's=-', 't=0 0',
        'a=group:BUNDLE 0', 'a=msid-semantic: WMS',
        'm=application 9 UDP/DTLS/SCTP webrtc-datachannel', 'c=IN IP4 0.0.0.0'
    ];
    p.candidatos.forEach((c, i) => {
        // Prioridad: tipo (RFC 8445: host 126, srflx 100, prflx 110, relay 0) y el orden original
        const pref = [126, 100, 110, 0][c.tipo];
        const prioridad = pref * 2 ** 24 + (65535 - i) * 256 + 255;
        let s = `a=candidate:${i + 1} 1 udp ${prioridad} ${c.dir} ${c.puerto} typ ${TIPOS[c.tipo]}`;
        if (c.tipo !== 0) s += ' raddr 0.0.0.0 rport 0';
        l.push(s);
    });
    l.push('a=end-of-candidates', 'a=ice-ufrag:' + p.ufrag, 'a=ice-pwd:' + p.pwd, 'a=ice-options:trickle',
        'a=fingerprint:sha-256 ' + huella, 'a=setup:' + p.setup, 'a=mid:0', 'a=sctp-port:5000', 'a=max-message-size:262144');
    return l.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------
// Bytes
// ---------------------------------------------------------
class Escritor {
    constructor() { this.b = []; }
    byte(n) { this.b.push(n & 255); }
    bytes(a) { for (const n of a) this.byte(n); }
    u16(n) { this.byte(n >> 8); this.byte(n); }
    hex(h) { for (let i = 0; i < h.length; i += 2) this.byte(parseInt(h.slice(i, i + 2), 16)); }
    texto(s) { const t = new TextEncoder().encode(s); this.byte(t.length); this.bytes(t); }
    // ice-char: 6 bits por carácter
    ice(s) {
        this.byte(s.length);
        let acc = 0, bits = 0;
        for (const ch of s) {
            acc = ((acc << 6) | B64.indexOf(ch)) & 0xffff; bits += 6;
            while (bits >= 8) { bits -= 8; this.byte(acc >> bits); }
        }
        if (bits) this.byte(acc << (8 - bits));
    }
    get resultado() { return new Uint8Array(this.b); }
}
class Lector {
    constructor(b) { this.b = b; this.i = 0; }
    byte() { if (this.i >= this.b.length) throw new Error('señal cortada'); return this.b[this.i++]; }
    bytes(n) { const a = []; for (let k = 0; k < n; k++) a.push(this.byte()); return a; }
    u16() { return (this.byte() << 8) | this.byte(); }
    hex(n) { return this.bytes(n).map(b => b.toString(16).padStart(2, '0')).join(''); }
    texto() { return new TextDecoder().decode(new Uint8Array(this.bytes(this.byte()))); }
    ice() {
        const n = this.byte();
        let acc = 0, bits = 0, s = '';
        while (s.length < n) {
            if (bits < 6) { acc = ((acc << 8) | this.byte()) & 0xffff; bits += 8; }
            bits -= 6; s += B64[(acc >> bits) & 63];
        }
        return s;
    }
    get resto() { return this.b.subarray(this.i); }
}

function escribirDireccion(e, c) {
    let m;
    if ((m = UUID_MDNS.exec(c.dir))) { e.byte(c.tipo); e.hex(m.slice(1).join('')); }
    else if ((m = IPV4.exec(c.dir)) && m.slice(1).every(n => +n < 256)) { e.byte(c.tipo | 4); e.bytes(m.slice(1).map(Number)); }
    else if (/^[0-9a-f:]+$/i.test(c.dir) && c.dir.includes(':')) { e.byte(c.tipo | 8); e.bytes(ipv6Bytes(c.dir)); }
    else if (c.dir.length < 64) { e.byte(c.tipo | 12); e.texto(c.dir); }
    else throw sinSoporte('dirección rara');
    e.u16(c.puerto);
}
function leerDireccion(l) {
    const k = l.byte(), tipo = k & 3, forma = k >> 2;
    let dir;
    if (forma === 0) { const h = l.hex(16); dir = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}.local`; }
    else if (forma === 1) dir = l.bytes(4).join('.');
    else if (forma === 2) { const b = l.bytes(16); const g = []; for (let i = 0; i < 16; i += 2) g.push(((b[i] << 8) | b[i + 1]).toString(16)); dir = g.join(':'); }
    else dir = l.texto();
    return { dir, puerto: l.u16(), tipo };
}
function ipv6Bytes(s) {
    const [a, b = ''] = s.split('::');
    const ga = a ? a.split(':') : [], gb = b ? b.split(':') : [];
    const grupos = s.includes('::') ? [...ga, ...Array(8 - ga.length - gb.length).fill('0'), ...gb] : ga;
    if (grupos.length !== 8) throw sinSoporte('IPv6 rara');
    return grupos.flatMap(g => { const n = parseInt(g, 16); return [n >> 8, n & 255]; });
}

async function flujo(bytes, transformador) {
    const s = new Blob([bytes]).stream().pipeThrough(transformador);
    return new Uint8Array(await new Response(s).arrayBuffer());
}

// ---------------------------------------------------------
// Base45 (RFC 9285)
// ---------------------------------------------------------
const B45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
export function aBase45(b) {
    let s = '';
    for (let i = 0; i + 1 < b.length; i += 2) {
        let n = b[i] * 256 + b[i + 1];
        s += B45[n % 45]; n = Math.floor(n / 45); s += B45[n % 45]; s += B45[Math.floor(n / 45)];
    }
    if (b.length % 2) { const n = b[b.length - 1]; s += B45[n % 45] + B45[Math.floor(n / 45)]; }
    return s;
}
export function deBase45(s) {
    const v = [...s].map(c => { const i = B45.indexOf(c); if (i < 0) throw new Error('carácter inválido'); return i; });
    if (v.length % 3 === 1) throw new Error('largo inválido');
    const out = [];
    for (let i = 0; i < v.length; i += 3) {
        if (i + 2 < v.length) { const n = v[i] + v[i + 1] * 45 + v[i + 2] * 2025; if (n > 65535) throw new Error('valor inválido'); out.push(n >> 8, n & 255); }
        else { const n = v[i] + v[i + 1] * 45; if (n > 255) throw new Error('valor inválido'); out.push(n); }
    }
    return new Uint8Array(out);
}

// ---------------------------------------------------------
// API: { t: 'oferta' | 'respuesta', h (id del anfitrión, solo oferta), s (id del puesto), sdp } ⇄ texto
// ---------------------------------------------------------
export async function codificar({ t, h, s, sdp }) {
    const respuesta = t === 'respuesta';
    const ids = respuesta ? [s] : [h, s];
    if (!ids.every(id => /^[0-9a-f]{12}$/.test(id || ''))) throw new Error('ids inválidos');
    const e = new Escritor();
    let p = null;
    try { p = partesDeSdp(sdp); } catch (err) { if (!err.sinSoporte) throw err; console.warn('señal QR: va el SDP entero:', err.message); }
    e.byte(p ? COMPACTO : ENTERO);
    e.byte((respuesta ? 1 : 0) | ((p ? SETUP.indexOf(p.setup) : 0) << 1));
    for (const id of ids) e.hex(id);
    if (p) {
        e.ice(p.ufrag); e.ice(p.pwd); e.bytes(p.huella);
        e.byte(p.candidatos.length);
        for (const c of p.candidatos) escribirDireccion(e, c);
    } else e.bytes(await flujo(new TextEncoder().encode(sdp), new CompressionStream('deflate-raw')));
    const bytes = e.resultado;
    return { texto: PREFIJO + aBase45(bytes) + FIN, bytes: bytes.length, compacto: !!p };
}

export async function decodificar(texto) {
    texto = String(texto || '').replace(/[\r\n]/g, '').trim();
    if (!texto.startsWith(PREFIJO) || !texto.endsWith(FIN)) throw new Error('no es un código de Venjy');
    const l = new Lector(deBase45(texto.slice(PREFIJO.length, -FIN.length)));
    const version = l.byte(), banderas = l.byte();
    if (version !== COMPACTO && version !== ENTERO) throw new Error('versión desconocida');
    const respuesta = !!(banderas & 1);
    const r = { t: respuesta ? 'respuesta' : 'oferta' };
    if (!respuesta) r.h = l.hex(6);
    r.s = l.hex(6);
    if (version === COMPACTO) {
        const p = { setup: SETUP[(banderas >> 1) & 3], ufrag: l.ice(), pwd: l.ice(), huella: l.bytes(32), candidatos: [] };
        if (!p.setup) throw new Error('setup inválido');
        const n = l.byte();
        for (let i = 0; i < n; i++) p.candidatos.push(leerDireccion(l));
        r.sdp = sdpDePartes(p);
    } else r.sdp = new TextDecoder().decode(await flujo(l.resto, new DecompressionStream('deflate-raw')));
    return r;
}
