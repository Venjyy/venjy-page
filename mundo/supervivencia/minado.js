// =========================================================
// VENJY · Supervivencia · Romper, poner y usar
// Clic izquierdo (mantener): rompe con el tiempo de Minecraft según dureza y herramienta, con
// grietas sobre el bloque. Clic derecho: abre mesa/horno/cofre, duerme, abre puertas, come
// (mantener), usa cubos, azada, harina de huesos o semillas, y si no, pone el bloque.
// Q suelta (Ctrl+Q la pila), F cambia de mano, 1-9 y la rueda eligen.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { B, TIPO } from '../texturas.js';
import { ALTO } from '../voxeles.js';
import { lanzarRayo } from '../rayo.js';
import { O, info, infoBloque, tiempoRomper, dropsDe, esBloqueColocable, nombreDe } from './objetos.js';
import { pila } from './inventario.js';
import { esTierraCultivo, esSueloBrote, etapasDe } from './agricultura.js';
import { sonidos } from './sonidos.js';

const ALCANCE = 4.5;
const PAUSA_ENTRE_ROMPER = 0.25; // como Minecraft: tras romper hay una pequeña pausa
const TIEMPO_COMER = 1.6;
const CAEN = new Set([B.ARENA, B.GRAVA]);
// Se reemplazan al poner encima (pasto alto)
const REEMPLAZABLES = new Set([0, B.AGUA, B.LAVA, B.PASTO_ALTO]);
const INTERACTIVOS = new Set([B.MESA, B.HORNO, B.HORNO_ENCENDIDO, B.COFRE, B.BARRIL, B.CAMA,
    B.PUERTA_ABAJO, B.PUERTA_ARRIBA, B.PUERTA_ABIERTA_ABAJO, B.PUERTA_ABIERTA_ARRIBA]);

// Texturas de grietas (10 etapas), pintadas con código
function crearGrietas() {
    const lista = [];
    let azar = 12345;
    const r = () => { azar = (azar * 16807) % 2147483647; return azar / 2147483647; };
    const lineas = [];
    for (let i = 0; i < 26; i++) {
        let x = 8 + (r() - 0.5) * 4, y = 8 + (r() - 0.5) * 4;
        const camino = [];
        const ang = r() * Math.PI * 2;
        for (let k = 0; k < 7; k++) { camino.push([Math.round(x), Math.round(y)]); x += Math.cos(ang + (r() - 0.5)) * 1.3; y += Math.sin(ang + (r() - 0.5)) * 1.3; }
        lineas.push(camino);
    }
    for (let e = 0; e < 10; e++) {
        const c = document.createElement('canvas');
        c.width = c.height = 16;
        const ctx = c.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        const n = Math.round(((e + 1) / 10) * lineas.length);
        for (let i = 0; i < n; i++) for (const [x, y] of lineas[i].slice(0, 2 + Math.ceil(e * 0.6))) if (x >= 0 && y >= 0 && x < 16 && y < 16) ctx.fillRect(x, y, 1, 1);
        const t = new THREE.CanvasTexture(c);
        t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
        lista.push(t);
    }
    return lista;
}

export function crearMinado(ctx) {
    const { scene, camara, mundo, jugador, inventario, entidades, contenedores, agricultura, vida, ventanas, hud, idioma: idiomaIni = 'es' } = ctx;
    let idioma = idiomaIni;
    const estado = {
        objetivo: null, progreso: 0, rompiendo: null, pausa: 0,
        izquierdo: false, derecho: false, relojDerecho: 0,
        comiendo: 0, activo: true, lento: 1,
        // ganchos para otros sistemas (combate, misiones, jefes)
        alClicIzquierdo: null, // () => true si lo consumió (golpear una entidad)
        alClicDerecho: null,   // () => true si lo consumió (hablar con un amigo)
        alRomper: null,        // (id, x, y, z)
        alPoner: null,         // (id, x, y, z)
        alComer: null,         // (idObjeto)
        alGesto: null,         // () al golpear o usar algo (anima la mano)
        alSoltarDerecho: null, // () al soltar el clic derecho (disparar el arco, bajar el escudo)
        usarSinNada: null,     // () clic derecho sin otro uso (escudo en la otra mano)
        dormir: null,          // (x, y, z) => mensaje o null
        puedeRomper: null      // (x, y, z, id) => bool (zonas protegidas)
    };

    // ---- Selección y grietas ----
    const marco = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004)),
        new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.75, fog: false })
    );
    marco.visible = false;
    marco.renderOrder = 5;
    scene.add(marco);
    const grietas = crearGrietas();
    const grieta = new THREE.Mesh(new THREE.BoxGeometry(1.006, 1.006, 1.006), new THREE.MeshBasicMaterial({ map: grietas[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, fog: false }));
    grieta.visible = false;
    grieta.renderOrder = 6;
    scene.add(grieta);

    const apuntar = (conLiquidos = false) => lanzarRayo(camara, mundo, ALCANCE, conLiquidos
        ? (id, t) => t === 1 || t === 2 || t === 4 || t === 6 || t === 7 || id === B.AGUA || id === B.LAVA
        : (id, t) => t === 1 || t === 2 || t === 4 || t === 6 || t === 7);

    function chocaConJugador(x, y, z) {
        const p = jugador.pos, r = 0.3;
        return x + 1 > p.x - r && x < p.x + r && z + 1 > p.z - r && z < p.z + r && y + 1 > p.y && y < p.y + 1.8;
    }

    function soltarEn(id, n, d, x, y, z) { entidades.soltar(id, n, d, x + 0.5, y + 0.4, z + 0.5); }

    // Bloques que caen (arena, grava): bajan hasta el primer apoyo
    function caerColumna(x, y, z) {
        let yy = y;
        while (yy < ALTO) {
            const id = mundo.bloque(x, yy, z);
            if (!CAEN.has(id)) break;
            let destino = yy;
            while (destino > 1) {
                const abajo = mundo.bloque(x, destino - 1, z);
                if (abajo === 0 || abajo === B.AGUA || abajo === B.LAVA || TIPO[abajo] === 4) destino--; else break;
            }
            if (destino === yy) break;
            mundo.editar(x, yy, z, 0); mundo.editar(x, destino, z, id);
            yy++;
        }
    }

    // ¿Qué depende del bloque (x,y,z)? plantas encima, la otra mitad de la puerta
    function romperDependientes(x, y, z, id) {
        const arriba = mundo.bloque(x, y + 1, z);
        if (TIPO[arriba] === 4) romperBloque(x, y + 1, z, arriba, 0, true); // plantas, cultivos y antorchas de piso
        if (id === B.PUERTA_ABAJO || id === B.PUERTA_ABIERTA_ABAJO) {
            const p = mundo.bloque(x, y + 1, z);
            if (p === B.PUERTA_ARRIBA || p === B.PUERTA_ABIERTA_ARRIBA) mundo.editar(x, y + 1, z, 0);
        }
        if (id === B.PUERTA_ARRIBA || id === B.PUERTA_ABIERTA_ARRIBA) {
            const p = mundo.bloque(x, y - 1, z);
            if (p === B.PUERTA_ABAJO || p === B.PUERTA_ABIERTA_ABAJO) { mundo.editar(x, y - 1, z, 0); soltarEn(O.PUERTA, 1, 0, x, y - 1, z); }
        }
        // Las tierras labradas pierden su cultivo si se rompe lo de abajo (ya cubierto arriba)
        caerColumna(x, y + 1, z);
    }

    function romperBloque(x, y, z, id, idMano, dependiente = false) {
        mundo.editar(x, y, z, B.AIRE);
        sonidos.romper(id);
        for (const [d, n] of dropsDe(id, idMano)) soltarEn(d, n, 0, x, y, z);
        const i = infoBloque(id);
        if (i && i.contenedor) for (const p of contenedores.quitar(x, y, z)) soltarEn(p.id, p.n, p.d, x, y, z);
        romperDependientes(x, y, z, id);
        estado.alRomper && estado.alRomper(id, x, y, z, dependiente);
    }

    function terminarRomper(o) {
        const idMano = inventario.idEnMano();
        const i = infoBloque(o.id);
        romperBloque(o.x, o.y, o.z, o.id, idMano);
        vida.agotar(0.005);
        // Desgaste: las herramientas se gastan 1 por bloque (las espadas 2); con dureza 0 no se gastan
        const m = idMano >= 256 && info(idMano);
        if (m && m.herramienta && i && i.dureza > 0) {
            if (inventario.desgastarMano(m.herramienta.clase === 'espada' ? 2 : 1)) { sonidos.herramientaRota(); hud.mensaje(nombreDe(idMano, idioma) + (idioma === 'en' ? ' broke!' : ' se rompió')); }
        }
    }

    // ---- Usar (clic derecho) ----
    function usar() {
        if (estado.alClicDerecho && estado.alClicDerecho()) return true;
        const o = apuntar();
        const enMano = inventario.enMano();
        const idMano = enMano ? enMano.id : 0;
        // 1) Bloques con interacción (salvo agachado con un bloque en la mano)
        if (o && INTERACTIVOS.has(o.id) && !(jugador.agachado && idMano)) return interactuar(o);
        // 2) Objetos con uso
        if (idMano >= 256 && usarObjeto(o, enMano)) return true;
        // 3) Poner bloque
        if (idMano && esBloqueColocable(idMano) && ponerBloque(o, idMano)) return true;
        // 4) Nada que hacer: escudo en la otra mano
        return estado.usarSinNada ? estado.usarSinNada() : false;
    }

    function interactuar(o) {
        const { x, y, z, id } = o;
        if (id === B.MESA) { ventanas.abrir('mesa'); return true; }
        if (id === B.HORNO || id === B.HORNO_ENCENDIDO) { ventanas.abrir('horno', { estado: contenedores.obtener(x, y, z, id) }); return true; }
        if (id === B.COFRE || id === B.BARRIL) { ventanas.abrir('cofre', { estado: contenedores.obtener(x, y, z, id), barril: id === B.BARRIL }); sonidos.puerta(true); return true; }
        if (id === B.CAMA) { const m = estado.dormir && estado.dormir(x, y, z); if (m) hud.mensaje(m); return true; }
        if (id >= B.PUERTA_ABAJO && id <= B.PUERTA_ABIERTA_ARRIBA) {
            const abajo = id === B.PUERTA_ABAJO || id === B.PUERTA_ABIERTA_ABAJO ? y : y - 1;
            const abierta = mundo.bloque(x, abajo, z) === B.PUERTA_ABIERTA_ABAJO;
            const nueva = abierta ? [B.PUERTA_ABAJO, B.PUERTA_ARRIBA] : [B.PUERTA_ABIERTA_ABAJO, B.PUERTA_ABIERTA_ARRIBA];
            mundo.editarLote([[x, abajo, z, nueva[0]], [x, abajo + 1, z, nueva[1]]], true);
            sonidos.puerta(!abierta);
            return true;
        }
        return false;
    }

    function ponerEn(o) {
        if (!o) return null;
        // Plantas reemplazables se pisan; si no, va en la celda anterior al bloque apuntado
        if (o.id === B.PASTO_ALTO) return [o.x, o.y, o.z];
        return o.previo;
    }

    function ponerBloque(o, id) {
        const destino = ponerEn(o);
        if (!destino) return false;
        const [x, y, z] = destino;
        if (y < 1 || y >= ALTO) return false;
        const actual = mundo.bloque(x, y, z);
        if (actual === -1 || !REEMPLAZABLES.has(actual)) return false;
        const t = TIPO[id];
        if ((t === 1 || t === 6) && chocaConJugador(x, y, z)) return false;
        const abajo = mundo.bloque(x, y - 1, z);
        // Plantas: necesitan su suelo
        if (id === B.BROTE || id === B.BROTE_ABEDUL || id === B.BROTE_PINO) { if (!esSueloBrote(abajo)) return false; agricultura.registrar(x, y, z); }
        else if ([B.FLOR_ROJA, B.FLOR_AMARILLA, B.FLOR_AZUL, B.PASTO_ALTO].includes(id)) { if (!esSueloBrote(abajo)) return false; }
        else if (id === B.ANTORCHA) {
            const apoyo = TIPO[abajo] === 1 || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => TIPO[mundo.bloque(x + dx, y, z + dz)] === 1);
            if (!apoyo) return false;
        } else if (id === B.ESCALERA) {
            if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => TIPO[mundo.bloque(x + dx, y, z + dz)] === 1)) return false;
        } else if (etapasDe(id)) return false; // los cultivos se plantan con su semilla
        mundo.editar(x, y, z, id);
        if (id === B.COFRE || id === B.BARRIL) contenedores.marcarPuesto(x, y, z);
        if (id === B.TIERRA_LABRADA || id === B.TIERRA_LABRADA_HUMEDA) agricultura.registrar(x, y, z);
        inventario.gastarMano(1);
        sonidos.poner(id);
        estado.alPoner && estado.alPoner(id, x, y, z);
        caerColumna(x, y, z);
        return true;
    }

    function usarObjeto(o, p) {
        const def = info(p.id);
        // Comida: se mantiene apretado (ver actualizar)
        if (def.comida) {
            if (vida.hambre < 20) { estado.comiendo = 0.0001; return true; }
            return false;
        }
        // Semillas, zanahoria y papa: se plantan sobre tierra labrada
        if (def.planta && o && esTierraCultivo(o.id) && o.normal[1] === 1) {
            const y = o.y + 1;
            if (mundo.bloque(o.x, y, o.z) !== 0) return false;
            mundo.editar(o.x, y, o.z, def.planta);
            agricultura.registrar(o.x, y, o.z);
            agricultura.registrar(o.x, o.y, o.z);
            inventario.gastarMano(1);
            sonidos.poner(B.PASTO_ALTO);
            estado.alPoner && estado.alPoner(def.planta, o.x, y, o.z);
            return true;
        }
        // Azada: pasto, tierra o camino → tierra labrada (con aire encima)
        if (def.herramienta && def.herramienta.clase === 'azada' && o && [B.PASTO, B.TIERRA, B.CAMINO, B.PODZOL].includes(o.id) && o.normal[1] !== -1) {
            const arriba = mundo.bloque(o.x, o.y + 1, o.z);
            if (arriba !== 0 && arriba !== B.PASTO_ALTO) return false;
            if (arriba === B.PASTO_ALTO) mundo.editar(o.x, o.y + 1, o.z, 0);
            mundo.editar(o.x, o.y, o.z, B.TIERRA_LABRADA);
            agricultura.registrar(o.x, o.y, o.z);
            if (inventario.desgastarMano(1)) sonidos.herramientaRota();
            sonidos.poner(B.TIERRA);
            return true;
        }
        // Harina de huesos
        if (p.id === O.HARINA_HUESO && o) {
            if (agricultura.abonar(o.x, o.y, o.z)) { inventario.gastarMano(1); sonidos.poner(B.PASTO_ALTO); return true; }
            return false;
        }
        // Cubos
        if (p.id === O.CUBO) {
            const l = apuntar(true);
            if (!l || (l.id !== B.AGUA && l.id !== B.LAVA)) return false;
            if (l.id === B.AGUA) {
                // Fuente infinita: con 2 o más vecinos de agua no se gasta el bloque
                const vecinos = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => mundo.bloque(l.x + dx, l.y, l.z + dz) === B.AGUA).length;
                if (vecinos < 2) mundo.editar(l.x, l.y, l.z, 0);
            } else mundo.editar(l.x, l.y, l.z, 0);
            llenarCubo(l.id === B.AGUA ? O.CUBO_AGUA : O.CUBO_LAVA);
            sonidos.salpicar();
            return true;
        }
        if (p.id === O.CUBO_AGUA || p.id === O.CUBO_LAVA) {
            const destino = o ? (REEMPLAZABLES.has(o.id) && o.id !== 0 ? [o.x, o.y, o.z] : o.previo) : null;
            if (!destino) return false;
            const [x, y, z] = destino;
            const actual = mundo.bloque(x, y, z);
            if (actual === -1 || !(REEMPLAZABLES.has(actual) || TIPO[actual] === 4)) return false;
            mundo.editar(x, y, z, p.id === O.CUBO_AGUA ? B.AGUA : B.LAVA);
            inventario.ponerEnMano(pila(O.CUBO, 1));
            sonidos.salpicar();
            return true;
        }
        // Puerta: dos bloques de alto
        if (p.id === O.PUERTA) {
            const destino = ponerEn(o);
            if (!destino) return false;
            const [x, y, z] = destino;
            const a = mundo.bloque(x, y, z), b = mundo.bloque(x, y + 1, z);
            if (!REEMPLAZABLES.has(a) || !REEMPLAZABLES.has(b) || TIPO[mundo.bloque(x, y - 1, z)] !== 1) return false;
            mundo.editarLote([[x, y, z, B.PUERTA_ABAJO], [x, y + 1, z, B.PUERTA_ARRIBA]], true);
            inventario.gastarMano(1);
            sonidos.puerta(false);
            return true;
        }
        if (p.id === O.CAMA) {
            const destino = ponerEn(o);
            if (!destino) return false;
            const [x, y, z] = destino;
            if (!REEMPLAZABLES.has(mundo.bloque(x, y, z)) || TIPO[mundo.bloque(x, y - 1, z)] !== 1 || chocaConJugador(x, y, z)) return false;
            mundo.editar(x, y, z, B.CAMA);
            inventario.gastarMano(1);
            sonidos.poner(B.LANA);
            return true;
        }
        return estado.usarObjeto ? estado.usarObjeto(o, p) : false;
    }

    function llenarCubo(id) {
        const p = inventario.enMano();
        if (p.n === 1) inventario.ponerEnMano(pila(id, 1));
        else { inventario.gastarMano(1); const resto = inventario.agregar(id, 1); if (resto) entidades.soltar(id, 1, 0, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z); }
    }

    function terminarComer() {
        const p = inventario.enMano();
        const def = p && info(p.id);
        if (!def || !def.comida) return;
        vida.alimentar(def.comida[0], def.comida[1]);
        if (def.efecto === 'veneno') { vida.veneno = 8; vida.efectoHambre = 15; }
        if (def.efecto === 'hambre' && Math.random() < 0.8) vida.efectoHambre = 30;
        if (def.efecto === 'hambre30' && Math.random() < 0.3) vida.efectoHambre = 30;
        inventario.gastarMano(1);
        if (p.id === O.ESTOFADO) inventario.agregar(O.CUENCO, 1);
        sonidos.eructo();
        estado.alComer && estado.alComer(p.id);
    }

    // ---- Soltar y cambiar de mano ----
    function soltarEnMano(todo) {
        const p = inventario.enMano();
        if (!p) return;
        const n = todo ? p.n : 1;
        const dir = new THREE.Vector3();
        camara.getWorldDirection(dir);
        entidades.soltar(p.id, n, p.d, jugador.pos.x + dir.x * 0.4, jugador.pos.y + 1.3, jugador.pos.z + dir.z * 0.4, dir.multiplyScalar(5).add(new THREE.Vector3(0, 1.5, 0)), 1.5);
        inventario.gastarMano(n);
    }

    // ---- Entrada ----
    const activo = () => estado.activo && jugador.activo && !ventanas.abierta && !vida.muerto;
    function abajo(boton) {
        if (!activo()) return;
        if (boton === 0) {
            estado.alGesto && estado.alGesto();
            if (estado.alClicIzquierdo && estado.alClicIzquierdo()) return;
            estado.izquierdo = true;
        } else if (boton === 2) {
            estado.derecho = true;
            estado.relojDerecho = 0;
            if (usar() && !estado.comiendo) estado.alGesto && estado.alGesto();
        }
    }
    function arriba(boton) {
        if (boton === 0) { estado.izquierdo = false; estado.rompiendo = null; estado.progreso = 0; }
        if (boton === 2) { estado.derecho = false; estado.comiendo = 0; estado.alSoltarDerecho && estado.alSoltarDerecho(); }
    }
    estado.abajo = abajo;
    estado.arriba = arriba;
    document.addEventListener('mousedown', e => abajo(e.button));
    document.addEventListener('mouseup', e => arriba(e.button));
    // Sin el menú del navegador al jugar ni cuando el clic derecho abre una ventana o el panel de un amigo
    // (el puntero ya se soltó al llegar el evento); en campos de texto se deja
    document.addEventListener('contextmenu', e => {
        if (e.target.closest && e.target.closest('input, textarea')) return;
        if (jugador.activo || ventanas.abierta) e.preventDefault();
    });
    document.addEventListener('wheel', e => {
        if (!activo()) return;
        inventario.elegida = (inventario.elegida + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
        estado.comiendo = 0;
    }, { passive: true });
    document.addEventListener('keydown', e => {
        if (!activo()) return;
        const m = /^Digit([1-9])$/.exec(e.code);
        if (m) { inventario.elegida = Number(m[1]) - 1; estado.comiendo = 0; }
        if (e.code === 'KeyQ') soltarEnMano(e.ctrlKey);
        if (e.code === 'KeyF') { const a = inventario.casillas[inventario.elegida]; inventario.casillas[inventario.elegida] = inventario.mano2; inventario.mano2 = a; inventario.cambio(); }
    });
    window.addEventListener('blur', () => { estado.izquierdo = estado.derecho = false; estado.comiendo = 0; });

    // ---- Cada cuadro ----
    estado.actualizar = dt => {
        if (!activo()) { marco.visible = grieta.visible = false; estado.objetivo = null; estado.izquierdo = estado.derecho = false; estado.comiendo = 0; estado.lento = 1; return; }
        const o = apuntar();
        estado.objetivo = o;
        marco.visible = !!o;
        if (o) marco.position.set(o.x + 0.5, o.y + 0.5, o.z + 0.5);
        estado.pausa = Math.max(0, estado.pausa - dt);

        // Romper
        if (estado.izquierdo && o && estado.pausa <= 0) {
            const clave = o.x + ',' + o.y + ',' + o.z;
            if (estado.rompiendo !== clave) { estado.rompiendo = clave; estado.progreso = 0; }
            const permitido = !estado.puedeRomper || estado.puedeRomper(o.x, o.y, o.z, o.id);
            const t = permitido ? tiempoRomper(o.id, inventario.idEnMano(), { enAgua: jugador.enAgua() && mundo.bloque(jugador.pos.x, jugador.pos.y + jugador.ojos, jugador.pos.z) === B.AGUA, enAire: !jugador.enSuelo && !jugador.enAgua() && !jugador.enEscalera() }) : Infinity;
            if (t === 0) { terminarRomper(o); estado.pausa = PAUSA_ENTRE_ROMPER; estado.rompiendo = null; }
            else if (t < Infinity) {
                const antes = estado.progreso;
                estado.progreso += dt / t;
                if (Math.floor(antes * 4) !== Math.floor(estado.progreso * 4)) sonidos.golpeBloque(o.id);
                if (estado.progreso >= 1) { terminarRomper(o); estado.pausa = PAUSA_ENTRE_ROMPER; estado.rompiendo = null; estado.progreso = 0; }
            }
        } else if (!estado.izquierdo || !o) { estado.rompiendo = null; estado.progreso = 0; }
        grieta.visible = !!(estado.rompiendo && o && estado.progreso > 0);
        if (grieta.visible) {
            grieta.position.set(o.x + 0.5, o.y + 0.5, o.z + 0.5);
            grieta.material.map = grietas[Math.min(9, Math.floor(estado.progreso * 10))];
        }

        // Comer (mantener clic derecho)
        if (estado.comiendo > 0) {
            const p = inventario.enMano();
            if (!estado.derecho || !p || !info(p.id) || !info(p.id).comida) estado.comiendo = 0;
            else {
                const antes = estado.comiendo;
                estado.comiendo += dt;
                estado.lento = 0.35;
                if (Math.floor(antes / 0.25) !== Math.floor(estado.comiendo / 0.25)) sonidos.comer();
                if (estado.comiendo >= TIEMPO_COMER) { terminarComer(); estado.comiendo = vida.hambre < 20 ? 0.0001 : 0; }
            }
        }
        if (!estado.comiendo) estado.lento = 1;
        // Poner repetido al mantener (como Minecraft, cada 0,2 s)
        if (estado.derecho && !estado.comiendo) {
            estado.relojDerecho += dt;
            if (estado.relojDerecho >= 0.25) { estado.relojDerecho = 0; const id = inventario.idEnMano(); if (id && id < 256 && esBloqueColocable(id) && usar()) estado.alGesto && estado.alGesto(); }
        }
    };
    estado.setIdioma = l => { idioma = l; };
    estado.romperBloque = romperBloque;
    estado.soltarEnMano = soltarEnMano;
    return estado;
}

