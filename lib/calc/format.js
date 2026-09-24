// Formatação — funções puras, sem acesso a rede/banco (fáceis de testar isoladas).

export const money = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const num = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

// Data de "hoje" no fuso do dispositivo, formatada YYYY-MM-DD (usada como valor
// inicial de seletor de data na tela — o usuário pode sempre trocar). O que evita o
// bug de virar o dia errado (regra 0.6) é o SERVIDOR calcular a data em
// America/Sao_Paulo quando o cliente não manda nenhuma (ver lib/data.js).
export function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
export function firstOfMonth() {
  return today().slice(0, 8) + '01';
}
