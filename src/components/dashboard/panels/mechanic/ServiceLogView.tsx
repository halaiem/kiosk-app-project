import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/ui/icon";
import urls from '@/api/config';

const API_URL = urls["service-requests"];
const TOKEN_KEY = "dashboard_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function hdrs(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["X-Dashboard-Token"] = t;
  return h;
}

interface LogEntry {
  id: number;
  request_id: number;
  request_number: string;
  timestamp: string;
  user_name: string;
  user_role: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  comment: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Администратор",
  technician: "Технолог",
  dispatcher: "Диспетчер",
  mechanic: "Механик",
  system: "Система",
};

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  resolved: "Решено",
  closed: "Закрыто",
  needs_info: "Требует информации",
};

function formatDate(d: string): string {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear());
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  const ss = String(dt.getSeconds()).padStart(2, "0");
  return `${dd}.${mm}.${yy} ${hh}:${mi}:${ss}`;
}

export default function ServiceLogView() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRequestId, setFilterRequestId] = useState("");
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}?action=logs`;
      if (filterRequestId.trim()) url += `&request_id=${encodeURIComponent(filterRequestId.trim())}`;
      const res = await fetch(url, { headers: hdrs() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.logs || [];
      setLogs(list);
    } catch { /* skip */ }
    setLoading(false);
  }, [filterRequestId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const sorted = useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${API_URL}?action=export`, { headers: hdrs() });
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/csv") || contentType.includes("application/octet-stream")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `service_log_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const rows: string[] = ["timestamp,user_name,user_role,action,old_status,new_status,comment,request_number"];
        const items = Array.isArray(data) ? data : data.logs || [];
        for (const l of items) {
          rows.push([
            l.timestamp || "",
            `"${(l.user_name || "").replace(/"/g, '""')}"`,
            l.user_role || "",
            `"${(l.action || "").replace(/"/g, '""')}"`,
            l.old_status || "",
            l.new_status || "",
            `"${(l.comment || "").replace(/"/g, '""')}"`,
            l.request_number || "",
          ].join(","));
        }
        const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `service_log_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* skip */ }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Журнал обслуживания</h2>
        <p className="text-muted-foreground mt-1">История изменений статусов и действий по заявкам</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Icon name="Search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={filterRequestId}
            onChange={(e) => setFilterRequestId(e.target.value)}
            placeholder="Фильтр по ID заявки..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground w-56 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button onClick={fetchLogs} className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted transition-colors" title="Обновить">
          <Icon name="RefreshCw" className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <Icon name="Download" className="w-4 h-4" />
          {exporting ? "Экспорт..." : "Экспорт CSV"}
        </button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon name="BookOpen" className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p>Журнал пуст</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-4 py-3 font-medium">Время</th>
                  <th className="text-left px-4 py-3 font-medium">Заявка</th>
                  <th className="text-left px-4 py-3 font-medium">Пользователь</th>
                  <th className="text-left px-4 py-3 font-medium">Роль</th>
                  <th className="text-left px-4 py-3 font-medium">Действие</th>
                  <th className="text-left px-4 py-3 font-medium">Статус</th>
                  <th className="text-left px-4 py-3 font-medium">Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(l.timestamp)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{l.request_number || `#${l.request_id}`}</td>
                    <td className="px-4 py-3 text-foreground">{l.user_name || "---"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{ROLE_LABELS[l.user_role] || l.user_role}</td>
                    <td className="px-4 py-3 text-foreground">{l.action}</td>
                    <td className="px-4 py-3 text-xs">
                      {l.old_status || l.new_status ? (
                        <span>
                          {l.old_status ? <span className="text-muted-foreground">{STATUS_LABELS[l.old_status] || l.old_status}</span> : null}
                          {l.old_status && l.new_status ? <Icon name="ArrowRight" className="inline w-3 h-3 mx-1 text-muted-foreground" /> : null}
                          {l.new_status ? <span className="text-foreground font-medium">{STATUS_LABELS[l.new_status] || l.new_status}</span> : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">---</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{l.comment || "---"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}