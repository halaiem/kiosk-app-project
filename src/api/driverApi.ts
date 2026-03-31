const URLS = {
  auth: 'https://functions.poehali.dev/b5ce54b6-0bb0-4452-b25b-d6a3ea35aad0',
  messages: 'https://functions.poehali.dev/29b782fe-206c-496b-8e16-1d7cf4338395',
  manage: 'https://functions.poehali.dev/1357aa6d-31b9-4e7c-8b5a-e5baa000e171',
};

const TOKEN_KEY = 'driver_session_token';
const DRIVER_KEY = 'driver_info';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredDriver() {
  const d = localStorage.getItem(DRIVER_KEY);
  return d ? JSON.parse(d) : null;
}

function storeSession(token: string, driver: object) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(DRIVER_KEY, JSON.stringify(driver));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DRIVER_KEY);
}

export async function loginByPin(employeeId: string, pin: string) {
  const res = await fetch(`${URLS.auth}/?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: employeeId, pin }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Неверный табельный номер или PIN');
  storeSession(data.token, data.driver);
  return data;
}

export async function logout() {
  const token = getStoredToken();
  if (token) {
    await fetch(`${URLS.auth}/?action=logout`, {
      method: 'POST',
      headers: { 'X-Auth-Token': token },
    }).catch(() => {});
  }
  clearSession();
}

export async function sendHeartbeat(lat?: number, lng?: number, speed?: number) {
  const token = getStoredToken();
  if (!token) return;
  await fetch(`${URLS.auth}/?action=heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
    body: JSON.stringify({ latitude: lat, longitude: lng, speed }),
  }).catch(() => {});
}

export async function fetchMessages(sinceId = 0) {
  const token = getStoredToken();
  const driver = getStoredDriver();
  if (!driver) return [];
  const url = token
    ? `${URLS.messages}/?since_id=${sinceId}`
    : `${URLS.messages}/?driver_id=${driver.id}&since_id=${sinceId}`;
  const headers: Record<string, string> = {};
  if (token) headers['X-Auth-Token'] = token;
  const res = await fetch(url, { headers });
  const data = await res.json();
  return data.messages || [];
}

export async function sendMessage(text: string, type = 'normal', clientId?: string) {
  const token = getStoredToken();
  const driver = getStoredDriver();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Auth-Token'] = token;
  const body: Record<string, unknown> = { text, type };
  if (clientId) body.clientId = clientId;
  if (!token && driver) body.driver_id = driver.id;
  const res = await fetch(URLS.messages, { method: 'POST', headers, body: JSON.stringify(body) });
  return res.json();
}

export async function sendBatchMessages(messages: { text: string; type: string; clientId: string }[]) {
  const token = getStoredToken();
  if (!token) throw new Error('No token');
  const res = await fetch(`${URLS.messages}/?action=batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error('Batch send failed');
  return res.json();
}

export async function confirmDelivery(messageIds: number[]) {
  const res = await fetch(`${URLS.messages}/?action=confirm_delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_ids: messageIds }),
  });
  return res.json();
}

export async function sendDispatcherMessage(driverId: number, text: string, type = 'normal') {
  const res = await fetch(URLS.messages, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driver_id: driverId, text, type }),
  });
  return res.json();
}

export async function fetchAllDrivers() {
  const res = await fetch(URLS.manage);
  const data = await res.json();
  return data.drivers || [];
}

export async function createDriver(driver: {
  fullName: string;
  pin: string;
  vehicleType: string;
  vehicleNumber: string;
  routeNumber: string;
  shiftStart: string;
}) {
  const res = await fetch(URLS.manage, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(driver),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка создания водителя');
  return data;
}

export async function updateDriver(driver: Record<string, unknown>) {
  const res = await fetch(URLS.manage, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(driver),
  });
  return res.json();
}

export async function deleteDriver(id: number) {
  const res = await fetch(`${URLS.manage}/?id=${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchOnlineDrivers() {
  const res = await fetch(URLS.auth);
  const data = await res.json();
  return data.drivers || [];
}
