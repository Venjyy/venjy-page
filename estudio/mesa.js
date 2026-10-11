// =========================================================
// VENJY · Estudio · editor de la mesa del Duelo de Cartas (7h-2b)
// Edita mundo/datos/cartas-mesa.json: dónde queda la mesa junto a Lucho, sus medidas, las cartas que sostiene
// Lucho y las cámaras (1.ª persona, enfoque y la lista de 3.ª persona). Comparte pantalla con el juego (pestaña
// Mesa = el iframe de Juego más este panel). Cada cambio va en vivo (mensaje `datos`); «Abrir la mesa» y
// «Cambiar vista» usan el mensaje `mesa`. Guardar escribe el JSON con If-Match, como Posiciones.
// =========================================================
const clonar = o => JSON.parse(JSON.stringify(o));
// Grupos en el orden del panel, con su nombre y qué es cada número
const GRUPOS = [
    ['mesa', 'Mesa', 'Table', { giro: 'hacia dónde mira Lucho (grados)', dist: 'distancia de Lucho al centro', lado: 'correr a la derecha de Lucho', ancho: 'ancho', fondo: 'fondo', alto: 'alto' }],
    ['manoRival', 'Cartas en la mano de Lucho', 'Cards in Lucho\'s hand', { sep: 'separación', z: 'cerca (−) / lejos de la mesa', alto: 'altura sobre la mesa', inclina: 'inclinación (grados)' }],
    ['camara1', 'Cámara 1.ª persona', '1st-person camera', { alto: 'altura', atras: 'más atrás' }],
    ['enfoque', 'Cámara al elegir carta', 'Camera when picking a card', { alto: 'altura sobre la mesa', z: 'hacia ti' }],
    ['zonas', 'Zonas', 'Zones', { sep: 'separación', propia: 'tu fila', rival: 'fila de Lucho' }],
    ['carta', 'Cartas', 'Cards', { ancho: 'ancho de carta' }],
    ['mazo', 'Mazos', 'Decks', {}],
    ['asiento', 'Tu asiento', 'Your seat', { dist: 'distancia a la mesa' }],
    ['mini', 'Vista de arriba (3.ª persona)', 'Top view (3rd person)', { ancho: 'fracción de pantalla', max: 'ancho máx. (px)', alto: 'altura de la cámara', margen: 'margen (px)' }],
    ['mano', 'Tu mano en pantalla', 'Your hand on screen', { alto: 'fracción del alto', max: 'alto máx. (px)', solape: 'solape', sube: 'cuánto sube la elegida' }]
];
const GRADOS = new Set(['giro', 'inclina']);
const rango = (k, v) => GRADOS.has(k) ? [-180, 180, 1] : v > 10 ? [0, Math.max(600, v * 2), 1] : [-3, 3, 0.01];

export async function montarMesa(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const caja = $('me-campos'), msg = $('me-mensaje'), btnGuardar = $('me-guardar');
    let etag = null, original = null, datos = null;
    try {
        const r = await fetch('../mundo/datos/cartas-mesa.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text()); datos = clonar(original);
    } catch (e) { caja.textContent = 'No se pudo leer mundo/datos/cartas-mesa.json'; return; }
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    function rotular(es, en, clase = '') { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); }
    const cambio = () => { ctx.puente.enviarDatos('cartas-mesa', datos); btnGuardar.disabled = !sucio() || !ctx.servidor.escritura; };

    function numero(obj, k, etiqueta) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta ? `${k} · ${etiqueta}` : k;
        const [min, max, paso] = rango(k, obj[k]);
        const rg = document.createElement('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = paso; rg.value = obj[k];
        const n = document.createElement('input'); n.type = 'number'; n.step = paso; n.value = obj[k]; n.style.width = '6em';
        const poner = v => { if (!Number.isFinite(v)) return; obj[k] = Math.round(v * 1000) / 1000; rg.value = obj[k]; n.value = obj[k]; cambio(); };
        rg.addEventListener('input', () => poner(Number(rg.value)));
        n.addEventListener('change', () => poner(Number(n.value)));
        const d = document.createElement('div'); d.className = 'fila-botones'; d.append(rg, n);
        fila.append(s, d);
        return fila;
    }
    function camara(obj, nombres = {}) {
        const out = [];
        for (const k of Object.keys(obj)) {
            if (k === 'nota') continue;
            if (k === 'mira') { obj.mira.forEach((_, i) => out.push(numero(obj.mira, i, ['mira: x (derecha)', 'mira: y (arriba)', 'mira: z (hacia ti)'][i]))); continue; }
            if (typeof obj[k] === 'number') out.push(numero(obj, k, nombres[k]));
        }
        return out;
    }
    function bloque(titulo, hijos, extra = []) {
        const sec = document.createElement('details'); sec.className = 'panel';
        const h = document.createElement('summary'); h.textContent = titulo;
        sec.append(h, ...hijos, ...extra);
        return sec;
    }
    function pintar() {
        caja.textContent = '';
        for (const [clave, es, en, nombres] of GRUPOS) if (datos[clave]) caja.appendChild(bloque(t(es, en), camara(datos[clave], nombres)));
        // 3.ª persona: lista de cámaras (se agregan y se quitan)
        const lista = datos.terceras || (datos.terceras = []);
        lista.forEach((c, i) => {
            const quitar = document.createElement('button'); quitar.type = 'button'; quitar.className = 'boton chico secundario';
            quitar.textContent = t('Quitar esta cámara', 'Remove this camera'); quitar.disabled = lista.length <= 1;
            quitar.addEventListener('click', () => { lista.splice(i, 1); cambio(); pintar(); });
            caja.appendChild(bloque(t(`Cámara 3.ª persona ${i + 1}`, `3rd-person camera ${i + 1}`), camara(c, { alto: 'altura', atras: 'más atrás', lado: 'a tu derecha (−: izquierda)' }), [quitar]));
        });
        const sumar = document.createElement('button'); sumar.type = 'button'; sumar.className = 'boton chico';
        sumar.textContent = t('Agregar cámara de 3.ª persona', 'Add 3rd-person camera');
        sumar.addEventListener('click', () => { lista.push(clonar(lista[lista.length - 1] || { alto: 2.5, atras: 2.4, lado: 1.9, mira: [0, 0.3, -0.4] })); cambio(); pintar(); });
        caja.appendChild(sumar);
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/cartas-mesa', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    const mesa = async accion => {
        try { await ctx.puente.enviar('mesa', { accion }); rotular('Listo.', 'Done.', 'ok'); }
        catch (e) { rotular(e.message, e.message, 'error'); }
    };
    $('me-abrir').addEventListener('click', async () => { await mesa('abrir'); ctx.puente.enviarDatos('cartas-mesa', datos); });
    $('me-vista').addEventListener('click', () => mesa('vista'));
    $('me-cerrar').addEventListener('click', () => mesa('cerrar'));
    $('me-descartar').addEventListener('click', () => { datos = clonar(original); cambio(); pintar(); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'mesa' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(pintar);
    pintar();
}
