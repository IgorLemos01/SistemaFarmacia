// ══════════════════════════════════════════════════════════
//  SESSÃO & AUTENTICAÇÃO (landing) — auth-landing.js
//
//  Usa Supabase Auth. Sem senhas hardcoded neste arquivo.
// ══════════════════════════════════════════════════════════

let currentUser = null;

// Inicializa cliente Supabase para a landing (usa as mesmas env vars do sistema)
let sbLanding = null;
(function () {
  if (
    typeof window.supabase !== 'undefined' &&
    LANDING_SUPABASE_URL &&
    LANDING_SUPABASE_KEY
  ) {
    try {
      sbLanding = window.supabase.createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_KEY);
    } catch (e) {
      console.error('[auth-landing] Erro ao inicializar Supabase:', e);
    }
  }
})();

async function checkSession() {
  if (!sbLanding) return;
  try {
    const { data } = await sbLanding.auth.getSession();
    if (data && data.session && data.session.user) {
      currentUser = {
        user: data.session.user.email,
        nome: data.session.user.email.split('@')[0],
        id: data.session.user.id
      };
      showLoggedIn();
    }
  } catch (e) {
    console.warn('[auth-landing] Erro ao verificar sessão:', e.message);
  }
}

function showLoggedIn() {
  document.getElementById('sessionBar').classList.add('visible');
  document.getElementById('sessionName').textContent = `👤 ${currentUser.nome}`;
  document.getElementById('tabCadastro').style.display = '';
  document.getElementById('tabLista').style.display = '';
  switchTab('cadastro');
}

async function logout() {
  if (sbLanding) {
    try { await sbLanding.auth.signOut(); } catch (e) { /* ignora */ }
  }
  currentUser = null;
  document.getElementById('sessionBar').classList.remove('visible');
  document.getElementById('tabCadastro').style.display = 'none';
  document.getElementById('tabLista').style.display = 'none';
  switchTab('login');
  toast('Sessão encerrada com sucesso.', 'info');
}

async function doLogin() {
  const email = document.getElementById('loginUser').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;

  if (!email || !pass) {
    toast('Preencha e-mail e senha.', 'error'); return;
  }

  if (!sbLanding) {
    toast('Serviço de autenticação não configurado. Contate o administrador.', 'error');
    return;
  }

  const btn = document.getElementById('btnLogin');
  btn.disabled = true; btn.textContent = 'Entrando...';

  try {
    const { data, error } = await sbLanding.auth.signInWithPassword({ email, password: pass });
    if (error) {
      toast(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Erro de login: ' + error.message,
        'error'
      );
    } else if (data && data.user) {
      currentUser = {
        user: data.user.email,
        nome: data.user.email.split('@')[0],
        id: data.user.id
      };
      showLoggedIn();
      toast(`Bem-vindo(a)! ✅`, 'success');
    }
  } catch (e) {
    toast('Erro inesperado. Tente novamente.', 'error');
    console.error('[auth-landing] Erro no login:', e);
  }

  btn.disabled = false; btn.textContent = 'Entrar →';
}
