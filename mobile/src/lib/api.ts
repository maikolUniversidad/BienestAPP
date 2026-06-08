import * as SecureStore from 'expo-secure-store';

// API en producción (Vercel). Para desarrollo local usa la IP de tu máquina.
const API_URL = 'https://bienest-app.vercel.app/api/v1';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('accessToken');
}

async function setTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync('accessToken', accessToken);
  await SecureStore.setItemAsync('refreshToken', refreshToken);
}

export async function isLoggedIn(): Promise<boolean> {
  return !!(await getToken());
}

export async function signOut() {
  await SecureStore.deleteItemAsync('accessToken');
  await SecureStore.deleteItemAsync('refreshToken');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export interface CrisisProtocol {
  active: boolean;
  containmentMessage: string;
  emergencyLines: { label: string; number: string }[];
  actions: string[];
  callCenterCaseId?: string;
}

export const api = {
  async login(email: string, password: string) {
    const res = await request<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setTokens(res.accessToken, res.refreshToken);
    return res;
  },
  async register(input: { email: string; password: string; firstName: string; lastName: string }) {
    const res = await request<{ accessToken: string; refreshToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await setTokens(res.accessToken, res.refreshToken);
    return res;
  },
  dashboard: () => request<any>('/dashboard'),
  logMood: (label: string, intensity: number) =>
    request('/mood', { method: 'POST', body: JSON.stringify({ label, intensity }) }),
  createJournal: (body: string, tags: string[] = []) =>
    request('/journal', { method: 'POST', body: JSON.stringify({ body, tags }) }),
  startConversation: () => request<{ id: string }>('/ai/conversations', { method: 'POST', body: '{}' }),
  sendMessage: (id: string, content: string) =>
    request<{ message: { content: string }; riskLevel: string; crisisProtocol?: CrisisProtocol }>(
      `/ai/conversations/${id}/messages`,
      { method: 'POST', body: JSON.stringify({ content }) },
    ),
  sos: (type: string, location?: { latitude: number; longitude: number }, note?: string) =>
    request<any>('/emergency/sos', {
      method: 'POST',
      body: JSON.stringify({ type, ...location, note }),
    }),
  pet: () => request<any>('/pet'),
  habits: () => request<any[]>('/habits'),
  logHabit: (id: string) => request(`/habits/${id}/log`, { method: 'POST', body: '{}' }),
};
