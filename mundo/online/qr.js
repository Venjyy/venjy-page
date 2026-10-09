// =========================================================
// VENJY · QR estilo Minecraft (dibujo y lector) para jugar sin internet
// - dibujarQR: cada módulo es un bloque con relieve (obsidiana sobre abedul), marco de tablones
//   pixelado y la cara de la skin al centro. Corrección H (30 %): la cara tapa ~6 % de los módulos.
// - abrirLector: cámara + BarcodeDetector si el navegador lo trae; si no, jsQR (vendor/jsQR.js).
// Las dos librerías (vendor/qrcode.js y vendor/jsQR.js) se cargan solo al abrir el panel del QR.
// =========================================================
const M = 8;          // píxeles del lienzo por módulo
const MARGEN = 4;     // zona en blanco que pide el estándar (módulos)
const MARCO = 2;      // grosor del marco de tablones (módulos)

let qrcode = null;
export async function cargarGenerador() {
    if (!qrcode) qrcode = (await import('../../vendor/qrcode.js')).default;
    return qrcode;
}
let jsQR = null;
export function cargarJsQR() {
    if (jsQR) return Promise.resolve(jsQR);
    if (self.jsQR) return Promise.resolve(jsQR = self.jsQR);
    return new Promise((ok, mal) => {
        const s = document.createElement('script');
        s.src = new URL('../../vendor/jsQR.js', import.meta.url).href;
        s.onload = () => (self.jsQR ? ok(jsQR = self.jsQR) : mal(new Error('jsQR no cargó')));
        s.onerror = () => mal(new Error('no se pudo cargar jsQR'));
        document.head.appendChild(s);
    });
}

// Ruido fijo por posición (las motas de las texturas)
const mota = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const rgb = ([r, g, b], f = 1) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
const OSCURO = [36, 30, 52], CLARO = [236, 226, 196], TABLA = [168, 128, 76];

function bloque(x2d, px, py, color, oscuro) {
    x2d.fillStyle = rgb(color, 0.96 + mota(px, py) * 0.08);
    x2d.fillRect(px, py, M, M);
    // Relieve: luz arriba a la izquierda, sombra abajo a la derecha
    x2d.fillStyle = rgb(color, oscuro ? 1.45 : 1.04);
    x2d.fillRect(px, py, M, 1); x2d.fillRect(px, py, 1, M);
    x2d.fillStyle = rgb(color, oscuro ? 0.7 : 0.9);
    x2d.fillRect(px, py + M - 1, M, 1); x2d.fillRect(px + M - 1, py, 1, M);
    if (oscuro && mota(py, px) > 0.6) { x2d.fillStyle = rgb([92, 70, 140]); x2d.fillRect(px + 2 + ((mota(px, 1) * 3) | 0), py + 3, 2, 1); } // brillo de obsidiana
}

// Dibuja el QR del texto en el lienzo. cara: lienzo 16×16 (cara de la skin) o null.
// Devuelve { version, modulos } para anotar el tamaño.
export async function dibujarQR(lienzo, texto, { cara = null } = {}) {
    const gen = await cargarGenerador();
    const q = gen(0, 'H');
    q.addData(texto, 'Alphanumeric');
    q.make();
    const n = q.getModuleCount();
    const borde = MARGEN + MARCO;
    const lado = (n + borde * 2) * M;
    lienzo.width = lienzo.height = lado;
    const x = lienzo.getContext('2d');
    x.imageSmoothingEnabled = false;
    // Marco de tablones: bloques de 16 px con vetas y juntas (alineados desde los dos bordes)
    const tabla = document.createElement('canvas');
    tabla.width = tabla.height = 16;
    const xt = tabla.getContext('2d');
    for (let y = 0; y < 16; y++) for (let k = 0; k < 16; k++) {
        const junta = y % 4 === 3 || k === ((y >> 2) % 2 ? 4 : 12);
        xt.fillStyle = rgb(TABLA, junta ? 0.62 : 0.9 + mota(k, y) * 0.18);
        xt.fillRect(k, y, 1, 1);
    }
    for (let p = 0; p < lado; p += 16) {
        for (const [bx, by] of [[p, 0], [p, lado - 16], [0, p], [lado - 16, p]]) x.drawImage(tabla, bx, by);
    }
    // Zona en blanco y módulos
    const ini = MARCO * M;
    x.fillStyle = rgb(CLARO);
    x.fillRect(ini, ini, (n + MARGEN * 2) * M, (n + MARGEN * 2) * M);
    for (let r = -MARGEN; r < n + MARGEN; r++) for (let c = -MARGEN; c < n + MARGEN; c++) {
        const dentro = r >= 0 && c >= 0 && r < n && c < n;
        const oscuro = dentro && q.isDark(r, c);
        bloque(x, (c + borde) * M, (r + borde) * M, oscuro ? OSCURO : CLARO, oscuro);
    }
    // Cara de la skin al centro, con un bloque claro alrededor
    if (cara) {
        const f = Math.max(2, Math.round(0.22 * n * M / 16));
        const F = 16 * f, centro = lado / 2;
        const p0 = Math.round(centro - F / 2 - M), lp = F + 2 * M;
        x.fillStyle = rgb(CLARO); x.fillRect(p0, p0, lp, lp);
        x.fillStyle = rgb(OSCURO); // contorno pixelado de 1 bloque fino
        x.fillRect(p0 + 2, p0 + 2, lp - 4, 2); x.fillRect(p0 + 2, p0 + lp - 4, lp - 4, 2);
        x.fillRect(p0 + 2, p0 + 2, 2, lp - 4); x.fillRect(p0 + lp - 4, p0 + 2, 2, lp - 4);
        x.drawImage(cara, 0, 0, 16, 16, p0 + M, p0 + M, F, F);
    }
    return { version: (n - 17) / 4, modulos: n };
}

// Lee un QR de un lienzo (sirve para probar que el dibujo se puede escanear)
export async function leerLienzo(lienzo) {
    const leer = await cargarJsQR();
    const d = lienzo.getContext('2d').getImageData(0, 0, lienzo.width, lienzo.height);
    const r = leer(d.data, d.width, d.height);
    return r ? r.data : null;
}

// Cámara: llama alLeer(texto) con cada QR que vea. Devuelve { detener }. Lanza si no hay cámara.
export async function abrirLector(video, alLeer) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error('sin cámara'), { codigo: 'sin-camara' });
    let detector = null;
    try {
        if ('BarcodeDetector' in self && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) detector = new BarcodeDetector({ formats: ['qr_code'] });
    } catch (e) { detector = null; }
    const leer = detector ? null : await cargarJsQR();
    const flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false })
        .catch(e => { throw Object.assign(new Error(e.message), { codigo: 'sin-camara' }); });
    video.srcObject = flujo;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await video.play().catch(() => {});
    const lienzo = document.createElement('canvas');
    const x = lienzo.getContext('2d', { willReadFrequently: true });
    let vivo = true, ultimo = '';
    async function vuelta() {
        if (!vivo) return;
        try {
            if (video.readyState >= 2) {
                let texto = null;
                if (detector) {
                    const r = await detector.detect(video);
                    texto = r.length ? r[0].rawValue : null;
                } else {
                    const esc = Math.min(1, 640 / video.videoWidth);
                    lienzo.width = Math.round(video.videoWidth * esc); lienzo.height = Math.round(video.videoHeight * esc);
                    x.drawImage(video, 0, 0, lienzo.width, lienzo.height);
                    const d = x.getImageData(0, 0, lienzo.width, lienzo.height);
                    const r = leer(d.data, d.width, d.height, { inversionAttempts: 'dontInvert' });
                    texto = r ? r.data : null;
                }
                if (texto && texto !== ultimo && vivo) { ultimo = texto; alLeer(texto); }
            }
        } catch (e) { /* cuadro sin leer */ }
        if (vivo) setTimeout(vuelta, 150);
    }
    vuelta();
    return {
        detener() {
            vivo = false;
            for (const t of flujo.getTracks()) t.stop();
            video.srcObject = null;
        }
    };
}
