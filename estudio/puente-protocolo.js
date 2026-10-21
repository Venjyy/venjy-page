// =========================================================
// VENJY · Estudio · protocolo del puente (BroadcastChannel 'venjy-estudio')
// Contrato en estudio/DISENO.md §6. Sin DOM: lo usan el juego (puente-juego.js), el Estudio
// (puente-cliente.js) y las pruebas de Node con un BroadcastChannel real.
// Todo mensaje es { de: 'estudio' | 'juego', tipo, id?, ... }; las respuestas repiten el `id`.
// =========================================================
export const CANAL = 'venjy-estudio';
export const VERSION = 1;
// Archivos de mundo/datos/ que el juego aplica sin recargar (fase 4: posiciones; fase 5: escenas; fase 6: poses;
// pestaña Píxeles: iconos y cartas-arte). borradores.json no: el juego lo ignora.
export const DATOS_VIVOS = ['ui-layout', 'textos', 'dialogos', 'posiciones', 'escenas', 'poses', 'cartas-mesa', 'objetos-mano', 'iconos', 'cartas-arte', 'formas', 'carrera', 'arena', 'salonas', 'musica', 'navegacion', 'rutinas', 'actividades'];
export const MODOS_GIZMO = ['mover', 'girar'];
export const ACCIONES_ESCENA = ['jugar', 'pausa', 'ir', 'parar', 'puntero'];
// Canales de una pose (fase 6b: mensaje `pose`); los mismos del esquema de poses.json
export const CANALES_POSE = ['cx', 'cy', 'cz', 'bDx', 'bDz', 'bIx', 'bIz', 'pDx', 'pIx', 'inc', 'rz', 'y', 'salto', 'pz',
    'bDy', 'bIy', 'ry', 'codoD', 'codoI', 'rodD', 'rodI', 'pX', 'pY', 'pZ', 'pDz', 'pIz', 'armaX', 'armaZ'];

const MAX_GLOBO = 400;
const NOMBRE_DESTINO = /^[a-z0-9áéíóúüñ][a-z0-9áéíóúüñ _-]{0,40}$/i;
const CLAVE_ESCENA = /^[a-z0-9][a-z0-9_@-]{0,40}$/i; // clave de escena o de persona (venjy@atalaya)
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
//   escena({ accion, clave?, persona?, t?, v? })
//                                  juega, pausa, salta a un instante o detiene una escena de amistad (fase 5); `puntero` con v
//                                  true/false suelta el mouse del juego (o lo devuelve) mientras el editor trabaja sobre él;
//                                  devuelve un objeto que viaja en `escena` de la respuesta o lanza
//   objeto({ clave })             pone en tu mano ese objeto de OBJETOS (o un id numérico), dándotelo si no lo tienes (pestaña Objetos)
//   mesa({ accion })              'abrir' | 'cerrar' | 'vista': la mesa del Duelo de Cartas junto a Lucho
//   carrera({ accion })           'ver' | 'mila' | 'gala' | 'terminar': la carrera de gatas (7h-1; 'ver' = la sala sin menú)
//   salonas({ accion, cancion?, dificultad?, seccion? })
//                                  'probar' abre esa canción de La Gira en Práctica, solo con esa sección (índice) y con los ajustes a mano
//                                  actuales (pestaña Ritmo, S10b) o 'terminar' cierra Salonas
//   arena({ accion })             'abrir' | 'lalo' | 'moises' | 'terminar': la arena del duelo de Lalo y Moisés (bloque 8 · L1)
//   musica({ accion, tema?, instrumentos?, nivel?, tempo? })
//                                  'tocar' suena ese tema (vista previa de la pestaña Música; calla la música del juego) o 'parar'
//   caminar({ persona, destino })  (6d etapa 2) lleva a esa persona caminando a `destino` ('aqui', 'sitio', otra persona o
//                                  un lugar) buscando camino; destino '' solo pregunta. Devuelve su estado (paseos.js) o lanza
//   rutina({ accion, visita?, persona? }) (6d etapa 2) 'probar' hace ya esa visita (sin mirar la hora), 'cortar' la corta
//                                  y vuelve a su sitio, 'estado' solo pregunta; 'acompanar' / 'soltar' (7i): esa persona te
//                                  sigue (sin mirar la amistad) o deja de seguirte. Devuelve el estado de esa persona (rutinas.js) o lanza
//   pose({ clave, canales })       (fase 6b) deja quieta a esa persona con esos canales (los que falten, neutral); canales
//                                  null la suelta (vuelve a su animación); devuelve lo que viaja en `pose` de la respuesta o lanza
// Del juego, sin `id`, mientras corre una escena: { tipo: 'escenaT', clave (la escena), persona, t, T, pausada } (y un último con clave null).
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
                case 'escena': {
                    if (!ACCIONES_ESCENA.includes(m.accion)) return error(`escena pide accion ${ACCIONES_ESCENA.join(', ')}`);
                    if (m.accion === 'jugar' && (typeof m.clave !== 'string' || !CLAVE_ESCENA.test(m.clave))) return error('clave de escena no válida');
                    if (m.persona !== undefined && (typeof m.persona !== 'string' || !CLAVE_ESCENA.test(m.persona))) return error('persona no válida');
                    if (m.accion === 'ir' && !(esNum(m.t) && m.t >= 0)) return error('ir pide t (segundos, 0 o más)');
                    if (m.v !== undefined && typeof m.v !== 'boolean') return error('v tiene que ser verdadero o falso');
                    if (!juego.escena) return error('este juego no sabe jugar escenas');
                    const r = await juego.escena({ accion: m.accion, clave: m.clave, persona: m.persona, t: m.t, v: m.v });
                    return { ...base, tipo: 'ok', escena: r || null };
                }
                case 'pose': {
                    if (typeof m.clave !== 'string' || !CLAVE_ESCENA.test(m.clave)) return error('clave de persona no válida');
                    let canales = null;
                    if (m.canales !== null && m.canales !== undefined) {
                        if (!esObjeto(m.canales)) return error('canales tiene que ser un objeto o null');
                        canales = {};
                        for (const [k, v] of Object.entries(m.canales)) {
                            if (!CANALES_POSE.includes(k)) return error(`canal desconocido: ${k}`);
                            if (!esNum(v)) return error(`el canal ${k} tiene que ser un número`);
                            canales[k] = v;
                        }
                    }
                    if (!juego.pose) return error('este juego no sabe posar personas');
                    const r = await juego.pose({ clave: m.clave, canales });
                    return { ...base, tipo: 'ok', pose: r || null };
                }
                case 'mesa': {
                    // Mesa del Duelo de Cartas (7h-2b): abrir, cerrar, cambiar de vista, repetir la animación de la última jugada
                    // o jugar el tutorial desde el principio
                    if (!['abrir', 'cerrar', 'vista', 'animar', 'tutorial'].includes(m.accion)) return error('accion de mesa no válida');
                    if (!juego.mesa) return error('este juego no tiene la mesa de cartas');
                    await juego.mesa({ accion: m.accion });
                    return { ...base, tipo: 'ok' };
                }
                case 'carrera': {
                    // Carrera de gatas (7h-1): abrirla con Mila o con Gala, o terminarla; `pista` = la que se edita
                    if (!['ver', 'mila', 'gala', 'terminar'].includes(m.accion)) return error('accion de carrera no válida');
                    if (m.pista !== undefined && (typeof m.pista !== 'string' || !/^[a-z0-9_]{1,24}$/.test(m.pista))) return error('pista no válida');
                    if (!juego.carrera) return error('este juego no tiene la carrera de gatas');
                    await juego.carrera({ accion: m.accion, pista: m.pista });
                    return { ...base, tipo: 'ok' };
                }
                case 'salonas': {
                    // Pestaña Ritmo (S10b): probar una sección de una canción en Práctica, o cerrar Salonas
                    if (!['probar', 'terminar'].includes(m.accion)) return error('accion de salonas no válida');
                    if (!juego.salonas) return error('este juego no tiene Salonas');
                    if (m.accion === 'probar') {
                        if (typeof m.cancion !== 'string' || !/^[a-z0-9_-]{1,40}$/i.test(m.cancion)) return error('cancion no válida');
                        if (!['facil', 'normal', 'dificil', 'experto'].includes(m.dificultad)) return error('dificultad no válida');
                        if (!Number.isInteger(m.seccion) || m.seccion < 0 || m.seccion > 99) return error('seccion no válida');
                    }
                    await juego.salonas({ accion: m.accion, cancion: m.cancion, dificultad: m.dificultad, seccion: m.seccion });
                    return { ...base, tipo: 'ok' };
                }
                case 'arena': {
                    // Arena del duelo (8 · L1): abrirla, pelear con Lalo o con Moisés (dificultad normal) o terminarla
                    if (!['abrir', 'lalo', 'moises', 'terminar'].includes(m.accion)) return error('accion de arena no válida');
                    if (!juego.arena) return error('este juego no tiene la arena del duelo');
                    await juego.arena({ accion: m.accion });
                    return { ...base, tipo: 'ok' };
                }
                case 'musica': {
                    // Pestaña Música: tocar un tema (con sus instrumentos propios) en el juego, o parar
                    if (!['tocar', 'parar'].includes(m.accion)) return error('accion de música no válida (tocar o parar)');
                    if (m.accion === 'tocar') {
                        if (!esObjeto(m.tema) || !Array.isArray(m.tema.capas) || !esNum(m.tema.bpm) || m.tema.bpm <= 0) return error('tema no válido (bpm y capas)');
                        if (m.instrumentos !== undefined && m.instrumentos !== null && !esObjeto(m.instrumentos)) return error('instrumentos tiene que ser un objeto');
                        if (m.nivel !== undefined && (typeof m.nivel !== 'string' || !/^[a-z][a-z0-9_-]{0,23}$/.test(m.nivel))) return error('nivel no válido');
                        if (m.tempo !== undefined && !(esNum(m.tempo) && m.tempo > 0)) return error('tempo no válido');
                    }
                    if (!juego.musica) return error('este juego no sabe tocar música');
                    await juego.musica({ accion: m.accion, tema: m.tema, instrumentos: m.instrumentos || null, nivel: m.nivel, tempo: m.tempo });
                    return { ...base, tipo: 'ok' };
                }
                case 'caminar': {
                    // Pestaña Vida: que un amigo camine a un punto (prueba de la navegación) o cómo va
                    if (typeof m.persona !== 'string' || !NOMBRE_DESTINO.test(m.persona)) return error('persona no válida');
                    if (typeof m.destino !== 'string' || (m.destino && !NOMBRE_DESTINO.test(m.destino))) return error('destino no válido');
                    if (!juego.caminar) return error('este juego no sabe hacer caminar a nadie');
                    const r = await juego.caminar({ persona: m.persona, destino: m.destino });
                    return { ...base, tipo: 'ok', paseo: r || null };
                }
                case 'rutina': {
                    // Pestaña Vida → Rutinas: probar una visita ahora, cortarla o preguntar cómo va
                    if (!['probar', 'cortar', 'estado', 'acompanar', 'soltar'].includes(m.accion)) return error('acción de rutina no válida');
                    if (m.visita !== undefined && (typeof m.visita !== 'string' || !NOMBRE_DESTINO.test(m.visita))) return error('visita no válida');
                    if (m.persona !== undefined && (typeof m.persona !== 'string' || !NOMBRE_DESTINO.test(m.persona))) return error('persona no válida');
                    if (!juego.rutina) return error('este juego no tiene rutinas');
                    const r = await juego.rutina({ accion: m.accion, visita: m.visita || null, persona: m.persona || null });
                    return { ...base, tipo: 'ok', rutina: r || null };
                }
                case 'objeto': {
                    // Pestaña Objetos: pone en tu mano ese objeto (clave de OBJETOS en cualquier caja, o un id numérico)
                    if (typeof m.clave !== 'string' || !/^[A-Za-z0-9_]{1,40}$/.test(m.clave)) return error('clave de objeto no válida');
                    if (!juego.objeto) return error('este juego no sabe poner objetos en la mano');
                    const r = await juego.objeto({ clave: m.clave });
                    return { ...base, tipo: 'ok', objeto: r || null };
                }
                default:
                    return error(`mensaje desconocido: ${m.tipo}`);
            }
        } catch (e) {
            return error(String((e && e.message) || e));
        }
    };
}
