'use client';

import { useEffect, useState } from 'react';
import { money, num, firstOfMonth, today } from '../../lib/calc/format';
import { somarComAviso } from '../../lib/calc/totais';
import { apiFetch } from '../../lib/api';

async function verFoto(id) {
  const w = window.open('', '_blank');
  try {
    const d = await apiFetch(`/api/registros/foto?id=${id}`);
    if (w && d && d.foto) {
      w.document.write(`<img src="${d.foto}" style="max-width:100%">`);
    } else if (w) {
      w.close();
    }
  } catch (e) {
    if (w) w.close();
    alert(e.message);
  }
}

// ---------- Histórico (lançamentos individuais de qualquer período, com foto) ----------
export default function Historico() {
  const [de, setDe] = useState(firstOfMonth());
  const [ate, setAte] = useState(today());
  const [tipo, setTipo] = useState('TODOS');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    const qs = new URLSearchParams({ de, ate });
    if (tipo !== 'TODOS') qs.set('tipo', tipo);
    try {
      const r = await apiFetch(`/api/registros?${qs.toString()}`);
      setRows(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(e.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const { soma: total, semCusto } = somarComAviso(rows);

  async function toggleBaixado(r) {
    const anterior = r.baixado;
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, baixado: !anterior } : x)));
    try {
      await apiFetch('/api/registros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, baixado: !anterior }),
      });
    } catch (e) {
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, baixado: anterior } : x)));
      alert(e.message);
    }
  }

  return (
    <>
      <div className="card">
        <h2>Histórico de lançamentos</h2>
        <div className="filters">
          <div>
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="QUEBRA">Quebra</option>
              <option value="BUFFET">Buffet</option>
              <option value="REFEICAO">Refeição</option>
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
          <button className="btn small" style={{ height: 44 }} onClick={load}>
            Buscar
          </button>
        </div>
      </div>

      <div className="card">
        <h2>
          {rows.length} lançamento{rows.length === 1 ? '' : 's'} · {money(total)}
          {semCusto > 0 && <span className="aviso-parcial"> · {semCusto} sem custo</span>}
        </h2>
        {err ? (
          <div className="empty">Erro ao carregar: {err}</div>
        ) : loading ? (
          <div className="empty">Carregando...</div>
        ) : rows.length === 0 ? (
          <div className="empty">Nada encontrado no período.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>Data</th>
                  <th>Item</th>
                  <th className="num">Qtd</th>
                  <th>Motivo</th>
                  <th>Responsável</th>
                  <th className="num">Custo</th>
                  <th>Baixado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.baixado ? 'baixado' : ''}>
                    <td>
                      {r.tem_foto ? (
                        <button type="button" className="log-thumb-btn" title="Ver foto" onClick={() => verFoto(r.id)}>
                          📷
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{r.data}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.nome}</td>
                    <td className="num">
                      {num(r.quantidade)} {r.unidade}
                    </td>
                    <td>{r.motivo || '—'}</td>
                    <td>{r.responsavel || '—'}</td>
                    <td className="num">{r.custo_total == null ? <span className="sem-custo">sem custo</span> : money(r.custo_total)}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!r.baixado}
                        onChange={() => toggleBaixado(r)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
