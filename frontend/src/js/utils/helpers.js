// ══════════════════════════════════════════════════════════
//  HELPERS E UTILITÁRIOS — utils/helpers.js
// ══════════════════════════════════════════════════════════

export function set(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
export function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
export function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
export function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
export function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
export function padNum(n) { return String(n || 0).padStart(4, '0'); }
export function fmt(v) { return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

export function fmtDate(d) {
  if (!d) return '-';
  try { var dt = new Date(d + 'T12:00:00'); return dt.toLocaleDateString('pt-BR'); } catch (e) { return d; }
}

export function tipoBadge(t) {
  var map = { manipulacao: '<span class="badge badge-purple">Manipula\u00e7\u00e3o</span>', exame: '<span class="badge badge-blue">Exame</span>', produto: '<span class="badge badge-green">Produto</span>' };
  return map[t] || '<span class="badge badge-gray">' + esc(t) + '</span>';
}

export function pagBadge(p) {
  var map = { dinheiro: '<span class="badge badge-green">Dinheiro</span>', pix: '<span class="badge badge-blue">Pix</span>', debito: '<span class="badge badge-gray">D\u00e9bito</span>', credito: '<span class="badge badge-yellow">Cr\u00e9dito</span>', pendente: '<span class="badge badge-red">A receber</span>' };
  return map[p] || '<span class="badge badge-gray">' + esc(p || '-') + '</span>';
}

export function openModal(id) { document.getElementById(id).classList.remove('h'); }
export function closeModal(id) {
  var el = document.getElementById(id);
  if (el) {
    el.classList.add('h');
    if (id === 'modalCliente') {
      el.style.zIndex = '';
      window._searchTargetInputId = null;
      window._searchTargetResultsId = null;
      window._searchSelectCallbackName = null;
    }
  }
}

export function migrateOldKeys() {
  try {
    if (localStorage.getItem('fc_clientes') && !localStorage.getItem('fc_local_clientes')) {
      localStorage.setItem('fc_local_clientes', localStorage.getItem('fc_clientes'));
    }
    if (localStorage.getItem('fc_servicos') && !localStorage.getItem('fc_local_servicos')) {
      localStorage.setItem('fc_local_servicos', localStorage.getItem('fc_servicos'));
    }
  } catch (e) { console.error('Migration error:', e); }
}

export function toast(msg, type) {
  var box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    document.body.appendChild(box);
  }
  var el = document.createElement('div');
  el.className = 'toast t-' + (type || 'ok');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(function () { el.remove(); }, 300); }, 4000);
}

export function mPhone(el) {
  var v = el.value.replace(/\D/g, '');
  v = v.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  el.value = v;
}

export function mCpf(el) {
  var v = el.value.replace(/\D/g, '');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  el.value = v;
}

export function startClock() {
  function tick() {
    var now = new Date();
    var el = document.getElementById('clock');
    if (el) el.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' · ' + now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  }
  tick(); setInterval(tick, 1000);
}

// Retorna a descrição resumida de um serviço para exibição em tabelas
export function getServicoDesc(s) {
  if (!s) return '-';
  if (s.tipo === 'manipulacao') return s.formula || '-';
  if (s.tipo === 'exame') return s.tipoExame || '-';
  if (s.tipo === 'produto') return s.produtoDesc || '-';
  return s.formula || s.tipoExame || s.produtoDesc || '-';
}

// Abre o modal de confirmação após salvar um serviço
export function abrirConfirmServico(servico, cliente, orcNum) {
  var PAG_LABEL = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito', pendente: 'A receber' };
  var TIPO_LABEL = { manipulacao: 'Manipulação', exame: 'Exame', produto: 'Produto/Venda' };
  window._lastSavedServico = servico;
  window._lastSavedCliente = cliente;
  window._lastSavedOrcNum = orcNum;
  var desc = getServicoDesc(servico);
  var body =
    '<div style="text-align:center;padding:1rem 0 1.25rem">' +
    '<div class="orc-num" style="font-size:2.2rem">#' + padNum(orcNum) + '</div>' +
    '<div style="font-size:.8rem;color:var(--tx3);margin-top:.2rem">' + fmtDate(servico.data) + '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;font-size:.84rem;margin-bottom:1rem">' +
    '<div><span style="color:var(--tx3)">Cliente:</span> <strong>' + esc(cliente ? cliente.nome : '-') + '</strong></div>' +
    '<div><span style="color:var(--tx3)">Tipo:</span> ' + (TIPO_LABEL[servico.tipo] || servico.tipo) + '</div>' +
    '<div><span style="color:var(--tx3)">Pagamento:</span> ' + (PAG_LABEL[servico.pagamento] || servico.pagamento || '-') + '</div>' +
    '<div><span style="color:var(--tx3)">Valor:</span> <strong style="color:var(--blue)">' + fmt(servico.valor) + '</strong></div>' +
    (desc && desc !== '-' ? '<div style="grid-column:1/-1"><span style="color:var(--tx3)">Descrição:</span> ' + esc(desc.slice(0, 80)) + (desc.length > 80 ? '…' : '') + '</div>' : '') +
    '</div>';
  set('confirmServicoBody', body);
  openModal('modalConfirmServico');
  toast('Serviço #' + padNum(orcNum) + ' registrado com sucesso!', 'ok');
}

// Bind to window for global availability
window.set = set;
window.gv = gv;
window.setVal = setVal;
window.esc = esc;
window.uid = uid;
window.padNum = padNum;
window.fmt = fmt;
window.fmtDate = fmtDate;
window.tipoBadge = tipoBadge;
window.pagBadge = pagBadge;
window.openModal = openModal;
window.closeModal = closeModal;
window.toast = toast;
window.mPhone = mPhone;
window.mCpf = mCpf;
window.startClock = startClock;
window.getServicoDesc = getServicoDesc;
window.abrirConfirmServico = abrirConfirmServico;
window.migrateOldKeys = migrateOldKeys;
