'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';

// ---------- Gestão de funcionários (admin) ----------
// A permissão de admin é conferida pelo servidor via cookie de sessão — não manda
// mais PIN em header (o PIN nem existe mais no objeto func do cliente).
export default function ConfigFuncionarios({ func }) {
  const [rows, setRows] = useState(null);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [pin, setPin] = useState('');
  const [admin, setAdmin] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      setRows(await apiFetch('/api/funcionarios'));
    } catch (e) {
      setMsg(e.message);
      setRows([]);
    }
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
    try {
      await apiFetch('/api/funcionarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cargo, pin, admin }),
      });
      setNome('');
      setCargo('');
      setPin('');
      setAdmin(false);
      load();
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function toggleAtivo(f) {
    try {
      await apiFetch('/api/funcionarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, ativo: !f.ativo }),
      });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function resetPin(f) {
    const novo = prompt(`Novo PIN para ${f.nome} (4 a 6 dígitos):`);
    if (!novo) return;
    try {
      await apiFetch('/api/funcionarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, pin: novo }),
      });
      alert('PIN atualizado.');
    } catch (e) {
      alert(e.message);
    }
  }

  async function del(f) {
    if (f.id === func.id) {
      alert('Você não pode excluir o próprio usuário logado.');
      return;
    }
    if (!confirm(`Excluir ${f.nome}?`)) return;
    try {
      await apiFetch(`/api/funcionarios?id=${f.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e.message);
    }
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
