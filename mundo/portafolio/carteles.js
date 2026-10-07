// =========================================================
// VENJY · Carteles flotantes en 3D
// Texto pintado en un canvas con la fuente PixelCraft sobre un sprite que siempre mira al
// jugador. Cada cartel lleva su texto en español e inglés y se repinta al cambiar el idioma.
// =========================================================
import * as THREE from '../../vendor/three.module.js';

const DISTANCIA_VISIBLE = 48; // bloques
const DESVANECE = 12;         // los últimos bloques se van volviendo transparentes
const PX_POR_BLOQUE = 64;     // resolución del texto: píxeles de canvas por bloque de ancho

let fuenteLista = false;
const pendientes = new Set();
function esperarFuente(repintar) {
    if (fuenteLista) return;
    pendientes.add(repintar);
    if (pendientes.size > 1) return;
    try {
        document.fonts.load('24px PixelCraft').then(() => {
            fuenteLista = true;
            for (const fn of pendientes) fn();
            pendientes.clear();
        }, () => {});
    } catch (e) { /* sin API de fuentes */ }
}

// Parte el texto en líneas que quepan en `ancho` píxeles
function envolver(ctx, texto, ancho) {
    const lineas = [];
    for (const parrafo of String(texto).split('\n')) {
        let actual = '';
        for (const palabra of parrafo.split(' ')) {
            const prueba = actual ? actual + ' ' + palabra : palabra;
            if (ctx.measureText(prueba).width > ancho && actual) { lineas.push(actual); actual = palabra; }
            else actual = prueba;
        }
        lineas.push(actual);
    }
    return lineas;
}

export function crearCarteles(scene, camara, idiomaInicial = 'es') {
    let idioma = idiomaInicial;
    const lista = [];

    // opciones: { x, y, z, texto: {es,en}, ancho (bloques), color, fondo, tamano (px de fuente), distancia }
    function agregar(op) {
        const ancho = op.ancho || 4;
        const px = Math.round(ancho * PX_POR_BLOQUE);
        const c = document.createElement('canvas');
        c.width = px;
        c.height = 64;
        const nuevaTextura = () => {
            const t = new THREE.CanvasTexture(c);
            t.magFilter = THREE.NearestFilter;
            t.minFilter = THREE.NearestFilter;
            t.generateMipmaps = false;
            t.colorSpace = THREE.SRGBColorSpace;
            return t;
        };
        const mat = new THREE.SpriteMaterial({ map: nuevaTextura(), transparent: true, depthWrite: false, fog: false });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(op.x, op.y, op.z);
        sprite.renderOrder = 9;
        scene.add(sprite);
        const cartel = { op, c, sprite, mat, distancia: op.distancia || DISTANCIA_VISIBLE, ancho, px };

        cartel.pintar = () => {
            const texto = typeof op.texto === 'function' ? op.texto(idioma) : (op.texto[idioma] || op.texto.es);
            let fuente = op.tamano || 26;
            const ctx = c.getContext('2d');
            ctx.font = `${fuente}px PixelCraft, monospace`;
            // Una palabra más ancha que el cartel no se puede partir: se achica la letra hasta que quepa
            const maxPalabra = () => Math.max(...String(texto).split(/\s+/).map(w => ctx.measureText(w).width));
            while (fuente > 12 && maxPalabra() > px - 28) { fuente -= 1; ctx.font = `${fuente}px PixelCraft, monospace`; }
            const lineas = envolver(ctx, texto, px - 28);
            const alto = Math.round(lineas.length * fuente * 1.25 + 26);
            c.height = alto; // al cambiar el alto se borra el lienzo: hay que volver a configurar el contexto
            ctx.font = `${fuente}px PixelCraft, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = op.fondo || 'rgba(16, 10, 6, 0.72)';
            ctx.fillRect(0, 0, px, alto);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 4;
            ctx.strokeRect(2, 2, px - 4, alto - 4);
            ctx.fillStyle = op.color || '#ffffff';
            lineas.forEach((l, i) => {
                const y = 13 + (i + 0.5) * fuente * 1.25;
                ctx.fillStyle = '#3f3f3f';
                ctx.fillText(l, px / 2 + 2, y + 2);
                ctx.fillStyle = op.color || '#ffffff';
                ctx.fillText(l, px / 2, y);
            });
            // El lienzo cambia de alto según el texto: una textura nueva evita problemas de tamaño en la GPU
            if (mat.map) mat.map.dispose();
            mat.map = nuevaTextura();
            mat.needsUpdate = true;
            sprite.scale.set(ancho, ancho * alto / px, 1);
        };
        cartel.pintar();
        esperarFuente(cartel.pintar);
        lista.push(cartel);
        return cartel;
    }

    return {
        agregar,
        setIdioma(l) { idioma = l; for (const c of lista) c.pintar(); },
        actualizar() {
            const p = camara.position;
            for (const c of lista) {
                const d = Math.hypot(p.x - c.sprite.position.x, p.y - c.sprite.position.y, p.z - c.sprite.position.z);
                const cerca = c.op.cerca ?? 1.5; // muy cerca el cartel taparía la pantalla: se desvanece
                const vis = d < c.distancia && d > cerca;
                c.sprite.visible = vis;
                if (vis) c.mat.opacity = Math.max(0, Math.min(1, (c.distancia - d) / DESVANECE, (d - cerca) / 1.5));
            }
        }
    };
}
