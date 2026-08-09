// ══════════════════════════════════════════════════════════
//  ESTADO DA APLICAÇÃO — core/state.js
// ══════════════════════════════════════════════════════════

export var STATE = {
  user: null,
  page: 'dashboard',
  perms: {},
};

export var MODULOS = [
  { key: 'dashboard', label: 'Dashboard', ico: '🏠', sub: 'Visão geral, KPIs e últimos serviços' },
  { key: 'clientes', label: 'Clientes', ico: '👥', sub: 'Cadastro e histórico de pacientes' },
  { key: 'manipulacao', label: 'Manipulação', ico: '⚗️', sub: 'Receituários e fórmulas manipuladas' },
  { key: 'exames', label: 'Exames', ico: '🔬', sub: 'Registro e histórico de exames' },
  { key: 'receitas', label: 'Receitas', ico: '📜', sub: 'Receitas médicas e medicamentos' },
  { key: 'orcamentos', label: 'Orçamentos', ico: '📋', sub: 'Relatório financeiro e geração de PDF' },
  { key: 'usuarios', label: 'Usuários', ico: '🛡️', sub: 'Criar e gerenciar usuários do sistema' },
];

export var PERFIS = {
  admin: {
    label: 'Administrador', cor: 'badge-red',
    perms: { dashboard: 'edit', clientes: 'edit', manipulacao: 'edit', exames: 'edit', receitas: 'edit', orcamentos: 'edit', usuarios: 'edit' }
  },
  gerente: {
    label: 'Gerente', cor: 'badge-purple',
    perms: { dashboard: 'read', clientes: 'edit', manipulacao: 'edit', exames: 'edit', receitas: 'edit', orcamentos: 'edit', usuarios: 'none' }
  },
  farmaceutico: {
    label: 'Farmacêutico', cor: 'badge-blue',
    perms: { dashboard: 'read', clientes: 'edit', manipulacao: 'edit', exames: 'read', receitas: 'edit', orcamentos: 'read', usuarios: 'none' }
  },
  atendente: {
    label: 'Atendente', cor: 'badge-gray',
    perms: { dashboard: 'read', clientes: 'edit', manipulacao: 'read', exames: 'read', receitas: 'read', orcamentos: 'none', usuarios: 'none' }
  },
};

export function normalisePerms(p, perfil) {
  p = p || {};
  if (perfil === 'administrador' || perfil === 'administrator') perfil = 'admin';
  if (perfil === 'farmacêutico') perfil = 'farmaceutico';
  var hasNew = MODULOS.some(function (m) { return p[m.key] !== undefined; });
  if (!hasNew) {
    var base = (PERFIS[perfil] || PERFIS.atendente).perms;
    p = Object.assign({}, base, p);
  }
  if (perfil === 'admin') {
    MODULOS.forEach(function (m) { p[m.key] = 'edit'; });
  }
  MODULOS.forEach(function (m) { if (p[m.key] === undefined) p[m.key] = 'none'; });
  return p;
}

export function canView(mod) { var v = STATE.perms && STATE.perms[mod]; return v === 'read' || v === 'edit'; }
export function canEdit(mod) { return !!(STATE.perms && STATE.perms[mod] === 'edit'); }
export function can(perm) {
  var map = { clientes_w: 'clientes', servicos_w: 'manipulacao', orcamentos_r: 'orcamentos', usuarios_w: 'usuarios' };
  var mod = map[perm] || perm;
  if (perm.endsWith('_w')) return canEdit(mod);
  return canView(mod);
}

// Bind to window for global availability
window.STATE = STATE;
window.MODULOS = MODULOS;
window.PERFIS = PERFIS;
window.normalisePerms = normalisePerms;
window.canView = canView;
window.canEdit = canEdit;
window.can = can;
