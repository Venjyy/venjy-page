// =========================================================
// VENJY · Supervivencia · Recorrido de escenas (comandos /escenas y /escena <nombre>)
// Para revisar animaciones y globos sin viajar por el mapa: lleva al jugador junto a cada amigo,
// espera a que cargue el terreno y fuerza la escena de skin de Venjy; después la del cuello de Gala
// y las caricias a Mila y Gala. Solo con la skin de base Venjy (es una herramienta del dueño).
// Las escenas que se ven aquí no cuentan como vistas: al terminar se deja la lista como estaba.
// «Saltar» (o Esc) pasa a la siguiente; «Terminar recorrido» lo corta.
// =========================================================
const TXT = {
    es: {
        soloVenjy: 'Este comando solo funciona con la skin de Venjy',
        noHay: n => `No hay ninguna escena llamada «${n}»`,
        ocupado: 'Ya hay un recorrido o una escena en curso',
        paso: (i, n, quien) => `Escena ${i} de ${n}: ${quien}`,
        fin: 'Recorrido de escenas terminado',
        parar: 'Terminar recorrido',
        cuello: 'Lona y el cuello de Gala', caricia: g => `Caricias a ${g}`
    },
    en: {
        soloVenjy: 'This command only works with the Venjy skin',
        noHay: n => `There is no scene called "${n}"`,
        ocupado: 'A tour or a scene is already running',
        paso: (i, n, quien) => `Scene ${i} of ${n}: ${quien}`,
        fin: 'Scene tour finished',
        parar: 'End tour',
        cuello: "Lona and Gala's collar", caricia: g => `Petting ${g}`
    }
};
const sinTildes = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esperar = ms => new Promise(r => setTimeout(r, ms));

export function crearRecorridoEscenas({ dy, jugador, mundo, gatas, escenas, escenaCuello, caricias, misiones, hud, skin, bloquear, idioma = 'es' }) {
    let L = idioma;
    const tx = () => TXT[L] || TXT.es;
    let activo = false, cortar = false;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton parar-recorrido';
    boton.textContent = tx().parar;
    boton.addEventListener('click', e => { e.preventDefault(); detener(); });
    document.body.appendChild(boton);

    // Todas las escenas: una por persona (skin de Venjy), el cuello de Gala y las caricias
    function lista() {
        const l = escenas.personas().map(p => ({ clave: p.clave, nombre: p.nombre, x: p.x, y: p.y, z: p.z, iniciar: () => escenas.forzar(p.clave), sigue: () => escenas.activa }));
        const lona = l.find(p => p.clave === 'lona');
        if (lona) l.push({ clave: 'cuello', nombre: tx().cuello, x: lona.x, y: lona.y, z: lona.z, iniciar: () => escenaCuello.forzar(), sigue: () => escenaCuello.activa });
        for (const g of gatas.gatas) {
            const nombre = g.clave === 'mila' ? 'Mila' : 'Gala';
            l.push({ clave: g.clave, nombre: tx().caricia(nombre), x: g.x, y: g.y ?? 0, z: g.z, iniciar: () => caricias.forzar(g.clave), sigue: () => caricias.activa });
        }
        return l;
    }
    const ocupado = () => activo || escenas.activa || escenaCuello.activa || caricias.activa;

    // Lleva al jugador a 3 bloques del punto (coordenadas del creativo) y espera a que haya suelo
    async function irJunto(x, y, z) {
        bloquear(); // congelado: no cae mientras carga el terreno
        const px = x + 3;
        jugador.colocar(px, y + dy + 1, z);
        for (let i = 0; i < 40 && !cortar; i++) {
            await esperar(200);
            for (let yy = y + dy + 12; yy > dy - 10; yy--) {
                if (mundo.bloque(px, yy - 0.5, z) > 0) {
                    jugador.colocar(px, yy, z);
                    jugador.yaw = Math.atan2(x - px, 0) - Math.PI;
                    return;
                }
            }
        }
    }

    async function recorrer(escenasElegidas) {
        activo = true; cortar = false;
        document.body.classList.add('en-recorrido');
        const vistas = misiones.estado.escenasSkin, antes = new Set(vistas);
        try {
            for (let i = 0; i < escenasElegidas.length && !cortar; i++) {
                const e = escenasElegidas[i];
                await irJunto(e.x, e.y, e.z);
                if (cortar) break;
                // Si al llegar se disparó sola la escena de ese amigo, se ve esa
                if (!e.sigue()) e.iniciar();
                hud.mensaje(tx().paso(i + 1, escenasElegidas.length, e.nombre), 3);
                await esperar(300);
                while (e.sigue() && !cortar) await esperar(250);
                await esperar(600);
            }
        } finally {
            vistas.clear(); for (const k of antes) vistas.add(k);
            activo = false;
            document.body.classList.remove('en-recorrido');
            if (!cortar) hud.mensaje(tx().fin, 3);
        }
    }

    function detener() {
        if (!activo) return;
        cortar = true;
        if (escenas.activa) escenas.saltar();
        if (escenaCuello.activa) escenaCuello.saltar();
        if (caricias.activa) caricias.saltar();
    }

    // Comando de la consola: sin nombre recorre todas; con nombre (clave o nombre, sin tildes) solo esa
    function comando(nombre) {
        if (escenas.tipoSkin(skin()).base !== 'venjy') { hud.mensaje(tx().soloVenjy, 4); return; }
        if (ocupado()) { hud.mensaje(tx().ocupado, 3); return; }
        const l = lista();
        if (!nombre) { recorrer(l); return; }
        const n = sinTildes(nombre);
        const e = l.find(x => x.clave === n || sinTildes(x.nombre || '') === n);
        if (!e) { hud.mensaje(tx().noHay(nombre), 4); return; }
        recorrer([e]);
    }

    return {
        comando, detener,
        get activo() { return activo; },
        // Claves válidas para /escena (las muestra /ayuda)
        claves: () => lista().map(e => e.clave),
        setIdioma(l) { L = l; boton.textContent = tx().parar; }
    };
}
