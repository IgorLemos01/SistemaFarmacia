// ══════════════════════════════════════════════════════════
//  ABA: MANIPULAÇÃO — pages/manipulacao.js
// ══════════════════════════════════════════════════════════

export function pgManipulacao() {
  if (!window.canView('manipulacao')) {
    window.set('content', '<div class="alert alert-red">⛔ Você não tem permissão para acessar esta área.</div>');
    return;
  }
  var btn = document.getElementById('topActionBtn');
  if (window.canEdit('manipulacao')) { btn.style.display = ''; btn.textContent = '＋ Nova Manipulação'; }
  window.set('content', '<div class="card"><div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div></div>');
  
  Promise.all([window.dbGetServicos(), window.dbGetClientes()]).then(function (r) {
    var hoje = new Date().toISOString().split('T')[0];
    var servicos = r[0].filter(function (s) { return s.tipo === 'manipulacao'; }).sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); }), clientes = r[1];
    var valTotal = servicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var pendentes = servicos.filter(function (s) { return !s.dataEntregaReal && (!s.prazo || s.prazo >= hoje); }).length;
    var atrasadas = servicos.filter(function (s) { return !s.dataEntregaReal && s.prazo && s.prazo < hoje; }).length;
    
    window.set('content',
      '<div class="stats-grid" style="margin-bottom:1.25rem">' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--purple-l)">⚗️</div><div><div class="stat-val">' + servicos.length + '</div><div class="stat-lbl">Manipulações</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">💰</div><div><div class="stat-val">' + window.fmt(valTotal) + '</div><div class="stat-lbl">Valor total</div></div></div>' +
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
      (window.canEdit('manipulacao') ? '<button class="btn btn-primary" onclick="openModalServico(null,\'manipulacao\')">＋ Nova Manipulação</button>' : '') +
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

export function renderManipTable(servicos, clientes, hoje) {
  if (!servicos.length) return '<div class="empty"><span class="empty-ico">⚗️</span><p class="empty-txt">Nenhuma manipulação registrada</p>' + (window.canEdit('manipulacao') ? '<button class="btn btn-primary" style="margin-top:1rem" onclick="openModalServico(null,\'manipulacao\')">＋ Nova Manipulação</button>' : '') + '</div>';
  function statusBadge(s) {
    if (s.dataEntregaReal) return '<span class="badge badge-green">🟢 Entregue</span>';
    if (!s.prazo) return '<span class="badge badge-gray">— Sem prazo</span>';
    return s.prazo < hoje ? '<span class="badge badge-red">🔴 Atrasado</span>' : '<span class="badge badge-yellow">🟡 Pendente</span>';
  }
  return '<div class="table-wrap"><table><thead><tr><th>Orç#</th><th>Cliente</th><th>Fórmula</th><th>Entrega</th><th>Valor</th><th>Pagamento</th><th>Data</th><th></th></tr></thead><tbody>' +
    servicos.map(function (s) {
      var cl = clientes.find(function (c) { return c.id === s.clienteId; });
      var formulaTrunc = (s.formula || '—').slice(0, 50) + ((s.formula || '').length > 50 ? '…' : '');
      return '<tr><td><span class="orc-num" style="font-size:.9rem">#' + window.padNum(s.orcNum) + '</span></td>' +
        '<td class="td-name">' + (cl ? window.esc(cl.nome) : '—') + '</td>' +
        '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem" title="' + window.esc(s.formula || '—') + '">' + window.esc(formulaTrunc) + '</td>' +
        '<td>' + statusBadge(s) + '</td>' +
        '<td style="font-weight:600">' + window.fmt(s.valor) + '</td>' +
        '<td>' + window.pagBadge(s.pagamento) + '</td>' +
        '<td class="td-muted">' + window.fmtDate(s.data) + '</td>' +
        '<td style="display:flex;gap:.3rem">' +
        '<button class="btn btn-icon btn-sm" title="Ver detalhes" onclick="verManipulacao(\'' + s.id + '\')">👁</button>' +
        (window.canEdit('manipulacao') ? '<button class="btn btn-icon btn-sm" title="Editar" onclick="closeModal(\'modalOrc\');openModalServico(null,null,\'' + s.id + '\')">✏️</button>' : '') +
        (!s.dataEntregaReal && window.canEdit('manipulacao') ? '<button class="btn btn-sm btn-green" onclick="marcarEntregue(\'' + s.id + '\')" style="font-size:.72rem;padding:.3rem .6rem" title="Marcar como entregue">✅</button>' : '') +
        '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

export function filtrarManipulacoes() {
  var de = window.gv('mDe'), ate = window.gv('mAte'), status = window.gv('mStatus'), pag = window.gv('mPag');
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
  window.set('manipResult', '<div class="card-head"><div class="card-title">Resultados</div></div>' + renderManipTable(list, window._manipClientes || [], hoje));
}

export function verManipulacao(id) {
  Promise.all([window.dbGetServicos(), window.dbGetClientes()]).then(function (r) {
    var s = r[0].find(function (x) { return x.id === id; });
    if (!s) return;
    var cl = r[1].find(function (c) { return c.id === s.clienteId; });
    document.getElementById('mOrcSub').textContent = 'Manipulação #' + window.padNum(s.orcNum);
    window.set('mOrcBody',
      '<div style="text-align:center;padding:1rem 0 1.5rem"><div class="orc-num" style="font-size:2.5rem">#' + window.padNum(s.orcNum) + '</div><div style="font-size:.8rem;color:var(--tx3)">' + window.fmtDate(s.data) + '</div></div>' +
      '<div class="divider"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.85rem;margin-bottom:1.25rem">' +
      '<div><span style="color:var(--tx3)">Cliente:</span> <strong>' + (cl ? window.esc(cl.nome) : '—') + '</strong></div>' +
      '<div><span style="color:var(--tx3)">Pagamento:</span> ' + window.pagBadge(s.pagamento) + '</div>' +
      '<div><span style="color:var(--tx3)">Prazo:</span> ' + (s.prazo ? window.fmtDate(s.prazo) : '—') + '</div>' +
      '<div><span style="color:var(--tx3)">Entrega real:</span> ' + (s.dataEntregaReal ? window.fmtDate(s.dataEntregaReal) : 'Não entregue') + '</div>' +
      '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Fórmula:</span><div style="margin-top:.3rem;font-size:.82rem;background:var(--bg);padding:.75rem;border-radius:var(--r)">' + window.esc(s.formula || '—') + '</div></div>' +
      (s.obs ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Obs:</span> ' + window.esc(s.obs) + '</div>' : '') +
      '</div>' +
      '<div class="divider"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0">' +
      '<span style="font-size:1rem;font-weight:700">Total</span>' +
      '<span style="font-family:\'Playfair Display\',serif;font-size:1.6rem;font-weight:800;color:var(--blue)">' + window.fmt(s.valor) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">' +
      (window.canEdit('manipulacao') ? '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="closeModal(\'modalOrc\');openModalServico(null,null,\'' + s.id + '\')">✏️ Editar</button>' : '') +
      '<button class="btn btn-primary" style="flex:1;justify-content:center" onclick="gerarPDFServicoById(\'' + s.id + '\')">📄 Gerar PDF</button>' +
      '</div>'
    );
    window.openModal('modalOrc');
  });
}

export function marcarEntregue(id) {
  var hoje = new Date().toISOString().split('T')[0];
  var cached = window.fromCache('servicos') || [];
  var idx = cached.findIndex(function (x) { return x.id === id; });
  if (idx >= 0) {
    cached[idx].dataEntregaReal = hoje;
    cached[idx].data_entrega_real = hoje;
    window.setCache('servicos', cached);
  }
  if (window.sb && window.STATE.isSupabase) {
    window.withTimeout(window.sb.from('servicos').update({ data_entrega_real: hoje }).eq('id', id), 3000)
      .then(function () { window.clearCache('servicos'); })
      .catch(function (e) { console.warn('Erro ao salvar entrega no Supabase:', e.message); });
  }
  window.toast('Manipulação marcada como entregue!', 'ok');
  window._manipServicos = cached.filter(function (s) { return s.tipo === 'manipulacao'; }).sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); });
  filtrarManipulacoes();
}

// Bind to window for global availability
window.pgManipulacao = pgManipulacao;
window.renderManipTable = renderManipTable;
window.filtrarManipulacoes = filtrarManipulacoes;
window.verManipulacao = verManipulacao;
window.marcarEntregue = marcarEntregue;
