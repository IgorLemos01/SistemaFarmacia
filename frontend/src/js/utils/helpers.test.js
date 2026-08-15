import { describe, it, expect } from 'vitest';
import { fmt, fmtDate, padNum, uid, esc } from './helpers.js';

describe('helpers.js - Funções utilitárias', () => {
  it('fmt deve formatar valores numéricos como moeda R$', () => {
    expect(fmt(10)).toBe('R$ 10,00');
    expect(fmt(1234.56)).toBe('R$ 1.234,56');
    expect(fmt(0)).toBe('R$ 0,00');
    expect(fmt(null)).toBe('R$ 0,00');
  });

  it('padNum deve preencher número com zeros à esquerda até 4 dígitos', () => {
    expect(padNum(5)).toBe('0005');
    expect(padNum(42)).toBe('0042');
    expect(padNum(1234)).toBe('1234');
  });

  it('fmtDate deve formatar datas ISO (YYYY-MM-DD) para PT-BR (DD/MM/YYYY)', () => {
    expect(fmtDate('2026-08-15')).toBe('15/08/2026');
    expect(fmtDate(null)).toBe('-');
  });

  it('uid deve gerar uma string válida não vazia', () => {
    const id = uid();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(5);
  });

  it('esc deve escapar caracteres HTML especiais', () => {
    expect(esc('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    expect(esc('João & Maria')).toBe('João &amp; Maria');
  });
});
