// Data de "hoje" no fuso de Brasília, não em UTC — sem isso, depois das 21h
// (Brasília) o servidor (que roda em UTC) já acha que é o dia seguinte.
export function hojeBrasilia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // 'en-CA' formata direto como YYYY-MM-DD
}
