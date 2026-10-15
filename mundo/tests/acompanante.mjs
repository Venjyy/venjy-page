// =========================================================
// Prueba de los amigos acompañantes (7i): node mundo/tests/acompanante.mjs
//  1. Seguidor (mundo/seguir.js) en un mundo de juguete: te sigue por tu rastro a `distancia` sin buscar camino, no se
//     adelanta, se apura si se queda atrás, quieto con holgura, rodea un muro que pusiste en el rastro (busca camino),
//     rastro cortado (te teletransportan) → camino, sin camino espera («espera»), lejos espera y aparece detrás de ti
//     fuera de la vista (nunca a la vista), vuelve a seguirte al acercarte.
//  2. Acompañante (supervivencia/acompanante.js) con paseos y rutinas falsos: invitar con nivel, uno a la vez (el
//     anterior se despide), corta la rutina con su frase, soltar retoma la rutina, el minijuego queda con motivo,
//     lo soltaron desde otra parte (volverTodos).
//  3. Cooperativo: el anfitrión arbitra (uno por amigo), el invitado pide y espera, se ve en los demás (remoto), si
//     su dueño sale de la sala el anfitrión lo suelta y vuelve en todos; al cerrar la sala todos vuelven.
//  4. Datos: navegacion.json → seguir, rutinas.json → acompanar, esquemas, código y pestaña Vida nombran lo mismo.
// =========================================================
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
globalThis.window ??= { addEventListener() {} };
const avisoOriginal = console.warn; console.warn = () => {};

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const N = await imp('mundo/navegacion.js');
const SG = await imp('mundo/seguir.js');
const { LIBRE, SOLIDO, AGUA, SIN_CARGAR, NAV_BASE } = N;

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };
const iguales = (a, b) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);

// Mundo de juguete: piso de piedra en y = 0 (se para en y = 1) dentro de [0, W) × [0, D); fuera, sin cargar
function juguete(W = 120, D = 120) {
    const celdas = new Map();
    const k = (x, y, z) => `${x},${y},${z}`;
    const m = {
        poner(x, y, z, v) { celdas.set(k(x, y, z), v); },
        caja(x0, y0, z0, x1, y1, z1, v) { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) m.poner(x, y, z, v); },
        celda(x, y, z) {
            x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
            if (x < 0 || z < 0 || x >= W || z >= D) return SIN_CARGAR;
            const v = celdas.get(k(x, y, z));
            if (v !== undefined) return v;
            return y <= 0 ? SOLIDO : LIBRE;
        },
        columna: () => null
    };
    return m;
}
const DT = 1 / 30;
// Un líder que camina por una lista de puntos a `vel` b/s; el seguidor lo sigue. Devuelve lo medido
function escena({ C = juguete(), desde = { x: 10.5, y: 1, z: 10.5 }, cuerpo = { x: 8.5, y: 1, z: 10.5, yaw: 0 }, seguir = {}, nav = {}, extra = {} } = {}) {
    const S = { ...SG.SEGUIR_BASE, ...seguir }, A = { ...NAV_BASE, ...nav };
    const navg = N.crearNavegador(C, { ajustes: () => A });
    const s = SG.crearSeguidor(navg, cuerpo, { seguir: () => S, ajustes: () => A, ...extra });
    const lider = { ...desde, yaw: 0 };
    let vista = () => false;
    const med = { maxD: 0, minD: Infinity, eventos: [], aparecioVisto: false, buscando: 0, enParedes: 0 };
    function cuadro() {
        navg.actualizar();
        s.anotar(lider);
        const antes = { x: cuerpo.x, z: cuerpo.z };
        const e = s.actualizar(DT, { lider, visible: p => vista(p) });
        if (s.evento) { med.eventos.push(s.evento); if (s.evento === 'aparecio' && vista(cuerpo)) med.aparecioVisto = true; }
        if (s.modo === 'camino') med.buscando++;
        const c = C.celda(Math.floor(cuerpo.x), Math.round(cuerpo.y), Math.floor(cuerpo.z));
        if (c === SOLIDO) med.enParedes++;
        const d = Math.hypot(cuerpo.x - lider.x, cuerpo.z - lider.z);
        med.maxD = Math.max(med.maxD, d); med.minD = Math.min(med.minD, d);
        return { e, mov: Math.hypot(cuerpo.x - antes.x, cuerpo.z - antes.z) };
    }
    function caminar(puntos, vel = 4.3) {
        for (const p of puntos) {
            for (;;) {
                const dx = p.x - lider.x, dz = p.z - lider.z, d = Math.hypot(dx, dz);
                if (d < 1e-3) break;
                const paso = Math.min(d, vel * DT);
                lider.x += dx / d * paso; lider.z += dz / d * paso; lider.yaw = Math.atan2(-dx, -dz);
                cuadro();
            }
        }
    }
    const esperar = seg => { for (let t = 0; t < seg; t += DT) cuadro(); };
    return { s, C, lider, cuerpo, med, caminar, esperar, cuadro, ver: f => { vista = f; }, S, A, navg };
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// ---------------------------------------------------------
// 1. Seguidor
// ---------------------------------------------------------
{
    // Recto y con una vuelta: por el rastro, sin buscar camino, sin adelantarse, y queda a `distancia`
    const t = escena();
    t.caminar([{ x: 40.5, z: 10.5 }, { x: 40.5, z: 40.5 }, { x: 20.5, z: 40.5 }]);
    t.esperar(2);
    const d = dist(t.cuerpo, t.lider);
    ok(t.med.buscando === 0, `por el rastro sin buscar camino (cuadros buscando: ${t.med.buscando})`);
    ok(t.med.minD > 0.8, `no se te encima (mínimo ${t.med.minD.toFixed(2)})`);
    ok(t.med.maxD < t.S.distancia + t.S.holgura + 4, `no se queda atrás caminando tú a 4,3 b/s (máximo ${t.med.maxD.toFixed(2)})`);
    ok(d <= t.S.distancia + t.S.holgura + 0.05 && t.s.estado === 'quieto', `quieto a tu lado al parar (a ${d.toFixed(2)}, ${t.s.estado})`);
    ok(Math.abs(t.cuerpo.z - 40.5) < 0.3 && t.cuerpo.x > 20.5, 'quedó en tu rastro, detrás de ti');
    ok(t.med.eventos.length === 0, 'sin esperas ni apariciones');
    // Quieto con holgura: das un paso y no se mueve
    const antes = { ...t.cuerpo };
    t.caminar([{ x: 20.5, z: 39.5 }]);
    t.esperar(0.5);
    ok(dist(antes, t.cuerpo) < 0.01, 'un paso tuyo no lo hace andar a saltitos (holgura)');
    // Corres: se apura
    const r = escena();
    r.caminar([{ x: 100.5, z: 10.5 }], 5.6);
    ok(r.med.maxD < r.S.distancia + r.S.alcanzar + 2, `corriendo a 5,6 b/s se apura y no se queda (máximo ${r.med.maxD.toFixed(2)})`);
    ok(r.s.rapidez > 1, 'se apura (rapidez > 1)');
}
{
    // Muro en el rastro (lo pusiste después de pasar): lo rodea buscando camino, nunca lo atraviesa
    const t = escena({ seguir: { distancia: 2.5 } });
    t.caminar([{ x: 30.5, z: 10.5 }]);
    t.C.caja(29, 1, 5, 29, 3, 16, SOLIDO); // muro de z 5 a 16 en x = 29: entre el seguidor (quieto a tu lado) y tú
    t.caminar([{ x: 50.5, z: 10.5 }]);
    t.esperar(8);
    ok(t.med.enParedes === 0, `no atraviesa el muro (cuadros dentro: ${t.med.enParedes})`);
    ok(dist(t.cuerpo, t.lider) <= t.S.distancia + t.S.holgura + 0.1, `lo rodea y llega a tu lado (a ${dist(t.cuerpo, t.lider).toFixed(2)})`);
    ok(t.med.buscando > 0, 'para rodearlo buscó camino');
}
{
    // Te teletransportan 30 bloques: el rastro se corta; busca camino y te alcanza (sin aparecer: está a menos de radioAparecer)
    const t = escena();
    t.caminar([{ x: 20.5, z: 10.5 }]);
    t.lider.x = 20.5; t.lider.z = 30.5;
    t.esperar(10);
    ok(t.s.migas.includes(null), 'teletransporte: el rastro queda cortado');
    ok(dist(t.cuerpo, t.lider) <= t.S.distancia + t.S.holgura + 0.1, `te alcanza buscando camino (a ${dist(t.cuerpo, t.lider).toFixed(2)})`);
}
{
    // Te vas a una isla (agua honda alrededor): no hay camino → espera («¡Espérame!»), y al volver te sigue de nuevo
    const C = juguete();
    C.caja(30, 0, 0, 34, 0, 119, AGUA); C.caja(30, -3, 0, 34, -1, 119, AGUA); // canal hondo de x 30 a 34
    const t = escena({ C });
    t.caminar([{ x: 28.5, z: 10.5 }]);
    t.lider.x = 38.5; // cruzó nadando (lo hondo corta el rastro)
    t.esperar(4);
    ok(t.s.estado === 'esperando' && t.med.eventos.includes('espera'), `sin camino espera y avisa (${t.s.estado}, ${t.med.eventos})`);
    ok(t.cuerpo.x < 30, 'espera en su orilla');
    t.lider.x = 28.5; t.esperar(t.S.reintento + 2);
    ok(t.s.estado === 'quieto' || t.s.estado === 'siguiendo', `vuelves: te sigue de nuevo (${t.s.estado})`);
    // Te alejas mucho por el otro lado y no lo ves: aparece detrás de ti, fuera de la vista
    const u = escena({ C: juguete(200, 200) });
    u.caminar([{ x: 20.5, z: 10.5 }]);
    u.ver(p => SG.seVe(u.lider, u.lider.yaw, p, 70)); // la cámara en el líder
    u.lider.x = 120.5; u.lider.z = 10.5; u.lider.yaw = Math.atan2(-1, 0); // mira hacia +x, lejos de él
    u.caminar([{ x: 140.5, z: 10.5 }]);
    u.esperar(1);
    ok(u.med.eventos.includes('aparecio') && !u.med.aparecioVisto, `lejos: aparece detrás de ti sin que lo veas (${u.med.eventos})`);
    ok(dist(u.cuerpo, u.lider) < u.S.detras + u.S.distancia + 3, `… cerca de ti (a ${dist(u.cuerpo, u.lider).toFixed(1)})`);
    ok(u.cuerpo.x < u.lider.x, '… a tu espalda');
    // Mirándolo: nunca aparece (espera a que mires para otro lado)
    const v = escena({ C: juguete(200, 200) });
    v.caminar([{ x: 20.5, z: 10.5 }]);
    v.ver(() => true);
    v.lider.x = 120.5;
    v.esperar(3);
    ok(!v.med.eventos.includes('aparecio') && v.s.estado === 'esperando', 'a la vista no aparece: espera');
}
{
    // Escalón de 1: lo sube por tu rastro; pilar (subes 3 de golpe saltando y poniendo bloques): rastro cortado
    const C = juguete();
    C.caja(20, 1, 0, 119, 1, 119, SOLIDO); // de x 20 en adelante el suelo está 1 más arriba
    const t = escena({ C });
    const pasos = [];
    for (let x = 10.5; x <= 30.5; x += 0.25) pasos.push({ x, z: 10.5 });
    for (const p of pasos) { t.lider.x = p.x; t.lider.y = p.x >= 20 ? 2 : 1; t.cuadro(); }
    t.esperar(2);
    ok(t.med.buscando === 0 && Math.abs(t.cuerpo.y - 2) < 0.05 && t.cuerpo.x > 20, `sube el escalón por tu rastro (y ${t.cuerpo.y.toFixed(2)}, buscando ${t.med.buscando})`);
    t.s.anotar({ x: 30.5, y: 5, z: 10.5 });
    ok(t.s.migas[t.s.migas.length - 1] === null || t.s.migas.at(-1).y !== 5, 'subir 3 de golpe (pilar) corta el rastro');
}
{
    // Tope de migas y reiniciar
    const t = escena({ seguir: { migas: 20 } });
    t.caminar([{ x: 60.5, z: 10.5 }]);
    ok(t.s.migas.length <= 20, `guarda como mucho \`migas\` (${t.s.migas.length})`);
    t.s.reiniciar();
    ok(t.s.migas.length === 0 && t.s.estado === 'quieto', 'reiniciar olvida el rastro');
    ok(SG.seVe({ x: 0, z: 0 }, 0, { x: 0, z: -10 }) && !SG.seVe({ x: 0, z: 0 }, 0, { x: 0, z: 10 }), 'seVe: lo de adelante sí, lo de atrás no');
}

// ---------------------------------------------------------
// 2. Acompañante con rutinas de verdad y paseos falso
// ---------------------------------------------------------
const R = await imp('mundo/supervivencia/rutinas.js');
const RD = await imp('mundo/supervivencia/rutinas-datos.js');
const AC = await imp('mundo/supervivencia/acompanante.js');
const rig = () => { const h = () => ({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } }); return { cuerpo: h(), torso: h(), cuello: h(), cabeza: h(), brazoD: h(), brazoI: h(), piernaD: h(), piernaI: h() }; };
function armar({ visitas = {}, hora = 7, nivel = { ana: 3, beto: 3, caro: 1 }, red = null } = {}) {
    const P = { ana: { clave: 'ana', x: 0, y: 1, z: 0, p: rig() }, beto: { clave: 'beto', x: 10, y: 1, z: 0, p: rig() }, caro: { clave: 'caro', x: 40, y: 1, z: 0, p: rig() } };
    const fuera = new Map(), llamadas = [];
    const sale = c => { if (!fuera.has(c)) fuera.set(c, { estado: 'caminando', casa: { x: P[c].x, z: P[c].z } }); P[c].paseo = { texto: '', animar() {} }; return fuera.get(c); };
    const paseos = {
        ir(c, d, o) { llamadas.push(['ir', c, d]); const f = sale(c); f.d = d; f.estado = 'caminando'; f.seg = null; f.red = false; return true; },
        volver(c) { llamadas.push(['volver', c]); const f = fuera.get(c); if (f) { f.estado = 'volviendo'; f.seg = null; f.red = false; } return true; },
        fuera: c => fuera.has(c),
        estado: c => (fuera.has(c) ? { estado: fuera.get(c).seg ? 'siguiendo' : fuera.get(c).red ? 'red' : fuera.get(c).estado } : { estado: 'en-sitio' }),
        adornar(c, f) { const x = fuera.get(c); if (x) x.adorno = f; },
        mirar(c, p) { const x = fuera.get(c); if (x) x.mira = p; },
        resolverDestino: () => null,
        seguir(c, o) { llamadas.push(['seguir', c]); const f = sale(c); f.seg = { estado: 'siguiendo', evento: null }; f.red = false; f.pausa = o && o.pausa; return true; },
        siguiendo: c => !!(fuera.get(c) && fuera.get(c).seg),
        seguidor: c => (fuera.get(c) ? fuera.get(c).seg : null),
        remoto(c, si = true) { llamadas.push(['remoto', c, si]); if (!si) { const f = fuera.get(c); if (f) f.red = false; return true; } const f = sale(c); f.seg = null; f.red = true; return true; },
        enRed: c => !!(fuera.get(c) && fuera.get(c).red),
        posar(c, o) { const f = fuera.get(c); if (f && f.red) { f.pos = o; P[c].x = o.x; P[c].z = o.z; } },
        casa: c => (fuera.get(c) ? { ...fuera.get(c).casa } : null),
        // de la prueba
        aCasa(c) { fuera.delete(c); P[c].paseo = null; }
    };
    const reloj = { h: hora }, avisos = [];
    RD.fijarRutinas({ ajustes: { anticipar: 0, revisar: 0.5 }, visitas });
    const rutinas = R.crearRutinas({ paseos, persona: c => P[c], hora: () => reloj.h, jugador: { pos: { x: 0, y: 1, z: 2 } }, idioma: () => 'es', nombre: c => c.toUpperCase(),
        cargarGestos: () => Promise.resolve(() => () => ({})) });
    if (red) rutinas.red(red.anfitrion ? { enviar() {} } : 'seguir');
    const a = AC.crearAcompanante({ paseos, rutinas, persona: c => P[c], nivel: c => nivel[c] ?? 0, nombre: c => c.toUpperCase(), idioma: () => 'es', avisar: t => avisos.push(t) });
    const paso = (s = 1) => { for (let i = 0; i < s * 10; i++) { rutinas.actualizar(0.1); a.actualizar(0.1); } };
    return { a, rutinas, P, paseos, fuera, llamadas, reloj, paso, avisos };
}
const T = RD.ACOMPANAR_BASE;
{
    const { a, rutinas, P, paseos, llamadas, paso } = armar();
    ok(a.hablar('caro').motivo && a.hablar('caro').motivo.nivel === RD.RUTINA_BASE.nivelAcompanar, 'sin la amistad: el botón sale con su requisito de nivel');
    ok(!a.invitar('caro'), 'sin la amistad no viene');
    ok(a.invitar('caro', { forzar: true }) && a.mio === 'caro', '/rutina caro acompanar: viene igual (forzar)');
    a.soltar('caro', '');
    ok(a.hablar('ana').texto === T.boton.es && !a.hablar('ana').motivo, `con la amistad: «${T.boton.es}»`);
    ok(a.invitar('ana') && a.mio === 'ana' && paseos.siguiendo('ana'), 'invitar: te sigue (paseos.seguir)');
    ok(rutinas.estado('ana').estado === 'acompanando', 'su rutina queda en «acompañando»');
    paso(0.2);
    ok(P.ana.paseo.texto === T.acepta.es, `dice «${T.acepta.es}» (${P.ana.paseo.texto})`);
    ok(rutinas.texto('ana') === 'Te está acompañando.', 'panel: «Te está acompañando.»');
    ok(a.hablar('ana').mio && a.hablar('ana').texto === T.soltar.es, `ya te acompaña: «${T.soltar.es}»`);
    ok(a.motivoLugar('ana') === `Se juega en el campamento: vuelve allá con ANA.` || /ANA/.test(a.motivoLugar('ana')), `su minijuego, con motivo: «${a.motivoLugar('ana')}»`);
    ok(a.motivoLugar('beto') === null, 'el minijuego de otro sigue igual');
    // Uno a la vez: invitar a Beto despide a Ana
    llamadas.length = 0;
    ok(a.invitar('beto') && a.mio === 'beto', 'invitar a otro: ahora te sigue él');
    paso(0.2);
    ok(!paseos.siguiendo('ana') && llamadas.some(l => l[0] === 'volver' && l[1] === 'ana'), 'el anterior deja de seguirte y vuelve a su sitio');
    ok(P.ana.paseo && P.ana.paseo.texto === T.cambia.es.replace('{quien}', 'BETO'), `el anterior se despide: «${P.ana.paseo && P.ana.paseo.texto}»`);
    ok(rutinas.estado('ana').estado === 'volviendo', `el anterior retoma su rutina (${rutinas.estado('ana').estado})`);
    // «¡Espérame!» cuando el seguidor avisa
    paseos.seguidor('beto').evento = 'espera'; paso(0.1); paseos.seguidor('beto').evento = null;
    ok(P.beto.paseo.texto === T.espera.es, `te alejas: «${T.espera.es}»`);
    // Soltar: se despide y vuelve
    llamadas.length = 0;
    ok(a.soltar() && a.mio === null && llamadas.some(l => l[0] === 'volver' && l[1] === 'beto'), 'soltar: deja de seguirte y vuelve');
    paso(0.2);
    ok(/^¡Nos vemos!/.test(P.beto.paseo.texto), `se despide: «${P.beto.paseo.texto}»`);
    // Lo soltaron desde otra parte (volverTodos): ya no te acompaña
    a.invitar('ana'); paseos.aCasa('ana'); paso(0.2);
    ok(a.mio === null && rutinas.estado('ana').estado === 'en-sitio', `volverTodos: ya no te acompaña (${rutinas.estado('ana').estado})`);
}
{
    // Iba a ver a alguien: lo dice al aceptar; al soltarlo, a esa hora va directo a la visita
    const VIS = { 'ana-beto': { quien: 'ana', visita: 'beto', de: 10, a: 12 } };
    const { a, rutinas, P, llamadas, reloj, paso } = armar({ visitas: VIS, hora: 10 });
    paso(1);
    ok(rutinas.estado('ana').estado === 'yendo', 'Ana va a ver a Beto');
    a.invitar('ana'); paso(0.2);
    ok(P.ana.paseo.texto === T.corta.es.replace('{quien}', 'BETO'), `lo dice: «${P.ana.paseo.texto}»`);
    paso(2);
    ok(rutinas.estado('ana').estado === 'acompanando', 'acompañando, no vuelve a salir a la visita');
    llamadas.length = 0;
    a.soltar(); paso(0.1);
    ok(llamadas.some(l => l[0] === 'ir' && l[1] === 'ana' && l[2].persona === 'beto'), 'al soltarla, a esa hora va directo donde Beto');
    // Sigue a Beto mientras Ana lo visita: Ana se da cuenta y no lo encuentra
    const t2 = armar({ visitas: VIS, hora: 10 });
    t2.paso(1);
    t2.a.invitar('beto'); t2.paso(1);
    ok(t2.rutinas.estado('ana').estado !== 'visitando', `a quien te acompaña no lo visitan (${t2.rutinas.estado('ana').estado})`);
}

// ---------------------------------------------------------
// 3. Cooperativo: arbitra el anfitrión
// ---------------------------------------------------------
{
    const H = armar({ red: { anfitrion: true } }), G = armar({ red: { anfitrion: false } }), G2 = armar({ red: { anfitrion: false } });
    const salas = { H: H.a, G: G.a, G2: G2.a };
    const cola = [];
    const nombres = { H: 'Host', G: 'Gui', G2: 'Gui2' };
    for (const [id, x] of Object.entries(salas)) x.red({ yo: id, anfitrion: id === 'H', enviar: m => cola.push({ ...m, de: id }), nombre: i => nombres[i] });
    const repartir = () => { while (cola.length) { const m = cola.shift(); for (const [id, x] of Object.entries(salas)) if (id !== m.de) x.recibir(m); } };
    // El invitado pide a Ana: espera la lista del anfitrión
    ok(G.a.invitar('ana') && G.a.mio === null, 'invitado: pide y espera');
    ok(G.a.hablar('ana').motivo && G.a.hablar('ana').motivo.texto === '…', 'mientras espera, el botón queda esperando');
    repartir();
    ok(G.a.mio === 'ana' && G.paseos.siguiendo('ana'), 'el anfitrión se la da: te sigue en tu equipo');
    ok(H.paseos.enRed('ana') && G2.paseos.enRed('ana'), 'en los demás la mueve la red');
    ok(H.rutinas.texto('ana') === 'Está acompañando a Gui.', `su panel en los demás: «${H.rutinas.texto('ana')}»`);
    ok(H.rutinas.estado('ana').estado === 'acompanando', 'el anfitrión no la manda de visita');
    // Otro la pide: no se la dan; el botón dice con quién anda
    ok(G2.a.hablar('ana').motivo && G2.a.hablar('ana').motivo.texto === T.ocupado.es.replace('{quien}', 'Gui'), `otro jugador: «${G2.a.hablar('ana').motivo && G2.a.hablar('ana').motivo.texto}»`);
    ok(!H.a.invitar('ana'), 'ni el anfitrión se la quita');
    // El anfitrión invita a Beto: se ve en los invitados
    ok(H.a.invitar('beto') && H.a.mio === 'beto', 'el anfitrión invita a Beto sin esperar');
    repartir();
    ok(G.paseos.enRed('beto') && G2.paseos.enRed('beto'), 'Beto, movido por la red en los invitados');
    // La pose viaja: el dibujo llega a los demás
    G.P.ana.x = 5; G.P.ana.z = 6;
    const pose = G.a.pose();
    ok(Array.isArray(pose) && pose[0] === 'ana' && pose[1] === 5, 'tu acompañante va en tu `p` (npc)');
    H.a.dibujar('G', 'ana', { x: pose[1], y: pose[2], z: pose[3], yaw: pose[4] });
    ok(H.P.ana.x === 5 && H.P.ana.z === 6, 'los demás la dibujan donde la tiene su jugador');
    H.a.dibujar('G2', 'ana', { x: 99, y: 1, z: 99, yaw: 0 });
    ok(H.P.ana.x === 5, 'una pose de quien no la tiene no se dibuja');
    // Su jugador sale de la sala: el anfitrión la suelta y vuelve en todos
    H.a.salio('G'); repartir();
    ok(!H.paseos.enRed('ana') && H.rutinas.estado('ana').estado !== 'acompanando', `sale su jugador: el anfitrión la suelta (${H.rutinas.estado('ana').estado})`);
    ok(!G2.paseos.enRed('ana') && G2.rutinas.estado('ana').estado !== 'acompanando', 'y vuelve en los demás');
    ok(H.llamadas.some(l => l[0] === 'volver' && l[1] === 'ana'), 'camina de vuelta a su sitio');
    // Soltar desde un invitado
    delete salas.G;
    ok(G2.a.invitar('caro', { forzar: true }) || true, '');
    repartir();
    ok(G2.a.mio === 'caro' && H.paseos.enRed('caro'), 'otro invitado se lleva a Caro');
    G2.a.soltar(); repartir();
    ok(!H.paseos.enRed('caro') && G2.a.mio === null, 'la suelta: vuelve en todos');
    // Se cierra la sala: todos vuelven
    H.a.red(null); G2.a.red(null);
    ok(H.a.mio === null && !G2.paseos.enRed('beto'), 'al cerrar la sala nadie queda acompañando');
    ok(G2.rutinas.estado('beto').estado !== 'acompanando', 'y retoman su rutina');
}

// ---------------------------------------------------------
// 3b. 7i PR 2: su torre, peleas y órdenes
// ---------------------------------------------------------
{
    // Torre: te subes a un pilar de 4 → arma la suya al lado, salta y pone bloques hasta tu altura; bajas → baja rompiéndola
    const C = juguete();
    const puestos = [], rotos = [];
    const torre = {
        poner(x, y, z) { if (C.celda(x, y, z) !== LIBRE) return false; C.poner(x, y, z, SOLIDO); puestos.push([x, y, z]); return true; },
        quitar(x, y, z) { C.poner(x, y, z, LIBRE); },
        romper(x, y, z) { rotos.push([x, y, z]); C.poner(x, y, z, LIBRE); return true; }
    };
    const t = escena({ C, desde: { x: 20.5, y: 1, z: 10.5 }, cuerpo: { x: 17.5, y: 1, z: 10.5, yaw: 0 }, extra: torre });
    t.esperar(1);
    for (let y = 1; y <= 4; y++) C.poner(20, y, 10, SOLIDO);
    t.lider.y = 5;
    t.esperar(t.S.torreEspera + 1.5 + 4 * t.S.torreCada + 1);
    const tr = t.s.torre;
    ok(tr && tr.fase === 'arriba', `te subiste a un pilar: arma su torre y queda arriba (${tr && tr.fase})`);
    ok(Math.abs(t.cuerpo.y - 5) < 0.05, `a tu altura (y ${t.cuerpo.y.toFixed(2)})`);
    ok(tr && Math.max(Math.abs(tr.bx - 20), Math.abs(tr.bz - 10)) === 1, 'al lado de tu pilar');
    ok(puestos.length === 4 && t.s.bloques === t.S.torreBloques - 4, `puso 4 bloques (${puestos.length}) y le quedan ${t.s.bloques}`);
    // Alguien le pone un bloque encima y tú subes 2 más: lo rompe y sigue
    for (let y = 5; y <= 6; y++) C.poner(20, y, 10, SOLIDO);
    t.lider.y = 7;
    C.poner(tr.bx, 7, tr.bz, SOLIDO);
    t.esperar(1 + t.S.torreRomper + 2 * t.S.torreCada + 1);
    ok(rotos.length === 1 && rotos[0][1] === 7, `le pusieron un bloque encima: lo rompió (${JSON.stringify(rotos)})`);
    ok(Math.abs(t.cuerpo.y - 7) < 0.05 && t.s.bloques === t.S.torreBloques - 6 + 1, `siguió hasta y 7 y se guardó el bloque roto (le quedan ${t.s.bloques})`);
    // Bajas: baja rompiendo su torre y recupera los bloques
    for (let y = 1; y <= 6; y++) C.poner(20, y, 10, LIBRE);
    t.lider.y = 1; t.lider.x = 22.5;
    t.esperar(6 * t.S.torreBajar + 2);
    ok(!t.s.torre && Math.abs(t.cuerpo.y - 1) < 0.1, `bajaste: bajó rompiendo su torre (y ${t.cuerpo.y.toFixed(2)})`);
    ok(t.s.bloques === t.S.torreBloques + 1, `recuperó sus bloques (${t.s.bloques})`);
    let quedan = 0; for (const [x, y, z] of puestos) if (C.celda(x, y, z) === SOLIDO) quedan++;
    ok(quedan === 0, `no quedó nada de su torre (${quedan})`);
}
{
    // Sin bloques: se queda donde llegó y lo dice
    const C = juguete();
    const torre = { poner(x, y, z) { C.poner(x, y, z, SOLIDO); return true; }, quitar(x, y, z) { C.poner(x, y, z, LIBRE); } };
    const t = escena({ C, desde: { x: 20.5, y: 1, z: 10.5 }, cuerpo: { x: 18.5, y: 1, z: 10.5, yaw: 0 }, seguir: { torreBloques: 2 }, extra: torre });
    t.esperar(0.5);
    for (let y = 1; y <= 5; y++) C.poner(20, y, 10, SOLIDO);
    t.lider.y = 6;
    t.esperar(t.S.torreEspera + 1.5 + 4 * t.S.torreCada + 1);
    ok(Math.abs(t.cuerpo.y - 3) < 0.05 && t.s.bloques === 0, `con 2 bloques llega a y 3 (y ${t.cuerpo.y.toFixed(2)})`);
    ok(t.med.eventos.includes('sinBloques'), '«¡No tengo más bloques!»');
    t.s.limpiar();
    ok(t.s.bloques === 2 && C.celda(t.s.restos.length ? 0 : 19, 1, 10) !== SOLIDO, 'limpiar: quita su torre y recupera los bloques');
    ok(Math.abs(t.cuerpo.y - 1) < 0.05, 'limpiar: queda en el suelo');
}
{
    // Sin torre (no puede poner bloques): espera como siempre
    const C = juguete();
    const t = escena({ C, desde: { x: 20.5, y: 1, z: 10.5 }, cuerpo: { x: 18.5, y: 1, z: 10.5, yaw: 0 } });
    for (let y = 1; y <= 4; y++) C.poner(20, y, 10, SOLIDO);
    t.lider.y = 5;
    t.esperar(6);
    ok(!t.s.torre && t.cuerpo.y < 1.5, 'sin opciones.poner no arma torres');
}

const PL = await imp('mundo/supervivencia/acompanante-pelea.js');
// Pelea con un seguidor falso (camina derecho 4 b/s) y monstruos de juguete
function ring({ ajustes = {}, monstruos = [], jugador = { x: 0, y: 1, z: 0 } } = {}) {
    const A = { ...PL.PELEA_BASE, ...ajustes };
    const cuerpo = { x: 1, y: 1, z: 0, yaw: 0 };
    const golpes = [];
    const lista = monstruos.map(m => ({ tipo: 'zombi', y: 1, dano: 3, vida: 20, ...m }));
    const vivos = () => lista.filter(m => m.vida > 0);
    const ver = m => ({ ...m, mob: m, golpear(n, o) { golpes.push({ n, o, m }); m.vida -= n; return true; } });
    const p = PL.crearPeleaAcompanante({ ajustes: () => A, jugador: () => jugador, monstruos: (x, z, r) => vivos().filter(m => Math.abs(m.x - x) <= r && Math.abs(m.z - z) <= r).map(ver) });
    const seg = {
        estado: 'siguiendo', dejados: 0,
        perseguir(dt, o, { alcance }) { const d = Math.hypot(o.x - cuerpo.x, o.z - cuerpo.z); if (d <= alcance) return 'alcance'; const k = Math.min(d, 4 * dt) / d; cuerpo.x += (o.x - cuerpo.x) * k; cuerpo.z += (o.z - cuerpo.z) * k; return 'yendo'; },
        quedarse() { seg.estado = 'quieto'; },
        irA(dt, q) { const d = Math.hypot(q.x - cuerpo.x, q.z - cuerpo.z); if (d < 0.6) return true; const k = Math.min(d, 4 * dt) / d; cuerpo.x += (q.x - cuerpo.x) * k; cuerpo.z += (q.z - cuerpo.z) * k; return false; },
        dejar() { seg.dejados++; }
    };
    const eventos = [];
    const correr = (s, f) => { let m = 0; for (let t = 0; t < s; t += DT) { const r = p.paso(DT, seg, cuerpo); if (r) m++; if (p.evento) eventos.push(p.evento); if (f) f(); } return m; };
    return { p, A, cuerpo, golpes, lista, seg, correr, eventos, jugador };
}
{
    const r = ring({ monstruos: [{ x: 4, z: 3 }, { x: 9, z: 0 }] });
    r.correr(4);
    ok(r.lista[0].vida <= 0, `pelea con el zombi a 5 de ti y lo mata (vida ${r.lista[0].vida})`);
    ok(r.lista[1].vida === 20, 'no va por el que está a 9 de ti');
    ok(r.golpes.every(g => g.n === 5), 'daño de espada de piedra (5)');
    const t = r.golpes.length > 1 ? r.golpes.length : 0;
    ok(t === 4, `4 golpes de 5 para 20 de vida (${t})`);
    ok(r.golpes[0].o.atacante && Math.abs(r.golpes[0].o.atacante.x - r.cuerpo.x) < 3, 'el golpe sale desde él (atacante, para el cooperativo)');
    ok(r.eventos[0] === 'pelea' && r.seg.dejados >= 1, 'empieza la pelea y al terminar vuelve a tu rastro');
}
{
    const r = ring({ monstruos: [{ tipo: 'creeper', x: 3, z: 0, dano: 0 }] });
    r.correr(2);
    ok(r.golpes.length === 0, 'no se acerca a los creepers (creepers 0)');
    const r2 = ring({ monstruos: [{ tipo: 'creeper', x: 3, z: 0, dano: 0 }], ajustes: { creepers: 1 } });
    r2.correr(2);
    ok(r2.golpes.length > 0, 'con creepers 1, sí');
    const r3 = ring({ monstruos: [{ x: 3, z: 0 }] });
    r3.p.ordenar('tranquilo', r3.cuerpo);
    ok(r3.correr(2) === 0 && r3.golpes.length === 0, '«No pelees»: no pelea y te sigue');
}
{
    // Tres zombis pegados a él que no mueren: «perdería» → se sienta `descanso` s y vuelve con todo
    const r = ring({ monstruos: [{ x: 1.5, z: 0.5, vida: 1e9 }, { x: 0.5, z: -0.5, vida: 1e9 }, { x: 1.6, z: -0.6, vida: 1e9 }] });
    r.correr(20 / 9 + 0.3);
    ok(r.p.sentado && r.eventos.includes('cansado'), `se le acaba el aguante: se sienta (aguante ${r.p.aguante.toFixed(1)})`);
    const g = r.golpes.length;
    r.correr(r.A.descanso - 0.5);
    ok(r.p.sentado && r.golpes.length === g, 'sentado no pelea');
    r.correr(1);
    ok(!r.p.sentado && r.eventos.includes('listo') && r.p.aguante > r.A.aguante * 0.5, `tras el descanso vuelve con el aguante lleno (${r.p.aguante.toFixed(1)}, ya gastando: siguen pegados)`);
}
{
    // «Espérame aquí»: defiende su lugar, no lo que está cerca de ti
    const r = ring({ monstruos: [{ x: 3, z: 3 }, { x: 40, z: 0 }] });
    r.p.ordenar('quieto', r.cuerpo);
    r.jugador.x = 38;
    r.correr(4);
    ok(r.lista[0].vida <= 0 && r.lista[1].vida === 20, 'defiende el lugar donde lo dejaste, no a ti');
    ok(Math.hypot(r.cuerpo.x - 1, r.cuerpo.z) < 0.7, 'y vuelve a su lugar');
    ok(r.p.ordenar('sigue', r.cuerpo) && r.p.orden === 'sigue' && !r.p.ordenar('sigue'), 'ordenar: cambia y no repite');
}
{
    // El acompañante: botones de órdenes, respuesta y pose con marcas
    const { a, P, paso } = armar();
    a.invitar('ana');
    const h = a.hablar('ana');
    ok(h.ordenes && h.ordenes.length === 3 && h.ordenes.find(o => o.activa).orden === 'sigue', 'Hablar: tres órdenes, «Sígueme» marcada');
    ok(a.ordenar('quieto') && a.pelea.orden === 'quieto', '«Espérame aquí»');
    paso(0.2);
    ok(P.ana.paseo.texto === T.diceQuieto.es, `contesta «${T.diceQuieto.es}»`);
    ok(a.pose().length === 6 && a.pose()[5] === 0, 'pose: con marcas (golpe, sentado)');
    a.soltar('ana', '');
    ok(!a.ordenar('sigue', 'ana'), 'sin acompañarte no recibe órdenes');
    a.invitar('ana');
    ok(a.pelea.orden === 'sigue', 'al volver a invitarlo parte en lo básico');
}

// ---------------------------------------------------------
// 4. Datos: esquemas, código, JSON y pestaña Vida nombran lo mismo
// ---------------------------------------------------------
{
    const json = p => JSON.parse(readFileSync(resolve(raiz, p), 'utf8'));
    const nav = json('estudio/esquemas/navegacion.schema.json'), rut = json('estudio/esquemas/rutinas.schema.json');
    const vida = readFileSync(resolve(raiz, 'estudio/vida.js'), 'utf8');
    const bloque = nombre => { const m = vida.match(new RegExp(`const ${nombre} = \\{([\\s\\S]*?)\\n\\};`)); return m ? [...m[1].matchAll(/^\s+(\w+):/gm)].map(x => x[1]) : []; };
    ok(iguales(Object.keys(nav.properties.seguir.properties), Object.keys(SG.SEGUIR_BASE)), 'esquema: seguir = SEGUIR_BASE');
    ok(iguales(bloque('SEGUIR'), Object.keys(SG.SEGUIR_BASE)), 'pestaña Vida: todos los campos de seguir');
    for (const [k, v] of Object.entries(SG.SEGUIR_BASE)) { const e = nav.properties.seguir.properties[k]; ok(e && v >= e.minimum && v <= e.maximum, `SEGUIR_BASE.${k} dentro del esquema`); }
    ok(iguales(Object.keys(nav.properties.pelea.properties), Object.keys(PL.PELEA_BASE)), 'esquema: pelea = PELEA_BASE');
    ok(iguales(bloque('PELEA'), Object.keys(PL.PELEA_BASE)), 'pestaña Vida: todos los campos de pelea');
    for (const [k, v] of Object.entries(PL.PELEA_BASE)) { const e = nav.properties.pelea.properties[k]; ok(e && v >= e.minimum && v <= e.maximum, `PELEA_BASE.${k} dentro del esquema`); }
    ok(iguales(Object.keys(rut.properties.acompanar.properties), Object.keys(RD.ACOMPANAR_BASE)), 'esquema: acompanar = ACOMPANAR_BASE');
    for (const [k, v] of Object.entries(RD.ACOMPANAR_BASE)) {
        if (typeof v === 'string') { ok(vida.includes(`['${k}', `), `pestaña Vida: ${k}`); continue; }
        ok(v.es && v.en, `ACOMPANAR_BASE.${k} con ES y EN`);
        ok(vida.includes(`['${k}', `), `pestaña Vida: frase ${k}`);
    }
    const d = json('mundo/datos/navegacion.json');
    for (const k of Object.keys(d.seguir || {})) ok(k in SG.SEGUIR_BASE, `navegacion.json: seguir.${k} existe en el código`);
    ok(d.pelea && typeof d.pelea === 'object', 'navegacion.json: tiene `pelea` (la pestaña Vida la llena)');
    for (const k of Object.keys(d.pelea || {})) ok(k in PL.PELEA_BASE, `navegacion.json: pelea.${k} existe en el código`);
    // Lo aplica fijarPaseo (todo navegacion.json) y rutinas.json → acompanar cambia cada frase por separado
    const PD = await imp('mundo/supervivencia/paseos-datos.js');
    PD.fijarPaseo({ seguir: { distancia: 4, raro: 1 } });
    ok(SG.ajustesSeguir().distancia === 4 && SG.ajustesSeguir().miga === SG.SEGUIR_BASE.miga && !('raro' in SG.ajustesSeguir()), 'fijarPaseo: mezcla seguir');
    PD.fijarPaseo({ pelea: { dano: 7, raro: 1 } });
    ok(PL.ajustesPelea().dano === 7 && PL.ajustesPelea().radio === PL.PELEA_BASE.radio && !('raro' in PL.ajustesPelea()), 'fijarPaseo: mezcla pelea');
    PD.fijarPaseo({});
    RD.fijarRutinas({ acompanar: { acepta: { es: 'Ya, vamos.' }, gestoAcepta: 'saluda' } });
    ok(RD.acompanarRutinas().acepta.en === 'Ya, vamos.' && RD.acompanarRutinas().gestoAcepta === 'saluda' && RD.acompanarRutinas().boton === RD.ACOMPANAR_BASE.boton, 'rutinas.json → acompanar cambia una frase y deja lo demás');
    RD.fijarRutinas({});
    // Gestos de fábrica que existen
    const { molde } = await imp('mundo/supervivencia/moldes.js');
    for (const k of ['gestoAcepta', 'gestoDespide']) ok(typeof molde(RD.ACOMPANAR_BASE[k]) === 'function', `${k}: «${RD.ACOMPANAR_BASE[k]}» existe en moldes.js`);
    // El juego lo conecta
    const main = readFileSync(resolve(raiz, 'mundo/supervivencia/main.js'), 'utf8'), coop = readFileSync(resolve(raiz, 'mundo/supervivencia/coop.js'), 'utf8');
    ok(main.includes('crearAcompanante(') && main.includes('acompanante.actualizar(dtC)') && main.includes('acompanante.red(null)'), 'main.js: crea, actualiza y suelta al cerrar la sala');
    ok(/'ru', 'co'\]/.test(coop) && coop.includes('co(m)') && coop.includes('m.npc = np'), "coop.js: escucha 'co' y manda el acompañante en `p`");
}

console.warn = avisoOriginal;
console.log(`${pruebas - fallos}/${pruebas} comprobaciones OK`);
if (fallos) process.exit(1);
