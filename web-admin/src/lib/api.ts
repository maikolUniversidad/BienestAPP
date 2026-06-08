const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('accessToken');
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
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; roles: string[] }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  queue: () => request<any[]>('/callcenter/queue'),
  getCase: (id: string) => request<any>(`/callcenter/cases/${id}`),
  setCaseStatus: (id: string, status: string) =>
    request(`/callcenter/cases/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  addNote: (id: string, body: string) =>
    request(`/callcenter/cases/${id}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),
  escalate: (id: string, target: string) =>
    request(`/callcenter/cases/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ target }),
    }),
  metrics: () => request<any>('/admin/metrics'),
  alerts: () => request<any[]>('/admin/alerts'),
};
