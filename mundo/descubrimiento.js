// =========================================================
// VENJY · Aviso de «Lugar descubierto» (supervivencia y creativo)
// Banda arriba al centro con animación y un acorde corto (WebAudio compartido,
// respeta «Sonidos del mundo»). El texto fijo viene de mundo/datos/textos.json
// (espacio «lugar», clave «descubierto»); si falta, usa el del código.
// Quién guarda qué lugares ya se descubrieron lo decide cada página: la partida de
// supervivencia (misiones.estado.lugares) o el almacenamiento del creativo.
// =========================================================
import { cargarDatos, texto } from './datos/cargador.js';
import { audioMundo, sonando } from './criaturas/cuerpo.js';

const POR_DEFECTO = { descubierto: { es: 'Lugar descubierto', en: 'Place discovered' } };
let datosTextos = null;
cargarDatos('textos').then(d => { datosTextos = d; });

const ESTILO = `
.lugar-aviso { position: fixed; left: 50%; top: 12%; transform: translate(-50%, -14px); z-index: 60; pointer-events: none;
    text-align: center; font-family: 'PixelCraft', monospace; color: #fff; opacity: 0; padding: 10px 28px;
    background: linear-gradient(90deg, transparent, rgba(0,0,0,.55) 18%, rgba(0,0,0,.55) 82%, transparent);
    image-rendering: pixelated; }
.lugar-aviso small { display: block; font-size: 14px; color: #ffd75e; letter-spacing: 2px; text-transform: uppercase; text-shadow: 2px 2px 0 #3f3f00; }
.lugar-aviso b { display: block; font-weight: normal; font-size: 26px; margin: 4px 0 2px; text-shadow: 3px 3px 0 #3f3f3f; }
.lugar-aviso i { display: block; font-style: normal; font-size: 13px; color: #cfcfcf; text-shadow: 2px 2px 0 #3f3f3f; }
.lugar-aviso.entra { animation: lugar-aviso 4.2s steps(14, end) forwards; }
@keyframes lugar-aviso {
    0% { opacity: 0; transform: translate(-50%, -14px); }
    12% { opacity: 1; transform: translate(-50%, 0); }
    84% { opacity: 1; transform: translate(-50%, 0); }
    100% { opacity: 0; transform: translate(-50%, 6px); }
}
@media (max-width: 600px) { .lugar-aviso b { font-size: 20px; } .lugar-aviso small { font-size: 12px; } }
@media (prefers-reduced-motion: reduce) { .lugar-aviso.entra { animation-name: lugar-aviso-quieto; animation-timing-function: linear; } }
@keyframes lugar-aviso-quieto { 0%, 100% { opacity: 0; } 10%, 85% { opacity: 1; } }
`;

function acorde() {
    const a = audioMundo();
    if (!a || !sonando()) return;
    try {
        const { ctx, master } = a, t = ctx.currentTime;
        // Tres notas ascendentes (do-mi-sol) con timbre de campana pixelada
        [[523.25, 0], [659.25, 0.13], [783.99, 0.26], [1046.5, 0.4]].forEach(([f, d], i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = i === 3 ? 'sine' : 'triangle';
            o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t + d);
            g.gain.exponentialRampToValueAtTime(0.16, t + d + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + d + (i === 3 ? 1.1 : 0.45));
            o.connect(g); g.connect(master);
            o.start(t + d); o.stop(t + d + 1.2);
        });
    } catch (e) { /* sin sonido */ }
}

// avisar({ nombre, n, total, idioma }) -> muestra el aviso (uno a la vez; el nuevo reemplaza al anterior)
export function avisarLugar({ nombre, n, total, idioma = 'es' }) {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('lugar-aviso-estilo')) {
        const s = document.createElement('style');
        s.id = 'lugar-aviso-estilo';
        s.textContent = ESTILO;
        document.head.appendChild(s);
    }
    const viejo = document.querySelector('.lugar-aviso');
    if (viejo) viejo.remove();
    const base = (datosTextos && datosTextos.textos && datosTextos.textos.lugar) || {};
    const el = document.createElement('div');
    el.className = 'lugar-aviso';
    el.setAttribute('role', 'status');
    const t = document.createElement('small');
    t.textContent = texto(base.descubierto || POR_DEFECTO.descubierto, idioma);
    const b = document.createElement('b');
    b.textContent = nombre;
    const c = document.createElement('i');
    c.textContent = `${n} / ${total}`;
    el.append(t, b, c);
    document.body.appendChild(el);
    void el.offsetWidth; // reinicia la animación
    el.classList.add('entra');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    acorde();
}
