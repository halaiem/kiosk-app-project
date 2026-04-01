import urls from '../../backend/func2url.json';

const AUTH_URL = urls['dashboard-auth'];
const DATA_URL = urls['dashboard-data'];
const MSG_URL = urls['driver-messages'];

const TOKEN_KEY = 'dashboard_token';
const USER_KEY = 'dashboard_user';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
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

export function getStoredDashboardToken(): string | null {
  return getToken();
}

export function getStoredDashboardUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function dashboardLogin(employeeId: string, password: string) {
  const data = await request(`${AUTH_URL}?action=login`, {
    method: 'POST',
    body: JSON.stringify({ employee_id: employeeId, password }),
  });
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export async function dashboardLogout() {
  try {
    await request(`${AUTH_URL}?action=logout`, { method: 'POST' });
  } catch (e) { console.warn('Logout:', e); }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function dashboardMe() {
  try {
    const data = await request(`${AUTH_URL}?action=me`);
    return data.user || null;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export async function getDashboardUsers() {
  const data = await request(`${AUTH_URL}?action=users`);
  return data.users || [];
}

export const fetchDashboardUsers = getDashboardUsers;

export async function deleteDashboardUser(userId: number) {
  return updateDashboardUser({ id: userId, is_active: false });
}

export async function createDashboardUser(payload: {
  employee_id: string; full_name: string; role: string; password: string; phone?: string;
}) {
  return request(`${AUTH_URL}?action=create_user`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDashboardUser(payload: {
  id: number; password?: string; is_active?: boolean; full_name?: string; phone?: string; role?: string;
}) {
  return request(`${AUTH_URL}?action=update_user`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchStats() {
  const data = await request(`${DATA_URL}?entity=stats`);
  return data;
}

export async function fetchDrivers() {
  const data = await request(`${DATA_URL}?entity=drivers`);
  return data.drivers || data;
}

export async function fetchRoutes() {
  const data = await request(`${DATA_URL}?entity=routes`);
  return data.routes || data;
}

export async function fetchVehicles() {
  const data = await request(`${DATA_URL}?entity=vehicles`);
  return data.vehicles || data;
}

export async function fetchSchedule() {
  const data = await request(`${DATA_URL}?entity=schedule`);
  return data.schedule || data;
}

export async function fetchDocuments() {
  const data = await request(`${DATA_URL}?entity=documents`);
  return data.documents || data;
}

export async function fetchMessages() {
  const data = await request(`${DATA_URL}?entity=messages`);
  return data.messages || data;
}

export async function fetchAlerts() {
  const data = await request(`${DATA_URL}?entity=alerts`);
  return data.alerts || data;
}

export async function fetchAuditLogs() {
  const data = await request(`${DATA_URL}?entity=logs`);
  return data.logs || data;
}

export async function sendDispatcherMsg(driverId: string, text: string) {
  return request(MSG_URL, {
    method: 'POST',
    body: JSON.stringify({
      driver_id: Number(driverId),
      text,
      sender: 'dispatcher',
      message_type: 'normal',
    }),
  });
}

export async function resolveAlert(alertId: number) {
  return request(`${DATA_URL}?entity=alerts`, {
    method: 'PUT',
    body: JSON.stringify({ id: alertId, resolved: true }),
  });
}

export async function updateDocumentStatus(docId: number, status: string) {
  return request(`${DATA_URL}?entity=documents`, {
    method: 'PUT',
    body: JSON.stringify({ id: docId, status }),
  });
}

export async function createVehicle(payload: Record<string, unknown>) {
  return request(`${DATA_URL}?entity=vehicles`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateVehicle(payload: Record<string, unknown>) {
  return request(`${DATA_URL}?entity=vehicles`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteVehicle(vehicleId: string) {
  return request(`${DATA_URL}?entity=vehicles&id=${encodeURIComponent(vehicleId)}`, {
    method: 'DELETE',
  });
}

export async function createRoute(payload: Record<string, unknown>) {
  return request(`${DATA_URL}?entity=routes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createSchedule(payload: Record<string, unknown>) {
  return request(`${DATA_URL}?entity=schedule`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSchedule(payload: Record<string, unknown>) {
  return request(`${DATA_URL}?entity=schedule`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function createDocument(payload: Record<string, unknown>) {
  return request(`${DATA_URL}?entity=documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export default {
  dashboardLogin,
  dashboardLogout,
  dashboardMe,
  getDashboardUsers,
  createDashboardUser,
  updateDashboardUser,
  fetchStats,
  fetchDrivers,
  fetchRoutes,
  fetchVehicles,
  fetchSchedule,
  fetchDocuments,
  fetchMessages,
  fetchAlerts,
  fetchAuditLogs,
  sendDispatcherMsg,
  resolveAlert,
  updateDocumentStatus,
};