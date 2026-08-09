// ══════════════════════════════════════════════════════════
//  ABA: GERENCIAR TIPOS DE EXAMES — pages/tiposExames.js
// ══════════════════════════════════════════════════════════

export function renderTiposExameAdmin() {
  if (!window.canEdit('exames')) {
    window.set('content', '<div class="alert alert-red">⛔ Você não tem permissão para acessar esta área.</div>');
    return;
  }
  var btn = document.getElementById('topActionBtn');
  btn.style.display = ''; btn.textContent = '＋ Novo Tipo de Exame';
  window.set('content', '<div class="card"><div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div></div>');

  window.dbGetTiposExames().then(function (lista) {
    window.set('content',
      '<div class="card">' +
      '<div class="card-head"><div><div class="card-title">⚙️ Gerenciar Tipos de Exame</div><div class="card-sub">Adicione, edite ou desative exames e seus respectivos preços no sistema</div></div>' +
      '<div style="display:flex;gap:.5rem">' +
      '<button class="btn btn-ghost" onclick="pgExames()">← Voltar aos Exames</button>' +
      '<button class="btn btn-primary" onclick="openModalTipoExame()">＋ Novo Tipo</button>' +
      '</div></div>' +
      '<div class="table-wrap"><table>' +
      '<thead><tr><th>Nome</th><th>Preço sugerido</th><th>Ordem</th><th>Status</th><th>Ações</th></tr></thead>' +
      '<tbody>' +
      lista.map(function (te) {
        var vFmt = window.fmt(te.valor);
        var badgeStatus = te.ativo !== false ? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-gray">Inativo</span>';
        var actionToggle = te.ativo !== false ? 'Desativar' : 'Ativar';
        return '<tr>' +
          '<td class="td-name">' + window.esc(te.nome) + '</td>' +
          '<td style="font-weight:600">' + vFmt + '</td>' +
          '<td class="td-muted">' + (te.ordem || 0) + '</td>' +
          '<td>' + badgeStatus + '</td>' +
          '<td style="display:flex;gap:.4rem">' +
          '<button class="btn btn-sm btn-ghost" onclick="openModalTipoExame(\'' + te.id + '\')">✏️ Editar</button>' +
          '<button class="btn btn-sm btn-ghost" onclick="alterarAtivoTipoExame(\'' + te.id + '\',' + !(te.ativo !== false) + ')">' + actionToggle + '</button>' +
          '<button class="btn btn-sm btn-ghost" onclick="excluirTipoExame(\'' + te.id + '\')">🗑️</button>' +
          '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '</div>'
    );
    window._cachedTiposExamesList = lista;
  });
}

export function openModalTipoExame(id) {
  var selectEl = document.getElementById('modalTipoExame');
  selectEl.dataset.editId = id || '';
  document.getElementById('mTipoExameTitle').textContent = id ? 'Editar Tipo de Exame' : 'Novo Tipo de Exame';
  
  if (id) {
    var found = (window._cachedTiposExamesList || []).find(function (x) { return x.id === id; });
    if (found) {
      window.setVal('teNome', found.nome);
      var vRaw = parseFloat(found.valor) || 0;
      var vFmt = 'R$ ' + vRaw.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      window.setVal('teValor', vFmt);
      window.setVal('teOrdem', found.ordem || 0);
    }
  } else {
    window.setVal('teNome', '');
    window.setVal('teValor', '');
    window.setVal('teOrdem', '0');
  }
  window.openModal('modalTipoExame');
}

export function salvarTipoExame() {
  var id = document.getElementById('modalTipoExame').dataset.editId || null;
  var nome = window.gv('teNome');
  var valor = window.gv('teValor');
  var ordem = window.gv('teOrdem');

  if (!nome) { window.toast('Preencha o nome do exame.', 'er'); return; }
  if (!valor) { window.toast('Preencha o valor do exame.', 'er'); return; }

  var valorNum = parseFloat(valor.replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;
  var obj = {
    id: id,
    nome: nome,
    valor: valorNum,
    ordem: parseInt(ordem) || 0
  };

  window.dbSaveTipoExame(obj).then(function () {
    window.closeModal('modalTipoExame');
    window.toast('Tipo de exame salvo com sucesso! ✅', 'ok');
    renderTiposExameAdmin();
  });
}

export function alterarAtivoTipoExame(id, ativo) {
  window.dbToggleTipoExame(id, ativo).then(function () {
    window.toast('Status do tipo de exame atualizado!', 'ok');
    renderTiposExameAdmin();
  });
}

export function excluirTipoExame(id) {
  if (!confirm('Deseja realmente excluir este tipo de exame?')) return;
  window.dbDeleteTipoExame(id).then(function () {
    window.toast('Tipo de exame excluído!', 'ok');
    renderTiposExameAdmin();
  });
}

// Bind to window for global availability
window.renderTiposExameAdmin = renderTiposExameAdmin;
window.openModalTipoExame = openModalTipoExame;
window.salvarTipoExame = salvarTipoExame;
window.alterarAtivoTipoExame = alterarAtivoTipoExame;
window.excluirTipoExame = excluirTipoExame;
