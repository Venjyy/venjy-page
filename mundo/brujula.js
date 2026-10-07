// =========================================================
// VENJY · Brújula del HUD
// Franja pixelada arriba al centro (como la barra de jefe de Minecraft)
// que se desplaza con el yaw del jugador. yaw = 0 mira al norte (-Z);
// un yaw positivo gira a la izquierda (hacia el oeste).
// =========================================================

const PX_POR_GRADO = 2.4;   // ancho de un grado en píxeles CSS
const PASO_MARCA = 15;      // una marca cada 15°

const LETRAS = {
    es: { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' },
    en: { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }
};

const CSS = `
.brujula {
    position: absolute;
    top: 10px;
    left: 50%;
    width: min(300px, calc(100vw - 24px));
    height: 30px;
    transform: translateX(-50%);
    overflow: hidden;
    background: rgb(0 0 0 / 0.45);
    border: 3px solid #000;
    box-shadow: inset 2px 2px 0 rgb(139 139 139 / 0.55), inset -2px -2px 0 rgb(0 0 0 / 0.6);
    font-family: 'PixelCraft', monospace;
    image-rendering: pixelated;
}
.brujula-pista {
    position: absolute;
    left: 50%;
    top: 0;
    height: 100%;
    will-change: transform;
    -webkit-mask-image: none;
}
.brujula-marca {
    position: absolute;
    top: 14px;
    width: 2px;
    height: 6px;
    margin-left: -1px;
    background: #9a9a9a;
}
.brujula-marca.media { top: 11px; height: 9px; background: #d0d0d0; }
.brujula-letra {
    position: absolute;
    top: 1px;
    width: 40px;
    margin-left: -20px;
    text-align: center;
    font-size: 0.95rem;
    line-height: 20px;
    color: #ffff55;
    text-shadow: 2px 2px 0 #3f3f15;
}
.brujula-letra.norte { color: #ff5555; text-shadow: 2px 2px 0 #3f1515; }
.brujula-letra.diag { font-size: 0.75rem; color: #d8d8d8; text-shadow: 2px 2px 0 #3f3f3f; }
.brujula-borde {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(90deg, rgb(16 10 6 / 0.95) 0, rgb(16 10 6 / 0) 22%, rgb(16 10 6 / 0) 78%, rgb(16 10 6 / 0.95) 100%);
}
.brujula-centro {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 0;
    height: 0;
    margin-left: -5px;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 7px solid #ffffff;
    filter: drop-shadow(0 0 0 #000);
}
.brujula-centro::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 1px;
    width: 4px;
    height: 4px;
    background: #55ff55;
}
@media (max-width: 800px) {
    .brujula { top: 176px; width: min(240px, calc(100vw - 24px)); }
}
`;

function inyectarEstilos() {
    if (document.getElementById('brujula-estilos')) return;
    const st = document.createElement('style');
    st.id = 'brujula-estilos';
    st.textContent = CSS;
    document.head.appendChild(st);
}

// contenedor: elemento del HUD donde se agrega la brújula.
// Devuelve { actualizar(yaw), mostrar(v), el }.
export function crearBrujula(contenedor, idioma = 'es') {
    inyectarEstilos();
    const letras = LETRAS[idioma] || LETRAS.es;

    const el = document.createElement('div');
    el.className = 'brujula';
    el.setAttribute('aria-hidden', 'true');
    const pista = document.createElement('div');
    pista.className = 'brujula-pista';
    el.appendChild(pista);

    // Marcas de -180° a 540°: así nunca se ve el borde de la pista al dar la vuelta
    for (let a = -180; a <= 540; a += PASO_MARCA) {
        const norm = ((a % 360) + 360) % 360;
        const x = Math.round(a * PX_POR_GRADO);
        if (letras[norm] !== undefined) {
            const l = document.createElement('span');
            l.className = 'brujula-letra' + (norm === 0 ? ' norte' : (norm % 90 ? ' diag' : ''));
            l.textContent = letras[norm];
            l.style.left = x + 'px';
            pista.appendChild(l);
        } else {
            const m = document.createElement('span');
            m.className = 'brujula-marca' + (norm % 45 === 0 ? ' media' : '');
            m.style.left = x + 'px';
            pista.appendChild(m);
        }
        // Marca fina bajo cada letra, para que la franja se lea continua
        if (letras[norm] !== undefined) {
            const m = document.createElement('span');
            m.className = 'brujula-marca media';
            m.style.left = x + 'px';
            m.style.top = '21px';
            m.style.height = '4px';
            pista.appendChild(m);
        }
    }
    const borde = document.createElement('div');
    borde.className = 'brujula-borde';
    const centro = document.createElement('div');
    centro.className = 'brujula-centro';
    el.append(borde, centro);
    contenedor.appendChild(el);

    let ultimo = null;
    return {
        el,
        mostrar(v) { el.style.display = v ? '' : 'none'; },
        actualizar(yaw) {
            // Rumbo en grados desde el norte, creciendo hacia el este (sentido horario)
            let rumbo = (-yaw * 180 / Math.PI) % 360;
            if (rumbo < 0) rumbo += 360;
            const x = Math.round(-rumbo * PX_POR_GRADO);
            if (x === ultimo) return;
            ultimo = x;
            pista.style.transform = `translateX(${x}px)`;
        }
    };
}
