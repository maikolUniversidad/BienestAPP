const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://bienest-app.vercel.app/api/v1';

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('accessToken');
}

export function getRoles(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem('roles') ?? '[]');
  } catch {
    return [];
  }
}

export function isAffiliate(): boolean {
  const r = getRoles();
  return r.includes('AFFILIATE') && !r.some((x) => x !== 'AFFILIATE');
}

export function logout() {
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('roles');
  window.location.href = '/';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') logout();
    throw new Error('Sesión expirada');
  }
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  apiUrl: API_URL,
  async login(email: string, password: string) {
    const res = await request<{ accessToken: string; roles: string[] }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('accessToken', res.accessToken);
      window.localStorage.setItem('roles', JSON.stringify(res.roles ?? []));
    }
    return res;
  },
  async register(input: { email: string; password: string; firstName: string; lastName: string }) {
    const res = await request<{ accessToken: string; roles: string[] }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('accessToken', res.accessToken);
      window.localStorage.setItem('roles', JSON.stringify(res.roles ?? ['AFFILIATE']));
    }
    return res;
  },

  // ---- Call center / admin ----
  queue: () => request<any[]>('/callcenter/queue'),
  getCase: (id: string) => request<any>(`/callcenter/cases/${id}`),
  setCaseStatus: (id: string, status: string) =>
    request(`/callcenter/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  addNote: (id: string, body: string) =>
    request(`/callcenter/cases/${id}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),
  escalate: (id: string, target: string) =>
    request(`/callcenter/cases/${id}/escalate`, { method: 'POST', body: JSON.stringify({ target }) }),
  logCall: (id: string, durationSec?: number, outcome?: string) =>
    request(`/callcenter/cases/${id}/call-log`, { method: 'POST', body: JSON.stringify({ durationSec, outcome }) }),
  metrics: () => request<any>('/admin/metrics'),
  alerts: () => request<any[]>('/admin/alerts'),
  // Medicación (profesional)
  medProPatients: () => request<any[]>('/medications/pro/patients'),
  medProAlerts: () => request<any[]>('/medications/pro/alerts'),
  medProPatient: (userId: string) => request<any>(`/medications/pro/patients/${userId}`),
  medProAssign: (userId: string, m: { name: string; dose: string; route?: string; schedule: string[]; instructions?: string }) =>
    request(`/medications/pro/patients/${userId}/items`, { method: 'POST', body: JSON.stringify(m) }),
  medProRemove: (id: string) => request(`/medications/pro/items/${id}`, { method: 'DELETE' }),
  audit: (action?: string) =>
    request<any[]>(`/admin/audit${action ? `?action=${encodeURIComponent(action)}` : ''}`),

  // ---- Afiliado (entorno unificado) ----
  dashboard: () => request<any>('/dashboard'),
  moodList: () => request<any[]>('/mood'),
  logMood: (label: string, intensity: number, note?: string) =>
    request('/mood', { method: 'POST', body: JSON.stringify({ label, intensity, note }) }),
  journalList: () => request<any[]>('/journal'),
  createJournal: (payload: { body: string; tags?: string[]; attachments?: any[]; transcription?: string }) =>
    request<{ id: string; motivation?: string }>('/journal', { method: 'POST', body: JSON.stringify(payload) }),
  journalUploadUrl: (kind: 'image' | 'audio', ext: string) =>
    request<{ path: string; token: string; signedUrl: string }>('/journal/upload-url', {
      method: 'POST',
      body: JSON.stringify({ kind, ext }),
    }),
  journalWeekly: () => request<any>('/journal/summary/weekly'),
  startConversation: () => request<{ id: string }>('/ai/conversations', { method: 'POST', body: '{}' }),
  listConversations: () => request<any[]>('/ai/conversations'),
  getConversation: (id: string) => request<any>(`/ai/conversations/${id}`),
  deleteConversation: (id: string) => request(`/ai/conversations/${id}`, { method: 'DELETE' }),
  sendEphemeral: (content: string, history: { role: string; content: string }[]) =>
    request<{ message: { content: string }; riskLevel: string; emotionalTheme?: string; crisisProtocol?: any }>(
      '/ai/ephemeral/messages',
      { method: 'POST', body: JSON.stringify({ content, history }) },
    ),
  sendMessage: (id: string, content: string, attachments?: any[]) =>
    request<{ message: { content: string }; riskLevel: string; emotionalTheme?: string; crisisProtocol?: any }>(
      `/ai/conversations/${id}/messages`,
      { method: 'POST', body: JSON.stringify({ content, attachments }) },
    ),
  aiUploadUrl: (kind: 'image' | 'audio', ext: string) =>
    request<{ path: string; token: string; signedUrl: string }>('/ai/upload-url', {
      method: 'POST',
      body: JSON.stringify({ kind, ext }),
    }),
  habits: () => request<any[]>('/habits'),
  createHabit: (name: string, icon?: string) =>
    request('/habits', { method: 'POST', body: JSON.stringify({ name, icon }) }),
  logHabit: (id: string) => request(`/habits/${id}/log`, { method: 'POST', body: '{}' }),
  foodList: () => request<any[]>('/food'),
  analyzeFood: (description: string) =>
    request<any>('/food/analyze', { method: 'POST', body: JSON.stringify({ description }) }),
  pet: () => request<any>('/pet'),
  savePet: (name: string, species: string) =>
    request('/pet', { method: 'POST', body: JSON.stringify({ name, species }) }),
  content: (type?: string) => request<any[]>(`/content${type ? `?type=${type}` : ''}`),
  // Hábitos especializados (sueño / hidratación / actividad) via ExerciseLog
  exerciseToday: () => request<any>('/exercise/today'),
  logExercise: (type: string, value: number, unit: string) =>
    request('/exercise', { method: 'POST', body: JSON.stringify({ type, value, unit }) }),
  // Logros
  achievements: () => request<any>('/achievements'),
  // Perfil / privacidad
  profile: () => request<any>('/profile'),
  updateProfile: (patch: any) => request('/profile', { method: 'PUT', body: JSON.stringify(patch) }),
  consents: () => request<any[]>('/consents'),
  grantConsent: (type: string) =>
    request('/consents', { method: 'POST', body: JSON.stringify({ type, version: '1.0', granted: true }) }),
  revokeConsent: (id: string) => request(`/consents/${id}`, { method: 'DELETE' }),
  emergencyContacts: () => request<any[]>('/emergency-contacts'),
  addEmergencyContact: (c: { name: string; phone: string; relationship?: string }) =>
    request('/emergency-contacts', { method: 'POST', body: JSON.stringify(c) }),
  deleteEmergencyContact: (id: string) => request(`/emergency-contacts/${id}`, { method: 'DELETE' }),
  // Metas
  goals: () => request<any[]>('/goals'),
  goalStats: () => request<{ active: number; completed: number }>('/goals/stats'),
  createGoal: (g: { title: string; type?: string; frequency?: string; targetDate?: string }) =>
    request('/goals', { method: 'POST', body: JSON.stringify(g) }),
  updateGoal: (id: string, patch: { title?: string; progress?: number; status?: string }) =>
    request(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteGoal: (id: string) => request(`/goals/${id}`, { method: 'DELETE' }),
  // Medicación
  medCatalog: () => request<any[]>('/medications/catalog'),
  medItems: () => request<any[]>('/medications/items'),
  addMed: (m: { name: string; dose: string; route?: string; schedule: string[]; instructions?: string }) =>
    request('/medications/items', { method: 'POST', body: JSON.stringify(m) }),
  removeMed: (id: string) => request(`/medications/items/${id}`, { method: 'DELETE' }),
  medToday: () => request<{ doses: any[]; taken: number; total: number }>('/medications/today'),
  markIntake: (itemId: string, time: string) =>
    request('/medications/intakes', { method: 'POST', body: JSON.stringify({ itemId, time }) }),
  medHistory: () => request<any[]>('/medications/history'),
  medAdherence: () => request<{ taken: number; expected: number; percent: number; activeItems: number }>('/medications/adherence'),
  sos: (type: string, note?: string) =>
    request<any>('/emergency/sos', { method: 'POST', body: JSON.stringify({ type, note }) }),
};
