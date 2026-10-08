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
import { crearGlobo } from '../criaturas/cuerpo.js';
import { NOMBRES_MOB } from './enemigos.js';
import { sonidos } from './sonidos.js';

const TXT = {
    es: { aceptar: 'Aceptar', entregar: 'Entregar', cerrar: 'Cerrar', abandonar: 'Abandonar misión', premio: 'Premio', progreso: 'Progreso',
        ocupado: n => `Ya tienes una misión activa con ${n}. Termínala o abandónala primero.`, falta: 'Todavía te falta:', mision: 'Misión',
        matar: (m, n) => `Eliminar ${n} × ${m}`, cualquiera: 'monstruos', deNoche: ' (de noche)', visitar: n => `Visitar los ${n} lugares`, noche: 'Sobrevivir una noche sin dormir', hablar: 'Hablar con ella',
        completas: (n, t) => `Misiones: ${n}/${t}`, nueva: 'Nueva misión', listo: '¡Listo para entregar!', abandonada: 'Misión abandonada', recibes: 'Recibes:', jefe: 'Pelea de jefe',
        usarAltar: 'Usa el objeto en el altar (clic derecho)', vidaExtra: '+1 corazón máximo' },
    en: { aceptar: 'Accept', entregar: 'Hand in', cerrar: 'Close', abandonar: 'Abandon quest', premio: 'Reward', progreso: 'Progress',
        ocupado: n => `You already have an active quest with ${n}. Finish or abandon it first.`, falta: 'You still need:', mision: 'Quest',
        matar: (m, n) => `Defeat ${n} × ${m}`, cualquiera: 'monsters', deNoche: ' (at night)', visitar: n => `Visit the ${n} places`, noche: 'Survive a night without sleeping', hablar: 'Talk to her',
        completas: (n, t) => `Quests: ${n}/${t}`, nueva: 'New quest', listo: 'Ready to hand in!', abandonada: 'Quest abandoned', recibes: 'You get:', jefe: 'Boss fight',
        usarAltar: 'Use the item on the altar (right click)', vidaExtra: '+1 max heart' }
};

export function crearMisiones(ctx) {
    const { grupo, dy, jugador, camara, inventario, entidades, vida, dia, hud, terreno, npcs, amigos, venjys, abrirPanel, cerrarPanel } = ctx;
    let idioma = ctx.idioma || 'es';
    const tx = () => TXT[idioma];
    const L = o => (o ? o[idioma] || o.es : '');
    // escenasSkin: amigos que ya reaccionaron a tu skin en esta partida (escenas-skin.js)
    const estado = { hechas: new Set(), activa: null, progreso: 0, visitados: new Set(), noche: null, jefes: new Set(), vidaExtra: 0, escenasSkin: new Set() };
    let ocultarMarcas = false;

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
    function alMatar(tipo) {
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
        if (!e) { e = { globo: crearGlobo(grupo), t: 0 }; especiales.set(clave, e); }
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
        // La cámara de cine encuadra al amigo mientras el panel está abierto
        const p = personas().find(x => x.clave === clave);
        abrirPanel(el, { enfocar: p ? p.n : null });
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
        dar(m.premio);
        sonidos.nivel();
        // El agradecimiento no es un panel: el amigo lo dice en su globo, como en sus conversaciones
        cerrarPanel();
        decirEspecial(m.amigo, L(m.completada));
        hud.mensaje(`${tx().recibes} ${nombrePremio(m.premio)}`, 5);
        ctx.alCompletar && ctx.alCompletar(m);
    }

    // Jefe derrotado (lo llama jefes.js)
    function jefeDerrotado(id) {
        const j = JEFES.find(x => x.id === id);
        if (!j || estado.jefes.has(id)) return;
        estado.jefes.add(id);
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
        for (const p of personas()) {
            if (!p.n.p.g.visible) continue;
            const c = cajaDe(p.n);
            if (Math.abs(c.x - o.x) > 6 || Math.abs(c.z - o.z) > 6) continue;
            const t = rayoCaja(o.x, o.y, o.z, dir.x, dir.y, dir.z, c.x, c.y, c.z, c.ancho, c.alto);
            if (t >= 0 && t < mejorT) { mejorT = t; mejor = p; }
        }
        if (!mejor) return false;
        hablar(mejor.clave);
        return true;
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
                e.globo.actualizar(dt, e.t > 0 && d < 14, n.x, (n.y ?? 0) + 2.75 * escalaDe(n), n.z);
            } else if (e) e.globo.actualizar(dt, false, n.x, 0, n.z);
        }
        pintarSeguimiento();
    }

    function serializar() {
        return { hechas: [...estado.hechas], activa: estado.activa, progreso: estado.progreso, visitados: [...estado.visitados], noche: estado.noche, jefes: [...estado.jefes], vidaExtra: estado.vidaExtra, escenasSkin: [...estado.escenasSkin] };
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
        vida.vidaMax = 20 + estado.vidaExtra;
    }

    return {
        estado, interactuar, hablar, actualizar, serializar, cargar, alMatar, alDormir, alMorir, jefeDerrotado, misionDe, amigasHechas,
        get activa() { return misionDe(estado.activa); },
        setIdioma(l) { idioma = l; firma = ''; },
        set ocultarMarcas(v) { ocultarMarcas = v; },
        // Atajos de depuración
        completarActiva() { const m = misionDe(estado.activa); if (m && !m.jefe) { estado.progreso = 999; estado.noche = 'lista'; if (m.tipo === 'entregar') for (const [p, n] of m.pide) inventario.agregar([].concat(p)[0], n); hablar(m.amigo); } }
    };
}
