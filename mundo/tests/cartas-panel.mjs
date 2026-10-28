// =========================================================
// Panel del Duelo de Cartas Pixel: DOM mínimo y temporizadores falsos.
// Comprueba que las dos posturas no dejan una invocación colgada y que la IA
// sigue avanzando después de terminar el turno.
// =========================================================
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const importar = r => import(pathToFileURL(resolve(raiz, r)).href);
const oyentes = {}, relojes = [];
let ahora = 0;

function nodo(tag = 'div') {
    let texto = '', html = '';
    const n = { tagName: tag.toUpperCase(), children: [], style: {}, hidden: false, disabled: false, className: '', type: '', value: '', oyentes: {}, tabIndex: 0 };
    n.classList = {
        add: (...cs) => { const s = new Set(n.className.split(/\s+/).filter(Boolean)); cs.forEach(c => s.add(c)); n.className = [...s].join(' '); },
        remove: (...cs) => { const s = new Set(n.className.split(/\s+/).filter(Boolean)); cs.forEach(c => s.delete(c)); n.className = [...s].join(' '); },
        toggle: (c, v) => { if (v === undefined ? !n.className.split(/\s+/).includes(c) : v) n.classList.add(c); else n.classList.remove(c); },
        contains: c => n.className.split(/\s+/).includes(c)
    };
    n.appendChild = x => { n.children.push(x); return x; };
    n.append = (...xs) => xs.flat().forEach(x => n.appendChild(x));
    n.setAttribute = (k, v) => { n[k] = v; };
    n.addEventListener = (t, f) => { (n.oyentes[t] ||= []).push(f); };
    n.dispatch = (t, e = {}) => { for (const f of n.oyentes[t] || []) f({ preventDefault() {}, repeat: false, target: n, ...e }); };
    n.click = () => { if (!n.disabled) n.dispatch('click'); };
    n.focus = () => {};
    n.querySelectorAll = sel => buscar(n, x => sel === 'button' ? x.tagName === 'BUTTON' : sel.startsWith('.') && sel.slice(1).split('.').every(c => x.classList.contains(c)));
    Object.defineProperty(n, 'textContent', { get: () => texto, set: v => { texto = String(v ?? ''); n.children = []; } });
    Object.defineProperty(n, 'innerHTML', { get: () => html, set: v => {
        html = String(v ?? ''); n.children = [];
        for (const m of html.matchAll(/<span class="([^"]+)"><\/span>/g)) { const x = nodo('span'); x.className = m[1]; n.appendChild(x); }
    } });
    return n;
}
function buscar(n, pred, out = []) { for (const x of n.children || []) { if (pred(x)) out.push(x); buscar(x, pred, out); } return out; }
function botones(n) { return buscar(n, x => x.tagName === 'BUTTON'); }
function botonTexto(n, texto) { return botones(n).find(x => x.textContent === texto); }
function tieneTexto(n, texto) { return buscar(n, x => x.textContent === texto).length > 0; }
function avanzar(ms) {
    ahora += ms;
    while (relojes.length && relojes[0].t <= ahora) { const r = relojes.shift(); r.f(); }
}
globalThis.window = {
    setTimeout(f, ms) { const r = { t: ahora + ms, f }; relojes.push(r); relojes.sort((a, b) => a.t - b.t); return r; },
    clearTimeout(r) { const i = relojes.indexOf(r); if (i >= 0) relojes.splice(i, 1); },
    addEventListener() {}
};
globalThis.document = { body: nodo('body'), createElement: nodo, addEventListener: (t, f) => { (oyentes[t] ||= []).push(f); } };

const { crearPanelCartas } = await importar('mundo/supervivencia/cartas-panel.js');
const ok = (cond, msg) => { if (!cond) throw new Error(`cartas-panel: ${msg}`); };
// El panel baraja con Math.random: semilla fija para que la prueba no dependa de la suerte.
let semilla = Number(process.env.SEMILLA ?? 12345) >>> 0;
Math.random = () => { semilla = (semilla + 0x6D2B79F5) >>> 0; let t = semilla; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const esCriatura = x => x.children.some(c => c.textContent.startsWith('ATK '));
// Algunas criaturas traen a otra al entrar (Lona a Mila, Venjy invita): se sigue a la elegida por su nombre.
const nombre = x => x.children[0]?.textContent;
const propias = () => root.querySelectorAll('.cartas-mesa.propia')[0].querySelectorAll('.carta-pixel');
// Toca una zona libre; si la criatura pide objetivo al entrar (Caleuche, Puntería), toca el primero.
const tocarZona = () => { for (let i = 0; i < 2; i++) root.querySelectorAll('.cartas-zona').find(z => z.classList.contains('valida'))?.click(); };
const panel = crearPanelCartas({ idioma: 'es' });
const root = document.body.children[0];
panel.abrir('facil');
ok(!!botonTexto(root, 'Fácil'), 'muestra la selección de nivel');
botonTexto(root, 'Fácil').click();
avanzar(400); // robo automático del jugador

// Se elige una criatura de la mano: el panel muestra Ataque/Defensa y una zona libre.
let mano = root.querySelectorAll('.en-mano');
ok(mano.length >= 2, 'hay mano después del robo');
ok(mano.some(esCriatura), 'hay una criatura en la mano inicial');
const primera = nombre(mano.find(esCriatura));
mano.find(esCriatura).click();
ok(root.querySelectorAll('.cartas-postura').length === 1, 'muestra selector de postura');
tocarZona();
const mesa = propias().filter(x => nombre(x) === primera);
ok(mesa.length === 1, 'invoca en Ataque sin trabarse');
ok(!mesa[0].classList.contains('defensa'), 'primera criatura en Ataque');

botonTexto(root, 'Terminar turno').click();
// Avanza hasta que vuelve el turno del jugador (la IA actúa una jugada cada 0,7 s),
// y después ejecuta su robo automático.
for (let i = 0; i < 30 && !tieneTexto(root, 'Tu turno'); i++) avanzar(700);
avanzar(400);
mano = root.querySelectorAll('.en-mano');
const criatura = mano.find(esCriatura);
ok(criatura, 'hay otra criatura disponible tras el turno de Lucho');
criatura.click();
const segunda = nombre(criatura);
const enDefensa = () => propias().filter(x => nombre(x) === segunda && x.classList.contains('defensa')).length, defensaAntes = enDefensa();
const posturas = root.querySelectorAll('.cartas-postura')[0].children;
posturas[1].click(); // Defensa
tocarZona();
ok(enDefensa() === defensaAntes + 1, 'segunda criatura en Defensa');

// Terminar turnos del jugador y dejar correr la IA hasta un final válido.
let termino = false;
for (let i = 0; i < 600 && !termino; i++) {
    const fin = root.querySelectorAll('.cartas-fin').length > 0;
    if (fin) { termino = true; break; }
    const t = botonTexto(root, 'Terminar turno');
    if (t && !t.disabled) t.click();
    avanzar(700);
}
ok(termino, 'la partida llega a un final sin quedar trabada');
console.log('cartas-panel: todo bien');
