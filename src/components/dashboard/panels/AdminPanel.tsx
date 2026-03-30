import type { AdminTab, ServerInfo, AuditLog } from "@/types/dashboard";
import { UsersView } from "./admin/UsersView";
import { SettingsView } from "./admin/SettingsView";
import { ServersView } from "./admin/ServersView";
import { LogsView } from "./admin/LogsView";

interface AdminPanelProps {
  tab: AdminTab;
  servers: ServerInfo[];
  logs: AuditLog[];
}

export default function AdminPanel({ tab, servers, logs }: AdminPanelProps) {
  if (tab === "users") return <UsersView />;
  if (tab === "settings") return <SettingsView />;
  if (tab === "servers") return <ServersView servers={servers} />;
  if (tab === "logs") return <LogsView logs={logs} />;
  return null;
}
