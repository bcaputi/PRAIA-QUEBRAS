import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { lerSessao } from '../../../lib/session';
import { hojeBrasilia } from '../../../lib/data';
import { validarRegistro } from '../../../lib/calc/validacao';

export const dynamic = 'force-dynamic';

// GET /api/registros?tipo=QUEBRA&de=2026-09-01&ate=2026-09-30
// Nunca traz a coluna foto (base64 grande) numa listagem — só se ela existe (tem_foto),
// pra a tela decidir se mostra miniatura, buscada sob demanda em /api/registros/foto.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const de = searchParams.get('de');
    const ate = searchParams.get('ate');

    let rows;
    if (tipo && de && ate) {
      rows = await sql`
        SELECT id, tipo, codigo, nome, unidade, quantidade, custo_unit, custo_total,
          motivo, responsavel, observacao, baixado, data, created_at, (foto IS NOT NULL) AS tem_foto
        FROM registros WHERE tipo=${tipo} AND data BETWEEN ${de} AND ${ate} ORDER BY created_at DESC`;
    } else if (de && ate) {
      rows = await sql`
        SELECT id, tipo, codigo, nome, unidade, quantidade, custo_unit, custo_total,
          motivo, responsavel, observacao, baixado, data, created_at, (foto IS NOT NULL) AS tem_foto
        FROM registros WHERE data BETWEEN ${de} AND ${ate} ORDER BY created_at DESC`;
    } else if (tipo) {
      rows = await sql`
        SELECT id, tipo, codigo, nome, unidade, quantidade, custo_unit, custo_total,
          motivo, responsavel, observacao, baixado, data, created_at, (foto IS NOT NULL) AS tem_foto
        FROM registros WHERE tipo=${tipo} ORDER BY created_at DESC LIMIT 300`;
    } else {
      rows = await sql`
        SELECT id, tipo, codigo, nome, unidade, quantidade, custo_unit, custo_total,
          motivo, responsavel, observacao, baixado, data, created_at, (foto IS NOT NULL) AS tem_foto
        FROM registros ORDER BY created_at DESC LIMIT 300`;
    }
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/registros  -> cria um lançamento
// Entrada inválida vira 400 (nunca vira 0/gravado errado silenciosamente).
export async function POST(request) {
  try {
    const sessao = await lerSessao(request);
    if (!sessao) return NextResponse.json({ error: 'Sessão inválida — faça login de novo' }, { status: 401 });

    const b = await request.json();

    // Entrada inválida vira 400; item sem custo (0/ausente) grava NULL, não 0 —
    // ver lib/calc/validacao.js.
    const v = validarRegistro(b);
    if (v.erro) return NextResponse.json({ error: v.erro }, { status: 400 });
    const { tipo, quantidade, nome, motivo, custoUnit, custoTotal } = v.valores;
    const data = b.data || hojeBrasilia();

    const [row] = await sql`
      INSERT INTO registros
        (tipo, codigo, nome, unidade, quantidade, custo_unit, custo_total, motivo, responsavel, observacao, foto, data)
      VALUES
        (${tipo}, ${b.codigo || null}, ${nome}, ${b.unidade || null}, ${quantidade},
         ${custoUnit}, ${custoTotal}, ${motivo}, ${sessao.nome}, ${b.observacao || null},
         ${b.foto || null}, ${data})
      RETURNING id, tipo, codigo, nome, unidade, quantidade, custo_unit, custo_total,
        motivo, responsavel, observacao, baixado, data, created_at, (foto IS NOT NULL) AS tem_foto`;
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/registros  -> marca/desmarca baixado no Colibri (qualquer funcionário logado)
export async function PATCH(request) {
  try {
    const sessao = await lerSessao(request);
    if (!sessao) return NextResponse.json({ error: 'Sessão inválida — faça login de novo' }, { status: 401 });

    const b = await request.json();
    const id = Number(b.id);
    const [row] = await sql`UPDATE registros SET baixado=${!!b.baixado} WHERE id=${id} RETURNING id, baixado`;
    if (!row) return NextResponse.json({ error: 'lançamento não encontrado' }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/registros?id=123 -> só admin, ou o próprio autor no mesmo dia em que criou
export async function DELETE(request) {
  try {
    const sessao = await lerSessao(request);
    if (!sessao) return NextResponse.json({ error: 'Sessão inválida — faça login de novo' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    const [existente] = await sql`
      SELECT responsavel,
        (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date AS eh_hoje
      FROM registros WHERE id=${id}`;
    if (!existente) return NextResponse.json({ error: 'lançamento não encontrado' }, { status: 404 });

    const podeExcluir = sessao.admin || (existente.responsavel === sessao.nome && existente.eh_hoje);
    if (!podeExcluir) {
      return NextResponse.json(
        { error: 'só um admin, ou quem lançou (no mesmo dia), pode excluir este registro' },
        { status: 403 }
      );
    }

    await sql`DELETE FROM registros WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
