// =========================================================
// VENJY · Estudio · editor de la mesa del Duelo de Cartas (7h-2b)
// Edita mundo/datos/cartas-mesa.json: dónde queda la mesa junto a Lucho, sus medidas, las cartas que sostiene
// Lucho y las cámaras (1.ª persona, enfoque y la lista de 3.ª persona). Comparte pantalla con el juego (pestaña
// Mesa = el iframe de Juego más este panel). Cada cambio va en vivo (mensaje `datos`); «Abrir la mesa»,
// «Abrir el tutorial» y «Cambiar vista» usan el mensaje `mesa`. Guardar escribe el JSON con If-Match, como Posiciones.
// También los límites del mazo y la colección inicial del duelo (grupos «Colección y mazo» y «Colección inicial»)
// y la tienda de cartas de Lucho (grupos «Tienda de cartas», «Precio de cada carta suelta» y «Sobres: peso de cada carta»).
// Duelo entre jugadores donde están: grupos «retar», «sobre un tronco», «en el piso» y «Cámara que mira al otro jugador».
// =========================================================
import { instalarDeshacer, botonJuego, filaPerilla } from './campo-comun.js';
import { perillasDisponibles, leerPerilla, ponerPerilla, CAMARAS, baseDeCamara, camaraDeBase, GRUPOS_SIMPLES, frasePosicion } from './mesa-simple.mjs';
const clonar = o => JSON.parse(JSON.stringify(o));
// Grupos en el orden del panel, con su nombre y qué es cada número
const GRUPOS = [
    ['mesa', 'Mesa', 'Table', { giro: 'hacia dónde mira Lucho (grados)', dist: 'distancia de Lucho al centro', lado: 'correr a la derecha de Lucho', ancho: 'ancho', fondo: 'fondo', alto: 'alto' }],
    ['manoRival', 'Cartas en la mano de Lucho', 'Cards in Lucho\'s hand', { sep: 'separación', z: 'cerca (−) / lejos de la mesa', alto: 'altura sobre la mesa', inclina: 'inclinación (grados)' }],
    ['camara1', 'Cámara 1.ª persona', '1st-person camera', { alto: 'altura', atras: 'más atrás' }],
    ['enfoque', 'Cámara al elegir carta', 'Camera when picking a card', { alto: 'altura sobre la mesa', z: 'hacia ti' }],
    ['zonas', 'Zonas', 'Zones', { sep: 'separación', propia: 'tu fila', rival: 'fila de Lucho' }],
    ['carta', 'Cartas', 'Cards', { ancho: 'ancho de carta' }],
    ['mazo', 'Mazos', 'Decks', {}],
    ['asiento', 'Tu asiento', 'Your seat', { dist: 'distancia a la mesa' }],
    ['mini', 'Vista de arriba (3.ª persona)', 'Top view (3rd person)', { ancho: 'fracción de pantalla', max: 'ancho máx. (px)', alto: 'altura de la cámara', margen: 'margen (px)' }],
    ['mano', 'Tu mano en pantalla', 'Your hand on screen', { alto: 'fracción del alto', max: 'alto máx. (px)', solape: 'solape', sube: 'cuánto sube la elegida' }],
    ['desc', 'Descarte (cementerio)', 'Discard pile', {}],
    // Animaciones (cartas-mesa-anim.js): «Repetir la última jugada» las vuelve a mostrar con los valores nuevos
    ['anim', 'Animaciones', 'Animations', { activas: '1 = sí, 0 = no', velocidad: '2 = el doble de rápido', arco: 'altura del vuelo (m)', alzar: 'altura del hechizo (m)', embestida: 'cuánto avanza al atacar (0-1)', sacudida: 'temblor del golpe (m)', flota: 'cuánto sube el número (px)', numero: 'tamaño del número (px)', pulso: 'tamaño del brillo', tocarSalta: '1 = tocar salta la animación' }],
    ['duraciones', 'Animaciones: segundos por evento', 'Animations: seconds per event', {}],
    ['sigue', 'Animaciones: cuándo empieza el siguiente (0-1)', 'Animations: when the next one starts (0-1)', {}],
    ['colores', 'Animaciones: colores', 'Animations: colors', {}],
    // Sonido (cartas-mesa-sonido.js): cuelga de los mismos eventos; 0 apaga ese sonido
    ['sonido', 'Sonido del duelo', 'Duel sound', { activo: '1 = suena, 0 = mudo', volumen: 'volumen general', roba: 'robar carta', juega: 'poner carta / cambiar postura', ataque: 'embestida', golpe: 'daño recibido', destruye: 'carta destruida', hechizo: 'hechizos', efecto: 'efectos, escudos y poderes', cura: 'curar', turno: 'aviso de turno', gana: 'ganar', pierde: 'perder', empate: 'empatar' }],
    // Tutorial y turno de Lucho (pulido, PR 3): «Abrir el tutorial» lo juega desde el principio
    ['turnoLucho', 'Turno de Lucho: cámara', "Lucho's turn: camera", { enPartida: '1 = también fuera del tutorial', pausa: 'segundos mirándolo antes de jugar', mesa: 'segundos en la mesa tras su jugada' }],
    ['planoLucho', 'Cámara que mira a Lucho', 'Camera looking at Lucho', { lado: 'a tu derecha', alto: 'altura sobre la mesa', z: 'hacia ti' }],
    ['planoMesa', 'Cámara en la mesa (jugada de Lucho)', "Table camera (Lucho's play)", { lado: 'a tu derecha', alto: 'altura sobre la mesa', z: 'hacia ti' }],
    // Colección y mazo (etapa A, punto 3): límites del armado y del mazo al azar, y con qué cartas parte cada jugador
    ['coleccion', 'Colección y mazo', 'Collection and deck', { largo: 'cartas del mazo', copias: 'máximo de cada carta', azarExtra: 'cartas de más en la mano (mazo al azar)', azarTodas: '1 = al azar de todas las cartas, 0 = de tu colección', hechizosMin: 'mínimo de hechizos (al azar)', hechizosMax: 'máximo de hechizos (al azar)' }],
    ['coleccionInicial', 'Colección inicial (copias de cada carta)', 'Starting collection (copies of each card)', {}],
    // Tienda de cartas (etapa A, punto 3, PR 2): sobres y cartas sueltas que vende Lucho, en esmeraldas
    ['tiendaCartas', 'Tienda de cartas', 'Card shop', { activa: '1 = Lucho vende cartas, 0 = no', sobrePrecio: 'esmeraldas por sobre', sobreCartas: 'cartas por sobre', sobreNuevas: 'cuántas salen de las que no tienes', sobreHechizos: 'hechizos mínimos por sobre', sueltaTope: '1 = no vende una suelta si ya tienes las que caben en un mazo', mesaPrecio: 'esmeraldas por la mesa de duelo (0 = no la vende)' }],
    ['preciosCartas', 'Precio de cada carta suelta (0 = no se vende)', 'Price of each single card (0 = not sold)', {}],
    ['pesosSobre', 'Sobres: peso de cada carta (0 = nunca sale)', 'Packs: weight of each card (0 = never drops)', {}],
    // Abrir el sobre (cartas-sobre.js): «Probar el sobre» la muestra en el juego con estos valores
    ['sobreAnim', 'Sobre: abrir (rasgar y voltear)', 'Pack: opening (tear and flip)', { activa: '1 = lo rasgas tú, 0 = sin escena', rasgar: 'cuánto arrastrar (1 = todo el ancho)', toques: 'toques que lo abren', salir: 'segundos que sale cada carta', voltear: 'segundos que se da vuelta', entre: 'segundos entre cartas', tapa: 'segundos que vuela la tapa', ancho: 'ancho del sobre (px)', sacudir: '1 = tiembla al rasgar', sonido: 'volumen (0 = mudo)' }],
    // Duelo entre 2 jugadores de la sala (cartas-duelo.js): cada uno con su mazo
    ['duelo', 'Duelo entre jugadores', 'Player duel', { vida: 'vida de cada uno', mano: 'cartas en la mano al empezar', espera: 'segundos para aceptar el reto (0 = sin límite)', esperaMesa: 'segundos esperando rival en una mesa colocada (0 = sin límite)' }],
    // Duelo donde están los dos (PR 2): retar con el MAZO apuntando al otro; se juega en el piso o sobre un tronco
    ['lugar', 'Duelo entre jugadores: retar', 'Player duel: challenge', { dist: 'metros máx. hasta el otro', desnivel: 'diferencia de altura máx.', mesaCerca: 'metros máx. hasta una mesa colocada para jugar en ella', mirar: 'metros hasta un duelo ajeno para verlo (0 = no)' }],
    // Mesa de duelo (PR 3): colores del mueble (la de Lucho, la que se lleva y la colocada en el mundo)
    ['mueble', 'Mesa de duelo: colores', 'Duel table: colors', {}],
    ['tronco', 'Duelo sobre un tronco', 'Duel on a log', { alto: 'alto del tronco', ojos: 'cámara sentado', asiento: 'separación: cada jugador hasta el borde (más = más lejos uno del otro)', mano: 'cartas del rival (alto)' }],
    ['piso', 'Duelo en el piso', 'Duel on the ground', { alto: 'alto de las cartas', ojos: 'cámara sentado', asiento: 'separación: cada jugador hasta el borde (más = más lejos uno del otro)', mano: 'cartas del rival (alto)' }],
    ['planoRival', 'Cámara que mira al otro jugador', 'Camera looking at the other player', { lado: 'a tu derecha', alto: 'desde tus ojos', z: 'hacia ti' }],
    ['turnoRival', 'Turno del otro jugador: cámara', "Other player's turn: camera", { mirar: '1 = lo mira (cámara de arriba), 0 = tu vista del tablero' }],
    // Celular en horizontal: dónde van los botones y la carta grande (px)
    ['hudHorizontal', 'Celular horizontal: botones y carta', 'Phone landscape: buttons and card', { altoMax: 'vale hasta este alto de pantalla', arriba: 'desde arriba', ancho: 'ancho de los botones', boton: 'alto de cada botón', lectorAncho: 'ancho de la carta grande', lectorDerecha: 'margen derecho de la carta' }],
    ['tutorial', 'Tutorial: resaltado y lectura', 'Tutorial: highlight and reading', { opacidad: 'opacidad del marco (0-1)', pulso: 'pulsos por segundo', borde: 'tamaño del marco (× la carta)', leer: 'segundos que habla Lucho antes de jugar' }]
];
const GRADOS = new Set(['giro', 'inclina']);
// Enteros con su tope (colección y mazo); el resto, según el valor
const ENTEROS = { coleccion: { largo: [10, 40], copias: [1, 4], azarExtra: [0, 3], azarTodas: [0, 1], hechizosMin: [0, 40], hechizosMax: [0, 40] }, coleccionInicial: {},
    duelo: { vida: [500, 20000], mano: [1, 7], espera: [0, 120], esperaMesa: [0, 600] }, turnoRival: { mirar: [0, 1] },
    hudHorizontal: { altoMax: [300, 900], arriba: [0, 200], ancho: [90, 260], boton: [20, 60], lectorAncho: [90, 320], lectorDerecha: [0, 200] },
    tiendaCartas: { activa: [0, 1], sobrePrecio: [1, 64], sobreCartas: [1, 10], sobreNuevas: [0, 10], sobreHechizos: [0, 10], sueltaTope: [0, 1], mesaPrecio: [0, 64] }, preciosCartas: {}, pesosSobre: {} };
// Sin tope propio: 0-4 (copias); precios hasta 10 esmeraldas y pesos hasta 5 (con el número se puede poner más)
const TOPE = { preciosCartas: [0, 10], pesosSobre: [0, 5] };
const rangoGrupo = (g, k, v) => (ENTEROS[g] ? [...(ENTEROS[g][k] || TOPE[g] || [0, 4]), 1] : rango(k, v));
const rango = (k, v) => GRADOS.has(k) ? [-180, 180, 1] : v > 10 ? [0, Math.max(600, v * 2), 1] : v > 3 ? [0, Math.max(10, v * 2), 0.1] : [-3, 3, 0.01];

export async function montarMesa(ctx) {
    const $ = id => document.getElementById(id);
    const t = (es, en) => (ctx.idioma === 'en' ? en : es);
    const caja = $('me-campos'), msg = $('me-mensaje'), btnGuardar = $('me-guardar');
    let etag = null, original = null, datos = null;
    try {
        const r = await fetch('../mundo/datos/cartas-mesa.json', { cache: 'no-cache' });
        etag = r.headers.get('ETag'); original = JSON.parse(await r.text()); datos = clonar(original);
    } catch (e) { caja.textContent = 'No se pudo leer mundo/datos/cartas-mesa.json'; return; }
    const inicial = clonar(original); // cómo llegó el archivo: los ajustes que se quitan («valor del juego») siguen a la vista, apagados
    const sucio = () => JSON.stringify(datos) !== JSON.stringify(original);
    function rotular(es, en, clase = '') { msg.textContent = t(es, en); msg.className = 'mensaje' + (clase ? ' ' + clase : ''); }
    const cambio = () => { ctx.puente.enviarDatos('cartas-mesa', datos); btnGuardar.disabled = !sucio() || !ctx.servidor.escritura; hist.anotar(); };
    // Deshacer (botón y Ctrl+Z) y punto en la pestaña (campo-comun.js, B0-C)
    const hist = instalarDeshacer(ctx, { pestana: 'mesa', idBoton: 'me-descartar', leer: () => JSON.stringify(datos), poner: x => { datos = JSON.parse(x); cambio(); pintar(); } });
    ctx.sucios.mesa = sucio;

    // `ref` = el mismo grupo tal como llegó el archivo (`inicial`)
    function numero(obj, k, etiqueta, grupo, ref) {
        const ausente = !(k in obj), v0 = ausente ? ref[k] : obj[k];
        const fila = document.createElement('label'); fila.className = 'campo' + (ausente ? ' ausente' : '');
        // En la vista simple, solo el nombre en palabras (la clave del JSON, en Avanzado)
        const s = document.createElement('span'); s.textContent = etiqueta ? (ctx.vista === 'simple' ? etiqueta : `${k} · ${etiqueta}`) : k;
        const [min, max, paso] = rangoGrupo(grupo, k, v0);
        const rg = document.createElement('input'); rg.type = 'range'; rg.min = min; rg.max = max; rg.step = paso; rg.value = v0;
        const n = document.createElement('input'); n.type = 'number'; n.step = paso; n.value = v0; n.style.width = '6em';
        const poner = v => { if (!Number.isFinite(v)) return; obj[k] = Math.round(v * 1000) / 1000; rg.value = obj[k]; n.value = obj[k]; fila.classList.remove('ausente'); if (volver) volver.disabled = false; cambio(); };
        rg.addEventListener('input', () => poner(Number(rg.value)));
        n.addEventListener('change', () => poner(Number(n.value)));
        const d = document.createElement('div'); d.className = 'fila-botones'; d.append(rg, n);
        const volver = ref ? botonJuego(ctx, { tiene: () => k in obj, quitar: () => { delete obj[k]; fila.classList.add('ausente'); cambio(); } }) : null;
        if (volver) d.append(volver);
        fila.append(s, d);
        return fila;
    }
    function colorCampo(obj, k) {
        const fila = document.createElement('label'); fila.className = 'campo';
        const s = document.createElement('span'); s.textContent = k;
        const c = document.createElement('input'); c.type = 'color'; c.value = obj[k];
        c.addEventListener('input', () => { obj[k] = c.value; cambio(); });
        fila.append(s, c);
        return fila;
    }
    function camara(obj, nombres = {}, grupo = null) {
        const out = [], ref = grupo ? inicial[grupo] : null;
        for (const k of new Set([...Object.keys(obj), ...Object.keys(ref || {})])) {
            if (k === 'nota') continue;
            if (!(k in obj)) { if (typeof ref[k] === 'number') out.push(numero(obj, k, nombres[k], grupo, ref)); continue; }
            if (k === 'mira') { obj.mira.forEach((_, i) => out.push(numero(obj.mira, i, ['mira: x (derecha)', 'mira: y (arriba)', 'mira: z (hacia ti)'][i]))); continue; }
            if (typeof obj[k] === 'number') out.push(numero(obj, k, nombres[k], grupo, ref));
            else if (typeof obj[k] === 'string' && /^#[0-9a-f]{6}$/i.test(obj[k])) out.push(colorCampo(obj, k));
        }
        return out;
    }
    function bloque(titulo, hijos, extra = []) {
        const sec = document.createElement('details'); sec.className = 'panel';
        const h = document.createElement('summary'); h.textContent = titulo;
        sec.append(h, ...hijos, ...extra);
        return sec;
    }
    // «Lo básico» (vista simple): perillas con palabras comunes sobre el archivo tal como llegó (mesa-simple.mjs)
    function pintarBasico() {
        const sec = bloque(t('Lo básico', 'The basics'), perillasDisponibles(inicial).map(p => filaPerilla(ctx, p, leerPerilla(p, datos, inicial), x => { ponerPerilla(p, datos, x, inicial); cambio(); pintar(); })));
        sec.open = true;
        caja.appendChild(sec);
    }
    // Dónde va la mesa (vista simple): una frase y el gizmo en el juego (gizmo-mesa.js); los números, en Avanzado («Mesa»)
    let gizmo = null; // 'mover' | 'girar' | null
    function pintarLugar() {
        const m = datos.mesa || (datos.mesa = {}), ref = inicial.mesa || {};
        const lugar = { giro: m.giro ?? ref.giro ?? 0, dist: m.dist ?? ref.dist ?? 0.75, lado: m.lado ?? ref.lado ?? 0 };
        const p = document.createElement('p'); p.className = 'nota'; p.textContent = frasePosicion(lugar, ctx.idioma);
        const fb = document.createElement('div'); fb.className = 'fila-botones';
        for (const [modo, es, en] of [['mover', 'Mover la mesa', 'Move the table'], ['girar', 'Girar la mesa', 'Turn the table']]) {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'boton chico' + (gizmo === modo ? '' : ' secundario');
            b.textContent = t(es, en); b.addEventListener('click', () => ponerGizmo(modo));
            fb.appendChild(b);
        }
        const soltar = document.createElement('button'); soltar.type = 'button'; soltar.className = 'boton chico secundario';
        soltar.textContent = t('Listo', 'Done'); soltar.disabled = !gizmo; soltar.addEventListener('click', quitarGizmo);
        fb.appendChild(soltar);
        const ayuda = document.createElement('p'); ayuda.className = 'nota';
        ayuda.textContent = t('Aparece una copia de la mesa junto a Lucho: arrastra las flechas (o el aro, para girarla) en el juego.', 'A copy of the table shows up next to Lucho: drag the arrows (or the ring, to turn it) in the game.');
        const sec = bloque(t('Dónde va la mesa', 'Where the table goes'), [p, fb, ayuda]);
        sec.open = true;
        caja.appendChild(sec);
    }
    async function ponerGizmo(modo) {
        try {
            rotular('Poniendo la mesa…', 'Placing the table…');
            ctx.puente.enviarDatos('cartas-mesa', datos);
            await ctx.puente.tp('lucho').catch(() => {}); // junto a Lucho, para verla
            await ctx.puente.enviar('mesa', { accion: modo });
            gizmo = modo;
            rotular('Arrástrala en el juego (Esc suelta el mouse).', 'Drag it in the game (Esc frees the mouse).', 'ok');
        } catch (e) { rotular(e.message, e.message, 'error'); }
        pintar();
    }
    async function quitarGizmo() {
        if (!gizmo) return;
        gizmo = null;
        try { await ctx.puente.enviar('mesa', { accion: 'soltar' }); } catch (e) { /* sin juego: nada que quitar */ }
        pintar();
    }
    // El juego avisa al soltar el gizmo: solo cambian giro, dist y lado (las medidas siguen en Avanzado)
    ctx.puente.alMensaje(m => {
        if (m.tipo !== 'cambio' || m.nombre !== 'cartas-mesa' || m.ruta !== 'mesa' || !m.valor) return;
        const mesa = datos.mesa || (datos.mesa = {});
        for (const k of ['giro', 'dist', 'lado']) if (Number.isFinite(m.valor[k])) mesa[k] = m.valor[k];
        cambio(); pintar();
        rotular(frasePosicion(mesa, ctx.idioma) + '.', frasePosicion(mesa, 'en') + '.', 'ok');
    });
    ctx.alPestana.push(clave => { if (clave !== 'mesa') quitarGizmo(); });

    function pintar() {
        caja.textContent = '';
        pintarLugar();
        pintarBasico();
        // Los grupos de números son lo fino (Avanzado), salvo las listas por carta (colección inicial, precios, pesos)
        for (const [clave, es, en, nombres] of GRUPOS) if (datos[clave]) {
            const b = bloque(t(es, en), camara(datos[clave], nombres, clave));
            if (!GRUPOS_SIMPLES.includes(clave)) b.classList.add('solo-avanzado');
            caja.appendChild(b);
        }
        // 3.ª persona: lista de cámaras (se agregan y se quitan). En Simple, cada una es una base («cerca», «de lado»…)
        const lista = datos.terceras || (datos.terceras = []);
        const simple = bloque(t('Cámaras de 3.ª persona (Cambiar vista)', '3rd-person cameras (Change view)'), lista.map((c, i) => {
            const base = baseDeCamara(c);
            const p = { es: `Cámara ${i + 1}`, en: `Camera ${i + 1}`, opciones: CAMARAS.map(x => [x.clave, x.es, x.en]) };
            const fila = filaPerilla(ctx, p, base, x => { lista[i] = camaraDeBase(x); cambio(); pintar(); });
            const quitar = document.createElement('button'); quitar.type = 'button'; quitar.className = 'boton chico secundario';
            quitar.textContent = t('Quitar', 'Remove'); quitar.disabled = lista.length <= 1;
            quitar.addEventListener('click', () => { lista.splice(i, 1); cambio(); pintar(); });
            fila.appendChild(quitar);
            return fila;
        }));
        simple.open = true;
        caja.appendChild(simple);
        lista.forEach((c, i) => {
            const quitar = document.createElement('button'); quitar.type = 'button'; quitar.className = 'boton chico secundario';
            quitar.textContent = t('Quitar esta cámara', 'Remove this camera'); quitar.disabled = lista.length <= 1;
            quitar.addEventListener('click', () => { lista.splice(i, 1); cambio(); pintar(); });
            const b = bloque(t(`Cámara 3.ª persona ${i + 1}`, `3rd-person camera ${i + 1}`), camara(c, { alto: 'altura', atras: 'más atrás', lado: 'a tu derecha (−: izquierda)' }), [quitar]);
            b.classList.add('solo-avanzado');
            caja.appendChild(b);
        });
        // Agregar: desde una base (Simple) o copia de la última (Avanzado)
        const fs = document.createElement('div'); fs.className = 'fila-botones';
        const selBase = document.createElement('select');
        for (const x of CAMARAS) selBase.appendChild(new Option(t(x.es, x.en), x.clave));
        const sumarBase = document.createElement('button'); sumarBase.type = 'button'; sumarBase.className = 'boton chico';
        sumarBase.textContent = t('Agregar cámara', 'Add camera');
        sumarBase.addEventListener('click', () => { lista.push(camaraDeBase(selBase.value)); cambio(); pintar(); });
        const sumar = document.createElement('button'); sumar.type = 'button'; sumar.className = 'boton chico secundario solo-avanzado';
        sumar.textContent = t('Copiar la última cámara', 'Copy the last camera');
        sumar.addEventListener('click', () => { lista.push(clonar(lista[lista.length - 1] || camaraDeBase('lado'))); cambio(); pintar(); });
        fs.append(selBase, sumarBase, sumar);
        simple.appendChild(fs);
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    async function guardar() {
        rotular('Guardando…', 'Saving…');
        try {
            const resp = await fetch('../api/datos/cartas-mesa', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Estudio': '1', 'If-Match': etag || '*' }, body: JSON.stringify(datos) });
            const j = await resp.json().catch(() => ({}));
            if (resp.ok) { original = clonar(datos); etag = j.etag; rotular(`Guardado (${j.bytes} B).`, `Saved (${j.bytes} B).`, 'ok'); }
            else if (resp.status === 412) rotular('El archivo cambió en disco: recarga el Estudio.', 'The file changed on disk: reload the Studio.', 'error');
            else rotular(`No se guardó (${resp.status}): ${(j.errores || []).slice(0, 2).join(' · ') || j.error || ''}`, `Not saved (${resp.status})`, 'error');
        } catch (e) { rotular('No se pudo hablar con el servidor.', 'Could not reach the server.', 'error'); }
        btnGuardar.disabled = !sucio() || !ctx.servidor.escritura;
    }
    const mesa = async accion => {
        try { await ctx.puente.enviar('mesa', { accion }); rotular('Listo.', 'Done.', 'ok'); }
        catch (e) { rotular(e.message, e.message, 'error'); }
    };
    $('me-abrir').addEventListener('click', async () => { gizmo = null; await mesa('abrir'); pintar(); ctx.puente.enviarDatos('cartas-mesa', datos); });
    $('me-vista').addEventListener('click', () => mesa('vista'));
    $('me-animar').addEventListener('click', () => mesa('animar'));
    $('me-tutorial').addEventListener('click', async () => { await mesa('tutorial'); ctx.puente.enviarDatos('cartas-mesa', datos); });
    $('me-sobre').addEventListener('click', async () => { ctx.puente.enviarDatos('cartas-mesa', datos); await mesa('sobre'); });
    $('me-cerrar').addEventListener('click', () => mesa('cerrar'));
    $('me-descartar').addEventListener('click', () => { datos = clonar(original); cambio(); pintar(); });
    btnGuardar.addEventListener('click', guardar);
    window.addEventListener('keydown', e => {
        if (ctx.pestana === 'mesa' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!btnGuardar.disabled) guardar(); }
    });
    window.addEventListener('beforeunload', e => { if (sucio()) { e.preventDefault(); e.returnValue = ''; } });
    ctx.alIdioma.push(pintar);
    ctx.alVista.push(pintar); // los rótulos cambian (con o sin la clave del JSON)
    pintar();
}
