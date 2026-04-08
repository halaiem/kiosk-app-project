import { useState, useMemo } from "react";
import Icon from "@/components/ui/icon";
import ReportButton from "@/components/dashboard/ReportButton";
import SortableTh from "@/components/ui/SortableTh";
import { useTableSort } from "@/hooks/useTableSort";
import type { AuditLog } from "@/types/dashboard";

function formatDateTime(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month} ${hours}:${mins}`;
}

const LOG_ACTION_ICONS: Record<string, string> = {
  login: "LogIn",
  logout: "LogOut",
  message: "MessageSquare",
  document: "FileText",
  password: "Key",
  alert: "AlertTriangle",
  route: "Route",
  server: "Server",
  user: "Users",
  settings: "Settings",
};

export function LogsView({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = [...logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.userName.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.target.toLowerCase().includes(q) ||
          (l.details && l.details.toLowerCase().includes(q))
      );
    }
    return list;
  }, [logs, search]);

  const { sort: logsSort, toggle: logsToggle, sorted: sortedLogs } = useTableSort(
    filtered as unknown as Record<string, unknown>[]
  );

  const getActionIcon = (action: string): string => {
    const lower = action.toLowerCase();
    for (const [key, icon] of Object.entries(LOG_ACTION_ICONS)) {
      if (lower.includes(key)) return icon;
    }
    return "Activity";
  };

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Icon name="Search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по пользователю, действию..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filtered.length} записей</span>
          <ReportButton filename="audit_logs" data={logs} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <SortableTh label="Время" sortKey="timestamp" sort={logsSort} onToggle={logsToggle} className="px-5 w-[100px]" />
              <SortableTh label="Пользователь" sortKey="userName" sort={logsSort} onToggle={logsToggle} className="px-3" />
              <SortableTh label="Действие" sortKey="action" sort={logsSort} onToggle={logsToggle} className="px-3" />
              <SortableTh label="Объект" sortKey="target" sort={logsSort} onToggle={logsToggle} className="px-3" />
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Подробности</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Icon name="ScrollText" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Нет записей</p>
                </td>
              </tr>
            ) : (
              (sortedLogs as typeof filtered).map((log, idx) => (
                <tr
                  key={log.id}
                  className={`border-b border-border transition-colors ${
                    idx % 2 === 0 ? "" : "bg-muted/20"
                  }`}
                >
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {log.userName.charAt(0)}
                        </span>
                      </div>
                      <span className="text-foreground text-xs font-medium">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Icon name={getActionIcon(log.action)} className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{log.target}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">
                    {log.details || "---"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}