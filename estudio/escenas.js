// =========================================================
// VENJY · Estudio · editor de escenas (fase 5, PR 5b)
// Edita mundo/datos/escenas.json con una línea de tiempo: una fila por actor con bloques de gesto que se arrastran y
// estiran, una fila de frases y filas de marcas (golpes y corazones). Comparte pantalla con el juego (pestaña
// Escenas = el iframe de la pestaña Juego más este panel): Reproducir, Pausa, Parar y el clic en la regla hablan con
// el juego por el puente (mensajes `escena`; el juego devuelve `escenaT` con el instante). Las cuentas de mover,
// estirar, encajar y los topes viven en estudio/escenas-modelo.mjs (puro, lo prueba Node); las reglas que el esquema
// no expresa, en mundo/datos/escenas.js (`reglasEscenas`, las mismas de `cli.mjs validar`). Contrato: DISENO.md §13.
// =========================================================
import { formatear } from './formato.mjs';
import * as M from './escenas-modelo.mjs';
import { reglasEscenas } from '../mundo/datos/escenas.js';
import { ANIMACIONES, FRASES_AMISTAD, GESTOS_AMISTAD } from '../mundo/supervivencia/escena-amistad-datos.js';

const NOMBRES = {
    venjy: 'Venjy', pony: 'Pony', boris: 'Boris', moises: 'Moisés', lalo: 'Lalo', salonas: 'Salonas', lona: 'Lona', hadad: 'Hadad',
    andy: 'Andy', nacho: 'Nacho', braulio: 'Braulio', lucho: 'Lucho', conejeros: 'Conejeros'
};
const nombreDe = c => NOMBRES[c] || c;
const clonar = o => JSON.parse(JSON.stringify(o));
const ETIQUETA = 130; // ancho de la columna de rótulos (px)
const ALTO_FILA = 34;
const dormir = ms => new Promise(r => setTimeout(r, ms));
// Copia de durLinea de reencuentros.js, solo para cuando el motor del juego no se puede importar (el editor sigue sirviendo)
const durLineaCopia = txt => Math.round(Math.max(2.3, Math.min(3.6, 1.4 + txt.es.length * 0.03)) * 10) / 10;

const ICONOS = {
    golpes: { color: '#ffff55', filas: ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'] },
    corazones: { color: '#ff5555', filas: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'] }
};
function dibujarIcono(canvas, tipo) {
    const { color, filas } = ICONOS[tipo];
    const k = 2;
    canvas.width = 7 * k + 2; canvas.height = 7 * k + 2;
    const c = canvas.getContext('2d');
    // contorno negro de un píxel alrededor y relleno de color
    for (let y = 0; y < filas.length; y++) for (let x = 0; x < 7; x++) {
        if (filas[y][x] !== '#') continue;
        c.fillStyle = '#000';
        c.fillRect(x * k, y * k, k + 2, k + 2);
    }
    c.fillStyle = color;
    for (let y = 0; y < filas.length; y++) for (let x = 0; x < 7; x++) if (filas[y][x] === '#') c.fillRect(x * k + 1, y * k + 1, k, k);
}

export async function montarEscenas(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const msg = $('es-mensaje'), btnGuardar = $('es-guardar'), linea = $('es-linea');
    const puente = ctx.puente;

    const r = await fetch('../mundo/datos/escenas.json', { cache: 'no-cache' });
    let etag = r.headers.get('ETag');
    let original = JSON.parse(await r.text());
    let datos = clonar(original);
    datos.escenas = datos.escenas || {};
    const historial = M.crearHistorial();

    let actual = Object.keys(datos.escenas)[0] || Object.keys(ANIMACIONES)[0] || null;
    let sel = null;           // { k: 'tramo', q, i } | { k: 'frase', i } | { k: 'golpes' | 'corazones', i }
    let zoom = 1;
    let motor = null;         // { gestos: Set | null, durLinea }; se carga al abrir la pestaña
    let activa = false, pausada = false, tCab = 0;
    let arrastre = null;
    let alElegirGesto = null;

    const durLinea = () => (motor && motor.durLinea) || durLineaCopia;
    const personas = Object.keys(FRASES_AMISTAD);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const enviarAlJuego = () => puente.enviarDatos('escenas', datos);
    const listoElJuego = () => puente.estado.listo;
    function rotular(es, en, clase = '') { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); }

    // Escena en edición: la del JSON, o la de ANIMACIONES («en código»); editarla la copia al JSON
    const enCodigo = clave => !datos.escenas[clave] && !!ANIMACIONES[clave];
    function defActual() {
        if (!actual) return null;
        if (datos.escenas[actual]) return datos.escenas[actual];
        return ANIMACIONES[actual] ? M.desdeCodigo(ANIMACIONES[actual]) : null;
    }
    const cambiada = clave => JSON.stringify(datos.escenas[clave]) !== JSON.stringify(original.escenas && original.escenas[clave]);

    // ---------- Gestos conocidos ----------
    // Los mismos nombres que `validar`: GESTOS, GESTOS_AMISTAD y MOLDES. Se importan al abrir la pestaña
    // (solo el Estudio, en localhost: el sitio no baja nada de esto).
    async function cargarMotor() {
        if (motor) return motor;
        const nombres = new Set(Object.keys(GESTOS_AMISTAD));
        let dur = null, completo = false;
        try {
            const [{ GESTOS }, { MOLDES }, re] = await Promise.all([
                import('../mundo/supervivencia/escenas-skin.js'),
                import('../mundo/supervivencia/moldes.js'),
                import('../mundo/supervivencia/reencuentros.js')
            ]);
            for (const k of [...Object.keys(GESTOS), ...Object.keys(MOLDES)]) nombres.add(k);
            dur = re.durLinea;
            completo = true;
        } catch (e) {
            console.warn('[estudio] no se pudieron importar los gestos del juego; no se validan los nombres', e);
        }
        motor = { gestos: completo ? nombres : null, durLinea: dur, nombres };
        return motor;
    }

    // ---------- Cambios ----------
    function ponerDef(def) { datos.escenas = { ...datos.escenas, [actual]: def }; }
    // Aplica un resultado del modelo: historial, datos, juego y pantalla
    function aplicar(res) {
        if (!res || !res.cambio) return false;
        historial.meter(datos);
        ponerDef(res.def);
        pintar();
        enviarAlJuego();
        return true;
    }

    // ---------- Pintar: lista de escenas ----------
    function pintarLista() {
        const ul = $('es-lista');
        ul.textContent = '';
        const claves = [...Object.keys(datos.escenas), ...Object.keys(ANIMACIONES).filter(k => !datos.escenas[k])];
        for (const k of claves) {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button';
            b.dataset.clave = k;
            const tipo = datos.escenas[k] ? datos.escenas[k].tipo : 'amistad';
            const donde = enCodigo(k) ? t('en código', 'in code') : t('JSON', 'JSON');
            b.textContent = `${k} · ${tipo === 'guion' ? t('guion', 'script') : t('amistad', 'friendship')} · ${donde}${cambiada(k) ? ' •' : ''}`;
            b.classList.toggle('elegido', k === actual);
            b.addEventListener('click', () => elegirEscena(k));
            li.appendChild(b);
            ul.appendChild(li);
        }
    }
    function elegirEscena(clave) {
        actual = clave;
        sel = null;
        activa = false; pausada = false; tCab = 0;
        pintar();
    }

    // ---------- Pintar: barra y línea de tiempo ----------
    function pintarBarra() {
        const d = defActual();
        for (const id of ['es-T', 'es-r', 'es-nivel']) $(id).disabled = !d;
        if (!d) return;
        $('es-T').value = d.T;
        $('es-r').value = d.r;
        $('es-campo-nivel').hidden = d.tipo !== 'amistad';
        if (d.tipo === 'amistad') $('es-nivel').value = String(d.nivel);
        const p = $('es-persona');
        if (d.tipo === 'amistad' && !p.value) p.value = 'andy';
        $('es-tiempo').textContent = `t ${tCab.toFixed(2)} / ${d.T} s`;
        $('es-pausa').textContent = pausada ? t('Seguir', 'Resume') : t('Pausa', 'Pause');
        const sinJuego = !listoElJuego();
        $('es-jugar').disabled = sinJuego;
        $('es-pausa').disabled = sinJuego || !activa;
        $('es-parar').disabled = sinJuego || !activa;
    }

    const pxPorS = d => Math.max(36, Math.min(220, ((linea.clientWidth || 800) - ETIQUETA - 24) / d.T)) * zoom;

    function etiquetaFila(q, d) {
        if (q === 'n') return t('Amigo (n)', 'Friend (n)');
        if (q === 'j') return t('Jugador (j)', 'Player (j)');
        const a = d.actores && d.actores[q];
        const clave = typeof a === 'string' ? a : a && a.clave;
        return clave ? `${q} · ${nombreDe(clave)}` : q;
    }
    // Texto de una frase: la propia (guion) o la de FRASES_AMISTAD de la persona elegida (amistad)
    function textoFrase(d, f) {
        if (d.tipo === 'guion') return f.texto ? f.texto[ctx.idioma] || f.texto.es : '';
        const per = $('es-persona').value;
        const x = per && FRASES_AMISTAD[per] && FRASES_AMISTAD[per][actual];
        return x ? x[ctx.idioma] || x.es : t('(la frase de cada persona)', "(each person's phrase)");
    }
    const esSel = (k, q, i) => sel && sel.k === k && sel.i === i && (q === undefined || sel.q === q);

    function pintarLinea() {
        linea.textContent = '';
        const d = defActual();
        if (!d) return;
        const px = pxPorS(d);
        const ancho = Math.ceil(d.T * px);
        const interior = document.createElement('div');
        interior.className = 'es-interior';
        interior.style.width = `${ETIQUETA + ancho + 20}px`;
        interior.dataset.px = String(px);

        function fila(clase, rotulo, alto, datosFila) {
            const f = document.createElement('div');
            f.className = 'es-fila ' + clase;
            const rt = document.createElement('div');
            rt.className = 'es-rotulo';
            rt.textContent = rotulo;
            const pista = document.createElement('div');
            pista.className = 'es-pista';
            pista.style.width = `${ancho}px`;
            pista.style.height = `${alto}px`;
            Object.assign(pista.dataset, datosFila || {});
            f.append(rt, pista);
            interior.appendChild(f);
            return pista;
        }

        // Regla: una marca cada 0,5 s y un número cada segundo
        const regla = fila('es-regla', t('Tiempo (s)', 'Time (s)'), 22, { fila: 'regla' });
        for (let s = 0; s <= d.T + 1e-6; s += 0.5) {
            const m = document.createElement('div');
            const entero = Math.abs(s - Math.round(s)) < 1e-6;
            m.className = 'es-marca-regla' + (entero ? ' entera' : '');
            m.style.left = `${s * px}px`;
            if (entero) m.dataset.t = String(Math.round(s));
            regla.appendChild(m);
        }

        // Una fila por actor: bloques de gesto
        for (const q of M.filasDe(d)) {
            const pista = fila('es-gestos', etiquetaFila(q, d), ALTO_FILA, { fila: 'tramos', q });
            M.tramosDe(d, q).forEach(([g, desde, hasta], i) => {
                const b = document.createElement('div');
                b.className = 'es-bloque gesto' + (esSel('tramo', q, i) ? ' elegido' : '') + (motor && motor.gestos && !motor.gestos.has(g) ? ' desconocido' : '');
                b.style.left = `${desde * px}px`;
                b.style.width = `${Math.max(6, (hasta - desde) * px)}px`;
                b.dataset.k = 'tramo'; b.dataset.q = q; b.dataset.i = String(i);
                b.title = `${g} · ${desde}–${hasta} s`;
                b.innerHTML = '<span class="asa izq"></span><span class="txt"></span><span class="asa der"></span>';
                b.querySelector('.txt').textContent = g;
                pista.appendChild(b);
            });
        }

        // Frases: en carriles para que las que se pisan se vean una debajo de la otra
        const frases = M.frasesDe(d, durLinea());
        const carriles = [];
        const sitio = new Map();
        [...frases].sort((a, b) => a.a - b.a).forEach(f => {
            let c = carriles.findIndex(fin => fin <= f.a + 1e-9);
            if (c < 0) { c = carriles.length; carriles.push(0); }
            carriles[c] = f.a + f.d;
            sitio.set(f.i, c);
        });
        const nCarriles = Math.max(1, carriles.length);
        const pf = fila('es-frases', t('Frases', 'Lines'), nCarriles * ALTO_FILA, { fila: 'frases' });
        const minimo = durLinea();
        for (const f of frases) {
            const b = document.createElement('div');
            const apurada = d.tipo === 'guion' && f.propia && f.texto && f.d < minimo(f.texto) - 1e-9;
            b.className = 'es-bloque frase' + (esSel('frase', undefined, f.i) ? ' elegido' : '') + (apurada ? ' apurada' : '') + (f.propia ? '' : ' implicita');
            b.style.left = `${f.a * px}px`;
            b.style.width = `${Math.max(8, f.d * px)}px`;
            b.style.top = `${sitio.get(f.i) * ALTO_FILA + 3}px`;
            b.dataset.k = 'frase'; b.dataset.i = String(f.i);
            b.title = `${f.q} · ${f.a}–${M.encajar(f.a + f.d)} s`;
            b.innerHTML = '<span class="asa izq"></span><span class="txt"></span><span class="asa der"></span>';
            b.querySelector('.txt').textContent = `${f.q === 'n' ? '' : f.q + ': '}${textoFrase(d, f)}`;
            pf.appendChild(b);
        }

        // Marcas: golpes (rombo amarillo) y corazones (corazón rojo), dibujados en canvas
        for (const [k, rotulo] of [['golpes', t('Golpes', 'Hits')], ['corazones', t('Corazones', 'Hearts')]]) {
            const pista = fila('es-marcas', rotulo, 28, { fila: k });
            (d[k] || []).forEach((s, i) => {
                const m = document.createElement('div');
                m.className = 'es-marca' + (esSel(k, undefined, i) ? ' elegida' : '');
                m.style.left = `${s * px - 9}px`;
                m.dataset.k = k; m.dataset.i = String(i);
                m.title = `${s} s`;
                const c = document.createElement('canvas');
                dibujarIcono(c, k);
                m.appendChild(c);
                pista.appendChild(m);
            });
        }

        const cab = document.createElement('div');
        cab.className = 'es-cabezal';
        cab.id = 'es-cabezal';
        interior.appendChild(cab);
        linea.appendChild(interior);
        ponerCabezal();
    }
    function ponerCabezal() {
        const cab = $('es-cabezal'), d = defActual();
        if (!cab || !d) return;
        const px = pxPorS(d);
        cab.style.left = `${ETIQUETA + tCab * px}px`;
        cab.classList.toggle('activo', activa);
        $('es-tiempo').textContent = `t ${tCab.toFixed(2)} / ${d.T} s`;
    }

    // ---------- Panel del elemento elegido ----------
    function pintarCampos() {
        const d = defActual();
        const cuerpo = $('es-campos'), titulo = $('es-elegido-titulo');
        const nota = $('es-frase-nota');
        cuerpo.hidden = !sel || !d;
        if (!sel || !d) { titulo.textContent = t('Elige un bloque', 'Pick a block'); return; }
        const mostrar = (id, v) => { $(id).hidden = !v; };
        let desde = 0, hasta = null;
        mostrar('es-campo-gesto', sel.k === 'tramo');
        mostrar('es-campo-quien', sel.k === 'frase' && d.tipo === 'guion');
        mostrar('es-campo-es', sel.k === 'frase' && d.tipo === 'guion');
        mostrar('es-campo-en', sel.k === 'frase' && d.tipo === 'guion');
        mostrar('es-campo-hasta', sel.k === 'tramo' || sel.k === 'frase');
        nota.textContent = '';
        if (sel.k === 'tramo') {
            const tr = M.tramosDe(d, sel.q)[sel.i];
            if (!tr) { sel = null; cuerpo.hidden = true; return; }
            titulo.textContent = `${t('Gesto', 'Gesture')} · ${etiquetaFila(sel.q, d)}`;
            $('es-gesto').textContent = tr[0];
            desde = tr[1]; hasta = tr[2];
        } else if (sel.k === 'frase') {
            const f = M.frasesDe(d, durLinea())[sel.i];
            if (!f) { sel = null; cuerpo.hidden = true; return; }
            titulo.textContent = t('Frase', 'Line');
            desde = f.a; hasta = M.encajar(f.a + f.d);
            if (d.tipo === 'guion') {
                const sq = $('es-quien');
                sq.textContent = '';
                for (const q of [...M.filasDe(d), 'todos']) {
                    const o = document.createElement('option');
                    o.value = q; o.textContent = q === 'todos' ? t('Todos (todos)', 'Everyone (todos)') : etiquetaFila(q, d);
                    sq.appendChild(o);
                }
                sq.value = f.q;
                const tx = d.lineas[sel.i].texto;
                $('es-texto-es').value = tx.es; $('es-texto-en').value = tx.en;
                const minimo = durLinea()(tx);
                nota.textContent = f.propia
                    ? t(`Dura ${f.d} s; para leerla se necesitan ${minimo} s.`, `Lasts ${f.d} s; reading it takes ${minimo} s.`)
                    : t(`Sin duración propia: el juego usa ${f.d} s (lo que se alcanza a leer). Al estirarla se fija.`, `No duration of its own: the game uses ${f.d} s (enough to read). Stretching fixes it.`);
            } else {
                nota.textContent = t('La frase de cada persona está en FRASES_AMISTAD (escena-amistad-datos.js): no se edita aquí.', "Each person's line is in FRASES_AMISTAD (escena-amistad-datos.js): not edited here.");
            }
        } else {
            const v = d[sel.k] && d[sel.k][sel.i];
            if (v === undefined) { sel = null; cuerpo.hidden = true; return; }
            titulo.textContent = sel.k === 'golpes' ? t('Golpe', 'Hit') : t('Corazón', 'Heart');
            desde = v;
        }
        $('es-desde').value = desde;
        if (hasta !== null) $('es-hasta').value = hasta;
        $('es-borrar').disabled = sel.k === 'frase' && (d.tipo !== 'guion' || (d.lineas || []).length <= 1);
    }

    // ---------- Avisos y resumen ----------
    function reglas(def, clave) {
        return reglasEscenas({ escenas: { [clave]: def } }, {
            gestos: motor && motor.gestos ? motor.gestos : null,
            animaciones: Object.keys(ANIMACIONES),
            durLinea: durLinea()
        });
    }
    function pintarAvisos() {
        const ul = $('es-avisos');
        ul.textContent = '';
        const d = defActual();
        const lista = d ? reglas(d, actual) : [];
        if (!lista.length) {
            const li = document.createElement('li');
            li.className = 'nada';
            li.textContent = t('Sin avisos.', 'No warnings.');
            ul.appendChild(li);
        }
        for (const a of lista) {
            const li = document.createElement('li');
            li.className = a.tipo;
            li.textContent = a.texto;
            ul.appendChild(li);
        }
        return lista;
    }
    function erroresGlobales() {
        let n = 0;
        for (const [k, def] of Object.entries(datos.escenas)) n += reglas(def, k).filter(a => a.tipo === 'error').length;
        return n;
    }
    function pintarResumen() {
        const errores = erroresGlobales();
        btnGuardar.disabled = !ctx.servidor.escritura || !sucio() || errores > 0;
        $('es-deshacer').disabled = !historial.largo;
        $('es-descartar').disabled = !sucio();
    }
    function pintar() {
        pintarLista(); pintarBarra(); pintarLinea(); pintarCampos(); pintarAvisos(); pintarResumen();
    }

    // ---------- Selector de gesto (filtrable) ----------
    function abrirSelector(alElegir) {
        if (!motor) return;
        alElegirGesto = alElegir;
        const caja = $('es-selector'), entrada = $('es-selector-texto');
        entrada.placeholder = t('Buscar gesto…', 'Search gesture…');
        entrada.value = '';
        caja.hidden = false;
        llenarSelector();
        entrada.focus();
    }
    function cerrarSelector() { $('es-selector').hidden = true; alElegirGesto = null; }
    function llenarSelector() {
        const ul = $('es-selector-lista');
        ul.textContent = '';
        const filtro = $('es-selector-texto').value.trim().toLowerCase();
        const todos = [...motor.nombres].sort();
        const coinciden = todos.filter(n => n.toLowerCase().includes(filtro));
        for (const n of coinciden.slice(0, 60)) {
            const li = document.createElement('li');
            const b = document.createElement('button');
            b.type = 'button'; b.textContent = n;
            b.addEventListener('click', () => elegirGesto(n));
            li.appendChild(b);
            ul.appendChild(li);
        }
        if (!coinciden.length) {
            const li = document.createElement('li');
            li.className = 'vacio';
            li.textContent = t('Ningún gesto con ese nombre.', 'No gesture with that name.');
            ul.appendChild(li);
        }
    }
    function elegirGesto(n) {
        const f = alElegirGesto;
        cerrarSelector();
        if (f) f(n);
    }

    // ---------- Línea de tiempo: arrastre, selección y altas ----------
    function tiempoDe(ev) {
        const interior = linea.querySelector('.es-interior');
        const px = Number(interior.dataset.px);
        const pista = interior.querySelector('.es-pista');
        return (ev.clientX - pista.getBoundingClientRect().left) / px;
    }
    function elementoDe(el) {
        const b = el.closest('.es-bloque, .es-marca');
        if (!b) return null;
        const o = { k: b.dataset.k, i: Number(b.dataset.i) };
        if (b.dataset.q) o.q = b.dataset.q;
        return o;
    }
    function valoresDe(d, s) {
        if (s.k === 'tramo') { const x = M.tramosDe(d, s.q)[s.i]; return x ? { desde: x[1], hasta: x[2] } : null; }
        if (s.k === 'frase') { const f = M.frasesDe(d, durLinea())[s.i]; return f ? { desde: f.a, hasta: f.a + f.d } : null; }
        const v = d[s.k] && d[s.k][s.i];
        return v === undefined ? null : { desde: v, hasta: v };
    }
    function operar(base, s, modo, dx) {
        const v = valoresDe(base, s);
        if (s.k === 'tramo') {
            if (modo === 'mover') return M.moverTramo(base, s.q, s.i, v.desde + dx);
            return M.estirarTramo(base, s.q, s.i, modo, (modo === 'desde' ? v.desde : v.hasta) + dx);
        }
        if (s.k === 'frase') {
            if (modo === 'mover') return M.moverFrase(base, s.i, v.desde + dx, durLinea());
            return M.estirarFrase(base, s.i, modo, (modo === 'desde' ? v.desde : v.hasta) + dx, durLinea());
        }
        return M.moverMarca(base, s.k, s.i, v.desde + dx);
    }

    // Cambia el realce sin reconstruir la línea: un doble clic necesita que el elemento siga ahí entre los dos clics
    function marcarSeleccion() {
        for (const b of linea.querySelectorAll('.es-bloque, .es-marca')) {
            const on = !!sel && sel.k === b.dataset.k && sel.i === Number(b.dataset.i) && (b.dataset.q === undefined || sel.q === b.dataset.q);
            b.classList.toggle(b.classList.contains('es-marca') ? 'elegida' : 'elegido', on);
        }
    }

    linea.addEventListener('pointerdown', ev => {
        if (ev.button !== 0) return;
        const d = defActual();
        if (!d) return;
        const px = Number(linea.querySelector('.es-interior').dataset.px);
        const regla = ev.target.closest('[data-fila="regla"]');
        if (regla) { irA(Math.max(0, Math.min(d.T, tiempoDe(ev)))); return; }
        const s = elementoDe(ev.target);
        if (!s) { if (sel) { sel = null; marcarSeleccion(); pintarCampos(); } return; }
        sel = s;
        const modo = ev.target.classList.contains('izq') ? 'desde' : ev.target.classList.contains('der') ? 'hasta' : 'mover';
        arrastre = { s, modo, x0: ev.clientX, px, base: clonar(d), antes: clonar(datos), movido: false, id: ev.pointerId };
        linea.setPointerCapture(ev.pointerId);
        marcarSeleccion(); pintarCampos();
        ev.preventDefault();
    });
    linea.addEventListener('pointermove', ev => {
        if (!arrastre || ev.pointerId !== arrastre.id) return;
        const dx = (ev.clientX - arrastre.x0) / arrastre.px;
        if (!arrastre.movido && Math.abs(ev.clientX - arrastre.x0) < 3) return;
        const res = operar(arrastre.base, arrastre.s, arrastre.modo, dx);
        if (!arrastre.movido && !res.cambio) return;
        if (!arrastre.movido) { arrastre.movido = true; historial.meter(arrastre.antes); }
        ponerDef(res.cambio ? res.def : arrastre.base);
        pintarLinea(); pintarCampos(); pintarAvisos(); pintarLista(); pintarResumen();
        enviarAlJuego();
    });
    const soltar = ev => {
        if (!arrastre || ev.pointerId !== arrastre.id) return;
        try { linea.releasePointerCapture(ev.pointerId); } catch (e) { /* ya soltado */ }
        arrastre = null;
    };
    linea.addEventListener('pointerup', soltar);
    linea.addEventListener('pointercancel', soltar);

    linea.addEventListener('dblclick', ev => {
        const d = defActual();
        if (!d) return;
        // con el puntero capturado por la línea, el doble clic llega a ella: se busca el elemento bajo el mouse
        const bajo = document.elementFromPoint(ev.clientX, ev.clientY) || ev.target;
        const s = elementoDe(bajo);
        if (s && s.k === 'tramo') { abrirSelector(n => aplicar(M.cambiarGesto(defActual(), s.q, s.i, n))); return; }
        if (s) return;
        const pista = bajo.closest('.es-pista');
        if (!pista) return;
        const instante = tiempoDe(ev);
        const fila = pista.dataset.fila;
        if (fila === 'tramos') {
            const q = pista.dataset.q;
            abrirSelector(n => {
                const res = M.agregarTramo(defActual(), q, n, instante, 1);
                if (!res) { rotular('No cabe un tramo ahí: la fila está llena en ese punto.', 'No room for a block there: the row is full at that point.', 'error'); return; }
                sel = { k: 'tramo', q, i: res.i };
                aplicar(res);
            });
        } else if (fila === 'golpes' || fila === 'corazones') {
            const res = M.agregarMarca(d, fila, instante);
            if (res) { sel = { k: fila, i: res.i }; aplicar(res); }
        } else if (fila === 'frases' && d.tipo === 'guion') {
            const res = M.agregarFrase(d, 'n', instante);
            if (res) { sel = { k: 'frase', i: res.i }; aplicar(res); }
        }
    });

    function borrarElegido() {
        const d = defActual();
        if (!sel || !d) return;
        let res = null;
        if (sel.k === 'tramo') res = M.borrarTramo(d, sel.q, sel.i);
        else if (sel.k === 'frase') res = M.borrarFrase(d, sel.i);
        else res = M.borrarMarca(d, sel.k, sel.i);
        if (res && res.cambio) { sel = null; aplicar(res); }
    }

    // ---------- Campos de la barra y del panel ----------
    $('es-T').addEventListener('change', () => { const d = defActual(); if (d) aplicar(M.cambiarT(d, $('es-T').valueAsNumber, durLinea())); else pintar(); pintarBarra(); });
    $('es-r').addEventListener('change', () => { const d = defActual(); if (d) aplicar(M.cambiarR(d, $('es-r').valueAsNumber)); pintarBarra(); });
    $('es-nivel').addEventListener('change', () => { const d = defActual(); if (d) aplicar(M.cambiarNivel(d, Number($('es-nivel').value))); });
    $('es-persona').addEventListener('change', () => { pintarLinea(); });
    $('es-desde').addEventListener('change', () => {
        const d = defActual(), v = $('es-desde').valueAsNumber;
        if (!sel || !d || !Number.isFinite(v)) return;
        let res;
        if (sel.k === 'tramo') res = M.moverTramo(d, sel.q, sel.i, v);
        else if (sel.k === 'frase') res = M.moverFrase(d, sel.i, v, durLinea());
        else res = M.moverMarca(d, sel.k, sel.i, v);
        if (!aplicar(res)) pintarCampos();
    });
    $('es-hasta').addEventListener('change', () => {
        const d = defActual(), v = $('es-hasta').valueAsNumber;
        if (!sel || !d || !Number.isFinite(v)) return;
        let res;
        if (sel.k === 'tramo') res = M.estirarTramo(d, sel.q, sel.i, 'hasta', v);
        else if (sel.k === 'frase') res = M.estirarFrase(d, sel.i, 'hasta', v, durLinea());
        if (!aplicar(res)) pintarCampos();
    });
    $('es-gesto').addEventListener('click', () => {
        if (!sel || sel.k !== 'tramo') return;
        const { q, i } = sel;
        abrirSelector(n => aplicar(M.cambiarGesto(defActual(), q, i, n)));
    });
    $('es-quien').addEventListener('change', () => { if (sel && sel.k === 'frase') aplicar(M.cambiarFrase(defActual(), sel.i, { q: $('es-quien').value })); });
    $('es-texto-es').addEventListener('change', () => { if (sel && sel.k === 'frase') aplicar(M.cambiarFrase(defActual(), sel.i, { es: $('es-texto-es').value.trim() })); });
    $('es-texto-en').addEventListener('change', () => { if (sel && sel.k === 'frase') aplicar(M.cambiarFrase(defActual(), sel.i, { en: $('es-texto-en').value.trim() })); });
    $('es-borrar').addEventListener('click', borrarElegido);
    $('es-selector-texto').addEventListener('input', llenarSelector);
    $('es-selector-texto').addEventListener('keydown', ev => {
        if (ev.key === 'Escape') { cerrarSelector(); return; }
        if (ev.key !== 'Enter') return;
        const primero = $('es-selector-lista').querySelector('button');
        if (primero) elegirGesto(primero.textContent);
    });
    $('es-zoom-mas').addEventListener('click', () => { zoom = Math.min(6, zoom * 1.25); pintarLinea(); });
    $('es-zoom-menos').addEventListener('click', () => { zoom = Math.max(0.4, zoom / 1.25); pintarLinea(); });

    $('es-nueva').addEventListener('click', () => {
        historial.meter(datos);
        const clave = M.claveLibre([...Object.keys(datos.escenas), ...Object.keys(ANIMACIONES)], 'escena');
        datos.escenas = { ...datos.escenas, [clave]: M.escenaNueva() };
        actual = clave;
        sel = null;
        pintar();
        enviarAlJuego();
    });

    // ---------- Juego: puntero libre, Reproducir, Pausa, Parar, Ir a ----------
    // Mientras la pestaña está abierta el mouse no puede quedar capturado por el juego (se comería los clics del editor)
    async function punteroLibre(v) {
        if (!listoElJuego()) return;
        try { await puente.enviar('escena', { accion: 'puntero', v }); } catch (e) { /* sin juego: nada que soltar */ }
    }
    async function irA(s) {
        tCab = M.encajar(s);
        ponerCabezal();
        if (!activa || !listoElJuego()) return;
        try { await puente.enviar('escena', { accion: 'ir', t: tCab }); } catch (e) { rotular(e.message, e.message, 'error'); }
    }
    async function reproducir() {
        const d = defActual();
        if (!d) return;
        if (!listoElJuego()) { rotular('El juego todavía no está listo: espera a que cargue el mundo.', 'The game is not ready yet: wait for the world to load.', 'error'); return; }
        const persona = $('es-persona').value || undefined;
        if (d.tipo === 'amistad' && !persona) { rotular('Elige una persona para esta escena.', 'Pick a person for this scene.', 'error'); return; }
        rotular('Preparando la escena…', 'Getting the scene ready…');
        try {
            await puente.enviar('datos', { nombre: 'escenas', datos });
            await punteroLibre(true);
            if (persona && $('es-ir-junto').checked) {
                try { await puente.tp(persona); await dormir(500); } catch (e) { /* sin destino: la escena lo acerca sola */ }
            }
            await puente.enviar('escena', { accion: 'jugar', clave: actual, persona });
            activa = true; pausada = false;
            rotular('Reproduciendo.', 'Playing.', 'ok');
            pintarBarra();
        } catch (e) {
            rotular(e.message, e.message, 'error');
        }
    }
    $('es-jugar').addEventListener('click', reproducir);
    $('es-pausa').addEventListener('click', async () => {
        try { await puente.enviar('escena', { accion: 'pausa', v: !pausada }); pausada = !pausada; pintarBarra(); } catch (e) { rotular(e.message, e.message, 'error'); }
    });
    $('es-parar').addEventListener('click', async () => {
        try { await puente.enviar('escena', { accion: 'parar' }); activa = false; pausada = false; pintarBarra(); ponerCabezal(); } catch (e) { rotular(e.message, e.message, 'error'); }
    });
    // El juego avisa dónde va la escena (10 veces por segundo) y cuando termina
    puente.alMensaje(m => {
        if (m.tipo === 'escenaT') {
            if (m.clave === null) { activa = false; pausada = false; ponerCabezal(); pintarBarra(); return; }
            if (m.clave !== actual) return;
            const antes = activa;
            activa = true; pausada = !!m.pausada; tCab = m.t;
            ponerCabezal();
            if (!antes) pintarBarra();
        } else if (m.tipo === 'listo' || m.tipo === 'estado' || m.tipo === 'error') {
            pintarBarra();
            if (m.tipo === 'listo' && ctx.pestana === 'escenas') punteroLibre(true);
        }
    });

    // ---------- Guardar ----------
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/escenas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' },
                body: JSON.stringify(datos)
            });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) {
                original = clonar(datos);
                etag = j.etag;
                historial.vaciar();
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
        a.download = 'escenas.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    function reemplazar(nuevo) {
        datos = nuevo;
        if (!defActual()) actual = Object.keys(datos.escenas)[0] || Object.keys(ANIMACIONES)[0] || null;
        sel = null;
        pintar();
        enviarAlJuego();
    }
    btnGuardar.addEventListener('click', guardar);
    $('es-descargar').addEventListener('click', descargar);
    $('es-deshacer').addEventListener('click', () => { const e = historial.deshacer(); if (e) reemplazar(e); });
    $('es-descartar').addEventListener('click', () => { historial.meter(datos); reemplazar(clonar(original)); });

    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    window.addEventListener('keydown', ev => {
        if (ctx.pestana !== 'escenas') return;
        const escribe = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName);
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); if (!btnGuardar.disabled) guardar(); return; }
        if (escribe) return;
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); $('es-deshacer').click(); return; }
        if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); borrarElegido(); }
        if (ev.key === 'Escape') cerrarSelector();
    });
    window.addEventListener('resize', () => { if (ctx.pestana === 'escenas') pintarLinea(); });
    ctx.alIdioma.push(() => { if (motor) { $('es-selector-texto').placeholder = t('Buscar gesto…', 'Search gesture…'); } pintar(); });
    ctx.alPestana.push(async clave => {
        if (clave !== 'escenas') { cerrarSelector(); punteroLibre(false); return; }
        punteroLibre(true);
        await cargarMotor();
        if (!arrastre) pintar(); // con un arrastre en curso se repinta al soltar
    });

    // El selector de personas: «la más cercana» solo sirve a las escenas de guion
    {
        const sp = $('es-persona');
        const o0 = document.createElement('option');
        o0.value = ''; o0.textContent = t('La más cercana', 'The nearest');
        sp.appendChild(o0);
        for (const c of personas) {
            const o = document.createElement('option');
            o.value = c; o.textContent = nombreDe(c);
            sp.appendChild(o);
        }
        ctx.alIdioma.push(() => { o0.textContent = t('La más cercana', 'The nearest'); });
    }
    // Para depuración y pruebas de navegador
    window.__estudioEscenas = { get datos() { return datos; }, get actual() { return actual; }, get sel() { return sel; }, elegirEscena, motor: () => motor };
    pintar();
}
