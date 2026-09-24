'use client';

import { useState } from 'react';

// ---------- Teclado de PIN ----------
export default function PinPad({ onSubmit, loading, error, title, subtitle, cta }) {
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
