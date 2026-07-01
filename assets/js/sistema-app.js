// ══════════════════════════════════════════════════════════
//  SISTEMA FARMÁCIA COUTO — sistema-app.js
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
//  CONFIGURAÇÃO SUPABASE
// ══════════════════════════════════════════════════════════
var SUPABASE_URL = 'https://ivxjetctxmsqrkmlyznz.supabase.co';
var SUPABASE_KEY = 'sb_publishable_IYY46_75S-rQQcsXsPD1xQ_ta987Zu6';

var sb = null;

function initSupabase(url, key) {
  if (!url || !key) return false;
  try {
    if (window.supabase) {
      sb = window.supabase.createClient(url, key);
      return true;
    }
  } catch (e) { console.error(e); }
  return false;
}

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      reject(new Error("Timeout"));
    }, ms);
    promise.then(
      function (res) { clearTimeout(timer); resolve(res); },
      function (err) { clearTimeout(timer); reject(err); }
    );
  });
}

// Inicializa imediatamente — credenciais fixas, funciona em qualquer máquina
initSupabase(SUPABASE_URL, SUPABASE_KEY);

// ══════════════════════════════════════════════════════════
//  ESTADO DA APLICAÇÃO
// ══════════════════════════════════════════════════════════
var STATE = {
  user: null,
  page: 'dashboard',
  perms: {},
};

var MODULOS = [
  { key: 'dashboard', label: 'Dashboard', ico: '🏠', sub: 'Visão geral, KPIs e últimos serviços' },
  { key: 'clientes', label: 'Clientes', ico: '👥', sub: 'Cadastro e histórico de pacientes' },
  { key: 'manipulacao', label: 'Manipulação', ico: '⚗️', sub: 'Receituários e fórmulas manipuladas' },
  { key: 'exames', label: 'Exames', ico: '🔬', sub: 'Registro e histórico de exames' },
  { key: 'orcamentos', label: 'Orçamentos', ico: '📋', sub: 'Relatório financeiro e geração de PDF' },
  { key: 'usuarios', label: 'Usuários', ico: '🛡️', sub: 'Criar e gerenciar usuários do sistema' },
];

var PERFIS = {
  admin: {
    label: 'Administrador', cor: 'badge-red',
    perms: { dashboard: 'edit', clientes: 'edit', manipulacao: 'edit', exames: 'edit', orcamentos: 'edit', usuarios: 'edit' }
  },
  gerente: {
    label: 'Gerente', cor: 'badge-purple',
    perms: { dashboard: 'read', clientes: 'edit', manipulacao: 'edit', exames: 'edit', orcamentos: 'edit', usuarios: 'none' }
  },
  farmaceutico: {
    label: 'Farmacêutico', cor: 'badge-blue',
    perms: { dashboard: 'read', clientes: 'edit', manipulacao: 'edit', exames: 'read', orcamentos: 'read', usuarios: 'none' }
  },
  atendente: {
    label: 'Atendente', cor: 'badge-gray',
    perms: { dashboard: 'read', clientes: 'edit', manipulacao: 'read', exames: 'read', orcamentos: 'none', usuarios: 'none' }
  },
};

function normalisePerms(p, perfil) {
  p = p || {};
  // Normaliza aliases do perfil
  if (perfil === 'administrador' || perfil === 'administrator') perfil = 'admin';
  if (perfil === 'farmacêutico') perfil = 'farmaceutico';
  var hasNew = MODULOS.some(function (m) { return p[m.key] !== undefined; });
  if (!hasNew) {
    var base = (PERFIS[perfil] || PERFIS.atendente).perms;
    p = Object.assign({}, base, p);
  }
  if (perfil === 'admin') {
    MODULOS.forEach(function (m) { p[m.key] = 'edit'; });
  }
  MODULOS.forEach(function (m) { if (p[m.key] === undefined) p[m.key] = 'none'; });
  return p;
}

function canView(mod) { var v = STATE.perms && STATE.perms[mod]; return v === 'read' || v === 'edit'; }
function canEdit(mod) { return !!(STATE.perms && STATE.perms[mod] === 'edit'); }
function can(perm) {
  var map = { clientes_w: 'clientes', servicos_w: 'manipulacao', orcamentos_r: 'orcamentos', usuarios_w: 'usuarios' };
  var mod = map[perm] || perm;
  if (perm.endsWith('_w')) return canEdit(mod);
  return canView(mod);
}

// ══════════════════════════════════════════════════════════
//  CAMADA DE DADOS
// ══════════════════════════════════════════════════════════
var CACHE = { clientes: null, servicos: null, users: null, lastFetch: {} };
var CACHE_TTL = 30000;

function getStorageKey(key) {
  if (key === 'clientes' || key === 'servicos') {
    var prefix = STATE.isSupabase ? 'fc_sb_' : 'fc_local_';
    return prefix + key;
  }
  return 'fc_' + key;
}

function cacheValid(key) {
  return CACHE[key] !== null && (Date.now() - (CACHE.lastFetch[key] || 0)) < CACHE_TTL;
}
function setCache(key, data) {
  CACHE[key] = data;
  CACHE.lastFetch[key] = Date.now();
  try { localStorage.setItem(getStorageKey(key), JSON.stringify(data)); } catch (e) { }
}
function clearCache(key) { CACHE[key] = null; CACHE.lastFetch[key] = 0; }

function fromCache(key) {
  if (CACHE[key]) return CACHE[key];
  try { var v = localStorage.getItem(getStorageKey(key)); return v ? JSON.parse(v) : []; } catch (e) { return []; }
}

var FETCH_LOCK = { clientes: false, servicos: false, users: false };

function triggerUIRefresh() {
  if (!STATE.user) return; // Not logged in yet

  var page = STATE.page;
  if (page === 'dashboard') {
    pgDashboard();
  } else if (page === 'clientes') {
    var filterEl = document.getElementById('clienteFilter');
    if (filterEl) {
      var filterVal = filterEl.value;
      Promise.all([dbGetClientes(), dbGetServicos()]).then(function (r) {
        set('clientesTable', renderClientesTable(r[0], r[1], filterVal));
      });
    } else {
      pgClientes();
    }
  } else if (page === 'manipulacao') {
    var de = document.getElementById('mDe');
    if (de) {
      Promise.all([dbGetServicos(), dbGetClientes()]).then(function (r) {
        window._manipServicos = r[0].filter(function (s) { return s.tipo === 'manipulacao'; }).sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); });
        window._manipClientes = r[1];
        filtrarManipulacoes();

        var statsVals = document.querySelectorAll('.stat-val');
        if (statsVals.length >= 4) {
          var hoje = new Date().toISOString().split('T')[0];
          var valTotal = window._manipServicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
          var pendentes = window._manipServicos.filter(function (s) { return !s.dataEntregaReal && (!s.prazo || s.prazo >= hoje); }).length;
          var atrasadas = window._manipServicos.filter(function (s) { return !s.dataEntregaReal && s.prazo && s.prazo < hoje; }).length;

          statsVals[0].textContent = window._manipServicos.length;
          statsVals[1].textContent = fmt(valTotal);
          statsVals[2].textContent = pendentes;
          statsVals[3].textContent = atrasadas;
        }
      });
    } else {
      pgManipulacao();
    }
  } else if (page === 'exames') {
    var de = document.getElementById('eDe');
    if (de) {
      Promise.all([dbGetServicos(), dbGetClientes()]).then(function (r) {
        window._exameServicos = r[0].filter(function (s) { return s.tipo === 'exame'; }).sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); });
        window._exameClientes = r[1];
        filtrarExames();

        var statsVals = document.querySelectorAll('.stat-val');
        if (statsVals.length >= 4) {
          var valTotal = window._exameServicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
          var comResult = window._exameServicos.filter(function (s) { return !!s.resultadoExame; }).length;
          var semResult = window._exameServicos.length - comResult;

          statsVals[0].textContent = window._exameServicos.length;
          statsVals[1].textContent = fmt(valTotal);
          statsVals[2].textContent = comResult;
          statsVals[3].textContent = semResult;
        }
      });
    } else {
      pgExames();
    }
  } else if (page === 'orcamentos') {
    var de = document.getElementById('orcDe');
    if (de) {
      filtrarOrcamentos();
    } else {
      pgOrcamentos();
    }
  } else if (page === 'usuarios') {
    pgUsuarios();
  }
}

async function dbGetClientes() {
  var cached = fromCache('clientes') || [];

  if (cacheValid('clientes') && cached && cached.length) {
    return cached;
  }

  if (sb && STATE.isSupabase && !FETCH_LOCK.clientes) {
    FETCH_LOCK.clientes = true;
    (async function () {
      try {
        var res = await withTimeout(sb.from('clientes').select('*').eq('ativo', true).order('nome'), 1500);
        if (!res.error && res.data) {
          var oldStr = JSON.stringify(cached);
          var newStr = JSON.stringify(res.data);
          setCache('clientes', res.data);
          if (oldStr !== newStr) {
            triggerUIRefresh();
          }
        }
      } catch (e) {
        console.warn('Supabase clientes background fetch error:', e.message);
      } finally {
        FETCH_LOCK.clientes = false;
      }
    })();
  }

  return cached;
}

async function dbSaveCliente(obj, isEdit) {
  var row = {
    id: obj.id, nome: obj.nome, nasc: obj.nasc || null,
    sexo: obj.sexo || null, tel: obj.tel, email: obj.email || null,
    endereco: obj.endereco || null, obs: obj.obs || null, ativo: true,
    alergias_cliente: obj.alergiasCliente || null,
    medico_referencia: obj.medicoReferencia || null
  };
  var cached = fromCache('clientes');
  if (isEdit) {
    var idx = cached.findIndex(function (c) { return c.id === obj.id; });
    if (idx >= 0) cached[idx] = Object.assign(cached[idx], row); else cached.push(row);
  } else { cached.push(row); }
  setCache('clientes', cached);
  if (!sb || !STATE.isSupabase) return true;
  try {
    var res = await withTimeout(sb.from('clientes').upsert([row]), 3000);
    if (res.error) throw res.error;
    clearCache('clientes');
    return true;
  } catch (e) {
    console.error('dbSaveCliente error:', e);
    toast('Salvo localmente. Sincronizará quando a conexão for restabelecida.', 'yw');
    return true;
  }
}

async function dbGetServicos(filters) {
  filters = filters || {};
  var cached = fromCache('servicos') || [];

  if (sb && STATE.isSupabase && !cacheValid('servicos') && !FETCH_LOCK.servicos) {
    FETCH_LOCK.servicos = true;
    (async function () {
      try {
        var res = await withTimeout(sb.from('servicos').select('*').order('orc_num', { ascending: false }), 1500);
        if (!res.error && res.data) {
          var data = res.data.map(normaliseServico);
          var oldStr = JSON.stringify(cached);
          var newStr = JSON.stringify(data);
          setCache('servicos', data);
          if (oldStr !== newStr) {
            triggerUIRefresh();
          }
        }
      } catch (e) {
        console.warn('Supabase servicos background fetch error:', e.message);
      } finally {
        FETCH_LOCK.servicos = false;
      }
    })();
  }

  return applyFilters(cached, filters);
}

function normaliseServico(s) {
  return {
    id: s.id, clienteId: s.cliente_id || s.clienteId, tipo: s.tipo,
    data: s.data, valor: parseFloat(s.valor) || 0, pagamento: s.pagamento,
    obs: s.obs, orcNum: s.orc_num || s.orcNum,
    formula: s.formula, prazo: s.prazo,
    tipoExame: s.tipo_exame || s.tipoExame, produtoDesc: s.produto_desc || s.produtoDesc,
    criadoPor: s.criado_por || s.criadoPor, criado_em: s.criado_em,
    resultadoExame: s.resultado_exame || s.resultadoExame || null,
    laboratorio: s.laboratorio || null,
    dataEntregaReal: s.data_entrega_real || s.dataEntregaReal || null,
  };
}

function applyFilters(list, f) {
  return list.filter(function (s) {
    if (f.de && s.data < f.de) return false;
    if (f.ate && s.data > f.ate) return false;
    if (f.tipo && s.tipo !== f.tipo) return false;
    if (f.pag && s.pagamento !== f.pag) return false;
    return true;
  });
}

async function dbSaveServico(obj) {
  var nextNum;
  if (sb && STATE.isSupabase) {
    try {
      var r = await withTimeout(sb.rpc('next_orc_num'), 2000);
      if (!r.error) nextNum = r.data;
    } catch (e) { }
  }
  if (!nextNum) {
    nextNum = (parseInt(localStorage.getItem('fc_orcCounter')) || 0) + 1;
    localStorage.setItem('fc_orcCounter', nextNum);
  }
  var row = {
    id: obj.id, cliente_id: obj.clienteId, tipo: obj.tipo,
    data: obj.data, valor: parseFloat(obj.valor) || 0, pagamento: obj.pagamento,
    obs: obj.obs || null, orc_num: nextNum,
    formula: obj.formula || null, prazo: obj.prazo || null,
    tipo_exame: obj.tipoExame || null, produto_desc: obj.produto_desc || null,
    criado_por: obj.criadoPor || null,
    resultado_exame: obj.resultadoExame || null,
    laboratorio: obj.laboratorio || null,
    data_entrega_real: obj.dataEntregaReal || null,
  };
  var normed = normaliseServico(row);
  var cached = fromCache('servicos');
  cached.unshift(normed);
  setCache('servicos', cached);
  if (!sb || !STATE.isSupabase) return nextNum;
  try {
    var res = await withTimeout(sb.from('servicos').insert([row]), 3000);
    if (res.error) throw res.error;
    clearCache('servicos');
    return nextNum;
  } catch (e) {
    console.error('dbSaveServico error:', e);
    toast('Salvo localmente. Sincronizará quando a conexão for restabelecida.', 'yw');
    return nextNum;
  }
}

async function dbUpdateServico(id, changes) {
  var cached = fromCache('servicos') || [];
  var idx = cached.findIndex(function (x) { return x.id === id; });
  var existing = idx >= 0 ? cached[idx] : {};
  var updated = Object.assign({}, existing, changes);
  if (idx >= 0) cached[idx] = updated; else cached.unshift(updated);
  setCache('servicos', cached);
  if (!sb || !STATE.isSupabase) return updated.orcNum || existing.orcNum;
  try {
    var dbRow = {
      cliente_id: changes.clienteId, tipo: changes.tipo,
      data: changes.data, valor: parseFloat(changes.valor) || 0, pagamento: changes.pagamento,
      obs: changes.obs || null,
      formula: changes.formula || null, prazo: changes.prazo || null,
      tipo_exame: changes.tipoExame || null, produto_desc: changes.produtoDesc || null,
      resultado_exame: changes.resultadoExame || null,
      laboratorio: changes.laboratorio || null,
    };
    var res = await withTimeout(sb.from('servicos').update(dbRow).eq('id', id), 3000);
    if (res.error) throw res.error;
    clearCache('servicos');
  } catch (e) {
    console.error('dbUpdateServico error:', e);
    toast('Atualizado localmente. Sincronizará quando a conexão for restabelecida.', 'yw');
  }
  return updated.orcNum || existing.orcNum;
}

async function dbGetUsers() {
  seedAdmin();
  var cached = fromCache('users');
  if (!cached || !cached.length) {
    cached = lsArr('users') || [];
  }

  if (cacheValid('users') && cached && cached.length) {
    return cached;
  }

  if (sb && STATE.isSupabase && !FETCH_LOCK.users) {
    FETCH_LOCK.users = true;
    (async function () {
      try {
        var res = await withTimeout(sb.from('system_users').select('*').order('criado_em'), 1500);
        if (!res.error && res.data && res.data.length) {
          var merged = res.data.map(function (dbU) {
            var localU = cached.find(function (l) { return l.email === dbU.email; }) || {};
            return Object.assign({}, localU, dbU, { perms: dbU.perms || localU.perms || {} });
          });
          var oldStr = JSON.stringify(cached);
          var newStr = JSON.stringify(merged);
          setCache('users', merged);
          if (oldStr !== newStr) {
            triggerUIRefresh();
          }
        }
      } catch (e) {
        console.warn('Supabase users background fetch error:', e.message);
      } finally {
        FETCH_LOCK.users = false;
      }
    })();
  }

  return cached;
}

async function dbSaveUser(obj, isEdit) {
  var local = fromCache('users') || lsArr('users');
  if (isEdit) {
    var idx = local.findIndex(function (u) { return u.id === obj.id; });
    if (idx >= 0) local[idx] = Object.assign(local[idx], obj); else local.push(obj);
  } else { local.push(obj); }
  setCache('users', local);
  localStorage.setItem('fc_users', JSON.stringify(local));
  if (sb && STATE.isSupabase) {
    var dbRow = {
      id: obj.id,
      nome: obj.nome,
      email: obj.email,
      perfil: obj.perfil,
      perms: obj.perms,
      ativo: obj.ativo,
      auth_id: obj.auth_id || null,
      criado_em: obj.criado_em || new Date().toISOString()
    };
    try {
      if (isEdit) { await withTimeout(sb.from('system_users').update(dbRow).eq('id', obj.id), 3000); }
      else { await withTimeout(sb.from('system_users').insert([dbRow]), 3000); }
    } catch (e) { console.warn('dbSaveUser:', e.message); }
  }
}

async function dbToggleUser(id, ativo) {
  var local = fromCache('users') || lsArr('users');
  var idx = local.findIndex(function (u) { return u.id === id; });
  if (idx >= 0) local[idx].ativo = ativo;
  setCache('users', local);
  localStorage.setItem('fc_users', JSON.stringify(local));
  if (sb && STATE.isSupabase) { try { await withTimeout(sb.from('system_users').update({ ativo: ativo }).eq('id', id), 3000); } catch (e) { } }
}

async function dbDeleteUser(id) {
  var local = fromCache('users') || lsArr('users');
  var idx = local.findIndex(function (u) { return u.id === id; });
  if (idx >= 0) local.splice(idx, 1);
  setCache('users', local);
  localStorage.setItem('fc_users', JSON.stringify(local));
  if (sb && STATE.isSupabase) {
    try {
      await withTimeout(sb.from('system_users').delete().eq('id', id), 3000);
    } catch (e) {
      console.error('Erro ao excluir usuário no Supabase:', e);
    }
  }
}

function seedAdmin() {
  var ADMIN_DATA = {
    id: 'admin-001',
    email: 'admin@farmaciacouto.com',
    senha: 'Couto@2025!',
    nome: 'Administrador',
    perfil: 'admin',
    perms: { dashboard: 'edit', clientes: 'edit', manipulacao: 'edit', exames: 'edit', orcamentos: 'edit', usuarios: 'edit' },
    ativo: true,
  };
  var users = lsArr('users');
  var idx = users.findIndex(function (u) { return u.email === 'admin@farmaciacouto.com'; });
  if (idx >= 0) {
    // Sempre atualiza perfil e perms do admin (corrige dados antigos/errados)
    users[idx] = Object.assign({}, users[idx], { perfil: 'admin', perms: ADMIN_DATA.perms, ativo: true });
  } else {
    users.push(Object.assign({ criado_em: new Date().toISOString() }, ADMIN_DATA));
  }
  lsSet('users', users);
}

// ══════════════════════════════════════════════════════════
//  AUTH / SESSÃO
// ══════════════════════════════════════════════════════════
function doLogin() {
  var email = document.getElementById('loginEmail').value.trim().toLowerCase();
  var pass = document.getElementById('loginPass').value;
  var err = document.getElementById('loginErr');
  var btn = document.getElementById('btnLogin');
  err.style.display = 'none';
  if (!email || !pass) { showErr('Preencha e-mail e senha.'); return; }
  btn.disabled = true; btn.textContent = 'Entrando...';

  // Normaliza o valor do perfil para a chave do objeto PERFIS
  function normalizePerfil(p) {
    if (!p) return 'atendente';
    var map = {
      'administrador': 'admin',
      'administrator': 'admin',
      'gerente': 'gerente',
      'manager': 'gerente',
      'farmaceutico': 'farmaceutico',
      'farmacêutico': 'farmaceutico',
      'atendente': 'atendente',
      'attendant': 'atendente',
      'admin': 'admin',
    };
    return map[p.toLowerCase()] || p.toLowerCase();
  }

  function tryLocal() {
    seedAdmin();
    var users = lsArr('users');
    var user = users.find(function (u) { return u.email === email && u.senha === pass && u.ativo !== false; });
    if (user) {
      var allUsers = lsArr('users');
      var idx = allUsers.findIndex(function (u) { return u.id === user.id; });
      if (idx >= 0) { allUsers[idx].ultimoAcesso = new Date().toISOString(); lsSet('users', allUsers); }
      user.perfil = normalizePerfil(user.perfil);
      STATE.user = user;
      var p = user.perms || {};
      if (typeof p.clientes === 'undefined' && typeof p.clientes_w !== 'undefined') {
        p = {
          clientes: p.clientes_w ? 'edit' : 'none', manipulacao: p.servicos_w ? 'edit' : 'none',
          exames: p.servicos_w ? 'edit' : 'none', orcamentos: p.orcamentos_r ? 'read' : 'none',
          usuarios: p.usuarios_w ? 'edit' : 'none'
        };
      }
      STATE.perms = normalisePerms(p, user.perfil);
      STATE.isSupabase = false;
      var normUser = Object.assign({}, user, { perms: STATE.perms });
      sessionStorage.setItem('fc_session', JSON.stringify({ user: normUser, isSupabase: false }));
      initApp();
    } else {
      showErr('E-mail ou senha incorretos.');
      btn.disabled = false; btn.textContent = 'Entrar no sistema';
    }
  }
  function showErr(msg) { err.textContent = msg; err.style.display = 'block'; }
  setTimeout(function () {
    if (sb) {
      withTimeout(sb.auth.signInWithPassword({ email: email, password: pass }), 4000).then(function (res) {
        if (res.error) { tryLocal(); }
        else {
          // Busca perfil na tabela system_users
          // Usa select geral e filtra client-side para aceitar qualquer nome de coluna de email
          withTimeout(sb.from('system_users').select('*'), 3000).then(function (r) {
            var allRows = r.data || [];
            var profile = allRows.find(function (u) {
              return (u.email || u['e-mail'] || '').toLowerCase() === email;
            }) || {};

            // Garantia extra: admin@farmaciacouto.com sempre recebe perfil admin
            var perfil = normalizePerfil(profile.perfil);
            if (email === 'admin@farmaciacouto.com') perfil = 'admin';

            // Aceita perms tanto da coluna 'perms' quanto 'permanentes'
            var rawPerms = profile.perms || profile.permanentes || {};
            if (typeof rawPerms === 'string') { try { rawPerms = JSON.parse(rawPerms); } catch (e) { rawPerms = {}; } }

            STATE.user = Object.assign({ id: res.data.user.id, email: email }, profile, {
              perfil: perfil,
              nome: profile.nome || profile.name || email.split('@')[0]
            });
            STATE.perms = normalisePerms(rawPerms, perfil);
            STATE.isSupabase = true;
            var normUser = Object.assign({}, STATE.user, { perms: STATE.perms });
            sessionStorage.setItem('fc_session', JSON.stringify({ user: normUser, isSupabase: true }));
            initApp();
          }).catch(function (e) {
            console.warn('Falha ao buscar perfil no Supabase, usando dados locais:', e);
            tryLocal();
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

function doLogout() {
  STATE.user = null;
  STATE.perms = {};
  STATE.isSupabase = false;
  // Clear in-memory cache to ensure clean slate for the next account
  CACHE.clientes = null;
  CACHE.servicos = null;
  CACHE.users = null;
  CACHE.lastFetch = {};

  sessionStorage.removeItem('fc_session');
  if (sb) sb.auth.signOut();
  document.getElementById('app').classList.remove('on');
  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('loginPass').value = '';
}

function restoreSession() {
  var s = sessionStorage.getItem('fc_session');
  if (s) {
    try {
      var data = JSON.parse(s);
      STATE.user = data.user;
      STATE.isSupabase = !!data.isSupabase;
      var p = data.user.perms || (PERFIS[data.user.perfil] || PERFIS.atendente).perms;
      STATE.perms = normalisePerms(p, data.user.perfil);
      initApp();
      return true;
    } catch (e) { }
  }
  return false;
}

function initApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('app').classList.add('on');

  // Garante que o perfil do usuário está normalizado
  if (STATE.user.perfil === 'administrador' || STATE.user.perfil === 'administrator') STATE.user.perfil = 'admin';
  if (STATE.user.perfil === 'farmacêutico') STATE.user.perfil = 'farmaceutico';

  var initials = (STATE.user.nome || STATE.user.email || '?').split(' ').slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  document.getElementById('sbAvatar').textContent = initials;
  document.getElementById('sbName').textContent = STATE.user.nome || STATE.user.email;
  document.getElementById('sbRole').textContent = (PERFIS[STATE.user.perfil] || {}).label || 'Usuário';

  // Reavalia as permissões com o perfil já normalizado
  STATE.perms = normalisePerms(STATE.perms, STATE.user.perfil);

  // Exibe seção Admin e Orçamentos conforme permissões
  if (canEdit('usuarios')) {
    document.getElementById('adminSection').style.display = '';
    document.getElementById('menuUsuarios').style.display = '';
  }

  goTo('dashboard');
  startClock();
}

// ══════════════════════════════════════════════════════════
//  NAVEGAÇÃO E ROTAS
// ══════════════════════════════════════════════════════════
var PAGE_TITLES = {
  dashboard: ['Dashboard', 'Visão geral do sistema'],
  clientes: ['Clientes', 'Gerenciar cadastros de pacientes'],
  manipulacao: ['Manipulação', 'Histórico de manipulações farmacêuticas'],
  exames: ['Exames', 'Histórico de exames realizados'],
  orcamentos: ['Orçamentos', 'Relatório financeiro e orçamentos'],
  usuarios: ['Usuários', 'Gerenciar acessos e permissões'],
};

function goTo(page) {
  STATE.page = page;
  document.querySelectorAll('.sb-item').forEach(function (el) {
    el.classList.toggle('active', el.dataset.page === page);
  });
  var titles = PAGE_TITLES[page] || [page, ''];
  document.getElementById('pageTitle').textContent = titles[0];
  document.getElementById('pageSub').textContent = titles[1];
  renderPage(page);
}

function renderPage(page) {
  var btn = document.getElementById('topActionBtn');
  btn.style.display = 'none';
  var pages = {
    dashboard: pgDashboard,
    clientes: pgClientes,
    manipulacao: pgManipulacao,
    exames: pgExames,
    orcamentos: pgOrcamentos,
    usuarios: pgUsuarios,
  };
  if (pages[page]) pages[page]();
}

// ══════════════════════════════════════════════════════════
//  PAGES RENDERING
// ══════════════════════════════════════════════════════════

// ─── DASHBOARD ───────────────────────────────────────────
function pgDashboard() {
  if (!canView('dashboard')) { set('content', '<div class="alert alert-red" style="margin-top:1rem">⛔ Você não tem permissão para visualizar o dashboard.</div>'); return; }
  set('content', '<div style="text-align:center;padding:3rem;color:var(--tx3)"><span style="font-size:2rem">⏳</span><p style="margin-top:.5rem">Carregando...</p></div>');
  Promise.all([dbGetClientes(), dbGetServicos()]).then(function (results) {
    var clientes = results[0], servicos = results[1];
    var hoje = new Date().toISOString().split('T')[0];
    var hojeSrv = servicos.filter(function (s) { return s.data === hoje; });
    var receita = servicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var receitaHoje = hojeSrv.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var manip = servicos.filter(function (s) { return s.tipo === 'manipulacao'; });
    var exames = servicos.filter(function (s) { return s.tipo === 'exame'; });
    var aReceber = servicos.filter(function (s) { return s.pagamento === 'pendente'; }).reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    // Manipulacoes atrasadas
    var manipAtrasadas = manip.filter(function (s) {
      return s.prazo && s.prazo < hoje && !s.dataEntregaReal;
    });
    var dias = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var ds = d.toISOString().split('T')[0];
      var v = servicos.filter(function (s) { return s.data === ds; }).reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
      dias.push({ d: ds.slice(5), v: v });
    }
    // Saudacao
    var hora = new Date().getHours();
    var saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
    var nomeUser = STATE.user ? (STATE.user.nome || '').split(' ')[0] : '';
    // Alertas
    var alertas = [];
    if (manipAtrasadas.length > 0) {
      alertas.push(manipAtrasadas.length + ' manipula' + (manipAtrasadas.length === 1 ? 'ção' : 'ções') + ' com prazo vencido — <a href="#" onclick="goTo(\'manipulacao\');return false;" style="color:inherit;font-weight:700;text-decoration:underline">Ver manipulações</a>');
    }
    if (aReceber > 0) {
      alertas.push(fmt(aReceber) + ' a receber no total — <a href="#" onclick="goTo(\'orcamentos\');return false;" style="color:inherit;font-weight:700;text-decoration:underline">Ver orçamentos</a>');
    }
    // Distribuicao por tipo
    var totalSrv = servicos.length;
    var tiposDistrib = ['manipulacao', 'exame', 'produto'].map(function (t) {
      var n = servicos.filter(function (s) { return s.tipo === t; }).length;
      var pct = totalSrv > 0 ? Math.round(n / totalSrv * 100) : 0;
      return { t: t, n: n, pct: pct };
    }).filter(function (x) { return x.n > 0; });
    var distribHTML = tiposDistrib.length === 0 ? '<p style="color:var(--tx3);font-size:.83rem">Sem dados</p>' :
      tiposDistrib.map(function (x) {
        return '<div style="margin-bottom:.6rem"><div style="display:flex;justify-content:space-between;margin-bottom:.25rem"><span>' + tipoBadge(x.t) + '</span><span style="font-size:.75rem;font-weight:600">' + x.pct + '% (' + x.n + ')</span></div><div style="background:var(--bg);border-radius:4px;height:8px"><div style="width:' + x.pct + '%;height:100%;background:var(--blue);border-radius:4px"></div></div></div>';
      }).join('');
    set('content',
      (nomeUser ? '<p style="font-size:.85rem;color:var(--tx3);margin-bottom:1rem">' + saudacao + ', <strong>' + esc(nomeUser) + '</strong>! 👋</p>' : '') +
      (alertas.length ? '<div class="alert alert-yellow" style="margin-bottom:1.25rem">⚠️ <div><strong>Atenção:</strong> ' + alertas.join(' &nbsp;·&nbsp; ') + '</div></div>' : '') +
      '<div class="stats-grid">' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l)">👥</div><div><div class="stat-val">' + clientes.length + '</div><div class="stat-lbl">Clientes cadastrados</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">📋</div><div><div class="stat-val">' + hojeSrv.length + '</div><div class="stat-lbl">Atendimentos hoje</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--purple-l)">⚗️</div><div><div class="stat-val">' + manip.length + '</div><div class="stat-lbl">Manipulações total</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l)">🔬</div><div><div class="stat-val">' + exames.length + '</div><div class="stat-lbl">Exames total</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--yellow-l)">💰</div><div><div class="stat-val">' + fmt(receita) + '</div><div class="stat-lbl">Receita total</div><div class="stat-chg chg-up">+' + fmt(receitaHoje) + ' hoje</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--yellow-l)">⏳</div><div><div class="stat-val">' + fmt(aReceber) + '</div><div class="stat-lbl">A receber</div></div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:1.25rem">' +
      '<div class="card">' +
      '<div class="card-head"><div><div class="card-title">Últimos Serviços</div><div class="card-sub">Registros mais recentes</div></div></div>' +
      (servicos.length === 0 ? '<div class="empty"><span class="empty-ico">📋</span><p class="empty-txt">Nenhum serviço registrado</p></div>' :
        '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Atendente</th><th>Valor</th><th>Pagamento</th><th>Data</th></tr></thead><tbody>' +
        servicos.slice(0, 8).map(function (s) {
          var cl = clientes.find(function (c) { return c.id === s.clienteId; });
          return '<tr><td class="td-name">' + (cl ? esc(cl.nome) : '—') + '</td><td>' + tipoBadge(s.tipo) + '</td><td class="td-muted">' + esc(s.criadoPor || '—') + '</td><td style="font-weight:600">' + fmt(s.valor) + '</td><td>' + pagBadge(s.pagamento) + '</td><td class="td-muted">' + fmtDate(s.data) + '</td></tr>';
        }).join('') + '</tbody></table></div>') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;gap:1.25rem">' +
      '<div class="card">' +
      '<div class="card-head"><div class="card-title">Receita (7 dias)</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:.5rem">' +
      dias.map(function (d) {
        var max = Math.max.apply(null, dias.map(function (x) { return x.v; }));
        var pct = max > 0 ? Math.round(d.v / max * 100) : 0;
        return '<div style="display:flex;align-items:center;gap:.75rem"><span style="font-size:.72rem;color:var(--tx3);width:32px;flex-shrink:0">' + d.d + '</span><div style="flex:1;background:var(--bg);border-radius:4px;height:10px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,var(--blue),var(--blue-m));border-radius:4px;transition:width .5s"></div></div><span style="font-size:.72rem;font-weight:600;width:60px;text-align:right">' + fmt(d.v) + '</span></div>';
      }).join('') +
      '</div>' +
      '</div>' +
      '<div class="card">' +
      '<div class="card-head"><div class="card-title">Por Tipo de Serviço</div></div>' +
      distribHTML +
      '</div>' +
      '</div>' +
      '</div>'
    );
  });
}

// ─── CLIENTES ────────────────────────────────────────────
function pgClientes() {
  if (!canView('clientes')) { set('content', '<div class="alert alert-red">⛔ Você não tem permissão para acessar esta área.</div>'); return; }
  var btn = document.getElementById('topActionBtn');
  if (canEdit('clientes')) { btn.style.display = ''; btn.textContent = '＋ Novo Cliente'; }
  set('content',
    '<div class="card">' +
    '<div class="card-head">' +
    '<div class="search-bar"><span class="ico">🔍</span><input placeholder="Buscar por nome, telefone, e-mail..." oninput="filterClientes(this.value)" id="clienteFilter"/></div>' +
    (canEdit('clientes') ? '<button class="btn btn-primary" onclick="openModalCliente()">＋ Novo Cliente</button>' : '') +
    '</div>' +
    '<div id="clientesTable"><div class="empty"><span class="empty-ico">⏳</span><p class="empty-txt">Carregando...</p></div></div>' +
    '</div>'
  );
  Promise.all([dbGetClientes(), dbGetServicos()]).then(function (r) {
    set('clientesTable', renderClientesTable(r[0], r[1], ''));
  });
}

function filterClientes(q) {
  Promise.all([dbGetClientes(), dbGetServicos()]).then(function (r) {
    set('clientesTable', renderClientesTable(r[0], r[1], q));
  });
}

function renderClientesTable(clientes, servicos, q) {
  var list = q ? clientes.filter(function (c) {
    var haystack = (c.nome + (c.tel || '') + (c.email || '') + (c.id || '')).toLowerCase();
    return haystack.includes(q.toLowerCase());
  }) : clientes;
  // Ordenar por mais recentemente atendido
  list = list.slice().sort(function (a, b) {
    var srvA = servicos.filter(function (s) { return s.clienteId === a.id; });
    var srvB = servicos.filter(function (s) { return s.clienteId === b.id; });
    var lastA = srvA.length ? Math.max.apply(null, srvA.map(function (s) { return s.orcNum || 0; })) : -1;
    var lastB = srvB.length ? Math.max.apply(null, srvB.map(function (s) { return s.orcNum || 0; })) : -1;
    return lastB - lastA;
  });
  if (!list.length) return '<div class="empty"><span class="empty-ico">👥</span><p class="empty-txt">' + (q ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado') + '</p>' + (q ? '' : (canEdit('clientes') ? '<p class="empty-sub">Clique em "+ Novo Cliente" para começar</p><button class="btn btn-primary" style="margin-top:1rem" onclick="openModalCliente()">＋ Novo Cliente</button>' : '<p class="empty-sub">Nenhum cliente cadastrado ainda</p>')) + '</div>';
  return '<div class="table-wrap"><table><thead><tr><th>#</th><th>Nome</th><th>WhatsApp</th><th>Atendimentos</th><th>Último atend.</th><th>Ações</th></tr></thead><tbody>' +
    list.map(function (c, i) {
      var srvCliente = servicos.filter(function (s) { return s.clienteId === c.id; });
      var total = srvCliente.length;
      var lastSrv = srvCliente.slice().sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); })[0];
      var lastDate = lastSrv ? fmtDate(lastSrv.data) : '<span class="td-muted">—</span>';
      return '<tr><td class="td-muted">' + (i + 1) + '</td><td class="td-name">' + esc(c.nome) + '</td><td>' + esc(c.tel || '—') + '</td><td><span class="badge badge-blue">' + total + ' atend.</span></td><td class="td-muted">' + lastDate + '</td><td style="display:flex;gap:.4rem"><button class="btn btn-sm btn-ghost" onclick="verCliente(\'' + c.id + '\')">👁 Ver</button>' + (canEdit('manipulacao') || canEdit('exames') ? '<button class="btn btn-sm btn-primary" onclick="openModalServico(\'' + c.id + '\')">＋ Serviço</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

function verCliente(id) {
  Promise.all([dbGetClientes(), dbGetServicos()]).then(function (r) {
    var clientes = r[0], allServicos = r[1];
    var c = clientes.find(function (x) { return x.id === id; });
    if (!c) return;
    var servicos = allServicos.filter(function (s) { return s.clienteId === id; });
    var receita = servicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    document.getElementById('mdcNome').textContent = c.nome;
    document.getElementById('mdcSub').textContent = 'Tel: ' + c.tel;
    var alergiasVal = c.alergiasCliente || c.alergias_cliente || '';
    var medicoVal = c.medicoReferencia || c.medico_referencia || '';
    set('mdcBody',
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;margin-bottom:1.25rem">' +
      '<div style="background:var(--blue-l);border-radius:var(--r);padding:.875rem;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--blue)">' + servicos.length + '</div><div style="font-size:.75rem;color:var(--tx3)">Atendimentos</div></div>' +
      '<div style="background:var(--green-l);border-radius:var(--r);padding:.875rem;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--green)">' + fmt(receita) + '</div><div style="font-size:.75rem;color:var(--tx3)">Total gasto</div></div>' +
      '<div style="background:var(--yellow-l);border-radius:var(--r);padding:.875rem;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--yellow)">' + servicos.filter(function (s) { return s.tipo === 'manipulacao'; }).length + '</div><div style="font-size:.75rem;color:var(--tx3)">Manipulações</div></div>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.875rem"><div style="font-size:.85rem;font-weight:600">Dados Cadastrais</div>' + (canEdit('clientes') ? '<button class="btn btn-sm btn-ghost" onclick="closeModal(\'modalDetalheCliente\');openModalCliente(\'' + c.id + '\')">✏️ Editar</button>' : '') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1.25rem;font-size:.83rem">' +
      '<div><span style="color:var(--tx3)">Endereço: </span>' + esc(c.endereco || '—') + '</div>' +
      '<div><span style="color:var(--tx3)">E-mail: </span>' + esc(c.email || '—') + '</div>' +
      '<div><span style="color:var(--tx3)">Nascimento: </span>' + (c.nasc ? fmtDate(c.nasc) : '—') + '</div>' +
      '<div><span style="color:var(--tx3)">Sexo: </span>' + esc(c.sexo || '—') + '</div>' +
      (medicoVal ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Médico de referência: </span>' + esc(medicoVal) + '</div>' : '') +
      '</div>' +
      (alergiasVal ? '<div class="alert alert-yellow" style="margin-bottom:.75rem">⚠️ <div><strong>Alergias:</strong> ' + esc(alergiasVal) + '</div></div>' : '') +
      (c.obs ? '<div style="background:var(--yellow-l);border-radius:var(--r);padding:.75rem;font-size:.8rem;margin-bottom:1.25rem"><strong>Obs:</strong> ' + esc(c.obs) + '</div>' : '') +
      '<div class="divider"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem"><div style="font-size:.85rem;font-weight:600">Histórico de Serviços</div></div>' +
      '<div class="tabs" style="margin-bottom:1rem" id="tlTabs"><button class="tab active" onclick="filtrarTL(\'todos\',\'' + c.id + '\')">Todos</button><button class="tab" onclick="filtrarTL(\'manipulacao\',\'' + c.id + '\')">Manipulação</button><button class="tab" onclick="filtrarTL(\'exame\',\'' + c.id + '\')">Exames</button><button class="tab" onclick="filtrarTL(\'outro\',\'' + c.id + '\')">Outros</button></div>' +
      '<div id="tlBody">' + renderTimeline(servicos, 'todos') + '</div>'
    );
    openModal('modalDetalheCliente');
  });
}

function renderTimeline(servicos, filtro) {
  var list = filtro === 'todos' ? servicos :
    filtro === 'outro' ? servicos.filter(function (s) { return s.tipo !== 'manipulacao' && s.tipo !== 'exame'; }) :
      servicos.filter(function (s) { return s.tipo === filtro; });
  list = list.slice().sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); });
  if (!list.length) return '<div class="empty" style="padding:1.5rem"><span class="empty-ico">📋</span><p class="empty-txt">Nenhum serviço nesta categoria</p></div>';
  return '<div class="timeline">' + list.map(function (s) {
    var canEditSrv = canEdit('manipulacao') || canEdit('exames');
    var tipoModal = s.tipo === 'manipulacao' ? 'verManipulacao' : s.tipo === 'exame' ? 'verExame' : 'verOrcamento';
    return '<div class="tl-item" style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem">'
      + '<div style="display:flex;align-items:flex-start;gap:.5rem;flex:1;min-width:0">'
      + '<div class="tl-dot" style="background:' + (s.tipo === 'manipulacao' ? 'var(--purple)' : s.tipo === 'exame' ? 'var(--blue)' : 'var(--green)') + ';margin-top:.3rem;flex-shrink:0"></div>'
      + '<div style="min-width:0">'
      + '<div class="tl-title">' + tipoBadge(s.tipo) + ' <span style="font-weight:600">' + esc(getServicoDesc(s)) + '</span> <span class="orc-num" style="font-size:.75rem">#' + padNum(s.orcNum) + '</span></div>'
      + '<div class="tl-meta">' + fmtDate(s.data) + ' · ' + fmt(s.valor) + ' · ' + pagBadge(s.pagamento) + '</div>'
      + (s.obs ? '<div class="tl-meta" style="font-style:italic">' + esc(s.obs) + '</div>' : '')
      + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:.3rem;flex-shrink:0;padding-top:.1rem">'
      + '<button class="btn btn-icon btn-sm" title="Ver detalhes" onclick="' + tipoModal + '(\'' + s.id + '\')">👁</button>'
      + (canEditSrv ? '<button class="btn btn-icon btn-sm" title="Editar pedido" onclick="closeModal(\'modalDetalheCliente\');openModalServico(null,null,\'' + s.id + '\')">✏️</button>' : '')
      + '</div>'
      + '</div>';
  }).join('') + '</div>';
}

function filtrarTL(filtro, clienteId) {
  document.querySelectorAll('#tlTabs .tab').forEach(function (b) { b.classList.remove('active'); });
  var idxMap = { 'todos': 0, 'manipulacao': 1, 'exame': 2, 'outro': 3 };
  var tabs = document.querySelectorAll('#tlTabs .tab');
  if (tabs[idxMap[filtro]]) tabs[idxMap[filtro]].classList.add('active');
  dbGetServicos().then(function (all) {
    set('tlBody', renderTimeline(all.filter(function (s) { return s.clienteId === clienteId; }), filtro));
  });
}

// ─── MANIPULAÇÃO ─────────────────────────────────────────
function pgManipulacao() {
  if (!canView('manipulacao')) { set('content', '<div class="alert alert-red">⛔ Você não tem permissão para acessar esta área.</div>'); return; }
  var btn = document.getElementById('topActionBtn');
  if (canEdit('manipulacao')) { btn.style.display = ''; btn.textContent = '＋ Nova Manipulação'; }
  set('content', '<div class="card"><div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div></div>');
  Promise.all([dbGetServicos(), dbGetClientes()]).then(function (r) {
    var hoje = new Date().toISOString().split('T')[0];
    var servicos = r[0].filter(function (s) { return s.tipo === 'manipulacao'; }).sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); }), clientes = r[1];
    var valTotal = servicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var pendentes = servicos.filter(function (s) { return !s.dataEntregaReal && (!s.prazo || s.prazo >= hoje); }).length;
    var atrasadas = servicos.filter(function (s) { return !s.dataEntregaReal && s.prazo && s.prazo < hoje; }).length;
    set('content',
      '<div class="stats-grid" style="margin-bottom:1.25rem">' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--purple-l)">⚗️</div><div><div class="stat-val">' + servicos.length + '</div><div class="stat-lbl">Manipulações</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">💰</div><div><div class="stat-val">' + fmt(valTotal) + '</div><div class="stat-lbl">Valor total</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--yellow-l)">⏳</div><div><div class="stat-val">' + pendentes + '</div><div class="stat-lbl">Pendentes de entrega</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--red-l)">🔴</div><div><div class="stat-val">' + atrasadas + '</div><div class="stat-lbl">Atrasadas</div></div></div>' +
      '</div>' +
      '<div class="card" style="margin-bottom:1.25rem">' +
      '<div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap">' +
      '<div class="fg"><label>De</label><input type="date" id="mDe" style="width:150px"/></div>' +
      '<div class="fg"><label>Até</label><input type="date" id="mAte" style="width:150px"/></div>' +
      '<div class="fg"><label>Status</label><select id="mStatus" style="width:150px"><option value="">Todos</option><option value="entregue">Entregue</option><option value="pendente">Pendente</option><option value="atrasado">Atrasado</option></select></div>' +
      '<div class="fg"><label>Pagamento</label><select id="mPag" style="width:150px"><option value="">Todos</option><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="pendente">A receber</option></select></div>' +
      '<button class="btn btn-primary" onclick="filtrarManipulacoes()">🔍 Filtrar</button>' +
      (canEdit('manipulacao') ? '<button class="btn btn-primary" onclick="openModalServico(null,\'manipulacao\')">＋ Nova Manipulação</button>' : '') +
      '</div>' +
      '</div>' +
      '<div class="card" id="manipResult">' +
      '<div class="card-head"><div class="card-title">Histórico de Manipulações</div></div>' +
      renderManipTable(servicos, clientes, hoje) +
      '</div>'
    );
    window._manipServicos = servicos; window._manipClientes = clientes; window._manipHoje = hoje;
  });
}

function renderManipTable(servicos, clientes, hoje) {
  if (!servicos.length) return '<div class="empty"><span class="empty-ico">⚗️</span><p class="empty-txt">Nenhuma manipulação registrada</p>' + (canEdit('manipulacao') ? '<button class="btn btn-primary" style="margin-top:1rem" onclick="openModalServico(null,\'manipulacao\')">＋ Nova Manipulação</button>' : '') + '</div>';
  function statusBadge(s) {
    if (s.dataEntregaReal) return '<span class="badge badge-green">🟢 Entregue</span>';
    if (!s.prazo) return '<span class="badge badge-gray">— Sem prazo</span>';
    return s.prazo < hoje ? '<span class="badge badge-red">🔴 Atrasado</span>' : '<span class="badge badge-yellow">🟡 Pendente</span>';
  }
  return '<div class="table-wrap"><table><thead><tr><th>Orç#</th><th>Cliente</th><th>Fórmula</th><th>Entrega</th><th>Valor</th><th>Pagamento</th><th>Data</th><th></th></tr></thead><tbody>' +
    servicos.map(function (s) {
      var cl = clientes.find(function (c) { return c.id === s.clienteId; });
      var formulaTrunc = (s.formula || '—').slice(0, 50) + ((s.formula || '').length > 50 ? '…' : '');
      return '<tr><td><span class="orc-num" style="font-size:.9rem">#' + padNum(s.orcNum) + '</span></td>' +
        '<td class="td-name">' + (cl ? esc(cl.nome) : '—') + '</td>' +
        '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem" title="' + esc(s.formula || '—') + '">' + esc(formulaTrunc) + '</td>' +
        '<td>' + statusBadge(s) + '</td>' +
        '<td style="font-weight:600">' + fmt(s.valor) + '</td>' +
        '<td>' + pagBadge(s.pagamento) + '</td>' +
        '<td class="td-muted">' + fmtDate(s.data) + '</td>' +
        '<td style="display:flex;gap:.3rem">' +
        '<button class="btn btn-icon btn-sm" title="Ver detalhes" onclick="verManipulacao(\'' + s.id + '\')">👁</button>' +
        (canEdit('manipulacao') ? '<button class="btn btn-icon btn-sm" title="Editar" onclick="closeModal(\'modalOrc\');openModalServico(null,null,\'' + s.id + '\')">✏️</button>' : '') +
        (!s.dataEntregaReal && canEdit('manipulacao') ? '<button class="btn btn-sm btn-green" onclick="marcarEntregue(\'' + s.id + '\')" style="font-size:.72rem;padding:.3rem .6rem" title="Marcar como entregue">✅</button>' : '') +
        '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

function filtrarManipulacoes() {
  var de = gv('mDe'), ate = gv('mAte'), status = gv('mStatus'), pag = gv('mPag');
  var hoje = window._manipHoje || new Date().toISOString().split('T')[0];
  var list = (window._manipServicos || []).filter(function (s) {
    if (de && s.data < de) return false;
    if (ate && s.data > ate) return false;
    if (pag && s.pagamento !== pag) return false;
    if (status === 'entregue' && !s.dataEntregaReal) return false;
    if (status === 'pendente' && (s.dataEntregaReal || !s.prazo || s.prazo < hoje)) return false;
    if (status === 'atrasado' && (s.dataEntregaReal || !s.prazo || s.prazo >= hoje)) return false;
    return true;
  });
  set('manipResult', '<div class="card-head"><div class="card-title">Resultados</div></div>' + renderManipTable(list, window._manipClientes || [], hoje));
}

function verManipulacao(id) {
  Promise.all([dbGetServicos(), dbGetClientes()]).then(function (r) {
    var s = r[0].find(function (x) { return x.id === id; });
    if (!s) return;
    var cl = r[1].find(function (c) { return c.id === s.clienteId; });
    document.getElementById('mOrcSub').textContent = 'Manipulação #' + padNum(s.orcNum);
    set('mOrcBody',
      '<div style="text-align:center;padding:1rem 0 1.5rem"><div class="orc-num" style="font-size:2.5rem">#' + padNum(s.orcNum) + '</div><div style="font-size:.8rem;color:var(--tx3)">' + fmtDate(s.data) + '</div></div>' +
      '<div class="divider"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.85rem;margin-bottom:1.25rem">' +
      '<div><span style="color:var(--tx3)">Cliente:</span> <strong>' + (cl ? esc(cl.nome) : '—') + '</strong></div>' +
      '<div><span style="color:var(--tx3)">Pagamento:</span> ' + pagBadge(s.pagamento) + '</div>' +
      '<div><span style="color:var(--tx3)">Prazo:</span> ' + (s.prazo ? fmtDate(s.prazo) : '—') + '</div>' +
      '<div><span style="color:var(--tx3)">Entrega real:</span> ' + (s.dataEntregaReal ? fmtDate(s.dataEntregaReal) : 'Não entregue') + '</div>' +
      '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Fórmula:</span><div style="margin-top:.3rem;font-size:.82rem;background:var(--bg);padding:.75rem;border-radius:var(--r)">' + esc(s.formula || '—') + '</div></div>' +
      (s.obs ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Obs:</span> ' + esc(s.obs) + '</div>' : '') +
      '</div>' +
      '<div class="divider"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0">' +
      '<span style="font-size:1rem;font-weight:700">Total</span>' +
      '<span style="font-family:\'Playfair Display\',serif;font-size:1.6rem;font-weight:800;color:var(--blue)">' + fmt(s.valor) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">' +
      (canEdit('manipulacao') ? '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="closeModal(\'modalOrc\');openModalServico(null,null,\'' + s.id + '\')">✏️ Editar</button>' : '') +
      '<button class="btn btn-primary" style="flex:1;justify-content:center" onclick="gerarPDFServicoById(\'' + s.id + '\')">📄 Gerar PDF</button>' +
      '</div>'
    );
    openModal('modalOrc');
  });
}

function marcarEntregue(id) {
  var hoje = new Date().toISOString().split('T')[0];
  var cached = fromCache('servicos') || [];
  var idx = cached.findIndex(function (x) { return x.id === id; });
  if (idx >= 0) { cached[idx].dataEntregaReal = hoje; cached[idx].data_entrega_real = hoje; setCache('servicos', cached); }
  clearCache('servicos');
  toast('Manipulação marcada como entregue!', 'ok');
  pgManipulacao();
}

// ─── EXAMES ──────────────────────────────────────────────
function pgExames() {
  if (!canView('exames')) { set('content', '<div class="alert alert-red">⛔ Você não tem permissão para acessar esta área.</div>'); return; }
  var btn = document.getElementById('topActionBtn');
  if (canEdit('exames')) { btn.style.display = ''; btn.textContent = '＋ Novo Exame'; }
  set('content', '<div class="card"><div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div></div>');
  Promise.all([dbGetServicos(), dbGetClientes()]).then(function (r) {
    var servicos = r[0].filter(function (s) { return s.tipo === 'exame'; }).sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); }), clientes = r[1];
    var valTotal = servicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var comResult = servicos.filter(function (s) { return !!(s.resultadoExame || s.resultado_exame); }).length;
    var semResult = servicos.length - comResult;
    set('content',
      '<div class="stats-grid" style="margin-bottom:1.25rem">' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l)">🔬</div><div><div class="stat-val">' + servicos.length + '</div><div class="stat-lbl">Total de exames</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">💰</div><div><div class="stat-val">' + fmt(valTotal) + '</div><div class="stat-lbl">Valor total</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">✅</div><div><div class="stat-val">' + comResult + '</div><div class="stat-lbl">Com resultado</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--yellow-l)">⏳</div><div><div class="stat-val">' + semResult + '</div><div class="stat-lbl">Aguardando resultado</div></div></div>' +
      '</div>' +
      '<div class="card" style="margin-bottom:1.25rem">' +
      '<div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap">' +
      '<div class="fg"><label>De</label><input type="date" id="eDe" style="width:150px"/></div>' +
      '<div class="fg"><label>Até</label><input type="date" id="eAte" style="width:150px"/></div>' +
      '<div class="fg"><label>Pagamento</label><select id="ePag" style="width:150px"><option value="">Todos</option><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="pendente">A receber</option></select></div>' +
      '<button class="btn btn-primary" onclick="filtrarExames()">🔍 Filtrar</button>' +
      (canEdit('exames') ? '<button class="btn btn-primary" onclick="openModalServico(null,\'exame\')">＋ Novo Exame</button>' : '') +
      '</div>' +
      '</div>' +
      '<div class="card" id="exameResult">' +
      '<div class="card-head"><div class="card-title">Histórico de Exames</div></div>' +
      renderExameTable(servicos, clientes) +
      '</div>'
    );
    window._exameServicos = servicos; window._exameClientes = clientes;
  });
}

function renderExameTable(servicos, clientes) {
  if (!servicos.length) return '<div class="empty"><span class="empty-ico">🔬</span><p class="empty-txt">Nenhum exame registrado</p>' + (canEdit('exames') ? '<button class="btn btn-primary" style="margin-top:1rem" onclick="openModalServico(null,\'exame\')">＋ Novo Exame</button>' : '') + '</div>';
  return '<div class="table-wrap"><table><thead><tr><th>Orç#</th><th>Cliente</th><th>Tipo de Exame</th><th>Resultado</th><th>Valor</th><th>Pagamento</th><th>Data</th><th></th></tr></thead><tbody>' +
    servicos.map(function (s) {
      var cl = clientes.find(function (c) { return c.id === s.clienteId; });
      var temResult = !!(s.resultadoExame || s.resultado_exame);
      return '<tr><td><span class="orc-num" style="font-size:.9rem">#' + padNum(s.orcNum) + '</span></td>' +
        '<td class="td-name">' + (cl ? esc(cl.nome) : '—') + '</td>' +
        '<td>' + esc(s.tipoExame || '—') + '</td>' +
        '<td>' + (temResult ? '<span class="badge badge-green">✅ Com resultado</span>' : '<span class="badge badge-yellow">⏳ Aguardando</span>') + '</td>' +
        '<td style="font-weight:600">' + fmt(s.valor) + '</td>' +
        '<td>' + pagBadge(s.pagamento) + '</td>' +
        '<td class="td-muted">' + fmtDate(s.data) + '</td>' +
        '<td style="display:flex;gap:.3rem">' +
        '<button class="btn btn-icon btn-sm" title="Ver detalhes" onclick="verExame(\'' + s.id + '\')">👁</button>' +
        (canEdit('exames') ? '<button class="btn btn-icon btn-sm" title="Editar" onclick="closeModal(\'modalOrc\');openModalServico(null,null,\'' + s.id + '\')">✏️</button>' : '') +
        '</td>' +
        '</tr>';
    }).join('') + '</tbody></table></div>';
}

function filtrarExames() {
  var de = gv('eDe'), ate = gv('eAte'), pag = gv('ePag');
  var list = (window._exameServicos || []).filter(function (s) {
    if (de && s.data < de) return false;
    if (ate && s.data > ate) return false;
    if (pag && s.pagamento !== pag) return false;
    return true;
  });
  set('exameResult', '<div class="card-head"><div class="card-title">Resultados</div></div>' + renderExameTable(list, window._exameClientes || []));
}

function verExame(id) {
  Promise.all([dbGetServicos(), dbGetClientes()]).then(function (r) {
    var s = r[0].find(function (x) { return x.id === id; });
    if (!s) return;
    var cl = r[1].find(function (c) { return c.id === s.clienteId; });
    var resultado = s.resultadoExame || s.resultado_exame || '';
    var lab = s.laboratorio || '';
    document.getElementById('mOrcSub').textContent = 'Exame #' + padNum(s.orcNum);
    set('mOrcBody',
      '<div style="text-align:center;padding:1rem 0 1.5rem"><div class="orc-num" style="font-size:2.5rem">#' + padNum(s.orcNum) + '</div><div style="font-size:.8rem;color:var(--tx3)">' + fmtDate(s.data) + '</div></div>' +
      '<div class="divider"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.85rem;margin-bottom:1.25rem">' +
      '<div><span style="color:var(--tx3)">Cliente:</span> <strong>' + (cl ? esc(cl.nome) : '—') + '</strong></div>' +
      '<div><span style="color:var(--tx3)">Pagamento:</span> ' + pagBadge(s.pagamento) + '</div>' +
      '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Tipo de Exame:</span> <strong>' + esc(s.tipoExame || '—') + '</strong></div>' +
      (lab ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Laboratório:</span> ' + esc(lab) + '</div>' : '') +
      (resultado ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Resultado:</span><div style="margin-top:.3rem;font-size:.82rem;background:var(--bg);padding:.75rem;border-radius:var(--r)">' + esc(resultado) + '</div></div>' : '') +
      (s.obs ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Obs:</span> ' + esc(s.obs) + '</div>' : '') +
      '</div>' +
      '<div class="divider"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0">' +
      '<span style="font-size:1rem;font-weight:700">Total</span>' +
      '<span style="font-family:\'Playfair Display\',serif;font-size:1.6rem;font-weight:800;color:var(--blue)">' + fmt(s.valor) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">' +
      (canEdit('exames') ? '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="closeModal(\'modalOrc\');openModalServico(null,null,\'' + s.id + '\')">✏️ Editar</button>' : '') +
      '<button class="btn btn-primary" style="flex:1;justify-content:center" onclick="gerarPDFServicoById(\'' + s.id + '\')">📄 Gerar PDF</button>' +
      '</div>'
    );
    openModal('modalOrc');
  });
}

// ─── ORÇAMENTOS ──────────────────────────────────────────
function pgOrcamentos() {
  if (!canView('orcamentos')) {
    set('content', '<div class="alert alert-red">⛔ Você não tem permissão para acessar esta área.</div>'); return;
  }
  var hoje = new Date().toISOString().split('T')[0];
  var mesInicio = hoje.slice(0, 8) + '01';
  dbGetUsers().then(function (users) {
    var userOpts = users.map(function (u) { return '<option value="' + esc(u.nome) + '">' + esc(u.nome) + '</option>'; }).join('');
    set('content',
      '<div class="card" style="margin-bottom:1.25rem">' +
      '<div class="card-head"><div class="card-title">Filtrar Período</div></div>' +
      '<div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap">' +
      '<div class="fg"><label>Data Início</label><input type="date" id="orcDe" value="' + mesInicio + '" style="width:160px"/></div>' +
      '<div class="fg"><label>Data Fim</label><input type="date" id="orcAte" value="' + hoje + '" style="width:160px"/></div>' +
      '<div class="fg"><label>Tipo</label><select id="orcTipo" style="width:160px"><option value="">Todos</option><option value="manipulacao">Manipulação</option><option value="exame">Exame</option><option value="produto">Produto</option></select></div>' +
      '<div class="fg"><label>Pagamento</label><select id="orcPag" style="width:160px"><option value="">Todos</option><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="pendente">A receber</option></select></div>' +
      '<div class="fg"><label>Atendente</label><select id="orcUser" style="width:160px"><option value="">Todos</option>' + userOpts + '</select></div>' +
      '<button class="btn btn-primary" onclick="filtrarOrcamentos()">🔍 Filtrar</button>' +
      '<button class="btn btn-ghost" onclick="limparFiltrosOrc()">✕ Limpar</button>' +
      '<button class="btn btn-ghost" onclick="gerarPDFOrcamentos()" style="border-color:var(--red);color:var(--red)">📄 Exportar PDF</button>' +
      '</div>' +
      '</div>' +
      '<div id="orcResult"><div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div></div>'
    );
    filtrarOrcamentos();
  });
}

function limparFiltrosOrc() {
  var hoje = new Date().toISOString().split('T')[0];
  setVal('orcDe', hoje.slice(0, 8) + '01');
  setVal('orcAte', hoje);
  setVal('orcTipo', ''); setVal('orcPag', ''); setVal('orcUser', '');
  filtrarOrcamentos();
}

function filtrarOrcamentos() {
  var de = gv('orcDe');
  var ate = gv('orcAte');
  var tipo = gv('orcTipo');
  var pag = gv('orcPag');
  var user = gv('orcUser') || '';
  set('orcResult', '<div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div>');
  Promise.all([dbGetServicos({ de: de, ate: ate, tipo: tipo, pag: pag }), dbGetClientes()]).then(function (r) {
    var list = r[0], clientes = r[1];
    if (user) list = list.filter(function (s) { return (s.criadoPor || '') === user; });
    var total = list.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var pendente = list.filter(function (s) { return s.pagamento === 'pendente'; }).reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var byPag = {};
    list.forEach(function (s) { byPag[s.pagamento] = (byPag[s.pagamento] || 0) + (parseFloat(s.valor) || 0); });
    var byCliente = {};
    list.forEach(function (s) { byCliente[s.clienteId] = (byCliente[s.clienteId] || 0) + (parseFloat(s.valor) || 0); });
    var top5 = Object.keys(byCliente).sort(function (a, b) { return byCliente[b] - byCliente[a]; }).slice(0, 5).map(function (cid) {
      var cl = clientes.find(function (c) { return c.id === cid; });
      return { nome: cl ? cl.nome : cid, val: byCliente[cid] };
    });
    var diasMap = {};
    list.forEach(function (s) { diasMap[s.data] = (diasMap[s.data] || 0) + (parseFloat(s.valor) || 0); });
    var diasArr = Object.keys(diasMap).sort().map(function (d) { return { d: d, v: diasMap[d] }; });
    var maxV = diasArr.length ? Math.max.apply(null, diasArr.map(function (x) { return x.v; })) : 0;
    var html =
      '<p style="font-size:.8rem;color:var(--tx3);margin-bottom:1rem">Exibindo ' + list.length + ' registro(s) de ' + fmtDate(de || '...') + ' a ' + fmtDate(ate || '...') + '</p>' +
      '<div class="stats-grid" style="margin-bottom:1.25rem">' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l)">📋</div><div><div class="stat-val">' + list.length + '</div><div class="stat-lbl">Atendimentos no período</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">💰</div><div><div class="stat-val">' + fmt(total) + '</div><div class="stat-lbl">Receita total</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--yellow-l)">⏳</div><div><div class="stat-val">' + fmt(pendente) + '</div><div class="stat-lbl">A receber</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--purple-l)">📊</div><div><div class="stat-val">' + fmt(total - pendente) + '</div><div class="stat-lbl">Recebido</div></div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1.25rem;margin-bottom:1.25rem">' +
      '<div class="card"><div class="card-head"><div class="card-title">Por Forma de Pagamento</div></div><div style="display:flex;flex-direction:column;gap:.5rem">' +
      Object.entries(byPag).map(function (e) { var pct = total > 0 ? Math.round(e[1] / total * 100) : 0; return '<div style="display:flex;align-items:center;gap:.75rem"><span style="font-size:.78rem;width:70px;flex-shrink:0">' + pagBadge(e[0]) + '</span><div style="flex:1;background:var(--bg);border-radius:4px;height:8px"><div style="width:' + pct + '%;height:100%;background:var(--blue);border-radius:4px"></div></div><span style="font-size:.75rem;font-weight:600;width:72px;text-align:right">' + fmt(e[1]) + '</span></div>'; }).join('') || '<p style="color:var(--tx3);font-size:.83rem">Sem dados</p>' +
      '</div></div>' +
      '<div class="card"><div class="card-head"><div class="card-title">Por Tipo de Serviço</div></div>' +
      ['manipulacao', 'exame', 'produto'].map(function (t) { var v = list.filter(function (s) { return s.tipo === t; }).reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0); var n = list.filter(function (s) { return s.tipo === t; }).length; if (!n) return ''; return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border)"><div>' + tipoBadge(t) + '</div><div style="text-align:right"><div style="font-weight:600;font-size:.88rem">' + fmt(v) + '</div><div style="font-size:.72rem;color:var(--tx3)">' + n + ' registro(s)</div></div></div>'; }).join('') +
      '</div>' +
      '<div class="card"><div class="card-head"><div class="card-title">🏆 Top 5 Clientes</div></div>' +
      (top5.length ? top5.map(function (c, i) { return '<div style="display:flex;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--border);font-size:.83rem"><span>' + (i + 1) + '. ' + esc(c.nome) + '</span><strong>' + fmt(c.val) + '</strong></div>'; }).join('') : '<p style="color:var(--tx3);font-size:.83rem">Sem dados</p>') +
      '</div>' +
      '</div>' +
      (diasArr.length ? '<div class="card" style="margin-bottom:1.25rem"><div class="card-head"><div class="card-title">Receita por Dia</div></div><div style="display:flex;flex-direction:column;gap:.4rem">' + diasArr.map(function (d) { var pct = maxV > 0 ? Math.round(d.v / maxV * 100) : 0; return '<div style="display:flex;align-items:center;gap:.75rem"><span style="font-size:.72rem;color:var(--tx3);width:50px;flex-shrink:0">' + fmtDate(d.d) + '</span><div style="flex:1;background:var(--bg);border-radius:4px;height:8px"><div style="width:' + pct + '%;height:100%;background:var(--blue);border-radius:4px"></div></div><span style="font-size:.72rem;font-weight:600;width:72px;text-align:right">' + fmt(d.v) + '</span></div>'; }).join('') + '</div></div>' : '') +
      '<div class="card">' +
      '<div class="card-head"><div class="card-title">Detalhamento</div><div class="card-sub">' + list.length + ' registro(s) no período</div></div>' +
      (list.length === 0 ? '<div class="empty"><span class="empty-ico">📋</span><p class="empty-txt">Nenhum registro no período selecionado</p></div>' :
        '<div class="table-wrap"><table><thead><tr><th>Orç#</th><th>Cliente</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Pagamento</th><th>Data</th><th></th></tr></thead><tbody>' +
        list.map(function (s) {
          var cl = clientes.find(function (c) { return c.id === s.clienteId; });
          var isPend = s.pagamento === 'pendente';
          var canEditSrv = canEdit('manipulacao') || canEdit('exames') || canEdit('orcamentos');
          return '<tr><td><span class="orc-num" style="font-size:.9rem">#' + padNum(s.orcNum) + '</span></td><td class="td-name">' + (cl ? esc(cl.nome) : '—') + '</td><td>' + tipoBadge(s.tipo) + '</td><td style="font-size:.8rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(getServicoDesc(s)) + '</td><td style="font-weight:600">' + fmt(s.valor) + '</td><td style="' + (isPend ? 'background:var(--yellow-l)' : '') + '">' + pagBadge(s.pagamento) + '</td><td class="td-muted">' + fmtDate(s.data) + '</td>'
            + '<td style="display:flex;gap:.3rem">'
            + '<button class="btn btn-icon btn-sm" title="Ver detalhes" onclick="verOrcamento(\'' + s.id + '\')">👁</button>'
            + (canEditSrv ? '<button class="btn btn-icon btn-sm" title="Editar" onclick="openModalServico(null,null,\'' + s.id + '\')">✏️</button>' : '')
            + '</td></tr>';
        }).join('') +
        '<tr style="background:var(--bg)"><td colspan="4" style="font-weight:700;text-align:right;font-size:.83rem">Total:</td><td style="font-weight:700;color:var(--blue)">' + fmt(total) + '</td><td colspan="3"></td></tr>' +
        '</tbody></table></div>') +
      '</div>';
    set('orcResult', html);
  });
}

function gerarPDFOrcamentos() {
  var de = gv('orcDe');
  var ate = gv('orcAte');
  var tipo = gv('orcTipo');
  var pag = gv('orcPag');
  Promise.all([dbGetServicos({ de: de, ate: ate, tipo: tipo, pag: pag }), dbGetClientes()]).then(function (r) {
    var list = r[0].slice().sort(function (a, b) { return b.orcNum - a.orcNum; });
    var clientes = r[1];
    if (!list.length) { toast('Nenhum registro para exportar.', 'yw'); return; }
    var total = list.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var recebido = list.filter(function (s) { return s.pagamento !== 'pendente'; }).reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var pendente = total - recebido;
    var TIPO_LABEL = { manipulacao: 'Manipulação', exame: 'Exame', produto: 'Produto' };
    var PAG_LABEL = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito', pendente: 'A receber' };
    var periodo = (de ? fmtDate(de) : '—') + ' a ' + (ate ? fmtDate(ate) : '—');
    var tipoStr = tipo ? TIPO_LABEL[tipo] || tipo : 'Todos';
    var pagStr = pag ? PAG_LABEL[pag] || pag : 'Todos';
    function s_esc(x) { return String(x || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var rows = list.map(function (s) {
      var cl = clientes.find(function (c) { return c.id === s.clienteId; });
      var desc = s.tipo === 'manipulacao' ? (s.formula || '—').slice(0, 50) + (s.formula && s.formula.length > 50 ? '…' : '')
        : s.tipo === 'exame' ? (s.tipoExame || '—')
          : (s.produtoDesc || '—');
      return '<tr>'
        + '<td style="width:60px;font-weight:700;color:#003087">#' + padNum(s.orcNum) + '</td>'
        + '<td style="width:160px">' + (cl ? s_esc(cl.nome) : '—') + '</td>'
        + '<td style="width:90px">' + (TIPO_LABEL[s.tipo] || s.tipo) + '</td>'
        + '<td style="font-size:11px;color:#555">' + s_esc(desc) + '</td>'
        + '<td style="width:100px;text-align:right;font-weight:600">' + fmt(s.valor) + '</td>'
        + '<td style="width:90px">' + (PAG_LABEL[s.pagamento] || s.pagamento || '—') + '</td>'
        + '<td style="width:80px;color:#666">' + fmtDate(s.data) + '</td>'
        + '</tr>';
    }).join('');
    var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>'
      + '<title>Orçamentos — Farmácia Couto</title>'
      + '<style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;padding:24px}.header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #003087}.brand{font-size:20px;font-weight:800;color:#003087}.brand-sub{font-size:11px;color:#888;margin-top:2px}.report-title{font-size:15px;font-weight:700;color:#C8102E;margin-bottom:14px}.meta{background:#F0F2F7;border-radius:6px;padding:10px 14px;margin-bottom:16px;display:flex;gap:24px;flex-wrap:wrap}.meta span{font-size:11px;color:#555}.meta strong{color:#111}.summary{display:flex;gap:12px;margin-bottom:18px}.sum-box{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px 14px;text-align:center}.sum-val{font-size:16px;font-weight:800;color:#003087}.sum-val.red{color:#C8102E}.sum-val.green{color:#059669}.sum-lbl{font-size:10px;color:#888;margin-top:2px}table{width:100%;border-collapse:collapse}thead tr{background:#003087;color:#fff}th{padding:7px 8px;text-align:left;font-size:11px;font-weight:600}td{padding:6px 8px;border-bottom:1px solid #eee;font-size:11px}tr:nth-child(even) td{background:#F7F9FC}tr:last-child td{border-bottom:none}.footer{margin-top:22px;padding-top:12px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:10px;color:#aaa}@media print{body{padding:12px}.no-print{display:none}}</style></head><body>'
      + '<div class="header"><div><div class="brand">Farmácia Couto</div><div class="brand-sub">Sistema de Gestão — Relatório de Orçamentos</div></div><div style="text-align:right;font-size:11px;color:#888">Emitido em: ' + new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '<br>Por: ' + (STATE.user ? s_esc(STATE.user.nome) : '—') + '</div></div>'
      + '<div class="report-title">📋 Relatório de Orçamentos</div>'
      + '<div class="meta"><span><strong>Período:</strong> ' + periodo + '</span><span><strong>Tipo:</strong> ' + tipoStr + '</span><span><strong>Pagamento:</strong> ' + pagStr + '</span><span><strong>Total:</strong> ' + list.length + ' registros</span></div>'
      + '<div class="summary"><div class="sum-box"><div class="sum-val">' + list.length + '</div><div class="sum-lbl">Atendimentos</div></div><div class="sum-box"><div class="sum-val green">' + fmt(recebido) + '</div><div class="sum-lbl">Recebido</div></div><div class="sum-box"><div class="sum-val red">' + fmt(pendente) + '</div><div class="sum-lbl">A receber</div></div><div class="sum-box"><div class="sum-val">' + fmt(total) + '</div><div class="sum-lbl">Total geral</div></div></div>'
      + '<table><thead><tr><th>Orç#</th><th>Cliente</th><th>Tipo</th><th>Descrição</th><th style="text-align:right">Valor</th><th>Pagamento</th><th>Data</th></tr></thead><tbody>' + rows + '</tbody></table>'
      + '<div class="footer"><span>Farmácia Couto — Relatório gerado automaticamente pelo sistema</span><span>Total: ' + fmt(total) + '</span></div>'
      + '</body></html>';
    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { toast('Permita pop-ups para exportar o PDF.', 'yw'); return; }
    win.document.write(html);
    win.document.close();
    win.onload = function () { setTimeout(function () { win.focus(); win.print(); }, 400); };
    toast('PDF aberto! Use Ctrl+P para salvar como PDF.', 'ok');
  });
}

function verOrcamento(id) {
  Promise.all([dbGetServicos(), dbGetClientes()]).then(function (r) {
    var s = r[0].find(function (x) { return x.id === id; });
    if (!s) return;
    var cl = r[1].find(function (c) { return c.id === s.clienteId; });
    document.getElementById('mOrcSub').textContent = 'Orçamento #' + padNum(s.orcNum);
    set('mOrcBody',
      '<div style="text-align:center;padding:1rem 0 1.5rem"><div class="orc-num" style="font-size:2.5rem">#' + padNum(s.orcNum) + '</div><div style="font-size:.8rem;color:var(--tx3)">Emitido em ' + fmtDate(s.data) + '</div></div>' +
      '<div class="divider"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.85rem;margin-bottom:1.25rem">' +
      '<div><span style="color:var(--tx3)">Cliente:</span> <strong>' + (cl ? esc(cl.nome) : '—') + '</strong></div>' +
      '<div><span style="color:var(--tx3)">Serviço:</span> ' + tipoBadge(s.tipo) + '</div>' +
      '<div><span style="color:var(--tx3)">Pagamento:</span> ' + pagBadge(s.pagamento) + '</div>' +
      '<div><span style="color:var(--tx3)">Atendente:</span> ' + esc(s.criadoPor || '—') + '</div>' +
      (s.tipo === 'manipulacao' ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Fórmula:</span><div style="margin-top:.3rem;font-size:.82rem;background:var(--bg);padding:.75rem;border-radius:var(--r)">' + esc(s.formula || '—') + '</div></div>' : '') +
      (s.tipo === 'exame' ? '<div><span style="color:var(--tx3)">Exame:</span> ' + esc(s.tipoExame || '—') + '</div>' : '') +
      (s.obs ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Obs:</span> ' + esc(s.obs) + '</div>' : '') +
      '</div>' +
      '<div class="divider"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0">' +
      '<span style="font-size:1rem;font-weight:700">Total</span>' +
      '<span style="font-family:\'Playfair Display\',serif;font-size:1.6rem;font-weight:800;color:var(--blue)">' + fmt(s.valor) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">' +
      (canEdit('orcamentos') || canEdit('manipulacao') || canEdit('exames') ? '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="closeModal(\'modalOrc\');openModalServico(null,null,\'' + s.id + '\')">✏️ Editar Orçamento</button>' : '') +
      '<button class="btn btn-primary" style="flex:1;justify-content:center" onclick="gerarPDFServicoById(\'' + s.id + '\')">📄 Gerar PDF</button>' +
      '</div>'
    );
    openModal('modalOrc');
  });
}

function gerarPDFServicoById(id) {
  Promise.all([dbGetServicos(), dbGetClientes()]).then(function (r) {
    var s = r[0].find(function (x) { return x.id === id; });
    if (!s) { toast('Serviço não encontrado.', 'er'); return; }
    var cl = r[1].find(function (c) { return c.id === s.clienteId; });
    gerarPDFServicoIndividual(s, cl, s.orcNum);
  });
}

// ─── USUÁRIOS ────────────────────────────────────────────
function pgUsuarios() {
  if (!canEdit('usuarios')) {
    set('content', '<div class="alert alert-red">⛔ Acesso restrito a administradores.</div>'); return;
  }
  var btn = document.getElementById('topActionBtn');
  btn.style.display = ''; btn.textContent = '＋ Novo Usuário';
  set('content', '<div class="card"><div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div></div>');
  dbGetUsers().then(function (users) {
    var ativos = users.filter(function (u) { return u.ativo !== false; }).length;
    function permSummary(u) {
      return MODULOS.map(function (m) {
        var v = (u.perms || {})[m.key] || 'none';
        if (v === 'none') return '';
        var cls = v === 'edit' ? 'pchip-edit' : 'pchip-read';
        var lbl = v === 'edit' ? '✏️ ' + m.label : '👁 ' + m.label;
        return '<span class="perm-chip ' + cls + '">' + lbl + '</span>';
      }).join('');
    }
    set('content',
      '<div class="card">' +
      '<div class="card-head"><div><div class="card-title">Usuários do Sistema</div><div class="card-sub">Gerencie acessos, perfis e permissões</div></div>' +
      '<button class="btn btn-primary" onclick="openModalUsuario()">＋ Novo Usuário</button></div>' +
      '<div class="alert alert-blue" style="margin-bottom:1.25rem">ℹ️ <div><strong>Admin:</strong> admin@farmaciacouto.com / Couto@2025!</div></div>' +
      (ativos <= 1 ? '<div class="alert alert-yellow" style="margin-bottom:1.25rem">⚠️ <div>Apenas <strong>1 usuário ativo</strong>. Crie mais para garantir continuidade de acesso.</div></div>' : '') +
      '<div class="table-wrap"><table>' +
      '<thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Módulos</th><th>Status</th><th>Últ. acesso</th><th>Criado em</th><th>Ações</th></tr></thead>' +
      '<tbody>' +
      users.map(function (u) {
        var pf = PERFIS[u.perfil] || { label: '?', cor: 'badge-gray' };
        var ult = u.ultimoAcesso ? fmtDate(u.ultimoAcesso.split('T')[0]) : '—';
        var cria = u.criado_em ? fmtDate(u.criado_em.split('T')[0]) : '—';
        return '<tr>' +
          '<td class="td-name">' + esc(u.nome) + '</td>' +
          '<td class="td-muted">' + esc(u.email) + '</td>' +
          '<td><span class="badge ' + pf.cor + '">' + pf.label + '</span></td>' +
          '<td style="max-width:240px;line-height:1.8">' + (u.perfil === 'admin' ? '<span style="font-size:.75rem;color:var(--tx3)">Acesso total</span>' : permSummary(u)) + '</td>' +
          '<td>' + (u.ativo !== false ? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-gray">Inativo</span>') + '</td>' +
          '<td class="td-muted">' + ult + '</td>' +
          '<td class="td-muted">' + cria + '</td>' +
          '<td style="display:flex;gap:.4rem;align-items:center">' +
          (u.perfil !== 'admin' ? '<button class="btn btn-sm btn-ghost" onclick="openModalUsuario(\'' + u.id + '\')" title="Editar">✏️</button><button class="btn btn-sm btn-ghost" onclick="toggleUser(\'' + u.id + '\',' + !(u.ativo !== false) + ')">' + (u.ativo !== false ? 'Desativar' : 'Ativar') + '</button><button class="btn btn-sm btn-ghost" onclick="excluirUsuario(\'' + u.id + '\')" title="Excluir">🗑️</button>' : '<span style="font-size:.75rem;color:var(--tx3)">🔒</span>') +
          '<button class="btn btn-sm btn-ghost" title="Atividade" onclick="verAtividadeUsuario(\'' + u.id + '\')">📊</button>' +
          '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '</div>'
    );
  });
}

function toggleUser(id, ativo) {
  var msg = ativo ? 'Ativar este usuário?' : 'Desativar este usuário? Ele perderá acesso ao sistema.';
  if (!confirm(msg)) return;
  dbToggleUser(id, ativo).then(function () {
    clearCache('users');
    pgUsuarios();
    toast('Status do usuário atualizado.', 'ok');
  });
}

function excluirUsuario(id) {
  if (!confirm('Tem certeza que deseja excluir permanentemente este usuário? Esta ação não pode ser desfeita.')) return;
  dbDeleteUser(id).then(function () {
    clearCache('users');
    pgUsuarios();
    toast('Usuário excluído com sucesso.', 'ok');
  });
}

function verAtividadeUsuario(userId) {
  Promise.all([dbGetServicos(), dbGetUsers()]).then(function (r) {
    var user = r[1].find(function (u) { return u.id === userId; });
    if (!user) return;
    var srvs = r[0].filter(function (s) { return (s.criadoPor || '') === (user.nome || ''); }).slice(0, 20);
    document.getElementById('mOrcSub').textContent = 'Atividade de ' + esc(user.nome);
    set('mOrcBody',
      '<p style="font-size:.83rem;color:var(--tx3);margin-bottom:1rem">Serviços registrados por este usuário</p>' +
      (srvs.length === 0 ? '<div class="empty"><span class="empty-ico">📋</span><p class="empty-txt">Nenhum serviço registrado por este usuário</p></div>' :
        '<div class="table-wrap"><table><thead><tr><th>Orç#</th><th>Tipo</th><th>Valor</th><th>Pagamento</th><th>Data</th></tr></thead><tbody>' +
        srvs.map(function (s) { return '<tr><td><span class="orc-num">#' + padNum(s.orcNum) + '</span></td><td>' + tipoBadge(s.tipo) + '</td><td style="font-weight:600">' + fmt(s.valor) + '</td><td>' + pagBadge(s.pagamento) + '</td><td class="td-muted">' + fmtDate(s.data) + '</td></tr>'; }).join('') +
        '</tbody></table></div>')
    );
    openModal('modalOrc');
  });
}

// ══════════════════════════════════════════════════════════
//  MODAL HANDLERS
// ══════════════════════════════════════════════════════════
function openModalCliente(id) {
  var c = id ? lsArr('clientes').find(function (x) { return x.id === id; }) : null;
  document.getElementById('mClienteTitle').textContent = c ? 'Editar Cliente' : 'Novo Cliente';
  setVal('cNome', c ? c.nome : ''); setVal('cNasc', c ? c.nasc : '');
  setVal('cSexo', c ? c.sexo : ''); setVal('cTel', c ? c.tel : ''); setVal('cEmail', c ? c.email : '');
  setVal('cEnd', c ? c.endereco : '');
  setVal('cAlergias', c ? (c.alergiasCliente || c.alergias_cliente || '') : '');
  setVal('cMedico', c ? (c.medicoReferencia || c.medico_referencia || '') : '');
  setVal('cObs', c ? c.obs : '');
  document.getElementById('modalCliente').dataset.editId = id || '';
  openModal('modalCliente');
}

function cancelarModalCliente() {
  var editId = document.getElementById('modalCliente').dataset.editId;
  if (!editId) {
    var temDados = gv('cNome') || gv('cTel') || gv('cAlergias') || gv('cMedico') || gv('cObs');
    if (temDados && !confirm('Descartar os dados preenchidos?')) return;
  }
  closeModal('modalCliente');
}

function salvarCliente() {
  var nome = gv('cNome'), tel = gv('cTel');
  var numTel = tel.replace(/\D/g, '');
  var ok = true;
  if (!nome) { toast('Preencha o nome.', 'er'); return; }
  if (numTel.length < 10) {
    var err = document.getElementById('cTelErr');
    if (err) { err.textContent = 'Informe um WhatsApp válido (10 ou 11 dígitos).'; err.style.display = 'block'; }
    var inp = document.getElementById('cTel');
    if (inp) inp.style.borderColor = 'var(--red)';
    ok = false;
  }
  if (!ok) return;
  var editId = document.getElementById('modalCliente').dataset.editId;
  var obj = {
    id: editId || uid(), nome: nome, nasc: gv('cNasc') || null, sexo: gv('cSexo') || null,
    tel: tel, email: gv('cEmail') || null, endereco: gv('cEnd') || null, obs: gv('cObs') || null,
    alergiasCliente: gv('cAlergias') || null, medicoReferencia: gv('cMedico') || null,
  };
  closeModal('modalCliente');
  dbSaveCliente(obj, !!editId).then(function () {
    clearCache('clientes');
    toast('Cliente ' + (editId ? 'atualizado' : 'cadastrado') + ' com sucesso!', 'ok');
    pgClientes();
  });
}

function clearFieldErr(id) {
  var el = document.getElementById(id);
  if (el) el.style.borderColor = '';
  var err = document.getElementById(id + 'Err');
  if (err) err.style.display = 'none';
}

var _editandoServicoId = null;

function openModalServico(clienteId, tipo, servicoId) {
  _editandoServicoId = servicoId || null;
  var isEdit = !!servicoId;

  // Modo edição: buscar serviço existente
  if (isEdit) {
    var allSrv = fromCache('servicos') || [];
    var s = allSrv.find(function (x) { return x.id === servicoId; });
    if (!s) {
      dbGetServicos().then(function (all) {
        var srv = all.find(function (x) { return x.id === servicoId; });
        if (srv) openModalServico(srv.clienteId, srv.tipo, servicoId);
      });
      return;
    }
    clienteId = s.clienteId;
    tipo = s.tipo;
    document.getElementById('sClienteId').value = clienteId || '';
    document.getElementById('sClienteSearch').value = '';
    set('sClienteSelected', '');
    document.getElementById('sClienteSelected').style.display = 'none';
    document.getElementById('sClienteResults').style.display = 'none';
    var clientes = fromCache('clientes') || [];
    var cl = clientes.find(function (c) { return c.id === clienteId; });
    if (cl) {
      set('sClienteSelected', '<strong>' + esc(cl.nome) + '</strong> — ' + esc(cl.tel || '') + '<button class="btn btn-icon btn-sm" onclick="clearClienteServico()" style="margin-left:.5rem">✕</button>');
      document.getElementById('sClienteSelected').style.display = 'flex';
      document.getElementById('mServicoSub').textContent = 'Editando orçamento #' + padNum(s.orcNum) + ' — ' + cl.nome;
    } else {
      document.getElementById('mServicoSub').textContent = 'Editando orçamento #' + padNum(s.orcNum);
    }
    setVal('sTipo', s.tipo || '');
    setVal('sData', s.data || new Date().toISOString().split('T')[0]);
    setVal('sFormula', s.formula || '');
    setVal('sPrazo', s.prazo || '');
    setVal('sTipoExame', s.tipoExame || '');
    setVal('sProdutoDesc', s.produtoDesc || '');
    // Valor formatado
    var vRaw = parseFloat(s.valor) || 0;
    var vFmt = 'R$ ' + vRaw.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setVal('sValor', vFmt);
    setVal('sPagamento', s.pagamento || '');
    setVal('sObs', s.obs || '');
    setVal('sResultadoExame', s.resultadoExame || s.resultado_exame || '');
    setVal('sLaboratorio', s.laboratorio || '');
    onTipoChange();
    document.querySelector('#modalServico .modal-title').textContent = 'Editar Serviço';
    document.querySelector('#modalServico .btn-primary[onclick="salvarServico()"]').textContent = '💾 Salvar Alterações';
    openModal('modalServico');
    return;
  }

  // Modo criação
  document.querySelector('#modalServico .modal-title').textContent = 'Registrar Serviço';
  document.querySelector('#modalServico .btn-primary[onclick="salvarServico()"]').textContent = '💾 Registrar Serviço';
  document.getElementById('sClienteId').value = clienteId || '';
  document.getElementById('sClienteSearch').value = '';
  set('sClienteSelected', '');
  document.getElementById('sClienteSelected').style.display = 'none';
  document.getElementById('sClienteResults').style.display = 'none';
  if (clienteId) {
    var clientes2 = fromCache('clientes') || [];
    var cl2 = clientes2.find(function (c) { return c.id === clienteId; });
    if (cl2) {
      set('sClienteSelected', '<strong>' + esc(cl2.nome) + '</strong> — ' + esc(cl2.tel || '') + '<button class="btn btn-icon btn-sm" onclick="clearClienteServico()" style="margin-left:.5rem">✕</button>');
      document.getElementById('sClienteSelected').style.display = 'flex';
      document.getElementById('mServicoSub').textContent = 'Cliente: ' + cl2.nome;
    }
  } else {
    document.getElementById('mServicoSub').textContent = 'Registrar atendimento para um cliente';
  }
  setVal('sTipo', tipo || '');
  setVal('sData', new Date().toISOString().split('T')[0]);
  setVal('sFormula', ''); setVal('sPrazo', '');
  setVal('sTipoExame', ''); setVal('sProdutoDesc', '');
  setVal('sValor', ''); setVal('sPagamento', ''); setVal('sObs', '');
  setVal('sResultadoExame', ''); setVal('sLaboratorio', '');
  if (tipo) onTipoChange();
  openModal('modalServico');
}

function onTipoChange() {
  var t = document.getElementById('sTipo').value;
  document.getElementById('fManip').style.display = t === 'manipulacao' ? '' : 'none';
  document.getElementById('fPrazo').style.display = t === 'manipulacao' ? '' : 'none';
  document.getElementById('fExame').style.display = t === 'exame' ? '' : 'none';
  document.getElementById('fResultado').style.display = t === 'exame' ? '' : 'none';
  document.getElementById('fLaboratorio').style.display = t === 'exame' ? '' : 'none';
  document.getElementById('fProduto').style.display = t === 'produto' ? '' : 'none';
  var hint = document.getElementById('sFormulaHint');
  if (hint) hint.style.display = t === 'manipulacao' ? '' : 'none';
}

function cancelarModalServico() {
  var temDados = gv('sFormula') || gv('sTipoExame') || gv('sProdutoDesc') || gv('sValor') || gv('sObs');
  if (temDados && !confirm('Descartar os dados preenchidos?')) return;
  closeModal('modalServico');
}

function maskValorServico(inp) {
  var raw = inp.value.replace(/\D/g, '');
  if (!raw) { inp.value = ''; return; }
  var n = (parseInt(raw, 10) / 100).toFixed(2);
  inp.value = 'R$ ' + n.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function updateSenhaCounter() {
  var v = document.getElementById('uSenha');
  var c = document.getElementById('uSenhaCounter');
  if (v && c) { var n = v.value.length; c.textContent = n + ' caractere' + (n !== 1 ? 's' : ''); c.style.color = n >= 6 ? 'var(--green)' : 'var(--tx3)'; }
}

var _srTimeout;
function buscarClienteServico(q) {
  clearTimeout(_srTimeout);
  _srTimeout = setTimeout(function () {
    if (!q || q.length < 2) { document.getElementById('sClienteResults').style.display = 'none'; return; }
    var clientes = fromCache('clientes') || [];
    var found = clientes.filter(function (c) { return (c.nome + (c.tel || '')).toLowerCase().includes(q.toLowerCase()); }).slice(0, 6);
    var box = document.getElementById('sClienteResults');
    if (!found.length) {
      dbGetClientes().then(function (all) {
        var found2 = all.filter(function (c) { return (c.nome + (c.tel || '')).toLowerCase().includes(q.toLowerCase()); }).slice(0, 6);
        renderClienteDropdown(found2, box);
      });
      return;
    }
    renderClienteDropdown(found, box);
  }, 200);
}

function renderClienteDropdown(clientes, box) {
  if (!clientes.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  box.innerHTML = '<div style="position:absolute;top:2px;left:0;right:0;background:#fff;border:1.5px solid var(--blue);border-radius:var(--r);box-shadow:var(--md);z-index:50;overflow:hidden">' +
    clientes.map(function (c) { return '<div onclick="selectClienteServico(\'' + c.id + '\')" style="padding:.65rem .9rem;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border)" onmouseenter="this.style.background=\'var(--bg)\'" onmouseleave="this.style.background=\'\'"><strong>' + esc(c.nome) + '</strong> <span style="color:var(--tx3)">' + esc(c.tel || '') + '</span></div>'; }).join('') + '</div>';
}

function selectClienteServico(id) {
  var clientes = fromCache('clientes') || [];
  var cl = clientes.find(function (c) { return c.id === id; });
  if (!cl) return;
  document.getElementById('sClienteId').value = id;
  document.getElementById('sClienteResults').style.display = 'none';
  set('sClienteSelected', '<strong>' + esc(cl.nome) + '</strong> — ' + esc(cl.tel || '') + '<button class="btn btn-icon btn-sm" onclick="clearClienteServico()" style="margin-left:.5rem">✕</button>');
  document.getElementById('sClienteSelected').style.display = 'flex';
  document.getElementById('mServicoSub').textContent = 'Cliente: ' + cl.nome;
}

function clearClienteServico() {
  document.getElementById('sClienteId').value = '';
  document.getElementById('sClienteSelected').style.display = 'none';
  document.getElementById('mServicoSub').textContent = 'Registrar atendimento para um cliente';
}

function _setFieldErr(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.style.borderColor = 'var(--red)'; el.addEventListener('input', function () { el.style.borderColor = ''; }, { once: true }); }
}

function salvarServico() {
  var clienteId = document.getElementById('sClienteId').value;
  var tipo = gv('sTipo'), data = gv('sData'), valor = gv('sValor'), pag = gv('sPagamento');
  var hasErr = false;
  if (!clienteId) { toast('Selecione um cliente.', 'er'); hasErr = true; }
  if (!tipo) { _setFieldErr('sTipo'); toast('Selecione o tipo de serviço.', 'er'); hasErr = true; }
  if (!data) { _setFieldErr('sData'); if (!hasErr) toast('Informe a data.', 'er'); hasErr = true; }
  if (!valor) { _setFieldErr('sValor'); if (!hasErr) toast('Informe o valor.', 'er'); hasErr = true; }
  if (!pag) { _setFieldErr('sPagamento'); if (!hasErr) toast('Selecione a forma de pagamento.', 'er'); hasErr = true; }
  if (tipo === 'manipulacao' && !gv('sFormula')) { _setFieldErr('sFormula'); if (!hasErr) toast('Informe a fórmula.', 'er'); hasErr = true; }
  if (tipo === 'exame' && !gv('sTipoExame')) { _setFieldErr('sTipoExame'); if (!hasErr) toast('Informe o tipo de exame.', 'er'); hasErr = true; }
  if (hasErr) return;

  var valorNum = parseFloat(valor.replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;

  // ─── MODO EDIÇÃO ────────────────────────────────────────
  if (_editandoServicoId) {
    var editId = _editandoServicoId;
    var cached = fromCache('servicos') || [];
    var existing = cached.find(function (x) { return x.id === editId; }) || {};
    var changes = {
      clienteId: clienteId, tipo: tipo, data: data,
      valor: valorNum, pagamento: pag, obs: gv('sObs') || null,
      formula: gv('sFormula') || null, prazo: gv('sPrazo') || null,
      tipoExame: gv('sTipoExame') || null, produtoDesc: gv('sProdutoDesc') || null,
      resultadoExame: gv('sResultadoExame') || null,
      laboratorio: gv('sLaboratorio') || null,
    };
    closeModal('modalServico');
    var _clienteParaConfirm2 = (fromCache('clientes') || []).find(function (c) { return c.id === clienteId; }) || null;
    dbUpdateServico(editId, changes).then(function (num) {
      clearCache('servicos');
      renderPage(STATE.page);
      toast('Orçamento #' + padNum(num || existing.orcNum) + ' atualizado com sucesso!', 'ok');
      setTimeout(function () {
        var objFinal = Object.assign({}, existing, changes, { orcNum: num || existing.orcNum });
        abrirConfirmServico(objFinal, _clienteParaConfirm2, num || existing.orcNum);
      }, 150);
    });
    _editandoServicoId = null;
    return;
  }

  // ─── MODO CRIAÇÃO ───────────────────────────────────────
  var obj = {
    id: uid(), clienteId: clienteId, tipo: tipo, data: data,
    valor: valorNum,
    pagamento: pag, obs: gv('sObs'),
    formula: gv('sFormula'), prazo: gv('sPrazo') || null,
    tipoExame: gv('sTipoExame'), produtoDesc: gv('sProdutoDesc'),
    resultadoExame: gv('sResultadoExame') || null,
    laboratorio: gv('sLaboratorio') || null,
    criadoPor: STATE.user ? STATE.user.nome : '—',
  };

  closeModal('modalServico');

  var _clienteParaConfirm = (fromCache('clientes') || []).find(function (c) { return c.id === obj.clienteId; }) || null;

  dbSaveServico(obj).then(function (num) {
    clearCache('servicos');
    renderPage(STATE.page);
    setTimeout(function () {
      abrirConfirmServico(obj, _clienteParaConfirm, num);
    }, 150);
  });
}

// ── MODAL USUÁRIO ─────────────────────────────────────────
function openModalUsuario(editId) {
  var u = editId ? lsArr('users').find(function (x) { return x.id === editId; }) : null;
  document.getElementById('mUsuarioTitle').textContent = u ? 'Editar Usuário' : 'Novo Usuário';
  document.getElementById('modalUsuario').dataset.editId = editId || '';
  setVal('uNome', u ? u.nome : '');
  setVal('uEmail', u ? u.email : '');
  setVal('uSenha', '');
  var uSenhaEl = document.getElementById('uSenha');
  if (uSenhaEl) uSenhaEl.placeholder = editId ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres';
  setVal('uPerfil', u ? u.perfil : 'atendente');
  var defaultPerms = u ? u.perms : (PERFIS.atendente.perms);
  clearFieldErr('uEmail'); clearFieldErr('uSenha');
  var errS = document.getElementById('uSenhaErr'); if (errS) errS.style.display = 'none';
  updateSenhaCounter();
  renderPermGrid(defaultPerms);
  openModal('modalUsuario');
}

function onPerfilChange() {
  var perfil = document.getElementById('uPerfil').value;
  renderPermGrid((PERFIS[perfil] || PERFIS.atendente).perms);
}

function renderPermGrid(currentPerms) {
  currentPerms = currentPerms || {};
  var html = MODULOS.map(function (m) {
    var val = currentPerms[m.key] || 'none';
    var opts = m.key === 'usuarios'
      ? [
        { v: 'none', lbl: 'Sem acesso', cls: 'active-none' },
        { v: 'edit', lbl: '✏️ Criar/Editar', cls: 'active-edit' },
      ]
      : [
        { v: 'none', lbl: 'Sem acesso', cls: 'active-none' },
        { v: 'read', lbl: '👁 Só leitura', cls: 'active-read' },
        { v: 'edit', lbl: '✏️ Ler e editar', cls: 'active-edit' },
      ];
    var btns = opts.map(function (o) {
      var active = val === o.v ? ' ' + o.cls : '';
      return '<button type="button" class="perm-seg-btn' + active + '" onclick="setPermVal(\'' + m.key + '\',\'' + o.v + '\')" id="pseg_' + m.key + '_' + o.v + '">' + o.lbl + '</button>';
    }).join('');
    var rowClass = val !== 'none' ? ' has-access' : '';
    return '<div class="perm-row' + rowClass + '" id="prow_' + m.key + '">'
      + '<div><span class="perm-module-ico">' + m.ico + '</span>'
      + '<span class="perm-label">' + m.label + '</span>'
      + '<div class="perm-sub" style="padding-left:1.4rem">' + m.sub + '</div></div>'
      + '<div class="perm-seg">' + btns + '</div>'
      + '</div>';
  }).join('');
  set('permGrid', html);
}

function setPermVal(modKey, val) {
  var row = document.getElementById('prow_' + modKey);
  if (!row) return;
  row.className = 'perm-row' + (val !== 'none' ? ' has-access' : '');
  var btns = row.querySelectorAll('.perm-seg-btn');
  btns.forEach(function (b) {
    b.className = b.className.replace(/\s*(active-none|active-read|active-edit)/g, '');
    if (b.id === 'pseg_' + modKey + '_' + val) {
      var cls = val === 'none' ? 'active-none' : val === 'read' ? 'active-read' : 'active-edit';
      b.className += ' ' + cls;
    }
  });
}

function getPermGridValues() {
  var perms = {};
  MODULOS.forEach(function (m) {
    var val = 'none';
    ['none', 'read', 'edit'].forEach(function (v) {
      var btn = document.getElementById('pseg_' + m.key + '_' + v);
      if (btn && btn.className.includes('active-')) {
        if (btn.className.includes('active-none')) val = 'none';
        else if (btn.className.includes('active-read')) val = 'read';
        else if (btn.className.includes('active-edit')) val = 'edit';
      }
    });
    perms[m.key] = val;
  });
  return perms;
}

function salvarUsuario() {
  var editId = document.getElementById('modalUsuario').dataset.editId;
  var nome = gv('uNome');
  var email = gv('uEmail').toLowerCase();
  var senha = gv('uSenha');
  var perfil = document.getElementById('uPerfil').value;
  if (!nome || !email) { toast('Preencha nome e e-mail.', 'er'); return; }
  if (!editId && !senha) {
    var errS = document.getElementById('uSenhaErr');
    if (errS) { errS.textContent = 'Defina uma senha para o novo usuário.'; errS.style.display = 'block'; }
    _setFieldErr('uSenha');
    return;
  }
  if (senha && senha.length < 6) {
    var errS2 = document.getElementById('uSenhaErr');
    if (errS2) { errS2.textContent = 'Senha deve ter ao menos 6 caracteres.'; errS2.style.display = 'block'; }
    _setFieldErr('uSenha');
    return;
  }
  var users = lsArr('users');
  if (!editId) {
    if (users.find(function (u) { return u.email === email; })) {
      var errE = document.getElementById('uEmailErr');
      if (errE) { errE.textContent = 'Este e-mail já está cadastrado.'; errE.style.display = 'block'; }
      _setFieldErr('uEmail');
      return;
    }
  }
  var perms = getPermGridValues();
  if (editId) {
    var existing = fromCache('users') || [];
    var found = existing.find(function (u) { return u.id === editId; });
    var updated = Object.assign({}, found, { nome: nome, email: email, perfil: perfil, perms: perms });
    if (senha) updated.senha = senha;
    dbSaveUser(updated, true).then(function () {
      clearCache('users');
      closeModal('modalUsuario');
      toast('Usuário ' + nome + ' updated!', 'ok');
      pgUsuarios();
    });
  } else {
    var obj = { id: uid(), nome: nome, email: email, senha: senha, perfil: perfil, perms: perms, ativo: true, criado_em: new Date().toISOString() };
    if (sb) {
      sb.auth.signUp({ email: email, password: senha }).then(function (r) {
        if (r.error) {
          console.warn('Auth signUp aviso:', r.error.message);
          toast('Aviso ao criar no Auth: ' + r.error.message, 'yw');
        }
        obj.auth_id = r.data && r.data.user ? r.data.user.id : null;
        dbSaveUser(obj, false).then(function () {
          clearCache('users');
          closeModal('modalUsuario');
          toast('Usuário ' + nome + ' criado com sucesso!', 'ok');
          pgUsuarios();
        });
      }).catch(function (e) {
        console.error('Erro ao criar usuário:', e);
        dbSaveUser(obj, false).then(function () {
          clearCache('users');
          closeModal('modalUsuario');
          toast('Usuário ' + nome + ' salvo localmente.', 'yw');
          pgUsuarios();
        });
      });
    } else {
      dbSaveUser(obj, false).then(function () {
        clearCache('users');
        closeModal('modalUsuario');
        toast('Usuário ' + nome + ' criado!', 'ok');
        pgUsuarios();
      });
    }
  }
}

// ══════════════════════════════════════════════════════════
//  CONFIRMAÇÃO PÓS-SERVIÇO + PDF INDIVIDUAL PROFISSIONAL
// ══════════════════════════════════════════════════════════

var _lastSavedServico = null;
var _lastSavedCliente = null;
var _lastSavedOrcNum = null;

function abrirConfirmServico(servico, cliente, orcNum) {
  _lastSavedServico = servico;
  _lastSavedCliente = cliente;
  _lastSavedOrcNum = orcNum;

  var desc = '';
  if (servico.tipo === 'manipulacao') desc = servico.formula || '—';
  else if (servico.tipo === 'exame') desc = servico.tipoExame || '—';
  else desc = servico.produtoDesc || '—';

  var html =
    '<div style="background:linear-gradient(135deg,var(--blue-l),rgba(0,48,135,.04));border:1px solid rgba(0,48,135,.15);border-radius:var(--rl);padding:1.5rem;margin-bottom:1rem">' +
    '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1rem">' +
    '<div>' +
    '<div style="font-size:.72rem;color:var(--tx3);font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.25rem">Orçamento gerado</div>' +
    '<div style="font-family:\'Playfair Display\',serif;font-size:2.2rem;font-weight:800;color:var(--blue);line-height:1">#' + padNum(orcNum) + '</div>' +
    '</div>' +
    '<div style="text-align:right">' +
    '<div style="font-size:.72rem;color:var(--tx3)">Data</div>' +
    '<div style="font-size:.85rem;font-weight:600">' + fmtDate(servico.data) + '</div>' +
    '</div>' +
    '</div>' +
    '<div style="height:1px;background:rgba(0,48,135,.12);margin:.875rem 0"></div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;font-size:.83rem">' +
    '<div><div style="font-size:.7rem;color:var(--tx3);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Cliente</div><div style="font-weight:600;margin-top:.15rem">' + esc(cliente ? cliente.nome : '—') + '</div></div>' +
    '<div><div style="font-size:.7rem;color:var(--tx3);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Serviço</div><div style="margin-top:.15rem">' + tipoBadge(servico.tipo) + '</div></div>' +
    '<div style="grid-column:1/-1"><div style="font-size:.7rem;color:var(--tx3);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Descrição</div><div style="font-size:.8rem;margin-top:.15rem;color:var(--tx2)">' + esc(desc.slice(0, 80)) + (desc.length > 80 ? '…' : '') + '</div></div>' +
    '<div><div style="font-size:.7rem;color:var(--tx3);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Pagamento</div><div style="margin-top:.15rem">' + pagBadge(servico.pagamento) + '</div></div>' +
    '<div><div style="font-size:.7rem;color:var(--tx3);font-weight:700;text-transform:uppercase;letter-spacing:.08em">Valor</div><div style="font-family:\'Playfair Display\',serif;font-size:1.3rem;font-weight:800;color:var(--blue);margin-top:.1rem">' + fmt(servico.valor) + '</div></div>' +
    '</div>' +
    '</div>';

  set('confirmServicoBody', html);
  openModal('modalConfirmServico');
}

function gerarPDFServicoAtual() {
  if (!_lastSavedServico) { toast('Nenhum serviço em memória.', 'er'); return; }
  gerarPDFServicoIndividual(_lastSavedServico, _lastSavedCliente, _lastSavedOrcNum);
}

function gerarPDFServicoIndividual(servico, cliente, orcNum) {
  var TIPO_LABEL = { manipulacao: 'Manipulação Farmacêutica', exame: 'Exame Laboratorial', produto: 'Produto / Venda' };
  var PAG_LABEL = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Cartão de Débito', credito: 'Cartão de Crédito', pendente: 'A receber' };
  var PAG_COLOR = { dinheiro: '#065F46', pix: '#1e40af', debito: '#374151', credito: '#92400E', pendente: '#991B1B' };
  var PAG_BG = { dinheiro: '#D1FAE5', pix: '#DBEAFE', debito: '#F3F4F6', credito: '#FEF3C7', pendente: '#FEE2E2' };

  var nomeAtendente = STATE.user ? STATE.user.nome : '—';
  var tipoLabel = TIPO_LABEL[servico.tipo] || servico.tipo;
  var pagLabel = PAG_LABEL[servico.pagamento] || servico.pagamento || '—';
  var pagColor = PAG_COLOR[servico.pagamento] || '#374151';
  var pagBg = PAG_BG[servico.pagamento] || '#F3F4F6';

  function xe(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var desc = '';
  var extraRow = '';
  if (servico.tipo === 'manipulacao') {
    desc = servico.formula || '—';
    if (servico.prazo) extraRow =
      '<tr style="background:#F8F9FF">' +
      '<td colspan="4" style="padding:9px 14px;font-size:11px;color:#555;border-bottom:1px solid #E8ECF4">' +
      '<strong style="color:#003087">⏰ Prazo de Entrega:</strong> ' + fmtDate(servico.prazo) +
      '</td>' +
      '</tr>';
  } else if (servico.tipo === 'exame') {
    desc = servico.tipoExame || '—';
  } else {
    desc = servico.produtoDesc || '—';
  }

  var dataEmissao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  var horaEmissao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  var validade = new Date(); validade.setDate(validade.getDate() + 7);
  var dataValidade = validade.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  var html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>' +
    '<title>Orçamento #' + padNum(orcNum) + ' — Farmácia Couto</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet"/>' +
    '<style>' +
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:"Source Sans 3",Arial,sans-serif;background:#F0F2F5;color:#111827;min-height:100vh;padding:32px 16px}' +
    '.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.14);overflow:hidden;position:relative}' +
    '.accent-bar{height:5px;background:linear-gradient(90deg,#001a4d 0%,#003087 45%,#C8102E 100%)}' +
    '.header{padding:28px 40px 24px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid #E8ECF4}' +
    '.brand-name{font-family:"Playfair Display",serif;font-size:24px;font-weight:900;color:#003087;letter-spacing:-.5px;line-height:1}' +
    '.brand-tag{font-size:9.5px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.14em;margin-top:3px}' +
    '.brand-contact{margin-top:10px}' +
    '.brand-contact div{font-size:10.5px;color:#6B7280;margin-top:2px}' +
    '.brand-contact strong{color:#374151;font-weight:600}' +
    '.orc-block{text-align:right}' +
    '.orc-label{font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.16em}' +
    '.orc-number{font-family:"Playfair Display",serif;font-size:36px;font-weight:900;color:#003087;line-height:1;margin:3px 0}' +
    '.orc-date{font-size:10px;color:#6B7280;margin-top:4px}' +
    '.orc-pill{display:inline-block;background:#003087;color:#fff;font-size:8.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;padding:3px 10px;border-radius:100px;margin-top:8px}' +
    '.section{padding:22px 40px}' +
    '.section-label{font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.16em;display:flex;align-items:center;gap:8px;margin-bottom:12px}' +
    '.section-label::after{content:"";flex:1;height:1px;background:#E8ECF4}' +
    '.client-card{background:#F8F9FF;border:1px solid #E8ECF4;border-radius:10px;padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}' +
    '.cf-label{font-size:9px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:.1em}' +
    '.cf-value{font-size:12px;font-weight:600;color:#111827;margin-top:3px}' +
    '.items-section{padding:0 40px 22px}' +
    'table.items{width:100%;border-collapse:separate;border-spacing:0;border-radius:10px;overflow:hidden;border:1px solid #E8ECF4}' +
    'table.items thead tr{background:linear-gradient(135deg,#002575,#003087)}' +
    'table.items thead th{padding:11px 16px;text-align:left;font-size:9.5px;font-weight:700;color:rgba(255,255,255,.9);letter-spacing:.07em;text-transform:uppercase}' +
    'table.items thead th.r{text-align:right}' +
    'table.items tbody td{padding:13px 16px;border-bottom:1px solid #EEF0F6;font-size:11.5px;vertical-align:top}' +
    'table.items tbody tr:last-child td{border-bottom:none}' +
    'table.items tbody tr:nth-child(even) td{background:#FAFBFE}' +
    '.td-desc-main{font-weight:700;color:#111827;font-size:12px}' +
    '.td-desc-sub{font-size:10px;color:#6B7280;margin-top:4px;line-height:1.6;max-width:300px}' +
    '.td-tipo{background:#EEF2FF;color:#3730A3;font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:6px;white-space:nowrap}' +
    '.r{text-align:right}' +
    '.total-section{padding:0 40px 24px}' +
    '.total-box{background:linear-gradient(135deg,#002575 0%,#003087 55%,#001a4d 100%);border-radius:12px;padding:20px 28px;display:flex;align-items:center;justify-content:space-between}' +
    '.total-lbl{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6)}' +
    '.total-val{font-family:"Playfair Display",serif;font-size:32px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-top:3px}' +
    '.pag-lbl{font-size:8.5px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.1em;text-align:right}' +
    '.pag-chip{display:inline-flex;align-items:center;gap:4px;padding:5px 13px;border-radius:100px;font-size:10.5px;font-weight:700;margin-top:6px}' +
    '.footer{padding:20px 40px;border-top:1px solid #E8ECF4;display:flex;align-items:flex-end;justify-content:space-between}' +
    '.validity{font-size:10px;color:#9CA3AF;line-height:1.7}' +
    '.validity strong{color:#374151}' +
    '.sig-block{text-align:center}' +
    '.sig-line{width:152px;height:1px;background:#D1D5DB;margin:0 auto 6px}' +
    '.sig-name{font-size:10px;color:#374151;font-weight:700}' +
    '.sig-role{font-size:8.5px;color:#9CA3AF;margin-top:1px}' +
    '.footer-right{text-align:right;font-size:9px;color:#D1D5DB}' +
    '@media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0;width:100%;min-height:auto}.no-print{display:none!important}}' +
    '@page{margin:0;size:A4}' +
    '</style></head><body>' +

    // Botões no-print
    '<div class="no-print" style="position:fixed;top:20px;right:20px;z-index:999;display:flex;gap:8px">' +
    '<button onclick="window.print()" style="background:#003087;color:#fff;border:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:\'Source Sans 3\',sans-serif;box-shadow:0 4px 16px rgba(0,48,135,.4);letter-spacing:.02em">📥 Salvar PDF</button>' +
    '<button onclick="window.close()" style="background:#fff;color:#374151;border:1px solid #E5E7EB;padding:11px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:\'Source Sans 3\',sans-serif">✕ Fechar</button>' +
    '</div>' +

    '<div class="page">' +
    '<div class="accent-bar"></div>' +

    // Header
    '<div class="header">' +
    '<div>' +
    '<div class="brand-name">Farmácia Couto</div>' +
    '<div class="brand-tag">Saúde &amp; Bem-estar</div>' +
    '<div class="brand-contact">' +
    '<div>📞 <strong>(75) 99115-4571</strong></div>' +
    '<div>📸 <strong>@farmaciacouto</strong></div>' +
    '</div>' +
    '</div>' +
    '<div class="orc-block">' +
    '<div class="orc-label">Orçamento</div>' +
    '<div class="orc-number">#' + padNum(orcNum) + '</div>' +
    '<div class="orc-date">' + xe(dataEmissao) + ' · ' + horaEmissao + '</div>' +
    '<div class="orc-pill">Emitido</div>' +
    '</div>' +
    '</div>' +

    // Cliente
    '<div class="section">' +
    '<div class="section-label">Dados do Cliente</div>' +
    '<div class="client-card">' +
    '<div><div class="cf-label">Nome</div><div class="cf-value">' + xe(cliente ? cliente.nome : '—') + '</div></div>' +
    '<div><div class="cf-label">WhatsApp</div><div class="cf-value">' + xe(cliente && cliente.tel ? cliente.tel : '—') + '</div></div>' +
    (cliente && cliente.endereco ? '<div style="grid-column:1/-1"><div class="cf-label">Endereço</div><div class="cf-value">' + xe(cliente.endereco) + '</div></div>' : '') +
    '<div><div class="cf-label">Atendente</div><div class="cf-value">' + xe(nomeAtendente) + '</div></div>' +
    '<div><div class="cf-label">Data do Serviço</div><div class="cf-value">' + fmtDate(servico.data) + '</div></div>' +
    '</div>' +
    '</div>' +

    // Itens
    '<div class="items-section">' +
    '<div class="section-label" style="margin-bottom:12px">Itens do Orçamento</div>' +
    '<table class="items">' +
    '<thead><tr>' +
    '<th style="width:44px">#</th>' +
    '<th>Descrição</th>' +
    '<th style="width:130px">Tipo</th>' +
    '<th class="r" style="width:120px">Valor</th>' +
    '</tr></thead>' +
    '<tbody>' +
    '<tr>' +
    '<td style="font-weight:800;color:#003087;font-size:12px">01</td>' +
    '<td><div class="td-desc-main">' + xe(tipoLabel) + '</div><div class="td-desc-sub">' + xe(desc) + '</div></td>' +
    '<td><span class="td-tipo">' + xe(tipoLabel) + '</span></td>' +
    '<td class="r" style="font-weight:800;font-size:13px;color:#111827">' + fmt(servico.valor) + '</td>' +
    '</tr>' +
    extraRow +
    (servico.obs ?
      '<tr style="background:#FFFBEB"><td></td><td colspan="3" style="font-size:10.5px;color:#78350F;padding:9px 16px">' +
      '<strong>📝 Observações:</strong> ' + xe(servico.obs) +
      '</td></tr>' : '') +
    '</tbody>' +
    '</table>' +
    '</div>' +

    // Total
    '<div class="total-section">' +
    '<div class="total-box">' +
    '<div>' +
    '<div class="total-lbl">Total do Orçamento</div>' +
    '<div class="total-val">' + fmt(servico.valor) + '</div>' +
    '</div>' +
    '<div style="text-align:right">' +
    '<div class="pag-lbl">Forma de Pagamento</div>' +
    '<div class="pag-chip" style="background:' + xe(pagBg) + ';color:' + xe(pagColor) + '">' + xe(pagLabel) + '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +

    // Footer
    '<div class="footer">' +
    '<div class="validity">' +
    'Válido até <strong>' + xe(dataValidade) + '</strong><br>' +
    'Farmácia Couto · (75) 99115-4571 · @farmaciacouto' +
    '</div>' +
    '<div class="sig-block">' +
    '<div class="sig-line"></div>' +
    '<div class="sig-name">' + xe(nomeAtendente) + '</div>' +
    '<div class="sig-role">Atendente Responsável</div>' +
    '</div>' +
    '<div class="footer-right">Orçamento #' + padNum(orcNum) + '<br>' + xe(dataEmissao) + '</div>' +
    '</div>' +

    '</div>' +
    '</body></html>';

  var win = window.open('', '_blank', 'width=920,height=760');
  if (!win) { toast('Permita pop-ups para gerar o PDF.', 'yw'); return; }
  win.document.write(html);
  win.document.close();
  toast('PDF aberto! Clique em "Salvar PDF" na janela.', 'ok');
}

// ══════════════════════════════════════════════════════════
//  HELPERS & UTILS
// ══════════════════════════════════════════════════════════
function lsArr(k) { try { return JSON.parse(localStorage.getItem(getStorageKey(k)) || '[]'); } catch (e) { return []; } }
function lsSet(key, value) { localStorage.setItem(getStorageKey(key), JSON.stringify(value)); }

function openTopAction() {
  if (STATE.page === 'clientes') openModalCliente();
  if (STATE.page === 'manipulacao' || STATE.page === 'exames') openModalServico();
  if (STATE.page === 'usuarios') openModalUsuario();
}

function getServicoDesc(s) {
  if (s.tipo === 'manipulacao') return (s.formula || 'Manipulação').slice(0, 40) + (s.formula && s.formula.length > 40 ? '…' : '');
  if (s.tipo === 'exame') return s.tipoExame || 'Exame';
  return s.produtoDesc || 'Produto';
}

function set(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function padNum(n) { return String(n || 0).padStart(4, '0'); }
function fmt(v) { return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function fmtDate(d) {
  if (!d) return '—';
  try { var dt = new Date(d + 'T12:00:00'); return dt.toLocaleDateString('pt-BR'); } catch (e) { return d; }
}

function tipoBadge(t) {
  var map = { manipulacao: '<span class="badge badge-purple">⚗️ Manipulação</span>', exame: '<span class="badge badge-blue">🔬 Exame</span>', produto: '<span class="badge badge-green">💊 Produto</span>' };
  return map[t] || '<span class="badge badge-gray">' + esc(t) + '</span>';
}
function pagBadge(p) {
  var map = { dinheiro: '<span class="badge badge-green">💵 Dinheiro</span>', pix: '<span class="badge badge-blue">📲 Pix</span>', debito: '<span class="badge badge-gray">💳 Débito</span>', credito: '<span class="badge badge-yellow">💳 Crédito</span>', pendente: '<span class="badge badge-red">⏳ A receber</span>' };
  return map[p] || '<span class="badge badge-gray">' + esc(p || '—') + '</span>';
}

function openModal(id) { document.getElementById(id).classList.remove('h'); }
function closeModal(id) { document.getElementById(id).classList.add('h'); }

function toast(msg, type) {
  var icons = { ok: '✅', er: '❌', yw: '⚠️' };
  var box = document.getElementById('toasts');
  var el = document.createElement('div');
  el.className = 'toast t-' + (type || 'ok');
  el.innerHTML = '<span>' + (icons[type] || 'ℹ️') + '</span> ' + msg;
  box.appendChild(el);
  setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 300); }, 4000);
}

function mPhone(el) {
  var v = el.value.replace(/\D/g, '');
  v = v.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  el.value = v;
}

function startClock() {
  function tick() {
    var now = new Date();
    var el = document.getElementById('clock');
    if (el) el.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' · ' + now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  }
  tick(); setInterval(tick, 1000);
}

// ══════════════════════════════════════════════════════════
//  MIGRAÇÕES E BOOTSTRAP
// ══════════════════════════════════════════════════════════
function migrateOldKeys() {
  try {
    if (localStorage.getItem('fc_clientes') && !localStorage.getItem('fc_local_clientes')) {
      localStorage.setItem('fc_local_clientes', localStorage.getItem('fc_clientes'));
    }
    if (localStorage.getItem('fc_servicos') && !localStorage.getItem('fc_local_servicos')) {
      localStorage.setItem('fc_local_servicos', localStorage.getItem('fc_servicos'));
    }
  } catch (e) { console.error('Migration error:', e); }
}

document.addEventListener('DOMContentLoaded', function () {
  migrateOldKeys();
  try {
    var users = JSON.parse(localStorage.getItem('fc_users') || '[]');
    var changed = false;
    users = users.map(function (u) {
      if (u.perms && u.perms.dashboard === undefined) {
        u.perms = normalisePerms(u.perms, u.perfil);
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
  seedAdmin();
  if (!restoreSession()) {
    document.getElementById('loginPage').style.display = 'flex';
  }
  document.querySelectorAll('.modal-bg').forEach(function (bg) {
    bg.addEventListener('click', function (e) { if (e.target === bg) bg.classList.add('h'); });
  });
});
