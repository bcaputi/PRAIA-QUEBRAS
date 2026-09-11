import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/items  -> lista base de itens (com custo)
export async function GET() {
  try {
    const rows = await sql`
      SELECT codigo, nome, classificacao, setor, unidade, custo
      FROM items
      ORDER BY nome ASC`;
    return Response.json(rows);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
