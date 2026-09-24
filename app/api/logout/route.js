import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// POST /api/logout -> limpa o cookie de sessão
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
