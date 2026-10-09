// =========================================================
// VENJY · Supervivencia · Panel del QR (jugar sin internet)
// Un solo panel (#panel-qr) para los dos lados:
//  · mostrar un código: el QR dibujado (online/qr.js) y su texto para copiar
//  · leer un código: la cámara (BarcodeDetector o jsQR) o el texto pegado
// main.js decide el orden (anfitrión: mostrar invitación → leer respuesta; invitado: al revés).
// =========================================================
import { dibujarQR, abrirLector } from '../online/qr.js';

const TXT = {
    es: { copiado: 'Texto copiado', sinCamara: 'No hay cámara disponible: pega el texto.', camara: 'Apunta la cámara al código…', medida: (v, n, b) => `QR versión ${v} · ${n}×${n} módulos · ${b} bytes` },
    en: { copiado: 'Text copied', sinCamara: 'No camera available: paste the text.', camara: 'Point the camera at the code…', medida: (v, n, b) => `QR version ${v} · ${n}×${n} modules · ${b} bytes` }
};

export function crearPanelQR({ idioma = 'es' }) {
    const $ = id => document.getElementById(id);
    const T = TXT[idioma] || TXT.es;
    let lector = null, alTexto = null, alCancelar = null;

    function detenerLector() {
        if (lector) lector.detener();
        lector = null;
        $('qr-video').hidden = true;
    }
    function estado(texto = '', error = false) {
        const p = $('qr-estado');
        p.hidden = !texto; p.textContent = texto; p.classList.toggle('error', error);
    }
    function entregar(texto) {
        if (!alTexto) return;
        const f = alTexto;
        alTexto = null;
        detenerLector();
        f(texto);
    }

    $('qr-copiar').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText($('qr-mio').value); estado(T.copiado); }
        catch (e) { $('qr-mio').select(); } // sin portapapeles: queda seleccionado para Ctrl+C
    });
    $('qr-escanear').addEventListener('click', async () => {
        if (lector || !alTexto) return;
        $('qr-codigo').hidden = true; // al escanear, la pantalla queda para la cámara
        $('qr-video').hidden = false;
        estado(T.camara);
        try { lector = await abrirLector($('qr-video'), t => entregar(t)); }
        catch (e) { detenerLector(); if ($('qr-mio').value) $('qr-codigo').hidden = false; estado(T.sinCamara, true); $('qr-entrada').focus(); }
    });
    $('qr-conectar').addEventListener('click', () => { const t = $('qr-entrada').value.trim(); if (t) entregar(t); });
    $('qr-cancelar').addEventListener('click', () => { const f = alCancelar; cerrar(); if (f) f(); });

    function abrir({ titulo, cancelar }) {
        cerrar();
        alCancelar = cancelar || null;
        $('qr-titulo').textContent = titulo;
        $('qr-mio').value = '';
        estado('');
    }
    // Muestra el código propio: { texto, bytes } de senal-qr.js; cara: lienzo 16×16 o null
    async function mostrarCodigo(c, cara, paso) {
        $('qr-paso-mostrar').textContent = paso;
        $('qr-mio').value = c.texto;
        const m = await dibujarQR($('qr-lienzo'), c.texto, { cara });
        $('qr-medida').textContent = T.medida(m.version, m.modulos, c.bytes);
        $('qr-codigo').hidden = false;
        return m;
    }
    function ocultarCodigo() { $('qr-codigo').hidden = true; }
    // Espera un código (cámara o texto pegado). Se resuelve con el texto, o null si se cancela.
    function pedir(paso) {
        $('qr-paso-leer').textContent = paso;
        $('qr-entrada').value = '';
        $('qr-leer').hidden = false;
        return new Promise(ok => { alTexto = ok; });
    }
    function ocultarPedir() { $('qr-leer').hidden = true; detenerLector(); }
    function cerrar() {
        detenerLector();
        if (alTexto) { const f = alTexto; alTexto = null; f(null); }
        alCancelar = null;
        ocultarCodigo();
        ocultarPedir();
        estado('');
    }
    return { abrir, mostrarCodigo, ocultarCodigo, pedir, ocultarPedir, estado, cerrar };
}
