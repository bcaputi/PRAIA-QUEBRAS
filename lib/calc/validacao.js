// Validação de entrada dos lançamentos — funções puras (sem banco/rede), usadas
// pelas rotas de API e testáveis isoladamente. Regra 0.1: entrada inválida é
// REJEITADA com mensagem clara, nunca convertida em 0.

export const TIPOS_VALIDOS = ['QUEBRA', 'BUFFET', 'REFEICAO'];

// Quantidade precisa vir como número (ou texto numérico) finito e > 0.
// Não aceita null/''/'abc'/true — antes tudo isso virava 0 e era gravado.
export function lerQuantidade(valor) {
  if (typeof valor !== 'number' && typeof valor !== 'string') return null;
  if (typeof valor === 'string' && valor.trim() === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Custo ausente/zero/inválido = "sem custo" (regra 0.7): devolve nulls, nunca 0.
export function calcularCusto(quantidade, custoUnitBruto) {
  const c = typeof custoUnitBruto === 'number' || typeof custoUnitBruto === 'string' ? Number(custoUnitBruto) : NaN;
  if (!Number.isFinite(c) || c <= 0) return { custoUnit: null, custoTotal: null };
  return { custoUnit: c, custoTotal: +(quantidade * c).toFixed(4) };
}

// Valida um lançamento (quebra/buffet/refeição). Devolve { erro } ou { valores }.
export function validarRegistro(b) {
  if (!b || !TIPOS_VALIDOS.includes(b.tipo)) {
    return { erro: 'tipo precisa ser QUEBRA, BUFFET ou REFEICAO' };
  }
  const qtd = lerQuantidade(b.quantidade);
  if (qtd === null) return { erro: 'quantidade precisa ser um número maior que zero' };
  const nome = String(b.nome || '').trim();
  if (!nome) return { erro: 'nome do item é obrigatório' };
  const motivo = b.motivo ? String(b.motivo).trim() : '';
  if (b.tipo === 'QUEBRA' && !motivo) {
    return { erro: 'motivo é obrigatório em lançamento de quebra' };
  }
  const { custoUnit, custoTotal } = calcularCusto(qtd, b.custo_unit);
  return { valores: { tipo: b.tipo, quantidade: qtd, nome, motivo: motivo || null, custoUnit, custoTotal } };
}

// Valida os insumos de uma produção. Devolve { erro } ou { insumos } já com custos.
export function validarInsumos(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return { erro: 'produção precisa de ao menos um insumo' };
  }
  const insumos = [];
  for (const i of lista) {
    const q = lerQuantidade(i && i.quantidade);
    if (q === null) {
      return { erro: `quantidade do insumo "${(i && (i.nome || i.codigo)) || '?'}" precisa ser maior que zero` };
    }
    const { custoUnit, custoTotal } = calcularCusto(q, i.custo_unit);
    insumos.push({
      codigo: i.codigo || null,
      nome: i.nome,
      unidade: i.unidade || null,
      quantidade: q,
      custo_unit: custoUnit,
      custo_total: custoTotal,
    });
  }
  return { insumos };
}
