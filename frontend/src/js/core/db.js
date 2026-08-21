// ══════════════════════════════════════════════════════════
//  CAMADA DE DADOS E BANCO — core/db.js
// ══════════════════════════════════════════════════════════

export var CACHE = { clientes: null, servicos: null, users: null, lastFetch: {} };
export var CACHE_TTL = 30000;
export var FETCH_LOCK = { clientes: false, servicos: false, users: false };

export function getStorageKey(key) {
  if (key === 'clientes' || key === 'servicos' || key === 'medicamentos') {
    var prefix = window.STATE.isSupabase ? 'fc_sb_' : 'fc_local_';
    return prefix + key;
  }
  return 'fc_' + key;
}

export function cacheValid(key) {
  return CACHE[key] !== null && (Date.now() - (CACHE.lastFetch[key] || 0)) < CACHE_TTL;
}

export function setCache(key, data) {
  CACHE[key] = data;
  CACHE.lastFetch[key] = Date.now();
  try { localStorage.setItem(getStorageKey(key), JSON.stringify(data)); } catch (e) { }
}

export function clearCache(key) {
  CACHE[key] = null;
  CACHE.lastFetch[key] = 0;
  try { localStorage.removeItem(getStorageKey(key)); } catch (e) { }
}

export function fromCache(key) {
  if (CACHE[key]) return CACHE[key];
  try { var v = localStorage.getItem(getStorageKey(key)); return v ? JSON.parse(v) : []; } catch (e) { return []; }
}

export function triggerUIRefresh() {
  if (!window.STATE.user) return;
  var page = window.STATE.page;
  if (window.renderPage) window.renderPage(page);
}

export async function dbGetClientes() {
  var cached = fromCache('clientes') || [];
  if (cacheValid('clientes') && cached && cached.length) {
    return cached;
  }
  if (window.sb && window.STATE.isSupabase && !FETCH_LOCK.clientes) {
    FETCH_LOCK.clientes = true;
    (async function () {
      try {
        var res = await window.withTimeout(window.sb.from('clientes').select('*').eq('ativo', true).order('nome'), 1500);
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

export async function dbSaveCliente(obj, isEdit) {
  var row = {
    id: obj.id, nome: obj.nome, cpf: obj.cpf || null, rg: obj.rg || null, nasc: obj.nasc || null,
    sexo: obj.sexo || null, tel: obj.tel || null, email: obj.email || null,
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
  if (!window.sb || !window.STATE.isSupabase) return true;
  try {
    var res = await window.withTimeout(window.sb.from('clientes').upsert([row]), 3000);
    if (res.error) throw res.error;
    clearCache('clientes');
    return true;
  } catch (e) {
    console.error('dbSaveCliente error:', e);
    window.toast('Salvo localmente. Sincronizará quando a conexão for restabelecida.', 'yw');
    return true;
  }
}

export async function dbGetServicos(filters) {
  filters = filters || {};
  var cached = fromCache('servicos') || [];
  if (window.sb && window.STATE.isSupabase && !cacheValid('servicos') && !FETCH_LOCK.servicos) {
    FETCH_LOCK.servicos = true;
    (async function () {
      try {
        var res = await window.withTimeout(window.sb.from('servicos').select('*').order('orc_num', { ascending: false }), 1500);
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

export function normaliseServico(s) {
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

export function applyFilters(list, f) {
  return list.filter(function (s) {
    if (f.de && s.data < f.de) return false;
    if (f.ate && s.data > f.ate) return false;
    if (f.tipo && s.tipo !== f.tipo) return false;
    if (f.pag && s.pagamento !== f.pag) return false;
    return true;
  });
}

export async function dbSaveServico(obj) {
  var nextNum;
  if (window.sb && window.STATE.isSupabase) {
    try {
      var r = await window.withTimeout(window.sb.rpc('next_orc_num'), 2000);
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
  if (!window.sb || !window.STATE.isSupabase) return nextNum;
  try {
    var res = await window.withTimeout(window.sb.from('servicos').insert([row]), 3000);
    if (res.error) throw res.error;
    clearCache('servicos');
    return nextNum;
  } catch (e) {
    console.error('dbSaveServico error:', e);
    window.toast('Salvo localmente. Sincronizará quando a conexão for restabelecida.', 'yw');
    return nextNum;
  }
}

export async function dbUpdateServico(id, changes) {
  var cached = fromCache('servicos') || [];
  var idx = cached.findIndex(function (x) { return x.id === id; });
  var existing = idx >= 0 ? cached[idx] : {};
  var updated = Object.assign({}, existing, changes);
  if (idx >= 0) cached[idx] = updated; else cached.unshift(updated);
  setCache('servicos', cached);
  if (!window.sb || !window.STATE.isSupabase) return updated.orcNum || existing.orcNum;
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
    var res = await window.withTimeout(window.sb.from('servicos').update(dbRow).eq('id', id), 3000);
    if (res.error) throw res.error;
    clearCache('servicos');
  } catch (e) {
    console.error('dbUpdateServico error:', e);
    window.toast('Atualizado localmente. Sincronizará quando a conexão for restabelecida.', 'yw');
  }
  return updated.orcNum || existing.orcNum;
}

export async function dbGetUsers() {
  seedAdmin();
  var cached = fromCache('users');
  if (!cached || !cached.length) {
    cached = lsArr('users') || [];
  }
  if (cacheValid('users') && cached && cached.length) {
    return cached;
  }
  if (window.sb && window.STATE.isSupabase && !FETCH_LOCK.users) {
    FETCH_LOCK.users = true;
    (async function () {
      try {
        var res = await window.withTimeout(window.sb.from('system_users').select('*').order('criado_em'), 1500);
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

export async function dbSaveUser(obj, isEdit) {
  var cleanObj = Object.assign({}, obj);
  delete cleanObj.senha;
  var local = fromCache('users') || lsArr('users');
  if (isEdit) {
    var idx = local.findIndex(function (u) { return u.id === cleanObj.id; });
    if (idx >= 0) local[idx] = Object.assign(local[idx], cleanObj); else local.push(cleanObj);
  } else { local.push(cleanObj); }
  setCache('users', local);
  localStorage.setItem('fc_users', JSON.stringify(local));
  if (window.sb && window.STATE.isSupabase) {
    var dbRow = {
      id: cleanObj.id, nome: cleanObj.nome, email: cleanObj.email,
      perfil: cleanObj.perfil, perms: cleanObj.perms, ativo: cleanObj.ativo,
      auth_id: cleanObj.auth_id || null, criado_em: cleanObj.criado_em || new Date().toISOString()
    };
    try {
      if (isEdit) { await window.withTimeout(window.sb.from('system_users').update(dbRow).eq('id', cleanObj.id), 3000); }
      else { await window.withTimeout(window.sb.from('system_users').insert([dbRow]), 3000); }
    } catch (e) { console.warn('dbSaveUser:', e.message); }
  }
}

export async function dbToggleUser(id, ativo) {
  var local = fromCache('users') || lsArr('users');
  var idx = local.findIndex(function (u) { return u.id === id; });
  if (idx >= 0) local[idx].ativo = ativo;
  setCache('users', local);
  localStorage.setItem('fc_users', JSON.stringify(local));
  if (window.sb && window.STATE.isSupabase) { try { await window.withTimeout(window.sb.from('system_users').update({ ativo: ativo }).eq('id', id), 3000); } catch (e) { } }
}

export async function dbDeleteUser(id) {
  var local = fromCache('users') || lsArr('users');
  var idx = local.findIndex(function (u) { return u.id === id; });
  if (idx >= 0) local.splice(idx, 1);
  setCache('users', local);
  if (window.sb && window.STATE.isSupabase) {
    try { await window.withTimeout(window.sb.from('system_users').delete().eq('id', id), 3000); } catch (e) { console.error(e); }
  }
}

export function seedAdmin() {
  var ADMIN_DATA = {
    id: 'admin-001', email: 'admin@farmaciacouto.com', nome: 'Administrador', perfil: 'admin',
    perms: { dashboard: 'edit', clientes: 'edit', manipulacao: 'edit', exames: 'edit', orcamentos: 'edit', usuarios: 'edit' }, ativo: true,
  };
  var users = lsArr('users');
  var idx = users.findIndex(function (u) { return u.email === 'admin@farmaciacouto.com'; });
  if (idx >= 0) {
    users[idx] = Object.assign({}, users[idx], { perfil: 'admin', perms: ADMIN_DATA.perms, ativo: true });
  } else {
    users.push(Object.assign({ criado_em: new Date().toISOString() }, ADMIN_DATA));
  }
  lsSet('users', users);
}

// Helpers locales para seedAdmin
function lsArr(k) { try { return JSON.parse(localStorage.getItem(getStorageKey(k)) || '[]'); } catch (e) { return []; } }
function lsSet(key, value) { localStorage.setItem(getStorageKey(key), JSON.stringify(value)); }

// ══════════════════════════════════════════════════════════
//  Tabela: tipos_exames (dinâmico do banco)
// ══════════════════════════════════════════════════════════

export async function dbGetTiposExames() {
  var fallback = [
    { nome: 'Glicemia em Jejum', valor: 7.00, ordem: 60 },
    { nome: 'Fezes 1 Amostra', valor: 8.00, ordem: 70 },
    { nome: 'Ácido Úrico', valor: 9.00, ordem: 80 },
    { nome: 'Sumário de Urina', valor: 9.00, ordem: 81 },
    { nome: 'Cálcio (Ca)', valor: 11.00, ordem: 100 },
    { nome: 'Fosfatase Alcalina', valor: 11.00, ordem: 101 },
    { nome: 'Grupo Sanguíneo', valor: 11.00, ordem: 102 },
    { nome: 'T3', valor: 11.00, ordem: 103 },
    { nome: 'Hemograma Completo', valor: 13.00, ordem: 120 },
    { nome: 'T4', valor: 13.00, ordem: 121 },
    { nome: 'TSH', valor: 13.00, ordem: 122 },
    { nome: 'Fezes 2 Amostras', valor: 15.00, ordem: 140 },
    { nome: 'TGO e TGP', valor: 15.00, ordem: 141 },
    { nome: 'Ureia e Creatinina', valor: 15.00, ordem: 142 },
    { nome: 'Bilirrubina Total e Frações', valor: 16.00, ordem: 150 },
    { nome: 'Teste de Gravidez', valor: 16.00, ordem: 151 },
    { nome: 'Ferritina', valor: 22.00, ordem: 200 },
    { nome: 'Ferro (Fe)', valor: 22.00, ordem: 201 },
    { nome: 'Fezes 3 Amostras', valor: 22.00, ordem: 202 },
    { nome: 'Colesterol Total e Frações (HDL, LDL, VLDL)', valor: 27.00, ordem: 250 },
    { nome: 'Hemoglobina Glicada', valor: 27.00, ordem: 251 },
    { nome: 'PSA', valor: 27.00, ordem: 252 },
    { nome: 'PSA Total e Livre', valor: 27.00, ordem: 253 },
    { nome: 'Triglicerídeos', valor: 27.00, ordem: 254 },
    { nome: 'VDRL', valor: 27.00, ordem: 255 },
    { nome: 'Hepatite C', valor: 32.00, ordem: 300 },
    { nome: 'HIV 1 e 2', valor: 32.00, ordem: 301 },
    { nome: 'Sífilis', valor: 32.00, ordem: 302 },
    { nome: 'Vitamina D 25-OH', valor: 32.00, ordem: 303 },
    { nome: 'Curva de Glicemia', valor: 43.00, ordem: 400 },
    { nome: 'Lactose', valor: 43.00, ordem: 401 },
    { nome: 'Urocultura', valor: 43.00, ordem: 402 },
    { nome: 'TOTG', valor: 53.00, ordem: 500 },
    { nome: 'Hepatite B', valor: 42.00, ordem: 390 },
    { nome: 'Potássio (K)', valor: 208.00, ordem: 1970 },
    { nome: 'Magnésio (Mg)', valor: 133.00, ordem: 1260 },
    { nome: 'Sódio (Na)', valor: 8.00, ordem: 70 },
    { nome: 'Vitamina A', valor: 31.00, ordem: 290 },
    { nome: 'Vitamina B12', valor: 38.00, ordem: 360 },
    { nome: 'Vitamina C', valor: 6.00, ordem: 50 },
    { nome: 'Anti-Fireglobulina', valor: 61.00, ordem: 570 },
    { nome: 'Anti-TPO', valor: 201.00, ordem: 190 },
    { nome: 'ASLO', valor: 11.00, ordem: 100 },
    { nome: 'C3', valor: 40.00, ordem: 370 },
    { nome: 'C4', valor: 40.00, ordem: 371 },
    { nome: 'CH50', valor: 98.00, ordem: 920 },
    { nome: 'IgE para Ácaros (B.tropicalis, D.pteronyssinus, D.farinae e Pó caseiro)', valor: 32.00, ordem: 300 },
    { nome: 'IgE para Alfa, Beta Lactoglobulina', valor: 45.00, ordem: 420 },
    { nome: 'IgE para Barata', valor: 45.00, ordem: 421 },
    { nome: 'IgE para Blomia Tropicalis', valor: 45.00, ordem: 422 },
    { nome: 'IgE para Caseína', valor: 32.00, ordem: 300 },
    { nome: 'IgE para Castanha', valor: 45.00, ordem: 423 },
    { nome: 'IgE para Clara do Ovo', valor: 45.00, ordem: 424 },
    { nome: 'IgE para Fungos (P.nottum, C.herbarum, D.alternata e As.Fumugatus)', valor: 32.00, ordem: 300 },
    { nome: 'IgE para Gema do Ovo', valor: 65.00, ordem: 610 },
    { nome: 'IgE para Glúten', valor: 32.00, ordem: 300 },
    { nome: 'IgE para Leite de Vaca', valor: 32.00, ordem: 300 },
    { nome: 'IgE para Marisco/Frutos do Mar', valor: 32.00, ordem: 300 },
    { nome: 'IgE para Peixe (Tilápia/Merluza)', valor: 32.00, ordem: 300 },
    { nome: 'IgE para Pelo de Cão e Gato', valor: 45.00, ordem: 425 },
    { nome: 'IgE para Pólen de Gramíneas', valor: 32.00, ordem: 300 },
    { nome: 'IgE para Trigo', valor: 32.00, ordem: 300 },
    { nome: 'IgE Sérico', valor: 27.00, ordem: 250 },
    { nome: 'IgG Total', valor: 31.00, ordem: 290 },
    { nome: 'IgG Subclasses', valor: 930.00, ordem: 8810 },
    { nome: 'Sangue Oculto nas Fezes', valor: 40.00, ordem: 370 },
    { nome: 'Zinco', valor: 32.00, ordem: 300 },
    { nome: 'Lactose (sem o líquido)', valor: 138.00, ordem: 1300 },
    { nome: 'Sexagem Fetal', valor: 211.00, ordem: 2000 },
    { nome: 'DNA (Jorro)', valor: 475.00, ordem: 4500 }
  ];

  // Executa migração se a versão de preços for antiga
  if (localStorage.getItem('fc_exames_version_v2') !== '5') {
    try {
      var atual = fromCache('tipos_exames') || [];
      if (window.sb && window.STATE.isSupabase) {
        var res = await window.withTimeout(window.sb.from('tipos_exames').select('*').eq('ativo', true), 3000);
        if (!res.error && res.data) {
          atual = res.data;
        }
      }
      for (var i = 0; i < fallback.length; i++) {
        var fItem = fallback[i];
        var match = atual.find(function (x) { return x.nome.toLowerCase() === fItem.nome.toLowerCase(); });
        if (match) {
          if (parseFloat(match.valor) !== fItem.valor) {
            match.valor = fItem.valor;
            await dbSaveTipoExame(match);
          }
        } else {
          await dbSaveTipoExame(fItem);
        }
      }
      localStorage.setItem('fc_exames_version_v2', '5');
    } catch (e) {
      console.warn('Erro na migração de tipos de exames:', e);
    }
  }

  var cached = fromCache('tipos_exames') || [];
  if (window.sb && window.STATE.isSupabase) {
    try {
      var res = await window.withTimeout(window.sb.from('tipos_exames').select('*').eq('ativo', true).order('ordem'), 3000);
      if (!res.error && res.data) {
        setCache('tipos_exames', res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Erro ao buscar tipos de exames:', e);
    }
  }

  if (!cached.length) {
    setCache('tipos_exames', fallback);
    return fallback;
  }
  return cached;
}

export async function dbSaveTipoExame(obj) {
  var row = { nome: obj.nome, valor: parseFloat(obj.valor) || 0, ordem: parseInt(obj.ordem) || 0, ativo: true };
  if (obj.id) row.id = obj.id;
  if (window.sb && window.STATE.isSupabase) {
    try {
      var res = await window.withTimeout(window.sb.from('tipos_exames').upsert([row]), 3000);
      if (res.error) throw res.error;
    } catch(e) { console.error('Erro ao salvar tipo de exame:', e); }
  }
  // Atualiza cache local
  var cached = fromCache('tipos_exames') || [];
  if (obj.id) {
    var idx = cached.findIndex(function (x) { return x.id === obj.id; });
    if (idx >= 0) cached[idx] = Object.assign(cached[idx], row);
  } else {
    row.id = window.uid();
    cached.push(row);
  }
  setCache('tipos_exames', cached);
}

export async function dbToggleTipoExame(id, ativo) {
  if (window.sb && window.STATE.isSupabase) {
    try {
      await window.withTimeout(window.sb.from('tipos_exames').update({ ativo: ativo }).eq('id', id), 3000);
    } catch(e) { console.error(e); }
  }
  var cached = fromCache('tipos_exames') || [];
  var idx = cached.findIndex(function (x) { return x.id === id; });
  if (idx >= 0) cached[idx].ativo = ativo;
  setCache('tipos_exames', cached);
}

export async function dbDeleteTipoExame(id) {
  if (window.sb && window.STATE.isSupabase) {
    try {
      await window.withTimeout(window.sb.from('tipos_exames').delete().eq('id', id), 3000);
    } catch(e) { console.error(e); }
  }
  var cached = fromCache('tipos_exames') || [];
  var idx = cached.findIndex(function (x) { return x.id === id; });
  if (idx >= 0) cached.splice(idx, 1);
  setCache('tipos_exames', cached);
}

// ══════════════════════════════════════════════════════════
//  MEDICAMENTOS — catálogo persistente
// ══════════════════════════════════════════════════════════

export async function dbGetMedicamentos() {
  var cached = fromCache('medicamentos') || [];

  if (window.sb && window.STATE.isSupabase) {
    try {
      var res = await window.withTimeout(
        window.sb.from('medicamentos').select('*').order('nome'), 3000
      );
      if (!res.error && res.data) {
        var normed = res.data.map(function (r) {
          return {
            id: r.id, nome: r.nome || '', rms: r.rms || '',
            laboratorio: r.laboratorio || '', dose: r.dose || '',
            posologia: r.posologia || ''
          };
        });
        setCache('medicamentos', normed);
        return normed;
      }
    } catch (e) { console.warn('dbGetMedicamentos supabase error:', e); }
  }

  return cached;
}

export async function dbSaveMedicamento(obj) {
  var row = {
    id: obj.id || window.uid(),
    nome: obj.nome || '',
    rms: obj.rms || null,
    laboratorio: obj.laboratorio || null,
    dose: obj.dose || null,
    posologia: obj.posologia || null,
  };
  var cached = fromCache('medicamentos') || [];
  var idx = cached.findIndex(function (x) { return x.id === row.id; });
  if (idx >= 0) cached[idx] = row; else cached.push(row);
  cached.sort(function (a, b) { return (a.nome || '').localeCompare(b.nome || ''); });
  setCache('medicamentos', cached);
  try { localStorage.setItem('fc_medicamentos', JSON.stringify(cached)); } catch (e) {}

  if (window.sb && window.STATE.isSupabase) {
    try {
      var res = await window.withTimeout(
        window.sb.from('medicamentos').upsert([{
          id: row.id, nome: row.nome, rms: row.rms,
          laboratorio: row.laboratorio, dose: row.dose, posologia: row.posologia
        }]), 3000
      );
      if (res.error) throw res.error;
      clearCache('medicamentos');
    } catch (e) {
      console.error('dbSaveMedicamento error:', e);
      window.toast('Salvo localmente. Sincroniza quando reconectar.', 'yw');
    }
  }
  return row.id;
}

export async function dbUpdateMedicamento(id, changes) {
  var cached = fromCache('medicamentos') || [];
  var idx = cached.findIndex(function (x) { return x.id === id; });
  if (idx >= 0) cached[idx] = Object.assign({}, cached[idx], changes);
  cached.sort(function (a, b) { return (a.nome || '').localeCompare(b.nome || ''); });
  setCache('medicamentos', cached);
  try { localStorage.setItem('fc_medicamentos', JSON.stringify(cached)); } catch (e) {}

  if (window.sb && window.STATE.isSupabase) {
    try {
      var dbRow = {
        nome: changes.nome, rms: changes.rms || null,
        laboratorio: changes.laboratorio || null,
        dose: changes.dose || null, posologia: changes.posologia || null
      };
      var res = await window.withTimeout(
        window.sb.from('medicamentos').update(dbRow).eq('id', id), 3000
      );
      if (res.error) throw res.error;
      clearCache('medicamentos');
    } catch (e) {
      console.error('dbUpdateMedicamento error:', e);
      window.toast('Atualizado localmente. Sincroniza quando reconectar.', 'yw');
    }
  }
}

export async function dbDeleteMedicamento(id) {
  var cached = fromCache('medicamentos') || [];
  var idx = cached.findIndex(function (x) { return x.id === id; });
  if (idx >= 0) cached.splice(idx, 1);
  setCache('medicamentos', cached);
  try { localStorage.setItem('fc_medicamentos', JSON.stringify(cached)); } catch (e) {}

  if (window.sb && window.STATE.isSupabase) {
    try {
      await window.withTimeout(
        window.sb.from('medicamentos').delete().eq('id', id), 3000
      );
    } catch (e) { console.error('dbDeleteMedicamento error:', e); }
  }
}

// Bind to window for global availability
window.CACHE = CACHE;
window.CACHE_TTL = CACHE_TTL;
window.FETCH_LOCK = FETCH_LOCK;
window.getStorageKey = getStorageKey;
window.cacheValid = cacheValid;
window.setCache = setCache;
window.clearCache = clearCache;
window.fromCache = fromCache;
window.triggerUIRefresh = triggerUIRefresh;
window.dbGetClientes = dbGetClientes;
window.dbSaveCliente = dbSaveCliente;
window.dbGetServicos = dbGetServicos;
window.dbSaveServico = dbSaveServico;
window.dbUpdateServico = dbUpdateServico;
window.dbGetUsers = dbGetUsers;
window.dbSaveUser = dbSaveUser;
window.dbToggleUser = dbToggleUser;
window.dbDeleteUser = dbDeleteUser;
window.seedAdmin = seedAdmin;
window.normaliseServico = normaliseServico;
window.applyFilters = applyFilters;
window.dbGetTiposExames = dbGetTiposExames;
window.dbSaveTipoExame = dbSaveTipoExame;
window.dbToggleTipoExame = dbToggleTipoExame;
window.dbDeleteTipoExame = dbDeleteTipoExame;
window.dbGetMedicamentos = dbGetMedicamentos;
window.dbSaveMedicamento = dbSaveMedicamento;
window.dbUpdateMedicamento = dbUpdateMedicamento;
window.dbDeleteMedicamento = dbDeleteMedicamento;


