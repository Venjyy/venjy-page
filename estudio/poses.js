// =========================================================
// VENJY · Estudio · editor de poses y gestos (fase 6, PR 6b)
// Edita mundo/datos/poses.json. Comparte pantalla con el juego (pestaña Poses = el iframe de la pestaña Juego más este
// panel y la zona de abajo): lista de poses y gestos (los del JSON y los del código que el JSON no reemplaza, que solo
// se miran), un slider por canal con los rangos de rig.md, la curva del canal elegido con claves que se arrastran, sus
// osciladores y las variantes sentado y jugador. La vista propia (frente, 3/4 y lado, como posar.html) no espera al
// juego y mide la punta de las manos. En el juego, cada cambio va en vivo (`datos` → poses) y, si se pide, una persona
// posa el instante t (mensaje `pose`). Guardar escribe con If-Match. Toda edición pasa por estudio/poses-modelo.mjs
// (puro, lo prueba Node). Contrato: estudio/DISENO.md §16-17.
// =========================================================
import { formatear } from './formato.mjs';
import * as M from './poses-modelo.mjs';
import { reglasPoses } from '../mundo/datos/gestos.js';

const PERSONAS = [['andy', 'Andy'], ['hadad', 'Hadad'], ['nacho', 'Nacho'], ['moises', 'Moisés'], ['lalo', 'Lalo'], ['boris', 'Boris'],
    ['lucho', 'Lucho'], ['braulio', 'Braulio'], ['conejeros', 'Conejeros']];
const clonar = o => JSON.parse(JSON.stringify(o));
const f2 = v => (Math.round(v * 100) / 100).toFixed(2);

export async function montarPoses(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const msg = $('po-mensaje'), btnGuardar = $('po-guardar');

    const r = await fetch('../mundo/datos/poses.json', { cache: 'no-cache' });
    let etag = r.headers.get('ETag');
    let original = JSON.parse(await r.text());
    let datos = clonar(original);
    const historial = [];
    // Elegido: { tipo: 'pose' | 'gesto' | 'codigo', clave }; caso de la vista: '' | 'sentado' | 'jugador'
    let elegido = null, caso = '', canal = null, iClave = -1;
    let tiempo = 0, T = 3, jugando = false;
    let codigo = new Map(), funciones = {}, moldes = new Set(); // GESTOS y GESTOS_AMISTAD (se importan al abrir la pestaña)
    let vista = null; // la escena de Three.js, también al abrir la pestaña

    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    function rotular(es, en, clase = '') { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); }
    const ruta = () => (elegido && elegido.tipo !== 'codigo' ? { tipo: elegido.tipo, clave: elegido.clave, variante: elegido.tipo === 'gesto' ? caso || null : null } : null);
    const def = () => (elegido && elegido.tipo !== 'codigo' ? M.defDe(datos, ruta()) : null);
    const info = () => ({ s: caso === 'sentado', j: caso === 'jugador' });

    // ---------- El instante: canales de lo elegido en t ----------
    function canalesAhora() {
        if (!elegido) return { ...M.NEUTRAL };
        if (elegido.tipo !== 'codigo') return M.instante(datos, ruta(), tiempo, T, info());
        const f = funciones[elegido.clave];
        const o = { ...M.NEUTRAL };
        try {
            const u = Math.min(1, tiempo / T);
            Object.assign(o, elegido.firma === 'amistad' ? f(u, tiempo, { ...info(), d: T }) : f(u, tiempo, caso === 'sentado', caso === 'jugador'));
        } catch (e) { /* un gesto del código que pide más contexto: se ve neutral */ }
        for (const k of Object.keys(o)) if (!M.NOMBRES_CANAL.includes(k) || !Number.isFinite(o[k])) delete o[k];
        return { ...M.NEUTRAL, ...o };
    }

    // ---------- Pintar ----------
    function pintarLista() {
        const ul = $('po-lista');
        ul.textContent = '';
        const cambiadas = new Set(M.cambios(original, datos));
        for (const e of M.entradas(datos, codigo)) {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.clave = e.clave; b.dataset.tipo = e.tipo;
            const tipo = e.tipo === 'pose' ? t('pose', 'pose') : e.tipo === 'gesto' ? t('gesto', 'gesture') : t('en código', 'in code');
            const marca = cambiadas.has(`${e.tipo === 'pose' ? 'poses' : 'gestos'}.${e.clave}`) ? ' •' : '';
            b.textContent = `${e.clave} · ${tipo}${e.reemplaza ? t(' (reemplaza al código)', ' (replaces code)') : ''}${marca}`;
            b.classList.toggle('codigo', e.tipo === 'codigo');
            b.classList.toggle('elegido', !!elegido && elegido.clave === e.clave && elegido.tipo === e.tipo);
            b.addEventListener('click', () => elegir({ tipo: e.tipo, clave: e.clave, firma: e.firma }));
            li.appendChild(b);
            ul.appendChild(li);
        }
    }
    function pintarElegido() {
        const g = elegido && elegido.tipo === 'gesto' ? def() : null;
        $('po-elegido').textContent = elegido ? `${elegido.clave} · ${elegido.tipo === 'pose' ? t('pose', 'pose') : elegido.tipo === 'gesto' ? t('gesto', 'gesture') : t('en código', 'in code')}` : t('Elige una pose', 'Pick a pose');
        $('po-codigo').hidden = !elegido || elegido.tipo !== 'codigo';
        $('po-codigo').textContent = t('Gesto del código (puede tener condiciones o composiciones que el esquema no expresa): se mira, no se edita. «Pose nueva» copia este instante al JSON.',
            'Gesture from the code (it may have conditions or compositions the schema cannot express): view only. «New pose» copies this moment to the JSON.');
        $('po-gesto-campos').hidden = !g;
        if (g) { $('po-reloj').value = g.reloj || 't'; $('po-ciclo').value = g.ciclo || ''; }
        const d = def();
        $('po-campo-nota').hidden = !d;
        if (d && document.activeElement !== $('po-nota')) $('po-nota').value = d.nota || '';
        $('po-borrar').disabled = !d;
        for (const b of document.querySelectorAll('[data-po-caso]')) {
            b.classList.toggle('activo', b.dataset.poCaso === caso);
            b.classList.toggle('secundario', b.dataset.poCaso !== caso);
        }
    }
    // Una fila por canal: nombre, slider, número y botones (+k, +osc, ×). En una pose, solo el slider y ×.
    function pintarCanales() {
        const caja = $('po-canales');
        caja.textContent = '';
        const rt = ruta(), ahora = canalesAhora();
        const editable = !!rt;
        const x = M.xActual(def(), tiempo, T);
        for (const [c, , , es, en] of M.CANALES) {
            const v = editable ? M.canalDe(datos, rt, c) : undefined;
            const tipo = editable ? M.tipoCanal(v) : 'codigo';
            const fila = document.createElement('div');
            fila.className = 'po-canal' + (c === canal ? ' elegido' : '') + (editable && tipo === 'ninguno' ? ' ausente' : '');
            fila.dataset.canal = c;
            const nombre = document.createElement('b');
            nombre.textContent = c;
            const [a, b] = M.rangoDe(c, v);
            const valor = !editable ? ahora[c] : tipo === 'claves' ? M.valorClaves(v, x) : tipo === 'ninguno' ? ahora[c] : M.valorSlider(v);
            const sl = document.createElement('input');
            sl.type = 'range'; sl.min = a; sl.max = b; sl.step = 0.01; sl.value = valor; sl.disabled = !editable;
            sl.setAttribute('aria-label', c);
            const num = document.createElement('input');
            num.type = 'number'; num.step = 0.01; num.value = f2(valor); num.disabled = !editable;
            num.setAttribute('aria-label', c);
            const botones = document.createElement('span');
            const boton = (texto, titulo, f) => {
                const bt = document.createElement('button');
                bt.type = 'button'; bt.textContent = texto; bt.title = titulo;
                bt.addEventListener('click', e => { e.stopPropagation(); f(); });
                botones.appendChild(bt);
            };
            if (editable && rt.tipo === 'gesto') {
                boton('+k', t('Clave en t', 'Key at t'), () => hacer(M.agregarClave(datos, rt, c, x, M.instante(datos, rt, tiempo, T, info())[c]), c));
                boton('+osc', t('Oscilador', 'Oscillator'), () => hacer(M.agregarOsc(datos, rt, c), c));
            }
            if (editable && tipo !== 'ninguno') boton('×', t('Quitar el canal', 'Remove the channel'), () => hacer(M.quitarCanal(datos, rt, c), c));
            const al = valorNuevo => {
                if (!Number.isFinite(valorNuevo)) return;
                if (tipo === 'claves') hacer(M.agregarClave(datos, rt, c, x, valorNuevo), c, true);
                else hacer(M.ponerValor(datos, rt, c, valorNuevo), c, true);
            };
            sl.addEventListener('input', () => { num.value = f2(sl.valueAsNumber); al(sl.valueAsNumber); });
            sl.addEventListener('change', () => { arrastreFin(); });
            num.addEventListener('change', () => { al(num.valueAsNumber); arrastreFin(); });
            const nota = document.createElement('small');
            const etiqueta = { ninguno: t('neutral', 'neutral'), fijo: t('fijo', 'fixed'), base: t('base', 'base'), claves: t('claves', 'keys'), codigo: t('código', 'code') }[tipo];
            const osc = v && typeof v === 'object' && v.osc ? ` + ${v.osc.length} osc` : '';
            nota.textContent = `${etiqueta}${osc} · ${ctx.idioma === 'en' ? en : es}`;
            fila.append(nombre, sl, num, botones, nota);
            fila.addEventListener('click', e => { if (e.target === fila || e.target === nombre || e.target === nota) { canal = c; iClave = -1; pintarCanalesMarca(); pintarCurva(); } });
            sl.addEventListener('pointerdown', () => { if (canal !== c) { canal = c; iClave = -1; pintarCanalesMarca(); pintarCurva(); } });
            caja.appendChild(fila);
        }
    }
    function pintarCanalesMarca() { for (const f of document.querySelectorAll('.po-canal')) f.classList.toggle('elegido', f.dataset.canal === canal); }
    // Durante un arrastre de slider no se rearma la tabla (perdería el foco): solo se actualizan los números
    function refrescarValores() {
        const rt = ruta(), ahora = canalesAhora(), x = M.xActual(def(), tiempo, T);
        for (const f of document.querySelectorAll('.po-canal')) {
            const c = f.dataset.canal, [sl, num] = f.querySelectorAll('input');
            if (document.activeElement === sl || document.activeElement === num) continue;
            const v = rt ? M.canalDe(datos, rt, c) : undefined, tipo = rt ? M.tipoCanal(v) : 'codigo';
            const valor = !rt || tipo === 'ninguno' ? ahora[c] : tipo === 'claves' ? M.valorClaves(v, x) : M.valorSlider(v);
            sl.value = valor; num.value = f2(valor);
        }
    }
    function pintarResumen() {
        const n = M.cambios(original, datos).length;
        const avisos = reglasPoses(datos, { codigo: new Set(codigo.keys()), moldes });
        const errores = avisos.filter(a => a.tipo === 'error').length;
        btnGuardar.disabled = !ctx.servidor.escritura || !sucio() || errores > 0;
        $('po-deshacer').disabled = !historial.length;
        $('po-descartar').disabled = !sucio();
        $('po-resumen').textContent = n ? t(`${n} pose(s) o gesto(s) con cambios sin guardar.`, `${n} pose(s) or gesture(s) with unsaved changes.`) : t('Sin cambios.', 'No changes.');
        const ul = $('po-avisos');
        ul.textContent = '';
        for (const a of avisos) { const li = document.createElement('li'); li.className = a.tipo; li.textContent = a.texto; ul.appendChild(li); }
    }
    function pintar() {
        pintarLista(); pintarElegido(); pintarCanales(); pintarCurva(); pintarResumen(); dibujar();
    }

    // ---------- Cambios ----------
    let enArrastre = false;
    // r = { datos, i, cambio } del modelo. continuo: viene de un arrastre (una sola entrada de historial por arrastre)
    function hacer(res, c, continuo = false) {
        if (!res.cambio) return;
        if (!continuo || !enArrastre) historial.push(JSON.stringify(datos));
        if (historial.length > 80) historial.shift();
        if (continuo) enArrastre = true;
        datos = res.datos;
        if (c) canal = c;
        if (res.i >= 0) iClave = res.i;
        if (continuo) { refrescarValores(); pintarCurva(); pintarResumen(); dibujar(); } else pintar();
        alJuego();
    }
    function arrastreFin() { if (enArrastre) { enArrastre = false; pintar(); } }
    function reemplazar(nuevo) {
        datos = nuevo;
        if (elegido && elegido.tipo !== 'codigo' && !def()) elegido = null;
        pintar(); alJuego();
    }

    // ---------- La curva del canal elegido ----------
    const lienzo = $('po-curva');
    const MARGEN = 30;
    let escala = null; // { x0, x1, a, b } de la última pintada
    const aPx = (x, v) => [MARGEN + (x - escala.x0) / (escala.x1 - escala.x0 || 1) * (lienzo.width - 2 * MARGEN), lienzo.height - 14 - (v - escala.a) / (escala.b - escala.a || 1) * (lienzo.height - 28)];
    const dePx = (px, py) => [escala.x0 + (px - MARGEN) / (lienzo.width - 2 * MARGEN) * (escala.x1 - escala.x0), escala.a + (lienzo.height - 14 - py) / (lienzo.height - 28) * (escala.b - escala.a)];
    function pintarCurva() {
        const zona = $('po-curva-zona');
        const rt = ruta();
        zona.hidden = !canal || !rt || rt.tipo !== 'gesto';
        if (zona.hidden) return;
        const d = def(), v = M.canalDe(datos, rt, canal);
        const [x0, x1] = M.rangoReloj(d, T), [a, b] = M.rangoDe(canal, v);
        escala = { x0, x1, a, b };
        $('po-curva-titulo').textContent = `${elegido.clave}${caso ? ' · ' + caso : ''} · ${canal}`;
        $('po-campo-interp').hidden = !(v && v.k);
        if (v && v.k) $('po-interp').value = v.interp || 'suave';
        const g = lienzo.getContext('2d');
        g.fillStyle = '#1d1610'; g.fillRect(0, 0, lienzo.width, lienzo.height);
        g.font = '12px PixelCraft, monospace'; g.fillStyle = '#aaaaaa'; g.strokeStyle = '#3a2a1c'; g.lineWidth = 1;
        // rejilla: el 0 y el reloj cada décimo
        for (let i = 0; i <= 10; i++) { const [px] = aPx(x0 + (x1 - x0) * i / 10, a); g.beginPath(); g.moveTo(px, 6); g.lineTo(px, lienzo.height - 14); g.stroke(); }
        if (a < 0 && b > 0) { const [, py] = aPx(x0, 0); g.strokeStyle = '#6f6f6f'; g.beginPath(); g.moveTo(MARGEN, py); g.lineTo(lienzo.width - MARGEN, py); g.stroke(); }
        g.fillText(f2(b), 2, 14); g.fillText(f2(a), 2, lienzo.height - 16);
        g.fillText(`${f2(x0)}`, MARGEN, lienzo.height - 2); g.fillText(`${f2(x1)} ${d.reloj === 'u' ? 'u' : 's'}`, lienzo.width - MARGEN - 40, lienzo.height - 2);
        // curva completa (con osciladores)
        g.strokeStyle = '#7fdc5a'; g.lineWidth = 2; g.beginPath();
        M.muestras(datos, rt, canal, 240, T).forEach(([x, y], i) => { const [px, py] = aPx(x, y); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
        g.stroke();
        // claves
        for (const [i, [kx, ky]] of ((v && v.k) || []).entries()) {
            const [px, py] = aPx(kx, ky);
            g.fillStyle = i === iClave ? '#ffff55' : '#ffffff'; g.fillRect(px - 5, py - 5, 10, 10);
            g.strokeStyle = '#000'; g.strokeRect(px - 5, py - 5, 10, 10);
        }
        // cabezal
        const [cx] = aPx(M.xActual(d, tiempo, T), a);
        g.strokeStyle = '#ffff55'; g.beginPath(); g.moveTo(cx, 4); g.lineTo(cx, lienzo.height - 14); g.stroke();
        pintarOsc(v);
    }
    function pintarOsc(v) {
        const ul = $('po-osc');
        ul.textContent = '';
        const rt = ruta();
        ((v && typeof v === 'object' && v.osc) || []).forEach((o, i) => {
            const li = document.createElement('li');
            const campo = (rotulo, el) => { const l = document.createElement('label'); l.className = 'campo'; const s = document.createElement('span'); s.textContent = rotulo; l.append(s, el); li.appendChild(l); return el; };
            const forma = document.createElement('select');
            for (const f of M.FORMAS) { const op = document.createElement('option'); op.value = f; op.textContent = f; forma.appendChild(op); }
            forma.value = o.forma;
            campo(t('Forma', 'Shape'), forma);
            const num = (rotulo, valor, paso) => { const n = document.createElement('input'); n.type = 'number'; n.step = paso; n.value = valor === undefined ? '' : valor; return campo(rotulo, n); };
            const amp = num('amp', o.amp, 0.01), frec = num('frec', o.frec, 0.1), fase = num(t('fase', 'phase'), o.fase || 0, 0.1);
            const e0 = num('env a', o.env ? o.env[0] : '', 0.05), e1 = num('env b', o.env ? o.env[1] : '', 0.05);
            const cambiar = () => {
                const env = Number.isFinite(e0.valueAsNumber) && Number.isFinite(e1.valueAsNumber) ? [e0.valueAsNumber, e1.valueAsNumber] : null;
                hacer(M.cambiarOsc(datos, rt, canal, i, { forma: forma.value, amp: amp.valueAsNumber, frec: frec.valueAsNumber, fase: Number.isFinite(fase.valueAsNumber) ? fase.valueAsNumber : 0, env }), canal);
            };
            for (const el of [forma, amp, frec, fase, e0, e1]) el.addEventListener('change', cambiar);
            const borrar = document.createElement('button');
            borrar.type = 'button'; borrar.className = 'boton chico secundario'; borrar.textContent = t('Quitar', 'Remove');
            borrar.addEventListener('click', () => hacer(M.borrarOsc(datos, rt, canal, i), canal));
            li.appendChild(borrar);
            ul.appendChild(li);
        });
    }
    let arrastre = null; // { i, base } mientras se arrastra una clave
    const punto = e => { const q = lienzo.getBoundingClientRect(); return [(e.clientX - q.left) * lienzo.width / q.width, (e.clientY - q.top) * lienzo.height / q.height]; };
    function claveBajo(px, py) {
        const v = M.canalDe(datos, ruta(), canal);
        if (!v || !v.k) return -1;
        return v.k.findIndex(([kx, ky]) => { const [qx, qy] = aPx(kx, ky); return Math.abs(qx - px) <= 7 && Math.abs(qy - py) <= 7; });
    }
    lienzo.addEventListener('pointerdown', e => {
        if (!escala) return;
        const [px, py] = punto(e);
        const i = claveBajo(px, py);
        lienzo.focus();
        if (i >= 0) {
            iClave = i;
            arrastre = { i, base: datos };
            historial.push(JSON.stringify(datos));
            lienzo.setPointerCapture(e.pointerId);
            pintarCurva();
        } else {
            // clic en el fondo: mueve t
            const [x] = dePx(px, py);
            ponerTiempo(M.tDeX(def(), Math.max(escala.x0, Math.min(escala.x1, x)), T));
        }
    });
    lienzo.addEventListener('pointermove', e => {
        if (!arrastre) return;
        const [x, v] = dePx(...punto(e));
        const res = M.moverClave(arrastre.base, ruta(), canal, arrastre.i, x, v);
        if (res.cambio) { datos = res.datos; refrescarValores(); pintarCurva(); dibujar(); alJuego(); }
    });
    const soltar = () => { if (!arrastre) return; if (datos === arrastre.base) historial.pop(); arrastre = null; pintar(); };
    lienzo.addEventListener('pointerup', soltar);
    lienzo.addEventListener('pointercancel', soltar);
    lienzo.addEventListener('dblclick', e => {
        if (!escala) return;
        const [px, py] = punto(e);
        if (claveBajo(px, py) >= 0) return;
        const [x, v] = dePx(px, py);
        hacer(M.agregarClave(datos, ruta(), canal, x, v), canal);
    });
    lienzo.addEventListener('keydown', e => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && iClave >= 0) { e.preventDefault(); hacer(M.borrarClave(datos, ruta(), canal, iClave), canal); }
    });
    $('po-interp').addEventListener('change', () => hacer(M.cambiarInterp(datos, ruta(), canal, $('po-interp').value), canal));
    $('po-osc-mas').addEventListener('click', () => hacer(M.agregarOsc(datos, ruta(), canal), canal));

    // ---------- La vista propia: frente, 3/4 y lado (como posar.html) ----------
    async function crearVista() {
        const [THREE, { crearModelo, BASES }] = await Promise.all([import('../vendor/three.module.js'), import('../mundo/supervivencia/skin.js')]);
        const c = $('po-vista');
        const render = new THREE.WebGLRenderer({ canvas: c, antialias: false, preserveDrawingBuffer: true });
        render.setClearColor(0x87b4e8);
        const base = BASES[0];
        const ancho = c.width / 3;
        const vistas = [0, Math.PI / 4, Math.PI / 2].map(giro => {
            const e = new THREE.Scene();
            const m = crearModelo(base);
            m.tinte.aplicar(new THREE.Color(1, 1, 1));
            e.add(m.g);
            e.add(new THREE.GridHelper(4, 4, 0x2c4a22, 0x2c4a22));
            // la punta de cada mano: una cajita roja colgada del brazo en (0, −0,75, 0)
            const puntas = [m.brazoD, m.brazoI].map(b => {
                const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xff3030, depthTest: false }));
                p.position.set(0, -0.75, 0); p.renderOrder = 9; b.add(p); return p;
            });
            const cam = new THREE.PerspectiveCamera(30, ancho / c.height, 0.1, 50);
            cam.position.set(Math.sin(giro) * 6.2, 1.3, Math.cos(giro) * 6.2);
            cam.lookAt(0, 1.0, Math.sin(giro) > 0.9 ? 0.3 : 0);
            return { e, m, cam, puntas };
        });
        return { THREE, render, vistas, ancho, alto: c.height };
    }
    function dibujar() {
        const v = canalesAhora();
        const mi = M.puntaMano(v, 'I'), md = M.puntaMano(v, 'D');
        $('po-medida').textContent = $('po-medir').checked
            ? t(`Mano D: adelante ${f2(md.adelante)}, alto ${f2(md.altura)}, lado ${f2(md.lado)} · Mano I: adelante ${f2(mi.adelante)}, alto ${f2(mi.altura)}, lado ${f2(mi.lado)} (bloques, desde los pies)`,
                `Right hand: forward ${f2(md.adelante)}, height ${f2(md.altura)}, side ${f2(md.lado)} · Left hand: forward ${f2(mi.adelante)}, height ${f2(mi.altura)}, side ${f2(mi.lado)} (blocks, from the feet)`)
            : '';
        if (!vista) return;
        const { render, vistas, ancho, alto } = vista;
        render.setScissorTest(true);
        vistas.forEach(({ e, m, cam, puntas }, i) => {
            m.cuello.rotation.set(v.cx, v.cy, v.cz);
            m.brazoD.rotation.x = v.bDx; m.brazoD.rotation.z = v.bDz; m.brazoI.rotation.x = v.bIx; m.brazoI.rotation.z = v.bIz;
            m.piernaD.rotation.x = v.pDx; m.piernaI.rotation.x = v.pIx;
            m.cuerpo.rotation.x = v.inc; m.cuerpo.rotation.z = v.rz;
            m.cuerpo.position.y = v.y + (caso === 'sentado' ? 0 : v.salto); m.cuerpo.position.z = v.pz;
            for (const p of puntas) p.visible = $('po-medir').checked;
            render.setViewport(i * ancho, 0, ancho, alto); render.setScissor(i * ancho, 0, ancho, alto);
            render.render(e, cam);
        });
    }
    // Para la prueba de navegador: la punta de la mano según Three.js (debe dar lo mismo que M.puntaMano)
    function medirVista(lado = 'D') {
        if (!vista) return null;
        const { THREE, vistas } = vista;
        const { m } = vistas[0];
        m.g.updateMatrixWorld(true);
        const w = m.g.worldToLocal((lado === 'I' ? m.brazoI : m.brazoD).localToWorld(new THREE.Vector3(0, -0.75, 0)));
        const r3 = x => Math.round(x * 1000) / 1000;
        return { adelante: r3(w.z), altura: r3(w.y), lado: r3(w.x) };
    }

    // ---------- Tiempo y reproducción ----------
    function ponerTiempo(nuevo) {
        tiempo = Math.max(0, Math.min(T, nuevo));
        $('po-t').value = tiempo;
        $('po-tiempo').textContent = `t ${f2(tiempo)} / ${f2(T)} s`;
        refrescarValores(); pintarCurva(); dibujar(); posarEnJuego();
    }
    let ultimo = 0;
    function cuadro(ahora) {
        if (!jugando) return;
        const dt = ultimo ? (ahora - ultimo) / 1000 : 0;
        ultimo = ahora;
        ponerTiempo(tiempo + dt >= T ? 0 : tiempo + dt);
        requestAnimationFrame(cuadro);
    }
    function jugar(v) {
        jugando = v;
        $('po-jugar').textContent = jugando ? t('Pausa', 'Pause') : t('Reproducir', 'Play');
        if (jugando) { ultimo = 0; requestAnimationFrame(cuadro); }
    }

    // ---------- El juego ----------
    let envio = 0, ultimoPose = 0, posada = null;
    function alJuego() {
        clearTimeout(envio);
        envio = setTimeout(() => ctx.puente.enviarDatos('poses', datos), 120);
        posarEnJuego();
    }
    async function posarEnJuego(forzar = false) {
        if (!$('po-en-juego').checked || !ctx.puente.estado.listo) return;
        const ahora = performance.now();
        if (!forzar && ahora - ultimoPose < 66) return; // ~15 por segundo
        ultimoPose = ahora;
        const persona = $('po-persona').value;
        try {
            if (posada && posada !== persona) await soltarEnJuego();
            const r = await ctx.puente.enviar('pose', { clave: persona, canales: canalesAhora() });
            posada = persona;
            const md = r.pose && r.pose.manoD;
            if (md) $('po-juego-medida').textContent = t(`En el juego, mano D: adelante ${f2(md.adelante)}, alto ${f2(md.altura)}.`, `In the game, right hand: forward ${f2(md.adelante)}, height ${f2(md.altura)}.`);
            $('po-juego-medida').className = 'mensaje ok';
        } catch (e) {
            $('po-juego-medida').textContent = e.message; $('po-juego-medida').className = 'mensaje error';
        }
    }
    async function soltarEnJuego() {
        if (!posada) return;
        const p = posada;
        posada = null;
        try { await ctx.puente.enviar('pose', { clave: p, canales: null }); } catch (e) { /* sin juego: nada que soltar */ }
    }

    // ---------- Guardar ----------
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/poses', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' },
                body: JSON.stringify(datos)
            });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) {
                original = clonar(datos);
                etag = j.etag;
                historial.length = 0;
                rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok');
            } else if (resp.status === 412) {
                rotular('El archivo cambió en disco: recarga y vuelve a editar.', 'The file changed on disk: reload and edit again.', 'error');
            } else if (resp.status === 422 && j.errores) {
                const e = j.errores.slice(0, 3).join(' · ');
                rotular('No se guardó: ' + e, 'Not saved: ' + e, 'error');
            } else {
                rotular(`No se guardó (${resp.status}): ${j.error || ''}`, `Not saved (${resp.status}): ${j.error || ''}`, 'error');
            }
        } catch (e) {
            rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error');
        }
        pintar();
    }
    function descargar() {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([formatear(datos)], { type: 'application/json' }));
        a.download = 'poses.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }

    // ---------- Elegir, crear, borrar ----------
    function elegir(e) {
        elegido = e;
        iClave = -1;
        if (e.tipo !== 'gesto') caso = e.tipo === 'pose' ? '' : caso;
        pintar();
        posarEnJuego(true);
    }
    const ocupados = () => new Set([...codigo.keys(), ...moldes]);
    $('po-nueva-pose').addEventListener('click', () => {
        const clave = M.claveLibre(datos, elegido ? elegido.clave + 'Pose' : 'pose', ocupados());
        const res = M.nuevaPose(datos, clave, canalesAhora());
        hacer(res);
        if (res.cambio) elegir({ tipo: 'pose', clave });
    });
    $('po-nuevo-gesto').addEventListener('click', () => {
        const clave = M.claveLibre(datos, 'gesto', ocupados());
        const res = M.nuevoGesto(datos, clave, canalesAhora());
        hacer(res);
        if (res.cambio) elegir({ tipo: 'gesto', clave });
    });
    $('po-borrar').addEventListener('click', () => {
        if (!def()) return;
        const res = M.borrarEntrada(datos, elegido.tipo, elegido.clave);
        elegido = null; canal = null;
        hacer(res);
    });
    $('po-reloj').addEventListener('change', () => hacer(M.cambiarReloj(datos, elegido.clave, $('po-reloj').value)));
    $('po-ciclo').addEventListener('change', () => hacer(M.cambiarCiclo(datos, elegido.clave, $('po-ciclo').valueAsNumber)));
    $('po-nota').addEventListener('change', () => hacer(M.cambiarNota(datos, ruta(), $('po-nota').value)));
    for (const b of document.querySelectorAll('[data-po-caso]')) b.addEventListener('click', () => { caso = b.dataset.poCaso; pintar(); posarEnJuego(true); });
    $('po-t').addEventListener('input', () => ponerTiempo($('po-t').valueAsNumber));
    $('po-T').addEventListener('change', () => {
        if (Number.isFinite($('po-T').valueAsNumber) && $('po-T').valueAsNumber >= 0.2) T = $('po-T').valueAsNumber;
        $('po-T').value = T; $('po-t').max = T;
        ponerTiempo(tiempo); pintarCurva();
    });
    $('po-jugar').addEventListener('click', () => jugar(!jugando));
    $('po-medir').addEventListener('change', dibujar);
    $('po-en-juego').addEventListener('change', () => { if ($('po-en-juego').checked) posarEnJuego(true); else soltarEnJuego(); });
    $('po-persona').addEventListener('change', () => posarEnJuego(true));
    $('po-ir').addEventListener('click', async () => {
        try { await ctx.puente.tp($('po-persona').value); rotular('Junto a la persona.', 'Next to the person.', 'ok'); } catch (e) { rotular(e.message, e.message, 'error'); }
    });
    $('po-deshacer').addEventListener('click', () => { if (historial.length) reemplazar(JSON.parse(historial.pop())); });
    $('po-descartar').addEventListener('click', () => { historial.push(JSON.stringify(datos)); reemplazar(clonar(original)); });
    btnGuardar.addEventListener('click', guardar);
    $('po-descargar').addEventListener('click', descargar);
    for (const [k, n] of PERSONAS) { const o = document.createElement('option'); o.value = k; o.textContent = n; $('po-persona').appendChild(o); }

    // ---------- Abrir la pestaña ----------
    // Los gestos del código y Three.js se importan la primera vez (solo el Estudio: el sitio no baja nada de esto)
    let cargado = null;
    function cargar() {
        cargado = cargado || (async () => {
            try {
                const [{ GESTOS }, { GESTOS_AMISTAD }, { MOLDES }] = await Promise.all([
                    import('../mundo/supervivencia/escenas-skin.js'),
                    import('../mundo/supervivencia/escena-amistad-datos.js'),
                    import('../mundo/supervivencia/moldes.js')
                ]);
                codigo = new Map();
                for (const k of Object.keys(GESTOS)) { codigo.set(k, 'skin'); funciones[k] = GESTOS[k]; }
                for (const k of Object.keys(GESTOS_AMISTAD)) if (!codigo.has(k)) { codigo.set(k, 'amistad'); funciones[k] = GESTOS_AMISTAD[k]; }
                moldes = new Set(Object.keys(MOLDES));
            } catch (e) { console.warn('[estudio] no se pudieron importar los gestos del juego', e); }
            try { vista = await crearVista(); } catch (e) { console.warn('[estudio] sin vista 3D', e); }
            if (!elegido) { const p = M.entradas(datos, codigo)[0]; if (p) elegido = { tipo: p.tipo, clave: p.clave, firma: p.firma }; }
            pintar();
            ponerTiempo(tiempo);
        })();
        return cargado;
    }
    // Mientras la pestaña está abierta el juego no puede quedarse con el mouse (se comería los clics del editor): el mismo
    // `puntero` libre que usa Escenas
    async function punteroLibre(v) {
        if (!ctx.puente.estado.listo) return;
        try { await ctx.puente.enviar('escena', { accion: 'puntero', v }); } catch (e) { /* sin juego: nada que soltar */ }
    }
    ctx.alPestana.push(clave => {
        if (clave === 'poses') { punteroLibre(true); cargar(); posarEnJuego(true); }
        else { jugar(false); soltarEnJuego(); punteroLibre(false); }
    });
    ctx.puente.alMensaje(m => { if (m.tipo === 'listo' && ctx.pestana === 'poses') { punteroLibre(true); posarEnJuego(true); } });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('keydown', e => {
        if (ctx.pestana !== 'poses') return;
        const k = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && k === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
        else if ((e.ctrlKey || e.metaKey) && k === 'z' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { e.preventDefault(); if (historial.length) reemplazar(JSON.parse(historial.pop())); }
    });
    ctx.alIdioma.push(() => pintar());
    // Para las pruebas de navegador
    window.__estudioPoses = { datos: () => datos, elegir, medirVista, canalesAhora, ponerTiempo, cargar };
    pintarResumen();
}
