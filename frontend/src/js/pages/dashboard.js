// ══════════════════════════════════════════════════════════
//  ABA: DASHBOARD — pages/dashboard.js
// ══════════════════════════════════════════════════════════

// Ícones SVG simples para os stat-cards
var ICONS = {
  clientes: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  atendimentos: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  manipulacao: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>',
  exames: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>',
  receita: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  pendente: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>',
};

function renderDashboard(clientes, servicos, de, ate) {
  var hoje = new Date().toISOString().split('T')[0];

  // Filtra por período se informado
  var srvFiltrados = servicos;
  if (de) srvFiltrados = srvFiltrados.filter(function(s) { return s.data >= de; });
  if (ate) srvFiltrados = srvFiltrados.filter(function(s) { return s.data <= ate; });

  var hojeSrv = servicos.filter(function (s) { return s.data === hoje; });
  var receita = srvFiltrados.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
  var receitaHoje = hojeSrv.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
  var manip = srvFiltrados.filter(function (s) { return s.tipo === 'manipulacao'; });
  var exames = srvFiltrados.filter(function (s) { return s.tipo === 'exame'; });
  var aReceber = srvFiltrados.filter(function (s) { return s.pagamento === 'pendente'; }).reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);

  var manipAtrasadas = servicos.filter(function (s) {
    return s.tipo === 'manipulacao' && s.prazo && s.prazo < hoje && !s.dataEntregaReal;
  });

  // Últimos 7 dias (sempre sem filtro para manter consistência do gráfico)
  var dias = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var ds = d.toISOString().split('T')[0];
    var v = servicos.filter(function (s) { return s.data === ds; }).reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    dias.push({ d: ds.slice(5), v: v });
  }

  var hora = new Date().getHours();
  var saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  var nomeUser = window.STATE.user ? (window.STATE.user.nome || '').split(' ')[0] : '';

  var alertas = [];
  if (manipAtrasadas.length > 0) {
    alertas.push(manipAtrasadas.length + ' manipula' + (manipAtrasadas.length === 1 ? 'ção' : 'ções') + ' com prazo vencido — <a href="#" onclick="goTo(\'manipulacao\');return false;" style="color:inherit;font-weight:700;text-decoration:underline">Ver manipulações</a>');
  }
  if (aReceber > 0) {
    alertas.push(window.fmt(aReceber) + ' a receber no total — <a href="#" onclick="goTo(\'orcamentos\');return false;" style="color:inherit;font-weight:700;text-decoration:underline">Ver orçamentos</a>');
  }

  var totalSrv = srvFiltrados.length;
  var tiposDistrib = ['manipulacao', 'exame', 'produto'].map(function (t) {
    var n = srvFiltrados.filter(function (s) { return s.tipo === t; }).length;
    var pct = totalSrv > 0 ? Math.round(n / totalSrv * 100) : 0;
    return { t: t, n: n, pct: pct };
  }).filter(function (x) { return x.n > 0; });

  var distribHTML = tiposDistrib.length === 0 ? '<p style="color:var(--tx3);font-size:.83rem">Sem dados no período</p>' :
    tiposDistrib.map(function (x) {
      return '<div style="margin-bottom:.6rem"><div style="display:flex;justify-content:space-between;margin-bottom:.25rem"><span>' + window.tipoBadge(x.t) + '</span><span style="font-size:.75rem;font-weight:600">' + x.pct + '% (' + x.n + ')</span></div><div style="background:var(--bg);border-radius:4px;height:8px"><div style="width:' + x.pct + '%;height:100%;background:var(--blue);border-radius:4px"></div></div></div>';
    }).join('');

  // Label do período ativo
  var periodoLabel = (de || ate) ? ' <span style="font-size:.72rem;font-weight:500;color:var(--blue);background:var(--blue-l);padding:.1rem .5rem;border-radius:100px">' + (de ? window.fmtDate(de) : '...') + ' a ' + (ate ? window.fmtDate(ate) : 'hoje') + '</span>' : '';

  window.set('content',
    // Filtros de período
    '<div class="card" style="margin-bottom:1.25rem;padding:1rem 1.5rem">' +
    '<div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap">' +
    '<div style="font-size:.82rem;font-weight:600;color:var(--tx2);align-self:center">Período:</div>' +
    '<div class="fg" style="margin:0"><label style="font-size:.75rem">De</label><input type="date" id="dashDe" style="width:140px" value="' + (de || '') + '" onchange="aplicarFiltroDash()"/></div>' +
    '<div class="fg" style="margin:0"><label style="font-size:.75rem">Até</label><input type="date" id="dashAte" style="width:140px" value="' + (ate || '') + '" onchange="aplicarFiltroDash()"/></div>' +
    '<button class="btn btn-ghost btn-sm" onclick="limparFiltroDash()" style="font-size:.78rem">Limpar</button>' +
    '</div>' +
    '</div>' +
    (nomeUser ? '<p style="font-size:.85rem;color:var(--tx3);margin-bottom:1rem">' + saudacao + ', <strong>' + window.esc(nomeUser) + '</strong>!' + periodoLabel + '</p>' : '') +
    (alertas.length ? '<div class="alert alert-yellow" style="margin-bottom:1.25rem"><div><strong>Atenção:</strong> ' + alertas.join(' &nbsp;&middot;&nbsp; ') + '</div></div>' : '') +
    '<div class="stats-grid">' +
    '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l);color:var(--blue)">' + ICONS.clientes + '</div><div><div class="stat-val">' + clientes.length + '</div><div class="stat-lbl">Clientes cadastrados</div></div></div>' +
    '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l);color:var(--green)">' + ICONS.atendimentos + '</div><div><div class="stat-val">' + (de || ate ? srvFiltrados.length : hojeSrv.length) + '</div><div class="stat-lbl">' + (de || ate ? 'Atendimentos no período' : 'Atendimentos hoje') + '</div></div></div>' +
    '<div class="stat-card"><div class="stat-ico" style="background:var(--purple-l);color:var(--purple)">' + ICONS.manipulacao + '</div><div><div class="stat-val">' + manip.length + '</div><div class="stat-lbl">Manipulações' + (de || ate ? ' no período' : ' total') + '</div></div></div>' +
    '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l);color:var(--blue)">' + ICONS.exames + '</div><div><div class="stat-val">' + exames.length + '</div><div class="stat-lbl">Exames' + (de || ate ? ' no período' : ' total') + '</div></div></div>' +
    '<div class="stat-card"><div class="stat-ico" style="background:var(--yellow-l);color:var(--yellow)">' + ICONS.receita + '</div><div><div class="stat-val">' + window.fmt(receita) + '</div><div class="stat-lbl">Receita' + (de || ate ? ' no período' : ' total') + '</div>' + (!de && !ate ? '<div class="stat-chg chg-up">+' + window.fmt(receitaHoje) + ' hoje</div>' : '') + '</div></div>' +
    '<div class="stat-card"><div class="stat-ico" style="background:var(--red-l);color:var(--red)">' + ICONS.pendente + '</div><div><div class="stat-val">' + window.fmt(aReceber) + '</div><div class="stat-lbl">A receber</div></div></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:1.25rem">' +
    '<div class="card">' +
    '<div class="card-head"><div><div class="card-title">Últimos Serviços' + (de || ate ? ' (período)' : '') + '</div><div class="card-sub">Registros mais recentes</div></div></div>' +
    (srvFiltrados.length === 0 ? '<div class="empty"><p class="empty-txt">Nenhum serviço registrado' + (de || ate ? ' no período' : '') + '</p></div>' :
      '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Atendente</th><th>Valor</th><th>Pagamento</th><th>Data</th></tr></thead><tbody>' +
      srvFiltrados.slice(0, 8).map(function (s) {
        var cl = clientes.find(function (c) { return c.id === s.clienteId; });
        return '<tr><td class="td-name">' + (cl ? window.esc(cl.nome) : '-') + '</td><td>' + window.tipoBadge(s.tipo) + '</td><td class="td-muted">' + window.esc(s.criadoPor || '-') + '</td><td style="font-weight:600">' + window.fmt(s.valor) + '</td><td>' + window.pagBadge(s.pagamento) + '</td><td class="td-muted">' + window.fmtDate(s.data) + '</td></tr>';
      }).join('') + '</tbody></table></div>') +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:1.25rem">' +
    '<div class="card">' +
    '<div class="card-head"><div class="card-title">Receita (7 dias)</div></div>' +
    '<div style="display:flex;flex-direction:column;gap:.5rem">' +
    dias.map(function (d) {
      var max = Math.max.apply(null, dias.map(function (x) { return x.v; }));
      var pct = max > 0 ? Math.round(d.v / max * 100) : 0;
      return '<div style="display:flex;align-items:center;gap:.75rem"><span style="font-size:.72rem;color:var(--tx3);width:32px;flex-shrink:0">' + d.d + '</span><div style="flex:1;background:var(--bg);border-radius:4px;height:10px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,var(--blue),var(--blue-m));border-radius:4px;transition:width .5s"></div></div><span style="font-size:.72rem;font-weight:600;width:60px;text-align:right">' + window.fmt(d.v) + '</span></div>';
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
}

export function pgDashboard() {
  if (!window.canView('dashboard')) {
    window.set('content', '<div class="alert alert-red" style="margin-top:1rem">Você não tem permissão para visualizar o dashboard.</div>');
    return;
  }
  window.set('content', '<div style="text-align:center;padding:3rem;color:var(--tx3)"><p>Carregando...</p></div>');

  Promise.all([window.dbGetClientes(), window.dbGetServicos()]).then(function (results) {
    window._dashClientes = results[0];
    window._dashServicos = results[1];
    renderDashboard(results[0], results[1], '', '');
  });
}

export function aplicarFiltroDash() {
  var de = window.gv('dashDe');
  var ate = window.gv('dashAte');
  if (window._dashClientes && window._dashServicos) {
    renderDashboard(window._dashClientes, window._dashServicos, de, ate);
  }
}

export function limparFiltroDash() {
  if (window._dashClientes && window._dashServicos) {
    renderDashboard(window._dashClientes, window._dashServicos, '', '');
  }
}

// Bind to window for global availability
window.pgDashboard = pgDashboard;
window.aplicarFiltroDash = aplicarFiltroDash;
window.limparFiltroDash = limparFiltroDash;
