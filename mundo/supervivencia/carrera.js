// =========================================================
// VENJY · Supervivencia · Carrera de gatas (7h-1): lo que se ve y se juega
// Desde el panel de Lona («Carrera de gatas»): manejas a Mila o a Gala por un circuito de vallas alrededor de la
// Gatera, al estilo de un juego de karts. W/↑ acelera, S/↓ frena, A/D (o ←/→) dobla, Espacio o Shift derrapa
// (derrapando un rato y soltando sale un turbo); Esc te rinde. En el celular, botones grandes en pantalla.
// Lona da la partida (3, 2, 1) junto a la línea y espera en la meta con el plato.
//   · Solo (o sin nadie más en la sala): la otra gata la lleva el juego (entradaIA de carrera-modelo.js).
//   · En una sala: quien abre la carrera espera rival (Y = correr contra el juego, N = cancelar); el siguiente
//     que la abre desde el panel de Lona se lleva la otra gata. Cada uno maneja la suya y manda su estado
//     (carrera-red.js); la gata ajena se dibuja suavizada.
//   · Público: quien está a menos de `publico.mirar` m de la Gatera ve la carrera de otros en vivo (las dos gatas,
//     la pista y Lona) y alienta con H (a Mila) o J (a Gala); a los corredores les sale quién los alienta.
// Las gatas son las de siempre (gatas.js): durante la carrera las mueve el gancho `gata.escena`.
// Premio: ganar = bacalao cocinado y lana (`premio` en carrera.json); perder = lana; amistad con Lona (minijuego).
// Valores en mundo/datos/carrera.json (Estudio → Carrera). No editable aún: los textos (TXT_CARRERA).
// Depuración: __venjy.carrera (abrir('mila'), estado, saltarA(vuelta)).
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { caja, texturaPixeles, ajustar, crearGlobo, COLOR_GLOBO, crearTinte } from '../criaturas/cuerpo.js';
import { ESCALA } from '../voxeles.js';
import { B, TIPO } from '../texturas.js';
import { O, nombreDe } from './objetos.js';
import { sonidos, tono } from './sonidos.js';
import * as M from './carrera-modelo.js';

const t = (es, en) => ({ es, en });
export const TXT_CARRERA = {
    nombre: { mila: 'Mila', gala: 'Gala' },
    vuelta: t('Vuelta', 'Lap'),
    puesto: [t('1.º', '1st'), t('2.º', '2nd')],
    ya: t('¡YA!', 'GO!'),
    ayuda: t('W acelera · S frena · A/D dobla · Espacio derrapa (suéltalo para el turbo) · Esc te rindes', 'W speeds up · S brakes · A/D steers · Space drifts (release for a boost) · Esc gives up'),
    turbo: t('¡TURBO!', 'BOOST!'),
    rendirse: t('Rendirse', 'Give up'),
    salir: t('Salir', 'Leave'),
    esperando: t('Esperando rival en la Gatera… (otro jugador: habla con Lona)', 'Waiting for an opponent at the cat house… (another player: talk to Lona)'),
    contraJuego: t('Correr contra el juego (Y)', 'Race the game (Y)'),
    cancelar: t('Cancelar (N)', 'Cancel (N)'),
    esperaEn: t('{x} espera rival para la carrera de gatas: habla con Lona', '{x} is waiting for a cat race opponent: talk to Lona'),
    ocupada: t('Ya están corriendo: mira la carrera desde la Gatera', 'A race is already on: watch it from the cat house'),
    abandono: t('Tu rival dejó la carrera: ¡ganas!', 'Your opponent left the race: you win!'),
    gana: t('¡{g} gana!', '{g} wins!'),
    ganas: t('¡Ganaste la carrera!', 'You won the race!'),
    pierdes: t('Perdiste la carrera', 'You lost the race'),
    tiempo: t('Tiempo', 'Time'),
    alentar: t('Carrera en la Gatera · H: ¡vamos, Mila! · J: ¡vamos, Gala!', 'Race at the cat house · H: go, Mila! · J: go, Gala!'),
    alienta: t('{x} alienta a {g}', '{x} cheers for {g}'),
    lona: {
        cuenta: [t('¡A sus puestos!', 'On your marks!'), t('3…', '3…'), t('2…', '2…'), t('1…', '1…')],
        ya: t('¡Ya!', 'Go!'),
        ultima: t('¡Última vuelta!', 'Final lap!'),
        meta: t('¡Llegó {g}! Ven a comer, gatita.', '{g} made it! Come eat, kitty.')
    },
    teclas: { izq: '<', der: '>', acel: t('ACELERAR', 'GAS'), freno: t('FRENAR', 'BRAKE'), derrape: t('DERRAPE', 'DRIFT') }
};

const CSS = `
.carrera-hud { position: fixed; z-index: 57; left: 50%; top: calc(10px + env(safe-area-inset-top, 0px)); transform: translateX(-50%);
  display: none; gap: 14px; align-items: center; padding: 6px 12px; color: var(--blanco, #fff); font-size: 1rem;
  background: rgb(16 10 6 / 0.86); border: 3px solid #000; box-shadow: inset 3px 3px 0 #3a2a1c, inset -3px -3px 0 #0c0704; text-shadow: 2px 2px 0 #3f3f3f; }
.carrera-hud.visible { display: flex; }
.carrera-hud .puesto { color: var(--amarillo, #ffff55); font-size: 1.3rem; }
.carrera-hud .turbo { color: #ff9a3a; }
.carrera-cuenta { position: fixed; z-index: 57; left: 50%; top: 20%; transform: translate(-50%, -50%); display: none; font-size: 5rem;
  color: var(--amarillo, #ffff55); text-shadow: 5px 5px 0 #3f3f15, -2px -2px 0 #000; pointer-events: none; }
.carrera-cuenta.visible { display: block; }
.carrera-ayuda { position: fixed; z-index: 57; left: 50%; bottom: calc(9vh + 12px); transform: translateX(-50%); display: none; max-width: 92vw;
  padding: 5px 10px; font-size: 0.8rem; color: var(--gris, #c6c6c6); background: rgb(16 10 6 / 0.7); border: 2px solid #000; text-align: center; }
.carrera-ayuda.visible { display: block; }
.carrera-botones { position: fixed; z-index: 58; inset: auto 0 calc(4vh + env(safe-area-inset-bottom, 0px)) 0; display: none; justify-content: space-between; padding: 0 3vw; pointer-events: none; }
.carrera-botones.visible { display: flex; }
.carrera-botones > div { display: flex; gap: 10px; align-items: flex-end; }
.carrera-botones button { pointer-events: auto; min-width: 74px; min-height: 64px; margin: 0; font-size: 1.1rem; touch-action: none; user-select: none; -webkit-user-select: none; }
.carrera-botones button.activo { background: #4f7a2a; }
.carrera-salir { position: fixed; z-index: 58; right: calc(3vw + env(safe-area-inset-right, 0px)); top: calc(10px + env(safe-area-inset-top, 0px)); display: none; width: auto; margin: 0; padding: 6px 14px; font-size: 0.9rem; }
.carrera-salir.visible { display: block; }
.carrera-espera { position: fixed; z-index: 58; left: 50%; top: 22%; transform: translateX(-50%); display: none; flex-direction: column; gap: 8px; align-items: center;
  padding: 12px 16px; max-width: 92vw; color: var(--blanco, #fff); background: rgb(16 10 6 / 0.9); border: 3px solid #000; box-shadow: inset 3px 3px 0 #3a2a1c, inset -3px -3px 0 #0c0704; text-align: center; }
.carrera-espera.visible { display: flex; }
.carrera-espera .fila-botones { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.carrera-espera button { width: auto; margin: 0; padding: 8px 14px; }
@media (max-width: 600px) { .carrera-hud { font-size: 0.8rem; gap: 8px; } .carrera-cuenta { font-size: 3.4rem; } .carrera-ayuda { display: none !important; } }
`;

const lerp = (a, b, k) => a + (b - a) * k;
const angLerp = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const fmt = s => (s == null ? '--' : s.toFixed(2).replace('.', ','));

// ctx: { grupo, dy, mundo, terreno, gatera: [gx, gz], jugador, camaras, gatas, npcs, inventario, entidades, hud, misiones,
//        idioma, tactil(), puede(), bloquear(), liberar(), datos() (carrera.json), acts() (actividades o null), yo, nombreDe(id) }
export function crearCarrera(ctx) {
    const { grupo, dy, mundo, terreno, jugador, camaras, gatas, npcs, inventario, entidades, hud, misiones } = ctx;
    let L = ctx.idioma || 'es';
    const tx = o => (o ? o[L] || o.es : '');
    const R = () => M.reglasCarrera(ctx.datos && ctx.datos());
    const centro = () => ({ x: ctx.gatera[0] * ESCALA, z: ctx.gatera[1] * ESCALA });
    const gataObj = clave => gatas.gatas.find(g => g.clave === clave);
    const lona = () => npcs.lista.find(n => n.clave === 'lona') || null;
    // Piso de la pista: como `suelo` de las criaturas, pero el pasto alto y las flores no estorban (se corre encima);
    // choca con estructuras, bloques sólidos (cajas, lo que construyó alguien) y el agua. undefined = chunk sin cargar
    function piso(x, z) {
        const { BW, BD, HT, ES } = terreno;
        const bx = Math.floor(x), bz = Math.floor(z);
        if (bx < 1 || bz < 1 || bx >= BW - 1 || bz >= BD - 1) return null;
        const o = bz * BW + bx;
        if (ES[o] === 1) return null;
        const y = HT[o] + 1;
        if (y <= 15 && ES[o] !== 2) return null;
        const id = mundo.bloque(x, y + dy + 0.5, z); // (terreno.HT va en las coordenadas del grupo; el mundo, subido dy)
        if (id === -1) return undefined;
        return id > 0 && TIPO[id] === 1 ? null : y;
    }
    const alto = (x, z, y0) => { const y = piso(x, z); return y == null ? y0 : y; };
    const libre = (x, z) => piso(x, z) !== null;

    // ---------- DOM ----------
    const estilo = document.createElement('style'); estilo.textContent = CSS; document.head.appendChild(estilo);
    const el = (cls, padre = document.body, tag = 'div') => { const e = document.createElement(tag); e.className = cls; padre.appendChild(e); return e; };
    const hudEl = el('carrera-hud');
    const hVuelta = el('vuelta', hudEl, 'span'), hPuesto = el('puesto', hudEl, 'span'), hTiempo = el('tiempo', hudEl, 'span'), hTurbo = el('turbo', hudEl, 'span');
    const cuentaEl = el('carrera-cuenta'), ayudaEl = el('carrera-ayuda');
    const salirB = el('boton carrera-salir', document.body, 'button'); salirB.type = 'button';
    salirB.addEventListener('click', e => { e.preventDefault(); rendirse(); });
    const esperaEl = el('carrera-espera');
    const esperaTxt = el('', esperaEl, 'span'), esperaFila = el('fila-botones', esperaEl);
    const contraB = el('boton', esperaFila, 'button'), cancelarB = el('boton secundario', esperaFila, 'button');
    contraB.type = cancelarB.type = 'button';
    contraB.addEventListener('click', e => { e.preventDefault(); contraJuego(); });
    cancelarB.addEventListener('click', e => { e.preventDefault(); cancelarEspera(); });
    // Botones táctiles: mantener apretado
    const tact = el('carrera-botones');
    const izqD = el('', tact), derD = el('', tact);
    const pulsado = new Set();
    function botonTactil(padre, clave) {
        const b = el('boton', padre, 'button'); b.type = 'button'; b.dataset.k = clave;
        const on = e => { e.preventDefault(); pulsado.add(clave); b.classList.add('activo'); };
        const off = e => { e.preventDefault(); pulsado.delete(clave); b.classList.remove('activo'); };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
        return b;
    }
    const bIzq = botonTactil(izqD, 'izq'), bDer = botonTactil(izqD, 'der');
    const bDerrape = botonTactil(derD, 'derrape'), bFreno = botonTactil(derD, 'freno'), bAcel = botonTactil(derD, 'acel');
    function rotular() {
        salirB.textContent = c && c.fase === 'fin' ? tx(TXT_CARRERA.salir) : tx(TXT_CARRERA.rendirse);
        ayudaEl.textContent = tx(TXT_CARRERA.ayuda);
        contraB.textContent = tx(TXT_CARRERA.contraJuego); cancelarB.textContent = tx(TXT_CARRERA.cancelar);
        esperaTxt.textContent = tx(TXT_CARRERA.esperando);
        bIzq.textContent = TXT_CARRERA.teclas.izq; bDer.textContent = TXT_CARRERA.teclas.der;
        bAcel.textContent = tx(TXT_CARRERA.teclas.acel); bFreno.textContent = tx(TXT_CARRERA.teclas.freno); bDerrape.textContent = tx(TXT_CARRERA.teclas.derrape);
    }

    // ---------- Teclado (propio: el jugador está bloqueado) ----------
    const teclas = new Set();
    const MANEJO = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight']);
    document.addEventListener('keydown', e => {
        if (esperando) {
            if (e.code === 'KeyY') { e.preventDefault(); contraJuego(); } else if (e.code === 'KeyN' || e.code === 'Escape') { e.preventDefault(); cancelarEspera(); }
            return;
        }
        if (c && c.modo !== 'mirar') {
            if (MANEJO.has(e.code)) { e.preventDefault(); teclas.add(e.code); }
            else if (e.code === 'Escape' && !e.repeat) { e.preventDefault(); rendirse(); }
            return;
        }
        if (c && c.modo === 'mirar' && !e.repeat && (e.code === 'KeyH' || e.code === 'KeyJ') && !document.activeElement?.matches?.('input, textarea')) {
            const red = redCarrera(); if (red) { const g = e.code === 'KeyH' ? 'mila' : 'gala'; red.hurra(g); aliento(ctx.yoNombre || '', g, true); }
        }
    }, true);
    document.addEventListener('keyup', e => teclas.delete(e.code), true);
    window.addEventListener('blur', () => teclas.clear());
    const tiene = (...ks) => ks.some(k => teclas.has(k));
    function entrada() {
        const ad = (tiene('KeyW', 'ArrowUp') || pulsado.has('acel') ? 1 : 0) - (tiene('KeyS', 'ArrowDown') || pulsado.has('freno') ? 1 : 0);
        const giro = (tiene('KeyA', 'ArrowLeft') || pulsado.has('izq') ? 1 : 0) - (tiene('KeyD', 'ArrowRight') || pulsado.has('der') ? 1 : 0);
        return { ad, giro, derrape: tiene('Space', 'ShiftLeft', 'ShiftRight') || pulsado.has('derrape') };
    }

    // ---------- Pista: vallas en los bordes, línea de salida y el plato ----------
    const tex = (c, s, v = 0.18) => texturaPixeles(4, 4, s, (x, y, r) => ajustar(c, 1 - v / 2 + r() * v));
    // Teñidos con la luz del día como las criaturas (tinte.aplicar en cada cuadro)
    const tinte = crearTinte();
    const matBlanco = tinte.caras(tex([236, 232, 222], 8801));
    const matRojo = tinte.caras(tex([196, 58, 52], 8802));
    const matLinea = tinte.caras(texturaPixeles(8, 2, 8803, (x, y) => ((x + y) % 2 ? [24, 24, 24] : [240, 240, 240])));
    const geoPoste = new THREE.BoxGeometry(0.22, 0.6, 0.22);
    let decor = null, decorClave = '';
    function armarDecor(P) {
        const clave = JSON.stringify([P.P, P.ancho]);
        if (decor && decorClave === clave) { decor.visible = true; return; }
        quitarDecor();
        decor = new THREE.Group(); decorClave = clave;
        let k = 0;
        for (let s = 0; s < P.largo; s += 2.4) {
            const p = M.puntoEn(P, s);
            for (const lado of [-1, 1]) {
                const x = p.x + Math.cos(p.yaw) * lado * (P.ancho / 2 + 0.2), z = p.z - Math.sin(p.yaw) * lado * (P.ancho / 2 + 0.2);
                const y = alto(x, z, null);
                if (y == null) continue;
                const m = new THREE.Mesh(geoPoste, k++ % 2 ? matRojo : matBlanco);
                m.position.set(x, y + 0.3, z);
                decor.add(m);
            }
        }
        // Línea de salida y meta (a cuadros) y el plato de Lona junto a ella
        const p0 = M.puntoEn(P, 0);
        const linea = new THREE.Mesh(new THREE.BoxGeometry(P.ancho, 0.04, 0.5), matLinea);
        linea.position.set(p0.x, alto(p0.x, p0.z, 0) + 0.03, p0.z); linea.rotation.y = p0.yaw;
        decor.add(linea);
        const sitio = sitioLona(P);
        const plato = new THREE.Group();
        const loza = caja(0.34, 0.1, 0.34, tinte.caras(tex([196, 52, 52], 8804))); loza.position.y = 0.05;
        const comida = caja(0.26, 0.03, 0.26, tinte.caras(tex([196, 150, 96], 8805))); comida.position.y = 0.11;
        plato.add(loza, comida);
        plato.position.set(sitio.px, alto(sitio.px, sitio.pz, 0), sitio.pz);
        decor.add(plato);
        grupo.add(decor);
    }
    function quitarDecor() { if (decor) { grupo.remove(decor); decor.traverse(o => { if (o.geometry && o.geometry !== geoPoste) o.geometry.dispose(); }); decor = null; decorClave = ''; } }
    // Lona: fuera de la pista, junto a la línea (lado de afuera del circuito), mirando a la pista
    function sitioLona(P) {
        const p0 = M.puntoEn(P, 0.6);
        const cx = P.cx, cz = P.cz;
        let lado = 1;
        const xa = p0.x + Math.cos(p0.yaw) * 3, za = p0.z - Math.sin(p0.yaw) * 3;
        if (Math.hypot(xa - cx, za - cz) < Math.hypot(p0.x - cx, p0.z - cz)) lado = -1; // ese lado va hacia adentro
        const d = P.ancho / 2 + 1.3;
        const x = p0.x + Math.cos(p0.yaw) * lado * d, z = p0.z - Math.sin(p0.yaw) * lado * d;
        return { x, z, yaw: Math.atan2(p0.x - x, p0.z - z), px: p0.x + Math.cos(p0.yaw) * lado * (d - 0.8), pz: p0.z - Math.sin(p0.yaw) * lado * (d - 0.8) + 0.6 };
    }

    // ---------- Estado ----------
    // c = { modo: 'solo' | 'red' | 'mirar', fase: 'cuenta' | 'corre' | 'fin', t (s de carrera; negativo en la cuenta), R, P,
    //       g: { mila, gala } (modelo), vis: { clave: { x, z, yaw, v, fase } } (lo dibujado), mia, remota: { clave: { m, edad } },
    //       fin: { clave: tf }, envio, lonaDijo, resultado }
    let c = null, esperando = false;
    let globoLona = null;
    function nuevaCarrera(modo, mia) {
        const r = R(), cc = centro(), P = M.armarPista(r, cc.x, cc.z);
        const g = {}, vis = {};
        M.GATAS.forEach((clave, k) => {
            g[clave] = M.nuevaGata(P, r, clave, k);
            vis[clave] = { x: g[clave].x, z: g[clave].z, yaw: g[clave].yaw, v: 0, fase: 0, y: alto(g[clave].x, g[clave].z, 0) };
        });
        return { modo, fase: 'cuenta', t: -r.cuenta - 1, R: r, P, pistaClave: JSON.stringify(r.pista.puntos) + r.pista.ancho, g, vis, mia, remota: {}, fin: {}, envio: 0, lonaDijo: '', resultado: null, ultima: false, tomadas: [] };
    }

    // Toma a las gatas y a Lona con sus ganchos de escena
    function tomarActores() {
        for (const clave of M.GATAS) {
            const go = gataObj(clave);
            if (!go) continue;
            if (go.cajaEst) { go.cajaEst.c.ocupa = null; go.cajaEst = null; }
            go.pose = 'pie'; go.ruta = [];
            go.escena = (dt, tt) => dibujarGata(go, clave, dt);
            c.tomadas.push(go);
        }
        const n = lona();
        if (n) {
            const s = sitioLona(c.P);
            c.lona = { n, x0: n.x, z0: n.z, yaw0: n.yaw, s, brazo: 0 };
            n.x = s.x; n.z = s.z; n.yaw = s.yaw;
            const y = alto(s.x, s.z, null); if (y != null) n.y = y;
            n.escena = (dt) => animarLona(dt);
        }
    }
    function soltarActores() {
        if (!c) return;
        for (const go of c.tomadas) if (go.escena) { delete go.escena; go.ruta = []; go.espera = 1; go.pose = 'pie'; }
        if (c.lona) {
            const { n } = c.lona;
            delete n.escena;
            for (const h of [n.p.brazoD, n.p.brazoI, n.p.cuello]) if (h) { h.rotation.x = 0; h.rotation.z = 0; }
        }
        if (globoLona) globoLona.actualizar(0.1, false, 0, 0, 0, camaras.camara);
    }
    function dibujarGata(go, clave, dt) {
        if (!c) return;
        const v = c.vis[clave];
        go.x = v.x; go.z = v.z; go.yaw = v.yaw;
        v.y = alto(v.x, v.z, v.y);
        go.y += (v.y - go.y) * Math.min(1, dt * 12);
        go.pose = 'pie';
        const rapidez = Math.abs(v.v);
        v.fase += rapidez * dt * 2.2;
        const bal = rapidez > 0.2 ? Math.sin(v.fase) * Math.min(0.9, 0.4 + rapidez * 0.08) : 0;
        go.patas[0].rotation.x = bal; go.patas[3].rotation.x = bal;
        go.patas[1].rotation.x = -bal; go.patas[2].rotation.x = -bal;
        go.cola.rotation.x = -0.4 - Math.min(0.5, rapidez * 0.06);
        go.cola.rotation.y = Math.sin(v.fase * 0.5) * 0.25;
        go.cabeza.rotation.y = (c.g[clave].derrapa || 0) * 0.35;
        go.tronco.rotation.z = -(c.g[clave].derrapa || 0) * 0.12;
        go.y += rapidez > 0.2 ? Math.abs(Math.sin(v.fase)) * 0.05 : 0;
    }
    function animarLona(dt) {
        const lo = c && c.lona; if (!lo) return;
        const { n } = lo, p = n.p;
        n.x = lo.s.x; n.z = lo.s.z; n.yaw = lo.s.yaw;
        // En la cuenta levanta el brazo y lo baja en «¡ya!»; al llegar alguien, los dos brazos arriba
        const arriba = c.fase === 'cuenta' ? 1 : c.fase === 'fin' ? 1 : 0;
        lo.brazo += (arriba - lo.brazo) * Math.min(1, dt * 8);
        if (p.piernaD) p.piernaD.rotation.x = p.piernaI.rotation.x = 0;
        if (p.cuerpo) { p.cuerpo.rotation.x = 0; p.cuerpo.position.y = c.fase === 'fin' ? Math.abs(Math.sin(c.t * 9)) * 0.06 : 0; }
        p.brazoD.rotation.x = lerp(-0.15, -2.8, lo.brazo); p.brazoD.rotation.z = 0.1;
        p.brazoI.rotation.x = c.fase === 'fin' ? lerp(-0.15, -2.8, lo.brazo) : -0.15; p.brazoI.rotation.z = -0.1;
        // Mira a la gata que va primero
        const prim = M.puestos(M.GATAS.map(k => c.g[k]))[0], v = c.vis[prim.clave];
        let d = Math.atan2(v.x - n.x, v.z - n.z) - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        p.cuello.rotation.y = Math.max(-1, Math.min(1, d)); p.cuello.rotation.x = 0;
    }
    function decirLona(texto, dur = 2.2) {
        if (!globoLona) { globoLona = crearGlobo(grupo, { nombre: 'Lona', color: COLOR_GLOBO.lona }); globoLona.sp.scale.set(1.5, 0.62, 1); }
        globoLona.decir(texto);
        c.lonaHasta = c.t + dur;
    }

    // ---------- Empezar y terminar ----------
    function empezar(modo, mia) {
        c = nuevaCarrera(modo, mia);
        armarDecor(c.P);
        tomarActores();
        if (modo !== 'mirar') {
            ctx.bloquear();
            teclas.clear(); pulsado.clear();
            // Tú junto a Lona (detrás de la línea), mirando la pista
            const s = c.lona ? c.lona.s : sitioLona(c.P);
            const px = s.x + Math.sin(s.yaw + Math.PI / 2) * 1.2, pz = s.z + Math.cos(s.yaw + Math.PI / 2) * 1.2;
            jugador.colocar(px, alto(px, pz, jugador.pos.y - dy) + dy, pz);
            jugador.yaw = s.yaw + Math.PI;
            camaras.iniciarCine(gataObj(mia) || c.vis[mia], { escena: true, fundido: 0.5 });
            camaras.manual = camaraCarrera;
            misiones.ocultarMarcas = true;
            document.body.classList.add('en-carrera');
            hudEl.classList.add('visible'); ayudaEl.classList.add('visible'); salirB.classList.add('visible');
            tact.classList.toggle('visible', !!(ctx.tactil && ctx.tactil()));
        } else {
            hudEl.classList.add('visible');
        }
        rotular();
        return true;
    }
    // Cámara detrás de tu gata (un poco arriba, mirando adelante), suavizada
    const camPos = new THREE.Vector3(), camMira = new THREE.Vector3(), vMira = new THREE.Vector3();
    let camLista = false;
    function camaraCarrera() {
        if (!c) return null;
        const v = c.vis[c.mia];
        const atras = 4.2 + Math.min(1.2, Math.abs(v.v) * 0.12);
        const yy = v.y + dy;
        const meta = new THREE.Vector3(v.x - Math.sin(v.yaw) * atras, yy + 2.1, v.z - Math.cos(v.yaw) * atras);
        vMira.set(v.x + Math.sin(v.yaw) * 3, yy + 0.6, v.z + Math.cos(v.yaw) * 3);
        if (!camLista) { camPos.copy(meta); camMira.copy(vMira); camLista = true; }
        camPos.lerp(meta, 0.12); camMira.lerp(vMira, 0.2);
        return { pos: camPos, mira: camMira };
    }
    function terminar() {
        if (!c) return;
        const x = c;
        soltarActores();
        c = null; camLista = false;
        if (x.modo !== 'mirar') {
            camaras.manual = null;
            camaras.terminarCine();
            misiones.ocultarMarcas = false;
            document.body.classList.remove('en-carrera');
            ctx.liberar();
        }
        const red = redCarrera(); if (red && x.modo === 'red') red.salir();
        for (const e of [hudEl, cuentaEl, ayudaEl, salirB, tact]) e.classList.remove('visible');
        teclas.clear(); pulsado.clear();
        if (decor) decor.visible = false;
    }
    function rendirse() {
        if (!c || c.modo === 'mirar') return;
        if (c.fase === 'fin') { terminar(); return; }
        terminar(); // sin premio
    }

    // ---------- Esperar rival (en sala) ----------
    function mostrarEspera(v) { esperando = v; esperaEl.classList.toggle('visible', v); rotular(); }
    function contraJuego() {
        if (!esperando) return;
        const red = redCarrera(); const mia = red ? red.mia : 'mila';
        if (red) red.salir();
        mostrarEspera(false);
        empezar('solo', mia || 'mila');
    }
    function cancelarEspera() { const red = redCarrera(); if (red) red.salir(); mostrarEspera(false); ctx.liberar(); }

    // ---------- Red ----------
    let red = null;
    function redCarrera() { return red; }
    // Con sala: carrera-red.js sobre las actividades (la crea main.js al cargar este módulo)
    function conectar(r) { red = r; }
    const alRed = {
        espera() { ctx.bloquear(); mostrarEspera(true); },
        inicio(ini, mia) { mostrarEspera(false); if (c) terminar(); empezar('red', mia); },
        estado(gata, d) {
            if (!c || gata === (c.modo === 'red' ? c.mia : null)) return;
            c.remota[gata] = { m: d, edad: 0 };
            M.desempacar(c.g[gata], d);
        },
        meta(gata, tf) {
            if (!c || !gata) return;
            if (c.fin[gata] === undefined) c.fin[gata] = tf;
            if (c.g[gata].fin === null) c.g[gata].fin = tf;
            if (c.modo === 'mirar' && Object.keys(c.fin).length === 2) acabar();
        },
        hurra(quien, gata) { aliento(ctx.nombreDe ? ctx.nombreDe(quien) : quien, gata, false); },
        abandono(gata) {
            if (!c || c.modo !== 'red' || c.fase === 'fin') return;
            hud.mensaje(tx(TXT_CARRERA.abandono), 4);
            c.g[gata].fin = Infinity; c.fin[gata] = Infinity;
            acabar(true);
        },
        rechazo(motivo) { mostrarEspera(false); ctx.liberar(); if (motivo === 'llena') hud.mensaje(tx(TXT_CARRERA.ocupada), 4); },
        mirar(ini) {
            if (c) return;
            if (!cerca()) { pendienteMirar = ini; return; }
            empezar('mirar', null); c.fase = 'corre'; c.t = 0;
        },
        cerrada() { pendienteMirar = null; if (c && c.modo === 'mirar') terminar(); }
    };
    let pendienteMirar = null, relojCerca = 0, avisados = new Set();
    const cerca = () => { const cc = centro(); return Math.hypot(jugador.pos.x - cc.x, jugador.pos.z - cc.z) <= R().publico.mirar; };
    function aliento(nombre, gata, propio) {
        const g = TXT_CARRERA.nombre[gata] || gata;
        if (!propio && nombre) hud.mensaje(tx(TXT_CARRERA.alienta).replace('{x}', nombre).replace('{g}', g), 2.5);
        tono({ f0: 660, f1: 990, dur: 0.12, vol: 0.06, forma: 'triangle' });
        tono({ f0: 880, f1: 1320, dur: 0.12, vol: 0.06, forma: 'triangle', retardo: 0.1 });
    }

    // ---------- Fin y premio ----------
    function acabar(porAbandono = false) {
        if (!c || c.fase === 'fin') return;
        c.fase = 'fin'; c.tFin = c.t;
        const orden = M.puestos(M.GATAS.map(k => c.g[k]));
        const ganadora = orden[0].clave;
        c.resultado = { ganadora, gano: c.modo !== 'mirar' && (porAbandono || ganadora === c.mia) };
        decirLona(tx(TXT_CARRERA.lona.meta).replace('{g}', TXT_CARRERA.nombre[ganadora]), 3.5);
        rotular();
        if (c.modo === 'mirar') { hud.mensaje(tx(TXT_CARRERA.gana).replace('{g}', TXT_CARRERA.nombre[ganadora]), 4); return; }
        const r = c.R, tf = c.g[c.mia].fin;
        hud.mensaje(`${tx(c.resultado.gano ? TXT_CARRERA.ganas : TXT_CARRERA.pierdes)} · ${tx(TXT_CARRERA.tiempo)} ${Number.isFinite(tf) ? fmt(tf) + ' s' : '--'}`, 5);
        darPremio(c.resultado.gano ? r.premio.gana : r.premio.pierde);
        misiones.estado.minijuegos.add('carrera');
        if (misiones.alMinijuego) misiones.alMinijuego('carrera', c.resultado.gano ? 'gana' : 'pierde');
        if (c.resultado.gano) sonidos.nivel();
    }
    function darPremio(lista) {
        const dados = [];
        for (const [clave, n] of lista || []) {
            const id = O[clave] ?? B[clave];
            if (id == null || !(n > 0)) continue;
            const resto = inventario.agregar(id, n);
            if (resto) entidades.soltar(id, resto, 0, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z);
            dados.push(`${n > 1 ? n + ' × ' : ''}${nombreDe(id, L)}`);
        }
        if (dados.length) setTimeout(() => hud.mensaje(dados.join(', '), 4), 2500);
    }

    // ---------- Bucle ----------
    function actualizar(dt) {
        // Público: ver la carrera de otros al acercarse
        relojCerca -= dt;
        if (relojCerca <= 0) {
            relojCerca = 1;
            if (red && !c && red.fase === 'libre' && cerca()) {
                if (pendienteMirar || red.enCurso()) { pendienteMirar = null; red.mirar(); }
                const e = red.esperando();
                if (e && !avisados.has(e.jug[0])) { avisados.add(e.jug[0]); hud.mensaje(tx(TXT_CARRERA.esperaEn).replace('{x}', ctx.nombreDe ? ctx.nombreDe(e.jug[0]) : ''), 5); }
            }
            if (c && c.modo === 'mirar' && !cerca()) terminar();
        }
        if (!c) return;
        if (ctx.tinteMundo) tinte.aplicar(ctx.tinteMundo);
        dt = Math.min(dt, 0.05);
        c.t += dt;
        // Valores en vivo (Estudio → Carrera): si cambió el circuito, se vuelve a armar y las gatas se proyectan en él
        c.R = R();
        const clavePista = JSON.stringify(c.R.pista.puntos) + c.R.pista.ancho;
        if (clavePista !== c.pistaClave) {
            const cc = centro();
            c.P = M.armarPista(c.R, cc.x, cc.z); c.pistaClave = clavePista;
            for (const k of M.GATAS) { const g = c.g[k], pr = M.proyectar(c.P, g.x, g.z); g.s = pr.s; }
            armarDecor(c.P);
            if (c.lona) { c.lona.s = sitioLona(c.P); }
        }
        const r = c.R, P = c.P;
        // Cuenta regresiva
        if (c.fase === 'cuenta') {
            const k = Math.floor(-c.t); // 4: «¡a sus puestos!», 3, 2, 1
            const frases = TXT_CARRERA.lona.cuenta;
            const i = Math.max(0, Math.min(frases.length - 1, r.cuenta + 1 - Math.ceil(-c.t)));
            const txt = tx(frases[i]);
            if (txt !== c.lonaDijo) { c.lonaDijo = txt; decirLona(txt, 1); if (i > 0) tono({ f0: 440, f1: 440, dur: 0.15, vol: 0.12, forma: 'square' }); }
            cuentaEl.textContent = -c.t <= r.cuenta ? String(Math.ceil(-c.t)) : '';
            cuentaEl.classList.toggle('visible', -c.t <= r.cuenta && k >= 0);
            if (c.t >= 0) {
                c.fase = 'corre'; c.t = 0;
                cuentaEl.textContent = tx(TXT_CARRERA.ya); cuentaEl.classList.add('visible'); c.yaHasta = 0.8;
                decirLona(tx(TXT_CARRERA.lona.ya), 1.2);
                tono({ f0: 880, f1: 880, dur: 0.35, vol: 0.14, forma: 'square' });
            }
        } else if (c.yaHasta > 0) { c.yaHasta -= dt; if (c.yaHasta <= 0) cuentaEl.classList.remove('visible'); }
        // Física: la tuya (y la de la IA en solitario); la ajena llega por la red
        if (c.fase === 'corre' || c.fase === 'fin') {
            for (const clave of M.GATAS) {
                const g = c.g[clave];
                if (c.modo === 'mirar' || (c.modo === 'red' && clave !== c.mia)) {
                    // Ajena: avanza con su última velocidad hasta el próximo estado (no más de 0,3 s)
                    const rm = c.remota[clave];
                    if (rm) { rm.edad += dt; if (rm.edad < 0.3 && g.fin === null) { g.x += Math.sin(g.yaw) * g.v * dt; g.z += Math.cos(g.yaw) * g.v * dt; } }
                    continue;
                }
                const ent = clave === c.mia ? (c.fase === 'corre' ? entrada() : { ad: 0, giro: 0 }) : M.entradaIA(g, r, P, M.GATAS.indexOf(clave));
                const antes = g.turbo, finAntes = g.fin;
                M.pasoGata(g, ent, dt, r, P, libre, c.t);
                if (clave === c.mia && g.turbo > 0 && antes <= 0) { tono({ f0: 300, f1: 900, dur: 0.3, vol: 0.12, forma: 'sawtooth' }); }
                if (finAntes === null && g.fin !== null) {
                    c.fin[clave] = g.fin;
                    if (c.modo === 'red' && clave === c.mia && red) red.meta(g.fin);
                }
            }
            // Mi estado a la red
            if (c.modo === 'red' && red) {
                c.envio -= dt;
                if (c.envio <= 0) { c.envio = 1 / Math.max(1, r.red.hz); red.estado(M.empacar(c.g[c.mia])); }
            }
            // Última vuelta
            if (c.modo !== 'mirar' && !c.ultima && M.vueltaDe(c.g[c.mia], r, P) === r.vueltas && r.vueltas > 1) { c.ultima = true; decirLona(tx(TXT_CARRERA.lona.ultima), 2); }
            // ¿Terminó? Solo: la tuya y la IA; en red: las dos llegadas (la ajena por `meta`); tope de tiempo
            if (c.fase === 'corre') {
                const llegaron = M.GATAS.filter(k => c.g[k].fin !== null).length;
                if (c.modo === 'solo' && c.g[c.mia].fin !== null) acabar();
                else if (c.modo === 'red' && llegaron === 2) acabar();
                else if (c.t >= r.tope && c.modo !== 'mirar') acabar();
            } else if (c.t - c.tFin > 7 && c.modo !== 'red') terminar();
            else if (c.modo === 'red' && c.t - c.tFin > 7) terminar();
            if (!c) return;
        }
        // Lo dibujado: la propia y la IA tal cual; la ajena, suavizada
        const k = Math.min(1, dt / Math.max(0.01, r.red.suave));
        for (const clave of M.GATAS) {
            const g = c.g[clave], v = c.vis[clave];
            const ajena = c.modo === 'mirar' || (c.modo === 'red' && clave !== c.mia);
            if (ajena) { v.x = lerp(v.x, g.x, k); v.z = lerp(v.z, g.z, k); v.yaw = angLerp(v.yaw, g.yaw, k); }
            else { v.x = g.x; v.z = g.z; v.yaw = g.yaw; }
            v.v = g.v;
        }
        // Globo de Lona
        if (globoLona && c.lona) {
            const n = c.lona.n, ver = c.lonaHasta > c.t;
            globoLona.actualizar(dt, ver, n.x, n.y + 2.6, n.z, camaras.camara);
        }
        pintarHud();
    }
    function pintarHud() {
        const r = c.R, P = c.P;
        if (c.modo === 'mirar') {
            const orden = M.puestos(M.GATAS.map(k => c.g[k]));
            hVuelta.textContent = tx(TXT_CARRERA.alentar);
            hPuesto.textContent = `${TXT_CARRERA.nombre[orden[0].clave]} ${tx(TXT_CARRERA.vuelta)} ${M.vueltaDe(orden[0], r, P)}/${r.vueltas}`;
            hTiempo.textContent = ''; hTurbo.textContent = '';
            return;
        }
        const g = c.g[c.mia];
        const orden = M.puestos(M.GATAS.map(k => c.g[k]));
        hVuelta.textContent = `${TXT_CARRERA.nombre[c.mia]} · ${tx(TXT_CARRERA.vuelta)} ${M.vueltaDe(g, r, P)}/${r.vueltas}`;
        hPuesto.textContent = tx(TXT_CARRERA.puesto[orden.indexOf(g)] || TXT_CARRERA.puesto[1]);
        hTiempo.textContent = `${fmt(Math.max(0, g.fin ?? c.t))} s`;
        hTurbo.textContent = g.turbo > 0 ? tx(TXT_CARRERA.turbo) : g.carga > 0 ? '·'.repeat(Math.min(5, 1 + Math.floor(g.carga / r.gata.carga * 4))) : '';
    }

    // ---------- Panel de Lona ----------
    function abrir(pref = 'mila') {
        if (c || esperando) return false;
        if (ctx.puede && !ctx.puede()) return false;
        if (red && ctx.otrosEnSala && ctx.otrosEnSala() > 0) return red.abrir(pref);
        return empezar('solo', pref === 'gala' ? 'gala' : 'mila');
    }

    rotular();
    return {
        alRed, conectar, actualizar, abrir,
        get activa() { return !!(c && c.modo !== 'mirar') || esperando; },
        get estado() { return c; },
        setIdioma(l) { L = l; rotular(); },
        terminar,
        // Depuración: salta tu gata a la vuelta n (1..)
        saltarA(n) { if (c && c.mia) { const g = c.g[c.mia]; g.av = (n - 1) * c.P.largo + 0.1; } }
    };
}
