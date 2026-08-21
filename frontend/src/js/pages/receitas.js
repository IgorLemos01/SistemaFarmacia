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
    '<div class="card-head" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem">' +
    '<div><div class="card-title">📜 Receitas Médicas</div><div class="card-sub">Histórico de receitas e medicamentos dos pacientes</div></div>' +
    (window.canEdit('receitas') ? '<button class="btn btn-ghost" style="font-size:.83rem" onclick="openGerenciarMedicamentos()">⚙️ Gerenciar Medicamentos</button>' : '') +
    '</div>' +
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
      
      var docHtml = '';
      if (cl) {
        var docs = [];
        if (cl.cpf) docs.push('CPF: ' + window.esc(cl.cpf));
        if (cl.rg) docs.push('RG: ' + window.esc(cl.rg));
        if (docs.length) docHtml = '<div style="font-size:.72rem;color:var(--tx3)">' + docs.join(' · ') + '</div>';
      }

      return '<tr>' +
        '<td class="td-muted">' + (i + 1) + '</td>' +
        '<td class="td-name">' + (cl ? window.esc(cl.nome) : '—') + docHtml + '</td>' +
        '<td class="td-muted">' + window.fmtDate(r.data) + '</td>' +
        '<td class="td-muted">' + window.esc(r.medico || '—') + '</td>' +
        '<td style="max-width:280px;line-height:1.8">' + (meds || '<span class="td-muted">—</span>') + '</td>' +
        '<td style="display:flex;gap:.3rem">' +
        '<button class="btn btn-sm btn-ghost" onclick="verReceita(\'' + r.id + '\')">👁 Ver</button>' +
        '<button class="btn btn-sm btn-ghost" title="Gerar PDF" onclick="gerarPDFReceitaById(\'' + r.id + '\')">📄 PDF</button>' +
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
    var details = [];
    if (m.rms) details.push('RMS: ' + window.esc(m.rms));
    if (m.lote) details.push('Lote: ' + window.esc(m.lote));
    if (m.validade) details.push('Validade: ' + window.esc(m.validade));
    if (m.laboratorio) details.push('Lab: ' + window.esc(m.laboratorio));
    if (m.quant) details.push('Quant: ' + window.esc(m.quant));
    var detailsHtml = details.length ? '<div style="font-size:.78rem;color:var(--tx3);margin-top:.2rem;display:flex;gap:.6rem;flex-wrap:wrap">' + details.join(' · ') + '</div>' : '';

    return '<div style="padding:.6rem .75rem;background:var(--blue-l);border-radius:var(--r);margin-bottom:.4rem">' +
      '<strong style="color:var(--blue)">💊 ' + window.esc(m.nome) + '</strong>' +
      (m.dose ? '<span style="font-size:.8rem;color:var(--tx3)"> — ' + window.esc(m.dose) + '</span>' : '') +
      (m.posologia ? '<div style="font-size:.8rem;color:var(--tx2);margin-top:.2rem">' + window.esc(m.posologia) + '</div>' : '') +
      detailsHtml +
      '</div>';
  }).join('');
  document.getElementById('mOrcSub').textContent = 'Receita de ' + (cl ? cl.nome : '—');
  window.set('mOrcBody',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;font-size:.85rem;margin-bottom:1.25rem">' +
    '<div><span style="color:var(--tx3)">Paciente:</span> <strong>' + (cl ? window.esc(cl.nome) : '—') + '</strong></div>' +
    '<div><span style="color:var(--tx3)">Data:</span> ' + window.fmtDate(r.data) + '</div>' +
    (cl && cl.cpf ? '<div><span style="color:var(--tx3)">CPF:</span> ' + window.esc(cl.cpf) + '</div>' : '') +
    (cl && cl.rg ? '<div><span style="color:var(--tx3)">RG:</span> ' + window.esc(cl.rg) + '</div>' : '') +
    (cl && cl.nasc ? '<div><span style="color:var(--tx3)">Nascimento:</span> ' + window.fmtDate(cl.nasc) + '</div>' : '') +
    (cl && cl.tel ? '<div><span style="color:var(--tx3)">Contato:</span> ' + window.esc(cl.tel) + '</div>' : '') +
    (r.medico ? '<div><span style="color:var(--tx3)">Médico:</span> ' + window.esc(r.medico) + '</div>' : '') +
    '</div>' +
    '<div class="divider"></div>' +
    '<div style="font-size:.85rem;font-weight:600;margin-bottom:.75rem">Medicamentos</div>' +
    medsHtml +
    (r.obs ? '<div class="divider"></div><div style="font-size:.83rem"><strong>Obs:</strong> ' + window.esc(r.obs) + '</div>' : '') +
    '<div style="display:flex;gap:.75rem;margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--border)">' +
    '<button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="closeModal(\'modalOrc\')">Fechar</button>' +
    '<button class="btn btn-primary" style="flex:1;justify-content:center" onclick="gerarPDFReceitaById(\'' + r.id + '\')">📄 Gerar PDF</button>' +
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
        var infoHtml = '<div style="width: 100%; display: flex; flex-direction: column; gap: 0.25rem;">' +
          '<div style="display: flex; justify-content: space-between; align-items: center;">' +
            '<strong>' + window.esc(cl.nome) + '</strong>' +
            '<button class="btn btn-icon btn-sm" onclick="clearClienteReceita()">x</button>' +
          '</div>' +
          '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; font-size: 0.78rem; color: var(--tx3); margin-top: 0.25rem;">' +
            '<div><span style="font-weight:600">CPF:</span> ' + window.esc(cl.cpf || '—') + '</div>' +
            '<div><span style="font-weight:600">RG:</span> ' + window.esc(cl.rg || '—') + '</div>' +
            '<div><span style="font-weight:600">Nascimento:</span> ' + (cl.nasc ? window.fmtDate(cl.nasc) : '—') + '</div>' +
            '<div><span style="font-weight:600">Contato:</span> ' + window.esc(cl.tel || '—') + '</div>' +
          '</div>' +
        '</div>';
        window.set('rClienteSelected', infoHtml);
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
  var q = document.getElementById('rClienteSearch').value.trim();
  if (!clientes.length && (!q || q.length < 2)) { box.style.display = 'none'; return; }
  box.style.display = 'block';

  var rowsHtml = clientes.map(function (c) {
    return '<div onclick="selectClienteReceita(\'' + c.id + '\')" style="padding:.65rem .9rem;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border)" onmouseenter="this.style.background=\'var(--bg)\'" onmouseleave="this.style.background=\'\'">' +
      '<strong>' + window.esc(c.nome) + '</strong> <span style="color:var(--tx3)">' + (c.cpf ? 'CPF: ' + window.esc(c.cpf) : window.esc(c.tel || '')) + '</span></div>';
  }).join('');

  var addRowHtml = '<div onclick="window.openModalClienteFromSearch(\'' + window.esc(q).replace(/'/g, "\\'") + '\', \'rClienteId\', \'rClienteResults\', \'selectClienteReceita\')" style="padding:.7rem .9rem;cursor:pointer;font-size:.83rem;color:var(--blue);background:var(--blue-l);display:flex;align-items:center;gap:.4rem;font-weight:600;transition:background .2s" onmouseenter="this.style.background=\'rgba(0,48,135,0.1)\'" onmouseleave="this.style.background=\'var(--blue-l)\'">' +
    '<span>＋ Cadastrar novo cliente ' + (q ? '<strong>"' + window.esc(q) + '"</strong>' : '') + '</span>' +
    '</div>';

  var emptyHeader = '';
  if (!clientes.length) {
    emptyHeader = '<div style="padding:.65rem .9rem;font-size:.8rem;color:var(--tx3);border-bottom:1px solid var(--border);background:#fff">Nenhum cliente encontrado</div>';
  }

  box.innerHTML = '<div style="position:absolute;top:2px;left:0;right:0;background:#fff;border:1.5px solid var(--blue);border-radius:var(--r);box-shadow:var(--md);z-index:50;overflow:hidden">' +
    emptyHeader +
    rowsHtml +
    addRowHtml +
    '</div>';
}

export function selectClienteReceita(id) {
  var clientes = window.fromCache('clientes') || [];
  var cl = clientes.find(function (c) { return c.id === id; });
  if (!cl) return;
  document.getElementById('rClienteId').value = id;
  document.getElementById('rClienteResults').style.display = 'none';
  var infoHtml = '<div style="width: 100%; display: flex; flex-direction: column; gap: 0.25rem;">' +
    '<div style="display: flex; justify-content: space-between; align-items: center;">' +
      '<strong>' + window.esc(cl.nome) + '</strong>' +
      '<button class="btn btn-icon btn-sm" onclick="clearClienteReceita()">x</button>' +
    '</div>' +
    '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; font-size: 0.78rem; color: var(--tx3); margin-top: 0.25rem;">' +
      '<div><span style="font-weight:600">CPF:</span> ' + window.esc(cl.cpf || '—') + '</div>' +
      '<div><span style="font-weight:600">RG:</span> ' + window.esc(cl.rg || '—') + '</div>' +
      '<div><span style="font-weight:600">Nascimento:</span> ' + (cl.nasc ? window.fmtDate(cl.nasc) : '—') + '</div>' +
      '<div><span style="font-weight:600">Contato:</span> ' + window.esc(cl.tel || '—') + '</div>' +
    '</div>' +
  '</div>';
  window.set('rClienteSelected', infoHtml);
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
  div.style.cssText = 'display:flex;flex-direction:column;gap:.4rem;background:var(--bg);padding:.75rem;border-radius:var(--r);border:1px solid var(--border);position:relative';
  div.id = 'med_' + idx;
  div.innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 120px 160px auto;gap:.4rem;align-items:center">' +
      '<div style="position:relative">' +
        '<input placeholder="💊 Nome do medicamento *" value="' + window.esc((dados && dados.nome) || '') + '" id="med_nome_' + idx + '" style="font-size:.85rem;width:100%" autocomplete="off" oninput="buscarMedAutocomplete(this,' + idx + ')" onfocus="buscarMedAutocomplete(this,' + idx + ')" />' +
        '<div id="med_ac_' + idx + '" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:99;background:#fff;border:1.5px solid var(--blue);border-radius:var(--r);box-shadow:var(--md);max-height:220px;overflow-y:auto"></div>' +
      '</div>' +
      '<input placeholder="Dose (ex: 500mg)" value="' + window.esc((dados && dados.dose) || '') + '" id="med_dose_' + idx + '" style="width:120px;font-size:.85rem" />' +
      '<input placeholder="Posologia" value="' + window.esc((dados && dados.posologia) || '') + '" id="med_pos_' + idx + '" style="width:160px;font-size:.85rem" />' +
      '<button type="button" class="btn btn-icon btn-sm" onclick="removerMedicamento(\'med_' + idx + '\')">🗑️</button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:.4rem">' +
      '<input placeholder="RMS" value="' + window.esc((dados && dados.rms) || '') + '" id="med_rms_' + idx + '" style="font-size:.8rem" />' +
      '<input placeholder="Lote" value="' + window.esc((dados && dados.lote) || '') + '" id="med_lote_' + idx + '" style="font-size:.8rem" />' +
      '<input placeholder="Validade" value="' + window.esc((dados && dados.validade) || '') + '" id="med_validade_' + idx + '" style="font-size:.8rem" />' +
      '<input placeholder="Laboratório" value="' + window.esc((dados && dados.laboratorio) || '') + '" id="med_laboratorio_' + idx + '" style="font-size:.8rem" />' +
      '<input placeholder="Quant" value="' + window.esc((dados && dados.quant) || '') + '" id="med_quant_' + idx + '" style="font-size:.8rem" />' +
    '</div>';
  cont.appendChild(div);
}

var _medAcTimeout;
export function buscarMedAutocomplete(input, idx) {
  clearTimeout(_medAcTimeout);
  var box = document.getElementById('med_ac_' + idx);
  if (!box) return;
  var q = (input.value || '').toLowerCase().trim();
  _medAcTimeout = setTimeout(function () {
    window.dbGetMedicamentos().then(function (lista) {
      var filtrados = q
        ? lista.filter(function (m) { return (m.nome || '').toLowerCase().includes(q); })
        : lista;
      filtrados = filtrados.slice(0, 12);
      if (!filtrados.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
      box.style.display = 'block';
      box.innerHTML = filtrados.map(function (m) {
        var sub = [m.rms ? 'RMS: ' + m.rms : '', m.laboratorio || ''].filter(Boolean).join(' · ');
        return '<div style="padding:.6rem .9rem;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border)" ' +
          'onmousedown="selecionarMedAutocomplete(' + idx + ',\'' + m.id + '\')" ' +
          'onmouseenter="this.style.background=\'var(--blue-l)\'" onmouseleave="this.style.background=\'\'">'
          + '<strong>' + window.esc(m.nome) + '</strong>' +
          (sub ? '<div style="font-size:.75rem;color:var(--tx3)">' + window.esc(sub) + '</div>' : '') +
          '</div>';
      }).join('');
    });
  }, 150);
}

export function selecionarMedAutocomplete(idx, medId) {
  window.dbGetMedicamentos().then(function (lista) {
    var m = lista.find(function (x) { return x.id === medId; });
    if (!m) return;
    var setV = function (id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; };
    setV('med_nome_' + idx, m.nome);
    setV('med_rms_' + idx, m.rms);
    setV('med_laboratorio_' + idx, m.laboratorio);
    setV('med_dose_' + idx, m.dose);
    setV('med_pos_' + idx, m.posologia);
    var box = document.getElementById('med_ac_' + idx);
    if (box) { box.style.display = 'none'; box.innerHTML = ''; }
  });
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
    var rmsEl = document.getElementById('med_rms_' + id);
    var loteEl = document.getElementById('med_lote_' + id);
    var validadeEl = document.getElementById('med_validade_' + id);
    var labEl = document.getElementById('med_laboratorio_' + id);
    var quantEl = document.getElementById('med_quant_' + id);

    var nome = nomeEl ? nomeEl.value.trim() : '';
    var dose = doseEl ? doseEl.value.trim() : '';
    var pos = posEl ? posEl.value.trim() : '';
    var rms = rmsEl ? rmsEl.value.trim() : '';
    var lote = loteEl ? loteEl.value.trim() : '';
    var validade = validadeEl ? validadeEl.value.trim() : '';
    var laboratorio = labEl ? labEl.value.trim() : '';
    var quant = quantEl ? quantEl.value.trim() : '';

    if (nome) {
      meds.push({
        nome: nome,
        dose: dose,
        posologia: pos,
        rms: rms,
        lote: lote,
        validade: validade,
        laboratorio: laboratorio,
        quant: quant
      });
    }
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

// ══════════════════════════════════════════════════════════
//  GERENCIAR MEDICAMENTOS — catálogo
// ══════════════════════════════════════════════════════════

var _editandoMedId = null;

export function openGerenciarMedicamentos() {
  window.dbGetMedicamentos().then(function (lista) {
    var rows = lista.length
      ? lista.map(function (m) {
          return '<div style="display:flex;align-items:center;gap:.75rem;padding:.65rem .85rem;background:var(--bg);border-radius:var(--r);margin-bottom:.4rem">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:600;font-size:.88rem">' + window.esc(m.nome) + '</div>' +
              '<div style="font-size:.75rem;color:var(--tx3)">' +
                [m.rms ? 'RMS: ' + m.rms : '', m.laboratorio || '', m.dose || ''].filter(Boolean).join(' · ') +
              '</div>' +
            '</div>' +
            '<button class="btn btn-icon btn-sm" title="Editar" onclick="openModalMedicamento(\'' + m.id + '\')">✏️</button>' +
            '<button class="btn btn-icon btn-sm" title="Excluir" onclick="excluirMedicamento(\'' + m.id + '\')" style="color:var(--red)">🗑️</button>' +
            '</div>';
        }).join('')
      : '<div class="empty"><span class="empty-ico">💊</span><p class="empty-txt">Nenhum medicamento cadastrado</p></div>';

    document.getElementById('mOrcSub').textContent = 'Catálogo de medicamentos';
    window.set('mOrcBody',
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">' +
      '<div style="font-weight:600;font-size:.9rem">' + lista.length + ' medicamento(s) cadastrado(s)</div>' +
      '<button class="btn btn-primary btn-sm" style="font-size:.82rem" onclick="openModalMedicamento()">＋ Novo Medicamento</button>' +
      '</div>' +
      '<div style="max-height:55vh;overflow-y:auto">' + rows + '</div>'
    );
    window.openModal('modalOrc');
  });
}

export function openModalMedicamento(id) {
  _editandoMedId = id || null;
  if (id) {
    window.dbGetMedicamentos().then(function (lista) {
      var m = lista.find(function (x) { return x.id === id; });
      if (!m) return;
      document.getElementById('mmNome').value = m.nome || '';
      document.getElementById('mmRms').value = m.rms || '';
      document.getElementById('mmLaboratorio').value = m.laboratorio || '';
      document.getElementById('mmDose').value = m.dose || '';
      document.getElementById('mmPosologia').value = m.posologia || '';
      document.getElementById('mMedTitle').textContent = 'Editar Medicamento';
      window.openModal('modalMedicamento');
    });
  } else {
    ['mmNome','mmRms','mmLaboratorio','mmDose','mmPosologia'].forEach(function (id) {
      document.getElementById(id).value = '';
    });
    document.getElementById('mMedTitle').textContent = 'Novo Medicamento';
    window.openModal('modalMedicamento');
  }
}

export function salvarMedicamento() {
  var nome = document.getElementById('mmNome').value.trim();
  if (!nome) { window.toast('Informe o nome do medicamento.', 'er'); return; }
  var obj = {
    id: _editandoMedId || window.uid(),
    nome: nome,
    rms: document.getElementById('mmRms').value.trim(),
    laboratorio: document.getElementById('mmLaboratorio').value.trim(),
    dose: document.getElementById('mmDose').value.trim(),
    posologia: document.getElementById('mmPosologia').value.trim(),
  };
  var fn = _editandoMedId
    ? window.dbUpdateMedicamento(_editandoMedId, obj)
    : window.dbSaveMedicamento(obj);
  Promise.resolve(fn).then(function () {
    window.clearCache('medicamentos');
    window.closeModal('modalMedicamento');
    window.toast((_editandoMedId ? 'Medicamento atualizado' : 'Medicamento cadastrado') + ' com sucesso! ✅', 'ok');
    _editandoMedId = null;
    openGerenciarMedicamentos();
  });
}

export function excluirMedicamento(id) {
  if (!confirm('Excluir este medicamento do catálogo?')) return;
  window.dbDeleteMedicamento(id).then(function () {
    window.clearCache('medicamentos');
    window.toast('Medicamento excluído.', 'ok');
    openGerenciarMedicamentos();
  });
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
window.buscarMedAutocomplete = buscarMedAutocomplete;
window.selecionarMedAutocomplete = selecionarMedAutocomplete;
window.removerMedicamento = removerMedicamento;
window.salvarReceita = salvarReceita;
window.dbGetReceitas = dbGetReceitas;
window.dbSaveReceita = dbSaveReceita;
window.openGerenciarMedicamentos = openGerenciarMedicamentos;
window.openModalMedicamento = openModalMedicamento;
window.salvarMedicamento = salvarMedicamento;
window.excluirMedicamento = excluirMedicamento;
