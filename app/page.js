'use client';

import { useEffect, useState } from 'react';
import Login from './components/Login';
import LancamentoForm from './components/LancamentoForm';
import LancamentoList from './components/LancamentoList';
import ProducaoForm from './components/ProducaoForm';
import ProducaoList from './components/ProducaoList';
import Historico from './components/Historico';
import Dashboard from './components/Dashboard';
import Relatorio from './components/Relatorio';
import ConfigFuncionarios from './components/ConfigFuncionarios';
import ItensSemCusto from './components/ItensSemCusto';
import { apiFetch } from '../lib/api';

const TABS = [
  { id: 'QUEBRA', label: '💥 Quebras' },
  { id: 'BUFFET', label: '🍽️ Buffet' },
  { id: 'REFEICAO', label: '👥 Refeição Func.' },
  { id: 'PRODUCAO', label: '🍳 Produção' },
  { id: 'HISTORICO', label: '🕘 Histórico' },
  { id: 'DASHBOARD', label: '📊 Dashboard' },
  { id: 'RELATORIO', label: '📋 Relatório' },
];

// ---------- App ----------
export default function Page() {
  const [tab, setTab] = useState('QUEBRA');
  const [items, setItems] = useState([]);
  const [itemsErr, setItemsErr] = useState('');
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
    apiFetch('/api/items')
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch((e) => setItemsErr(e.message));
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
    // limpa o cookie de sessão no servidor — não bloqueia a troca de usuário na tela
    fetch('/api/logout', { method: 'POST' }).catch(() => {});
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
              <div className="sub">
                {itemsErr ? `Erro ao carregar itens: ${itemsErr}` : `${items.length} itens · custos do Colibri`}
              </div>
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
        {tab === 'CONFIG' && func.admin && (
          <>
            <ConfigFuncionarios func={func} />
            <ItensSemCusto />
          </>
        )}
      </div>
    </div>
  );
}
