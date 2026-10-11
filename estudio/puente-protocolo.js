// =========================================================
// VENJY · Estudio · protocolo del puente (BroadcastChannel 'venjy-estudio')
// Contrato en estudio/DISENO.md §6. Sin DOM: lo usan el juego (puente-juego.js), el Estudio
// (puente-cliente.js) y las pruebas de Node con un BroadcastChannel real.
// Todo mensaje es { de: 'estudio' | 'juego', tipo, id?, ... }; las respuestas repiten el `id`.
// =========================================================
export const CANAL = 'venjy-estudio';
export const VERSION = 1;
// Archivos de mundo/datos/ que el juego aplica sin recargar (fase 4: posiciones; fase 5: escenas). Fase siguiente: poses.
export const DATOS_VIVOS = ['ui-layout', 'textos', 'dialogos', 'posiciones', 'escenas'];
export const MODOS_GIZMO = ['mover', 'girar'];

const MAX_GLOBO = 400;
const NOMBRE_DESTINO = /^[a-z0-9áéíóúüñ][a-z0-9áéíóúüñ _-]{0,40}$/i;
const esNum = v => typeof v === 'number' && Number.isFinite(v);
const esObjeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// Crea el manejador del lado del juego. `juego` pone lo que depende del mundo:
//   listo()                        (opcional) false mientras el mundo todavía se abre: `hola` responde `estado`
//   idioma()                       'es' | 'en'
//   aplicarDatos(nombre, datos)    aplica un JSON sin recargar (puede ser asíncrona; lanza si no puede)
//   teletransportar(destino)       destino: { destino } | { x, y, z }; devuelve { x, y, z } o lanza
//   globo(persona, texto)          muestra `texto` en el globo de esa persona (vista previa del editor de textos)
//   elegir({ clave, modo })        pone el gizmo sobre una persona (clave null lo quita); devuelve su punto actual
//                                  { ancla, marco?, dx, dy, dz, giro } o lanza si no existe en este mundo
// Devuelve responder(mensaje) -> objeto de respuesta o null (si el mensaje no es para el juego).
export function crearManejador(juego) {
    return async function responder(m) {
        if (!esObjeto(m) || m.de !== 'estudio' || typeof m.tipo !== 'string') return null;
        const base = { de: 'juego' };
        if (m.id !== undefined) base.id = m.id;
        const error = mensaje => ({ ...base, tipo: 'error', mensaje });
        try {
            switch (m.tipo) {
                case 'hola':
                    if (juego.listo && !juego.listo()) return { ...base, tipo: 'estado', fase: 'abriendo' };
                    return { ...base, tipo: 'listo', version: VERSION, idioma: juego.idioma() };
                case 'datos': {
                    if (!DATOS_VIVOS.includes(m.nombre)) return error(`«${m.nombre}» no se aplica en vivo (solo ${DATOS_VIVOS.join(', ')})`);
                    if (!esObjeto(m.datos)) return error('datos tiene que ser un objeto');
                    await juego.aplicarDatos(m.nombre, m.datos);
                    return { ...base, tipo: 'ok' };
                }
                case 'tp': {
                    let destino;
                    if (typeof m.destino === 'string') {
                        if (!NOMBRE_DESTINO.test(m.destino)) return error('destino no válido');
                        destino = { destino: m.destino };
                    } else if (esNum(m.x) && esNum(m.z) && (m.y === undefined || esNum(m.y))) {
                        destino = { x: m.x, y: m.y, z: m.z };
                    } else return error('tp pide destino (texto) o x, y, z');
                    const pos = await juego.teletransportar(destino);
                    return { ...base, tipo: 'ok', pos };
                }
                case 'globo': {
                    if (typeof m.persona !== 'string' || !NOMBRE_DESTINO.test(m.persona)) return error('persona no válida');
                    if (typeof m.texto !== 'string' || !m.texto.trim() || m.texto.length > MAX_GLOBO) return error(`texto vacío o de más de ${MAX_GLOBO} caracteres`);
                    if (!juego.globo) return error('este juego no sabe mostrar globos');
                    juego.globo(m.persona, m.texto);
                    return { ...base, tipo: 'ok' };
                }
                case 'elegir': {
                    const nada = m.objeto === 'nada';
                    if (!nada && m.objeto !== 'persona') return error('elegir pide objeto «persona» o «nada»');
                    if (!nada && (typeof m.clave !== 'string' || !NOMBRE_DESTINO.test(m.clave))) return error('clave de persona no válida');
                    const modo = m.modo === undefined ? 'mover' : m.modo;
                    if (!MODOS_GIZMO.includes(modo)) return error(`modo no válido (${MODOS_GIZMO.join(' o ')})`);
                    if (!juego.elegir) return error('este juego no sabe poner el gizmo');
                    const punto = await juego.elegir(nada ? { clave: null } : { clave: m.clave, modo });
                    return { ...base, tipo: 'elegido', clave: nada ? null : m.clave, punto: punto || null };
                }
                default:
                    return error(`mensaje desconocido: ${m.tipo}`);
            }
        } catch (e) {
            return error(String((e && e.message) || e));
        }
    };
}
