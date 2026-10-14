// =========================================================
// VENJY · Supervivencia · Duelo de Cartas: abrir un sobre (tienda de cartas, etapa A punto 3)
// Al comprar un sobre, tú lo rasgas: arrastra por la franja de arriba (mouse o dedo) o tócala / Espacio
// varias veces. La tapa sale volando, las cartas salen boca abajo y se dan vuelta una a una (tocar una la
// voltea antes); las nuevas dicen «Nueva». Las cartas ya están en tu colección desde la compra: esto es solo
// la escena. Valores en SOBRE_ANIM (cartas-tienda.js, con la parte pura: rasgado y tiempos); el dueño los ajusta en el Estudio (pestaña Mesa, grupo «Sobre: abrir»)
// → mundo/datos/cartas-mesa.json (sobreAnim).
// =========================================================
import { CARTAS } from './cartas-datos.js';
import { miniCarta } from './cartas-armar.js';
import { arteReverso } from './cartas-arte.js';
import { ruido, tono } from './sonidos.js';
import { reglasSobreAnim, avanceArrastre, avanceToque, momentoCarta } from './cartas-tienda.js';

const t = (es, en) => ({ es, en });
export const TXT_SOBRE = {
    titulo: t('¡Sobre nuevo!', 'New pack!'),
    rasga: t('Rásgalo: arrastra por la franja de arriba (o tócala varias veces).', 'Tear it: drag along the top strip (or tap it several times).'),
    marca: t('DUELO', 'DUEL'),
    cartas: t('{n} cartas', '{n} cards'),
    nueva: t('Nueva', 'New'),
    listo: t('Listo', 'Done'),
    saltar: t('Abrir al tiro', 'Open now'),
    franja: t('Franja para rasgar el sobre', 'Strip to tear the pack open')
};

// cartas = ids que salieron; col = tu colección ya con ellas (para marcar «Nueva»); alTerminar() vuelve a la tienda.
// Devuelve la sección para abrirPanel, o null si la escena está apagada.
export function escenaSobre({ cartas, col, datos, idioma = 'es', alTerminar }) {
    const R = reglasSobreAnim(datos);
    if (!R.activa || !cartas || !cartas.length) return null;
    const quieto = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const L = o => (o && (o[idioma] || o.es)) || '';
    const vol = v => v * R.sonido;
    const sonar = f => { if (R.sonido > 0) try { f(); } catch (e) { /* sin audio */ } };

    const el = document.createElement('section');
    el.className = 'panel-mision sobre-panel';
    el.style.setProperty('--sobre-ancho', R.ancho + 'px');
    el.style.setProperty('--sobre-color', R.color);
    el.style.setProperty('--sobre-franja', R.franja);
    el.style.setProperty('--sobre-letra', R.letra);
    el.style.setProperty('--sobre-tapa', (quieto ? 0 : R.tapa) + 's');
    el.style.setProperty('--sobre-salir', (quieto ? 0 : R.salir) + 's');
    el.style.setProperty('--sobre-voltear', (quieto ? 0 : R.voltear) + 's');

    const h = document.createElement('h2'); h.textContent = L(TXT_SOBRE.titulo);
    const ayuda = document.createElement('p'); ayuda.className = 'dialogo'; ayuda.textContent = L(TXT_SOBRE.rasga);
    const escena = document.createElement('div'); escena.className = 'sobre-escena';

    // El sobre: tapa (franja para rasgar con la línea de corte) y cuerpo con la marca
    const sobre = document.createElement('div'); sobre.className = 'sobre';
    const tapa = document.createElement('div'); tapa.className = 'sobre-tapa';
    tapa.tabIndex = 0; tapa.setAttribute('role', 'slider'); tapa.setAttribute('aria-label', L(TXT_SOBRE.franja));
    tapa.setAttribute('aria-valuemin', '0'); tapa.setAttribute('aria-valuemax', '100'); tapa.setAttribute('aria-valuenow', '0');
    const corte = document.createElement('div'); corte.className = 'sobre-corte';
    const hecho = document.createElement('div'); hecho.className = 'sobre-corte-hecho';
    corte.appendChild(hecho); tapa.appendChild(corte);
    const cuerpo = document.createElement('div'); cuerpo.className = 'sobre-cuerpo';
    const marca = document.createElement('strong'); marca.textContent = L(TXT_SOBRE.marca);
    const cuantas = document.createElement('small'); cuantas.textContent = L(TXT_SOBRE.cartas).replace('{n}', cartas.length);
    cuerpo.append(marca, cuantas);
    sobre.append(tapa, cuerpo);

    const fila = document.createElement('div'); fila.className = 'sobre-cartas';
    escena.append(sobre, fila);

    const botones = document.createElement('div'); botones.className = 'botones-mision';
    const saltar = document.createElement('button'); saltar.type = 'button'; saltar.className = 'boton secundario'; saltar.textContent = L(TXT_SOBRE.saltar);
    const listo = document.createElement('button'); listo.type = 'button'; listo.className = 'boton'; listo.textContent = L(TXT_SOBRE.listo); listo.hidden = true;
    botones.append(saltar, listo);
    el.append(h, ayuda, escena, botones);

    let av = 0, abierto = false, x0 = null, tramo = 0, movio = false; // movio: el clic que cierra un arrastre no suma un toque
    const relojes = [];
    const despues = (s, f) => relojes.push(setTimeout(f, Math.max(0, s) * 1000));
    function pintarAvance() {
        hecho.style.width = `${Math.round(av * 100)}%`;
        tapa.setAttribute('aria-valuenow', String(Math.round(av * 100)));
        if (R.sacudir && !quieto) { sobre.classList.remove('tiembla'); void sobre.offsetWidth; sobre.classList.add('tiembla'); }
        // Un raspón de papel cada décimo rasgado
        const k = Math.floor(av * 10);
        if (k > tramo) { tramo = k; sonar(() => ruido({ dur: 0.05, frec: 2600 + Math.random() * 1200, q: 0.8, vol: vol(0.12) })); }
        if (av >= 1) abrir();
    }

    function voltear(c) {
        if (c.classList.contains('vuelta')) return;
        c.classList.add('vuelta');
        const nueva = c.classList.contains('nueva');
        sonar(() => tono({ f0: nueva ? 660 : 440, f1: nueva ? 1320 : 660, dur: 0.12, vol: vol(0.12), forma: 'triangle' }));
        if ([...fila.children].every(x => x.classList.contains('vuelta'))) { listo.hidden = false; listo.focus(); }
    }
    function abrir() {
        if (abierto) return;
        abierto = true;
        av = 1; hecho.style.width = '100%';
        saltar.hidden = true; ayuda.hidden = true;
        sobre.classList.remove('tiembla');
        sobre.classList.add('abierto');
        sonar(() => ruido({ dur: 0.35, frec: 1800, q: 0.6, vol: vol(0.3) }));
        const vistas = {};
        cartas.forEach((id, i) => {
            if (!CARTAS[id]) return;
            vistas[id] = (vistas[id] || 0) + 1;
            const nueva = (col && (col[id] || 0) <= cartas.filter(x => x === id).length) && vistas[id] === 1;
            const c = document.createElement('button');
            c.type = 'button'; c.className = 'sobre-carta' + (nueva ? ' nueva' : '');
            c.style.setProperty('--i', i);
            c.style.animationDelay = `${quieto ? 0 : R.tapa * 0.6 + i * R.entre}s`;
            c.setAttribute('aria-label', L(CARTAS[id].nombre));
            const dentro = document.createElement('div'); dentro.className = 'sobre-carta-dentro';
            const atras = document.createElement('div'); atras.className = 'sobre-cara sobre-atras';
            const img = arteReverso();
            if (img) atras.style.backgroundImage = `url(${img})`;
            const frente = document.createElement('div'); frente.className = 'sobre-cara sobre-frente';
            frente.appendChild(miniCarta(id, L));
            dentro.append(atras, frente);
            c.appendChild(dentro);
            if (nueva) { const e = document.createElement('em'); e.textContent = L(TXT_SOBRE.nueva); c.appendChild(e); }
            c.addEventListener('click', () => voltear(c));
            fila.appendChild(c);
            despues(quieto ? 0 : momentoCarta(i, R), () => voltear(c));
        });
    }

    // Rasgar: arrastrar sobre la franja (pointer: mouse y dedo), o tocar / Espacio / Enter
    tapa.addEventListener('pointerdown', ev => {
        if (abierto) return;
        x0 = ev.clientX; movio = false;
        try { tapa.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ }
    });
    tapa.addEventListener('pointermove', ev => {
        if (abierto || x0 === null) return;
        const dx = ev.clientX - x0;
        if (Math.abs(dx) < 2) return;
        x0 = ev.clientX; movio = true;
        av = avanceArrastre(av, dx, tapa.clientWidth || R.ancho, R);
        pintarAvance();
    });
    const soltar = () => { x0 = null; };
    tapa.addEventListener('pointerup', soltar);
    tapa.addEventListener('pointercancel', soltar);
    tapa.addEventListener('click', () => { if (!abierto && !movio && av < 1) { av = avanceToque(av, R); pintarAvance(); } });
    tapa.addEventListener('keydown', ev => {
        if (abierto || (ev.key !== ' ' && ev.key !== 'Enter')) return;
        ev.preventDefault(); ev.stopPropagation();
        av = avanceToque(av, R); pintarAvance();
    });
    saltar.addEventListener('click', abrir);
    listo.addEventListener('click', () => { relojes.forEach(clearTimeout); if (alTerminar) alTerminar(); });
    setTimeout(() => { if (tapa.isConnected) tapa.focus(); }, 0);
    return el;
}
