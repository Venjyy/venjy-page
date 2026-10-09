// =========================================================
// VENJY · Supervivencia · El cuello de Gala (misión 3 de Lona, lona3)
// Al entregar la lana, en vez del agradecimiento suelto sale una escena en cámara de cine (T = A + 6,6 s,
// A = tiempo de caminata, entre 3,6 y 6,5 s):
//   0,0–A     Lona camina hacia Gala (cámara de lado que la sigue). Gala gira hacia ella y se sienta
//             un poco antes de que llegue. Globo de Lona: el agradecimiento de la misión.
//   A–A+0,9   Lona se agacha frente a Gala (torso inclinado, piernas compensadas, brazo al frente).
//   A+0,9     el cuello aparece en la mano de Lona (crece), se queda ahí y pasa al cuello de Gala.
//   A+3,2     el cuello queda puesto (gatas.ponerCuello). Gala se sacude, ronronea y sale un corazón.
//             Lona se endereza (A+3,4 a A+4,2) y dice la segunda frase.
//   A+6,6     fin: todo se restaura. Esc o «Saltar» la cortan (el cuello queda puesto igual).
// Persistencia: sincronizar() muestra el cuello si lona3 está hecha (también en partidas que la
// completaron antes, sin escena). El cuello sale de gatas.js (`ponerCuello`, `cuelloDe`).
// La cámara es camaras.iniciarCine con planos 'gata' sobre el punto medio; el jugador queda congelado
// e invisible (su cuerpo se oculta en el gancho de pose) y se mueve al punto de observación de la cámara.
// Depuración: __venjy.cuello (forzar(), pausar(v), irA(s), saltar(), sincronizar()).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { crearGlobo, COLOR_GLOBO, caminar, angulo, lerp } from '../criaturas/cuerpo.js';
import { MISIONES } from './misiones-datos.js';

const suave = u => u * u * (3 - 2 * u);
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const tramo = (u, a, b) => lim((u - a) / (b - a), 0, 1);

const DIST_FRENTE = 1.15;  // Lona se para a esta distancia delante de Gala (donde está su cara)
const VEL_CAMINAR = 1.6;   // bloques/s; define la duración de la caminata
const TOTAL = 6.6;         // duración tras llegar (s)
const TXT = {
    es: { saltar: 'Saltar', l1: 'Quieta, Gala, que no te lo voy a apretar.', l2: 'Quedó regio. Naranjo con vuelo, como tú.', ronron: 'Prrrrr…' },
    en: { saltar: 'Skip', l1: "Hold still, Gala, I won't squeeze it too tight.", l2: 'Looks great. Orange with a flourish, just like you.', ronron: 'Purrrrr…' }
};

// Corazón de 9×9 píxeles (igual que en caricias.js y ganado.js)
const texCorazon = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 9;
    const ctx = c.getContext('2d');
    ['.kk...kk.', 'kaak.kaak', 'kaaaaaaak', 'kaaaaaaak', '.kaaaaak.', '..kaaak..', '...kak...', '....k....'].forEach((f, y) => {
        for (let x = 0; x < 9; x++) if (f[x] !== '.') { ctx.fillStyle = f[x] === 'k' ? '#3a0008' : '#e82040'; ctx.fillRect(x, y, 1, 1); }
    });
    const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
    return t;
})();

export function crearEscenaCuello({ grupo, dy, jugador, camara, camaras, gatas, npcs, misiones, bloquear, liberar, idioma = 'es' }) {
    let L = idioma;
    const tx = () => TXT[L];
    const etiq = o => (o ? o[L] || o.es : '');
    const lona = () => npcs.lona;
    const gala = () => gatas.gatas.find(g => g.clave === 'gala');

    let estado = null, pausada = false;
    const corazones = [];
    const vC = new THREE.Vector3(), vT = new THREE.Vector3(), qT = new THREE.Quaternion(), qG = new THREE.Quaternion(), qC = new THREE.Quaternion();

    // Globos (crearGlobo, como en caricias.js): uno para Lona y otro para Gala
    const globoLona = crearGlobo(grupo, { nombre: 'Lona', color: COLOR_GLOBO.lona }); globoLona.sp.scale.set(1.5, 0.62, 1);
    const globoGala = crearGlobo(grupo, { nombre: 'Gala', color: COLOR_GLOBO.gala }); globoGala.sp.scale.set(1.3, 0.56, 1);
    let txtLona = null, txtGala = null;
    function mostrar(globo, texto, visible, dt, x, y, z) {
        if (visible && texto) {
            if (globo === globoLona && txtLona !== texto) { globo.decir(texto); txtLona = texto; }
            if (globo === globoGala && txtGala !== texto) { globo.decir(texto); txtGala = texto; }
        }
        globo.actualizar(dt, !!(visible && texto), x, y, z, camara); // con la cámara se corre para no salirse de la pantalla
    }
    // Botón «Saltar» (igual que caricias.js; clase propia para su CSS)
    const boton = document.createElement('button');
    boton.type = 'button'; boton.className = 'boton saltar-cuello';
    boton.textContent = tx().saltar;
    boton.addEventListener('click', e => { e.preventDefault(); saltar(); });
    document.body.appendChild(boton);
    document.addEventListener('keydown', e => { if (estado && e.code === 'Escape' && !e.repeat) { e.preventDefault(); saltar(); } });

    // Corazones (como en caricias.js); viven fuera de la escena para acabar de desvanecerse
    function corazon(g) {
        g.g.updateMatrixWorld(true);
        const p = grupo.worldToLocal(g.cabeza.getWorldPosition(vC));
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texCorazon, transparent: true, depthWrite: false }));
        s.scale.set(0.35, 0.35, 1);
        s.position.set(p.x + (Math.random() - 0.5) * 0.3, p.y + 0.3, p.z);
        grupo.add(s);
        corazones.push({ s, t: 1.2 });
    }
    function actualizarCorazones(dt) {
        for (let i = corazones.length - 1; i >= 0; i--) {
            const c = corazones[i];
            c.t -= dt;
            c.s.position.y += dt * 0.6;
            c.s.material.opacity = Math.min(1, c.t * 2);
            if (c.t <= 0) { grupo.remove(c.s); c.s.material.dispose(); corazones.splice(i, 1); }
        }
    }

    // Dirección (dx, dz) normalizada de a hacia b; si están juntos, la de respaldo
    function dirHacia(ax, az, bx, bz, por) {
        const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
        return d > 1e-3 ? [dx / d, dz / d] : por;
    }

    // Cámara: el ancla es Lona (caminata) o el punto medio entre los dos (cuello). El observador
    // (el jugador, invisible y congelado) queda a 1 bloque del ancla, en la línea que los une, así
    // los planos «de lado» muestran la caminata y la escena de perfil.
    function cortarCamara() {
        camaras.terminarCine();
        camaras.iniciarCine(estado.ancla, { escena: true, fundido: 0.35, planos: 'gata', evitar: [] });
        camaras.enfocar(0.5);
        camaras.pose = c => { c.g.visible = false; };
    }

    // Pose de Lona agachada (k de 0 a 1): inclinada hacia Gala, piernas compensadas, brazo derecho al frente
    // (medido con la tabla de rig.md: inc 0,3 + bDx -1,2 deja la mano a ~1,0 de altura y ~1,0 delante de los pies)
    function poseLona(p, k) {
        p.cuerpo.position.y = 0.034 * k;
        p.cuerpo.rotation.x = 0.3 * k; p.cuerpo.rotation.z = 0;
        p.piernaD.rotation.x = -0.3 * k; p.piernaI.rotation.x = -0.3 * k;
        p.brazoD.rotation.x = -1.2 * k; p.brazoD.rotation.z = 0.05 * k;
        p.brazoI.rotation.x = 0.25 * k; p.brazoI.rotation.z = -0.05 * k;
        p.cuello.rotation.x = 0.3 * k; p.cuello.rotation.y = 0; p.cuello.rotation.z = 0;
    }

    function iniciar(n, g, completada) {
        bloquear();
        const yawG = Math.atan2(n.x - g.x, n.z - g.z);            // Gala se gira hacia Lona
        const F = { x: g.x + Math.sin(yawG) * DIST_FRENTE, z: g.z + Math.cos(yawG) * DIST_FRENTE, y: g.y };
        const d = Math.hypot(F.x - n.x, F.z - n.z);
        estado = {
            n, g, F, yawG, completada,
            A: lim(d / VEL_CAMINAR, 3.6, 6.5),
            t: 0, fase: 0, cortado: false, puesto: false, maullo: false, enAire: null, temp: null,
            hechos: [false, false],
            head0: Math.atan2(F.x - n.x, F.z - n.z),
            L0: { x: n.x, y: n.y, z: n.z },
            orig: jugador.pos.clone(),
            ancla: { x: n.x, y: n.y, z: n.z, escala: 0.9 }
        };
        n.escena = () => {};   // la IA de Lona se detiene; esta escena la mueve
        n.ruta = null; n.gata = null; n.pose = 'pie';
        g.escena = () => {};   // lo mismo con Gala (gata.escena se llama tras su pose)
        g.pose = 'pie'; g.poseElegida = false;
        misiones.ocultarMarcas = true;
        document.body.classList.add('en-cuello');
        camaras.iniciarCine(estado.ancla, { escena: true, fundido: 0.45, planos: 'gata', evitar: [] });
        camaras.enfocar(0.5);
        camaras.pose = c => { c.g.visible = false; };
    }

    function terminar() {
        if (!estado) return;
        const e = estado; estado = null;
        const n = e.n, g = e.g, p = n.p;
        delete n.escena; delete g.escena;
        n.ruta = null; n.gata = null; n.pose = 'pie'; n.espera = 1.5;
        p.cuerpo.position.y = 0; p.cuerpo.rotation.x = 0; p.cuerpo.rotation.z = 0;
        p.cuello.rotation.x = 0; p.cuello.rotation.y = 0; p.cuello.rotation.z = 0;
        p.brazoD.rotation.x = 0; p.brazoD.rotation.z = 0; p.brazoI.rotation.x = 0; p.brazoI.rotation.z = 0;
        g.ronroneo = false; g.pose = 'pie'; g.poseElegida = false; g.espera = 1.2;
        g.cabeza.rotation.y = 0; g.cabeza.rotation.z = 0;
        if (e.temp) { if (e.temp.parent) e.temp.parent.remove(e.temp); e.temp = null; }
        gatas.ponerCuello('gala', true);
        mostrar(globoLona, null, false, 0, 0, 0, 0);
        mostrar(globoGala, null, false, 0, 0, 0, 0);
        txtLona = txtGala = null;
        // Al volver, el jugador no queda pegado a Lona: si estaba a menos de 2 bloques, se aleja a ~3 mirándola
        const dL = Math.hypot(e.orig.x - n.x, e.orig.z - n.z);
        if (dL < 2) {
            const [dx, dz] = dirHacia(n.x, n.z, e.orig.x, e.orig.z, [0, 1]);
            jugador.colocar(n.x + dx * 3, e.orig.y, n.z + dz * 3);
            jugador.yaw = Math.atan2(n.x - jugador.pos.x, n.z - jugador.pos.z) - Math.PI;
            jugador.pitch = 0;
        } else jugador.colocar(e.orig.x, e.orig.y, e.orig.z);
        camaras.terminarCine();
        misiones.ocultarMarcas = false;
        document.body.classList.remove('en-cuello');
        liberar();
    }

    // Saltar: Lona queda donde iba a llegar, el cuello puesto, y se restaura todo
    function saltar() {
        if (!estado) return;
        const e = estado;
        e.n.x = e.F.x; e.n.z = e.F.z; e.n.y = e.F.y;
        e.n.yaw = Math.atan2(e.g.x - e.F.x, e.g.z - e.F.z);
        terminar();
    }

    function actualizar(dt) {
        actualizarCorazones(dt);
        if (!estado) { mostrar(globoLona, null, false, dt, 0, 0, 0); mostrar(globoGala, null, false, dt, 0, 0, 0); return; }
        const e = estado, n = e.n, g = e.g, p = n.p;
        if (!pausada) e.t += dt;
        const t = e.t, tau = t - e.A;

        // Gala: gira hacia Lona y se sienta poco antes de que llegue
        g.yaw += angulo(e.yawG - g.yaw) * Math.min(1, dt * 5);
        if (t >= e.A - 0.6) g.pose = 'sentada';

        if (t < e.A) {
            // Caminata: Lona avanza en línea recta hasta el frente de Gala
            if (!pausada) e.fase += dt * 7;
            const u = lim(t / e.A, 0, 1);
            n.x = lerp(e.L0.x, e.F.x, u); n.z = lerp(e.L0.z, e.F.z, u); n.y = lerp(e.L0.y, e.F.y, u);
            n.yaw = e.head0;
            caminar(p, e.fase, 0.6);
            p.cuerpo.position.y = 0; p.cuerpo.rotation.x = 0; p.cuerpo.rotation.z = 0;
            // La cámara la sigue; el observador va delante, hacia Gala
            const [ox, oz] = dirHacia(n.x, n.z, e.F.x, e.F.z, [Math.sin(e.head0), Math.cos(e.head0)]);
            e.ancla.x = n.x; e.ancla.y = n.y; e.ancla.z = n.z;
            jugador.pos.set(n.x + ox, n.y + dy, n.z + oz);
        } else {
            // Llegada: corte de cámara al punto medio de los dos
            if (!e.cortado) { e.cortado = true; cortarCamara(); }
            n.x = e.F.x; n.z = e.F.z; n.y = e.F.y;
            n.yaw += angulo(Math.atan2(g.x - n.x, g.z - n.z) - n.yaw) * Math.min(1, dt * 6);
            // Se agacha (0 a 0,9 s) y se endereza (3,4 a 4,2 s)
            const kc = suave(tramo(tau, 0, 0.9)) * (1 - suave(tramo(tau, 3.4, 4.2)));
            poseLona(p, kc);

            // El cuello: aparece en la mano, se pasa al cuello de Gala y queda puesto
            const cuelloG = gatas.cuelloDe('gala');
            if (!e.temp && cuelloG && tau >= 0.9 && tau < 3.2) {
                e.temp = cuelloG.clone(true); e.temp.visible = true;
                p.brazoD.add(e.temp); e.temp.position.set(0, -0.72, 0.12);
            }
            if (e.temp && tau < 2.4) e.temp.scale.setScalar(Math.max(0.001, 0.55 * suave(tramo(tau, 0.9, 1.3))));
            if (e.temp && tau >= 2.4 && tau < 3.2 && cuelloG) {
                if (!e.enAire) { grupo.attach(e.temp); e.enAire = { p0: e.temp.position.clone(), q0: e.temp.quaternion.clone() }; }
                const u = suave(tramo(tau, 2.4, 3.2));
                cuelloG.getWorldPosition(vT); grupo.worldToLocal(vT);
                e.temp.position.lerpVectors(e.enAire.p0, vT, u);
                e.temp.position.y += Math.sin(u * Math.PI) * 0.25;
                cuelloG.getWorldQuaternion(qC); grupo.getWorldQuaternion(qG);
                qT.copy(qG).invert().multiply(qC);
                e.temp.quaternion.slerpQuaternions(e.enAire.q0, qT, u);
                e.temp.scale.setScalar(lerp(0.55, 1, u));
            }
            if (!e.puesto && tau >= 3.2) {
                e.puesto = true;
                gatas.ponerCuello('gala', true);
                if (e.temp) { if (e.temp.parent) e.temp.parent.remove(e.temp); e.temp = null; }
                e.enAire = null;
            }

            // Gala: se sacude, mira a Lona, ronronea, maúlla y sale un corazón
            const r = tau - 3.2;
            g.cabeza.rotation.z = r > 0 && r < 2.2 ? Math.sin(r * 16) * 0.22 * Math.exp(-r * 1.8) : 0;
            const relL = lim(angulo(Math.atan2(n.x - g.x, n.z - g.z) - g.yaw), -0.9, 0.9);
            g.cabeza.rotation.y += (relL - g.cabeza.rotation.y) * Math.min(1, dt * 5);
            if (tau >= 3.3 && !e.maullo) { e.maullo = true; g.maullar(1.0); }
            g.ronroneo = tau >= 3.4 && tau < 6.2;
            g.cola.rotation.y = Math.sin(t * 6) * (tau >= 3.4 ? 0.35 : 0.12);
            if (tau >= 3.5 && !e.hechos[0]) { e.hechos[0] = true; corazon(g); }
            if (tau >= 4.6 && !e.hechos[1]) { e.hechos[1] = true; corazon(g); }

            // Cámara: ancla en el punto medio; el observador a 1 bloque, en la línea entre los dos
            e.ancla.x = (n.x + g.x) / 2; e.ancla.z = (n.z + g.z) / 2; e.ancla.y = (n.y + g.y) / 2;
            const [ox, oz] = dirHacia(n.x, n.z, g.x, g.z, [0, 1]);
            jugador.pos.set(e.ancla.x + ox, e.ancla.y + dy, e.ancla.z + oz);
        }

        // Globos: el agradecimiento mientras camina, luego las dos frases de Lona y el ronroneo de Gala
        const lonaTexto = t < e.A + 0.5 ? (t >= 0.3 ? etiq(e.completada) : null)
            : tau < 3.0 ? tx().l1 : (tau >= 4.3 && tau < 6.4 ? tx().l2 : null);
        mostrar(globoLona, lonaTexto, !!lonaTexto, dt, n.x, n.y + 2.6, n.z);
        const galaVisible = t >= e.A && tau >= 3.5 && tau < 6.4;
        mostrar(globoGala, tx().ronron, galaVisible, dt, g.x, g.y + 1.6, g.z);

        if (tau >= TOTAL) terminar();
    }

    // Llamado por misiones.js al completar una misión. Devuelve true si la escena dice el agradecimiento.
    function alCompletar(m) {
        if (m.id !== 'lona3') return false;
        const n = lona(), g = gala();
        if (!n || !g || !n.cargada || !g.cargada || !n.p.g.visible || !g.g.visible) { sincronizar(); return false; }
        iniciar(n, g, m.completada);
        return true;
    }

    // Persistencia: el cuello de Gala está puesto si la misión 3 de Lona está hecha
    function sincronizar() {
        gatas.ponerCuello('gala', !!misiones.estado.hechas.has('lona3'));
    }

    return {
        actualizar, alCompletar, sincronizar, saltar,
        get activa() { return !!estado; },
        setIdioma(l) { L = l; boton.textContent = tx().saltar; },
        // Depuración (capturas): forzar la escena aunque la misión no esté hecha
        forzar() {
            if (estado) return false;
            const n = lona(), g = gala();
            if (!n || !g) return false;
            iniciar(n, g, MISIONES.find(m => m.id === 'lona3').completada);
            return true;
        },
        pausar(v = true) { pausada = v; },
        irA(s) { if (estado) estado.t = s; }
    };
}
