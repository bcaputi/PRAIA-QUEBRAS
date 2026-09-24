'use client';

import { useState } from 'react';
import ItemPicker from './ItemPicker';
import { money, today } from '../../lib/calc/format';
import { apiFetch } from '../../lib/api';

const MOTIVOS = [
  'Vencido / Validade',
  'Estragado / Deteriorado',
  'Quebra / Queda / Acidente',
  'Erro de preparo',
  'Sobra descartada',
  'Contaminação',
  'Problema de freezer / geladeira',
  'Roubo / Sumiço',
  'Outro',
];

// ---------- Formulário de lançamento (Quebra / Buffet / Refeição) ----------
export default function LancamentoForm({ tipo, items, func, onSaved }) {
  const [sel, setSel] = useState(null);
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [obs, setObs] = useState('');
  const [data, setData] = useState(today());
  const [saving, setSaving] = useState(false);
  const [foto, setFoto] = useState(null);
  const [err, setErr] = useState('');

  const temCusto = sel && Number(sel.custo) > 0;
  const custoTotal = sel && temCusto ? (Number(qtd) || 0) * Number(sel.custo) : 0;

  // Comprime a foto no navegador antes de salvar (reduz muito o tamanho)
  function onFoto(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const max = 1000;
        let { width, height } = img;
        if (width > max || height > max) {
          if (width > height) {
            height = Math.round((height * max) / width);
            width = max;
          } else {
            width = Math.round((width * max) / height);
            height = max;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        setFoto(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!sel || !qtd) return;
    setSaving(true);
    setErr('');
    const body = {
      tipo,
      codigo: sel.codigo,
      nome: sel.nome,
      unidade: sel.unidade,
      quantidade: Number(qtd),
      custo_unit: temCusto ? Number(sel.custo) : null,
      motivo: tipo === 'QUEBRA' ? motivo : null,
      responsavel: func.nome,
      observacao: obs || null,
      foto: tipo === 'QUEBRA' ? foto : null,
      data,
    };
    try {
      await apiFetch('/api/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setSel(null);
      setQtd('');
      setObs('');
      setFoto(null);
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>Novo lançamento</h2>
      {!sel ? (
        <ItemPicker items={items} onSelect={setSel} />
      ) : (
        <div className="selected">
          <div>
            <div className="n">{sel.nome}</div>
            <div className="hint">
              cód {sel.codigo} · {sel.unidade} · custo unit.{' '}
              {temCusto ? money(sel.custo) : <span className="sem-custo">sem custo cadastrado</span>}
            </div>
          </div>
          <div className="x" onClick={() => setSel(null)}>
            ✕
          </div>
        </div>
      )}

      {sel && (
        <>
          <div className="row">
            <div>
              <label>Quantidade ({sel.unidade})</label>
              <input
                inputMode="decimal"
                value={qtd}
                onChange={(e) => setQtd(e.target.value.replace(',', '.'))}
                placeholder="0"
              />
            </div>
            <div>
              <label>Data</label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>

          {tipo === 'QUEBRA' && (
            <>
              <label>Motivo da perda</label>
              <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {MOTIVOS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </>
          )}

          <div className="resp-auto">
            Responsável: <b>{func.nome}</b>
          </div>

          <label>Observação (opcional)</label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} />

          {tipo === 'QUEBRA' && (
            <>
              <label>Foto (opcional)</label>
              {foto ? (
                <div className="foto-preview">
                  <img src={foto} alt="foto da quebra" />
                  <span className="foto-x" onClick={() => setFoto(null)}>
                    remover foto
                  </span>
                </div>
              ) : (
                <label className="foto-btn">
                  📷 Tirar / anexar foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onFoto}
                    hidden
                  />
                </label>
              )}
            </>
          )}

          {temCusto ? (
            custoTotal > 0 && <div className="custo-line">Custo estimado: {money(custoTotal)}</div>
          ) : (
            <div className="custo-line sem-custo">
              Item sem custo cadastrado — o lançamento salva a quantidade normalmente, mas não
              entra nos totais em R$ até alguém corrigir o custo em ⚙️ Funcionários → Itens sem custo.
            </div>
          )}

          {err && <div className="pin-error" style={{ position: 'static', marginTop: 8 }}>{err}</div>}

          <button className="btn" disabled={saving || !qtd} onClick={submit}>
            {saving ? 'Salvando...' : 'Salvar lançamento'}
          </button>
        </>
      )}
    </div>
  );
}
