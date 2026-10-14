// =========================================================
// VENJY · Estudio · Editor de pista de la carrera de gatas (7h-1)
// Debajo del juego (pestaña Carrera): el living visto desde arriba con sus muebles y la carretera tal como la arma el
// juego (huecos, turbos, túnel, cajas de objetos, línea de salida y el sentido de la carrera), y abajo el perfil de alturas (la vuelta
// estirada de lado). Se edita a mano:
//   · arrastrar un punto (círculo numerado) lo mueve; en el perfil, arrastrarlo arriba o abajo cambia su altura;
//   · doble clic sobre la pista agrega un punto ahí; Supr o «Quitar» lo borra (mínimo 4);
//   · arrastrar un mueble lo mueve; «Agregar mueble» pone uno nuevo en el centro;
//   · rueda: acercar/alejar; arrastrar con el botón derecho (o con Espacio apretado): mover la vista;
//   · Alt al arrastrar: sin encajar a medio bloque; Ctrl+Z deshace;
//   · piezas plantilla (vuelta 360, espiral, horquilla, salto…): «Poner pieza» la deja después del punto elegido; arrastrar
//     uno de sus puntos (cuadrados) la mueve entera; el inspector cambia sus medidas, la gira, la suelta o la quita.
// El inspector muestra el punto o el mueble elegido (números, hueco, turbos, túnel y cajas de objetos desde ese punto). Los avisos
// (pista que se cruza, muebles encima, cuestas muy empinadas…) salen en rojo en el plano y en la lista; «Probar con la
// IA» corre una carrera entera al instante. Los cambios van al juego al soltar (mensaje `datos`).
// Lo puro está en pista-modelo.mjs.
// =========================================================
import * as M from '../mundo/supervivencia/carrera-modelo.js';
import { insertarPunto, quitarPunto, segmentoCercano, avisosPista, probarIA, PIEZAS, MEDIDAS, medidasDe, ponerPieza, rehacerPieza, quitarPieza, piezaDe } from './pista-modelo.mjs';

const clonar = o => JSON.parse(JSON.stringify(o));
const TIPOS = ['ovillo', 'caja', 'cojin', 'lampara', 'pecera', 'raton', 'sofa', 'mesa', 'alfombra', 'podio'];
const COLOR_MUEBLE = { sofa: '#5c7a9c', mesa: '#8a5a32', alfombra: '#a8343c', ovillo: '#d8455a', lampara: '#c8b070', caja: '#c49660', pecera: '#7ac0dc', cojin: '#e7b13a', raton: '#96969c', podio: '#f2c43c' };
const NUEVO = { ovillo: { a: 7, f: 7, h: 7, color: '#4a8ad8' }, caja: { a: 10, f: 8, h: 7, g: 0 }, cojin: { a: 9, f: 9, h: 3, color: '#e7b13a', g: 0 }, lampara: { a: 6, f: 6, h: 30 }, pecera: { a: 8, f: 8, h: 9 }, raton: { a: 2, f: 3, h: 1.4, g: 0 }, sofa: { a: 40, f: 18, h: 6.8 }, mesa: { a: 20, f: 16, h: 9 }, alfombra: { a: 40, f: 16, h: 0.12 }, podio: { a: 10, f: 4, h: 3, g: 180 } };

// ctx: el del Estudio; api = { datos(), cambio(enviar = true), real() (reglas fundidas), alPintar() }
export function montarEditorPista(ctx, api) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const plano = $('ca-plano'), perfil = $('ca-perfil'), insp = $('ca-inspector'), avisosEl = $('ca-avisos'), iaEl = $('ca-ia');
    const kp = plano.getContext('2d'), kf = perfil.getContext('2d');
    let vista = null, sel = null; // sel = { tipo: 'punto' | 'mueble', i }
    let arrastre = null, espacio = false;
    const historia = [];

    // ---- Datos: copias propias de pista y muebles al primer cambio ----
    function pistaPropia() { const d = api.datos(); if (!d.pista) d.pista = {}; const R = api.real(); for (const k of ['puntos', 'huecos', 'turbos', 'tuneles', 'cajas', 'piezas']) if (!d.pista[k]) d.pista[k] = clonar(R.pista[k] || []); return d.pista; }
    function mueblesPropios() { const d = api.datos(); if (!d.muebles) d.muebles = clonar(api.real().muebles || []); return d.muebles; }
    function guardarHistoria() { const d = api.datos(); historia.push(clonar({ pista: d.pista || null, muebles: d.muebles || null })); if (historia.length > 60) historia.shift(); }
    function deshacer() {
        const h = historia.pop(); if (!h) return;
        const d = api.datos();
        if (h.pista) d.pista = h.pista; else delete d.pista;
        if (h.muebles) d.muebles = h.muebles; else delete d.muebles;
        sel = null; api.cambio(); pintar();
    }

    // ---- Vista ----
    function ajustarTamano() {
        const w = plano.parentElement.clientWidth || 800;
        if (plano.width !== w) { plano.width = w; plano.height = Math.round(Math.min(520, Math.max(320, w * 0.55))); vista = null; }
        if (perfil.width !== w) perfil.width = w;
    }
    // Encuadrar: la pista y los muebles (con `sala` = true, la sala entera)
    function encuadrar(sala = false) {
        const Rr = api.real(), S = Rr.sala;
        let x0, x1, z0, z1;
        if (sala) { x0 = S.x - S.ancho / 2; x1 = S.x + S.ancho / 2; z0 = S.z - S.fondo / 2; z1 = S.z + S.fondo / 2; }
        else {
            x0 = z0 = 1e9; x1 = z1 = -1e9;
            for (const p of Rr.pista.puntos) { x0 = Math.min(x0, p[0] - 10); x1 = Math.max(x1, p[0] + 10); z0 = Math.min(z0, p[2] - 10); z1 = Math.max(z1, p[2] + 10); }
            for (const m of Rr.muebles) { x0 = Math.min(x0, m.x - m.a / 2); x1 = Math.max(x1, m.x + m.a / 2); z0 = Math.min(z0, m.z - m.f / 2); z1 = Math.max(z1, m.z + m.f / 2); }
        }
        const e = Math.min((plano.width - 30) / (x1 - x0), (plano.height - 30) / (z1 - z0));
        vista = { e, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
    }
    const aPx = (x, z) => [plano.width / 2 + (x - vista.cx) * vista.e, plano.height / 2 + (z - vista.cz) * vista.e];
    const aMundo = (px, py) => [vista.cx + (px - plano.width / 2) / vista.e, vista.cz + (py - plano.height / 2) / vista.e];
    const encajar = (v, libre) => (libre ? Math.round(v * 100) / 100 : Math.round(v * 2) / 2);

    // ---- Dibujo del plano ----
    let P = null, R = null, avisos = [];
    function recalcular() { R = api.real(); P = M.armarPista(R); avisos = avisosPista(R); }
    function pintarPlano() {
        if (!vista) encuadrar();
        const k = kp, W = plano.width, H = plano.height;
        k.fillStyle = '#1a120c'; k.fillRect(0, 0, W, H);
        const S = R.sala;
        // Piso de tablas y cuadrícula de 4 bloques
        const [sx0, sz0] = aPx(S.x - S.ancho / 2, S.z - S.fondo / 2), [sx1, sz1] = aPx(S.x + S.ancho / 2, S.z + S.fondo / 2);
        k.fillStyle = '#6e4a2a'; k.fillRect(sx0, sz0, sx1 - sx0, sz1 - sz0);
        k.strokeStyle = 'rgba(0,0,0,0.18)'; k.lineWidth = 1; k.beginPath();
        for (let x = Math.ceil((S.x - S.ancho / 2) / 4) * 4; x < S.x + S.ancho / 2; x += 4) { const [px] = aPx(x, 0); k.moveTo(px, sz0); k.lineTo(px, sz1); }
        for (let z = Math.ceil((S.z - S.fondo / 2) / 4) * 4; z < S.z + S.fondo / 2; z += 4) { const [, pz] = aPx(0, z); k.moveTo(sx0, pz); k.lineTo(sx1, pz); }
        k.stroke();
        k.strokeStyle = '#e2cfa0'; k.lineWidth = 4; k.strokeRect(sx0, sz0, sx1 - sx0, sz1 - sz0);
        // Muebles (los que van bajo la pista, primero)
        const orden = R.muebles.map((m, i) => i).sort((a, b) => (R.muebles[a].tipo === 'alfombra' ? -1 : 0) - (R.muebles[b].tipo === 'alfombra' ? -1 : 0));
        for (const i of orden) {
            const m = R.muebles[i], [px, pz] = aPx(m.x, m.z);
            k.save(); k.translate(px, pz); k.rotate(-(m.g || 0) * Math.PI / 180);
            k.fillStyle = m.color && ['ovillo', 'cojin'].includes(m.tipo) ? m.color : COLOR_MUEBLE[m.tipo] || '#888';
            k.globalAlpha = m.tipo === 'alfombra' ? 0.55 : 0.85;
            const w = m.a * vista.e, h = m.f * vista.e;
            if (m.tipo === 'ovillo' || m.tipo === 'lampara') { k.beginPath(); k.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2); k.fill(); }
            else k.fillRect(-w / 2, -h / 2, w, h);
            k.globalAlpha = 1;
            if (sel && sel.tipo === 'mueble' && sel.i === i) { k.strokeStyle = '#ffff55'; k.lineWidth = 3; k.strokeRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4); }
            k.fillStyle = '#fff'; k.font = '11px PixelCraft, monospace'; k.textAlign = 'center';
            if (w > 40 || (sel && sel.tipo === 'mueble' && sel.i === i)) k.fillText(m.tipo, 0, 4);
            k.restore();
        }
        // Carretera: un cuadro por muestra (gris; hueco rojo; túnel oscuro; turbo naranja)
        const lat = (q, l) => aPx(q.x + Math.cos(q.yaw) * l, q.z - Math.sin(q.yaw) * l);
        for (let i = 0; i < P.N; i++) {
            const a = P.m[i], b = P.m[(i + 1) % P.N];
            const p1 = lat(a, a.ancho / 2), p2 = lat(a, -a.ancho / 2), p3 = lat(b, -b.ancho / 2), p4 = lat(b, b.ancho / 2);
            k.fillStyle = !a.piso ? 'rgba(220,40,40,0.35)' : a.turbo ? '#e88a2a' : a.tunel ? '#3c3c44' : `hsl(240, 6%, ${38 + Math.min(30, a.y * 3)}%)`;
            k.beginPath(); k.moveTo(...p1); k.lineTo(...p2); k.lineTo(...p3); k.lineTo(...p4); k.closePath(); k.fill();
        }
        // Bordes rojos y blancos
        for (const l of [1, -1]) {
            k.lineWidth = 2;
            for (let i = 0; i < P.N; i++) {
                const a = P.m[i], b = P.m[(i + 1) % P.N];
                if (!a.piso) continue;
                k.strokeStyle = Math.floor(a.s / 2) % 2 ? '#f0f0f0' : '#d22a2a';
                k.beginPath(); k.moveTo(...lat(a, l * a.ancho / 2)); k.lineTo(...lat(b, l * b.ancho / 2)); k.stroke();
            }
        }
        // Cajas de objetos (cuadros amarillos con «?»)
        for (const c of M.cajasDe(R, P)) {
            const q = M.puntoPista(P, c.s, c.lat), [px, pz] = aPx(q.x, q.z), w = Math.max(5, 1.2 * vista.e);
            k.fillStyle = '#f6c440'; k.strokeStyle = '#000'; k.lineWidth = 1.5;
            k.fillRect(px - w / 2, pz - w / 2, w, w); k.strokeRect(px - w / 2, pz - w / 2, w, w);
            if (w > 9) { k.fillStyle = '#fff'; k.font = `${Math.round(w * 0.8)}px PixelCraft, monospace`; k.textAlign = 'center'; k.fillText('?', px, pz + w * 0.3); }
        }
        // Línea de salida y flechas del sentido
        { const q = P.m[0]; k.strokeStyle = '#fff'; k.lineWidth = 4; k.setLineDash([4, 4]); k.beginPath(); k.moveTo(...lat(q, q.ancho / 2)); k.lineTo(...lat(q, -q.ancho / 2)); k.stroke(); k.setLineDash([]); }
        k.fillStyle = 'rgba(255,255,255,0.7)';
        for (let s = 8; s < P.largo; s += 22) {
            const q = M.enPista(P, s), [px, pz] = aPx(q.x, q.z), a = Math.atan2(Math.cos(q.yaw), Math.sin(q.yaw));
            k.save(); k.translate(px, pz); k.rotate(a); k.beginPath(); k.moveTo(7, 0); k.lineTo(-5, -5); k.lineTo(-5, 5); k.closePath(); k.fill(); k.restore();
        }
        // Avisos
        for (const a of avisos) if (Number.isFinite(a.x)) {
            const [px, pz] = aPx(a.x, a.z);
            k.strokeStyle = a.tipo === 'error' ? '#ff3030' : '#ffb030'; k.lineWidth = 3;
            k.beginPath(); k.arc(px, pz, 12, 0, Math.PI * 2); k.stroke();
            k.beginPath(); k.moveTo(px - 6, pz - 6); k.lineTo(px + 6, pz + 6); k.moveTo(px + 6, pz - 6); k.lineTo(px - 6, pz + 6); k.stroke();
        }
        // Puntos de control (color según la altura)
        const maxY = Math.max(8, ...R.pista.puntos.map(p => p[1]));
        const zSel = sel && sel.tipo === 'punto' ? piezaDe(R.pista, sel.i) : -1;
        R.pista.puntos.forEach((p, i) => {
            const [px, pz] = aPx(p[0], p[2]), elegido = sel && sel.tipo === 'punto' && sel.i === i;
            const iz = piezaDe(R.pista, i), z = iz >= 0 ? R.pista.piezas[iz] : null, r = elegido ? 10 : 8;
            k.fillStyle = `hsl(${200 - (p[1] / maxY) * 160}, 80%, 55%)`;
            k.strokeStyle = elegido ? '#ffff55' : z && iz === zSel ? '#ffd040' : '#000'; k.lineWidth = elegido || (z && iz === zSel) ? 3 : 2;
            k.beginPath(); if (z) k.rect(px - r, pz - r, r * 2, r * 2); else k.arc(px, pz, r, 0, Math.PI * 2); k.fill(); k.stroke();
            // Entrada y salida de una pieza
            if (z && (i === z.desde || i === z.hasta)) { k.fillStyle = '#ffd040'; k.font = '12px PixelCraft, monospace'; k.textAlign = 'center'; k.fillText(i === z.desde ? 'E' : 'S', px + 14, pz - 10); }
            k.fillStyle = '#000'; k.font = '10px PixelCraft, monospace'; k.textAlign = 'center'; k.fillText(String(i + 1), px, pz + 3.5);
            if (p[1] > 0.05 && (elegido || vista.e > 7)) { k.fillStyle = '#fff'; k.fillText(`y ${p[1]}`, px, pz - 13); } // (con poco zoom se amontonan)
        });
        k.fillStyle = '#c6c6c6'; k.font = '11px PixelCraft, monospace'; k.textAlign = 'left';
        k.fillText(t(`Vuelta: ${P.largo.toFixed(0)} bloques · ${R.pista.puntos.length} puntos`, `Lap: ${P.largo.toFixed(0)} blocks · ${R.pista.puntos.length} points`), 8, H - 8);
    }

    // ---- Perfil de alturas ----
    const PERF = { margen: 26 };
    function escalaPerfil() { const maxY = Math.max(10, ...P.m.map(q => q.y)) + 2; return { maxY, ex: (perfil.width - PERF.margen * 2) / P.largo, ey: (perfil.height - 26) / maxY }; }
    const sAPx = (s, E) => PERF.margen + s * E.ex, yAPx = (y, E) => perfil.height - 14 - y * E.ey;
    function pintarPerfil() {
        const k = kf, W = perfil.width, H = perfil.height, E = escalaPerfil();
        k.fillStyle = '#16100a'; k.fillRect(0, 0, W, H);
        k.strokeStyle = 'rgba(255,255,255,0.08)'; k.lineWidth = 1; k.fillStyle = '#8a8a8a'; k.font = '10px PixelCraft, monospace'; k.textAlign = 'right';
        for (let y = 0; y <= E.maxY; y += 2) { const py = yAPx(y, E); k.beginPath(); k.moveTo(PERF.margen, py); k.lineTo(W - PERF.margen, py); k.stroke(); k.fillText(String(y), PERF.margen - 4, py + 3); }
        // Túneles y huecos
        for (let i = 0; i < P.N; i++) {
            const q = P.m[i], x = sAPx(q.s, E);
            if (q.tunel) { k.fillStyle = 'rgba(120,120,140,0.25)'; k.fillRect(x, 0, P.paso * E.ex + 1, H); }
            if (!q.piso) { k.fillStyle = 'rgba(220,40,40,0.35)'; k.fillRect(x, 0, P.paso * E.ex + 1, H); }
            if (q.turbo) { k.fillStyle = 'rgba(232,138,42,0.5)'; k.fillRect(x, H - 12, P.paso * E.ex + 1, 10); }
        }
        // Mesa: su altura donde la pista pasa bajo ella
        for (const m of R.muebles) if (m.tipo === 'mesa') {
            k.strokeStyle = '#c08040'; k.setLineDash([5, 4]); k.lineWidth = 2; k.beginPath(); let dentro = false;
            for (const q of P.m) { const en = Math.abs(q.x - m.x) < m.a / 2 && Math.abs(q.z - m.z) < m.f / 2; if (en) { const x = sAPx(q.s, E), y = yAPx(m.h, E); if (!dentro) k.moveTo(x, y); else k.lineTo(x, y); } dentro = en; }
            k.stroke(); k.setLineDash([]);
        }
        // Muebles con rampa sola bajo la pista (su alto)
        k.fillStyle = 'rgba(196,150,96,0.45)';
        for (const q of P.m) if (q.apoyo > 0) { const x = sAPx(q.s, E), y = yAPx(q.apoyo, E); k.fillRect(x, y, P.paso * E.ex + 1, perfil.height - 14 - y); }
        // La pista
        k.strokeStyle = '#d8d8e0'; k.lineWidth = 3; k.beginPath();
        P.m.forEach((q, i) => { const x = sAPx(q.s, E), y = yAPx(q.y, E); if (i && q.piso && P.m[i - 1].piso) k.lineTo(x, y); else k.moveTo(x, y); });
        k.stroke();
        // Puntos
        R.pista.puntos.forEach((p, i) => {
            const x = sAPx(P.puntos[i], E), y = yAPx(p[1], E), elegido = sel && sel.tipo === 'punto' && sel.i === i;
            k.fillStyle = elegido ? '#ffff55' : '#4aa8ff'; k.strokeStyle = '#000'; k.lineWidth = 2;
            k.beginPath(); k.arc(x, y, elegido ? 8 : 6, 0, Math.PI * 2); k.fill(); k.stroke();
            k.fillStyle = '#fff'; k.textAlign = 'center'; k.fillText(String(i + 1), x, y - 10);
        });
        k.fillStyle = '#c6c6c6'; k.textAlign = 'left';
        k.fillText(t('Perfil de alturas: arrastra un punto hacia arriba o abajo', 'Height profile: drag a point up or down'), PERF.margen + 4, 12);
    }

    // ---- Inspector, avisos ----
    function campo(padre, etiqueta, valor, paso, poner, min = -999, max = 999) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const n = document.createElement('input'); n.type = 'number'; n.step = paso; n.value = valor; n.min = min; n.max = max;
        n.addEventListener('change', () => { const v = Number(n.value); if (Number.isFinite(v)) { guardarHistoria(); poner(Math.min(max, Math.max(min, v))); api.cambio(); pintar(); } });
        l.append(s, n); padre.appendChild(l); return n;
    }
    const botonI = (padre, es, en, f, cls = 'boton chico secundario') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = t(es, en); b.addEventListener('click', f); padre.appendChild(b); return b; };
    function pintarInspector() {
        insp.textContent = '';
        const h = document.createElement('h3'); insp.appendChild(h);
        if (!sel) { h.textContent = t('Elige un punto o un mueble', 'Pick a point or a furniture piece'); return; }
        const g = document.createElement('div'); g.className = 'campos'; insp.appendChild(g);
        if (sel.tipo === 'punto') {
            const i = sel.i, p = R.pista.puntos[i];
            if (!p) { sel = null; return pintarInspector(); }
            h.textContent = i === 0 ? t('Punto 1 (línea de salida)', 'Point 1 (start line)') : t(`Punto ${i + 1}`, `Point ${i + 1}`);
            campo(g, 'x', p[0], 0.5, v => { pistaPropia().puntos[i][0] = v; });
            campo(g, t('altura (y)', 'height (y)'), p[1], 0.5, v => { pistaPropia().puntos[i][1] = v; }, 0, 60);
            campo(g, 'z', p[2], 0.5, v => { pistaPropia().puntos[i][2] = v; });
            campo(g, t('ancho (0 = el de la pista)', 'width (0 = track default)'), p[3] || 0, 0.5, v => { const q = pistaPropia().puntos[i]; if (v > 0) q[3] = v; else q.length = 3; }, 0, 20);
            const iz = piezaDe(R.pista, i);
            if (iz >= 0) inspectorPieza(iz);
            const pista = R.pista;
            // Hueco desde este punto
            const hueco = (pista.huecos || []).find(x => x.punto === i);
            const fh = document.createElement('div'); fh.className = 'fila-botones'; insp.appendChild(fh);
            if (hueco) {
                campo(fh, t('hueco: largo (bloques)', 'gap: length (blocks)'), hueco.largo || 4, 0.5, v => { pistaPropia().huecos.find(x => x.punto === i).largo = v; }, 1, 30);
                botonI(fh, 'Quitar el hueco', 'Remove gap', () => { guardarHistoria(); const pp = pistaPropia(); pp.huecos = pp.huecos.filter(x => x.punto !== i); api.cambio(); pintar(); });
            } else botonI(fh, 'Hueco desde aquí (salto)', 'Gap from here (jump)', () => { guardarHistoria(); pistaPropia().huecos.push({ punto: i, largo: 6 }); api.cambio(); pintar(); });
            // Turbos desde este punto
            (pista.turbos || []).forEach((tb, j) => {
                if (tb.punto !== i) return;
                const ft = document.createElement('div'); ft.className = 'campos'; insp.appendChild(ft);
                const tt = () => pistaPropia().turbos[j];
                campo(ft, t('turbo: bloques después', 'boost: blocks after'), tb.avance || 0, 0.5, v => { tt().avance = v; }, 0, 60);
                campo(ft, t('lado (-1 izq., 1 der.)', 'side (-1 left, 1 right)'), tb.lado || 0, 0.1, v => { tt().lado = v; }, -1, 1);
                campo(ft, t('largo', 'length'), tb.largo || 4, 0.5, v => { tt().largo = v; }, 1, 20);
                botonI(ft, 'Quitar turbo', 'Remove boost', () => { guardarHistoria(); pistaPropia().turbos.splice(j, 1); api.cambio(); pintar(); });
            });
            // Filas de cajas de objetos desde este punto
            (pista.cajas || []).forEach((cj, j) => {
                if (cj.punto !== i) return;
                const fc = document.createElement('div'); fc.className = 'campos'; insp.appendChild(fc);
                const cc = () => pistaPropia().cajas[j];
                campo(fc, t('cajas: bloques después', 'item boxes: blocks after'), cj.avance || 0, 0.5, v => { cc().avance = v; }, 0, 60);
                campo(fc, t('cuántas a lo ancho', 'how many across'), cj.cuantas || R.objetos.cuantas, 1, v => { cc().cuantas = Math.round(v); }, 1, 8);
                botonI(fc, 'Quitar las cajas', 'Remove item boxes', () => { guardarHistoria(); pistaPropia().cajas.splice(j, 1); api.cambio(); pintar(); });
            });
            const fb = document.createElement('div'); fb.className = 'fila-botones'; insp.appendChild(fb);
            botonI(fb, 'Cajas de objetos aquí', 'Item boxes here', () => { guardarHistoria(); pistaPropia().cajas.push({ punto: i, avance: 1 }); api.cambio(); pintar(); });
            botonI(fb, 'Agregar turbo aquí', 'Add boost here', () => { guardarHistoria(); pistaPropia().turbos.push({ punto: i, avance: 1, lado: 0, largo: 4 }); api.cambio(); pintar(); });
            const tunel = (pista.tuneles || []).find(x => x.desde === i);
            if (tunel) botonI(fb, 'Quitar el túnel', 'Remove tunnel', () => { guardarHistoria(); const pp = pistaPropia(); pp.tuneles = pp.tuneles.filter(x => x.desde !== i); api.cambio(); pintar(); });
            else botonI(fb, 'Túnel hasta el siguiente', 'Tunnel to the next one', () => { guardarHistoria(); pistaPropia().tuneles.push({ desde: i, hasta: (i + 1) % R.pista.puntos.length }); api.cambio(); pintar(); });
            botonI(fb, 'Agregar un punto después', 'Add a point after', () => {
                guardarHistoria();
                const pts = pistaPropia().puntos, a = pts[i], b = pts[(i + 1) % pts.length];
                api.datos().pista = insertarPunto(pistaPropia(), i + 1, [encajar((a[0] + b[0]) / 2), Math.round(a[1] + b[1]) / 2, encajar((a[2] + b[2]) / 2)]);
                sel = { tipo: 'punto', i: i + 1 }; api.cambio(); pintar();
            });
            if (R.pista.puntos.length > 4) botonI(fb, 'Quitar el punto (Supr)', 'Remove point (Del)', () => quitar(i));
        } else {
            const i = sel.i, m = R.muebles[i];
            if (!m) { sel = null; return pintarInspector(); }
            h.textContent = t(`Mueble: ${m.tipo}`, `Furniture: ${m.tipo}`);
            const mm = () => mueblesPropios()[i];
            const tipo = document.createElement('select');
            for (const k of TIPOS) tipo.appendChild(new Option(k, k));
            tipo.value = m.tipo;
            tipo.addEventListener('change', () => { guardarHistoria(); mm().tipo = tipo.value; api.cambio(); pintar(); });
            g.appendChild(tipo);
            for (const [k, es, en, paso, min, max] of [['x', 'x', 'x', 0.5, -250, 250], ['z', 'z', 'z', 0.5, -250, 250], ['a', 'ancho (x)', 'width (x)', 0.5, 0.5, 160], ['f', 'fondo (z)', 'depth (z)', 0.5, 0.5, 160], ['h', 'alto', 'height', 0.1, 0.02, 60], ['g', 'giro (grados)', 'turn (degrees)', 5, -180, 180]])
                campo(g, t(es, en), m[k] ?? 0, paso, v => { mm()[k] = v; }, min, max);
            if (['ovillo', 'cojin'].includes(m.tipo)) {
                const l = document.createElement('label'); l.className = 'campo'; const s = document.createElement('span'); s.textContent = 'color';
                const c = document.createElement('input'); c.type = 'color'; c.value = m.color || '#888888';
                c.addEventListener('change', () => { guardarHistoria(); mm().color = c.value; api.cambio(); pintar(); });
                l.append(s, c); g.appendChild(l);
            }
            if (!['sofa', 'mesa', 'alfombra', 'podio'].includes(m.tipo)) {
                const l = document.createElement('label'); l.className = 'campo'; const s = document.createElement('span');
                s.textContent = t('La pista sube encima (rampa sola)', 'Track climbs over it (automatic ramp)');
                const c = document.createElement('input'); c.type = 'checkbox'; c.checked = M.subeEncima(m);
                c.addEventListener('change', () => { guardarHistoria(); mm().sube = c.checked; api.cambio(); pintar(); });
                l.append(s, c); g.appendChild(l);
            }
            const fb = document.createElement('div'); fb.className = 'fila-botones'; insp.appendChild(fb);
            botonI(fb, 'Quitar el mueble', 'Remove furniture', () => { guardarHistoria(); mueblesPropios().splice(i, 1); sel = null; api.cambio(); pintar(); });
        }
    }
    // Una pieza plantilla: sus medidas, su giro, soltarla o quitarla (cada cambio la rehace desde su entrada)
    function inspectorPieza(iz) {
        const z = R.pista.piezas[iz], def = PIEZAS[z.tipo];
        if (!def) return;
        const h = document.createElement('h3');
        h.textContent = t(`Pieza: ${def.es} (puntos ${z.desde + 1} a ${z.hasta + 1})`, `Piece: ${def.en} (points ${z.desde + 1} to ${z.hasta + 1})`);
        insp.appendChild(h);
        const g = document.createElement('div'); g.className = 'campos'; insp.appendChild(g);
        const rehacer = cambios => { api.datos().pista = rehacerPieza(pistaPropia(), iz, cambios); };
        const med = medidasDe(z);
        for (const [k, es, en, min, max, paso] of MEDIDAS[def.gen] || []) campo(g, t(es, en), med[k], paso, v => rehacer({ [k]: v }), min, max);
        campo(g, t('giro (grados; hacia dónde mira la entrada)', 'turn (degrees; where the entry faces)'), z.giro || 0, 15, v => rehacer({ giro: v }), -360, 360);
        const fb = document.createElement('div'); fb.className = 'fila-botones'; insp.appendChild(fb);
        const girar = d => () => { guardarHistoria(); rehacer({ giro: ((z.giro || 0) + d + 540) % 360 - 180 }); api.cambio(); pintar(); };
        botonI(fb, 'Girar a la izquierda (15°)', 'Turn left (15°)', girar(15));
        botonI(fb, 'Girar a la derecha (15°)', 'Turn right (15°)', girar(-15));
        botonI(fb, 'Soltar la pieza (puntos sueltos)', 'Release piece (loose points)', () => { guardarHistoria(); pistaPropia().piezas.splice(iz, 1); api.cambio(); pintar(); });
        botonI(fb, 'Quitar la pieza', 'Remove piece', () => { guardarHistoria(); api.datos().pista = quitarPieza(pistaPropia(), iz); sel = null; api.cambio(); pintar(); });
    }
    function pintarAvisos() {
        avisosEl.textContent = '';
        if (!avisos.length) { const p = document.createElement('p'); p.className = 'mensaje ok'; p.textContent = t('Sin avisos: la pista se ve bien.', 'No warnings: the track looks fine.'); avisosEl.appendChild(p); return; }
        for (const a of avisos) { const p = document.createElement('p'); p.className = 'mensaje ' + (a.tipo === 'error' ? 'error' : ''); p.textContent = (a.tipo === 'error' ? t('Error: ', 'Error: ') : t('Ojo: ', 'Note: ')) + t(a.es, a.en); avisosEl.appendChild(p); }
    }
    function pintar() { ajustarTamano(); recalcular(); pintarPlano(); pintarPerfil(); pintarInspector(); pintarAvisos(); if (api.alPintar) api.alPintar(); }
    // Solo el dibujo (mientras se arrastra: sin rehacer el inspector)
    function redibujar() { recalcular(); pintarPlano(); pintarPerfil(); }

    function quitar(i) {
        if (R.pista.puntos.length <= 4) return;
        guardarHistoria();
        const d = api.datos(); d.pista = quitarPunto(pistaPropia(), i);
        sel = null; api.cambio(); pintar();
    }

    // ---- Ratón en el plano ----
    const posRaton = (e, cv) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    function puntoEn(px, py) {
        let mejor = -1, dm = 12;
        R.pista.puntos.forEach((p, i) => { const [x, z] = aPx(p[0], p[2]), d = Math.hypot(x - px, z - py); if (d < dm) { dm = d; mejor = i; } });
        return mejor;
    }
    function muebleEn(px, py) {
        const [x, z] = aMundo(px, py);
        for (let i = R.muebles.length - 1; i >= 0; i--) {
            const m = R.muebles[i], a = (m.g || 0) * Math.PI / 180;
            const dx = x - m.x, dz = z - m.z, lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a);
            if (Math.abs(lx) <= m.a / 2 && Math.abs(lz) <= m.f / 2 && m.tipo !== 'alfombra') return i;
        }
        for (let i = R.muebles.length - 1; i >= 0; i--) { const m = R.muebles[i]; if (m.tipo === 'alfombra' && Math.abs(x - m.x) <= m.a / 2 && Math.abs(z - m.z) <= m.f / 2) return i; }
        return -1;
    }
    plano.addEventListener('contextmenu', e => e.preventDefault());
    plano.addEventListener('pointerdown', e => {
        const [px, py] = posRaton(e, plano);
        plano.setPointerCapture(e.pointerId);
        if (e.button === 2 || e.button === 1 || espacio) { arrastre = { tipo: 'vista', px, py, cx: vista.cx, cz: vista.cz }; return; }
        const ip = puntoEn(px, py);
        if (ip >= 0) {
            sel = { tipo: 'punto', i: ip }; guardarHistoria();
            // Shift: arrastra la pista entera (todos los puntos juntos)
            // Un punto de una pieza: arrastra la pieza entera
            const iz = piezaDe(R.pista, ip), [x, z] = aMundo(px, py);
            if (e.shiftKey) arrastre = { tipo: 'pista', x0: x, z0: z, orig: clonar(pistaPropia().puntos), movio: false };
            else if (iz >= 0) { const pz = R.pista.piezas[iz]; arrastre = { tipo: 'pieza', desde: pz.desde, hasta: pz.hasta, x0: x, z0: z, orig: clonar(pistaPropia().puntos), movio: false }; }
            else arrastre = { tipo: 'punto', i: ip, movio: false };
            pintar(); return;
        }
        const im = muebleEn(px, py);
        if (im >= 0) { const [x, z] = aMundo(px, py); const m = R.muebles[im]; sel = { tipo: 'mueble', i: im }; guardarHistoria(); arrastre = { tipo: 'mueble', i: im, dx: m.x - x, dz: m.z - z, movio: false }; pintar(); return; }
        sel = null; pintar();
    });
    plano.addEventListener('pointermove', e => {
        const [px, py] = posRaton(e, plano);
        if (!arrastre) return;
        if (arrastre.tipo === 'vista') { vista.cx = arrastre.cx - (px - arrastre.px) / vista.e; vista.cz = arrastre.cz - (py - arrastre.py) / vista.e; redibujar(); return; }
        const [x, z] = aMundo(px, py);
        if (arrastre.tipo === 'punto') { const p = pistaPropia().puntos[arrastre.i]; p[0] = encajar(x, e.altKey); p[2] = encajar(z, e.altKey); }
        else if (arrastre.tipo === 'pieza') { const dx = encajar(x - arrastre.x0, e.altKey), dz = encajar(z - arrastre.z0, e.altKey); const pts = pistaPropia().puntos; for (let i = arrastre.desde; i <= arrastre.hasta; i++) { pts[i][0] = arrastre.orig[i][0] + dx; pts[i][2] = arrastre.orig[i][2] + dz; } }
        else if (arrastre.tipo === 'pista') { const dx = encajar(x - arrastre.x0, e.altKey), dz = encajar(z - arrastre.z0, e.altKey); pistaPropia().puntos.forEach((p, i) => { p[0] = arrastre.orig[i][0] + dx; p[2] = arrastre.orig[i][2] + dz; }); }
        else { const m = mueblesPropios()[arrastre.i]; m.x = encajar(x + arrastre.dx, e.altKey); m.z = encajar(z + arrastre.dz, e.altKey); }
        arrastre.movio = true;
        api.cambio(false);
        redibujar();
    });
    const soltar = () => {
        if (!arrastre) return;
        const a = arrastre; arrastre = null;
        if (a.tipo !== 'vista') { if (a.movio) api.cambio(); else historia.pop(); pintar(); }
    };
    plano.addEventListener('pointerup', soltar);
    plano.addEventListener('pointercancel', soltar);
    plano.addEventListener('dblclick', e => {
        const [px, py] = posRaton(e, plano), [x, z] = aMundo(px, py);
        const seg = segmentoCercano(R.pista.puntos, x, z);
        if (!seg || seg.d > R.pista.ancho) return;
        const a = R.pista.puntos[seg.i], b = R.pista.puntos[(seg.i + 1) % R.pista.puntos.length];
        guardarHistoria();
        const d = api.datos();
        d.pista = insertarPunto(pistaPropia(), seg.i + 1, [encajar(x), Math.round((a[1] + (b[1] - a[1]) * seg.u) * 2) / 2, encajar(z)]);
        sel = { tipo: 'punto', i: seg.i + 1 };
        api.cambio(); pintar();
    });
    plano.addEventListener('wheel', e => {
        e.preventDefault();
        const [px, py] = posRaton(e, plano), [x, z] = aMundo(px, py);
        vista.e = Math.max(0.6, Math.min(40, vista.e * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
        // el punto bajo el ratón queda donde estaba
        vista.cx = x - (px - plano.width / 2) / vista.e; vista.cz = z - (py - plano.height / 2) / vista.e;
        redibujar();
    }, { passive: false });

    // ---- Ratón en el perfil ----
    let arrPerfil = null;
    perfil.addEventListener('pointerdown', e => {
        const [px, py] = posRaton(e, perfil), E = escalaPerfil();
        let mejor = -1, dm = 14;
        R.pista.puntos.forEach((p, i) => { const d = Math.hypot(sAPx(P.puntos[i], E) - px, yAPx(p[1], E) - py); if (d < dm) { dm = d; mejor = i; } });
        if (mejor < 0) return;
        perfil.setPointerCapture(e.pointerId);
        const iz = piezaDe(R.pista, mejor), pz = iz >= 0 ? R.pista.piezas[iz] : null;
        sel = { tipo: 'punto', i: mejor }; guardarHistoria(); arrPerfil = { i: mejor, E, movio: false, pieza: pz && { desde: pz.desde, hasta: pz.hasta, orig: clonar(pistaPropia().puntos) } };
        pintar();
    });
    perfil.addEventListener('pointermove', e => {
        if (!arrPerfil) return;
        const [, py] = posRaton(e, perfil), E = arrPerfil.E;
        const y = Math.max(0, Math.min(60, (perfil.height - 14 - py) / E.ey));
        const ny = e.altKey ? Math.round(y * 100) / 100 : Math.round(y * 2) / 2, pz = arrPerfil.pieza, pts = pistaPropia().puntos;
        if (pz) { const dy = ny - pz.orig[arrPerfil.i][1]; for (let i = pz.desde; i <= pz.hasta; i++) pts[i][1] = Math.max(0, Math.min(60, Math.round((pz.orig[i][1] + dy) * 100) / 100)); }
        else pts[arrPerfil.i][1] = ny;
        arrPerfil.movio = true;
        api.cambio(false); redibujar();
    });
    const soltarPerfil = () => { if (!arrPerfil) return; const a = arrPerfil; arrPerfil = null; if (a.movio) api.cambio(); else historia.pop(); pintar(); };
    perfil.addEventListener('pointerup', soltarPerfil);
    perfil.addEventListener('pointercancel', soltarPerfil);

    // ---- Teclado ----
    window.addEventListener('keydown', e => {
        if (ctx.pestana !== 'carrera' || e.target.matches('input, select, textarea')) return;
        if (e.code === 'Space') espacio = true;
        if ((e.code === 'Delete' || e.code === 'Backspace') && sel && sel.tipo === 'punto') { e.preventDefault(); quitar(sel.i); }
        else if ((e.code === 'Delete' || e.code === 'Backspace') && sel && sel.tipo === 'mueble') { e.preventDefault(); guardarHistoria(); mueblesPropios().splice(sel.i, 1); sel = null; api.cambio(); pintar(); }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); deshacer(); }
        else if (sel && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
            // Flechas: mueven lo elegido medio bloque (con Shift, 2 bloques)
            e.preventDefault();
            const d = e.shiftKey ? 2 : 0.5, dx = e.code === 'ArrowLeft' ? -d : e.code === 'ArrowRight' ? d : 0, dz = e.code === 'ArrowUp' ? -d : e.code === 'ArrowDown' ? d : 0;
            if (!e.repeat) guardarHistoria();
            const iz = sel.tipo === 'punto' ? piezaDe(R.pista, sel.i) : -1;
            if (iz >= 0) { const pz = R.pista.piezas[iz], pts = pistaPropia().puntos; for (let i = pz.desde; i <= pz.hasta; i++) { pts[i][0] += dx; pts[i][2] += dz; } }
            else if (sel.tipo === 'punto') { const p = pistaPropia().puntos[sel.i]; p[0] += dx; p[2] += dz; }
            else { const m = mueblesPropios()[sel.i]; m.x += dx; m.z += dz; }
            api.cambio(); pintar();
        }
    });
    window.addEventListener('keyup', e => { if (e.code === 'Space') espacio = false; });
    window.addEventListener('resize', () => { if (ctx.pestana === 'carrera') pintar(); });

    // ---- Barra ----
    const tipoNuevo = $('ca-tipo-mueble');
    for (const k of TIPOS) tipoNuevo.appendChild(new Option(k, k));
    $('ca-agregar-mueble').addEventListener('click', () => {
        guardarHistoria();
        const k = tipoNuevo.value, ms = mueblesPropios();
        ms.push({ tipo: k, x: Math.round(vista.cx), z: Math.round(vista.cz), ...clonar(NUEVO[k] || { a: 6, f: 6, h: 4 }) });
        sel = { tipo: 'mueble', i: ms.length - 1 };
        api.cambio(); pintar();
    });
    const tipoPieza = $('ca-tipo-pieza');
    for (const [k, d] of Object.entries(PIEZAS)) tipoPieza.appendChild(new Option(t(d.es, d.en), k));
    // Después del punto elegido (sin elegir: después del más cercano al centro de la vista)
    $('ca-poner-pieza').addEventListener('click', () => {
        const pts = R.pista.puntos;
        let i = sel && sel.tipo === 'punto' ? sel.i : -1;
        if (i < 0) { let dm = 1e9; pts.forEach((p, j) => { const d = Math.hypot(p[0] - vista.cx, p[2] - vista.cz); if (d < dm) { dm = d; i = j; } }); }
        const iz = piezaDe(R.pista, i); if (iz >= 0) i = R.pista.piezas[iz].hasta; // nunca dentro de otra pieza
        guardarHistoria();
        api.datos().pista = ponerPieza(pistaPropia(), i, tipoPieza.value);
        sel = { tipo: 'punto', i: i + 1 }; api.cambio(); pintar();
    });
    $('ca-deshacer').addEventListener('click', deshacer);
    $('ca-encuadrar').addEventListener('click', () => { encuadrar(); pintar(); });
    $('ca-ver-sala').addEventListener('click', () => { encuadrar(true); pintar(); });
    // Agrandar o achicar la pista entera (en el plano, alrededor de su centro; las alturas no cambian)
    const escalar = k => {
        guardarHistoria();
        const pts = pistaPropia().puntos;
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[2], 0) / pts.length;
        for (const p of pts) { p[0] = encajar(cx + (p[0] - cx) * k); p[2] = encajar(cz + (p[2] - cz) * k); }
        api.cambio(); pintar();
    };
    $('ca-agrandar').addEventListener('click', () => escalar(1.15));
    $('ca-achicar').addEventListener('click', () => escalar(1 / 1.15));
    $('ca-pista-codigo').addEventListener('click', () => {
        guardarHistoria();
        const d = api.datos();
        if (d.pista) { for (const k of ['puntos', 'huecos', 'turbos', 'tuneles', 'cajas', 'piezas']) delete d.pista[k]; if (!Object.keys(d.pista).length) delete d.pista; }
        delete d.muebles; sel = null; api.cambio(); pintar();
    });
    $('ca-probar-ia').addEventListener('click', () => {
        iaEl.textContent = t('Corriendo…', 'Running…');
        setTimeout(() => {
            const r = probarIA(api.real());
            const f = s => (s == null ? '--' : s.toFixed(1).replace('.', ','));
            iaEl.className = 'mensaje ' + (r.ok && !r.caidas ? 'ok' : r.ok ? '' : 'error');
            iaEl.textContent = r.ok
                ? t(`La IA terminó: ganó ${r.porGata[0].nombre} en ${f(r.mejor)} s, la última en ${f(r.ultimo)} s · ${r.derrapes} derrapes · ${r.turbos} turbos · ${r.caidas} caídas · ${r.objetos} objetos usados (${r.golpes} golpes) · vuelta de ${r.largo.toFixed(0)} bloques`,
                    `The AI finished: ${r.porGata[0].nombre} won in ${f(r.mejor)} s, last in ${f(r.ultimo)} s · ${r.derrapes} drifts · ${r.turbos} boosts · ${r.caidas} falls · ${r.objetos} items used (${r.golpes} hits) · ${r.largo.toFixed(0)}-block lap`)
                : t(`La IA no terminó (${r.porGata.filter(g => g.fin === null).length} gatas atascadas): revisa curvas muy cerradas o un hueco imposible`, `The AI did not finish: check very tight turns or an impossible gap`);
        }, 20);
    });

    return { pintar, get seleccion() { return sel; } };
}
