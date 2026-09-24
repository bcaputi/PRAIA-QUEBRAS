// Somas e agrupamentos usados no Dashboard/Relatório/listas — funções puras (só
// recebem os dados e devolvem o resultado), pra poder testar sem banco.
//
// Regra 0.7: item sem custo cadastrado grava custo_total = NULL (nunca 0). Toda
// soma aqui EXCLUI as linhas com custo_total nulo do valor somado, e devolve
// quantas ficaram de fora — a tela usa isso pra avisar "R$ X · N itens sem custo
// não incluídos" em vez de mostrar um total que parece completo e não é.

// Soma um campo numérico ignorando linhas onde ele é null/undefined.
// Devolve { soma, semCusto } — semCusto = quantas linhas foram ignoradas.
export function somarComAviso(rows, campo = 'custo_total') {
  let soma = 0;
  let semCusto = 0;
  for (const r of rows || []) {
    const v = r[campo];
    if (v == null) semCusto++;
    else soma += Number(v) || 0;
  }
  return { soma, semCusto };
}

// Agrupa lançamentos por código (ou nome, se não tiver código) — usado no
// Relatório (resumo por item pra dar baixa no Colibri).
export function agruparPorItem(rows) {
  const map = {};
  for (const r of rows || []) {
    const k = r.codigo || r.nome;
    if (!map[k]) {
      map[k] = { codigo: r.codigo, nome: r.nome, unidade: r.unidade, qtd: 0, custo: 0, semCusto: 0 };
    }
    map[k].qtd += Number(r.quantidade || 0);
    if (r.custo_total == null) map[k].semCusto++;
    else map[k].custo += Number(r.custo_total) || 0;
  }
  return Object.values(map).sort((a, b) => b.custo - a.custo);
}

// Agrupa por nome do item, somando custo_total (usado no "top perdas" do Dashboard).
export function agruparPorNome(rows) {
  const map = {};
  for (const r of rows || []) {
    if (r.custo_total == null) continue; // sem custo não entra no ranking por valor
    map[r.nome] = (map[r.nome] || 0) + Number(r.custo_total);
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

// Agrupa por motivo da quebra, somando custo_total (Dashboard: perdas por motivo).
export function agruparPorMotivo(rows) {
  const map = {};
  for (const r of rows || []) {
    if (r.custo_total == null) continue;
    const k = r.motivo || 'Sem motivo';
    map[k] = (map[k] || 0) + Number(r.custo_total);
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}
