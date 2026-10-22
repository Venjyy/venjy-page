// =========================================================
// VENJY · Estudio · pestaña Píxeles: editor de íconos de objetos y del arte de las cartas
// Pinta cuadro por cuadro (lápiz, borrador, cuentagotas, relleno, espejo, deshacer) sobre:
//   · un ícono de objeto (16×16)      -> mundo/datos/iconos.json        (iconos.js lo usa en vez de PINTORES)
//   · el retrato de una carta (40×26) -> mundo/datos/cartas-arte.json   (retratos; y los colores del marco)
//   · el reverso de las cartas (50×76) -> mundo/datos/cartas-arte.json  (reverso)
//   · un objeto o una carta nuevos    -> mundo/datos/borradores.json    (el juego no los lee: los termina un agente)
// Lo que va al juego viaja en vivo (mensaje `datos`); Guardar escribe cada archivo con If-Match, como Mesa.
// Formato de los dibujos: mundo/datos/pixeles.js. Diseño: estudio/DISENO.md §20.
// =========================================================
import { OBJETOS } from '../mundo/supervivencia/objetos.js';
import { pixelesDeCodigo } from '../mundo/supervivencia/iconos.js';
import { CARTAS, FAMILIAS } from '../mundo/supervivencia/cartas-datos.js';
import {
    retratoDeCodigo, reversoDeCodigo, dibujarCarta, dibujarPlantilla, aplicarArte, familiaDe,
    PLANTILLAS, COLORES_MARCO, marcoDeCodigo, ZONAS
} from '../mundo/supervivencia/cartas-arte.js';
import { codificar, decodificar, hexDe, MEDIDAS } from '../mundo/datos/pixeles.js';

const clonar = o => JSON.parse(JSON.stringify(o));
const ARCHIVOS = ['iconos', 'cartas-arte', 'borradores'];
const VIVOS = new Set(['iconos', 'cartas-arte']); // borradores no va al juego
const VACIOS = { iconos: { version: 1, iconos: {} }, 'cartas-arte': { version: 1, retratos: {}, marcos: {} }, borradores: { version: 1, objetos: {}, cartas: {} } };
const MAX_DESHACER = 200;
const NOMBRE_PLANTILLA = { monstruo: ['Monstruo', 'Monster'], mito: ['Mito', 'Myth'], amigo: ['Amigo', 'Friend'], animal: ['Animal', 'Animal'], hechizo: ['Hechizo', 'Spell'] };
const NOMBRE_COLOR = { claro: ['luz', 'light'], base: ['base', 'base'], oscuro: ['oscuro', 'dark'], sombra: ['sombra', 'shadow'], cinta: ['cinta', 'ribbon'] };
// Clave a partir de un nombre: minúsculas, sin tildes, guion bajo en vez de espacios
const aClave = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^[^a-z]+/, '').slice(0, 40);
const hoy = () => new Date().toISOString().slice(0, 10);

export async function montarPixeles(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const msg = $('px-mensaje'), btnGuardar = $('px-guardar');
    const lienzo = $('px-lienzo'), g = lienzo.getContext('2d');
    const selModo = $('px-modo'), selCual = $('px-cual');

    // ---------- Archivos ----------
    const F = {}; // nombre -> { etag, original, datos }
    for (const n of ARCHIVOS) {
        try {
            const r = await fetch(`../mundo/datos/${n}.json`, { cache: 'no-cache' });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const datos = JSON.parse(await r.text());
            F[n] = { etag: r.headers.get('ETag'), original: clonar(datos), datos };
        } catch (e) {
            F[n] = { etag: null, original: clonar(VACIOS[n]), datos: clonar(VACIOS[n]) };
        }
    }
    const sucio = n => JSON.stringify(F[n].datos) !== JSON.stringify(F[n].original);
    const sucios = () => ARCHIVOS.filter(sucio);
    ctx.sucios.pixeles = () => sucios().length > 0; // punto en la pestaña (campo-comun.js, B0-C)
    function rotular(es, en, clase = '') { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); }
    function estadoArchivos() {
        const s = sucios();
        $('px-estado').textContent = s.length ? t(`Sin guardar: ${s.join(', ')}`, `Unsaved: ${s.join(', ')}`) : t('Todo guardado', 'All saved');
        btnGuardar.disabled = !s.length || !ctx.servidor.escritura;
    }
    function cambio(n) {
        if (VIVOS.has(n)) ctx.puente.enviarDatos(n, F[n].datos);
        estadoArchivos();
    }

    // ---------- Estado del editor ----------
    let modo = 'icono', clave = null;
    let w = 16, h = 16, px = [];       // colores '#rrggbb' o null
    let herr = 'lapiz', espejo = false, color = '#5a8f2f';
    let deshacer = [], rehacer = [];
    let zoom = 24, reticula = true;
    let paletaCodigo = [];              // colores del dibujo del código (para la paleta)

    const objetos = () => OBJETOS.filter(Boolean);
    const B = () => F.borradores.datos;
    const A = () => F['cartas-arte'].datos;
    const I = () => F.iconos.datos;

    // Dónde vive el dibujo de lo elegido: { archivo, leer(), escribir(dib|null) }
    function sitio() {
        if (!clave && modo !== 'reverso') return null;
        if (modo === 'icono') return { archivo: 'iconos', leer: () => (I().iconos || {})[clave], escribir: d => { I().iconos = I().iconos || {}; if (d) I().iconos[clave] = d; else delete I().iconos[clave]; } };
        if (modo === 'retrato') return { archivo: 'cartas-arte', leer: () => (A().retratos || {})[clave], escribir: d => { A().retratos = A().retratos || {}; if (d) A().retratos[clave] = d; else delete A().retratos[clave]; } };
        if (modo === 'reverso') return { archivo: 'cartas-arte', leer: () => A().reverso, escribir: d => { if (d) A().reverso = d; else delete A().reverso; } };
        if (modo === 'objeto') return { archivo: 'borradores', leer: () => B().objetos[clave] && B().objetos[clave].dibujo, escribir: d => { if (d) B().objetos[clave].dibujo = d; else delete B().objetos[clave].dibujo; } };
        if (modo === 'carta') return { archivo: 'borradores', leer: () => B().cartas[clave] && B().cartas[clave].boceto, escribir: d => { if (d) B().cartas[clave].boceto = d; else delete B().cartas[clave].boceto; } };
        return null;
    }
    // Colores del dibujo que hace hoy el código (icono, retrato, reverso); en los nuevos, nada
    function deCodigo() {
        const vacio = () => new Array(w * h).fill(null);
        let p = null;
        if (modo === 'icono') { const o = objetos().find(x => x.clave.toLowerCase() === clave); p = o ? pixelesDeCodigo(o.id) : null; }
        else if (modo === 'retrato') p = retratoDeCodigo(clave);
        else if (modo === 'reverso') p = reversoDeCodigo();
        return p ? p.map(c => (c ? hexDe(c) : null)) : vacio();
    }
    const tieneDibujo = () => { const s = sitio(); return !!(s && s.leer()); };

    // Guarda px en el JSON (con el estado borrador del dibujo, si lo marcó)
    function escribir() {
        const s = sitio();
        if (!s) return;
        const previo = s.leer();
        const d = codificar(px, w, h);
        if (modo === 'carta' && !px.some(Boolean)) { s.escribir(null); cambio(s.archivo); pintarTodo(); return; } // boceto vacío = sin boceto
        const nuevo = {};
        if (['icono', 'retrato', 'reverso'].includes(modo) && $('px-borrador').checked) nuevo.estado = 'borrador';
        if (previo && previo.nota) nuevo.nota = previo.nota;
        s.escribir({ ...nuevo, paleta: d.paleta, filas: d.filas });
        cambio(s.archivo);
        if (!previo) { llenarCual(); pintarPaneles(); } // primer trazo: ya es «dibujo propio»
        pintarTodo();
    }

    // ---------- Listas ----------
    function llenarCual() {
        selCual.textContent = '';
        const op = (v, texto) => { const o = document.createElement('option'); o.value = v; o.textContent = texto; selCual.appendChild(o); };
        const marca = hay => (hay ? t(' [dibujado]', ' [drawn]') : '');
        if (modo === 'icono') for (const o of objetos()) { const k = o.clave.toLowerCase(); op(k, `${o.nombre[ctx.idioma] || o.nombre.es} · ${k}${marca((I().iconos || {})[k])}`); }
        else if (modo === 'retrato') for (const [k, c] of Object.entries(CARTAS)) op(k, `${c.nombre[ctx.idioma] || c.nombre.es} · ${k}${marca((A().retratos || {})[k])}`);
        else if (modo === 'objeto') for (const [k, o] of Object.entries(B().objetos || {})) op(k, `${o.nombre.es} · ${k} (${o.estado})`);
        else if (modo === 'carta') for (const [k, c] of Object.entries(B().cartas || {})) op(k, `${c.nombre.es} · ${k} (${c.estado})`);
        $('px-cual-campo').hidden = modo === 'reverso';
        $('px-nuevo').hidden = !(modo === 'objeto' || modo === 'carta');
        if (clave && [...selCual.options].some(o => o.value === clave)) selCual.value = clave;
        else clave = selCual.options.length ? selCual.options[0].value : null;
    }

    // Abre lo elegido: su dibujo del JSON o, si no tiene, el del código
    function abrir() {
        [w, h] = modo === 'icono' || modo === 'objeto' ? MEDIDAS.icono : modo === 'reverso' ? MEDIDAS.carta : MEDIDAS.retrato;
        const s = sitio(), dib = s && s.leer();
        const codigo = deCodigo();
        paletaCodigo = [...new Set(codigo.filter(Boolean))];
        px = dib ? decodificar(dib, w, h).map(c => (c ? hexDe(c) : null)) : codigo;
        $('px-borrador').checked = !!(dib && dib.estado === 'borrador');
        deshacer = []; rehacer = [];
        zoom = Math.max(4, Math.min(40, Math.floor(Math.min(560 / w, 620 / h))));
        $('px-zoom').value = zoom;
        pintarPaneles();
        pintarTodo();
    }

    // ---------- Paneles laterales ----------
    function pintarPaneles() {
        const titulo = $('px-titulo'), meta = $('px-meta');
        const nuevo = modo === 'objeto' || modo === 'carta';
        $('px-borrador-campo').hidden = nuevo;
        $('px-actual').hidden = nuevo;
        $('px-quitar').textContent = nuevo ? (modo === 'carta' ? t('Quitar el boceto', 'Remove the sketch') : t('Borrar el dibujo', 'Clear the drawing')) : t('Quitar mi dibujo', 'Remove my drawing');
        if (modo === 'icono') { titulo.textContent = t('Ícono', 'Icon'); meta.textContent = clave ? t(`${clave}: ${tieneDibujo() ? 'dibujo propio (iconos.json)' : 'dibujo del código (iconos.js)'}`, `${clave}: ${tieneDibujo() ? 'own drawing (iconos.json)' : 'coded drawing (iconos.js)'}`) : ''; }
        else if (modo === 'retrato') { titulo.textContent = t('Retrato', 'Portrait'); meta.textContent = clave ? t(`${clave}: ${tieneDibujo() ? 'dibujo propio (cartas-arte.json); lo vacío deja ver el fondo de la familia' : 'retrato del código (cartas-arte.js)'}`, `${clave}: ${tieneDibujo() ? 'own drawing (cartas-arte.json); empty cells show the family background' : 'coded portrait (cartas-arte.js)'}`) : ''; }
        else if (modo === 'reverso') { titulo.textContent = t('Reverso', 'Card back'); meta.textContent = tieneDibujo() ? t('Dibujo propio (cartas-arte.json)', 'Own drawing (cartas-arte.json)') : t('Reverso del código', 'Coded card back'); }
        else if (modo === 'objeto') { titulo.textContent = t('Objeto nuevo', 'New object'); meta.textContent = clave ? t('Dibujo de 16×16. El juego no lo usa hasta que un agente lo implemente.', '16×16 drawing. The game ignores it until an agent implements it.') : t('Todavía no hay objetos nuevos: «Crear nuevo».', 'No new objects yet: “Create new”.'); }
        else { titulo.textContent = t('Carta nueva', 'New card'); meta.textContent = clave ? t('Boceto opcional del retrato (40×26): el agente hace el arte final tomándolo de guía.', 'Optional portrait sketch (40×26): the agent makes the final art from it.') : t('Todavía no hay cartas nuevas: «Crear nueva».', 'No new cards yet: “Create new”.'); }
        pintarFicha();
        pintarMarco();
    }

    function campoTexto(etiqueta, valor, alCambiar, largo = false) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const i = document.createElement(largo ? 'textarea' : 'input');
        if (!largo) i.type = 'text';
        i.value = valor || ''; i.maxLength = largo ? 400 : 60;
        i.addEventListener('input', () => alCambiar(i.value));
        l.append(s, i);
        return l;
    }
    function campoNumero(etiqueta, valor, alCambiar) {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const i = document.createElement('input'); i.type = 'number'; i.min = 0; i.max = 5000; i.step = 100; i.value = valor ?? 0;
        i.addEventListener('input', () => { const v = Math.round(Number(i.value)); if (Number.isFinite(v)) alCambiar(Math.max(0, Math.min(5000, v))); });
        l.append(s, i);
        return l;
    }
    // Pone o quita un texto { es, en } según lo escrito (vacío en los dos = sin texto)
    function ponerTexto(obj, k, lado, v) {
        const tx = obj[k] || {};
        if (v.trim()) tx[lado] = v; else delete tx[lado];
        if (tx.es === undefined && tx.en !== undefined) tx.es = ''; // el esquema pide es: validar avisa si queda vacío
        if (Object.keys(tx).length && (tx.es || tx.en)) obj[k] = tx; else delete obj[k];
    }
    function pintarFicha() {
        const caja = $('px-ficha-campos');
        caja.textContent = '';
        const nuevo = modo === 'objeto' || modo === 'carta';
        $('px-ficha').hidden = !nuevo || !clave;
        if (!nuevo || !clave) return;
        const b = modo === 'objeto' ? B().objetos[clave] : B().cartas[clave];
        const listo = () => { cambio('borradores'); pintarVistas(); };
        const p = document.createElement('p'); p.className = 'mensaje';
        p.textContent = t(`Clave: ${clave} · estado: ${b.estado}${b.fecha ? ' · ' + b.fecha : ''}`, `Key: ${clave} · status: ${b.estado}${b.fecha ? ' · ' + b.fecha : ''}`);
        caja.appendChild(p);
        if (modo === 'carta') {
            const l = document.createElement('label'); l.className = 'campo';
            const s = document.createElement('span'); s.textContent = t('Plantilla (marco y fondo)', 'Template (frame and background)');
            const sel = document.createElement('select');
            for (const k of PLANTILLAS) { const o = document.createElement('option'); o.value = k; o.textContent = t(...NOMBRE_PLANTILLA[k]); sel.appendChild(o); }
            sel.value = b.plantilla;
            sel.addEventListener('change', () => {
                b.plantilla = sel.value;
                if (b.plantilla === 'hechizo') { delete b.atk; delete b.def; } else { b.atk = b.atk ?? 500; b.def = b.def ?? 500; }
                listo(); pintarFicha(); pintarMarco();
            });
            l.append(s, sel);
            caja.appendChild(l);
        }
        caja.appendChild(campoTexto(t('Nombre (español)', 'Name (Spanish)'), b.nombre.es, v => { b.nombre.es = v; listo(); }));
        caja.appendChild(campoTexto(t('Nombre (inglés, opcional)', 'Name (English, optional)'), b.nombre.en, v => { if (v.trim()) b.nombre.en = v; else delete b.nombre.en; listo(); }));
        if (modo === 'objeto') {
            caja.appendChild(campoTexto(t('Qué hace', 'What it does'), b.que, v => { if (v.trim()) b.que = v; else delete b.que; listo(); }, true));
            caja.appendChild(campoTexto(t('Receta o dónde se consigue', 'Recipe or where to get it'), b.receta, v => { if (v.trim()) b.receta = v; else delete b.receta; listo(); }, true));
        } else {
            if (b.plantilla !== 'hechizo') {
                caja.appendChild(campoNumero('ATK', b.atk, v => { b.atk = v; listo(); }));
                caja.appendChild(campoNumero('DEF', b.def, v => { b.def = v; listo(); }));
            }
            caja.appendChild(campoTexto(t('Efecto (español)', 'Effect (Spanish)'), b.efecto && b.efecto.es, v => { ponerTexto(b, 'efecto', 'es', v); listo(); }, true));
            caja.appendChild(campoTexto(t('Efecto (inglés, opcional)', 'Effect (English, optional)'), b.efecto && b.efecto.en, v => { ponerTexto(b, 'efecto', 'en', v); listo(); }, true));
        }
        caja.appendChild(campoTexto(t('Notas para el agente', 'Notes for the agent'), b.notas, v => { if (v.trim()) b.notas = v; else delete b.notas; listo(); }, true));
    }
    // Familia cuyo marco se ve ahora (retrato o carta nueva), o null
    const familiaVista = () => (modo === 'retrato' && clave ? familiaDe(clave) : modo === 'carta' && clave ? B().cartas[clave].plantilla : null);
    function pintarMarco() {
        const fam = familiaVista();
        $('px-marco').hidden = !fam;
        if (!fam) return;
        $('px-marco-titulo').textContent = t(`Colores del marco: ${NOMBRE_PLANTILLA[fam][0]}`, `Frame colors: ${NOMBRE_PLANTILLA[fam][1]}`);
        const caja = $('px-marco-campos');
        caja.textContent = '';
        const fila = document.createElement('div'); fila.className = 'fila-colores';
        const M = marcoDeCodigo(fam), propio = (A().marcos || {})[fam] || {};
        for (const k of COLORES_MARCO) {
            const l = document.createElement('label'); l.className = 'campo';
            const s = document.createElement('span'); s.textContent = t(...NOMBRE_COLOR[k]);
            const i = document.createElement('input'); i.type = 'color';
            i.value = propio[k] || (Array.isArray(M[k]) ? M[k][0] : M[k]);
            i.addEventListener('input', () => {
                A().marcos = A().marcos || {};
                A().marcos[fam] = { ...(A().marcos[fam] || {}), [k]: i.value };
                cambio('cartas-arte'); pintarVistas();
            });
            l.append(s, i);
            fila.appendChild(l);
        }
        caja.appendChild(fila);
    }

    // ---------- Dibujo en pantalla ----------
    function pintarLienzo() {
        lienzo.width = w * zoom; lienzo.height = h * zoom;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const c = px[y * w + x];
            if (c) { g.fillStyle = c; g.fillRect(x * zoom, y * zoom, zoom, zoom); continue; }
            // vacío: tablero de ajedrez
            const m = Math.max(2, zoom >> 1);
            for (let j = 0; j < zoom; j += m) for (let i = 0; i < zoom; i += m) {
                g.fillStyle = ((i + j) / m) & 1 ? '#5a5a5a' : '#8a8a8a';
                g.fillRect(x * zoom + i, y * zoom + j, Math.min(m, zoom - i), Math.min(m, zoom - j));
            }
        }
        if (reticula && zoom >= 6) {
            g.fillStyle = 'rgba(0,0,0,0.35)';
            for (let x = 1; x < w; x++) g.fillRect(x * zoom, 0, 1, h * zoom);
            for (let y = 1; y < h; y++) g.fillRect(0, y * zoom, w * zoom, 1);
            // centro marcado (ayuda con el espejo)
            g.fillStyle = 'rgba(255,255,85,0.45)';
            if (w % 2 === 0) g.fillRect((w / 2) * zoom, 0, 1, h * zoom);
        }
    }
    // Pone colores [r,g,b] en un lienzo del tamaño del dibujo, escalado por k
    function volcar(c, cols, cw, ch, k) {
        c.width = cw * k; c.height = ch * k;
        const x = c.getContext('2d');
        x.imageSmoothingEnabled = false;
        const img = x.createImageData(cw, ch);
        cols.forEach((col, i) => { if (!col) return; const rgb = typeof col === 'string' ? [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)] : col; img.data.set([...rgb, 255], i * 4); });
        const tmp = document.createElement('canvas'); tmp.width = cw; tmp.height = ch;
        tmp.getContext('2d').putImageData(img, 0, 0);
        x.clearRect(0, 0, c.width, c.height);
        x.drawImage(tmp, 0, 0, c.width, c.height);
    }
    // Lienzo de cartas-arte.js (w, h, d RGBA) a canvas escalado por k
    function volcarLienzo(c, L, k) {
        c.width = L.w * k; c.height = L.h * k;
        const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
        const tmp = document.createElement('canvas'); tmp.width = L.w; tmp.height = L.h;
        const img = tmp.getContext('2d').createImageData(L.w, L.h); img.data.set(L.d); tmp.getContext('2d').putImageData(img, 0, 0);
        x.clearRect(0, 0, c.width, c.height);
        x.drawImage(tmp, 0, 0, c.width, c.height);
        return x;
    }
    // Textos encima de la carta (como la mesa: nombre, familia, efecto, ATK y DEF en PixelCraft)
    function textos(x, k, d) {
        const caja = ([zx, zy, zw, zh], s, px2, color = '#ffffff', alinear = 'center') => {
            // achica la letra hasta que quepa (como la mesa); si ni así, corta
            let tam = px2;
            for (; tam > 2.4 * k; tam -= 0.2 * k) { x.font = `${tam}px PixelCraft`; if (x.measureText(s).width <= (zw - 3) * k) break; }
            x.fillStyle = color; x.textBaseline = 'middle'; x.textAlign = alinear;
            let txt = s;
            while (txt.length > 1 && x.measureText(txt).width > (zw - 3) * k) txt = txt.slice(0, -1);
            x.fillText(txt, alinear === 'center' ? (zx + zw / 2) * k : alinear === 'right' ? (zx + zw - 2) * k : (zx + 2) * k, (zy + zh / 2 + 0.5) * k);
        };
        caja(ZONAS.nombre, d.nombre || '', 5 * k);
        caja([11, 41, 37, 6], d.familia || '', 3.4 * k, '#ffffff', 'left');
        const zona = d.hechizo ? ZONAS.textoHechizo : ZONAS.texto;
        if (d.texto) {
            const tam = 3.2 * k; x.font = `${tam}px PixelCraft`; x.fillStyle = '#3b2a14'; x.textAlign = 'left'; x.textBaseline = 'top';
            const palabras = d.texto.split(/\s+/), lineas = [];
            let l = '';
            for (const p of palabras) { const prueba = l ? l + ' ' + p : p; if (x.measureText(prueba).width > (zona[2] - 3) * k && l) { lineas.push(l); l = p; } else l = prueba; }
            if (l) lineas.push(l);
            lineas.slice(0, Math.floor((zona[3] - 2) / 3.6)).forEach((s, i) => x.fillText(s, (zona[0] + 1.5) * k, (zona[1] + 1.5) * k + i * tam * 1.1));
        }
        if (!d.hechizo) { caja(ZONAS.atk, String(d.atk ?? ''), 5 * k, '#ffffff', 'right'); caja(ZONAS.def, String(d.def ?? ''), 5 * k, '#ffffff', 'right'); }
    }
    // Vista de la carta entera: aplica en este módulo lo que se está editando (sin borradores) y la dibuja
    function pintarCarta() {
        const fig = $('px-carta-fig');
        fig.hidden = !(modo === 'retrato' || modo === 'carta') || !clave;
        if (fig.hidden) return;
        const vista = clonar(A());
        if (modo === 'retrato' && vista.retratos && vista.retratos[clave]) delete vista.retratos[clave].estado; // la vista muestra el dibujo aunque sea borrador
        aplicarArte(vista);
        const k = 4;
        if (modo === 'retrato') {
            const c = CARTAS[clave];
            const x = volcarLienzo($('px-carta'), dibujarCarta(clave), k);
            textos(x, k, { nombre: c.nombre[ctx.idioma], familia: c.tipo === 'hechizo' ? t('Hechizo', 'Spell') : FAMILIAS[c.familia][ctx.idioma], texto: c.texto[ctx.idioma], atk: c.atk, def: c.def, hechizo: c.tipo === 'hechizo' });
        } else {
            const b = B().cartas[clave];
            const boceto = px.some(Boolean) ? px.map(c => (c ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : null)) : null;
            const x = volcarLienzo($('px-carta'), dibujarPlantilla(b.plantilla, boceto, clave), k);
            const lado = tx => (tx ? tx[ctx.idioma] || tx.es : '');
            textos(x, k, { nombre: lado(b.nombre), familia: t(...NOMBRE_PLANTILLA[b.plantilla]), texto: lado(b.efecto), atk: b.atk, def: b.def, hechizo: b.plantilla === 'hechizo' });
        }
    }
    function pintarVistas() {
        volcar($('px-real'), px, w, h, 1);
        volcar($('px-doble'), px, w, h, modo === 'reverso' ? 3 : 2);
        pintarCarta();
    }
    function pintarPaleta() {
        const caja = $('px-paleta');
        caja.textContent = '';
        const usados = [...new Set(px.filter(Boolean))];
        const todos = [...new Set([...usados, ...paletaCodigo])].slice(0, 96);
        const vacio = document.createElement('button'); vacio.type = 'button'; vacio.className = 'vacio' + (herr === 'borrador' ? ' activo' : '');
        vacio.title = t('Vacío (borrador)', 'Empty (eraser)');
        vacio.addEventListener('click', () => ponerHerramienta('borrador'));
        caja.appendChild(vacio);
        for (const c of todos) {
            const b = document.createElement('button'); b.type = 'button'; b.style.background = c; b.title = c;
            if (c === color && herr !== 'borrador') b.className = 'activo';
            b.addEventListener('click', () => { ponerColor(c); if (herr !== 'relleno') ponerHerramienta('lapiz'); });
            caja.appendChild(b);
        }
    }
    function pintarTodo() { pintarLienzo(); pintarVistas(); pintarPaleta(); }

    // ---------- Herramientas ----------
    function ponerHerramienta(hh) {
        herr = hh;
        for (const b of document.querySelectorAll('[data-herr]')) b.classList.toggle('activo', b.dataset.herr === herr);
        pintarPaleta();
    }
    function ponerColor(c) { color = c; $('px-color').value = c; pintarPaleta(); }
    const editable = () => !!sitio();
    function guardarPaso() { deshacer.push(px.slice()); if (deshacer.length > MAX_DESHACER) deshacer.shift(); rehacer = []; }
    function poner(x, y, c) {
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        px[y * w + x] = c;
        if (espejo) px[y * w + (w - 1 - x)] = c;
    }
    function rellenar(x, y, c) {
        const viejo = px[y * w + x];
        if (viejo === c) return;
        const pila = [[x, y]];
        while (pila.length) {
            const [i, j] = pila.pop();
            if (i < 0 || j < 0 || i >= w || j >= h || px[j * w + i] !== viejo) continue;
            px[j * w + i] = c;
            pila.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
        }
        if (espejo) { // el relleno espejado: lo mismo desde el punto reflejado
            const xr = w - 1 - x;
            if (px[y * w + xr] === viejo) rellenar(xr, y, c);
        }
    }
    const celda = e => {
        const r = lienzo.getBoundingClientRect();
        return [Math.floor((e.clientX - r.left) / (r.width / w)), Math.floor((e.clientY - r.top) / (r.height / h))];
    };
    let trazo = null; // { valor, ultimo: [x, y] }
    lienzo.addEventListener('contextmenu', e => e.preventDefault());
    lienzo.addEventListener('pointerdown', e => {
        if (!editable()) { rotular('Elige o crea algo para dibujar.', 'Pick or create something to draw.', 'error'); return; }
        const [x, y] = celda(e);
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const usa = e.altKey ? 'gotero' : e.button === 2 ? 'borrador' : herr;
        if (usa === 'gotero') { const c = px[y * w + x]; if (c) { ponerColor(c); ponerHerramienta('lapiz'); } else ponerHerramienta('borrador'); return; }
        guardarPaso();
        if (usa === 'relleno') { rellenar(x, y, color); escribir(); return; }
        trazo = { valor: usa === 'borrador' ? null : color, ultimo: [x, y] };
        poner(x, y, trazo.valor);
        lienzo.setPointerCapture(e.pointerId);
        pintarLienzo();
    });
    lienzo.addEventListener('pointermove', e => {
        if (!trazo) return;
        const [x1, y1] = celda(e), [x0, y0] = trazo.ultimo;
        if (x1 === x0 && y1 === y0) return;
        // línea de Bresenham entre el punto anterior y este: el trazo rápido no deja huecos
        let x = x0, y = y0;
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        for (;;) {
            poner(x, y, trazo.valor);
            if (x === x1 && y === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x += sx; }
            if (e2 <= dx) { err += dx; y += sy; }
        }
        trazo.ultimo = [x1, y1];
        pintarLienzo();
    });
    const terminar = () => { if (!trazo) return; trazo = null; escribir(); };
    lienzo.addEventListener('pointerup', terminar);
    lienzo.addEventListener('pointercancel', terminar);

    function deshacerPaso() { if (!deshacer.length) return; rehacer.push(px.slice()); px = deshacer.pop(); escribir(); }
    function rehacerPaso() { if (!rehacer.length) return; deshacer.push(px.slice()); px = rehacer.pop(); escribir(); }

    // ---------- Botones ----------
    for (const b of document.querySelectorAll('[data-herr]')) b.addEventListener('click', () => ponerHerramienta(b.dataset.herr));
    const btnEspejo = $('px-espejo');
    const alternarEspejo = () => { espejo = !espejo; btnEspejo.classList.toggle('activo', espejo); };
    btnEspejo.addEventListener('click', alternarEspejo);
    $('px-voltear').addEventListener('click', () => {
        if (!editable()) return;
        guardarPaso();
        const n = new Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) n[y * w + x] = px[y * w + (w - 1 - x)];
        px = n; escribir();
    });
    $('px-deshacer').addEventListener('click', deshacerPaso);
    $('px-rehacer').addEventListener('click', rehacerPaso);
    $('px-zoom').addEventListener('input', () => { zoom = Number($('px-zoom').value); pintarLienzo(); });
    $('px-reticula').addEventListener('change', () => { reticula = $('px-reticula').checked; pintarLienzo(); });
    $('px-color').addEventListener('input', () => { color = $('px-color').value; if (herr === 'borrador' || herr === 'gotero') ponerHerramienta('lapiz'); else pintarPaleta(); });
    $('px-actual').addEventListener('click', () => { if (!editable()) return; guardarPaso(); px = deCodigo(); escribir(); rotular('Copiado el dibujo del código: ya puedes cambiarlo.', 'Copied the coded drawing: you can change it now.', 'ok'); });
    $('px-blanco').addEventListener('click', () => { if (!editable()) return; guardarPaso(); px = new Array(w * h).fill(null); escribir(); });
    $('px-quitar').addEventListener('click', () => {
        const s = sitio();
        if (!s) return;
        guardarPaso();
        s.escribir(null);
        cambio(s.archivo);
        px = modo === 'objeto' || modo === 'carta' ? new Array(w * h).fill(null) : deCodigo();
        pintarPaneles(); pintarTodo(); llenarCual();
        rotular('Quitado: el juego vuelve al dibujo del código.', 'Removed: the game goes back to the coded drawing.', 'ok');
    });
    $('px-borrador').addEventListener('change', () => { if (tieneDibujo()) escribir(); });
    $('px-marco-codigo').addEventListener('click', () => {
        const fam = familiaVista();
        if (!fam || !A().marcos) return;
        delete A().marcos[fam];
        cambio('cartas-arte'); pintarMarco(); pintarVistas();
    });
    selModo.addEventListener('change', () => { modo = selModo.value; clave = null; llenarCual(); abrir(); });
    selCual.addEventListener('change', () => { clave = selCual.value; abrir(); });
    $('px-nuevo').addEventListener('click', () => {
        const nombre = (window.prompt(t('Nombre en español:', 'Name in Spanish:')) || '').trim();
        if (!nombre) return;
        let k = aClave(nombre) || (modo === 'objeto' ? 'objeto' : 'carta');
        const usadas = modo === 'objeto' ? new Set([...objetos().map(o => o.clave.toLowerCase()), ...Object.keys(B().objetos || {})]) : new Set([...Object.keys(CARTAS), ...Object.keys(B().cartas || {})]);
        for (let n = 2; usadas.has(k); n++) k = `${aClave(nombre) || 'nuevo'}_${n}`;
        if (modo === 'objeto') { B().objetos = B().objetos || {}; B().objetos[k] = { estado: 'borrador', nombre: { es: nombre }, fecha: hoy() }; }
        else { B().cartas = B().cartas || {}; B().cartas[k] = { estado: 'borrador', plantilla: 'monstruo', nombre: { es: nombre }, atk: 500, def: 500, fecha: hoy() }; }
        clave = k;
        cambio('borradores'); llenarCual(); abrir();
        rotular(`Creado «${k}». Dibuja y llena la ficha; luego Guardar.`, `Created “${k}”. Draw and fill in the details; then Save.`, 'ok');
    });
    $('px-borrar-borrador').addEventListener('click', () => {
        if (!clave) return;
        if (!window.confirm(t(`¿Borrar el borrador «${clave}»?`, `Delete the draft “${clave}”?`))) return;
        delete (modo === 'objeto' ? B().objetos : B().cartas)[clave];
        clave = null;
        cambio('borradores'); llenarCual(); abrir();
    });

    async function guardar() {
        const lista = sucios();
        if (!lista.length) return;
        rotular('Guardando…', 'Saving…');
        const hechos = [];
        for (const n of lista) {
            try {
                const resp = await fetch(`../api/datos/${n}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': F[n].etag || '*' }, body: JSON.stringify(F[n].datos) });
                const j = await resp.json().catch(() => ({}));
                if (resp.ok) { F[n].original = clonar(F[n].datos); F[n].etag = j.etag; hechos.push(`${n} (${j.bytes} B)`); continue; }
                if (resp.status === 412) rotular(`${n}.json cambió en disco: recarga el Estudio.`, `${n}.json changed on disk: reload the Studio.`, 'error');
                else rotular(`${n}.json no se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `${n}.json not saved (${resp.status})`, 'error');
                estadoArchivos();
                return;
            } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); estadoArchivos(); return; }
        }
        rotular(`Guardado: ${hechos.join(', ')}.`, `Saved: ${hechos.join(', ')}.`, 'ok');
        estadoArchivos(); llenarCual();
    }
    btnGuardar.addEventListener('click', guardar);
    $('px-descartar').addEventListener('click', () => {
        for (const n of sucios()) { F[n].datos = clonar(F[n].original); cambio(n); }
        llenarCual(); abrir();
        rotular('Cambios descartados.', 'Changes discarded.', 'ok');
    });

    window.addEventListener('keydown', e => {
        if (ctx.pestana !== 'pixeles') return;
        const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
        const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
        if (mod && k === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); return; }
        if (enCampo) return;
        if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); deshacerPaso(); }
        else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); rehacerPaso(); }
        else if (!mod && !e.altKey) {
            const atajo = { b: 'lapiz', e: 'borrador', i: 'gotero', g: 'relleno' }[k];
            if (atajo) ponerHerramienta(atajo);
            else if (k === 'm') alternarEspejo();
        }
    });
    window.addEventListener('beforeunload', e => { if (sucios().length) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(() => { llenarCual(); pintarPaneles(); pintarVistas(); estadoArchivos(); });

    llenarCual();
    ponerHerramienta('lapiz');
    abrir();
    estadoArchivos();
}
