import { NextResponse } from 'next/server';
import { sql } from '../../../lib/db';
import { lerSessao } from '../../../lib/session';
import { hojeBrasilia } from '../../../lib/data';
import { validarInsumos } from '../../../lib/calc/validacao';

export const dynamic = 'force-dynamic';

// GET /api/producao?de=...&ate=...  -> produções com seus insumos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const de = searchParams.get('de');
    const ate = searchParams.get('ate');

    let prods;
    if (de && ate) {
      prods = await sql`SELECT * FROM producoes WHERE data BETWEEN ${de} AND ${ate} ORDER BY created_at DESC`;
    } else {
      prods = await sql`SELECT * FROM producoes ORDER BY created_at DESC LIMIT 200`;
    }
    if (prods.length === 0) return NextResponse.json([]);

    const ids = prods.map((p) => p.id);
    const insumos = await sql`SELECT * FROM producao_insumos WHERE producao_id = ANY(${ids})`;
    const byProd = {};
    for (const i of insumos) (byProd[i.producao_id] ||= []).push(i);
    const out = prods.map((p) => ({ ...p, insumos: byProd[p.id] || [] }));
    return NextResponse.json(out);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/producao  -> cria produção + insumos numa ÚNICA instrução SQL (atômica:
// ou grava tudo, ou nada — o driver do Neon não permite usar o id gerado por um
// INSERT dentro de outro no mesmo lote de sql.transaction(), por isso o cabeçalho e
// os insumos entram na mesma instrução via CTE em vez de duas chamadas separadas).
export async function POST(request) {
  try {
    const sessao = await lerSessao(request);
    if (!sessao) return NextResponse.json({ error: 'Sessão inválida — faça login de novo' }, { status: 401 });

    const b = await request.json();
    const produto = String(b.produto || '').trim();
    if (!produto) {
      return NextResponse.json({ error: 'produto é obrigatório' }, { status: 400 });
    }
    const vi = validarInsumos(b.insumos);
    if (vi.erro) return NextResponse.json({ error: vi.erro }, { status: 400 });
    const insumosParaSalvar = vi.insumos;

    // soma só os insumos com custo conhecido; se nenhum tiver, fica null (não 0)
    const somaConhecida = insumosParaSalvar.reduce((s, i) => s + (i.custo_total || 0), 0);
    const custoTotal = somaConhecida > 0 ? +somaConhecida.toFixed(4) : null;

    const qtdProduzida = Number(b.quantidade_produzida);
    const data = b.data || hojeBrasilia();

    const [row] = await sql`
      WITH nova_producao AS (
        INSERT INTO producoes (produto, codigo, quantidade_produzida, unidade, responsavel, observacao, custo_total, data)
        VALUES (${produto}, ${b.codigo || null}, ${Number.isFinite(qtdProduzida) ? qtdProduzida : null},
                ${b.unidade || null}, ${sessao.nome}, ${b.observacao || null}, ${custoTotal}, ${data})
        RETURNING *
      ),
      insumos_expandidos AS (
        SELECT
          (x->>'codigo') AS codigo,
          (x->>'nome') AS nome,
          (x->>'unidade') AS unidade,
          (x->>'quantidade')::numeric AS quantidade,
          (x->>'custo_unit')::numeric AS custo_unit,
          (x->>'custo_total')::numeric AS custo_total
        FROM jsonb_array_elements(${JSON.stringify(insumosParaSalvar)}::jsonb) AS x
      ),
      ins AS (
        INSERT INTO producao_insumos (producao_id, codigo, nome, unidade, quantidade, custo_unit, custo_total)
        SELECT nova_producao.id, insumos_expandidos.codigo, insumos_expandidos.nome, insumos_expandidos.unidade,
               insumos_expandidos.quantidade, insumos_expandidos.custo_unit, insumos_expandidos.custo_total
        FROM insumos_expandidos, nova_producao
        RETURNING *
      )
      SELECT
        (SELECT row_to_json(np) FROM nova_producao np) AS producao,
        COALESCE((SELECT jsonb_agg(i) FROM ins i), '[]'::jsonb) AS insumos
    `;

    return NextResponse.json({ ...row.producao, insumos: row.insumos });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/producao  -> marca/desmarca baixado no Colibri (qualquer funcionário logado)
export async function PATCH(request) {
  try {
    const sessao = await lerSessao(request);
    if (!sessao) return NextResponse.json({ error: 'Sessão inválida — faça login de novo' }, { status: 401 });

    const b = await request.json();
    const id = Number(b.id);
    const [row] = await sql`UPDATE producoes SET baixado=${!!b.baixado} WHERE id=${id} RETURNING id, baixado`;
    if (!row) return NextResponse.json({ error: 'produção não encontrada' }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/producao?id=123 -> só admin, ou o próprio autor no mesmo dia em que criou
export async function DELETE(request) {
  try {
    const sessao = await lerSessao(request);
    if (!sessao) return NextResponse.json({ error: 'Sessão inválida — faça login de novo' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    const [existente] = await sql`
      SELECT responsavel,
        (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (now() AT TIME ZONE 'America/Sao_Paulo')::date AS eh_hoje
      FROM producoes WHERE id=${id}`;
    if (!existente) return NextResponse.json({ error: 'produção não encontrada' }, { status: 404 });

    const podeExcluir = sessao.admin || (existente.responsavel === sessao.nome && existente.eh_hoje);
    if (!podeExcluir) {
      return NextResponse.json(
        { error: 'só um admin, ou quem lançou (no mesmo dia), pode excluir esta produção' },
        { status: 403 }
      );
    }

    await sql`DELETE FROM producoes WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
