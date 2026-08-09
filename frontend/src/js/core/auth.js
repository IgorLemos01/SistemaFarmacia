// ══════════════════════════════════════════════════════════
//  AUTH / SESSÃO — core/auth.js
// ══════════════════════════════════════════════════════════

export function doLogin() {
  var email = document.getElementById('loginEmail').value.trim().toLowerCase();
  var pass = document.getElementById('loginPass').value;
  var err = document.getElementById('loginErr');
  var btn = document.getElementById('btnLogin');
  err.style.display = 'none';
  if (!email || !pass) { showErr('Preencha e-mail e senha.'); return; }
  btn.disabled = true; btn.textContent = 'Entrando...';

  function normalizePerfil(p) {
    if (!p) return 'atendente';
    var map = {
      'administrador': 'admin', 'administrator': 'admin', 'gerente': 'gerente',
      'manager': 'gerente', 'farmaceutico': 'farmaceutico', 'farmacêutico': 'farmaceutico',
      'atendente': 'atendente', 'attendant': 'atendente', 'admin': 'admin',
    };
    return map[p.toLowerCase()] || p.toLowerCase();
  }

  function showErr(msg) { err.textContent = msg; err.style.display = 'block'; }
  
  function tryLocal() {
    // Modo offline / login local fallback
    var users = window.fromCache('users') || [];
    var matchedUser = users.find(function (u) { return u.email === email; });
    // Se for admin padrão e não estiver salvo localmente, criar
    if (email === 'admin@farmaciacouto.com' && pass === 'admin123') {
      matchedUser = {
        id: 'admin-001', email: 'admin@farmaciacouto.com', nome: 'Administrador',
        perfil: 'admin', perms: window.normalisePerms({}, 'admin'), ativo: true
      };
    }
    
    if (matchedUser && matchedUser.ativo !== false) {
      window.STATE.user = matchedUser;
      window.STATE.perms = window.normalisePerms(matchedUser.perms, matchedUser.perfil);
      window.STATE.isSupabase = false;
      sessionStorage.setItem('fc_session', JSON.stringify({ user: matchedUser, isSupabase: false }));
      window.initApp();
    } else {
      showErr('E-mail ou senha inválidos ou usuário inativo.');
      btn.disabled = false; btn.textContent = 'Entrar no sistema';
    }
  }

  setTimeout(function () {
    if (window.sb) {
      window.sb.auth.signInWithPassword({ email: email, password: pass }).then(function (res) {
        if (res.error) {
          showErr(res.error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : 'Erro de login: ' + res.error.message);
          btn.disabled = false; btn.textContent = 'Entrar no sistema';
        }
        else {
          window.sb.from('system_users').select('*').then(function (r) {
            var allRows = r.data || [];
            var profile = allRows.find(function (u) {
              return (u.email || u['e-mail'] || '').toLowerCase() === email;
            }) || {};

            var perfil = normalizePerfil(profile.perfil);
            if (email === 'admin@farmaciacouto.com') perfil = 'admin';

            var rawPerms = profile.perms || profile.permanentes || {};
            if (typeof rawPerms === 'string') { try { rawPerms = JSON.parse(rawPerms); } catch (e) { rawPerms = {}; } }

            window.STATE.user = Object.assign({ id: res.data.user.id, email: email }, profile, {
              perfil: perfil,
              nome: profile.nome || profile.name || email.split('@')[0]
            });
            window.STATE.perms = window.normalisePerms(rawPerms, perfil);
            window.STATE.isSupabase = true;
            var normUser = Object.assign({}, window.STATE.user, { perms: window.STATE.perms });
            sessionStorage.setItem('fc_session', JSON.stringify({ user: normUser, isSupabase: true }));
            window.initApp();
          }).catch(function (e) {
            window.STATE.user = { id: res.data.user.id, email: email, perfil: email === 'admin@farmaciacouto.com' ? 'admin' : 'atendente', nome: email.split('@')[0] };
            window.STATE.perms = window.normalisePerms({}, window.STATE.user.perfil);
            window.STATE.isSupabase = true;
            var normUser = Object.assign({}, window.STATE.user, { perms: window.STATE.perms });
            sessionStorage.setItem('fc_session', JSON.stringify({ user: normUser, isSupabase: true }));
            window.initApp();
          });
        }
      }).catch(function (e) {
        tryLocal();
      });
    } else {
      tryLocal();
    }
  }, 400);
}

export function doLogout() {
  window.STATE.user = null;
  window.STATE.perms = {};
  window.STATE.isSupabase = false;
  
  if (window.CACHE) {
    window.CACHE.clientes = null;
    window.CACHE.servicos = null;
    window.CACHE.users = null;
    window.CACHE.lastFetch = {};
  }

  sessionStorage.removeItem('fc_session');
  if (window.sb) window.sb.auth.signOut();
  document.getElementById('app').classList.remove('on');
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('loginPass').value = '';
}

export function restoreSession() {
  var s = sessionStorage.getItem('fc_session');
  if (s) {
    try {
      var data = JSON.parse(s);
      window.STATE.user = data.user;
      window.STATE.isSupabase = !!data.isSupabase;
      var p = data.user.perms || (window.PERFIS[data.user.perfil] || window.PERFIS.atendente).perms;
      window.STATE.perms = window.normalisePerms(p, data.user.perfil);
      window.initApp();
      return true;
    } catch (e) { }
  }
  return false;
}

export function initApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('app').classList.add('on');

  if (window.STATE.user.perfil === 'administrador' || window.STATE.user.perfil === 'administrator') window.STATE.user.perfil = 'admin';
  if (window.STATE.user.perfil === 'farmacêutico') window.STATE.user.perfil = 'farmaceutico';

  var initials = (window.STATE.user.nome || window.STATE.user.email || '?').split(' ').slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  document.getElementById('sbAvatar').textContent = initials;
  document.getElementById('sbName').textContent = window.STATE.user.nome || window.STATE.user.email;
  document.getElementById('sbRole').textContent = (window.PERFIS[window.STATE.user.perfil] || {}).label || 'Usuário';

  window.STATE.perms = window.normalisePerms(window.STATE.perms, window.STATE.user.perfil);

  if (window.canEdit('usuarios')) {
    document.getElementById('adminSection').style.display = '';
    document.getElementById('menuUsuarios').style.display = '';
  }

  window.goTo('dashboard');
  window.startClock();
}

// Bind to window for global availability
window.doLogin = doLogin;
window.doLogout = doLogout;
window.restoreSession = restoreSession;
window.initApp = initApp;
