import { NextResponse } from 'next/server';
import { sql } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/registros/foto?id=123 -> { foto } sob demanda (não vem nas listagens)
export async function GET(request) {
  try {
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    const [row] = await sql`SELECT foto FROM registros WHERE id = ${id}`;
    if (!row) return NextResponse.json({ error: 'lançamento não encontrado' }, { status: 404 });
    return NextResponse.json({ foto: row.foto });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
