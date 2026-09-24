import { describe, it, expect } from 'vitest';
import { lerQuantidade, calcularCusto, validarRegistro, validarInsumos } from '../lib/calc/validacao';

describe('lerQuantidade (regra 0.1 — nunca vira 0 em silêncio)', () => {
  it('aceita número e texto numérico positivos', () => {
    expect(lerQuantidade(2.5)).toBe(2.5);
    expect(lerQuantidade('3')).toBe(3);
    expect(lerQuantidade('0.25')).toBe(0.25);
  });
  it.each([
    ['vazio', ''],
    ['só espaços', '   '],
    ['texto', 'abc'],
    ['zero', 0],
    ['zero em texto', '0'],
    ['negativo', -1],
    ['null', null],
    ['undefined', undefined],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['boolean true', true],
    ['objeto', {}],
  ])('rejeita %s', (_nome, valor) => {
    expect(lerQuantidade(valor)).toBeNull();
  });
});

describe('calcularCusto (regra 0.7 — sem custo é NULL, nunca 0)', () => {
  it('calcula custo total quando há custo unitário', () => {
    expect(calcularCusto(3, 2.5)).toEqual({ custoUnit: 2.5, custoTotal: 7.5 });
  });
  it.each([[0], [null], [undefined], [''], ['abc'], [-2]])('custo %s vira sem custo', (bruto) => {
    expect(calcularCusto(3, bruto)).toEqual({ custoUnit: null, custoTotal: null });
  });
  it('arredonda o total em 4 casas', () => {
    expect(calcularCusto(3, 0.33333).custoTotal).toBe(1);
  });
});

describe('validarRegistro', () => {
  const ok = { tipo: 'QUEBRA', nome: 'Camarão', quantidade: 2, motivo: 'Vencido / Validade', custo_unit: 10 };

  it('aceita um lançamento normal e calcula o custo', () => {
    const r = validarRegistro(ok);
    expect(r.erro).toBeUndefined();
    expect(r.valores).toEqual({
      tipo: 'QUEBRA',
      quantidade: 2,
      nome: 'Camarão',
      motivo: 'Vencido / Validade',
      custoUnit: 10,
      custoTotal: 20,
    });
  });

  it('item sem custo cadastrado: aceita, e grava custo NULL (não 0)', () => {
    const r = validarRegistro({ ...ok, custo_unit: 0 });
    expect(r.valores.custoUnit).toBeNull();
    expect(r.valores.custoTotal).toBeNull();
    expect(r.valores.quantidade).toBe(2); // a quantidade continua valendo
  });

  it('rejeita tipo inválido', () => {
    expect(validarRegistro({ ...ok, tipo: 'OUTRO' }).erro).toMatch(/tipo/);
    expect(validarRegistro({ ...ok, tipo: undefined }).erro).toMatch(/tipo/);
    expect(validarRegistro(null).erro).toMatch(/tipo/);
  });

  it('rejeita quantidade inválida', () => {
    expect(validarRegistro({ ...ok, quantidade: 'abc' }).erro).toMatch(/quantidade/);
    expect(validarRegistro({ ...ok, quantidade: 0 }).erro).toMatch(/quantidade/);
    expect(validarRegistro({ ...ok, quantidade: '' }).erro).toMatch(/quantidade/);
  });

  it('rejeita nome vazio', () => {
    expect(validarRegistro({ ...ok, nome: '   ' }).erro).toMatch(/nome/);
  });

  it('motivo é obrigatório só em QUEBRA', () => {
    expect(validarRegistro({ ...ok, motivo: '' }).erro).toMatch(/motivo/);
    const buffet = validarRegistro({ ...ok, tipo: 'BUFFET', motivo: null });
    expect(buffet.erro).toBeUndefined();
    expect(buffet.valores.motivo).toBeNull();
  });
});

describe('validarInsumos (produção)', () => {
  it('rejeita lista vazia ou ausente', () => {
    expect(validarInsumos([]).erro).toMatch(/ao menos um insumo/);
    expect(validarInsumos(undefined).erro).toMatch(/ao menos um insumo/);
  });

  it('rejeita insumo com quantidade inválida e diz qual', () => {
    const r = validarInsumos([
      { nome: 'Sal', quantidade: 1, custo_unit: 2 },
      { nome: 'Pimenta', quantidade: 'x', custo_unit: 2 },
    ]);
    expect(r.erro).toMatch(/Pimenta/);
  });

  it('mistura insumo com e sem custo: só o sem custo fica null', () => {
    const r = validarInsumos([
      { codigo: 'A', nome: 'Sal', quantidade: 2, custo_unit: 3 },
      { codigo: 'B', nome: 'Água', quantidade: 5, custo_unit: 0 },
    ]);
    expect(r.erro).toBeUndefined();
    expect(r.insumos[0]).toMatchObject({ custo_unit: 3, custo_total: 6 });
    expect(r.insumos[1]).toMatchObject({ custo_unit: null, custo_total: null, quantidade: 5 });
  });
});
