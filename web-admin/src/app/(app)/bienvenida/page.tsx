'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';

const COMPANIONS = [
  { species: 'companion', emoji: '🌱', label: 'Brote', desc: 'Crece contigo' },
  { species: 'cat', emoji: '🐱', label: 'Gato', desc: 'Calma y compañía' },
  { species: 'dog', emoji: '🐶', label: 'Perro', desc: 'Lealtad y ánimo' },
  { species: 'bird', emoji: '🐦', label: 'Ave', desc: 'Ligereza y libertad' },
];

export default function Bienvenida() {
  const router = useRouter();
  const [species, setSpecies] = useState('companion');
  const [name, setName] = useState('Compi');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try { await api.savePet(name.trim() || 'Compi', species); router.push('/app'); }
    catch { router.push('/app'); }
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <img src="/mascota.png" alt="" style={{ width: 120, marginBottom: 8 }} />
        <h2 style={{ fontFamily: 'Fraunces', fontSize: 28, color: 'var(--tinta)' }}>Bienvenido/a a tu espacio</h2>
        <p className="muted" style={{ maxWidth: 460, margin: '8px auto 0' }}>
          Este es un lugar seguro donde avanzas a tu propio ritmo. Elige a tu compañero de proceso —
          evolucionará contigo a medida que cuides tu bienestar.
        </p>
      </div>

      <div className="card">
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 12 }}>Elige tu compañer@</h3>
        <div className="grid grid-4">
          {COMPANIONS.map((c) => (
            <button key={c.species} onClick={() => setSpecies(c.species)} className="mood-btn" style={species === c.species ? { background: 'var(--coral)', color: '#fff', borderColor: 'var(--coral)' } : {}}>
              <div style={{ fontSize: 34 }}>{c.emoji}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{c.label}</div>
              <div style={{ fontSize: 11, opacity: .8 }}>{c.desc}</div>
            </button>
          ))}
        </div>
        <label className="muted" style={{ fontSize: 13, display: 'block', marginTop: 16 }}>Ponle un nombre</label>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de tu compañero" />
        <button className="btn btn-primary" style={{ marginTop: 16, width: '100%', justifyContent: 'center' }} onClick={save} disabled={busy}>
          {busy ? 'Guardando…' : 'Comenzar mi camino →'}
        </button>
      </div>
    </div>
  );
}
