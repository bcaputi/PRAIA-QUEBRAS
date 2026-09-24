import { describe, it, expect } from 'vitest';
import { somarComAviso, agruparPorItem, agruparPorNome, agruparPorMotivo } from '../lib/calc/totais';

describe('somarComAviso (regra 0.7 — item sem custo não vira zero)', () => {
  it('soma normalmente quando todo mundo tem custo', () => {
    const r = somarComAviso([{ custo_total: 10 }, { custo_total: 5.5 }]);
    expect(r).toEqual({ soma: 15.5, semCusto: 0 });
  });

  it('exclui da soma quem tem custo_total null e avisa quantos', () => {
    const r = somarComAviso([{ custo_total: 10 }, { custo_total: null }, { custo_total: 3 }]);
    expect(r).toEqual({ soma: 13, semCusto: 1 });
  });

  it('lista vazia não quebra', () => {
    expect(somarComAviso([])).toEqual({ soma: 0, semCusto: 0 });
  });

  it('só um item, sem contagem suficiente pra confiar (regra geral do spec) — ainda soma o que existe', () => {
    const r = somarComAviso([{ custo_total: 7 }]);
    expect(r).toEqual({ soma: 7, semCusto: 0 });
  });
});

describe('agruparPorItem (Relatório)', () => {
  it('agrupa por código, soma quantidade e custo, e conta quem não entrou por falta de custo', () => {
    const rows = [
      { codigo: 'A1', nome: 'Camarão', unidade: 'KG', quantidade: 2, custo_total: 20 },
      { codigo: 'A1', nome: 'Camarão', unidade: 'KG', quantidade: 1, custo_total: 10 },
      { codigo: 'B2', nome: 'Detergente', unidade: 'UND', quantidade: 3, custo_total: null },
    ];
    const g = agruparPorItem(rows);
    expect(g).toEqual([
      { codigo: 'A1', nome: 'Camarão', unidade: 'KG', qtd: 3, custo: 30, semCusto: 0 },
      { codigo: 'B2', nome: 'Detergente', unidade: 'UND', qtd: 3, custo: 0, semCusto: 1 },
    ]);
  });

  it('usa o nome como chave quando não tem código', () => {
    const rows = [{ codigo: null, nome: 'Item avulso', unidade: 'UND', quantidade: 1, custo_total: 5 }];
    const g = agruparPorItem(rows);
    expect(g[0].nome).toBe('Item avulso');
    expect(g[0].qtd).toBe(1);
  });
});

describe('agruparPorNome / agruparPorMotivo (Dashboard)', () => {
  it('soma só o que tem custo, ordenado do maior pro menor', () => {
    const rows = [
      { nome: 'Camarão', custo_total: 10 },
      { nome: 'Filé', custo_total: 30 },
      { nome: 'Sem custo', custo_total: null },
    ];
    expect(agruparPorNome(rows)).toEqual([
      ['Filé', 30],
      ['Camarão', 10],
    ]);
  });

  it('motivo ausente vira "Sem motivo"', () => {
    const rows = [{ motivo: null, custo_total: 8 }];
    expect(agruparPorMotivo(rows)).toEqual([['Sem motivo', 8]]);
  });
});
