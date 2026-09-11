import { sql } from '../../../lib/db';

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
    if (prods.length === 0) return Response.json([]);

    const ids = prods.map((p) => p.id);
    const insumos = await sql`SELECT * FROM producao_insumos WHERE producao_id = ANY(${ids})`;
    const byProd = {};
    for (const i of insumos) (byProd[i.producao_id] ||= []).push(i);
    const out = prods.map((p) => ({ ...p, insumos: byProd[p.id] || [] }));
    return Response.json(out);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/producao  -> cria produção + insumos
export async function POST(request) {
  try {
    const b = await request.json();
    const insumos = Array.isArray(b.insumos) ? b.insumos : [];
    const custoTotal = insumos.reduce(
      (s, i) => s + (Number(i.quantidade) || 0) * (Number(i.custo_unit) || 0),
      0
    );
    const data = b.data || new Date().toISOString().slice(0, 10);

    const [prod] = await sql`
      INSERT INTO producoes
        (produto, codigo, quantidade_produzida, unidade, responsavel, observacao, custo_total, data)
      VALUES
        (${b.produto}, ${b.codigo || null}, ${Number(b.quantidade_produzida) || null},
         ${b.unidade || null}, ${b.responsavel || null}, ${b.observacao || null},
         ${+custoTotal.toFixed(4)}, ${data})
      RETURNING *`;

    for (const i of insumos) {
      const q = Number(i.quantidade) || 0;
      const cu = Number(i.custo_unit) || 0;
      await sql`
        INSERT INTO producao_insumos
          (producao_id, codigo, nome, unidade, quantidade, custo_unit, custo_total)
        VALUES
          (${prod.id}, ${i.codigo || null}, ${i.nome}, ${i.unidade || null}, ${q}, ${cu}, ${+(q * cu).toFixed(4)})`;
    }
    return Response.json({ ...prod, insumos });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/producao  -> marca/desmarca baixado no Colibri
export async function PATCH(request) {
  try {
    const b = await request.json();
    const id = Number(b.id);
    const [row] = await sql`UPDATE producoes SET baixado=${!!b.baixado} WHERE id=${id} RETURNING *`;
    return Response.json(row);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/producao?id=123
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    await sql`DELETE FROM producoes WHERE id=${id}`;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
