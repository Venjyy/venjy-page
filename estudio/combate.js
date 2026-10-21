// =========================================================
// VENJY · Estudio · pestaña Combate (bloque 8 · N6a, mundo/COMBATE.md §25.2)
// Edita los ataques, movimientos y reacciones de cada estilo (mundo/datos/estilo-*.json, esquema estilo.schema.json) y
// las reacciones comunes y el suelo automático de combate.json (combate.schema.json). Modelo puro: estudio/combate-modelo.mjs.
// Línea de tiempo debajo del juego (reusa el aspecto de la de Escenas): las tres fases se estiran arrastrando su borde
// derecho; debajo, las ventanas de cancelación, los i-frames, la armadura y el avance, arrastrables (escriben marcas
// ancladas a la fase, así la animación y las ventanas siguen a la fase que se estira).
// Vista simple: rapidez, las tres fases con nombres comunes, daño, postura, alcance y empuje; «Avanzado» para el resto.
// Cada cambio va en vivo (mensaje `datos` con el nombre del archivo; el juego cambia el estilo en el lugar). Guardar
// escribe con If-Match cada archivo tocado. Visor 3D y claves de canal: N6b. Peso, Controles, CPU y «Probar»: N6c.
// =========================================================
import * as M from './combate-modelo.mjs';
import { largoFases } from '../mundo/supervivencia/combate/datos.js';
import { reglasEstilo, reglasCombate } from '../mundo/supervivencia/combate/reglas.js';

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

    const sucio = n => JSON.stringify(archivos[n].datos) !== JSON.stringify(archivos[n].original);
    const algunoSucio = () => Object.keys(archivos).some(sucio);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const archivoSel = () => (sel && sel.grupo === 'comunes' ? 'combate' : estilo);
    const defSel = () => (sel ? M.defDe(archivos[archivoSel()].datos, sel.grupo, sel.clave) : null);
    const esAtaque = () => !!sel && sel.grupo === 'ataques';
    // Un cambio: en vivo al juego, pinta lo que haga falta
    const cambio = (n = archivoSel(), repintar = 'linea') => {
        ctx.puente.enviarDatos(n, archivos[n].datos);
        btnGuardar.disabled = !algunoSucio() || !ctx.servidor.escritura;
        if (repintar === 'todo') pintar(); else { pintarLinea(); pintarResumen(); pintarProblemas(); }
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
    }
    selEstilo.addEventListener('change', () => { estilo = selEstilo.value; sel = null; elegida = null; pintar(); });
    selAccion.addEventListener('change', () => { const [g, k] = selAccion.value.split('|'); sel = { grupo: g, clave: k }; elegida = null; baseRapidez = null; pintar(); });

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
        const l = el('div', 'es-linea'); l.appendChild(interior);
        linea.appendChild(l);
    }
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
        const todos = archivoSel() === 'combate' ? reglasCombate(c, { limites }) : reglasEstilo(archivos[estilo].datos, { combate: c, limites });
        const prefijo = sel ? `$.${sel.grupo === 'comunes' ? 'reacciones' : sel.grupo}.${sel.clave}` : '';
        const mios = todos.filter(r => r.texto.startsWith(prefijo + '.') || r.texto.startsWith(prefijo + ':') || r.texto.startsWith(prefijo + ' '));
        if (!mios.length) { nodoProblemas.appendChild(el('p', 'mensaje ok', t('Sin problemas.', 'No problems.'))); return; }
        for (const r of mios) nodoProblemas.appendChild(el('p', 'mensaje ' + (r.tipo === 'error' ? 'error' : ''), r.texto));
    }
    function pintar() {
        pintarSelectores();
        caja.textContent = '';
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
        const det = el('details', 'panel'); det.open = avanzado; det.addEventListener('toggle', () => { avanzado = det.open; });
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
        baseRapidez = null; elegida = null; pintar();
    });
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'combate' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (algunoSucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(() => pintar());
    // depuración y pruebas de navegador
    ctx.combate = { archivos, elegir: (e, g, k) => { estilo = e; sel = { grupo: g, clave: k }; baseRapidez = null; pintar(); } };
    pintar();
}
