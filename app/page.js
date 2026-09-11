'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const TABS = [
  { id: 'QUEBRA', label: '💥 Quebras' },
  { id: 'BUFFET', label: '🍽️ Buffet' },
  { id: 'REFEICAO', label: '👥 Refeição Func.' },
  { id: 'PRODUCAO', label: '🍳 Produção' },
  { id: 'HISTORICO', label: '🕘 Histórico' },
  { id: 'DASHBOARD', label: '📊 Dashboard' },
  { id: 'RELATORIO', label: '📋 Relatório' },
];

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

const money = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (n) =>
  (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

function today() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function firstOfMonth() {
  return today().slice(0, 8) + '01';
}

// ---------- Teclado de PIN ----------
function PinPad({ onSubmit, loading, error, title, subtitle, cta }) {
  const [pin, setPin] = useState('');
  const press = (d) => setPin((p) => (p.length >= 6 ? p : p + d));
  const back = () => setPin((p) => p.slice(0, -1));
  const clear = () => setPin('');
  const go = () => {
    if (pin.length >= 4) onSubmit(pin, clear);
  };
  return (
    <div className="pinpad">
      {title && <div className="pin-title">{title}</div>}
      {subtitle && <div className="pin-sub">{subtitle}</div>}
      <div className="pin-dots">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={'dot' + (i < pin.length ? ' on' : '') + (i >= 4 ? ' opt' : '')} />
        ))}
      </div>
      {error && <div className="pin-error">{error}</div>}
      <div className="keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} className="key" onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button className="key alt" onClick={back}>
          ⌫
        </button>
        <button className="key" onClick={() => press('0')}>
          0
        </button>
        <button className="key ok" disabled={pin.length < 4 || loading} onClick={go}>
          {loading ? '...' : cta || 'OK'}
        </button>
      </div>
    </div>
  );
}

// ---------- Tela de login ----------
function Login({ onLogin }) {
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(pin, clear) {
    setLoading(true);
    setErr('');
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    setLoading(false);
    if (r.ok) {
      onLogin(await r.json());
    } else {
      setErr('PIN inválido ou inativo');
      clear();
    }
  }
  return (
    <div className="login-screen">
      <div className="login-card">
        <img className="brand-logo" src="/logo.png" alt="Praia da Tiquatira" />
        <PinPad
          onSubmit={submit}
          loading={loading}
          error={err}
          title="Digite seu PIN"
          subtitle="Identifique-se para lançar"
          cta="Entrar"
        />
      </div>
    </div>
  );
}

// ---------- Busca de item ----------
function ItemPicker({ items, onSelect, placeholder }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return items
      .filter(
        (i) =>
          i.nome.toLowerCase().includes(t) || (i.codigo || '').toLowerCase().includes(t)
      )
      .slice(0, 30);
  }, [q, items]);

  useEffect(() => {
    function h(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="search-box" ref={boxRef}>
      <input
        value={q}
        placeholder={placeholder || 'Buscar item por nome ou código...'}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="results">
          {results.map((i) => (
            <div
              key={i.codigo}
              className="result"
              onClick={() => {
                onSelect(i);
                setQ('');
                setOpen(false);
              }}
            >
              <div className="n">{i.nome}</div>
              <div className="m">
                <span className={'chip ' + (i.classificacao || '').toLowerCase()}>
                  {i.classificacao}
                </span>{' '}
                cód {i.codigo} · {i.unidade} · custo {money(i.custo)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Formulário de lançamento (Quebra / Buffet / Refeição) ----------
function LancamentoForm({ tipo, items, func, onSaved }) {
  const [sel, setSel] = useState(null);
  const [qtd, setQtd] = useState('');
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [obs, setObs] = useState('');
  const [data, setData] = useState(today());
  const [saving, setSaving] = useState(false);
  const [foto, setFoto] = useState(null);

  const custoTotal = sel ? (Number(qtd) || 0) * Number(sel.custo || 0) : 0;

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
    const body = {
      tipo,
      codigo: sel.codigo,
      nome: sel.nome,
      unidade: sel.unidade,
      quantidade: Number(qtd),
      custo_unit: Number(sel.custo || 0),
      motivo: tipo === 'QUEBRA' ? motivo : null,
      responsavel: func.nome,
      observacao: obs || null,
      foto: tipo === 'QUEBRA' ? foto : null,
      data,
    };
    const r = await fetch('/api/registros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) {
      setSel(null);
      setQtd('');
      setObs('');
      setFoto(null);
      onSaved();
    } else {
      alert('Erro ao salvar. Tente de novo.');
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
              cód {sel.codigo} · {sel.unidade} · custo unit. {money(sel.custo)}
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

          {custoTotal > 0 && (
            <div className="custo-line">Custo estimado: {money(custoTotal)}</div>
          )}

          <button className="btn" disabled={saving || !qtd} onClick={submit}>
            {saving ? 'Salvando...' : 'Salvar lançamento'}
          </button>
        </>
      )}
    </div>
  );
}

// ---------- Lista de lançamentos do dia ----------
function LancamentoList({ tipo, refresh, onChanged }) {
  const [rows, setRows] = useState(null);

  async function load() {
    const r = await fetch(`/api/registros?tipo=${tipo}&de=${today()}&ate=${today()}`);
    setRows(await r.json());
  }
  useEffect(() => {
    load();
  }, [tipo, refresh]);

  async function del(id) {
    if (!confirm('Excluir este lançamento?')) return;
    await fetch(`/api/registros?id=${id}`, { method: 'DELETE' });
    load();
    onChanged && onChanged();
  }

  async function toggleBaixado(r) {
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, baixado: !r.baixado } : x)));
    await fetch('/api/registros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, baixado: !r.baixado }),
    });
  }

  if (!rows) return <div className="card empty">Carregando...</div>;
  const total = rows.reduce((s, r) => s + Number(r.custo_total || 0), 0);

  return (
    <div className="card">
      <h2>Lançados hoje ({rows.length})</h2>
      {rows.length === 0 && <div className="empty">Nada lançado hoje ainda.</div>}
      {rows.map((r) => (
        <div className={'item-log' + (r.baixado ? ' baixado' : '')} key={r.id}>
          <div className="l" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {r.foto && (
              <a href={r.foto} target="_blank" rel="noreferrer">
                <img className="log-thumb" src={r.foto} alt="foto" />
              </a>
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
            <div>{money(r.custo_total)}</div>
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
        </div>
      )}
    </div>
  );
}

// ---------- Produção ----------
function ProducaoForm({ items, func, onSaved }) {
  const [produto, setProduto] = useState(null);
  const [prodNome, setProdNome] = useState('');
  const [rend, setRend] = useState('');
  const [rendUn, setRendUn] = useState('KG');
  const [obs, setObs] = useState('');
  const [data, setData] = useState(today());
  const [insumos, setInsumos] = useState([]);
  const [saving, setSaving] = useState(false);

  function addInsumo(i) {
    setInsumos((a) => [
      ...a,
      { codigo: i.codigo, nome: i.nome, unidade: i.unidade, custo_unit: Number(i.custo || 0), quantidade: '' },
    ]);
  }
  function setInsumoQtd(idx, v) {
    setInsumos((a) => a.map((x, k) => (k === idx ? { ...x, quantidade: v.replace(',', '.') } : x)));
  }
  function rmInsumo(idx) {
    setInsumos((a) => a.filter((_, k) => k !== idx));
  }

  const custoTotal = insumos.reduce(
    (s, i) => s + (Number(i.quantidade) || 0) * Number(i.custo_unit || 0),
    0
  );
  const custoPorUn = rend && Number(rend) > 0 ? custoTotal / Number(rend) : 0;

  const nomeFinal = produto ? produto.nome : prodNome;

  async function submit() {
    if (!nomeFinal || insumos.length === 0) return;
    setSaving(true);
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
        custo_unit: Number(i.custo_unit) || 0,
        quantidade: Number(i.quantidade) || 0,
      })),
    };
    const r = await fetch('/api/producao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (r.ok) {
      setProduto(null);
      setProdNome('');
      setRend('');
      setObs('');
      setInsumos([]);
      onSaved();
    } else {
      alert('Erro ao salvar produção.');
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
            <div className="m">{i.unidade} · custo {money(i.custo_unit)}</div>
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
        </div>
      )}

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

function ProducaoList({ refresh, onChanged }) {
  const [rows, setRows] = useState(null);
  async function load() {
    const r = await fetch(`/api/producao?de=${firstOfMonth()}&ate=${today()}`);
    setRows(await r.json());
  }
  useEffect(() => {
    load();
  }, [refresh]);

  async function del(id) {
    if (!confirm('Excluir esta produção?')) return;
    await fetch(`/api/producao?id=${id}`, { method: 'DELETE' });
    load();
    onChanged && onChanged();
  }

  async function toggleBaixado(p) {
    setRows((rs) => rs.map((x) => (x.id === p.id ? { ...x, baixado: !p.baixado } : x)));
    await fetch('/api/producao', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, baixado: !p.baixado }),
    });
  }

  if (!rows) return <div className="card empty">Carregando...</div>;
  return (
    <div className="card">
      <h2>Produções do mês ({rows.length})</h2>
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
              <div>{money(p.custo_total)}</div>
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

// ---------- Histórico (lançamentos individuais de qualquer período, com foto) ----------
function Historico() {
  const [de, setDe] = useState(firstOfMonth());
  const [ate, setAte] = useState(today());
  const [tipo, setTipo] = useState('TODOS');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams({ de, ate });
    if (tipo !== 'TODOS') qs.set('tipo', tipo);
    const r = await fetch(`/api/registros?${qs.toString()}`).then((x) => x.json());
    setRows(Array.isArray(r) ? r : []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const total = rows.reduce((s, r) => s + Number(r.custo_total || 0), 0);

  async function toggleBaixado(r) {
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, baixado: !r.baixado } : x)));
    await fetch('/api/registros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, baixado: !r.baixado }),
    });
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
        </h2>
        {loading ? (
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
                      {r.foto ? (
                        <a href={r.foto} target="_blank" rel="noreferrer">
                          <img className="log-thumb" src={r.foto} alt="foto" />
                        </a>
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
                    <td className="num">{money(r.custo_total)}</td>
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

// ---------- Dashboard ----------
function Dashboard() {
  const [de, setDe] = useState(firstOfMonth());
  const [ate, setAte] = useState(today());
  const [reg, setReg] = useState([]);
  const [prod, setProd] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [r1, r2] = await Promise.all([
      fetch(`/api/registros?de=${de}&ate=${ate}`).then((r) => r.json()),
      fetch(`/api/producao?de=${de}&ate=${ate}`).then((r) => r.json()),
    ]);
    setReg(Array.isArray(r1) ? r1 : []);
    setProd(Array.isArray(r2) ? r2 : []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const sumTipo = (t) =>
    reg.filter((r) => r.tipo === t).reduce((s, r) => s + Number(r.custo_total || 0), 0);
  const custoQuebra = sumTipo('QUEBRA');
  const custoBuffet = sumTipo('BUFFET');
  const custoRef = sumTipo('REFEICAO');
  const custoProd = prod.reduce((s, p) => s + Number(p.custo_total || 0), 0);

  const topQuebra = useMemo(() => {
    const map = {};
    reg
      .filter((r) => r.tipo === 'QUEBRA')
      .forEach((r) => {
        map[r.nome] = (map[r.nome] || 0) + Number(r.custo_total || 0);
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [reg]);
  const maxQ = topQuebra.length ? topQuebra[0][1] : 1;

  const motivos = useMemo(() => {
    const map = {};
    reg
      .filter((r) => r.tipo === 'QUEBRA')
      .forEach((r) => {
        const k = r.motivo || 'Sem motivo';
        map[k] = (map[k] || 0) + Number(r.custo_total || 0);
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [reg]);
  const maxM = motivos.length ? motivos[0][1] : 1;

  return (
    <>
      <div className="card">
        <h2>Período</h2>
        <div className="filters">
          <div>
            <label>De</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </div>
          <div>
            <label>Até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </div>
          <button className="btn small" style={{ height: 44 }} onClick={load}>
            Atualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card empty">Carregando...</div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi red">
              <div className="v">{money(custoQuebra)}</div>
              <div className="k">💥 Perdas / quebras</div>
            </div>
            <div className="kpi violet">
              <div className="v">{money(custoBuffet)}</div>
              <div className="k">🍽️ Consumo buffet</div>
            </div>
            <div className="kpi orange">
              <div className="v">{money(custoRef)}</div>
              <div className="k">👥 Refeição funcionário</div>
            </div>
            <div className="kpi cyan">
              <div className="v">{money(custoProd)}</div>
              <div className="k">🍳 Custo produção</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 14 }}>
            <h2>Top itens em perdas (por custo)</h2>
            {topQuebra.length === 0 && <div className="empty">Sem quebras no período.</div>}
            {topQuebra.map(([nome, v]) => (
              <div className="bar-row" key={nome}>
                <div className="top">
                  <span className="name">{nome}</span>
                  <span>{money(v)}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: (v / maxQ) * 100 + '%' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>Perdas por motivo</h2>
            {motivos.length === 0 && <div className="empty">Sem quebras no período.</div>}
            {motivos.map(([nome, v]) => (
              <div className="bar-row" key={nome}>
                <div className="top">
                  <span className="name">{nome}</span>
                  <span>{money(v)}</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: (v / maxM) * 100 + '%', background: '#dc2626' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ---------- Relatório ----------
function Relatorio() {
  const [de, setDe] = useState(firstOfMonth());
  const [ate, setAte] = useState(today());
  const [tipo, setTipo] = useState('QUEBRA');
  const [rows, setRows] = useState([]);
  const [prodRows, setProdRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const isProducao = tipo === 'PRODUCAO';

  async function load() {
    setLoading(true);
    if (tipo === 'PRODUCAO') {
      const r = await fetch(`/api/producao?de=${de}&ate=${ate}`).then((x) => x.json());
      setProdRows(Array.isArray(r) ? r : []);
    } else {
      const r = await fetch(`/api/registros?tipo=${tipo}&de=${de}&ate=${ate}`).then((x) => x.json());
      setRows(Array.isArray(r) ? r : []);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const k = r.codigo || r.nome;
      if (!map[k])
        map[k] = { codigo: r.codigo, nome: r.nome, unidade: r.unidade, qtd: 0, custo: 0 };
      map[k].qtd += Number(r.quantidade || 0);
      map[k].custo += Number(r.custo_total || 0);
    });
    return Object.values(map).sort((a, b) => b.custo - a.custo);
  }, [rows]);

  const totalQtd = grouped.reduce((s, g) => s + g.qtd, 0);
  const totalCusto = grouped.reduce((s, g) => s + g.custo, 0);
  const totalCustoProd = prodRows.reduce((s, p) => s + Number(p.custo_total || 0), 0);

  function exportCSV() {
    if (isProducao) {
      const head = ['PRODUTO', 'RENDIMENTO', 'UNIDADE', 'RESPONSAVEL', 'CUSTO_TOTAL', 'DATA'];
      const lines = prodRows.map((p) =>
        [
          p.produto,
          num(p.quantidade_produzida),
          p.unidade,
          p.responsavel,
          Number(p.custo_total || 0).toFixed(2),
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
      [g.codigo, g.nome, g.unidade, num(g.qtd), g.custo.toFixed(2), tipo, `${de} a ${ate}`]
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

      {isProducao ? (
        <div className="card">
          <h2>
            Produções · {prodRows.length} · {money(totalCustoProd)}
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
                      <td className="num">{money(p.custo_total)}</td>
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
                      <td className="num">{money(g.custo)}</td>
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

// ---------- Gestão de funcionários (admin) ----------
function ConfigFuncionarios({ func }) {
  const [rows, setRows] = useState(null);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [pin, setPin] = useState('');
  const [admin, setAdmin] = useState(false);
  const [msg, setMsg] = useState('');

  const headers = { 'Content-Type': 'application/json', 'x-admin-pin': func.pin };

  async function load() {
    const r = await fetch('/api/funcionarios');
    setRows(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    setMsg('');
    if (!nome || pin.length < 4) {
      setMsg('Preencha nome e um PIN de 4 a 6 dígitos.');
      return;
    }
    const r = await fetch('/api/funcionarios', {
      method: 'POST',
      headers,
      body: JSON.stringify({ nome, cargo, pin, admin }),
    });
    const d = await r.json();
    if (r.ok) {
      setNome('');
      setCargo('');
      setPin('');
      setAdmin(false);
      load();
    } else {
      setMsg(d.error || 'Erro ao cadastrar.');
    }
  }

  async function toggleAtivo(f) {
    await fetch('/api/funcionarios', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ...f, ativo: !f.ativo }),
    });
    load();
  }

  async function resetPin(f) {
    const novo = prompt(`Novo PIN para ${f.nome} (4 a 6 dígitos):`);
    if (!novo) return;
    const r = await fetch('/api/funcionarios', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ ...f, pin: novo }),
    });
    const d = await r.json();
    if (!r.ok) alert(d.error || 'Erro');
    else alert('PIN atualizado.');
  }

  async function del(f) {
    if (f.id === func.id) {
      alert('Você não pode excluir o próprio usuário logado.');
      return;
    }
    if (!confirm(`Excluir ${f.nome}?`)) return;
    await fetch(`/api/funcionarios?id=${f.id}`, { method: 'DELETE', headers });
    load();
  }

  return (
    <>
      <div className="card">
        <h2>Cadastrar funcionário</h2>
        <label>Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do funcionário" />
        <div className="row">
          <div>
            <label>Cargo (opcional)</label>
            <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Cozinha" />
          </div>
          <div>
            <label>PIN (4 a 6 dígitos)</label>
            <input
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="****"
            />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <input
            type="checkbox"
            checked={admin}
            onChange={(e) => setAdmin(e.target.checked)}
            style={{ width: 'auto' }}
          />
          É administrador (vê o painel e gerencia funcionários)
        </label>
        {msg && <div className="pin-error" style={{ position: 'static', marginTop: 8 }}>{msg}</div>}
        <button className="btn" onClick={add}>
          Cadastrar
        </button>
      </div>

      <div className="card">
        <h2>Funcionários {rows ? `(${rows.length})` : ''}</h2>
        {!rows ? (
          <div className="empty">Carregando...</div>
        ) : (
          rows.map((f) => (
            <div className="item-log" key={f.id}>
              <div className="l">
                <div className="n" style={{ textTransform: 'none' }}>
                  {f.nome} {f.admin ? '⭐' : ''}
                </div>
                <div className="m">
                  {f.cargo || 'sem cargo'} · {f.ativo ? 'ativo' : 'inativo'}
                </div>
              </div>
              <div className="r" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="del" style={{ color: '#0e7490' }} onClick={() => resetPin(f)}>
                  PIN
                </span>
                <span className="del" style={{ color: '#64748b' }} onClick={() => toggleAtivo(f)}>
                  {f.ativo ? 'desativar' : 'ativar'}
                </span>
                <span className="del" onClick={() => del(f)}>
                  excluir
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ---------- App ----------
export default function Page() {
  const [tab, setTab] = useState('QUEBRA');
  const [items, setItems] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [func, setFunc] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('func');
      if (saved) setFunc(JSON.parse(saved));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!func) return;
    fetch('/api/items')
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []));
  }, [func]);

  function login(f) {
    setFunc(f);
    try {
      localStorage.setItem('func', JSON.stringify(f));
    } catch {}
  }
  function logout() {
    setFunc(null);
    setTab('QUEBRA');
    try {
      localStorage.removeItem('func');
    } catch {}
  }

  const bump = () => setRefresh((n) => n + 1);

  if (!ready) return null;
  if (!func) return <Login onLogin={login} />;

  const tabs = func.admin ? [...TABS, { id: 'CONFIG', label: '⚙️ Funcionários' }] : TABS;

  return (
    <div className="app">
      <header>
        <div className="head-row">
          <div className="head-title">
            <img className="head-logo" src="/logo.png" alt="Praia da Tiquatira" />
            <div>
              <h1>Perdas &amp; Produção</h1>
              <div className="sub">{items.length} itens · custos do Colibri</div>
            </div>
          </div>
          <div className="user-box">
            <div className="uname">{func.nome}</div>
            <button className="logout" onClick={logout}>
              trocar
            </button>
          </div>
        </div>
      </header>

      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={'tab' + (tab === t.id ? ' active' : '')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="wrap">
        {(tab === 'QUEBRA' || tab === 'BUFFET' || tab === 'REFEICAO') && (
          <>
            <LancamentoForm tipo={tab} items={items} func={func} onSaved={bump} />
            <LancamentoList tipo={tab} refresh={refresh} onChanged={bump} />
          </>
        )}
        {tab === 'PRODUCAO' && (
          <>
            <ProducaoForm items={items} func={func} onSaved={bump} />
            <ProducaoList refresh={refresh} onChanged={bump} />
          </>
        )}
        {tab === 'HISTORICO' && <Historico />}
        {tab === 'DASHBOARD' && <Dashboard />}
        {tab === 'RELATORIO' && <Relatorio />}
        {tab === 'CONFIG' && func.admin && <ConfigFuncionarios func={func} />}
      </div>
    </div>
  );
}
