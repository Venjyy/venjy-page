// =========================================================
// VENJY · Estudio · pestaña Carrera: el «Gran Premio del Living» (carrera de gatas, 7h-1)
// Edita mundo/datos/carrera.json. Debajo del juego, el editor de pista (carrera-pista.js: plano del living con la
// carretera y los muebles para arrastrar, perfil de alturas, inspector, avisos y «Probar con la IA»). En el panel:
// la carrera (vueltas, cuenta, presentación, tope, dificultad), la pista (ancho, muestreo, salida), la física de una
// gata (velocidad, giro, salto, derrape y sus 3 niveles, turbos, paredes, caída), los objetos (cajas, ruleta y los
// seis: peso según el puesto, efecto, nombre y color; dónde van las cajas se elige en el plano), las seis gatas (nombre, carácter,
// pelaje y pañuelo), la IA, la cámara, el celular, la sala y el premio por puesto. Los valores que muestra son los
// reales (código + JSON) de carrera-modelo.js. «Ver la pista» abre la sala en el juego (cámara que la recorre);
// «Correr con…» empieza una carrera. Cada cambio va en vivo (mensaje `datos`). Guardar escribe con If-Match.
// =========================================================
import { reglasCarrera, OBJETOS } from '../mundo/supervivencia/carrera-modelo.js';
import { montarEditorPista } from './carrera-pista.js';

const clonar = o => JSON.parse(JSON.stringify(o));
// Grupos de números: [clave (o null = raíz), título ES, título EN, { campo: [ES, EN, min, max, paso] }]
const GRUPOS = [
    [null, 'Carrera', 'Race', {
        vueltas: ['vueltas', 'laps', 1, 9, 1], cuenta: ['segundos del semáforo', 'countdown seconds', 1, 6, 1],
        intro: ['segundos de la presentación', 'intro seconds', 0, 20, 0.5], tope: ['segundos máximos de carrera', 'max race seconds', 60, 1800, 10]
    }],
    ['pista', 'Pista', 'Track', {
        ancho: ['ancho base (bloques)', 'base width (blocks)', 3, 20, 0.5], paso: ['muestreo (bloques; menos = más fino)', 'sampling (blocks; lower = finer)', 0.25, 2, 0.05],
        salida: ['bloques antes de la línea donde parte la 1.ª fila', 'blocks behind the line for row 1', 1, 12, 0.5]
    }],
    ['gata', 'Cómo corre una gata', 'How a cat runs', {
        vel: ['velocidad máxima (bloques/s)', 'top speed (blocks/s)', 4, 30, 0.5], acel: ['aceleración', 'acceleration', 2, 40, 0.5],
        freno: ['frenar', 'braking', 2, 60, 1], roce: ['se frena sola sin acelerar', 'slows by itself', 0, 20, 0.5],
        atras: ['marcha atrás (fracción)', 'reverse (fraction)', 0, 1, 0.05], giro: ['giro (rad/s)', 'turning (rad/s)', 0.5, 6, 0.05],
        gravedad: ['gravedad', 'gravity', 5, 80, 1], salto: ['fuerza del salto (Espacio)', 'hop strength (Space)', 1, 20, 0.5],
        derrapeGiro: ['derrape: giro propio (rad/s)', 'drift: own turn (rad/s)', 0.2, 4, 0.05], derrapeMando: ['derrape: cuánto lo abre o cierra el mando', 'drift: steering control', 0, 3, 0.05],
        turbo: ['velocidad con turbo (×)', 'boost speed (×)', 1, 2.5, 0.05], placa: ['segundos de turbo de una placa', 'boost pad seconds', 0, 4, 0.05],
        truco: ['segundos de turbo de un truco', 'trick boost seconds', 0, 3, 0.05], pared: ['velocidad que queda al chocar la pared', 'speed kept on a wall hit', 0, 1, 0.05],
        roza: ['ángulo desde el que choca (menos = se desliza)', 'angle that counts as a hit (lower = slides)', 0.05, 1, 0.05], rozaRoce: ['roce al deslizarse por el borde', 'friction sliding on the edge', 0, 5, 0.1],
        radio: ['radio de la gata (choques)', 'cat radius (bumps)', 0.2, 1.2, 0.05], caida: ['segundos hasta que Lona te devuelve', 'seconds until Lona brings you back', 0.3, 5, 0.1],
        vuelve: ['bloques antes del hueco donde te deja Lona', 'blocks before the gap where Lona drops you', 2, 40, 0.5]
    }],
    ['ia', 'Gatas del juego (IA)', 'Game-driven cats (AI)', {
        mira: ['bloques que mira adelante', 'blocks it looks ahead', 2, 20, 0.5], linea: ['se corre al interior de la curva (0-1)', 'inside line (0-1)', 0, 1, 0.05],
        curva: ['cuánto frena en las curvas', 'how much it brakes in turns', 0, 40, 0.5], derrapa: ['derrapa desde esta curvatura', 'drifts from this curvature', 0.01, 0.3, 0.005],
        error: ['errores en la línea (fácil y normal)', 'line mistakes (easy and normal)', 0, 2, 0.05], empuje: ['ayuda si va muy atrás tuyo (fracción)', 'catch-up help (fraction)', 0, 0.3, 0.01]
    }],
    ['objetos', 'Objetos (cajas en la pista)', 'Items (boxes on the track)', {
        activos: ['1 = con objetos, 0 = sin', '1 = items on, 0 = off', 0, 1, 1], cuantas: ['cajas por fila (si la fila no dice)', 'boxes per row (default)', 1, 8, 1],
        ruleta: ['segundos de la ruleta', 'roulette seconds', 0, 4, 0.1], reaparece: ['segundos hasta que vuelve una caja', 'seconds until a box returns', 0.5, 20, 0.5],
        radioCaja: ['tamaño de la caja (para tomarla)', 'box size (pickup)', 0.3, 2, 0.05], gracia: ['segundos sin pegarle a quien lo lanza', 'seconds it skips the thrower', 0, 2, 0.05],
        inmune: ['segundos sin otro golpe después de uno', 'seconds safe after a hit', 0, 5, 0.1]
    }],
    ['camara', 'Cámara', 'Camera', {
        distancia: ['distancia detrás de tu gata', 'distance behind your cat', 2, 14, 0.1], alto: ['altura', 'height', 0.5, 8, 0.1], mira: ['mira adelante (bloques)', 'looks ahead (blocks)', 0, 12, 0.5],
        fov: ['ángulo de visión', 'field of view', 40, 110, 1], fovTurbo: ['ángulo con turbo', 'field of view on boost', 40, 120, 1], suave: ['rapidez con que te sigue', 'follow speed', 1, 30, 0.5]
    }],
    ['tactil', 'Celular', 'Phone', { autoAcelerar: ['1 = acelera sola (sin botón ACELERAR)', '1 = auto gas (no GAS button)', 0, 1, 1] }],
    ['sala', 'La sala (living)', 'The room', {
        ancho: ['ancho', 'width', 60, 500, 1], fondo: ['fondo', 'depth', 60, 500, 1], alto: ['alto', 'height', 20, 150, 1], x: ['centro x', 'center x', -150, 150, 0.5], z: ['centro z', 'center z', -150, 150, 0.5]
    }]
];
const PATRONES = ['liso', 'atigrado', 'manchas', 'siames'];
// Cada objeto: además de su peso según el puesto (`primera`, `ultima`), nombre y color
const OBJ_TITULO = { pluma: ['Pluma (turbo)', 'Feather (boost)'], ovillo: ['Ovillo (se tira adelante; con S, atrás)', 'Yarn (thrown ahead; with S, back)'], caja: ['Caja de cartón (se deja atrás)', 'Cardboard box (dropped behind)'], pescado: ['Pescado (atrae y se lo comen)', 'Fish (pulls cats in)'], hierba: ['Hierba gatera (controles al revés)', 'Catnip (reversed controls)'], aspiradora: ['Aspiradora de Lona (las de adelante se asustan)', "Lona's vacuum (scares the ones ahead)"] };
const RADIO = ['tamaño del golpe', 'hit size', 0.3, 2, 0.05];
const OBJ_CAMPOS = {
    pluma: { turbo: ['segundos de turbo', 'boost seconds', 0.2, 4, 0.05] },
    ovillo: { vel: ['velocidad (bloques/s)', 'speed (blocks/s)', 10, 60, 1], vida: ['segundos que rueda', 'seconds rolling', 1, 15, 0.5], radio: RADIO, golpe: ['segundos aturdida', 'stun seconds', 0.2, 4, 0.1] },
    caja: { vida: ['segundos en la pista', 'seconds on the track', 5, 120, 1], radio: RADIO, golpe: ['segundos aturdida', 'stun seconds', 0.2, 4, 0.1] },
    pescado: { adelante: ['bloques adelante (si vas 1.ª)', 'blocks ahead (when leading)', 5, 60, 1], vida: ['segundos en la pista', 'seconds on the track', 2, 40, 1], atrae: ['distancia a la que atrae', 'pull distance', 2, 30, 0.5], fuerza: ['fuerza con que atrae (bloques/s)', 'pull strength (blocks/s)', 0, 12, 0.25], radio: RADIO, come: ['segundos comiendo', 'eating seconds', 0.2, 4, 0.1] },
    hierba: { alcance: ['alcance (bloques adelante o atrás)', 'reach (blocks ahead or behind)', 5, 120, 1], segundos: ['segundos al revés', 'reversed seconds', 0.5, 8, 0.1] },
    aspiradora: { segundos: ['segundos del susto', 'scare seconds', 0.3, 5, 0.1], freno: ['velocidad que les queda (fracción)', 'speed they keep (fraction)', 0.1, 1, 0.05], salto: ['salto del susto (× el salto)', 'scare hop (× hop)', 0, 2, 0.05] }
};

export async function montarCarrera(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const caja = $('ca-campos'), msg = $('ca-mensaje'), btnGuardar = $('ca-guardar');
    let etag = null, original = null, datos = null;
    try {
        const r = await fetch('../mundo/datos/carrera.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text()); datos = clonar(original);
    } catch (e) { caja.textContent = 'No se pudo leer mundo/datos/carrera.json'; return; }
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const cambio = (enviar = true) => { if (enviar) ctx.puente.enviarDatos('carrera', datos); btnGuardar.disabled = !sucio() || !ctx.servidor.escritura; };
    const real = () => reglasCarrera(datos);
    const editor = montarEditorPista(ctx, { datos: () => datos, cambio, real });

    function numero(etiqueta, valor, min, max, paso, poner) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const rg = document.createElement('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = paso; rg.value = valor;
        const n = document.createElement('input'); n.type = 'number'; n.min = min; n.max = max; n.step = paso; n.value = valor; n.style.width = '5em';
        const fijar = v => { if (!Number.isFinite(v)) return; v = Math.min(max, Math.max(min, v)); rg.value = v; n.value = v; poner(v); };
        rg.addEventListener('input', () => fijar(Number(rg.value)));
        rg.addEventListener('change', () => editor.pintar());
        n.addEventListener('change', () => { fijar(Number(n.value)); editor.pintar(); });
        const d = document.createElement('div'); d.className = 'fila-botones'; d.append(rg, n);
        fila.append(s, d);
        return fila;
    }
    const color = (etiqueta, valor, poner) => {
        const l = document.createElement('label'); l.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const c = document.createElement('input'); c.type = 'color'; c.value = valor || '#888888';
        c.addEventListener('change', () => poner(c.value));
        l.append(s, c); return l;
    };
    const boton = (es, en, f, clase = 'boton chico secundario') => {
        const b = document.createElement('button'); b.type = 'button'; b.className = clase; b.textContent = t(es, en);
        b.addEventListener('click', f); return b;
    };
    const seccion = (titulo, abierta = false) => {
        const sec = document.createElement('details'); sec.className = 'panel'; sec.open = abierta;
        const h = document.createElement('summary'); h.textContent = titulo;
        sec.appendChild(h); caja.appendChild(sec); return sec;
    };
    // Una gata del JSON (se crea con su clave al primer cambio; el resto viene del código)
    const gataPropia = clave => { datos.gatas = datos.gatas || []; let g = datos.gatas.find(x => x.clave === clave); if (!g) { g = { clave }; datos.gatas.push(g); } return g; };

    function pintar() {
        caja.textContent = '';
        const R = real();
        GRUPOS.forEach(([g, es, en, campos], i) => {
            const sec = seccion(t(es, en), i < 1);
            for (const [k, [ces, cen, min, max, paso]] of Object.entries(campos)) {
                const valor = g ? R[g][k] : R[k];
                sec.appendChild(numero(t(ces, cen), valor, min, max, paso, v => { if (g) { datos[g] = datos[g] || {}; datos[g][k] = v; } else datos[k] = v; cambio(); }));
            }
            if (g === 'gata') {
                // Los 3 niveles del derrape (azul, naranja, morado): segundos de carga y de turbo
                ['azul', 'naranja', 'morado'].forEach((nom, j) => {
                    sec.appendChild(numero(t(`derrape ${nom}: segundos de carga`, `${nom} drift: charge seconds`), R.gata.niveles[j], 0.1, 6, 0.05, v => { datos.gata = datos.gata || {}; datos.gata.niveles = clonar(real().gata.niveles); datos.gata.niveles[j] = v; cambio(); }));
                    sec.appendChild(numero(t(`derrape ${nom}: segundos de turbo`, `${nom} drift: boost seconds`), R.gata.turbos[j], 0.1, 4, 0.05, v => { datos.gata = datos.gata || {}; datos.gata.turbos = clonar(real().gata.turbos); datos.gata.turbos[j] = v; cambio(); }));
                });
            }
            if (g === 'objetos') for (const ob of OBJETOS) {
                const D = R.objetos[ob], f = document.createElement('div'); f.className = 'panel';
                const h = document.createElement('strong'); h.textContent = t(...OBJ_TITULO[ob]); f.appendChild(h);
                const propio = () => { datos.objetos = datos.objetos || {}; return (datos.objetos[ob] = datos.objetos[ob] || {}); };
                for (const l of ['es', 'en']) {
                    const n = document.createElement('input'); n.type = 'text'; n.value = D.nombre[l] || ''; n.maxLength = 24; n.title = l.toUpperCase();
                    n.addEventListener('change', () => { const v = n.value.trim(); if (v) { propio().nombre = { ...clonar(real().objetos[ob].nombre), [l]: v }; cambio(); } });
                    f.appendChild(n);
                }
                const campos = { primera: ['peso si va 1.ª', 'weight when 1st', 0, 5, 0.1], ultima: ['peso si va última', 'weight when last', 0, 5, 0.1], ...OBJ_CAMPOS[ob] };
                for (const [k, [ces, cen, min, max, paso]] of Object.entries(campos)) f.appendChild(numero(t(ces, cen), D[k], min, max, paso, v => { propio()[k] = v; cambio(); }));
                f.appendChild(color(t('color', 'color'), D.color, v => { propio().color = v; cambio(); }));
                sec.appendChild(f);
            }
            if (g === 'ia') for (const [k, es2, en2] of [['facil', 'fácil', 'easy'], ['normal', 'normal', 'normal'], ['dificil', 'difícil', 'hard']])
                sec.appendChild(numero(t(`velocidad en ${es2} (fracción)`, `speed on ${en2} (fraction)`), R.ia.niveles[k], 0.4, 1.2, 0.01, v => { datos.ia = datos.ia || {}; datos.ia.niveles = { ...real().ia.niveles, [k]: v }; cambio(); }));
        });
        // Las gatas corredoras
        const sg = seccion(t('Gatas corredoras', 'Racing cats'));
        for (const g of R.gatas) {
            const f = document.createElement('div'); f.className = 'panel';
            const h = document.createElement('strong'); h.textContent = g.nombre + (['mila', 'gala'].includes(g.clave) ? t(' (modelo del mundo)', ' (world model)') : ''); f.appendChild(h);
            const n = document.createElement('input'); n.type = 'text'; n.value = g.nombre; n.maxLength = 14;
            n.addEventListener('change', () => { const v = n.value.trim(); if (v) { gataPropia(g.clave).nombre = v; cambio(); pintar(); } });
            f.appendChild(n);
            for (const [k, es, en] of [['vel', 'velocidad (×)', 'speed (×)'], ['acel', 'aceleración (×)', 'acceleration (×)'], ['giro', 'giro (×)', 'handling (×)']])
                f.appendChild(numero(t(es, en), g[k] ?? 1, 0.8, 1.2, 0.01, v => { gataPropia(g.clave)[k] = v; cambio(); }));
            f.appendChild(color(t('pañuelo', 'scarf'), g.panuelo || { mila: '#e8742a', gala: '#e0a028', tigre: '#2a8ad8', pelusa: '#e04a8a', canela: '#4ab86a', sombra: '#8a5ad8' }[g.clave], v => { gataPropia(g.clave).panuelo = v; cambio(); }));
            if (g.pelaje) {
                for (const [k, es, en] of [['base', 'pelo', 'fur'], ['mancha', 'manchas', 'markings'], ['panza', 'panza', 'belly'], ['ojos', 'ojos', 'eyes']])
                    f.appendChild(color(t(es, en), g.pelaje[k] || (k === 'ojos' ? '#bac846' : g.pelaje.base), v => { const p = gataPropia(g.clave); p.pelaje = { ...clonar(real().gatas.find(x => x.clave === g.clave).pelaje), [k]: v }; cambio(); }));
                const sp = document.createElement('select');
                for (const k of PATRONES) sp.appendChild(new Option(k, k));
                sp.value = g.pelaje.patron || 'liso';
                sp.addEventListener('change', () => { const p = gataPropia(g.clave); p.pelaje = { ...clonar(real().gatas.find(x => x.clave === g.clave).pelaje), patron: sp.value }; cambio(); });
                f.appendChild(sp);
                f.appendChild(numero(t('tamaño', 'size'), g.escala || 1, 0.7, 1.4, 0.01, v => { gataPropia(g.clave).escala = v; cambio(); }));
            }
            sg.appendChild(f);
        }
        // Premio por puesto: objetos por clave (como /dar) y cantidad
        const sp = seccion(t('Premio por puesto (clave del objeto, como /dar)', 'Prize by place (item key, as in /dar)'));
        const puestos = R.premio.puestos;
        const listaPremio = (titulo, lista, propia) => {
            const h = document.createElement('strong'); h.textContent = titulo; sp.appendChild(h);
            lista.forEach(([clave, n], i) => {
                const fila = document.createElement('div'); fila.className = 'fila-botones';
                const ci = document.createElement('input'); ci.type = 'text'; ci.value = clave; ci.style.width = '12em';
                ci.addEventListener('change', () => { const v = ci.value.trim().toUpperCase(); if (/^[A-Z0-9_]{1,40}$/.test(v)) { propia()[i][0] = v; cambio(); } });
                const ni = document.createElement('input'); ni.type = 'number'; ni.min = 0; ni.max = 64; ni.step = 1; ni.value = n; ni.style.width = '4em';
                ni.addEventListener('change', () => { const v = Math.max(0, Math.min(64, Math.round(Number(ni.value)))); if (Number.isFinite(v)) { propia()[i][1] = v; cambio(); } });
                fila.append(ci, ni, boton('Quitar', 'Remove', () => { propia().splice(i, 1); cambio(); pintar(); }));
                sp.appendChild(fila);
            });
            sp.appendChild(boton('Agregar objeto', 'Add item', () => { propia().push(['LANA', 1]); cambio(); pintar(); }));
        };
        const premioPropio = () => { datos.premio = datos.premio || {}; if (!datos.premio.puestos) datos.premio.puestos = clonar(real().premio.puestos); if (!datos.premio.resto) datos.premio.resto = clonar(real().premio.resto); return datos.premio; };
        puestos.forEach((lista, j) => listaPremio(t(`${j + 1}.º puesto`, `Place ${j + 1}`), lista, () => premioPropio().puestos[j]));
        listaPremio(t('Los demás puestos', 'Other places'), R.premio.resto, () => premioPropio().resto);
        caja.appendChild(boton('Volver a todos los valores del código', 'Back to all code values', () => {
            for (const k of Object.keys(datos)) if (k !== '$schema' && k !== 'version' && k !== 'nota') delete datos[k];
            cambio(); pintar(); editor.pintar();
        }));
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/carrera', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    async function accion(a) {
        try {
            ctx.puente.enviarDatos('carrera', datos);
            await ctx.puente.enviar('carrera', { accion: a });
            if (a === 'ver') rotular('Listo: la cámara recorre la sala; cada cambio se ve al soltar.', 'Done: the camera tours the room; each change shows when you release.', 'ok');
            else if (a !== 'terminar') rotular('Listo: haz clic en el juego y maneja con W A S D y Espacio.', 'Done: click the game and drive with W A S D and Space.', 'ok');
        } catch (e) { rotular(e.message, e.message, 'error'); }
    }
    $('ca-ver').addEventListener('click', () => accion('ver'));
    $('ca-mila').addEventListener('click', () => accion('mila'));
    $('ca-gala').addEventListener('click', () => accion('gala'));
    $('ca-terminar').addEventListener('click', () => accion('terminar'));
    $('ca-descartar').addEventListener('click', () => { datos = clonar(original); cambio(); pintar(); editor.pintar(); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'carrera' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(() => { pintar(); editor.pintar(); });
    ctx.alPestana.push(p => { if (p === 'carrera') requestAnimationFrame(() => editor.pintar()); });
    pintar();
}
