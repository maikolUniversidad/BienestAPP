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
  journalUploadUrl: (kind: 'image' | 'audio' | 'document', ext: string) =>
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
    request<{ message: { content: string }; riskLevel: string; emotionalTheme?: string; crisisProtocol?: any; actions?: { label: string; href: string; icon?: string }[] }>(
      '/ai/ephemeral/messages',
      { method: 'POST', body: JSON.stringify({ content, history }) },
    ),
  sendMessage: (id: string, content: string, attachments?: any[]) =>
    request<{ message: { content: string }; riskLevel: string; emotionalTheme?: string; crisisProtocol?: any; actions?: { label: string; href: string; icon?: string }[] }>(
      `/ai/conversations/${id}/messages`,
      { method: 'POST', body: JSON.stringify({ content, attachments }) },
    ),
  aiUploadUrl: (kind: 'image' | 'audio' | 'document', ext: string) =>
    request<{ path: string; token: string; signedUrl: string }>('/ai/upload-url', {
      method: 'POST',
      body: JSON.stringify({ kind, ext }),
    }),
  habits: () => request<any[]>('/habits'),
  createHabit: (name: string, icon?: string) =>
    request('/habits', { method: 'POST', body: JSON.stringify({ name, icon }) }),
  logHabit: (id: string) => request(`/habits/${id}/log`, { method: 'POST', body: '{}' }),
  foodList: () => request<any[]>('/food'),
  foodUploadUrl: (_kind: 'image' | 'audio' | 'document', ext: string) =>
    request<{ path: string; token: string }>('/food/upload-url', { method: 'POST', body: JSON.stringify({ ext }) }),
  analyzeFoodPhoto: (imagePath: string, mealType?: string, note?: string) =>
    request<any>('/food/analyze-photo', { method: 'POST', body: JSON.stringify({ imagePath, mealType, note }) }),
  foodDailySummary: () => request<any>('/food/daily-summary'),
  // Salud: metas y medidas corporales
  healthTargets: () => request<any[]>('/health/targets'),
  setHealthTarget: (body: { type: string; target: number; unit: string; note?: string }) =>
    request<any>('/health/targets', { method: 'PUT', body: JSON.stringify(body) }),
  healthBody: () => request<any>('/health/body'),
  // Notificaciones (admin)
  notifOverview: () => request<any>('/notifications/admin/overview'),
  notifCategories: () => request<any[]>('/notifications/admin/categories'),
  createNotifCategory: (body: any) => request<any>('/notifications/admin/categories', { method: 'POST', body: JSON.stringify(body) }),
  updateNotifCategory: (key: string, body: any) => request<any>(`/notifications/admin/categories/${key}`, { method: 'PUT', body: JSON.stringify(body) }),
  broadcastNotif: (body: any) => request<{ sent: number }>('/notifications/admin/broadcast', { method: 'POST', body: JSON.stringify(body) }),

  // ---- Chat persona a persona ----
  chatContacts: (q?: string) => request<any[]>(`/chat/contacts${q ? '?q=' + encodeURIComponent(q) : ''}`),
  chatThreads: () => request<any[]>('/chat/threads'),
  chatUnread: () => request<{ count: number }>('/chat/unread'),
  chatOpenDirect: (targetId: string) => request<{ id: string }>('/chat/direct', { method: 'POST', body: JSON.stringify({ targetId }) }),
  chatCreateGroup: (participantIds: string[], title?: string) => request<{ id: string }>('/chat/group', { method: 'POST', body: JSON.stringify({ participantIds, title }) }),
  chatMessages: (threadId: string, since?: string) => request<any[]>(`/chat/threads/${threadId}/messages${since ? '?since=' + encodeURIComponent(since) : ''}`),
  chatSend: (threadId: string, body: string, attachments?: any[]) => request<any>(`/chat/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ body, attachments }) }),
  chatRead: (threadId: string) => request(`/chat/threads/${threadId}/read`, { method: 'POST' }),
  chatUploadUrl: (kind: 'image' | 'audio' | 'document', ext: string) =>
    request<{ path: string; token: string }>('/chat/upload-url', { method: 'POST', body: JSON.stringify({ kind, ext }) }),
  chatHeartbeat: () => request('/chat/heartbeat', { method: 'POST' }),

  // ---- Gestión Salud (HIS) + FHIR/HL7 ----
  gestionPatients: (q?: string) => request<any[]>(`/gestion/patients${q ? '?q=' + encodeURIComponent(q) : ''}`),
  gestionPatient: (userId: string) => request<any>(`/gestion/patients/${userId}`),
  gestionUpsertRecord: (userId: string, body: any) => request<any>(`/gestion/patients/${userId}/record`, { method: 'PUT', body: JSON.stringify(body) }),
  gestionEncounters: (userId: string) => request<any[]>(`/gestion/patients/${userId}/encounters`),
  gestionCreateEncounter: (userId: string, body: any) => request<any>(`/gestion/patients/${userId}/encounters`, { method: 'POST', body: JSON.stringify(body) }),
  gestionContracts: () => request<any[]>('/gestion/contracts'),
  gestionSaveContract: (id: string | null, body: any) => id ? request<any>(`/gestion/contracts/${id}`, { method: 'PUT', body: JSON.stringify(body) }) : request<any>('/gestion/contracts', { method: 'POST', body: JSON.stringify(body) }),
  gestionDeleteContract: (id: string) => request(`/gestion/contracts/${id}`, { method: 'DELETE' }),
  gestionFhir: (userId: string) => request<any>(`/gestion/fhir/patient/${userId}`),
  gestionHl7: async (userId: string) => {
    const res = await fetch(`${API_URL}/gestion/fhir/patient/${userId}/hl7`, { headers: token() ? { Authorization: `Bearer ${token()}` } : {} });
    return res.text();
  },

  // ---- Gestión documental / firma digital ----
  docsMine: () => request<{ signed: any[]; pending: any[]; pendingAttendance: any[] }>('/documents/mine'),
  docsPendingCount: () => request<{ count: number }>('/documents/pending-count'),
  docsUploadUrl: (_kind: 'image' | 'audio' | 'document', ext: string) =>
    request<{ path: string; token: string }>('/documents/upload-url', { method: 'POST', body: JSON.stringify({ ext }) }),
  signDocument: (body: { signedDocumentId?: string; templateId?: string; appointmentId?: string; photoPath?: string; evidence: Record<string, unknown> }) =>
    request<any>('/documents/sign', { method: 'POST', body: JSON.stringify(body) }),
  getSignedDoc: (id: string) => request<any>(`/documents/${id}`),
  // Admin documental
  docIpsList: () => request<any[]>('/documents/admin/ips'),
  docIpsSave: (id: string | null, body: any) => id ? request<any>(`/documents/admin/ips/${id}`, { method: 'PUT', body: JSON.stringify(body) }) : request<any>('/documents/admin/ips', { method: 'POST', body: JSON.stringify(body) }),
  docIpsDelete: (id: string) => request(`/documents/admin/ips/${id}`, { method: 'DELETE' }),
  docTemplates: () => request<any[]>('/documents/admin/templates'),
  docTemplateSave: (id: string | null, body: any) => id ? request<any>(`/documents/admin/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }) : request<any>('/documents/admin/templates', { method: 'POST', body: JSON.stringify(body) }),
  docTemplateDelete: (id: string) => request(`/documents/admin/templates/${id}`, { method: 'DELETE' }),
  docAssign: (templateId: string, userId: string) => request<any>('/documents/admin/assign', { method: 'POST', body: JSON.stringify({ templateId, userId }) }),
  docSignedList: (userId?: string, status?: string) => {
    const q = new URLSearchParams();
    if (userId) q.set('userId', userId);
    if (status) q.set('status', status);
    const s = q.toString();
    return request<any[]>(`/documents/admin/signed${s ? '?' + s : ''}`);
  },
  analyzeFood: (description: string, mealType?: string, note?: string) =>
    request<any>('/food/analyze', { method: 'POST', body: JSON.stringify({ description, mealType, note }) }),
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
  profileAvatarUrl: (_kind: 'image' | 'audio' | 'document', ext: string) =>
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

  // ---- CRM: plantillas y mensajería ----
  crmTemplates: (channel?: string) => request<any[]>(`/crm/templates${channel ? '?channel=' + channel : ''}`),
  crmCreateTemplate: (body: any) => request<any>('/crm/templates', { method: 'POST', body: JSON.stringify(body) }),
  crmUpdateTemplate: (id: string, body: any) => request<any>(`/crm/templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  crmDeleteTemplate: (id: string) => request(`/crm/templates/${id}`, { method: 'DELETE' }),
  crmRender: (body: { body: string; subject?: string; variables?: Record<string, string> }) =>
    request<{ subject: string; body: string }>('/crm/render', { method: 'POST', body: JSON.stringify(body) }),
  crmMessages: (caseId?: string, targetUserId?: string) => {
    const q = new URLSearchParams();
    if (caseId) q.set('caseId', caseId);
    if (targetUserId) q.set('targetUserId', targetUserId);
    const s = q.toString();
    return request<any[]>(`/crm/messages${s ? '?' + s : ''}`);
  },
  crmSend: (body: any) => request<any>('/crm/send', { method: 'POST', body: JSON.stringify(body) }),

  // ---- Call center 360 + despacho ----
  caseProfile360: (id: string) => request<any>(`/callcenter/cases/${id}/profile360`),
  caseDispatch: (id: string, body: { type: string; address?: string; latitude?: number; longitude?: number; notes?: string }) =>
    request<any>(`/callcenter/cases/${id}/dispatch`, { method: 'POST', body: JSON.stringify(body) }),
  caseDispatches: (id: string) => request<any[]>(`/callcenter/cases/${id}/dispatches`),
  setDispatchStatus: (id: string, status: string) =>
    request(`/callcenter/dispatch/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // ---- Citas / telemedicina ----
  createAppointment: (body: any) => request<any>('/appointments', { method: 'POST', body: JSON.stringify(body) }),
  appointmentsStaff: (scope?: string) => request<any[]>(`/appointments${scope ? '?scope=' + scope : ''}`),
  myAppointments: () => request<any[]>('/appointments/mine'),
  getAppointment: (id: string) => request<any>(`/appointments/${id}`),
  appointmentRoom: (id: string) => request<any>(`/appointments/${id}/room`),
  setAppointmentStatus: (id: string, status: string) =>
    request<any>(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
