'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, logout } from '../../../lib/api';
import { Hilo } from '../../../components/brand';
import { uploadAvatar } from '../../../lib/storage';

const CONSENT_LABEL: Record<string, string> = {
  INFORMED_CONSENT: 'Consentimiento informado',
  AI_PROCESSING: 'Procesamiento con IA',
  LOCATION: 'Ubicación',
  NOTIFICATIONS: 'Notificaciones',
  EMERGENCY_CONTACT_NOTIFY: 'Avisar a contactos en crisis',
  DATA_SHARING: 'Compartir datos',
};

export default function Perfil() {
  const [profile, setProfile] = useState<any>(null);
  const [pet, setPet] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', phone: '', relationship: '' });
  const [activity, setActivity] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setProfile(await api.profile().catch(() => null));
    setPet(await api.pet().catch(() => null));
    setContacts(await api.emergencyContacts().catch(() => []));
    setConsents(await api.consents().catch(() => []));
    setActivity(await api.profileActivity().catch(() => null));
  }
  useEffect(() => { load(); }, []);

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const { path } = await uploadAvatar(file, ext);
      await api.updateProfile({ avatarPath: path });
      setAvatarPreview(URL.createObjectURL(file));
      setMsg('Foto actualizada ✓'); setTimeout(() => setMsg(null), 2500); load();
    } catch { setMsg('No se pudo subir la foto'); } finally { setUploading(false); e.target.value = ''; }
  }

  async function addContact() {
    if (!form.name.trim() || !form.phone.trim()) return;
    await api.addEmergencyContact({ name: form.name.trim(), phone: form.phone.trim(), relationship: form.relationship.trim() || undefined });
    setForm({ name: '', phone: '', relationship: '' }); setMsg('Contacto agregado ✓'); setTimeout(() => setMsg(null), 2500); load();
  }
  async function removeContact(id: string) { await api.deleteEmergencyContact(id); load(); }

  const grantedOne = (t: string) => consents.find((c) => c.type === t && c.granted && !c.revokedAt);
  const granted = (t: string) => !!grantedOne(t);
  async function toggleConsent(t: string) {
    const g = grantedOne(t);
    if (g) await api.revokeConsent(g.id); else await api.grantConsent(t);
    load();
  }

  return (
    <>
      <div className="page-head"><h2>Mi perfil</h2><p>Tus datos, tu compañero y tu privacidad.</p></div>
      {msg && <div className="disclaimer-bar" style={{ background: '#E3F3EE', color: 'var(--salvia-deep)' }}>{msg}</div>}

      <div className="grid grid-2">
        {/* Datos + mascota */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <label style={{ position: 'relative', cursor: 'pointer' }} title="Cambiar foto">
              {avatarPreview || profile?.avatarUrl
                ? <img className="avatar-lg" src={avatarPreview ?? profile.avatarUrl} alt="" />
                : <div className="avatar-lg" style={{ background: 'var(--durazno)', display: 'grid', placeItems: 'center' }}><Hilo size={40} /></div>}
              <span style={{ position: 'absolute', right: -4, bottom: -4, background: 'var(--coral)', color: '#fff', width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center', fontSize: 13 }}>{uploading ? '…' : '📷'}</span>
              <input type="file" accept="image/*" hidden onChange={onAvatar} />
            </label>
            <div>
              <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>{profile ? `${profile.firstName} ${profile.lastName}` : 'Afiliado'}</h3>
              <p className="muted" style={{ fontSize: 13 }}>{profile?.phone || 'Sin teléfono registrado'}</p>
              {profile?.bio && <p className="muted" style={{ fontSize: 13, marginTop: 2 }}>{profile.bio}</p>}
            </div>
          </div>
          <div style={{ marginTop: 16, background: 'var(--bg)', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/mascota.png" alt="Compi" style={{ width: 54 }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--tinta)' }}>{pet?.name ?? 'Compi'}</div>
              <div className="muted" style={{ fontSize: 13 }}>Nivel {pet?.level ?? 1} · 😊 {pet?.happiness ?? 50}</div>
            </div>
            <Link className="btn btn-ghost btn-sm" href="/bienvenida" style={{ marginLeft: 'auto' }}>Cambiar</Link>
          </div>
        </div>

        {/* Privacidad / consentimientos */}
        <div className="card">
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Privacidad y permisos</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.keys(CONSENT_LABEL).map((t) => (
              <div key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 14 }}>{CONSENT_LABEL[t]}</span>
                <button onClick={() => toggleConsent(t)} className="badge" style={{ background: granted(t) ? 'var(--salvia)' : 'var(--gris)', border: 0, cursor: 'pointer' }}>
                  {granted(t) ? 'Activo ✓' : 'Inactivo'}
                </button>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Tus datos de salud son tuyos: cifrados y bajo tu control (Habeas Data).</p>
        </div>
      </div>

      {/* Contactos de emergencia */}
      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)', marginBottom: 10 }}>Contactos de emergencia</h3>
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          {contacts.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span><b>{c.name}</b> <span className="muted">· {c.relationship || 'contacto'}</span></span>
              <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="muted">{c.phone}</span><button className="link" onClick={() => removeContact(c.id)}>🗑️</button></span>
            </div>
          ))}
          {contacts.length === 0 && <p className="muted">No tienes contactos de emergencia. Agrega al menos uno.</p>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 120 }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" />
          <input className="field" style={{ marginTop: 0, flex: 1, minWidth: 120 }} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" />
          <input className="field" style={{ marginTop: 0, width: 130 }} value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="Relación" />
          <button className="btn btn-primary btn-sm" onClick={addContact}>Agregar</button>
        </div>
      </div>

      {/* Conexión con la comunidad */}
      <div className="card" style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--durazno)', display: 'grid', placeItems: 'center', fontSize: 24 }}>🤝</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontFamily: 'Fraunces', color: 'var(--tinta)' }}>Conéctate con la comunidad</h3>
          <p className="muted" style={{ fontSize: 14 }}>
            No estás solo en esto. {activity?.communityPosts ? `Has compartido ${activity.communityPosts} publicación(es).` : 'Comparte tu proceso y apoya a otros.'}
          </p>
        </div>
        <Link className="btn btn-primary btn-sm" href="/comunidad">Ir a la comunidad →</Link>
      </div>

      {/* Actividad */}
      {activity && (
        <div className="grid grid-4" style={{ marginTop: 18 }}>
          <div className="card stat"><div className="lbl">Ánimo registrado</div><div className="val">{activity.moodEntries}</div></div>
          <div className="card stat"><div className="lbl">Entradas de diario</div><div className="val">{activity.journalEntries}</div></div>
          <div className="card stat"><div className="lbl">Hábitos cumplidos</div><div className="val">{activity.habitCompletions}</div></div>
          <div className="card stat"><div className="lbl">Publicaciones</div><div className="val">{activity.communityPosts}</div></div>
        </div>
      )}

      <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={logout}>Cerrar sesión</button>
    </>
  );
}
