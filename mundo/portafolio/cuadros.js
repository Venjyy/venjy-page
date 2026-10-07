// =========================================================
// VENJY · Cuadros con imágenes en las paredes
// Un plano con la foto y un marco de madera. La imagen se descarga recién cuando el jugador
// se acerca (las fotos están en images/, convertidas a JPG pequeños) y se tiñe con la hora
// del día igual que el resto del mundo.
// =========================================================
import * as THREE from '../../vendor/three.module.js';

const DISTANCIA_CARGA = 36; // bloques
const GIRO = { 'z+': 0, 'z-': Math.PI, 'x+': Math.PI / 2, 'x-': -Math.PI / 2 };

export function crearCuadros({ scene, camara, materiales }) {
    const cargador = new THREE.TextureLoader();
    const lista = [];

    // op: { x, y, z (centro), ancho, alto (bloques), normal: 'z+' | 'z-' | 'x+' | 'x-' (hacia dónde mira),
    //       imagen (ruta desde la raíz del sitio), marco? (grosor en bloques) }
    function agregar(op) {
        const marco = op.marco ?? 0.2;
        const grupo = new THREE.Group();
        const matMarco = new THREE.MeshBasicMaterial({ color: 0x5a3d1e });
        const matFoto = new THREE.MeshBasicMaterial({ color: 0x777777 }); // gris hasta que cargue la foto
        const planoMarco = new THREE.Mesh(new THREE.PlaneGeometry(op.ancho + marco * 2, op.alto + marco * 2), matMarco);
        planoMarco.position.z = -0.02;
        const planoFoto = new THREE.Mesh(new THREE.PlaneGeometry(op.ancho, op.alto), matFoto);
        grupo.add(planoMarco, planoFoto);
        grupo.position.set(op.x, op.y, op.z);
        grupo.rotation.y = GIRO[op.normal || 'z+'];
        scene.add(grupo);
        const cuadro = { op, grupo, matMarco, matFoto, cargado: false, cargando: false };
        lista.push(cuadro);
        return cuadro;
    }

    function cargar(c) {
        c.cargando = true;
        cargador.load(c.op.imagen, tex => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            c.matFoto.map = tex;
            c.matFoto.color.set(0xffffff);
            c.matFoto.needsUpdate = true;
            c.cargado = true;
        }, undefined, () => { c.cargando = false; c.fallo = true; });
    }

    function actualizar() {
        const p = camara.position, tinte = materiales.solido.color;
        for (const c of lista) {
            const d = Math.hypot(p.x - c.grupo.position.x, p.y - c.grupo.position.y, p.z - c.grupo.position.z);
            if (!c.cargado && !c.cargando && !c.fallo && d < DISTANCIA_CARGA) cargar(c);
            // Tinte día/noche (la foto queda en blanco hasta cargar)
            c.matMarco.color.setHex(0x5a3d1e).multiply(tinte);
            if (c.cargado) c.matFoto.color.setRGB(1, 1, 1).multiply(tinte);
        }
    }

    return { agregar, actualizar, lista };
}
