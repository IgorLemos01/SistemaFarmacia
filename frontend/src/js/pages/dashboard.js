// ══════════════════════════════════════════════════════════
//  ABA: DASHBOARD — pages/dashboard.js
// ══════════════════════════════════════════════════════════

export function pgDashboard() {
  if (!window.canView('dashboard')) {
    window.set('content', '<div class="alert alert-red" style="margin-top:1rem">⛔ Você não tem permissão para visualizar o dashboard.</div>');
    return;
  }
  window.set('content', '<div style="text-align:center;padding:3rem;color:var(--tx3)"><span style="font-size:2rem">⏳</span><p style="margin-top:.5rem">Carregando...</p></div>');
  
  Promise.all([window.dbGetClientes(), window.dbGetServicos()]).then(function (results) {
    var clientes = results[0], servicos = results[1];
    var hoje = new Date().toISOString().split('T')[0];
    var hojeSrv = servicos.filter(function (s) { return s.data === hoje; });
    var receita = servicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var receitaHoje = hojeSrv.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var manip = servicos.filter(function (s) { return s.tipo === 'manipulacao'; });
    var exames = servicos.filter(function (s) { return s.tipo === 'exame'; });
    var aReceber = servicos.filter(function (s) { return s.pagamento === 'pendente'; }).reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    
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
    
    var totalSrv = servicos.length;
    var tiposDistrib = ['manipulacao', 'exame', 'produto'].map(function (t) {
      var n = servicos.filter(function (s) { return s.tipo === t; }).length;
      var pct = totalSrv > 0 ? Math.round(n / totalSrv * 100) : 0;
      return { t: t, n: n, pct: pct };
    }).filter(function (x) { return x.n > 0; });
    
    var distribHTML = tiposDistrib.length === 0 ? '<p style="color:var(--tx3);font-size:.83rem">Sem dados</p>' :
      tiposDistrib.map(function (x) {
        return '<div style="margin-bottom:.6rem"><div style="display:flex;justify-content:space-between;margin-bottom:.25rem"><span>' + window.tipoBadge(x.t) + '</span><span style="font-size:.75rem;font-weight:600">' + x.pct + '% (' + x.n + ')</span></div><div style="background:var(--bg);border-radius:4px;height:8px"><div style="width:' + x.pct + '%;height:100%;background:var(--blue);border-radius:4px"></div></div></div>';
      }).join('');
      
    window.set('content',
      (nomeUser ? '<p style="font-size:.85rem;color:var(--tx3);margin-bottom:1rem">' + saudacao + ', <strong>' + window.esc(nomeUser) + '</strong>! 👋</p>' : '') +
      (alertas.length ? '<div class="alert alert-yellow" style="margin-bottom:1.25rem">⚠️ <div><strong>Atenção:</strong> ' + alertas.join(' &nbsp;·&nbsp; ') + '</div></div>' : '') +
      '<div class="stats-grid">' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l)">👥</div><div><div class="stat-val">' + clientes.length + '</div><div class="stat-lbl">Clientes cadastrados</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">📋</div><div><div class="stat-val">' + hojeSrv.length + '</div><div class="stat-lbl">Atendimentos hoje</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--purple-l)">⚗️</div><div><div class="stat-val">' + manip.length + '</div><div class="stat-lbl">Manipulações total</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l)">🔬</div><div><div class="stat-val">' + exames.length + '</div><div class="stat-lbl">Exames total</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--yellow-l)">💰</div><div><div class="stat-val">' + window.fmt(receita) + '</div><div class="stat-lbl">Receita total</div><div class="stat-chg chg-up">+' + window.fmt(receitaHoje) + ' hoje</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--yellow-l)">⏳</div><div><div class="stat-val">' + window.fmt(aReceber) + '</div><div class="stat-lbl">A receber</div></div></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1.6fr 1fr;gap:1.25rem">' +
      '<div class="card">' +
      '<div class="card-head"><div><div class="card-title">Últimos Serviços</div><div class="card-sub">Registros mais recentes</div></div></div>' +
      (servicos.length === 0 ? '<div class="empty"><span class="empty-ico">📋</span><p class="empty-txt">Nenhum serviço registrado</p></div>' :
        '<div class="table-wrap"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Atendente</th><th>Valor</th><th>Pagamento</th><th>Data</th></tr></thead><tbody>' +
        servicos.slice(0, 8).map(function (s) {
          var cl = clientes.find(function (c) { return c.id === s.clienteId; });
          return '<tr><td class="td-name">' + (cl ? window.esc(cl.nome) : '—') + '</td><td>' + window.tipoBadge(s.tipo) + '</td><td class="td-muted">' + window.esc(s.criadoPor || '—') + '</td><td style="font-weight:600">' + window.fmt(s.valor) + '</td><td>' + window.pagBadge(s.pagamento) + '</td><td class="td-muted">' + window.fmtDate(s.data) + '</td></tr>';
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
  });
}

// Bind to window for global availability
window.pgDashboard = pgDashboard;
