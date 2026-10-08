// =========================================================
// VENJY · Supervivencia · Objetos y bloques
// Registro de todo lo que puede ir en el inventario:
//  · ids < 256: bloques (los mismos de texturas.js); se colocan en el mundo
//  · ids >= 256: objetos (herramientas, comida, materiales…)
// Además: dureza, herramienta y drops de cada bloque, comida, combustible y nombres ES/EN.
// Los íconos se pintan por código (sin imágenes): ver iconos.js.
// =========================================================
import { B, BLOQUES, TIPO } from '../texturas.js';

// ---------------------------------------------------------
// Objetos (ids >= 256)
// ---------------------------------------------------------
export const O = {};
export const OBJETOS = []; // id -> definición
let siguiente = 256;
function obj(clave, es, en, extra = {}) {
    const id = siguiente++;
    O[clave] = id;
    OBJETOS[id] = { id, clave, nombre: { es, en }, apila: 64, ...extra };
    return id;
}

// ---- Materiales ----
obj('PALO', 'Palo', 'Stick', { icono: 'palo', combustible: 5 });
obj('CARBON', 'Carbón', 'Coal', { icono: 'carbon', combustible: 80 });
obj('CARBON_VEGETAL', 'Carbón vegetal', 'Charcoal', { icono: 'carbon_vegetal', combustible: 80 });
obj('LINGOTE_HIERRO', 'Lingote de hierro', 'Iron Ingot', { icono: 'lingote', color: 'hierro' });
obj('LINGOTE_ORO', 'Lingote de oro', 'Gold Ingot', { icono: 'lingote', color: 'oro' });
obj('DIAMANTE', 'Diamante', 'Diamond', { icono: 'gema', color: 'diamante' });
obj('ESMERALDA', 'Esmeralda', 'Emerald', { icono: 'gema', color: 'esmeralda' });
obj('REDSTONE', 'Redstone', 'Redstone Dust', { icono: 'polvo', color: 'redstone' });
obj('LAPIS', 'Lapislázuli', 'Lapis Lazuli', { icono: 'lapis' });
obj('PEDERNAL', 'Pedernal', 'Flint', { icono: 'pedernal' });
obj('HILO', 'Hilo', 'String', { icono: 'hilo' });
obj('PLUMA', 'Pluma', 'Feather', { icono: 'pluma' });
obj('CUERO', 'Cuero', 'Leather', { icono: 'cuero' });
obj('HUESO', 'Hueso', 'Bone', { icono: 'hueso' });
obj('HARINA_HUESO', 'Harina de huesos', 'Bone Meal', { icono: 'polvo', color: 'hueso' });
obj('POLVORA', 'Pólvora', 'Gunpowder', { icono: 'polvo', color: 'polvora' });
obj('TRIGO', 'Trigo', 'Wheat', { icono: 'trigo' });
obj('SEMILLAS', 'Semillas de trigo', 'Wheat Seeds', { icono: 'semillas', planta: B.TRIGO_0 });
obj('PAPEL', 'Papel', 'Paper', { icono: 'papel' });
obj('LIBRO', 'Libro', 'Book', { icono: 'libro' });
obj('AZUCAR', 'Azúcar', 'Sugar', { icono: 'polvo', color: 'azucar' });
obj('HUEVO', 'Huevo', 'Egg', { icono: 'huevo', apila: 16 });
obj('CARNE_PODRIDA', 'Carne podrida', 'Rotten Flesh', { icono: 'carne', color: 'podrida', comida: [4, 0.8], efecto: 'hambre' });
obj('OJO_ARANA', 'Ojo de araña', 'Spider Eye', { icono: 'ojo' });

// ---- Comida: [hambre, saturación] como en Minecraft ----
obj('MANZANA', 'Manzana', 'Apple', { icono: 'manzana', comida: [4, 2.4] });
obj('PAN', 'Pan', 'Bread', { icono: 'pan', comida: [5, 6] });
obj('ZANAHORIA', 'Zanahoria', 'Carrot', { icono: 'zanahoria', comida: [3, 3.6], planta: B.ZANAHORIA_0 });
obj('PAPA', 'Papa', 'Potato', { icono: 'papa', comida: [1, 0.6], planta: B.PAPA_0 });
obj('PAPA_ASADA', 'Papa asada', 'Baked Potato', { icono: 'papa', color: 'asada', comida: [5, 6] });
obj('VACUNO', 'Carne de vacuno cruda', 'Raw Beef', { icono: 'carne', color: 'cruda', comida: [3, 1.8] });
obj('FILETE', 'Filete', 'Steak', { icono: 'carne', color: 'cocida', comida: [8, 12.8] });
obj('CERDO', 'Cerdo crudo', 'Raw Porkchop', { icono: 'chuleta', color: 'cruda', comida: [3, 1.8] });
obj('CHULETA', 'Chuleta cocinada', 'Cooked Porkchop', { icono: 'chuleta', color: 'cocida', comida: [8, 12.8] });
obj('POLLO', 'Pollo crudo', 'Raw Chicken', { icono: 'pollo', color: 'cruda', comida: [2, 1.2], efecto: 'hambre30' });
obj('POLLO_ASADO', 'Pollo asado', 'Cooked Chicken', { icono: 'pollo', color: 'cocida', comida: [6, 7.2] });
obj('CORDERO', 'Cordero crudo', 'Raw Mutton', { icono: 'carne', color: 'cordero', comida: [2, 1.2] });
obj('CORDERO_ASADO', 'Cordero asado', 'Cooked Mutton', { icono: 'carne', color: 'cocida', comida: [6, 9.6] });
obj('BACALAO', 'Bacalao crudo', 'Raw Cod', { icono: 'pez', color: 'bacalao', comida: [2, 0.4] });
obj('BACALAO_COCIDO', 'Bacalao cocinado', 'Cooked Cod', { icono: 'pez', color: 'cocido', comida: [5, 6] });
obj('SALMON', 'Salmón crudo', 'Raw Salmon', { icono: 'pez', color: 'salmon', comida: [2, 0.4] });
obj('SALMON_COCIDO', 'Salmón cocinado', 'Cooked Salmon', { icono: 'pez', color: 'cocido', comida: [6, 9.6] });
obj('PEZ_GLOBO', 'Pez globo', 'Pufferfish', { icono: 'pezglobo', comida: [1, 0.2], efecto: 'veneno' });
obj('GALLETA', 'Galleta', 'Cookie', { icono: 'galleta', comida: [2, 0.4] });
obj('PASTEL', 'Pastel', 'Cake', { icono: 'pastel', comida: [12, 2.4], apila: 1 });
obj('ESTOFADO', 'Estofado de zanahoria', 'Carrot Stew', { icono: 'estofado', comida: [8, 9.6], apila: 1 });

// ---- Herramientas ----
// nivel: qué menas puede sacar (1 madera/oro, 2 piedra, 3 hierro, 4 diamante); vel: multiplicador de minado
export const MATERIALES = {
    madera: { nivel: 1, vel: 2, dur: 59, dano: 0, es: 'de madera', en: 'Wooden' },
    piedra: { nivel: 2, vel: 4, dur: 131, dano: 1, es: 'de piedra', en: 'Stone' },
    hierro: { nivel: 3, vel: 6, dur: 250, dano: 2, es: 'de hierro', en: 'Iron' },
    oro: { nivel: 1, vel: 12, dur: 32, dano: 0, es: 'de oro', en: 'Golden' },
    diamante: { nivel: 4, vel: 8, dur: 1561, dano: 3, es: 'de diamante', en: 'Diamond' }
};
const HERRAMIENTAS = {
    pico: { es: 'Pico', en: 'Pickaxe', dano: 2, cadencia: 0.83 },
    hacha: { es: 'Hacha', en: 'Axe', dano: 7, cadencia: 1.1 },
    pala: { es: 'Pala', en: 'Shovel', dano: 2.5, cadencia: 1 },
    azada: { es: 'Azada', en: 'Hoe', dano: 1, cadencia: 0.5 },
    espada: { es: 'Espada', en: 'Sword', dano: 4, cadencia: 0.625 }
};
for (const [m, dm] of Object.entries(MATERIALES)) {
    for (const [h, dh] of Object.entries(HERRAMIENTAS)) {
        obj(`${h}_${m}`.toUpperCase(), `${dh.es} ${dm.es}`, `${dm.en} ${dh.en}`, {
            icono: h, color: m, apila: 1,
            herramienta: { clase: h, material: m, nivel: dm.nivel, vel: dm.vel },
            durabilidad: dm.dur,
            dano: h === 'hacha' ? (m === 'madera' || m === 'oro' ? 7 : 9) : dh.dano + dm.dano,
            cadencia: dh.cadencia,
            combustible: m === 'madera' ? 10 : 0
        });
    }
}
obj('TIJERAS', 'Tijeras', 'Shears', { icono: 'tijeras', apila: 1, durabilidad: 238, herramienta: { clase: 'tijeras', nivel: 0, vel: 5 } });

// ---- Armadura: [defensa por pieza], ranura 0 casco, 1 peto, 2 grebas, 3 botas ----
const ARMADURAS = {
    cuero: { def: [1, 3, 2, 1], dur: [55, 80, 75, 65], es: 'de cuero', en: 'Leather' },
    oro: { def: [2, 5, 3, 1], dur: [77, 112, 105, 91], es: 'de oro', en: 'Golden' },
    hierro: { def: [2, 6, 5, 2], dur: [165, 240, 225, 195], es: 'de hierro', en: 'Iron' },
    diamante: { def: [3, 8, 6, 3], dur: [363, 528, 495, 429], es: 'de diamante', en: 'Diamond' }
};
const PIEZAS = [['casco', 'Casco', 'Helmet'], ['peto', 'Peto', 'Chestplate'], ['grebas', 'Grebas', 'Leggings'], ['botas', 'Botas', 'Boots']];
for (const [m, dm] of Object.entries(ARMADURAS)) {
    PIEZAS.forEach(([clave, es, en], ranura) => {
        obj(`${clave}_${m}`.toUpperCase(), `${es} ${dm.es}`, `${dm.en} ${en}`, {
            icono: clave, color: m, apila: 1, armadura: { ranura, def: dm.def[ranura] }, durabilidad: dm.dur[ranura]
        });
    });
}

// ---- Varios ----
obj('CUBO', 'Cubo', 'Bucket', { icono: 'cubo', apila: 16 });
obj('CUBO_AGUA', 'Cubo de agua', 'Water Bucket', { icono: 'cubo', color: 'agua', apila: 1 });
obj('CUBO_LAVA', 'Cubo de lava', 'Lava Bucket', { icono: 'cubo', color: 'lava', apila: 1, combustible: 1000, devuelve: 'CUBO' });
obj('ARCO', 'Arco', 'Bow', { icono: 'arco', apila: 1, durabilidad: 384 });
obj('FLECHA', 'Flecha', 'Arrow', { icono: 'flecha' });
obj('ESCUDO', 'Escudo', 'Shield', { icono: 'escudo', apila: 1, durabilidad: 336, combustible: 0 });
obj('CANA', 'Caña de pescar', 'Fishing Rod', { icono: 'cana', apila: 1, durabilidad: 64 });
obj('BRUJULA', 'Brújula', 'Compass', { icono: 'brujula', apila: 1 });
obj('PUERTA', 'Puerta de madera', 'Oak Door', { icono: 'puerta', apila: 64, combustible: 10 });
obj('CAMA', 'Cama', 'Bed', { icono: 'cama', apila: 1 });
obj('CUENCO', 'Cuenco', 'Bowl', { icono: 'cuenco', combustible: 5 });

// ---------------------------------------------------------
// Bloques como objeto: nombre, dureza, herramienta y drops
// ---------------------------------------------------------
// dureza: segundos base (Minecraft «hardness»); -1 = irrompible.
// herramienta: la que acelera; nivel: el mínimo para que suelte algo (0 = cualquiera)
const INFO_BLOQUE = [];
function bloque(id, es, en, dureza, herramienta = null, nivel = 0, extra = {}) {
    INFO_BLOQUE[id] = { id, nombre: { es, en }, dureza, herramienta, nivel, ...extra };
}
bloque(B.PASTO, 'Bloque de pasto', 'Grass Block', 0.6, 'pala', 0, { suelta: B.TIERRA });
bloque(B.TIERRA, 'Tierra', 'Dirt', 0.5, 'pala');
bloque(B.PIEDRA, 'Piedra', 'Stone', 1.5, 'pico', 1, { suelta: B.ADOQUIN });
bloque(B.ARENA, 'Arena', 'Sand', 0.5, 'pala');
bloque(B.NIEVE, 'Bloque de nieve', 'Snow Block', 0.2, 'pala');
bloque(B.AGUA, 'Agua', 'Water', -1);
bloque(B.LAVA, 'Lava', 'Lava', -1);
bloque(B.HOJAS, 'Hojas de roble', 'Oak Leaves', 0.2, 'tijeras', 0, { hojas: 'roble' });
bloque(B.HOJAS_ABEDUL, 'Hojas de abedul', 'Birch Leaves', 0.2, 'tijeras', 0, { hojas: 'abedul' });
bloque(B.HOJAS_PINO, 'Hojas de pino', 'Spruce Leaves', 0.2, 'tijeras', 0, { hojas: 'pino' });
bloque(B.TRONCO, 'Tronco de roble', 'Oak Log', 2, 'hacha', 0, { combustible: 15 });
bloque(B.TRONCO_ABEDUL, 'Tronco de abedul', 'Birch Log', 2, 'hacha', 0, { combustible: 15 });
bloque(B.TRONCO_PINO, 'Tronco de pino', 'Spruce Log', 2, 'hacha', 0, { combustible: 15 });
bloque(B.TABLONES, 'Tablones', 'Planks', 2, 'hacha', 0, { combustible: 15 });
bloque(B.CUARZO, 'Bloque de cuarzo', 'Quartz Block', 0.8, 'pico', 1);
bloque(B.ROJO, 'Terracota roja', 'Red Terracotta', 1.25, 'pico', 1);
bloque(B.AZUL, 'Terracota azul', 'Blue Terracotta', 1.25, 'pico', 1);
bloque(B.NARANJO, 'Terracota naranja', 'Orange Terracotta', 1.25, 'pico', 1);
bloque(B.NEGRO, 'Terracota negra', 'Black Terracotta', 1.25, 'pico', 1);
// Los bloques de oro, diamante y esmeralda del mapa (título, mina, faro) piden pico de diamante y
// sueltan una sola gema: así no se salta toda la progresión rompiendo el letrero
bloque(B.ORO, 'Bloque de oro', 'Block of Gold', 25, 'pico', 4, { suelta: O.LINGOTE_ORO });
bloque(B.DIAMANTE, 'Bloque de diamante', 'Block of Diamond', 25, 'pico', 4, { suelta: O.DIAMANTE });
bloque(B.ESMERALDA, 'Bloque de esmeralda', 'Block of Emerald', 25, 'pico', 4, { suelta: O.ESMERALDA });
bloque(B.PODZOL, 'Podzol', 'Podzol', 0.5, 'pala', 0, { suelta: B.TIERRA });
bloque(B.ARCILLA, 'Arcilla', 'Clay', 0.6, 'pala');
bloque(B.GRIS, 'Ladrillos de piedra', 'Stone Bricks', 1.5, 'pico', 1);
bloque(B.CAMINO, 'Camino de tierra', 'Dirt Path', 0.6, 'pala', 0, { suelta: B.TIERRA });
bloque(B.CULTIVO, 'Tierra de cultivo', 'Farmland', 0.6, 'pala', 0, { suelta: B.TIERRA });
bloque(B.TRIGO, 'Trigo', 'Wheat', 0, null, 0, { cultivo: 'trigo', maduro: true });
bloque(B.VIDRIO, 'Vidrio', 'Glass', 0.3, null, 0, { suelta: 0 });
bloque(B.LABRADA, 'Piedra labrada', 'Chiseled Stone', 1.5, 'pico', 1);
bloque(B.PASTO_ALTO, 'Pasto', 'Grass', 0, null, 0, { planta: true });
bloque(B.FLOR_ROJA, 'Amapola', 'Poppy', 0, null, 0, { planta: true });
bloque(B.FLOR_AMARILLA, 'Diente de león', 'Dandelion', 0, null, 0, { planta: true });
bloque(B.FLOR_AZUL, 'Aciano', 'Cornflower', 0, null, 0, { planta: true });
bloque(B.ANTORCHA, 'Antorcha', 'Torch', 0, null, 0, { planta: true });
bloque(B.PIEDRA_LUMINOSA, 'Piedra luminosa', 'Glowstone', 0.3);
bloque(B.LADRILLO, 'Ladrillos', 'Bricks', 2, 'pico', 1);
bloque(B.LIBRERO, 'Librero', 'Bookshelf', 1.5, 'hacha', 0, { combustible: 15 });
bloque(B.COFRE, 'Cofre', 'Chest', 2.5, 'hacha', 0, { combustible: 15, contenedor: 'cofre' });
bloque(B.CAMA, 'Cama', 'Bed', 0.2, null, 0, { suelta: O.CAMA });
bloque(B.RIEL, 'Riel', 'Rail', 0.7, 'pico');
bloque(B.VALLA, 'Valla', 'Fence', 2, 'hacha', 0, { combustible: 15 });
bloque(B.HENO, 'Fardo de heno', 'Hay Bale', 0.5, 'azada');
bloque(B.LANA, 'Lana', 'Wool', 0.8, 'tijeras');
bloque(B.LANA_ROJA, 'Lana roja', 'Red Wool', 0.8, 'tijeras');
bloque(B.OBSIDIANA, 'Obsidiana', 'Obsidian', 50, 'pico', 4);
bloque(B.BARRIL, 'Barril', 'Barrel', 2.5, 'hacha', 0, { combustible: 15, contenedor: 'cofre' });
bloque(B.PIEDRA_AGRIETADA, 'Ladrillos agrietados', 'Cracked Stone Bricks', 1.5, 'pico', 1);
bloque(B.AMPLIFICADOR, 'Amplificador', 'Amplifier', 1.5, 'hacha');
bloque(B.ROCA_MADRE, 'Roca madre', 'Bedrock', -1);
bloque(B.GRAVA, 'Grava', 'Gravel', 0.6, 'pala');
bloque(B.ADOQUIN, 'Adoquín', 'Cobblestone', 2, 'pico', 1);
bloque(B.MENA_CARBON, 'Mena de carbón', 'Coal Ore', 3, 'pico', 1, { suelta: O.CARBON });
bloque(B.MENA_HIERRO, 'Mena de hierro', 'Iron Ore', 3, 'pico', 2);
bloque(B.MENA_ORO, 'Mena de oro', 'Gold Ore', 3, 'pico', 3);
bloque(B.MENA_REDSTONE, 'Mena de redstone', 'Redstone Ore', 3, 'pico', 3, { suelta: O.REDSTONE, cantidad: [4, 5] });
bloque(B.MENA_LAPIS, 'Mena de lapislázuli', 'Lapis Ore', 3, 'pico', 2, { suelta: O.LAPIS, cantidad: [4, 8] });
bloque(B.MENA_DIAMANTE, 'Mena de diamante', 'Diamond Ore', 3, 'pico', 3, { suelta: O.DIAMANTE });
bloque(B.MENA_ESMERALDA, 'Mena de esmeralda', 'Emerald Ore', 3, 'pico', 3, { suelta: O.ESMERALDA });
bloque(B.MESA, 'Mesa de crafteo', 'Crafting Table', 2.5, 'hacha', 0, { combustible: 15 });
bloque(B.HORNO, 'Horno', 'Furnace', 3.5, 'pico', 1, { contenedor: 'horno' });
bloque(B.HORNO_ENCENDIDO, 'Horno', 'Furnace', 3.5, 'pico', 1, { suelta: B.HORNO, contenedor: 'horno' });
bloque(B.BROTE, 'Brote de roble', 'Oak Sapling', 0, null, 0, { planta: true, combustible: 5 });
bloque(B.BROTE_ABEDUL, 'Brote de abedul', 'Birch Sapling', 0, null, 0, { planta: true, combustible: 5 });
bloque(B.BROTE_PINO, 'Brote de pino', 'Spruce Sapling', 0, null, 0, { planta: true, combustible: 5 });
bloque(B.TIERRA_LABRADA, 'Tierra labrada', 'Farmland', 0.6, 'pala', 0, { suelta: B.TIERRA });
bloque(B.TIERRA_LABRADA_HUMEDA, 'Tierra labrada', 'Farmland', 0.6, 'pala', 0, { suelta: B.TIERRA });
bloque(B.BLOQUE_HIERRO, 'Bloque de hierro', 'Block of Iron', 5, 'pico', 2);
bloque(B.BLOQUE_CARBON, 'Bloque de carbón', 'Block of Coal', 5, 'pico', 1, { combustible: 800 });
bloque(B.BLOQUE_REDSTONE, 'Bloque de redstone', 'Block of Redstone', 5, 'pico', 1);
bloque(B.BLOQUE_LAPIS, 'Bloque de lapislázuli', 'Block of Lapis', 3, 'pico', 2);
bloque(B.PUERTA_ABAJO, 'Puerta de madera', 'Oak Door', 3, 'hacha', 0, { suelta: O.PUERTA, puerta: true });
bloque(B.PUERTA_ARRIBA, 'Puerta de madera', 'Oak Door', 3, 'hacha', 0, { suelta: 0, puerta: true });
bloque(B.PUERTA_ABIERTA_ABAJO, 'Puerta de madera', 'Oak Door', 3, 'hacha', 0, { suelta: O.PUERTA, puerta: true });
bloque(B.PUERTA_ABIERTA_ARRIBA, 'Puerta de madera', 'Oak Door', 3, 'hacha', 0, { suelta: 0, puerta: true });
bloque(B.ESCALERA, 'Escalera de mano', 'Ladder', 0.4, 'hacha', 0, { combustible: 15 });
bloque(B.ALTAR, 'Altar', 'Altar', -1);
// Cultivos por etapas (la tierra de cultivo es B.TIERRA_LABRADA; B.LABRADA es la piedra labrada del mapa)
for (let n = 0; n < 4; n++) {
    bloque(B.TRIGO_0 + n, 'Trigo', 'Wheat', 0, null, 0, { cultivo: 'trigo', etapa: n });
    bloque(B.ZANAHORIA_0 + n, 'Zanahorias', 'Carrots', 0, null, 0, { cultivo: 'zanahoria', etapa: n, maduro: n === 3 });
    bloque(B.PAPA_0 + n, 'Papas', 'Potatoes', 0, null, 0, { cultivo: 'papa', etapa: n, maduro: n === 3 });
}

export function infoBloque(id) {
    return INFO_BLOQUE[id] || (BLOQUES[id] ? { id, nombre: { es: BLOQUES[id].nombre, en: BLOQUES[id].nombre }, dureza: 1, herramienta: null, nivel: 0 } : null);
}

// Lo que se puede tener en el inventario (definición unificada)
export function info(id) {
    if (id >= 256) return OBJETOS[id] || null;
    const b = infoBloque(id);
    if (!b) return null;
    return { id, nombre: b.nombre, apila: 64, bloque: id, combustible: b.combustible || 0 };
}

export function nombreDe(id, idioma = 'es') {
    const i = info(id);
    return i ? (i.nombre[idioma] || i.nombre.es) : '?';
}

export const apilaDe = id => (info(id) || { apila: 64 }).apila;
export const esBloqueColocable = id => id > 0 && id < 256 && TIPO[id] !== 3 && id !== B.LAVA;

// ---------------------------------------------------------
// Minado: segundos para romper un bloque con el objeto en la mano
// (fórmula de Minecraft: dureza × 1,5 con la herramienta adecuada y nivel suficiente, × 5 si no)
// ---------------------------------------------------------
export function tiempoRomper(idBloque, idMano, { enAgua = false, enAire = false } = {}) {
    const b = infoBloque(idBloque);
    if (!b || b.dureza < 0) return Infinity;
    if (b.dureza === 0) return 0;
    const h = idMano >= 256 && OBJETOS[idMano] && OBJETOS[idMano].herramienta;
    let vel = 1;
    const correcta = h && b.herramienta && (h.clase === b.herramienta || (h.clase === 'espada' && b.hojas));
    if (correcta) vel = h.vel;
    if (h && h.clase === 'espada' && b.hojas) vel = 1.5;
    const puede = !b.nivel || (h && h.clase === b.herramienta && h.nivel >= b.nivel);
    let t = b.dureza * (puede ? 1.5 : 5) / vel;
    if (enAgua) t *= 5;
    if (enAire) t *= 5;
    return t;
}

// ¿Suelta algo con esta mano? (las menas y la piedra necesitan pico del nivel justo)
export function sueltaCon(idBloque, idMano) {
    const b = infoBloque(idBloque);
    if (!b) return false;
    if (!b.nivel) return true;
    const h = idMano >= 256 && OBJETOS[idMano] && OBJETOS[idMano].herramienta;
    return !!(h && h.clase === b.herramienta && h.nivel >= b.nivel);
}

// Drops al romper: lista de [id, cantidad]. `azar` es una función que devuelve 0..1.
export function dropsDe(idBloque, idMano, azar = Math.random) {
    const b = infoBloque(idBloque);
    if (!b || !sueltaCon(idBloque, idMano)) return [];
    const mano = idMano >= 256 && OBJETOS[idMano];
    // Hojas: con tijeras sueltan el bloque; si no, a veces un brote o una manzana
    if (b.hojas) {
        if (mano && mano.herramienta && mano.herramienta.clase === 'tijeras') return [[idBloque, 1]];
        const lista = [];
        const brote = b.hojas === 'abedul' ? B.BROTE_ABEDUL : b.hojas === 'pino' ? B.BROTE_PINO : B.BROTE;
        if (azar() < 0.06) lista.push([brote, 1]);
        if (b.hojas === 'roble' && azar() < 0.02) lista.push([O.MANZANA, 1]);
        if (azar() < 0.03) lista.push([O.PALO, 1 + Math.floor(azar() * 2)]);
        return lista;
    }
    if (idBloque === B.PASTO_ALTO) return azar() < 0.125 ? [[O.SEMILLAS, 1]] : [];
    if (idBloque === B.GRAVA) return azar() < 0.1 ? [[O.PEDERNAL, 1]] : [[B.GRAVA, 1]];
    if (b.cultivo) {
        const maduro = b.maduro || false;
        if (b.cultivo === 'trigo') return maduro ? [[O.TRIGO, 1], [O.SEMILLAS, 1 + Math.floor(azar() * 3)]] : [[O.SEMILLAS, 1]];
        const fruto = b.cultivo === 'zanahoria' ? O.ZANAHORIA : O.PAPA;
        if (!maduro) return [[fruto, 1]];
        const lista = [[fruto, 2 + Math.floor(azar() * 3)]];
        if (b.cultivo === 'papa' && azar() < 0.02) lista.push([O.PAPA, 1]);
        return lista;
    }
    if (idBloque === B.LANA || idBloque === B.LANA_ROJA) return [[idBloque, 1]];
    const suelta = b.suelta !== undefined ? b.suelta : idBloque;
    if (!suelta) return [];
    const [a, z] = b.cantidad || [1, 1];
    return [[suelta, a + Math.floor(azar() * (z - a + 1))]];
}

// ---------------------------------------------------------
// Combustible (segundos de fuego; cocinar una cosa toma 10 s)
// ---------------------------------------------------------
export function combustibleDe(id) {
    const i = info(id);
    return (i && i.combustible) || 0;
}

export const TIEMPO_COCCION = 10;

export const COLORES = {
    madera: ['#a8834f', '#6e5130', '#c9a46a'],
    piedra: ['#8a8a8c', '#58585a', '#b2b2b4'],
    hierro: ['#d8d8d8', '#8a8a8a', '#ffffff'],
    oro: ['#f6d73a', '#b88a10', '#fff3a8'],
    diamante: ['#4fd9d0', '#1f8f89', '#c8fff8'],
    esmeralda: ['#25d261', '#0f8a3b', '#a8f5c4'],
    cuero: ['#9a5a34', '#5e3418', '#c27c4e'],
    redstone: ['#d4190e', '#7a0a04', '#ff6a50'],
    hueso: ['#ecebd8', '#b8b49c', '#ffffff'],
    polvora: ['#5a5a5a', '#2e2e2e', '#8a8a8a'],
    azucar: ['#f4f4f4', '#c8c8d0', '#ffffff'],
    cruda: ['#d0544e', '#8e2a26', '#f0a0a0'],
    cocida: ['#8a4e26', '#4e2a12', '#c27e4a'],
    cordero: ['#c84a44', '#7e2420', '#f0d0c8'],
    podrida: ['#7a8a3a', '#4a5a1e', '#a8762e'],
    bacalao: ['#b49a6a', '#6a5636', '#e6d4a8'],
    salmon: ['#c8564a', '#7a2a22', '#e89a7e'],
    cocido: ['#b07a46', '#6a4422', '#e0b47a'],
    asada: ['#c89a4a', '#7a5622', '#ecc87e'],
    agua: ['#2f5fd0', '#1a3a8a', '#7aa2f0'],
    lava: ['#ec7818', '#a03a0a', '#ffd25a']
};
