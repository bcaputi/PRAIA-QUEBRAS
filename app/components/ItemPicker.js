'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { money } from '../../lib/calc/format';

// ---------- Busca de item ----------
export default function ItemPicker({ items, onSelect, placeholder }) {
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
          {results.map((i) => {
            const semCusto = !i.custo || Number(i.custo) <= 0;
            return (
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
                  cód {i.codigo} · {i.unidade} ·{' '}
                  {semCusto ? <span className="sem-custo">sem custo cadastrado</span> : `custo ${money(i.custo)}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
