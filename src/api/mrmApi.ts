import urls from '../../backend/func2url.json';

const MRM_URL = (urls as Record<string, string>)['irida-mrm'];

function getToken(): string | null {
  return localStorage.getItem('dashboard_token');
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h['X-Dashboard-Token'] = t;
  return h;
}

async function request(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { ...headers(), ...(opts?.headers || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export interface MrmAdmin {
  id: number;
  fullName: string;
  login: string;
  adminPin: string;
  kioskExitPassword: string;
  isActive: boolean;
  lastSeenAt: string | null;
  lastTabletIp: string | null;
  createdAt: string;
}

export async function fetchMrmAdmins(): Promise<MrmAdmin[]> {
  const data = await request(MRM_URL);
  return data.admins || [];
}

export async function createMrmAdmin(payload: {
  fullName: string;
  login: string;
  password: string;
  kioskExitPassword: string;
  adminPin: string;
}) {
  return request(MRM_URL, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateMrmAdmin(payload: {
  id: number;
  fullName?: string;
  login?: string;
  password?: string;
  kioskExitPassword?: string;
  adminPin?: string;
  isActive?: boolean;
}) {
  return request(MRM_URL, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteMrmAdmin(id: number) {
  return request(`${MRM_URL}?id=${id}`, { method: 'DELETE' });
}
