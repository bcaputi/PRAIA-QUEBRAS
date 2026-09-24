import { sql } from '../../../lib/db';
import { lerSessao } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// GET /api/items  -> lista base de itens (com custo)
// GET /api/items?sem_custo=1 -> só os itens sem custo cadastrado (pra tela admin corrigir)
export async function GET(request) {
  try {
    const semCusto = new URL(request.url).searchParams.get('sem_custo');
    const rows = semCusto
      ? await sql`
          SELECT codigo, nome, classificacao, setor, unidade, custo
          FROM items WHERE custo IS NULL OR custo = 0
          ORDER BY nome ASC`
      : await sql`
          SELECT codigo, nome, classificacao, setor, unidade, custo
          FROM items
          ORDER BY nome ASC`;
    return Response.json(rows);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/items  { codigo, custo }  -> corrige o custo de um item (só admin)
export async function PATCH(request) {
  const sessao = await lerSessao(request);
  if (!sessao || !sessao.admin) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try {
    const b = await request.json();
    const codigo = String(b.codigo || '').trim();
    const custo = Number(b.custo);
    if (!codigo || !Number.isFinite(custo) || custo <= 0) {
      return Response.json({ error: 'codigo e custo (maior que zero) são obrigatórios' }, { status: 400 });
    }
    const [row] = await sql`
      UPDATE items SET custo = ${custo} WHERE codigo = ${codigo}
      RETURNING codigo, nome, classificacao, setor, unidade, custo`;
    if (!row) return Response.json({ error: 'item não encontrado' }, { status: 404 });
    return Response.json(row);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
