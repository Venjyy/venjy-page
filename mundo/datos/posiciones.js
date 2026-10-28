// =========================================================
// VENJY · Posiciones relativas a un ancla (mundo/datos/posiciones.json)
// Lógica pura, sin DOM ni three.js: la usan amigos.js, el gizmo del Estudio y las pruebas de Node.
// Fórmula y marcos: estudio/esquemas/posiciones.schema.json. Giro en GRADOS en el JSON, radianes en el juego.
// =========================================================
const RAD = Math.PI / 180;
const redondear = (v, d) => { const k = 10 ** d; return Math.round(v * k) / k; };

// Anclas que el juego sabe resolver. `lugares` salen de terreno.lugares (colocarLugares), `escenario` de
// terreno.escenario (trae giro propio) y `faro` de terreno.faro. Los puntos RUTA restantes (spawn, casa…)
// son celdas del mapa 2D sin construcción propia: todavía no se usan como ancla.
export const ANCLAS_ESCENARIO = ['escenario'];
export const ANCLAS_PUNTO = ['faro'];

// { x, z, bx, bz, y, yaw } de un ancla, o null si este mundo no la tiene.
//   bx, bz: base de los dx y dz (en un lugar, el bloque central; en el escenario y el faro, su x y z)
//   yaw: giro del ancla en radianes (el escenario y los lugares girados, posiciones.json → lugares.<clave>.giro)
//   gira: en un lugar, todo lo que cuelga de él gira con él (también el marco 'lugar'), alrededor del centro del bloque
export function resolverAncla(terreno, clave) {
    if (!terreno || typeof clave !== 'string') return null;
    const l = (terreno.lugares || []).find(q => q.clave === clave);
    if (l) return { x: l.x, z: l.z, bx: l.bx, bz: l.bz, y: l.y, yaw: yawLugar(l), gira: true };
    if (clave === 'escenario' && terreno.escenario) {
        const e = terreno.escenario;
        return { x: e.x, z: e.z, bx: e.x, bz: e.z, y: e.y, yaw: e.yaw || 0 };
    }
    if (clave === 'faro' && terreno.faro) {
        const f = terreno.faro;
        return { x: f.x, z: f.z, bx: f.x, bz: f.z, y: f.y, yaw: 0 };
    }
    return null;
}

// Punto del JSON -> posición en el mundo { x, y, z, yaw, suelo }.
// `suelo`: dy era «suelo». y vale 0 y la persona busca su suelo al cargar (braulio, conejeros).
export function puntoAMundo(ancla, p) {
    const dx = p.dx, dz = p.dz;
    let x, z, yaw;
    if (ancla.gira) {
        // Lugar: el punto se escribe como si el lugar no estuviera girado (puerta al sur) y gira con él
        const q = enLugar({ bx: ancla.bx, bz: ancla.bz, giro: ancla.yaw / RAD }, ancla.bx + dx, ancla.bz + dz);
        x = q.x; z = q.z;
        yaw = ancla.yaw + (p.giro || 0) * RAD;
    } else if (p.marco === 'ancla') {
        const s = Math.sin(ancla.yaw), c = Math.cos(ancla.yaw);
        x = ancla.bx + dz * s + dx * c;
        z = ancla.bz + dz * c - dx * s;
        yaw = ancla.yaw + (p.giro || 0) * RAD;
    } else {
        x = ancla.bx + dx;
        z = ancla.bz + dz;
        yaw = (p.giro || 0) * RAD;
    }
    const suelo = p.dy === 'suelo';
    return { x, y: suelo ? 0 : ancla.y + (p.dy || 0), z, yaw, suelo };
}

// Posición del mundo -> punto del JSON. `previo` conserva ancla, marco, nota y si dy era «suelo».
// dx y dz con 2 decimales, giro con 1 decimal y en (-180, 180].
export function mundoAPunto(ancla, pos, previo = {}) {
    const marco = previo.marco === 'ancla' ? 'ancla' : 'lugar';
    const rx = pos.x - ancla.bx, rz = pos.z - ancla.bz;
    let dx, dz, giro;
    if (ancla.gira) {
        const q = enLugar({ bx: ancla.bx, bz: ancla.bz, giro: -ancla.yaw / RAD }, pos.x, pos.z);
        dx = q.x - ancla.bx; dz = q.z - ancla.bz;
        giro = (pos.yaw - ancla.yaw) / RAD;
    } else if (marco === 'ancla') {
        const s = Math.sin(ancla.yaw), c = Math.cos(ancla.yaw);
        dx = rx * c - rz * s;
        dz = rx * s + rz * c;
        giro = (pos.yaw - ancla.yaw) / RAD;
    } else {
        dx = rx; dz = rz;
        giro = pos.yaw / RAD;
    }
    giro = ((giro % 360) + 540) % 360 - 180; // (-180, 180]
    if (giro === -180) giro = 180;
    const punto = { ancla: previo.ancla };
    if (marco === 'ancla') punto.marco = 'ancla';
    punto.dx = redondear(dx, 2);
    punto.dy = previo.dy === 'suelo' ? 'suelo' : redondear(pos.y - ancla.y, 2);
    punto.dz = redondear(dz, 2);
    punto.giro = redondear(giro, 1);
    if (previo.nota !== undefined) punto.nota = previo.nota;
    return punto;
}

// Construcciones que se pueden mover (Etapa B 6e, posiciones.json → lugares.<clave> = { x, z }: bloque central en el mapa,
// las mismas coordenadas de /tp). w × d: el sitio que nivelan (la prueba mundo/tests/lugares-fijos.mjs lo compara con
// construcciones.js). La caseta del pescador no está: va pegada al muelle del lago.
// gira: acepta lugares.<clave>.giro (0, 90, 180, 270). El escenario y los corrales no: se orientan solos (al camino
// y a la aldea). Las construcciones nuevas de construcciones.json también se mueven y giran (sitiosDe las suma).
export const CONSTRUCCIONES = {
    molino: { es: 'Molino viejo', en: 'Old windmill', w: 9, d: 9, gira: true },
    atalaya: { es: 'Atalaya del bosque', en: 'Forest watchtower', w: 9, d: 13, gira: true },
    campamento: { es: 'Campamento', en: 'Campsite', w: 13, d: 11, gira: true },
    portal: { es: 'Portal en ruinas', en: 'Ruined portal', w: 11, d: 9, gira: true },
    iglu: { es: 'Iglú', en: 'Igloo', w: 11, d: 11, gira: true },
    naufragio: { es: 'Naufragio', en: 'Shipwreck', w: 15, d: 9, gira: true },
    escenario: { es: 'Escenario de Salonas', en: 'Salonas stage', w: 11, d: 9 },
    'corral-vacas': { es: 'Corral de las vacas', en: 'Cow pen', w: 18, d: 14 },
    'corral-ovejas': { es: 'Corral de las ovejas', en: 'Sheep pen', w: 15, d: 13 }
};

// posiciones.json -> { clave: { x, z, giro?, propia? } } con las construcciones movidas que valen (clave conocida, x y z
// números), o null. giro (grados, 90, 180 o 270) solo en las que giran. propias: propiasDe(construcciones.json)
// (mundo/datos/construcciones.js); las que tienen sitio llevan su lista de bloques en `propia` (los workers la reciben así).
export function sitiosDe(datos, propias = null) {
    const l = datos && datos.lugares;
    if (!l || typeof l !== 'object') return null;
    const salida = {};
    for (const [k, p] of Object.entries(l)) {
        const propia = !CONSTRUCCIONES[k] && propias && propias[k];
        if (!(CONSTRUCCIONES[k] || propia) || !p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) continue;
        const s = salida[k] = { x: Math.round(p.x), z: Math.round(p.z) };
        const g = ((Math.round((Number(p.giro) || 0) / 90) % 4) + 4) % 4 * 90;
        if (g && (propia || CONSTRUCCIONES[k].gira)) s.giro = g;
        if (propia) s.propia = propia;
    }
    return Object.keys(salida).length ? salida : null;
}

// Giro de un lugar del terreno (terreno.lugares[i].giro, grados) en radianes
export function yawLugar(l) { return ((l && l.giro) || 0) * RAD; }

// Punto (x, z) del mundo escrito como si el lugar l no estuviera girado (puerta al sur) -> dónde queda con su giro.
// Gira alrededor del centro del bloque central (bx + 0,5, bz + 0,5), igual que sus bloques. Sin giro, el mismo punto.
export function enLugar(l, x, z) {
    const q = ((Math.round(((l && l.giro) || 0) / 90) % 4) + 4) % 4;
    if (!q) return { x, z };
    const cx = l.bx + 0.5, cz = l.bz + 0.5;
    const dx = x - cx, dz = z - cz;
    const [rx, rz] = q === 1 ? [dz, -dx] : q === 2 ? [-dx, -dz] : [-dz, dx];
    return { x: cx + rx, z: cz + rz };
}

// Dónde quedó cada construcción en este terreno: { clave: { bx, bz, y } } (bloque central), para el gizmo y el Estudio
export function centrosDe(terreno) {
    const salida = {};
    if (!terreno) return salida;
    for (const l of [...(terreno.lugares || []), terreno.escenario, ...(terreno.corrales || [])]) {
        if (l && l.clave && (CONSTRUCCIONES[l.clave] || l.propia)) salida[l.clave] = { bx: l.bx, bz: l.bz, y: l.y ?? (l.h + 1), giro: l.giro || 0 };
    }
    return salida;
}

// Quién ignora `giro` porque el juego lo calcula con otra regla (ver amigos.js, `calcularMiradas`).
export const GIRO_CALCULADO = {
    moises: 'mira a Lalo (y viceversa), con una inclinación fija',
    lalo: 'mira a Moisés (y viceversa), con una inclinación fija',
    lucho: 'mira a Boris'
};
