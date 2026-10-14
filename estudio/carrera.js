// =========================================================
// VENJY · Estudio · pestaña Carrera: la carrera de gatas de la Gatera (7h-1)
// Edita mundo/datos/carrera.json: vueltas y cuenta, el circuito (puntos en bloques desde el centro de la Gatera y su
// ancho), cómo corre una gata (velocidad, giro, derrape y turbo), el carácter de Mila y Gala, la IA, la red, el público
// y el premio. Los valores que muestra son los reales (código + JSON) de carrera-modelo.js. Comparte pantalla con el
// juego: «Correr con Mila/Gala» abre la carrera (mensaje `carrera`) y cada número va en vivo (mensaje `datos`; el
// circuito se vuelve a armar al momento). Guardar escribe con If-Match, como Formas.
// =========================================================
import { CARRERA, reglasCarrera } from '../mundo/supervivencia/carrera-modelo.js';

const clonar = o => JSON.parse(JSON.stringify(o));
// Grupos de números: [clave (o null = raíz), título ES, título EN, { campo: [ES, EN, min, max, paso] }]
const GRUPOS = [
    [null, 'Carrera', 'Race', {
        vueltas: ['vueltas', 'laps', 1, 9, 1], cuenta: ['segundos de la cuenta (3, 2, 1)', 'countdown seconds', 1, 6, 1],
        tope: ['segundos máximos de carrera', 'max race seconds', 30, 600, 10]
    }],
    ['pista', 'Pista', 'Track', {
        ancho: ['ancho (bloques; fuera de él la gata va lenta)', 'width (blocks; outside it the cat slows)', 1.5, 8, 0.1],
        salida: ['bloques antes de la línea donde parten', 'blocks behind the line at the start', 0.5, 6, 0.1]
    }],
    ['gata', 'Cómo corre una gata', 'How a cat runs', {
        vel: ['velocidad máxima (bloques/s)', 'top speed (blocks/s)', 2, 16, 0.1], acel: ['aceleración', 'acceleration', 1, 20, 0.1],
        freno: ['frenar', 'braking', 1, 30, 0.5], roce: ['se frena sola sin acelerar', 'slows by itself', 0, 10, 0.1],
        atras: ['marcha atrás (fracción)', 'reverse (fraction)', 0, 1, 0.05], giro: ['giro (rad/s)', 'turning (rad/s)', 0.5, 6, 0.05],
        fuera: ['fuera de la pista (fracción de la velocidad)', 'off track (speed fraction)', 0.1, 1, 0.05],
        derrape: ['derrapando gira más (×)', 'drifting turns more (×)', 1, 3, 0.05], carga: ['segundos derrapando para el turbo', 'drift seconds for a boost', 0.2, 3, 0.05],
        turbo: ['velocidad con turbo (×)', 'boost speed (×)', 1, 2.5, 0.05], turboDur: ['segundos de turbo', 'boost seconds', 0.2, 3, 0.05],
        choque: ['rebote al chocar (fracción)', 'bounce on hit (fraction)', 0, 1, 0.05]
    }],
    ['mila', 'Carácter de Mila (× lo de arriba)', "Mila's character (× the above)", { vel: ['velocidad', 'speed', 0.5, 1.5, 0.01], acel: ['aceleración', 'acceleration', 0.5, 1.5, 0.01], giro: ['giro', 'turning', 0.5, 1.5, 0.01] }],
    ['gala', 'Carácter de Gala (× lo de arriba)', "Gala's character (× the above)", { vel: ['velocidad', 'speed', 0.5, 1.5, 0.01], acel: ['aceleración', 'acceleration', 0.5, 1.5, 0.01], giro: ['giro', 'turning', 0.5, 1.5, 0.01] }],
    ['ia', 'Gata del juego (en solitario)', 'Game-driven cat (solo)', {
        vel: ['velocidad (fracción de la máxima)', 'speed (fraction of top)', 0.3, 1.2, 0.01], mira: ['bloques que mira adelante', 'blocks it looks ahead', 1, 10, 0.1],
        carril: ['corrida a un lado (bloques)', 'side offset (blocks)', 0, 2, 0.05], derrapa: ['derrapa si el giro pasa de (0-1)', 'drifts above this turn (0-1)', 0.1, 1, 0.05]
    }],
    ['red', 'Entre jugadores', 'Between players', { hz: ['mensajes por segundo de cada corredor', 'messages per second per racer', 2, 20, 1], suave: ['suavizado de la gata ajena (s)', 'smoothing of the other cat (s)', 0.02, 0.5, 0.01] }],
    ['publico', 'Público', 'Audience', { mirar: ['metros hasta la Gatera para ver la carrera de otros', 'meters to the cat house to watch others race', 10, 120, 1] }]
];

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
    const cambio = () => { ctx.puente.enviarDatos('carrera', datos); btnGuardar.disabled = !sucio() || !ctx.servidor.escritura; };
    const real = () => reglasCarrera(datos);

    function numero(etiqueta, valor, min, max, paso, poner) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const rg = document.createElement('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = paso; rg.value = valor;
        const n = document.createElement('input'); n.type = 'number'; n.min = min; n.max = max; n.step = paso; n.value = valor; n.style.width = '5em';
        const fijar = v => { if (!Number.isFinite(v)) return; v = Math.min(max, Math.max(min, v)); rg.value = v; n.value = v; poner(v); };
        rg.addEventListener('input', () => fijar(Number(rg.value)));
        n.addEventListener('change', () => fijar(Number(n.value)));
        const d = document.createElement('div'); d.className = 'fila-botones'; d.append(rg, n);
        fila.append(s, d);
        return fila;
    }
    const boton = (es, en, f, clase = 'boton chico secundario') => {
        const b = document.createElement('button'); b.type = 'button'; b.className = clase; b.textContent = t(es, en);
        b.addEventListener('click', f);
        return b;
    };
    const seccion = (titulo, abierta = false) => {
        const sec = document.createElement('details'); sec.className = 'panel'; sec.open = abierta;
        const h = document.createElement('summary'); h.textContent = titulo;
        sec.appendChild(h); caja.appendChild(sec);
        return sec;
    };

    function pintar() {
        caja.textContent = '';
        const R = real();
        GRUPOS.forEach(([g, es, en, campos], i) => {
            const sec = seccion(t(es, en), i < 2);
            for (const [k, [ces, cen, min, max, paso]] of Object.entries(campos)) {
                const valor = g ? R[g][k] : R[k];
                sec.appendChild(numero(t(ces, cen), valor, min, max, paso, v => {
                    if (g) { datos[g] = datos[g] || {}; datos[g][k] = v; } else datos[k] = v;
                    cambio();
                }));
            }
        });
        // Circuito: lista de puntos (x, z) desde el centro de la Gatera; se cierra solo
        const sc = seccion(t('Circuito: puntos (bloques desde el centro de la Gatera; +x este, +z sur)', 'Circuit: points (blocks from the cat house center; +x east, +z south)'), true);
        const pts = R.pista.puntos;
        const propios = () => { datos.pista = datos.pista || {}; if (!datos.pista.puntos) datos.pista.puntos = clonar(pts); return datos.pista.puntos; };
        pts.forEach(([x, z], i) => {
            const fila = document.createElement('div'); fila.className = 'panel';
            const h = document.createElement('strong'); h.textContent = i === 0 ? t('Punto 1 (línea de salida)', 'Point 1 (start line)') : t(`Punto ${i + 1}`, `Point ${i + 1}`);
            fila.appendChild(h);
            fila.appendChild(numero('x', x, -60, 60, 0.5, v => { propios()[i][0] = v; cambio(); }));
            fila.appendChild(numero('z', z, -60, 60, 0.5, v => { propios()[i][1] = v; cambio(); }));
            const b = document.createElement('div'); b.className = 'fila-botones';
            b.appendChild(boton('Agregar uno después', 'Add one after', () => {
                const p = propios(), a = p[i], c = p[(i + 1) % p.length];
                p.splice(i + 1, 0, [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2]); cambio(); pintar();
            }));
            if (pts.length > 3) b.appendChild(boton('Quitar', 'Remove', () => { propios().splice(i, 1); cambio(); pintar(); }));
            fila.appendChild(b);
            sc.appendChild(fila);
        });
        if (datos.pista && datos.pista.puntos) sc.appendChild(boton('Volver al circuito del código', 'Back to the code circuit', () => { delete datos.pista.puntos; cambio(); pintar(); }));
        // Premio: objetos por clave (como /dar) y cantidad
        const sp = seccion(t('Premio (clave del objeto, como /dar, y cantidad)', 'Prize (item key, as in /dar, and amount)'));
        for (const [cual, es, en] of [['gana', 'Al ganar', 'On a win'], ['pierde', 'Al perder', 'On a loss']]) {
            const h = document.createElement('strong'); h.textContent = t(es, en); sp.appendChild(h);
            const lista = R.premio[cual];
            const propia = () => { datos.premio = datos.premio || {}; if (!datos.premio[cual]) datos.premio[cual] = clonar(lista); return datos.premio[cual]; };
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
        }
        caja.appendChild(boton('Volver a todos los valores del código', 'Back to all code values', () => {
            for (const k of Object.keys(datos)) if (k !== '$schema' && k !== 'version' && k !== 'nota') delete datos[k];
            cambio(); pintar();
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
            if (a !== 'terminar') rotular('Listo: maneja con W A S D y Espacio (haz clic en el juego).', 'Done: drive with W A S D and Space (click the game).', 'ok');
        } catch (e) { rotular(e.message, e.message, 'error'); }
    }
    $('ca-mila').addEventListener('click', () => accion('mila'));
    $('ca-gala').addEventListener('click', () => accion('gala'));
    $('ca-terminar').addEventListener('click', () => accion('terminar'));
    $('ca-descartar').addEventListener('click', () => { datos = clonar(original); cambio(); pintar(); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'carrera' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(pintar);
    pintar();
    void CARRERA;
}
