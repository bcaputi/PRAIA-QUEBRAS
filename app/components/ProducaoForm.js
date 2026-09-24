'use client';

import { useState } from 'react';
import ItemPicker from './ItemPicker';
import { money, today } from '../../lib/calc/format';
import { apiFetch } from '../../lib/api';

// ---------- Produção ----------
export default function ProducaoForm({ items, func, onSaved }) {
  const [produto, setProduto] = useState(null);
  const [prodNome, setProdNome] = useState('');
  const [rend, setRend] = useState('');
  const [rendUn, setRendUn] = useState('KG');
  const [obs, setObs] = useState('');
  const [data, setData] = useState(today());
  const [insumos, setInsumos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function addInsumo(i) {
    setInsumos((a) => [
      ...a,
      { codigo: i.codigo, nome: i.nome, unidade: i.unidade, custo_unit: Number(i.custo) > 0 ? Number(i.custo) : null, quantidade: '' },
    ]);
  }
  function setInsumoQtd(idx, v) {
    setInsumos((a) => a.map((x, k) => (k === idx ? { ...x, quantidade: v.replace(',', '.') } : x)));
  }
  function rmInsumo(idx) {
    setInsumos((a) => a.filter((_, k) => k !== idx));
  }

  const semCustoCount = insumos.filter((i) => !i.custo_unit).length;
  const custoTotal = insumos.reduce(
    (s, i) => s + (i.custo_unit ? (Number(i.quantidade) || 0) * Number(i.custo_unit) : 0),
    0
  );
  const custoPorUn = rend && Number(rend) > 0 ? custoTotal / Number(rend) : 0;

  const nomeFinal = produto ? produto.nome : prodNome;

  async function submit() {
    if (!nomeFinal || insumos.length === 0) return;
    setSaving(true);
    setErr('');
    const body = {
      produto: nomeFinal,
      codigo: produto ? produto.codigo : null,
      quantidade_produzida: Number(rend) || null,
      unidade: rendUn,
      responsavel: func.nome,
      observacao: obs || null,
      data,
      insumos: insumos.map((i) => ({
        codigo: i.codigo,
        nome: i.nome,
        unidade: i.unidade,
        custo_unit: i.custo_unit || null,
        quantidade: Number(i.quantidade) || 0,
      })),
    };
    try {
      await apiFetch('/api/producao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setProduto(null);
      setProdNome('');
      setRend('');
      setObs('');
      setInsumos([]);
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Nova produção</h2>

      <label>Produto produzido</label>
      {produto ? (
        <div className="selected">
          <div className="n">{produto.nome}</div>
          <div className="x" onClick={() => setProduto(null)}>✕</div>
        </div>
      ) : (
        <>
          <input
            value={prodNome}
            onChange={(e) => setProdNome(e.target.value)}
            placeholder="Nome do produto (ex.: molho, caldo, porção...)"
          />
          <div className="hint">ou escolha um item cadastrado:</div>
          <ItemPicker items={items} onSelect={setProduto} placeholder="Buscar produto cadastrado..." />
        </>
      )}

      <div className="row">
        <div>
          <label>Rendimento</label>
          <input
            inputMode="decimal"
            value={rend}
            onChange={(e) => setRend(e.target.value.replace(',', '.'))}
            placeholder="0"
          />
        </div>
        <div>
          <label>Unidade</label>
          <select value={rendUn} onChange={(e) => setRendUn(e.target.value)}>
            <option>KG</option>
            <option>LT</option>
            <option>UND</option>
            <option>PORÇÕES</option>
          </select>
        </div>
        <div>
          <label>Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
      </div>

      <div className="resp-auto">
        Responsável pela produção: <b>{func.nome}</b>
      </div>

      <h2 style={{ marginTop: 18 }}>Itens usados</h2>
      {insumos.map((i, idx) => (
        <div className="item-log" key={idx}>
          <div className="l" style={{ flex: 1 }}>
            <div className="n">{i.nome}</div>
            <div className="m">
              {i.unidade} · {i.custo_unit ? `custo ${money(i.custo_unit)}` : <span className="sem-custo">sem custo</span>}
            </div>
          </div>
          <div className="r" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              inputMode="decimal"
              style={{ width: 80 }}
              value={i.quantidade}
              onChange={(e) => setInsumoQtd(idx, e.target.value)}
              placeholder="qtd"
            />
            <span className="del" onClick={() => rmInsumo(idx)}>remover</span>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 10 }}>
        <ItemPicker items={items} onSelect={addInsumo} placeholder="+ Adicionar item usado..." />
      </div>

      {custoTotal > 0 && (
        <div className="custo-line" style={{ marginTop: 12 }}>
          Custo dos insumos: {money(custoTotal)}
          {custoPorUn > 0 && <> · Custo por {rendUn.toLowerCase()}: {money(custoPorUn)}</>}
          {semCustoCount > 0 && (
            <span className="aviso-parcial"> · {semCustoCount} insumo(s) sem custo não incluído(s)</span>
          )}
        </div>
      )}

      {err && <div className="pin-error" style={{ position: 'static', marginTop: 8 }}>{err}</div>}

      <button
        className="btn"
        disabled={saving || !nomeFinal || insumos.length === 0}
        onClick={submit}
      >
        {saving ? 'Salvando...' : 'Salvar produção'}
      </button>
    </div>
  );
}
