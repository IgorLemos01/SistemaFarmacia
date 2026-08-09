// ══════════════════════════════════════════════════════════
//  ABA: CLIENTES — pages/clientes.js
// ══════════════════════════════════════════════════════════

export function pgClientes() {
  if (!window.canView('clientes')) {
    window.set('content', '<div class="alert alert-red">⛔ Você não tem permissão para acessar esta área.</div>');
    return;
  }
  var btn = document.getElementById('topActionBtn');
  if (window.canEdit('clientes')) { btn.style.display = ''; btn.textContent = '＋ Novo Cliente'; }
  window.set('content',
    '<div class="card">' +
    '<div class="card-head">' +
    '<div class="search-bar"><span class="ico">🔍</span><input placeholder="Buscar por nome, telefone, e-mail..." oninput="filterClientes(this.value)" id="clienteFilter"/></div>' +
    (window.canEdit('clientes') ? '<button class="btn btn-primary" onclick="openModalCliente()">＋ Novo Cliente</button>' : '') +
    '</div>' +
    '<div id="clientesTable"><div class="empty"><span class="empty-ico">⏳</span><p class="empty-txt">Carregando...</p></div></div>' +
    '</div>'
  );
  Promise.all([window.dbGetClientes(), window.dbGetServicos()]).then(function (r) {
    window.set('clientesTable', renderClientesTable(r[0], r[1], ''));
  });
}

export function filterClientes(q) {
  Promise.all([window.dbGetClientes(), window.dbGetServicos()]).then(function (r) {
    window.set('clientesTable', renderClientesTable(r[0], r[1], q));
  });
}

export function renderClientesTable(clientes, servicos, q) {
  var list = q ? clientes.filter(function (c) {
    var haystack = (c.nome + (c.cpf || '') + (c.tel || '') + (c.email || '') + (c.id || '')).toLowerCase();
    return haystack.includes(q.toLowerCase());
  }) : clientes;

  list = list.slice().sort(function (a, b) {
    var srvA = servicos.filter(function (s) { return s.clienteId === a.id; });
    var srvB = servicos.filter(function (s) { return s.clienteId === b.id; });
    var lastA = srvA.length ? Math.max.apply(null, srvA.map(function (s) { return s.orcNum || 0; })) : -1;
    var lastB = srvB.length ? Math.max.apply(null, srvB.map(function (s) { return s.orcNum || 0; })) : -1;
    return lastB - lastA;
  });

  if (!list.length) return '<div class="empty"><span class="empty-ico">👥</span><p class="empty-txt">' + (q ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado') + '</p>' + (q ? '' : (window.canEdit('clientes') ? '<p class="empty-sub">Clique em "+ Novo Cliente" para começar</p><button class="btn btn-primary" style="margin-top:1rem" onclick="openModalCliente()">＋ Novo Cliente</button>' : '<p class="empty-sub">Nenhum cliente cadastrado ainda</p>')) + '</div>';
  return '<div class="table-wrap"><table><thead><tr><th>#</th><th>Nome</th><th>WhatsApp</th><th>Atendimentos</th><th>Último atend.</th><th>Ações</th></tr></thead><tbody>' +
    list.map(function (c, i) {
      var srvCliente = servicos.filter(function (s) { return s.clienteId === c.id; });
      var total = srvCliente.length;
      var lastSrv = srvCliente.slice().sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); })[0];
      var lastDate = lastSrv ? window.fmtDate(lastSrv.data) : '<span class="td-muted">—</span>';
      return '<tr><td class="td-muted">' + (i + 1) + '</td><td class="td-name">' + window.esc(c.nome) + '</td><td>' + window.esc(c.tel || '—') + '</td><td><span class="badge badge-blue">' + total + ' atend.</span></td><td class="td-muted">' + lastDate + '</td><td style="display:flex;gap:.4rem"><button class="btn btn-sm btn-ghost" onclick="verCliente(\'' + c.id + '\')">👁 Ver</button>' + (window.canEdit('manipulacao') || window.canEdit('exames') ? '<button class="btn btn-sm btn-primary" onclick="openModalServico(\'' + c.id + '\')">＋ Serviço</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

export function verCliente(id) {
  Promise.all([window.dbGetClientes(), window.dbGetServicos()]).then(function (r) {
    var clientes = r[0], allServicos = r[1];
    var c = clientes.find(function (x) { return x.id === id; });
    if (!c) return;
    var servicos = allServicos.filter(function (s) { return s.clienteId === id; });
    var receita = servicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    document.getElementById('mdcNome').textContent = c.nome;
    document.getElementById('mdcSub').textContent = 'Tel: ' + (c.tel || '—');
    var alergiasVal = c.alergiasCliente || c.alergias_cliente || '';
    var medicoVal = c.medicoReferencia || c.medico_referencia || '';
    window.set('mdcBody',
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;margin-bottom:1.25rem">' +
      '<div style="background:var(--blue-l);border-radius:var(--r);padding:.875rem;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--blue)">' + servicos.length + '</div><div style="font-size:.75rem;color:var(--tx3)">Atendimentos</div></div>' +
      '<div style="background:var(--green-l);border-radius:var(--r);padding:.875rem;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--green)">' + window.fmt(receita) + '</div><div style="font-size:.75rem;color:var(--tx3)">Total gasto</div></div>' +
      '<div style="background:var(--yellow-l);border-radius:var(--r);padding:.875rem;text-align:center"><div style="font-size:1.4rem;font-weight:700;color:var(--yellow)">' + servicos.filter(function (s) { return s.tipo === 'manipulacao'; }).length + '</div><div style="font-size:.75rem;color:var(--tx3)">Manipulações</div></div>' +
      '</div>' +
      '<div class="divider"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.875rem"><div style="font-size:.85rem;font-weight:600">Dados Cadastrais</div>' + (window.canEdit('clientes') ? '<button class="btn btn-sm btn-ghost" onclick="closeModal(\'modalDetalheCliente\');openModalCliente(\'' + c.id + '\')">✏️ Editar</button>' : '') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin-bottom:1.25rem;font-size:.83rem">' +
      (c.cpf ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">CPF: </span><strong>' + window.esc(c.cpf) + '</strong></div>' : '') +
      '<div><span style="color:var(--tx3)">Endereço: </span>' + window.esc(c.endereco || '—') + '</div>' +
      '<div><span style="color:var(--tx3)">E-mail: </span>' + window.esc(c.email || '—') + '</div>' +
      '<div><span style="color:var(--tx3)">Nascimento: </span>' + (c.nasc ? window.fmtDate(c.nasc) : '—') + '</div>' +
      '<div><span style="color:var(--tx3)">Sexo: </span>' + window.esc(c.sexo || '—') + '</div>' +
      (medicoVal ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Médico de referência: </span>' + window.esc(medicoVal) + '</div>' : '') +
      '</div>' +
      (alergiasVal ? '<div class="alert alert-yellow" style="margin-bottom:.75rem">⚠️ <div><strong>Alergias:</strong> ' + window.esc(alergiasVal) + '</div></div>' : '') +
      (c.obs ? '<div style="background:var(--yellow-l);border-radius:var(--r);padding:.75rem;font-size:.8rem;margin-bottom:1.25rem"><strong>Obs:</strong> ' + window.esc(c.obs) + '</div>' : '') +
      '<div class="divider"></div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem"><div style="font-size:.85rem;font-weight:600">Histórico de Serviços</div></div>' +
      '<div class="tabs" style="margin-bottom:1rem" id="tlTabs"><button class="tab active" onclick="filtrarTL(\'todos\',\'' + c.id + '\')">Todos</button><button class="tab" onclick="filtrarTL(\'manipulacao\',\'' + c.id + '\')">Manipulação</button><button class="tab" onclick="filtrarTL(\'exame\',\'' + c.id + '\')">Exames</button><button class="tab" onclick="filtrarTL(\'outro\',\'' + c.id + '\')">Outros</button></div>' +
      '<div id="tlBody">' + renderTimeline(servicos, 'todos') + '</div>'
    );
    window.openModal('modalDetalheCliente');
  });
}

export function renderTimeline(servicos, filtro) {
  var list = filtro === 'todos' ? servicos :
    filtro === 'outro' ? servicos.filter(function (s) { return s.tipo !== 'manipulacao' && s.tipo !== 'exame'; }) :
      servicos.filter(function (s) { return s.tipo === filtro; });
  list = list.slice().sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); });
  if (!list.length) return '<div class="empty" style="padding:1.5rem"><span class="empty-ico">📋</span><p class="empty-txt">Nenhum serviço nesta categoria</p></div>';
  return '<div class="timeline">' + list.map(function (s) {
    var canEditSrv = window.canEdit('manipulacao') || window.canEdit('exames');
    var tipoModal = s.tipo === 'manipulacao' ? 'verManipulacao' : s.tipo === 'exame' ? 'verExame' : 'verOrcamento';
    return '<div class="tl-item" style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem">'
      + '<div style="display:flex;align-items:flex-start;gap:.5rem;flex:1;min-width:0">'
      + '<div class="tl-dot" style="background:' + (s.tipo === 'manipulacao' ? 'var(--purple)' : s.tipo === 'exame' ? 'var(--blue)' : 'var(--green)') + ';margin-top:.3rem;flex-shrink:0"></div>'
      + '<div style="min-width:0">'
      + '<div class="tl-title">' + window.tipoBadge(s.tipo) + ' <span style="font-weight:600">' + window.esc(window.getServicoDesc(s)) + '</span> <span class="orc-num" style="font-size:.75rem">#' + window.padNum(s.orcNum) + '</span></div>'
      + '<div class="tl-meta">' + window.fmtDate(s.data) + ' · ' + window.fmt(s.valor) + ' · ' + window.pagBadge(s.pagamento) + '</div>'
      + (s.obs ? '<div class="tl-meta" style="font-style:italic">' + window.esc(s.obs) + '</div>' : '')
      + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:.3rem;flex-shrink:0;padding-top:.1rem">'
      + '<button class="btn btn-icon btn-sm" title="Ver detalhes" onclick="' + tipoModal + '(\'' + s.id + '\')">👁</button>'
      + (canEditSrv ? '<button class="btn btn-icon btn-sm" title="Editar pedido" onclick="closeModal(\'modalDetalheCliente\');' + (s.tipo === 'exame' ? 'openModalExame' : 'openModalServico') + '(null,null,\'' + s.id + '\')">✏️</button>' : '')
      + '</div>'
      + '</div>';
  }).join('') + '</div>';
}

export function filtrarTL(filtro, clienteId) {
  document.querySelectorAll('#tlTabs .tab').forEach(function (b) { b.classList.remove('active'); });
  var idxMap = { 'todos': 0, 'manipulacao': 1, 'exame': 2, 'outro': 3 };
  var tabs = document.querySelectorAll('#tlTabs .tab');
  if (tabs[idxMap[filtro]]) tabs[idxMap[filtro]].classList.add('active');
  window.dbGetServicos().then(function (all) {
    window.set('tlBody', renderTimeline(all.filter(function (s) { return s.clienteId === clienteId; }), filtro));
  });
}

// Bind to window for global availability
window.pgClientes = pgClientes;
window.filterClientes = filterClientes;
window.renderClientesTable = renderClientesTable;
window.verCliente = verCliente;
window.renderTimeline = renderTimeline;
window.filtrarTL = filtrarTL;
