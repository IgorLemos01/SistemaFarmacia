// ============================================================
//  SESSÃO & AUTENTICAÇÃO
// ============================================================

let currentUser = null;

function checkSession() {
  const saved = sessionStorage.getItem('fc_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    showLoggedIn();
  }
}

function showLoggedIn() {
  document.getElementById('sessionBar').classList.add('visible');
  document.getElementById('sessionName').textContent = `👤 ${currentUser.nome}`;
  document.getElementById('tabCadastro').style.display = '';
  document.getElementById('tabLista').style.display = '';
  switchTab('cadastro');
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem('fc_user');
  document.getElementById('sessionBar').classList.remove('visible');
  document.getElementById('tabCadastro').style.display = 'none';
  document.getElementById('tabLista').style.display = 'none';
  switchTab('login');
  toast('Sessão encerrada com sucesso.', 'info');
}

async function doLogin() {
  const user = document.getElementById('loginUser').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;

  if (!user || !pass) {
    toast('Preencha usuário e senha.', 'error'); return;
  }

  const btn = document.getElementById('btnLogin');
  btn.disabled = true; btn.textContent = 'Entrando...';

  await sleep(600); // UX delay

  const atendente = ATENDENTES[user];
  if (atendente && atendente.senha === pass) {
    currentUser = { user, nome: atendente.nome };
    sessionStorage.setItem('fc_user', JSON.stringify(currentUser));
    showLoggedIn();
    toast(`Bem-vindo(a), ${atendente.nome}! ✅`, 'success');
  } else {
    toast('Usuário ou senha incorretos.', 'error');
  }

  btn.disabled = false; btn.textContent = 'Entrar →';
}
