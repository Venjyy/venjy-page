// =========================================================
// VENJY · Estudio · pestaña Inicio: menú de inicio de la supervivencia (estudio/DISENO.md §21)
// Edita mundo/datos/inicio.json: logo, subtítulo y pie (ES/EN), la lista de frases amarillas que saltan junto al
// logo (sale una al azar) y cómo se ve la frase (color, giro, latido, ritmo y posición). Vista previa propia con las
// mismas reglas que supervivencia.css; «Abrir el menú real» lo muestra en otra pestaña. También la pantalla de carga,
// la presentación «Venjy presenta» (textos, colores, tiempos y el logo, que se pinta con el mouse sobre la vista previa)
// y el fondo de cine detrás del menú (ajustes y planos; «Ver» abre el menú real con ese plano). Lo que falte usa INICIO
// (mundo/supervivencia/inicio-datos.js). Guardar escribe con If-Match, como Objetos.
// =========================================================
import { INICIO, ORDEN_CARGA, datosInicio, avanceCarga } from '../mundo/supervivencia/inicio-datos.js';
import { decodificar, DIGITOS } from '../mundo/datos/pixeles.js';
import { instalarDeshacer, botonJuego } from './campo-comun.js';

const clonar = o => JSON.parse(JSON.stringify(o));
const TEXTOS = [['logo', 'Logo', 'Logo'], ['sub', 'Subtítulo', 'Subtitle'], ['pie', 'Pie', 'Footer']];
const ASPECTO = [
    ['giro', 'Giro (grados)', 'Tilt (degrees)', -90, 90, 1],
    ['pulso', 'Latido (0,1 = 10 %)', 'Pulse (0.1 = 10 %)', 0, 1, 0.01],
    ['ritmo', 'Latidos por segundo', 'Beats per second', 0, 10, 0.1],
    ['x', 'X (% desde la derecha)', 'X (% from the right)', -100, 100, 1],
    ['y', 'Y (% desde abajo)', 'Y (% from the bottom)', -100, 150, 1]
];

export async function montarInicio(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const msg = $('in-mensaje'), btnGuardar = $('in-guardar');
    let etag = null, original = null, datos = null, indiceFrase = 0, indiceConsejo = 0, etapaVista = ORDEN_CARGA[0];
    try {
        const r = await fetch('../mundo/datos/inicio.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text());
    } catch (e) { msg.textContent = 'No se pudo leer mundo/datos/inicio.json'; return; }
    // Se edita sobre lo real (código + JSON): así los campos nunca salen vacíos
    const completar = o => { const d = datosInicio(o); return { ...o, titulo: d.titulo, carga: d.carga, presentacion: d.presentacion, fondo: d.fondo }; };
    original = completar(original);
    datos = clonar(original);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const cambio = () => { vista(); vistaCarga(); vistaPresentacion(); btnGuardar.disabled = !sucio() || !ctx.servidor.escritura; hist.anotar(); };
    // Deshacer (botón y Ctrl+Z) y punto en la pestaña (campo-comun.js, B0-C)
    const hist = instalarDeshacer(ctx, { pestana: 'inicio', idBoton: 'in-descartar', leer: () => JSON.stringify(datos), poner: x => { datos = JSON.parse(x); pintar(); cambio(); } });
    ctx.sucios.inicio = sucio;
    // Aquí se edita sobre lo real (código + JSON): «volver al valor del juego» pone el valor que trae el código en esa ruta
    const BASE = completar({});
    const enRuta = (o, ruta) => ruta.reduce((x, k) => (x == null ? x : x[k]), o);
    // Vista simple (B0-V): textos, frases, colores y planos con nombre y duración; pesos, tamaños, tiempos, ajustes del
    // fondo y posiciones de los planos, en Avanzado
    const avanzado = el => { el.classList.add('solo-avanzado'); return el; };

    function vista() {
        const T = datos.titulo, L = ctx.idioma;
        $('in-v-logo').textContent = T.logo[L] || T.logo.es;
        $('in-v-sub').textContent = T.sub[L] || T.sub.es;
        $('in-v-pie').textContent = T.pie[L] || T.pie.es;
        const f = $('in-v-frase'), v = T.frase, fr = T.frases[indiceFrase % Math.max(1, T.frases.length)];
        f.textContent = fr ? fr[L] || fr.es : '';
        f.style.setProperty('--frase-color', v.color);
        f.style.setProperty('--frase-giro', v.giro + 'deg');
        f.style.setProperty('--frase-pulso', 1 + v.pulso);
        f.style.setProperty('--frase-ritmo', v.ritmo > 0 ? (1 / v.ritmo).toFixed(3) + 's' : '0s');
        f.style.setProperty('--frase-x', v.x + '%');
        f.style.setProperty('--frase-y', v.y + '%');
    }

    function vistaCarga() {
        const C = datos.carga, L = ctx.idioma, a = C.aspecto, v = $('in-c-vista');
        const T = x => (x && (x[L] || x.es)) || '';
        v.style.setProperty('--c-fondo', a.fondo); v.style.setProperty('--c-fondo2', a.fondo2);
        v.style.setProperty('--c-barra', a.barra); v.style.setProperty('--c-barra-fondo', a.barraFondo);
        v.style.setProperty('--c-texto', a.texto); v.style.setProperty('--c-cuadro', Math.round(a.cuadro / 2) + 'px');
        $('in-c-titulo').textContent = T(C.titulo);
        $('in-c-relleno').style.width = avanceCarga(datos, etapaVista) + '%';
        $('in-c-etapa').textContent = T(C.etapas[etapaVista] && C.etapas[etapaVista].nombre);
        const c = C.consejos[indiceConsejo % Math.max(1, C.consejos.length)];
        $('in-c-consejo').textContent = c ? `${T(C.rotuloConsejo)}: ${T(c)}` : '';
    }
    function campoNumero(rotulo, valor, min, max, paso, al, ruta) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = rotulo;
        const i = document.createElement('input'); i.type = 'number'; i.min = min; i.max = max; i.step = paso; i.value = valor;
        i.addEventListener('input', () => { const n = Number(i.value); if (i.value !== '' && Number.isFinite(n)) al(Math.min(max, Math.max(min, n))); });
        l.append(s, i);
        const base = ruta ? enRuta(BASE, ruta) : undefined;
        if (typeof base === 'number') l.append(botonJuego(ctx, { tiene: () => enRuta(datos, ruta) !== base, quitar: () => { enRuta(datos, ruta.slice(0, -1))[ruta[ruta.length - 1]] = base; cambio(); }, repintar: pintar }));
        return l;
    }
    function campoColor(rotulo, valor, al) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = rotulo;
        const i = document.createElement('input'); i.type = 'color'; i.value = valor;
        i.addEventListener('input', () => al(i.value));
        l.append(s, i); return l;
    }
    function pintarCarga() {
        const C = datos.carga, caja = $('in-c-textos'); caja.textContent = '';
        for (const [k, es, en] of [['titulo', 'Título', 'Title'], ['rotuloConsejo', 'Rótulo del consejo', 'Tip label']]) for (const L of ['es', 'en']) {
            caja.appendChild(campoTexto(`${t(es, en)} ${L.toUpperCase()}`, C[k][L], v => { C[k][L] = v || INICIO.carga[k][L]; cambio(); }));
        }
        for (const k of ORDEN_CARGA) {
            const e = C.etapas[k];
            for (const L of ['es', 'en']) caja.appendChild(campoTexto(`${t('Etapa', 'Stage')} ${k} ${L.toUpperCase()}`, e.nombre[L], v => { e.nombre[L] = v || INICIO.carga.etapas[k].nombre[L]; etapaVista = k; cambio(); }));
            caja.appendChild(avanzado(campoNumero(`${t('Peso en la barra', 'Bar weight')} · ${k}`, e.peso, 0.1, 100, 0.5, n => { e.peso = n; etapaVista = k; cambio(); }, ['carga', 'etapas', k, 'peso'])));
        }
        const sel = $('in-c-sel'); sel.textContent = '';
        for (const k of ORDEN_CARGA) { const o = document.createElement('option'); o.value = k; o.textContent = k; o.selected = k === etapaVista; sel.appendChild(o); }
        const ac = $('in-c-aspecto'); ac.textContent = '';
        const a = C.aspecto;
        for (const [k, es, en] of [['fondo', 'Tierra (tono 1)', 'Dirt (tone 1)'], ['fondo2', 'Tierra (tono 2)', 'Dirt (tone 2)'], ['barra', 'Barra', 'Bar'], ['barraFondo', 'Fondo de la barra', 'Bar background'], ['texto', 'Texto', 'Text']])
            ac.appendChild(campoColor(t(es, en), a[k], v => { a[k] = v; cambio(); }));
        ac.appendChild(avanzado(campoNumero(t('Tamaño del cuadro de tierra (px)', 'Dirt tile size (px)'), a.cuadro, 8, 256, 1, n => { a.cuadro = n; cambio(); }, ['carga', 'aspecto', 'cuadro'])));
        ac.appendChild(avanzado(campoNumero(t('Tiempo mínimo visible (s)', 'Minimum time shown (s)'), C.tiempos.minimo, 0, 10, 0.1, n => { C.tiempos.minimo = n; cambio(); }, ['carga', 'tiempos', 'minimo'])));
        ac.appendChild(avanzado(campoNumero(t('Desvanecido (s)', 'Fade out (s)'), C.tiempos.salida, 0, 3, 0.05, n => { C.tiempos.salida = n; cambio(); }, ['carga', 'tiempos', 'salida'])));
        const lc = $('in-consejos'); lc.textContent = '';
        C.consejos.forEach((f, n) => {
            const fila = document.createElement('div'); fila.className = 'fila-texto in-fila';
            for (const L of ['es', 'en']) {
                const ta = document.createElement('textarea'); ta.value = f[L]; ta.rows = 2; ta.maxLength = 140; ta.spellcheck = false;
                ta.setAttribute('aria-label', `${t('Consejo', 'Tip')} ${n + 1} ${L.toUpperCase()}`);
                ta.addEventListener('focus', () => { indiceConsejo = n; vistaCarga(); });
                ta.addEventListener('input', () => { f[L] = ta.value; fila.classList.toggle('con-error', !f.es.trim() || !f.en.trim()); cambio(); });
                fila.appendChild(ta);
            }
            const quitar = document.createElement('button'); quitar.type = 'button'; quitar.className = 'boton chico secundario';
            quitar.textContent = t('Quitar', 'Remove');
            quitar.addEventListener('click', () => { C.consejos.splice(n, 1); pintarCarga(); cambio(); });
            fila.appendChild(quitar);
            lc.appendChild(fila);
        });
        vistaCarga();
    }

    function campoTexto(rotulo, valor, al) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = rotulo;
        const i = document.createElement('input'); i.type = 'text'; i.value = valor; i.maxLength = 80; i.spellcheck = false;
        i.addEventListener('input', () => al(i.value));
        l.append(s, i); return l;
    }
    function pintarTextos() {
        const caja = $('in-textos'); caja.textContent = '';
        for (const [k, es, en] of TEXTOS) for (const L of ['es', 'en']) {
            caja.appendChild(campoTexto(`${t(es, en)} ${L.toUpperCase()}`, datos.titulo[k][L], v => { datos.titulo[k][L] = v || INICIO.titulo[k][L]; cambio(); }));
        }
    }
    function pintarAspecto() {
        const caja = $('in-aspecto'); caja.textContent = '';
        const v = datos.titulo.frase;
        const lc = document.createElement('label'); lc.className = 'campo';
        const sc = document.createElement('span'); sc.textContent = t('Color', 'Color');
        const ic = document.createElement('input'); ic.type = 'color'; ic.value = v.color;
        ic.addEventListener('input', () => { v.color = ic.value; cambio(); });
        lc.append(sc, ic); caja.appendChild(lc);
        for (const [k, es, en, min, max, paso] of ASPECTO) {
            const l = document.createElement('label'); l.className = 'campo';
            const s = document.createElement('span'); s.textContent = t(es, en);
            const i = document.createElement('input'); i.type = 'number'; i.min = min; i.max = max; i.step = paso; i.value = v[k];
            i.addEventListener('input', () => { const n = Number(i.value); if (i.value !== '' && Number.isFinite(n)) { v[k] = Math.min(max, Math.max(min, n)); cambio(); } });
            l.append(s, i); caja.appendChild(avanzado(l));
        }
    }
    function pintarFrases() {
        const caja = $('in-frases'); caja.textContent = '';
        datos.titulo.frases.forEach((f, n) => {
            const fila = document.createElement('div'); fila.className = 'fila-texto in-fila';
            for (const L of ['es', 'en']) {
                const ta = document.createElement('textarea'); ta.value = f[L]; ta.rows = 1; ta.maxLength = 60; ta.spellcheck = false;
                ta.setAttribute('aria-label', `${t('Frase', 'Splash')} ${n + 1} ${L.toUpperCase()}`);
                ta.addEventListener('focus', () => { indiceFrase = n; vista(); });
                ta.addEventListener('input', () => { f[L] = ta.value; fila.classList.toggle('con-error', !f.es.trim() || !f.en.trim()); cambio(); });
                fila.appendChild(ta);
            }
            const quitar = document.createElement('button'); quitar.type = 'button'; quitar.className = 'boton chico secundario';
            quitar.textContent = t('Quitar', 'Remove');
            quitar.addEventListener('click', () => { datos.titulo.frases.splice(n, 1); pintarFrases(); cambio(); });
            fila.appendChild(quitar);
            caja.appendChild(fila);
        });
    }
    // ---- Presentación «Venjy presenta»: vista previa, campos y el logo pintado sobre la vista ----
    let colorLogo = 2, borrador = false, pintando = false;
    function vistaPresentacion() {
        const P = datos.presentacion, L = ctx.idioma, a = P.aspecto, v = $('in-p-vista');
        v.style.setProperty('--p-fondo', a.fondo); v.style.setProperty('--p-texto', a.texto);
        v.style.setProperty('--p-sombra', a.sombra); v.style.setProperty('--p-lema', a.lema);
        v.style.setProperty('--p-entrada', P.tiempos.entrada + 's');
        v.classList.toggle('apagada', !P.activa);
        $('in-p-nombre').textContent = P.nombre[L] || P.nombre.es;
        $('in-p-lema').textContent = P.lema[L] || P.lema.es;
        const c = $('in-p-logo'), h = P.logo.filas.length, w = h ? P.logo.filas[0].length : 0;
        c.width = w || 1; c.height = h || 1;
        const k = Math.max(8, a.pixel); // en el Estudio, al menos 8 px por píxel para poder pintar
        c.style.width = w * k + 'px'; c.style.height = h * k + 'px';
        const g = c.getContext('2d'), img = g.createImageData(c.width, c.height);
        decodificar(P.logo, w, h).forEach((p, i) => { if (p) img.data.set([p[0], p[1], p[2], 255], i * 4); });
        g.putImageData(img, 0, 0);
    }
    function pintarPaleta() {
        const P = datos.presentacion, caja = $('in-p-paleta'); caja.textContent = '';
        colorLogo = Math.min(colorLogo, P.logo.paleta.length - 1);
        P.logo.paleta.forEach((hex, n) => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'in-p-color' + (n === colorLogo && !borrador ? ' elegido' : '');
            b.style.background = hex; b.title = `${n} · ${hex}`; b.setAttribute('aria-label', `${t('Color', 'Color')} ${n} ${hex}`);
            b.addEventListener('click', () => { colorLogo = n; borrador = false; $('in-p-borrar').setAttribute('aria-pressed', 'false'); pintarPaleta(); });
            caja.appendChild(b);
        });
        $('in-p-color').value = P.logo.paleta[colorLogo] || '#000000';
    }
    function pixelLogo(e) {
        const P = datos.presentacion, c = $('in-p-logo'), r = c.getBoundingClientRect();
        const h = P.logo.filas.length, w = h ? P.logo.filas[0].length : 0;
        const x = Math.floor((e.clientX - r.left) / r.width * w), y = Math.floor((e.clientY - r.top) / r.height * h);
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const ch = borrador ? '.' : DIGITOS[colorLogo], fila = P.logo.filas[y];
        if (fila[x] === ch) return;
        P.logo.filas[y] = fila.slice(0, x) + ch + fila.slice(x + 1);
        cambio();
    }
    function campoCheck(rotulo, valor, al) {
        const l = document.createElement('label'); l.className = 'campo in-check';
        const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!valor;
        const s = document.createElement('span'); s.textContent = rotulo;
        i.addEventListener('change', () => al(i.checked));
        l.append(i, s); return l;
    }
    function pintarPresentacion() {
        const P = datos.presentacion, caja = $('in-p-campos'); caja.textContent = '';
        caja.appendChild(campoCheck(t('Mostrarla al abrir', 'Show it on open'), P.activa, v => { P.activa = v; cambio(); }));
        for (const [k, es, en] of [['nombre', 'Nombre', 'Name'], ['lema', 'Lema', 'Tagline']]) for (const L of ['es', 'en']) {
            caja.appendChild(campoTexto(`${t(es, en)} ${L.toUpperCase()}`, P[k][L], v => { P[k][L] = v; cambio(); }));
        }
        const a = P.aspecto;
        for (const [k, es, en] of [['fondo', 'Fondo', 'Background'], ['texto', 'Nombre', 'Name'], ['sombra', 'Sombra del nombre', 'Name shadow'], ['lema', 'Lema', 'Tagline']])
            caja.appendChild(campoColor(t(es, en), a[k], v => { a[k] = v; cambio(); }));
        caja.appendChild(avanzado(campoNumero(t('Tamaño de cada píxel del logo (px)', 'Logo pixel size (px)'), a.pixel, 1, 24, 1, n => { a.pixel = n; cambio(); }, ['presentacion', 'aspecto', 'pixel'])));
        const T = P.tiempos;
        for (const [k, es, en, min, max] of [['minimo', 'Mínimo visible (s)', 'Minimum shown (s)', 0, 15], ['maximo', 'Máximo (s)', 'Maximum (s)', 0.5, 30], ['entrada', 'Aparición (s)', 'Appear (s)', 0, 3], ['salida', 'Desvanecido (s)', 'Fade out (s)', 0, 3]])
            caja.appendChild(avanzado(campoNumero(t(es, en), T[k], min, max, 0.1, n => { T[k] = n; cambio(); }, ['presentacion', 'tiempos', k])));
        pintarPaleta();
        vistaPresentacion();
    }

    // ---- Fondo de cine detrás del menú: ajustes y planos ----
    const VECTORES = [['desde', 'Desde', 'From', true], ['hasta', 'Hasta', 'To', false], ['mira', 'Mira', 'Look at', true], ['miraHasta', 'Mira hasta', 'Look to', false]];
    function pintarFondo() {
        const F = datos.fondo, caja = $('in-f-campos'); caja.textContent = '';
        caja.appendChild(campoCheck(t('Activo', 'On'), F.activo, v => { F.activo = v; cambio(); }));
        caja.appendChild(campoCheck(t('También en celular', 'Also on phones'), F.enCelular, v => { F.enCelular = v; cambio(); }));
        for (const [k, es, en, min, max, paso] of [
            ['distancia', 'Distancia (chunks)', 'Distance (chunks)', 2, 12, 1], ['distanciaCelular', 'Distancia en celular', 'Phone distance', 2, 12, 1],
            ['fps', 'Tope de cuadros/s', 'Max frames/s', 10, 60, 1], ['hora', 'Hora (0-1; 0,5 mediodía)', 'Time (0-1; 0.5 noon)', 0, 1, 0.01],
            ['fov', 'Campo de visión (°)', 'Field of view (°)', 20, 110, 1], ['oscurecer', 'Velo bajo el menú (0-1)', 'Veil under the menu (0-1)', 0, 1, 0.05],
            ['fundido', 'Fundido a negro (s)', 'Fade to black (s)', 0, 5, 0.1], ['esperaMax', 'Espera máx. en negro (s)', 'Max wait in black (s)', 0, 20, 0.5]
        ]) caja.appendChild(avanzado(campoNumero(t(es, en), F[k], min, max, paso, n => { F[k] = paso === 1 && max <= 12 ? Math.round(n) : n; cambio(); }, ['fondo', k])));
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = t('Orden de los planos', 'Shot order');
        const sel = document.createElement('select');
        for (const [v, es, en] of [['seguido', 'Seguido', 'In order'], ['azar', 'Al azar', 'Random']]) { const o = document.createElement('option'); o.value = v; o.textContent = t(es, en); o.selected = F.orden === v; sel.appendChild(o); }
        sel.addEventListener('change', () => { F.orden = sel.value; cambio(); });
        l.append(s, sel); caja.appendChild(l);
        pintarPlanos();
    }
    const planoValido = p => ['desde', 'mira'].every(k => Array.isArray(p[k]) && p[k].length === 3 && p[k].every(Number.isFinite)) && p.duracion > 0;
    function pintarPlanos() {
        const F = datos.fondo, lista = $('in-f-planos'); lista.textContent = '';
        F.planos.forEach((p, n) => {
            const fila = document.createElement('div'); fila.className = 'fila-texto in-plano' + (planoValido(p) ? '' : ' con-error');
            const cab = document.createElement('div'); cab.className = 'in-plano-cab';
            cab.appendChild(campoTexto(`${t('Plano', 'Shot')} ${n + 1}`, p.nombre || '', v => { if (v) p.nombre = v; else delete p.nombre; cambio(); }));
            cab.appendChild(campoNumero(t('Duración (s)', 'Duration (s)'), p.duracion, 1, 120, 0.5, v => { p.duracion = v; cambio(); }));
            const ver = document.createElement('a'); ver.className = 'boton chico'; ver.target = '_blank'; ver.rel = 'noopener'; ver.textContent = t('Ver', 'View');
            ver.addEventListener('click', () => { ver.href = `../supervivencia.html?plano=${n}#fondo=${encodeURIComponent(JSON.stringify(datos.fondo))}`; });
            ver.href = '../supervivencia.html?plano=' + n;
            const subir = document.createElement('button'); subir.type = 'button'; subir.className = 'boton chico secundario'; subir.textContent = t('Subir', 'Up'); subir.disabled = n === 0;
            subir.addEventListener('click', () => { F.planos.splice(n - 1, 0, F.planos.splice(n, 1)[0]); pintarPlanos(); cambio(); });
            const quitar = document.createElement('button'); quitar.type = 'button'; quitar.className = 'boton chico secundario'; quitar.textContent = t('Quitar', 'Remove');
            quitar.addEventListener('click', () => { F.planos.splice(n, 1); pintarPlanos(); cambio(); });
            cab.append(ver, subir, quitar);
            fila.appendChild(cab);
            for (const [k, es, en, obligatorio] of VECTORES) {
                const v = document.createElement('div'); v.className = 'in-vector';
                const r = document.createElement('span'); r.textContent = t(es, en); v.appendChild(r);
                const ins = [0, 1, 2].map(j => {
                    const i = document.createElement('input'); i.type = 'number'; i.step = 1; i.min = -100; i.max = 2000;
                    i.value = p[k] ? p[k][j] : ''; i.setAttribute('aria-label', `${t(es, en)} ${'xyz'[j]}`); i.placeholder = 'xyz'[j];
                    v.appendChild(i); return i;
                });
                const leer = () => {
                    const vals = ins.map(i => (i.value === '' ? null : Number(i.value)));
                    if (vals.every(x => x === null) && !obligatorio) delete p[k];
                    else if (vals.every(Number.isFinite)) p[k] = vals;
                    fila.classList.toggle('con-error', !planoValido(p));
                    cambio();
                };
                ins.forEach(i => i.addEventListener('input', leer));
                fila.appendChild(avanzado(v));
            }
            lista.appendChild(fila);
        });
    }

    function pintar() { pintarTextos(); pintarAspecto(); pintarFrases(); pintarCarga(); pintarPresentacion(); pintarFondo(); vista(); }

    async function guardar() {
        if (datos.titulo.frases.some(f => !f.es.trim() || !f.en.trim())) { rotular('Cada frase necesita ES y EN.', 'Each splash needs ES and EN.', 'error'); return; }
        if (datos.carga.consejos.some(f => !f.es.trim() || !f.en.trim())) { rotular('Cada consejo necesita ES y EN.', 'Each tip needs ES and EN.', 'error'); return; }
        if (datos.fondo.planos.some(p => !planoValido(p))) { rotular('Cada plano necesita Desde, Mira y una duración.', 'Each shot needs From, Look at and a duration.', 'error'); return; }
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/inicio', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }

    $('in-agregar').addEventListener('click', () => {
        datos.titulo.frases.push({ es: '¡Nueva frase!', en: 'New splash!' });
        indiceFrase = datos.titulo.frases.length - 1;
        pintarFrases(); cambio();
    });
    $('in-c-agregar').addEventListener('click', () => {
        datos.carga.consejos.push({ es: 'Nuevo consejo.', en: 'New tip.' });
        indiceConsejo = datos.carga.consejos.length - 1;
        pintarCarga(); cambio();
    });
    $('in-c-otro').addEventListener('click', () => { indiceConsejo++; vistaCarga(); });
    $('in-c-sel').addEventListener('change', e => { etapaVista = e.target.value; vistaCarga(); });
    $('in-otra').addEventListener('click', () => { indiceFrase++; vista(); });
    const lienzoLogo = $('in-p-logo');
    lienzoLogo.addEventListener('pointerdown', e => { pintando = true; lienzoLogo.setPointerCapture(e.pointerId); pixelLogo(e); });
    lienzoLogo.addEventListener('pointermove', e => { if (pintando) pixelLogo(e); });
    lienzoLogo.addEventListener('pointerup', () => { pintando = false; });
    lienzoLogo.addEventListener('pointercancel', () => { pintando = false; });
    $('in-p-color').addEventListener('input', e => { datos.presentacion.logo.paleta[colorLogo] = e.target.value; pintarPaleta(); cambio(); });
    $('in-p-mas').addEventListener('click', () => {
        const pal = datos.presentacion.logo.paleta;
        if (pal.length >= DIGITOS.length) return;
        pal.push('#ffffff'); colorLogo = pal.length - 1; borrador = false; pintarPaleta(); cambio();
    });
    $('in-p-borrar').addEventListener('click', e => { borrador = !borrador; e.currentTarget.setAttribute('aria-pressed', String(borrador)); pintarPaleta(); });
    $('in-p-restaurar').addEventListener('click', () => { datos.presentacion.logo = clonar(INICIO.presentacion.logo); pintarPaleta(); cambio(); });
    $('in-p-repetir').addEventListener('click', () => { const v = $('in-p-vista'); v.classList.remove('animar'); void v.offsetWidth; v.classList.add('animar'); });
    $('in-f-agregar').addEventListener('click', () => {
        const l = datos.fondo.planos, u = l[l.length - 1];
        l.push(u ? clonar(u) : { desde: [100, 90, 480], mira: [100, 70, 440], duracion: 12 });
        pintarPlanos(); cambio();
    });
    $('in-descartar').addEventListener('click', () => { datos = clonar(original); pintar(); cambio(); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'inicio' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    ctx.alIdioma.push(() => pintar());
    pintar();
}
