'use client';

import { useEffect, useState } from 'react';
import { money, num, today } from '../../lib/calc/format';
import { somarComAviso } from '../../lib/calc/totais';
import { apiFetch } from '../../lib/api';

// Busca a foto sob demanda (a listagem não traz mais — regra 0.5) e abre numa aba
// nova. Abre a aba ANTES do fetch (dentro do clique) pra não ser barrada por
// bloqueador de pop-up no celular.
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

// ---------- Lista de lançamentos do dia ----------
export default function LancamentoList({ tipo, refresh, onChanged }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try {
      const d = await apiFetch(`/api/registros?tipo=${tipo}&de=${today()}&ate=${today()}`);
      setRows(Array.isArray(d) ? d : []);
    } catch (e) {
      setErr(e.message);
      setRows([]);
    }
  }
  useEffect(() => {
    load();
  }, [tipo, refresh]);

  async function del(id) {
    if (!confirm('Excluir este lançamento?')) return;
    try {
      await apiFetch(`/api/registros?id=${id}`, { method: 'DELETE' });
      load();
      onChanged && onChanged();
    } catch (e) {
      alert(e.message);
    }
  }

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
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, baixado: anterior } : x))); // desfaz
      alert(e.message);
    }
  }

  if (err) return <div className="card empty">Erro ao carregar: {err}</div>;
  if (!rows) return <div className="card empty">Carregando...</div>;
  const { soma: total, semCusto } = somarComAviso(rows);

  return (
    <div className="card">
      <h2>Lançados hoje ({rows.length})</h2>
      {rows.length === 0 && <div className="empty">Nada lançado hoje ainda.</div>}
      {rows.map((r) => (
        <div className={'item-log' + (r.baixado ? ' baixado' : '')} key={r.id}>
          <div className="l" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {r.tem_foto && (
              <button type="button" className="log-thumb-btn" title="Ver foto" onClick={() => verFoto(r.id)}>
                📷
              </button>
            )}
            <div>
              <div className="n">{r.nome}</div>
              <div className="m">
                {r.motivo ? r.motivo + ' · ' : ''}
                {r.responsavel || 'sem responsável'}
              </div>
            </div>
          </div>
          <div className="r">
            <div>
              <b>{num(r.quantidade)}</b> {r.unidade}
            </div>
            <div>{r.custo_total == null ? <span className="sem-custo">sem custo</span> : money(r.custo_total)}</div>
            <label className="check-baixado">
              <input
                type="checkbox"
                checked={!!r.baixado}
                onChange={() => toggleBaixado(r)}
              />
              Baixado
            </label>
            <div className="del" onClick={() => del(r.id)}>
              excluir
            </div>
          </div>
        </div>
      ))}
      {rows.length > 0 && (
        <div className="custo-line" style={{ marginTop: 12 }}>
          Total do dia: {money(total)}
          {semCusto > 0 && (
            <span className="aviso-parcial"> · {semCusto} item(ns) sem custo não incluído(s)</span>
          )}
        </div>
      )}
    </div>
  );
}
