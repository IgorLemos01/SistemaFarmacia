// ══════════════════════════════════════════════════════════
//  ABA: EXAMES — pages/exames.js
// ══════════════════════════════════════════════════════════

export function pgExames() {
  if (!window.canView('exames')) {
    window.set('content', '<div class="alert alert-red">⛔ Você não tem permissão para acessar esta área.</div>');
    return;
  }
  var btn = document.getElementById('topActionBtn');
  if (window.canEdit('exames')) { btn.style.display = ''; btn.textContent = '＋ Novo Exame'; }
  window.set('content', '<div class="card"><div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div></div>');

  Promise.all([window.dbGetServicos(), window.dbGetClientes()]).then(function (r) {
    var servicos = r[0].filter(function (s) { return s.tipo === 'exame'; }).sort(function (a, b) { return (b.orcNum || 0) - (a.orcNum || 0); }), clientes = r[1];
    var valTotal = servicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    
    // Calcula com/sem resultado
    var comResult = servicos.filter(function (s) { return !!s.resultadoExame; }).length;
    var semResult = servicos.length - comResult;
    
    window.set('content',
      '<div class="stats-grid" style="margin-bottom:1.25rem">' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l)">🔬</div><div><div class="stat-val">' + servicos.length + '</div><div class="stat-lbl">Total de exames</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">💰</div><div><div class="stat-val">' + window.fmt(valTotal) + '</div><div class="stat-lbl">Valor total</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">✅</div><div><div class="stat-val">' + comResult + '</div><div class="stat-lbl">Com resultado</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--yellow-l)">⏳</div><div><div class="stat-val">' + semResult + '</div><div class="stat-lbl">Aguardando resultado</div></div></div>' +
      '</div>' +
      '<div class="card" style="margin-bottom:1.25rem">' +
      '<div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap">' +
      '<div class="fg"><label>De</label><input type="date" id="eDe" style="width:150px"/></div>' +
      '<div class="fg"><label>Até</label><input type="date" id="eAte" style="width:150px"/></div>' +
      '<div class="fg"><label>Pagamento</label><select id="ePag" style="width:150px"><option value="">Todos</option><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="pendente">A receber</option></select></div>' +
      '<button class="btn btn-primary" onclick="filtrarExames()">🔍 Filtrar</button>' +
      (window.canEdit('exames') ? '<button class="btn btn-primary" onclick="openModalExame()">＋ Novo Exame</button>' : '') +
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

export function renderExameTable(servicos, clientes) {
  if (!servicos.length) return '<div class="empty"><span class="empty-ico">🔬</span><p class="empty-txt">Nenhum exame registrado</p>' + (window.canEdit('exames') ? '<button class="btn btn-primary" style="margin-top:1rem" onclick="openModalExame()">＋ Novo Exame</button>' : '') + '</div>';
  return '<div class="table-wrap"><table><thead><tr><th>Orç#</th><th>Cliente</th><th>Tipo de Exame</th><th>Resultado</th><th>Valor</th><th>Pagamento</th><th>Data</th><th></th></tr></thead><tbody>' +
    servicos.map(function (s) {
      var cl = clientes.find(function (c) { return c.id === s.clienteId; });
      var temResult = !!s.resultadoExame;
      return '<tr><td><span class="orc-num" style="font-size:.9rem">#' + window.padNum(s.orcNum) + '</span></td>' +
        '<td class="td-name">' + (cl ? window.esc(cl.nome) : '—') + '</td>' +
        '<td>' + window.esc(s.tipoExame || '—') + '</td>' +
        '<td>' + (temResult ? '<span class="badge badge-green">✅ Com resultado</span>' : '<span class="badge badge-yellow">⏳ Aguardando</span>') + '</td>' +
        '<td style="font-weight:600">' + window.fmt(s.valor) + '</td>' +
        '<td>' + window.pagBadge(s.pagamento) + '</td>' +
        '<td class="td-muted">' + window.fmtDate(s.data) + '</td>' +
        '<td style="display:flex;gap:.3rem">' +
        '<button class="btn btn-icon btn-sm" title="Ver detalhes" onclick="verExame(\'' + s.id + '\')">👁</button>' +
        (window.canEdit('exames') ? '<button class="btn btn-icon btn-sm" title="Editar" onclick="closeModal(\'modalOrc\');openModalExame(\'' + s.id + '\')">✏️</button>' : '') +
        '</td>' +
        '</tr>';
    }).join('') + '</tbody></table></div>';
}

export function filtrarExames() {
  var de = window.gv('eDe'), ate = window.gv('eAte'), pag = window.gv('ePag');
  var list = (window._exameServicos || []).filter(function (s) {
    if (de && s.data < de) return false;
    if (ate && s.data > ate) return false;
    if (pag && s.pagamento !== pag) return false;
    return true;
  });
  window.set('exameResult', '<div class="card-head"><div class="card-title">Resultados</div></div>' + renderExameTable(list, window._exameClientes || []));
}

export function verExame(id) {
  Promise.all([window.dbGetServicos(), window.dbGetClientes()]).then(function (r) {
    var s = r[0].find(function (x) { return x.id === id; });
    if (!s) return;
    var cl = r[1].find(function (c) { return c.id === s.clienteId; });
    document.getElementById('mOrcSub').textContent = 'Exame #' + window.padNum(s.orcNum);
    window.set('mOrcBody',
      '<div style="text-align:center;padding:1rem 0 1.5rem"><div class="orc-num" style="font-size:2.5rem">#' + window.padNum(s.orcNum) + '</div><div style="font-size:.8rem;color:var(--tx3)">' + window.fmtDate(s.data) + '</div></div>' +
      '<div class="divider"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.85rem;margin-bottom:1.25rem">' +
      '<div><span style="color:var(--tx3)">Cliente:</span> <strong>' + (cl ? window.esc(cl.nome) : '—') + '</strong></div>' +
      '<div><span style="color:var(--tx3)">Pagamento:</span> ' + window.pagBadge(s.pagamento) + '</div>' +
      '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Tipo de Exame:</span> <strong>' + window.esc(s.tipoExame || '—') + '</strong></div>' +
      (s.obs ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Obs:</span> ' + window.esc(s.obs) + '</div>' : '') +
      '</div>' +
      '<div class="divider"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:.5rem 0">' +
      '<span style="font-size:1rem;font-weight:700">Total</span>' +
      '<span style="font-family:\'Playfair Display\',serif;font-size:1.6rem;font-weight:800;color:var(--blue)">' + window.fmt(s.valor) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:.75rem;margin-top:1.25rem;padding-top:1.25rem;border-top:1px solid var(--border)">' +
      (window.canEdit('exames') ? '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="closeModal(\'modalOrc\');openModalExame(\'' + s.id + '\')">✏️ Editar</button>' : '') +
      '<button class="btn btn-primary" style="flex:1;justify-content:center" onclick="gerarPDFServicoById(\'' + s.id + '\')">📄 Gerar PDF</button>' +
      '</div>'
    );
    window.openModal('modalOrc');
  });
}

// Bind to window for global availability
window.pgExames = pgExames;
window.renderExameTable = renderExameTable;
window.filtrarExames = filtrarExames;
window.verExame = verExame;
