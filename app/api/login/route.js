import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { criarToken, COOKIE_NAME, COOKIE_OPTS } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// POST /api/login  { pin }  -> funcionário (sem o pin) + cookie de sessão httpOnly
export async function POST(request) {
  try {
    const { pin } = await request.json();
    const rows = await sql`
      SELECT id, nome, cargo, admin
      FROM funcionarios
      WHERE pin = ${String(pin || '')} AND ativo = true`;
    if (!rows.length) {
      return NextResponse.json({ error: 'PIN inválido' }, { status: 401 });
    }
    const func = rows[0];
    const res = NextResponse.json(func);
    res.cookies.set(COOKIE_NAME, criarToken(func.id), COOKIE_OPTS);
    return res;
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
