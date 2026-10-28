// =========================================================
// VENJY · Estudio · campos comunes de las pestañas de datos con objetos (Tienda, Misiones; Etapa B · B6)
// crearCampos(ctx, rotular) da los controles que se repiten: objeto (con lista para buscar), cantidad, lista de pilas
// [nombre, n], avisos, pares ES/EN y botones. El nombre de objeto es el de /dar (O o bloque, en minúscula).
// =========================================================
import { O, nombreDe } from '../mundo/supervivencia/objetos.js';
import { B } from '../mundo/texturas.js';

const clonar = o => JSON.parse(JSON.stringify(o));
const esObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
// Objetos y bloques con nombre, en minúscula como /dar
export const NOMBRES = [...Object.keys(O), ...Object.keys(B).filter(k => B[k] > 0 && k !== 'AGUA' && k !== 'LAVA')].map(k => k.toLowerCase()).sort();
export const idDe = n => { const k = String(n).toUpperCase(); return O[k] !== undefined ? O[k] : B[k]; };
export const nombreDeId = id => (Object.keys(O).find(k => O[k] === id) || Object.keys(B).find(k => B[k] === id) || '').toLowerCase();
export const aNombres = pilas => pilas.map(([id, n]) => [nombreDeId(id), n]);

export function crearCampos(ctx, rotular) {
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const nombreObj = n => { const id = idDe(n); return id === undefined ? n : nombreDe(id, ctx.idioma); };
    const rotulo = (es, en) => { const s = document.createElement('span'); s.textContent = t(es, en); return s; };
    const campo = (es, en, input) => { const l = document.createElement('label'); l.className = 'campo'; l.append(rotulo(es, en), input); return l; };
    const avanzado = el => { el.classList.add('solo-avanzado'); return el; };
    const titulo = (es, en) => { const h = document.createElement('h3'); h.className = 'pj-titulo'; h.textContent = t(es, en); return h; };
    const nota = (es, en) => Object.assign(document.createElement('p'), { className: 'pj-nota', textContent: t(es, en) });
    const boton = (es, en, f, clase = 'boton chico secundario') => { const b = document.createElement('button'); b.type = 'button'; b.className = clase; b.textContent = t(es, en); b.addEventListener('click', f); return b; };
    function entradaObjeto(valorInicial, al) {
        const i = document.createElement('input'); i.type = 'text'; i.setAttribute('list', 'ti-objetos'); i.value = valorInicial; i.maxLength = 40; i.autocomplete = 'off';
        i.addEventListener('change', () => {
            const v = i.value.trim().toLowerCase().replace(/\s+/g, '_');
            if (NOMBRES.includes(v)) al(v);
            else { i.value = valorInicial; rotular('Ese objeto no existe: escribe su nombre y elige de la lista.', 'That object does not exist: type its name and pick from the list.', 'error'); }
        });
        return i;
    }
    function entradaCantidad(valorInicial, al) {
        const i = document.createElement('input'); i.type = 'number'; i.min = 1; i.max = 64; i.step = 1; i.value = valorInicial;
        i.addEventListener('change', () => { const n = Math.round(Number(i.value)); if (Number.isFinite(n)) al(Math.min(64, Math.max(1, n))); });
        return i;
    }
    // Lista de pilas [nombre, n] (da / pide): en Simple, una; «Agregar objeto» y quitar, en Avanzado
    function listaPilas(pilas, rotuloEs, rotuloEn, alCambiar) {
        const caja = document.createElement('div'); caja.className = 'pj-lista';
        pilas.forEach((p, i) => {
            const fila = document.createElement('div'); fila.className = 'pj-par';
            fila.append(campo(rotuloEs, rotuloEn, entradaObjeto(p[0], v => { p[0] = v; alCambiar(); })), campo('Cantidad', 'Amount', entradaCantidad(p[1], n => { p[1] = n; alCambiar(); })));
            if (i > 0) fila.appendChild(boton('Quitar', 'Remove', () => { pilas.splice(i, 1); alCambiar(true); }));
            caja.appendChild(i > 0 ? avanzado(fila) : fila);
        });
        caja.appendChild(avanzado(boton('Agregar objeto', 'Add object', () => { pilas.push(['esmeralda', 1]); alCambiar(true); })));
        return caja;
    }
    function avisos(lista) {
        const d = document.createElement('div'); d.className = 'pj-avisos';
        for (const [es, en] of lista) d.appendChild(Object.assign(document.createElement('p'), { textContent: t(es, en) }));
        return d;
    }
    // Par ES/EN de lo que dice
    function par(rotEs, rotEn, valorIni, al) {
        const fila = document.createElement('div'); fila.className = 'pj-par';
        const v = esObj(valorIni) ? clonar(valorIni) : { es: '', en: '' };
        const poner = () => al(v.es && v.en ? { es: v.es, en: v.en } : null);
        for (const [l, k] of [['ES', 'es'], ['EN', 'en']]) {
            const i = document.createElement('input'); i.type = 'text'; i.maxLength = 160; i.value = v[k] || '';
            i.addEventListener('change', () => { v[k] = i.value.trim(); poner(); });
            fila.appendChild(campo(`${rotEs} (${l})`, `${rotEn} (${l})`, i));
        }
        return fila;
    }

    if (!document.getElementById('ti-objetos')) {
        const lista = document.createElement('datalist'); lista.id = 'ti-objetos';
        for (const n of NOMBRES) lista.appendChild(Object.assign(document.createElement('option'), { value: n, label: nombreObj(n) }));
        document.body.appendChild(lista);
    }
    return { t, nombreObj, rotulo, campo, avanzado, titulo, nota, boton, entradaObjeto, entradaCantidad, listaPilas, avisos, par };
}
