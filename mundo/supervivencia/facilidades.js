// =========================================================
// VENJY · Supervivencia · Facilidades de misión (7d-2), cableado con el juego
// Lógica y datos en facilidades-datos.js (probados en Node). Aquí solo se conecta con el mundo:
//   · decorados que quedan puestos una vez por mundo (huerto de Lalo, parche de grava, horno de la gatera),
//     cuando el jugador pasa cerca y sus chunks están cargados;
//   · pista de la misión activa (se busca al aceptar, una vez; si no hay nada a 64 bloques se reintenta al
//     alejarse 32), con marca en el minimapa y rumbo en el seguimiento;
//   · monstruo garantizado por noche (enemigos.garantizar);
//   · multiplicadores de la pesca.
// El estado vive en misiones.estado.fac (se guarda con las misiones, por jugador).
// =========================================================
import {
    facilidadDe, RADIO_PISTA, textoPista, buscarArena, crearGarantia, elegirSitio,
    HUERTO, GRAVA, planoHuerto, planoGrava, planoHorno
} from './facilidades-datos.js';
import { buscarSubsuelo } from './subsuelo.js';

const CERCA_DECORADO = 90; // bloques: se coloca al pasar a menos de esto

export function crearFacilidades({ mundo, terreno, dy, jugador, dia, enemigos, agricultura, misiones, idioma = 'es', colocar = true }) {
    const fac = () => misiones.estado.fac;
    const garantia = crearGarantia();
    let idiomaActual = idioma;
    let reloj = 0, relojNoche = 0;
    const planes = new Map(); // nombre -> { x, z, h?, bloques, cultivos? } | null (sin sitio)
    const alturaDe = (x, z) => terreno.HT[z * terreno.BW + x] + dy;

    // ---- Decorados que quedan puestos ----
    const DECORADOS = {
        huerto() {
            const l = (terreno.lugares || []).find(p => p.clave === 'iglu');
            const s = l && elegirSitio(terreno, l, HUERTO.w, HUERTO.d);
            if (!s) return null;
            const h = s.h + dy;
            return { x: s.x0 + HUERTO.w / 2, z: s.z0 + HUERTO.d / 2, y: h, ...planoHuerto(s.x0, s.z0, h, alturaDe) };
        },
        grava() {
            const l = (terreno.lugares || []).find(p => p.clave === 'atalaya');
            const s = l && elegirSitio(terreno, l, GRAVA.w, GRAVA.d, { dMin: 8, dMax: 20 });
            if (!s) return null;
            return { x: s.x0 + GRAVA.w / 2, z: s.z0 + GRAVA.d / 2, y: s.h + dy, ...planoGrava(s.x0, s.z0, alturaDe) };
        },
        horno() {
            const g = terreno.gatera;
            if (!g) return null;
            const p = planoHorno(g, dy), [x, y, z] = p.bloques[0];
            return { x, z, y, ...p };
        }
    };
    function decorar() {
        const hechos = fac().deco;
        for (const nombre in DECORADOS) {
            if (hechos.has(nombre)) continue;
            if (!planes.has(nombre)) planes.set(nombre, DECORADOS[nombre]());
            const p = planes.get(nombre);
            if (!p) continue;
            if (Math.hypot(p.x - jugador.pos.x, p.z - jugador.pos.z) > CERCA_DECORADO) continue;
            // Solo con el chunk de la zona cargado (la y es la del suelo del decorado)
            if (mundo.bloque(Math.floor(p.x), p.y, Math.floor(p.z)) === -1) continue;
            mundo.editarLote(p.bloques);
            for (const [x, y, z] of p.cultivos || []) agricultura.registrar(x, y, z);
            hechos.add(nombre);
        }
    }

    // ---- Pista de la misión activa ----
    function actualizarPista() {
        const m = misiones.activa, def = m && facilidadDe(m.id) && facilidadDe(m.id).pista, f = fac();
        if (!def) { f.pista = null; return; }
        const px = jugador.pos.x, pz = jugador.pos.z;
        const p = f.pista;
        const reintentar = p && p.id === m.id && p.nada && Math.hypot(px - p.ox, pz - p.oz) > 32;
        if (p && p.id === m.id && !reintentar) return;
        const radio = def.radio || RADIO_PISTA;
        const r = def.arena ? buscarArena(terreno, px, pz, radio) : buscarSubsuelo(terreno, def, px, pz, radio);
        f.pista = r ? { id: m.id, x: r.x + 0.5, y: r.y, z: r.z + 0.5, arena: !!def.arena } : { id: m.id, nada: true, ox: px, oz: pz };
    }

    // ---- Monstruo garantizado ----
    function actualizarNoche(dt) {
        const m = misiones.activa, def = m && facilidadDe(m.id) && facilidadDe(m.id).noche;
        const g = garantia.tocar(dt, def, dia.esNoche, dia.dias);
        if (g && enemigos.garantizar(g)) garantia.confirmar();
        fac().noche = garantia.serializar();
    }

    function actualizar(dt) {
        relojNoche += dt;
        reloj += dt;
        if (reloj < 1) return;
        const paso = relojNoche; relojNoche = 0; reloj = 0;
        if (colocar) decorar();
        actualizarPista();
        actualizarNoche(paso);
    }

    // Texto para el seguimiento de la misión (vacío si no hay pista)
    function textoSeguimiento() {
        const m = misiones.activa, f = fac();
        if (!m || !f.pista || f.pista.id !== m.id) return '';
        const def = facilidadDe(m.id).pista;
        return textoPista(f.pista, def.nombre, jugador.pos.x, jugador.pos.z, idiomaActual);
    }

    // Marcas para el minimapa: [{ x, z, tipo: 'pista' | 'lugar' }] en bloques
    function marcas() {
        const m = misiones.activa, lista = [], f = fac();
        const def = m && facilidadDe(m.id);
        if (!def) return lista;
        if (def.pista && f.pista && f.pista.id === m.id && !f.pista.nada) lista.push({ x: f.pista.x, z: f.pista.z, tipo: 'pista' });
        if (def.marcas === 'lugares') {
            for (const l of terreno.lugares || []) if (!misiones.estado.visitados.has(l.clave)) lista.push({ x: l.x, z: l.z, tipo: 'lugar' });
        }
        return lista;
    }

    return {
        actualizar, textoSeguimiento, marcas, garantia,
        multiplicadores: () => { const m = misiones.activa; return (m && facilidadDe(m.id) && facilidadDe(m.id).pesca) || null; },
        cargar() { garantia.cargar(fac().noche); },
        setIdioma(l) { idiomaActual = l; }
    };
}
