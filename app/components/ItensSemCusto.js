'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

// ---------- Itens sem custo cadastrado (admin) — regra 0.7 ----------
// Lista os itens do cadastro com custo nulo/zero, pra corrigir sem precisar mexer
// direto no banco. Enquanto não corrigido, esses itens ficam fora dos totais em R$
// (o lançamento em si continua funcionando, só o custo_unit é gravado como NULL).
export default function ItensSemCusto() {
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState({}); // codigo -> valor digitado
  const [saving, setSaving] = useState({}); // codigo -> bool
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      setRows(await apiFetch('/api/items?sem_custo=1'));
    } catch (e) {
      setMsg(e.message);
      setRows([]);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function salvar(codigo) {
    const valor = Number(String(edit[codigo] || '').replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0) {
      setMsg('Digite um custo maior que zero.');
      return;
    }
    setMsg('');
    setSaving((s) => ({ ...s, [codigo]: true }));
    try {
      await apiFetch('/api/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, custo: valor }),
      });
      load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving((s) => ({ ...s, [codigo]: false }));
    }
  }

  return (
    <div className="card">
      <h2>Itens sem custo {rows ? `(${rows.length})` : ''}</h2>
      <div className="hint" style={{ marginBottom: 10 }}>
        Esses itens não entram nos totais em R$ dos relatórios até você corrigir o custo aqui —
        lançamentos com eles continuam salvando a quantidade normalmente.
      </div>
      {msg && <div className="pin-error" style={{ position: 'static', marginBottom: 8 }}>{msg}</div>}
      {!rows ? (
        <div className="empty">Carregando...</div>
      ) : rows.length === 0 ? (
        <div className="empty">Nenhum item sem custo — tudo certo.</div>
      ) : (
        rows.map((it) => (
          <div className="item-log" key={it.codigo}>
            <div className="l">
              <div className="n">{it.nome}</div>
              <div className="m">
                cód {it.codigo} · {it.unidade} · {it.classificacao}
              </div>
            </div>
            <div className="r" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                inputMode="decimal"
                style={{ width: 90 }}
                placeholder="custo R$"
                value={edit[it.codigo] || ''}
                onChange={(e) => setEdit((s) => ({ ...s, [it.codigo]: e.target.value }))}
              />
              <button
                className="btn small"
                disabled={saving[it.codigo]}
                onClick={() => salvar(it.codigo)}
              >
                {saving[it.codigo] ? '...' : 'salvar'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
