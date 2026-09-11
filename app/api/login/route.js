import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// POST /api/login  { pin }  -> funcionário (ou 401)
export async function POST(request) {
  try {
    const { pin } = await request.json();
    const rows = await sql`
      SELECT id, nome, cargo, admin, pin
      FROM funcionarios
      WHERE pin = ${String(pin || '')} AND ativo = true`;
    if (!rows.length) {
      return Response.json({ error: 'PIN inválido' }, { status: 401 });
    }
    return Response.json(rows[0]);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
