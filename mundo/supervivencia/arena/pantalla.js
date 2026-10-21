// =========================================================
// VENJY · Arena del duelo · capa de pantalla de los golpes (bloque 8 · N5, mundo/COMBATE.md §15.4)
// Un canvas chico (arena.json → efectos.pantalla.resolucion px de ancho) estirado sobre la arena sin suavizar, así que
// todo se ve pixelado como el resto del juego. Lo usa arena/arena.js:
//   golpe(nivel)                 líneas de velocidad en los bordes, flash y viñeta según el nivel (ligero … remate)
//   numero(texto, x, y, critico) número de daño que salta en (x, y) de 0..1 de la pantalla (si numeros.activo)
//   dibujar(dt) / aplicar(R) / destruir()
// =========================================================
export function crearPantalla(padre, R) {
    let E = (R && R.efectos && R.efectos.pantalla) || {};
    const cv = document.createElement('canvas');
    cv.className = 'ar-pantalla';
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;z-index:1';
    padre.appendChild(cv);
    const g = cv.getContext('2d');
    const lineas = [], numeros = [];
    let flash = { t: 0, max: 1, fuerza: 0 }, vineta = { t: 0, max: 1 }, lin = { t: 0, max: 1 };
    const fuente = 'PixelCraft, monospace';
    let limpio = true;

    function medir() {
        const w = Math.max(64, (E.resolucion | 0) || 192), ar = (window.innerHeight || 9) / (window.innerWidth || 16);
        const h = Math.max(36, Math.round(w * ar));
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    }
    function golpe(nivel) {
        const L = E.lineas || {}, F = E.flash || {}, V = E.vineta || {};
        if ((L.niveles || []).includes(nivel)) {
            lin = { t: L.dur, max: L.dur };
            lineas.length = 0;
            for (let i = 0; i < (L.cuantas | 0); i++) lineas.push({ a: Math.random() * Math.PI * 2, l: (L.largo || 0.2) * (0.5 + Math.random()), w: 1 + (Math.random() < 0.3) });
        }
        const fl = F[nivel];
        if (Array.isArray(fl) && fl[0] > 0) flash = { t: fl[0], max: fl[0], fuerza: fl[1] ?? 1 };
        if ((V.niveles || []).includes(nivel)) vineta = { t: V.dur, max: V.dur };
    }
    function numero(texto, x, y, critico = false) {
        const N = E.numeros || {};
        if (!N.activo) return;
        numeros.push({ texto: String(texto), x, y, t: N.dur, max: N.dur, critico });
        if (numeros.length > 12) numeros.shift();
    }
    function dibujar(dt) {
        const activo = flash.t > 0 || vineta.t > 0 || lin.t > 0 || numeros.length;
        if (!activo) { if (!limpio) { g.clearRect(0, 0, cv.width, cv.height); limpio = true; } return; }
        limpio = false;
        medir();
        const w = cv.width, h = cv.height;
        g.clearRect(0, 0, w, h);
        g.imageSmoothingEnabled = false;
        // Viñeta: marco oscuro en escalones (4 anillos), no un degradado liso
        if (vineta.t > 0) {
            vineta.t -= dt;
            const V = E.vineta || {}, u = Math.max(0, vineta.t / vineta.max), f = (V.fuerza || 0) * u;
            g.fillStyle = V.color || '#000';
            for (let k = 0; k < 4; k++) {
                g.globalAlpha = f * (1 - k / 4);
                const m = Math.round((k + 1) * Math.min(w, h) * 0.035);
                g.fillRect(0, 0, w, m); g.fillRect(0, h - m, w, m); g.fillRect(0, 0, m, h); g.fillRect(w - m, 0, m, h);
            }
        }
        // Líneas de velocidad: rayos desde los bordes hacia el centro, que se acortan al apagarse
        if (lin.t > 0) {
            lin.t -= dt;
            const L = E.lineas || {}, u = Math.max(0, lin.t / lin.max);
            g.fillStyle = L.color || '#fff'; g.globalAlpha = Math.ceil(u * 3) / 3;
            const cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy);
            for (const q of lineas) {
                const c = Math.cos(q.a), s = Math.sin(q.a), largo = R * q.l * u, pasos = Math.max(2, Math.round(largo));
                for (let i = 0; i < pasos; i++) {
                    const d = R - i;
                    g.fillRect(Math.round(cx + c * d), Math.round(cy + s * d), q.w, q.w);
                }
            }
        }
        // Flash: la pantalla blanquea un instante
        if (flash.t > 0) {
            flash.t -= dt;
            const F = E.flash || {}, u = Math.max(0, flash.t / flash.max);
            g.globalAlpha = flash.fuerza * (u > 0.5 ? 1 : 0.5);
            g.fillStyle = F.color || '#fff'; g.fillRect(0, 0, w, h);
        }
        // Números de daño: saltan y caen un poco
        const N = E.numeros || {};
        g.font = `${Math.max(6, Math.round(h / 16))}px ${fuente}`; g.textAlign = 'center';
        for (let i = numeros.length - 1; i >= 0; i--) {
            const q = numeros[i];
            q.t -= dt;
            if (q.t <= 0) { numeros.splice(i, 1); continue; }
            const u = 1 - q.t / q.max, y = q.y * h - (N.sube || 0) * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.6) * (h / 108);
            g.globalAlpha = q.t / q.max > 0.3 ? 1 : 0.5;
            g.fillStyle = '#000'; g.fillText(q.texto, Math.round(q.x * w) + 1, Math.round(y) + 1);
            g.fillStyle = q.critico ? N.critico || '#f55' : N.color || '#ff5'; g.fillText(q.texto, Math.round(q.x * w), Math.round(y));
        }
        g.globalAlpha = 1;
    }
    function aplicar(R2) { E = (R2 && R2.efectos && R2.efectos.pantalla) || E; }
    function destruir() { cv.remove(); }
    return { golpe, numero, dibujar, aplicar, destruir };
}
