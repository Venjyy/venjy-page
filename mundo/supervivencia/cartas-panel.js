// VENJY · Supervivencia · Duelo de Cartas Pixel
// Capa visual del motor puro: toda opción se obtiene de jugadas(e).
import { CARTAS, FAMILIAS, NIVELES, PIDE_PROPIA, TXT_CARTAS } from './cartas-datos.js';
import { partidaNivel, jugadas, aplicar, jugadaIA, atkDe, defDe } from './cartas.js';
import { arteCarta, arteReverso } from './cartas-arte.js';

export function crearPanelCartas(ctx = {}) {
    let idioma = ctx.idioma || 'es', e = null, nivel = 'facil', eleccion = null, timer = 0, abierto = false;
    let registro = [], mostrandoReglas = false, postura = 'ata';
    const L = o => (o && (o[idioma] || o.es)) || '';
    const raiz = document.createElement('section');
    raiz.className = 'cartas-capa'; raiz.hidden = true;
    document.body.appendChild(raiz);
    const acciones = () => (e ? jugadas(e) : []);
    const ladoObjetivo = a => {
        const d = a.t === 'hechizo' ? CARTAS[e.jug[0].mano[a.m]] : null;
        return d && (PIDE_PROPIA.has(d.efecto) || d.efecto === 'abrazo') ? 0 : 1;
    };
    const boton = (texto, fn, clase = '', disabled = false) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = `boton cartas-boton ${clase}`; b.textContent = texto; b.disabled = disabled;
        if (!disabled) b.addEventListener('click', fn);
        return b;
    };
    const interaccion = (el, fn) => {
        el.tabIndex = 0; el.setAttribute('role', 'button');
        el.addEventListener('click', fn);
        el.addEventListener('keydown', ev => { if (ev.code === 'Enter' || ev.code === 'Space') { ev.preventDefault(); fn(); } });
    };
    function iniciar(n) {
        nivel = NIVELES[n] ? n : 'facil'; e = partidaNivel(nivel); eleccion = null; registro = []; mostrandoReglas = false; postura = 'ata';
        pintar(); programar();
    }
    function cerrar() {
        window.clearTimeout(timer); timer = 0; abierto = false; e = null; eleccion = null; raiz.hidden = true; raiz.textContent = '';
        if (ctx.alCerrar) ctx.alCerrar();
    }
    function programar() {
        window.clearTimeout(timer);
        if (!e || e.ganador !== null) return;
        if (e.fase === 'robo') timer = window.setTimeout(() => ejecutar(acciones().find(a => a.t === 'robar')), e.turno === 0 ? 400 : 700);
        else if (e.turno === 1) timer = window.setTimeout(() => ejecutar(jugadaIA(e, NIVELES[nivel].ia)), 700);
    }
    function nombre(id) { return L(CARTAS[id].nombre); }
    function sumarRegistro(a, antes, id) {
        const quien = antes === 0 ? L(TXT_CARTAS.tu) : L(TXT_CARTAS.lucho);
        let texto = '';
        if (a.t === 'robar') texto = `${quien}: ${L(TXT_CARTAS.robar)}`;
        if (a.t === 'invocar') texto = `${quien}: ${L(TXT_CARTAS.invocar)} ${nombre(e.jug[antes].zonas[a.z].id)}`;
        if (a.t === 'hechizo') texto = `${quien}: ${nombre(id)}`;
        if (a.t === 'atacar') texto = `${quien}: ${a.obj === -1 ? L(TXT_CARTAS.directo) : L(TXT_CARTAS.atacar)}`;
        if (a.t === 'modo') texto = `${quien}: ${L(TXT_CARTAS.postura)}`;
        if (a.t === 'terminar') texto = `${quien}: ${L(TXT_CARTAS.pasa)}`;
        if (texto) registro.unshift(texto);
        registro = registro.slice(0, 5);
    }
    function ejecutar(a) {
        if (!a || !e || e.ganador !== null || !acciones().some(b => JSON.stringify(a) === JSON.stringify(b))) return;
        const antes = e.turno, id = (a.t === 'invocar' || a.t === 'hechizo') ? e.jug[antes].mano[a.m] : null;
        aplicar(e, a); eleccion = null; sumarRegistro(a, antes, id); pintar(); programar();
    }
    function elegirCarta(m) {
        const a = acciones().filter(x => x.m === m && (x.t === 'invocar' || x.t === 'hechizo'));
        if (!a.length || e.turno !== 0) return;
        const d = CARTAS[e.jug[0].mano[m]];
        if (d.tipo === 'criatura') {
            postura = 'ata';
            eleccion = { tipo: 'carta', m, modo: postura, acciones: a.filter(x => x.modo === postura) }; pintar(); return;
        }
        if (a.length === 1 && a[0].z === undefined && a[0].obj === undefined && a[0].obj2 === undefined) return ejecutar(a[0]);
        eleccion = { tipo: 'carta', m, acciones: a }; pintar();
    }
    function elegirZona(j, z) {
        if (e.turno !== 0) return;
        if (eleccion && eleccion.tipo === 'carta') {
            const usaZona = eleccion.acciones.some(x => x.z !== undefined);
            const a = usaZona
                ? (j === 0 ? eleccion.acciones.filter(x => x.z === z) : [])
                : eleccion.acciones.filter(x => ladoObjetivo(x) === j && x.obj === z);
            if (!a.length) return;
            const d = CARTAS[e.jug[0].mano[eleccion.m]];
            if (d.efecto === 'abrazo' && !usaZona) { eleccion = { tipo: 'abrazo', acciones: a, primero: z }; pintar(); return; }
            // Un hechizo con objetivo se juega al tocar la zona (antes pedía tocarla dos veces)
            if (a.length === 1) return ejecutar(a[0]); // una sola opción: sin pedir objetivo
            eleccion = { tipo: 'objetivo', acciones: a, zona: z }; pintar(); return;
        }
        if (eleccion && eleccion.tipo === 'abrazo') {
            if (z === eleccion.primero) return;
            const a = eleccion.acciones.find(x => x.obj === eleccion.primero && x.obj2 === z);
            if (a) ejecutar(a);
            return;
        }
        if (eleccion && eleccion.tipo === 'objetivo') {
            const a = eleccion.acciones.find(x => ladoObjetivo(x) === j && (x.obj === z || x.obj2 === z));
            if (a) ejecutar(a);
            return;
        }
        if (j === 0 && e.jug[0].zonas[z]) {
            const a = acciones().filter(x => (x.t === 'atacar' || x.t === 'modo') && x.z === z);
            if (a.length) { eleccion = { tipo: 'propia', z, acciones: a }; pintar(); }
        }
        if (eleccion && (eleccion.tipo === 'propia' || eleccion.tipo === 'atacar') && j === 1) {
            const a = eleccion.acciones.find(x => x.obj === z); if (a) ejecutar(a);
        }
    }
    // Carta con arte (cartas-arte.js): el lienzo va de fondo y los textos encima, en PixelCraft.
    function cartaConArte(el, id, d, atk, def) {
        el.classList.add('con-arte', d.tipo === 'hechizo' ? 'es-hechizo' : 'es-criatura');
        if (L(d.nombre).length >= 26) el.classList.add('nombre-largo');
        el.style.backgroundImage = `url(${arteCarta(id)})`;
        el.innerHTML = `<span class="carta-nombre"></span><span class="carta-familia"></span><span class="carta-estadisticas"></span><span class="carta-texto"></span>`;
        const familia = d.tipo === 'criatura' ? L(FAMILIAS[d.familia]) : L(TXT_CARTAS.hechizo);
        el.children[0].textContent = L(d.nombre); el.children[1].textContent = familia; el.children[3].textContent = L(d.texto);
        let resumen = `${L(d.nombre)} · ${familia}`;
        if (d.tipo === 'criatura') {
            const a = document.createElement('span'), b = document.createElement('span');
            a.className = `carta-atk${atk > d.atk ? ' sube' : atk < d.atk ? ' baja' : ''}`; a.textContent = String(atk);
            b.className = `carta-def${def > d.def ? ' sube' : def < d.def ? ' baja' : ''}`; b.textContent = String(def);
            el.children[2].append(a, b);
            resumen += ` · ${L(TXT_CARTAS.atk)} ${atk} / ${L(TXT_CARTAS.def)} ${def}`;
        }
        el.title = `${resumen} · ${L(d.texto)}`; el.setAttribute('aria-label', el.title);
        return el;
    }
    function carta(c, j, mano = false, m = null) {
        const d = CARTAS[mano ? c : c.id];
        const el = document.createElement('div'); el.className = `carta-pixel ${mano ? 'en-mano' : ''} ${!mano && c.modo === 'def' ? 'defensa' : ''}`;
        const id = mano ? c : c.id;
        if (arteCarta(id)) {
            if (mano) { interaccion(el, () => elegirCarta(m)); if (eleccion && eleccion.m === m) el.classList.add('seleccionada'); }
            return mano ? cartaConArte(el, id, d, d.atk, d.def) : cartaConArte(el, id, d, atkDe(e, j, c), defDe(e, j, c));
        }
        if (mano || !c) {
            el.innerHTML = `<span class="carta-nombre"></span><span class="carta-familia"></span><span class="carta-estadisticas"></span><span class="carta-texto"></span>`;
            el.children[0].textContent = L(d.nombre); el.children[1].textContent = d.tipo === 'criatura' ? L(FAMILIAS[d.familia]) : L(TXT_CARTAS.hechizo);
            el.children[2].textContent = d.tipo === 'criatura' ? `${L(TXT_CARTAS.atk)} ${d.atk} / ${L(TXT_CARTAS.def)} ${d.def}` : '';
            el.children[3].textContent = L(d.texto);
            if (mano) { interaccion(el, () => elegirCarta(m)); if (eleccion && eleccion.m === m) el.classList.add('seleccionada'); }
            return el;
        }
        el.innerHTML = '<span class="carta-nombre"></span><span class="carta-familia"></span><span class="carta-estadisticas"></span><span class="carta-texto"></span>';
        el.children[0].textContent = L(d.nombre); el.children[1].textContent = L(FAMILIAS[d.familia]);
        el.children[2].textContent = `${L(TXT_CARTAS.atk)} ${atkDe(e, j, c)} / ${L(TXT_CARTAS.def)} ${defDe(e, j, c)}`; el.children[3].textContent = L(d.texto);
        return el;
    }
    function zona(j, z) {
        const c = e.jug[j].zonas[z], el = document.createElement('div'); el.className = 'cartas-zona';
        const marca = !!(eleccion && (() => {
            if (eleccion.tipo === 'carta') {
                const usaZona = eleccion.acciones.some(a => a.z !== undefined);
                return usaZona ? j === 0 && eleccion.acciones.some(a => a.z === z) : eleccion.acciones.some(a => ladoObjetivo(a) === j && a.obj === z);
            }
            if (eleccion.tipo === 'abrazo') return eleccion.acciones.some(a => a.obj === eleccion.primero && a.obj2 === z);
            if (eleccion.tipo === 'propia' || eleccion.tipo === 'atacar') return eleccion.acciones.some(a => ladoObjetivo(a) === j && a.obj === z);
            return eleccion.acciones.some(a => ladoObjetivo(a) === j && (a.obj === z || a.obj2 === z));
        })());
        if (marca) el.classList.add('valida');
        const etiqueta = document.createElement('span'); etiqueta.className = 'cartas-zona-etiqueta'; etiqueta.textContent = `${L(TXT_CARTAS.zona)} ${z + 1}`; el.appendChild(etiqueta);
        if (c) el.appendChild(carta(c, j));
        if ((marca || (j === 0 && c)) && e.turno === 0) interaccion(el, () => elegirZona(j, z));
        return el;
    }
    function mesa(j) {
        const J = e.jug[j], bloque = document.createElement('section'); bloque.className = `cartas-mesa ${j ? 'rival' : 'propia'}`;
        const cab = document.createElement('div'); cab.className = 'cartas-cabecera-mesa';
        const titulo = document.createElement('span'); titulo.textContent = j ? L(TXT_CARTAS.lucho) : L(TXT_CARTAS.mesa);
        const vida = document.createElement('span'); vida.textContent = `${L(TXT_CARTAS.vida)} ${J.vida}`;
        const mazo = document.createElement('span'); mazo.textContent = `${L(TXT_CARTAS.mazo)} ${J.mazo.length}`;
        cab.append(titulo, vida, mazo); bloque.appendChild(cab);
        if (j) { const reversos = document.createElement('div'); reversos.className = 'cartas-reversos'; for (let i = 0; i < J.mano.length; i++) { const r = document.createElement('i'); r.className = 'carta-reverso'; const img = arteReverso(); if (img) { r.classList.add('con-arte'); r.style.backgroundImage = `url(${img})`; } reversos.appendChild(r); } bloque.appendChild(reversos); }
        const zonas = document.createElement('div'); zonas.className = 'cartas-zonas'; for (let z = 0; z < 3; z++) zonas.appendChild(zona(j, z)); bloque.appendChild(zonas);
        return bloque;
    }
    function controles() {
        const fila = document.createElement('div'); fila.className = 'cartas-controles';
        const legales = acciones(), propia = e.turno === 0 && e.ganador === null;
        fila.append(
            boton(L(TXT_CARTAS.robar), () => ejecutar(legales.find(a => a.t === 'robar')), '', !propia || e.fase !== 'robo'),
            boton(L(TXT_CARTAS.terminar), () => ejecutar(legales.find(a => a.t === 'terminar')), '', !propia || !legales.some(a => a.t === 'terminar')),
            boton(L(TXT_CARTAS.cambiar), () => { if (eleccion && eleccion.tipo === 'propia') ejecutar(legales.find(a => a.t === 'modo' && a.z === eleccion.z)); }, '', !propia || !eleccion || eleccion.tipo !== 'propia' || !legales.some(a => a.t === 'modo' && a.z === eleccion.z)),
            boton('?', () => { mostrandoReglas = !mostrandoReglas; pintar(); }, 'cartas-ayuda')
        );
        if (eleccion && (eleccion.tipo === 'propia' || eleccion.tipo === 'atacar') && eleccion.acciones.some(a => a.obj === -1)) fila.appendChild(boton(L(TXT_CARTAS.directo), () => ejecutar(eleccion.acciones.find(a => a.obj === -1)), 'cartas-directo'));
        if (eleccion && eleccion.tipo === 'carta' && CARTAS[e.jug[0].mano[eleccion.m]].tipo === 'criatura') {
            const selector = document.createElement('div'); selector.className = 'cartas-postura';
            for (const modo of ['ata', 'def']) {
                const b = boton(L(modo === 'ata' ? TXT_CARTAS.ataque : TXT_CARTAS.defensa), () => {
                    postura = modo; eleccion.modo = modo; eleccion.acciones = acciones().filter(a => a.m === eleccion.m && a.modo === modo); pintar();
                }, modo === postura ? 'elegido' : ''); selector.appendChild(b);
            }
            fila.appendChild(selector);
            if (eleccion.acciones.some(a => a.t === 'invocar' && e.jug[0].zonas[a.z])) {
                const aviso = document.createElement('p'); aviso.className = 'cartas-aviso'; aviso.textContent = L(TXT_CARTAS.reemplaza); fila.appendChild(aviso);
            }
        }
        return fila;
    }
    function pintarInicio() {
        const caja = document.createElement('div'); caja.className = 'cartas-inicio';
        const h = document.createElement('h1'); h.textContent = L(TXT_CARTAS.titulo);
        const p = document.createElement('p'); p.textContent = L(TXT_CARTAS.elegirNivel);
        caja.append(h, p, boton(L(TXT_CARTAS.facil), () => iniciar('facil'), nivel === 'facil' ? 'elegido' : ''), boton(L(TXT_CARTAS.medio), () => iniciar('medio'), nivel === 'medio' ? 'elegido' : ''), boton(L(TXT_CARTAS.salir), cerrar, 'secundario'));
        raiz.appendChild(caja);
    }
    function pintarFin() {
        const fin = document.createElement('div'); fin.className = 'cartas-fin';
        const h = document.createElement('h2'); h.textContent = L(e.ganador === 0 ? TXT_CARTAS.ganaste : e.ganador === 1 ? TXT_CARTAS.perdiste : TXT_CARTAS.empate);
        const p = document.createElement('p'); p.textContent = L(TXT_CARTAS.motivo[e.motivo]);
        fin.append(h, p, boton(L(TXT_CARTAS.otraVez), () => { e = null; pintar(); }), boton(L(TXT_CARTAS.salir), cerrar, 'secundario')); raiz.appendChild(fin);
    }
    function pintar() {
        raiz.textContent = ''; if (!e) { pintarInicio(); return; }
        const tablero = document.createElement('div'); tablero.className = 'cartas-tablero';
        const estado = document.createElement('div'); estado.className = 'cartas-estado'; estado.textContent = e.turno === 0 ? L(TXT_CARTAS.tuTurno) : L(TXT_CARTAS.suTurno);
        const centro = document.createElement('aside'); centro.className = 'cartas-registro'; const rh = document.createElement('h2'); rh.textContent = L(TXT_CARTAS.registro); centro.appendChild(rh);
        for (const r of registro) { const l = document.createElement('p'); l.textContent = r; centro.appendChild(l); }
        tablero.append(estado, mesa(1), centro, mesa(0));
        const mano = document.createElement('div'); mano.className = 'cartas-mano'; const mh = document.createElement('span'); mh.className = 'cartas-mano-titulo'; mh.textContent = L(TXT_CARTAS.mano); mano.appendChild(mh);
        e.jug[0].mano.forEach((id, m) => mano.appendChild(carta(id, 0, true, m)));
        tablero.append(mano, controles());
        if (mostrandoReglas) { const reglas = document.createElement('div'); reglas.className = 'cartas-reglas'; for (const r of TXT_CARTAS.reglas) { const p = document.createElement('p'); p.textContent = L(r); reglas.appendChild(p); } tablero.appendChild(reglas); }
        raiz.appendChild(tablero); if (e.ganador !== null) pintarFin();
    }
    const tecla = ev => { if (abierto && ev.code === 'Escape' && !ev.repeat) { ev.preventDefault(); cerrar(); } };
    document.addEventListener('keydown', tecla);
    return {
        abrir(n = 'facil') { nivel = NIVELES[n] ? n : 'facil'; abierto = true; raiz.hidden = false; e = null; pintar(); },
        cerrar,
        get activo() { return abierto; },
        setIdioma(l) { idioma = l === 'en' ? 'en' : 'es'; if (abierto) pintar(); }
    };
}
