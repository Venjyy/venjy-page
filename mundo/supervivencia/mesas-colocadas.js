// =========================================================
// VENJY · Supervivencia · Mesas de duelo colocadas en el mundo (duelo 2J, PR 3)
// La mesa de duelo (O.MESA_DUELO) se coloca como un bloque que no se malla (B.MESA_DUELO: el largo a lo largo de X;
// B.MESA_DUELO_Z: de Z). Como es un bloque, se guarda con las ediciones del mundo y viaja en el cooperativo sin
// mensajes nuevos. Este módulo sigue esos bloques (mundo.alEditar y una pasada por las ediciones al cargar) y dibuja
// cada mesa con el mismo modelo que la mesa de Lucho (armarMesa, que también usa cartas-mesa.js).
// Medidas y colores: los de la mesa (Estudio → Mesa: grupos «mesa» y «mueble»). main.js lo carga con import() solo
// cuando hay alguna mesa colocada.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { B } from '../texturas.js';

export const ES_MESA = id => id === B.MESA_DUELO || id === B.MESA_DUELO_Z;
// Ángulo de la mesa en el marco del duelo (cartas-mesa-modelo.js, marcoLugar): con g = 0 el largo va en X
export const giroMesa = id => (id === B.MESA_DUELO_Z ? Math.PI / 2 : 0);

// El mueble (tablero con paño y cuatro patas), con su base en y = 0. medidas = L.mesa ({ ancho, fondo, alto });
// colores = L.mueble ({ madera, oscura, pano }); mat(o) = un material (cartas-mesa.js lo tiñe con la luz del mundo)
export function armarMesa(destino, medidas, colores, mat) {
    const { ancho, fondo, alto } = medidas;
    const c = v => new THREE.Color(v).getHex();
    const madera = mat({ color: c(colores.madera) }), oscura = mat({ color: c(colores.oscura) }), pano = mat({ color: c(colores.pano) });
    const tablero = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.06, fondo), [madera, madera, madera, oscura, madera, madera]);
    tablero.position.y = alto - 0.03; destino.add(tablero);
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(ancho - 0.1, fondo - 0.1), pano);
    tela.rotation.x = -Math.PI / 2; tela.position.y = alto + 0.001; destino.add(tela);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const pata = new THREE.Mesh(new THREE.BoxGeometry(0.08, alto - 0.06, 0.08), oscura);
        pata.position.set(sx * (ancho / 2 - 0.08), (alto - 0.06) / 2, sz * (fondo / 2 - 0.08)); destino.add(pata);
    }
}

// ctx: grupo (vista.grupo, ya desplazado por DY), dy (DY: las mesas guardan y sin él), mundo, tinte (color de la luz del mundo), medidas() → L de la mesa
export function crearMesasColocadas({ grupo, dy, mundo, tinte, medidas }) {
    const mesas = new Map(); // "x,y,z" -> { x, y, z, g, obj } (x, z = centro; y = suelo, sin DY, como el lugar del duelo)
    const mats = [];
    const mat = o => { const m = new THREE.MeshBasicMaterial(o); m.userData.base = m.color.clone(); mats.push(m); return m; };
    let firma = '';
    const firmaDe = L => JSON.stringify([L.mesa.ancho, L.mesa.fondo, L.mesa.alto, L.mueble]);

    function dibujar(m) {
        const L = medidas();
        const g = new THREE.Group();
        armarMesa(g, L.mesa, L.mueble, mat);
        g.position.set(m.x, m.y, m.z); g.rotation.y = m.g; // el grupo ya sube DY
        grupo.add(g); m.obj = g;
    }
    function borrar(m) {
        if (!m.obj) return;
        grupo.remove(m.obj);
        m.obj.traverse(h => { if (h.geometry) h.geometry.dispose(); for (const x of [h.material || []].flat()) { const i = mats.indexOf(x); if (i >= 0) mats.splice(i, 1); x.dispose(); } });
        m.obj = null;
    }
    function poner(x, y, z, id) {
        const k = x + ',' + y + ',' + z, antes = mesas.get(k);
        if (antes) { borrar(antes); mesas.delete(k); }
        if (!ES_MESA(id)) return;
        const m = { x: x + 0.5, y: y - dy, z: z + 0.5, g: giroMesa(id), obj: null };
        mesas.set(k, m); dibujar(m);
    }

    return {
        get lista() { return [...mesas.values()]; },
        // Ediciones del mundo (locales o del cooperativo): [[x, y, z, id], …]
        editar(lista) { for (const [x, y, z, id] of lista) if (ES_MESA(id) || mesas.has(x + ',' + y + ',' + z)) poner(x, y, z, id); },
        // Al cargar: las mesas que ya están en las ediciones guardadas
        cargar() { for (const [x, y, z, id] of mundo.listaEdiciones()) if (ES_MESA(id)) poner(x, y, z, id); },
        // Cada cuadro: el tinte de la luz y, si el Estudio cambió las medidas o los colores, se rehacen
        actualizar() {
            const L = medidas(), f = firmaDe(L);
            if (f !== firma) { firma = f; for (const m of mesas.values()) { borrar(m); dibujar(m); } }
            if (tinte) for (const m of mats) m.color.copy(tinte).multiply(m.userData.base);
        }
    };
}
