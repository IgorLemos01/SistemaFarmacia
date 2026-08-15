import { describe, it, expect, beforeEach } from 'vitest';
import { normalisePerms, canView, canEdit, can, STATE, PERFIS } from './state.js';

describe('state.js - Regras de Permissão e Perfis', () => {
  beforeEach(() => {
    STATE.user = null;
    STATE.perms = {};
  });

  it('normalisePerms deve retornar permissões totais ("edit") para perfil admin', () => {
    const perms = normalisePerms({}, 'admin');
    expect(perms.dashboard).toBe('edit');
    expect(perms.clientes).toBe('edit');
    expect(perms.usuarios).toBe('edit');
  });

  it('normalisePerms deve retornar permissões padrão para perfil atendente', () => {
    const perms = normalisePerms({}, 'atendente');
    expect(perms.dashboard).toBe('read');
    expect(perms.clientes).toBe('edit');
    expect(perms.usuarios).toBe('none');
  });

  it('canView e canEdit devem respeitar o estado atual do usuário', () => {
    STATE.perms = { clientes: 'edit', exames: 'read', usuarios: 'none' };

    expect(canView('clientes')).toBe(true);
    expect(canEdit('clientes')).toBe(true);

    expect(canView('exames')).toBe(true);
    expect(canEdit('exames')).toBe(false);

    expect(canView('usuarios')).toBe(false);
    expect(canEdit('usuarios')).toBe(false);
  });

  it('função can() deve mapear corretamente as permissões com sufixo _w', () => {
    STATE.perms = { clientes: 'edit', manipulacao: 'read' };

    expect(can('clientes_w')).toBe(true);
    expect(can('servicos_w')).toBe(false);
  });
});
