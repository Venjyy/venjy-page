// =========================================================
// VENJY · Minimapa del mundo 3D
// Reutiliza el mismo bitmap del mapa 2D del portafolio (paleta MC,
// tonos y sombreado por elevación copiados de script.js).
// =========================================================

const MC = {
    pasto: [127, 178, 56], arena: [247, 233, 163], agua: [64, 64, 255], piedra: [112, 112, 112],
    nieve: [255, 255, 255], hojas: [0, 124, 0], tierra: [151, 109, 77], madera: [143, 119, 72],
    cuarzo: [255, 252, 245], rojo: [153, 51, 51], azul: [51, 76, 178], naranjo: [216, 127, 51],
    negro: [25, 25, 25], oro: [250, 238, 77], diamante: [92, 219, 213], esmeralda: [0, 217, 58],
    podzol: [129, 86, 49], arcilla: [164, 168, 184], gris: [76, 76, 76]
};
const TONOS = [180, 220, 255, 135];

const NOMBRES = {
    es: { spawn: 'Inicio', casa: 'Casa', registro: 'Registro', mina: 'Mina', aldea: 'Aldea', gatera: 'Gatera', correo: 'Correo', faro: 'Faro' },
    en: { spawn: 'Start', casa: 'House', registro: 'Registry', mina: 'Mine', aldea: 'Village', gatera: 'Cat shelter', correo: 'Post', faro: 'Lighthouse' }
};
const COLOR_PUNTO = {
    spawn: '#ffffff', casa: '#ff5555', registro: '#5555ff', mina: '#ffaa00',
    aldea: '#ffff55', gatera: '#ff8c1a', correo: '#55ffff', faro: '#55ff55'
};

const FLECHA = [
    '....X....',
    '...XXX...',
    '..XXXXX..',
    '.XXXXXXX.',
    'XXXXXXXXX',
    '...XXX...',
    '...XXX...',
    '...XXX...'
];

const CSS = `
.mm-pequeno {
    position: absolute; top: 10px; right: 12px; width: 160px; height: 160px;
    pointer-events: none; background: #000;
    border: 3px solid #000;
    box-shadow: inset 0 0 0 3px #8b8b8b, 0 0 0 3px #373737, 3px 3px 0 3px rgb(0 0 0 / 0.4);
    padding: 3px; font-family: 'PixelCraft', monospace;
}
.mm-pequeno canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
.mm-grande {
    position: fixed; inset: 0; z-index: 20; display: grid; place-items: center;
    background: rgb(0 0 0 / 0.6); pointer-events: auto; cursor: pointer;
    font-family: 'PixelCraft', monospace; color: #fff;
}
.mm-grande .mm-marco {
    padding: 6px; background: #000;
    border: 4px solid #000;
    box-shadow: inset 0 0 0 4px #8b8b8b, 0 0 0 4px #373737;
}
.mm-grande canvas { display: block; image-rendering: pixelated; }
.mm-grande .mm-pie {
    position: absolute; bottom: 10px; left: 0; right: 0; text-align: center;
    font-size: 0.9rem; color: #aaa; text-shadow: 2px 2px 0 #3f3f3f;
}
.mm-pequeno[hidden], .mm-grande[hidden] { display: none !important; }
@media (max-width: 600px) {
    .mm-pequeno { width: 110px; height: 110px; top: 8px; right: 8px; padding: 2px; }
}
`;

function idioma() {
    return (document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
}

function pintarBase(datos) {
    const { W, H, E, T, P } = datos;
    const NIVEL_MAR = datos.NIVEL_MAR;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = y * W + x;
            const tipo = T[i];
            const base = MC[tipo];
            let tono;
            if (tipo === 'agua') {
                const prof = NIVEL_MAR - E[i];
                const v = prof * 0.1 + ((x + y) & 1) * 0.2;
                tono = v < 0.5 ? 2 : v > 0.9 ? 0 : 1;
            } else {
                const norte = y > 0 ? E[i - W] : E[i];
                const dif = E[i] - norte;
                tono = dif > 0 ? 2 : dif === 0 ? 1 : dif < -2 ? 3 : 0;
            }
            const f = TONOS[tono] / 255;
            const o = i * 4;
            img.data[o] = base[0] * f;
            img.data[o + 1] = base[1] * f;
            img.data[o + 2] = base[2] * f;
            img.data[o + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    // Marcadores: cuadradito de color con borde oscuro
    for (const k in P) {
        const [px, py] = P[k];
        ctx.fillStyle = '#000';
        ctx.fillRect(px - 2, py - 2, 5, 5);
        ctx.fillStyle = COLOR_PUNTO[k] || '#fff';
        ctx.fillRect(px - 1, py - 1, 3, 3);
    }
    return c;
}

function crearFlecha() {
    const c = document.createElement('canvas');
    c.width = 11; c.height = 10;
    const ctx = c.getContext('2d');
    const dibujar = (dx, dy, color) => {
        ctx.fillStyle = color;
        FLECHA.forEach((fila, y) => [...fila].forEach((v, x) => {
            if (v === 'X') ctx.fillRect(x + 1 + dx, y + 1 + dy, 1, 1);
        }));
    };
    // contorno negro (4 desplazamientos) y relleno claro
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => dibujar(dx, dy, '#000'));
    dibujar(0, 0, '#fff');
    return c;
}

export function crearMinimapa(datos, contenedor, escala = 4) {
    if (!document.getElementById('minimapa-css')) {
        const st = document.createElement('style');
        st.id = 'minimapa-css';
        st.textContent = CSS;
        document.head.appendChild(st);
    }
    const { W, H, P } = datos;
    const base = pintarBase(datos);
    const flecha = crearFlecha();
    const RADIO = 40; // celdas visibles a cada lado

    // ---- Pequeño ----
    const pequeno = document.createElement('div');
    pequeno.className = 'mm-pequeno';
    const cp = document.createElement('canvas');
    cp.width = 160; cp.height = 160;
    pequeno.appendChild(cp);
    contenedor.appendChild(pequeno);
    const ctxP = cp.getContext('2d');

    // ---- Grande ----
    const grande = document.createElement('div');
    grande.className = 'mm-grande';
    grande.hidden = true;
    const marco = document.createElement('div');
    marco.className = 'mm-marco';
    const cg = document.createElement('canvas');
    marco.appendChild(cg);
    const pie = document.createElement('div');
    pie.className = 'mm-pie';
    grande.append(marco, pie);
    contenedor.appendChild(grande);
    const ctxG = cg.getContext('2d');
    grande.addEventListener('click', () => alternarGrande());

    let px = 0, pz = 0, yaw = 0;

    // Gente del mundo (NPCs): pistas discretas. Los que están juntos se agrupan en un solo punto
    // tenue que late despacio, así ayudan a encontrarlos sin delatar a cada uno.
    let fuentePersonas = () => [];
    let grupos = [], ultimoGrupo = 0;
    function agrupar() {
        const ahora = performance.now();
        if (ahora - ultimoGrupo < 1000) return grupos; // se mueven poco: basta recalcular 1 vez por segundo
        ultimoGrupo = ahora;
        grupos = [];
        for (const p of fuentePersonas()) {
            const cx = p.x / escala, cz = p.z / escala;
            const g = grupos.find(q => Math.hypot(q.x - cx, q.z - cz) < 4);
            if (g) { g.x = (g.x * g.n + cx) / (g.n + 1); g.z = (g.z * g.n + cz) / (g.n + 1); g.n++; }
            else grupos.push({ x: cx, z: cz, n: 1 });
        }
        return grupos;
    }
    function dibujarPersonas(ctx, k, ox, oz, tam) {
        const t = performance.now() / 1000;
        for (const g of agrupar()) {
            const x = (g.x - ox) * k, y = (g.z - oz) * k;
            if (x < -4 || y < -4 || x > ctx.canvas.width + 4 || y > ctx.canvas.height + 4) continue;
            const alfa = 0.6 + 0.35 * Math.sin(t * 2 + g.x * 0.37 + g.z * 0.11);
            const s = Math.max(2, Math.round(tam));
            ctx.fillStyle = `rgba(20, 14, 6, ${(alfa * 0.8).toFixed(2)})`;
            ctx.fillRect(Math.round(x - s / 2) - 1, Math.round(y - s / 2) - 1, s + 2, s + 2);
            ctx.fillStyle = `rgba(255, 232, 160, ${alfa.toFixed(2)})`;
            ctx.fillRect(Math.round(x - s / 2), Math.round(y - s / 2), s, s);
        }
    }

    function dibujarPequeno() {
        const cx = px / escala, cz = pz / escala;
        const tam = cp.width;
        const k = tam / (RADIO * 2);
        ctxP.imageSmoothingEnabled = false;
        ctxP.fillStyle = '#2a2aa0';
        ctxP.fillRect(0, 0, tam, tam);
        // recorte con bordes fuera del mapa respetados
        const sx0 = cx - RADIO, sz0 = cz - RADIO;
        const ax = Math.max(0, sx0), az = Math.max(0, sz0);
        const bx = Math.min(W, cx + RADIO), bz = Math.min(H, cz + RADIO);
        if (bx > ax && bz > az) {
            ctxP.drawImage(base, ax, az, bx - ax, bz - az, (ax - sx0) * k, (az - sz0) * k, (bx - ax) * k, (bz - az) * k);
        }
        dibujarPersonas(ctxP, k, sx0, sz0, k * 1.7);
        ctxP.save();
        ctxP.translate(tam / 2, tam / 2);
        ctxP.rotate(-yaw);
        const fs = Math.round(tam / 160 * 2);
        ctxP.drawImage(flecha, -flecha.width * fs / 2, -flecha.height * fs / 2, flecha.width * fs, flecha.height * fs);
        ctxP.restore();
    }

    function ajustarGrande() {
        const lado = Math.floor(Math.min(innerWidth * 0.9 - 20, (innerHeight * 0.9 - 20) * W / H));
        const ancho = Math.max(64, lado), alto = Math.round(ancho * H / W);
        cg.width = ancho; cg.height = alto;
    }

    function dibujarGrande() {
        const ancho = cg.width, alto = cg.height;
        const k = ancho / W;
        ctxG.imageSmoothingEnabled = false;
        ctxG.drawImage(base, 0, 0, ancho, alto);
        const nombres = NOMBRES[idioma()];
        const fuente = Math.max(11, Math.round(ancho / 60));
        ctxG.font = fuente + "px 'PixelCraft', monospace";
        ctxG.textBaseline = 'middle';
        for (const kk in P) {
            const t = nombres[kk] || kk;
            const sep = 7 * Math.max(1, k * 0.8);
            const izq = P[kk][0] * k + sep + ctxG.measureText(t).width > ancho - 4;
            ctxG.textAlign = izq ? 'right' : 'left';
            const tx = P[kk][0] * k + (izq ? -sep : sep), ty = P[kk][1] * k;
            ctxG.fillStyle = '#000';
            ctxG.fillText(t, tx + 2, ty + 2);
            ctxG.fillStyle = '#fff';
            ctxG.fillText(t, tx, ty);
        }
        dibujarPersonas(ctxG, k, 0, 0, Math.max(3, k * 2.4));
        ctxG.save();
        ctxG.translate(px / escala * k, pz / escala * k);
        ctxG.rotate(-yaw);
        const fs = Math.max(1, Math.round(ancho / 360));
        ctxG.drawImage(flecha, -flecha.width * fs / 2, -flecha.height * fs / 2, flecha.width * fs, flecha.height * fs);
        ctxG.restore();
    }

    function alternarGrande() {
        grande.hidden = !grande.hidden;
        if (!grande.hidden) {
            ajustarGrande();
            pie.textContent = idioma() === 'en' ? 'Click or press M to close' : 'Clic o M para cerrar';
            dibujarGrande();
        }
    }

    function actualizar(x, z, nuevoYaw) {
        px = x; pz = z; yaw = nuevoYaw || 0;
        dibujarPequeno();
        if (!grande.hidden) dibujarGrande();
    }

    document.addEventListener('keydown', e => {
        if (e.code !== 'KeyM' || e.repeat) return;
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
        alternarGrande();
    });
    addEventListener('resize', () => {
        if (!grande.hidden) { ajustarGrande(); dibujarGrande(); }
    });

    dibujarPequeno();
    // fn() → [{ x, z }] en bloques
    function fijarPersonas(fn) { fuentePersonas = fn; ultimoGrupo = 0; }
    return { actualizar, alternarGrande, fijarPersonas };
}
