// =========================================================
// VENJY · Supervivencia · HUD
// Barra rápida (9 casillas), corazones, muslos de hambre, armadura y burbujas de aire,
// todo pixelado y pintado con código. Mensajes cortos arriba de la barra.
// =========================================================
import { icono } from './iconos.js';
import { info, nombreDe } from './objetos.js';
import { nombrePila } from './inventario.js';

// Íconos de 9×9 (como Minecraft): 'k' contorno, 'a' color, 'b' brillo, 's' sombra
const FORMAS = {
    corazon: ['.kk...kk.', 'kabk.kaak', 'kbaaaaaak', 'kaaaaaaak', 'kaaaaaask', '.kaaaask.', '..kaask..', '...kak...', '....k....'],
    muslo: ['....kkk..', '...kaaak.', '..kaaaaak', '..kaaaabk', '..kaaaak.', '.kkaakk..', 'kwk.k....', 'kwwk.....', '.kk......'],
    armadura: ['.kkk.kkk.', 'kaaakaaak', 'kabaaaaak', 'kaaaaaaak', 'kaaaaaaak', '.kaaaaak.', '.kaaaaak.', '..kaaak..', '...kkk...'],
    burbuja: ['..kkkkk..', '.kbbaaak.', 'kbaaaaaak', 'kbaaaaaak', 'kaaaaaaak', 'kaaaaaaak', 'kaaaaaaak', '.kaaaaak.', '..kkkkk..']
};
const PALETAS = {
    corazon: { k: '#1a0000', a: '#d42020', b: '#ff8a8a', s: '#9a1010' },
    corazonVacio: { k: '#1a0000', a: '#3a1010', b: '#3a1010', s: '#3a1010' },
    corazonVeneno: { k: '#0a1400', a: '#7a8a1e', b: '#b4c45a', s: '#4e5a10' },
    muslo: { k: '#1a0e00', a: '#b0703a', b: '#e0a060', w: '#f0e8d8' },
    musloVacio: { k: '#1a0e00', a: '#3a2614', b: '#3a2614', w: '#3a2614' },
    musloHambre: { k: '#0a1400', a: '#6a7a2a', b: '#90a040', w: '#c8d0a0' },
    armadura: { k: '#101010', a: '#b8b8c0', b: '#ffffff' },
    armaduraVacia: { k: '#101010', a: '#303034', b: '#303034' },
    burbuja: { k: '#06203a', a: '#5aa0f0', b: '#d0eaff' }
};

function dibujarForma(ctx, forma, paleta, x, y, escala, mitad = false) {
    const f = FORMAS[forma];
    for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) {
        const ch = f[j][i];
        if (ch === '.') continue;
        if (mitad && i > 4 && ch !== 'k') continue;
        ctx.fillStyle = paleta[ch] || paleta.a;
        ctx.fillRect(x + i * escala, y + j * escala, escala, escala);
    }
}

export function crearHUD({ inventario, idioma: idiomaIni = 'es' }) {
    let idioma = idiomaIni;
    const barra = document.getElementById('barra-rapida');
    const barras = document.getElementById('barras');
    const nombreEl = document.getElementById('nombre-objeto');
    const mensajesEl = document.getElementById('mensajes');

    // ---- Barra rápida ----
    const casillas = [];
    for (let i = 0; i < 9; i++) {
        const c = document.createElement('div');
        c.className = 'casilla-rapida';
        c.setAttribute('role', 'option');
        const lienzo = document.createElement('canvas');
        lienzo.width = lienzo.height = 32;
        const n = document.createElement('span');
        n.className = 'cantidad';
        const d = document.createElement('i');
        d.className = 'desgaste';
        d.hidden = true;
        c.append(lienzo, n, d);
        barra.appendChild(c);
        casillas.push({ c, lienzo, n, d, id: -1, cant: -1, des: -1 });
    }

    function pintarCasilla(cs, p) {
        const id = p ? p.id : 0, cant = p ? p.n : 0, des = p ? p.d : 0;
        if (cs.id === id && cs.cant === cant && cs.des === des) return;
        cs.id = id; cs.cant = cant; cs.des = des;
        const ctx = cs.lienzo.getContext('2d');
        ctx.clearRect(0, 0, 32, 32);
        if (id) ctx.drawImage(icono(id), 0, 0);
        cs.n.textContent = cant > 1 ? String(cant) : '';
        const max = id && info(id) && info(id).durabilidad;
        if (max && des > 0) {
            const k = Math.max(0, 1 - des / max);
            cs.d.hidden = false;
            cs.d.style.setProperty('--k', k.toFixed(3));
            cs.d.style.setProperty('--color', `hsl(${Math.round(k * 120)} 90% 45%)`);
        } else cs.d.hidden = true;
    }

    let elegidaPrevia = -1, ocultarNombre = 0;
    function mostrarNombre() {
        const p = inventario.enMano();
        if (!p) { nombreEl.hidden = true; return; }
        nombreEl.textContent = nombrePila(p, idioma);
        nombreEl.hidden = false;
        clearTimeout(ocultarNombre);
        ocultarNombre = setTimeout(() => { nombreEl.hidden = true; }, 2000);
    }

    // ---- Barras de estado ----
    const lienzoBarras = document.createElement('canvas');
    const ESC = 2, ANCHO = 9 * ESC * 10 + 9 * 2; // 10 íconos de 9 px con 1 px de separación (× escala)
    lienzoBarras.width = ANCHO * 2 + 40;
    lienzoBarras.height = (9 * ESC + 4) * 2;
    barras.appendChild(lienzoBarras);
    let firma = '';
    let parpadeo = 0;

    function pintarBarras(v) {
        const f = [v.vida, v.vidaMax, v.hambre, v.defensa, v.aire, v.veneno, v.efectoHambre, Math.floor(parpadeo * 4) % 2, v.temblor].join(',');
        if (f === firma) return;
        firma = f;
        const ctx = lienzoBarras.getContext('2d');
        ctx.clearRect(0, 0, lienzoBarras.width, lienzoBarras.height);
        const fila = 9 * ESC + 4, paso = 9 * ESC + 2;
        const derecha = lienzoBarras.width - ANCHO;
        // Corazones (abajo a la izquierda); con poca vida tiemblan
        const corazones = Math.ceil(v.vidaMax / 2);
        for (let i = 0; i < corazones; i++) {
            const x = i * paso, y = fila + (v.temblor && v.vida <= 4 ? ((i * 7 + Math.floor(parpadeo * 20)) % 3) - 1 : 0);
            dibujarForma(ctx, 'corazon', PALETAS.corazonVacio, x, y, ESC);
            const lleno = v.vida - i * 2;
            const pal = v.veneno ? PALETAS.corazonVeneno : PALETAS.corazon;
            if (lleno >= 2) dibujarForma(ctx, 'corazon', pal, x, y, ESC);
            else if (lleno === 1) dibujarForma(ctx, 'corazon', pal, x, y, ESC, true);
        }
        // Armadura (arriba de los corazones)
        if (v.defensa > 0) {
            for (let i = 0; i < 10; i++) {
                const x = i * paso, lleno = v.defensa - i * 2;
                dibujarForma(ctx, 'armadura', PALETAS.armaduraVacia, x, 0, ESC);
                if (lleno >= 2) dibujarForma(ctx, 'armadura', PALETAS.armadura, x, 0, ESC);
                else if (lleno === 1) dibujarForma(ctx, 'armadura', PALETAS.armadura, x, 0, ESC, true);
            }
        }
        // Hambre (abajo a la derecha, de derecha a izquierda)
        for (let i = 0; i < 10; i++) {
            const x = derecha + ANCHO - (i + 1) * paso;
            dibujarForma(ctx, 'muslo', PALETAS.musloVacio, x, fila, ESC);
            const lleno = v.hambre - i * 2;
            const pal = v.efectoHambre ? PALETAS.musloHambre : PALETAS.muslo;
            if (lleno >= 2) dibujarForma(ctx, 'muslo', pal, x, fila, ESC);
            else if (lleno === 1) dibujarForma(ctx, 'muslo', pal, x, fila, ESC, true);
        }
        // Burbujas (solo bajo el agua)
        if (v.aire < 300) {
            const n = Math.ceil(v.aire / 30);
            for (let i = 0; i < n; i++) dibujarForma(ctx, 'burbuja', PALETAS.burbuja, derecha + ANCHO - (i + 1) * paso, 0, ESC);
        }
    }

    // ---- Mensajes ----
    function mensaje(texto, segundos = 3) {
        const m = document.createElement('div');
        m.className = 'mensaje';
        m.textContent = texto;
        mensajesEl.appendChild(m);
        while (mensajesEl.children.length > 5) mensajesEl.firstChild.remove();
        setTimeout(() => { m.classList.add('saliendo'); setTimeout(() => m.remove(), 600); }, segundos * 1000);
    }

    return {
        mensaje,
        mostrarNombre,
        setIdioma(l) { idioma = l; },
        actualizar(dt, vida) {
            parpadeo += dt;
            inventario.casillas.slice(0, 9).forEach((p, i) => pintarCasilla(casillas[i], p));
            if (inventario.elegida !== elegidaPrevia) {
                casillas.forEach((cs, i) => cs.c.classList.toggle('elegida', i === inventario.elegida));
                if (elegidaPrevia !== -1) mostrarNombre();
                elegidaPrevia = inventario.elegida;
            }
            if (vida) pintarBarras(vida);
        },
        casillas
    };
}
