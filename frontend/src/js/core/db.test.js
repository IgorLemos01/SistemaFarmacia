import { describe, it, expect } from 'vitest';
import { normaliseServico, applyFilters } from './db.js';

describe('db.js - Normalização e Filtros de Serviços', () => {
  it('normaliseServico deve converter snake_case do banco em propriedades camelCase', () => {
    const dbRow = {
      id: 'srv-1',
      cliente_id: 'cli-100',
      tipo: 'manipulacao',
      data: '2026-08-15',
      valor: '150.50',
      pagamento: 'pix',
      obs: 'Teste',
      orc_num: 42,
      formula: 'Fórmula X',
      tipo_exame: null,
      produto_desc: null,
      criado_por: 'Administrador'
    };

    const result = normaliseServico(dbRow);

    expect(result.id).toBe('srv-1');
    expect(result.clienteId).toBe('cli-100');
    expect(result.valor).toBe(150.5);
    expect(result.orcNum).toBe(42);
    expect(result.formula).toBe('Fórmula X');
  });

  it('applyFilters deve filtrar serviços por intervalo de data, tipo e pagamento', () => {
    const list = [
      { id: '1', data: '2026-01-10', tipo: 'manipulacao', pagamento: 'pix' },
      { id: '2', data: '2026-02-15', tipo: 'exame', pagamento: 'dinheiro' },
      { id: '3', data: '2026-03-20', tipo: 'manipulacao', pagamento: 'credito' }
    ];

    const filterTipo = applyFilters(list, { tipo: 'manipulacao' });
    expect(filterTipo.length).toBe(2);

    const filterDate = applyFilters(list, { de: '2026-02-01', ate: '2026-03-30' });
    expect(filterDate.length).toBe(2);
    expect(filterDate.map(x => x.id)).toEqual(['2', '3']);

    const filterPag = applyFilters(list, { pag: 'pix' });
    expect(filterPag.length).toBe(1);
    expect(filterPag[0].id).toBe('1');
  });
});
