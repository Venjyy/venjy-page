// =========================================================
// VENJY · Supervivencia · Fondo de cine detrás del menú (A3 · PR 3)
// Mientras eliges mundo, entras con amigos o editas tu skin, detrás del menú corre el mapa (sin las ediciones de
// ningún mundo) con planos de cámara lentos que se funden a negro entre uno y otro, como el panorama de Minecraft.
// Escena, cielo y MundoVoxel propios (no tocan los del juego); al entrar a un mundo, main.js llama destruir() y
// arrancar crea los suyos. Carga por partes: primero los chunks del primer plano (main.js espera `listo` para
// cerrar la presentación); después, mientras corre un plano, los del plano que sigue, para que el corte no espere.
// Datos: mundo/datos/inicio.json → fondo (Estudio → pestaña Inicio); valores base en INICIO.fondo.
// Depuración: window.__venjy.fondo (fijar(i, u), seguir(), cargado(), planos).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { MundoVoxel, CHUNK } from '../voxeles.js';
import { crearCielo, COLOR_HORIZONTE } from '../cielo.js';
import { planosValidos, planoEn, siguientePlano, veloEn } from './inicio-datos.js';

export function crearFondoMenu({ renderer, terreno, materiales, datos, velo, tactil = false, soloPlano = null }) {
    const f = datos.fondo;
    const planos = planosValidos(datos);
    const R = Math.max(2, Math.min(12, Math.round(tactil ? f.distanciaCelular : f.distancia) || 4));
    const scene = new THREE.Scene();
    const borde = R * CHUNK;
    scene.fog = new THREE.Fog(COLOR_HORIZONTE.clone(), borde * 0.55, borde * 0.95);
    const camara = new THREE.PerspectiveCamera(f.fov, window.innerHeight ? window.innerWidth / window.innerHeight : 1, 0.1, 1000);
    const cielo = crearCielo(scene, terreno.BW, terreno.BD, materiales);
    cielo.fijarHora(f.hora);
    cielo.pausado = true;
    cielo.nubesLibres = true;
    const mundo = new MundoVoxel(scene, terreno, materiales, R);
    mundo.iniciarWorkers('h', Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 2)));

    // ---- Chunks: alrededor de la cámara y, con menos prioridad, del comienzo del plano que sigue ----
    let firma = '';
    function planificar(centros) {
        const cs = centros.map(([x, z]) => [Math.floor(x / CHUNK), Math.floor(z / CHUNK)]);
        const nueva = cs.join(';');
        if (nueva === firma) return;
        firma = nueva;
        const deseados = new Map(); // clave -> prioridad (menor = antes)
        cs.forEach(([pcx, pcz], n) => {
            for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
                const d2 = dx * dx + dz * dz, x = pcx + dx, z = pcz + dz;
                if (d2 > R * R || x < 0 || z < 0 || x >= mundo.cx || z >= mundo.cz) continue;
                const k = x + ',' + z, pr = n * 1000 + d2;
                if (!deseados.has(k) || deseados.get(k) > pr) deseados.set(k, pr);
            }
        });
        mundo.ultimo = null; // deseado() acepta lo que llega de los workers (la lista la llevamos aquí)
        mundo.cola = [...deseados].filter(([k]) => !mundo.chunks.has(k)).sort((a, b) => a[1] - b[1])
            .map(([k]) => { const [x, z] = k.split(',').map(Number); return { x, z, k }; });
        for (const [k, ch] of mundo.chunks) if (!deseados.has(k)) { mundo.liberar(ch); mundo.chunks.delete(k); }
    }
    // ¿Están los chunks a `r` o menos del punto (x, z)?
    function listoCerca(x, z, r = 2) {
        const pcx = Math.floor(x / CHUNK), pcz = Math.floor(z / CHUNK);
        for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
            const cx = pcx + dx, cz = pcz + dz;
            if (cx < 0 || cz < 0 || cx >= mundo.cx || cz >= mundo.cz || dx * dx + dz * dz > r * r) continue;
            if (!mundo.chunks.has(cx + ',' + cz)) return false;
        }
        return true;
    }

    // ---- Planos ----
    const solo = Number.isInteger(soloPlano) && soloPlano >= 0 && soloPlano < planos.length ? soloPlano : null;
    let i = solo ?? 0, sig = 0, t = 0, estado = 'espera', esperado = 0, fijo = null;
    const elegirSig = () => { sig = solo ?? siguientePlano(i, planos.length, f.orden); };
    elegirSig();
    let resolverListo;
    const listo = new Promise(r => { resolverListo = r; });
    const mirar = (p, u) => {
        const c = planoEn(p, u);
        camara.position.set(c.pos[0], c.pos[1], c.pos[2]);
        camara.lookAt(c.mira[0], c.mira[1], c.mira[2]);
    };

    function paso(dt) {
        const p = planos[i];
        let opacidad = 1;
        if (fijo) {
            mirar(planos[fijo.i], fijo.u);
            opacidad = 0;
        } else if (estado === 'espera') {
            esperado += dt;
            mirar(p, 0);
            if (listoCerca(p.desde[0], p.desde[2]) || esperado > f.esperaMax) { estado = 'plano'; t = 0; resolverListo(); }
        } else {
            t += dt;
            const dur = Number(p.duracion);
            opacidad = veloEn(t, dur, f.fundido);
            mirar(p, t / dur);
            if (t >= dur) { i = sig; elegirSig(); estado = 'espera'; esperado = 0; }
        }
        if (velo) velo.style.opacity = String(opacidad);
        const pf = planos[sig];
        planificar([[camara.position.x, camara.position.z], [pf.desde[0], pf.desde[2]]]);
        mundo.procesar(fijo ? 16 : 4); // congelado (capturas): carga más rápido
        cielo.actualizar(camara, dt);
    }

    // ---- Bucle propio, con tope de cuadros ----
    let vivo = true, raf = 0, ultimo = performance.now();
    const minMs = 1000 / Math.max(10, Math.min(60, Number(f.fps) || 30)) - 1;
    function bucle(ahora) {
        if (!vivo) return;
        raf = requestAnimationFrame(bucle);
        if (ahora - ultimo < minMs) return;
        const dt = Math.min(0.1, (ahora - ultimo) / 1000);
        ultimo = ahora;
        paso(dt);
        renderer.render(scene, camara);
    }
    const alCambiarTamano = () => { camara.aspect = window.innerWidth / window.innerHeight; camara.updateProjectionMatrix(); };
    window.addEventListener('resize', alCambiarTamano);
    if (velo) { velo.hidden = false; velo.style.opacity = '1'; }
    raf = requestAnimationFrame(bucle);

    const api = {
        listo,
        planos,
        mundo,
        camara,
        // Depuración y capturas: congela el plano i en el instante u (0-1) sin velo; seguir() lo suelta
        fijar(n, u = 0) { if (planos[n]) { fijo = { i: n, u }; i = n; elegirSig(); } },
        seguir() { fijo = null; estado = 'espera'; esperado = 0; },
        // ¿Ya no queda nada por cargar alrededor?
        cargado() { return !mundo.cola.length && !mundo.enVuelo.size && !mundo.resultados.length; },
        // Libera todo (chunks, workers, cielo) antes de entrar a un mundo
        destruir() {
            if (!vivo) return;
            vivo = false;
            resolverListo(); // nadie se queda esperando un fondo que ya no existe
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', alCambiarTamano);
            if (velo) velo.hidden = true;
            for (const ch of mundo.chunks.values()) mundo.liberar(ch);
            mundo.chunks.clear();
            mundo.cola = [];
            for (const e of mundo.todosWorkers) e.w.terminate();
            mundo.todosWorkers = []; mundo.workers = [];
            scene.traverse(o => {
                if (o.geometry) o.geometry.dispose();
                for (const m of [].concat(o.material || [])) {
                    if (m === materiales.solido || m === materiales.agua) continue;
                    if (m.map) m.map.dispose();
                    m.dispose();
                }
            });
            scene.clear();
        }
    };
    return api;
}
