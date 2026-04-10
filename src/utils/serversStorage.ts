import type { ServerStatus } from "@/types/dashboard";

export interface StoredServer {
  id: string;
  name: string;
  status: ServerStatus;
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
  lastCheck: string;
  address?: string;
  port?: string;
  serverType?: string;
  isCustom?: boolean;
  apiId?: string;
}

const LS_KEY = "admin_custom_servers";

export function loadStoredServers(): StoredServer[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}

export const SERVERS_UPDATED_EVENT = "custom-servers-updated";

export function saveStoredServers(list: StoredServer[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(SERVERS_UPDATED_EVENT));
}

export function addServerFromApi(params: {
  apiId: string;
  apiName: string;
  apiUrl: string;
}) {
  const existing = loadStoredServers();
  const alreadyExists = existing.some(s => s.apiId === params.apiId);
  if (alreadyExists) return;

  let address = "";
  let port = "";
  try {
    const url = new URL(params.apiUrl.startsWith("http") ? params.apiUrl : `http://${params.apiUrl}`);
    address = url.hostname;
    port = url.port || "";
  } catch {
    address = params.apiUrl;
  }

  const newServer: StoredServer = {
    id: `api_${params.apiId}`,
    name: params.apiName,
    status: "offline",
    cpu: 0,
    memory: 0,
    disk: 0,
    uptime: "—",
    lastCheck: new Date().toISOString(),
    address,
    port,
    serverType: "api",
    isCustom: true,
    apiId: params.apiId,
  };

  saveStoredServers([...existing, newServer]);
}