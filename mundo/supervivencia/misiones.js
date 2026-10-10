// =========================================================
// VENJY · Supervivencia · Misiones
// Se habla con un amigo apuntándolo y con clic derecho (USAR en el celular): se abre un panel
// con su pedido, el premio y los botones. Una sola misión activa a la vez. Sobre la cabeza:
// «!» si tiene algo que pedir y «?» si ya puedes entregarle. Al completar, el amigo dice un
// diálogo único (panel y globo). Venjy, en el Inicio, entrega las peleas de jefe.
// Coordenadas: los amigos viven en el mapa original (y sin desplazar) dentro de `grupo`.
// =========================================================
import * as THREE from '../../vendor/three.module.js';
import { MISIONES, JEFES, TEXTOS_VENJY, NOMBRES_AMIGO } from './misiones-datos.js';
import { O, nombreDe } from './objetos.js';
import { icono } from './iconos.js';
import { crearGlobo, zonasPantalla, COLOR_GLOBO } from '../criaturas/cuerpo.js';
import { NOMBRES_MOB } from './enemigos.js';
import { sonidos } from './sonidos.js';
import { crearTienda } from './tienda.js';
import { REQ_MINIJUEGOS } from './minijuegos-datos.js';
import { crearAmistad, precioAmigo, NIVELES, RADIO_PELEA, PERSONAJES } from './amistad.js';
import { tipoSkin } from './escenas-skin.js';

// Quiénes ganan amistad con cada minijuego y qué finales cuentan como ganar
const AMIGOS_MINIJUEGO = { lena: ['boris'], pesca: ['pony'], asado: ['hadad', 'andy', 'nacho'] };
const FINALES_GANA = new Set(['gana', 'muchos', 'bien']);

const TXT = {
    es: { aceptar: 'Aceptar', entregar: 'Entregar', cerrar: 'Cerrar', abandonar: 'Abandonar misión', premio: 'Premio', progreso: 'Progreso',
        ocupado: n => `Ya tienes una misión activa con ${n}. Termínala o abandónala primero.`, falta: 'Todavía te falta:', mision: 'Misión',
        matar: (m, n) => `Eliminar ${n} × ${m}`, cualquiera: 'monstruos', deNoche: ' (de noche)', visitar: n => `Visitar los ${n} lugares`, noche: 'Sobrevivir una noche sin dormir', hablar: 'Hablar con ella',
        completas: (n, t) => `Misiones: ${n}/${t}`, nueva: 'Nueva misión', listo: '¡Listo para entregar!', abandonada: 'Misión abandonada', recibes: 'Recibes:', jefe: 'Pelea de jefe',
        usarAltar: 'Usa el objeto en el altar (clic derecho)', vidaExtra: '+1 corazón máximo', subeAmistad: (n, nv) => `Amistad con ${n}: ${nv}` },
    en: { aceptar: 'Accept', entregar: 'Hand in', cerrar: 'Close', abandonar: 'Abandon quest', premio: 'Reward', progreso: 'Progress',
        ocupado: n => `You already have an active quest with ${n}. Finish or abandon it first.`, falta: 'You still need:', mision: 'Quest',
        matar: (m, n) => `Defeat ${n} × ${m}`, cualquiera: 'monsters', deNoche: ' (at night)', visitar: n => `Visit the ${n} places`, noche: 'Survive a night without sleeping', hablar: 'Talk to her',
        completas: (n, t) => `Quests: ${n}/${t}`, nueva: 'New quest', listo: 'Ready to hand in!', abandonada: 'Quest abandoned', recibes: 'You get:', jefe: 'Boss fight',
        usarAltar: 'Use the item on the altar (right click)', vidaExtra: '+1 max heart', subeAmistad: (n, nv) => `Friendship with ${n}: ${nv}` }
};

export function crearMisiones(ctx) {
    const { grupo, dy, jugador, camara, inventario, entidades, vida, dia, hud, terreno, npcs, amigos, venjys, abrirPanel, cerrarPanel } = ctx;
    let idioma = ctx.idioma || 'es';
    const tx = () => TXT[idioma];
    const L = o => (o ? o[idioma] || o.es : '');
    // escenasSkin: amigos que ya reaccionaron a tu skin en esta partida (escenas-skin.js)
    // minijuegos: juegos jugados y marcas como 'mj-boris' (minijuego.js)
    // carta: el encargo diario del Venjy del correo ({ dia, para, entregada } o null; 7f-1)
    const estado = { hechas: new Set(), activa: null, progreso: 0, visitados: new Set(), noche: null, jefes: new Set(), vidaExtra: 0, escenasSkin: new Set(), minijuegos: new Set(), carta: null };
    let ocultarMarcas = false;
    let botonMinijuego = null; // clave -> { texto, motivo } o null (lo pone minijuego.js con `misiones.minijuego`)
    let escenaAmistad = null; // { jugar(clave, tipo), momento(clave) } (bloque 6b: main.js carga escena-amistad.js con import() al usarla)

    // ---- Amistad (bloque 6a): se guarda con las misiones, por jugador ----
    const baseSkin = () => (ctx.skin ? tipoSkin(ctx.skin()).base : null);
    const amistad = crearAmistad({ dia: () => dia.dias || 0, base: baseSkin });
    amistad.alSubir = (clave, n) => { hud.mensaje(tx().subeAmistad(NOMBRES_AMIGO[clave], L(NIVELES[n])), 5); sonidos.nivel(); };

    // ---- Tienda (pestaña del panel de cada amigo) ----
    const tienda = crearTienda({
        // Una oferta se desbloquea con una misión o con una marca de minijuego ('mj-boris')
        inventario, hud, hechas: () => ({ has: id => estado.hechas.has(id) || estado.minijuegos.has(id) }), idioma, nombres: NOMBRES_AMIGO, abrirPanel, cerrarPanel,
        tituloDe: id => (misionDe(id) || REQ_MINIJUEGOS[id] || {}).titulo, dar: lista => dar(lista),
        decir: (clave, texto) => decirEspecial(clave, texto), volver: clave => hablar(clave), conversar: clave => conversar(clave),
        precio: (clave, o) => precioAmigo(o, amistad.nivel(clave)), alComprar: clave => amistad.sumar(clave, 'tienda'),
        alAbrir: (clave, el) => retenerAmigo(clave, el)
    });

    // ---- Pestaña «Hablar»: hablar.js y dialogos-datos.js se cargan la primera vez que se abre ----
    // (también al abrir Misión o Tienda: el amigo queda quieto y te mira mientras su panel esté abierto)
    let hablarUI = null, cargandoHablar = null;
    function conversar(clave) {
        if (hablarUI) return hablarUI.abrir(clave);
        cargarHablar().then(h => { if (h) h.abrir(clave); });
    }
    function retenerAmigo(clave, el) {
        if (hablarUI) return hablarUI.retener(clave, el);
        cargarHablar().then(h => { if (h && el.isConnected) h.retener(clave, el); });
    }
    function cargarHablar() {
        if (!cargandoHablar) cargandoHablar = import('./hablar.js').then(m => {
            hablarUI = m.crearHablar({
                amistad, jugador, camara, dy, inventario, hud, sonidos, nombreDe, abrirPanel, cerrarPanel, idioma, nombres: NOMBRES_AMIGO, base: baseSkin,
                hechos: () => ({ hechas: estado.hechas, minijuegos: estado.minijuegos, jefes: estado.jefes }),
                personaDe: c => (personas().find(p => p.clave === c) || {}).n || null,
                pestanas: c => tienda.pestanas(c, 'hablar'),
                decir: (c, texto) => decirEspecial(c, texto),
                // Antes de que la escena tome al amigo se suelta la retención (como el botón del minijuego)
                saludar: (c, tipo) => { if (!escenaAmistad) return; hablarUI.soltar(); escenaAmistad.jugar(c, tipo); },
                momento: c => { if (!escenaAmistad) return; hablarUI.soltar(); escenaAmistad.momento(c); },
                grupo: c => { if (!escenaAmistad) return; hablarUI.soltar(); escenaAmistad.grupo(c); },
                carta: { para: cartaPara, entregar: entregarCarta },
                tituloDe: id => (misionDe(id) || REQ_MINIJUEGOS[id] || {}).titulo
            });
            return hablarUI;
        }).catch(e => { cargandoHablar = null; console.error('No se pudo cargar «Hablar»', e); });
        return cargandoHablar;
    }

    // ---- Lo que dicen los Venjy y el encargo de la carta (7f-1): venjys-datos.js se carga con import() al primer globo ----
    let venjysDatos = null, cargandoVenjys = null, selector = null;
    function cargarVenjysDatos() {
        if (!cargandoVenjys) cargandoVenjys = import('./venjys-datos.js').then(m => (venjysDatos = m)).catch(e => { cargandoVenjys = null; console.error('No se pudo cargar los dichos de Venjy', e); return null; });
        return cargandoVenjys;
    }
    // Destinos para la brújula viva: los lugares para explorar y, de las zonas del portafolio, donde está su Venjy
    const sitiosVenjys = () => [
        ...(terreno.lugares || []).map(l => ({ clave: l.clave, x: l.x, z: l.z })),
        ...venjys.lista.filter(n => n.cargado && n.lugar !== 'inicio').map(n => ({ clave: n.lugar, x: n.x, z: n.z }))
    ];
    const cartaPara = () => (estado.carta && !estado.carta.entregada && inventario.contar(O.CARTA) > 0 ? estado.carta.para : null);
    function elegirDicho(n) {
        if (!venjysDatos) { cargarVenjysDatos(); return null; } // mientras carga, los dichos de siempre
        if (!selector) {
            selector = venjysDatos.crearSelector({
                pos: () => jugador.pos, sitios: sitiosVenjys, hechas: amigasHechas, jefes: () => estado.jefes,
                personajes: () => PERSONAJES.filter(c => c !== 'venjy').map(c => ({ clave: c, puntos: amistad.puntos(c), nivel: amistad.nivel(c), ganados: amistad.ganados(c) })),
                skin: () => { const s = ctx.skin && ctx.skin(); return s ? tipoSkin(s).base || 'propia' : null; },
                dia: () => ({ dias: dia.dias || 0, esNoche: dia.esNoche, t: dia.t }),
                carta: () => {
                    const c = estado.carta, d = dia.dias || 0;
                    return { tiene: inventario.contar(O.CARTA) > 0, para: c ? c.para : venjysDatos.paraDe(d), hoy: !!(c && c.dia === d) };
                }
            });
        }
        return selector.elegir(n);
    }
    for (const n of venjys.lista) n.frases = elegirDicho; // los dichos de siempre quedan en n.dichos

    // Clic derecho al Venjy del correo: te pasa la carta del día (una por día de juego), o te recuerda a quién llevarla
    function encargoCorreo() {
        const v = venjys.lista.find(n => n.lugar === 'correo');
        if (!v) return;
        cargarVenjysDatos().then(m => {
            if (!m) return;
            const d = dia.dias || 0, c = estado.carta;
            let f;
            if (inventario.contar(O.CARTA) > 0) f = m.cartaTiene(c ? c.para : m.paraDe(d));
            else if (!c || c.dia !== d) {
                const para = m.paraDe(d);
                estado.carta = { dia: d, para, entregada: false };
                dar([[O.CARTA, 1]]);
                f = m.CARTA_DA[para];
                hud.mensaje(`${tx().recibes} ${nombreDe(O.CARTA, idioma)}`, 5);
            } else f = m.CARTA_HOY;
            sonidos.clic();
            v.frase = f; v.cambioFrase = 9; v.fraseId = null;
        });
    }
    // Entrega la carta a su destinatario (botón de «Hablar»): +2 de amistad (tope del día) y 1 esmeralda. Devuelve la respuesta (o null)
    function entregarCarta(clave) {
        if (cartaPara() !== clave) return Promise.resolve(null);
        return cargarVenjysDatos().then(m => {
            if (!m || cartaPara() !== clave) return null;
            inventario.quitar(O.CARTA, 1);
            estado.carta.entregada = true;
            amistad.sumar(clave, 'carta');
            dar([[O.ESMERALDA, m.CARTA_ESMERALDAS]]);
            sonidos.nivel();
            hud.mensaje(`${L(m.CARTA_ENTREGADA)} · ${tx().recibes} ${nombrePremio([[O.ESMERALDA, m.CARTA_ESMERALDAS]])}`, 5);
            const frase = L(m.CARTA_RESPUESTA[clave]);
            decirEspecial(clave, frase);
            return frase;
        });
    }

    // ---- Personas ----
    function personas() {
        const l = [];
        for (const n of npcs.lista) l.push({ clave: n.clave, n });
        for (const n of amigos.lista) l.push({ clave: n.clave, n });
        const v = venjys.lista.find(n => n.lugar === 'inicio');
        if (v) l.push({ clave: 'venjy', n: v });
        return l.filter(p => NOMBRES_AMIGO[p.clave]);
    }
    const escalaDe = n => (n.escala || 1);
    // Caja para el rayo (pies en el mapa original + dy)
    const cajaDe = n => ({ x: n.x, y: (n.y ?? 0) + dy, z: n.z, ancho: 0.9 * escalaDe(n), alto: 1.95 * escalaDe(n) });

    const siguienteDe = clave => MISIONES.find(m => m.amigo === clave && !estado.hechas.has(m.id)) || null;
    const jefeSiguiente = () => JEFES.find(j => !estado.jefes.has(j.id)) || null;
    const amigasHechas = () => MISIONES.filter(m => estado.hechas.has(m.id)).length;
    const misionDe = id => MISIONES.find(m => m.id === id) || JEFES.find(j => j.id === id);

    // ---- Progreso ----
    const cuenta = pedido => [].concat(pedido).reduce((s, id) => s + inventario.contar(id), 0);
    function cumplida(m) {
        if (!m) return false;
        switch (m.tipo) {
            case 'entregar': return m.pide.every(([p, n]) => cuenta(p) >= n);
            case 'matar': case 'visitar': return estado.progreso >= m.n;
            case 'noche': return estado.noche === 'lista';
            case 'hablar': return true;
            default: return false; // jefes: los marca jefes.js
        }
    }
    function textoObjetivo(m) {
        if (!m) return '';
        if (m.jefe) return tx().usarAltar;
        switch (m.tipo) {
            case 'entregar': return m.pide.map(([p, n]) => `${nombreDe([].concat(p)[0], idioma)} ${Math.min(cuenta(p), n)}/${n}`).join(' · ');
            case 'matar': return tx().matar(m.mob === '*' ? tx().cualquiera : L(NOMBRES_MOB[m.mob]), m.n) + (m.noche ? tx().deNoche : '') + `  ${Math.min(estado.progreso, m.n)}/${m.n}`;
            case 'visitar': return tx().visitar(m.n) + `  ${Math.min(estado.progreso, m.n)}/${m.n}`;
            case 'noche': return tx().noche + (estado.noche === 'lista' ? ' ✓' : '');
            case 'hablar': return tx().hablar;
            default: return '';
        }
    }

    // Avisos desde otros sistemas
    // x, z: dónde cayó el monstruo (si no llega, donde está el jugador); cerca de un amigo suma amistad
    function alMatar(tipo, x = jugador.pos.x, z = jugador.pos.z) {
        for (const p of personas()) if (Math.hypot(p.n.x - x, p.n.z - z) < RADIO_PELEA) amistad.sumar(p.clave, 'pelea');
        const m = misionDe(estado.activa);
        if (!m || m.tipo !== 'matar') return;
        if (m.mob !== '*' && m.mob !== tipo) return;
        if (m.noche && !dia.esNoche) return;
        estado.progreso++;
        if (estado.progreso === m.n) { hud.mensaje(tx().listo); sonidos.nivel(); }
    }
    function alDormir() { if (estado.noche && estado.noche !== 'lista') estado.noche = 'fallida'; }
    function alMorir() { if (estado.noche && estado.noche !== 'lista') estado.noche = 'fallida'; }

    // ---- Premios ----
    function dar(lista) {
        for (const [id, n] of lista) {
            const resto = inventario.agregar(id, n);
            if (resto) entidades.soltar(id, resto, 0, jugador.pos.x, jugador.pos.y + 1, jugador.pos.z);
        }
    }
    const nombrePremio = lista => lista.map(([id, n]) => `${n > 1 ? n + ' × ' : ''}${nombreDe(id, idioma)}`).join(', ');

    // ---- Globo especial (el diálogo único al completar) ----
    const especiales = new Map(); // clave -> { globo, t }
    function decirEspecial(clave, texto) {
        let e = especiales.get(clave);
        // Pestaña con el nombre y marco de color, sin colita: con el encaje el globo puede quedar lejos de quien habla
        if (!e) { e = { globo: crearGlobo(grupo, { nombre: NOMBRES_AMIGO[clave], color: COLOR_GLOBO[clave] }), t: 0 }; especiales.set(clave, e); }
        e.globo.decir(texto);
        e.t = Math.max(7, Math.min(14, texto.length / 12)); // tiempo de lectura
    }

    // ---- Marcadores «!» y «?» ----
    function lienzoMarca(ch, color) {
        const c = document.createElement('canvas'); c.width = 16; c.height = 24;
        const x = c.getContext('2d');
        x.font = '22px PixelCraft'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillStyle = '#000'; x.fillText(ch, 9, 13); x.fillStyle = color; x.fillText(ch, 8, 12);
        const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace;
        return t;
    }
    let texExcl = lienzoMarca('!', '#ffd84a'), texPreg = lienzoMarca('?', '#ffd84a'), texPregGris = lienzoMarca('?', '#bdbdbd');
    try { document.fonts.load('22px PixelCraft').then(() => { texExcl = lienzoMarca('!', '#ffd84a'); texPreg = lienzoMarca('?', '#ffd84a'); texPregGris = lienzoMarca('?', '#bdbdbd'); for (const m of marcas.values()) m.material.needsUpdate = true; }); } catch (e) { /* sin fuentes */ }
    const marcas = new Map();
    function marcaDe(clave) {
        let s = marcas.get(clave);
        if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texExcl, transparent: true, depthWrite: false })); s.scale.set(0.45, 0.68, 1); grupo.add(s); marcas.set(clave, s); }
        return s;
    }

    // ---- Seguimiento de la misión activa (HUD) ----
    const seguimiento = document.createElement('div');
    seguimiento.className = 'mision-activa';
    seguimiento.hidden = true;
    document.getElementById('hud').appendChild(seguimiento);
    let firma = '';
    function pintarSeguimiento() {
        const m = misionDe(estado.activa);
        const f = (m ? m.id + textoObjetivo(m) : '') + idioma + amigasHechas();
        if (f === firma) return;
        firma = f;
        seguimiento.textContent = '';
        const total = document.createElement('small');
        total.textContent = tx().completas(amigasHechas(), MISIONES.length);
        seguimiento.appendChild(total);
        if (m) {
            const b = document.createElement('b'); b.textContent = `${NOMBRES_AMIGO[m.amigo || 'venjy']}: ${L(m.titulo)}`;
            const p = document.createElement('span'); p.textContent = textoObjetivo(m);
            seguimiento.append(b, p);
            if (!m.jefe && cumplida(m)) { const ok = document.createElement('em'); ok.textContent = tx().listo; seguimiento.appendChild(ok); }
        }
        seguimiento.hidden = false;
    }

    // ---------------------------------------------------------
    // Panel
    // ---------------------------------------------------------
    function panel(clave, cuerpo, botones) {
        const el = document.createElement('section');
        el.className = 'panel-mision';
        const h = document.createElement('h2');
        h.textContent = NOMBRES_AMIGO[clave];
        el.appendChild(h);
        el.appendChild(tienda.pestanas(clave, 'mision'));
        for (const parte of cuerpo) if (parte) el.appendChild(parte);
        const fila = document.createElement('div');
        fila.className = 'botones-mision';
        for (const [texto, f, clase] of botones) {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'boton ' + (clase || ''); b.textContent = texto;
            b.addEventListener('click', f);
            fila.appendChild(b);
        }
        el.appendChild(fila);
        // Minijuego del amigo (Boris, Pony, la fogata): botón aparte; si falta algo, desactivado y con el motivo
        const mj = botonMinijuego && botonMinijuego.texto(clave);
        if (mj) {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'boton boton-minijuego'; b.textContent = mj.texto;
            if (mj.motivo) { b.disabled = true; b.title = mj.motivo; }
            else b.addEventListener('click', () => { if (hablarUI) hablarUI.soltar(); botonMinijuego.jugar(clave); }); // suelta al amigo antes de que el minijuego lo tome
            el.appendChild(b);
            if (mj.motivo) el.appendChild(parrafo(mj.motivo, 'motivo-minijuego'));
        }
        // La cámara de cine encuadra al amigo mientras el panel está abierto
        const p = personas().find(x => x.clave === clave);
        abrirPanel(el, { enfocar: p ? p.n : null });
        retenerAmigo(clave, el);
        const primero = fila.querySelector('button');
        if (primero) primero.focus();
    }
    const parrafo = (texto, clase = '') => { const p = document.createElement('p'); p.className = clase; p.textContent = texto; return p; };
    function listaPremio(lista, extra) {
        const d = document.createElement('div');
        d.className = 'premio-mision';
        const t = document.createElement('b'); t.textContent = tx().premio + ':'; d.appendChild(t);
        for (const [id, n] of lista) {
            const s = document.createElement('span');
            const c = document.createElement('canvas'); c.width = c.height = 32; c.getContext('2d').drawImage(icono(id), 0, 0);
            s.append(c, document.createTextNode(`${n > 1 ? n + ' × ' : ''}${nombreDe(id, idioma)}`));
            d.appendChild(s);
        }
        if (extra) { const s = document.createElement('span'); s.textContent = extra; d.appendChild(s); }
        return d;
    }
    const tituloMision = (m, etiqueta) => parrafo(`${etiqueta}: ${L(m.titulo)}`, 'titulo-mision');

    function abandonar() {
        const m = misionDe(estado.activa);
        if (m && m.jefe) ctx.alAbandonarJefe && ctx.alAbandonarJefe(m);
        estado.activa = null; estado.progreso = 0; estado.noche = null; estado.visitados.clear();
        hud.mensaje(tx().abandonada);
        cerrarPanel();
    }

    function aceptar(m) {
        estado.activa = m.id; estado.progreso = 0; estado.visitados.clear();
        estado.noche = m.tipo === 'noche' ? (dia.esNoche ? 'esperando' : 'esperando') : null;
        sonidos.clic();
        if (m.jefe) { dar([[O[m.objeto], 1]]); ctx.alAceptarJefe && ctx.alAceptarJefe(m); }
        decirEspecial(m.amigo || 'venjy', L(m.aceptar));
        cerrarPanel();
        hud.mensaje(`${tx().nueva}: ${L(m.titulo)}`);
        if (m.tipo === 'hablar') completar(m); // en espera: se completa al hablar
    }

    function completar(m) {
        if (m.tipo === 'entregar') for (const [p, n] of m.pide) {
            let falta = n;
            for (const id of [].concat(p)) { const k = Math.min(falta, inventario.contar(id)); if (k) { inventario.quitar(id, k); falta -= k; } if (!falta) break; }
        }
        estado.hechas.add(m.id);
        estado.activa = null; estado.progreso = 0; estado.noche = null;
        amistad.sumar(m.amigo, 'mision');
        dar(m.premio);
        sonidos.nivel();
        // El agradecimiento no es un panel: el amigo lo dice en su globo, como en sus conversaciones
        cerrarPanel();
        if (hablarUI) hablarUI.soltar(); // por si una escena (el cuello de Gala) toma al amigo ahora
        // alCompletar puede devolver true si una escena dice el agradecimiento (p. ej. el cuello de Gala): no sale el globo suelto
        const conEscena = !!(ctx.alCompletar && ctx.alCompletar(m));
        if (!conEscena) decirEspecial(m.amigo, L(m.completada));
        hud.mensaje(`${tx().recibes} ${nombrePremio(m.premio)}`, 5);
    }

    // Jefe derrotado (lo llama jefes.js)
    function jefeDerrotado(id) {
        const j = JEFES.find(x => x.id === id);
        if (!j || estado.jefes.has(id)) return;
        estado.jefes.add(id);
        amistad.sumar('venjy', 'mision'); // las peleas de jefe son las misiones de Venjy
        if (estado.activa === id) { estado.activa = null; estado.progreso = 0; }
        dar(j.premio);
        if (j.vidaExtra) { estado.vidaExtra += j.vidaExtra; vida.vidaMax = 20 + estado.vidaExtra; vida.vida = vida.vidaMax; }
        decirEspecial('venjy', L(j.completada));
        sonidos.nivel();
        hud.mensaje(L(j.completada), 8);
        return j;
    }

    // ---------------------------------------------------------
    // Hablar
    // ---------------------------------------------------------
    function hablar(clave) {
        // Si le toca la escena de skin, va antes que el panel
        if (ctx.antesDeHablar && ctx.antesDeHablar(clave)) return;
        if (clave === 'venjy') return hablarVenjy();
        const activa = misionDe(estado.activa);
        if (activa && activa.amigo === clave) {
            if (cumplida(activa)) { completar(activa); return; }
            const cuerpo = [tituloMision(activa, tx().mision), parrafo(L(activa.pedido), 'dialogo'), parrafo(textoObjetivo(activa), 'objetivo'), listaPremio(activa.premio)];
            panel(clave, cuerpo, [[tx().cerrar, () => cerrarPanel()], [tx().abandonar, abandonar, 'secundario peligro']]);
            return;
        }
        const m = siguienteDe(clave);
        if (!m) { panel(clave, [parrafo(L(TEXTOS_VENJY.sinMas), 'dialogo')], [[tx().cerrar, () => cerrarPanel()]]); return; }
        if (activa) {
            panel(clave, [parrafo(L(m.pedido), 'dialogo'), parrafo(tx().ocupado(NOMBRES_AMIGO[activa.amigo || 'venjy']), 'aviso')],
                [[tx().cerrar, () => cerrarPanel()], [tx().abandonar, abandonar, 'secundario peligro']]);
            return;
        }
        panel(clave, [tituloMision(m, tx().mision), parrafo(L(m.pedido), 'dialogo'), parrafo(textoObjetivo(m), 'objetivo'), listaPremio(m.premio)],
            [[tx().aceptar, () => aceptar(m)], [tx().cerrar, () => cerrarPanel(), 'secundario']]);
    }

    function hablarVenjy() {
        const j = jefeSiguiente();
        const activa = misionDe(estado.activa);
        if (!j) { panel('venjy', [parrafo(L(TEXTOS_VENJY.todo), 'dialogo')], [[tx().cerrar, () => cerrarPanel()]]); return; }
        if (activa && activa.id === j.id) {
            // Si perdió el objeto, se lo vuelve a dar
            if (inventario.contar(O[j.objeto]) === 0 && !(ctx.jefeEnCurso && ctx.jefeEnCurso())) dar([[O[j.objeto], 1]]);
            panel('venjy', [tituloMision(j, tx().jefe), parrafo(L(j.pedido), 'dialogo'), parrafo(tx().usarAltar, 'objetivo')],
                [[tx().cerrar, () => cerrarPanel()], [tx().abandonar, abandonar, 'secundario peligro']]);
            return;
        }
        const n = amigasHechas();
        if (n < j.requiere) { panel('venjy', [tituloMision(j, tx().jefe), parrafo(L(j.bloqueada).replace('{n}', n), 'dialogo')], [[tx().cerrar, () => cerrarPanel()]]); return; }
        if (activa) { panel('venjy', [parrafo(L(TEXTOS_VENJY.activa), 'dialogo'), parrafo(tx().ocupado(NOMBRES_AMIGO[activa.amigo || 'venjy']), 'aviso')], [[tx().cerrar, () => cerrarPanel()], [tx().abandonar, abandonar, 'secundario peligro']]); return; }
        panel('venjy', [tituloMision(j, tx().jefe), parrafo(L(j.pedido), 'dialogo'), listaPremio(j.premio, j.vidaExtra ? tx().vidaExtra : '')],
            [[tx().aceptar, () => aceptar(j)], [tx().cerrar, () => cerrarPanel(), 'secundario']]);
    }

    // Clic derecho: ¿apunta a un amigo? (rayo contra sus cajas, hasta 4,5 bloques)
    const dir = new THREE.Vector3();
    function interactuar(rayoCaja, limite = 4.5) {
        camara.getWorldDirection(dir);
        const o = camara.position;
        let mejor = null, mejorT = limite;
        const blancos = personas(), correo = venjys.lista.find(n => n.lugar === 'correo');
        if (correo) blancos.push({ clave: 'venjy@correo', n: correo });
        for (const p of blancos) {
            if (!p.n.p.g.visible) continue;
            const c = cajaDe(p.n);
            if (Math.abs(c.x - o.x) > 6 || Math.abs(c.z - o.z) > 6) continue;
            const t = rayoCaja(o.x, o.y, o.z, dir.x, dir.y, dir.z, c.x, c.y, c.z, c.ancho, c.alto);
            if (t >= 0 && t < mejorT) { mejorT = t; mejor = p; }
        }
        if (!mejor) return false;
        abrirCon(mejor.clave);
        return true;
    }
    // ¿Tiene algo de misión para ti («!» o «?» sobre la cabeza)? Entonces el panel abre en «Misión»; si no, en «Hablar»
    function tieneAviso(clave) {
        const m = misionDe(estado.activa), libre = !estado.activa;
        if (clave === 'venjy') { const j = jefeSiguiente(); return !!((j && libre && amigasHechas() >= j.requiere) || (m && m.jefe)); }
        return !!((m && m.amigo === clave) || (libre && siguienteDe(clave)));
    }
    function abrirCon(clave) {
        if (clave === 'venjy@correo') { encargoCorreo(); return; }
        if (ctx.antesDeHablar && ctx.antesDeHablar(clave)) return;
        if (tieneAviso(clave)) hablar(clave); else conversar(clave);
    }
    // Minijuego terminado (lo avisa minijuego.js): amistad con quienes juegan
    function alMinijuego(juego, final) {
        for (const c of AMIGOS_MINIJUEGO[juego] || []) {
            amistad.sumar(c, 'minijuego');
            if (FINALES_GANA.has(final)) amistad.sumar(c, 'gana');
        }
    }

    // ---------------------------------------------------------
    let relojVisita = 0;
    function actualizar(dt) {
        const m = misionDe(estado.activa);
        // Visitar lugares
        if (m && m.tipo === 'visitar') {
            relojVisita += dt;
            if (relojVisita > 1) {
                relojVisita = 0;
                for (const l of terreno.lugares || []) if (Math.hypot(l.x - jugador.pos.x, l.z - jugador.pos.z) < l.radio) estado.visitados.add(l.clave);
                const antes = estado.progreso;
                estado.progreso = estado.visitados.size;
                if (estado.progreso >= m.n && antes < m.n) { hud.mensaje(tx().listo); sonidos.nivel(); }
            }
        }
        // Sobrevivir una noche: empieza al ponerse el sol y termina al amanecer
        if (m && m.tipo === 'noche') {
            if (estado.noche === 'esperando' && dia.esNoche) estado.noche = 'noche';
            else if (estado.noche === 'noche' && !dia.esNoche) { estado.noche = 'lista'; hud.mensaje(tx().listo); sonidos.nivel(); }
            else if (estado.noche === 'fallida' && !dia.esNoche) estado.noche = 'esperando';
        }
        // Marcadores y globos especiales
        const libre = !estado.activa;
        const jefe = jefeSiguiente();
        // Panel lateral abierto (Hablar o la tienda sin cine): el globo del amigo con quien hablas se encaja en
        // pantalla, sin tapar su cabeza ni el panel, y se achica si hace falta
        zonasPantalla.length = 0;
        const conPanel = document.body.classList.contains('panel-lado') ? (hablarUI && hablarUI.charla && hablarUI.charla.clave) : null;
        if (conPanel) {
            // El panel y el minimapa (arriba a la derecha)
            const W = window.innerWidth || 1, H = window.innerHeight || 1;
            for (const el of [document.querySelector('.capa-hablar .panel-mision'), document.querySelector('.mm-pequeno')]) {
                if (!el || !el.offsetParent) continue;
                const r = el.getBoundingClientRect();
                zonasPantalla.push({ x0: r.left / W * 2 - 1 - 0.02, x1: r.right / W * 2 - 1 + 0.02, y0: 1 - r.bottom / H * 2 - 0.02, y1: 1 - r.top / H * 2 + 0.02 });
            }
        }
        // Escena de amistad (bloque 6b): el globo tampoco tapa el botón «Saltar»
        const saltarA = document.body.classList.contains('en-amistad') && document.querySelector('.saltar-amistad');
        if (saltarA) {
            const W = window.innerWidth || 1, H = window.innerHeight || 1, r = saltarA.getBoundingClientRect();
            zonasPantalla.push({ x0: r.left / W * 2 - 1 - 0.02, x1: r.right / W * 2 - 1 + 0.02, y0: 1 - r.bottom / H * 2 - 0.02, y1: 1 - r.top / H * 2 + 0.02 });
        }
        for (const p of personas()) {
            const s = marcaDe(p.clave);
            const n = p.n;
            let tex = null;
            if (p.clave === 'venjy') {
                if (jefe && libre && amigasHechas() >= jefe.requiere) tex = texExcl;
                else if (m && m.jefe) tex = texPregGris;
            } else if (m && m.amigo === p.clave) tex = cumplida(m) ? texPreg : texPregGris;
            else if (libre && siguienteDe(p.clave)) tex = texExcl;
            s.visible = !!tex && n.p.g.visible && !ocultarMarcas;
            if (s.visible) {
                if (s.material.map !== tex) { s.material.map = tex; s.material.needsUpdate = true; }
                s.position.set(n.x, (n.y ?? 0) + 2.45 * escalaDe(n) + 0.35 + Math.sin(performance.now() / 300) * 0.06, n.z);
            }
            const e = especiales.get(p.clave);
            if (e && e.t > 0) {
                e.t -= dt;
                n.globo && n.globo.sp && (n.globo.sp.visible = false);
                const d = Math.hypot(n.x - jugador.pos.x, n.z - jugador.pos.z);
                if (conPanel === p.clave) {
                    const s = escalaDe(n), cabeza = [{ x: n.x, y: (n.y ?? 0) + 1.55 * s, z: n.z, r: 0.45 * s, tipo: 'cabeza', quien: p.clave }];
                    e.globo.actualizar(dt, e.t > 0 && d < 14, n.x, (n.y ?? 0) + 2.75 * s, n.z, camara, () => cabeza);
                } else e.globo.actualizar(dt, e.t > 0 && d < 14, n.x, (n.y ?? 0) + 2.75 * escalaDe(n), n.z);
            } else if (e) e.globo.actualizar(dt, false, n.x, 0, n.z);
        }
        pintarSeguimiento();
        if (hablarUI) hablarUI.actualizar(dt);
    }

    function serializar() {
        return { hechas: [...estado.hechas], activa: estado.activa, progreso: estado.progreso, visitados: [...estado.visitados], noche: estado.noche, jefes: [...estado.jefes], vidaExtra: estado.vidaExtra, escenasSkin: [...estado.escenasSkin], minijuegos: [...estado.minijuegos], carta: estado.carta ? { ...estado.carta } : null, amistad: amistad.serializar() };
    }
    function cargar(o) {
        if (!o) return;
        estado.hechas = new Set(o.hechas || []);
        estado.activa = o.activa || null;
        estado.progreso = o.progreso || 0;
        estado.visitados = new Set(o.visitados || []);
        estado.noche = o.noche || null;
        estado.jefes = new Set(o.jefes || []);
        estado.vidaExtra = o.vidaExtra || 0;
        estado.escenasSkin = new Set(o.escenasSkin || []);
        estado.minijuegos = new Set(o.minijuegos || []);
        estado.carta = o.carta && typeof o.carta.para === 'string' ? { dia: o.carta.dia | 0, para: o.carta.para, entregada: !!o.carta.entregada } : null;
        amistad.cargar(o.amistad); // guardado viejo (sin amistad): parte en blanco, con la amistad inicial de tu skin
        vida.vidaMax = 20 + estado.vidaExtra;
    }

    return {
        estado, interactuar, hablar, conversar, abrirCon, actualizar, serializar, cargar, alMatar, alDormir, alMorir, jefeDerrotado, misionDe, amigasHechas, alMinijuego, amistad,
        get activa() { return misionDe(estado.activa); },
        get hablarUI() { return hablarUI; },
        setIdioma(l) { idioma = l; firma = ''; tienda.setIdioma(l); if (hablarUI) hablarUI.setIdioma(l); },
        set ocultarMarcas(v) { ocultarMarcas = v; },
        // { texto(clave) -> { texto, motivo } | null, jugar(clave) } (main.js lo conecta con minijuego.js)
        set minijuego(o) { botonMinijuego = o; },
        // { jugar(clave, tipo), momento(clave), grupo(clave) } (main.js: animaciones de amistad, momentos especiales y saludo del grupo)
        set escenaAmistad(o) { escenaAmistad = o; },
        // Atajos de depuración
        completarActiva() { const m = misionDe(estado.activa); if (m && !m.jefe) { estado.progreso = 999; estado.noche = 'lista'; if (m.tipo === 'entregar') for (const [p, n] of m.pide) inventario.agregar([].concat(p)[0], n); hablar(m.amigo); } }
    };
}
