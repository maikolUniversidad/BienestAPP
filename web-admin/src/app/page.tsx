'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { Hilo } from '../components/brand';

const DEMO: [string, string][] = [
  ['afiliado@demo.co', 'Afiliado'],
  ['operador@demo.co', 'Call center'],
  ['psicologo@demo.co', 'Psicólogo'],
  ['medico@demo.co', 'Médico'],
  ['admin@demo.co', 'Admin EPS'],
  ['auditor@demo.co', 'Auditor'],
];

export default function LoginPage() {
  const [email, setEmail] = useState('afiliado@demo.co');
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
      const onlyAffiliate = roles.includes('AFFILIATE') && roles.length === 1;
      const admin = ['EPS_ADMIN', 'SUPERADMIN', 'AUDITOR'].some((r) => roles.includes(r));
      window.location.href = onlyAffiliate ? '/app' : admin ? '/overview' : '/callcenter';
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">
          <Hilo size={40} />
          <b>Bienest<span>APP</span></b>
        </div>
        <p className="muted" style={{ marginBottom: 18 }}>El hilo que te acompaña · Bienestar · Call Center</p>

        <input className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" />
        <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Usuarios de prueba (clic):</div>
          <div className="chips">
            {DEMO.map(([mail, label]) => (
              <button type="button" key={mail} className="chip" onClick={() => setEmail(mail)} title={mail}>
                {label}
              </button>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>Contraseña para todos: Bienestar123</div>
        </div>
      </form>
    </main>
  );
}
