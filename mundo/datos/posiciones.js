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
//   yaw: giro del ancla en radianes (solo el escenario lo trae)
export function resolverAncla(terreno, clave) {
    if (!terreno || typeof clave !== 'string') return null;
    const l = (terreno.lugares || []).find(q => q.clave === clave);
    if (l) return { x: l.x, z: l.z, bx: l.bx, bz: l.bz, y: l.y, yaw: 0 };
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
    if (p.marco === 'ancla') {
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
    if (marco === 'ancla') {
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

// Quién ignora `giro` porque el juego lo calcula con otra regla (ver amigos.js, `calcularMiradas`).
export const GIRO_CALCULADO = {
    moises: 'mira a Lalo (y viceversa), con una inclinación fija',
    lalo: 'mira a Moisés (y viceversa), con una inclinación fija',
    lucho: 'mira a Boris'
};
