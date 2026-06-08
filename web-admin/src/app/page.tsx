'use client';

import { useState } from 'react';
import { api } from '../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('operador@demo.co');
  const [password, setPassword] = useState('Bienestar123');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.login(email, password);
      window.localStorage.setItem('accessToken', res.accessToken);
      window.location.href = '/callcenter';
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main style={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
      <form
        onSubmit={submit}
        style={{ width: 320, display: 'grid', gap: 12, padding: 24, border: '1px solid #eee', borderRadius: 16 }}
      >
        <h1 style={{ color: '#1E9E8A' }}>BienestAPP</h1>
        <p style={{ color: '#666', marginTop: -8 }}>Panel administrativo · Call Center</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
        />
        <button type="submit" style={{ background: '#1E9E8A', color: 'white', padding: 10, borderRadius: 8, border: 0 }}>
          Ingresar
        </button>
        {error && <p style={{ color: '#D64545' }}>{error}</p>}
      </form>
    </main>
  );
}
