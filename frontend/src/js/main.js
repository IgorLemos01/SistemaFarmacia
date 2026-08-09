// ══════════════════════════════════════════════════════════
//  PONTO DE ENTRADA PRINCIPAL — js/main.js
// ══════════════════════════════════════════════════════════

// Import core logic (they run and bind themselves to window)
import './core/config.js';
import './core/state.js';
import './core/db.js';
import './core/auth.js';
import './utils/helpers.js';
import './utils/pdf.js';
import './pages/dashboard.js';
import './pages/clientes.js';
import './pages/manipulacao.js';
import './pages/exames.js';
import './pages/receitas.js';
import './pages/orcamentos.js';
import './pages/usuarios.js';
import './pages/tiposExames.js';
import './modals.js';

// Central render function
export function renderPage(p) {
  var viewMap = {
    dashboard: window.pgDashboard,
    clientes: window.pgClientes,
    manipulacao: window.pgManipulacao,
    exames: window.pgExames,
    receitas: window.pgReceitas,
    orcamentos: window.pgOrcamentos,
    usuarios: window.pgUsuarios,
    tipos_exames_admin: window.renderTiposExameAdmin,
  };
  
  var renderFn = viewMap[p];
  if (renderFn) {
    renderFn();
  } else {
    window.set('content', '<div class="alert alert-red">⚠️ Página não encontrada: ' + window.esc(p) + '</div>');
  }
}

// Router/Page switcher
export function goTo(p) {
  window.STATE.page = p;
  
  // Update sidebar active states
  document.querySelectorAll('.sb-item').forEach(function (el) {
    if (el.dataset.page === p) el.classList.add('active'); else el.classList.remove('active');
  });

  // Dynamic titles and subtitles
  var titleMap = {
    dashboard: ['Dashboard', 'Visão geral do sistema'],
    clientes: ['Clientes', 'Pacientes cadastrados'],
    manipulacao: ['Manipulação', 'Orçamentos e prazos de manipulação'],
    exames: ['Exames', 'Registro de exames laboratoriais'],
    receitas: ['Receitas Médicas', 'Histórico de receitas de medicamentos'],
    orcamentos: ['Orçamentos', 'Relatório financeiro e emissão de PDF'],
    usuarios: ['Usuários', 'Controle de permissões e acessos'],
    tipos_exames_admin: ['Tipos de Exame', 'Configuração de exames e preços'],
  };

  var meta = titleMap[p] || ['Sistema', 'Farmácia Couto'];
  var elTitle = document.getElementById('pageTitle');
  var elSub = document.getElementById('pageSub');
  if (elTitle) elTitle.textContent = meta[0];
  if (elSub) elSub.textContent = meta[1];

  // Hide action button by default (pages will show it if they need to)
  var btn = document.getElementById('topActionBtn');
  if (btn) btn.style.display = 'none';

  renderPage(p);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function () {
  window.migrateOldKeys();
  try {
    var users = JSON.parse(localStorage.getItem('fc_users') || '[]');
    var changed = false;
    users = users.map(function (u) {
      if (u.perms && u.perms.dashboard === undefined) {
        u.perms = window.normalisePerms(u.perms, u.perfil);
        changed = true;
      }
      if (typeof u.senha !== 'undefined') {
        delete u.senha;
        changed = true;
      }
      return u;
    });
    if (changed) localStorage.setItem('fc_users', JSON.stringify(users));
    
    var sess = sessionStorage.getItem('fc_session');
    if (sess) {
      var sd = JSON.parse(sess);
      if (sd.user && sd.user.perms && sd.user.perms.dashboard === undefined) {
        sessionStorage.removeItem('fc_session');
      }
    }
  } catch (e) { }
  
  window.seedAdmin();
  
  if (!window.restoreSession()) {
    var loginPage = document.getElementById('loginPage');
    if (loginPage) loginPage.style.display = 'flex';
  }
  
  document.querySelectorAll('.modal-bg').forEach(function (bg) {
    bg.addEventListener('click', function (e) { if (e.target === bg) bg.classList.add('h'); });
  });
});

// Bind to window for global availability
window.renderPage = renderPage;
window.goTo = goTo;
