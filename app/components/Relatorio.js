'use client';

import { useEffect, useState } from 'react';
import { money, num, firstOfMonth, today } from '../../lib/calc/format';
import { agruparPorItem, somarComAviso } from '../../lib/calc/totais';
import { apiFetch } from '../../lib/api';

// ---------- Relatório ----------
export default function Relatorio() {
  const [de, setDe] = useState(firstOfMonth());
  const [ate, setAte] = useState(today());
  const [tipo, setTipo] = useState('QUEBRA');
  const [rows, setRows] = useState([]);
  const [prodRows, setProdRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const isProducao = tipo === 'PRODUCAO';

  async function load() {
    setLoading(true);
    setErr('');
    try {
      if (tipo === 'PRODUCAO') {
        const r = await apiFetch(`/api/producao?de=${de}&ate=${ate}`);
        setProdRows(Array.isArray(r) ? r : []);
      } else {
        const r = await apiFetch(`/api/registros?tipo=${tipo}&de=${de}&ate=${ate}`);
        setRows(Array.isArray(r) ? r : []);
      }
    } catch (e) {
      setErr(e.message);
      setRows([]);
      setProdRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = agruparPorItem(rows);
  const totalQtd = grouped.reduce((s, g) => s + g.qtd, 0);
  const totalCusto = grouped.reduce((s, g) => s + g.custo, 0);
  const itensSemCustoRelatorio = grouped.reduce((s, g) => s + g.semCusto, 0);
  const { soma: totalCustoProd, semCusto: producoesSemCusto } = somarComAviso(prodRows);

  function exportCSV() {
    if (isProducao) {
      const head = ['PRODUTO', 'RENDIMENTO', 'UNIDADE', 'RESPONSAVEL', 'CUSTO_TOTAL', 'DATA'];
      const lines = prodRows.map((p) =>
        [
          p.produto,
          num(p.quantidade_produzida),
          p.unidade,
          p.responsavel,
          p.custo_total == null ? 'SEM CUSTO' : Number(p.custo_total).toFixed(2),
          p.data,
        ]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(';')
      );
      const csv = [head.join(';'), ...lines].join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `producao_${de}_a_${ate}.csv`;
      a.click();
      return;
    }
    const head = ['CODIGO', 'PRODUTO', 'UNIDADE', 'QUANTIDADE', 'CUSTO_TOTAL', 'TIPO', 'PERIODO'];
    const lines = grouped.map((g) =>
      [
        g.codigo,
        g.nome,
        g.unidade,
        num(g.qtd),
        g.semCusto > 0 ? `${g.custo.toFixed(2)} (${g.semCusto} sem custo)` : g.custo.toFixed(2),
        tipo,
        `${de} a ${ate}`,
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(';')
    );
    const csv = [head.join(';'), ...lines].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `baixa_${tipo}_${de}_a_${ate}.csv`;
    a.click();
  }

  return (
    <>
      <div className="card">
        <h2>Relatório para baixa no Colibri</h2>
        <div className="filters">
          <div>
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="QUEBRA">Quebras</option>
              <option value="BUFFET">Buffet</option>
              <option value="REFEICAO">Refeição funcionário</option>
              <option value="PRODUCAO">Produção</option>
            </select>
          </div>
          <div>
            <label>De</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <label>Até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn small" onClick={load}>Gerar</button>
          <button
            className="btn small gray"
            onClick={exportCSV}
            disabled={isProducao ? !prodRows.length : !grouped.length}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {err && <div className="card empty">Erro ao carregar: {err}</div>}

      {isProducao ? (
        <div className="card">
          <h2>
            Produções · {prodRows.length} · {money(totalCustoProd)}
            {producoesSemCusto > 0 && <span className="aviso-parcial"> · {producoesSemCusto} sem custo</span>}
          </h2>
          {loading ? (
            <div className="empty">Carregando...</div>
          ) : prodRows.length === 0 ? (
            <div className="empty">Nada no período.</div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="num">Rendimento</th>
                    <th>Responsável</th>
                    <th className="num">Custo total</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {prodRows.map((p) => (
                    <tr key={p.id}>
                      <td style={{ textTransform: 'capitalize' }}>{p.produto}</td>
                      <td className="num">
                        {num(p.quantidade_produzida)} {p.unidade}
                      </td>
                      <td>{p.responsavel || '—'}</td>
                      <td className="num">{p.custo_total == null ? <span className="sem-custo">sem custo</span> : money(p.custo_total)}</td>
                      <td>{p.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h2>
            Resumo por item · {num(totalQtd)} un · {money(totalCusto)}
            {itensSemCustoRelatorio > 0 && <span className="aviso-parcial"> · {itensSemCustoRelatorio} sem custo</span>}
          </h2>
          {loading ? (
            <div className="empty">Carregando...</div>
          ) : grouped.length === 0 ? (
            <div className="empty">Nada no período.</div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Cód</th>
                    <th>Produto</th>
                    <th className="num">Qtd</th>
                    <th className="num">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((g, i) => (
                    <tr key={i}>
                      <td>{g.codigo}</td>
                      <td style={{ textTransform: 'capitalize' }}>{g.nome}</td>
                      <td className="num">
                        {num(g.qtd)} {g.unidade}
                      </td>
                      <td className="num">
                        {money(g.custo)}
                        {g.semCusto > 0 && <span className="aviso-parcial"> ({g.semCusto} s/ custo)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
