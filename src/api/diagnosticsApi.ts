import urls from '../../backend/func2url.json';

const DIAG_URL = urls['vehicle-diagnostics'];

function driverHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('driver_session_token');
  if (t) h['X-Auth-Token'] = t;
  return h;
}

function dashHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const t = localStorage.getItem('dashboard_token');
  if (t) h['X-Dashboard-Token'] = t;
  return h;
}

async function driverRequest(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { ...driverHeaders(), ...(opts?.headers || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function dashRequest(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { ...dashHeaders(), ...(opts?.headers || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─── Driver endpoints ────────────────────────────────────────────────────────

export async function fetchVehicleStatus() {
  return driverRequest(`${DIAG_URL}?action=vehicle_status`);
}

export async function reportIssue(payload: { diagnosticId?: string; message: string; severity?: string }) {
  return driverRequest(`${DIAG_URL}?action=report_issue`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Dashboard endpoints ─────────────────────────────────────────────────────

export async function fetchIssueReports() {
  const data = await dashRequest(`${DIAG_URL}?action=issues`);
  return data.issues || [];
}

export async function resolveIssueReport(id: string, notes?: string) {
  return dashRequest(`${DIAG_URL}?action=resolve_issue`, {
    method: 'PUT',
    body: JSON.stringify({ id, resolutionNotes: notes }),
  });
}

export async function fetchTechReports() {
  const data = await dashRequest(`${DIAG_URL}?action=tech_reports`);
  return data.reports || [];
}

export async function fetchDiagnosticApis() {
  const data = await dashRequest(`${DIAG_URL}?action=diagnostic_apis`);
  return data.apis || [];
}

export async function createDiagnosticApi(payload: {
  vehicleId: string;
  apiName: string;
  apiType: string;
  apiUrl: string;
  apiKey?: string;
  pollInterval?: number;
}) {
  return dashRequest(`${DIAG_URL}?action=create_api`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDiagnosticApi(payload: {
  id: string;
  apiName?: string;
  apiUrl?: string;
  apiKey?: string;
  pollInterval?: number;
  isActive?: boolean;
}) {
  return dashRequest(`${DIAG_URL}?action=update_api`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchVehicleDiagnostics(vehicleId: string) {
  const data = await dashRequest(`${DIAG_URL}?action=vehicle_diagnostics&vehicle_id=${encodeURIComponent(vehicleId)}`);
  return data.diagnostics || [];
}

export async function generateMockDiagnostics(vehicleId: string) {
  return dashRequest(`${DIAG_URL}?action=mock_diagnostics`, {
    method: 'POST',
    body: JSON.stringify({ vehicleId }),
  });
}

export default {
  fetchVehicleStatus,
  reportIssue,
  fetchIssueReports,
  resolveIssueReport,
  fetchTechReports,
  fetchDiagnosticApis,
  createDiagnosticApi,
  updateDiagnosticApi,
  fetchVehicleDiagnostics,
  generateMockDiagnostics,
};
