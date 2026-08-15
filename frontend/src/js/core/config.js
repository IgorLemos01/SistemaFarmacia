// ══════════════════════════════════════════════════════════
//  CONFIGURAÇÃO SUPABASE — core/config.js
//
//  As credenciais são lidas de variáveis de ambiente Vite.
//  Configure o arquivo frontend/.env com base no .env.example.
//  NUNCA coloque credenciais hardcoded neste arquivo.
// ══════════════════════════════════════════════════════════

export var SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export var SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';
export var sb = null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    '[config] Variáveis de ambiente Supabase não configuradas.\n' +
    'Copie frontend/.env.example para frontend/.env e preencha com suas credenciais.\n' +
    'O sistema funcionará em modo offline.'
  );
}

export function initSupabase(url, key) {
  if (!url || !key) return false;
  try {
    if (window.supabase) {
      window.sb = window.supabase.createClient(url, key);
      sb = window.sb;
      return true;
    }
  } catch (e) { console.error('[config] Erro ao inicializar Supabase:', e); }
  return false;
}

export function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      reject(new Error('Timeout após ' + ms + 'ms'));
    }, ms);
    promise.then(
      function (res) { clearTimeout(timer); resolve(res); },
      function (err) { clearTimeout(timer); reject(err); }
    );
  });
}

// Bind to window for global availability
window.initSupabase = initSupabase;
window.withTimeout = withTimeout;

// Auto-initialize com variáveis de ambiente
initSupabase(SUPABASE_URL, SUPABASE_KEY);
