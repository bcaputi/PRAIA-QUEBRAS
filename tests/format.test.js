import { describe, it, expect } from 'vitest';
import { money, num } from '../lib/calc/format';

// normaliza qualquer tipo de espaço (Node/ICU às vezes usa espaço não separável
// entre "R$" e o valor) pra não depender de qual caractere exato foi usado
function semEspacosEsquisitos(s) {
  return s.replace(/\s/g, ' ');
}

describe('money', () => {
  it('formata em real brasileiro', () => {
    expect(semEspacosEsquisitos(money(1234.5))).toBe('R$ 1.234,50');
  });
  it('trata null/undefined como zero (não quebra)', () => {
    expect(semEspacosEsquisitos(money(null))).toBe('R$ 0,00');
    expect(semEspacosEsquisitos(money(undefined))).toBe('R$ 0,00');
  });
});

describe('num', () => {
  it('formata número com até 3 casas decimais', () => {
    expect(num(1234.5)).toBe('1.234,5');
    expect(num(2)).toBe('2');
  });
});
