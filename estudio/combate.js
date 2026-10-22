// =========================================================
// VENJY · Estudio · pestaña Combate (bloque 8 · N6a, mundo/COMBATE.md §25.2)
// Edita los ataques, movimientos y reacciones de cada estilo (mundo/datos/estilo-*.json, esquema estilo.schema.json) y
// las reacciones comunes y el suelo automático de combate.json (combate.schema.json). Modelo puro: estudio/combate-modelo.mjs.
// Línea de tiempo debajo del juego (reusa el aspecto de la de Escenas): las tres fases se estiran arrastrando su borde
// derecho; debajo, las ventanas de cancelación, los i-frames, la armadura y el avance, arrastrables (escriben marcas
// ancladas a la fase, así la animación y las ventanas siguen a la fase que se estira).
// Vista simple: rapidez, las tres fases con nombres comunes, daño, postura, alcance y empuje; «Avanzado» para el resto.
// Cada cambio va en vivo (mensaje `datos` con el nombre del archivo; el juego cambia el estilo en el lugar). Guardar
// escribe con If-Match cada archivo tocado. Peso, Controles, CPU y «Probar»: N6c.
// N6b: visor 3D arriba de la línea (estudio/combate-visor.js; poses con el motor del juego en combate-visor-modelo.mjs),
// cabezal en la línea (clic o arrastre en la regla), claves de cada canal como puntos anclados a la fase (con «Claves de
// la animación») y la curva de un canal como en Poses (clic en el nombre del canal).
// N6c: paneles Peso, Reacciones, Controles y CPU (estudio/combate-paneles.js) en pestañas junto a «Acción»; «Probar
// en el juego» (mensaje `combate`: la arena en práctica contra ese estilo); en el visor, la pausa del golpe y el empuje,
// el estilo del rival y «+ Canal» para mover un canal nuevo en la animación.
// =========================================================
import * as M from './combate-modelo.mjs';
import { largoFases } from '../mundo/supervivencia/combate/datos.js';
import { reglasEstilo, reglasCombate } from '../mundo/supervivencia/combate/reglas.js';
import * as V from './combate-visor-modelo.mjs';
import { crearVisor } from './combate-visor.js';
import { CANALES as CANALES_POSE } from './poses-modelo.mjs';
import { nombresCurvas } from '../mundo/datos/curvas.js';
import * as PM from './combate-paneles-modelo.mjs';
import { crearPaneles } from './combate-paneles.js';

const clonar = o => JSON.parse(JSON.stringify(o));

export async function montarCombate(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const caja = $('co-campos'), msg = $('co-mensaje'), btnGuardar = $('co-guardar'), linea = $('co-linea'), selEstilo = $('co-estilo'), selAccion = $('co-accion');
    // Archivos: combate y cada estilo-* del índice. { etag, original, datos }
    const archivos = {};
    let limites = null;
    try {
        const indice = await (await fetch('../mundo/datos/indice.json', { cache: 'no-cache' })).json();
        const nombres = ['combate', ...Object.keys(indice.archivos).filter(k => indice.archivos[k].esquema === 'estilo')];
        for (const n of nombres) {
            const r = await fetch(`../mundo/datos/${n}.json`, { cache: 'no-cache' });
            const original = JSON.parse(await r.text());
            archivos[n] = { etag: r.headers.get('ETag'), original, datos: clonar(original) };
        }
        try { limites = (await (await fetch('../mundo/datos/poses.json', { cache: 'no-cache' })).json()).limites || null; } catch (e) { limites = null; }
    } catch (e) { caja.textContent = 'No se pudieron leer combate.json y los estilos'; return; }
    const estilos = Object.keys(archivos).filter(n => n !== 'combate');
    if (!estilos.length) { caja.textContent = 'No hay estilos en indice.json'; return; }

    let estilo = estilos.includes('estilo-sekiro') ? 'estilo-sekiro' : estilos[0];
    let sel = null; // { grupo, clave }
    let elegida = null; // barra elegida (ref)
    let pxPorCuadro = 12;
    let avanzado = false;
    let baseRapidez = null; // fases al empezar a mover la rapidez
    // Visor (N6b): simulación de la acción (se rehace tras cada cambio), cuadro del bucle, reproducción y canal elegido
    let sim = null, iBucle = 0, play = true, vel = 1, canal = null, iClave = -1, verClaves = false, visor = null;
    const DESC_CANAL = Object.fromEntries(CANALES_POSE.map(([k, , , es, en]) => [k, [es, en]]));
    // N6c: panel a la vista ('accion' | 'peso' | 'reacciones' | 'controles' | 'cpu'), estilo del rival en el visor
    // (null = el mismo) y si el visor muestra la pausa del golpe y el empuje
    let panelSel = 'accion', estiloR = null, conPeso = true, paneles = null;
    const estiloRival = () => (estiloR && archivos[estiloR] ? estiloR : estilo);
    const PANELES = [['accion', 'Acción', 'Action'], ['peso', 'Peso', 'Weight'], ['reacciones', 'Reacciones', 'Reactions'], ['controles', 'Controles', 'Controls'], ['cpu', 'CPU', 'CPU']];

    const sucio = n => JSON.stringify(archivos[n].datos) !== JSON.stringify(archivos[n].original);
    const algunoSucio = () => Object.keys(archivos).some(sucio);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const archivoSel = () => (sel && sel.grupo === 'comunes' ? 'combate' : estilo);
    const defSel = () => (sel ? M.defDe(archivos[archivoSel()].datos, sel.grupo, sel.clave) : null);
    const esAtaque = () => !!sel && sel.grupo === 'ataques';
    // Un cambio: en vivo al juego, pinta lo que haga falta
    const cambio = (n = archivoSel(), repintar = 'linea') => {
        sim = null;
        ctx.puente.enviarDatos(n, archivos[n].datos);
        btnGuardar.disabled = !algunoSucio() || !ctx.servidor.escritura;
        if (repintar === 'todo') pintar(); else { pintarLinea(); pintarResumen(); pintarProblemas(); }
        pintarCurva();
    };

    // ---------- Controles chicos ----------
    const el = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto !== undefined) e.textContent = texto; return e; };
    const boton = (es, en, f, clase = 'boton chico') => { const b = el('button', clase, t(es, en)); b.type = 'button'; b.addEventListener('click', f); return b; };
    function numero(etiqueta, valor, min, max, paso, fijarValor) {
        const fila = el('label', 'campo');
        const rg = el('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = paso; rg.value = valor;
        const n = el('input'); n.type = 'number'; n.min = min; n.max = max; n.step = paso; n.value = valor; n.style.width = '5em';
        const fijar = v => { if (!Number.isFinite(v)) return; v = Math.min(max, Math.max(min, v)); rg.value = v; n.value = v; fijarValor(v); };
        rg.addEventListener('input', () => fijar(Number(rg.value)));
        n.addEventListener('change', () => fijar(Number(n.value)));
        const d = el('div', 'fila-botones'); d.append(rg, n);
        fila.append(el('span', '', etiqueta), d); return fila;
    }
    function lista(etiqueta, opciones, valor, fijarValor) {
        const fila = el('label', 'campo');
        const s = el('select');
        for (const [v, txt] of opciones) { const o = el('option', '', txt); o.value = v === null ? '' : v; s.appendChild(o); }
        s.value = valor === null || valor === undefined ? '' : valor;
        s.addEventListener('change', () => fijarValor(s.value === '' ? null : s.value));
        fila.append(el('span', '', etiqueta), s); return fila;
    }
    function casilla(etiqueta, valor, fijarValor) {
        const l = el('label', 'casilla-marca');
        const c = el('input'); c.type = 'checkbox'; c.checked = !!valor;
        c.addEventListener('change', () => fijarValor(c.checked));
        l.append(c, el('span', '', etiqueta)); return l;
    }
    const panel = (titulo) => { const s = el('section', 'panel'); s.appendChild(el('h2', '', titulo)); caja.appendChild(s); return s; };

    // ---------- Lista de estilos y acciones ----------
    function pintarSelectores() {
        selEstilo.textContent = '';
        for (const n of estilos) {
            const d = archivos[n].datos;
            const o = el('option', '', (d.nombre && (d.nombre[ctx.idioma] || d.nombre.es)) || n); o.value = n; selEstilo.appendChild(o);
        }
        selEstilo.value = estilo;
        selAccion.textContent = '';
        const grupos = M.accionesDe(archivos[estilo].datos, archivos.combate.datos);
        for (const g of grupos) {
            const og = el('optgroup'); og.label = t(...M.NOMBRE_GRUPO[g.grupo]);
            const fuente = g.archivo === 'combate' ? archivos.combate.datos : archivos[estilo].datos;
            for (const k of g.claves) {
                const o = el('option', '', M.nombreDe(M.defDe(fuente, g.grupo, k), k, ctx.idioma) + (k !== M.nombreDe(M.defDe(fuente, g.grupo, k), k, ctx.idioma) ? ` · ${k}` : ''));
                o.value = g.grupo + '|' + k; og.appendChild(o);
            }
            selAccion.appendChild(og);
        }
        if (!sel || !defSel()) { const g = grupos[0]; sel = g ? { grupo: g.grupo, clave: g.claves[0] } : null; }
        if (sel) selAccion.value = sel.grupo + '|' + sel.clave;
        // Rival del visor y dificultad para probar
        const selR = $('co-rival');
        selR.textContent = '';
        const mismo = el('option', '', t('el mismo estilo', 'the same style')); mismo.value = ''; selR.appendChild(mismo);
        for (const n of estilos) { const d = archivos[n].datos, o = el('option', '', (d.nombre && (d.nombre[ctx.idioma] || d.nombre.es)) || n); o.value = n; selR.appendChild(o); }
        selR.value = estiloR || '';
        const selD = $('co-probar-dif'), difAntes = selD.value || 'normal';
        selD.textContent = '';
        for (const [k, es, en] of PM.DIFICULTADES) { const o = el('option', '', t(es, en)); o.value = k; selD.appendChild(o); }
        selD.value = difAntes;
        // Pestañas de paneles
        const pp = $('co-paneles');
        pp.textContent = '';
        for (const [k, es, en] of PANELES) {
            const b = boton(es, en, () => { if (paneles) paneles.cancelarCaptura(); panelSel = k; pintar(); }, 'boton chico' + (k === panelSel ? '' : ' secundario'));
            b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(k === panelSel)); b.dataset.panel = k;
            pp.appendChild(b);
        }
    }
    $('co-rival').addEventListener('change', e => { estiloR = e.target.value || null; sim = null; if (visor) visor.fijarEstilo(archivos[estilo].datos, archivos[estiloRival()].datos); });
    $('co-peso').addEventListener('change', e => { conPeso = e.target.checked; sim = null; });
    // Probar en el juego (N6c): la arena en práctica contra este estilo, el rival repite la acción elegida
    $('co-probar').addEventListener('click', async () => {
        if (!sel) return;
        const m = PM.mensajeProbar(estilo, sel.grupo, sel.clave, $('co-probar-dif').value || 'normal');
        rotular('Abriendo la arena…', 'Opening the arena…');
        try {
            await ctx.puente.enviar('combate', m);
            rotular(m.reaccion ? `Arena abierta: el muñeco juega «${sel.clave}» con R.` : `Arena abierta: el rival repite «${sel.clave}».`, m.reaccion ? `Arena open: the dummy plays «${sel.clave}» with R.` : `Arena open: the rival repeats «${sel.clave}».`, 'ok');
        } catch (e) { rotular(`No se pudo probar: ${e.message}`, `Could not try it: ${e.message}`, 'error'); }
    });
    $('co-terminar').addEventListener('click', async () => {
        try { await ctx.puente.enviar('combate', { accion: 'terminar' }); rotular('Arena cerrada.', 'Arena closed.', 'ok'); } catch (e) { rotular(e.message, e.message, 'error'); }
    });
    const nuevaAccion = () => { elegida = null; baseRapidez = null; sim = null; iBucle = 0; canal = null; iClave = -1; };
    selEstilo.addEventListener('change', () => { estilo = selEstilo.value; sel = null; nuevaAccion(); if (visor) visor.fijarEstilo(archivos[estilo].datos, archivos[estiloRival()].datos); pintar(); });
    selAccion.addEventListener('change', () => { const [g, k] = selAccion.value.split('|'); sel = { grupo: g, clave: k }; nuevaAccion(); pintar(); });

    // ---------- Línea de tiempo ----------
    const ANCHO_ROTULO = 130;
    function pintarLinea() {
        linea.textContent = '';
        const def = defSel();
        if (!def || !def.fases) { linea.appendChild(el('p', 'mensaje', t('Esta acción no tiene fases.', 'This action has no phases.'))); return; }
        const f = def.fases, total = largoFases(f), ancho = Math.max(1, total) * pxPorCuadro + 2 * pxPorCuadro;
        const interior = el('div', 'es-interior');
        const fila = (rotulo, clase = '') => {
            const r = el('div', 'es-fila ' + clase), rot = el('div', 'es-rotulo', rotulo), pista = el('div', 'es-pista');
            pista.style.width = ancho + 'px'; pista.style.height = '34px'; pista.style.backgroundSize = (pxPorCuadro * 10) + 'px 100%';
            r.append(rot, pista); interior.appendChild(r); return pista;
        };
        // Regla en cuadros (cada 10 con número) y segundos
        const regla = fila(t('cuadros (60 por s)', 'frames (60 per s)'), 'es-regla');
        regla.style.height = '18px';
        for (let c = 0; c <= total; c++) {
            const m = el('div', 'es-marca-regla' + (c % 10 === 0 ? ' entera' : ''));
            m.style.left = c * pxPorCuadro + 'px'; if (c % 10 === 0) m.dataset.t = c; regla.appendChild(m);
        }
        // Clic o arrastre en la regla: el cabezal va a ese cuadro (y se pausa)
        regla.addEventListener('pointerdown', e => {
            e.preventDefault();
            const ir = ev => irA((ev.clientX - regla.getBoundingClientRect().left) / pxPorCuadro);
            ir(e);
            const soltar = () => { window.removeEventListener('pointermove', ir); window.removeEventListener('pointerup', soltar); };
            window.addEventListener('pointermove', ir); window.addEventListener('pointerup', soltar);
        });
        // Fases: el borde derecho de cada una se arrastra (estira esa fase; lo que viene después se corre)
        const pf = fila(t('fases', 'phases'));
        let x = 0;
        for (const fase of M.FASES) {
            const n = f[fase] || 0;
            const b = el('div', 'es-bloque co-fase co-' + fase);
            b.style.left = x * pxPorCuadro + 'px'; b.style.width = Math.max(4, n * pxPorCuadro) + 'px';
            b.title = `${t(...M.NOMBRE_FASE[fase])}: ${n} c (${M.segundos(n)} s)`;
            b.appendChild(el('span', 'txt', `${t(...M.NOMBRE_FASE[fase]).split(' (')[0]} ${n}`));
            const asa = el('span', 'asa'); b.appendChild(asa);
            arrastrar(asa, n, (dx, v0) => { if (M.estirarFase(def, fase, v0 + Math.round(dx / pxPorCuadro), esAtaque())) cambio(); });
            pf.appendChild(b); x += n;
        }
        // Ventanas y tramos
        for (const barra of M.barrasDe(def)) {
            const p = fila(barra.etiqueta, 'co-fila-' + barra.tipo);
            const b = el('div', 'es-bloque co-barra co-' + barra.tipo + (elegida && same(elegida, barra.ref) ? ' elegido' : '') + (barra.abierta ? ' abierta' : ''));
            b.style.left = barra.desde * pxPorCuadro + 'px'; b.style.width = Math.max(4, (barra.hasta - barra.desde + 1) * pxPorCuadro) + 'px';
            b.title = `${barra.etiqueta}: c${barra.desde}-${barra.hasta}`;
            if (barra.fija) {
                b.classList.add('fija');
                b.appendChild(el('span', 'txt', t('sigue a su fase', 'follows its phase')));
            } else {
                const asaI = el('span', 'asa'), txt = el('span', 'txt', `${barra.desde}-${barra.hasta}`), asaD = el('span', 'asa');
                b.append(asaI, txt, asaD);
                arrastrar(asaI, barra.desde, (dx, v0) => { if (M.moverBorde(def, barra.ref, 'desde', v0 + Math.round(dx / pxPorCuadro))) cambio(); });
                arrastrar(asaD, barra.hasta, (dx, v0) => { if (M.moverBorde(def, barra.ref, 'hasta', v0 + Math.round(dx / pxPorCuadro))) cambio(); });
                let ultimo = 0;
                arrastrar(txt, 0, dx => { const d = Math.round(dx / pxPorCuadro) - ultimo; if (d && M.moverBarra(def, barra.ref, d)) { ultimo += d; cambio(); } }, () => { ultimo = 0; elegida = barra.ref; });
            }
            p.appendChild(b);
        }
        // Claves de cada canal (N6b): puntos anclados a la fase; se arrastran a los lados, clic en el nombre = su curva
        if (verClaves) pintarFilasClaves(fila, def);
        pintarCanalNuevo(def);
        nodoCabezal = el('div', 'co-cabezal'); nodoCabezal.hidden = true; interior.appendChild(nodoCabezal);
        const l = el('div', 'es-linea'); l.appendChild(interior);
        linea.appendChild(l);
        moverCabezal();
    }
    let nodoCabezal = null;
    // N6c: agregar un canal que la animación todavía no mueve (dos claves con su valor de hoy; después se arrastran)
    function pintarCanalNuevo(def) {
        const zona = $('co-canal-nuevo');
        zona.textContent = '';
        const info = verClaves && def && def.fases ? animSel() : null;
        const libres = info && info.archivo ? V.canalesLibres(info.anim, CANALES_POSE.map(c => c[0])) : [];
        zona.hidden = !libres.length;
        if (!libres.length) return;
        const s = el('select'); s.setAttribute('aria-label', t('Canal nuevo', 'New channel'));
        for (const k of libres) { const o = el('option', '', DESC_CANAL[k] ? `${k} · ${t(...DESC_CANAL[k])}` : k); o.value = k; s.appendChild(o); }
        zona.append(s, boton('+ Canal', '+ Channel', () => {
            if (!V.agregarCanal(info.anim, s.value, def.fases)) return;
            canal = s.value; iClave = 0;
            cambio(archivoAnim(info));
        }));
    }
    function pintarFilasClaves(fila, def) {
        const info = animSel();
        if (!info || !V.usaFases(info.anim)) {
            fila(t('claves', 'keys')).appendChild(el('span', 'txt', t('Esta acción no tiene animación con fases.', 'This action has no phase animation.')));
            return;
        }
        if (!info.archivo) fila(t('claves', 'keys')).appendChild(el('span', 'txt', t('Animación del código: se ve, pero no se edita aquí.', 'Code animation: shown, not editable here.')));
        for (const { canal: k, puntos } of V.clavesDe(info.anim, def.fases)) {
            const p = fila(k, 'co-fila-clave' + (k === canal ? ' elegida' : ''));
            p.style.height = '18px';
            const rot = p.previousSibling;
            if (DESC_CANAL[k]) rot.title = t(...DESC_CANAL[k]);
            rot.addEventListener('click', () => { canal = k; iClave = -1; pintarLinea(); pintarCurva(); });
            for (const q of puntos) {
                const d = el('div', 'co-clave ' + (q.fase === 'activo' ? 'g' : q.fase === 'recuperacion' ? 'r' : 'a') + (k === canal && q.i === iClave ? ' elegida' : ''));
                d.style.left = q.c * pxPorCuadro + 'px';
                d.title = `${k}: ${q.v} · c${q.c} (${t(...M.NOMBRE_FASE[q.fase]).split(' (')[0]})`;
                if (info.archivo) arrastrar(d, q.c, (dx, v0) => {
                    if (Math.abs(dx) < pxPorCuadro / 2) return;
                    if (V.moverClave(info.anim, k, q.i, Math.round(v0 + dx / pxPorCuadro), def.fases)) cambio(archivoAnim(info));
                }, () => { canal = k; iClave = q.i; pintarCurva(); });
                p.appendChild(d);
            }
        }
    }
    // La animación de la acción elegida y el archivo donde vive
    const animSel = () => { const def = defSel(); return def ? V.animDeAccion(archivos[estilo].datos, archivos.combate.datos, def, sel.clave) : null; };
    const archivoAnim = info => (info.archivo === 'estilo' ? estilo : 'combate');

    // ---------- Visor y cabezal (N6b) ----------
    function simAhora() {
        if (sim || !sel) return sim;
        sim = V.simular(archivos[estilo].datos, archivos.combate.datos, sel.clave, { estiloR: archivos[estiloRival()].datos, peso: conPeso });
        const hoja = sim ? V.cuadrosHoja(sim.def.fases, 8) : [];
        if (visor) visor.fijarSim(sim, hoja);
        pintarHoja(hoja);
        if (sim) iBucle = Math.min(iBucle, sim.cuadros.length - 1);
        ultimoC = null;
        return sim;
    }
    const cuadroActual = () => (sim ? sim.cuadros[Math.floor(iBucle)].c : 0);
    function irA(c) {
        if (!simAhora()) return;
        iBucle = V.indiceDe(sim, Math.max(0, Math.min(sim.total - 1, c)));
        ponerPlay(false); refrescarVisor();
    }
    function ponerPlay(v) {
        play = v;
        const b = $('co-play');
        b.dataset.es = v ? 'Pausa' : 'Reproducir'; b.dataset.en = v ? 'Pause' : 'Play'; b.textContent = t(b.dataset.es, b.dataset.en);
    }
    $('co-play').addEventListener('click', () => ponerPlay(!play));
    $('co-vel').addEventListener('change', e => { vel = Number(e.target.value) || 1; });
    $('co-ver-claves').addEventListener('change', e => { verClaves = e.target.checked; pintarLinea(); pintarCurva(); });
    function pintarHoja(hoja) {
        const zona = $('co-hoja');
        zona.textContent = '';
        for (const h of hoja) {
            const b = el('button', 'co-' + h.fase, `c${h.c}`); b.type = 'button'; b.dataset.c = h.c;
            b.title = t(...M.NOMBRE_FASE[h.fase]);
            b.addEventListener('click', () => irA(h.c));
            zona.appendChild(b);
        }
    }
    function moverCabezal() {
        if (!nodoCabezal || !sim) return;
        const c = cuadroActual();
        nodoCabezal.hidden = !(c >= 0 && c < sim.total);
        nodoCabezal.style.left = (ANCHO_ROTULO + c * pxPorCuadro + pxPorCuadro / 2) + 'px';
    }
    let ultimoC = null;
    function refrescarVisor() {
        if (!simAhora()) { $('co-cuadro').textContent = ''; return; }
        if (visor) visor.dibujar(Math.floor(iBucle));
        const q = sim.cuadros[Math.floor(iBucle)], c = q.c;
        if (c === ultimoC) return;
        ultimoC = c;
        moverCabezal();
        const dentro = c >= 0 && c < sim.total, fase = dentro ? V.FASE_DE[V.claveDeCuadro(c, sim.def.fases)[0]] : null;
        const nf = fase ? t(...M.NOMBRE_FASE[fase]).split(' (')[0] : '';
        $('co-cuadro').textContent = dentro
            ? t(`Cuadro ${c} de ${sim.total} · ${nf}`, `Frame ${c} of ${sim.total} · ${nf}`) + (q.rc !== null ? t(` · rival: ${sim.reaccion} c${q.rc}`, ` · rival: ${sim.reaccion} f${q.rc}`) : '') +
              (sim.hitstop && c === sim.golpe ? t(` · pausa del golpe ${sim.hitstop} c, empuje ${sim.empuje}`, ` · hit pause ${sim.hitstop} f, push ${sim.empuje}`) : '')
            : t('Guardia (entre una vuelta y otra)', 'Guard (between loops)');
        for (const b of $('co-hoja').children) b.classList.toggle('actual', Number(b.dataset.c) === c);
        pintarCurva();
    }
    let tAnterior = null;
    function tick(ahora) {
        requestAnimationFrame(tick);
        const dt = tAnterior === null ? 0 : Math.min(0.1, (ahora - tAnterior) / 1000);
        tAnterior = ahora;
        if (ctx.pestana !== 'combate' || !simAhora()) return;
        if (play) iBucle = (iBucle + dt * V.HZ * vel) % sim.cuadros.length;
        refrescarVisor();
    }
    $('co-vista').addEventListener('click', () => ponerPlay(!play));

    // ---------- Curva de un canal (como en Poses) ----------
    const lienzo = $('co-curva'), MARGEN = 30;
    let escala = null, arrastreClave = null;
    const aPx = (c, v) => [MARGEN + c / (escala.total || 1) * (lienzo.width - 2 * MARGEN), lienzo.height - 14 - (v - escala.a) / (escala.b - escala.a || 1) * (lienzo.height - 28)];
    const dePx = (px, py) => [(px - MARGEN) / (lienzo.width - 2 * MARGEN) * escala.total, escala.a + (lienzo.height - 14 - py) / (lienzo.height - 28) * (escala.b - escala.a)];
    const f2 = x => Math.round(x * 100) / 100;
    function pintarCurva() {
        const zona = $('co-curva-zona'), def = defSel(), info = animSel();
        const k = info && canal && V.canalesConClaves(info.anim).includes(canal) ? info.anim.canales[canal].k : null;
        zona.hidden = !k || !def || !def.fases || !verClaves;
        if (zona.hidden) { escala = null; return; }
        const f = def.fases, total = largoFases(f), [a, b] = V.rangoCanal(info.anim, canal, f);
        escala = { total, a, b };
        $('co-curva-titulo').textContent = `${sel.clave} · ${canal}` + (DESC_CANAL[canal] ? ` · ${t(...DESC_CANAL[canal])}` : '') + (info.archivo ? '' : t(' (código: no se edita)', ' (code: not editable)'));
        const g = lienzo.getContext('2d');
        g.fillStyle = '#1d1610'; g.fillRect(0, 0, lienzo.width, lienzo.height);
        // fondo de cada fase (las claves se anclan a ellas)
        const COLOR = { anticipacion: 'rgba(138,122,46,0.25)', activo: 'rgba(138,46,46,0.35)', recuperacion: 'rgba(58,90,138,0.25)' };
        let x = 0;
        for (const fase of M.FASES) {
            const n = f[fase] || 0, [x0] = aPx(x, a), [x1] = aPx(x + n, a);
            g.fillStyle = COLOR[fase]; g.fillRect(x0, 4, x1 - x0, lienzo.height - 18); x += n;
        }
        g.font = '12px PixelCraft, monospace'; g.fillStyle = '#aaaaaa';
        if (a < 0 && b > 0) { const [, py] = aPx(0, 0); g.strokeStyle = '#6f6f6f'; g.lineWidth = 1; g.beginPath(); g.moveTo(MARGEN, py); g.lineTo(lienzo.width - MARGEN, py); g.stroke(); }
        g.fillText(f2(b), 2, 14); g.fillText(f2(a), 2, lienzo.height - 16);
        g.fillText('c0', MARGEN, lienzo.height - 2); g.fillText(`c${total}`, lienzo.width - MARGEN - 30, lienzo.height - 2);
        g.strokeStyle = '#7fdc5a'; g.lineWidth = 2; g.beginPath();
        V.muestras(info.anim, canal, f, 240).forEach(([c, v], i) => { const [px, py] = aPx(c, v); if (i) g.lineTo(px, py); else g.moveTo(px, py); });
        g.stroke();
        k.forEach((q, i) => {
            const [px, py] = aPx(V.cuadroDeClave(q, f), q[2]);
            g.fillStyle = i === iClave ? '#ffff55' : '#ffffff'; g.fillRect(px - 5, py - 5, 10, 10);
            g.strokeStyle = '#000'; g.lineWidth = 1; g.strokeRect(px - 5, py - 5, 10, 10);
        });
        if (sim) {
            const c = cuadroActual();
            if (c >= 0 && c < total) { const [px] = aPx(c, a); g.strokeStyle = '#ffff55'; g.lineWidth = 1; g.beginPath(); g.moveTo(px, 4); g.lineTo(px, lienzo.height - 14); g.stroke(); }
        }
        const valor = $('co-valor'), llega = $('co-llega'), hay = iClave >= 0 && !!k[iClave];
        valor.disabled = llega.disabled = !hay || !info.archivo;
        if (!llega.options.length) for (const n of ['', ...nombresCurvas()]) { const o = el('option', '', n || t('suave (la de siempre)', 'smooth (default)')); o.value = n; llega.appendChild(o); }
        if (hay && document.activeElement !== valor) valor.value = k[iClave][2];
        if (hay) llega.value = k[iClave][3] || '';
    }
    const puntoLienzo = e => { const q = lienzo.getBoundingClientRect(); return [(e.clientX - q.left) * lienzo.width / q.width, (e.clientY - q.top) * lienzo.height / q.height]; };
    function claveBajo(px, py) {
        const info = animSel(), def = defSel();
        if (!escala || !info) return -1;
        return info.anim.canales[canal].k.findIndex(q => { const [qx, qy] = aPx(V.cuadroDeClave(q, def.fases), q[2]); return Math.abs(qx - px) <= 7 && Math.abs(qy - py) <= 7; });
    }
    lienzo.addEventListener('pointerdown', e => {
        if (!escala) return;
        const [px, py] = puntoLienzo(e), i = claveBajo(px, py), info = animSel();
        lienzo.focus();
        if (i >= 0) {
            iClave = i;
            if (info.archivo) { arrastreClave = { i, info }; lienzo.setPointerCapture(e.pointerId); }
            pintarLinea(); pintarCurva();
        } else irA(dePx(px, py)[0]);
    });
    lienzo.addEventListener('pointermove', e => {
        if (!arrastreClave) return;
        const [c, v] = dePx(...puntoLienzo(e)), { i, info } = arrastreClave, f = defSel().fases;
        const a = V.moverClave(info.anim, canal, i, Math.round(c), f), b = V.fijarValor(info.anim, canal, i, v);
        if (a || b) cambio(archivoAnim(info));
    });
    const soltarClave = () => { arrastreClave = null; };
    lienzo.addEventListener('pointerup', soltarClave);
    lienzo.addEventListener('pointercancel', soltarClave);
    lienzo.addEventListener('dblclick', e => {
        const info = animSel();
        if (!escala || !info || !info.archivo) return;
        const [px, py] = puntoLienzo(e);
        if (claveBajo(px, py) >= 0) return;
        const [c, v] = dePx(px, py), i = V.agregarClave(info.anim, canal, Math.round(c), v, defSel().fases);
        if (i >= 0) { iClave = i; cambio(archivoAnim(info)); }
    });
    lienzo.addEventListener('keydown', e => {
        const info = animSel();
        if ((e.key === 'Delete' || e.key === 'Backspace') && iClave >= 0 && info && info.archivo) {
            e.preventDefault();
            if (V.borrarClave(info.anim, canal, iClave)) { iClave = -1; cambio(archivoAnim(info)); }
        }
    });
    $('co-valor').addEventListener('change', e => {
        const info = animSel();
        if (info && info.archivo && iClave >= 0 && V.fijarValor(info.anim, canal, iClave, Number(e.target.value))) cambio(archivoAnim(info));
    });
    $('co-llega').addEventListener('change', e => {
        const info = animSel(), q = info && info.archivo && iClave >= 0 && info.anim.canales[canal].k[iClave];
        if (!q) return;
        if (e.target.value) q[3] = e.target.value; else q.length = 3;
        cambio(archivoAnim(info));
    });

    const same = (a, b) => a.campo === b.campo && a.i === b.i;
    // Arrastre con puntero: f(dx, valorInicial) en cada movimiento. Escucha en window: cada cambio rehace la línea
    // (el nodo arrastrado desaparece), así que al soltar se pinta todo de nuevo
    function arrastrar(nodo, v0, f, alEmpezar) {
        nodo.addEventListener('pointerdown', e => {
            e.preventDefault(); e.stopPropagation();
            if (alEmpezar) alEmpezar();
            const x0 = e.clientX;
            const mover = ev => f(ev.clientX - x0, v0);
            const soltar = () => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); window.removeEventListener('pointercancel', soltar); pintar(); };
            window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar); window.addEventListener('pointercancel', soltar);
        });
    }
    $('co-zoom').addEventListener('input', e => { pxPorCuadro = Number(e.target.value); pintarLinea(); });

    // ---------- Panel ----------
    let nodoResumen = null, nodoProblemas = null;
    function pintarResumen() {
        const def = defSel();
        if (!nodoResumen || !def || !def.fases) return;
        const n = largoFases(def.fases);
        nodoResumen.textContent = t(`Dura ${n} cuadros (${M.segundos(n)} s).`, `Lasts ${n} frames (${M.segundos(n)} s).`) +
            (def.peligro ? t(` Peligro: ${def.peligro} (se lee con al menos 24 c de preparación).`, ` Peril: ${def.peligro} (needs at least 24 f of wind-up).`) : '');
    }
    function pintarProblemas() {
        if (!nodoProblemas) return;
        nodoProblemas.textContent = '';
        const c = archivos.combate.datos;
        // Paneles (N6c): Peso, Reacciones y Controles revisan combate.json (y los controles del estilo); CPU, la del estilo
        const deCombate = panelSel === 'peso' || panelSel === 'reacciones' || panelSel === 'controles' || (panelSel === 'accion' && archivoSel() === 'combate');
        const todos = deCombate ? reglasCombate(c, { limites }) : reglasEstilo(archivos[estilo].datos, { combate: c, limites });
        if (panelSel === 'controles') todos.push(...reglasEstilo(archivos[estilo].datos, { combate: c, limites }).filter(r => r.texto.startsWith('$.controles')));
        const prefijo = panelSel === 'cpu' ? '$.cpu' : panelSel !== 'accion' ? '$' : sel ? `$.${sel.grupo === 'comunes' ? 'reacciones' : sel.grupo}.${sel.clave}` : '';
        const mios = todos.filter(r => r.texto.startsWith(prefijo + '.') || r.texto.startsWith(prefijo + ':') || r.texto.startsWith(prefijo + ' '));
        if (!mios.length) { nodoProblemas.appendChild(el('p', 'mensaje ok', t('Sin problemas.', 'No problems.'))); return; }
        for (const r of mios) nodoProblemas.appendChild(el('p', 'mensaje ' + (r.tipo === 'error' ? 'error' : ''), r.texto));
    }
    function pintar() {
        pintarSelectores();
        caja.textContent = '';
        nodoResumen = null; nodoProblemas = null;
        if (panelSel !== 'accion' && paneles) {
            paneles[panelSel](caja);
            const pP = panel(t('Revisión', 'Check'));
            nodoProblemas = el('div'); pP.appendChild(nodoProblemas);
            pintarProblemas(); pintarLinea();
            btnGuardar.disabled = !algunoSucio() || !ctx.servidor.escritura;
            return;
        }
        const def = defSel();
        if (!def) { caja.appendChild(el('p', 'mensaje', t('Elige una acción.', 'Pick an action.'))); pintarLinea(); return; }
        const ataque = esAtaque();
        // -- Tiempos (vista simple) --
        const pT = panel(t('Tiempos', 'Timing'));
        nodoResumen = el('p', 'mensaje'); pT.appendChild(nodoResumen);
        if (def.fases) {
            if (!baseRapidez) baseRapidez = clonar(def.fases);
            const factor = largoFases(baseRapidez) ? Math.round((largoFases(def.fases) / largoFases(baseRapidez)) * 100) / 100 : 1;
            pT.appendChild(numero(t('Rapidez (× lo que dura; menos = más rápido)', 'Speed (× duration; less = faster)'), factor, 0.25, 3, 0.05, v => { M.escalarFases(def, v, baseRapidez, ataque); cambio(); }));
            for (const fase of M.FASES) {
                pT.appendChild(numero(t(...M.NOMBRE_FASE[fase]) + t(' · cuadros', ' · frames'), def.fases[fase] || 0, M.minimoFase(def, fase, ataque), 120, 1, v => { M.estirarFase(def, fase, v, ataque); baseRapidez = clonar(def.fases); cambio(); }));
            }
        }
        // -- Golpe (solo ataques) --
        if (ataque) {
            const pG = panel(t('Golpe', 'Hit'));
            pG.appendChild(lista(t('Altura', 'Height'), M.ALTURAS.map(a => [a, a]), def.altura, v => { def.altura = v; cambio(); }));
            for (const [k, es, en, min, max, paso] of M.CAMPOS_ATAQUE.simple) pG.appendChild(numero(t(es, en), def[k] ?? 0, min, max, paso, v => { def[k] = v; cambio(); }));
        }
        // -- Ventanas (lista para agregar y borrar; se arrastran en la línea) --
        const pV = panel(t('Ventanas', 'Windows'));
        pV.appendChild(el('p', 'mensaje', t('Arrastra las barras de abajo: el centro las mueve, los bordes las estiran. Se guardan pegadas a su fase.', 'Drag the bars below: the middle moves them, the edges stretch them. They stay anchored to their phase.')));
        const claves = [...Object.keys(archivos[estilo].datos.ataques || {}), ...Object.keys(archivos[estilo].datos.acciones || {})];
        (def.cancelar || []).forEach((v, i) => {
            const d = el('div', 'fila-botones');
            d.appendChild(lista(t(`Puede pasar a (${i + 1})`, `Can go to (${i + 1})`), claves.map(k => [k, k]), v.a[0], x => { v.a[0] = x; cambio(undefined, 'todo'); }));
            d.appendChild(casilla(t('solo si conectó', 'only if it hit'), v.siConecto, x => { if (x) v.siConecto = true; else delete v.siConecto; cambio(); }));
            d.appendChild(boton('Quitar', 'Remove', () => { M.borrarCancelacion(def, i); cambio(undefined, 'todo'); }, 'boton chico secundario'));
            pV.appendChild(d);
        });
        const fb = el('div', 'fila-botones');
        fb.appendChild(boton('+ Cancelación', '+ Cancel', () => { M.agregarCancelacion(def, claves[0] || sel.clave); cambio(undefined, 'todo'); }));
        fb.appendChild(boton('+ Invulnerable (i-frames)', '+ Invulnerable (i-frames)', () => { M.agregarTramo(def, 'iframes'); cambio(undefined, 'todo'); }));
        fb.appendChild(boton('+ Armadura', '+ Armor', () => { M.agregarTramo(def, 'armadura'); cambio(undefined, 'todo'); }));
        pV.appendChild(fb);
        for (const campo of ['iframes', 'armadura']) (def[campo] || []).forEach((tr, i) => {
            pV.appendChild(boton(`Quitar ${campo} ${i + 1}`, `Remove ${campo} ${i + 1}`, () => { M.borrarTramo(def, campo, i); cambio(undefined, 'todo'); }, 'boton chico secundario'));
        });
        // -- Partir de otro (bases) --
        const pB = panel(t('Partir de este', 'Start from this one'));
        const entrada = el('input'); entrada.type = 'text'; entrada.placeholder = sel.clave + '_2'; entrada.style.width = '12em';
        const fd = el('div', 'fila-botones'); fd.append(entrada, boton('Duplicar como nuevo', 'Duplicate as new', () => {
            const nueva = (entrada.value || entrada.placeholder).trim();
            if (!M.duplicarAccion(archivos[archivoSel()].datos, sel.grupo, sel.clave, nueva)) { rotular('Esa clave no vale o ya existe (minúsculas, números y _).', 'That key is invalid or taken (lowercase, digits and _).', 'error'); return; }
            sel = { grupo: sel.grupo, clave: nueva }; baseRapidez = null; cambio(undefined, 'todo');
            rotular('Copia creada con la misma animación. Para usarla en la pelea, asígnala en los controles o en una cancelación.', 'Copy created with the same animation. To use it in a fight, assign it in the controls or a cancel.', 'ok');
        }));
        pB.appendChild(fd);
        // -- Avanzado --
        const det = el('details', 'panel solo-avanzado'); det.open = avanzado; det.addEventListener('toggle', () => { avanzado = det.open; });
        det.appendChild(el('summary', '', t('Avanzado', 'Advanced')));
        if (ataque) {
            det.appendChild(lista(t('Peligro (aviso rojo)', 'Peril (red warning)'), M.PELIGROS.map(p => [p, p || t('ninguno', 'none')]), def.peligro, v => { def.peligro = v; cambio(); }));
            const niveles = Object.keys(archivos.combate.datos.peso || {});
            if (niveles.length) det.appendChild(lista(t('Peso del golpe (hitstop)', 'Hit weight (hitstop)'), niveles.map(k => [k, k]), def.hitstop, v => { if (v) def.hitstop = v; else delete def.hitstop; cambio(); }));
            const reac = [...new Set([...Object.keys(archivos.combate.datos.reacciones || {}), ...Object.keys(archivos[estilo].datos.reacciones || {})])];
            det.appendChild(lista(t('Reacción del rival', 'Rival reaction'), [[null, t('la de la tabla', 'from the table')], ...reac.map(k => [k, k])], def.reaccion, v => { if (v) def.reaccion = v; else delete def.reaccion; cambio(); }));
            for (const [k, es, en, min, max, paso] of M.CAMPOS_ATAQUE.avanzado) det.appendChild(numero(t(es, en), def[k] ?? (k === 'velocidadMax' ? 0.6 : 0), min, max, paso, v => { def[k] = v; cambio(); }));
            const arco = Array.isArray(def.arco) ? def.arco : [-60, 60];
            det.appendChild(numero(t('Arco: desde (grados)', 'Arc: from (degrees)'), arco[0], -180, 0, 5, v => { def.arco = [v, arco[1]]; arco[0] = v; cambio(); }));
            det.appendChild(numero(t('Arco: hasta (grados)', 'Arc: to (degrees)'), arco[1], 0, 180, 5, v => { def.arco = [arco[0], v]; arco[1] = v; cambio(); }));
            for (const [k, es, en] of M.CASILLAS_ATAQUE) det.appendChild(casilla(t(es, en), def[k], v => { if (v) def[k] = true; else delete def[k]; cambio(); }));
        }
        det.appendChild(el('p', 'mensaje', t('Marcas guardadas (para revisar): ', 'Saved marks (to review): ') + JSON.stringify({ cancelar: def.cancelar, iframes: def.iframes, armadura: def.armadura })));
        caja.appendChild(det);
        // -- Motor (combate.json) --
        const pM = panel(t('Todos los estilos', 'Every style'));
        for (const [ruta, es, en] of M.CASILLAS_MOTOR) {
            const leer = () => { let o = archivos.combate.datos; for (const k of ruta) o = o && o[k]; return o; };
            pM.appendChild(casilla(t(es, en), leer() !== false, v => {
                let o = archivos.combate.datos; ruta.slice(0, -1).forEach(k => { o[k] = o[k] || {}; o = o[k]; });
                o[ruta[ruta.length - 1]] = v; cambio('combate');
            }));
        }
        // -- Problemas (las reglas de validar, en vivo) --
        const pP = panel(t('Revisión', 'Check'));
        nodoProblemas = el('div'); pP.appendChild(nodoProblemas);
        pintarResumen(); pintarProblemas(); pintarLinea();
        btnGuardar.disabled = !algunoSucio() || !ctx.servidor.escritura;
    }

    async function guardar() {
        rotular('Guardando…', 'Saving…');
        const hechos = [];
        for (const n of Object.keys(archivos).filter(sucio)) {
            const a = archivos[n];
            try {
                const resp = await fetch(`../api/datos/${n}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': a.etag || '*' }, body: JSON.stringify(a.datos) });
                const j = await resp.json().catch(() => ({}));
                if (resp.ok) { a.original = clonar(a.datos); a.etag = j.etag; hechos.push(n); continue; }
                if (resp.status === 412) rotular(`${n}.json cambió en disco: recarga el Estudio.`, `${n}.json changed on disk: reload the Studio.`, 'error');
                else rotular(`${n}.json no se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `${n}.json not saved (${resp.status})`, 'error');
                btnGuardar.disabled = !algunoSucio() || !ctx.servidor.escritura;
                return;
            } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); return; }
        }
        rotular(`Guardado: ${hechos.join(', ')}.`, `Saved: ${hechos.join(', ')}.`, 'ok');
        btnGuardar.disabled = !algunoSucio() || !ctx.servidor.escritura;
    }
    btnGuardar.addEventListener('click', guardar);
    $('co-descartar').addEventListener('click', () => {
        for (const n of Object.keys(archivos)) if (sucio(n)) { archivos[n].datos = clonar(archivos[n].original); ctx.puente.enviarDatos(n, archivos[n].datos); }
        baseRapidez = null; elegida = null; sim = null; iClave = -1; pintar(); pintarCurva();
    });
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'combate' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (algunoSucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(() => pintar());
    // depuración y pruebas de navegador
    paneles = crearPaneles({
        t, el, boton, numero, lista, casilla, archivos, rotular, panel,
        estilo: () => estilo, idioma: () => ctx.idioma,
        cambio: (n, r) => cambio(n, r), repintar: () => pintar(),
        elegirAccion: (g, k) => { panelSel = 'accion'; sel = { grupo: g, clave: k }; nuevaAccion(); pintar(); }
    });
    ctx.combate = {
        archivos, elegir: (e, g, k) => { estilo = e; sel = { grupo: g, clave: k }; nuevaAccion(); if (visor) visor.fijarEstilo(archivos[estilo].datos, archivos[estiloRival()].datos); pintar(); },
        sim: () => simAhora(), irA, medir: i => (visor ? visor.medir(i) : null),
        // N6c
        panel: k => { panelSel = k; pintar(); }, rival: n => { estiloR = n || null; sim = null; if (visor) visor.fijarEstilo(archivos[estilo].datos, archivos[estiloRival()].datos); },
        get ultimoSonido() { return paneles.ultimoSonido || null; }
    };
    window.__estudioCombate = ctx.combate;
    pintar();
    try { visor = await crearVisor($('co-vista')); visor.fijarEstilo(archivos[estilo].datos, archivos[estiloRival()].datos); sim = null; } catch (e) { console.warn('Visor de combate sin WebGL', e); }
    requestAnimationFrame(tick);
}
