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
import * as B from './escenas-b3.mjs';
import { reglasEscenas, sonidosDeEscena, tiempoDeAncla } from '../mundo/datos/escenas.js';
import { gestosDeDatos } from '../mundo/datos/gestos.js';
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
    let verPlano = false;     // el juego tiene datos temporales con un solo plano (botón «Ver»)

    const durLinea = () => (motor && motor.durLinea) || durLineaCopia;
    const personas = Object.keys(FRASES_AMISTAD);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    ctx.sucios.escenas = sucio; // punto en la pestaña (campo-comun.js, B0-C)
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
    // Los mismos nombres que `validar`: GESTOS, GESTOS_AMISTAD, MOLDES y los gestos y poses de poses.json (fase 6). Se importan al abrir la pestaña
    // (solo el Estudio, en localhost: el sitio no baja nada de esto).
    async function cargarMotor() {
        if (motor) return motor;
        const nombres = new Set(Object.keys(GESTOS_AMISTAD));
        let dur = null, completo = false;
        const cat = await cargarCatalogos();
        try {
            const [{ GESTOS }, { MOLDES }, re, poses] = await Promise.all([
                import('../mundo/supervivencia/escenas-skin.js'),
                import('../mundo/supervivencia/moldes.js'),
                import('../mundo/supervivencia/reencuentros.js'),
                fetch('../mundo/datos/poses.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null)
            ]);
            for (const k of [...Object.keys(GESTOS), ...Object.keys(MOLDES), ...gestosDeDatos(poses).map(([g]) => g)]) nombres.add(k);
            dur = re.durLinea;
            completo = true;
        } catch (e) {
            console.warn('[estudio] no se pudieron importar los gestos del juego; no se validan los nombres', e);
        }
        motor = { gestos: completo ? nombres : null, durLinea: dur, nombres, cat };
        return motor;
    }

    // Catálogos de las claves de B3 (personas, grupos, dibujos, sonidos): los mismos de `validar`. Cada import por separado; si uno
    // falla, el editor sigue con lo que tenga (los selects se llenan con menos opciones y las reglas de catálogo no se aplican).
    async function cargarCatalogos() {
        const cat = { personas: null, grupos: null, iconos: null, pix: null, sonidos: null, codigos: null };
        const intentar = async (nombre, f) => { try { await f(); } catch (e) { console.warn(`[estudio] catálogo de escenas sin ${nombre}`, e); } };
        await Promise.all([
            intentar('personas', async () => { const m = await import('../mundo/supervivencia/amistad.js'); cat.personas = [...m.PERSONAJES]; cat.grupos = Object.keys(m.GRUPOS); }),
            intentar('dibujos', async () => {
                const { PIX, SONIDOS } = await import('../mundo/supervivencia/moldes.js');
                cat.pix = Object.keys(PIX);
                const { sonidos } = await import('../mundo/supervivencia/sonidos.js');
                cat.sonidos = Object.keys(sonidosDeEscena(SONIDOS, sonidos));
            }),
            intentar('íconos', async () => {
                const r = await fetch('../mundo/datos/iconos.json', { cache: 'no-cache' });
                cat.iconos = r.ok ? Object.keys((await r.json()).iconos || {}) : null;
            }),
            intentar('código', async () => { const m = await import('../mundo/supervivencia/codigo-escenas.js'); cat.codigos = Object.keys(m.CODIGO_ESCENAS); })
        ]);
        return cat;
    }
    const catalogo = () => (motor && motor.cat) || {};
    // Personas y grupos aunque el catálogo no haya cargado
    const listaPersonas = () => catalogo().personas || ['venjy', ...personas.filter(p => p !== 'venjy')];
    const listaGrupos = () => catalogo().grupos || ['tomatitos', 'atalaya', 'coyhaique'];

    // ---------- Cambios ----------
    function ponerDef(def) { datos.escenas = { ...datos.escenas, [actual]: def }; }
    // Después de editar `el` (frase o tramo; null si nada): el reloj de secreto, abrazo y pareja, y lo que cuelga de una frase
    // (tramos, objetos, efectos y sonidos anclados) se recalcula. `antes` es la escena como estaba.
    function pulir(despues, antes, el) {
        let d = despues;
        if (d.tipo !== 'guion') return d;
        if (el && el.k === 'tramo') { const r = B.relojAuto(antes, d, el.q, el.i); if (r.cambio) d = r.def; }
        const anclable = el && (el.k === 'frase' || el.k === 'tramo') ? el : null;
        const s = B.sincronizar(d, anclable, durLinea());
        return s.cambio ? s.def : d;
    }
    // Aplica un resultado del modelo: historial, datos, juego y pantalla. `el`: lo que se editó (por defecto, lo elegido en la línea).
    // `quieto`: un panel que no se repinta (el que se está escribiendo, para no perder el foco).
    function aplicar(res, el = sel, quieto = '') {
        if (!res || !res.cambio) return false;
        historial.meter(datos);
        ponerDef(pulir(res.def, defActual(), el));
        pintar(quieto);
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
    // Las anclas se recalculan al abrir (alguien pudo tocar el JSON a mano): sin pasar por el historial
    function reacomodar() {
        const d = datos.escenas[actual];
        if (!d || d.tipo !== 'guion') return;
        const n = B.normalizar(d, durLinea());
        if (n.cambio) { ponerDef(n.def); enviarAlJuego(); }
    }
    function elegirEscena(clave) {
        actual = clave;
        reacomodar();
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
        pintarAncla(d);
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

    // ---------- Cámara: lista de planos ----------
    const CAMPOS_PLANO = [
        ['ang', 'ang', 'ang', 0.05],
        ['dist', 'dist', 'dist', 0.1],
        ['alto', 'alto', 'height', 0.1],
        ['orbita', 'órbita', 'orbit', 0.01],
        ['dolly', 'dolly', 'dolly', 0.05]
    ];
    function pintarCamara() {
        const d = defActual();
        const sec = $('es-camara'), ol = $('es-planos');
        sec.hidden = !d;
        ol.textContent = '';
        if (!d) return;
        const juego = M.juegoDeCamara(d);
        const lista = M.planosDeEscena(d);
        const estado = $('es-camara-estado');
        if (!d.camara) estado.textContent = t('Sin cámara propia: el juego usa sus planos de dos personajes (o los del iglú, si hay techo).', 'No camera of its own: the game uses its two-person shots (or the igloo ones under a roof).');
        else if (juego) estado.textContent = t(`Usa los planos del juego «${juego}» (${lista.length}). Editar uno los copia a una lista propia.`, `Uses the game's “${juego}” shots (${lista.length}). Editing one copies them into a list of its own.`);
        else estado.textContent = t(`Lista propia: ${lista.length} de ${M.MAX_PLANOS} planos.`, `Own list: ${lista.length} of ${M.MAX_PLANOS} shots.`);
        for (const b of sec.querySelectorAll('[data-juego]')) b.classList.toggle('activo', b.dataset.juego === juego);
        $('es-plano-agregar').disabled = lista.length >= M.MAX_PLANOS;
        lista.forEach((p, i) => {
            const li = document.createElement('li');
            li.className = 'es-plano';
            li.dataset.i = String(i);
            const nombre = document.createElement('input');
            nombre.type = 'text'; nombre.className = 'es-plano-nombre'; nombre.maxLength = 40; nombre.value = p.nombre;
            nombre.autocomplete = 'off'; nombre.spellcheck = false;
            nombre.dataset.campo = 'nombre';
            nombre.setAttribute('aria-label', t('Nombre del plano', 'Shot name'));
            li.appendChild(nombre);
            const campos = document.createElement('div');
            campos.className = 'campos';
            for (const [clave, es, en, paso] of CAMPOS_PLANO) {
                const lab = document.createElement('label');
                lab.className = 'campo';
                const sp = document.createElement('span');
                sp.textContent = t(es, en);
                const inp = document.createElement('input');
                inp.type = 'number'; inp.step = String(paso);
                inp.min = String(M.LIMITES_PLANO[clave][0]); inp.max = String(M.LIMITES_PLANO[clave][1]);
                inp.value = String(p[clave] ?? 0);
                inp.dataset.campo = clave;
                lab.append(sp, inp);
                campos.appendChild(lab);
            }
            li.appendChild(campos);
            const fila = document.createElement('div');
            fila.className = 'fila-botones';
            const boton = (accion, es, en, extra = 'secundario') => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'boton chico ' + extra; b.dataset.accion = accion;
                b.textContent = t(es, en);
                if ((accion === 'subir' && i === 0) || (accion === 'bajar' && i === lista.length - 1)) b.disabled = true;
                if (accion === 'ver') b.disabled = !listoElJuego();
                fila.appendChild(b);
            };
            boton('ver', 'Ver', 'View', '');
            boton('subir', 'Subir', 'Up');
            boton('bajar', 'Bajar', 'Down');
            boton('quitar', 'Quitar', 'Remove');
            li.appendChild(fila);
            ol.appendChild(li);
        });
    }
    function cambioCamara(res) {
        if (!aplicar(res)) pintarCamara();
    }
    $('es-camara').addEventListener('click', ev => {
        const d = defActual();
        if (!d) return;
        const j = ev.target.closest('[data-juego]');
        if (j) { cambioCamara(M.usarJuego(d, j.dataset.juego)); return; }
        if (ev.target.closest('#es-plano-agregar')) { const r = M.agregarPlano(d); if (r) cambioCamara(r); return; }
        const b = ev.target.closest('[data-accion]');
        const li = ev.target.closest('.es-plano');
        if (!b || !li) return;
        const i = Number(li.dataset.i);
        if (b.dataset.accion === 'quitar') cambioCamara(M.quitarPlano(d, i));
        else if (b.dataset.accion === 'subir') cambioCamara(M.moverPlano(d, i, -1));
        else if (b.dataset.accion === 'bajar') cambioCamara(M.moverPlano(d, i, 1));
        else if (b.dataset.accion === 'ver') { const p = M.planosDeEscena(d)[i]; if (p) reproducir(p); }
    });
    $('es-camara').addEventListener('change', ev => {
        const d = defActual();
        const inp = ev.target.closest('input[data-campo]');
        const li = ev.target.closest('.es-plano');
        if (!d || !inp || !li) return;
        const i = Number(li.dataset.i), campo = inp.dataset.campo;
        cambioCamara(M.cambiarPlano(d, i, campo, campo === 'nombre' ? inp.value : inp.valueAsNumber));
    });

    // ---------- Avisos y resumen ----------
    function reglas(def, clave) {
        return reglasEscenas({ escenas: { [clave]: def } }, {
            gestos: motor && motor.gestos ? motor.gestos : null,
            animaciones: Object.keys(ANIMACIONES),
            durLinea: durLinea(),
            // catálogos de B3 (los que no se pudieron cargar quedan fuera: esas reglas no se aplican)
            ...Object.fromEntries(Object.entries(catalogo()).filter(([, v]) => v).map(([k, v]) => [k, new Set(v)]))
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
    function pintar(quieto = '') {
        pintarLista(); pintarBarra(); pintarLinea(); pintarCampos(); pintarCamara(); pintarCuando();
        if (quieto !== 'frases') pintarFrases();
        pintarExtras(); pintarAvisos(); pintarResumen();
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
        ponerDef(res.cambio ? pulir(res.def, arrastre.base, arrastre.s) : arrastre.base);
        pintarLinea(); pintarCampos(); pintarFrases(); pintarExtras(); pintarAvisos(); pintarLista(); pintarResumen();
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
        else if (sel.k === 'frase') res = borrarFraseConAnclas(d, sel.i);
        else res = M.borrarMarca(d, sel.k, sel.i);
        if (res && res.cambio) { sel = null; aplicar(res, null); }
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

    // =========================================================
    // B3c (DISENO §40, «Estudio»): vista simple. «Cuándo corre» (dispara, variantes y lugar), las frases como lista con «Acomodar
    // frases», y objetos, efectos y sonidos «en esta frase». La línea de tiempo queda en Avanzado.
    // =========================================================
    const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto !== undefined) e.textContent = texto; return e; };
    function selectDe(opciones, valor, aria) {
        const s = el('select');
        const lista = opciones.some(([v]) => v === valor) || valor === undefined ? opciones : [...opciones, [valor, String(valor)]];
        for (const [v, txt] of lista) { const o = el('option', '', txt); o.value = v; s.appendChild(o); }
        if (valor !== undefined) s.value = valor;
        if (aria) s.setAttribute('aria-label', aria);
        return s;
    }
    function campoDe(etiqueta, control, avanzado) {
        const l = el('label', 'campo' + (avanzado ? ' solo-avanzado' : ''));
        l.append(el('span', '', etiqueta), control);
        return l;
    }
    function numeroDe(valor, paso, min, max) {
        const i = el('input');
        i.type = 'number'; i.step = String(paso);
        if (min !== undefined) i.min = String(min);
        if (max !== undefined) i.max = String(max);
        i.value = valor === undefined || valor === null ? '' : String(valor);
        return i;
    }
    const recorte = (txt, n = 26) => (txt.length > n ? txt.slice(0, n - 1) + '…' : txt);
    const guionActual = () => { const d = defActual(); return d && d.tipo === 'guion' ? d : null; };
    // «1 · Hola, ¿cómo…»: las frases como opciones de un select. `vacio`: texto de la opción sin frase
    function opcionesFrase(d, vacio) {
        return [['', vacio], ...(d.lineas || []).map((l, i) => [String(i), `${i + 1} · ${recorte((l.texto[ctx.idioma] || l.texto.es) || '')}`])];
    }
    const opcionesActor = d => [...M.filasDe(d).map(q => [q, etiquetaFila(q, d)]), ['todos', t('Todos', 'Everyone')]];
    const numONulo = v => (Number.isFinite(v) ? v : null);

    // ---------- Cuándo corre ----------
    function textoDispara(dp) {
        if (!dp) return t('Sin «cuándo»: solo se juega con /amistad guion y desde aquí.', 'No trigger: it only plays with /amistad guion and from here.');
        if (dp.tipo === 'bienvenida') return t(`Bienvenida cuando eres ${nombreDe(dp.skin)}.`, `Welcome when you are ${nombreDe(dp.skin)}.`);
        if (dp.tipo === 'momento') return t(`Momento con ${nombreDe(dp.persona)}${dp.skin ? `, cuando eres ${nombreDe(dp.skin)}` : ''}.`, `Moment with ${nombreDe(dp.persona)}${dp.skin ? `, when you are ${nombreDe(dp.skin)}` : ''}.`);
        if (dp.tipo === 'reencuentro') return t(`Reencuentro entre ${nombreDe(dp.personas[0])} y ${nombreDe(dp.personas[1])}.`, `Reunion between ${nombreDe(dp.personas[0])} and ${nombreDe(dp.personas[1])}.`);
        return t(`Grupo ${dp.grupo}${dp.skin ? `, cuando eres ${nombreDe(dp.skin)}` : ''}.`, `Group ${dp.grupo}${dp.skin ? `, when you are ${nombreDe(dp.skin)}` : ''}.`);
    }
    function pintarCuando() {
        const d = guionActual();
        $('es-cuando').hidden = !d;
        if (!d) return;
        $('es-cuando-texto').textContent = textoDispara(d.dispara);
        $('es-cuando-quitar').disabled = !d.dispara;
        const puedeVariante = !!d.dispara && d.dispara.tipo !== 'reencuentro';
        $('es-variante').hidden = !puedeVariante;
        $('es-variante-nota').hidden = !puedeVariante;
        if (puedeVariante) {
            const s = $('es-variante-skin'), antes = s.value;
            s.textContent = '';
            for (const p of listaPersonas().filter(p => p !== d.dispara.skin)) { const o = el('option', '', nombreDe(p)); o.value = p; s.appendChild(o); }
            if (antes && [...s.options].some(o => o.value === antes)) s.value = antes;
        }
        pintarLugar(d);
    }
    // Lugar del grupo (Avanzado): desde quién y cuánto se corre. El gizmo «Mover el centro» de Posiciones queda pendiente (PENDIENTES)
    function pintarLugar(d) {
        const cont = $('es-lugar');
        cont.textContent = '';
        cont.appendChild(el('h3', '', t('Lugar del grupo', 'Group place')));
        for (const [parte, etq] of [['centro', t('Centro (lo que todos miran)', 'Center (what everyone looks at)')], ['jugador', t('Dónde te paras', 'Where you stand')]]) {
            const v = (d.lugar && d.lugar[parte]) || null;
            // Centro entre varios puntos (la atalaya, decisión 24): todavía solo en el JSON; así no se pisa al tocar la fila
            if (v && v.promedio) {
                cont.appendChild(el('p', 'mensaje', t(`${etq}: entre ${v.promedio.length} puntos (se edita en el JSON).`, `${etq}: between ${v.promedio.length} points (edited in the JSON).`)));
                continue;
            }
            const fila = el('div', 'es-extra-fila');
            fila.dataset.parte = parte;
            const actores = [...M.filasDe(d), ...listaPersonas().filter(p => !M.filasDe(d).includes(p))].map(q => [q, M.filasDe(d).includes(q) ? etiquetaFila(q, d) : nombreDe(q)]);
            const desde = selectDe([['', t('— sin lugar propio —', '— no place of its own —')], ...(parte === 'jugador' ? [['centro', t('el centro', 'the center')]] : []), ...actores], v ? v.desde : '', etq);
            desde.dataset.campo = 'desde';
            fila.appendChild(campoDe(etq, desde));
            const campos = el('div', 'campos');
            ['x', 'y', 'z'].forEach((c, k) => { const n = numeroDe(v && v.mas ? v.mas[k] : 0, 0.05, -64, 64); n.dataset.campo = `mas${k}`; campos.appendChild(campoDe(c, n)); });
            fila.appendChild(campos);
            cont.appendChild(fila);
        }
    }
    $('es-lugar').addEventListener('change', ev => {
        const d = guionActual();
        const fila = ev.target.closest('[data-parte]');
        if (!d || !fila) return;
        const desde = fila.querySelector('[data-campo="desde"]').value;
        const mas = [0, 1, 2].map(k => fila.querySelector(`[data-campo="mas${k}"]`).valueAsNumber || 0);
        aplicar(B.ponerLugar(d, fila.dataset.parte, desde ? { desde, mas } : null), null);
    });

    // ---------- Escena nueva / cambiar el «cuándo» (mismo formulario) ----------
    let formModo = null; // 'nueva' | 'cambiar'
    const TIPOS_FORM = [['suelta', 'Suelta (solo desde el Estudio)', 'Loose (Studio only)'], ['bienvenida', 'Bienvenida', 'Welcome'], ['momento', 'Momento', 'Moment'], ['reencuentro', 'Reencuentro', 'Reunion'], ['grupo', 'Grupo', 'Group']];
    function llenarSelect(id, opciones, valor) {
        const s = $(id);
        s.textContent = '';
        for (const [v, txt] of opciones) { const o = el('option', '', txt); o.value = v; s.appendChild(o); }
        if (valor !== undefined && [...s.options].some(o => o.value === valor)) s.value = valor;
    }
    const personasOpc = () => listaPersonas().map(p => [p, nombreDe(p)]);
    function pintarForm() {
        if (!formModo) return;
        const tipo = $('es-n-tipo').value;
        $('es-n-c-skin').hidden = !['bienvenida', 'momento', 'grupo'].includes(tipo);
        $('es-n-r-skin').textContent = tipo === 'bienvenida' ? t('Cuando eres', 'When you are') : t('Cuando eres (vacío = cualquiera)', 'When you are (empty = anyone)');
        $('es-n-c-persona').hidden = tipo !== 'momento';
        $('es-n-c-a').hidden = $('es-n-c-b').hidden = tipo !== 'reencuentro';
        $('es-n-c-grupo').hidden = tipo !== 'grupo';
        $('es-n-c-base').hidden = formModo !== 'nueva';
        $('es-n-crear').textContent = formModo === 'nueva' ? t('Crear', 'Create') : t('Aplicar', 'Apply');
        $('es-n-titulo').textContent = formModo === 'nueva' ? t('¿Qué es?', 'What is it?') : t('Cuándo corre', 'When it plays');
    }
    function abrirForm(modo) {
        formModo = modo;
        const dp = modo === 'cambiar' && guionActual() ? guionActual().dispara : null;
        llenarSelect('es-n-tipo', TIPOS_FORM.map(([v, es, en]) => [v, t(es, en)]), dp ? dp.tipo : 'suelta');
        const conVacio = [['', t('Cualquiera', 'Anyone')], ...personasOpc()];
        llenarSelect('es-n-skin', conVacio, dp ? dp.skin || '' : 'venjy');
        llenarSelect('es-n-persona', personasOpc(), dp ? dp.persona : undefined);
        llenarSelect('es-n-a', personasOpc(), dp && dp.personas ? dp.personas[0] : undefined);
        llenarSelect('es-n-b', personasOpc(), dp && dp.personas ? dp.personas[1] : listaPersonas()[1]);
        llenarSelect('es-n-grupo', listaGrupos().map(g => [g, g]), dp ? dp.grupo : undefined);
        const guiones = Object.entries(datos.escenas).filter(([, e]) => e.tipo === 'guion').map(([k]) => [k, k]);
        llenarSelect('es-n-base', [['blanco', t('En blanco', 'Blank')], ...Object.entries(B.BASES).map(([k, b]) => [k, t(b.es, b.en)]), ...guiones], 'blanco');
        $('es-n-aviso').textContent = '';
        $('es-nueva-form').hidden = false;
        pintarForm();
    }
    function cerrarForm() { formModo = null; $('es-nueva-form').hidden = true; }
    function disparaDelForm() {
        const tipo = $('es-n-tipo').value, skin = $('es-n-skin').value;
        if (tipo === 'suelta') return { dp: null };
        if (tipo === 'bienvenida') return skin ? { dp: { tipo, skin } } : { error: t('Elige con qué skin se dispara.', 'Pick the skin it triggers with.') };
        if (tipo === 'momento') return { dp: { tipo, persona: $('es-n-persona').value, ...(skin ? { skin } : {}) } };
        if (tipo === 'reencuentro') {
            const a = $('es-n-a').value, b = $('es-n-b').value;
            return a === b ? { error: t('Elige dos personas distintas.', 'Pick two different people.') } : { dp: { tipo, personas: [a, b] } };
        }
        return { dp: { tipo, grupo: $('es-n-grupo').value, ...(skin ? { skin } : {}) } };
    }
    const avisoForm = (es, en) => { $('es-n-aviso').textContent = t(es, en); };
    $('es-n-tipo').addEventListener('change', pintarForm);
    $('es-n-cancelar').addEventListener('click', cerrarForm);
    $('es-nueva').addEventListener('click', () => (formModo === 'nueva' ? cerrarForm() : abrirForm('nueva')));
    $('es-cuando-cambiar').addEventListener('click', () => { if (guionActual()) abrirForm('cambiar'); });
    $('es-cuando-quitar').addEventListener('click', () => { const r = B.ponerDispara(datos.escenas, actual, null); if (r) aplicar(r, null); });
    $('es-n-crear').addEventListener('click', () => {
        const { dp, error } = disparaDelForm();
        if (error) { $('es-n-aviso').textContent = error; return; }
        if (formModo === 'cambiar') {
            const r = B.ponerDispara(datos.escenas, actual, dp);
            if (!r) { avisoForm('Otra escena ya se dispara igual.', 'Another scene already triggers the same way.'); return; }
            cerrarForm();
            aplicar(r, null);
            return;
        }
        const r = B.escenaNueva(datos.escenas, dp, $('es-n-base').value);
        if (r.error) { avisoForm(`La escena «${r.con}» ya se dispara igual.`, `Scene “${r.con}” already triggers the same way.`); return; }
        historial.meter(datos);
        datos.escenas = { ...datos.escenas, [r.clave]: r.def };
        actual = r.clave; sel = null; activa = false; pausada = false; tCab = 0;
        cerrarForm();
        pintar();
        enviarAlJuego();
    });
    // Duplicar como variante: otra escena completa que cambia solo la skin del dispara
    $('es-variante-crear').addEventListener('click', () => {
        const r = B.variante(datos.escenas, actual, $('es-variante-skin').value);
        if (r.error) {
            const m = { 'repetido': [`La escena «${r.con}» ya se dispara con esa skin.`, `Scene “${r.con}” already triggers with that skin.`] }[r.error];
            if (m) rotular(m[0], m[1], 'error');
            return;
        }
        historial.meter(datos);
        datos.escenas = { ...datos.escenas, [r.clave]: r.def };
        actual = r.clave; sel = null; activa = false; pausada = false; tCab = 0;
        pintar();
        enviarAlJuego();
        rotular(`Variante «${r.clave}» creada.`, `Variant “${r.clave}” created.`, 'ok');
    });

    // ---------- Frases como lista ----------
    function borrarFraseConAnclas(d, i) {
        const res = M.borrarFrase(d, i);
        if (!res.cambio) return res;
        const rep = B.repararAnclasTrasBorrar(res.def, i);
        return rep.cambio ? { ...res, def: rep.def } : res;
    }
    function pintarFrases() {
        const d = guionActual();
        $('es-frases-panel').hidden = !d;
        if (!d) return;
        const ol = $('es-frases'), lineas = d.lineas || [];
        const opciones = [...opcionesActor(d), ...listaPersonas().filter(p => !M.filasDe(d).includes(p)).map(p => [p, nombreDe(p)])];
        const firma = JSON.stringify([lineas.length, opciones, ctx.idioma]);
        if (ol.dataset.firma !== firma) {
            ol.textContent = '';
            lineas.forEach((_, i) => {
                const li = el('li', 'es-frase-fila');
                li.dataset.i = String(i);
                const cab = el('div', 'es-frase-cab');
                const num = el('span', 'num');
                const quien = selectDe(opciones, lineas[i].q, t('Quién la dice', 'Who says it'));
                quien.className = 'quien'; quien.dataset.campo = 'q';
                const borrar = el('button', 'boton chico secundario', t('Borrar', 'Delete'));
                borrar.type = 'button'; borrar.dataset.accion = 'borrar';
                cab.append(num, quien, borrar);
                const es = el('textarea'), en = el('textarea');
                es.rows = en.rows = 2; es.maxLength = en.maxLength = 400;
                es.dataset.campo = 'es'; en.dataset.campo = 'en';
                es.setAttribute('aria-label', t('Texto en español', 'Spanish text')); en.setAttribute('aria-label', t('Texto en inglés', 'English text'));
                li.append(cab, es, en, el('p', 'mensaje nota'));
                ol.appendChild(li);
            });
            ol.dataset.firma = firma;
        }
        const frases = M.frasesDe(d, durLinea());
        const minimo = durLinea();
        lineas.forEach((l, i) => {
            const li = ol.children[i], f = frases[i];
            li.querySelector('.num').textContent = `${i + 1} · ${f.a}–${M.encajar(f.a + f.d)} s${l.ancla ? ' ⚓' : ''}`;
            const q = li.querySelector('[data-campo="q"]');
            if (q.value !== l.q) q.value = l.q;
            for (const [c, v] of [['es', l.texto.es], ['en', l.texto.en]]) {
                const ta = li.querySelector(`[data-campo="${c}"]`);
                if (document.activeElement !== ta && ta.value !== v) ta.value = v;
            }
            const apurada = f.propia && f.d < minimo(l.texto) - 1e-9;
            li.classList.toggle('apurada', apurada);
            li.querySelector('.nota').textContent = apurada ? t(`Apurada: se necesitan ${minimo(l.texto)} s para leerla. «Acomodar frases» la alarga.`, `Hurried: reading it takes ${minimo(l.texto)} s. “Tidy up lines” lengthens it.`) : '';
            li.querySelector('[data-accion="borrar"]').disabled = lineas.length <= 1;
        });
    }
    $('es-frases').addEventListener('change', ev => {
        const d = guionActual(), c = ev.target.closest('[data-campo]'), li = ev.target.closest('li');
        if (!d || !c || !li) return;
        const i = Number(li.dataset.i);
        const campos = c.dataset.campo === 'q' ? { q: c.value } : { [c.dataset.campo]: c.value.trim() };
        aplicar(M.cambiarFrase(d, i, campos), { k: 'frase', i }, 'frases');
    });
    $('es-frases').addEventListener('click', ev => {
        const d = guionActual(), b = ev.target.closest('[data-accion="borrar"]'), li = ev.target.closest('li');
        if (!d || !b || !li) return;
        sel = null;
        aplicar(borrarFraseConAnclas(d, Number(li.dataset.i)), null);
    });
    $('es-acomodar').addEventListener('click', () => {
        const d = guionActual();
        if (!d) return;
        if (!aplicar(B.acomodarFrases(d, durLinea()), null)) rotular('Las frases ya están acomodadas.', 'The lines are already tidy.');
        else rotular('Frases acomodadas.', 'Lines tidied up.', 'ok');
    });
    $('es-frase-nueva').addEventListener('click', () => {
        const d = guionActual();
        if (!d) return;
        const frases = M.frasesDe(d, durLinea());
        const fin = frases.reduce((m, f) => Math.max(m, f.a + f.d), 0);
        const res = M.agregarFrase(d, 'n', Math.min(d.T - M.MIN_FRASE, fin + B.HUECO));
        if (res) { sel = null; aplicar(res, { k: 'frase', i: res.i }); }
    });

    // ---------- Objetos, efectos y sonidos ----------
    const NOMBRE_HUESO = { brazoD: ['Mano derecha', 'Right hand'], brazoI: ['Mano izquierda', 'Left hand'], cabeza: ['Cabeza', 'Head'], cuerpo: ['Cuerpo', 'Body'] };
    const NOMBRE_EFECTO = { chispa: ['Chispa', 'Spark'], corazon: ['Corazón', 'Heart'], humo: ['Humo', 'Smoke'], nieve: ['Nieve', 'Snow'] };
    const dibujosDisponibles = () => {
        const c = catalogo();
        const lista = [...new Set([...(c.iconos || []), ...(c.pix || [])])];
        return lista.length ? lista : ['tomate', 'celular', 'concha'];
    };
    const sonidosDisponibles = () => catalogo().sonidos || ['golpe', 'nivel', 'mar'];
    const filaExtra = (clase, i) => { const li = el('li', 'es-extra-fila ' + clase); li.dataset.i = String(i); return li; };
    const botonBorrar = () => { const b = el('button', 'boton chico secundario', t('Borrar', 'Delete')); b.type = 'button'; b.dataset.accion = 'borrar'; return b; };
    // Select de frase que refleja un ancla al inicio de una frase; si hay un número suelto, lo muestra como opción aparte
    function selectFrase(d, ancla, vacio, tSuelto) {
        const opc = opcionesFrase(d, vacio);
        let valor = ancla && ancla.de === 'inicio' ? String(ancla.frase) : '';
        if (!valor && tSuelto !== undefined) { valor = '__t'; opc.push(['__t', t(`en el segundo ${tSuelto}`, `at second ${tSuelto}`)]); }
        return selectDe(opc, valor);
    }

    function pintarExtras() {
        const d = guionActual();
        $('es-extras').hidden = !d;
        if (!d) return;
        // Objetos
        const ulo = $('es-objetos');
        ulo.textContent = '';
        const dib = dibujosDisponibles();
        llenarSelect('es-objeto-dibujo', dib.map(k => [k, k]));
        (d.objetos || []).forEach((o, i) => {
            const li = filaExtra('objeto', i);
            const dibujo = selectDe(dib.map(k => [k, k]), typeof o.dibujo === 'string' ? o.dibujo : '', t('Dibujo', 'Drawing'));
            dibujo.dataset.campo = 'dibujo';
            if (typeof o.dibujo !== 'string') dibujo.disabled = true;
            li.appendChild(campoDe(`${i + 1} · ${t('Dibujo', 'Drawing')}`, dibujo));
            if (o.en.hueso !== undefined) {
                const cam = el('div', 'campos');
                const q = selectDe(opcionesActor(d), o.en.q); q.dataset.campo = 'q';
                const mano = selectDe(B.HUESOS.map(h => [h, t(...NOMBRE_HUESO[h])]), o.en.hueso); mano.dataset.campo = 'hueso';
                cam.append(campoDe(t('¿De quién?', 'Whose?'), q), campoDe(t('¿En qué mano?', 'In which hand?'), mano));
                li.appendChild(cam);
            } else {
                li.appendChild(el('p', 'mensaje', t('Puesto en el mundo (su lugar se edita en el JSON).', 'Placed in the world (its place is edited in the JSON).')));
            }
            const cam2 = el('div', 'campos');
            const desde = selectFrase(d, o.ancla, t('Desde el principio', 'From the start'), o.ancla ? undefined : o.desde);
            desde.dataset.campo = 'desde';
            const fh = o.hasta !== undefined ? B.fraseQueTermina(d, o.hasta, durLinea()) : -1;
            const hOpc = [['', t('Hasta el final', 'Until the end')], ...(d.lineas || []).map((l, k) => [String(k), `${k + 1} · ${recorte((l.texto[ctx.idioma] || l.texto.es) || '')}`])];
            if (o.hasta !== undefined && fh < 0) hOpc.push(['__t', t(`hasta el segundo ${o.hasta}`, `until second ${o.hasta}`)]);
            const hasta = selectDe(hOpc, o.hasta === undefined ? '' : fh >= 0 ? String(fh) : '__t'); hasta.dataset.campo = 'hasta';
            cam2.append(campoDe(t('¿Desde qué frase?', 'From which line?'), desde), campoDe(t('¿Hasta qué frase (termina)?', 'Until which line (ends)?'), hasta));
            li.appendChild(cam2);
            const cam3 = el('div', 'campos solo-avanzado');
            const tam = numeroDe(o.tam, 0.05, 0.05, 8); tam.dataset.campo = 'tam'; tam.placeholder = '0.4';
            cam3.appendChild(campoDe(t('Tamaño', 'Size'), tam));
            ['x', 'y', 'z'].forEach((c, k) => { const n = numeroDe(o.en.mas ? o.en.mas[k] : 0, 0.05, -64, 64); n.dataset.campo = `mas${k}`; cam3.appendChild(campoDe(c, n)); });
            li.appendChild(cam3);
            li.appendChild(botonBorrar());
            ulo.appendChild(li);
        });
        // Efectos
        const ule = $('es-efectos');
        ule.textContent = '';
        (d.efectos || []).forEach(([tt, tipo, op], i) => {
            op = op || {};
            const li = filaExtra('efecto', i);
            const cam = el('div', 'campos');
            // B4b: el tipo también puede ser un dibujo de PIX (visto, flash, gota, trazo)
            const pixEf = catalogo().pix || [];
            const tipos = [...B.EFECTOS.map(k => [k, t(...NOMBRE_EFECTO[k])]), ...[...new Set([...pixEf, ...(B.EFECTOS.includes(tipo) ? [] : [tipo])])].map(k => [k, k])];
            const sTipo = selectDe(tipos, tipo); sTipo.dataset.campo = 'nombre';
            const sFrase = selectFrase(d, op.ancla, t('En el segundo…', 'At second…'), undefined); sFrase.dataset.campo = 'frase';
            const sT = numeroDe(tt, 0.05, 0, d.T); sT.dataset.campo = 't';
            cam.append(campoDe(`${i + 1} · ${t('Efecto', 'Effect')}`, sTipo), campoDe(t('En esta frase', 'On this line'), sFrase), campoDe(t('Segundo', 'Second'), sT));
            li.appendChild(cam);
            const cam2 = el('div', 'campos solo-avanzado');
            // { q, mano } (la punta de una mano, B4b) se muestra pero se edita en el JSON
            const enMano = op.en && typeof op.en === 'object';
            const en = selectDe([['', t('Entre los dos', 'Between both')], ['centro', t('El centro', 'The center')], ...M.filasDe(d).map(q => [q, etiquetaFila(q, d)]),
                ...(enMano ? [['__mano', t('En la punta de la mano (JSON)', 'At the fingertip (JSON)')]] : [])], op.en === undefined ? '' : enMano ? '__mano' : op.en); en.dataset.campo = 'en';
            if (enMano) en.disabled = true;
            const alto = numeroDe(op.alto, 0.1, 0, 8); alto.dataset.campo = 'alto'; alto.placeholder = '1.8';
            const tam = numeroDe(op.tam, 0.05, 0.05, 8); tam.dataset.campo = 'tam';
            const n = numeroDe(op.n, 1, 1, 64); n.dataset.campo = 'n'; n.placeholder = '1';
            cam2.append(campoDe(t('Dónde', 'Where'), en), campoDe(t('Alto', 'Height'), alto), campoDe(t('Tamaño', 'Size'), tam), campoDe(t('Cuántos', 'How many'), n));
            li.append(cam2, botonBorrar());
            ule.appendChild(li);
        });
        // Sonidos
        const uls = $('es-sonidos');
        uls.textContent = '';
        const sonidos = sonidosDisponibles();
        (d.sonidos || []).forEach(([tt, nombre, op], i) => {
            const li = filaExtra('sonido', i);
            const cam = el('div', 'campos');
            const sN = selectDe(sonidos.map(k => [k, k]), nombre); sN.dataset.campo = 'nombre';
            const sFrase = selectFrase(d, op && op.ancla, t('En el segundo…', 'At second…'), undefined); sFrase.dataset.campo = 'frase';
            const sT = numeroDe(tt, 0.05, 0, d.T); sT.dataset.campo = 't';
            cam.append(campoDe(`${i + 1} · ${t('Suena', 'Plays')}`, sN), campoDe(t('En esta frase', 'On this line'), sFrase), campoDe(t('Segundo', 'Second'), sT));
            li.append(cam, botonBorrar());
            uls.appendChild(li);
        });
    }
    // Un cambio de una fila de objetos, efectos o sonidos: se aplica y se repinta (sin tocar lo elegido en la línea)
    function cambioExtra(ev, accion) {
        const d = guionActual(), c = ev.target.closest('[data-campo]'), li = ev.target.closest('li');
        if (!d || !c || !li) return;
        accion(d, Number(li.dataset.i), c.dataset.campo, c, li);
    }
    $('es-objetos').addEventListener('change', ev => cambioExtra(ev, (d, i, campo, c, li) => {
        const o = d.objetos[i];
        if (campo === 'desde' || campo === 'hasta') {
            if (c.value === '__t') return;
            const fa = campo === 'desde' ? (c.value === '' ? null : Number(c.value)) : (o.ancla && o.ancla.de === 'inicio' ? o.ancla.frase : null);
            const fhActual = o.hasta !== undefined ? B.fraseQueTermina(d, o.hasta, durLinea()) : -1;
            const fb = campo === 'hasta' ? (c.value === '' ? null : Number(c.value)) : (fhActual >= 0 ? fhActual : null);
            const res = B.objetoEntreFrases(d, i, fa, fb, durLinea());
            if (!aplicar(res, null)) { rotular('«Hasta» tiene que terminar después de donde empieza.', '“Until” must end after where it starts.', 'error'); pintarExtras(); }
            return;
        }
        let campos;
        if (campo.startsWith('mas')) campos = { mas: [0, 1, 2].map(k => li.querySelector(`[data-campo="mas${k}"]`).valueAsNumber || 0) };
        else if (campo === 'tam') campos = { tam: numONulo(c.valueAsNumber) };
        else campos = { [campo]: c.value };
        aplicar(B.cambiarObjeto(d, i, campos), null);
    }));
    $('es-efectos').addEventListener('change', ev => cambioExtra(ev, (d, i, campo, c) => {
        let campos;
        if (campo === 'frase') campos = { frase: c.value === '' || c.value === '__t' ? null : Number(c.value) };
        else if (campo === 't') campos = { t: c.valueAsNumber };
        else if (campo === 'nombre') campos = { nombre: c.value };
        else if (campo === 'en') campos = { en: c.value || null };
        else campos = { [campo]: numONulo(c.valueAsNumber) };
        aplicar(B.cambiarEvento(d, 'efecto', i, campos, durLinea()), null);
    }));
    $('es-sonidos').addEventListener('change', ev => cambioExtra(ev, (d, i, campo, c) => {
        let campos;
        if (campo === 'frase') campos = { frase: c.value === '' || c.value === '__t' ? null : Number(c.value) };
        else if (campo === 't') campos = { t: c.valueAsNumber };
        else campos = { nombre: c.value };
        aplicar(B.cambiarEvento(d, 'sonido', i, campos, durLinea()), null);
    }));
    for (const [id, k] of [['es-objetos', 'objeto'], ['es-efectos', 'efecto'], ['es-sonidos', 'sonido']]) {
        $(id).addEventListener('click', ev => {
            const d = guionActual(), b = ev.target.closest('[data-accion="borrar"]'), li = ev.target.closest('li');
            if (!d || !b || !li) return;
            const i = Number(li.dataset.i);
            aplicar(k === 'objeto' ? B.borrarObjeto(d, i) : B.borrarEvento(d, k, i), null);
        });
    }
    $('es-objeto-agregar').addEventListener('click', () => {
        const d = guionActual();
        if (d) aplicar(B.agregarObjeto(d, $('es-objeto-dibujo').value, 'n', 'brazoD'), null);
    });
    // Un efecto o sonido nuevo cae en el cabezal (o en el segundo 1 si está al principio)
    const instanteNuevo = d => Math.max(0.05, Math.min(d.T - 0.05, tCab > 0 ? tCab : 1));
    $('es-efecto-agregar').addEventListener('click', () => {
        const d = guionActual();
        if (d) aplicar(B.agregarEvento(d, 'efecto', 'chispa', instanteNuevo(d), {}, durLinea()), null);
    });
    $('es-sonido-agregar').addEventListener('click', () => {
        const d = guionActual();
        if (d) aplicar(B.agregarEvento(d, 'sonido', sonidosDisponibles().includes('golpe') ? 'golpe' : sonidosDisponibles()[0], instanteNuevo(d), {}, durLinea()), null);
    });

    // ---------- Ancla del elemento elegido (Avanzado) ----------
    function pintarAncla(d) {
        const campo = $('es-campo-ancla');
        const puede = !!sel && (sel.k === 'frase' || sel.k === 'tramo') && d.tipo === 'guion';
        campo.hidden = !puede;
        if (!puede) return;
        const a = B.acceso(d, sel);
        const ancla = a && a.ancla;
        const hasta = sel.k === 'frase' ? sel.i : (d.lineas || []).length; // una frase solo depende de una anterior
        const opc = opcionesFrase(d, t('— sin ancla —', '— no anchor —')).filter(([v]) => v === '' || Number(v) < hasta);
        const s = $('es-ancla-frase');
        s.textContent = '';
        for (const [v, txt] of opc) { const o = el('option', '', txt); o.value = v; s.appendChild(o); }
        s.value = ancla ? String(ancla.frase) : '';
        $('es-ancla-de').value = ancla ? ancla.de : 'fin';
        $('es-ancla-mas').value = ancla ? String(ancla.mas || 0) : '';
        $('es-ancla-de').disabled = $('es-ancla-mas').disabled = !ancla;
    }
    function cambiarAncla(ev) {
        const d = guionActual();
        if (!d || !sel || !(sel.k === 'frase' || sel.k === 'tramo')) return;
        const frase = $('es-ancla-frase').value;
        if (frase === '') { aplicar(B.quitarAncla(d, sel)); return; }
        const de = $('es-ancla-de').value;
        const fijada = B.fijarAncla(d, sel, Number(frase), de, durLinea());
        if (!fijada) { rotular('No se puede anclar a esa frase.', 'Cannot anchor to that line.', 'error'); pintarCampos(); return; }
        let def = fijada.cambio ? fijada.def : d;
        const mas = $('es-ancla-mas').valueAsNumber;
        if (ev.target.id === 'es-ancla-mas' && Number.isFinite(mas)) {
            const base = tiempoDeAncla(def.lineas, { frase: Number(frase), de, mas: 0 }, durLinea());
            const destino = Math.round((base + mas) * 100) / 100;
            const mov = sel.k === 'tramo' ? M.moverTramo(def, sel.q, sel.i, destino) : M.moverFrase(def, sel.i, destino, durLinea());
            if (mov.cambio) def = mov.def;
            else rotular('No cabe ahí: el bloque vecino lo detiene.', 'It does not fit there: the neighbouring block stops it.', 'error');
        }
        aplicar({ def, cambio: JSON.stringify(def) !== JSON.stringify(d) });
    }
    for (const id of ['es-ancla-frase', 'es-ancla-de', 'es-ancla-mas']) $(id).addEventListener('change', cambiarAncla);

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
    // `soloPlano`: reproduce con la cámara de ese único plano (botón «Ver»); los datos del juego vuelven a lo real al terminar
    async function reproducir(soloPlano) {
        const d = defActual();
        if (!d) return;
        if (!listoElJuego()) { rotular('El juego todavía no está listo: espera a que cargue el mundo.', 'The game is not ready yet: wait for the world to load.', 'error'); return; }
        const persona = $('es-persona').value || undefined;
        if (d.tipo === 'amistad' && !persona) { rotular('Elige una persona para esta escena.', 'Pick a person for this scene.', 'error'); return; }
        rotular('Preparando la escena…', 'Getting the scene ready…');
        try {
            if (soloPlano && typeof soloPlano.ang === 'number') {
                const temporal = { ...datos, escenas: { ...datos.escenas, [actual]: { ...d, camara: { planos: [soloPlano] } } } };
                await puente.enviar('datos', { nombre: 'escenas', datos: temporal });
                verPlano = true;
            } else {
                await puente.enviar('datos', { nombre: 'escenas', datos });
                verPlano = false;
            }
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
    $('es-jugar').addEventListener('click', () => reproducir());
    $('es-pausa').addEventListener('click', async () => {
        try { await puente.enviar('escena', { accion: 'pausa', v: !pausada }); pausada = !pausada; pintarBarra(); } catch (e) { rotular(e.message, e.message, 'error'); }
    });
    $('es-parar').addEventListener('click', async () => {
        try { await puente.enviar('escena', { accion: 'parar' }); activa = false; pausada = false; pintarBarra(); ponerCabezal(); } catch (e) { rotular(e.message, e.message, 'error'); }
    });
    // El juego avisa dónde va la escena (10 veces por segundo) y cuando termina
    puente.alMensaje(m => {
        if (m.tipo === 'escenaT') {
            if (m.clave === null) {
                activa = false; pausada = false; ponerCabezal(); pintarBarra();
                if (verPlano) { verPlano = false; enviarAlJuego(); } // «Ver» mandó una cámara temporal: el juego vuelve a los datos reales
                return;
            }
            if (m.clave !== actual) return;
            const antes = activa;
            activa = true; pausada = !!m.pausada; tCab = m.t;
            ponerCabezal();
            if (!antes) pintarBarra();
        } else if (m.tipo === 'listo' || m.tipo === 'estado' || m.tipo === 'error') {
            pintarBarra(); pintarCamara();
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
        reacomodar();
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
