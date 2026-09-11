import { neon } from '@neondatabase/serverless';

// Conexão preguiçosa: só cria o cliente Neon quando a primeira query roda
// (em tempo de execução), nunca durante o build. Assim o deploy nunca quebra
// por falta de DATABASE_URL na hora de montar o projeto.
let _client;
function client() {
  if (!_client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não configurada');
    _client = neon(url);
  }
  return _client;
}

// Mantém o uso como template: sql`SELECT ...`
export function sql(strings, ...values) {
  return client()(strings, ...values);
}
