// =========================================================
// VENJY · Supervivencia · Comandos de desarrollo (se activan con /gamemode devenjy)
// Atajos del dueño para probar el juego: teletransportes a lugares, personas, gatas y altares,
// objetos, vida, monstruos y jefes. Son locales; los registra main.js en la consola (consola.js).
//   /tp <destino> · /tp <x> <y> <z> · /pos · /dar <objeto> [n] · /curar · /dios · /mob <tipo> [n]
//   /jefe <nombre> · /limpiar · /donde
// Sin argumentos, /tp, /dar, /mob y /jefe listan lo que aceptan.
// =========================================================
const sinTildes = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const TXT = {
    es: {
        tpLista: l => `Destinos (/tp <nombre>): ${l.join(', ')}`,
        tpNo: n => `No existe el destino «${n}». Escribe /tp`,
        tpOk: n => `Teletransportado a ${n}`,
        tpXyz: (x, y, z) => `Teletransportado a ${x} ${y} ${z}`,
        pos: (x, y, z) => `Posición: ${x} ${y} ${z}`,
        darUso: 'Uso: /dar <objeto> [cantidad] (ej. /dar espada_diamante 1). Escribe /dar lista para ver los nombres',
        darLista: l => `Objetos: ${l.join(', ')}`,
        darNo: n => `No encuentro el objeto «${n}»`,
        darOk: (n, c) => `Recibiste ${c} × ${n}`,
        darLleno: 'Inventario lleno: parte no cupo',
        curar: 'Vida y hambre al máximo',
        diosOn: 'Modo dios: no recibes daño', diosOff: 'Modo dios apagado',
        mobLista: l => `Monstruos (/mob <tipo> [n]): ${l.join(', ')}`,
        mobNo: n => `No existe el monstruo «${n}»`,
        mobOk: (t, n) => `${n} × ${t} delante de ti`,
        jefeLista: l => `Jefes (/jefe <nombre>): ${l.join(', ')}`,
        jefeNo: n => `No existe el jefe «${n}»`,
        jefeOcupado: 'Ya hay un jefe en curso o no se pudo invocar',
        limpiar: n => `${n} monstruos eliminados`
    },
    en: {
        tpLista: l => `Destinations (/tp <name>): ${l.join(', ')}`,
        tpNo: n => `No destination called "${n}". Type /tp`,
        tpOk: n => `Teleported to ${n}`,
        tpXyz: (x, y, z) => `Teleported to ${x} ${y} ${z}`,
        pos: (x, y, z) => `Position: ${x} ${y} ${z}`,
        darUso: 'Usage: /dar <item> [amount] (e.g. /dar espada_diamante 1). Type /dar lista for the names',
        darLista: l => `Items: ${l.join(', ')}`,
        darNo: n => `I can't find the item "${n}"`,
        darOk: (n, c) => `You got ${c} × ${n}`,
        darLleno: 'Inventory full: part did not fit',
        curar: 'Health and hunger restored',
        diosOn: 'God mode: you take no damage', diosOff: 'God mode off',
        mobLista: l => `Mobs (/mob <type> [n]): ${l.join(', ')}`,
        mobNo: n => `No mob called "${n}"`,
        mobOk: (t, n) => `${n} × ${t} in front of you`,
        jefeLista: l => `Bosses (/jefe <name>): ${l.join(', ')}`,
        jefeNo: n => `No boss called "${n}"`,
        jefeOcupado: 'A boss is already running or could not be summoned',
        limpiar: n => `${n} monsters removed`
    }
};

const MOBS = ['zombi', 'esqueleto', 'arana', 'creeper', 'trauco', 'lepisma'];
const JEFES = ['imbunche', 'chonchon', 'caleuche'];

export function crearComandosDev({ jugador, vida, inventario, enemigos, jefes, gatas, escenas, destinos, spawn, spawnCama, irA, hud, O, B, nombreDe, idioma = 'es' }) {
    const t = TXT[idioma] || TXT.es;
    let dios = false;

    // Todos los destinos con nombre: { clave: { x, y?, z } } (y en coordenadas del mundo; sin y se busca el suelo)
    function lugares() {
        const l = {};
        l.spawn = spawn();
        const cama = spawnCama();
        if (cama) l.cama = cama;
        for (const [k, d] of Object.entries(destinos)) l[k] = d;
        for (const [k, a] of Object.entries(jefes.ALTARES)) if (a) l['altar-' + k] = { x: a.x + 2, y: a.y + 1, z: a.z };
        for (const p of escenas.personas()) l[sinTildes(p.clave)] = { x: p.x + 3, z: p.z, pista: p.y > 0 ? p.y : undefined };
        for (const g of gatas.gatas) l[g.clave] = { x: g.x + 2, z: g.z, pista: g.y > 0 ? g.y : undefined };
        return l;
    }

    // Objetos y bloques que se pueden dar: [clave en minúsculas, id]
    const dables = () => [...Object.entries(O), ...Object.entries(B).filter(([k, id]) => id > 0 && k !== 'AGUA' && k !== 'LAVA')].map(([k, id]) => [k.toLowerCase(), id]);
    const delante = d => {
        const sy = Math.sin(jugador.yaw), cy = Math.cos(jugador.yaw);
        return { x: jugador.pos.x - sy * d, z: jugador.pos.z - cy * d };
    };

    const cmds = {
        '/tp': {
            ayuda: { es: '/tp <lugar|persona|x y z>', en: '/tp <place|person|x y z>' },
            sugerir: () => Object.keys(lugares()),
            fn(arg) {
                const L = lugares();
                if (!arg.trim()) { hud.mensaje(t.tpLista(Object.keys(L)), 14); return; }
                const nums = arg.trim().split(/\s+/).map(Number);
                if (nums.length >= 2 && nums.every(Number.isFinite)) {
                    const [x, y, z] = nums.length === 2 ? [nums[0], undefined, nums[1]] : nums;
                    irA(x, y, z);
                    hud.mensaje(nums.length === 2 ? t.tpXyz(x, '~', z) : t.tpXyz(x, y, z), 3);
                    return;
                }
                const k = sinTildes(arg).replace(/\s+/g, '-');
                const clave = Object.keys(L).find(c => c === k) || Object.keys(L).find(c => c.startsWith(k));
                if (!clave) { hud.mensaje(t.tpNo(arg), 4); return; }
                const d = L[clave];
                irA(d.x, d.y, d.z, d.pista);
                hud.mensaje(t.tpOk(clave), 3);
            }
        },
        '/pos': {
            ayuda: { es: '/pos (coordenadas)', en: '/pos (coordinates)' },
            fn() {
                const f = n => Math.round(n * 10) / 10;
                hud.mensaje(t.pos(f(jugador.pos.x), f(jugador.pos.y), f(jugador.pos.z)), 6);
            }
        },
        '/dar': {
            ayuda: { es: '/dar <objeto> [n]', en: '/dar <item> [n]' },
            sugerir: () => dables().map(d => d[0]),
            fn(arg) {
                const partes = arg.trim().split(/\s+/).filter(Boolean);
                if (!partes.length) { hud.mensaje(t.darUso, 8); return; }
                if (sinTildes(partes[0]) === 'lista') { hud.mensaje(t.darLista(dables().map(d => d[0])), 25); return; }
                let n = 1;
                if (partes.length > 1 && /^\d+$/.test(partes[partes.length - 1])) n = Math.min(2304, Math.max(1, Number(partes.pop())));
                const q = sinTildes(partes.join('_').replace(/-/g, '_'));
                const todos = dables();
                const esq = ([, id]) => sinTildes(nombreDe(id, idioma)).replace(/\s+/g, '_');
                const hallado = todos.find(d => d[0] === q) || todos.find(d => esq(d) === q) || todos.find(d => d[0].startsWith(q)) || todos.find(d => d[0].includes(q));
                if (!hallado) { hud.mensaje(t.darNo(partes.join(' ')), 4); return; }
                const id = hallado[1];
                const sobra = inventario.agregar(id, n);
                hud.mensaje(t.darOk(nombreDe(id, idioma), n - sobra), 3);
                if (sobra) hud.mensaje(t.darLleno, 3);
            }
        },
        '/curar': {
            ayuda: { es: '/curar (vida y hambre)', en: '/curar (health, hunger)' },
            fn() {
                Object.assign(vida, { vida: vida.vidaMax, hambre: 20, saturacion: 5, agotamiento: 0, aire: 300, fuego: 0, veneno: 0, efectoHambre: 0, aturdido: 0 });
                hud.mensaje(t.curar, 3);
            }
        },
        '/dios': {
            ayuda: { es: '/dios (invulnerable)', en: '/dios (invulnerable)' },
            fn() {
                dios = !dios;
                vida.invulnerable = dios ? 1e9 : 0;
                hud.mensaje(dios ? t.diosOn : t.diosOff, 3);
            }
        },
        '/mob': {
            ayuda: { es: '/mob <tipo> [n]', en: '/mob <type> [n]' },
            sugerir: () => MOBS,
            fn(arg) {
                const partes = arg.trim().split(/\s+/).filter(Boolean);
                if (!partes.length) { hud.mensaje(t.mobLista(MOBS), 8); return; }
                const tipo = MOBS.find(m => m === sinTildes(partes[0])) || MOBS.find(m => m.startsWith(sinTildes(partes[0])));
                if (!tipo) { hud.mensaje(t.mobNo(partes[0]), 4); return; }
                const n = Math.min(10, Math.max(1, Number(partes[1]) || 1));
                const p = delante(4);
                for (let i = 0; i < n; i++) enemigos.crear(tipo, p.x + (i % 3 - 1) * 1.2, jugador.pos.y + 1, p.z + (Math.floor(i / 3) - 1) * 1.2);
                hud.mensaje(t.mobOk(tipo, n), 3);
            }
        },
        '/jefe': {
            ayuda: { es: '/jefe <imbunche|chonchon|caleuche>', en: '/jefe <imbunche|chonchon|caleuche>' },
            sugerir: () => JEFES,
            fn(arg) {
                if (!arg.trim()) { hud.mensaje(t.jefeLista(JEFES), 8); return; }
                const tipo = JEFES.find(j => j.startsWith(sinTildes(arg)));
                if (!tipo) { hud.mensaje(t.jefeNo(arg), 4); return; }
                const a = jefes.ALTARES[tipo];
                if (!a) { hud.mensaje(t.jefeNo(arg), 4); return; }
                irA(a.x + 4, a.y + 1, a.z + 4);
                if (!jefes.invocar(tipo)) hud.mensaje(t.jefeOcupado, 4);
            }
        },
        '/limpiar': {
            ayuda: { es: '/limpiar (quita monstruos)', en: '/limpiar (remove mobs)' },
            fn() {
                const l = [...enemigos.lista];
                for (const e of l) enemigos.quitar(e);
                hud.mensaje(t.limpiar(l.length), 3);
            }
        }
    };
    cmds['/donde'] = { ...cmds['/pos'], ayuda: { es: '/donde (igual que /pos)', en: '/donde (same as /pos)' } };
    return cmds;
}
