// =========================================================
// VENJY · Supervivencia · Duelo de Cartas Pixel: la mesa en el mundo (7h-2b, PR 4a)
// Una mesa junto a Lucho con cartas 3D (textura = dibujarCarta de cartas-arte.js + textos en PixelCraft,
// NearestFilter); tu mano va en pantalla, abajo al centro, y la de Lucho boca abajo frente a él.
// Cámara (sin tocar camaras.js: plano manual de la cámara de cine):
//   1.ª persona: desde tu asiento mirando la mesa (tu cuerpo se oculta)
//   3.ª persona: por detrás de ti, con el mundo vivo alrededor, y la mesa vista desde arriba en una esquina
// Se juega tocando o haciendo clic: tu carta → zona u objetivo; tu criatura → criatura de Lucho (o a él para el
// ataque directo). El flujo y los tiempos de la IA son los del panel (cartas-mesa-modelo.js). El panel 2D
// (cartas-panel.js) queda de respaldo. Las animaciones (robar, jugar, voltear, atacar, morir) van en el PR 4b:
// `alEventos(ev, accion)` recibe lo que devuelve `aplicar`.
// main.js la carga con import() la primera vez y llama a actualizar(dt) cada cuadro y a dibujar() después del render.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { CARTAS, FAMILIAS, NIVELES, TXT_CARTAS } from './cartas-datos.js';
import { partidaNivel, aplicar, jugadaIA, atkDe, defDe, esLegal } from './cartas.js';
import { dibujarCarta, dibujarReverso, ZONAS, ANCHO, ALTO } from './cartas-arte.js';
import { MESA, ALTO_CARTA, marcoMesa, posZona, posManoRival, posMazo, posMano, tocarCarta, tocarZona, elegirPostura, botonesMesa, zonasMarcadas, pausaAuto } from './cartas-mesa-modelo.js';
import { fusionar } from '../datos/cargador.js';

const t = (es, en) => ({ es, en });
export const TXT_MESA = {
    camara1: t('Vista: 1.ª persona', 'View: 1st person'),
    camara3: t('Vista: 3.ª persona', 'View: 3rd person'),
    cerrarLector: t('Cerrar', 'Close'),
    panel: t('Panel 2D', '2D panel'),
    tocaCarta: t('Toca una carta de tu mano o una de tus criaturas', 'Tap a card in your hand or one of your creatures'),
    tocaZona: t('Toca una zona marcada en verde', 'Tap a zone highlighted in green'),
    tocaObjetivo: t('Ahora toca la criatura marcada en verde a la que apunta la carta', 'Now tap the green-highlighted creature the card targets'),
    tocaAbrazo: t('Ahora toca la segunda criatura tuya', 'Now tap your second creature'),
    tocaRival: t('Toca una criatura de Lucho, o a Lucho para el ataque directo', 'Tap one of Lucho\'s creatures, or Lucho for a direct attack')
};

const K = 6; // escala de la textura: 50×76 de arte → 300×456
const COLOR_MARCA = { libre: 0x1d1d1d, valida: 0x55ff55, elegida: 0xffd24a };

export function crearMesaCartas(ctx) {
    const { scene, grupo, dy, camaras, renderer, jugador, tinte } = ctx;
    let idioma = ctx.idioma || 'es', L = fusionar(MESA, ctx.datos || null);
    let abierto = false, e = null, nivel = 'facil', sel = null, postura = 'ata', reloj = 0, vista = 1, tercera = 0, leida = null;
    let M = null, lucho = null, luchoAntes = null, aviso = '', encima = -1, mostrandoReglas = false;
    const Lx = o => (o && (o[idioma] || o.es)) || '';

    // ---------- Texturas ----------
    const texturas = new Map();
    function aLienzo(P) {
        const c = document.createElement('canvas'); c.width = P.w; c.height = P.h;
        c.getContext('2d').putImageData(new ImageData(P.d, P.w, P.h), 0, 0);
        return c;
    }
    function aTextura(c) {
        const tx = new THREE.CanvasTexture(c);
        tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter;
        tx.generateMipmaps = false; tx.colorSpace = THREE.SRGBColorSpace;
        return tx;
    }
    const fuente = px => `${px}px PixelCraft, monospace`;
    function ajustar(g, s, ancho, px, min = 12) {
        while (px > min) { g.font = fuente(px); if (g.measureText(s).width <= ancho) break; px -= 2; }
        g.font = fuente(px);
    }
    function lineas(g, s, ancho) {
        const out = []; let l = '';
        for (const p of s.split(/\s+/)) { const prueba = l ? `${l} ${p}` : p; if (l && g.measureText(prueba).width > ancho) { out.push(l); l = p; } else l = prueba; }
        if (l) out.push(l);
        return out;
    }
    function escribir(g, s, [x, y, w, h], { px, color = '#ffffff', sombra = '#222222', alinear = 'center' }) {
        ajustar(g, s, w * K - 2 * K, px);
        g.textAlign = alinear; g.textBaseline = 'middle';
        const X = alinear === 'center' ? (x + w / 2) * K : alinear === 'right' ? (x + w - 1.5) * K : (x + 1.5) * K, Y = (y + h / 2) * K;
        if (sombra) { g.fillStyle = sombra; g.fillText(s, X + K / 2, Y + K / 2); }
        g.fillStyle = color; g.fillText(s, X, Y);
    }
    function parrafo(g, s, [x, y, w, h], px) {
        let ls;
        for (; px >= 12; px -= 1) { g.font = fuente(px); ls = lineas(g, s, (w - 3) * K); if (ls.length * px * 1.1 <= (h - 2) * K) break; }
        g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = '#3b2a14';
        const alto = ls.length * px * 1.1, y0 = (y + h / 2) * K - alto / 2;
        ls.forEach((l, i) => g.fillText(l, (x + 1.5) * K, y0 + i * px * 1.1));
    }
    function texturaCarta(id, atk, def) {
        const d = CARTAS[id], clave = `${id}|${idioma}|${atk}|${def}`;
        if (texturas.has(clave)) return texturas.get(clave);
        const c = document.createElement('canvas'); c.width = ANCHO * K; c.height = ALTO * K;
        const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
        const arte = dibujarCarta(id);
        if (arte) g.drawImage(aLienzo(arte), 0, 0, c.width, c.height);
        escribir(g, Lx(d.nombre), ZONAS.nombre, { px: 30 });
        escribir(g, d.tipo === 'criatura' ? Lx(FAMILIAS[d.familia]) : Lx(TXT_CARTAS.hechizo), [11, 41, 37, 6], { px: 20, alinear: 'left' });
        parrafo(g, Lx(d.texto), d.tipo === 'criatura' ? ZONAS.texto : ZONAS.textoHechizo, 20);
        if (d.tipo === 'criatura') {
            const color = (v, b) => (v > b ? '#55ff55' : v < b ? '#ff5555' : '#ffffff');
            escribir(g, String(atk), ZONAS.atk, { px: 30, color: color(atk, d.atk), alinear: 'right' });
            escribir(g, String(def), ZONAS.def, { px: 30, color: color(def, d.def), alinear: 'right' });
        }
        const tx = aTextura(c);
        texturas.set(clave, tx);
        return tx;
    }
    let texReverso = null;
    const reverso = () => texReverso || (texReverso = aTextura(aLienzo(dibujarReverso())));
    function vaciarTexturas() { for (const tx of texturas.values()) tx.dispose(); texturas.clear(); }

    // ---------- Mesa en el mundo ----------
    const raiz = new THREE.Group(); raiz.name = 'mesa-cartas';
    const fijos = new THREE.Group(), dinamicos = new THREE.Group();
    raiz.add(fijos, dinamicos);
    const mats = []; // materiales que se tiñen con la luz del mundo
    const matTenido = (o, k = 1) => { const m = new THREE.MeshBasicMaterial(o); m.userData.claro = k; m.userData.base = m.color.clone(); mats.push(m); return m; };
    let geoCarta = null, marcas = [];
    function construirMesa() {
        for (const o of [...fijos.children]) {
            fijos.remove(o); o.geometry.dispose();
            for (const m of [o.material].flat()) { const i = mats.indexOf(m); if (i >= 0) mats.splice(i, 1); m.dispose(); }
        }
        marcas = [];
        const { ancho, fondo, alto } = L.mesa, cw = L.carta.ancho, ch = cw * ALTO_CARTA;
        geoCarta?.dispose(); geoCarta = new THREE.PlaneGeometry(cw, ch);
        const madera = matTenido({ color: 0x7a5230 }), oscura = matTenido({ color: 0x4e3218 }), pano = matTenido({ color: 0x2f6a34 });
        const tablero = new THREE.Mesh(new THREE.BoxGeometry(ancho, 0.06, fondo), [madera, madera, madera, oscura, madera, madera]);
        tablero.position.y = alto - 0.03; fijos.add(tablero);
        const tela = new THREE.Mesh(new THREE.PlaneGeometry(ancho - 0.1, fondo - 0.1), pano);
        tela.rotation.x = -Math.PI / 2; tela.position.y = alto + 0.001; fijos.add(tela);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            const pata = new THREE.Mesh(new THREE.BoxGeometry(0.08, alto - 0.06, 0.08), oscura);
            pata.position.set(sx * (ancho / 2 - 0.08), (alto - 0.06) / 2, sz * (fondo / 2 - 0.08)); fijos.add(pata);
        }
        for (const j of [0, 1]) for (let z = 0; z < 3; z++) {
            const p = posZona(L, j, z);
            const m = new THREE.Mesh(new THREE.PlaneGeometry(ch + 0.03, ch + 0.03), new THREE.MeshBasicMaterial({ color: COLOR_MARCA.libre, transparent: true, opacity: 0.3, depthWrite: false }));
            m.rotation.x = -Math.PI / 2; m.position.set(p.x, alto + 0.002, p.z); m.userData.zona = [j, z];
            fijos.add(m); marcas.push(m);
        }
    }
    function cartaPlana(tx, x, z, y, giro = 0) {
        const m = new THREE.Mesh(geoCarta, matTenido({ map: tx, transparent: true, alphaTest: 0.5 }, 0.55));
        m.rotation.set(-Math.PI / 2, 0, giro); m.position.set(x, y, z);
        return m;
    }
    function limpiarDinamicos() {
        for (const o of [...dinamicos.children]) { dinamicos.remove(o); o.traverse(h => { for (const m of [h.material || []].flat()) { const i = mats.indexOf(m); if (i >= 0) mats.splice(i, 1); m.dispose(); } if (h.geometry && h.geometry !== geoCarta) h.geometry.dispose(); }); }
    }
    function mazo(j) {
        const n = e.jug[j].mazo.length, p = posMazo(L, j), cw = L.carta.ancho, h = Math.max(0.004, n * 0.004);
        const lado = matTenido({ color: 0x2a2a2a }), arriba = matTenido({ map: reverso() }, 0.55);
        const b = new THREE.Mesh(new THREE.BoxGeometry(cw, h, cw * ALTO_CARTA), [lado, lado, arriba, lado, lado, lado]);
        b.position.set(p.x, L.mesa.alto + h / 2, p.z); b.visible = n > 0; b.userData.mazo = j;
        return b;
    }
    function refrescarMesa() {
        limpiarDinamicos();
        if (!e) { pintarMano(); pintarHud(); return; }
        const y = L.mesa.alto + 0.004;
        for (const j of [0, 1]) for (let z = 0; z < 3; z++) {
            const c = e.jug[j].zonas[z]; if (!c) continue;
            const p = posZona(L, j, z);
            const m = cartaPlana(texturaCarta(c.id, atkDe(e, j, c), defDe(e, j, c)), p.x, p.z, y, c.modo === 'def' ? Math.PI / 2 : 0);
            m.userData.zona = [j, z]; dinamicos.add(m);
        }
        const n = e.jug[1].mano.length;
        for (let i = 0; i < n; i++) {
            const p = posManoRival(L, i, n);
            const m = new THREE.Mesh(geoCarta, matTenido({ map: reverso(), transparent: true, alphaTest: 0.5 }, 0.55));
            m.position.set(p.x, p.y, p.z); m.rotation.x = -L.manoRival.inclina * Math.PI / 180; m.userData.lucho = true;
            dinamicos.add(m);
        }
        dinamicos.add(mazo(0), mazo(1));
        const marcadas = zonasMarcadas(e, sel);
        for (const m of marcas) {
            const [j, z] = m.userData.zona;
            const elegida = sel && sel.tipo === 'propia' && j === 0 && sel.z === z;
            const valida = marcadas.some(([a, b]) => a === j && b === z);
            m.material.color.setHex(elegida ? COLOR_MARCA.elegida : valida ? COLOR_MARCA.valida : COLOR_MARCA.libre);
            m.material.opacity = elegida || valida ? 0.7 : 0.3;
        }
        pintarMano(); pintarHud();
    }

    // ---------- Tu mano, en pantalla ----------
    const escenaMano = new THREE.Scene();
    const camMano = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);
    const geoMano = new THREE.PlaneGeometry(1, 1);
    let cartasMano = [];
    const tam = new THREE.Vector2();
    function pintarMano() {
        for (const m of cartasMano) { escenaMano.remove(m); m.material.dispose(); }
        cartasMano = [];
        if (!e) return;
        e.jug[0].mano.forEach((id, i) => {
            const d = CARTAS[id];
            const m = new THREE.Mesh(geoMano, new THREE.MeshBasicMaterial({ map: texturaCarta(id, d.atk ?? 0, d.def ?? 0), transparent: true, alphaTest: 0.5, depthTest: false }));
            m.userData.mano = i; m.renderOrder = i; escenaMano.add(m); cartasMano.push(m);
        });
        colocarMano(1);
    }
    function colocarMano(k) {
        renderer.getSize(tam);
        camMano.right = tam.x; camMano.top = tam.y; camMano.updateProjectionMatrix();
        const n = cartasMano.length;
        cartasMano.forEach((m, i) => {
            const elegida = !!(sel && sel.tipo === 'carta' && sel.m === i);
            const p = posMano(L, i, n, tam.x, tam.y, elegida, encima === i);
            m.position.x += (p.x - m.position.x) * k; m.position.y += (p.y - m.position.y) * k;
            m.rotation.z += (p.giro - m.rotation.z) * k;
            m.scale.set(p.w, p.h, 1);
            m.renderOrder = elegida || encima === i ? 50 : i;
            m.material.color.setScalar(e && e.turno === 0 && e.fase === 'principal' ? 1 : 0.75);
        });
    }

    // ---------- Cámaras ----------
    const camMini = new THREE.PerspectiveCamera(48, 4 / 3, 0.05, 6);
    const v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
    const local = (x, y, z, v) => raiz.localToWorld(v.set(x, y, z));
    // La cámara va suave hacia su plano (1.ª persona, enfoque sobre la mesa al elegir, o la 3.ª persona elegida)
    const pos = new THREE.Vector3(), mira = new THREE.Vector3(); let primera = true;
    const terceraActual = () => L.terceras[tercera % Math.max(1, L.terceras.length)] || MESA.terceras[0];
    function objetivoCamara() {
        const atras = L.mesa.fondo / 2 + L.asiento.dist;
        if (vista === 1 && sel && e && e.ganador === null) {
            const F = L.enfoque;
            local(0, L.mesa.alto + F.alto, F.z, v1); local(F.mira[0], L.mesa.alto + F.mira[1], F.mira[2], v2);
            return;
        }
        const C = vista === 1 ? L.camara1 : terceraActual();
        local(vista === 1 ? 0 : C.lado, C.alto, atras + C.atras, v1);
        local(C.mira[0], L.mesa.alto + C.mira[1], C.mira[2], v2);
    }
    function moverCamara(dt) {
        objetivoCamara();
        const k = primera ? 1 : Math.min(1, dt * 6);
        pos.lerp(v1, k); mira.lerp(v2, k); primera = false;
    }
    const plano = () => ({ pos, mira });
    function rectMini() {
        renderer.getSize(tam);
        const w = Math.min(tam.x * L.mini.ancho, L.mini.max), h = w * 0.75;
        return { x: tam.x - w - L.mini.margen, y: tam.y - h - L.mini.margen - 56, w, h }; // y desde abajo; deja la franja de arriba al marcador
    }
    function colocarMini() {
        local(0, L.mesa.alto + L.mini.alto, 0.12, camMini.position);
        camMini.up.set(-M.s, 0, -M.c);
        camMini.lookAt(local(0, L.mesa.alto, 0.02, v2));
    }

    // ---------- Capa de toques y HUD (DOM) ----------
    const capa = document.createElement('div'); capa.className = 'cartas-mesa-capa'; capa.hidden = true;
    const hud = document.createElement('section'); hud.className = 'cartas-mesa-hud'; hud.hidden = true;
    const marco = document.createElement('div'); marco.className = 'cartas-mesa-mini'; marco.hidden = true;
    document.body.append(capa, marco, hud);
    const boton = (texto, fn, clase = '', apagado = false) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = `boton cartas-boton ${clase}`; b.textContent = texto; b.disabled = apagado;
        if (!apagado) b.addEventListener('click', ev => { ev.stopPropagation(); fn(); });
        return b;
    };
    function pintarHud() {
        hud.textContent = '';
        marco.hidden = !(abierto && e && vista === 3);
        if (!marco.hidden) { const r = rectMini(); Object.assign(marco.style, { left: `${r.x}px`, bottom: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` }); }
        if (!e) {
            const caja = document.createElement('div'); caja.className = 'cartas-inicio';
            const h = document.createElement('h1'); h.textContent = Lx(TXT_CARTAS.titulo);
            const p = document.createElement('p'); p.textContent = Lx(TXT_CARTAS.elegirNivel);
            caja.append(h, p, boton(Lx(TXT_CARTAS.facil), () => iniciar('facil'), nivel === 'facil' ? 'elegido' : ''), boton(Lx(TXT_CARTAS.medio), () => iniciar('medio'), nivel === 'medio' ? 'elegido' : ''), boton(Lx(TXT_CARTAS.salir), () => cerrar(), 'secundario'));
            hud.appendChild(caja); return;
        }
        const arriba = document.createElement('div'); arriba.className = 'cartas-mesa-marcador';
        const lado = j => { const s = document.createElement('span'); s.textContent = `${Lx(j ? TXT_CARTAS.lucho : TXT_CARTAS.tu)} · ${Lx(TXT_CARTAS.vida)} ${e.jug[j].vida} · ${Lx(TXT_CARTAS.mazo)} ${e.jug[j].mazo.length}`; return s; };
        const turno = document.createElement('strong'); turno.textContent = Lx(e.turno === 0 ? TXT_CARTAS.tuTurno : TXT_CARTAS.suTurno);
        arriba.append(lado(1), turno, lado(0));
        const guia = document.createElement('p'); guia.className = 'cartas-mesa-aviso';
        // Con algo elegido manda la guía del paso siguiente; si no, la última jugada
        const paso = !sel ? null : sel.tipo === 'propia' ? TXT_MESA.tocaRival : sel.tipo === 'objetivo' ? TXT_MESA.tocaObjetivo : sel.tipo === 'abrazo' ? TXT_MESA.tocaAbrazo : TXT_MESA.tocaZona;
        guia.textContent = e.turno === 0 && e.fase === 'principal' && paso ? Lx(paso) : aviso || (e.turno === 0 && e.fase === 'principal' ? Lx(TXT_MESA.tocaCarta) : '');
        const B = botonesMesa(e, sel), fila = document.createElement('div'); fila.className = 'cartas-mesa-botones';
        fila.append(
            boton(Lx(TXT_CARTAS.terminar), () => ejecutar(B.terminar), '', !B.terminar),
            boton(Lx(TXT_CARTAS.cambiar), () => ejecutar(B.cambiar), '', !B.cambiar)
        );
        if (B.directo) fila.appendChild(boton(Lx(TXT_CARTAS.directo), () => ejecutar(B.directo), 'cartas-directo'));
        if (B.postura) for (const modo of ['ata', 'def']) fila.appendChild(boton(Lx(modo === 'ata' ? TXT_CARTAS.ataque : TXT_CARTAS.defensa), () => { postura = modo; sel = elegirPostura(e, sel, modo); refrescarMesa(); }, modo === sel.modo ? 'elegido' : ''));
        fila.append(
            boton(vista === 1 ? Lx(TXT_MESA.camara1) : `${Lx(TXT_MESA.camara3)}${L.terceras.length > 1 ? ` ${tercera + 1}/${L.terceras.length}` : ''}`, cambiarVista),
            boton('?', () => { mostrandoReglas = !mostrandoReglas; pintarHud(); }, 'cartas-ayuda'),
            boton(Lx(TXT_MESA.panel), () => { const n = nivel; cerrar(false); if (ctx.alPanel) ctx.alPanel(n); }, 'secundario'),
            boton(Lx(TXT_CARTAS.salir), () => cerrar(), 'secundario')
        );
        hud.append(arriba, guia, fila);
        // Lector: la carta elegida de tu mano o la última de la mesa que tocaste, en grande para leerla
        const id = sel && sel.tipo === 'carta' ? e.jug[0].mano[sel.m] : leida && e.jug[leida[0]].zonas[leida[1]]?.id;
        if (id) {
            const c = leida && !(sel && sel.tipo === 'carta') ? e.jug[leida[0]].zonas[leida[1]] : null, d = CARTAS[id];
            const tx = c ? texturaCarta(id, atkDe(e, leida[0], c), defDe(e, leida[0], c)) : texturaCarta(id, d.atk ?? 0, d.def ?? 0);
            const lector = document.createElement('div'); lector.className = 'cartas-mesa-lector';
            const lz = document.createElement('canvas'); lz.width = tx.image.width; lz.height = tx.image.height;
            lz.getContext('2d').drawImage(tx.image, 0, 0); lz.setAttribute('aria-label', `${Lx(d.nombre)} · ${Lx(d.texto)}`);
            lector.appendChild(lz);
            if (!sel || sel.tipo !== 'carta') lector.appendChild(boton(Lx(TXT_MESA.cerrarLector), () => { leida = null; pintarHud(); }, 'secundario'));
            hud.appendChild(lector);
        }
        if (mostrandoReglas) { const r = document.createElement('div'); r.className = 'cartas-reglas'; for (const l of TXT_CARTAS.reglas) { const p = document.createElement('p'); p.textContent = Lx(l); r.appendChild(p); } hud.appendChild(r); }
        if (e.ganador !== null) {
            const fin = document.createElement('div'); fin.className = 'cartas-fin';
            const h = document.createElement('h2'); h.textContent = Lx(e.ganador === 0 ? TXT_CARTAS.ganaste : e.ganador === 1 ? TXT_CARTAS.perdiste : TXT_CARTAS.empate);
            const p = document.createElement('p'); p.textContent = Lx(TXT_CARTAS.motivo[e.motivo]);
            fin.append(h, p, boton(Lx(TXT_CARTAS.otraVez), () => { e = null; sel = null; refrescarMesa(); }), boton(Lx(TXT_CARTAS.salir), () => cerrar(), 'secundario'));
            hud.appendChild(fin);
        }
    }

    // ---------- Toques ----------
    const rayo = new THREE.Raycaster(), ndc = new THREE.Vector2();
    function tocado(cx, cy) {
        renderer.getSize(tam);
        const yb = tam.y - cy; // desde abajo
        // 1) tu mano, en pantalla
        ndc.set(cx / tam.x * 2 - 1, yb / tam.y * 2 - 1);
        rayo.setFromCamera(ndc, camMano);
        const h = rayo.intersectObjects(cartasMano, false).sort((a, b) => b.object.renderOrder - a.object.renderOrder)[0];
        if (h) return h.object.userData;
        // 2) la mesa vista desde arriba (3.ª persona) o 3) la cámara principal
        let cam = camaras.camara;
        if (vista === 3) {
            const r = rectMini();
            if (cx >= r.x && cx <= r.x + r.w && yb >= r.y && yb <= r.y + r.h) { cam = camMini; ndc.set((cx - r.x) / r.w * 2 - 1, (yb - r.y) / r.h * 2 - 1); }
        }
        rayo.setFromCamera(ndc, cam);
        const objetos = [...dinamicos.children, ...marcas];
        if (lucho && cam !== camMini) objetos.push(lucho.p.g);
        for (const x of rayo.intersectObjects(objetos, true)) {
            let o = x.object;
            while (o && !Object.keys(o.userData).length && o !== lucho?.p.g) o = o.parent;
            if (o === lucho?.p.g) return { lucho: true };
            if (o && o.userData) return o.userData;
        }
        return {};
    }
    function alTocar(ev) {
        if (!abierto || !e || e.ganador !== null) return;
        ev.preventDefault();
        const u = tocado(ev.clientX, ev.clientY);
        let r = { sel: null, accion: null };
        if (u.mano !== undefined) r = tocarCarta(e, sel, u.mano, postura);
        else if (u.zona) r = tocarZona(e, sel, u.zona[0], u.zona[1]);
        else if (u.lucho) { const B = botonesMesa(e, sel); r = B.directo ? { sel: null, accion: B.directo } : { sel, accion: null }; }
        else if (u.mazo === 0) { const B = botonesMesa(e, sel); r = { sel, accion: B.robar }; }
        sel = r.sel;
        // Tocar una carta de la mesa sin jugar la abre en el lector
        leida = !r.accion && u.zona && e.jug[u.zona[0]].zonas[u.zona[1]] ? u.zona : null;
        if (r.accion) ejecutar(r.accion); else refrescarMesa();
    }
    function alMover(ev) {
        if (!abierto || !e) return;
        const u = tocado(ev.clientX, ev.clientY), i = u.mano ?? -1;
        if (i !== encima) encima = i;
        capa.style.cursor = u.mano !== undefined || u.zona || u.lucho || u.mazo === 0 ? 'pointer' : '';
    }
    capa.addEventListener('pointerdown', alTocar);
    capa.addEventListener('pointermove', alMover);
    capa.addEventListener('pointerleave', () => { encima = -1; });

    // ---------- Partida ----------
    const nombre = id => Lx(CARTAS[id].nombre);
    function registrar(a, antes, id) {
        const quien = Lx(antes === 0 ? TXT_CARTAS.tu : TXT_CARTAS.lucho);
        const zonas = e.jug[antes].zonas;
        aviso = a.t === 'invocar' ? `${quien}: ${Lx(TXT_CARTAS.invocar)} ${nombre(zonas[a.z]?.id ?? id)}`
            : a.t === 'hechizo' ? `${quien}: ${nombre(id)}`
            : a.t === 'atacar' ? `${quien}: ${a.obj === -1 ? Lx(TXT_CARTAS.directo) : Lx(TXT_CARTAS.atacar)}`
            : a.t === 'modo' ? `${quien}: ${Lx(TXT_CARTAS.postura)}`
            : a.t === 'terminar' ? `${quien}: ${Lx(TXT_CARTAS.pasa)}` : aviso;
    }
    function ejecutar(a) {
        if (!a || !e || e.ganador !== null || !esLegal(e, a)) return;
        const antes = e.turno, id = (a.t === 'invocar' || a.t === 'hechizo') ? e.jug[antes].mano[a.m] : null;
        const ev = aplicar(e, a);
        sel = null; reloj = 0; registrar(a, antes, id);
        if (ctx.alEventos) ctx.alEventos(ev, a);
        refrescarMesa();
    }
    function iniciar(n) {
        nivel = NIVELES[n] ? n : 'facil'; e = partidaNivel(nivel, { semilla: (Math.random() * 1e9) | 0 }); sel = null; postura = 'ata'; reloj = 0; aviso = ''; mostrandoReglas = false;
        refrescarMesa();
    }
    function cambiarVista() {
        if (vista === 1) { vista = 3; tercera = 0; } else if (tercera + 1 < L.terceras.length) tercera++; else vista = 1;
        pintarHud();
    }

    // ---------- Abrir y cerrar ----------
    function colocar() {
        M = marcoMesa(L, lucho);
        raiz.position.set(M.x, M.y, M.z); raiz.rotation.y = M.g;
        raiz.updateMatrixWorld(true);
        construirMesa();
        jugador.colocar(M.asiento.x, M.y + dy, M.asiento.z);
        jugador.yaw = M.asiento.yaw; jugador.pitch = 0;
        colocarMini();
    }
    function abrir(n = 'facil') {
        lucho = ctx.lucho();
        if (!lucho) return false;
        nivel = NIVELES[n] ? n : 'facil'; abierto = true; e = null; sel = null;
        grupo.add(raiz);
        colocar();
        luchoAntes = { yaw: lucho.yaw, escena: lucho.escena };
        lucho.escena = (dt, base) => { const r = base(dt); lucho.yaw = M.yawLucho; return r; };
        camaras.iniciarCine(lucho, { escena: true, fundido: 0.35 });
        primera = true; moverCamara(0);
        camaras.manual = plano;
        camaras.pose = cuerpo => { cuerpo.g.visible = vista === 3; };
        capa.hidden = false; hud.hidden = false;
        document.body.classList.add('cartas-mesa-abierta');
        refrescarMesa();
        // La fuente PixelCraft puede llegar después: se redibujan las cartas con ella
        if (document.fonts && document.fonts.load) document.fonts.load(fuente(30)).then(() => { if (abierto) { vaciarTexturas(); refrescarMesa(); } }).catch(() => {});
        return true;
    }
    function cerrar(avisar = true) {
        if (!abierto) return;
        abierto = false; e = null; sel = null; encima = -1; leida = null;
        limpiarDinamicos(); pintarMano();
        grupo.remove(raiz);
        if (lucho && luchoAntes) { lucho.escena = luchoAntes.escena; lucho.yaw = luchoAntes.yaw; }
        camaras.terminarCine();
        capa.hidden = true; hud.hidden = true; marco.hidden = true; hud.textContent = '';
        document.body.classList.remove('cartas-mesa-abierta');
        vaciarTexturas();
        if (avisar && ctx.alCerrar) ctx.alCerrar();
    }
    const tecla = ev => {
        if (!abierto || ev.repeat) return;
        if (ev.code === 'Escape') { ev.preventDefault(); cerrar(); }
        else if (ev.code === 'KeyC') { ev.preventDefault(); cambiarVista(); }
    };
    document.addEventListener('keydown', tecla);

    const luz = new THREE.Color(), BLANCO = new THREE.Color(1, 1, 1);
    return {
        abrir, cerrar,
        get activo() { return abierto; },
        get estado() { return e; },          // pruebas y 4b
        get vista() { return vista; },
        // Dónde se ve en pantalla (px desde arriba a la izquierda) una zona de la mesa o una carta de tu mano:
        // pruebas y, en 7h-2c, la flecha del tutorial sobre lo que hay que tocar
        pantallaZona(j, z) {
            const p = posZona(L, j, z), v = local(p.x, L.mesa.alto, p.z, new THREE.Vector3()).project(camaras.camara);
            renderer.getSize(tam);
            return { x: (v.x + 1) / 2 * tam.x, y: (1 - v.y) / 2 * tam.y };
        },
        pantallaMano(i) {
            const m = cartasMano[i]; if (!m) return null;
            renderer.getSize(tam);
            return { x: m.position.x, y: tam.y - m.position.y };
        },
        cambiarVista,
        setIdioma(l) { idioma = l === 'en' ? 'en' : 'es'; if (abierto) { vaciarTexturas(); refrescarMesa(); } },
        // Estudio (más adelante, un JSON en mundo/datos/): medidas de la mesa y de las cámaras sin recargar
        aplicarDatos(datos) { L = fusionar(MESA, datos || null); if (abierto) { colocar(); refrescarMesa(); } },
        actualizar(dt) {
            if (!abierto) return;
            // Luz del mundo (día y noche); las cartas, algo más claras para que se lean de noche
            if (tinte) for (const m of mats) m.color.copy(luz.copy(tinte).lerp(BLANCO, 1 - m.userData.claro)).multiply(m.userData.base);
            colocarMano(Math.min(1, dt * 14));
            moverCamara(dt);
            jugador.yaw = M.asiento.yaw; jugador.pitch = 0;
            if (!e || e.ganador !== null) return;
            if (e.fase === 'robo' || e.turno === 1) {
                reloj += dt;
                if (reloj >= pausaAuto(e)) ejecutar(e.fase === 'robo' ? { t: 'robar' } : jugadaIA(e, NIVELES[nivel].ia));
            } else reloj = 0;
        },
        // Después de renderer.render(scene, camara): la mesa desde arriba (3.ª persona) y tu mano encima de todo
        dibujar() {
            if (!abierto) return;
            renderer.autoClear = false;
            if (e && vista === 3) {
                const r = rectMini();
                camMini.aspect = r.w / r.h; camMini.updateProjectionMatrix();
                renderer.setScissorTest(true); renderer.setScissor(r.x, r.y, r.w, r.h); renderer.setViewport(r.x, r.y, r.w, r.h);
                renderer.clear(true, true);
                renderer.render(scene, camMini);
                renderer.setScissorTest(false); renderer.getSize(tam); renderer.setViewport(0, 0, tam.x, tam.y);
            }
            renderer.clearDepth();
            renderer.render(escenaMano, camMano);
            renderer.autoClear = true;
        }
    };
}
