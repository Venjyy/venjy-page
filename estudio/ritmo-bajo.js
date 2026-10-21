// =========================================================
// VENJY · Estudio · pestaña Ritmo: piano roll de la capa `bajo` (S10c-2)
// Edita las notas [paso, técnica, nota, duración, extra] de una capa de bajo de la canción elegida, en el nivel de la
// sección elegida en el panel «Canción». Debajo de la rejilla se ven en vivo los carriles que salen de cada dificultad
// (la partitura se regenera sola desde el bajo). Los cambios pasan por ritmo.js (editarCancion): deshacer, envío en vivo
// y Guardar son los de musica.json. Modelo puro en ritmo-modelo.mjs.
// =========================================================
import { DIFICULTADES, capasBajo, largoPatron, extraPorDefecto, ponerNotaBajo, quitarNotaBajo, cambiarNotaBajo, cambiarCompasesBajo, notaEnPaso, carrilesEnPatron, acordeATexto, textoAAcorde, nombreNota, TECNICAS, NOMBRE_TECNICA, NOTA_MIN, NOTA_MAX, nivelDe } from './ritmo-modelo.mjs';

const ANCHO_COL = 26, ALTO_FILA = 14, ANCHO_ROT = 44, ALTO_CARRIL = 8, MARGEN_V = 4;
const COLOR_TEC = { s: '#ff9a2e', p: '#59d8ff', g: '#8a8a8a', t: '#55c34a', d: '#c46ae8', a: '#f0d23c', r: '#d8373a' };
const NOMBRE_DIF = { facil: ['Fácil', 'Easy'], normal: ['Normal', 'Normal'], dificil: ['Difícil', 'Hard'], experto: ['Experto', 'Expert'] };

// api: { el, t, ingles(), rotular, cuerpo, cancion() -> { clave, datos }|null, seccion() -> índice, editar(f, valido), armar(dificultad) -> vista, colores() }
export function montarBajo(api) {
    const { el, t, cuerpo } = api;
    let capaI = null, selPaso = null, base = null;
    const herr = { tipo: 's', dur: 1 };

    function contexto() {
        const cs = api.cancion();
        if (!cs) return null;
        const c = cs.datos, est = c.estructura || [], n = Math.min(api.seccion(), est.length - 1), sec = est[n];
        if (!sec) return null;
        const nivel = nivelDe(sec), capas = capasBajo(c, nivel), P = sec.pasos || c.pasos || 16;
        if (!capas.some(x => x.i === capaI)) capaI = capas.length ? capas[0].i : null;
        const capa = capaI != null ? c.capas[capaI] : null;
        return { c, est, n, sec, nivel, capas, P, capa, largo: capa ? largoPatron(capa, P) : 0 };
    }

    // Filas de la rejilla: de la nota más aguda a la más grave, con holgura; `base` = nota de la fila de abajo
    function rango(capa) {
        const ns = capa.bajo.flatMap(n => [n[2], typeof n[4] === 'number' ? n[4] : n[2]]);
        const lo = Math.max(NOTA_MIN, Math.min(...ns) - 3), hi = Math.min(NOTA_MAX, Math.max(...ns) + 3);
        const filas = Math.max(16, hi - lo + 1);
        return { lo: base != null ? base : Math.max(NOTA_MIN, Math.min(lo, NOTA_MAX - filas + 1)), filas };
    }

    function pintar() {
        const enfocado = cuerpo.contains(document.activeElement) && document.activeElement.tagName === 'CANVAS';
        cuerpo.textContent = '';
        const x = contexto();
        if (!x) { cuerpo.appendChild(el('p', 'mensaje', t('Elige una canción.', 'Pick a song.'))); return; }
        const barra = el('div', 'ri-fila-bajo');
        cuerpo.appendChild(barra);
        if (!x.capas.length) {
            barra.appendChild(el('p', 'mensaje', t(`El nivel «${x.nivel}» no tiene capa de bajo: no hay partitura en esa sección.`, `Level «${x.nivel}» has no bass layer: that section has no chart.`)));
            return;
        }
        // elegir capa y compases del patrón
        const lb = el('label'); lb.appendChild(el('span', '', t('Capa', 'Layer')));
        const sel = el('select');
        for (const { i, capa } of x.capas) { const o = el('option', '', `${i + 1} · ${(capa.niveles || ['todos']).join(', ')} · ${capa.bajo.length} ${t('notas', 'notes')}`); o.value = String(i); sel.appendChild(o); }
        sel.value = String(capaI); sel.addEventListener('change', () => { capaI = Number(sel.value); selPaso = null; base = null; pintar(); });
        lb.appendChild(sel); barra.appendChild(lb);
        const lc = el('label'); lc.appendChild(el('span', '', t('compases del patrón', 'pattern bars')));
        const ic = el('input'); ic.type = 'number'; ic.min = 1; ic.max = 4; ic.value = x.capa.compases || 1;
        ic.addEventListener('change', () => {
            const r = cambiarCompasesBajo(x.capa, Number(ic.value), x.P);
            if (!r) { api.rotular('Ese valor no es válido (1 a 4 y que quede alguna nota).', 'That value is not valid (1 to 4, and some note must remain).', 'error'); pintar(); return; }
            api.editar(c => { const k = c.capas[capaI]; k.bajo = r.bajo; if (Number(ic.value) === 1) delete k.compases; else k.compases = Number(ic.value); });
            if (r.perdidas) api.rotular(`Se quitaron ${r.perdidas} notas que quedaron fuera del patrón.`, `${r.perdidas} notes outside the pattern were removed.`, 'aviso');
        });
        lc.appendChild(ic); barra.appendChild(lc);
        // herramienta para las notas nuevas
        const lt = el('label'); lt.appendChild(el('span', '', t('técnica nueva', 'new technique')));
        const st = el('select'); for (const k of TECNICAS) { const o = el('option', '', `${k} · ${NOMBRE_TECNICA[k][api.ingles() ? 1 : 0]}`); o.value = k; st.appendChild(o); }
        st.value = herr.tipo; st.addEventListener('change', () => { herr.tipo = st.value; }); lt.appendChild(st); barra.appendChild(lt);
        const ld = el('label'); ld.appendChild(el('span', '', t('duración nueva', 'new length')));
        const idur = el('input'); idur.type = 'number'; idur.min = 0.05; idur.max = 64; idur.step = 0.5; idur.value = herr.dur;
        idur.addEventListener('change', () => { const v = Number(idur.value); if (v >= 0.05 && v <= 64) herr.dur = v; else idur.value = herr.dur; }); ld.appendChild(idur); barra.appendChild(ld);
        const bBaja = el('button', 'boton chico secundario', t('Ver más grave', 'View lower')); bBaja.type = 'button';
        const bSube = el('button', 'boton chico secundario', t('Ver más agudo', 'View higher')); bSube.type = 'button';
        const mover = d => { const r = rango(x.capa); base = Math.max(NOTA_MIN, Math.min(NOTA_MAX - r.filas + 1, r.lo + d)); pintarRejilla(); };
        bBaja.addEventListener('click', () => mover(-6)); bSube.addEventListener('click', () => mover(6));
        barra.appendChild(bBaja); barra.appendChild(bSube);
        cuerpo.appendChild(el('p', 'mensaje ri-ayuda', t('Clic en una casilla vacía = nota nueva con la técnica de arriba; clic en una nota = elegirla; clic en otra altura del mismo paso = moverla. Con la rejilla enfocada: ↑ ↓ cambian la altura, ← → la duración, Supr la quita.', 'Click an empty cell = new note with the technique above; click a note = select it; click another pitch on the same step = move it. With the grid focused: ↑ ↓ change pitch, ← → length, Del removes it.')));
        const caja = el('div', 'ri-caja'); const cv = el('canvas', 'ri-lienzo'); cv.tabIndex = 0; caja.appendChild(cv); cuerpo.appendChild(caja);
        cuerpo.appendChild(el('div', 'ri-nota-bajo')).id = 'ri-nota-bajo';
        cv.addEventListener('click', e => alClic(e, cv));
        cv.addEventListener('keydown', alTecla);
        pintarRejilla(cv); pintarInspector();
        if (enfocado) cv.focus();
    }

    function pintarRejilla(cvDado) {
        const x = contexto(); if (!x || !x.capa) return;
        const cv = cvDado || cuerpo.querySelector('canvas'); if (!cv) return;
        const { lo, filas } = rango(x.capa), cols = x.largo, g = cv.getContext('2d');
        const vistas = DIFICULTADES.map(d => ({ d, v: api.armar(d) })).filter(o => o.v);
        const altoRej = filas * ALTO_FILA, altoCar = vistas.reduce((a, o) => a + o.v.carriles * ALTO_CARRIL + 14, 0);
        cv.width = ANCHO_ROT + cols * ANCHO_COL + 2; cv.height = altoRej + MARGEN_V + altoCar;
        g.fillStyle = '#14100b'; g.fillRect(0, 0, cv.width, cv.height);
        const X = col => ANCHO_ROT + col * ANCHO_COL, Y = nota => (filas - 1 - (nota - lo)) * ALTO_FILA;
        // filas: las notas negras más oscuras, rótulo en cada Do/Mi/Sol
        g.font = '10px monospace'; g.textBaseline = 'middle';
        for (let r = 0; r < filas; r++) {
            const nota = lo + r, negra = [1, 3, 6, 8, 10].includes(nota % 12);
            g.fillStyle = negra ? '#1c1610' : '#241c13'; g.fillRect(ANCHO_ROT, Y(nota), cols * ANCHO_COL, ALTO_FILA);
            if (nota % 12 === 0 || nota % 12 === 4 || nota % 12 === 7) { g.fillStyle = '#aaa'; g.fillText(nombreNota(nota), 3, Y(nota) + ALTO_FILA / 2); }
        }
        // columnas: compás grueso, tiempo (cada 4 pasos) medio, paso fino
        for (let c = 0; c <= cols; c++) {
            g.fillStyle = c % x.P === 0 ? '#000' : c % 4 === 0 ? '#3a2e20' : '#2a2016'; g.fillRect(X(c), 0, c % x.P === 0 ? 2 : 1, altoRej);
        }
        // notas
        for (const n of x.capa.bajo) {
            const [paso, tipo, nota, dur, extra] = n, y = Y(nota), w = Math.max(ANCHO_COL - 2, dur * ANCHO_COL - 2);
            g.fillStyle = COLOR_TEC[tipo] || '#fff'; g.fillRect(X(paso) + 1, y + 1, w, ALTO_FILA - 2);
            g.fillStyle = '#000'; g.font = '9px monospace'; g.fillText(tipo, X(paso) + 4, y + ALTO_FILA / 2);
            if (typeof extra === 'number') { g.fillStyle = COLOR_TEC[tipo]; g.globalAlpha = 0.5; g.fillRect(X(paso + dur) - 2, Y(extra) + 2, 6, ALTO_FILA - 4); g.globalAlpha = 1; }
            if (Array.isArray(extra)) { g.fillStyle = '#fff'; for (const e of extra) g.fillRect(X(paso) + 6, Y(e) + ALTO_FILA / 2 - 1, 4, 2); }
            if (paso === selPaso) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(X(paso) + 0.5, y + 0.5, w + 1, ALTO_FILA - 1); g.lineWidth = 1; }
        }
        // carriles de cada dificultad, alineados con las columnas (primera vuelta del patrón en esta sección)
        const cols4 = api.colores(); let y0 = altoRej + MARGEN_V;
        g.textBaseline = 'alphabetic';
        for (const { d, v } of vistas) {
            g.fillStyle = '#aaa'; g.font = '10px monospace'; g.fillText(NOMBRE_DIF[d][api.ingles() ? 1 : 0], 3, y0 + 9);
            const y1 = y0 + 12;
            for (let c = 0; c < v.carriles; c++) { g.fillStyle = c % 2 ? '#1c1610' : '#241c13'; g.fillRect(ANCHO_ROT, y1 + c * ALTO_CARRIL, cols * ANCHO_COL, ALTO_CARRIL); }
            for (const m of carrilesEnPatron(v, x.c, x.n, x.capa.compases || 1)) for (const car of m.carriles) {
                g.fillStyle = cols4[car % cols4.length]; g.fillRect(X(m.col) + 2, y1 + car * ALTO_CARRIL + 1, ANCHO_COL - 4, ALTO_CARRIL - 2);
                if (m.marcada) { g.strokeStyle = '#fff'; g.strokeRect(X(m.col) + 2.5, y1 + car * ALTO_CARRIL + 1.5, ANCHO_COL - 5, ALTO_CARRIL - 3); }
            }
            y0 = y1 + v.carriles * ALTO_CARRIL + 2;
        }
    }

    function alClic(e, cv) {
        const x = contexto(); if (!x || !x.capa) return;
        const r = cv.getBoundingClientRect(), k = cv.width / r.width, px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
        const { lo, filas } = rango(x.capa);
        cv.focus();
        const col = Math.floor((px - ANCHO_ROT) / ANCHO_COL), fila = Math.floor(py / ALTO_FILA);
        if (col < 0 || col >= x.largo || fila < 0 || fila >= filas) return;
        const nota = lo + filas - 1 - fila, bajo = x.capa.bajo;
        // nota cuya cola cubre esta casilla
        const cubre = bajo.find(n => col >= n[0] && col < n[0] + Math.max(1, Math.ceil(n[3])) && n[2] === nota);
        if (cubre) { selPaso = cubre[0]; pintarRejilla(cv); pintarInspector(); return; }
        const aqui = bajo.find(n => n[0] === col);
        if (aqui) { cambiar(aqui[0], 'nota', nota); selPaso = col; return; } // mueve la altura de la nota de ese paso
        const nueva = [col, herr.tipo, nota, herr.dur]; const ex = extraPorDefecto(herr.tipo, nota); if (ex !== undefined) nueva.push(ex);
        const sal = ponerNotaBajo(bajo, nueva, x.largo);
        if (!sal) { api.rotular('Esa nota no es válida.', 'That note is not valid.', 'error'); return; }
        selPaso = col; guardarBajo(sal);
    }
    function alTecla(e) {
        const x = contexto(); if (!x || !x.capa || selPaso == null) return;
        const n = x.capa.bajo[notaEnPaso(x.capa.bajo, selPaso)]; if (!n) return;
        if (e.key === 'ArrowUp') { e.preventDefault(); cambiar(selPaso, 'nota', n[2] + 1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); cambiar(selPaso, 'nota', n[2] - 1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); cambiar(selPaso, 'dur', n[3] + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); cambiar(selPaso, 'dur', Math.max(0.5, n[3] - 1)); }
        else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); quitar(selPaso); }
    }

    function guardarBajo(sal) { const i = capaI; api.editar(c => { c.capas[i].bajo = sal; }); }
    function cambiar(paso, campo, valor) {
        const x = contexto(); if (!x || !x.capa) return;
        const sal = cambiarNotaBajo(x.capa.bajo, paso, campo, valor, x.largo);
        if (!sal) { api.rotular('Ese valor no es válido.', 'That value is not valid.', 'error'); pintarInspector(); return; }
        if (campo === 'paso') selPaso = valor;
        guardarBajo(sal);
    }
    function quitar(paso) {
        const x = contexto(); if (!x || !x.capa) return;
        const sal = quitarNotaBajo(x.capa.bajo, paso);
        if (!sal) { api.rotular('Una capa necesita al menos una nota.', 'A layer needs at least one note.', 'error'); return; }
        selPaso = null; guardarBajo(sal);
    }

    function pintarInspector() {
        const dest = document.getElementById('ri-nota-bajo'); if (!dest) return;
        dest.textContent = '';
        const x = contexto(); if (!x || !x.capa) return;
        const i = selPaso == null ? -1 : notaEnPaso(x.capa.bajo, selPaso);
        if (i < 0) { dest.appendChild(el('p', 'mensaje', t('Elige una nota del bajo para cambiar su técnica, altura, duración o paso.', 'Pick a bass note to change its technique, pitch, length or step.'))); return; }
        const n = x.capa.bajo[i], fila = el('div', 'ri-fila-bajo');
        const campo = (rotulo, tipo, valor, alCambiar, min, max, paso = 1) => {
            const lb = el('label'); lb.appendChild(el('span', '', rotulo));
            const inp = el('input'); inp.type = tipo; inp.value = String(valor); if (min != null) { inp.min = min; inp.max = max; inp.step = paso; }
            inp.addEventListener('change', () => alCambiar(inp.value)); lb.appendChild(inp); return lb;
        };
        const ls = el('label'); ls.appendChild(el('span', '', t('técnica', 'technique')));
        const st = el('select'); for (const k of TECNICAS) { const o = el('option', '', `${k} · ${NOMBRE_TECNICA[k][api.ingles() ? 1 : 0]}`); o.value = k; st.appendChild(o); }
        st.value = n[1]; st.addEventListener('change', () => cambiar(n[0], 'tipo', st.value)); ls.appendChild(st); fila.appendChild(ls);
        fila.appendChild(campo(t(`paso (de 0 a ${x.largo - 1})`, `step (0 to ${x.largo - 1})`), 'number', n[0], v => cambiar(n[0], 'paso', Number(v)), 0, x.largo - 1));
        fila.appendChild(campo(t(`altura MIDI (${nombreNota(n[2])})`, `MIDI pitch (${nombreNota(n[2])})`), 'number', n[2], v => cambiar(n[0], 'nota', Number(v)), NOTA_MIN, NOTA_MAX));
        fila.appendChild(campo(t('duración (pasos)', 'length (steps)'), 'number', n[3], v => cambiar(n[0], 'dur', Number(v)), 0.05, 64, 0.5));
        if (n[1] === 'd') fila.appendChild(campo(t('nota final', 'end note'), 'number', n[4], v => cambiar(n[0], 'extra', Number(v)), NOTA_MIN, NOTA_MAX));
        if (n[1] === 'r') fila.appendChild(campo(t('acorde (notas MIDI)', 'chord (MIDI notes)'), 'text', acordeATexto(n[4]), v => { const a = textoAAcorde(v); if (a) cambiar(n[0], 'extra', a); else { api.rotular('Acorde no válido: de 1 a 6 notas MIDI separadas por espacios.', 'Invalid chord: 1 to 6 MIDI notes separated by spaces.', 'error'); pintarInspector(); } }));
        const q = el('button', 'boton chico secundario', t('Quitar nota', 'Remove note')); q.type = 'button'; q.addEventListener('click', () => quitar(n[0])); fila.appendChild(q);
        dest.appendChild(fila);
    }

    return { pintar };
}
