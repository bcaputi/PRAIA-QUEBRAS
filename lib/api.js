// Wrapper de fetch usado em todo o cliente: sempre confere r.ok e lê a mensagem de
// erro que a API manda ({ error: "..." }) em vez de deixar um fetch falho virar uma
// tela vazia silenciosa (regra 0.9 da Fase 0).
export async function apiFetch(url, opts) {
  let r;
  try {
    r = await fetch(url, opts);
  } catch (e) {
    throw new Error('Sem conexão com o servidor. Verifique sua internet.');
  }
  let data = null;
  try {
    data = await r.json();
  } catch {
    // resposta sem corpo (ex.: alguns 204) — ok se r.ok
  }
  if (!r.ok) {
    throw new Error((data && data.error) || `Erro ${r.status} ao falar com o servidor.`);
  }
  return data;
}
