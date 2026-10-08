// =========================================================
// VENJY · Ajustes del mundo y teletransporte a los puntos clave
// Se dibujan dentro del panel de pausa (mundo.html).
// =========================================================
import { ESCALA, CHUNK } from './voxeles.js';

export const NOMBRES_ZONA = {
    es: { spawn: 'Inicio', casa: 'Casa', registro: 'Registro', mina: 'Mina', aldea: 'Aldea', gatera: 'Gatera', correo: 'Correo', faro: 'Faro' },
    en: { spawn: 'Start', casa: 'House', registro: 'Registry', mina: 'Mine', aldea: 'Village', gatera: 'Cat shelter', correo: 'Post office', faro: 'Lighthouse' }
};

const TXT = {
    es: { ajustes: 'Ajustes', distancia: 'Distancia de render', fov: 'Campo de visión', sens: 'Sensibilidad', hora: 'Hora del día', ciclo: 'Ciclo día/noche', auto: 'Distancia automática', fps: 'Mostrar FPS', sonido: 'Sonidos del mundo', brujula: 'Mostrar brújula', mapa: 'Mapa', horizontal: 'Horizontal', vertical: 'Vertical', ir: 'Ir a', chunks: 'chunks' },
    en: { ajustes: 'Settings', distancia: 'Render distance', fov: 'Field of view', sens: 'Sensitivity', hora: 'Time of day', ciclo: 'Day/night cycle', auto: 'Auto render distance', fps: 'Show FPS', sonido: 'World sounds', brujula: 'Show compass', mapa: 'Map', horizontal: 'Horizontal', vertical: 'Vertical', ir: 'Go to', chunks: 'chunks' }
};

const CLAVE = 'venjy-mundo-ajustes';
const RADIO_ZONA = 34; // celdas

function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; }
}
function guardar(v) {
    try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ }
}

export function iniciarAjustes({ idioma, datos, terreno, mundo, jugador, camara, cielo, scene, gatas, brujula, mapa = 'h', pedirPuntero, destinos = [], destinosZona = {}, nombresZona = null, getIdioma = () => idioma }) {
    const t = TXT[idioma] || TXT.es;
    const nombres = NOMBRES_ZONA[idioma] || NOMBRES_ZONA.es;
    // Nombres de las zonas tal como los pone el portafolio (index.html), en el idioma actual
    const nombreZona = k => {
        const n = nombresZona && nombresZona[k];
        return n ? (n[getIdioma()] || n.es) : nombres[k];
    };
    let descubiertos = new Set();
    try { descubiertos = new Set(JSON.parse(localStorage.getItem('venjy-mundo-descubiertos')) || []); } catch (e) { /* sin almacenamiento */ }
    const guardado = leer();
    const cfg = { distancia: 10, fov: 70, sens: 1, ciclo: true, auto: true, fps: true, brujula: true, ...guardado };

    const sec = document.createElement('section');
    sec.className = 'ajustes';
    const titulo = document.createElement('h2');
    titulo.textContent = t.ajustes;
    sec.appendChild(titulo);

    const fila = (etiqueta, min, max, paso, valor, formato, alCambiar) => {
        const f = document.createElement('label');
        f.className = 'fila';
        const nombre = document.createElement('span');
        nombre.textContent = etiqueta;
        const r = document.createElement('input');
        r.type = 'range'; r.min = min; r.max = max; r.step = paso; r.value = valor;
        const val = document.createElement('output');
        const pintar = () => { val.textContent = formato(+r.value); };
        r.addEventListener('input', () => { pintar(); alCambiar(+r.value); guardar(cfg); });
        pintar();
        f.append(nombre, r, val);
        sec.appendChild(f);
        return r;
    };

    const aplicarDistancia = n => {
        cfg.distancia = n;
        mundo.distancia = n;
        mundo.ultimo = null;
        const borde = n * CHUNK;
        scene.fog.near = borde * 0.55;
        scene.fog.far = borde * 0.95;
    };
    let efectiva = cfg.distancia;
    const distFila = fila(t.distancia, 4, 16, 1, cfg.distancia, v => {
        efectiva = v;
        return `${v} ${t.chunks}`;
    }, aplicarDistancia);
    const distSalida = distFila.parentNode.querySelector('output');
    // Distancia aplicada por el auto-ajuste: no toca el máximo guardado (slider)
    const aplicarDistanciaAuto = n => {
        efectiva = n;
        mundo.distancia = n;
        mundo.ultimo = null;
        const borde = n * CHUNK;
        scene.fog.near = borde * 0.55;
        scene.fog.far = borde * 0.95;
        distSalida.textContent = n === cfg.distancia ? `${n} ${t.chunks}` : `${n}/${cfg.distancia} ${t.chunks}`;
    };
    distFila.addEventListener('input', () => { distSalida.textContent = `${cfg.distancia} ${t.chunks}`; });
    fila(t.fov, 50, 100, 1, cfg.fov, v => `${v}°`, v => { cfg.fov = v; camara.fov = v; camara.updateProjectionMatrix(); });
    fila(t.sens, 0.4, 2.5, 0.1, cfg.sens, v => `${v.toFixed(1)}×`, v => { cfg.sens = v; jugador.sensibilidad = 0.0022 * v; });

    const horaFila = fila(t.hora, 0, 1, 0.01, cielo.hora ?? 0.38, v => {
        const h = Math.floor(v * 24), m = Math.floor((v * 24 - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }, v => cielo.fijarHora(v));

    const cicloFila = document.createElement('label');
    cicloFila.className = 'fila marca';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = cfg.ciclo;
    const cbTxt = document.createElement('span');
    cbTxt.textContent = t.ciclo;
    cb.addEventListener('change', () => { cfg.ciclo = cb.checked; cielo.pausado = !cb.checked; guardar(cfg); });
    cicloFila.append(cb, cbTxt);
    sec.appendChild(cicloFila);

    const marca = (etiqueta, valor, alCambiar) => {
        const f = document.createElement('label');
        f.className = 'fila marca';
        const c = document.createElement('input');
        c.type = 'checkbox'; c.checked = valor;
        const s = document.createElement('span');
        s.textContent = etiqueta;
        c.addEventListener('change', () => { alCambiar(c.checked); guardar(cfg); });
        f.append(c, s);
        sec.appendChild(f);
        return c;
    };
    const fpsEl = document.getElementById('fps');
    const aplicarFps = v => { cfg.fps = v; if (fpsEl) fpsEl.style.display = v ? '' : 'none'; };
    marca(t.auto, cfg.auto, v => {
        cfg.auto = v;
        if (!v) aplicarDistanciaAuto(cfg.distancia); // vuelve al máximo elegido
    });
    marca(t.fps, cfg.fps, aplicarFps);
    if (gatas) marca(t.sonido, !gatas.silenciado, v => gatas.silenciar(!v));
    const aplicarBrujula = v => { cfg.brujula = v; if (brujula) brujula.mostrar(v); };
    marca(t.brujula, cfg.brujula, aplicarBrujula);

    // Orientación del mapa: recarga la página con ?mapa=h|v conservando el resto de parámetros
    const mapaFila = document.createElement('div');
    mapaFila.className = 'fila selector';
    const mapaNombre = document.createElement('span');
    mapaNombre.textContent = t.mapa;
    const mapaOpciones = document.createElement('div');
    mapaOpciones.className = 'opciones';
    for (const [clave, texto] of [['h', t.horizontal], ['v', t.vertical]]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'boton chico' + (clave === mapa ? ' activo' : '');
        b.textContent = texto;
        b.setAttribute('aria-pressed', clave === mapa ? 'true' : 'false');
        b.addEventListener('click', () => {
            if (clave === mapa) return;
            const url = new URL(location.href);
            url.searchParams.set('mapa', clave);
            url.searchParams.set('lang', idioma);
            location.href = url.toString();
        });
        mapaOpciones.appendChild(b);
    }
    mapaFila.append(mapaNombre, mapaOpciones);
    sec.appendChild(mapaFila);

    // Teletransporte
    const ir= document.createElement('h2');
    ir.textContent = t.ir;
    sec.appendChild(ir);
    const rejilla = document.createElement('div');
    rejilla.className = 'ir-a';
    for (const k of Object.keys(datos.P)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'boton chico';
        b.textContent = nombreZona(k);
        if (nombresZona && nombresZona[k]) { b.setAttribute('data-es', nombresZona[k].es); b.setAttribute('data-en', nombresZona[k].en); }
        b.addEventListener('click', () => { teletransportar(k); pedirPuntero(); });
        rejilla.appendChild(b);
    }
    // Destinos propios del portafolio (Sala del CV…), con su nombre en cada idioma
    for (const d of destinos) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'boton chico';
        b.textContent = d.nombre[idioma] || d.nombre.es;
        b.setAttribute('data-es', d.nombre.es);
        b.setAttribute('data-en', d.nombre.en);
        b.addEventListener('click', () => { irA(d.x, d.z, d.y, d.yaw); pedirPuntero(); });
        rejilla.appendChild(b);
    }
    sec.appendChild(rejilla);

    const panel = document.querySelector('#inicio .panel');
    panel.insertBefore(sec, panel.querySelector('.controles'));

    function teletransportar(clave) {
        const dz = destinosZona[clave]; // frente a la entrada de la zona, mirando hacia ella
        if (dz) { irA(dz.x, dz.z, dz.y, dz.yaw); return; }
        let [cx, cz] = datos.P[clave];
        let bx = cx * ESCALA + 2, bz = cz * ESCALA + 2;
        if (clave === 'faro') bz += 10; // junto al pedestal, no dentro de la torre
        bx = Math.max(2, Math.min(terreno.BW - 3, bx));
        bz = Math.max(2, Math.min(terreno.BD - 3, bz));
        irA(bx + 0.5, bz + 0.5);
    }

    // Lleva al jugador a (x, z) en bloques; si se da y, aparece justo ahí, y si se da yaw mira hacia allá
    function irA(x, z, y, yaw) {
        const bx = Math.floor(x), bz = Math.floor(z);
        mundo.ultimo = null;
        mundo.planificar(bx, bz);
        let intentos = 0;
        while (mundo.cola.some(c => c.d2 <= 4) && intentos++ < 200) mundo.construir(30);
        jugador.vuela = false;
        const suelo = terreno.HT[bz * terreno.BW + bx];
        jugador.colocar(x, y !== undefined ? y : Math.max(suelo, 14) + 2, z);
        if (yaw !== undefined) { jugador.yaw = yaw; jugador.pitch = 0; }
        jugador.alCambiarVuelo && jugador.alCambiarVuelo(false);
    }

    // Valores guardados
    aplicarDistancia(cfg.distancia);
    camara.fov = cfg.fov; camara.updateProjectionMatrix();
    jugador.sensibilidad = 0.0022 * cfg.sens;
    cielo.pausado = !cfg.ciclo;
    aplicarFps(cfg.fps);
    aplicarBrujula(cfg.brujula);

    return {
        aplicarDistanciaAuto,
        get auto() { return cfg.auto; },
        get distanciaMax() { return cfg.distancia; },
        get distanciaEfectiva() { return efectiva; },
        // Nombre de la zona cercana, o '' si estás lejos de todas
        zonaEn(x, z) {
            // Construcciones para explorar: nombre y cuántas lleva descubiertas (se recuerda)
            const lugares = terreno.lugares || [];
            for (const l of lugares) {
                if (Math.hypot(l.x - x, l.z - z) > l.radio) continue;
                if (!descubiertos.has(l.clave)) {
                    descubiertos.add(l.clave);
                    try { localStorage.setItem('venjy-mundo-descubiertos', JSON.stringify([...descubiertos])); } catch (e) { /* sin almacenamiento */ }
                }
                const n = lugares.filter(q => descubiertos.has(q.clave)).length;
                return `${l.nombre[getIdioma()] || l.nombre.es} · ${n}/${lugares.length}`;
            }
            const cx = x / ESCALA, cz = z / ESCALA;
            let mejor = '', d2m = RADIO_ZONA * RADIO_ZONA;
            for (const k of Object.keys(datos.P)) {
                const d2 = (datos.P[k][0] - cx) ** 2 + (datos.P[k][1] - cz) ** 2;
                if (d2 < d2m) { d2m = d2; mejor = nombreZona(k); }
            }
            return mejor;
        },
        sincronizarHora() { horaFila.value = cielo.hora; horaFila.dispatchEvent(new Event('input')); }
    };
}
