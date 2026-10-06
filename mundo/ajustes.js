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
    es: { ajustes: 'Ajustes', distancia: 'Distancia de render', fov: 'Campo de visión', sens: 'Sensibilidad', hora: 'Hora del día', ciclo: 'Ciclo día/noche', ir: 'Ir a', chunks: 'chunks' },
    en: { ajustes: 'Settings', distancia: 'Render distance', fov: 'Field of view', sens: 'Sensitivity', hora: 'Time of day', ciclo: 'Day/night cycle', ir: 'Go to', chunks: 'chunks' }
};

const CLAVE = 'venjy-mundo-ajustes';
const RADIO_ZONA = 34; // celdas

function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { return {}; }
}
function guardar(v) {
    try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ }
}

export function iniciarAjustes({ idioma, datos, terreno, mundo, jugador, camara, cielo, scene, pedirPuntero }) {
    const t = TXT[idioma] || TXT.es;
    const nombres = NOMBRES_ZONA[idioma] || NOMBRES_ZONA.es;
    const guardado = leer();
    const cfg = { distancia: 10, fov: 70, sens: 1, ciclo: true, ...guardado };

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
    fila(t.distancia, 4, 16, 1, cfg.distancia, v => `${v} ${t.chunks}`, aplicarDistancia);
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

    // Teletransporte
    const ir = document.createElement('h2');
    ir.textContent = t.ir;
    sec.appendChild(ir);
    const rejilla = document.createElement('div');
    rejilla.className = 'ir-a';
    for (const k of Object.keys(datos.P)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'boton chico';
        b.textContent = nombres[k];
        b.addEventListener('click', () => { teletransportar(k); pedirPuntero(); });
        rejilla.appendChild(b);
    }
    sec.appendChild(rejilla);

    const panel = document.querySelector('#inicio .panel');
    panel.insertBefore(sec, panel.querySelector('.controles'));

    function teletransportar(clave) {
        let [cx, cz] = datos.P[clave];
        let bx = cx * ESCALA + 2, bz = cz * ESCALA + 2;
        if (clave === 'faro') bz += 10; // junto al pedestal, no dentro de la torre
        bx = Math.max(2, Math.min(terreno.BW - 3, bx));
        bz = Math.max(2, Math.min(terreno.BD - 3, bz));
        mundo.ultimo = null;
        mundo.planificar(bx, bz);
        let intentos = 0;
        while (mundo.cola.some(c => c.d2 <= 4) && intentos++ < 200) mundo.construir(30);
        jugador.vuela = false;
        const suelo = terreno.HT[bz * terreno.BW + bx];
        jugador.colocar(bx + 0.5, Math.max(suelo, 14) + 2, bz + 0.5);
        jugador.alCambiarVuelo && jugador.alCambiarVuelo(false);
    }

    // Valores guardados
    aplicarDistancia(cfg.distancia);
    camara.fov = cfg.fov; camara.updateProjectionMatrix();
    jugador.sensibilidad = 0.0022 * cfg.sens;
    cielo.pausado = !cfg.ciclo;

    return {
        // Nombre de la zona cercana, o '' si estás lejos de todas
        zonaEn(x, z) {
            const cx = x / ESCALA, cz = z / ESCALA;
            let mejor = '', d2m = RADIO_ZONA * RADIO_ZONA;
            for (const k of Object.keys(datos.P)) {
                const d2 = (datos.P[k][0] - cx) ** 2 + (datos.P[k][1] - cz) ** 2;
                if (d2 < d2m) { d2m = d2; mejor = nombres[k]; }
            }
            return mejor;
        },
        sincronizarHora() { horaFila.value = cielo.hora; horaFila.dispatchEvent(new Event('input')); }
    };
}
