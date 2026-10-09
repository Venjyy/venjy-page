// Prueba de la señal del QR: node mundo/tests/senal-qr.mjs
// SDP reales de Chrome 152 y Firefox 157 (sdp-chrome.json, sdp-firefox.json): oferta y respuesta de
// un RTCPeerConnection con los canales `f` y `r`, sin servidores ICE (como en el modo sin internet).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { codificar, decodificar, partesDeSdp, aBase45, deBase45 } from '../online/senal-qr.js';
import qrcode from '../../vendor/qrcode.js';

const require = createRequire(import.meta.url);
const jsQR = require('../../vendor/jsQR.js');
let fallos = 0;
const ok = (cond, msg) => { if (!cond) { fallos++; console.log('FALLA:', msg); } };
const leer = n => JSON.parse(readFileSync(new URL(n, import.meta.url), 'utf8'));
const H = 'a1b2c3d4e5f6', S = '0123456789ab';

// Lo que importa del SDP: ufrag, pwd, huella, setup y candidatos UDP (sin los TCP)
const esencia = sdp => { const p = partesDeSdp(sdp); return JSON.stringify([p.ufrag, p.pwd, p.huella, p.setup, p.candidatos.map(c => [c.dir, c.puerto, c.tipo])]); };

// Lee el QR con jsQR (el mismo lector del navegador) a partir de la matriz de módulos
function leerQR(q, escala = 4) {
    const n = q.getModuleCount(), borde = 4, lado = (n + borde * 2) * escala;
    const px = new Uint8ClampedArray(lado * lado * 4).fill(255);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if (!q.isDark(y, x)) continue;
        for (let dy = 0; dy < escala; dy++) for (let dx = 0; dx < escala; dx++) {
            const i = (((y + borde) * escala + dy) * lado + (x + borde) * escala + dx) * 4;
            px[i] = px[i + 1] = px[i + 2] = 0;
        }
    }
    const r = jsQR(px, lado, lado);
    return r ? r.data : null;
}

console.log('navegador  | tipo      | SDP    | bytes | texto | QR (H)');
for (const [nav, archivo] of [['Chrome', 'sdp-chrome.json'], ['Firefox', 'sdp-firefox.json']]) {
    const f = leer(archivo);
    for (const t of ['oferta', 'respuesta']) {
        const sdp = f[t];
        const c = await codificar({ t, h: H, s: S, sdp });
        ok(c.compacto, `${nav} ${t}: debería caber en el formato compacto`);
        const d = await decodificar(c.texto);
        ok(d.t === t && d.s === S && (t === 'respuesta' || d.h === H), `${nav} ${t}: ids`);
        ok(esencia(d.sdp) === esencia(sdp), `${nav} ${t}: el SDP rearmado conserva lo esencial`);
        ok(/^[0-9A-Z $%*+\-./:]+$/.test(c.texto), `${nav} ${t}: texto en el alfabeto del QR`);
        // Copiar y pegar: saltos de línea y espacios alrededor no importan
        ok(esencia((await decodificar(' ' + c.texto.slice(0, 40) + '\n' + c.texto.slice(40) + ' ')).sdp) === esencia(sdp), `${nav} ${t}: pegado con saltos de línea`);
        const q = qrcode(0, 'H');
        q.addData(c.texto, 'Alphanumeric');
        q.make();
        const n = q.getModuleCount();
        ok(leerQR(q) === c.texto, `${nav} ${t}: jsQR lee el QR`);
        console.log(`${nav.padEnd(10)} | ${t.padEnd(9)} | ${String(sdp.length).padStart(4)} B | ${String(c.bytes).padStart(5)} | ${String(c.texto.length).padStart(5)} | v${(n - 17) / 4} (${n}×${n})`);
    }
}

// Respaldo: algo desconocido (p. ej. una sección de audio) → SDP entero con deflate-raw
const raro = leer('sdp-chrome.json').oferta.replace('m=application', 'm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=rtpmap:111 opus/48000/2\r\nm=application');
const cr = await codificar({ t: 'oferta', h: H, s: S, sdp: raro });
ok(!cr.compacto, 'respaldo: SDP con audio no es compacto');
ok((await decodificar(cr.texto)).sdp === raro, 'respaldo: el SDP vuelve idéntico');
console.log(`respaldo (deflate-raw): ${raro.length} B de SDP → ${cr.bytes} bytes, ${cr.texto.length} caracteres`);

// Candidatos de otras formas: IPv4, IPv6 y srflx (sintéticos, con el formato de Chrome)
const otros = leer('sdp-chrome.json').oferta.replace(/a=candidate:[^\r]*\r\n/g, '').replace('a=ice-ufrag',
    'a=candidate:1 1 udp 2122260223 192.168.1.34 50001 typ host generation 0\r\n' +
    'a=candidate:2 1 udp 2122197247 fe80::1c2b:3aff:fe4d:5e6f 50002 typ host generation 0\r\n' +
    'a=candidate:3 1 udp 1686052607 181.43.12.9 50003 typ srflx raddr 192.168.1.34 rport 50001 generation 0\r\n' +
    'a=candidate:4 1 tcp 1518280447 192.168.1.34 9 typ host tcptype active generation 0\r\na=ice-ufrag');
const co = await decodificar((await codificar({ t: 'oferta', h: H, s: S, sdp: otros })).texto);
const pc = partesDeSdp(co.sdp).candidatos;
ok(pc.length === 3, 'otros candidatos: 3 UDP (el TCP se descarta)');
ok(pc[0].dir === '192.168.1.34' && pc[0].puerto === 50001 && pc[0].tipo === 0, 'IPv4');
ok(pc[1].dir === 'fe80:0:0:0:1c2b:3aff:fe4d:5e6f' && pc[1].puerto === 50002, 'IPv6');
ok(pc[2].dir === '181.43.12.9' && pc[2].tipo === 1, 'srflx');

// Base45 (ejemplos del RFC 9285) y errores
ok(aBase45(new TextEncoder().encode('AB')) === 'BB8', 'base45 «AB»');
ok(aBase45(new TextEncoder().encode('Hello!!')) === '%69 VD92EX0', 'base45 «Hello!!»');
ok(new TextDecoder().decode(deBase45('QED8WEX0')) === 'ietf!', 'base45 «ietf!»');
let error = null;
try { await decodificar('hola'); } catch (e) { error = e; }
ok(error, 'texto ajeno da error');
error = null;
const bueno = (await codificar({ t: 'respuesta', s: S, sdp: leer('sdp-chrome.json').respuesta })).texto;
try { await decodificar(bueno.slice(0, -10) + '/'); } catch (e) { error = e; }
ok(error, 'texto cortado da error');

console.log(fallos ? `${fallos} fallas` : 'todo bien');
process.exit(fallos ? 1 : 0);
