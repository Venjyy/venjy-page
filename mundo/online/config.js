// =========================================================
// VENJY · Configuración del modo online
// La clave "publishable" (anon) es pública por diseño: lo único que
// protege los datos son las políticas RLS de schema.sql.
// NUNCA poner aquí la service role key.
// Si url o clave quedan vacías, el mundo funciona solo offline.
// =========================================================
export const CONFIG_ONLINE = {
    url: 'https://tqcgcabpxrifutdpysix.supabase.co',
    clave: 'sb_publishable_lFoVqeXHtmm9pU9wNCPMog_82TPk1Mg'
};

export const ONLINE_ACTIVO = !!(CONFIG_ONLINE.url && CONFIG_ONLINE.clave);

// Frecuencia de envío de la posición (Hz) y límites
export const HZ_POSICION = 10; // el plan gratis limita los mensajes por segundo del proyecto
export const MAX_JUGADORES = 8;
