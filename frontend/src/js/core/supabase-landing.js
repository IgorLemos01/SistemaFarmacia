// ============================================================
//  SUPABASE INIT
// ============================================================

const SUPABASE_URL = localStorage.getItem('sb_url') || '';
const SUPABASE_KEY = localStorage.getItem('sb_key') || '';

let supabase = null;

function initSupabase(url, key) {
  if (!url || !key) return false;
  try {
    supabase = window.supabase.createClient(url, key);
    return true;
  } catch (e) {
    console.error('Supabase init error:', e);
    return false;
  }
}

// Inicializa com valores salvos
const _url = localStorage.getItem('sb_url');
const _key = localStorage.getItem('sb_key');
if (_url && _key) initSupabase(_url, _key);

function saveConfig() {
  const url = document.getElementById('cfgUrl').value.trim();
  const key = document.getElementById('cfgKey').value.trim();

  if (!url || !key) { toast('Preencha URL e Key.', 'error'); return; }

  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_key', key);

  if (initSupabase(url, key)) {
    toast('Supabase conectado com sucesso! ✅', 'success');
    document.getElementById('configModal').classList.add('hidden');
  } else {
    toast('Erro ao conectar. Verifique as credenciais.', 'error');
  }
}
