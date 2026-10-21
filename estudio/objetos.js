// =========================================================
// VENJY · Estudio · pestaña Objetos: cómo se agarra lo que llevas
// Edita mundo/datos/objetos-mano.json: posición, rotación (grados) y escala de un tipo (objeto, herramienta,
// bloque) o de un objeto suelto, en la mano de primera persona (`mano1`) y en el cuerpo de tercera (`mano3`).
// Comparte pantalla con el juego: «Ponerlo en mi mano» lo deja en tu barra rápida (mensaje `objeto`) y cada
// número va en vivo (mensaje `datos`). Los valores que muestra son los reales (código + JSON), de
// mundo/supervivencia/objetos-mano-datos.js. Guardar escribe con If-Match, como Mesa.
// Armas del combate (katana y su vaina, modelos-mano.js → ARMAS): no son objetos del inventario; su agarre en `mano3`
// es el que usa la arena (la katana en la mano, medida desde el hombro; la vaina en la cadera, desde los pies) y se ve
// en vivo con el juego en la arena (__venjy.arena.elegir('lalo')).
// =========================================================
import { agarre, fijarDatosObjetosMano, TIPOS } from '../mundo/supervivencia/objetos-mano-datos.js';
import { OBJETOS } from '../mundo/supervivencia/objetos.js';
import { ARMAS } from '../mundo/supervivencia/modelos-mano.js';

const clonar = o => JSON.parse(JSON.stringify(o));
const RAD = 180 / Math.PI;
const redondo = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const VISTAS = [
    ['mano1', 'Mano en primera persona', 'First-person hand'],
    ['mano3', 'Cuerpo en tercera persona', 'Third-person body']
];
// Un objeto de ejemplo por tipo para «Ponerlo en mi mano» (el tipo «bloque» usa el id de la piedra)
const MUESTRA = { objeto: 'MANZANA', herramienta: 'PICO_MADERA', bloque: '3' };
const NOMBRE_TIPO = {
    objeto: ['Objeto (comida, materiales…)', 'Object (food, materials…)'],
    herramienta: ['Herramienta (pico, espada, caña…)', 'Tool (pickaxe, sword, rod…)'],
    bloque: ['Bloque', 'Block']
};
// Misma regla que crearFabrica (mano.js): herramienta si trae `herramienta` o es un palo o una caña
const tipoDe = def => (def.herramienta || def.icono === 'palo' || def.icono === 'cana' ? 'herramienta' : 'objeto');

export async function montarObjetos(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const caja = $('ob-campos'), msg = $('ob-mensaje'), btnGuardar = $('ob-guardar'), lista = $('ob-elegir');
    let etag = null, original = null, datos = null;
    try {
        const r = await fetch('../mundo/datos/objetos-mano.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text()); datos = clonar(original);
    } catch (e) { caja.textContent = 'No se pudo leer mundo/datos/objetos-mano.json'; return; }
    datos.tipos = datos.tipos || {}; datos.objetos = datos.objetos || {};
    original.tipos = original.tipos || {}; original.objetos = original.objetos || {};
    fijarDatosObjetosMano(datos);
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    const rotular = (es, en, clase = '') => { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); };
    const cambio = () => {
        fijarDatosObjetosMano(datos);
        ctx.puente.enviarDatos('objetos-mano', datos);
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    };

    // Lo que se puede editar: los 3 tipos y cada objeto de OBJETOS (clave en minúscula)
    const objetos = OBJETOS.filter(Boolean).map(d => ({ clave: d.clave.toLowerCase(), tipo: tipoDe(d), nombre: d.nombre }));
    let sel = { modo: 'tipo', clave: 'herramienta' }; // modo: 'tipo' | 'objeto'
    function llenarLista() {
        const previo = lista.value;
        lista.textContent = '';
        const g1 = document.createElement('optgroup'); g1.label = t('Por tipo (vale para todos)', 'By type (applies to all)');
        for (const k of TIPOS) g1.appendChild(new Option(t(...NOMBRE_TIPO[k]), 'tipo:' + k));
        const g2 = document.createElement('optgroup'); g2.label = t('Un objeto', 'One object');
        for (const o of objetos) g2.appendChild(new Option(`${o.nombre[ctx.idioma] || o.nombre.es} (${o.clave})`, 'objeto:' + o.clave));
        const g3 = document.createElement('optgroup'); g3.label = t('Armas del combate (arena)', 'Combat weapons (arena)');
        for (const [k, n] of Object.entries(ARMAS)) g3.appendChild(new Option(`${n[ctx.idioma] || n.es} (${k})`, 'arma:' + k));
        lista.append(g1, g2, g3);
        lista.value = previo || `${sel.modo}:${sel.clave}`;
    }
    const actual = () => {
        if (sel.modo === 'tipo') return { tipo: sel.clave, clave: null, destino: datos.tipos, k: sel.clave };
        if (sel.modo === 'arma') return { tipo: 'modelo', clave: sel.clave, destino: datos.objetos, k: sel.clave, arma: true };
        const o = objetos.find(x => x.clave === sel.clave);
        return { tipo: o ? o.tipo : 'objeto', clave: sel.clave, destino: datos.objetos, k: sel.clave };
    };
    const valores = (vista, a) => {
        const v = agarre(vista, a.clave, a.tipo);
        return { pos: v.pos.map(x => redondo(x)), rot: v.rot.map(x => redondo(x * RAD, 1)), escala: redondo(v.escala) };
    };

    function numero(etiqueta, valor, min, max, paso, poner) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = etiqueta;
        const rg = document.createElement('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = paso; rg.value = valor;
        const n = document.createElement('input'); n.type = 'number'; n.step = paso; n.value = valor; n.style.width = '6em';
        const fijar = v => { if (!Number.isFinite(v)) return; v = redondo(v); rg.value = v; n.value = v; poner(v); };
        rg.addEventListener('input', () => fijar(Number(rg.value)));
        n.addEventListener('change', () => fijar(Number(n.value)));
        const d = document.createElement('div'); d.className = 'fila-botones'; d.append(rg, n);
        fila.append(s, d);
        return fila;
    }
    function pintar() {
        caja.textContent = '';
        const a = actual();
        for (const [vista, es, en] of VISTAS) {
            if (a.arma && vista === 'mano1') continue; // las armas del combate solo se ven en el cuerpo (la arena)
            const v = valores(vista, a);
            const sec = document.createElement('details'); sec.className = 'panel'; sec.open = true;
            const h = document.createElement('summary'); h.textContent = t(es, en);
            sec.appendChild(h);
            // Cada cambio guarda el agarre completo de esa vista (pos, rot y escala) para que no dependa del código
            const guardarVista = () => {
                const dest = a.destino[a.k] || (a.destino[a.k] = {});
                dest[vista] = { pos: v.pos.slice(), rot: v.rot.slice(), escala: v.escala };
                cambio();
            };
            ['x', 'y', 'z'].forEach((e, i) => sec.appendChild(numero(`pos ${e} (bloques)`, v.pos[i], -1.5, 1.5, 0.01, x => { v.pos[i] = x; guardarVista(); })));
            ['x', 'y', 'z'].forEach((e, i) => sec.appendChild(numero(`rot ${e} (grados)`, v.rot[i], -180, 180, 1, x => { v.rot[i] = x; guardarVista(); })));
            sec.appendChild(numero(t('escala', 'scale'), v.escala, 0.1, 3, 0.01, x => { v.escala = x; guardarVista(); }));
            if (a.destino[a.k] && a.destino[a.k][vista]) {
                const volver = document.createElement('button'); volver.type = 'button'; volver.className = 'boton chico secundario';
                volver.textContent = t('Volver al valor del código', 'Back to the code value');
                volver.addEventListener('click', () => {
                    delete a.destino[a.k][vista];
                    if (!Object.keys(a.destino[a.k]).length) delete a.destino[a.k];
                    cambio(); pintar();
                });
                sec.appendChild(volver);
            }
            caja.appendChild(sec);
        }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/objetos-mano', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    async function enMano() {
        const a = actual();
        if (a.arma) { rotular('Las armas del combate se ven en la arena: abre el duelo con Lalo en el juego.', 'Combat weapons show in the arena: open the duel with Lalo in the game.', 'ok'); ctx.puente.enviarDatos('objetos-mano', datos); return; }
        const clave = a.clave ? a.clave : MUESTRA[a.tipo];
        try {
            await ctx.puente.enviar('objeto', { clave });
            ctx.puente.enviarDatos('objetos-mano', datos);
            rotular('Listo: míralo en tu mano (el juego cambia de cámara con F5).', 'Done: look at it in your hand (the game switches camera with F5).', 'ok');
        } catch (e) { rotular(e.message, e.message, 'error'); }
    }
    lista.addEventListener('change', () => { const [modo, clave] = lista.value.split(':'); sel = { modo, clave }; pintar(); });
    $('ob-mano').addEventListener('click', enMano);
    $('ob-descartar').addEventListener('click', () => { datos = clonar(original); cambio(); pintar(); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'objetos' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(() => { llenarLista(); pintar(); });
    llenarLista();
    pintar();
}
