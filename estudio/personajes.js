// =========================================================
// VENJY · Estudio · pestaña Personajes (Etapa B · B5, estudio/DISENO.md §41)
// Edita mundo/datos/personajes.json: personas nuevas hechas solo con datos (nombre, cómo se ven, dónde y a qué hora
// están, qué hacen mientras esperan, qué dicen, qué les gusta y a quién conocen) y cambios de apariencia de los 9 de
// criaturas/amigos.js. Vista previa de frente con las mismas pieles del juego (pielDe). Vista simple: listas y colores
// con nombres comunes y «Nueva persona» partiendo de alguien parecido; desplazamiento, giro, tamaño exacto, estampado,
// requisitos de los temas, opiniones y gestos, en Avanzado. Cada cambio se manda al juego (en vivo con ?estudio);
// Guardar escribe con If-Match. Para afinar dónde está parada: pestaña Posiciones.
// =========================================================
import { PERSONAS } from '../mundo/criaturas/amigos.js';
import { pielDe } from '../mundo/criaturas/pieles.js';
import { O } from '../mundo/supervivencia/objetos.js';
import { B } from '../mundo/texturas.js';
import {
    PERSONAS_CODIGO, PINTADOS_A_MANO, ESTILOS_PELO, ROPAS, ZAPATILLAS, CABEZA, POSTURAS, TAMANOS, RELACIONES, LUGARES_PERSONA,
    APARIENCIA_BASE, BASES, GLOBO_BASE, descriptorDe, aparienciaDe, claveDeNombre, esDelCodigo, lugarDe, horarioDe, reglasPersonajes
} from '../mundo/datos/personajes.js';
import { instalarDeshacer } from './campo-comun.js';

const clonar = o => JSON.parse(JSON.stringify(o));
const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const NOMBRES_CODIGO = { pony: 'Pony', salonas: 'Salonas', lona: 'Lona', venjy: 'Venjy' };
for (const k of PERSONAS_CODIGO) NOMBRES_CODIGO[k] = PERSONAS[k].nombre;
// Objetos que se pueden regalar: los de la supervivencia (O) y los bloques con nombre, en minúscula como /dar
const OBJETOS = [...Object.keys(O), ...Object.keys(B).filter(k => B[k] > 0 && k !== 'AGUA' && k !== 'LAVA')].sort();

export async function montarPersonajes(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const L = x => (x && (x[ctx.idioma] || x.es)) || '';
    const msg = $('pj-mensaje'), btnGuardar = $('pj-guardar'), sel = $('pj-persona'), form = $('pj-form');
    let etag = null, original = null, datos = null, actual = null;
    try {
        const r = await fetch('../mundo/datos/personajes.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text());
    } catch (e) { msg.textContent = 'No se pudo leer mundo/datos/personajes.json'; return; }
    if (!esObj(original.personas)) original.personas = {};
    datos = clonar(original);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    ctx.sucios.personajes = sucio;
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const hist = instalarDeshacer(ctx, { pestana: 'personajes', idBoton: 'pj-descartar', leer: () => JSON.stringify(datos), poner: x => { datos = JSON.parse(x); pintar(); cambio(false); } });
    const anclas = new Set(Object.keys(LUGARES_PERSONA));
    const nuevas = () => Object.keys(datos.personas).filter(k => !esDelCodigo(k));
    const todas = () => [...PERSONAS_CODIGO, ...PINTADOS_A_MANO, ...nuevas()];
    const nombreDe = k => (datos.personas[k] && datos.personas[k].nombre) || NOMBRES_CODIGO[k] || k;
    const def = () => (actual ? datos.personas[actual] : null);
    const delCodigo = () => PERSONAS_CODIGO.includes(actual);

    function cambio(anotar = true) {
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
        $('pj-descartar').disabled = !sucio();
        if (anotar) hist.anotar();
        ctx.puente.enviarDatos('personajes', datos);
        pintarAvisos();
        pintarVista();
    }

    // ---------- Apariencia efectiva (código + JSON, o base + JSON) ----------
    function descriptor() {
        const d = def();
        if (delCodigo()) return descriptorDe(d && d.apariencia, PERSONAS[actual]);
        return descriptorDe(d && d.apariencia);
    }
    function aparienciaActual() { return aparienciaDe(descriptor()); }
    // Cambia una ruta de la apariencia (en una del código crea la entrada solo con lo que cambia)
    function ponerAp(ruta, valor) {
        if (!actual) return;
        if (!datos.personas[actual]) datos.personas[actual] = {};
        const p = datos.personas[actual];
        if (!esObj(p.apariencia)) p.apariencia = {};
        let o = p.apariencia;
        for (const k of ruta.slice(0, -1)) { if (!esObj(o[k])) o[k] = {}; o = o[k]; }
        o[ruta[ruta.length - 1]] = valor;
        cambio();
    }

    // ---------- Vista previa de frente ----------
    function pintarVista() {
        const c = $('pj-vista'), x = c.getContext('2d');
        x.clearRect(0, 0, c.width, c.height);
        if (!actual) return;
        if (PINTADOS_A_MANO.includes(actual)) return;
        let d;
        try { d = descriptor(); } catch (e) { return; }
        const piel = pielDe(d);
        let sem = 1234;
        const r = () => { sem = (sem * 9301 + 49297) % 233280; return sem / 233280; };
        const K = 5, esc = d.escala || 1, W = 32 * K * esc, ox = (c.width - W) / 2, oy = c.height - 64 * K * esc - 4;
        const px = (bx, by, w, h, pintor, espejo = false) => {
            if (!pintor) return;
            for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
                const col = pintor(espejo ? w - 1 - i : i, j, r);
                if (!col || col[3] === 0) continue;
                x.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
                x.fillRect(ox + (bx + i) * K * esc, oy + (by + j) * K * esc, Math.ceil(K * esc), Math.ceil(K * esc));
            }
        };
        px(8, 0, 16, 16, piel.cabeza.frente);
        px(8, 16, 16, 24, piel.cuerpo.frente);
        px(0, 16, 8, 24, piel.brazo.frente);
        px(24, 16, 8, 24, piel.brazo.frente, true);
        px(8, 40, 8, 24, piel.pierna.frente);
        px(16, 40, 8, 24, piel.pierna.frente, true);
        // Lo que va con volumen en el juego, dibujado encima
        const caja = (bx, by, w, h, col) => { x.fillStyle = `rgb(${col.map(v => v | 0).join(',')})`; x.fillRect(ox + bx * K * esc, oy + by * K * esc, w * K * esc, h * K * esc); };
        for (const e of piel.extras) {
            if (e.tipo === 'lentes') { for (const lx of [10, 17]) { caja(lx, 6, 5, 1, e.color); caja(lx, 8, 5, 1, e.color); caja(lx, 6, 1, 3, e.color); caja(lx + 4, 6, 1, 3, e.color); } caja(15, 7, 2, 1, e.color); }
            if (e.tipo === 'gorro') { caja(7, -3, 18, 4, e.color); caja(7, 1, 18, 1, e.color.map(v => v * 0.7)); }
            if (e.tipo === 'paja') { caja(4, -1, 24, 2, e.color); caja(9, -4, 14, 3, e.color); caja(9, -2, 14, 1, [190, 36, 34]); }
            if (e.tipo === 'mechones' || e.tipo === 'rulos') caja(7, -1, 18, 2, e.color);
        }
    }

    // ---------- Campos ----------
    const avanzado = el => { el.classList.add('solo-avanzado'); return el; };
    function rotulo(es, en) { const s = document.createElement('span'); s.textContent = t(es, en); return s; }
    function campo(es, en, input) { const l = document.createElement('label'); l.className = 'campo'; l.append(rotulo(es, en), input); return l; }
    function color(es, en, valor, al) {
        const i = document.createElement('input'); i.type = 'color'; i.value = valor || '#808080';
        i.addEventListener('input', () => al(i.value));
        return campo(es, en, i);
    }
    function lista(es, en, opciones, valor, al) {
        const s = document.createElement('select');
        for (const [v, oes, oen] of opciones) { const o = document.createElement('option'); o.value = String(v); o.textContent = t(oes, oen ?? oes); s.appendChild(o); }
        s.value = String(valor);
        s.addEventListener('change', () => al(s.value));
        return campo(es, en, s);
    }
    function marca(es, en, valor, al) {
        const l = document.createElement('label'); l.className = 'casilla-marca';
        const i = document.createElement('input'); i.type = 'checkbox'; i.checked = !!valor;
        i.addEventListener('change', () => al(i.checked));
        l.append(i, rotulo(es, en));
        return l;
    }
    function numero(es, en, valor, min, max, paso, al) {
        const i = document.createElement('input'); i.type = 'number'; i.min = min; i.max = max; i.step = paso; i.value = valor;
        i.addEventListener('change', () => { const n = Number(i.value); if (i.value !== '' && Number.isFinite(n)) al(Math.min(max, Math.max(min, n))); });
        return campo(es, en, i);
    }
    function texto(es, en, valor, al, max = 160) {
        const i = document.createElement('input'); i.type = 'text'; i.maxLength = max; i.value = valor || '';
        i.addEventListener('change', () => al(i.value.trim()));
        return campo(es, en, i);
    }
    // Par ES/EN en una fila
    function par(es, en, valor, al) {
        const fila = document.createElement('div'); fila.className = 'pj-par';
        const v = esObj(valor) ? valor : { es: '', en: '' };
        const poner = () => al(v.es && v.en ? { es: v.es, en: v.en } : null); // un texto editado vuelve a «sin revisar»
        fila.append(texto(es + ' (ES)', en + ' (ES)', v.es, s => { v.es = s; poner(); }), texto(es + ' (EN)', en + ' (EN)', v.en, s => { v.en = s; poner(); }));
        return fila;
    }
    function titulo(es, en) { const h = document.createElement('h3'); h.className = 'pj-titulo'; h.textContent = t(es, en); return h; }
    function grupo(...hijos) { const g = document.createElement('div'); g.className = 'pj-grupo'; g.append(...hijos.filter(Boolean)); return g; }
    function boton(es, en, f, clase = 'boton chico secundario') { const b = document.createElement('button'); b.type = 'button'; b.className = clase; b.textContent = t(es, en); b.addEventListener('click', f); return b; }
    // Ruta dentro de la persona actual (no apariencia)
    function poner(ruta, valor) {
        let o = datos.personas[actual];
        for (const k of ruta.slice(0, -1)) { if (!esObj(o[k])) o[k] = {}; o = o[k]; }
        const u = ruta[ruta.length - 1];
        if (valor === null || valor === undefined || valor === '') delete o[u]; else o[u] = valor;
        cambio();
    }

    function pintarApariencia() {
        const a = aparienciaActual();
        const cab = a.sombrero === 'paja' ? 'paja' : a.gorro ? 'gorro' : '';
        const tam = TAMANOS.reduce((m, x) => (Math.abs(x[0] - (a.escala || 1)) < Math.abs(m[0] - (a.escala || 1)) ? x : m))[0];
        return [
            titulo('Cómo se ve', 'Looks'),
            grupo(
                color('Piel', 'Skin', a.piel, v => ponerAp(['piel'], v)),
                color('Ojos', 'Eyes', a.ojos, v => ponerAp(['ojos'], v)),
                color('Pelo', 'Hair', a.pelo.color, v => ponerAp(['pelo', 'color'], v)),
                lista('Peinado', 'Hairstyle', ESTILOS_PELO, a.pelo.estilo, v => ponerAp(['pelo', 'estilo'], v))
            ),
            grupo(
                lista('Ropa', 'Clothes', ROPAS, a.ropa.tipo, v => ponerAp(['ropa', 'tipo'], v)),
                color('Color de la ropa', 'Clothes color', a.ropa.color, v => ponerAp(['ropa', 'color'], v)),
                color('Pantalón', 'Trousers', a.pantalon, v => ponerAp(['pantalon'], v)),
                lista('Zapatos', 'Shoes', ZAPATILLAS, a.zapatillas, v => ponerAp(['zapatillas'], v))
            ),
            grupo(
                lista('En la cabeza', 'On the head', CABEZA, cab, v => {
                    const p = datos.personas[actual] || (datos.personas[actual] = {});
                    p.apariencia = { ...(p.apariencia || {}), sombrero: v === 'paja' ? 'paja' : '', gorro: v === 'gorro' ? (a.gorro || '#c03030') : '' };
                    cambio(); pintar();
                }),
                cab === 'gorro' ? color('Color del gorro', 'Beanie color', a.gorro, v => ponerAp(['gorro'], v)) : null,
                lista('Tamaño', 'Size', TAMANOS, tam, v => ponerAp(['escala'], Number(v))),
                marca('Barba', 'Beard', a.barba, v => ponerAp(['barba'], v)),
                marca('Lentes', 'Glasses', a.lentes, v => ponerAp(['lentes'], v)),
                marca('Lunar', 'Mole', a.lunar, v => ponerAp(['lunar'], v))
            ),
            avanzado(grupo(
                numero('Tamaño exacto', 'Exact size', a.escala || 1, 0.7, 1.3, 0.01, v => ponerAp(['escala'], v)),
                marca('Estampado en la polera', 'Print on the shirt', !!a.ropa.estampado, v => { ponerAp(['ropa', 'estampado'], v ? '#e2e2dc' : ''); pintar(); }),
                a.ropa.estampado ? color('Color del estampado', 'Print color', a.ropa.estampado, v => ponerAp(['ropa', 'estampado'], v)) : null,
                color('Color de la barba', 'Beard color', a.barbaColor || a.pelo.color, v => ponerAp(['barbaColor'], v)),
                lista('Barba', 'Beard style', [['completa', 'Completa', 'Full'], ['chivo', 'Perilla', 'Goatee']], a.barbaEstilo || 'completa', v => ponerAp(['barbaEstilo'], v)),
                marca('Ojos cansados', 'Tired eyes', a.ojosRojos, v => ponerAp(['ojosRojos'], v))
            ))
        ];
    }

    function pintarDonde() {
        const d = def(), l = lugarDe(d), h = horarioDe(d);
        const lugares = Object.entries(LUGARES_PERSONA).map(([k, v]) => [k, v.nombre[0], v.nombre[1]]);
        const ponerLugar = cambios => { poner(['lugar'], { ...lugarDe(datos.personas[actual]), ...cambios }); };
        return [
            titulo('Dónde y cuándo', 'Where and when'),
            grupo(
                lista('Vive en', 'Lives at', lugares, l.ancla, v => ponerLugar({ ancla: v })),
                numero('Llega a las', 'Arrives at', h.de, 0, 24, 0.5, v => poner(['horario', 'de'], v)),
                numero('Se va a las', 'Leaves at', h.a, 0, 24, 0.5, v => poner(['horario', 'a'], v)),
                lista('Mientras espera', 'While waiting', POSTURAS, d.postura || 'de pie', v => poner(['postura'], v)),
                color('Color de su globo', 'Speech bubble color', d.globo || GLOBO_BASE, v => poner(['globo'], v))
            ),
            Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: t('Para dejarla justo donde quieres, usa la pestaña Posiciones (después de guardar).', 'To place them exactly, use the Positions tab (after saving).') }),
            avanzado(grupo(
                numero('Hacia el este (dx)', 'East (dx)', l.dx, -200, 200, 0.1, v => ponerLugar({ dx: v })),
                numero('Hacia el sur (dz)', 'South (dz)', l.dz, -200, 200, 0.1, v => ponerLugar({ dz: v })),
                numero('Giro (grados)', 'Rotation (degrees)', l.giro || 0, -180, 180, 1, v => ponerLugar({ giro: v })),
                marca('Busca el suelo', 'Finds the ground', l.dy === 'suelo', v => ponerLugar({ dy: v ? 'suelo' : 0 }))
            )),
            avanzado(par('Cómo nombra el lugar', 'How the place is named', d.horario && d.horario.lugar, v => poner(['horario', 'lugar'], v)))
        ];
    }

    // Lista de textos con «Agregar» y «Quitar»
    function listaTextos(arr, crear, pintarFila) {
        const caja = document.createElement('div'); caja.className = 'pj-lista';
        arr.forEach((x, i) => {
            const fila = document.createElement('div'); fila.className = 'pj-fila';
            fila.append(...pintarFila(x, i), boton('Quitar', 'Remove', () => { arr.splice(i, 1); cambio(); pintar(); }));
            caja.appendChild(fila);
        });
        caja.appendChild(boton('Agregar', 'Add', () => { arr.push(crear()); cambio(); pintar(); }, 'boton chico'));
        return caja;
    }
    function pintarDice() {
        const d = def();
        if (!Array.isArray(d.frases)) d.frases = [];
        if (!esObj(d.hablar)) d.hablar = {};
        const hb = d.hablar;
        if (!Array.isArray(hb.temas)) hb.temas = [];
        const idLibre = () => { let i = hb.temas.length + 1; while (hb.temas.some(x => x.id === 'tema' + i)) i++; return 'tema' + i; };
        const niveles = [['', 'Siempre', 'Always'], ...[1, 2, 3, 4].map(n => [String(n), 'Desde amistad ' + n, 'From friendship ' + n])];
        return [
            titulo('Qué dice', 'What they say'),
            Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: t('Frases del globo al acercarte (una al azar):', 'Bubble lines when you come close (one at random):') }),
            listaTextos(d.frases, () => ({ es: 'Hola.', en: 'Hi.' }), (f, i) => [par('Frase', 'Line', f, v => { if (v) d.frases[i] = v; cambio(); })]),
            Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: t('Pestaña «Hablar»:', '«Talk» tab:') }),
            par('Saludo al conocerte', 'Greeting to strangers', hb.saludo && hb.saludo.bajo, v => { hb.saludo = { ...(hb.saludo || {}), bajo: v || { es: '¿Hola?', en: 'Hi?' } }; if (!hb.saludo.alto) hb.saludo.alto = { es: '¡Hola de nuevo!', en: 'Hi again!' }; cambio(); }),
            par('Saludo de amigos', 'Greeting to friends', hb.saludo && hb.saludo.alto, v => { hb.saludo = { ...(hb.saludo || {}), alto: v || { es: '¡Hola de nuevo!', en: 'Hi again!' } }; if (!hb.saludo.bajo) hb.saludo.bajo = { es: '¿Hola?', en: 'Hi?' }; cambio(); }),
            listaTextos(hb.temas, () => ({ id: idLibre(), p: { es: '¿Pregunta?', en: 'Question?' }, r: { es: 'Respuesta.', en: 'Answer.' } }), (tm, i) => [
                par('Pregunta', 'Question', tm.p, v => { if (v) hb.temas[i].p = v; cambio(); }),
                par('Respuesta', 'Answer', tm.r, v => { if (v) hb.temas[i].r = v; cambio(); }),
                avanzado(lista('Aparece', 'Shows up', niveles, tm.req && tm.req.nivel ? String(tm.req.nivel) : '', v => { if (v) hb.temas[i].req = { nivel: Number(v) }; else delete hb.temas[i].req; cambio(); })),
                avanzado(texto('Gesto al responder', 'Gesture when answering', tm.g, v => { if (v) hb.temas[i].g = v; else delete hb.temas[i].g; cambio(); }, 40))
            ]),
            par('Cuando le regalas su favorito', 'When you give their favorite', hb.regalo, v => poner(['hablar', 'regalo'], v)),
            avanzado(texto('Gesto al recibir el regalo', 'Gesture on receiving the gift', hb.gestoRegalo, v => poner(['hablar', 'gestoRegalo'], v), 40))
        ];
    }

    function pintarAmigos() {
        const d = def();
        if (!Array.isArray(d.regalo)) d.regalo = [];
        const opsObjeto = [['', '(nada)', '(nothing)'], ...OBJETOS.map(k => [k, k.toLowerCase().replace(/_/g, ' ')])];
        const otros = todas().filter(k => k !== actual);
        const filasAmigos = otros.map(o => lista(nombreDe(o), nombreDe(o), RELACIONES.map(([es, en], i) => [i, es, en]), (d.amigos && d.amigos[o]) || 0, v => {
            const n = Number(v);
            if (!esObj(d.amigos)) d.amigos = {};
            if (n) d.amigos[o] = n; else delete d.amigos[o];
            if (!Object.keys(d.amigos).length) delete d.amigos;
            cambio(); pintar();
        }));
        const conocidos = Object.keys(d.amigos || {});
        return [
            titulo('Gustos y amigos', 'Likes and friends'),
            grupo(
                lista('Regalo favorito', 'Favorite gift', opsObjeto, d.regalo[0] || '', v => { d.regalo = [v, ...d.regalo.slice(1)].filter(Boolean); cambio(); }),
                lista('Otro regalo que le gusta', 'Another gift they like', opsObjeto, d.regalo[1] || '', v => { d.regalo = [d.regalo[0], v].filter(Boolean); cambio(); })
            ),
            Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: t('A quién conoce (cambia cuánta amistad tienes al partir con la skin de esa persona y de quién opina):', 'Who they know (changes your starting friendship with that person\'s skin and whom they talk about):') }),
            grupo(...filasAmigos),
            avanzado(titulo('Qué opina de cada uno', 'What they think of each one')),
            ...conocidos.map(o => avanzado(par(t('Opina de ', 'About ') + nombreDe(o), t('Opina de ', 'About ') + nombreDe(o), d.hablar && d.hablar.opiniones && d.hablar.opiniones[o], v => {
                if (!esObj(d.hablar)) d.hablar = {};
                if (!esObj(d.hablar.opiniones)) d.hablar.opiniones = {};
                if (v) d.hablar.opiniones[o] = v; else delete d.hablar.opiniones[o];
                if (!Object.keys(d.hablar.opiniones).length) delete d.hablar.opiniones;
                cambio();
            })))
        ];
    }

    // ---------- Lista de personas y arriba ----------
    function pintarLista() {
        sel.textContent = '';
        const og = (es, en, claves) => {
            if (!claves.length) return;
            const g = document.createElement('optgroup'); g.label = t(es, en);
            for (const k of claves) {
                const o = document.createElement('option'); o.value = k;
                const cambiado = JSON.stringify(datos.personas[k]) !== JSON.stringify(original.personas[k]);
                o.textContent = nombreDe(k) + (datos.personas[k] && datos.personas[k].borrador ? t(' (borrador)', ' (draft)') : '') + (cambiado ? ' •' : '');
                g.appendChild(o);
            }
            sel.appendChild(g);
        };
        og('Personas nuevas', 'New people', nuevas());
        og('Del juego (solo cómo se ven)', 'From the game (looks only)', PERSONAS_CODIGO);
        if (actual) sel.value = actual;
        // «Parecida a»: bases y cualquier persona con apariencia
        const base = $('pj-base');
        base.textContent = '';
        for (const [k, b] of Object.entries(BASES)) { const o = document.createElement('option'); o.value = 'base:' + k; o.textContent = t(b.es, b.en); base.appendChild(o); }
        for (const k of [...PERSONAS_CODIGO, ...nuevas()]) { const o = document.createElement('option'); o.value = k; o.textContent = t('Parecida a ', 'Like ') + nombreDe(k); base.appendChild(o); }
    }
    function pintarAvisos() {
        const caja = $('pj-avisos');
        caja.textContent = '';
        const r = reglasPersonajes(datos, { anclas }).filter(x => !actual || x.texto.includes(`.${actual}`) || x.texto.includes(`.${actual}:`));
        for (const x of r.slice(0, 6)) { const p = document.createElement('p'); p.className = x.tipo === 'error' ? 'error' : 'aviso'; p.textContent = x.texto; caja.appendChild(p); }
    }
    function pintar() {
        pintarLista();
        form.textContent = '';
        const d = def();
        $('pj-quitar').hidden = !actual || delCodigo();
        $('pj-ir').disabled = !actual;
        if (!actual) { form.appendChild(Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: t('Elige a alguien o crea una persona nueva.', 'Pick someone or create a new person.') })); pintarVista(); return; }
        if (delCodigo()) {
            form.append(Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: t(`${nombreDe(actual)} vive en el código: aquí solo cambia cómo se ve. Se nota al recargar el juego.`, `${nombreDe(actual)} lives in the code: only their looks change here. It shows after reloading the game.`) }),
                ...pintarApariencia(),
                boton('Volver a como era', 'Back to how they were', () => { delete datos.personas[actual]; cambio(); pintar(); }));
        } else {
            form.append(
                titulo('Quién es', 'Who they are'),
                grupo(
                    texto('Nombre', 'Name', d.nombre, v => { if (v) { d.nombre = v; cambio(); pintarLista(); } }, 24),
                    marca('Todavía no aparece en el juego (borrador)', 'Not in the game yet (draft)', d.borrador, v => { poner(['borrador'], v || null); pintarLista(); })
                ),
                ...pintarApariencia(), ...pintarDonde(), ...pintarDice(), ...pintarAmigos()
            );
        }
        pintarAvisos();
        pintarVista();
    }

    // ---------- Acciones ----------
    $('pj-nueva').addEventListener('click', () => {
        const nombre = $('pj-nombre').value.trim();
        if (!nombre) { rotular('Escribe primero el nombre.', 'Write the name first.', 'error'); $('pj-nombre').focus(); return; }
        const clave = claveDeNombre(nombre, todas());
        const b = $('pj-base').value;
        let nueva;
        if (b.startsWith('base:')) nueva = clonar(BASES[b.slice(5)].def);
        else if (esDelCodigo(b)) nueva = { apariencia: aparienciaDe(descriptorDe(datos.personas[b] && datos.personas[b].apariencia, PERSONAS[b])), postura: 'de pie' };
        else { nueva = clonar(datos.personas[b]); delete nueva.hablar; delete nueva.frases; delete nueva.amigos; }
        nueva = {
            nombre, borrador: true, apariencia: nueva.apariencia || clonar(APARIENCIA_BASE), lugar: nueva.lugar || { ancla: 'campamento', dx: 4, dy: 'suelo', dz: 6 },
            postura: nueva.postura || 'de pie', horario: nueva.horario || { de: 8, a: 18 }, globo: nueva.globo || GLOBO_BASE,
            frases: [{ es: `Hola, soy ${nombre}.`, en: `Hi, I'm ${nombre}.` }],
            hablar: { saludo: { bajo: { es: 'Hola. ¿Te conozco?', en: 'Hi. Do I know you?' }, alto: { es: '¡Hola! Qué bueno verte.', en: 'Hi! Good to see you.' } }, temas: [{ id: 'quien', p: { es: '¿Quién eres?', en: 'Who are you?' }, r: { es: `Soy ${nombre}.`, en: `I'm ${nombre}.` } }] }
        };
        datos.personas[clave] = nueva;
        actual = clave;
        $('pj-nombre').value = '';
        rotular(`${nombre} quedó como borrador: cuando esté lista, desmarca «borrador» y guarda.`, `${nombre} was saved as a draft: when ready, untick «draft» and save.`, 'ok');
        cambio(); pintar();
    });
    $('pj-quitar').addEventListener('click', () => {
        if (!actual || delCodigo()) return;
        if (!confirm(t(`¿Borrar a ${nombreDe(actual)}?`, `Delete ${nombreDe(actual)}?`))) return;
        delete datos.personas[actual];
        actual = nuevas()[0] || PERSONAS_CODIGO[0];
        cambio(); pintar();
    });
    $('pj-ir').addEventListener('click', async () => {
        try { await ctx.puente.tp(actual); rotular(`Junto a ${nombreDe(actual)} (pestaña Juego).`, `Next to ${nombreDe(actual)} (Game tab).`, 'ok'); }
        catch (e) { rotular(t('Abre la pestaña Juego y guarda primero (el juego debe tener a esta persona): ', 'Open the Game tab and save first: ') + e.message, e.message, 'error'); }
    });
    sel.addEventListener('change', () => { actual = sel.value; pintar(); });
    async function guardar() {
        const err = reglasPersonajes(datos, { anclas }).filter(x => x.tipo === 'error');
        if (err.length) { rotular('No se guardó: ' + err[0].texto, 'Not saved: ' + err[0].texto, 'error'); return; }
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/personajes', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
        pintarLista();
    }
    btnGuardar.addEventListener('click', guardar);
    $('pj-descartar').addEventListener('click', () => { datos = clonar(original); if (actual && !datos.personas[actual] && !delCodigo()) actual = null; pintar(); cambio(); });
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'personajes' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    ctx.alIdioma.push(() => pintar());
    actual = nuevas()[0] || PERSONAS_CODIGO[0];
    btnGuardar.disabled = true;
    $('pj-descartar').disabled = true;
    pintar();
}
