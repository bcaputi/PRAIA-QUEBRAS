'use client';

import { useEffect, useState } from 'react';
import { money, firstOfMonth, today } from '../../lib/calc/format';
import { somarComAviso, agruparPorNome, agruparPorMotivo } from '../../lib/calc/totais';
import { apiFetch } from '../../lib/api';

// ---------- Dashboard ----------
export default function Dashboard() {
  const [de, setDe] = useState(firstOfMonth());
  const [ate, setAte] = useState(today());
  const [reg, setReg] = useState([]);
  const [prod, setProd] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const [r1, r2] = await Promise.all([
        apiFetch(`/api/registros?de=${de}&ate=${ate}`),
        apiFetch(`/api/producao?de=${de}&ate=${ate}`),
      ]);
      setReg(Array.isArray(r1) ? r1 : []);
      setProd(Array.isArray(r2) ? r2 : []);
    } catch (e) {
      setErr(e.message);
      setReg([]);
      setProd([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const porTipo = (t) => somarComAviso(reg.filter((r) => r.tipo === t));
  const quebra = porTipo('QUEBRA');
  const buffet = porTipo('BUFFET');
  const refeicao = porTipo('REFEICAO');
  const producao = somarComAviso(prod);

  const topQuebra = agruparPorNome(reg.filter((r) => r.tipo === 'QUEBRA')).slice(0, 8);
  const maxQ = topQuebra.length ? topQuebra[0][1] : 1;

  const motivos = agruparPorMotivo(reg.filter((r) => r.tipo === 'QUEBRA'));
  const maxM = motivos.length ? motivos[0][1] : 1;

  const totalSemCusto = quebra.semCusto + buffet.semCusto + refeicao.semCusto + producao.semCusto;

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

      {err ? (
        <div className="card empty">Erro ao carregar: {err}</div>
      ) : loading ? (
        <div className="card empty">Carregando...</div>
      ) : (
        <>
          {totalSemCusto > 0 && (
            <div className="card aviso-parcial" style={{ padding: 10 }}>
              {totalSemCusto} lançamento(s) do período têm item sem custo cadastrado — não entram
              nos totais em R$ abaixo. Corrija em ⚙️ Funcionários → Itens sem custo.
            </div>
          )}
          <div className="kpis">
            <div className="kpi red">
              <div className="v">{money(quebra.soma)}</div>
              <div className="k">💥 Perdas / quebras</div>
            </div>
            <div className="kpi violet">
              <div className="v">{money(buffet.soma)}</div>
              <div className="k">🍽️ Consumo buffet</div>
            </div>
            <div className="kpi orange">
              <div className="v">{money(refeicao.soma)}</div>
              <div className="k">👥 Refeição funcionário</div>
            </div>
            <div className="kpi cyan">
              <div className="v">{money(producao.soma)}</div>
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
