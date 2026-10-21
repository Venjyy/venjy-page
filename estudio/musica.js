// =========================================================
// VENJY · Estudio · pestaña Música (estudio/DISENO.md §24)
// Edita mundo/datos/musica.json: temas (bpm, progresión con selector de acordes, capas con rejilla de pasos o piano
// roll) y sintetizadores propios. Reproducir suena aquí con los mismos instrumentos y motor del juego
// (musica-instrumentos.js, musica-motor.js); «Reproducir en el juego» manda el tema por el puente (mensaje `musica`).
// Un tema del código (los de la carrera) se ve tal cual y al primer cambio se copia al JSON como borrador; los del mundo
// son funciones en musica.js: «Crear versión con capas» parte con su tempo. Borrador = el juego no lo usa (DISENO §24).
// Lo puro está en musica-modelo.mjs. Guardar escribe con If-Match, como Inicio.
// =========================================================
import { I } from '../mundo/supervivencia/musica-instrumentos.js';
import { crearSecuenciador, crearReproductorCancion, tocarSinte, revisarTema, revisarCancion, acordeDe, acordeEn, INSTRUMENTOS, BATERIA, TIPOS_CAPA, ONDAS, FILTROS, USOS } from '../mundo/supervivencia/musica-motor.js';
import * as MM from './musica-modelo.mjs';

const { clonar } = MM;
const NOMBRE_INST = {
    piano: ['Piano', 'Piano'], pulsar: ['Cuerda pulsada', 'Plucked string'], banjo: ['Banjo', 'Banjo'], cajita: ['Cajita de música', 'Music box'],
    steel: ['Steel drum', 'Steel drum'], chip: ['Chiptune', 'Chiptune'], bajo: ['Bajo', 'Bass'], bajoSierra: ['Bajo de sierra', 'Saw bass'],
    colchon: ['Colchón (acordes)', 'Pad (chords)'], rhodes: ['Piano eléctrico (acordes)', 'Electric piano (chords)'], kick: ['Bombo', 'Kick'],
    caja: ['Caja', 'Snare'], hat: ['Platillo cerrado', 'Hi-hat'], madera: ['Madera', 'Wood block'], platillo: ['Platillo', 'Cymbal'], cajaGrande: ['Caja grande', 'Big snare']
};
const NOMBRE_TIPO = { ritmo: ['Ritmo (batería)', 'Rhythm (drums)'], rel: ['Sobre el acorde', 'On the chord'], acorde: ['Acorde', 'Chord'], notas: ['Melodía', 'Melody'], arpegio: ['Arpegio', 'Arpeggio'] };
const NOMBRE_USO = { carrera: ['Carrera de gatas', 'Cat race'], mundo: ['Mundo', 'World'], libre: ['Libre', 'Free'] };
const CAMPOS_TEMA = [['bpm', 'BPM', 'BPM', 30, 300, 1], ['vol', 'Volumen', 'Volume', 0, 1, 0.01], ['swing', 'Swing', 'Swing', 0, 0.5, 0.01], ['acordePor', 'Compases por acorde', 'Bars per chord', 1, 8, 1]];
const CAMPOS_SINTE = [
    ['ataque', 'Ataque (s)', 'Attack (s)', 0.001, 4, 0.001], ['caida', 'Caída (s)', 'Release (s)', 0.02, 8, 0.01], ['largo', 'Largo (× nota)', 'Length (× note)', 0, 8, 0.1],
    ['vol', 'Volumen', 'Volume', 0, 2, 0.01], ['transponer', 'Transponer (semitonos)', 'Transpose (semitones)', -48, 48, 1], ['voces', 'Voces', 'Voices', 1, 4, 1],
    ['desafino', 'Desafino (cents)', 'Detune (cents)', 0, 100, 1], ['golpe', 'Nota en un ritmo (MIDI)', 'Note in a rhythm (MIDI)', 0, 127, 1]
];
const FILAS_ROLL = 25, ALTO_FILA = 10, ANCHO_ROTULO = 34;

export async function montarMusica(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const tt = par => t(par[0], par[1]);
    const msg = $('mu-mensaje'), btnGuardar = $('mu-guardar');
    let etag = null, original = null, datos = null;
    try {
        const r = await fetch('../mundo/datos/musica.json', { cache: 'no-cache' });
        if (r.ok) { etag = r.headers.get('ETag'); original = JSON.parse(await r.text()); }
    } catch (e) { /* sin archivo: se crea al guardar */ }
    if (!original) original = { $schema: '../../estudio/esquemas/musica.schema.json', version: 1, instrumentos: {}, temas: {} };
    original.instrumentos = original.instrumentos || {}; original.temas = original.temas || {};
    datos = clonar(original);

    // Estado de la vista (no se guarda)
    let clave = Object.keys(datos.temas)[0] || 'living', sinteSel = Object.keys(datos.instrumentos)[0] || null;
    let progNivel = '', acordeSel = -1, nivel = null;
    const vista = new WeakMap(); // capa → { compas, base } (compás que se ve y nota de abajo del piano roll)
    const solos = new Set(); // índices de capas en solo
    const deshacer = [];
    const alRehacer = []; // f() cuando se deshace o se descartan los cambios: la pestaña Ritmo vuelve a leer las canciones

    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const enJson = () => !!datos.temas[clave];
    // El tema que se ve: el del JSON o, si no hay, el de la carrera tal cual (los del mundo no tienen datos)
    const delCodigo = new Map(); // copia del tema del código que se ve (la misma hasta que se edita: guarda la vista)
    const tema = () => {
        if (datos.temas[clave]) return datos.temas[clave];
        if (MM.usoDeClave(clave) !== 'carrera') return null;
        if (!delCodigo.has(clave)) delCodigo.set(clave, MM.temaDelCodigo(clave));
        return delCodigo.get(clave);
    };
    const P = () => (tema() && tema().pasos) || 16;

    function cambio({ pintarTodo = true } = {}) {
        if (pintarTodo) pintar();
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
        $('mu-deshacer').disabled = !deshacer.length;
        if (enJuego) reenviarJuego();
    }
    // Toda edición pasa por aquí: guarda para deshacer y copia al JSON el tema del código si hace falta
    function editar(f, opciones) {
        deshacer.push(JSON.stringify(datos)); if (deshacer.length > 80) deshacer.shift();
        if (!enJson()) {
            const base = delCodigo.get(clave) || MM.temaDelCodigo(clave);
            if (!base) return;
            delCodigo.delete(clave);
            datos.temas[clave] = base;
            rotular('Copié el tema del código al JSON como borrador: el juego no cambia hasta que lo apliques.', 'Copied the code song to the JSON as a draft: the game does not change until you apply it.');
        }
        f(datos.temas[clave]);
        cambio(opciones);
    }

    // ---------- Audio del Estudio ----------
    let audio = null, reloj = null, cuadro = 0;
    const sec = crearSecuenciador();
    function asegurarAudio() {
        if (!audio) {
            const ac = new AudioContext();
            const salida = ac.createGain(); salida.gain.value = 0.1;
            const eco = ac.createDelay(1); eco.delayTime.value = 0.18;
            const fb = ac.createGain(); fb.gain.value = 0.2;
            const mezcla = ac.createGain(); mezcla.gain.value = 0.15;
            salida.connect(ac.destination); salida.connect(eco); eco.connect(fb); fb.connect(eco); eco.connect(mezcla); mezcla.connect(ac.destination);
            const suelta = ac.createGain(); suelta.gain.value = 0.12; suelta.connect(ac.destination); // notas sueltas (probar)
            audio = { ctx: ac, salida, suelta };
        }
        if (audio.ctx.state === 'suspended') audio.ctx.resume();
        return audio;
    }
    // El tema con las capas en solo (si hay) y sin las mudas
    function temaParaSonar() {
        const T = tema(); if (!T) return null;
        if (!solos.size) return T;
        return { ...T, capas: T.capas.map((c, n) => (solos.has(n) ? { ...c, mudo: false } : { ...c, mudo: true })) };
    }
    const tempo = () => Math.max(0.5, Number($('mu-tempo').value) || 1);
    function pasoAudio() {
        const T = temaParaSonar(); if (!T || !audio) return;
        audio.salida.gain.setTargetAtTime(T.vol === undefined ? 0.1 : T.vol, audio.ctx.currentTime, 0.05);
        sec.avanzar({ I, ctx: audio.ctx, salida: audio.salida, def: T, clave: 'estudio:' + clave, nivel, tempo: tempo(), propios: datos.instrumentos });
    }
    function tocar() {
        if (!tema()) { rotular('Este tema todavía no tiene capas.', 'This song has no layers yet.', 'error'); return; }
        asegurarAudio(); sec.reiniciar();
        if (!reloj) reloj = setInterval(pasoAudio, 25);
        pasoAudio(); $('mu-tocar').classList.add('activo'); $('mu-tocar').textContent = t('Parar', 'Stop');
        if (!cuadro) cuadro = requestAnimationFrame(animar);
    }
    function parar() {
        if (reloj) { clearInterval(reloj); reloj = null; }
        if (audio) audio.salida.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.03);
        sec.reiniciar(); $('mu-tocar').classList.remove('activo'); $('mu-tocar').textContent = t('Reproducir', 'Play');
    }
    const sonandoAqui = () => !!reloj;
    function probarNota(inst, m, dur = 0.4) {
        const A = asegurarAudio(), c = A.ctx, t0 = c.currentTime + 0.02, propio = datos.instrumentos[inst];
        try {
            if (propio) tocarSinte(c, A.suelta, t0, propio, m, dur, 0.6);
            else if (BATERIA.includes(inst)) { if (I[inst]) I[inst](c, A.suelta, t0, 0.6); else I.ruido(c, A.suelta, t0, 0.6, 0.3, 3000, 'bandpass'); }
            else if (inst === 'colchon' || inst === 'rhodes') I[inst](c, A.suelta, t0, [m], dur, 0.6);
            else I[inst](c, A.suelta, t0, m, dur, 0.6);
        } catch (e) { /* nota perdida */ }
    }

    // ---------- Escuchar una sección de una canción (pestaña Ritmo, S10c-2) ----------
    // Toca en bucle la sección elegida, con toda la banda o solo las capas de bajo de su nivel. `fuente()` da { c, n, soloBajo }
    // con los datos vivos; `refrescar()` vuelve a armarla tras una edición sin cortar el sonido.
    const rep = crearReproductorCancion();
    let escucha = null;
    function derivar() {
        const f = escucha.fuente(), est = f && f.c.estructura && f.c.estructura[f.n]; if (!est) return null;
        const nivel = est.nivel || est.seccion;
        const capas = f.soloBajo ? f.c.capas.filter(p => p.bajo && (!p.niveles || p.niveles.includes(nivel))) : f.c.capas;
        return { ...clonar(f.c), estructura: [clonar(est)], capas: clonar(capas), swing: f.c.swing || 0 };
    }
    function pasoEscucha() {
        if (!escucha || !escucha.der) return;
        const A = audio, c = escucha.der;
        A.salida.gain.setTargetAtTime(c.vol === undefined ? 0.1 : c.vol, A.ctx.currentTime, 0.05);
        const sigue = rep.avanzar({ I, ctx: A.ctx, salida: A.salida, propios: datos.instrumentos });
        if (!sigue && A.ctx.currentTime >= rep.inicio + rep.mapa.duracion) rep.empezar(A.ctx, c, { tempo: tempo() }); // bucle
    }
    function escucharSeccion(fuente) {
        pararEscucha(); if (sonandoAqui()) parar();
        escucha = { fuente, der: null, reloj: null };
        escucha.der = derivar(); if (!escucha.der) { escucha = null; return false; }
        const A = asegurarAudio(); rep.empezar(A.ctx, escucha.der, { tempo: tempo() });
        escucha.reloj = setInterval(pasoEscucha, 25); pasoEscucha();
        return true;
    }
    function refrescarEscucha() {
        if (!escucha) return;
        const der = derivar(); if (!der) { pararEscucha(); return; }
        const A = asegurarAudio(), desde = Math.max(0, (rep.segundoEn(A.ctx.currentTime) || 0) % Math.max(0.1, rep.mapa ? rep.mapa.duracion : 1));
        escucha.der = der; rep.empezar(A.ctx, der, { tempo: tempo(), desde, retraso: 0.05 });
    }
    function pararEscucha() {
        if (!escucha) return;
        clearInterval(escucha.reloj); escucha = null; rep.parar();
        if (audio) audio.salida.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.03);
    }

    // ---------- En el juego ----------
    let enJuego = false, reenvio = null;
    function mensajeJuego() {
        const T = temaParaSonar();
        return { accion: 'tocar', tema: T, instrumentos: datos.instrumentos, nivel, tempo: tempo() };
    }
    async function tocarEnJuego() {
        if (enJuego) {
            enJuego = false; pintarBotonJuego();
            try { await ctx.puente.enviar('musica', { accion: 'parar' }); } catch (e) { /* sin juego */ }
            return;
        }
        if (!tema()) { rotular('Este tema todavía no tiene capas.', 'This song has no layers yet.', 'error'); return; }
        if (ctx.juego) ctx.juego.activar();
        try {
            await ctx.puente.enviar('musica', mensajeJuego());
            enJuego = true; pintarBotonJuego();
            rotular('Sonando en el juego (calla su música mientras tanto).', 'Playing in the game (its music is muted meanwhile).', 'ok');
        } catch (e) { rotular(`El juego no lo tocó: ${e.message}. Abre la pestaña Juego (y haz clic una vez en él).`, `The game did not play it: ${e.message}. Open the Game tab (and click it once).`, 'error'); }
    }
    function reenviarJuego() {
        clearTimeout(reenvio);
        reenvio = setTimeout(() => { if (enJuego && tema()) ctx.puente.enviar('musica', mensajeJuego()).catch(() => {}); }, 150);
    }
    function pintarBotonJuego() {
        const b = $('mu-juego'); b.classList.toggle('activo', enJuego);
        b.textContent = enJuego ? t('Parar en el juego', 'Stop in the game') : t('Reproducir en el juego', 'Play in the game');
    }

    // ---------- Pintar ----------
    function opcion(valor, texto) { const o = document.createElement('option'); o.value = valor; o.textContent = texto; return o; }
    function boton(es, en, al, clase = 'boton chico') {
        const b = document.createElement('button'); b.type = 'button'; b.className = clase; b.textContent = t(es, en);
        b.addEventListener('click', al); return b;
    }
    function campoNumero(rotulo, valor, min, max, paso, al, vacio = false) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = rotulo;
        const i = document.createElement('input'); i.type = 'number'; i.min = min; i.max = max; i.step = paso; i.value = valor === undefined || valor === null ? '' : valor;
        if (vacio) i.placeholder = '—';
        i.addEventListener('change', () => {
            if (i.value === '' && vacio) { al(undefined); return; }
            const n = Number(i.value); if (i.value !== '' && Number.isFinite(n)) al(Math.min(max, Math.max(min, n)));
        });
        l.append(s, i); return l;
    }
    function campoTexto(rotulo, valor, al) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = rotulo;
        const i = document.createElement('input'); i.type = 'text'; i.value = valor || ''; i.className = 'mu-texto';
        i.addEventListener('change', () => al(i.value.trim()));
        l.append(s, i); return l;
    }
    function campoSelect(rotulo, valor, opciones, al) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = rotulo;
        const sel = document.createElement('select');
        for (const [v, txt] of opciones) sel.appendChild(opcion(v, txt));
        sel.value = valor; sel.addEventListener('change', () => al(sel.value));
        l.append(s, sel); return l;
    }
    function marca(rotulo, valor, al) {
        const l = document.createElement('label'); l.className = 'casilla-marca';
        const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!valor;
        i.addEventListener('change', () => al(i.checked));
        const s = document.createElement('span'); s.textContent = rotulo;
        l.append(i, s); return l;
    }

    function pintarSelector() {
        const sel = $('mu-tema'); sel.textContent = '';
        const grupos = { json: [t('Tuyos (musica.json)', 'Yours (musica.json)')], carrera: [t('Carrera, en código', 'Race, in code')], mundo: [t('Mundo, en código', 'World, in code')] };
        for (const [origen, [rot]] of Object.entries(grupos)) {
            const g = document.createElement('optgroup'); g.label = rot;
            for (const x of MM.listaTemas(datos).filter(x => x.origen === origen)) {
                const T = datos.temas[x.clave], nombre = T && T.nombre ? ` · ${T.nombre[ctx.idioma] || T.nombre.es}` : '';
                g.appendChild(opcion(x.clave, x.clave + nombre + (x.borrador ? t(' (borrador)', ' (draft)') : '')));
            }
            if (g.children.length) sel.appendChild(g);
        }
        sel.value = clave;
    }
    function pintarEstado() {
        const T = datos.temas[clave], uso = MM.usoDeClave(clave), e = $('mu-estado');
        let es, en;
        if (!T && uso === 'mundo') { es = 'Tema del mundo hecho como función en musica.js: crea una versión con capas para editarlo.'; en = 'World song written as a function in musica.js: create a layered version to edit it.'; }
        else if (!T) { es = 'Tema de la carrera en código: al primer cambio se copia al JSON como borrador.'; en = 'Race song in code: the first change copies it to the JSON as a draft.'; }
        else if (T.borrador) { es = 'Borrador: el juego no lo usa todavía.'; en = 'Draft: the game does not use it yet.'; }
        else if (uso) { es = `Aplicado: reemplaza al tema «${clave}» del juego (${tt(NOMBRE_USO[uso])}).`; en = `Applied: replaces the game song «${clave}» (${tt(NOMBRE_USO[uso])}).`; }
        else { es = 'Listo, pero su clave no es la de ningún tema del juego: pídele a un agente dónde debe sonar (o cámbiale la clave).'; en = 'Ready, but its key is not a game song: ask an agent where it should play (or change its key).'; }
        if (T) { const p = revisarTema(T, datos.instrumentos); if (p.length) { es += ' Avisos: ' + p.join(' · '); en += ' Warnings: ' + p.join(' · '); } }
        e.textContent = t(es, en);
        $('mu-crear').hidden = !!(T || uso !== 'mundo');
        $('mu-borrar').disabled = !T;
        $('mu-duplicar').disabled = !tema();
    }
    function pintarNiveles() {
        const sel = $('mu-nivel'), l = MM.nivelesDe(tema(), clave);
        if (!l.includes(nivel)) nivel = l.includes('corre') ? 'corre' : l.includes('dia') ? 'dia' : l[0];
        sel.textContent = '';
        for (const n of l) sel.appendChild(opcion(n, n));
        sel.value = nivel;
    }

    // Progresión: un botón por compás; al elegir uno aparece el selector de acordes
    function pintarProgresion() {
        const caja = $('mu-prog'), T = tema(); caja.textContent = '';
        $('mu-acordes').hidden = true;
        if (!T) return;
        const fila = document.createElement('div'); fila.className = 'fila-botones mu-prog-fila';
        const niveles = MM.nivelesDe(T, clave).filter(n => n !== 'todo');
        if (niveles.length) {
            fila.appendChild(campoSelect(t('Progresión de', 'Progression for'), progNivel, [['', t('todos los niveles', 'all levels')], ...niveles.map(n => [n, n + (T.progs && T.progs[n] ? ' *' : '')])], v => { progNivel = v; acordeSel = -1; pintarProgresion(); }));
        }
        caja.appendChild(fila);
        const lista = progNivel && T.progs && T.progs[progNivel] ? T.progs[progNivel] : T.prog;
        if (progNivel && !(T.progs && T.progs[progNivel])) {
            caja.appendChild(boton('Darle una progresión propia a este nivel', 'Give this level its own progression', () => editar(X => { X.progs = X.progs || {}; X.progs[progNivel] = [...X.prog]; })));
            return;
        }
        const chips = document.createElement('div'); chips.className = 'mu-chips';
        lista.forEach((a, n) => {
            const b = boton(a, a, () => { acordeSel = acordeSel === n ? -1 : n; pintarProgresion(); }, 'mu-chip' + (n === acordeSel ? ' elegido' : '') + (acordeDe(a, T.acordes) ? '' : ' malo'));
            b.dataset.compas = n; chips.appendChild(b);
        });
        const lista2 = X => (progNivel ? X.progs[progNivel] : X.prog);
        chips.appendChild(boton('+ compás', '+ bar', () => editar(X => { const l = lista2(X); if (l.length < 16) l.push(l[l.length - 1]); })));
        caja.appendChild(chips);
        if (progNivel) caja.appendChild(boton('Usar la progresión general en este nivel', 'Use the general progression on this level', () => editar(X => { delete X.progs[progNivel]; if (!Object.keys(X.progs).length) delete X.progs; })));
        if (acordeSel >= 0 && acordeSel < lista.length) pintarSelectorAcorde(lista[acordeSel], lista2);
    }
    function pintarSelectorAcorde(actual, lista2) {
        const caja = $('mu-acordes'); caja.textContent = ''; caja.hidden = false;
        const p = MM.partirAcorde(actual) || { raiz: 'C', calidad: '' };
        const poner = (raiz, calidad) => {
            const nombre = raiz + calidad;
            editar(X => { lista2(X)[acordeSel] = nombre; });
            const notas = acordeDe(nombre); if (notas) { const A = asegurarAudio(); I.colchon(A.ctx, A.suelta, A.ctx.currentTime + 0.02, notas.map(m => m + 12), 0.9, 0.5); }
        };
        const filaR = document.createElement('div'); filaR.className = 'mu-chips';
        for (const r of MM.RAICES_ACORDE) filaR.appendChild(boton(r, r, () => poner(r, p.calidad), 'mu-chip' + (r === p.raiz ? ' elegido' : '')));
        const filaQ = document.createElement('div'); filaQ.className = 'mu-chips';
        for (const q of MM.CALIDADES_ACORDE) filaQ.appendChild(boton(q || t('mayor', 'major'), q || t('mayor', 'major'), () => poner(p.raiz, q), 'mu-chip' + (q === p.calidad ? ' elegido' : '')));
        const filaA = document.createElement('div'); filaA.className = 'fila-botones';
        filaA.appendChild(boton('Quitar este compás', 'Remove this bar', () => editar(X => { const l = lista2(X); if (l.length > 1) l.splice(acordeSel, 1); acordeSel = -1; })));
        filaA.appendChild(boton('Cerrar', 'Close', () => { acordeSel = -1; pintarProgresion(); }, 'boton chico secundario'));
        caja.append(filaR, filaQ, filaA);
    }

    // Capas: cabecera con sus valores y la rejilla (canvas) del tipo que sea
    const lienzos = []; // [{ cv, capa, n }] para la línea que avanza
    function opcionesInst(tipo) {
        const l = [];
        const codigo = INSTRUMENTOS.filter(i => (tipo === 'ritmo') === BATERIA.includes(i));
        for (const i of codigo) l.push([i, tt(NOMBRE_INST[i] || [i, i])]);
        for (const [k, S] of Object.entries(datos.instrumentos)) l.push([k, `${k}${S.nombre ? ' · ' + (S.nombre[ctx.idioma] || S.nombre.es) : ''} (${t('propio', 'custom')})`]);
        return l;
    }
    function pintarCapas() {
        const caja = $('mu-capas'), T = tema(); caja.textContent = ''; lienzos.length = 0;
        $('mu-agregar').hidden = !T;
        if (!T) return;
        T.capas.forEach((capa, n) => caja.appendChild(pintarCapa(capa, n, T)));
    }
    function pintarCapa(capa, n, T) {
        const tipo = MM.tipoDe(capa), caja = document.createElement('div');
        caja.className = 'mu-capa' + (capa.mudo ? ' muda' : '') + (solos.has(n) ? ' solo' : '');
        const ed = f => editar(X => f(X.capas[n], X));
        const cab = document.createElement('div'); cab.className = 'mu-capa-cab';
        cab.appendChild(campoTexto(t('Nombre', 'Name'), capa.nombre, v => ed(c => { if (v) c.nombre = v.slice(0, 40); else delete c.nombre; })));
        cab.appendChild(campoSelect(t('Tipo', 'Type'), tipo, TIPOS_CAPA.map(x => [x, tt(NOMBRE_TIPO[x])]), v => editar(X => { X.capas[n] = MM.cambiarTipo(X.capas[n], v, P()); })));
        const ops = opcionesInst(tipo);
        if (!ops.some(o => o[0] === capa.inst)) ops.unshift([capa.inst, capa.inst + ' (?)']);
        cab.appendChild(campoSelect(t('Instrumento', 'Instrument'), capa.inst, ops, v => ed(c => { c.inst = v; })));
        cab.appendChild(campoNumero(t('Volumen', 'Volume'), capa.vol, 0, 2, 0.01, v => ed(c => { c.vol = v; })));
        if (tipo !== 'ritmo') cab.appendChild(campoNumero(t('Octava (semitonos)', 'Octave (semitones)'), capa.octava || 0, -48, 48, 1, v => ed(c => { if (v) c.octava = v; else delete c.octava; })));
        if (tipo !== 'ritmo') cab.appendChild(campoNumero(tipo === 'notas' ? t('Duración (vacío: hasta la siguiente)', 'Length (empty: until next)') : t('Duración (pasos)', 'Length (steps)'), capa.dur, 0.05, 64, 0.1, v => ed(c => { if (v === undefined) delete c.dur; else c.dur = v; }), true));
        cab.appendChild(campoNumero(t('Probabilidad', 'Chance'), capa.prob === undefined ? 1 : capa.prob, 0, 1, 0.05, v => ed(c => { if (v >= 1) delete c.prob; else c.prob = v; })));
        if (['ritmo', 'rel', 'notas'].includes(tipo)) {
            cab.appendChild(campoSelect(t('Largo', 'Length'), String(MM.compasesDe(capa, P())), [['1', t('1 compás', '1 bar')], ['4', t('4 compases', '4 bars')]], v => ed(c => MM.ponerCompases(c, Number(v), P()))));
        }
        if (tipo === 'arpegio') cab.appendChild(campoNumero(t('Pasos del arpegio', 'Arpeggio steps'), capa.arpegio.length, 1, 32, 1, v => ed(c => MM.largoArpegio(c, v))));
        if (tipo === 'acorde') cab.appendChild(campoTexto(t('Intervalos (vacío: el acorde)', 'Intervals (empty: the chord)'), (capa.intervalos || []).join(', '), v => ed(c => {
            const l = v.split(/[ ,;]+/).map(Number).filter(x => Number.isInteger(x) && x >= -24 && x <= 48).slice(0, 8);
            if (l.length) c.intervalos = l; else delete c.intervalos;
        })));
        caja.appendChild(cab);

        const marcas = document.createElement('div'); marcas.className = 'mu-capa-marcas';
        const niveles = MM.nivelesDe(T, clave).filter(x => x !== 'todo');
        for (const nv of niveles) marcas.appendChild(marca(nv, !capa.niveles || capa.niveles.includes(nv), v => ed(c => {
            const s = new Set(c.niveles || niveles); if (v) s.add(nv); else s.delete(nv);
            const l = niveles.filter(x => s.has(x));
            if (l.length === niveles.length) delete c.niveles; else c.niveles = l;
        })));
        marcas.appendChild(marca(t('Solo en la 2.ª vuelta', 'Only on 2nd pass'), capa.segunda, v => ed(c => { if (v) c.segunda = true; else delete c.segunda; })));
        marcas.appendChild(marca(t('Muda', 'Muted'), capa.mudo, v => ed(c => { if (v) c.mudo = true; else delete c.mudo; })));
        const bSolo = boton('Solo', 'Solo', () => { if (solos.has(n)) solos.delete(n); else solos.add(n); pintarCapas(); if (enJuego) reenviarJuego(); }, 'boton chico' + (solos.has(n) ? ' activo' : ''));
        marcas.appendChild(bSolo);
        if (n > 0) marcas.appendChild(boton('Subir', 'Up', () => editar(X => { const c = X.capas; [c[n - 1], c[n]] = [c[n], c[n - 1]]; solos.clear(); })));
        if (n < T.capas.length - 1) marcas.appendChild(boton('Bajar', 'Down', () => editar(X => { const c = X.capas; [c[n + 1], c[n]] = [c[n], c[n + 1]]; solos.clear(); })));
        marcas.appendChild(boton('Duplicar', 'Duplicate', () => editar(X => { if (X.capas.length < 24) X.capas.splice(n + 1, 0, clonar(X.capas[n])); solos.clear(); })));
        marcas.appendChild(boton('Quitar', 'Remove', () => editar(X => { X.capas.splice(n, 1); solos.clear(); }), 'boton chico secundario'));
        caja.appendChild(marcas);

        // Compás que se ve (patrones de 4 compases) y octava del piano roll
        const v = vista.get(capa) || { compas: 0, base: null };
        const comp = ['ritmo', 'rel', 'notas'].includes(tipo) ? MM.compasesDe(capa, P()) : 1;
        if (v.compas >= comp) v.compas = 0;
        if (v.base === null) {
            const pat = MM.patron(capa) || [];
            const usadas = pat.filter(x => typeof x === 'number' && (tipo === 'rel' || x > 0));
            v.base = tipo === 'rel' ? Math.min(0, ...usadas, 0) : usadas.length ? Math.min(...usadas) - 2 : 60;
        }
        vista.set(capa, v);
        const nav = document.createElement('div'); nav.className = 'mu-capa-nav';
        if (comp === 4) for (let b = 0; b < 4; b++) nav.appendChild(boton(`${t('Compás', 'Bar')} ${b + 1}`, `Bar ${b + 1}`, () => { v.compas = b; pintarCapas(); }, 'boton chico' + (v.compas === b ? ' activo' : '')));
        if (tipo === 'rel' || tipo === 'notas') {
            nav.appendChild(boton('Más agudo', 'Higher', () => { v.base += 12; pintarCapas(); }));
            nav.appendChild(boton('Más grave', 'Lower', () => { v.base -= 12; pintarCapas(); }));
        }
        if (nav.children.length) caja.appendChild(nav);

        const cv = document.createElement('canvas'); cv.className = 'mu-rejilla';
        caja.appendChild(cv);
        lienzos.push({ cv, capa, n, tipo, v });
        cv.addEventListener('pointerdown', e => alClicRejilla(e, cv, n, tipo, v));
        requestAnimationFrame(() => dibujarRejilla(lienzos.find(x => x.cv === cv), null));
        return caja;
    }
    // Filas de la rejilla: [valor, rótulo] de arriba hacia abajo
    function filasDe(tipo, capa, v) {
        if (tipo === 'ritmo') return [['x', capa.inst]];
        if (tipo === 'acorde') return [[1, t('acorde', 'chord')]];
        if (tipo === 'arpegio') return [3, 2, 1, 0].map(i => [i, `${t('nota', 'note')} ${i + 1}`]);
        const l = [];
        for (let r = FILAS_ROLL - 1; r >= 0; r--) {
            const val = v.base + r;
            l.push([val, tipo === 'rel' ? (val > 0 ? '+' : '') + val : MM.nombreNota(val)]);
        }
        return l;
    }
    function columnas(tipo, capa) { return tipo === 'arpegio' ? capa.arpegio.length : P(); }
    function dibujarRejilla(L, sonando) {
        if (!L || !L.cv.isConnected) return;
        const { cv, capa, tipo, v } = L, filas = filasDe(tipo, capa, v), cols = columnas(tipo, capa);
        const W = Math.max(200, cv.parentElement.clientWidth - 4), alto = tipo === 'ritmo' || tipo === 'acorde' ? 22 : ALTO_FILA;
        const H = filas.length * alto;
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        const g = cv.getContext('2d'), cw = (W - ANCHO_ROTULO) / cols;
        g.fillStyle = '#120d08'; g.fillRect(0, 0, W, H);
        // Columna que suena
        if (sonando) {
            let col = -1;
            if (tipo === 'arpegio') col = sonando.i % cols;
            else if (MM.compasesDe(capa, P()) === 1 || sonando.k % 4 === v.compas) col = sonando.i;
            if (col >= 0) { g.fillStyle = 'rgba(125,140,196,0.35)'; g.fillRect(ANCHO_ROTULO + col * cw, 0, cw, H); }
        }
        const pat = MM.patron(capa), off = v.compas * P();
        filas.forEach(([val, rot], r) => {
            const y = r * alto;
            const negra = tipo === 'notas' && [1, 3, 6, 8, 10].includes(((val % 12) + 12) % 12);
            const raiz = tipo === 'rel' && val % 12 === 0;
            if (negra || raiz) { g.fillStyle = raiz ? 'rgba(127,220,90,0.12)' : 'rgba(0,0,0,0.35)'; g.fillRect(ANCHO_ROTULO, y, W, alto); }
            g.fillStyle = '#aaaaaa'; g.font = (alto > 12 ? 11 : 8) + 'px PixelCraft, monospace'; g.textBaseline = 'middle';
            if (alto > 12 || r % 2 === 0 || raiz) g.fillText(String(rot).slice(0, 6), 2, y + alto / 2);
            for (let c = 0; c < cols; c++) {
                let lleno = 0;
                if (tipo === 'ritmo') lleno = pat[off + c] === 'x' ? 1 : pat[off + c] === 'o' ? 0.5 : 0;
                else if (tipo === 'acorde') lleno = (capa.pasos || []).includes(c) ? 1 : 0;
                else if (tipo === 'arpegio') lleno = capa.arpegio[c] === val ? 1 : 0;
                else lleno = pat[off + c] === val && (tipo === 'rel' || val > 0) ? 1 : 0;
                if (lleno) {
                    g.fillStyle = tipo === 'ritmo' ? (lleno === 1 ? '#ffff55' : '#9a9a33') : '#7fdc5a';
                    g.fillRect(ANCHO_ROTULO + c * cw + 1, y + 1, Math.max(1, cw - 2), alto - 2);
                }
            }
        });
        // Líneas: cada paso tenue, cada pulso (4 pasos; 3 en 3/4) más clara
        const pulso = P() % 4 === 0 ? 4 : 3;
        for (let c = 0; c <= cols; c++) {
            g.fillStyle = c % pulso === 0 && tipo !== 'arpegio' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.08)';
            g.fillRect(Math.round(ANCHO_ROTULO + c * cw), 0, 1, H);
        }
    }
    function alClicRejilla(e, cv, n, tipo, v) {
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * (cv.width / r.width), y = (e.clientY - r.top) * (cv.height / r.height);
        if (x < ANCHO_ROTULO) return;
        const capa = tema().capas[n], filas = filasDe(tipo, capa, v), cols = columnas(tipo, capa);
        const c = Math.floor((x - ANCHO_ROTULO) / ((cv.width - ANCHO_ROTULO) / cols)), fila = filas[Math.floor(y / (cv.height / filas.length))];
        if (c < 0 || c >= cols || !fila) return;
        const j = v.compas * P() + c;
        editar(X => {
            const k = X.capas[n];
            // (el tema del código se copia al editar: su capa es otro objeto, la vista sigue con el mismo compás y octava)
            vista.set(k, v);
            if (tipo === 'ritmo') MM.ciclarGolpe(k, j);
            else if (tipo === 'acorde') MM.alternarPasoAcorde(k, c);
            else if (tipo === 'arpegio') MM.ponerArpegio(k, c, fila[0]);
            else MM.ponerNota(k, j, fila[0]);
        });
        // Se oye lo que se puso
        const T = tema(), k = T.capas[n], ac = acordeEn(T, v.compas, nivel), oct = k.octava || 0;
        if (tipo === 'ritmo') probarNota(k.inst, 60);
        else if (tipo === 'notas' && MM.patron(k)[j]) probarNota(k.inst, fila[0] + oct);
        else if (tipo === 'rel' && MM.patron(k)[j] !== null) probarNota(k.inst, ac[0] + fila[0] + oct);
        else if (tipo === 'arpegio' && k.arpegio[c] !== null) probarNota(k.inst, ac[fila[0] % ac.length] + oct);
    }
    // Línea que avanza mientras suena aquí
    function animar() {
        cuadro = 0;
        if (!sonandoAqui() || ctx.pestana !== 'musica') { for (const L of lienzos) dibujarRejilla(L, null); marcarCompas(-1); return; }
        const p = sec.pasoEn(audio.ctx.currentTime);
        for (const L of lienzos) dibujarRejilla(L, p);
        const T = tema();
        marcarCompas(p && T ? Math.floor(p.k / (T.acordePor || 1)) % ((progNivel && T.progs && T.progs[progNivel]) || T.prog).length : -1);
        cuadro = requestAnimationFrame(animar);
    }
    function marcarCompas(n) { for (const b of document.querySelectorAll('#mu-prog .mu-chip[data-compas]')) b.classList.toggle('sonando', Number(b.dataset.compas) === n); }

    // Panel del tema
    function pintarTema() {
        const caja = $('mu-tema-campos'); caja.textContent = '';
        const T = datos.temas[clave];
        if (!T) { caja.appendChild(Object.assign(document.createElement('p'), { className: 'ayuda', textContent: t('Edita algo (o crea la versión con capas) para tener este tema en tu JSON.', 'Edit something (or create the layered version) to have this song in your JSON.') })); return; }
        const fClave = campoTexto(t('Clave (decide a quién reemplaza)', 'Key (decides what it replaces)'), clave, v => {
            if (v === clave) return;
            try { deshacer.push(JSON.stringify(datos)); MM.renombrar(datos, clave, v); clave = v; cambio(); }
            catch (e) { deshacer.pop(); rotular(e.message, e.message, 'error'); pintarTema(); }
        });
        fClave.classList.add('ancho');
        const dl = document.createElement('datalist'); dl.id = 'mu-claves';
        for (const k of [...USOS.carrera.temas, ...Object.keys(USOS.mundo.temas)]) dl.appendChild(opcion(k, k));
        fClave.querySelector('input').setAttribute('list', 'mu-claves'); fClave.appendChild(dl);
        caja.appendChild(fClave);
        for (const L of ['es', 'en']) caja.appendChild(campoTexto(`${t('Nombre', 'Name')} ${L.toUpperCase()}`, T.nombre && T.nombre[L], v => editar(X => {
            X.nombre = X.nombre || { es: '', en: '' }; X.nombre[L] = v;
            if (!X.nombre.es && !X.nombre.en) delete X.nombre; else { X.nombre.es = X.nombre.es || X.nombre.en; X.nombre.en = X.nombre.en || X.nombre.es; }
        })));
        caja.appendChild(campoSelect(t('Uso', 'Use'), T.uso || 'libre', Object.entries(NOMBRE_USO).map(([k, v]) => [k, tt(v)]), v => editar(X => { X.uso = v; })));
        caja.appendChild(campoSelect(t('Pasos por compás', 'Steps per bar'), String(T.pasos || 16), [8, 12, 16, 24, 32].map(x => [String(x), x === 12 ? '12 (3/4)' : x === 16 ? '16 (4/4)' : String(x)]), v => editar(X => MM.cambiarPasos(X, Number(v)))));
        for (const [k, es, en, min, max, paso] of CAMPOS_TEMA) caja.appendChild(campoNumero(t(es, en), T[k] === undefined ? (k === 'acordePor' ? 1 : k === 'swing' ? 0 : '') : T[k], min, max, paso, v => editar(X => {
            if ((k === 'swing' && !v) || (k === 'acordePor' && v === 1)) delete X[k]; else X[k] = v;
        })));
        const b = marca(t('Borrador (el juego no lo usa)', 'Draft (the game ignores it)'), T.borrador, v => editar(X => { if (v) X.borrador = true; else delete X.borrador; }));
        b.classList.add('ancho'); caja.appendChild(b);
    }

    // Sintetizadores propios
    function pintarSintes() {
        const sel = $('mu-sinte'); sel.textContent = '';
        for (const k of Object.keys(datos.instrumentos)) sel.appendChild(opcion(k, k));
        if (sinteSel && !datos.instrumentos[sinteSel]) sinteSel = Object.keys(datos.instrumentos)[0] || null;
        sel.value = sinteSel || '';
        const caja = $('mu-sinte-campos'); caja.textContent = '';
        $('mu-sinte-borrar').disabled = $('mu-sinte-duplicar').disabled = !sinteSel;
        $('mu-teclado').hidden = !sinteSel;
        if (!sinteSel) return;
        const S = datos.instrumentos[sinteSel];
        const edS = f => { deshacer.push(JSON.stringify(datos)); f(datos.instrumentos[sinteSel]); cambio({ pintarTodo: false }); pintarSintes(); };
        const fClave = campoTexto(t('Clave', 'Key'), sinteSel, v => {
            if (v === sinteSel) return;
            if (!/^[a-z][a-zA-Z0-9_-]{0,31}$/.test(v) || INSTRUMENTOS.includes(v) || datos.instrumentos[v]) { rotular('Clave no válida o ya usada.', 'Invalid or used key.', 'error'); pintarSintes(); return; }
            deshacer.push(JSON.stringify(datos));
            datos.instrumentos = Object.fromEntries(Object.entries(datos.instrumentos).map(([k, x]) => [k === sinteSel ? v : k, x]));
            for (const T of Object.values(datos.temas)) for (const c of T.capas || []) if (c.inst === sinteSel) c.inst = v;
            sinteSel = v; cambio();
        });
        fClave.classList.add('ancho'); caja.appendChild(fClave);
        for (const L of ['es', 'en']) caja.appendChild(campoTexto(`${t('Nombre', 'Name')} ${L.toUpperCase()}`, S.nombre && S.nombre[L], v => edS(X => {
            X.nombre = X.nombre || { es: '', en: '' }; X.nombre[L] = v;
            if (!X.nombre.es && !X.nombre.en) delete X.nombre; else { X.nombre.es = X.nombre.es || X.nombre.en; X.nombre.en = X.nombre.en || X.nombre.es; }
        })));
        caja.appendChild(campoSelect(t('Onda', 'Wave'), S.onda || 'square', ONDAS.map(o => [o, o === 'ruido' ? t('ruido', 'noise') : o]), v => edS(X => { X.onda = v; })));
        caja.appendChild(campoSelect(t('Curva', 'Curve'), S.curva || 'exp', [['exp', t('exponencial', 'exponential')], ['lineal', t('lineal', 'linear')]], v => edS(X => { if (v === 'exp') delete X.curva; else X.curva = v; })));
        for (const [k, es, en, min, max, paso] of CAMPOS_SINTE) caja.appendChild(campoNumero(t(es, en), S[k], min, max, paso, v => edS(X => { if (v === undefined) delete X[k]; else X[k] = v; }), true));
        // Filtro
        const F = S.filtro;
        caja.appendChild(campoSelect(t('Filtro', 'Filter'), F ? F.tipo || 'lowpass' : '', [['', t('ninguno', 'none')], ...FILTROS.map(f => [f, f])], v => edS(X => { if (!v) delete X.filtro; else X.filtro = { frec: 2000, q: 1, ...(X.filtro || {}), tipo: v }; })));
        if (F) {
            caja.appendChild(campoNumero(t('Frecuencia (Hz)', 'Frequency (Hz)'), F.frec, 20, 20000, 10, v => edS(X => { X.filtro.frec = v === undefined ? 2000 : v; }), true));
            caja.appendChild(campoNumero(t('Barrido hasta (Hz)', 'Sweep to (Hz)'), F.hasta, 20, 20000, 10, v => edS(X => { if (v === undefined) delete X.filtro.hasta; else X.filtro.hasta = v; }), true));
            caja.appendChild(campoNumero(t('Resonancia (Q)', 'Resonance (Q)'), F.q, 0, 30, 0.1, v => edS(X => { if (v === undefined) delete X.filtro.q; else X.filtro.q = v; }), true));
        }
        // Barrido de tono y vibrato
        caja.appendChild(campoNumero(t('Tono: parte desde (semitonos)', 'Pitch: starts at (semitones)'), S.tono && S.tono.desde, -48, 48, 1, v => edS(X => { if (!v) delete X.tono; else X.tono = { tiempo: 0.1, ...(X.tono || {}), desde: v }; }), true));
        if (S.tono) caja.appendChild(campoNumero(t('Tono: en (s)', 'Pitch: over (s)'), S.tono.tiempo, 0.005, 2, 0.005, v => edS(X => { X.tono.tiempo = v === undefined ? 0.1 : v; }), true));
        caja.appendChild(campoNumero(t('Vibrato (cents)', 'Vibrato (cents)'), S.vibrato && S.vibrato.cents, 0, 200, 1, v => edS(X => { if (!v) delete X.vibrato; else X.vibrato = { frec: 5, ...(X.vibrato || {}), cents: v }; }), true));
        if (S.vibrato) caja.appendChild(campoNumero(t('Vibrato (veces/s)', 'Vibrato (rate)'), S.vibrato.frec, 0.1, 20, 0.1, v => edS(X => { X.vibrato.frec = v === undefined ? 5 : v; }), true));
        // Armónicos
        (S.armonicos || []).forEach((h, i) => {
            caja.appendChild(campoSelect(`${t('Armónico', 'Harmonic')} ${i + 1}`, h.onda || 'sine', ONDAS.filter(o => o !== 'ruido').map(o => [o, o]), v => edS(X => { X.armonicos[i].onda = v; })));
            caja.appendChild(campoNumero(t('× frecuencia', '× frequency'), h.ratio === undefined ? 2 : h.ratio, 0.25, 16, 0.01, v => edS(X => { X.armonicos[i].ratio = v; })));
            caja.appendChild(campoNumero(t('Volumen', 'Volume'), h.vol === undefined ? 0.3 : h.vol, 0, 1, 0.01, v => edS(X => { X.armonicos[i].vol = v; })));
            caja.appendChild(boton('Quitar armónico', 'Remove harmonic', () => edS(X => { X.armonicos.splice(i, 1); if (!X.armonicos.length) delete X.armonicos; }), 'boton chico secundario'));
        });
        if ((S.armonicos || []).length < 4) caja.appendChild(boton('Agregar armónico', 'Add harmonic', () => edS(X => { X.armonicos = X.armonicos || []; X.armonicos.push({ onda: 'sine', ratio: 2, vol: 0.3 }); })));
    }
    function pintarTeclado() {
        const caja = $('mu-teclado'); caja.textContent = '';
        for (let m = 60; m <= 72; m++) {
            const b = boton(MM.nombreNota(m), MM.nombreNota(m), () => sinteSel && probarNota(sinteSel, m, 0.5), 'mu-tecla' + ([1, 3, 6, 8, 10].includes(m % 12) ? ' negra' : ''));
            caja.appendChild(b);
        }
    }

    function pintar() {
        pintarSelector(); pintarEstado(); pintarNiveles(); pintarProgresion(); pintarCapas(); pintarTema(); pintarSintes();
        if (sonandoAqui() && !cuadro) cuadro = requestAnimationFrame(animar);
    }

    // ---------- Guardar ----------
    async function guardar() {
        for (const [k, T] of Object.entries(datos.temas)) {
            const p = revisarTema(T, datos.instrumentos);
            if (p.length) { rotular(`El tema «${k}» tiene problemas: ${p.slice(0, 2).join(' · ')}`, `Song «${k}» has problems: ${p.slice(0, 2).join(' · ')}`, 'error'); return; }
        }
        for (const [k, C] of Object.entries(datos.canciones || {})) {
            const p = revisarCancion(C, datos.instrumentos);
            if (p.length) { rotular(`La canción «${k}» tiene problemas: ${p.slice(0, 2).join(' · ')}`, `Song «${k}» has problems: ${p.slice(0, 2).join(' · ')}`, 'error'); return; }
        }
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/musica', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B). El juego abierto con ?estudio ya lo usa.`, `Saved (${j.bytes} B). The game open with ?estudio already uses it.`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }

    // ---------- Eventos ----------
    $('mu-tema').addEventListener('change', e => { clave = e.target.value; progNivel = ''; acordeSel = -1; solos.clear(); sec.reiniciar(); pintar(); if (enJuego) reenviarJuego(); });
    $('mu-nivel').addEventListener('change', e => { nivel = e.target.value; if (enJuego) reenviarJuego(); });
    $('mu-tempo').addEventListener('change', () => { if (enJuego) reenviarJuego(); });
    $('mu-tocar').addEventListener('click', () => (sonandoAqui() ? parar() : tocar()));
    $('mu-juego').addEventListener('click', tocarEnJuego);
    $('mu-nuevo').addEventListener('click', () => { deshacer.push(JSON.stringify(datos)); const k = MM.claveLibre(datos); datos.temas[k] = MM.temaNuevo(); clave = k; solos.clear(); cambio(); });
    $('mu-duplicar').addEventListener('click', () => {
        const T = tema(); if (!T) return;
        deshacer.push(JSON.stringify(datos)); const k = MM.claveLibre(datos, clave + '-'); datos.temas[k] = { ...clonar(T), borrador: true }; clave = k; solos.clear(); cambio();
    });
    $('mu-crear').addEventListener('click', () => editar(() => {}));
    $('mu-borrar').addEventListener('click', () => {
        if (!datos.temas[clave] || !confirm(t(`¿Borrar el tema «${clave}» de musica.json? (Puedes deshacer antes de guardar.)`, `Delete song «${clave}» from musica.json? (You can undo before saving.)`))) return;
        deshacer.push(JSON.stringify(datos)); delete datos.temas[clave];
        clave = Object.keys(datos.temas)[0] || 'living'; solos.clear(); cambio();
    });
    for (const b of document.querySelectorAll('#mu-agregar [data-tipo]')) b.addEventListener('click', () => editar(X => { if (X.capas.length < 24) X.capas.push(MM.capaNueva(b.dataset.tipo, X.pasos || 16)); }));
    $('mu-sinte').addEventListener('change', e => { sinteSel = e.target.value; pintarSintes(); });
    $('mu-sinte-nuevo').addEventListener('click', () => {
        deshacer.push(JSON.stringify(datos));
        let n = 1; while (datos.instrumentos['sinte' + n]) n++;
        sinteSel = 'sinte' + n; datos.instrumentos[sinteSel] = MM.sinteNuevo(); cambio();
    });
    $('mu-sinte-duplicar').addEventListener('click', () => {
        if (!sinteSel) return;
        deshacer.push(JSON.stringify(datos));
        let n = 2; while (datos.instrumentos[sinteSel + n]) n++;
        datos.instrumentos[sinteSel + n] = clonar(datos.instrumentos[sinteSel]); sinteSel = sinteSel + n; cambio();
    });
    $('mu-sinte-borrar').addEventListener('click', () => {
        if (!sinteSel) return;
        const usan = Object.entries(datos.temas).filter(([, T]) => (T.capas || []).some(c => c.inst === sinteSel)).map(([k]) => k);
        if (usan.length) { rotular(`Lo usan: ${usan.join(', ')}. Cámbiales el instrumento primero.`, `Used by: ${usan.join(', ')}. Change their instrument first.`, 'error'); return; }
        deshacer.push(JSON.stringify(datos)); delete datos.instrumentos[sinteSel]; sinteSel = null; cambio();
    });
    $('mu-deshacer').addEventListener('click', () => {
        if (!deshacer.length) return;
        datos = JSON.parse(deshacer.pop());
        if (!tema() && !(MM.usoDeClave(clave))) clave = Object.keys(datos.temas)[0] || 'living';
        cambio(); alRehacer.forEach(f => f());
    });
    $('mu-descartar').addEventListener('click', () => { deshacer.push(JSON.stringify(datos)); datos = clonar(original); if (!tema() && !MM.usoDeClave(clave)) clave = Object.keys(datos.temas)[0] || 'living'; cambio(); alRehacer.forEach(f => f()); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana !== 'musica') return;
        const enCampo = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName);
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !enCampo) { e.preventDefault(); $('mu-deshacer').click(); }
        else if (e.key === ' ' && !enCampo) { e.preventDefault(); $('mu-tocar').click(); }
    });
    window.addEventListener('resize', () => { if (ctx.pestana === 'musica') for (const L of lienzos) dibujarRejilla(L, null); });
    ctx.alPestana.push(p => { if (p === 'musica') pintar(); else if (sonandoAqui()) parar(); if (p !== 'ritmo') pararEscucha(); });
    ctx.alIdioma.push(() => { pintar(); pintarTeclado(); pintarBotonJuego(); $('mu-tocar').textContent = sonandoAqui() ? t('Parar', 'Stop') : t('Reproducir', 'Play'); });
    // La pestaña Ritmo (S10c) edita `canciones` dentro de este mismo JSON: comparte datos, deshacer, envío en vivo y Guardar.
    ctx.musica = {
        datos: () => datos, sucio, guardar, alRehacer, mensaje: () => msg.textContent, puedeDeshacer: () => deshacer.length > 0,
        editar(f) { deshacer.push(JSON.stringify(datos)); if (deshacer.length > 80) deshacer.shift(); f(datos); ctx.puente.enviarDatos('musica', datos); cambio({ pintarTodo: ctx.pestana === 'musica' }); },
        escuchar: { tocar: escucharSeccion, refrescar: refrescarEscucha, parar: pararEscucha, sonando: () => !!escucha },
        deshacer() { $('mu-deshacer').click(); },
        descartar() { $('mu-descartar').click(); }
    };
    // Para las pruebas de navegador y la depuración
    window.__estudioMusica = { get datos() { return datos; }, get clave() { return clave; }, elegir(k) { clave = k; pintar(); }, tocar, parar, pasoEn: () => audio && sec.pasoEn(audio.ctx.currentTime) };
    pintarTeclado(); pintarBotonJuego(); pintar();
    btnGuardar.disabled = true; $('mu-deshacer').disabled = true;
}
