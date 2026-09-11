import { sql } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/registros?tipo=QUEBRA&de=2026-09-01&ate=2026-09-30
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const de = searchParams.get('de');
    const ate = searchParams.get('ate');

    let rows;
    if (tipo && de && ate) {
      rows = await sql`SELECT * FROM registros WHERE tipo=${tipo} AND data BETWEEN ${de} AND ${ate} ORDER BY created_at DESC`;
    } else if (de && ate) {
      rows = await sql`SELECT * FROM registros WHERE data BETWEEN ${de} AND ${ate} ORDER BY created_at DESC`;
    } else if (tipo) {
      rows = await sql`SELECT * FROM registros WHERE tipo=${tipo} ORDER BY created_at DESC LIMIT 300`;
    } else {
      rows = await sql`SELECT * FROM registros ORDER BY created_at DESC LIMIT 300`;
    }
    return Response.json(rows);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/registros  -> cria um lançamento
export async function POST(request) {
  try {
    const b = await request.json();
    const qtd = Number(b.quantidade) || 0;
    const custoUnit = Number(b.custo_unit) || 0;
    const custoTotal = +(qtd * custoUnit).toFixed(4);
    const data = b.data || new Date().toISOString().slice(0, 10);

    const [row] = await sql`
      INSERT INTO registros
        (tipo, codigo, nome, unidade, quantidade, custo_unit, custo_total, motivo, responsavel, observacao, foto, data)
      VALUES
        (${b.tipo}, ${b.codigo || null}, ${b.nome}, ${b.unidade || null}, ${qtd},
         ${custoUnit}, ${custoTotal}, ${b.motivo || null}, ${b.responsavel || null},
         ${b.observacao || null}, ${b.foto || null}, ${data})
      RETURNING *`;
    return Response.json(row);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/registros  -> marca/desmarca baixado no Colibri
export async function PATCH(request) {
  try {
    const b = await request.json();
    const id = Number(b.id);
    const [row] = await sql`UPDATE registros SET baixado=${!!b.baixado} WHERE id=${id} RETURNING *`;
    return Response.json(row);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/registros?id=123
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    await sql`DELETE FROM registros WHERE id=${id}`;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
