// ============================================================
// Ricartech — Inicialización de Supabase
// ============================================================
// Este archivo inicializa el cliente Supabase y lo expone
// globalmente para que script.js pueda usarlo.
// ============================================================

(function () {
    'use strict';

    if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') {
        console.warn('[Ricartech] Supabase no configurado. Config.js missing o incompleto.');
        window._ricartechSupabase = null;
        return;
    }

    if (SUPABASE_URL === 'https://TU-PROYECTO.supabase.co' || SUPABASE_ANON_KEY === 'TU-ANON-KEY-AQUI') {
        console.warn('[Ricartech] Supabase no configurado. Edita js/config.js con tus credenciales.');
        window._ricartechSupabase = null;
        return;
    }

    var client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window._ricartechSupabase = client;
    console.log('[Ricartech] Supabase inicializado correctamente.');
})();
