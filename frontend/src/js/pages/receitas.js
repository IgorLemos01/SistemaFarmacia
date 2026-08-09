// ══════════════════════════════════════════════════════════
//  ABA: RECEITAS — pages/receitas.js
// ══════════════════════════════════════════════════════════

export function pgReceitas() {
  if (!window.canView('receitas')) {
    window.set('content', '<div class="alert alert-red">⛔ Você não tem permissão para acessar esta área.</div>');
    return;
  }
  var btn = document.getElementById('topActionBtn');
  if (window.canEdit('receitas')) { btn.style.display = ''; btn.textContent = '＋ Nova Receita'; }
  window.set('content',
    '<div class="card" style="margin-bottom:1.25rem">' +
    '<div class="card-head"><div class="card-title">📜 Receitas Médicas</div><div class="card-sub">Histórico de receitas e medicamentos dos pacientes</div></div>' +
    '<div style="display:flex;gap:1rem;align-items:flex-end;flex-wrap:wrap;padding:0 0 1rem">' +
    '<div class="fg" style="flex:1;min-width:200px"><label>Buscar por paciente ou medicamento</label><input id="receitaFilter" placeholder="Nome do paciente ou medicamento..." oninput="filtrarReceitas()" /></div>' +
    (window.canEdit('receitas') ? '<button class="btn btn-primary" onclick="openModalReceita()">＋ Nova Receita</button>' : '') +
    '</div>' +
    '</div>' +
    '<div id="receitasResult"><div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div></div>'
  );
  window.dbGetClientes().then(function () { filtrarReceitas(); });
}

export function filtrarReceitas() {
  var filterEl = document.getElementById('receitaFilter');
  var q = filterEl ? filterEl.value.toLowerCase() : '';
  var receitas = window.dbGetReceitas();
  var clientes = window.fromCache('clientes') || [];
  var filtradas = receitas.filter(function (r) {
    if (!q) return true;
    var cl = clientes.find(function (c) { return c.id === r.clienteId; });
    var nomePaciente = cl ? (cl.nome || '').toLowerCase() : '';
    var meds = (r.medicamentos || []).map(function (m) { return (m.nome || '').toLowerCase(); }).join(' ');
    return nomePaciente.includes(q) || meds.includes(q);
  });
  renderReceitasTable(filtradas, clientes);
}

export function renderReceitasTable(receitas, clientes) {
  if (!receitas.length) {
    window.set('receitasResult',
      '<div class="empty"><span class="empty-ico">📜</span><p class="empty-txt">Nenhuma receita encontrada</p>' +
      (window.canEdit('receitas') ? '<button class="btn btn-primary" style="margin-top:1rem" onclick="openModalReceita()">＋ Nova Receita</button>' : '') +
      '</div>'
    );
    return;
  }
  var html = '<div class="card"><div class="table-wrap"><table><thead><tr><th>#</th><th>Paciente</th><th>Data</th><th>Médico</th><th>Medicamentos</th><th>Ações</th></tr></thead><tbody>' +
    receitas.map(function (r, i) {
      var cl = clientes.find(function (c) { return c.id === r.clienteId; });
      var meds = (r.medicamentos || []).map(function (m) {
        return '<span class="badge badge-blue" style="margin:.1rem">💊 ' + window.esc(m.nome) + (m.dose ? ' ' + window.esc(m.dose) : '') + '</span>';
      }).join('');
      return '<tr>' +
        '<td class="td-muted">' + (i + 1) + '</td>' +
        '<td class="td-name">' + (cl ? window.esc(cl.nome) : '—') + (cl && cl.cpf ? '<div style="font-size:.72rem;color:var(--tx3)">CPF: ' + window.esc(cl.cpf) + '</div>' : '') + '</td>' +
        '<td class="td-muted">' + window.fmtDate(r.data) + '</td>' +
        '<td class="td-muted">' + window.esc(r.medico || '—') + '</td>' +
        '<td style="max-width:280px;line-height:1.8">' + (meds || '<span class="td-muted">—</span>') + '</td>' +
        '<td style="display:flex;gap:.3rem">' +
        '<button class="btn btn-sm btn-ghost" onclick="verReceita(\'' + r.id + '\')">👁 Ver</button>' +
        (window.canEdit('receitas') ? '<button class="btn btn-sm btn-ghost" onclick="excluirReceita(\'' + r.id + '\')">🗑️</button>' : '') +
        '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
  window.set('receitasResult', html);
}

export function verReceita(id) {
  var receitas = window.dbGetReceitas();
  var r = receitas.find(function (x) { return x.id === id; });
  if (!r) return;
  var clientes = window.fromCache('clientes') || [];
  var cl = clientes.find(function (c) { return c.id === r.clienteId; });
  var medsHtml = (r.medicamentos || []).map(function (m) {
    return '<div style="padding:.6rem .75rem;background:var(--blue-l);border-radius:var(--r);margin-bottom:.4rem">' +
      '<strong style="color:var(--blue)">💊 ' + window.esc(m.nome) + '</strong>' +
      (m.dose ? '<span style="font-size:.8rem;color:var(--tx3)"> — ' + window.esc(m.dose) + '</span>' : '') +
      (m.posologia ? '<div style="font-size:.8rem;color:var(--tx2);margin-top:.2rem">' + window.esc(m.posologia) + '</div>' : '') +
      '</div>';
  }).join('');
  document.getElementById('mOrcSub').textContent = 'Receita de ' + (cl ? cl.nome : '—');
  window.set('mOrcBody',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.85rem;margin-bottom:1.25rem">' +
    '<div><span style="color:var(--tx3)">Paciente:</span> <strong>' + (cl ? window.esc(cl.nome) : '—') + '</strong></div>' +
    '<div><span style="color:var(--tx3)">Data:</span> ' + window.fmtDate(r.data) + '</div>' +
    (cl && cl.cpf ? '<div><span style="color:var(--tx3)">CPF:</span> ' + window.esc(cl.cpf) + '</div>' : '') +
    (r.medico ? '<div><span style="color:var(--tx3)">Médico:</span> ' + window.esc(r.medico) + '</div>' : '') +
    '</div>' +
    '<div class="divider"></div>' +
    '<div style="font-size:.85rem;font-weight:600;margin-bottom:.75rem">Medicamentos</div>' +
    medsHtml +
    (r.obs ? '<div class="divider"></div><div style="font-size:.83rem"><strong>Obs:</strong> ' + window.esc(r.obs) + '</div>' : '') +
    '<div style="display:flex;gap:.75rem;margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border)">' +
    '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="closeModal(\'modalOrc\')">Fechar</button>' +
    '</div>'
  );
  window.openModal('modalOrc');
}

export function excluirReceita(id) {
  if (!confirm('Excluir esta receita permanentemente?')) return;
  var lista = window.dbGetReceitas().filter(function (r) { return r.id !== id; });
  localStorage.setItem('fc_receitas', JSON.stringify(lista));
  window.toast('Receita excluída.', 'ok');
  filtrarReceitas();
}

export function openModalReceita(editId) {
  document.getElementById('mReceitaTitle').textContent = editId ? 'Editar Receita' : 'Nova Receita';
  document.getElementById('modalReceita').dataset.editId = editId || '';
  window.setVal('rClienteSearch', '');
  window.setVal('rData', new Date().toISOString().split('T')[0]);
  window.setVal('rMedico', '');
  window.setVal('rObs', '');
  document.getElementById('rClienteId').value = '';
  document.getElementById('rClienteSelected').style.display = 'none';
  window.set('rClienteSelected', '');
  document.getElementById('rClienteResults').style.display = 'none';
  window._medCount = 0;
  window.set('rMedsContainer', '');
  window.adicionarMedicamento();
  if (editId) {
    var r = window.dbGetReceitas().find(function (x) { return x.id === editId; });
    if (r) {
      window.setVal('rData', r.data || '');
      window.setVal('rMedico', r.medico || '');
      window.setVal('rObs', r.obs || '');
      document.getElementById('rClienteId').value = r.clienteId || '';
      var clientes = window.fromCache('clientes') || [];
      var cl = clientes.find(function (c) { return c.id === r.clienteId; });
      if (cl) {
        window.set('rClienteSelected', '<strong>' + window.esc(cl.nome) + '</strong> — CPF: ' + window.esc(cl.cpf || '—') + '<button class="btn btn-icon btn-sm" onclick="clearClienteReceita()" style="margin-left:.5rem">✕</button>');
        document.getElementById('rClienteSelected').style.display = 'flex';
      }
      window.set('rMedsContainer', '');
      (r.medicamentos || []).forEach(function (m) { window.adicionarMedicamento(m); });
    }
  }
  window.openModal('modalReceita');
}

export var _rTimeout;
export function buscarClienteReceita(q) {
  clearTimeout(_rTimeout);
  _rTimeout = setTimeout(function () {
    if (!q || q.length < 2) { document.getElementById('rClienteResults').style.display = 'none'; return; }
    var clientes = window.fromCache('clientes') || [];
    var found = clientes.filter(function (c) {
      return (c.nome + (c.cpf || '') + (c.tel || '')).toLowerCase().includes(q.toLowerCase());
    }).slice(0, 6);
    var box = document.getElementById('rClienteResults');
    if (!found.length) {
      window.dbGetClientes().then(function (all) {
        var f2 = all.filter(function (c) { return (c.nome + (c.cpf || '') + (c.tel || '')).toLowerCase().includes(q.toLowerCase()); }).slice(0, 6);
        renderClienteReceitaDropdown(f2, box);
      });
      return;
    }
    renderClienteReceitaDropdown(found, box);
  }, 200);
}

export function renderClienteReceitaDropdown(clientes, box) {
  if (!clientes.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  box.innerHTML = '<div style="position:absolute;top:2px;left:0;right:0;background:#fff;border:1.5px solid var(--blue);border-radius:var(--r);box-shadow:var(--md);z-index:50;overflow:hidden">' +
    clientes.map(function (c) {
      return '<div onclick="selectClienteReceita(\'' + c.id + '\')" style="padding:.65rem .9rem;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border)" onmouseenter="this.style.background=\'var(--bg)\'" onmouseleave="this.style.background=\'\'">' +
        '<strong>' + window.esc(c.nome) + '</strong> <span style="color:var(--tx3)">' + (c.cpf ? 'CPF: ' + window.esc(c.cpf) : window.esc(c.tel || '')) + '</span></div>';
    }).join('') + '</div>';
}

export function selectClienteReceita(id) {
  var clientes = window.fromCache('clientes') || [];
  var cl = clientes.find(function (c) { return c.id === id; });
  if (!cl) return;
  document.getElementById('rClienteId').value = id;
  document.getElementById('rClienteResults').style.display = 'none';
  window.set('rClienteSelected', '<strong>' + window.esc(cl.nome) + '</strong> — CPF: ' + window.esc(cl.cpf || '—') + '<button class="btn btn-icon btn-sm" onclick="clearClienteReceita()" style="margin-left:.5rem">✕</button>');
  document.getElementById('rClienteSelected').style.display = 'flex';
  window.setVal('rClienteSearch', cl.nome);
}

export function clearClienteReceita() {
  document.getElementById('rClienteId').value = '';
  document.getElementById('rClienteSelected').style.display = 'none';
  window.setVal('rClienteSearch', '');
}

export var _medCount = 0;
export function adicionarMedicamento(dados) {
  var cont = document.getElementById('rMedsContainer');
  if (!cont) return;
  var idx = _medCount++;
  window._medCount = _medCount;
  var div = document.createElement('div');
  div.style.cssText = 'display:grid;grid-template-columns:1fr auto auto auto;gap:.4rem;align-items:center;background:var(--bg);padding:.6rem;border-radius:var(--r)';
  div.id = 'med_' + idx;
  div.innerHTML =
    '<input placeholder="Nome do medicamento *" value="' + window.esc((dados && dados.nome) || '') + '" id="med_nome_' + idx + '" style="font-size:.85rem" />' +
    '<input placeholder="Dose (ex: 500mg)" value="' + window.esc((dados && dados.dose) || '') + '" id="med_dose_' + idx + '" style="width:110px;font-size:.85rem" />' +
    '<input placeholder="Posologia" value="' + window.esc((dados && dados.posologia) || '') + '" id="med_pos_' + idx + '" style="width:160px;font-size:.85rem" />' +
    '<button type="button" class="btn btn-icon btn-sm" onclick="removerMedicamento(\'med_' + idx + '\')">🗑️</button>';
  cont.appendChild(div);
}

export function removerMedicamento(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
}

export function salvarReceita() {
  var clienteId = document.getElementById('rClienteId').value;
  var data = window.gv('rData');
  if (!clienteId) { window.toast('Selecione um paciente.', 'er'); return; }
  if (!data) { window.toast('Informe a data da receita.', 'er'); return; }
  var meds = [];
  document.querySelectorAll('#rMedsContainer > div').forEach(function (div) {
    var id = div.id.replace('med_', '');
    var nomeEl = document.getElementById('med_nome_' + id);
    var doseEl = document.getElementById('med_dose_' + id);
    var posEl = document.getElementById('med_pos_' + id);
    var nome = nomeEl ? nomeEl.value.trim() : '';
    var dose = doseEl ? doseEl.value.trim() : '';
    var pos = posEl ? posEl.value.trim() : '';
    if (nome) meds.push({ nome: nome, dose: dose, posologia: pos });
  });
  if (!meds.length) { window.toast('Adicione pelo menos um medicamento.', 'er'); return; }
  var editId = document.getElementById('modalReceita').dataset.editId;
  var obj = {
    id: editId || window.uid(),
    clienteId: clienteId,
    data: data,
    medico: window.gv('rMedico') || null,
    medicamentos: meds,
    obs: window.gv('rObs') || null,
    criadoPor: window.STATE.user ? window.STATE.user.nome : '—',
    criado_em: new Date().toISOString(),
  };
  
  // Como db.js lida com dbSaveReceita de forma global
  window.dbSaveReceita(obj);
  window.closeModal('modalReceita');
  window.toast('Receita salva com sucesso! ✅', 'ok');
  if (window.STATE.page === 'receitas') filtrarReceitas();
}

export function dbGetReceitas() {
  try { return JSON.parse(localStorage.getItem('fc_receitas') || '[]'); } catch (e) { return []; }
}

export function dbSaveReceita(obj) {
  var lista = dbGetReceitas();
  var idx = lista.findIndex(function (r) { return r.id === obj.id; });
  if (idx >= 0) lista[idx] = obj; else lista.unshift(obj);
  localStorage.setItem('fc_receitas', JSON.stringify(lista));
}

// Bind to window for global availability
window.pgReceitas = pgReceitas;
window.filtrarReceitas = filtrarReceitas;
window.renderReceitasTable = renderReceitasTable;
window.verReceita = verReceita;
window.excluirReceita = excluirReceita;
window.openModalReceita = openModalReceita;
window.buscarClienteReceita = buscarClienteReceita;
window.renderClienteReceitaDropdown = renderClienteReceitaDropdown;
window.selectClienteReceita = selectClienteReceita;
window.clearClienteReceita = clearClienteReceita;
window.adicionarMedicamento = adicionarMedicamento;
window.removerMedicamento = removerMedicamento;
window.salvarReceita = salvarReceita;
window.dbGetReceitas = dbGetReceitas;
window.dbSaveReceita = dbSaveReceita;
