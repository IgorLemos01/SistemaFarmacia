// ══════════════════════════════════════════════════════════
//  HELPERS E UTILITÁRIOS — utils/helpers.js
// ══════════════════════════════════════════════════════════

export function set(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
export function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
export function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v || ''; }
export function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
export function padNum(n) { return String(n || 0).padStart(4, '0'); }
export function fmt(v) { return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

export function fmtDate(d) {
  if (!d) return '—';
  try { var dt = new Date(d + 'T12:00:00'); return dt.toLocaleDateString('pt-BR'); } catch (e) { return d; }
}

export function tipoBadge(t) {
  var map = { manipulacao: '<span class="badge badge-purple">⚗️ Manipulação</span>', exame: '<span class="badge badge-blue">🔬 Exame</span>', produto: '<span class="badge badge-green">💊 Produto</span>' };
  return map[t] || '<span class="badge badge-gray">' + esc(t) + '</span>';
}

export function pagBadge(p) {
  var map = { dinheiro: '<span class="badge badge-green">💵 Dinheiro</span>', pix: '<span class="badge badge-blue">📲 Pix</span>', debito: '<span class="badge badge-gray">💳 Débito</span>', credito: '<span class="badge badge-yellow">💳 Crédito</span>', pendente: '<span class="badge badge-red">⏳ A receber</span>' };
  return map[p] || '<span class="badge badge-gray">' + esc(p || '—') + '</span>';
}

export function openModal(id) { document.getElementById(id).classList.remove('h'); }
export function closeModal(id) { document.getElementById(id).classList.add('h'); }

export function toast(msg, type) {
  var icons = { ok: '✅', er: '❌', yw: '⚠️' };
  var box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    document.body.appendChild(box);
  }
  var el = document.createElement('div');
  el.className = 'toast t-' + (type || 'ok');
  el.innerHTML = '<span>' + (icons[type] || 'ℹ️') + '</span> ' + msg;
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
