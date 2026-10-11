// =========================================================
// VENJY · Estudio · escenas.json -> guion de ejecución de escena-amistad.js (fase 5, PR 5a)
// Puro: sin DOM, sin Three.js. Lo usan el juego (escena-amistad.js), el CLI (resumen y validar) y las pruebas.
// Formato del JSON: estudio/esquemas/escenas.schema.json. Decisiones: estudio/DISENO.md §13.
//   animacionDeDatos(def)          escena «amistad» -> fila de ANIMACIONES (el juego la fusiona por clave)
//   guionDeDatos(def, { durLinea, moldes })   escena «guion» -> guion de ejecución
//   reglasEscenas(datos, nombres)  las reglas que el esquema no expresa -> [{ tipo: 'error' | 'aviso', texto }]
// =========================================================

// Una escena «amistad» del JSON, sin tipo, camara ni nota, es exactamente la entrada de ANIMACIONES
// (la prueba mundo/tests/estudio-escenas.mjs lo comprueba con paridad exacta). La cámara llega en el PR 5c.
export function animacionDeDatos(def) {
    const { tipo, camara, nota, ...resto } = def;
    return resto;
}

// Una escena «guion»: lo mismo que el guion de ejecución. `d` que falta vale durLinea(texto) (lo que se alcanza a
// leer, regla del dueño: no apurar frases) y los gestos se buscan en `moldes` (MOLDES de moldes.js) como en las
// bienvenidas. `actores` va tal cual (clave o { clave, radio }).
export function guionDeDatos(def, { durLinea, moldes } = {}) {
    const { tipo, camara, nota, lineas, ...resto } = def;
    return {
        ...resto,
        tipo: 'guion',
        lineas: (lineas || []).map(l => ({ q: l.q, a: l.a, d: l.d !== undefined ? l.d : durLinea ? durLinea(l.texto) : 3, texto: l.texto })),
        gestos: moldes || {}
    };
}

const r3 = v => Math.round(v * 1000) / 1000;

// nombres: { gestos: Set | Array de nombres que el juego resuelve (GESTOS, GESTOS_AMISTAD y MOLDES),
//            animaciones: Set | Array con las claves de ANIMACIONES, durLinea?: txt -> segundos }
// Errores: tramos en orden, dentro de T y sin superponerse; actores declarados; gestos que existen; golpes y
// corazones en orden y antes de T; la frase termina antes de T. Avisos: frases que se pisan, frase apurada,
// texto sin `revisado`, escena «amistad» que el juego ignora (su clave no está en ANIMACIONES).
export function reglasEscenas(datos, nombres = {}) {
    const salida = [];
    const mal = texto => salida.push({ tipo: 'error', texto });
    const aviso = texto => salida.push({ tipo: 'aviso', texto });
    const gestos = nombres.gestos ? new Set(nombres.gestos) : null;
    const animaciones = nombres.animaciones ? new Set(nombres.animaciones) : null;
    const durLinea = nombres.durLinea || null;

    for (const [clave, e] of Object.entries((datos && datos.escenas) || {})) {
        const donde = `$.escenas.${clave}`;
        const T = e.T;
        const declarados = new Set(['n', 'j', ...Object.keys(e.actores || {})]);

        for (const [q, tramos] of Object.entries(e.pista || {})) {
            if (!declarados.has(q)) mal(`${donde}.pista.${q}: actor no declarado (valen ${[...declarados].join(', ')})`);
            let fin = 0;
            tramos.forEach(([g, desde, hasta], i) => {
                const ruta = `${donde}.pista.${q}[${i}]`;
                if (gestos && !gestos.has(g)) mal(`${ruta}: el gesto «${g}» no existe en el juego (GESTOS, GESTOS_AMISTAD o MOLDES)`);
                if (!(desde < hasta)) mal(`${ruta}: desde ${desde} tiene que ser menor que hasta ${hasta}`);
                else if (hasta > T) mal(`${ruta}: hasta ${hasta} pasa de T ${T}`);
                if (desde < fin) mal(`${ruta}: ${g} (${desde}) se superpone con el tramo anterior, que termina en ${fin}`);
                fin = Math.max(fin, hasta);
            });
        }

        for (const k of ['golpes', 'corazones']) {
            const l = e[k] || [];
            l.forEach((s, i) => {
                if (s >= T) mal(`${donde}.${k}[${i}]: ${s} tiene que ser menor que T ${T}`);
                if (i > 0 && s <= l[i - 1]) mal(`${donde}.${k}[${i}]: ${s} no sigue en orden al anterior (${l[i - 1]})`);
            });
        }

        if (e.tipo === 'amistad') {
            if (e.linea && e.linea[0] + e.linea[1] > T) mal(`${donde}.linea: termina en ${r3(e.linea[0] + e.linea[1])}, después de T ${T}`);
            if (animaciones && !animaciones.has(clave)) aviso(`${donde}: «${clave}» no está en ANIMACIONES, el juego la ignora`);
        } else if (e.tipo === 'guion') {
            const lineas = e.lineas || [];
            const dura = l => (l.d !== undefined ? l.d : durLinea ? durLinea(l.texto) : null);
            lineas.forEach((l, i) => {
                const ruta = `${donde}.lineas[${i}]`;
                if (l.q !== 'todos' && !declarados.has(l.q)) mal(`${ruta}.q: «${l.q}» no es un actor declarado (valen ${[...declarados].join(', ')} o todos)`);
                const d = dura(l);
                if (d !== null && l.a + d > T) mal(`${ruta}: termina en ${r3(l.a + d)}, después de T ${T}`);
                if (l.d !== undefined && durLinea && l.d < durLinea(l.texto)) aviso(`${ruta}.d: ${l.d} s es menos que los ${durLinea(l.texto)} s que se necesitan para leerla (frase apurada)`);
                if (!l.texto.revisado) aviso(`${ruta}.texto: sin revisar (el dueño marca revisado: true)`);
            });
            for (let i = 1; i < lineas.length; i++) {
                const a = lineas[i - 1], d = dura(a);
                if (d !== null && a.a + d > lineas[i].a) aviso(`${donde}.lineas[${i}]: empieza en ${lineas[i].a}, antes de que termine la anterior (${r3(a.a + d)})`);
            }
        }
    }
    return salida;
}
