// =========================================================
// Prueba de las rutinas y visitas (6d etapa 2, PR 2; incluye 7j-1): node mundo/tests/rutinas.mjs
//  1. Datos: rutinas.json se lee entero (visitas, horarios, lugares, textos); cada visita nombra personas con
//     posición y que se conocen (tabla de 6c), sus gestos existen en moldes.js y sus textos traen ES y EN.
//  2. Horario: visitaDeHora con tramos que cruzan la medianoche y saliendo antes según la distancia (horasDeViaje).
//  3. Máquina de estados con un paseos falso: en-sitio → yendo → visitando (saludo y respuesta) → volviendo →
//     en-sitio; escena, `libre` y la persona visitada fuera no lo dejan salir; si otro lo movió no lo pelea.
//  4. 7j-1: acompanar corta la rutina y retomar sigue en el tramo que toca según la hora; «Probar» del Estudio.
//  5. Texto del panel (Hablar, Misión y Tienda) y gesto encima de la pose.
//  5b. PR 3: con amistad alta te saludan al pasar (una vez cada `esperaIncluir`); cooperativo: el anfitrión manda lo
//     que decide y el invitado solo lo aplica (y la foto para quien entra con una visita empezada).
//  6. Esquema, RUTINA_BASE, TEXTOS_RUTINA y la pestaña Vida nombran los mismos campos; el juego lo conecta.
// =========================================================
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
globalThis.window ??= { addEventListener() {} };
const avisoOriginal = console.warn; console.warn = () => {}; // cargarDatos avisa que no hay fetch de archivos en Node
const logOriginal = console.log;

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const imp = p => import(pathToFileURL(resolve(raiz, p)).href);
const leer = p => readFileSync(resolve(raiz, p), 'utf8');
const json = p => JSON.parse(leer(p));
const RD = await imp('mundo/supervivencia/rutinas-datos.js');
const R = await imp('mundo/supervivencia/rutinas.js');
const { HORARIOS, LUGARES } = await imp('mundo/supervivencia/horarios-datos.js');
const { relacion } = await imp('mundo/supervivencia/amistad.js');
const { NAV_BASE } = await imp('mundo/navegacion.js');
console.log = () => {};
const { molde } = await imp('mundo/supervivencia/moldes.js');
console.log = logOriginal;

let fallos = 0, pruebas = 0;
const ok = (cond, msg) => { pruebas++; if (!cond) { fallos++; console.log('FALLA:', msg); } };
const iguales = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ---------------------------------------------------------
// 1. Datos
// ---------------------------------------------------------
const datos = json('mundo/datos/rutinas.json');
const pos = json('mundo/datos/posiciones.json').personas;
{
    const { visitas } = RD.fijarRutinas(datos);
    ok(Object.keys(visitas).length === Object.keys(datos.visitas).length, `rutinas.json: se leen todas las visitas (${Object.keys(visitas).length})`);
    for (const [k, v] of Object.entries(visitas)) {
        ok(!!pos[v.quien], `${k}: ${v.quien} tiene posición`);
        if (v.visita) {
            ok(!!pos[v.visita], `${k}: ${v.visita} tiene posición`);
            ok(relacion(v.quien, v.visita) >= 1, `${k}: se conocen según la tabla de 6c (${relacion(v.quien, v.visita)})`);
            ok(pos[v.quien].ancla !== pos[v.visita].ancla, `${k}: visita a alguien de otro lugar`);
        }
        for (const parte of ['llegada', 'respuesta']) {
            const a = v[parte];
            if (a.gesto) ok(typeof molde(a.gesto) === 'function', `${k}: el gesto «${a.gesto}» existe en moldes.js`);
            if (a.texto) ok(a.texto.es && a.texto.en, `${k}: ${parte} con texto ES y EN`);
        }
        ok(datos.visitas[k].llegada && datos.visitas[k].llegada.texto, `${k}: dice algo al llegar`);
    }
    // Horarios y lugares: los mismos del código, ahora en el JSON
    for (const [k, h] of Object.entries(datos.horarios)) ok(pos[k] && pos[k].ancla === h.ancla, `horarios.${k}: el ancla es la de posiciones.json`);
    ok(Object.keys(HORARIOS).length === Object.keys(pos).length, 'cada persona con posición tiene horario');
    // Una visita sin destino o sin horas se ignora; horarios y lugares del JSON cambian HORARIOS (y vuelven al quitarlos)
    const r = RD.fijarRutinas({ visitas: { mala: { quien: 'andy', de: 9, a: 10 }, mala2: { quien: 'andy', visita: 'braulio', de: 30, a: 10 } }, horarios: { andy: { de: 9.5 } }, lugares: { campamento: { es: 'en la fogata', en: 'at the fire' } } });
    ok(!Object.keys(r.visitas).length, 'fijarRutinas: descarta visitas sin destino o con horas fuera de 0-24');
    ok(HORARIOS.andy.de === 9.5 && HORARIOS.andy.a === 18 && HORARIOS.andy.lugar.es === 'en la fogata', 'fijarRutinas: horarios y lugares del JSON llegan a HORARIOS');
    RD.fijarRutinas({});
    ok(HORARIOS.andy.de === 8 && LUGARES.campamento.es === 'en el campamento', 'fijarRutinas: sin JSON vuelve a los valores del código');
    RD.fijarRutinas(datos);
}

// ---------------------------------------------------------
// 2. Horario
// ---------------------------------------------------------
{
    const V = { a: { clave: 'a', quien: 'ana', visita: 'beto', de: 10, a: 12, activa: true }, n: { clave: 'n', quien: 'ana', lugar: 'faro', de: 22, a: 2, activa: true }, off: { clave: 'off', quien: 'beto', visita: 'ana', de: 0, a: 24, activa: false } };
    ok(R.visitaDeHora(V, 'ana', 9.9) === null && R.visitaDeHora(V, 'ana', 10) === V.a && R.visitaDeHora(V, 'ana', 11.99) === V.a && R.visitaDeHora(V, 'ana', 12) === null, 'visitaDeHora: tramo [de, a)');
    ok(R.visitaDeHora(V, 'ana', 23) === V.n && R.visitaDeHora(V, 'ana', 1) === V.n && R.visitaDeHora(V, 'ana', 3) === null, 'visitaDeHora: tramo que cruza la medianoche');
    ok(R.visitaDeHora(V, 'beto', 5) === null, 'visitaDeHora: una visita apagada no cuenta');
    ok(R.visitaDeHora(V, 'ana', 8.5, () => 2) === V.a && R.visitaDeHora(V, 'ana', 7.5, () => 2) === null, 'visitaDeHora: sale antes lo que dura el viaje');
    const A = RD.RUTINA_BASE;
    const h = R.horasDeViaje(558);
    const esperado = 558 * A.rodeo / (NAV_BASE.velocidad * NAV_BASE.rapidezLejos) / A.segundosHora;
    ok(Math.abs(h - esperado) < 1e-9 && h > 1 && h < 6, `horasDeViaje: campamento → naufragio ${h.toFixed(2)} h`);
    ok(R.horasDeViaje(558, { ...A, anticipar: 0 }) === 0 && R.horasDeViaje(0) === 0, 'horasDeViaje: sin anticipar o sin distancia, 0');
    // Andy llega al naufragio cuando Braulio ya volvió del escenario
    const v = RD.visitasRutinas();
    if (v['andy-braulio'] && v['braulio-conejeros']) ok(v['andy-braulio'].de - R.horasDeViaje(558) > v['braulio-conejeros'].a + R.horasDeViaje(182), 'rutinas.json: Andy sale cuando Braulio ya está de vuelta');
}

// ---------------------------------------------------------
// 3-5. Máquina de estados con personas y paseos falsos
// ---------------------------------------------------------
const rig = () => Object.fromEntries(['cuerpo', 'cuello', 'brazoD', 'brazoI'].map(k => [k, { rotation: { x: 0, y: 0, z: 0 } }]));
function armar({ visitas, hora = 7, jugador = { pos: { x: 0, z: 0 } }, nivel = null, ajustes = {} } = {}) {
    const P = {
        ana: { clave: 'ana', x: 0, z: 0, p: rig() }, beto: { clave: 'beto', x: 10, z: 0, p: rig() }, caro: { clave: 'caro', x: 40, z: 0, p: rig() }
    };
    const fuera = new Map(), llamadas = [];
    const paseos = {
        ir(c, d, o) { llamadas.push(['ir', c, d, o]); fuera.set(c, { d, estado: 'caminando' }); P[c].paseo = { texto: '', animar() {} }; return true; },
        volver(c) { llamadas.push(['volver', c]); const f = fuera.get(c); if (f) f.estado = 'volviendo'; return true; },
        fuera: c => fuera.has(c),
        estado: c => (fuera.has(c) ? { estado: fuera.get(c).estado } : { estado: 'en-sitio' }),
        adornar(c, f) { const x = fuera.get(c); if (x) x.adorno = f; },
        mirar(c, p) { const x = fuera.get(c); if (x) x.mira = p; },
        resolverDestino: l => (l === 'faro' ? { x: 100, z: 0 } : null),
        // de la prueba
        llegar(c) { const f = fuera.get(c); f.estado = 'alla'; if (f.d && f.d.persona) { P[c].x = P[f.d.persona].x - 1.5; P[c].z = P[f.d.persona].z; } },
        poner(c, e) { fuera.get(c).estado = e; },
        casa(c) { fuera.delete(c); P[c].paseo = null; }
    };
    const reloj = { h: hora }, permiso = { libre: true };
    RD.fijarRutinas({ ajustes: { anticipar: 0, revisar: 0.5, ...ajustes }, visitas });
    const r = R.crearRutinas({ paseos, persona: c => P[c], hora: () => reloj.h, libre: () => permiso.libre, jugador, idioma: () => 'es', nombre: c => c.toUpperCase(),
        nivel: nivel ? c => nivel[c] ?? 0 : undefined,
        cargarGestos: () => Promise.resolve(nombre => (nombre === 'saluda' ? () => ({ bDx: -2, cy: 0.5 }) : null)) });
    const paso = (s = 1) => { for (let i = 0; i < s * 10; i++) r.actualizar(0.1); };
    return { r, P, paseos, fuera, llamadas, reloj, permiso, paso };
}
const VIS = {
    'ana-beto': { quien: 'ana', visita: 'beto', de: 10, a: 12, llegada: { gesto: 'saluda', texto: { es: 'Hola Beto', en: 'Hi Beto' } }, respuesta: { gesto: 'saluda', texto: { es: 'Hola Ana', en: 'Hi Ana' } } },
    'ana-faro': { quien: 'ana', lugar: 'faro', de: 14, a: 15 }
};
{
    const { r, P, paseos, llamadas, reloj, paso } = armar({ visitas: VIS });
    paso();
    ok(r.estado('ana').estado === 'en-sitio' && !llamadas.length, 'a las 7 está en su sitio');
    reloj.h = 10; paso();
    ok(r.estado('ana').estado === 'yendo' && r.estado('ana').visita === 'ana-beto', `a las 10 va a ver a Beto (${r.estado('ana').estado})`);
    ok(llamadas[0][0] === 'ir' && llamadas[0][2].persona === 'beto' && llamadas[0][3].mirar === 'beto', 'sale con paseos.ir hacia Beto y mirándolo');
    ok(r.texto('ana') === 'Va a ver a BETO.', `panel: «${r.texto('ana')}»`);
    paseos.llegar('ana'); paso(0.5);
    ok(r.estado('ana').estado === 'visitando', 'al llegar queda de visita');
    await new Promise(res => setTimeout(res, 0)); // los gestos se cargan con import()
    paso(0.3);
    ok(P.ana.paseo.texto === 'Hola Beto', `saluda con su frase (${P.ana.paseo.texto})`);
    ok(!!P.beto.visita && P.beto.visita.de === 'ana', 'quien recibe tiene el gancho n.visita');
    const A = RD.ajustesRutinas();
    paso(A.respuesta);
    ok(P.beto.visita && P.beto.visita.texto === 'Hola Ana', 'quien recibe contesta después de `respuesta` s');
    // Gesto encima de la pose
    const antes = P.ana.p.brazoD.rotation.x;
    ok(antes === 0, 'pose de partida');
    // Quien recibe gira la cabeza hacia quien llegó (Ana está en x 0, Beto en x 10: mira hacia -x, con tope)
    P.beto.visita.animar(1);
    ok(P.beto.p.cuello.rotation.y < -0.5, `quien recibe mira a quien llegó, con su gesto encima (cuello ${P.beto.p.cuello.rotation.y.toFixed(2)})`);
    paso(A.frase + A.gesto);
    ok(P.ana.paseo.texto === '' && P.beto.visita && P.beto.visita.texto === '', 'el saludo termina: sin globos; quien recibe lo sigue mirando');
    ok(r.texto('ana') === 'Está de visita donde BETO.', `panel de visita: «${r.texto('ana')}»`);
    ok(r.texto('ana', 'en').startsWith('Visiting BETO'), `panel en inglés: «${r.texto('ana', 'en')}»`);
    reloj.h = 12; paso();
    ok(r.estado('ana').estado === 'volviendo' && llamadas.some(l => l[0] === 'volver' && l[1] === 'ana'), 'a las 12 vuelve a su sitio');
    for (let i = 0; i < 5 && P.beto.visita; i++) P.beto.visita.animar(0.5);
    ok(!P.beto.visita && Math.abs(P.beto.p.cuello.rotation.y) < 1e-6, 'al irse, quien recibía vuelve la cabeza y suelta el gancho');
    ok(r.texto('ana').startsWith('Va de vuelta'), `panel de vuelta: «${r.texto('ana')}»`);
    paseos.casa('ana'); paso();
    ok(r.estado('ana').estado === 'en-sitio' && r.texto('ana') === '', 'de vuelta en su sitio, sin línea en el panel');
    // A un lugar
    reloj.h = 14; paso();
    ok(r.estado('ana').estado === 'yendo' && llamadas[llamadas.length - 1][2] === 'faro', 'a las 14 va a un lugar (el faro)');
    ok(r.texto('ana').startsWith('Va camino'), `panel yendo a un lugar: «${r.texto('ana')}»`);
    reloj.h = 16; paso();
    ok(r.estado('ana').estado === 'volviendo', 'termina el tramo antes de llegar: se devuelve');
}
{
    // Choques: escena, libre, la persona visitada fuera; otro lo movió
    const { r, P, paseos, reloj, permiso, paso, llamadas } = armar({ visitas: VIS, hora: 10 });
    P.ana.escena = () => true; paso();
    ok(r.estado('ana').estado === 'en-sitio', 'con una escena (Hablar, misión, tienda) no sale');
    delete P.ana.escena; permiso.libre = false; paso();
    ok(r.estado('ana').estado === 'en-sitio', 'con la ronda del iglú, un minijuego o un jefe no sale');
    permiso.libre = true; paso();
    ok(r.estado('ana').estado === 'yendo', 'libre otra vez: sale');
    // /caminar de por medio: si lo mueven a su sitio de golpe, lo nota
    paseos.casa('ana'); paso();
    ok(r.estado('ana').estado === 'en-sitio' || r.estado('ana').estado === 'yendo', 'lo mandaron a su sitio de golpe: no queda pegado en «yendo» sin paseo');
    reloj.h = 7; paseos.casa('ana'); paso(); paseos.ir('ana', 'faro'); llamadas.length = 0; paso();
    ok(r.estado('ana').estado === 'en-sitio' && !llamadas.some(l => l[1] === 'ana'), 'otro lo movió (/caminar): la rutina no lo pelea');
}
{
    // 7j-1: acompañando y retomar según la hora
    const { r, paseos, reloj, paso, llamadas } = armar({ visitas: VIS, hora: 10 });
    paso();
    ok(r.estado('ana').estado === 'yendo', 'parte yendo a ver a Beto');
    ok(r.acompanar('ana') && r.estado('ana').estado === 'acompanando', 'acompanar: estado «acompanando»');
    ok(r.texto('ana') === 'Te está acompañando.', `panel: «${r.texto('ana')}»`);
    reloj.h = 12; llamadas.length = 0; paso(3);
    ok(r.estado('ana').estado === 'acompanando' && !llamadas.length, 'acompañando, la hora no lo mueve');
    reloj.h = 10.5;
    r.retomar('ana');
    ok(r.estado('ana').estado === 'yendo' && llamadas.some(l => l[0] === 'ir' && l[2].persona === 'beto'), 'retomar dentro del tramo: va directo a la visita');
    r.acompanar('ana'); reloj.h = 13; llamadas.length = 0;
    r.retomar('ana');
    ok(r.estado('ana').estado === 'volviendo' && llamadas.some(l => l[0] === 'volver'), 'retomar fuera de todo tramo y lejos de su sitio: vuelve');
    paseos.casa('ana'); paso();
    ok(r.estado('ana').estado === 'en-sitio', 'y queda en su sitio');
    r.acompanar('ana'); r.retomar('ana');
    ok(r.estado('ana').estado === 'en-sitio', 'retomar en su sitio sin visita: en-sitio');
    ok(!r.acompanar('nadie'), 'acompanar a alguien que no existe: false');
}
{
    // Acompañando: no lo visitan; si ya iban, se devuelven; Probar no lo pisa
    const { r, P, reloj, paso } = armar({ visitas: VIS, hora: 10 });
    r.acompanar('beto'); paso();
    ok(r.estado('ana').estado === 'en-sitio', 'a quien te acompaña no lo van a ver');
    ok(!r.probar('ana-beto'), 'probar: tampoco si te acompaña');
    r.retomar('beto'); paso();
    ok(r.estado('ana').estado === 'yendo', 'al soltarlo, la visita sigue');
    r.acompanar('beto'); paso();
    ok(P.ana.paseo.texto === '¿Y BETO? Pensé que estaba aquí.', `se lo llevan mientras iba: se da cuenta y lo dice («${P.ana.paseo.texto}»)`);
    paso(RD.ajustesRutinas().esperaAusente + 1);
    ok(r.estado('ana').estado === 'volviendo' && P.ana.paseo.texto === '', 'y después se devuelve');
    reloj.h = 10; P.beto.escena = null;
}
{
    // Va a la persona: si al llegar no está cerca (no la alcanzó), «no está» con su frase y gesto, y vuelve
    const { r, P, paseos, paso } = armar({ visitas: { ...VIS, 'ana-beto': { ...VIS['ana-beto'], ausente: { gesto: 'saluda', texto: { es: 'Beto no está', en: 'Beto is not here' } } } }, hora: 10 });
    paso();
    P.beto.x = 200; // Beto se fue lejos y Ana no lo alcanzó
    paseos.poner('ana', 'alla'); paso(0.6);
    ok(r.estado('ana').estado === 'yendo' && P.ana.paseo.texto === 'Beto no está' && !P.beto.visita, `llega y no está: no saluda a la nada, dice lo suyo («${P.ana.paseo.texto}»)`);
    paso(RD.ajustesRutinas().esperaAusente + 1);
    ok(r.estado('ana').estado === 'volviendo', 'llega y no está: vuelve a su sitio');
}
{
    // No puede llegar hasta la persona (atascado a la vista): no saluda a la nada; «¿Y Beto?» y vuelve
    const { r, P, paseos, paso } = armar({ visitas: VIS, hora: 10 });
    paso();
    paseos.poner('ana', 'atascado'); paso(0.6);
    ok(P.ana.paseo.texto === '¿Y BETO? Pensé que estaba aquí.' && !P.beto.visita, `atascado: se da cuenta («${P.ana.paseo.texto}»), sin saludo`);
    paso(RD.ajustesRutinas().esperaAusente + 1);
    ok(r.estado('ana').estado === 'volviendo', 'atascado: vuelve');
}
{
    // De visita, Beto se aleja: Ana deja de saludar y lo sigue; al alcanzarlo se queda sin repetir el saludo
    const { r, P, paseos, paso } = armar({ visitas: VIS, hora: 10 });
    paso(); paseos.llegar('ana'); paso(0.6);
    ok(r.estado('ana').estado === 'visitando' && P.ana.paseo.texto === 'Hola Beto', 'de visita y saludando');
    P.beto.x = 60; paso(0.6);
    ok(r.estado('ana').estado === 'yendo' && P.ana.paseo.texto === '', 'Beto se fue: deja de saludar y lo sigue');
    ok(!P.beto.visita || P.beto.visita.fin, 'Beto ya no contesta a la nada');
    paseos.llegar('ana'); paso(0.6);
    ok(r.estado('ana').estado === 'visitando' && P.ana.paseo.texto === '' && P.beto.visita && !P.beto.visita.fin, 'lo alcanza: de visita otra vez, sin repetir el saludo, y Beto lo mira');
}
{
    // Va a verlo aunque no esté en su sitio (paseos.js lo sigue donde esté)
    const { r, paseos, paso } = armar({ visitas: VIS, hora: 10 });
    paseos.ir('beto', 'faro'); paso();
    ok(r.estado('ana').estado === 'yendo', 'Beto no está en su sitio: Ana igual va a verlo');
}
{
    // Quien tiene visita (o alguien viene a verlo) no sale de su casa
    const V2 = { ...VIS, 'beto-caro': { quien: 'beto', visita: 'caro', de: 10, a: 12 } };
    const { r, paso } = armar({ visitas: V2, hora: 10 });
    paso();
    ok(r.estado('ana').estado === 'yendo' && r.estado('beto').estado === 'en-sitio', 'Beto no sale: Ana viene a verlo');
}
{
    // «Probar ahora» (Estudio): sin mirar la hora, llega, saluda y vuelve solo
    const { r, paseos, paso, reloj } = armar({ visitas: VIS, hora: 20 });
    ok(r.probar('ana-beto') && r.estado('ana').estado === 'yendo' && r.estado('ana').forzada, 'probar: sale aunque no sea la hora');
    paso();
    ok(r.estado('ana').estado === 'yendo', 'probar: la hora no la corta');
    paseos.llegar('ana'); paso(0.5);
    ok(r.estado('ana').estado === 'visitando', 'probar: llega');
    const A = RD.ajustesRutinas();
    reloj.h = 10.5; // mientras tanto llega la hora de esa misma visita
    paso(A.respuesta + Math.max(A.frase, A.gesto) + 5);
    ok(r.estado('ana').estado === 'volviendo', 'probar: termina sola y vuelve');
    paso(2);
    ok(r.estado('ana').estado === 'volviendo', 'probar dentro del horario de esa misma visita: no la repite (no saluda dos veces)');
    ok(!r.probar('no-existe'), 'probar una visita que no existe: false');
    ok(r.quienDe('ana-beto') === 'ana' && r.visitas().includes('ana-faro'), 'quienDe y visitas');
    reloj.h = 20;
}
{
    // ponerGesto: encima de la pose, cy se suma, el peso mezcla
    const p = rig();
    p.cuello.rotation.y = 0.2;
    R.ponerGesto(p, { bDx: -2, cy: 0.5, nada: 3 }, 0.5);
    ok(Math.abs(p.brazoD.rotation.x + 1) < 1e-9 && Math.abs(p.cuello.rotation.y - 0.35) < 1e-9, 'ponerGesto: mezcla con el peso');
    p.cuello.rotation.y = 0;
    R.ponerGesto(p, { cy: 0.2 }, 1, -0.5);
    ok(Math.abs(p.cuello.rotation.y + 0.3) < 1e-9, 'ponerGesto: el giro del gesto va sobre hacia dónde mira');
    ok(Math.abs(R.mirarA({ x: 0, z: 0, yaw: 0 }, { x: 0, z: 5 })) < 1e-9 && R.mirarA({ x: 0, z: 0, yaw: 0 }, { x: 0, z: -5 }, 1.1) === 1.1, 'mirarA: de frente 0; atrás, el tope');
    R.ponerGesto(p, { bDx: 5 }, 0);
    ok(Math.abs(p.brazoD.rotation.x + 1) < 1e-9, 'ponerGesto: peso 0 no toca nada');
}
{
    // Saludo lejos del jugador: el reloj sigue, sin globos
    const { r, P, paseos, paso } = armar({ visitas: VIS, hora: 10, jugador: { pos: { x: 500, z: 500 } } });
    paso(); paseos.llegar('ana'); paso(1);
    ok(r.estado('ana').estado === 'visitando' && P.ana.paseo.texto === '', 'lejos del jugador: llega sin globo');
}
{
    // 5b. Te incluyen: Ana (Buen amigo) va a ver a Beto y pasa junto al jugador: lo mira, saluda y lo dice una vez
    const jugador = { pos: { x: 2, z: 3 } }, nivel = { ana: 3 };
    const { r, P, fuera, paso } = armar({ visitas: VIS, hora: 10, jugador, nivel });
    paso(0.5);
    await new Promise(res => setTimeout(res, 0));
    paso(0.2);
    ok(r.estado('ana').estado === 'yendo' && P.ana.paseo.texto === '¡Hola! Voy a ver a BETO. ¿Te vienes?', `amistad alta: te saluda al pasar («${P.ana.paseo.texto}»)`);
    const p = rig();
    fuera.get('ana').adorno(0.1, p);
    ok(fuera.get('ana').mira === jugador.pos && p.brazoD.rotation.x < 0, 'al saludarte te mira (paseos.mirar, un solo dueño del cuello) y hace su gesto');
    const A = RD.ajustesRutinas();
    paso(Math.max(A.frase, A.gesto) + 1);
    ok(P.ana.paseo.texto === '' && !fuera.get('ana').adorno && !fuera.get('ana').mira, 'el saludo al pasar termina solo (sin globo, gesto ni mirada)');
    paso(5);
    ok(P.ana.paseo.texto === '', 'no repite el saludo antes de `esperaIncluir`');
    nivel.ana = 2; r.cortar('ana');
    const b = armar({ visitas: VIS, hora: 10, jugador, nivel: { ana: 2 } });
    b.paso(1);
    ok(b.r.estado('ana').estado === 'yendo' && b.P.ana.paseo.texto === '', 'amistad más baja: pasa sin saludarte');
    const c = armar({ visitas: VIS, hora: 10, jugador: { pos: { x: 30, z: 30 } }, nivel: { ana: 4 } });
    c.paso(1);
    ok(c.P.ana.paseo.texto === '', 'lejos (más allá de radioIncluir): no te saluda');
    // De visita, después del saludo con quien recibe: «Ven, estamos aquí con …»
    const jd = { pos: { x: 30, z: 30 } };
    const d = armar({ visitas: VIS, hora: 10, jugador: jd, nivel: { ana: 3 } });
    d.paso(0.5); d.paseos.llegar('ana'); d.paso(A.respuesta + A.frase + 1);
    jd.pos.x = d.P.ana.x + 2; jd.pos.z = 2; d.paso(0.6);
    ok(d.r.estado('ana').estado === 'visitando' && d.P.ana.paseo.texto === '¡Hola! Ven, estamos aquí con BETO.', `de visita te invita («${d.P.ana.paseo.texto}»)`);
    RD.fijarRutinas({ ajustes: { anticipar: 0 }, visitas: VIS, incluir: { visitando: { es: 'Vente, {quien} invita.' } } });
    ok(RD.incluirRutinas().visitando.en === 'Vente, {quien} invita.' && RD.incluirRutinas().gesto === 'saluda', 'rutinas.json → incluir cambia una frase (sin inglés copia el español) y deja lo demás');
}
{
    // 5b. Cooperativo: el anfitrión decide y manda; el invitado no mira la hora y aplica lo que llega
    const msgs = [];
    const h = armar({ visitas: VIS, hora: 10 });
    h.r.red({ enviar: m => msgs.push(JSON.parse(JSON.stringify(m))) });
    const g = armar({ visitas: VIS, hora: 10 });
    g.r.red('seguir');
    h.paso(1); g.paso(1);
    ok(msgs.length === 1 && msgs[0].c === 'ana' && msgs[0].a === 'sale' && msgs[0].v === 'ana-beto', `anfitrión: manda «sale» (${JSON.stringify(msgs)})`);
    ok(g.r.estado('ana').estado === 'en-sitio', 'invitado: con la misma hora no sale por su cuenta');
    ok(msgs.every(m => !('e' in m) && !('de' in m) && !('para' in m)), 'los mensajes no pisan e, de ni para (campos de la sala)');
    msgs.forEach(m => g.r.recibir(m)); g.paso(0.5);
    ok(g.r.estado('ana').estado === 'yendo' && g.llamadas.some(l => l[0] === 'ir' && l[1] === 'ana'), 'invitado: sale al llegarle «sale»');
    g.paseos.llegar('ana'); g.paso(0.5);
    await new Promise(res => setTimeout(res, 0)); g.paso(0.2);
    ok(g.r.estado('ana').estado === 'visitando' && g.P.ana.paseo.texto === 'Hola Beto', 'invitado: su llegada y su saludo los dibuja él');
    h.paseos.llegar('ana'); h.paso(1);
    // Quien entra a la sala con la visita empezada: llega sin repetir el saludo
    const foto = h.r.foto();
    ok(foto.length === 1 && foto[0].ya === 1 && foto[0].v === 'ana-beto', `foto para quien entra (${JSON.stringify(foto)})`);
    const g2 = armar({ visitas: VIS, hora: 10 });
    g2.r.red('seguir'); g2.r.recibir({ l: foto }); g2.paso(0.5); g2.paseos.llegar('ana'); g2.paso(1);
    ok(g2.r.estado('ana').estado === 'visitando' && g2.P.ana.paseo.texto === '', 'entra con la visita empezada: llega sin repetir el saludo');
    msgs.length = 0; h.reloj.h = 12; h.paso(1);
    ok(msgs.some(m => m.c === 'ana' && m.a === 'vuelve'), 'anfitrión: manda «vuelve» al terminar el tramo');
    msgs.forEach(m => g.r.recibir(m)); g.paso(0.5);
    ok(g.r.estado('ana').estado === 'volviendo', 'invitado: vuelve al llegarle «vuelve»');
    g.paseos.casa('ana'); g.paso(1);
    ok(g.r.estado('ana').estado === 'en-sitio', 'invitado: de vuelta en su sitio');
    // «No está»: también lo decide el anfitrión
    const h3 = armar({ visitas: VIS, hora: 10 }), m3 = [];
    h3.r.red({ enviar: m => m3.push(m) }); h3.paso(1);
    h3.paseos.llegar('ana'); h3.P.beto.x = 200; h3.paso(1);
    ok(m3.some(m => m.a === 'noesta' && m.v === 'ana-beto'), 'anfitrión: manda «noesta» si no encontró a quien visitaba');
    const g3 = armar({ visitas: VIS, hora: 10 });
    g3.r.red('seguir'); m3.forEach(m => g3.r.recibir(m)); g3.paso(0.5);
    ok(g3.r.estado('ana').estado === 'yendo' || g3.r.estado('ana').estado === 'volviendo', `invitado: aplica «noesta» (${g3.r.estado('ana').estado})`);
    g3.r.recibir({ c: 'nadie', a: 'sale', v: 'x' }); g3.r.recibir(null); g3.r.recibir({ a: 'sale' });
    ok(true, 'invitado: mensajes raros no rompen nada');
    const solo = armar({ visitas: VIS, hora: 10 });
    solo.r.recibir({ c: 'ana', a: 'sale', v: 'ana-faro' }); solo.paso(0.2);
    ok(solo.r.estado('ana').visita !== 'ana-faro', 'sin sala (o anfitrión): recibir no hace nada');
}

// ---------------------------------------------------------
// 6. Esquema, pestaña Vida y conexión con el juego
// ---------------------------------------------------------
{
    const esquema = json('estudio/esquemas/rutinas.schema.json');
    ok(iguales(Object.keys(esquema.properties.ajustes.properties), Object.keys(RD.RUTINA_BASE)), 'esquema: ajustes = RUTINA_BASE');
    ok(iguales(Object.keys(esquema.properties.textos.properties), Object.keys(R.TEXTOS_RUTINA)), 'esquema: textos = TEXTOS_RUTINA');
    for (const [k, e] of Object.entries(esquema.properties.ajustes.properties)) ok(RD.RUTINA_BASE[k] >= e.minimum && RD.RUTINA_BASE[k] <= e.maximum, `RUTINA_BASE.${k} dentro del esquema`);
    const vida = leer('estudio/vida.js');
    const bloque = nombre => { const m = vida.match(new RegExp(`const ${nombre} = \\{([\\s\\S]*?)\\n\\};`)); return m ? [...m[1].matchAll(/^\s+(\w+):/gm)].map(x => x[1]) : []; };
    ok(iguales(bloque('RUTINA'), Object.keys(RD.RUTINA_BASE)), 'pestaña Vida: todos los ajustes de las rutinas');
    const tp = vida.match(/const TEXTOS_PANEL = \{(.*)\};/);
    ok(tp && iguales([...tp[1].matchAll(/(\w+): \[/g)].map(x => x[1]), Object.keys(R.TEXTOS_RUTINA)), 'pestaña Vida: todas las líneas del panel');
    for (const [k, tx] of Object.entries(R.TEXTOS_RUTINA)) ok(tx.es && tx.en, `TEXTOS_RUTINA.${k} con ES y EN`);
    const indice = json('mundo/datos/indice.json');
    ok(indice.archivos ? !!indice.archivos.rutinas : JSON.stringify(indice).includes('"rutinas"'), 'indice.json nombra rutinas.json');
    const main = leer('mundo/supervivencia/main.js');
    ok(main.includes('crearRutinas(') && main.includes("cargarDatos('rutinas')") && main.includes('rutinas.actualizar('), 'main.js crea las rutinas, lee rutinas.json y las actualiza');
    ok(main.includes('deVisita:'), 'main.js pasa la línea «de visita» a los paneles');
    ok(leer('mundo/supervivencia/tienda.js').includes('ctx.deVisita'), 'tienda.js la muestra bajo las pestañas (Hablar, Misión, Tienda)');
    const amigos = leer('mundo/criaturas/amigos.js');
    ok(amigos.includes('n.visita.animar(dt)') && amigos.includes('n.visita.texto'), 'amigos.js dibuja el gancho n.visita');
    ok(leer('mundo/supervivencia/paseos.js').includes('adornar('), 'paseos.js deja adornar al que llega');
    ok(/p6\.tipo === 'grupo' && personas\(\)\.some\(p => GRUPOS\[p6\.grupo\]\.npcs\.includes\(p\.clave\) && p\.n\.paseo\)/.test(leer('mundo/supervivencia/escenas-skin.js')), 'escena de grupo: no sale si alguien del grupo anda de visita');
    ok(main.includes('grupoListo: clave =>') && main.includes("GRUPOS[nombre].npcs.every(k => !paseos.fuera(k))") && leer('mundo/supervivencia/hablar.js').includes('ctx.grupoListo(clave)'), 'saludo del grupo (botón y automático): solo con todos en su sitio');
    ok(iguales(Object.keys(esquema.properties.incluir.properties), Object.keys(RD.INCLUIR_BASE)), 'esquema: incluir = INCLUIR_BASE');
    ok(vida.includes('INCLUIR_BASE[k]') && ['yendo', 'visitando', 'volviendo', 'paseo'].every(k => vida.includes(`['${k}', `)), 'pestaña Vida: frases de «te saludan al pasar»');
    for (const [k, tx] of Object.entries(RD.INCLUIR_BASE)) if (k !== 'gesto') ok(tx.es && tx.en, `INCLUIR_BASE.${k} con ES y EN`);
    ok(main.includes('nivel: c =>') && main.includes('rutinas.red(') && main.includes('rutinas.recibir(') && main.includes('rutinas.foto()'), 'main.js: nivel de amistad y rutinas en el cooperativo');
    const coop = leer('mundo/supervivencia/coop.js');
    ok(/TIPOS = \[[^\]]*'ru'/.test(coop) && coop.includes('ru(m)') && coop.includes("rutina(m, para)"), "coop.js: mensaje 'ru' (escuchado, manejado y enviado)");
    const proto = leer('estudio/puente-protocolo.js');
    ok(proto.includes("case 'rutina'") && proto.includes("'rutinas'"), 'puente: mensaje rutina y rutinas en vivo');
}

console.warn = avisoOriginal;
console.log(`${pruebas - fallos}/${pruebas} comprobaciones de rutinas ${fallos ? 'con FALLAS' : 'OK'}`);
process.exit(fallos ? 1 : 0);
