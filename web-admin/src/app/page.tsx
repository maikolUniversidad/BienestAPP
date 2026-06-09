'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import { Hilo } from '../components/brand';

const DEMO: [string, string][] = [
  ['afiliado@demo.co', 'Afiliado'],
  ['operador@demo.co', 'Call center'],
  ['psicologo@demo.co', 'Psicólogo'],
  ['nutricionista@demo.co', 'Nutricionista'],
  ['admin@demo.co', 'Admin EPS'],
  ['auditor@demo.co', 'Auditor'],
];

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('afiliado@demo.co');
  const [password, setPassword] = useState('Bienestar123');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        await api.register({ email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim() });
        window.location.href = '/bienvenida';
        return;
      }
      const res = await api.login(email.trim(), password);
      const roles = res.roles ?? [];
      const has = (...rs: string[]) => rs.some((r) => roles.includes(r));
      const onlyAffiliate = roles.includes('AFFILIATE') && roles.length === 1;
      let dest = '/callcenter';
      if (onlyAffiliate) dest = '/app';
      else if (has('EPS_ADMIN', 'SUPERADMIN', 'AUDITOR')) dest = '/overview';
      else if (has('NUTRITIONIST')) dest = '/nutricion';
      else if (has('PSYCHOLOGIST', 'PHYSICIAN', 'NURSE', 'SOCIAL_WORKER')) dest = '/clinico';
      else if (has('CALLCENTER_OPERATOR')) dest = '/callcenter';
      window.location.href = dest;
    } catch (err: any) {
      setError(mode === 'register' ? 'No se pudo crear la cuenta (¿correo ya registrado?)' : 'Credenciales inválidas');
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
        <p className="muted" style={{ marginBottom: 18 }}>El hilo que te acompaña</p>

        {mode === 'register' && (
          <>
            <input className="field" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre" />
            <input className="field" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellido" />
          </>
        )}
        <input className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" />
        <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" />
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}>
          {loading ? 'Procesando…' : mode === 'register' ? 'Crear cuenta' : 'Ingresar'}
        </button>
        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        <button type="button" className="link" style={{ marginTop: 14, background: 'none', border: 0, display: 'block', textAlign: 'center', width: '100%' }} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>

        {mode === 'login' && (
          <div style={{ marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Usuarios de prueba (clic):</div>
            <div className="chips">
              {DEMO.map(([mail, label]) => (
                <button type="button" key={mail} className="chip" onClick={() => setEmail(mail)} title={mail}>{label}</button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>Contraseña para todos: Bienestar123</div>
          </div>
        )}
      </form>
    </main>
  );
}
