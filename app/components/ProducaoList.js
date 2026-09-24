'use client';

import { useEffect, useState } from 'react';
import { money, num, today, firstOfMonth } from '../../lib/calc/format';
import { somarComAviso } from '../../lib/calc/totais';
import { apiFetch } from '../../lib/api';

export default function ProducaoList({ refresh, onChanged }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try {
      const d = await apiFetch(`/api/producao?de=${firstOfMonth()}&ate=${today()}`);
      setRows(Array.isArray(d) ? d : []);
    } catch (e) {
      setErr(e.message);
      setRows([]);
    }
  }
  useEffect(() => {
    load();
  }, [refresh]);

  async function del(id) {
    if (!confirm('Excluir esta produção?')) return;
    try {
      await apiFetch(`/api/producao?id=${id}`, { method: 'DELETE' });
      load();
      onChanged && onChanged();
    } catch (e) {
      alert(e.message);
    }
  }

  async function toggleBaixado(p) {
    const anterior = p.baixado;
    setRows((rs) => rs.map((x) => (x.id === p.id ? { ...x, baixado: !anterior } : x)));
    try {
      await apiFetch('/api/producao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, baixado: !anterior }),
      });
    } catch (e) {
      setRows((rs) => rs.map((x) => (x.id === p.id ? { ...x, baixado: anterior } : x)));
      alert(e.message);
    }
  }

  if (err) return <div className="card empty">Erro ao carregar: {err}</div>;
  if (!rows) return <div className="card empty">Carregando...</div>;
  const { semCusto } = somarComAviso(rows);

  return (
    <div className="card">
      <h2>Produções do mês ({rows.length})</h2>
      {semCusto > 0 && (
        <div className="aviso-parcial" style={{ marginBottom: 8 }}>
          {semCusto} produção(ões) com insumo sem custo — custo total não é confiável nelas.
        </div>
      )}
      {rows.length === 0 && <div className="empty">Nenhuma produção lançada ainda.</div>}
      {rows.map((p) => (
        <div
          key={p.id}
          className={p.baixado ? 'baixado' : ''}
          style={{ borderBottom: '1px solid #f1f5f9', padding: '10px 0' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div className="n" style={{ fontWeight: 700, textTransform: 'capitalize' }}>
                {p.produto}
              </div>
              <div className="m" style={{ fontSize: 12, color: '#64748b' }}>
                {p.data} · rende {num(p.quantidade_produzida)} {p.unidade} ·{' '}
                {p.responsavel || 'sem responsável'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>{p.custo_total == null ? <span className="sem-custo">sem custo</span> : money(p.custo_total)}</div>
              <label className="check-baixado">
                <input
                  type="checkbox"
                  checked={!!p.baixado}
                  onChange={() => toggleBaixado(p)}
                />
                Baixado
              </label>
              <div className="del" onClick={() => del(p.id)}>excluir</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
            {p.insumos.map((i) => `${i.nome} (${num(i.quantidade)}${i.unidade || ''})`).join(', ')}
          </div>
        </div>
      ))}
    </div>
  );
}
