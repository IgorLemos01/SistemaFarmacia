// ══════════════════════════════════════════════════════════
//  ABA: EXAMES — pages/exames.js
// ══════════════════════════════════════════════════════════

// Agrupa servicos de exame por clienteId + data + pagamento + orcNums consecutivos
function agruparExames(servicos) {
  var ordenados = servicos.slice().sort(function (a, b) { return (a.orcNum || 0) - (b.orcNum || 0); });
  var grupos = [];
  var visitados = {};

  ordenados.forEach(function (s) {
    if (visitados[s.id]) return;
    var grupo = [s];
    visitados[s.id] = true;
    ordenados.forEach(function (s2) {
      if (visitados[s2.id]) return;
      if (
        s2.clienteId === s.clienteId &&
        s2.data === s.data &&
        s2.pagamento === s.pagamento &&
        Math.abs((s2.orcNum || 0) - (s.orcNum || 0)) <= 20
      ) {
        grupo.push(s2);
        visitados[s2.id] = true;
      }
    });
    grupo.sort(function (a, b) { return (a.orcNum || 0) - (b.orcNum || 0); });
    var totalGrupo = grupo.reduce(function (acc, x) { return acc + (parseFloat(x.valor) || 0); }, 0);
    var todosComResultado = grupo.every(function (x) { return !!x.resultadoExame; });
    var algumComResultado = grupo.some(function (x) { return !!x.resultadoExame; });
    grupos.push({
      orcRef: grupo[0].orcNum,
      idRef: grupo[0].id,
      clienteId: s.clienteId,
      data: s.data,
      pagamento: s.pagamento,
      exames: grupo,
      total: totalGrupo,
      todosComResultado: todosComResultado,
      algumComResultado: algumComResultado,
    });
  });

  grupos.sort(function (a, b) { return (b.orcRef || 0) - (a.orcRef || 0); });
  return grupos;
}

export function pgExames() {
  if (!window.canView('exames')) {
    window.set('content', '<div class="alert alert-red">&#9940; Voc\u00ea n\u00e3o tem permiss\u00e3o para acessar esta \u00e1rea.</div>');
    return;
  }
  var btn = document.getElementById('topActionBtn');
  if (window.canEdit('exames')) { btn.style.display = ''; btn.textContent = '\uFF0B Novo Exame'; }
  window.set('content', '<div class="card"><div style="text-align:center;padding:2rem;color:var(--tx3)">\u23F3 Carregando...</div></div>');

  Promise.all([window.dbGetServicos(), window.dbGetClientes()]).then(function (r) {
    var servicos = r[0].filter(function (s) { return s.tipo === 'exame'; });
    var clientes = r[1];
    var grupos = agruparExames(servicos);
    var valTotal = servicos.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var comResult = servicos.filter(function (s) { return !!s.resultadoExame; }).length;
    var semResult = servicos.length - comResult;

    window.set('content',
      '<div class="stats-grid" style="margin-bottom:1.25rem">' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--blue-l)">\uD83D\uDD2C</div><div><div class="stat-val">' + servicos.length + '</div><div class="stat-lbl">Total de exames</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">\uD83D\uDCB0</div><div><div class="stat-val">' + window.fmt(valTotal) + '</div><div class="stat-lbl">Valor total</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--green-l)">\u2705</div><div><div class="stat-val">' + comResult + '</div><div class="stat-lbl">Com resultado</div></div></div>' +
      '<div class="stat-card"><div class="stat-ico" style="background:var(--yellow-l)">\u23F3</div><div><div class="stat-val">' + semResult + '</div><div class="stat-lbl">Aguardando resultado</div></div></div>' +
      '</div>' +
      '<div class="card" style="margin-bottom:1.25rem">' +
      '<div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap">' +
      '<div class="fg"><label>De</label><input type="date" id="eDe" style="width:150px"/></div>' +
      '<div class="fg"><label>At\u00e9</label><input type="date" id="eAte" style="width:150px"/></div>' +
      '<div class="fg"><label>Pagamento</label><select id="ePag" style="width:150px"><option value="">Todos</option><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">D\u00e9bito</option><option value="credito">Cr\u00e9dito</option><option value="pendente">A receber</option></select></div>' +
      '<button class="btn btn-primary" onclick="filtrarExames()">\uD83D\uDD0D Filtrar</button>' +
      (window.canEdit('exames') ? '<button class="btn btn-primary" onclick="openModalExame()">\uFF0B Novo Exame</button>' : '') +
      '</div>' +
      '</div>' +
      '<div class="card" id="exameResult">' +
      '<div class="card-head"><div class="card-title">Hist\u00f3rico de Exames</div></div>' +
      renderExameTable(grupos, clientes) +
      '</div>'
    );
    window._exameGrupos = grupos;
    window._exameServicos = servicos;
    window._exameClientes = clientes;
  });
}

export function renderExameTable(grupos, clientes) {
  if (!grupos.length) {
    return '<div class="empty"><span class="empty-ico">\uD83D\uDD2C</span><p class="empty-txt">Nenhum exame registrado</p>' +
      (window.canEdit('exames') ? '<button class="btn btn-primary" style="margin-top:1rem" onclick="openModalExame()">\uFF0B Novo Exame</button>' : '') +
      '</div>';
  }
  return '<div class="table-wrap"><table><thead><tr>' +
    '<th>Or\u00e7#</th><th>Cliente</th><th>Valor Total</th><th>Pagamento</th><th>Data</th><th>A\u00e7\u00f5es</th>' +
    '</tr></thead><tbody>' +
    grupos.map(function (g) {
      var cl = clientes.find(function (c) { return c.id === g.clienteId; });
      var statusBadge = g.todosComResultado
        ? '<span class="badge badge-green" style="font-size:.72rem">\u2705 Conclu\u00eddo</span>'
        : g.algumComResultado
          ? '<span class="badge badge-yellow" style="font-size:.72rem">\u23F3 Parcial</span>'
          : '<span class="badge badge-yellow" style="font-size:.72rem">\u23F3 Aguardando</span>';
      return '<tr>' +
        '<td><span class="orc-num" style="font-size:.9rem">#' + window.padNum(g.orcRef) + '</span></td>' +
        '<td class="td-name">' + (cl ? window.esc(cl.nome) : '\u2014') + '<div style="margin-top:.15rem">' + statusBadge + '</div></td>' +
        '<td style="font-weight:700;color:var(--blue)">' + window.fmt(g.total) + '</td>' +
        '<td>' + window.pagBadge(g.pagamento) + '</td>' +
        '<td class="td-muted">' + window.fmtDate(g.data) + '</td>' +
        '<td style="display:flex;gap:.3rem">' +
        '<button class="btn btn-icon btn-sm" title="Ver detalhes" onclick="verGrupoExame(' + g.orcRef + ')">\uD83D\uDC41</button>' +
        (window.canEdit('exames') ? '<button class="btn btn-icon btn-sm" title="Editar" onclick="closeModal(\'modalOrc\');openModalExame(\'' + g.idRef + '\')">\u270F\uFE0F</button>' : '') +
        '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

export function filtrarExames() {
  var de = window.gv('eDe'), ate = window.gv('eAte'), pag = window.gv('ePag');
  var lista = (window._exameServicos || []).filter(function (s) {
    if (de && s.data < de) return false;
    if (ate && s.data > ate) return false;
    if (pag && s.pagamento !== pag) return false;
    return true;
  });
  var grupos = agruparExames(lista);
  window.set('exameResult',
    '<div class="card-head"><div class="card-title">Resultados</div></div>' +
    renderExameTable(grupos, window._exameClientes || [])
  );
}

export function verGrupoExame(orcRef) {
  var grupos = window._exameGrupos || [];
  var grupo = grupos.find(function (g) { return g.orcRef == orcRef; });
  if (!grupo) return;
  var clientes = window._exameClientes || [];
  var cl = clientes.find(function (c) { return c.id === grupo.clienteId; });

  document.getElementById('mOrcSub').textContent = 'Orç #' + window.padNum(grupo.orcRef);

  var examesHtml = grupo.exames.map(function (s) {
    var temResult = !!s.resultadoExame;
    return '<div style="display:flex;align-items:center;gap:.75rem;padding:.65rem .85rem;background:var(--bg);border-radius:var(--r);margin-bottom:.4rem">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:600;font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + window.esc(s.tipoExame || '\u2014') + '</div>' +
        '<div style="font-size:.75rem;color:var(--tx3)">Or\u00e7 #' + window.padNum(s.orcNum) + '</div>' +
      '</div>' +
      '<div style="font-weight:700;color:var(--blue);white-space:nowrap;font-size:.9rem">' + window.fmt(s.valor) + '</div>' +
      '<div style="flex-shrink:0">' +
      (temResult
        ? '<span class="badge badge-green" style="font-size:.75rem">\u2705 Com resultado</span>'
        : (window.canEdit('exames')
            ? '<button class="btn btn-sm btn-ghost" style="font-size:.78rem;padding:.3rem .6rem;white-space:nowrap" onclick="marcarResultadoExame(\'' + s.id + '\')">\uD83D\uDCCB Resultado recebido</button>'
            : '<span class="badge badge-yellow" style="font-size:.75rem">\u23F3 Aguardando</span>'
          )
      ) +
      '</div>' +
      '</div>';
  }).join('');

  window.set('mOrcBody',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;font-size:.85rem;margin-bottom:1rem">' +
    '<div><span style="color:var(--tx3)">Cliente:</span> <strong>' + (cl ? window.esc(cl.nome) : '\u2014') + '</strong></div>' +
    '<div><span style="color:var(--tx3)">Data:</span> ' + window.fmtDate(grupo.data) + '</div>' +
    '<div><span style="color:var(--tx3)">Pagamento:</span> ' + window.pagBadge(grupo.pagamento) + '</div>' +
    '<div><span style="color:var(--tx3)">Total:</span> <strong style="color:var(--blue)">' + window.fmt(grupo.total) + '</strong></div>' +
    '</div>' +
    '<div class="divider"></div>' +
    '<div style="font-size:.85rem;font-weight:600;margin:.75rem 0 .5rem">Exames solicitados</div>' +
    examesHtml +
    '<div style="display:flex;gap:.75rem;margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border)">' +
    (window.canEdit('exames') ? '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="closeModal(\'modalOrc\');openModalExame(\'' + grupo.idRef + '\')">\u270F\uFE0F Editar</button>' : '') +
    '<button class="btn btn-primary" style="flex:1;justify-content:center" onclick="gerarPDFServicoById(\'' + grupo.idRef + '\')">\uD83D\uDCC4 Gerar PDF</button>' +
    '</div>'
  );
  window.openModal('modalOrc');
}

export function marcarResultadoExame(id) {
  if (!confirm('Confirmar que o resultado deste exame foi recebido?')) return;
  window.dbUpdateServico(id, { resultadoExame: new Date().toISOString() }).then(function () {
    window.clearCache('servicos');
    window.toast('Resultado registrado! \u2705', 'ok');
    Promise.all([window.dbGetServicos(), window.dbGetClientes()]).then(function (r) {
      var servicos = r[0].filter(function (s) { return s.tipo === 'exame'; });
      var clientes = r[1];
      var grupos = agruparExames(servicos);
      window._exameGrupos = grupos;
      window._exameServicos = servicos;
      window._exameClientes = clientes;
      // Atualiza tabela de fundo
      var resultEl = document.getElementById('exameResult');
      if (resultEl) {
        resultEl.innerHTML = '<div class="card-head"><div class="card-title">Hist\u00f3rico de Exames</div></div>' + renderExameTable(grupos, clientes);
      }
      // Reabre o modal do mesmo grupo
      var grupo = grupos.find(function (g) { return g.exames.some(function (e) { return e.id === id; }); });
      if (grupo) verGrupoExame(grupo.orcRef);
    });
  });
}

// Alias de compatibilidade
export function verExame(id) {
  var servicos = window._exameServicos || [];
  var grupos = window._exameGrupos || [];
  var grupo = grupos.find(function (g) { return g.exames.some(function (e) { return e.id === id; }); });
  if (grupo) { verGrupoExame(grupo.orcRef); return; }
  // Fallback: tenta agrupar do zero
  Promise.all([window.dbGetServicos(), window.dbGetClientes()]).then(function (r) {
    var srv = r[0].filter(function (s) { return s.tipo === 'exame'; });
    var gs = agruparExames(srv);
    window._exameGrupos = gs;
    window._exameServicos = srv;
    window._exameClientes = r[1];
    var g = gs.find(function (gg) { return gg.exames.some(function (e) { return e.id === id; }); });
    if (g) verGrupoExame(g.orcRef);
  });
}

// Bind to window for global availability
window.pgExames = pgExames;
window.renderExameTable = renderExameTable;
window.filtrarExames = filtrarExames;
window.verExame = verExame;
window.verGrupoExame = verGrupoExame;
window.marcarResultadoExame = marcarResultadoExame;



