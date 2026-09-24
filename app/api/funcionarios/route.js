import { sql } from '../../../lib/db';
import { lerSessao } from '../../../lib/session';

export const dynamic = 'force-dynamic';

// Só admins (sessão em cookie, não mais um PIN em header) podem alterar
async function isAdmin(request) {
  const sessao = await lerSessao(request);
  return !!(sessao && sessao.admin);
}

function unique(e) {
  const s = String(e).toLowerCase();
  return s.includes('unique') || s.includes('duplicate');
}

// GET -> lista (sem os PINs)
export async function GET() {
  try {
    const rows = await sql`SELECT id, nome, cargo, admin, ativo FROM funcionarios ORDER BY nome ASC`;
    return Response.json(rows);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// POST -> cria funcionário
export async function POST(request) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try {
    const b = await request.json();
    if (!b.nome || !b.pin) return Response.json({ error: 'Nome e PIN obrigatórios' }, { status: 400 });
    const [row] = await sql`
      INSERT INTO funcionarios (nome, pin, cargo, admin)
      VALUES (${b.nome}, ${String(b.pin)}, ${b.cargo || null}, ${!!b.admin})
      RETURNING id, nome, cargo, admin, ativo`;
    return Response.json(row);
  } catch (e) {
    if (unique(e)) return Response.json({ error: 'Esse PIN já é usado por outro funcionário' }, { status: 409 });
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH -> edita funcionário (nome, cargo, admin, ativo e opcionalmente pin)
export async function PATCH(request) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try {
    const b = await request.json();
    const ativo = b.ativo !== false;
    let row;
    if (b.pin) {
      [row] = await sql`
        UPDATE funcionarios
        SET nome=${b.nome}, cargo=${b.cargo || null}, admin=${!!b.admin}, ativo=${ativo}, pin=${String(b.pin)}
        WHERE id=${b.id}
        RETURNING id, nome, cargo, admin, ativo`;
    } else {
      [row] = await sql`
        UPDATE funcionarios
        SET nome=${b.nome}, cargo=${b.cargo || null}, admin=${!!b.admin}, ativo=${ativo}
        WHERE id=${b.id}
        RETURNING id, nome, cargo, admin, ativo`;
    }
    return Response.json(row);
  } catch (e) {
    if (unique(e)) return Response.json({ error: 'Esse PIN já é usado por outro funcionário' }, { status: 409 });
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE ?id=123
export async function DELETE(request) {
  if (!(await isAdmin(request))) return Response.json({ error: 'Acesso negado' }, { status: 403 });
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    await sql`DELETE FROM funcionarios WHERE id=${id}`;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
