// =========================================================
// VENJY · Estudio · pestaña Ritmo: la partitura de La Gira en línea de tiempo (S10a)
// Muestra la partitura que sale sola del bajo de cada canción (salonas-partitura.js), por dificultad: secciones arriba,
// un carril por fila y las notas en su segundo exacto (slap/pop con borde, «brillantes» con estrella, largas con cola).
// «Revisar partitura» avisa de lo injugable. Ajustes a mano: elegir una nota y cambiarla de carril o quitarla; se
// guarda en salonas.json → ajustes.<canción>.<dificultad>.<compás:paso> (ritmo-modelo.mjs) y nunca cambia cuándo suena.
// Comparte los datos, el envío en vivo y Guardar con la pestaña Salonas (ctx.salonas), así no pisan el mismo archivo.
// «Probar en el juego» (S10b): mensaje `salonas` del puente; el juego abre esa canción en Práctica, solo con la sección elegida
// y con los ajustes a mano actuales.
// S10c-1: panel «Canción» para editar la estructura (secciones, compases, nivel, tempo, progresión) de musica.json → canciones;
// comparte datos, deshacer y Guardar con la pestaña Música (ctx.musica). S10c-2: panel «Bajo» (ritmo-bajo.js), piano roll de la capa `bajo` de la sección elegida con los carriles de cada dificultad debajo.
// =========================================================
import { armar, revisar, ponerAjuste, ajustesDe, contarAjustes, DIFICULTADES, NOMBRES_SECCION, nivelDe, nivelesUsados, agregarSeccion, duplicarSeccion, quitarSeccion, moverSeccion, cambiarSeccion, progDe, progATexto, ponerProg } from './ritmo-modelo.mjs';
import { revisarCancion } from '../mundo/supervivencia/musica-motor.js';
import { montarBajo } from './ritmo-bajo.js';

const COLORES_BASE = ['#55c34a', '#d8373a', '#f0d23c', '#3c78d8'];
const FONDO_SEC = ['#3a2a1c', '#2c3a1c', '#1c2f3a', '#3a1c33', '#3a331c'];
const NOMBRE_DIF = { facil: ['Fácil', 'Easy'], normal: ['Normal', 'Normal'], dificil: ['Difícil', 'Hard'], experto: ['Experto', 'Expert'] };
const NOMBRE_SEC = { intro: ['Intro', 'Intro'], verso: ['Verso', 'Verse'], precoro: ['Precoro', 'Pre-chorus'], coro: ['Coro', 'Chorus'], puente: ['Puente', 'Bridge'], solo: ['Solo', 'Solo'], final: ['Final', 'Outro'] };
const ALTO_CAB = 24, ALTO_CARRIL = 30, ALTO_REGLA = 18, MARGEN = 16;

export async function montarRitmo(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const el = (tag, cls, texto) => { const e = document.createElement(tag); if (cls) e.className = cls; if (texto != null) e.textContent = texto; return e; };
    const lienzo = $('ri-lienzo'), caja = $('ri-caja'), msg = $('ri-mensaje'), btnGuardar = $('ri-guardar');
    const selCancion = $('ri-cancion'), selDif = $('ri-dificultad'), zoom = $('ri-zoom'), selSec = $('ri-seccion');
    const sa = ctx.salonas;
    if (!sa) { msg.textContent = 'La pestaña Salonas no cargó: recarga el Estudio.'; return; }
    const mu = ctx.musica;
    if (!mu) { msg.textContent = 'La pestaña Música no cargó: recarga el Estudio.'; return; }
    const musica = { get canciones() { return mu.datos().canciones || {}; } }; // musica.json vivo, el mismo que edita la pestaña Música

    const datos = () => sa.datos();
    const canciones = () => ((datos().juego || {}).canciones || []).filter(k => musica.canciones && musica.canciones[k]);
    const nombreDe = k => { const n = musica.canciones[k] && musica.canciones[k].nombre; return n ? (n[ctx.idioma] || n.es) : k; };
    const nombreSec = s => { const n = NOMBRE_SEC[s]; return n ? n[ctx.idioma === 'en' ? 1 : 0] : s; };
    const colores = () => { const c = ((datos().juego || {}).carriles || {}).colores; return Array.isArray(c) && c.length >= 4 ? c : COLORES_BASE; };
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };

    let cancion = null, dificultad = 'normal', vista = null, elegida = null, revisado = false;

    // ---------- selectores ----------
    function llenarSelectores() {
        const ks = canciones();
        if (!ks.includes(cancion)) cancion = ks.includes((datos().juego || {}).cancion) ? datos().juego.cancion : ks[0] || null;
        selCancion.textContent = '';
        for (const k of ks) {
            const n = contarAjustes(datos().ajustes, k), o = el('option', '', nombreDe(k) + (n ? ` · ${n} ${t('ajustes', 'tweaks')}` : ''));
            o.value = k; selCancion.appendChild(o);
        }
        selCancion.value = cancion || '';
        selDif.textContent = '';
        for (const d of DIFICULTADES) { const o = el('option', '', NOMBRE_DIF[d][ctx.idioma === 'en' ? 1 : 0]); o.value = d; selDif.appendChild(o); }
        selDif.value = dificultad;
    }

    // Secciones de la canción elegida, con su número si se repite («Coro 2»); el índice es el mismo que usa la Práctica del juego
    function llenarSecciones() {
        const previa = selSec.value;
        selSec.textContent = '';
        if (!vista) return;
        const total = {}, veces = {};
        for (const s of vista.secciones) total[s.seccion] = (total[s.seccion] || 0) + 1;
        vista.secciones.forEach((s, i) => {
            veces[s.seccion] = (veces[s.seccion] || 0) + 1;
            const o = el('option', '', nombreSec(s.seccion) + (total[s.seccion] > 1 ? ` ${veces[s.seccion]}` : '') + ` · ${s.t0.toFixed(1)} s`);
            o.value = String(i); selSec.appendChild(o);
        });
        if (previa && Number(previa) < vista.secciones.length) selSec.value = previa;
    }

    // ---------- armado ----------
    function recalcular() {
        const c = cancion && musica.canciones[cancion];
        vista = c ? armar(cancion, c, dificultad, datos().reglas, datos().ajustes) : null;
        if (vista && elegida && ![...vista.notas, ...vista.quitadas].some(n => n.clave === elegida)) elegida = null;
        llenarSecciones();
    }
    const notaElegida = () => vista && elegida ? [...vista.notas, ...vista.quitadas].find(n => n.clave === elegida) : null;

    // ---------- dibujo ----------
    const pps = () => Number(zoom.value) || 40;
    function dibujar() {
        const cv = lienzo, g = cv.getContext('2d');
        if (!vista) { cv.width = 300; cv.height = 40; g.clearRect(0, 0, 300, 40); return; }
        const n = vista.carriles, alto = ALTO_CAB + n * ALTO_CARRIL + ALTO_REGLA;
        cv.width = Math.ceil(vista.duracion * pps()) + MARGEN * 2; cv.height = alto;
        g.clearRect(0, 0, cv.width, cv.height);
        g.fillStyle = '#14100b'; g.fillRect(0, 0, cv.width, cv.height);
        const X = s => MARGEN + s * pps(), cols = colores();
        // secciones arriba, con su banda de fondo en toda la altura
        vista.secciones.forEach((s, i) => {
            g.fillStyle = FONDO_SEC[i % FONDO_SEC.length]; g.fillRect(X(s.t0), 0, X(s.t1) - X(s.t0), alto);
            g.fillStyle = '#000'; g.fillRect(X(s.t0), 0, 2, alto);
            g.fillStyle = '#fff'; g.font = '12px PixelCraft, monospace'; g.textBaseline = 'middle';
            g.fillText(nombreSec(s.seccion), X(s.t0) + 5, ALTO_CAB / 2);
        });
        // carriles
        for (let c = 0; c < n; c++) {
            const y = ALTO_CAB + c * ALTO_CARRIL;
            g.fillStyle = 'rgba(255,255,255,0.05)'; if (c % 2) g.fillRect(0, y, cv.width, ALTO_CARRIL);
            g.fillStyle = cols[c % cols.length]; g.globalAlpha = 0.35; g.fillRect(0, y + ALTO_CARRIL - 2, cv.width, 2); g.globalAlpha = 1;
        }
        // regla de segundos
        g.fillStyle = '#aaa'; g.font = '10px monospace'; g.textBaseline = 'alphabetic';
        const paso = pps() >= 60 ? 1 : pps() >= 25 ? 5 : 10;
        for (let s = 0; s <= vista.duracion; s += paso) { g.fillRect(X(s), ALTO_CAB + n * ALTO_CARRIL, 1, 5); g.fillText(`${s}s`, X(s) + 3, alto - 4); }
        const celda = (nota, quitada) => {
            for (const c of nota.carriles || [nota.carril]) {
                const y = ALTO_CAB + c * ALTO_CARRIL + 5, h = ALTO_CARRIL - 10, x = X(nota.t), col = cols[c % cols.length];
                if (nota.dur > 0 && !quitada) { g.fillStyle = col; g.globalAlpha = 0.45; g.fillRect(x, y + h / 2 - 3, Math.max(4, nota.dur * pps()), 6); g.globalAlpha = 1; }
                const w = 10;
                if (quitada) { g.strokeStyle = '#888'; g.setLineDash([2, 2]); g.strokeRect(x - w / 2 + 0.5, y + 0.5, w, h); g.setLineDash([]); continue; }
                g.fillStyle = col; g.fillRect(x - w / 2, y, w, h);
                g.strokeStyle = nota.marcada ? (nota.tipo === 's' ? '#ff9a2e' : '#59d8ff') : '#000'; g.lineWidth = nota.marcada ? 3 : 1;
                g.strokeRect(x - w / 2 + 0.5, y + 0.5, w - 1, h - 1); g.lineWidth = 1;
                if (nota.brillante) { g.fillStyle = '#fff'; g.fillRect(x - 1, y + 3, 3, 3); }
                if (nota.movida) { g.fillStyle = '#ffff55'; g.fillRect(x - 2, y + h - 5, 5, 5); }
                if (nota.clave === elegida) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(x - w / 2 - 2, y - 2, w + 4, h + 4); g.lineWidth = 1; }
            }
        };
        vista.quitadas.forEach(q => { celda(q, true); if (q.clave === elegida) { const y = ALTO_CAB + q.carril * ALTO_CARRIL + 3; g.strokeStyle = '#fff'; g.strokeRect(X(q.t) - 7, y, 14, ALTO_CARRIL - 6); } });
        vista.notas.forEach(q => celda(q, false));
        // avisos graves: franja roja bajo la cabecera de su sección
        if (revisado) for (const a of avisosActuales().filter(a => a.n != null && a.dificultad === dificultad)) {
            const s = vista.secciones[a.n]; if (!s) continue;
            g.fillStyle = a.grave ? '#ff5555' : '#ffff55'; g.fillRect(X(s.t0) + 2, ALTO_CAB - 4, X(s.t1) - X(s.t0) - 2, 3);
        }
    }

    function notaEn(px, py) {
        if (!vista) return null;
        const s = (px - MARGEN) / pps(), c = Math.floor((py - ALTO_CAB) / ALTO_CARRIL), tol = Math.max(0.1, 8 / pps());
        if (c < 0 || c >= vista.carriles) return null;
        let mejor = null, dm = tol;
        for (const n of [...vista.notas, ...vista.quitadas]) {
            if (!(n.carriles || [n.carril]).includes(c) && n.carril !== c) continue;
            const d = Math.abs(n.t - s); if (d <= dm) { dm = d; mejor = n; }
        }
        return mejor;
    }

    // ---------- avisos ----------
    let avisos = [];
    const avisosActuales = () => avisos;
    function textoAviso(a) {
        const sec = a.n != null && vista && vista.secciones[a.n] ? nombreSec(vista.secciones[a.n].seccion) : '';
        const dif = a.dificultad ? NOMBRE_DIF[a.dificultad][ctx.idioma === 'en' ? 1 : 0] : '';
        switch (a.tipo) {
            case 'vacia': return t(`${sec} no tiene notas en ${dif}.`, `${sec} has no notes on ${dif}.`);
            case 'densidad': return t(`${sec} tiene demasiadas notas por segundo en ${dif}.`, `${sec} has too many notes per second on ${dif}.`);
            case 'separacion': return t(`${sec} tiene notas demasiado juntas en ${dif}.`, `${sec} has notes too close together on ${dif}.`);
            case 'huerfano': { const m = /ajuste (\S+)/.exec(a.texto || ''); return t(`El ajuste de la nota ${m ? m[1] : ''} (${dif}) ya no corresponde a ninguna nota.`, `The tweak for note ${m ? m[1] : ''} (${dif}) no longer matches any note.`); }
            case 'escala': return t(`${sec} tiene notas fuera de la escala del acorde (puede ser a propósito).`, `${sec} has notes outside the chord scale (may be on purpose).`);
            default: return a.texto || a.tipo;
        }
    }
    function pintarAvisos() {
        const lista = $('ri-avisos'); lista.textContent = '';
        if (!revisado) { lista.appendChild(el('li', 'gris', t('Aún no revisada.', 'Not reviewed yet.'))); return; }
        if (!avisos.length) { lista.appendChild(el('li', 'ok', t('Sin avisos: la partitura se puede tocar.', 'No warnings: the chart is playable.'))); return; }
        for (const a of avisos) {
            const li = el('li', a.grave ? 'error' : 'aviso', (a.grave ? '● ' : '○ ') + textoAviso(a));
            li.addEventListener('click', () => {
                if (a.dificultad && a.dificultad !== dificultad) { dificultad = a.dificultad; selDif.value = dificultad; todo(); }
                const s = a.n != null && vista && vista.secciones[a.n];
                if (s) caja.scrollLeft = Math.max(0, MARGEN + s.t0 * pps() - 40);
            });
            lista.appendChild(li);
        }
    }
    function revisarAhora() {
        const c = cancion && musica.canciones[cancion];
        avisos = c ? revisar(cancion, c, datos().reglas, datos().ajustes) : [];
        revisado = true; pintarAvisos(); dibujar();
        const graves = avisos.filter(a => a.grave).length;
        rotular(`Revisada: ${graves} avisos graves, ${avisos.length - graves} suaves.`, `Reviewed: ${graves} serious warnings, ${avisos.length - graves} soft.`, graves ? 'error' : 'ok');
    }

    // ---------- inspector de la nota elegida ----------
    function pintarNota() {
        const cuerpo = $('ri-nota'); cuerpo.textContent = '';
        const n = notaElegida();
        if (!n) { cuerpo.appendChild(el('p', 'mensaje', t('Toca una nota de la línea de tiempo para moverla de carril o quitarla.', 'Click a note on the timeline to move it to another lane or remove it.'))); return; }
        const sec = vista.secciones[n.n];
        const [comp, pasoN] = n.clave.split(':');
        cuerpo.appendChild(el('p', 'mensaje', t(`${nombreSec(sec.seccion)} · compás ${Number(comp) + 1}, paso ${Number(pasoN) + 1} · ${n.t.toFixed(2)} s`, `${nombreSec(sec.seccion)} · bar ${Number(comp) + 1}, step ${Number(pasoN) + 1} · ${n.t.toFixed(2)} s`)));
        if (n.marcada) cuerpo.appendChild(el('p', 'mensaje', n.tipo === 's' ? t('Slap: ventana más estrecha, más puntos.', 'Slap: tighter window, more points.') : t('Pop: ventana más estrecha, más puntos.', 'Pop: tighter window, more points.')));
        const fila = el('div', 'fila-botones');
        const cols = colores();
        for (let c = 0; c < vista.carriles; c++) {
            const b = el('button', 'boton chico' + (!n.quitada && n.carril === c ? '' : ' secundario'), String(c + 1)); b.type = 'button';
            b.style.borderBottom = `4px solid ${cols[c % cols.length]}`; b.title = t(`Carril ${c + 1}`, `Lane ${c + 1}`);
            b.addEventListener('click', () => poner(n, c));
            fila.appendChild(b);
        }
        const q = el('button', 'boton chico secundario', n.quitada ? t('Devolver', 'Restore') : t('Quitar', 'Remove')); q.type = 'button';
        q.addEventListener('click', () => poner(n, n.quitada ? undefined : null));
        fila.appendChild(q);
        if (n.movida) { const v = el('button', 'boton chico secundario', t('Volver a la generada', 'Back to generated')); v.type = 'button'; v.addEventListener('click', () => poner(n, undefined)); fila.appendChild(v); }
        cuerpo.appendChild(fila);
    }
    function poner(n, valor) {
        if (!sa.datos().ajustes && valor === undefined) return;
        const nuevo = ponerAjuste(sa.datos().ajustes, cancion, dificultad, n.clave, valor, n.base);
        if (Object.keys(nuevo).length) sa.datos().ajustes = nuevo; else delete sa.datos().ajustes;
        sa.cambio(); alCambiarDatos();
    }

    // ---------- estructura de la canción (S10c-1) ----------
    let secEd = 0; // sección cuya progresión se ve
    const cancionActual = () => (cancion && musica.canciones[cancion]) || null;
    // Aplica un cambio a la canción elegida (con deshacer y envío en vivo); valido=false: no se toca nada
    function editarCancion(f, valido = true) {
        if (!cancionActual() || !valido) { rotular('Ese valor no es válido.', 'That value is not valid.', 'error'); pintarEstructura(); return false; }
        mu.editar(d => f(d.canciones[cancion]));
        elegida = null; alCambiarDatos(); return true;
    }
    const nuevaEst = (nueva, tras) => { if (editarCancion(c => { c.estructura = nueva; }, !!nueva) && tras) { tras(); pintarEstructura(); bajo.pintar(); } };
    function nivelesOfrecidos(c) {
        const s = new Set([...NOMBRES_SECCION, ...nivelesUsados(c)]);
        for (const p of c.capas || []) for (const n of p.niveles || []) s.add(n);
        return [...s];
    }
    function pintarEstructura() {
        const cuerpo = $('ri-estructura'); cuerpo.textContent = '';
        const c = cancionActual();
        if (!c) { cuerpo.appendChild(el('p', 'mensaje', t('Elige una canción.', 'Pick a song.'))); return; }
        const est = c.estructura || [];
        if (secEd >= est.length) secEd = Math.max(0, est.length - 1);
        const caja2 = el('div', 'ri-est'); cuerpo.appendChild(caja2);
        const lista = el('datalist'); lista.id = 'ri-niveles'; for (const n of nivelesOfrecidos(c)) { const o = el('option'); o.value = n; lista.appendChild(o); }
        caja2.appendChild(lista);
        const campo = (rotulo, tipo, valor, alCambiar, extra = {}) => {
            const lb = el('label'); lb.appendChild(el('span', '', rotulo));
            const i = el('input'); i.type = tipo; i.value = valor == null ? '' : String(valor);
            if (extra.lista) i.setAttribute('list', extra.lista);
            if (extra.ph) i.placeholder = extra.ph;
            if (extra.clase) i.className = extra.clase;
            if (extra.min != null) { i.min = extra.min; i.max = extra.max; }
            i.addEventListener('click', e => e.stopPropagation());
            i.addEventListener('change', () => alCambiar(i.value));
            lb.appendChild(i); return lb;
        };
        // nombre y tempo base de la canción
        const cab = el('div', 'ri-fila');
        const nom = c.nombre || {};
        const poner = (k, v) => { const n = { es: nom.es || '', en: nom.en || '' }; n[k] = v; if (!n.es && !n.en) return; editarCancion(cc => { cc.nombre = { es: n.es || n.en, en: n.en || n.es }; }); };
        cab.appendChild(campo('ES', 'text', nom.es, v => poner('es', v), { clase: 'ancho' }));
        cab.appendChild(campo('EN', 'text', nom.en, v => poner('en', v), { clase: 'ancho' }));
        cab.appendChild(campo('bpm', 'number', c.bpm, v => { const x = Number(v); editarCancion(cc => { cc.bpm = x; }, x >= 30 && x <= 300); }, { min: 30, max: 300 }));
        cab.appendChild(campo(t('pasos', 'steps'), 'number', c.pasos || 16, v => { const x = Number(v); editarCancion(cc => { cc.pasos = x; }, Number.isInteger(x) && x >= 4 && x <= 32); }, { min: 4, max: 32 }));
        caja2.appendChild(cab);
        // secciones
        est.forEach((sec, i) => {
            const fila = el('div', 'ri-fila' + (i === secEd ? ' sel' : ''));
            fila.addEventListener('click', () => { secEd = i; pintarEstructura(); bajo.pintar(); });
            fila.appendChild(el('span', 'ri-num', String(i + 1)));
            fila.appendChild(campo(t('sección', 'section'), 'text', sec.seccion, v => nuevaEst(cambiarSeccion(est, i, 'seccion', v.trim())), { lista: 'ri-niveles' }));
            fila.appendChild(campo(t('compases', 'bars'), 'number', sec.compases, v => nuevaEst(cambiarSeccion(est, i, 'compases', v)), { min: 1, max: 64 }));
            fila.appendChild(campo(t('nivel', 'level'), 'text', sec.nivel || '', v => nuevaEst(cambiarSeccion(est, i, 'nivel', v.trim())), { lista: 'ri-niveles', ph: sec.seccion }));
            fila.appendChild(campo('bpm', 'number', sec.bpm || '', v => nuevaEst(cambiarSeccion(est, i, 'bpm', v)), { min: 30, max: 300, ph: String(c.bpm) }));
            fila.appendChild(campo(t('pasos', 'steps'), 'number', sec.pasos || '', v => nuevaEst(cambiarSeccion(est, i, 'pasos', v)), { min: 4, max: 32, ph: String(c.pasos || 16) }));
            const boton = (txt, titulo, f) => { const b = el('button', 'boton chico secundario', txt); b.type = 'button'; b.title = titulo; b.addEventListener('click', e => { e.stopPropagation(); f(); }); fila.appendChild(b); };
            boton('↑', t('Subir', 'Move up'), () => nuevaEst(moverSeccion(est, i, -1), () => { secEd = Math.max(0, i - 1); }));
            boton('↓', t('Bajar', 'Move down'), () => nuevaEst(moverSeccion(est, i, 1), () => { secEd = Math.min(est.length - 1, i + 1); }));
            boton('⧉', t('Duplicar', 'Duplicate'), () => nuevaEst(duplicarSeccion(est, i), () => { secEd = i + 1; }));
            boton('✕', t('Quitar (una canción necesita al menos una sección)', 'Remove (a song needs at least one section)'), () => nuevaEst(quitarSeccion(est, i)));
            caja2.appendChild(fila);
        });
        const mas = el('button', 'boton chico', t('Agregar sección', 'Add section')); mas.type = 'button';
        mas.addEventListener('click', () => nuevaEst(agregarSeccion(est, est.length - 1, 'verso', 4), () => { secEd = est.length; }));
        caja2.appendChild(mas);
        // progresión del nivel de la sección elegida
        const sec = est[secEd];
        if (sec) {
            const nivel = nivelDe(sec), fila = el('div', 'ri-fila ri-prog');
            fila.appendChild(campo(t('acordes del nivel «' + nivel + '» (uno por compás: Am D F G)', 'chords of level «' + nivel + '» (one per bar: Am D F G)'), 'text', progATexto(progDe(c, nivel)), v => {
                const r = ponerProg(c, nivel, v);
                if (r.malo) { rotular('No conozco el acorde «' + r.malo + '».', 'I do not know the chord «' + r.malo + '».', 'error'); pintarEstructura(); return; }
                editarCancion(cc => { if (Object.keys(r.progs).length) cc.progs = r.progs; else delete cc.progs; });
            }, { clase: 'ancho' }));
            caja2.appendChild(fila);
        }
        // problemas que ve el motor (p. ej. un nivel nuevo sin capas)
        const problemas = revisarCancion(c, mu.datos().instrumentos);
        const ul = el('ul', 'ri-avisos');
        if (problemas.length) for (const p of problemas) ul.appendChild(el('li', 'error', '● ' + p)); else ul.appendChild(el('li', 'ok', t('La estructura es válida.', 'The structure is valid.')));
        caja2.appendChild(ul);
    }

    // ---------- capa bajo (S10c-2) ----------
    const bajo = montarBajo({
        el, t, ingles: () => ctx.idioma === 'en', rotular, cuerpo: $('ri-bajo'),
        cancion: () => (cancion && cancionActual() ? { clave: cancion, datos: cancionActual() } : null),
        seccion: () => secEd,
        editar: f => editarCancion(f),
        armar: d => armar(cancion, cancionActual(), d, datos().reglas, datos().ajustes),
        colores, escuchar: mu.escuchar
    });

    // ---------- vida de la pestaña ----------
    function alCambiarDatos() {
        recalcular(); llenarSelectores();
        if (revisado) { const c = musica.canciones[cancion]; avisos = c ? revisar(cancion, c, datos().reglas, datos().ajustes) : []; pintarAvisos(); }
        dibujar(); pintarNota(); pintarEstructura(); bajo.pintar(); estadoGuardar();
    }
    const todo = () => { elegida = null; alCambiarDatos(); };
    function estadoGuardar() {
        btnGuardar.disabled = !(sa.sucio() || mu.sucio()) || !ctx.servidor.escritura;
        $('ri-deshacer').disabled = !mu.puedeDeshacer();
        const n = contarAjustes(datos().ajustes, cancion);
        $('ri-resumen').textContent = vista ? t(`${vista.notas.length} notas · ${vista.duracion.toFixed(1)} s · ${n} ajustes a mano en esta canción`, `${vista.notas.length} notes · ${vista.duracion.toFixed(1)} s · ${n} hand tweaks in this song`) : '';
    }

    selCancion.addEventListener('change', () => { cancion = selCancion.value; secEd = 0; avisos = []; revisado = false; pintarAvisos(); todo(); });
    selDif.addEventListener('change', () => { dificultad = selDif.value; todo(); });
    zoom.addEventListener('input', () => dibujar());
    $('ri-revisar').addEventListener('click', revisarAhora);
    $('ri-probar').addEventListener('click', async () => {
        if (!cancion || !vista) return;
        try {
            ctx.puente.enviarDatos('salonas', datos());
            await ctx.puente.enviar('salonas', { accion: 'probar', cancion, dificultad, seccion: Number(selSec.value) || 0 });
            rotular('Listo: el juego toca esa sección en Práctica, con tus ajustes a mano. Haz clic en el juego y usa las teclas de carril.', 'Done: the game plays that section in Practice with your hand tweaks. Click the game and use the lane keys.', 'ok');
        } catch (e) { rotular(e.message, e.message, 'error'); }
    });
    $('ri-parar').addEventListener('click', async () => {
        try { await ctx.puente.enviar('salonas', { accion: 'terminar' }); rotular('Salonas cerrado en el juego.', 'Salonas closed in the game.'); } catch (e) { rotular(e.message, e.message, 'error'); }
    });
    lienzo.addEventListener('click', e => {
        const r = lienzo.getBoundingClientRect(), k = lienzo.width / r.width;
        const n = notaEn((e.clientX - r.left) * k, (e.clientY - r.top) * k);
        elegida = n ? n.clave : null; dibujar(); pintarNota();
        if (n && vista.secciones[n.n]) selSec.value = String(n.n); // «Probar» parte desde la sección de la nota
    });
    btnGuardar.addEventListener('click', async () => {
        rotular('Guardando…', 'Saving…');
        const dicen = [];
        if (mu.sucio()) { await mu.guardar(); dicen.push([mu.mensaje(), mu.sucio()]); }
        if (sa.sucio()) { await sa.guardar(); dicen.push([sa.mensaje(), sa.sucio()]); }
        const falla = dicen.find(d => d[1]);
        msg.textContent = (falla || dicen[0] || [''])[0]; msg.className = 'mensaje' + (falla ? ' error' : ' ok'); estadoGuardar();
    });
    $('ri-descartar').addEventListener('click', () => { if (mu.sucio()) mu.descartar(); if (sa.sucio()) sa.descartar(); });
    $('ri-deshacer').addEventListener('click', () => mu.deshacer());
    sa.alRehacer.push(() => { elegida = null; alCambiarDatos(); });
    mu.alRehacer.push(() => { elegida = null; alCambiarDatos(); });
    window.addEventListener('keydown', e => {
        if (ctx.pestana !== 'ritmo' || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
        const n = notaElegida();
        if (e.key >= '1' && e.key <= '9' && n && Number(e.key) <= vista.carriles) { e.preventDefault(); poner(n, Number(e.key) - 1); }
        else if (n && (e.key === 'Delete' || e.key === 'x')) { e.preventDefault(); poner(n, n.quitada ? undefined : null); }
        else if (n && e.key === 'Backspace') { e.preventDefault(); poner(n, undefined); }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) btnGuardar.click(); }
    });
    ctx.alIdioma.push(() => { llenarSelectores(); pintarAvisos(); dibujar(); pintarNota(); estadoGuardar(); });
    ctx.alPestana.push(clave => { if (clave === 'ritmo') alCambiarDatos(); });
    pintarAvisos();
    todo();
}
