// ══════════════════════════════════════════════════════════
//  EXPORTAÇÃO EM PDF — utils/pdf.js
// ══════════════════════════════════════════════════════════

export function gerarPDFServicoById(id) {
  Promise.all([window.dbGetServicos(), window.dbGetClientes()]).then(function (r) {
    var s = r[0].find(function (x) { return x.id === id; });
    if (!s) { window.toast('Serviço não encontrado.', 'er'); return; }
    var cl = r[1].find(function (c) { return c.id === s.clienteId; });
    gerarPDFServicoIndividual(s, cl, s.orcNum);
  });
}

export function gerarPDFServicoAtual() {
  if (!window._lastSavedServico) { window.toast('Nenhum serviço em memória.', 'er'); return; }
  gerarPDFServicoIndividual(window._lastSavedServico, window._lastSavedCliente, window._lastSavedOrcNum);
}

export function gerarPDFServicoIndividual(servico, cliente, orcNum) {
  var TIPO_LABEL = { manipulacao: 'Manipulação Farmacêutica', exame: 'Exame Laboratorial', produto: 'Produto / Venda' };
  var PAG_LABEL = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Cartão de Débito', credito: 'Cartão de Crédito', pendente: 'A receber' };
  var PAG_COLOR = { dinheiro: '#065F46', pix: '#1e40af', debito: '#374151', credito: '#92400E', pendente: '#991B1B' };
  var PAG_BG = { dinheiro: '#D1FAE5', pix: '#DBEAFE', debito: '#F3F4F6', credito: '#FEF3C7', pendente: '#FEE2E2' };

  var nomeAtendente = window.STATE.user ? window.STATE.user.nome : '—';
  var tipoLabel = TIPO_LABEL[servico.tipo] || servico.tipo;
  var pagLabel = PAG_LABEL[servico.pagamento] || servico.pagamento || '—';
  var pagColor = PAG_COLOR[servico.pagamento] || '#374151';
  var pagBg = PAG_BG[servico.pagamento] || '#F3F4F6';

  function xe(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var desc = '';
  var extraRow = '';
  if (servico.tipo === 'manipulacao') {
    desc = servico.formula || '—';
    if (servico.prazo) extraRow =
      '<tr style="background:#F8F9FF">' +
      '<td colspan="4" style="padding:9px 14px;font-size:11px;color:#555;border-bottom:1px solid #E8ECF4">' +
      '<strong style="color:#003087">⏰ Prazo de Entrega:</strong> ' + window.fmtDate(servico.prazo) +
      '</td>' +
      '</tr>';
  } else if (servico.tipo === 'exame') {
    desc = servico.tipoExame || '—';
  } else {
    desc = servico.produtoDesc || '—';
  }

  var dataEmissao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  var horaEmissao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  var validade = new Date(); validade.setDate(validade.getDate() + 7);
  var dataValidade = validade.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  var html =
    '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>' +
    '<title>Orçamento #' + window.padNum(orcNum) + ' — Farmácia Couto</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Source+Sans+3:wght@300;400;600;700&display=swap" rel="stylesheet"/>' +
    '<style>' +
    '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}' +
    'body{font-family:"Source Sans 3",Arial,sans-serif;background:#F0F2F5;color:#111827;min-height:100vh;padding:32px 16px}' +
    '.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.14);overflow:hidden;position:relative}' +
    '.accent-bar{height:5px;background:linear-gradient(90deg,#001a4d 0%,#003087 45%,#C8102E 100%)}' +
    '.header{padding:28px 40px 24px;display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid #E8ECF4}' +
    '.brand-name{font-family:"Playfair Display",serif;font-size:24px;font-weight:900;color:#003087;letter-spacing:-.5px;line-height:1}' +
    '.brand-tag{font-size:9.5px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.14em;margin-top:3px}' +
    '.brand-contact{margin-top:10px}' +
    '.brand-contact div{font-size:10.5px;color:#6B7280;margin-top:2px}' +
    '.brand-contact strong{color:#374151;font-weight:600}' +
    '.orc-block{text-align:right}' +
    '.orc-label{font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.16em}' +
    '.orc-number{font-family:"Playfair Display",serif;font-size:36px;font-weight:900;color:#003087;line-height:1;margin:3px 0}' +
    '.orc-date{font-size:10px;color:#6B7280;margin-top:4px}' +
    '.orc-pill{display:inline-block;background:#003087;color:#fff;font-size:8.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;padding:3px 10px;border-radius:100px;margin-top:8px}' +
    '.section{padding:22px 40px}' +
    '.section-label{font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.16em;display:flex;align-items:center;gap:8px;margin-bottom:12px}' +
    '.section-label::after{content:"";flex:1;height:1px;background:#E8ECF4}' +
    '.client-card{background:#F8F9FF;border:1px solid #E8ECF4;border-radius:10px;padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:10px 16px}' +
    '.cf-label{font-size:9px;color:#9CA3AF;font-weight:700;text-transform:uppercase;letter-spacing:.1em}' +
    '.cf-value{font-size:12px;font-weight:600;color:#111827;margin-top:3px}' +
    '.items-section{padding:0 40px 22px}' +
    'table.items{width:100%;border-collapse:separate;border-spacing:0;border-radius:10px;overflow:hidden;border:1px solid #E8ECF4}' +
    'table.items thead tr{background:linear-gradient(135deg,#002575,#003087)}' +
    'table.items thead th{padding:11px 16px;text-align:left;font-size:9.5px;font-weight:700;color:rgba(255,255,255,.9);letter-spacing:.07em;text-transform:uppercase}' +
    'table.items thead th.r{text-align:right}' +
    'table.items tbody td{padding:13px 16px;border-bottom:1px solid #EEF0F6;font-size:11.5px;vertical-align:top}' +
    'table.items tbody tr:last-child td{border-bottom:none}' +
    'table.items tbody tr:nth-child(even) td{background:#FAFBFE}' +
    '.td-desc-main{font-weight:700;color:#111827;font-size:12px}' +
    '.td-desc-sub{font-size:10px;color:#6B7280;margin-top:4px;line-height:1.6;max-width:300px}' +
    '.td-tipo{background:#EEF2FF;color:#3730A3;font-size:9.5px;font-weight:700;padding:3px 9px;border-radius:6px;white-space:nowrap}' +
    '.r{text-align:right}' +
    '.total-section{padding:0 40px 24px}' +
    '.total-box{background:linear-gradient(135deg,#002575 0%,#003087 55%,#001a4d 100%);border-radius:12px;padding:20px 28px;display:flex;align-items:center;justify-content:space-between}' +
    '.total-lbl{font-size:9.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6)}' +
    '.total-val{font-family:"Playfair Display",serif;font-size:32px;font-weight:900;color:#fff;letter-spacing:-.5px;margin-top:3px}' +
    '.pag-lbl{font-size:8.5px;color:rgba(255,255,255,.55);text-transform:uppercase;letter-spacing:.1em;text-align:right}' +
    '.pag-chip{display:inline-flex;align-items:center;gap:4px;padding:5px 13px;border-radius:100px;font-size:10.5px;font-weight:700;margin-top:6px}' +
    '.footer{padding:20px 40px;border-top:1px solid #E8ECF4;display:flex;align-items:flex-end;justify-content:space-between}' +
    '.validity{font-size:10px;color:#9CA3AF;line-height:1.7}' +
    '.validity strong{color:#374151}' +
    '.sig-block{text-align:center}' +
    '.sig-line{width:152px;height:1px;background:#D1D5DB;margin:0 auto 6px}' +
    '.sig-name{font-size:10px;color:#374151;font-weight:700}' +
    '.sig-role{font-size:8.5px;color:#9CA3AF;margin-top:1px}' +
    '.footer-right{text-align:right;font-size:9px;color:#D1D5DB}' +
    '@media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0;width:100%;min-height:auto}.no-print{display:none!important}}' +
    '@page{margin:0;size:A4}' +
    '</style></head><body>' +
 
    // Botões no-print
    '<div class="no-print" style="position:fixed;top:20px;right:20px;z-index:999;display:flex;gap:8px">' +
    '<button onclick="window.print()" style="background:#003087;color:#fff;border:none;padding:11px 24px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:\'Source Sans 3\',sans-serif;box-shadow:0 4px 16px rgba(0,48,135,.4);letter-spacing:.02em">📥 Salvar PDF</button>' +
    '<button onclick="window.close()" style="background:#fff;color:#374151;border:1px solid #E5E7EB;padding:11px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:\'Source Sans 3\',sans-serif">✕ Fechar</button>' +
    '</div>' +
 
    '<div class="page">' +
    '<div class="accent-bar"></div>' +
 
    // Header
    '<div class="header">' +
    '<div>' +
    '<div class="brand-name">Farmácia Couto</div>' +
    '<div class="brand-tag">Saúde &amp; Bem-estar</div>' +
    '<div class="brand-contact">' +
    '<div>📞 <strong>(75) 99115-4571</strong></div>' +
    '<div>📸 <strong>@farmaciacouto</strong></div>' +
    '</div>' +
    '</div>' +
    '<div class="orc-block">' +
    '<div class="orc-label">Orçamento</div>' +
    '<div class="orc-number">#' + window.padNum(orcNum) + '</div>' +
    '<div class="orc-date">' + xe(dataEmissao) + ' · ' + horaEmissao + '</div>' +
    '<div class="orc-pill">Emitido</div>' +
    '</div>' +
    '</div>' +
 
    // Cliente
    '<div class="section">' +
    '<div class="section-label">Dados do Cliente</div>' +
    '<div class="client-card">' +
    '<div><div class="cf-label">Nome</div><div class="cf-value">' + xe(cliente ? cliente.nome : '—') + '</div></div>' +
    '<div><div class="cf-label">WhatsApp</div><div class="cf-value">' + xe(cliente && cliente.tel ? cliente.tel : '—') + '</div></div>' +
    (cliente && cliente.endereco ? '<div style="grid-column:1/-1"><div class="cf-label">Endereço</div><div class="cf-value">' + xe(cliente.endereco) + '</div></div>' : '') +
    '<div><div class="cf-label">Atendente</div><div class="cf-value">' + xe(nomeAtendente) + '</div></div>' +
    '<div><div class="cf-label">Data do Serviço</div><div class="cf-value">' + window.fmtDate(servico.data) + '</div></div>' +
    '</div>' +
    '</div>' +
 
    // Itens
    '<div class="items-section">' +
    '<div class="section-label" style="margin-bottom:12px">Itens do Orçamento</div>' +
    '<table class="items">' +
    '<thead><tr>' +
    '<th style="width:44px">#</th>' +
    '<th>Descrição</th>' +
    '<th style="width:130px">Tipo</th>' +
    '<th class="r" style="width:120px">Valor</th>' +
    '</tr></thead>' +
    '<tbody>' +
    '<tr>' +
    '<td style="font-weight:800;color:#003087;font-size:12px">01</td>' +
    '<td><div class="td-desc-main">' + xe(tipoLabel) + '</div><div class="td-desc-sub">' + xe(desc) + '</div></td>' +
    '<td><span class="td-tipo">' + xe(tipoLabel) + '</span></td>' +
    '<td class="r" style="font-weight:800;font-size:13px;color:#111827">' + window.fmt(servico.valor) + '</td>' +
    '</tr>' +
    extraRow +
    (servico.obs ?
      '<tr style="background:#FFFBEB"><td></td><td colspan="3" style="font-size:10.5px;color:#78350F;padding:9px 16px">' +
      '<strong>📝 Observações:</strong> ' + xe(servico.obs) +
      '</td></tr>' : '') +
    '</tbody>' +
    '</table>' +
    '</div>' +
 
    // Total
    '<div class="total-section">' +
    '<div class="total-box">' +
    '<div>' +
    '<div class="total-lbl">Total do Orçamento</div>' +
    '<div class="total-val">' + window.fmt(servico.valor) + '</div>' +
    '</div>' +
    '<div style="text-align:right">' +
    '<div class="pag-lbl">Forma de Pagamento</div>' +
    '<div class="pag-chip" style="background:' + xe(pagBg) + ';color:' + xe(pagColor) + '">' + xe(pagLabel) + '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
 
    // Footer
    '<div class="footer">' +
    '<div class="validity">' +
    'Válido até <strong>' + xe(dataValidade) + '</strong><br>' +
    'Farmácia Couto · (75) 99115-4571 · @farmaciacouto' +
    '</div>' +
    '<div class="sig-block">' +
    '<div class="sig-line"></div>' +
    '<div class="sig-name">' + xe(nomeAtendente) + '</div>' +
    '<div class="sig-role">Atendente Responsável</div>' +
    '</div>' +
    '<div class="footer-right">Orçamento #' + window.padNum(orcNum) + '<br>' + xe(dataEmissao) + '</div>' +
    '</div>' +
 
    '</div>' +
    '</body></html>';

  var win = window.open('', '_blank', 'width=920,height=760');
  if (!win) { window.toast('Permita pop-ups para gerar o PDF.', 'yw'); return; }
  win.document.write(html);
  win.document.close();
  window.toast('PDF aberto! Clique em "Salvar PDF" na janela.', 'ok');
}

export function gerarPDFOrcamentos() {
  var de = window.gv('orcDe');
  var ate = window.gv('orcAte');
  var tipo = window.gv('orcTipo');
  var pag = window.gv('orcPag');
  Promise.all([window.dbGetServicos({ de: de, ate: ate, tipo: tipo, pag: pag }), window.dbGetClientes()]).then(function (r) {
    var list = r[0].slice().sort(function (a, b) { return b.orcNum - a.orcNum; });
    var clientes = r[1];
    if (!list.length) { window.toast('Nenhum registro para exportar.', 'yw'); return; }
    var total = list.reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var recebido = list.filter(function (s) { return s.pagamento !== 'pendente'; }).reduce(function (a, s) { return a + (parseFloat(s.valor) || 0); }, 0);
    var pendente = total - recebido;
    var TIPO_LABEL = { manipulacao: 'Manipulação', exame: 'Exame', produto: 'Produto' };
    var PAG_LABEL = { dinheiro: 'Dinheiro', pix: 'Pix', debito: 'Débito', credito: 'Crédito', pendente: 'A receber' };
    var periodo = (de ? window.fmtDate(de) : '—') + ' a ' + (ate ? window.fmtDate(ate) : '—');
    var tipoStr = tipo ? TIPO_LABEL[tipo] || tipo : 'Todos';
    var pagStr = pag ? PAG_LABEL[pag] || pag : 'Todos';
    function s_esc(x) { return String(x || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var rows = list.map(function (s) {
      var cl = clientes.find(function (c) { return c.id === s.clienteId; });
      var desc = s.tipo === 'manipulacao' ? (s.formula || '—').slice(0, 50) + (s.formula && s.formula.length > 50 ? '…' : '')
        : s.tipo === 'exame' ? (s.tipoExame || '—')
          : (s.produtoDesc || '—');
      return '<tr>'
        + '<td style="width:60px;font-weight:700;color:#003087">#' + window.padNum(s.orcNum) + '</td>'
        + '<td style="width:160px">' + (cl ? s_esc(cl.nome) : '—') + '</td>'
        + '<td style="width:90px">' + (TIPO_LABEL[s.tipo] || s.tipo) + '</td>'
        + '<td style="font-size:11px;color:#555">' + s_esc(desc) + '</td>'
        + '<td style="width:100px;text-align:right;font-weight:600">' + window.fmt(s.valor) + '</td>'
        + '<td style="width:90px">' + (PAG_LABEL[s.pagamento] || s.pagamento || '—') + '</td>'
        + '<td style="width:80px;color:#666">' + window.fmtDate(s.data) + '</td>'
        + '</tr>';
    }).join('');
    var html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>'
      + '<title>Orçamentos — Farmácia Couto</title>'
      + '<style>body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:0;padding:24px}.header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:3px solid #003087}.brand{font-size:20px;font-weight:800;color:#003087}.brand-sub{font-size:11px;color:#888;margin-top:2px}.report-title{font-size:15px;font-weight:700;color:#C8102E;margin-bottom:14px}.meta{background:#F0F2F7;border-radius:6px;padding:10px 14px;margin-bottom:16px;display:flex;gap:24px;flex-wrap:wrap}.meta span{font-size:11px;color:#555}.meta strong{color:#111}.summary{display:flex;gap:12px;margin-bottom:18px}.sum-box{flex:1;border:1px solid #ddd;border-radius:6px;padding:10px 14px;text-align:center}.sum-val{font-size:16px;font-weight:800;color:#003087}.sum-val.red{color:#C8102E}.sum-val.green{color:#059669}.sum-lbl{font-size:10px;color:#888;margin-top:2px}table{width:100%;border-collapse:collapse}thead tr{background:#003087;color:#fff}th{padding:7px 8px;text-align:left;font-size:11px;font-weight:600}td{padding:6px 8px;border-bottom:1px solid #eee;font-size:11px}tr:nth-child(even) td{background:#F7F9FC}tr:last-child td{border-bottom:none}.footer{margin-top:22px;padding-top:12px;border-top:1px solid #ddd;display:flex;justify-content:space-between;font-size:10px;color:#aaa}@media print{body{padding:12px}.no-print{display:none}}</style></head><body>'
      + '<div class="header"><div><div class="brand">Farmácia Couto</div><div class="brand-sub">Sistema de Gestão — Relatório de Orçamentos</div></div><div style="text-align:right;font-size:11px;color:#888">Emitido em: ' + new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '<br>Por: ' + (window.STATE.user ? s_esc(window.STATE.user.nome) : '—') + '</div></div>'
      + '<div class="report-title">📋 Relatório de Orçamentos</div>'
      + '<div class="meta"><span><strong>Período:</strong> ' + periodo + '</span><span><strong>Tipo:</strong> ' + tipoStr + '</span><span><strong>Pagamento:</strong> ' + pagStr + '</span><span><strong>Total:</strong> ' + list.length + ' registros</span></div>'
      + '<div class="summary"><div class="sum-box"><div class="sum-val">' + list.length + '</div><div class="sum-lbl">Atendimentos</div></div><div class="sum-box"><div class="sum-val green">' + window.fmt(recebido) + '</div><div class="sum-lbl">Recebido</div></div><div class="sum-box"><div class="sum-val red">' + window.fmt(pendente) + '</div><div class="sum-lbl">A receber</div></div><div class="sum-box"><div class="sum-val">' + window.fmt(total) + '</div><div class="sum-lbl">Total geral</div></div></div>'
      + '<table><thead><tr><th>Orç#</th><th>Cliente</th><th>Tipo</th><th>Descrição</th><th style="text-align:right">Valor</th><th>Pagamento</th><th>Data</th></tr></thead><tbody>' + rows + '</tbody></table>'
      + '<div class="footer"><span>Farmácia Couto — Relatório gerado automaticamente pelo sistema</span><span>Total: ' + window.fmt(total) + '</span></div>'
      + '</body></html>';
    var win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { window.toast('Permita pop-ups para exportar o PDF.', 'yw'); return; }
    win.document.write(html);
    win.document.close();
    win.onload = function () { setTimeout(function () { win.focus(); win.print(); }, 400); };
    window.toast('PDF aberto! Use Ctrl+P para salvar como PDF.', 'ok');
  });
}

// Bind to window for global availability
window.gerarPDFServicoById = gerarPDFServicoById;
window.gerarPDFServicoAtual = gerarPDFServicoAtual;
window.gerarPDFServicoIndividual = gerarPDFServicoIndividual;
window.gerarPDFOrcamentos = gerarPDFOrcamentos;
