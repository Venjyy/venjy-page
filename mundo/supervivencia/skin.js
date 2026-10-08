// =========================================================
// VENJY · Supervivencia · Skin del jugador
// La skin es una descripción (la misma que usan los amigos en criaturas/pieles.js): piel,
// pelo, ojos, barba, lentes, gorro, ropa, pantalón y zapatillas. Se puede partir de la de
// Venjy o de cualquier amigo y cambiar lo que quieras. Se guarda en este dispositivo
// (localStorage) y se ve en la mano, en tercera persona (F5) y en las escenas con amigos.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { crearTinte, crearPersona, caminar } from '../criaturas/cuerpo.js';
import { pielDe, agregarExtras } from '../criaturas/pieles.js';
import { PERSONAS } from '../criaturas/amigos.js';
import { VENJY } from '../criaturas/venjy.js';

const CLAVE = 'venjy-supervivencia-skin';

// Pony, Salonas y Lona están pintados a mano en npcs.js: aquí van descritos para usarlos de base
const OTROS = {
    pony: { nombre: 'Pony', piel: [232, 200, 176], pelo: { color: [70, 60, 54], estilo: 'muy corto' }, ojos: [70, 52, 36], barba: true, barbaColor: [90, 76, 66], lentes: true, ropa: { tipo: 'traje', color: [110, 112, 118] }, pantalon: [92, 94, 100], zapatillas: 'negras' },
    salonas: { nombre: 'Salonas', piel: [228, 196, 172], pelo: { color: [18, 16, 18], estilo: 'desordenado' }, ojos: [60, 40, 30], barba: true, lentes: true, ropa: { tipo: 'polera', color: [120, 120, 124] }, pantalon: [40, 42, 50], zapatillas: 'negras' },
    lona: { nombre: 'Lona', piel: [246, 226, 214], pelo: { color: [20, 18, 22], estilo: 'largo' }, ojos: [70, 50, 40], ropa: { tipo: 'polera', color: [24, 24, 28], estampado: [236, 236, 232] }, pantalon: [70, 100, 150], zapatillas: 'blancas' }
};

export const BASES = [
    { clave: 'venjy', ...VENJY, nombre: 'Venjy' },
    ...Object.entries(OTROS).map(([clave, d]) => ({ clave, ...d })),
    ...Object.entries(PERSONAS).map(([clave, d]) => ({ clave, ...d }))
];

const copia = d => JSON.parse(JSON.stringify(d));
export const skinPorDefecto = () => { const d = copia(BASES[0]); d.base = 'venjy'; return d; };

export function cargarSkin() {
    try {
        const s = JSON.parse(localStorage.getItem(CLAVE) || 'null');
        if (s && s.piel && s.pelo && s.ropa) return s;
    } catch (e) { /* sin almacenamiento */ }
    return skinPorDefecto();
}
export function guardarSkin(d) {
    try { localStorage.setItem(CLAVE, JSON.stringify(d)); return true; } catch (e) { return false; }
}

// Modelo de cajas del jugador (mira hacia +Z, pies en el origen)
export function crearModelo(d, semilla = 8800) {
    const tinte = crearTinte();
    const piel = pielDe(d);
    const p = crearPersona(tinte, piel, semilla);
    agregarExtras(p, piel.extras, tinte, semilla);
    if (d.escala) p.g.scale.setScalar(d.escala);
    return { ...p, tinte };
}

// Colores de la mano en primera persona: piel y manga según la ropa
export function coloresMano(d) {
    const manga = d.ropa.tipo === 'poleron' || d.ropa.tipo === 'traje' ? d.ropa.color : d.ropa.tipo === 'camisa cuadros' ? d.ropa.color : d.piel;
    return { piel: d.piel, manga };
}

// ---------------------------------------------------------
// Editor
// ---------------------------------------------------------
const TXT = {
    es: {
        titulo: 'Tu skin', base: 'Partir de', piel: 'Piel', pelo: 'Pelo', estilo: 'Peinado', ojos: 'Ojos', barba: 'Barba', lentes: 'Lentes', gorro: 'Gorro', lunar: 'Lunar',
        ropa: 'Ropa', estampado: 'Estampado', pantalon: 'Pantalón', zapatillas: 'Zapatillas', guardar: 'Guardar skin', volver: 'Volver', guardada: 'Skin guardada en este dispositivo',
        nota: 'Arrastra la vista previa para girarla. La skin se guarda solo en este navegador.',
        estilos: { 'muy corto': 'Muy corto', corto: 'Corto', ordenado: 'Ordenado', largo: 'Largo', desordenado: 'Desordenado', rulos: 'Rulos' },
        ropas: { polera: 'Polera', poleron: 'Polerón', 'camisa cuadros': 'Camisa a cuadros', 'polera ancha': 'Polera ancha con cadena', traje: 'Traje' },
        zapatos: { blancas: 'Blancas', negras: 'Negras', botas: 'Botas', jordan: 'Jordan rojas' }
    },
    en: {
        titulo: 'Your skin', base: 'Start from', piel: 'Skin', pelo: 'Hair', estilo: 'Hairstyle', ojos: 'Eyes', barba: 'Beard', lentes: 'Glasses', gorro: 'Beanie', lunar: 'Mole',
        ropa: 'Top', estampado: 'Print', pantalon: 'Pants', zapatillas: 'Shoes', guardar: 'Save skin', volver: 'Back', guardada: 'Skin saved on this device',
        nota: 'Drag the preview to turn it. The skin is only saved in this browser.',
        estilos: { 'muy corto': 'Buzz cut', corto: 'Short', ordenado: 'Neat', largo: 'Long', desordenado: 'Messy', rulos: 'Curly' },
        ropas: { polera: 'T-shirt', poleron: 'Hoodie', 'camisa cuadros': 'Plaid shirt', 'polera ancha': 'Baggy tee with chain', traje: 'Suit' },
        zapatos: { blancas: 'White', negras: 'Black', botas: 'Boots', jordan: 'Red Jordans' }
    }
};
const aHex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const deHex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

export function crearEditorSkin({ contenedor, idioma = 'es', alGuardar, alVolver }) {
    const t = TXT[idioma] || TXT.es;
    let d = cargarSkin();
    contenedor.textContent = '';
    const h = document.createElement('h1'); h.textContent = t.titulo;
    const cuerpo = document.createElement('div'); cuerpo.className = 'editor-skin';
    const lienzo = document.createElement('canvas'); lienzo.className = 'vista-skin'; lienzo.width = 260; lienzo.height = 340;
    lienzo.setAttribute('aria-label', t.titulo);
    const form = document.createElement('div'); form.className = 'campos-skin';
    cuerpo.append(lienzo, form);
    const nota = document.createElement('p'); nota.className = 'sub'; nota.textContent = t.nota;
    const estado = document.createElement('p'); estado.className = 'estado-skin'; estado.setAttribute('aria-live', 'polite');
    const fila = document.createElement('div'); fila.className = 'fila-botones';
    const bG = document.createElement('button'); bG.type = 'button'; bG.className = 'boton'; bG.textContent = t.guardar;
    const bV = document.createElement('button'); bV.type = 'button'; bV.className = 'boton secundario'; bV.textContent = t.volver;
    fila.append(bG, bV);
    contenedor.append(h, cuerpo, nota, estado, fila);

    // ---- Campos ----
    const campos = {};
    function campo(id, etiqueta, control) {
        const l = document.createElement('label'); l.className = 'campo-skin';
        const s = document.createElement('span'); s.textContent = etiqueta;
        control.id = 'skin-' + id;
        l.append(s, control);
        form.appendChild(l);
        campos[id] = control;
        control.addEventListener('input', leer);
        control.addEventListener('change', leer);
        return control;
    }
    const color = () => { const i = document.createElement('input'); i.type = 'color'; return i; };
    const check = () => { const i = document.createElement('input'); i.type = 'checkbox'; return i; };
    const selector = opciones => { const s = document.createElement('select'); for (const [v, n] of opciones) { const o = document.createElement('option'); o.value = v; o.textContent = n; s.appendChild(o); } return s; };

    const base = campo('base', t.base, selector(BASES.map(b => [b.clave, b.nombre])));
    base.addEventListener('change', () => { const b = BASES.find(x => x.clave === base.value); if (b) { d = copia(b); d.base = b.clave; pintar(); reconstruir(); } });
    campo('piel', t.piel, color());
    campo('pelo', t.pelo, color());
    campo('estilo', t.estilo, selector(Object.entries(t.estilos)));
    campo('ojos', t.ojos, color());
    campo('barba', t.barba, check());
    campo('barbaColor', t.barba + ' · color', color());
    campo('lentes', t.lentes, check());
    campo('gorro', t.gorro, check());
    campo('gorroColor', t.gorro + ' · color', color());
    campo('lunar', t.lunar, check());
    campo('ropa', t.ropa, selector(Object.entries(t.ropas)));
    campo('ropaColor', t.ropa + ' · color', color());
    campo('estampado', t.estampado, check());
    campo('estampadoColor', t.estampado + ' · color', color());
    campo('pantalon', t.pantalon, color());
    campo('zapatillas', t.zapatillas, selector(Object.entries(t.zapatos)));

    function pintar() {
        campos.base.value = d.base || '';
        campos.piel.value = aHex(d.piel);
        campos.pelo.value = aHex(d.pelo.color);
        campos.estilo.value = d.pelo.estilo;
        campos.ojos.value = aHex(d.ojos);
        campos.barba.checked = !!d.barba;
        campos.barbaColor.value = aHex(d.barbaColor || d.pelo.color);
        campos.lentes.checked = !!d.lentes;
        campos.gorro.checked = !!d.gorro;
        campos.gorroColor.value = aHex(d.gorro || [30, 30, 36]);
        campos.lunar.checked = !!d.lunar;
        campos.ropa.value = d.ropa.tipo;
        campos.ropaColor.value = aHex(d.ropa.color);
        campos.estampado.checked = !!d.ropa.estampado;
        campos.estampadoColor.value = aHex(d.ropa.estampado || [236, 236, 232]);
        campos.pantalon.value = aHex(d.pantalon);
        campos.zapatillas.value = d.zapatillas || 'blancas';
        campos.barbaColor.closest('label').hidden = !d.barba;
        campos.gorroColor.closest('label').hidden = !d.gorro;
        campos.estampadoColor.closest('label').hidden = !d.ropa.estampado;
    }
    function leer(e) {
        if (e && e.target === campos.base) return;
        d = {
            ...d, nombre: 'Yo',
            piel: deHex(campos.piel.value), pelo: { color: deHex(campos.pelo.value), estilo: campos.estilo.value }, ojos: deHex(campos.ojos.value),
            barba: campos.barba.checked, barbaColor: campos.barba.checked ? deHex(campos.barbaColor.value) : undefined,
            lentes: campos.lentes.checked, gorro: campos.gorro.checked ? deHex(campos.gorroColor.value) : undefined, lunar: campos.lunar.checked,
            ropa: { tipo: campos.ropa.value, color: deHex(campos.ropaColor.value), estampado: campos.estampado.checked ? deHex(campos.estampadoColor.value) : undefined },
            pantalon: deHex(campos.pantalon.value), zapatillas: campos.zapatillas.value
        };
        delete d.escala;
        campos.barbaColor.closest('label').hidden = !d.barba;
        campos.gorroColor.closest('label').hidden = !d.gorro;
        campos.estampadoColor.closest('label').hidden = !d.ropa.estampado;
        estado.textContent = '';
        reconstruir();
    }

    // ---- Vista previa 3D (se gira arrastrando) ----
    const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const escena = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, lienzo.width / lienzo.height, 0.1, 50);
    cam.position.set(0, 1.25, 5.2);
    cam.lookAt(0, 1.0, 0);
    let modelo = null, giro = 0.5, arrastre = null, fase = 0, vivo = true;
    function reconstruir() {
        if (modelo) escena.remove(modelo.g);
        modelo = crearModelo(d);
        modelo.tinte.aplicar(new THREE.Color(1, 1, 1));
        escena.add(modelo.g);
    }
    lienzo.addEventListener('pointerdown', e => { arrastre = e.clientX; lienzo.setPointerCapture(e.pointerId); });
    lienzo.addEventListener('pointermove', e => { if (arrastre !== null) { giro += (e.clientX - arrastre) * 0.012; arrastre = e.clientX; } });
    lienzo.addEventListener('pointerup', () => { arrastre = null; });
    function cuadro() {
        if (!vivo) return;
        requestAnimationFrame(cuadro);
        if (contenedor.hidden || contenedor.closest('[hidden]')) return;
        if (arrastre === null) giro += 0.008;
        fase += 0.05;
        if (modelo) { modelo.g.rotation.y = giro; caminar(modelo, fase, 0.35); }
        renderer.render(escena, cam);
    }

    bG.addEventListener('click', () => {
        const ok = guardarSkin(d);
        estado.textContent = ok ? t.guardada : '';
        alGuardar && alGuardar(d);
    });
    bV.addEventListener('click', () => alVolver && alVolver());

    pintar();
    reconstruir();
    cuadro();
    return { destruir() { vivo = false; renderer.dispose(); }, get skin() { return d; } };
}
