// ══════════════════════════════════════════════════════════
//  GATILHOS E COMPORTAMENTO DOS MODAIS — js/modals.js
// ══════════════════════════════════════════════════════════

var _editandoServicoId = null;

export function openModalServico(clienteId, tipo, servicoId) {
  _editandoServicoId = servicoId || null;
  window._editandoServicoId = _editandoServicoId;
  var isEdit = !!servicoId;

  if (isEdit) {
    var allSrv = window.fromCache('servicos') || [];
    var s = allSrv.find(function (x) { return x.id === servicoId; });
    if (!s) {
      window.dbGetServicos().then(function (all) {
        var srv = all.find(function (x) { return x.id === servicoId; });
        if (srv) openModalServico(srv.clienteId, srv.tipo, servicoId);
      });
      return;
    }
    clienteId = s.clienteId;
    tipo = s.tipo;
    document.getElementById('sClienteId').value = clienteId || '';
    document.getElementById('sClienteSearch').value = '';
    window.set('sClienteSelected', '');
    document.getElementById('sClienteSelected').style.display = 'none';
    document.getElementById('sClienteResults').style.display = 'none';
    var clientes = window.fromCache('clientes') || [];
    var cl = clientes.find(function (c) { return c.id === clienteId; });
    if (cl) {
      window.set('sClienteSelected', '<strong>' + window.esc(cl.nome) + '</strong><button class="btn btn-icon btn-sm" onclick="clearClienteServico()" style="margin-left:.5rem">✕</button>');
      document.getElementById('sClienteSelected').style.display = 'flex';
      document.getElementById('mServicoSub').textContent = 'Editando orçamento #' + window.padNum(s.orcNum) + ' — ' + cl.nome;
    } else {
      document.getElementById('mServicoSub').textContent = 'Editando orçamento #' + window.padNum(s.orcNum);
    }
    window.setVal('sTipo', s.tipo || '');
    window.setVal('sData', s.data || new Date().toISOString().split('T')[0]);
    window.setVal('sFormula', s.formula || '');
    window.setVal('sPrazo', s.prazo || '');
    window.setVal('sTipoExame', s.tipoExame || '');
    window.setVal('sProdutoDesc', s.produtoDesc || '');
    var vRaw = parseFloat(s.valor) || 0;
    var vFmt = 'R$ ' + vRaw.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    window.setVal('sValor', vFmt);
    window.setVal('sPagamento', s.pagamento || '');
    window.setVal('sObs', s.obs || '');
    window.setVal('sResultadoExame', s.resultadoExame || '');
    window.setVal('sLaboratorio', s.laboratorio || '');
    onTipoChange();
    document.querySelector('#modalServico .modal-title').textContent = 'Editar Serviço';
    document.querySelector('#modalServico .btn-primary[onclick="salvarServico()"]').textContent = '💾 Salvar Alterações';
    window.openModal('modalServico');
    return;
  }

  document.querySelector('#modalServico .modal-title').textContent = 'Registrar Serviço';
  document.querySelector('#modalServico .btn-primary[onclick="salvarServico()"]').textContent = '💾 Registrar Serviço';
  document.getElementById('sClienteId').value = clienteId || '';
  document.getElementById('sClienteSearch').value = '';
  window.set('sClienteSelected', '');
  document.getElementById('sClienteSelected').style.display = 'none';
  document.getElementById('sClienteResults').style.display = 'none';
  if (clienteId) {
    var clientes2 = window.fromCache('clientes') || [];
    var cl2 = clientes2.find(function (c) { return c.id === clienteId; });
    if (cl2) {
      window.set('sClienteSelected', '<strong>' + window.esc(cl2.nome) + '</strong><button class="btn btn-icon btn-sm" onclick="clearClienteServico()" style="margin-left:.5rem">✕</button>');
      document.getElementById('sClienteSelected').style.display = 'flex';
      document.getElementById('mServicoSub').textContent = 'Cliente: ' + cl2.nome;
    }
  } else {
    document.getElementById('mServicoSub').textContent = 'Registrar atendimento para um cliente';
  }
  window.setVal('sTipo', tipo || '');
  window.setVal('sData', new Date().toISOString().split('T')[0]);
  window.setVal('sFormula', ''); window.setVal('sPrazo', '');
  window.setVal('sTipoExame', ''); window.setVal('sProdutoDesc', '');
  window.setVal('sValor', ''); window.setVal('sPagamento', ''); window.setVal('sObs', '');
  window.setVal('sResultadoExame', ''); window.setVal('sLaboratorio', '');
  if (tipo) onTipoChange();
  window.openModal('modalServico');
}

export function onTipoChange() {
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

export function cancelarModalServico() {
  var temDados = window.gv('sFormula') || window.gv('sTipoExame') || window.gv('sProdutoDesc') || window.gv('sValor') || window.gv('sObs');
  if (temDados && !confirm('Descartar os dados preenchidos?')) return;
  window.closeModal('modalServico');
}

export function maskValorServico(inp) {
  var raw = inp.value.replace(/\D/g, '');
  if (!raw) { inp.value = ''; return; }
  var n = (parseInt(raw, 10) / 100).toFixed(2);
  inp.value = 'R$ ' + n.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function updateSenhaCounter() {
  var v = document.getElementById('uSenha');
  var c = document.getElementById('uSenhaCounter');
  if (v && c) { var n = v.value.length; c.textContent = n + ' caractere' + (n !== 1 ? 's' : ''); c.style.color = n >= 6 ? 'var(--green)' : 'var(--tx3)'; }
}

export var _srTimeout;
export function buscarClienteServico(q) {
  clearTimeout(_srTimeout);
  _srTimeout = setTimeout(function () {
    if (!q || q.length < 2) { document.getElementById('sClienteResults').style.display = 'none'; return; }
    var clientes = window.fromCache('clientes') || [];
    var found = clientes.filter(function (c) { return (c.nome + (c.tel || '')).toLowerCase().includes(q.toLowerCase()); }).slice(0, 6);
    var box = document.getElementById('sClienteResults');
    if (!found.length) {
      window.dbGetClientes().then(function (all) {
        var found2 = all.filter(function (c) { return (c.nome + (c.tel || '')).toLowerCase().includes(q.toLowerCase()); }).slice(0, 6);
        renderClienteDropdown(found2, box);
      });
      return;
    }
    renderClienteDropdown(found, box);
  }, 200);
}

export function renderClienteDropdown(clientes, box) {
  if (!clientes.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  box.innerHTML = '<div style="position:absolute;top:2px;left:0;right:0;background:#fff;border:1.5px solid var(--blue);border-radius:var(--r);box-shadow:var(--md);z-index:50;overflow:hidden">' +
    clientes.map(function (c) { return '<div onclick="selectClienteServico(\'' + c.id + '\')" style="padding:.65rem .9rem;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border)" onmouseenter="this.style.background=\'var(--bg)\'" onmouseleave="this.style.background=\'\'"><strong>' + window.esc(c.nome) + '</strong> <span style="color:var(--tx3)">' + window.esc(c.tel || '') + '</span></div>'; }).join('') + '</div>';
}

export function selectClienteServico(id) {
  var clientes = window.fromCache('clientes') || [];
  var cl = clientes.find(function (c) { return c.id === id; });
  if (!cl) return;
  document.getElementById('sClienteId').value = id;
  document.getElementById('sClienteResults').style.display = 'none';
  window.set('sClienteSelected', '<strong>' + window.esc(cl.nome) + '</strong><button class="btn btn-icon btn-sm" onclick="clearClienteServico()" style="margin-left:.5rem">✕</button>');
  document.getElementById('sClienteSelected').style.display = 'flex';
  document.getElementById('mServicoSub').textContent = 'Cliente: ' + cl.nome;
}

export function clearClienteServico() {
  document.getElementById('sClienteId').value = '';
  document.getElementById('sClienteSelected').style.display = 'none';
  document.getElementById('mServicoSub').textContent = 'Registrar atendimento para um cliente';
}

export function _setFieldErr(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.style.borderColor = 'var(--red)'; el.addEventListener('input', function () { el.style.borderColor = ''; }, { once: true }); }
}

export function salvarServico() {
  var clienteId = document.getElementById('sClienteId').value;
  var tipo = window.gv('sTipo'), data = window.gv('sData'), valor = window.gv('sValor'), pag = window.gv('sPagamento');
  var hasErr = false;
  if (!clienteId) { window.toast('Selecione um cliente.', 'er'); hasErr = true; }
  if (!tipo) { _setFieldErr('sTipo'); window.toast('Selecione o tipo de serviço.', 'er'); hasErr = true; }
  if (!data) { _setFieldErr('sData'); if (!hasErr) window.toast('Informe a data.', 'er'); hasErr = true; }
  if (!valor) { _setFieldErr('sValor'); if (!hasErr) window.toast('Informe o valor.', 'er'); hasErr = true; }
  if (!pag) { _setFieldErr('sPagamento'); if (!hasErr) window.toast('Selecione a forma de pagamento.', 'er'); hasErr = true; }
  if (tipo === 'manipulacao' && !window.gv('sFormula')) { _setFieldErr('sFormula'); if (!hasErr) window.toast('Informe a fórmula.', 'er'); hasErr = true; }
  if (tipo === 'exame' && !window.gv('sTipoExame')) { _setFieldErr('sTipoExame'); if (!hasErr) window.toast('Informe o tipo de exame.', 'er'); hasErr = true; }
  if (hasErr) return;

  var valorNum = parseFloat(valor.replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;

  if (_editandoServicoId) {
    var editId = _editandoServicoId;
    var cached = window.fromCache('servicos') || [];
    var existing = cached.find(function (x) { return x.id === editId; }) || {};
    var changes = {
      clienteId: clienteId, tipo: tipo, data: data,
      valor: valorNum, pagamento: pag, obs: window.gv('sObs') || null,
      formula: window.gv('sFormula') || null, prazo: window.gv('sPrazo') || null,
      tipoExame: window.gv('sTipoExame') || null, produtoDesc: window.gv('sProdutoDesc') || null,
      resultadoExame: window.gv('sResultadoExame') || null,
      laboratorio: window.gv('sLaboratorio') || null,
    };
    window.closeModal('modalServico');
    var _clienteParaConfirm2 = (window.fromCache('clientes') || []).find(function (c) { return c.id === clienteId; }) || null;
    window.dbUpdateServico(editId, changes).then(function (num) {
      window.clearCache('servicos');
      window.renderPage(window.STATE.page);
      window.toast('Orçamento #' + window.padNum(num || existing.orcNum) + ' atualizado com sucesso!', 'ok');
      setTimeout(function () {
        var objFinal = Object.assign({}, existing, changes, { orcNum: num || existing.orcNum });
        window.abrirConfirmServico(objFinal, _clienteParaConfirm2, num || existing.orcNum);
      }, 150);
    });
    _editandoServicoId = null;
    window._editandoServicoId = null;
    return;
  }

  var obj = {
    id: window.uid(), clienteId: clienteId, tipo: tipo, data: data,
    valor: valorNum,
    pagamento: pag, obs: window.gv('sObs'),
    formula: window.gv('sFormula'), prazo: window.gv('sPrazo') || null,
    tipoExame: window.gv('sTipoExame'), produtoDesc: window.gv('sProdutoDesc'),
    resultadoExame: window.gv('sResultadoExame') || null,
    laboratorio: window.gv('sLaboratorio') || null,
    criadoPor: window.STATE.user ? window.STATE.user.nome : '—',
  };

  window.closeModal('modalServico');
  var _clienteParaConfirm = (window.fromCache('clientes') || []).find(function (c) { return c.id === obj.clienteId; }) || null;

  window.dbSaveServico(obj).then(function (num) {
    window.clearCache('servicos');
    window.renderPage(window.STATE.page);
    setTimeout(function () {
      window.abrirConfirmServico(obj, _clienteParaConfirm, num);
    }, 150);
  });
}

// ══════════════════════════════════════════════════════════
//  MODAL EXAME DEDICADO
// ══════════════════════════════════════════════════════════
var _editandoExameId = null;

export function openModalExame(servicoId, clienteId) {
  _editandoExameId = servicoId || null;
  window._editandoExameId = _editandoExameId;
  var isEdit = !!servicoId;

  // Reset campos
  window.setVal('eClienteSearch', '');
  window.setVal('eTipoExameSelect', '');
  window.setVal('eData', new Date().toISOString().split('T')[0]);
  window.setVal('eValor', '');
  window.setVal('ePagamento', '');
  window.setVal('eObs', '');
  document.getElementById('eClienteId').value = '';
  document.getElementById('eClienteSelected').style.display = 'none';
  window.set('eClienteSelected', '');
  document.getElementById('eClienteResults').style.display = 'none';
  var chip = document.getElementById('eExameValorChip');
  if (chip) chip.style.display = 'none';

  // Carrega os exames dinamicamente do banco de dados e popula o select
  window.dbGetTiposExames().then(function (exames) {
    var selectEl = document.getElementById('eTipoExameSelect');
    if (selectEl) {
      selectEl.innerHTML = '<option value="">Selecione o exame...</option>' +
        exames.map(function (e) {
          return '<option value="' + e.nome + '|' + e.valor + '">' + e.nome + ' — R$ ' + parseFloat(e.valor).toFixed(2).replace('.', ',') + '</option>';
        }).join('');
    }

    if (isEdit) {
      var allSrv = window.fromCache('servicos') || [];
      var s = allSrv.find(function (x) { return x.id === servicoId; });
      if (!s) {
        window.dbGetServicos().then(function (all) {
          var srv = all.find(function (x) { return x.id === servicoId; });
          if (srv) openModalExame(servicoId, srv.clienteId);
        });
        return;
      }
      // Preencher cliente
      var clientes = window.fromCache('clientes') || [];
      var cl = clientes.find(function (c) { return c.id === s.clienteId; });
      if (cl) {
        document.getElementById('eClienteId').value = s.clienteId;
        window.set('eClienteSelected', '<strong>' + window.esc(cl.nome) + '</strong><button class="btn btn-icon btn-sm" onclick="clearClienteExame()" style="margin-left:.5rem">✕</button>');
        document.getElementById('eClienteSelected').style.display = 'flex';
        document.getElementById('mExameSub').textContent = 'Editando exame #' + window.padNum(s.orcNum) + ' — ' + cl.nome;
      } else {
        document.getElementById('mExameSub').textContent = 'Editando exame #' + window.padNum(s.orcNum);
      }
      // Preencher tipo de exame (encontrar option pelo nome)
      if (selectEl && s.tipoExame) {
        var found = false;
        for (var i = 0; i < selectEl.options.length; i++) {
          var opt = selectEl.options[i];
          var parts = opt.value.split('|');
          if (parts[0] === s.tipoExame) { selectEl.selectedIndex = i; found = true; break; }
        }
      }
      onExameTipoChange();
      var vRaw = parseFloat(s.valor) || 0;
      var vFmt = 'R$ ' + vRaw.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      window.setVal('eValor', vFmt);
      window.setVal('ePagamento', s.pagamento || '');
      window.setVal('eData', s.data || new Date().toISOString().split('T')[0]);
      window.setVal('eObs', s.obs || '');
      document.getElementById('mExameTitle').textContent = 'Editar Exame';
      document.querySelector('#modalExame .btn-primary[onclick="salvarExame()"]').textContent = '💾 Salvar Alterações';
    } else {
      // Modo criação
      if (clienteId) {
        var clientes2 = window.fromCache('clientes') || [];
        var cl2 = clientes2.find(function (c) { return c.id === clienteId; });
        if (cl2) {
          document.getElementById('eClienteId').value = clienteId;
          window.set('eClienteSelected', '<strong>' + window.esc(cl2.nome) + '</strong><button class="btn btn-icon btn-sm" onclick="clearClienteExame()" style="margin-left:.5rem">✕</button>');
          document.getElementById('eClienteSelected').style.display = 'flex';
          document.getElementById('mExameSub').textContent = 'Cliente: ' + cl2.nome;
        }
      } else {
        document.getElementById('mExameSub').textContent = 'Registrar exame para um cliente';
      }
      document.getElementById('mExameTitle').textContent = 'Registrar Exame';
      document.querySelector('#modalExame .btn-primary[onclick="salvarExame()"]').textContent = '🔬 Registrar Exame';
    }
  });

  window.openModal('modalExame');
}

export function onExameTipoChange() {
  var sel = document.getElementById('eTipoExameSelect');
  var chip = document.getElementById('eExameValorChip');
  if (!sel || !sel.value) { if (chip) chip.style.display = 'none'; return; }
  var parts = sel.value.split('|');
  var nome = parts[0] || '';
  var valor = parseFloat(parts[1]) || 0;
  var vFmt = 'R$ ' + valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  window.setVal('eValor', vFmt);
  if (chip) {
    chip.textContent = '💰 ' + nome + ' — ' + vFmt;
    chip.style.display = 'block';
  }
}

export var _exTimeout;
export function buscarClienteExame(q) {
  clearTimeout(_exTimeout);
  _exTimeout = setTimeout(function () {
    if (!q || q.length < 2) { document.getElementById('eClienteResults').style.display = 'none'; return; }
    var clientes = window.fromCache('clientes') || [];
    var found = clientes.filter(function (c) { return (c.nome + (c.tel || '')).toLowerCase().includes(q.toLowerCase()); }).slice(0, 6);
    var box = document.getElementById('eClienteResults');
    if (!found.length) {
      window.dbGetClientes().then(function (all) {
        var f2 = all.filter(function (c) { return (c.nome + (c.tel || '')).toLowerCase().includes(q.toLowerCase()); }).slice(0, 6);
        renderClienteExameDropdown(f2, box);
      });
      return;
    }
    renderClienteExameDropdown(found, box);
  }, 200);
}

export function renderClienteExameDropdown(clientes, box) {
  if (!clientes.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  box.innerHTML = '<div style="position:absolute;top:2px;left:0;right:0;background:#fff;border:1.5px solid var(--blue);border-radius:var(--r);box-shadow:var(--md);z-index:50;overflow:hidden">' +
    clientes.map(function (c) {
      return '<div onclick="selectClienteExame(\'' + c.id + '\')" style="padding:.65rem .9rem;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border)" onmouseenter="this.style.background=\'var(--bg)\'" onmouseleave="this.style.background=\'\'"><strong>' + window.esc(c.nome) + '</strong> <span style="color:var(--tx3)">' + window.esc(c.tel || '') + '</span></div>';
    }).join('') + '</div>';
}

export function selectClienteExame(id) {
  var clientes = window.fromCache('clientes') || [];
  var cl = clientes.find(function (c) { return c.id === id; });
  if (!cl) return;
  document.getElementById('eClienteId').value = id;
  document.getElementById('eClienteResults').style.display = 'none';
  window.set('eClienteSelected', '<strong>' + window.esc(cl.nome) + '</strong><button class="btn btn-icon btn-sm" onclick="clearClienteExame()" style="margin-left:.5rem">✕</button>');
  document.getElementById('eClienteSelected').style.display = 'flex';
  document.getElementById('mExameSub').textContent = 'Cliente: ' + cl.nome;
  window.setVal('eClienteSearch', cl.nome);
}

export function clearClienteExame() {
  document.getElementById('eClienteId').value = '';
  document.getElementById('eClienteSelected').style.display = 'none';
  window.setVal('eClienteSearch', '');
  document.getElementById('mExameSub').textContent = 'Registrar exame para um cliente';
}

export function cancelarModalExame() {
  var temDados = window.gv('eTipoExameSelect') || window.gv('eValor') || window.gv('eObs');
  if (temDados && !confirm('Descartar os dados preenchidos?')) return;
  window.closeModal('modalExame');
}

export function salvarExame() {
  var clienteId = document.getElementById('eClienteId').value;
  var tipoSel = document.getElementById('eTipoExameSelect').value;
  var data = window.gv('eData');
  var valor = window.gv('eValor');
  var pag = window.gv('ePagamento');
  var hasErr = false;
  if (!clienteId) { window.toast('Selecione um cliente.', 'er'); hasErr = true; }
  if (!tipoSel) { _setFieldErr('eTipoExameSelect'); if (!hasErr) window.toast('Selecione o tipo de exame.', 'er'); hasErr = true; }
  if (!data) { _setFieldErr('eData'); if (!hasErr) window.toast('Informe a data.', 'er'); hasErr = true; }
  if (!valor) { _setFieldErr('eValor'); if (!hasErr) window.toast('Informe o valor.', 'er'); hasErr = true; }
  if (!pag) { _setFieldErr('ePagamento'); if (!hasErr) window.toast('Selecione a forma de pagamento.', 'er'); hasErr = true; }
  if (hasErr) return;

  var tipoExameNome = tipoSel.split('|')[0];
  var valorNum = parseFloat(valor.replace(/[R$\s\.]/g, '').replace(',', '.')) || 0;

  var _clienteParaConfirm = (window.fromCache('clientes') || []).find(function (c) { return c.id === clienteId; }) || null;

  if (_editandoExameId) {
    var editId = _editandoExameId;
    var cached = window.fromCache('servicos') || [];
    var existing = cached.find(function (x) { return x.id === editId; }) || {};
    var changes = {
      clienteId: clienteId, tipo: 'exame', data: data,
      valor: valorNum, pagamento: pag, obs: window.gv('eObs') || null,
      tipoExame: tipoExameNome,
    };
    window.closeModal('modalExame');
    window.dbUpdateServico(editId, changes).then(function (num) {
      window.clearCache('servicos');
      window.renderPage(window.STATE.page);
      window.toast('Exame #' + window.padNum(num || existing.orcNum) + ' atualizado com sucesso!', 'ok');
      setTimeout(function () {
        var objFinal = Object.assign({}, existing, changes, { orcNum: num || existing.orcNum });
        window.abrirConfirmServico(objFinal, _clienteParaConfirm, num || existing.orcNum);
      }, 150);
    });
    _editandoExameId = null;
    window._editandoExameId = null;
    return;
  }

  var obj = {
    id: window.uid(), clienteId: clienteId, tipo: 'exame', data: data,
    valor: valorNum, pagamento: pag, obs: window.gv('eObs') || null,
    tipoExame: tipoExameNome,
    criadoPor: window.STATE.user ? window.STATE.user.nome : '—',
  };
  window.closeModal('modalExame');
  window.dbSaveServico(obj).then(function (num) {
    window.clearCache('servicos');
    window.renderPage(window.STATE.page);
    setTimeout(function () {
      window.abrirConfirmServico(obj, _clienteParaConfirm, num);
    }, 150);
  });
}

// Bind to window for global availability
window._editandoServicoId = _editandoServicoId;
window._editandoExameId = _editandoExameId;
window.openModalServico = openModalServico;
window.onTipoChange = onTipoChange;
window.cancelarModalServico = cancelarModalServico;
window.maskValorServico = maskValorServico;
window.updateSenhaCounter = updateSenhaCounter;
window.buscarClienteServico = buscarClienteServico;
window.renderClienteDropdown = renderClienteDropdown;
window.selectClienteServico = selectClienteServico;
window.clearClienteServico = clearClienteServico;
window._setFieldErr = _setFieldErr;
window.salvarServico = salvarServico;
window.openModalExame = openModalExame;
window.onExameTipoChange = onExameTipoChange;
window.buscarClienteExame = buscarClienteExame;
window.renderClienteExameDropdown = renderClienteExameDropdown;
window.selectClienteExame = selectClienteExame;
window.clearClienteExame = clearClienteExame;
window.cancelarModalExame = cancelarModalExame;
window.salvarExame = salvarExame;
