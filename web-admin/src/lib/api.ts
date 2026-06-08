// Por defecto apunta a la API en producción; sobreescribible con NEXT_PUBLIC_API_URL.
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://bienest-app.vercel.app/api/v1';

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
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
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
  // Call center
  queue: () => request<any[]>('/callcenter/queue'),
  getCase: (id: string) => request<any>(`/callcenter/cases/${id}`),
  setCaseStatus: (id: string, status: string) =>
    request(`/callcenter/cases/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  addNote: (id: string, body: string) =>
    request(`/callcenter/cases/${id}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),
  escalate: (id: string, target: string) =>
    request(`/callcenter/cases/${id}/escalate`, { method: 'POST', body: JSON.stringify({ target }) }),
  logCall: (id: string, durationSec?: number, outcome?: string) =>
    request(`/callcenter/cases/${id}/call-log`, {
      method: 'POST',
      body: JSON.stringify({ durationSec, outcome }),
    }),
  // Admin
  metrics: () => request<any>('/admin/metrics'),
  alerts: () => request<any[]>('/admin/alerts'),
  audit: (action?: string) =>
    request<any[]>(`/admin/audit${action ? `?action=${encodeURIComponent(action)}` : ''}`),
};
