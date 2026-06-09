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
  // Notificaciones
  notifications: () => request<any[]>('/notifications'),
  unreadCount: () => request<{ count: number }>('/notifications/unread-count'),
  markNotifRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotifRead: () => request('/notifications/read-all', { method: 'POST' }),
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
  async register(input: { email: string; password: string; firstName: string; lastName: string; epsCode?: string }) {
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
  // Nutrición (profesional)
  foodProSummary: () => request<any>('/food/pro/summary'),
  // Gestión de usuarios (admin)
  adminUsers: (q?: string) => request<any[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  adminCreateUser: (u: { email: string; firstName: string; lastName: string; role: string; password?: string }) =>
    request<any>('/admin/users', { method: 'POST', body: JSON.stringify(u) }),
  adminBulkUsers: (users: any[]) => request<any>('/admin/users/bulk', { method: 'POST', body: JSON.stringify({ users }) }),
  // PQRS
  createPqrs: (p: { type: string; subject: string; body: string }) =>
    request('/pqrs', { method: 'POST', body: JSON.stringify(p) }),
  myPqrs: () => request<any[]>('/pqrs/mine'),
  adminPqrs: () => request<any[]>('/admin/pqrs'),
  managePqrs: (id: string, patch: { status?: string; response?: string }) =>
    request(`/admin/pqrs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  // Director / Admin TI
  director: () => request<any>('/admin/director'),
  rbac: () => request<any>('/admin/rbac'),
  // Encuestas/Quices (admin builder)
  adminTests: () => request<any[]>('/admin/tests'),
  createTest: (t: { title: string; category: string; description?: string; questions: any[] }) =>
    request('/admin/tests', { method: 'POST', body: JSON.stringify(t) }),
  toggleTest: (id: string, active: boolean) =>
    request(`/admin/tests/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  // Tests (afiliado responder)
  tests: () => request<any[]>('/tests'),
  test: (id: string) => request<any>(`/tests/${id}`),
  submitTest: (id: string, answers: Record<string, number>) =>
    request<any>(`/tests/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }),
  myTestResults: () => request<any[]>('/tests/results/mine'),
  surveyResults: (id: string) => request<any>(`/admin/tests/${id}/results`),
  // Medicación (profesional)
  medProPatients: () => request<any[]>('/medications/pro/patients'),
  medProAlerts: () => request<any[]>('/medications/pro/alerts'),
  medProPatient: (userId: string) => request<any>(`/medications/pro/patients/${userId}`),
  medProAssign: (userId: string, m: { name: string; dose: string; route?: string; schedule: string[]; instructions?: string }) =>
    request(`/medications/pro/patients/${userId}/items`, { method: 'POST', body: JSON.stringify(m) }),
  medProRemove: (id: string) => request(`/medications/pro/items/${id}`, { method: 'DELETE' }),
  // Clínico
  clinicalPatients: () => request<any[]>('/clinical/patients'),
  clinicalAlerts: () => request<any[]>('/clinical/alerts'),
  reviewAlert: (id: string) => request(`/clinical/alerts/${id}/review`, { method: 'PATCH' }),
  clinicalPatient: (userId: string) => request<any>(`/clinical/patients/${userId}`),
  addClinicalNote: (userId: string, body: string, category?: string) =>
    request(`/clinical/patients/${userId}/notes`, { method: 'POST', body: JSON.stringify({ body, category }) }),
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
  // Comunidad
  communityContent: (section?: string) => request<any[]>(`/community/content${section ? `?section=${section}` : ''}`),
  communityPosts: () => request<any[]>('/community/posts'),
  createCommunityPost: (p: { body: string; anonymous?: boolean; type?: string }) =>
    request('/community/posts', { method: 'POST', body: JSON.stringify(p) }),
  likePost: (id: string) => request<{ liked: boolean; likes: number }>(`/community/posts/${id}/like`, { method: 'POST' }),
  adminCreateContent: (dto: any) => request('/admin/community/content', { method: 'POST', body: JSON.stringify(dto) }),
  adminRemoveContent: (id: string) => request(`/admin/community/content/${id}`, { method: 'DELETE' }),
  adminCommunityPosts: () => request<any[]>('/admin/community/posts'),
  moderatePost: (id: string, status: string) => request(`/admin/community/posts/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  // Hábitos especializados (sueño / hidratación / actividad) via ExerciseLog
  exerciseToday: () => request<any>('/exercise/today'),
  logExercise: (type: string, value: number, unit: string) =>
    request('/exercise', { method: 'POST', body: JSON.stringify({ type, value, unit }) }),
  // Logros
  achievements: () => request<any>('/achievements'),
  // Perfil / privacidad
  profile: () => request<any>('/profile'),
  updateProfile: (patch: any) => request('/profile', { method: 'PUT', body: JSON.stringify(patch) }),
  profileActivity: () => request<any>('/profile/activity'),
  profileAvatarUrl: (_kind: 'image' | 'audio', ext: string) =>
    request<{ path: string; token: string; signedUrl: string }>('/profile/avatar-url', {
      method: 'POST',
      body: JSON.stringify({ kind: 'image', ext }),
    }),
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
  // Salud / wearables
  healthSummary: () => request<any>('/health/summary'),
  healthConnections: () => request<any[]>('/health/connections'),
  healthConnect: (provider: string, deviceName?: string) =>
    request('/health/connect', { method: 'POST', body: JSON.stringify({ provider, deviceName }) }),
  healthDisconnect: (provider: string) =>
    request('/health/disconnect', { method: 'POST', body: JSON.stringify({ provider }) }),
  ingestHealth: (source: string, metrics: any[], deviceName?: string) =>
    request('/health/metrics', { method: 'POST', body: JSON.stringify({ source, metrics, deviceName }) }),
  healthInterpret: () => request<{ summary: any; interpretation: string }>('/health/interpret'),
  // EPS (público para el registro)
  listEps: () => request<{ code: string; name: string }[]>('/knowledge/eps'),
  // Base de conocimiento RAG (admin)
  knowledgeSources: (scope?: string, epsCode?: string) => {
    const q = new URLSearchParams();
    if (scope) q.set('scope', scope);
    if (epsCode) q.set('epsCode', epsCode);
    const s = q.toString();
    return request<any[]>(`/knowledge/sources${s ? '?' + s : ''}`);
  },
  createKnowledgeSource: (body: { scope: string; epsCode?: string; title: string; type: string; url?: string; content?: string; storagePath?: string }) =>
    request<any>('/knowledge/sources', { method: 'POST', body: JSON.stringify(body) }),
  reindexKnowledgeSource: (id: string) => request<any>(`/knowledge/sources/${id}/reindex`, { method: 'POST' }),
  deleteKnowledgeSource: (id: string) => request(`/knowledge/sources/${id}`, { method: 'DELETE' }),
  knowledgeUploadUrl: (ext: string) =>
    request<{ path: string; token: string; signedUrl: string }>('/knowledge/upload-url', { method: 'POST', body: JSON.stringify({ ext }) }),
};
