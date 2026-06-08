'use client';

import { useState } from 'react';
import { api } from '../lib/api';

const DEMO = [
  ['operador@demo.co', 'Call center'],
  ['psicologo@demo.co', 'Psicólogo'],
  ['medico@demo.co', 'Médico'],
  ['admin@demo.co', 'Admin EPS'],
  ['superadmin@demo.co', 'Superadmin'],
  ['auditor@demo.co', 'Auditor'],
];

export default function LoginPage() {
  const [email, setEmail] = useState('operador@demo.co');
  const [password, setPassword] = useState('Bienestar123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(email, password);
      const roles = res.roles ?? [];
      const admin = ['EPS_ADMIN', 'SUPERADMIN', 'AUDITOR'].some((r) => roles.includes(r));
      window.location.href = admin ? '/overview' : '/callcenter';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#F5F7F8' }}>
      <form onSubmit={submit} style={S.form}>
        <h1 style={{ color: '#1E9E8A', margin: 0 }}>BienestAPP</h1>
        <p style={{ color: '#6B7A80', marginTop: 4 }}>Panel administrativo · Call Center</p>
        <input style={S.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" />
        <input style={S.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
        <button type="submit" style={S.btn} disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
        {error && <p style={{ color: '#D64545' }}>{error}</p>}

        <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 12 }}>
          <div style={{ fontSize: 12, color: '#6B7A80', marginBottom: 6 }}>Usuarios de prueba (clic):</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DEMO.map(([mail, label]) => (
              <button
                type="button"
                key={mail}
                onClick={() => setEmail(mail)}
                style={S.chip}
                title={mail}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#9aa', marginTop: 8 }}>Contraseña para todos: Bienestar123</div>
        </div>
      </form>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  form: { width: 340, display: 'grid', gap: 10, padding: 28, border: '1px solid #eee', borderRadius: 18, background: 'white' },
  input: { padding: 11, border: '1px solid #ccc', borderRadius: 8 },
  btn: { background: '#1E9E8A', color: 'white', padding: 11, borderRadius: 8, border: 0, cursor: 'pointer', fontWeight: 600 },
  chip: { background: '#EAF4F1', color: '#11302B', border: 0, borderRadius: 16, padding: '6px 10px', fontSize: 12, cursor: 'pointer' },
};
