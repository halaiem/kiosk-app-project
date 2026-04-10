import urls from './config';

const URLS = {
  auth: urls['driver-auth'],
  messages: urls['driver-messages'],
  manage: urls['driver-manage'],
  docs: urls['driver-docs'],
  mrm: urls['irida-mrm'],
};

const MRM_KEY = 'mrm_admin_info';

export interface MrmAdminInfo {
  id: number;
  fullName: string;
  login: string;
  adminPin: string;
  kioskExitPassword: string;
}

export function getStoredMrmAdmin(): MrmAdminInfo | null {
  const v = localStorage.getItem(MRM_KEY);
  return v ? JSON.parse(v) : null;
}

function storeMrmAdmin(admin: MrmAdminInfo) {
  localStorage.setItem(MRM_KEY, JSON.stringify(admin));
}

export function clearMrmAdmin() {
  localStorage.removeItem(MRM_KEY);
}

export async function loginAsMrm(login: string, password: string): Promise<MrmAdminInfo> {
  const res = await fetch(`${URLS.mrm}/?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Неверный логин или пароль');
  storeMrmAdmin(data.mrmAdmin);
  return data.mrmAdmin;
}

export async function verifyMrmExitPassword(mrmId: number, password: string): Promise<boolean> {
  const res = await fetch(`${URLS.mrm}/?action=verify_exit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mrmId, password }),
  });
  return res.ok;
}

export async function verifyMrmPin(mrmId: number, pin: string): Promise<boolean> {
  const res = await fetch(`${URLS.mrm}/?action=verify_pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mrmId, pin }),
  });
  return res.ok;
}

const TOKEN_KEY = 'driver_session_token';
const DRIVER_KEY = 'driver_info';
const SESSION_START_KEY = 'driver_session_start';

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
  localStorage.setItem(SESSION_START_KEY, String(Date.now()));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DRIVER_KEY);
  localStorage.removeItem(SESSION_START_KEY);
}

export function getSessionStart(): number | null {
  const v = localStorage.getItem(SESSION_START_KEY);
  return v ? Number(v) : null;
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

export interface GeoZoneAlert {
  zone_id: number;
  zone_name: string;
  event_type: 'entry' | 'exit' | 'nearby';
  notification_title?: string;
  notification_content?: string;
  notification_icon?: string;
  notification_priority?: string;
  distance_km?: number;
}

export async function sendHeartbeat(lat?: number, lng?: number, speed?: number): Promise<GeoZoneAlert[]> {
  const token = getStoredToken();
  if (!token) return [];
  try {
    const res = await fetch(`${URLS.auth}/?action=heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
      body: JSON.stringify({ latitude: lat, longitude: lng, speed }),
    });
    const data = await res.json();
    return data.geo_alerts || [];
  } catch {
    return [];
  }
}

let _geoWatchId: number | null = null;
let _lastLat: number | undefined;
let _lastLng: number | undefined;
let _lastSpeed: number | undefined;

export function startGeoTracking() {
  if (_geoWatchId !== null || !navigator.geolocation) return;
  _geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      _lastLat = pos.coords.latitude;
      _lastLng = pos.coords.longitude;
      _lastSpeed = pos.coords.speed != null ? Math.round(pos.coords.speed * 3.6) : 0;
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
  );
}

export function stopGeoTracking() {
  if (_geoWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(_geoWatchId);
    _geoWatchId = null;
  }
  _lastLat = undefined;
  _lastLng = undefined;
  _lastSpeed = undefined;
}

export function getLastPosition() {
  return { lat: _lastLat, lng: _lastLng, speed: _lastSpeed };
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

export async function sendMessage(text: string, type = 'normal', clientId?: string, audioUrl?: string, audioDuration?: number) {
  const token = getStoredToken();
  const driver = getStoredDriver();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Auth-Token'] = token;
  const body: Record<string, unknown> = { text, type };
  if (clientId) body.clientId = clientId;
  if (audioUrl) body.audio_url = audioUrl;
  if (audioDuration) body.audio_duration = audioDuration;
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
  phone?: string;
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

export async function rateDispatcher(rating: number) {
  const token = getStoredToken();
  if (!token) return;
  await fetch(`${URLS.auth}/?action=rate_dispatcher`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
    body: JSON.stringify({ rating }),
  }).catch(() => {});
}

export async function fetchOnlineDrivers() {
  const res = await fetch(URLS.auth);
  const data = await res.json();
  return data.drivers || [];
}

export async function fetchNewDocs() {
  const token = getStoredToken();
  if (!token) return [];
  const res = await fetch(URLS.docs, { headers: { 'X-Auth-Token': token } });
  const data = await res.json();
  return data.docs || [];
}

export async function markDocRead(docId: number) {
  const token = getStoredToken();
  if (!token) return;
  await fetch(`${URLS.docs}/?action=mark_read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
    body: JSON.stringify({ doc_id: docId }),
  }).catch(() => {});
}

export async function confirmNewDocs(docIds: number[]) {
  const token = getStoredToken();
  if (!token) return;
  await fetch(`${URLS.docs}/?action=confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': token },
    body: JSON.stringify({ doc_ids: docIds }),
  }).catch(() => {});
}