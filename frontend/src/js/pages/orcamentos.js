// ══════════════════════════════════════════════════════════
//  ABA: ORÇAMENTOS — pages/orcamentos.js
// ══════════════════════════════════════════════════════════

export function pgOrcamentos() {
  if (!window.canView('orcamentos')) {
    window.set('content', '<div class="alert alert-red">⛔ Você não tem permissão para acessar esta área.</div>');
    return;
  }
  var btn = document.getElementById('topActionBtn');
  btn.style.display = 'none';
  window.set('content', '<div class="card"><div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div></div>');

  Promise.all([window.dbGetServicos(), window.dbGetClientes()]).then(function (r) {
    var servicos = r[0].sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); }), clientes = r[1];
    var valTotal = servicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var recebido = servicos.filter(function (s) { return s.pagamento !== 'pendente'; }).reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var pendente = valTotal - recebido;
    
    window.set('content',
      '<div class="stats-grid" style="margin-bottom:1.25rem">' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l)">📋</div><div><div class="stat-val">' + servicos.length + '</div><div class="stat-lbl">Atendimentos</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">🟢</div><div><div class="stat-val">' + window.fmt(recebido) + '</div><div class="stat-lbl">Total recebido</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--red-l)">⏳</div><div><div class="stat-val">' + window.fmt(pendente) + '</div><div class="stat-lbl">Total a receber</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">💰</div><div><div class="stat-val">' + window.fmt(valTotal) + '</div><div class="stat-lbl">Total geral</div></div></div>' +
      '</div>' +
      '<div class="card" style="margin-bottom:1.25rem">' +
      '<div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap">' +
      '<div class="fg"><label>De</label><input type="date" id="orcDe" style="width:150px"/></div>' +
      '<div class="fg"><label>Até</label><input type="date" id="orcAte" style="width:150px"/></div>' +
      '<div class="fg"><label>Serviço</label><select id="orcTipo" style="width:150px"><option value="">Todos</option><option value="manipulacao">Manipulação</option><option value="exame">Exame</option><option value="produto">Produto</option></select></div>' +
      '<div class="fg"><label>Pagamento</label><select id="orcPag" style="width:150px"><option value="">Todos</option><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="pendente">A receber</option></select></div>' +
      '<button class="btn btn-primary" onclick="filtrarOrcamentos()">🔍 Filtrar</button>' +
      '<button class="btn btn-ghost" onclick="gerarPDFOrcamentos()">📄 Gerar PDF</button>' +
      '</div>' +
      '</div>' +
      '<div class="card" id="orcResult">' +
      '<div class="card-head"><div class="card-title">Orçamentos Gerados</div></div>' +
      renderOrcTable(servicos, clientes) +
      '</div>'
    );
    window._orcServicos = servicos; window._orcClientes = clientes;
  });
}

export function renderOrcTable(servicos, clientes) {
  if (!servicos.length) return '<div class="empty"><span class="empty-ico">📋</span><p class="empty-txt">Nenhum orçamento encontrado</p></div>';
  return '<div class="table-wrap"><table><thead><tr><th>Orç#</th><th>Cliente</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Pagamento</th><th>Data</th><th>Ações</th></tr></thead><tbody>' +
    servicos.map(function (s) {
      var cl = clientes.find(function (c) { return c.id === s.clienteId; });
      var desc = window.getServicoDesc(s);
      var canEditSrv = window.canEdit('orcamentos') || window.canEdit('manipulacao') || window.canEdit('exames');
      var tipoModal = s.tipo === 'manipulacao' ? 'verManipulacao' : s.tipo === 'exame' ? 'verExame' : 'verOrcamento';
      return '<tr><td><span class="orc-num" style="font-size:.9rem">#' + window.padNum(s.orcNum) + '</span></td>' +
        '<td class="td-name">' + (cl ? window.esc(cl.nome) : '—') + '</td>' +
        '<td>' + window.tipoBadge(s.tipo) + '</td>' +
        '<td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem" title="' + window.esc(desc) + '">' + window.esc(desc) + '</td>' +
        '<td style="font-weight:600">' + window.fmt(s.valor) + '</td>' +
        '<td>' + window.pagBadge(s.pagamento) + '</td>' +
        '<td class="td-muted">' + window.fmtDate(s.data) + '</td>' +
        '<td style="display:flex;gap:.3rem">' +
        '<button class="btn btn-icon btn-sm" title="Ver detalhes" onclick="' + tipoModal + '(\'' + s.id + '\')">👁</button>' +
        (canEditSrv ? '<button class="btn btn-icon btn-sm" title="Editar" onclick="closeModal(\'modalOrc\');' + (s.tipo === 'exame' ? 'openModalExame' : 'openModalServico') + '(null,null,\'' + s.id + '\')">✏️</button>' : '') +
        '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

export function filtrarOrcamentos() {
  var de = window.gv('orcDe'), ate = window.gv('orcAte'), tipo = window.gv('orcTipo'), pag = window.gv('orcPag');
  var list = (window._orcServicos || []).filter(function (s) {
    if (de && s.data < de) return false;
    if (ate && s.data > ate) return false;
    if (tipo && s.tipo !== tipo) return false;
    if (pag && s.pagamento !== pag) return false;
    return true;
  });
  window.set('orcResult', '<div class="card-head"><div class="card-title">Resultados</div></div>' + renderOrcTable(list, window._orcClientes || []));
}

export function verOrcamento(id) {
  Promise.all([window.dbGetServicos(), window.dbGetClientes()]).then(function (r) {
    var s = r[0].find(function (x) { return x.id === id; });
    if (!s) return;
    var cl = r[1].find(function (c) { return c.id === s.clienteId; });
    document.getElementById('mOrcSub').textContent = 'Orçamento #' + window.padNum(s.orcNum);
    window.set('mOrcBody',
      '<div style="text-align:center;padding:1rem 0 1.5rem"><div class="orc-num" style="font-size:2.5rem">#' + window.padNum(s.orcNum) + '</div><div style="font-size:.8rem;color:var(--tx3)">' + window.fmtDate(s.data) + '</div></div>' +
      '<div class="divider"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.85rem;margin-bottom:1.25rem">' +
      '<div><span style="color:var(--tx3)">Cliente:</span> <strong>' + (cl ? window.esc(cl.nome) : '—') + '</strong></div>' +
      '<div><span style="color:var(--tx3)">Pagamento:</span> ' + window.pagBadge(s.pagamento) + '</div>' +
      '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Descrição:</span> <strong>' + window.esc(s.produtoDesc || 'Produto/Venda') + '</strong></div>' +
      (s.obs ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Obs:</span> ' + window.esc(s.obs) + '</div>' : '') +
      '</div>' +
      '<div class="divider"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0">' +
      '<span style="font-size:1rem;font-weight:700">Total</span>' +
      '<span style="font-family:\'Playfair Display\',serif;font-size:1.6rem;font-weight:800;color:var(--blue)">' + window.fmt(s.valor) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">' +
      (window.canEdit('orcamentos') || window.canEdit('manipulacao') ? '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="closeModal(\'modalOrc\');openModalServico(null,null,\'' + s.id + '\')">✏️ Editar Orçamento</button>' : '') +
      '<button class="btn btn-primary" style="flex:1;justify-content:center" onclick="gerarPDFServicoById(\'' + s.id + '\')">📄 Gerar PDF</button>' +
      '</div>'
    );
    window.openModal('modalOrc');
  });
}

// Bind to window for global availability
window.pgOrcamentos = pgOrcamentos;
window.renderOrcTable = renderOrcTable;
window.filtrarOrcamentos = filtrarOrcamentos;
window.verOrcamento = verOrcamento;
