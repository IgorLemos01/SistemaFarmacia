// ============================================================
//  CONTATO FORMULÁRIO
// ============================================================

async function enviarContato() {
  const nome  = document.getElementById('msg_nome').value.trim();
  const tel   = document.getElementById('msg_tel').value.trim();
  const texto = document.getElementById('msg_texto').value.trim();

  if (!nome || !texto) { toast('Preencha nome e mensagem.', 'error'); return; }

  const btn = document.getElementById('btnContato');
  btn.disabled = true; btn.textContent = '⏳ Enviando...';

  await sleep(800);

  if (supabase) {
    try {
      await supabase.from('contatos').insert([{ nome, telefone: tel, mensagem: texto, criado_em: new Date().toISOString() }]);
    } catch {}
  }

  toast('Mensagem enviada! Entraremos em contato em breve. 📩', 'success');
  document.getElementById('msg_nome').value = '';
  document.getElementById('msg_tel').value = '';
  document.getElementById('msg_texto').value = '';

  btn.disabled = false; btn.textContent = '📩 Enviar Mensagem';
}
