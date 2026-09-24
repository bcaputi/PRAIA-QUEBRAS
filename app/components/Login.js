'use client';

import { useState } from 'react';
import PinPad from './PinPad';

// ---------- Tela de login ----------
export default function Login({ onLogin }) {
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(pin, clear) {
    setLoading(true);
    setErr('');
    let r;
    try {
      r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
    } catch (e) {
      setLoading(false);
      setErr('Sem conexão com o servidor.');
      clear();
      return;
    }
    setLoading(false);
    if (r.ok) {
      onLogin(await r.json());
    } else {
      // mensagem genérica de propósito (não vale detalhar se o PIN existe ou está inativo)
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
