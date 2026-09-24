// Runner de migração idempotente (regra 0.12).
// Lê db/migrations/*.sql em ordem, confere contra a tabela schema_migrations e roda
// só o que ainda não rodou. Uso: `npm run migrate` (lê DATABASE_URL de .env.local,
// como o `next dev`, ou da variável de ambiente já exportada).
//
// IMPORTANTE: isto muda o banco de produção se DATABASE_URL apontar pra lá. Só
// rodar depois de aprovar o SQL de cada migração.

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

function carregarEnvLocal() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  const linhas = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const linha of linhas) {
    const m = linha.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, chave, valorBruto] = m;
    const valor = valorBruto.replace(/^["']|["']$/g, '');
    if (!process.env[chave]) process.env[chave] = valor;
  }
}

async function main() {
  carregarEnvLocal();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não configurada (nem no ambiente, nem em .env.local).');
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  const dir = path.join(__dirname, '..', 'db', 'migrations');
  const arquivos = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // NNN_nome.sql garante a ordem

  // primeira execução: a própria tabela de controle ainda não existe.
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;

  const jaAplicadas = new Set((await sql`SELECT version FROM schema_migrations`).map((r) => r.version));

  for (const arquivo of arquivos) {
    const versao = arquivo.replace(/\.sql$/, '');
    if (jaAplicadas.has(versao)) {
      console.log(`— ${versao} já aplicada, pulando`);
      continue;
    }
    const texto = fs.readFileSync(path.join(dir, arquivo), 'utf8');
    console.log(`→ aplicando ${versao}...`);
    // Driver 0.10.x: chamar sql("texto") executa SQL cru. O protocolo HTTP do Neon só
    // aceita UM comando por chamada — então cada arquivo .sql tem que conter um único
    // statement (se precisar de mais, divida em 002_a.sql, 002_b.sql...). Migrações
    // devem ser idempotentes (IF NOT EXISTS) por conta própria.
    try {
      await sql(texto);
    } catch (e) {
      if (/multiple commands/i.test(String(e.message))) {
        throw new Error(`${arquivo} tem mais de um comando SQL — divida em arquivos separados (um comando por arquivo).`);
      }
      throw e;
    }
    await sql`INSERT INTO schema_migrations (version) VALUES (${versao})`;
    console.log(`✓ ${versao} aplicada`);
  }
  console.log('Migrações em dia.');
}

main().catch((e) => {
  console.error('Falha ao migrar:', e);
  process.exit(1);
});
