// ══════════════════════════════════════════════════════════
//  ABA: USUÁRIOS — pages/usuarios.js
// ══════════════════════════════════════════════════════════

export function pgUsuarios() {
  if (!window.canEdit('usuarios')) {
    window.set('content', '<div class="alert alert-red">⛔ Acesso restrito a administradores.</div>'); return;
  }
  var btn = document.getElementById('topActionBtn');
  btn.style.display = ''; btn.textContent = '＋ Novo Usuário';
  window.set('content', '<div class="card"><div style="text-align:center;padding:2rem;color:var(--tx3)">⏳ Carregando...</div></div>');
  window.dbGetUsers().then(function (users) {
    var ativos = users.filter(function (u) { return u.ativo !== false; }).length;
    function permSummary(u) {
      return window.MODULOS.map(function (m) {
        var v = (u.perms || {})[m.key] || 'none';
        if (v === 'none') return '';
        var cls = v === 'edit' ? 'pchip-edit' : 'pchip-read';
        var lbl = v === 'edit' ? '✏️ ' + m.label : '👁 ' + m.label;
        return '<span class="perm-chip ' + cls + '">' + lbl + '</span>';
      }).join('');
    }
    window.set('content',
      '<div class="card">' +
      '<div class="card-head"><div><div class="card-title">Usuários do Sistema</div><div class="card-sub">Gerencie acessos, perfis e permissões</div></div>' +
      '<button class="btn btn-primary" onclick="openModalUsuario()">＋ Novo Usuário</button></div>' +
      (ativos <= 1 ? '<div class="alert alert-yellow" style="margin-bottom:1.25rem"><div>Apenas <strong>1 usuário ativo</strong>. Crie mais para garantir continuidade de acesso.</div></div>' : '') +
      '<div class="table-wrap"><table>' +
      '<thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Módulos</th><th>Status</th><th>Últ. acesso</th><th>Criado em</th><th>Ações</th></tr></thead>' +
      '<tbody>' +
      users.map(function (u) {
        var pf = window.PERFIS[u.perfil] || { label: '?', cor: 'badge-gray' };
        var ult = u.ultimoAcesso ? window.fmtDate(u.ultimoAcesso.split('T')[0]) : '—';
        var cria = u.criado_em ? window.fmtDate(u.criado_em.split('T')[0]) : '—';
        return '<tr>' +
          '<td class="td-name">' + window.esc(u.nome) + '</td>' +
          '<td class="td-muted">' + window.esc(u.email) + '</td>' +
          '<td><span class="badge ' + pf.cor + '">' + pf.label + '</span></td>' +
          '<td style="max-width:240px;line-height:1.8">' + (u.perfil === 'admin' ? '<span style="font-size:.75rem;color:var(--tx3)">Acesso total</span>' : permSummary(u)) + '</td>' +
          '<td>' + (u.ativo !== false ? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-gray">Inativo</span>') + '</td>' +
          '<td class="td-muted">' + ult + '</td>' +
          '<td class="td-muted">' + cria + '</td>' +
          '<td style="display:flex;gap:.4rem;align-items:center">' +
          (u.perfil !== 'admin' ? '<button class="btn btn-sm btn-ghost" onclick="openModalUsuario(\'' + u.id + '\')" title="Editar">✏️</button><button class="btn btn-sm btn-ghost" onclick="toggleUser(\'' + u.id + '\',' + !(u.ativo !== false) + ')">' + (u.ativo !== false ? 'Desativar' : 'Ativar') + '</button><button class="btn btn-sm btn-ghost" onclick="excluirUsuario(\'' + u.id + '\')" title="Excluir">🗑️</button>' : '<span style="font-size:.75rem;color:var(--tx3)">🔒</span>') +
          '<button class="btn btn-sm btn-ghost" title="Atividade" onclick="verAtividadeUsuario(\'' + u.id + '\')">📊</button>' +
          '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>' +
      '</div>'
    );
  });
}

export function toggleUser(id, ativo) {
  var msg = ativo ? 'Ativar este usuário?' : 'Desativar este usuário? Ele perderá acesso ao sistema.';
  if (!confirm(msg)) return;
  window.dbToggleUser(id, ativo).then(function () {
    window.clearCache('users');
    pgUsuarios();
    window.toast('Status do usuário atualizado.', 'ok');
  });
}

export function excluirUsuario(id) {
  if (!confirm('Tem certeza que deseja excluir permanentemente este usuário? Esta ação não pode ser desfeita.')) return;
  window.dbDeleteUser(id).then(function () {
    window.clearCache('users');
    pgUsuarios();
    window.toast('Usuário excluído com sucesso.', 'ok');
  });
}

export function verAtividadeUsuario(userId) {
  Promise.all([window.dbGetServicos(), window.dbGetUsers()]).then(function (r) {
    var user = r[1].find(function (u) { return u.id === userId; });
    if (!user) return;
    var srvs = r[0].filter(function (s) { return (s.criadoPor || '') === (user.nome || ''); }).slice(0, 20);
    document.getElementById('mOrcSub').textContent = 'Atividade de ' + window.esc(user.nome);
    window.set('mOrcBody',
      '<p style="font-size:.83rem;color:var(--tx3);margin-bottom:1rem">Serviços registrados por este usuário</p>' +
      (srvs.length === 0 ? '<div class="empty"><span class="empty-ico">📋</span><p class="empty-txt">Nenhum serviço registrado por este usuário</p></div>' :
        '<div class="table-wrap"><table><thead><tr><th>Orç#</th><th>Tipo</th><th>Valor</th><th>Pagamento</th><th>Data</th></tr></thead><tbody>' +
        srvs.map(function (s) { return '<tr><td><span class="orc-num">#' + window.padNum(s.orcNum) + '</span></td><td>' + window.tipoBadge(s.tipo) + '</td><td style="font-weight:600">' + window.fmt(s.valor) + '</td><td>' + window.pagBadge(s.pagamento) + '</td><td class="td-muted">' + window.fmtDate(s.data) + '</td></tr>'; }).join('') +
        '</tbody></table></div>')
    );
    window.openModal('modalOrc');
  });
}

export function openModalUsuario(editId) {
  var u = editId ? window.fromCache('users').find(function (x) { return x.id === editId; }) : null;
  document.getElementById('mUsuarioTitle').textContent = u ? 'Editar Usuário' : 'Novo Usuário';
  document.getElementById('modalUsuario').dataset.editId = editId || '';
  window.setVal('uNome', u ? u.nome : '');
  window.setVal('uEmail', u ? u.email : '');
  
  var uSenhaEl = document.getElementById('uSenha');
  if (uSenhaEl) {
    if (editId) {
      uSenhaEl.disabled = true;
      uSenhaEl.placeholder = 'Alteração indisponível por segurança';
      uSenhaEl.value = '';
    } else {
      uSenhaEl.disabled = false;
      uSenhaEl.placeholder = 'Mínimo 6 caracteres';
      uSenhaEl.value = '';
    }
  }

  window.setVal('uPerfil', u ? u.perfil : 'atendente');
  var defaultPerms = u ? u.perms : (window.PERFIS.atendente.perms);
  window.clearFieldErr('uEmail'); window.clearFieldErr('uSenha');
  var errS = document.getElementById('uSenhaErr'); if (errS) errS.style.display = 'none';
  window.updateSenhaCounter();
  renderPermGrid(defaultPerms);
  window.openModal('modalUsuario');
}

export function onPerfilChange() {
  var perfil = document.getElementById('uPerfil').value;
  renderPermGrid((window.PERFIS[perfil] || window.PERFIS.atendente).perms);
}

export function renderPermGrid(currentPerms) {
  currentPerms = currentPerms || {};
  var html = window.MODULOS.map(function (m) {
    var val = currentPerms[m.key] || 'none';
    var opts = m.key === 'usuarios'
      ? [
        { v: 'none', lbl: 'Sem acesso', cls: 'active-none' },
        { v: 'edit', lbl: '✏️ Criar/Editar', cls: 'active-edit' },
      ]
      : [
        { v: 'none', lbl: 'Sem acesso', cls: 'active-none' },
        { v: 'read', lbl: '👁 Só leitura', cls: 'active-read' },
        { v: 'edit', lbl: '✏️ Ler e editar', cls: 'active-edit' },
      ];
    var btns = opts.map(function (o) {
      var active = val === o.v ? ' ' + o.cls : '';
      return '<button type="button" class="perm-seg-btn' + active + '" onclick="setPermVal(\'' + m.key + '\',\'' + o.v + '\')" id="pseg_' + m.key + '_' + o.v + '">' + o.lbl + '</button>';
    }).join('');
    var rowClass = val !== 'none' ? ' has-access' : '';
    return '<div class="perm-row' + rowClass + '" id="prow_' + m.key + '">'
      + '<div><span class="perm-module-ico">' + m.ico + '</span>'
      + '<span class="perm-label">' + m.label + '</span>'
      + '<div class="perm-sub" style="padding-left:1.4rem">' + m.sub + '</div></div>'
      + '<div class="perm-seg">' + btns + '</div>'
      + '</div>';
  }).join('');
  window.set('permGrid', html);
}

export function setPermVal(modKey, val) {
  var row = document.getElementById('prow_' + modKey);
  if (!row) return;
  row.className = 'perm-row' + (val !== 'none' ? ' has-access' : '');
  var btns = row.querySelectorAll('.perm-seg-btn');
  btns.forEach(function (b) {
    b.className = b.className.replace(/\s*(active-none|active-read|active-edit)/g, '');
    if (b.id === 'pseg_' + modKey + '_' + val) {
      var cls = val === 'none' ? 'active-none' : val === 'read' ? 'active-read' : 'active-edit';
      b.className += ' ' + cls;
    }
  });
}

export function getPermGridValues() {
  var perms = {};
  window.MODULOS.forEach(function (m) {
    var val = 'none';
    ['none', 'read', 'edit'].forEach(function (v) {
      var btn = document.getElementById('pseg_' + m.key + '_' + v);
      if (btn && btn.className.includes('active-')) {
        if (btn.className.includes('active-none')) val = 'none';
        else if (btn.className.includes('active-read')) val = 'read';
        else if (btn.className.includes('active-edit')) val = 'edit';
      }
    });
    perms[m.key] = val;
  });
  return perms;
}

export function salvarUsuario() {
  var editId = document.getElementById('modalUsuario').dataset.editId;
  var nome = window.gv('uNome');
  var email = window.gv('uEmail').toLowerCase();
  var senha = window.gv('uSenha');
  var perfil = document.getElementById('uPerfil').value;
  if (!nome || !email) { window.toast('Preencha nome e e-mail.', 'er'); return; }
  if (!editId && !senha) {
    var errS = document.getElementById('uSenhaErr');
    if (errS) { errS.textContent = 'Defina uma senha para o novo usuário.'; errS.style.display = 'block'; }
    window._setFieldErr('uSenha');
    return;
  }
  if (senha && senha.length < 6) {
    var errS2 = document.getElementById('uSenhaErr');
    if (errS2) { errS2.textContent = 'Senha deve ter ao menos 6 caracteres.'; errS2.style.display = 'block'; }
    window._setFieldErr('uSenha');
    return;
  }
  var users = window.fromCache('users') || [];
  if (!editId) {
    if (users.find(function (u) { return u.email === email; })) {
      var errE = document.getElementById('uEmailErr');
      if (errE) { errE.textContent = 'Este e-mail já está cadastrado.'; errE.style.display = 'block'; }
      window._setFieldErr('uEmail');
      return;
    }
  }
  var perms = getPermGridValues();
  if (editId) {
    var found = users.find(function (u) { return u.id === editId; });
    var updated = Object.assign({}, found, { nome: nome, email: email, perfil: perfil, perms: perms });
    window.dbSaveUser(updated, true).then(function () {
      window.clearCache('users');
      window.closeModal('modalUsuario');
      window.toast('Usuário ' + nome + ' atualizado!', 'ok');
      pgUsuarios();
    });
  } else {
    var obj = { id: window.uid(), nome: nome, email: email, senha: senha, perfil: perfil, perms: perms, ativo: true, criado_em: new Date().toISOString() };
    if (window.sb) {
      window.sb.auth.signUp({ email: email, password: senha }).then(function (r) {
        if (r.error) {
          console.warn('Auth signUp aviso:', r.error.message);
          window.toast('Aviso ao criar no Auth: ' + r.error.message, 'yw');
        }
        obj.auth_id = r.data && r.data.user ? r.data.user.id : null;
        window.dbSaveUser(obj, false).then(function () {
          window.clearCache('users');
          window.closeModal('modalUsuario');
          window.toast('Usuário ' + nome + ' criado com sucesso!', 'ok');
          pgUsuarios();
        });
      }).catch(function (e) {
        console.error('Erro ao criar usuário:', e);
        window.dbSaveUser(obj, false).then(function () {
          window.clearCache('users');
          window.closeModal('modalUsuario');
          window.toast('Usuário ' + nome + ' salvo localmente.', 'yw');
          pgUsuarios();
        });
      });
    } else {
      window.dbSaveUser(obj, false).then(function () {
        window.clearCache('users');
        window.closeModal('modalUsuario');
        window.toast('Usuário ' + nome + ' criado!', 'ok');
        pgUsuarios();
      });
    }
  }
}

// Bind to window for global availability
window.pgUsuarios = pgUsuarios;
window.toggleUser = toggleUser;
window.excluirUsuario = excluirUsuario;
window.verAtividadeUsuario = verAtividadeUsuario;
window.openModalUsuario = openModalUsuario;
window.onPerfilChange = onPerfilChange;
window.renderPermGrid = renderPermGrid;
window.setPermVal = setPermVal;
window.getPermGridValues = getPermGridValues;
window.salvarUsuario = salvarUsuario;
