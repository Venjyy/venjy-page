// =========================================================
// VENJY · Estudio · paneles Peso, Reacciones, Controles y CPU de la pestaña Combate (bloque 8 · N6c, COMBATE.md §25.2)
// Modelo puro: estudio/combate-paneles-modelo.mjs. Cada panel tiene su vista simple (pocos campos con nombres comunes)
// y «Avanzado» para lo fino. Los cambios van en vivo al juego con el `cambio` de combate.js (combate.json o el estilo)
// y se guardan con su botón Guardar.
//   Peso: hitstop, sacudida, empuje, chispas y cámara lenta por nivel; el sonido por capas con un botón «oír» por capa
//     (WebAudio propio del Estudio, las mismas voces que arma el juego con capasSonido)
//   Reacciones: la tabla altura × nivel, golpes leves seguidos, lo que sube un golpe fuerte o final y la pared
//   Controles: teclas de cada perfil (clic y aprieta una tecla o un botón del ratón), qué hace cada botón en el estilo
//     y los umbrales del táctil
//   CPU: cómo pelea la CPU con este estilo (estilo-*.json → cpu); la dificultad general está en la pestaña Arena
// =========================================================
import * as P from './combate-paneles-modelo.mjs';

export function crearPaneles(h) {
    const { t, el, boton, numero, lista, casilla, archivos } = h;
    const C = () => archivos.combate.datos;
    const E = () => archivos[h.estilo()].datos;
    let nivel = 'medio', material = 'carne', perfil = null, capturando = null;
    const avanzado = {};
    const detalles = (clave, caja) => {
        const d = el('details', 'panel solo-avanzado'); d.open = !!avanzado[clave];
        d.addEventListener('toggle', () => { avanzado[clave] = d.open; });
        d.appendChild(el('summary', '', t('Avanzado', 'Advanced')));
        caja.appendChild(d); return d;
    };
    const nota = (es, en) => el('p', 'mensaje', t(es, en));
    // Un número de combate.json o del estilo por ruta (fijar crea lo que falte)
    const num = (obj, archivo, ruta, [es, en, min, max, paso], valorBase = 0) => {
        const v = P.leer(obj(), ruta);
        return numero(t(es, en), Number.isFinite(v) ? v : valorBase, min, max, paso, x => { P.fijar(obj(), ruta, x); h.cambio(archivo()); });
    };
    // Un par [mín, máx]
    const par = (obj, archivo, ruta, [es, en, min, max, paso]) => {
        const d = el('div');
        for (const [i, s] of [[0, t(' (mín)', ' (min)')], [1, t(' (máx)', ' (max)')]]) d.appendChild(num(obj, archivo, [...ruta, i], [es + s, en + s, min, max, paso]));
        return d;
    };
    const enCombate = () => 'combate', enEstilo = () => h.estilo();

    // ---------- Sonido («oír») ----------
    let ac = null, ruidoBuf = null, ultimo = null;
    function tocar(voces) {
        ultimo = voces;
        try {
            ac = ac || new (window.AudioContext || window.webkitAudioContext)();
            if (ac.state === 'suspended') ac.resume();
            if (!ruidoBuf) {
                ruidoBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
                const d = ruidoBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
            }
            const t0 = ac.currentTime + 0.03;
            for (const v of voces) {
                if (!(v.vol > 0)) continue;
                const ti = t0 + (v.retardo || 0), dur = Math.max(0.01, v.dur || 0.1);
                const g = ac.createGain(); g.gain.setValueAtTime(v.vol, ti); g.gain.exponentialRampToValueAtTime(0.001, ti + dur); g.connect(ac.destination);
                if (v.tipo === 'tono') {
                    const o = ac.createOscillator(); o.type = v.forma || 'sine';
                    o.frequency.setValueAtTime(v.f0 || 440, ti); o.frequency.exponentialRampToValueAtTime(Math.max(20, v.f1 || v.f0 || 440), ti + dur);
                    o.connect(g); o.start(ti); o.stop(ti + dur + 0.02);
                } else {
                    const s = ac.createBufferSource(); s.buffer = ruidoBuf;
                    const f = ac.createBiquadFilter(); f.type = v.filtro || 'bandpass'; f.frequency.value = v.frec || 1000; f.Q.value = v.q ?? 1;
                    s.connect(f).connect(g); s.start(ti, Math.random() * 0.5, dur + 0.05);
                }
            }
        } catch (e) { h.rotular('Este navegador no pudo tocar el sonido.', 'This browser could not play the sound.', 'error'); }
    }
    const oir = capa => tocar(P.vocesDe(C(), nivel, capa, material));

    // ---------- Peso ----------
    function peso(caja) {
        const p = h.panel(t('Peso de los golpes', 'Hit weight'));
        p.appendChild(nota('Cuánto se siente cada golpe. Elige el tipo de golpe y ajusta; el visor de arriba lo muestra (pausa y empuje) y «Oír» lo hace sonar.', 'How much each hit is felt. Pick the kind of hit and adjust; the viewer above shows it (pause and push) and «Hear» plays it.'));
        p.appendChild(lista(t('Tipo de golpe', 'Kind of hit'), P.NIVELES.map(k => [k, t(...P.NOMBRE_NIVEL[k])]), nivel, v => { nivel = v || 'medio'; h.repintar(); }));
        const ruta = k => ['peso', nivel, k];
        for (const [k, es, en, min, max, paso] of P.CAMPOS_PESO) p.appendChild(num(C, enCombate, ruta(k), [es, en, min, max, paso]));
        const lenta = P.leer(C(), ruta('camaraLenta'));
        p.appendChild(casilla(t('Cámara lenta al pegar', 'Slow motion on hit'), !!lenta, v => {
            if (v) P.fijar(C(), ruta('camaraLenta'), { segundos: 0.25, escala: 0.4 }); else delete C().peso[nivel].camaraLenta;
            h.cambio('combate', 'todo');
        }));
        if (lenta) for (const [k, es, en, min, max, paso] of P.CAMPOS_LENTA) p.appendChild(num(C, enCombate, [...ruta('camaraLenta'), k], [es, en, min, max, paso]));
        // Sonido
        const s = h.panel(t('Sonido del golpe', 'Hit sound'));
        s.appendChild(lista(t('Material (lo que choca)', 'Material (what collides)'), P.MATERIALES.map(([k, es, en]) => [k, t(es, en)]), material, v => { material = v || 'carne'; h.repintar(); }));
        const fb = el('div', 'fila-botones');
        for (const [k, es, en] of P.CAPAS) {
            const b = boton(`Oír: ${es}`, `Hear: ${en}`, () => oir(k), 'boton chico' + (k === 'todo' ? '' : ' secundario'));
            b.dataset.capa = k; fb.appendChild(b);
        }
        s.appendChild(fb);
        s.appendChild(num(C, enCombate, ['sonidos', 'niveles', nivel], [`Volumen de «${t(...P.NOMBRE_NIVEL[nivel])}»`, `Volume of «${t(...P.NOMBRE_NIVEL[nivel])}»`, 0, 2, 0.05], 1));
        for (const [r, es, en, min, max, paso, simple] of P.CAMPOS_SONIDO) if (simple) s.appendChild(num(C, enCombate, ['sonidos', ...r], [es, en, min, max, paso], 1));
        // Avanzado
        const d = detalles('peso', caja);
        d.appendChild(el('h3', '', t('Temblor y sacudida (todos los golpes)', 'Shake (every hit)')));
        for (const [r, es, en, min, max, paso] of P.CAMPOS_IMPACTO) d.appendChild(num(C, enCombate, ['impacto', ...r], [es, en, min, max, paso]));
        d.appendChild(el('h3', '', t('Eco y tono', 'Echo and pitch')));
        for (const [r, es, en, min, max, paso, simple] of P.CAMPOS_SONIDO) if (!simple) d.appendChild(num(C, enCombate, ['sonidos', ...r], [es, en, min, max, paso]));
        for (const [capa, es, en] of P.CAPAS) {
            const rv = P.rutaVoces(capa, material);
            if (!rv) continue;
            d.appendChild(el('h3', '', t(`Voces: ${es}`, `Voices: ${en}`) + (capa === 'impacto' ? ` · ${material}` : '')));
            const voces = P.leer(C().sonidos, rv) || [];
            voces.forEach((v, i) => {
                const fila = el('div', 'co-voz');
                fila.appendChild(lista(t(`Voz ${i + 1}`, `Voice ${i + 1}`), [['ruido', t('ruido', 'noise')], ['tono', t('tono', 'tone')]], v.tipo, x => {
                    C().sonidos = C().sonidos || {}; const l = P.leer(C().sonidos, rv);
                    l[i] = x === 'tono' ? { tipo: 'tono', f0: 300, f1: 120, dur: v.dur || 0.1, vol: v.vol || 0.1, forma: 'sine' } : { tipo: 'ruido', frec: 1000, q: 1, dur: v.dur || 0.1, vol: v.vol || 0.1, filtro: 'bandpass' };
                    h.cambio('combate', 'todo');
                }));
                for (const [k, ces, cen, min, max, paso] of P.CAMPOS_VOZ[v.tipo === 'tono' ? 'tono' : 'ruido']) fila.appendChild(num(C, enCombate, ['sonidos', ...rv, i, k], [ces, cen, min, max, paso]));
                const k2 = v.tipo === 'tono' ? 'forma' : 'filtro';
                fila.appendChild(lista(t(k2 === 'forma' ? 'forma' : 'filtro', k2 === 'forma' ? 'wave' : 'filter'), (k2 === 'forma' ? P.FORMAS : P.FILTROS).map(x => [x, x]), v[k2] || (k2 === 'forma' ? 'sine' : 'bandpass'), x => { v[k2] = x; h.cambio('combate'); }));
                fila.appendChild(boton('Quitar voz', 'Remove voice', () => { P.leer(C().sonidos, rv).splice(i, 1); h.cambio('combate', 'todo'); }, 'boton chico secundario'));
                d.appendChild(fila);
            });
            d.appendChild(boton('+ Voz', '+ Voice', () => {
                const l = P.leer(C().sonidos, rv) || (P.fijar(C(), ['sonidos', ...rv], []), P.leer(C().sonidos, rv));
                l.push(l.length ? JSON.parse(JSON.stringify(l[l.length - 1])) : { tipo: 'ruido', frec: 1000, q: 1, dur: 0.08, vol: 0.15, filtro: 'bandpass' });
                h.cambio('combate', 'todo');
            }));
        }
    }

    // ---------- Reacciones ----------
    // Ir a editar una reacción (sus tiempos y su animación) en la vista de la acción
    const grupoReaccion = k => (E().reacciones && E().reacciones[k] ? 'reacciones' : 'comunes');
    const todasReacciones = () => [...new Set([...Object.keys(C().reacciones || {}), ...Object.keys(E().reacciones || {})])];
    function reacciones(caja) {
        const R = todasReacciones(), op = R.map(k => [k, k]);
        const p = h.panel(t('Qué reacción toca', 'Which reaction plays'));
        p.appendChild(nota('Según dónde pega el golpe (fila) y cuánto pesa (columna). Un ataque con su propia reacción no usa la tabla.', 'By where the hit lands (row) and how heavy it is (column). An attack with its own reaction skips the table.'));
        for (const [alt, es, en] of P.ALTURAS) {
            p.appendChild(el('h3', '', t(es, en)));
            const fila = el('div', 'fila-botones');
            for (const niv of P.NIVELES_TABLA) {
                const v = P.leer(C(), ['elegir', 'tabla', alt, niv]);
                fila.appendChild(lista(t(...P.NOMBRE_NIVEL[niv]), op, v, x => { if (x) { P.fijar(C(), ['elegir', 'tabla', alt, niv], x); h.cambio('combate'); } }));
            }
            p.appendChild(fila);
        }
        p.appendChild(num(C, enCombate, ['elegir', 'acumular', 'leves'], ['Golpes leves seguidos que tumban (0 = nunca)', 'Light hits in a row that knock down (0 = never)', 0, 10, 1]));
        // Editar una reacción
        const pe = h.panel(t('Editar una reacción', 'Edit a reaction'));
        let elegida = R[0] || null;
        const fe = el('div', 'fila-botones');
        fe.append(lista(t('Reacción', 'Reaction'), op, elegida, x => { elegida = x; }), boton('Ver y editar', 'View and edit', () => { if (elegida) h.elegirAccion(grupoReaccion(elegida), elegida); }));
        pe.appendChild(fe);
        pe.appendChild(nota('Abre la reacción en la línea de tiempo y el visor (sus tiempos y su animación).', 'Opens the reaction on the timeline and in the viewer (its timing and animation).'));
        // Avanzado
        const d = detalles('reacciones', caja);
        const sube = P.reaccionesDeTabla(C().elegir);
        for (const [cual, es, en] of P.SUBIR) {
            d.appendChild(el('h3', '', t(es, en)));
            for (const k of sube) {
                const v = P.leer(C(), ['elegir', 'subir', cual, k]);
                d.appendChild(lista(k, [[null, t('no cambia', 'stays')], ...op], v, x => {
                    if (x) P.fijar(C(), ['elegir', 'subir', cual, k], x); else if (C().elegir.subir && C().elegir.subir[cual]) delete C().elegir.subir[cual][k];
                    h.cambio('combate');
                }));
            }
        }
        d.appendChild(el('h3', '', t('Leves seguidas: pasan a…', 'Light hits in a row: become…')));
        for (const k of Object.keys(P.leer(C(), ['elegir', 'acumular', 'a']) || {})) d.appendChild(lista(k, op, C().elegir.acumular.a[k], x => { if (x) { C().elegir.acumular.a[k] = x; h.cambio('combate'); } }));
        d.appendChild(el('h3', '', t('Contra la pared', 'Against the wall')));
        for (const [k, es, en, min, max, paso] of P.CAMPOS_PARED) d.appendChild(num(C, enCombate, ['elegir', 'pared', k], [es, en, min, max, paso]));
        d.appendChild(lista(t('Pared: reacción', 'Wall: reaction'), op, P.leer(C(), ['elegir', 'pared', 'reaccion']), x => { if (x) { P.fijar(C(), ['elegir', 'pared', 'reaccion'], x); h.cambio('combate'); } }));
    }

    // ---------- Controles ----------
    function capturar(boton, f) {
        if (capturando) capturando.cancelar();
        const texto = boton.textContent;
        boton.textContent = t('Aprieta una tecla o un botón… (Esc cancela)', 'Press a key or a button… (Esc cancels)');
        boton.classList.add('capturando');
        const fin = () => { window.removeEventListener('keydown', alTeclear, true); window.removeEventListener('mousedown', alClic, true); setTimeout(() => window.removeEventListener('contextmenu', sinMenu, true), 400); capturando = null; };
        const alTeclear = e => { e.preventDefault(); e.stopPropagation(); fin(); if (e.code === 'Escape') { boton.textContent = texto; boton.classList.remove('capturando'); return; } const k = P.codigoDe(e); if (k) f(k); };
        // (el clic que abrió la captura ya pasó: el próximo mousedown es el botón elegido)
        const alClic = e => { e.preventDefault(); e.stopPropagation(); fin(); const k = P.codigoDe(e); if (k) f(k); };
        const sinMenu = e => e.preventDefault();
        window.addEventListener('keydown', alTeclear, true); window.addEventListener('mousedown', alClic, true); window.addEventListener('contextmenu', sinMenu, true);
        capturando = { cancelar: () => { fin(); boton.textContent = texto; boton.classList.remove('capturando'); } };
    }
    function controles(caja) {
        const T = C().teclas || {}, perfiles = Object.keys((T && T.arena) || {});
        if (!perfil || !perfiles.includes(perfil)) perfil = T.perfil && perfiles.includes(T.perfil) ? T.perfil : perfiles[0];
        const nombrePerfil = k => { const x = P.PERFILES.find(q => q[0] === k); return x ? t(x[1], x[2]) : k; };
        const p = h.panel(t('Teclas de la arena', 'Arena keys'));
        p.appendChild(lista(t('Al empezar se usa', 'Used at the start'), perfiles.map(k => [k, nombrePerfil(k)]), T.perfil, v => { if (v) { T.perfil = v; h.cambio('combate'); } }));
        p.appendChild(lista(t('Editar el perfil', 'Edit the profile'), perfiles.map(k => [k, nombrePerfil(k)]), perfil, v => { perfil = v; h.repintar(); }));
        p.appendChild(nota('Clic en una tecla y aprieta la nueva (también sirve un botón del ratón). «+» agrega otra para la misma acción.', 'Click a key and press the new one (a mouse button works too). «+» adds another for the same action.'));
        const choque = P.choques(T, perfil);
        const teclas = (T.arena && T.arena[perfil]) || {};
        for (const [acc, es, en] of P.ACCIONES_TECLA) {
            if (!Array.isArray(teclas[acc])) continue;
            const fila = el('div', 'fila-botones co-tecla');
            fila.appendChild(el('span', 'co-tecla-nombre', t(es, en)));
            teclas[acc].forEach((k, i) => {
                const b = el('button', 'boton chico' + (choque[k] ? ' co-choque' : ''), P.nombreTecla(k, h.idioma())); b.type = 'button';
                b.dataset.accion = acc; b.dataset.i = i;
                if (choque[k]) b.title = t(`También la usa: ${choque[k].filter(a => a !== acc).join(', ')}`, `Also used by: ${choque[k].filter(a => a !== acc).join(', ')}`);
                b.addEventListener('click', () => capturar(b, code => { if (P.ponerTecla(T, perfil, acc, i, code)) h.cambio('combate'); h.repintar(); }));
                fila.appendChild(b);
                if (teclas[acc].length > 1) fila.appendChild(boton('Quitar', 'Remove', () => { if (P.quitarTecla(T, perfil, acc, i)) h.cambio('combate', 'todo'); }, 'boton chico secundario'));
            });
            const mas = boton('+', '+', () => capturar(mas, code => { if (P.ponerTecla(T, perfil, acc, teclas[acc].length, code)) h.cambio('combate'); h.repintar(); }), 'boton chico secundario');
            mas.title = t('Otra tecla para lo mismo', 'Another key for the same');
            fila.appendChild(mas);
            p.appendChild(fila);
        }
        if (Object.keys(choque).length) p.appendChild(el('p', 'mensaje error', t('Hay teclas repetidas (en rojo): una tecla con dos acciones hace las dos.', 'There are repeated keys (in red): a key with two actions does both.')));
        // Botones del estilo
        const ctl = E().controles || {};
        const claves = [...Object.keys(E().ataques || {}), ...Object.keys(E().acciones || {})];
        const pb = h.panel(t('Qué hace cada botón en este estilo', 'What each button does in this style'));
        for (const [b, es, en] of P.BOTONES_ESTILO) {
            const v = ctl[b];
            if (v === undefined) continue;
            if (v && typeof v === 'object') {
                pb.appendChild(el('h3', '', t(es, en)));
                for (const a of P.ALTURAS_CONTROL) if (a in v) pb.appendChild(lista(t(`${es} · ${a}`, `${en} · ${a}`), claves.map(k => [k, k]), v[a], x => { if (x) { v[a] = x; h.cambio(h.estilo()); } }));
            } else pb.appendChild(lista(t(es, en), [[null, t('nada', 'nothing')], ...claves.map(k => [k, k])], v, x => { ctl[b] = x; h.cambio(h.estilo()); }));
        }
        // Táctil
        const pt = h.panel(t('Pantalla táctil', 'Touch screen'));
        pt.appendChild(casilla(t('Vibrar al pegar', 'Vibrate on hit'), P.leer(C(), ['tactil', 'vibracion', 'activa']) !== false, v => { P.fijar(C(), ['tactil', 'vibracion', 'activa'], v); h.cambio('combate'); }));
        for (const [r, es, en, min, max, paso, simple] of P.CAMPOS_TACTIL) if (simple) pt.appendChild(num(C, enCombate, r, [es, en, min, max, paso]));
        const d = detalles('controles', caja);
        for (const [r, es, en, min, max, paso, simple] of P.CAMPOS_TACTIL) if (!simple && P.leer(C(), r) !== undefined) d.appendChild(num(C, enCombate, r, [es, en, min, max, paso]));
    }

    // ---------- CPU ----------
    function cpu(caja) {
        const cpuE = () => { const e = E(); e.cpu = e.cpu || {}; return e.cpu; };
        const datos = E().cpu || {};
        const p = h.panel(t('Cómo pelea la CPU con este estilo', 'How the CPU fights with this style'));
        p.appendChild(nota('Probabilidades de 0 (nunca) a 1 (siempre). La dificultad general (reflejos, desvíos, agresión) está en la pestaña Arena. Prueba los cambios con «Probar en el juego».', 'Chances from 0 (never) to 1 (always). The general difficulty (reflexes, deflects, aggression) is in the Arena tab. Try changes with «Try in the game».'));
        const campos = P.camposCpuDe(datos);
        const poner = (caja2, [r, es, en, min, max, paso]) => caja2.appendChild(Array.isArray(P.leer(datos, r)) ? par(cpuE, enEstilo, r, [es, en, min, max, paso]) : num(cpuE, enEstilo, r, [es, en, min, max, paso]));
        for (const c of campos) if (c[6]) poner(p, c);
        // Por dificultad (lo propio del estilo)
        const pd = P.porDificultadDe(datos);
        if (pd.length) {
            const q = h.panel(t('Según la dificultad', 'By difficulty'));
            for (const [r, es, en] of pd) {
                q.appendChild(el('h3', '', t(es, en)));
                for (const [k, des, den] of P.DIFICULTADES) if (P.leer(datos, [...r, k]) !== undefined) q.appendChild(num(cpuE, enEstilo, [...r, k], [des, den, 0, 1, 0.05]));
            }
        }
        // Peligrosos que usa
        const ataques = Object.keys(E().ataques || {}).filter(k => E().ataques[k].peligro);
        if (datos.peligro && ataques.length) {
            const lp = h.panel(t('Ataques peligrosos que usa', 'Perilous attacks it uses'));
            lp.appendChild(nota('Ninguno marcado = todos los del estilo.', 'None checked = all of the style.'));
            const l = Array.isArray(datos.peligro.lista) ? datos.peligro.lista : [];
            for (const k of ataques) lp.appendChild(casilla(k, l.includes(k), v => {
                const ll = Array.isArray(cpuE().peligro.lista) ? cpuE().peligro.lista : (cpuE().peligro.lista = []);
                const i = ll.indexOf(k);
                if (v && i < 0) ll.push(k); else if (!v && i >= 0) ll.splice(i, 1);
                h.cambio(h.estilo());
            }));
        }
        const d = detalles('cpu', caja);
        for (const c of campos) if (!c[6]) poner(d, c);
        // Cadenas de alturas (Urban Reign)
        if (Array.isArray(datos.cadenas)) {
            d.appendChild(el('h3', '', t('Cadenas de alturas que elige', 'Height chains it picks')));
            datos.cadenas.forEach((cad, i) => {
                const fila = el('div', 'fila-botones');
                const txt = el('input'); txt.type = 'text'; txt.value = (cad.alturas || []).join(' '); txt.style.width = '14em';
                txt.setAttribute('aria-label', t(`Cadena ${i + 1}`, `Chain ${i + 1}`));
                txt.addEventListener('change', () => {
                    const a = txt.value.trim().split(/[\s,]+/).filter(x => P.ALTURAS_CONTROL.includes(x));
                    if (a.length) { cad.alturas = a; h.cambio(h.estilo()); } else txt.value = (cad.alturas || []).join(' ');
                });
                fila.append(el('span', '', t(`Cadena ${i + 1}`, `Chain ${i + 1}`)), txt, num(cpuE, enEstilo, ['cadenas', i, 'peso'], ['peso', 'weight', 0, 10, 0.5]));
                d.appendChild(fila);
            });
            d.appendChild(nota('Alturas separadas por espacio: medio, alto, bajo, adelante. Más peso = la elige más.', 'Heights separated by spaces: medio, alto, bajo, adelante. More weight = picked more.'));
        }
    }

    return { peso, reacciones, controles, cpu, tocar, oir, cancelarCaptura: () => capturando && capturando.cancelar(), get ultimoSonido() { return ultimo; } };
}
