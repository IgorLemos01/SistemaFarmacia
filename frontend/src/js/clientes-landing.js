// ============================================================
//  CADASTRAR E LISTAR CLIENTES
// ============================================================

async function cadastrarCliente() {
  if (!currentUser) { toast('Faça login primeiro.', 'error'); return; }

  const campos = {
    nome:     document.getElementById('c_nome').value.trim(),
    cpf:      document.getElementById('c_cpf').value.trim(),
    telefone: document.getElementById('c_telefone').value.trim(),
    email:    document.getElementById('c_email').value.trim(),
    endereco: document.getElementById('c_endereco').value.trim(),
    cidade:   document.getElementById('c_cidade').value.trim(),
    estado:   document.getElementById('c_estado').value,
    produto:  document.getElementById('c_produto').value,
    obs:      document.getElementById('c_obs').value.trim(),
  };

  if (!campos.nome || !campos.cpf || !campos.telefone || !campos.endereco || !campos.cidade || !campos.produto) {
    toast('Preencha todos os campos obrigatórios (*).', 'error'); return;
  }

  if (!validarCPF(campos.cpf)) {
    toast('CPF inválido. Verifique o número.', 'error'); return;
  }

  const btn = document.getElementById('btnCadastrar');
  btn.disabled = true; btn.textContent = '⏳ Salvando...';

  const registro = {
    ...campos,
    atendente: currentUser.nome,
    atendente_user: currentUser.user,
    criado_em: new Date().toISOString(),
  };

  let sucesso = false;

  // Tenta salvar no Supabase
  if (supabase) {
    try {
      const { error } = await supabase.from('clientes').insert([registro]);
      if (error) throw error;
      sucesso = true;
    } catch (e) {
      console.error('Supabase error:', e);
      toast('⚠️ Supabase não configurado. Salvando localmente.', 'info');
    }
  }

  // Fallback: salvar no localStorage
  if (!sucesso) {
    const lista = JSON.parse(localStorage.getItem('fc_clientes') || '[]');
    lista.push({ ...registro, id: Date.now() });
    localStorage.setItem('fc_clientes', JSON.stringify(lista));
    sucesso = true;
  }

  if (sucesso) {
    toast(`Cliente ${campos.nome} cadastrado com sucesso! ✅`, 'success');
    limparFormCadastro();
  }

  btn.disabled = false; btn.textContent = '💾 Salvar Cadastro';
}

function limparFormCadastro() {
  ['c_nome','c_cpf','c_telefone','c_email','c_endereco','c_cidade','c_obs'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('c_produto').value = '';
  document.getElementById('c_estado').value = 'SE';
}

async function carregarClientes() {
  const container = document.getElementById('clientesList');
  container.innerHTML = '<p style="color:var(--gray);text-align:center;padding:2rem">⏳ Carregando...</p>';

  let clientes = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(50);
      if (!error && data) clientes = data;
    } catch (e) {
      console.error(e);
    }
  }

  // Merge com localStorage
  const local = JSON.parse(localStorage.getItem('fc_clientes') || '[]');
  if (local.length > 0 && clientes.length === 0) {
    clientes = local.reverse();
  }

  if (clientes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="icon">🙁</span>
        <p>Nenhum cliente cadastrado ainda.</p>
      </div>`;
    return;
  }

  const html = clientes.map(c => `
    <div class="cliente-row">
      <div>
        <div class="cliente-row-name">${c.nome}</div>
        <div class="cliente-row-meta">📞 ${c.telefone} · ${c.cidade}/${c.estado} · Atendente: ${c.atendente || '—'}</div>
        <div class="cliente-row-meta" style="margin-top:2px">${formatDate(c.criado_em)}</div>
      </div>
      <span class="cliente-row-produto">${c.produto || '—'}</span>
    </div>
  `).join('');

  container.innerHTML = `<div class="clientes-list">${html}</div>
    <p style="text-align:center;margin-top:1rem;color:var(--gray);font-size:0.8rem">
      ${clientes.length} cliente(s) encontrado(s)
    </p>`;
}
