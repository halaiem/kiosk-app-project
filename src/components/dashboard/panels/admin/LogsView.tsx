import { useState, useMemo, useCallback } from "react";
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

  const sortedList = sortedLogs as typeof filtered;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allSelected = sortedList.length > 0 && sortedList.every((l) => selectedIds.has(l.id));
  const someSelected = sortedList.some((l) => selectedIds.has(l.id));

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { for (const l of sortedList) next.delete(l.id); }
      else { for (const l of sortedList) next.add(l.id); }
      return next;
    });
  }, [sortedList, allSelected]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const exportLogsCsv = useCallback((rows: AuditLog[]) => {
    const header = ["№", "Время", "Пользователь", "Действие", "Объект", "Подробности"];
    const lines = rows.map((l, i) => [
      i + 1, formatDateTime(l.timestamp), `"${l.userName.replace(/"/g, '""')}"`,
      `"${l.action.replace(/"/g, '""')}"`, `"${l.target.replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
    ].join(";"));
    const blob = new Blob(["\uFEFF" + [header.join(";"), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, []);

  const handleExportLogs = useCallback(() => {
    const rows = selectedIds.size > 0 ? sortedList.filter((l) => selectedIds.has(l.id)) : sortedList;
    exportLogsCsv(rows);
  }, [sortedList, selectedIds, exportLogsCsv]);

  const getActionIcon = (action: string): string => {
    const lower = action.toLowerCase();
    for (const [key, icon] of Object.entries(LOG_ACTION_ICONS)) {
      if (lower.includes(key)) return icon;
    }
    return "Activity";
  };

  return (
    <div className="relative h-full">
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
          <button onClick={handleExportLogs} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border text-muted-foreground hover:text-foreground transition-colors" title={selectedIds.size > 0 ? `Экспорт (${selectedIds.size})` : "Экспорт CSV"}>
            <Icon name="Download" className="w-3.5 h-3.5" />CSV
          </button>
          <ReportButton filename="audit_logs" data={logs} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="w-10 px-5 py-2.5">
                <input type="checkbox" checked={allSelected} ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleSelectAll} className="w-4 h-4 accent-primary cursor-pointer" />
              </th>
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
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  <Icon name="ScrollText" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Нет записей</p>
                </td>
              </tr>
            ) : (
              sortedList.map((log, idx) => (
                <tr
                  key={log.id}
                  className={`border-b border-border transition-colors ${selectedIds.has(log.id) ? "bg-primary/5" : idx % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <td className="px-5 py-2.5">
                    <input type="checkbox" checked={selectedIds.has(log.id)} onChange={() => toggleRow(log.id)} className="w-4 h-4 accent-primary cursor-pointer" />
                  </td>
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

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border rounded-2xl shadow-xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium text-foreground">Выбрано {selectedIds.size}</span>
          <button onClick={() => exportLogsCsv(sortedList.filter((l) => selectedIds.has(l.id)))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Icon name="Download" className="w-3.5 h-3.5" />
            Экспорт выбранных
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors">
            Сбросить
          </button>
        </div>
      )}
    </div>
  );
}